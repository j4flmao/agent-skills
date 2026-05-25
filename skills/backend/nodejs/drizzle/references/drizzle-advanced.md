# Drizzle Advanced

## Overview
Advanced Drizzle patterns — Drizzle Kit configuration, edge/serverless deployment, multi-provider support, views, materialized views, snapshots.

## Drizzle Kit

```typescript
// drizzle.config.ts — full configuration
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: '__drizzle_migrations',
    schema: 'public',
  },
  verbose: true,
  strict: true,
  // Custom migration path
  // migration: './custom-migrations',
  // Snapshot config
  introspect: {
    casing: 'preserve',
  },
});
```

### Kit Commands

```bash
# Generate SQL migration from schema diff
npx drizzle-kit generate --name add-user-role

# Apply pending migrations
npx drizzle-kit migrate

# Push schema directly to DB (no versioning — dev only)
npx drizzle-kit push

# Generate schema from existing DB
npx drizzle-kit introspect

# Open Drizzle Studio
npx drizzle-kit studio

# Drop migrations table (reset migration tracking)
npx drizzle-kit drop

# Check migration status
npx drizzle-kit check
```

### CI/CD Migration Strategy

```yaml
# .github/workflows/migrate.yml
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx drizzle-kit generate  # verify schema compiles
      - run: npx drizzle-kit migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Multi-Provider Support

```typescript
// One codebase, switch dialect per environment
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

const dialect = process.env.DB_DIALECT || 'postgresql';

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dialect: dialect as 'postgresql' | 'mysql' | 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

// Schema files must use correct imports per dialect
// Use `pgTable` for PostgreSQL, `mysqlTable` for MySQL, `sqliteTable` for SQLite
```

```typescript
// Conditional schema imports (works at build time)
import { type AnyPgColumn } from 'drizzle-orm/pg-core';
import { type AnyMySqlColumn } from 'drizzle-orm/mysql-core';
```

## Views

```typescript
import { pgView, pgMaterializedView } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Regular view
export const activeUsersView = pgView('active_users').as((qb) =>
  qb.select({
    id: users.id,
    email: users.email,
    name: users.name,
    postCount: sql<number>`count(${posts.id})::int`,
  }).from(users)
    .leftJoin(posts, eq(users.id, posts.authorId))
    .where(eq(users.isActive, true))
    .groupBy(users.id)
);

// Materialized view
export const monthlyStats = pgMaterializedView('monthly_post_stats').as((qb) =>
  qb.select({
    year: sql<number>`EXTRACT(YEAR FROM ${posts.createdAt})`,
    month: sql<number>`EXTRACT(MONTH FROM ${posts.createdAt})`,
    postCount: sql<number>`count(*)::int`,
  }).from(posts)
    .groupBy(sql`1, 2`)
);

// Query views like tables
const activeUsers = await db.select().from(activeUsersView);

// Refresh materialized view
await db.execute(sql`REFRESH MATERIALIZED VIEW monthly_post_stats`);
```

## Edge & Serverless

```typescript
// Cloudflare Workers + D1
import { drizzle } from 'drizzle-orm/d1';

export default {
  async fetch(request: Request, env: Env) {
    const db = drizzle(env.DB);
    const users = await db.select().from(schema.users).all();
    return new Response(JSON.stringify(users));
  },
};

// Vercel Edge Functions + Neon
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  const result = await db.select().from(schema.users);
  return Response.json(result);
}

// AWS Lambda + pg (warm pool)
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

let pool: Pool;

export async function handler(event: any) {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  }
  const db = drizzle(pool);
  return await db.select().from(schema.users);
}
```

## Enums & Custom Types

```typescript
// PostgreSQL enum
import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', ['admin', 'moderator', 'user']);

export const users = pgTable('users', {
  role: roleEnum('role').default('user').notNull(),
});

// Custom PostgreSQL type (point)
import { customType } from 'drizzle-orm/pg-core';

export const point = customType<{ data: { x: number; y: number }; driverData: string }>({
  dataType() {
    return 'point';
  },
  fromDriver(value: string) {
    const [x, y] = value.replace('(', '').replace(')', '').split(',').map(Number);
    return { x, y };
  },
  toDriver(value: { x: number; y: number }) {
    return `(${value.x},${value.y})`;
  },
});

export const locations = pgTable('locations', {
  coord: point('coord'),
});
```

## Snapshots

```typescript
// drizzle.config.ts
export default defineConfig({
  // Snapshot files auto-generated in drizzle/ directory
  // Use them to diff schema changes
  snapshot: true, // default: true
  // Custom snapshot path
  // snapshots: './snapshots',
});

// Compare snapshots manually
// npx drizzle-kit generate will diff current schema against last snapshot
// npx drizzle-kit check validates snapshot integrity
```

## Key Points
- Drizzle Kit generates SQL files — commit them to version control.
- Use `drizzle-kit migrate` in CI/CD, never `drizzle-kit push`.
- Views and materialized views are schema-level objects — query them like tables.
- Edge/serverless requires compatible pool adapter — neon-http, d1, libsql.
- Custom types via `customType()` let you map application types to database columns.
- Snapshots enable rollback — `drizzle-kit generate --name rollback-xxx` to create revert migration.
- Drizzle Studio only works during `drizzle-kit studio` — not for production access.
