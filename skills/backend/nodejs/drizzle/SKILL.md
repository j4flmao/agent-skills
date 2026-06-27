---
name: nodejs-drizzle
description: >
  Use this skill when working with Drizzle ORM — schema definition, SQL-like queries, migrations, relations, and edge deployment. This skill enforces: schema-first design, explicit SQL patterns, drizzle-kit for migrations, relational query builder, and connection management. Requires drizzle-orm and drizzle-kit. Do NOT use for: Prisma, TypeORM, Mongoose, or non-Drizzle ORM frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, drizzle, phase-10]
---

# Drizzle ORM

## Purpose
Design database schemas, write SQL-like queries, manage migrations, define relations, and optimize Drizzle ORM for production and edge deployment.

## Agent Protocol

### Trigger
User request includes: `drizzle`, `drizzle orm`, `drizzle schema`, `drizzle migrate`, `drizzle query`, `drizzle relation`, `drizzle edge`, `drizzle neon`, `drizzle planetscale`.

### Input Context
- Database (PostgreSQL, MySQL, SQLite, Turso)
- Drizzle version (0.30+)
- Runtime (Node.js, Bun, Cloudflare Workers, Neon)
- Deployment (serverless, edge, traditional)

### Output Artifact
Schema definition, query examples, migration setup, relation config, connection management.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Schema defined with drizzle-orm/pg-core or mysql-core
- Relations defined with drizzle-orm relations
- Migrations generated and applied with drizzle-kit
- Queries use prepared statements for production
- Connection configured for target environment (Node, serverless, edge)

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Drizzle vs Prisma

| Criterion | Drizzle ORM | Prisma |
|-----------|-------------|--------|
| Performance | Fast (thin SQL wrapper) | Moderate (mapped layer) |
| Bundle size | Tiny (tree-shakeable) | Large (generated client) |
| Type safety | Full (inferred from schema) | Full (generated types) |
| SQL control | Direct SQL with types | Prisma Client abstractions |
| Migrations | Drizzle Kit | Prisma Migrate |
| Edge support | First-class (Neon, Turso, PlanetScale) | Via adapter |
| Relations | Relations module (INSERT-friendly) | include/select |

Decision: Performance + SQL control + edge → Drizzle. Rich ORM features + auto-complete → Prisma.

### Database Driver Selection

| Database | Driver | Drizzle Package | Best For |
|----------|--------|----------------|----------|
| PostgreSQL | `pg` or `@neondatabase/serverless` | `drizzle-orm/pg-core` | Full-featured RDBMS |
| MySQL | `mysql2` | `drizzle-orm/mysql-core` | PlanetScale, traditional MySQL |
| SQLite | `better-sqlite3` or `@libsql/client` | `drizzle-orm/sqlite-core` | Turso, local, edge |
| PostgreSQL (serverless) | `@vercel/postgres` | `drizzle-orm/vercel-postgres` | Vercel edge functions |

## Workflow

### Step 1: Schema Definition

```typescript
// src/db/schema/users.ts
import { pgTable, uuid, varchar, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).$type<'admin' | 'user'>().default('user'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  activeIdx: index('users_active_idx').on(table.active),
}));

// src/db/schema/posts.ts
import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  authorIdx: index('posts_author_idx').on(table.authorId),
  publishedIdx: index('posts_published_idx').on(table.authorId, table.published),
}));
```

### Step 2: Relations

```typescript
// src/db/schema/relations.ts
import { relations } from 'drizzle-orm';
import { users } from './users';
import { posts } from './posts';

export const usersRelations = relations(users, ({ one, many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### Step 3: Connection and Query

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// src/repositories/user.repository.ts
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq, and, desc, count, ilike } from 'drizzle-orm';

export async function findUserById(id: string) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] || null;
}

export async function findUserWithPosts(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      posts: {
        where: eq(posts.published, true),
        orderBy: [desc(posts.createdAt)],
        limit: 10,
      },
    },
  });
}

export async function findUsers(page: number, limit: number) {
  const [data, total] = await Promise.all([
    db
      .select()
      .from(users)
      .offset((page - 1) * limit)
      .limit(limit)
      .orderBy(desc(users.createdAt)),
    db.select({ count: count() }).from(users),
  ]);
  return { data, total: total[0].count, page };
}

export async function createUser(data: { email: string; name: string }) {
  const result = await db.insert(users).values(data).returning();
  return result[0];
}

export async function updateUser(id: string, data: Partial<{ name: string; email: string }>) {
  const result = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

export async function searchUsers(query: string) {
  return db
    .select()
    .from(users)
    .where(ilike(users.name, `%${query}%`))
    .limit(20);
}
```

### Step 4: Prepared Statements

```typescript
// src/db/prepared.ts
import { db } from './index';
import { users } from './schema/users';
import { eq } from 'drizzle-orm';

// Prepared statements for hot paths (cached query plans)
export const getUserById = db.select({
  id: users.id,
  name: users.name,
  email: users.email,
}).from(users).where(eq(users.id, sql.placeholder('id'))).prepare('get_user_by_id');

// Usage
const user = await getUserById.execute({ id: 'some-uuid' });
```

