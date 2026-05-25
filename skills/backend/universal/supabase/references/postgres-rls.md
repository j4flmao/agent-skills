# PostgreSQL & Row Level Security

## Overview
Supabase PostgreSQL — schema design, Row Level Security policies, extensions (pgvector), indexes, migrations, triggers, functions.

## Schema Design

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Types
CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  email TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status post_status NOT NULL DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  like_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_slug ON public.posts(slug);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_published_at ON public.posts(published_at DESC)
  WHERE status = 'published';
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_search ON public.posts
  USING GIN(to_tsvector('english', title || ' ' || coalesce(content, '')));
```

## Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_owner(table_user_id UUID)
RETURNS boolean AS $$
  SELECT auth.uid() = table_user_id;
$$ LANGUAGE sql STABLE;

-- Profiles policies
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);  -- anyone can read profiles

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);  -- only self

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- Posts policies
CREATE POLICY "posts_select" ON public.posts
  FOR SELECT USING (
    status = 'published'
    OR auth.uid() = author_id
    OR public.is_admin()
  );

CREATE POLICY "posts_insert" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_update" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id OR public.is_admin())
  WITH CHECK (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "posts_delete" ON public.posts
  FOR DELETE USING (auth.uid() = author_id OR public.is_admin());
```

## pgvector

```sql
-- Create vector extension
CREATE EXTENSION vector;

-- Create embeddings table
CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI ada-002 dimension
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index (IVFFlat for approximate search)
CREATE INDEX idx_embeddings_vector ON public.embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);  -- lists = sqrt(rows) for best performance

-- Or HNSW for better recall (PostgreSQL 14+)
CREATE INDEX idx_embeddings_hnsw ON public.embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- Query similar content
SELECT content, 1 - (embedding <=> query_embedding) AS similarity
FROM public.embeddings
WHERE user_id = 'some-user-id'
ORDER BY embedding <=> query_embedding
LIMIT 10;

-- Hybrid search (vector + metadata filter)
SELECT e.content, 1 - (e.embedding <=> query_embedding) AS similarity
FROM public.embeddings e
JOIN public.posts p ON p.id = e.metadata->>'post_id'::UUID
WHERE e.metadata->>'category' = 'technology'
ORDER BY e.embedding <=> query_embedding
LIMIT 10;

-- RLS on vector table
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embeddings_select" ON public.embeddings
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "embeddings_insert" ON public.embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Full-Text Search

```sql
-- Create a search vector column
ALTER TABLE public.posts ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;

CREATE INDEX idx_posts_search_vector ON public.posts USING GIN(search_vector);

-- Search query
SELECT title, excerpt, ts_rank(search_vector, query) AS rank
FROM public.posts, plainto_tsquery('english', 'search terms') AS query
WHERE search_vector @@ query AND status = 'published'
ORDER BY rank DESC
LIMIT 20;
```

## Migrations

```bash
# Local migration workflow
supabase migration new create_profiles_table
# Edits supabase/migrations/YYYYMMDDHHMMSS_create_profiles_table.sql

supabase migration up    # Apply pending migrations
supabase migration down  # Rollback last migration (local only)
supabase db push         # Push local schema to linked project
supabase db diff         # Show diff between local and remote

# Production: use migration files, never modify via dashboard
```

```sql
-- supabase/migrations/20240101000001_create_initial_schema.sql
-- Up
CREATE TABLE public.profiles (...)

-- supabase/migrations/20240101000002_add_search_vector.sql
-- Up
ALTER TABLE public.posts ADD COLUMN search_vector tsvector;
-- Down
ALTER TABLE public.posts DROP COLUMN search_vector;
```

## Performance

```sql
-- Identify slow queries
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM public.posts WHERE author_id = 'some-uuid' AND status = 'published';

-- Common index patterns
CREATE INDEX CONCURRENTLY idx_posts_composite ON public.posts(author_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_posts_trgm ON public.posts USING GIN (title gin_trgm_ops);
```

## Key Points
- Every table must have RLS enabled — Supabase enforces this by default for new tables.
- RLS functions (`auth.uid()`, `auth.role()`) are available when using supabase-js client.
- Service role key bypasses RLS — use only for admin/backend operations.
- pgvector supports cosine (`<=>`), L2 (`<->`), and inner product (`<#>`) distance metrics.
- IVFFlat builds faster but HNSW provides better recall — choose based on dataset size.
- Use `gen_random_uuid()` from pgcrypto for UUID generation.
- Triggers on `auth.users` require `SECURITY DEFINER` to read from that schema.
- Full-text search requires manually-created tsvector indexes — Supabase doesn't auto-index.
