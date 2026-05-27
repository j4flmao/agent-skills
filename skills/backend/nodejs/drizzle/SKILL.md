---
name: nodejs-drizzle
description: >
  Use this skill when working with Drizzle ORM — schema definition, migrations, SQL-like queries, relations, prepared statements, Drizzle Kit, connection pooling.
  This skill enforces: proper schema typing, migration workflow, relation query optimization, prepared statement use, edge-compatible config.
  Do NOT use for: Prisma ORM, TypeORM, Mongoose, raw SQL-first workflows, Kysely.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, database, phase-10]
---

# Node.js Drizzle ORM

## Purpose
Design type-safe database schemas with Drizzle ORM — schema definition, relational queries, migrations, and performance optimization for serverless and edge environments.

## Agent Protocol

### Trigger
User request includes: `Drizzle ORM`, `drizzle`, `drizzle-orm`, `drizzle-kit`, `schema definition`, `drizzle migrations`, `relational queries`, `drizzle relations`, `drizzle config`, `drizzle studio`.

### Input Context
- Database (PostgreSQL, MySQL, SQLite, Turso, PlanetScale)
- Existing schema or requirements
- Relation patterns (one-to-many, many-to-many)
- Deployment environment (Node.js, serverless, edge, CF Workers)

### Output Artifact
Drizzle schema files, migration strategy, query patterns, config for drizzle-kit.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Schema models mapped correctly with relations
- Migration workflow provided
- Queries optimized with prepared statements
- Relations configured with proper foreign keys
- Connection pooling configured for target environment

### Max Response Length
4096 tokens

## Workflow

### Step 1: Setup
```bash
npm install drizzle-orm
npm install -D drizzle-kit
```

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Step 2: Schema Definition
```typescript
// src/db/schema/users.ts
import { pgTable, serial, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// src/db/schema/posts.ts
import { pgTable, text, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  authorId: uuid('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Step 3: Relations
```typescript
// src/db/schema/relations.ts
import { relations } from 'drizzle-orm';
import { users } from './users';
import { posts } from './posts';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

Many-to-many:
```typescript
export const postsToTags = pgTable('posts_to_tags', {
  postId: uuid('post_id').notNull().references(() => posts.id),
  tagId: uuid('tag_id').notNull().references(() => tags.id),
});

export const postsRelations = relations(posts, ({ many }) => ({
  tags: many(postsToTags),
}));
```

### Step 4: Migrations
```bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate

# Push schema directly (dev)
npx drizzle-kit push

# Drizzle Studio (GUI)
npx drizzle-kit studio
```

### Step 5: Queries
```typescript
import { db } from './db';
import { users, posts } from './db/schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';

// Insert
const [user] = await db.insert(users).values({
  email: 'alice@example.com',
  name: 'Alice',
}).returning();

// Select with relations
const result = await db.query.users.findMany({
  with: {
    posts: {
      where: (posts, { eq }) => eq(posts.published, true),
      limit: 5,
    },
  },
});

// Where conditions
const activeUsers = await db.select().from(users)
  .where(eq(users.isActive, true))
  .orderBy(desc(users.createdAt))
  .limit(10);

// Update
await db.update(users)
  .set({ name: 'New Name' })
  .where(eq(users.id, userId));

// Delete
await db.delete(users).where(eq(users.id, userId));
```

### Step 6: Prepared Statements
```typescript
import { sql } from 'drizzle-orm';

const getUsersByEmail = db.select().from(users)
  .where(eq(users.email, sql.placeholder('email')))
  .prepare('get_users_by_email');

const result = await getUsersByEmail.execute({ email: 'alice@example.com' });

// Batch prepared statements for performance
const [userResult, postCount] = await db.batch([
  db.select().from(users).where(eq(users.id, userId)).prepare('get_user'),
  db.select({ count: sql<number>`count(*)` }).from(posts)
    .where(eq(posts.authorId, userId)).prepare('count_posts'),
]);
```

### Step 7: Transactions
```typescript
import { db } from './db';

await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values(orderData).returning();
  for (const item of items) {
    await tx.update(inventory)
      .set({ quantity: sql`quantity - ${item.quantity}` })
      .where(eq(inventory.productId, item.productId));
  }
  return order;
});
```

## Rules
- Use `drizzle-orm` for queries, `drizzle-kit` for migrations.
- Push only in dev — always generate + migrate in production.
- Prepend `sql` template tag for raw SQL — never string concatenate.
- Use prepared statements for repeated queries (batch + prepare).
- Use `$returningId()` for PostgreSQL inserts that need the ID back.
- Use `drizzle-orm/pg-core` imports for Postgres, `mysql-core` for MySQL, `sqlite-core` for SQLite.
- Externally manage connection pool (pg, mysql2, libsql) — Drizzle is query builder only.
- Drizzle relations require explicit files — they are not inferred from schema.
- For serverless/edge — use `@vercel/postgres`, `@neondatabase/serverless`, or `d1` adapter.
- Version control migration files and `drizzle.config.ts`.

## References
  - references/drizzle-advanced.md — Drizzle Advanced
  - references/drizzle-edge-deployment.md — Drizzle Edge Deployment Reference
  - references/drizzle-relations.md — Drizzle Relations Reference
  - references/migration-patterns.md — Migration Patterns
  - references/query-optimization.md — Query Optimization
  - references/schema-types.md — Schema Types
## Handoff
Hand off to `backend/nodejs/hono/SKILL.md` or `backend/nodejs/fastify/SKILL.md` for API integration. Hand off to `devops/database-migration/SKILL.md` for migration CI/CD pipeline.
