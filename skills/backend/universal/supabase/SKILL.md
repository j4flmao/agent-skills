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

## Architecture Decision Trees

### Schema Design Decision Tree
```
What type of data are you storing?
  ├── User profiles, settings (per-user)
  │   └── Extends auth.users via profiles table with FK + ON DELETE CASCADE
  ├── Content with ownership (posts, comments)
  │   └── Has author_id FK to profiles, RLS filters by auth.uid()
  ├── Multi-tenant data
  │   └── Every table has tenant_id, RLS checks tenant membership
  ├── Time-series / logs
  │   └── Partitioned tables, no RLS (service-role only), retention policies
  ├── Vector embeddings (AI / semantic search)
  │   └── pgvector extension, IVFFlat or HNSW index, RLS on metadata
  └── File metadata / storage references
      └── References storage objects, path-based RLS using storage extension
```

### RLS Policy Decision Tree
```
Who can access the data?
  ├── Public read (blog posts, products)
  │   └── FOR SELECT USING (true) — no auth check
  ├── Authenticated users only
  │   └── FOR SELECT USING (auth.role() = 'authenticated')
  ├── Owner only (user's own data)
  │   └── FOR SELECT USING (auth.uid() = user_id)
  ├── Owner + admin
  │   └── FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()))
  ├── Team / organization
  │   └── FOR SELECT USING (exists(select 1 from team_members where user_id = auth.uid() and team_id = team_id))
  ├── Role-based (RBAC)
  │   └── FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'moderator'))
  └── Hierarchical (parent-child)
      └── FOR SELECT USING (exists(select 1 from parent_table where id = parent_id and owner_id = auth.uid()))
```

### Realtime Decision Tree
```
What kind of real-time updates do you need?
  ├── Database changes (INSERT/UPDATE/DELETE)
  │   └── postgres_changes channel — replication slot on specific table
  │   └── Cost: WAL overhead, ~5-10% write performance hit
  ├── Presence (who's online)
  │   └── Broadcast channel with presence tracking — no DB overhead
  ├── Typing indicators, cursor positions
  │   └── Broadcast channel — ephemeral, no persistence
  │   └── Use with rate limiting (max 5 updates/sec per user)
  └── Multiplayer state sync
      └── Broadcast + presence — merge server state with client state
```

### Advanced RLS Patterns with Roles
```sql
-- Custom role-checking function (avoids duplicating JWT checks)
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'user_role',
    'anonymous'
  );
$$ LANGUAGE sql STABLE;

-- Multi-role policy for organization data
CREATE POLICY org_data_access ON documents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.org_id = documents.org_id
    AND org_members.user_id = auth.uid()
    AND (
      org_members.role = 'owner' -- owners see everything
      OR (
        org_members.role = 'editor'
        AND documents.status != 'archived'
      )
      OR (
        org_members.role = 'viewer'
        AND documents.visibility = 'public'
      )
    )
  )
);

-- Row-level update restrictions based on status
CREATE POLICY prevent_archived_updates ON documents FOR UPDATE
USING (status != 'archived')
WITH CHECK (status != 'archived');
```

```typescript
// Client: subscribe with role-aware filters
const channel = supabase.channel('documents')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'documents',
      filter: `org_id=eq.${userOrgId}`,
    },
    (payload) => {
      // RLS already filtered — only authorized events arrive
      updateDocumentList(payload.new);
    }
  )
  .subscribe();
```

## Performance Considerations

| Concern | Practice |
|---------|----------|
| Query performance | Use EXPLAIN ANALYZE, add indexes for WHERE/JOIN/ORDER BY columns |
| N+1 queries | Supabase JS client supports select with joins: `select(*, orders(*))` |
| Connection pooling | Supabase uses PgBouncer for transaction pooling — avoid prepared statements |
| Large datasets | Add LIMIT + OFFSET for pagination, never SELECT * on big tables |
| Realtime overhead | Enable replication only on tables that need it — each table adds WAL overhead |
| Edge Function cold starts | ~200ms-2s for Deno runtime. Keep frequently-used functions warm with pings |
| Storage performance | Large files (>5MB) use S3 multipart upload. Server-side resizing for images |
| pgvector performance | IVFFlat for approximate (faster). HNSW for exact (slower insert, faster query) |