### Step 5: Migrations with Drizzle Kit

```bash
# Generate migration
npx drizzle-kit generate --name add_user_profile

# Apply migration
npx drizzle-kit migrate

# Push schema (dev only)
npx drizzle-kit push

# Check schema diff
npx drizzle-kit check

# Drizzle Kit config
```

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Step 6: Edge/Serverless Connection

```typescript
// src/db/edge.ts — Neon serverless
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// src/db/turso.ts — Turso (SQLite edge)
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.TURSO_DB_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
export const db = drizzle(client, { schema });
```

## Implementation Patterns

### Pattern: Batch Insert

```typescript
export async function createUsers(data: { email: string; name: string }[]) {
  return db.insert(users).values(data).returning();
}
```

### Pattern: Raw SQL with Type Safety

```typescript
import { sql } from 'drizzle-orm';

export async function getActiveUsersCount() {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM users WHERE active = true`
  );
  return result.rows[0].count;
}
```

## Production Considerations

### Connection Management
```typescript
// Node.js (connection pooling)
const pool = new Pool({ max: 20, idleTimeoutMillis: 30000 });

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
```

### Performance
- Prepared statements for hot query paths (cached execution plans)
- Use `db.query.*` with `with` for relation loading (Drizzle batches these)
- `Partial<Model>` for updates instead of full object
- `returning()` for INSERT/UPDATE/DELETE to avoid separate SELECT
- Use `drizzle-orm/zod` to generate Zod schemas from Drizzle schemas for validation

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Missing `.prepare()` on hot queries | Full query parse each call | Use `.prepare()` for frequent queries |
| `select *` in production | Overfetching, type safety loss | Explicit column selection |
| Direct pool in edge runtime | Connection leak, timeout | Use Neon HTTP or Turso HTTP driver |
| N+1 via manual relation queries | Sequential DB calls | Use `db.query.*.findFirst({with})` |
| No `$onUpdate` on timestamps | Stale updated_at | Always add `$onUpdate(() => new Date())` |

## Security Considerations
- Drizzle uses parameterized queries by default — SQL injection resistant
- Raw `sql` template tags are safe (parameterized), `sql.raw()` is not — avoid it
- Validate all inputs before passing to Drizzle queries (Zod at API boundary)
- Connection strings from environment variables — never hardcoded
- Row Level Security (RLS) for multi-tenant schemas

## Testing Strategies

```typescript
import { test, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const db = drizzle(pool, { schema });

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
});

afterAll(async () => {
  await pool.end();
});

