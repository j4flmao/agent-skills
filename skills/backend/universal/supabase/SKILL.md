---
name: supabase
description: >
  Use this skill when working with Supabase platform — PostgreSQL schema, Row Level Security, Realtime subscriptions, Auth, Storage, Edge Functions, pgvector.
  This skill enforces: RLS policies on every table, proper PostgreSQL schema design, real-time channel organization, storage bucket policies, edge function cold start handling.
  Do NOT use for: Firebase, AWS Amplify, Appwrite, general PostgreSQL architecture (use database-patterns), non-PostgreSQL backends.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, supabase, baas, phase-4]
---

# Supabase

## Purpose
Build production backends on Supabase — PostgreSQL schema design, Row Level Security policies, Auth providers, Realtime subscriptions, Storage buckets, and Edge Functions for serverless compute.

## Agent Protocol

### Trigger
User request includes: `Supabase`, `Supabase database`, `RLS`, `Row Level Security`, `Supabase Auth`, `Supabase Realtime`, `Supabase Storage`, `Supabase Edge Functions`, `Supabase CLI`, `Supabase client`, `Supabase `, `pgvector`, `Supabase migration`, `Supabase project`.

### Input Context
- Required Supabase features (DB, Auth, Realtime, Storage, Edge Functions)
- PostgreSQL schema requirements (tables, relations, indexes)
- Auth providers needed (email, OAuth, magic link, phone)
- Estimated scale (concurrent users, data volume)

### Output Artifact
Supabase project config, SQL schema + RLS policies, client setup, edge function code, storage bucket config.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- PostgreSQL schema defined with proper types, indexes, and relations
- RLS policies applied to every table (select, insert, update, delete)
- Auth providers configured with proper redirect URLs
- Realtime channels designed with proper filters
- Storage buckets with public/private policies
- Edge Functions with proper CORS and error handling
- Client SDK configured (supabase-js)

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -g supabase

# Login and init
supabase login
supabase init

# Link to existing project
supabase link --project-ref <ref>

# Start local dev
supabase start
```

```typescript
// src/lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side (service role — bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

### Step 2: Database Schema
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  published BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_published ON public.posts(published) WHERE published = true;
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

-- Vector embeddings (pgvector)
CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB
);

CREATE INDEX idx_embeddings_vector ON public.embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Step 3: Row Level Security
```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update only own
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Posts: users can read published, CRUD own
CREATE POLICY "posts_select" ON public.posts
  FOR SELECT USING (
    published = true OR auth.uid() = author_id
  );

CREATE POLICY "posts_insert" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_update" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "posts_delete" ON public.posts
  FOR DELETE USING (auth.uid() = author_id);
```

### Step 4: Realtime Subscriptions
```typescript
// Enable replication for table in Supabase dashboard
// ALTER PUBLICATION supabase_realtime ADD TABLE posts;

// Subscribe to changes
const channel = supabase
  .channel('public:posts')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'posts',
      filter: `published=eq.true`,
    },
    (payload) => {
      console.log('New post:', payload.new);
    }
  )
  .subscribe();

// Unsubscribe
supabase.removeChannel(channel);

// Presence (multiplayer)
const presenceChannel = supabase.channel('room:1');
presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ onlineAt: new Date().toISOString() });
    }
  });
```

### Step 5: Storage
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`public/${userId}.jpg`, file, {
    cacheControl: '3600',
    upsert: true,
  });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`public/${userId}.jpg`);

// Signed URL (private bucket)
const { data: { signedUrl } } = await supabase.storage
  .from('documents')
  .createSignedUrl(`private/doc-${id}.pdf`, 3600);
```

### Step 6: Edge Functions
```typescript
// supabase/functions/hello/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: posts } = await supabase.from('posts').select('*').limit(10);

  return new Response(JSON.stringify(posts), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Rules
- Every table must have RLS enabled — no exceptions.
- Service role key is for server-side/admin operations — never expose to client.
- Always use parameterized queries or Supabase client — no raw SQL strings in client code.
- Realtime: enable replication only on tables that need it (performance cost).
- Storage: public buckets for user content, private buckets for sensitive docs with signed URLs.
- Edge Functions: set `--no-verify-jwt` flag for webhooks, verify JWT manually for custom auth.
- Use `migration` workflow for production schema changes, never modify via dashboard.
- Enable PITR for production projects (additional cost).
- Set up database webhooks for async workflows instead of triggers when possible.

## References

### Reference Files
- `references/postgres-rls.md` — PostgreSQL schema, RLS policies, pgvector, indexes, migrations
- `references/supabase-auth.md` — Auth providers, RLS integration, user management, SSO, magic link
- `references/supabase-storage.md` — Storage buckets, policies, CDN, image optimization, signed URLs
- `references/edge-functions.md` — Edge Functions, deployment, webhooks, CORS, secrets, warm starts

### Related Skills
- `backend/universal/firebase/SKILL.md` — Firebase (alternative BaaS)
- `backend/universal/database-patterns/SKILL.md` — General database patterns
- `backend/nodejs/drizzle/SKILL.md` — Drizzle ORM (alternative query builder)
- `ai/vector-databases/SKILL.md` — Vector DB patterns (pgvector)

## Handoff
Hand off to `ai/vector-databases/SKILL.md` for pgvector embedding workflows or `mobile/*/SKILL.md` for client SDK integration.