## Security Patterns

```sql
-- Row-Level Security: Multi-tenant isolation
CREATE TABLE tenant_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  data TEXT NOT NULL
);

ALTER TABLE tenant_data ENABLE ROW LEVEL SECURITY;

-- Users can only see their tenant's data
CREATE POLICY tenant_isolation ON tenant_data
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Admin bypass
CREATE POLICY admin_access ON tenant_data
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

```typescript
// Server-side only: service role operations
// Use for admin tasks, background jobs, webhooks
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Admin-only operations bypass RLS
async function deleteUserAccount(userId: string) {
  // Delete auth user (service role required)
  await supabaseAdmin.auth.admin.deleteUser(userId);
  // Profile deleted via CASCADE from auth.users
}

// Database webhooks for async processing
-- Enable webhook on insert
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('new_order', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_created_trigger
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_new_order();
```

## Cost Optimization

| Feature | Cost Driver | Optimization |
|---------|------------|--------------|
| Database | Compute hours, storage, egress | Use read replicas for reporting. Archive old data to cold storage |
| Storage | Storage size, data transfer | Use CDN for public files. Set lifecycle rules. Compress images |
| Realtime | Active connections | Disable replication on unused tables. Use broadcast instead of DB changes |
| Edge Functions | Invocations, duration | Cache responses. Batch operations. Use warm-start friendly code |
| Bandwidth | Data transfer out | Enable CDN. Optimize image sizes. Compress API responses |
| PITR | Storage (WAL files) | Disable for non-production projects. Set retention to minimum (7 days) |

## Production Considerations

| Concern | Practice |
|---------|----------|
| Schema migrations | Use `supabase migration new` + `supabase db push`. Never edit via dashboard |
| Backup strategy | PITR + daily database dumps. Test restore monthly |
| Rate limiting | Implement at application level (Supabase doesn't have built-in rate limiting) |
| Connection limits | Free tier: 2 concurrent connections. Pro: 60. Team: 120. Plan accordingly |
| Monitoring | Supabase dashboard for DB metrics + custom health checks on Edge Functions |
| Staging environment | Separate Supabase project for staging with anonymized production data |
| CI/CD integration | `supabase db push` in CI pipeline. Test migrations against staging first |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| RLS on every query even when not needed | Adds overhead on queries that bypass auth | RLS is free on indexed lookups, but avoid complex function calls in RLS |
| Service role key in client code | Exposes full DB access to users | Service role is server-only. Use anon key + RLS for client |
| Fat tables with no normalization | JSONB overload, hard to maintain | Use normalized tables with foreign keys. JSONB only for true schemaless data |
| Too many indexes | Slows writes. Each index adds ~10% write overhead | Index only WHERE/JOIN/ORDER BY columns. Remove unused indexes |
| Row-level security with recursive policies | Recursive policies timeout (5s limit) | Use materialized paths or denormalized membership for recursive checks |
| Edge Functions doing heavy computation | Deno has 5-30s timeout, 128MB memory limit | Offload heavy processing to worker service, use EF only as thin API layer |
| Storing files >5MB in DB | Blows up DB size, slow queries | Use Supabase Storage with presigned URLs, store only URL in DB |

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
- Use `EXPLAIN ANALYZE` before adding any new index — verify it's actually used.
- Never expose service_role_key in client-side code or version control.
- Keep Edge Functions stateless and < 50ms execution time (cold start excluded).
- Use `auth.uid()` in RLS policies, not `current_user` or `current_setting`.
- Limit Realtime subscriptions to 100 concurrent channels per client.
- Test RLS policies with `supabase test` or by simulating auth.uid() values.
- Set up database webhooks for async workflows instead of triggers when possible.
- Enable branching for development workflows (`supabase branches`).

## References
  - references/edge-functions.md — Edge Functions
  - references/postgres-rls.md — PostgreSQL & Row Level Security
  - references/supabase-auth.md — Supabase Auth
  - references/supabase-backup-migration.md — Supabase Backup and Migration
  - references/supabase-realtime.md — Supabase Realtime
  - references/supabase-storage.md — Supabase Storage
## Handoff
Hand off to `ai/vector-databases/SKILL.md` for pgvector embedding workflows or `mobile/*/SKILL.md` for client SDK integration.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.