test('create and find user', async () => {
  const [user] = await db.insert(users).values({
    email: 'test@test.com',
    name: 'Test',
  }).returning();
  expect(user.email).toBe('test@test.com');

  const found = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });
  expect(found).toBeDefined();
});
```

Use `TEST_DATABASE_URL` for test isolation. Run tests with `--pool=forks` for parallelism. Use `drizzle-kit push` to set up test schema.

## Rules
- Schema defined in TypeScript — one file per logical domain (users, posts, orders).
- Relations defined separately in `relations.ts` for each domain.
- Drizzle Kit for all migrations — never manual SQL schema changes.
- `db.select({ columns }).from(table).where(condition)` over `select *`.
- `db.query.table.findFirst/findMany({ with, where })` for relation queries.
- Prepared statements via `.prepare('name')` for hot paths.
- Edge databases use HTTP drivers (Neon, Turso), not TCP.
- All `timestamp` columns have `$onUpdate` for mutation tracking.

## References
  - references/drizzle-advanced.md — Advanced Drizzle Patterns
  - references/drizzle-edge-deployment.md — Edge and Serverless Deployment
  - references/drizzle-relations.md — Relation Patterns
  - references/migration-patterns.md — Migration Strategies
  - references/query-optimization.md — Query Optimization
  - references/schema-types.md — Schema Design and Types
## Handoff
Hand off to `backend/nodejs/prisma/SKILL.md` for Prisma ORM or `backend/nodejs/patterns/SKILL.md` for advanced Node patterns.
## Implementation Patterns

### Factory Pattern for Module Creation
`
function createModule<T>(config: ModuleConfig): T {
  const dependencies = initializeDependencies(config);
  const module = new Module(dependencies);
  module.hooks.onInit();
  return module as T;
}
`

### Builder Pattern for Complex Configuration
`
class ConfigBuilder {
  private config: AppConfig = new AppConfig();
  withDatabase(url: string): ConfigBuilder { ... }
  withCache(ttl: number): ConfigBuilder { ... }
  withLogging(level: string): ConfigBuilder { ... }
  build(): AppConfig { return this.config; }
}
`

## Production Considerations

### Deployment Checklist
- [ ] Production build with optimizations enabled
- [ ] Environment variables configured per environment
- [ ] Health check endpoint responds correctly
- [ ] Error tracking and monitoring integrated
- [ ] Logging level configured (not debug in production)
- [ ] Resource limits configured
- [ ] Database migrations applied
- [ ] Static assets built and served from CDN or cache
- [ ] Feature flags toggled appropriately
- [ ] Rollback plan documented and tested

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% | Critical | Rollback or fix |
| p95 latency | > 500ms | Warning | Profile and optimize |
| Uptime | < 99.9% | Critical | Investigate infrastructure |
| Memory usage | > 80% | Warning | Check for leaks |
| CPU usage | > 80% | Warning | Scale up or optimize |

## Rules
- Prefer composition over inheritance
- Favor immutable data structures
- Use dependency injection for testability
- Keep functions pure when possible — no side effects
- Fail fast with clear error messages
- Don't repeat yourself (DRY) — extract shared logic
- Keep it simple (KISS) — avoid unnecessary complexity
- You aren't gonna need it (YAGNI) — build what's required
- Separate concerns — single responsibility per module
- Code to interfaces, not implementations
- Write self-documenting code — clear names over comments
- Prefer standard library over third-party dependencies
- Handle errors explicitly — no silent failures
- Validate inputs at boundaries
- Log at appropriate levels (debug, info, warn, error)

## Implementation Patterns

### Pattern: CRUD Repository with Drizzle

```typescript
import { pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { db } from './db';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export class UserRepository {
  async findById(id: number) {
    return db.select().from(users).where(eq(users.id, id)).limit(1);
  }

  async findByEmail(email: string) {
    return db.select().from(users).where(eq(users.email, email)).limit(1);
  }

  async create(data: { email: string; name: string }) {
    return db.insert(users).values(data).returning();
  }

  async update(id: number, data: Partial<{ email: string; name: string }>) {
    return db.update(users).set(data).where(eq(users.id, id)).returning();
  }

  async delete(id: number) {
    return db.delete(users).where(eq(users.id, id)).returning();
  }
}
```

### Pattern: Transaction with Relation Queries

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

async function createOrderWithItems(orderData: OrderInput, items: ItemInput[]) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.insert(orders).values(orderData).returning();

    const orderItems = items.map(item => ({
      ...item,
      orderId: order.id,
    }));

    const inserted = await tx.insert(orderItems).values(orderItems).returning();

    await tx.update(inventory)
      .set({ quantity: sql`quantity - ${items.length}` })
      .where(eq(inventory.productId, orderData.productId));

    return { order, items: inserted };
  });
}
```

## Production Considerations

- Connection pooling: use `pg` pool with Drizzle. Max 20 connections per instance.
- Migration strategy: `drizzle-kit push` for dev. `drizzle-kit migrate` for prod. Always version-controlled.
- Query logging: Drizzle logger in dev only. Structured logging with Pino in prod.
- Prepared statements: Drizzle uses them by default. Cache hit ratio improves latency.
- Connection timeout: 30s idle. 60s statement timeout. Kill hung queries.
- Connection validation: test query on checkout. Reconnect on failure.
- Metrics: track query count, duration, rows returned per request.
- Migrations: generate SQL files. Review in PR. Apply via CI/CD pipeline.

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| Raw SQL strings everywhere | No type safety. SQL injection risk. | Use Drizzle query builder. Raw only when absolutely needed. |
| Over-fetching in relations | Select * with joins brings unnecessary columns. | Explicit `select` with only needed columns. |
| N+1 in relational queries | Loop querying related entities. | Use Drizzle relations with `with` or batch loading. |
| Missing indexes on foreign keys | Slow JOINs on large tables. | Index all FK columns. Use `EXPLAIN ANALYZE`. |
| Migrations without review | Schema drift. Production issues. | PR review for all migrations. Test on staging first. |

## Performance Optimization

- Use `partial` indexes for filtered queries (`WHERE status = 'active'`).
- `EXPLAIN ANALYZE` on all slow queries. Look for seq scans on large tables.
- Batch inserts with `db.insert(table).values(rows)` for bulk operations.
- Read replicas for reporting queries. Separate read/write connections.
- JSON columns for flexible schema. Index with GIN for query performance.
- Materialized views for dashboard queries. Refresh on schedule.
- Use `limit` + `offset` for pagination. Keyset pagination for large datasets.
- Prepared statement caching reduces parse overhead for repeated queries.

## Security Considerations

- SQL injection: Drizzle parameterizes all queries. Never use `sql` template tag with user input.
- Input validation: Zod schemas before passing to Drizzle. Validate types and constraints.
- Connection encryption: `ssl: true` for production. Reject unauthorized certs.
- Credential management: environment variables or vault. Never in code or config files.
- Row-level security: enable via `sql` template with tenant context. Enforce per query.
- Audit logging: trigger-based tracking for sensitive tables. Log all mutations.
- Schema access: read-only user for reports. Separate migration user. Least privilege.
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