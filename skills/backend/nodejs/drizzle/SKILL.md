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
