# Drizzle Edge Deployment Reference

## Edge-Compatible Configuration

Drizzle works on edge runtimes (Cloudflare Workers, Vercel Edge, Deno) with specific configuration.

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## Neon Serverless Driver

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

// Usage in a serverless function
export default async (req: Request) => {
  const result = await db.query.orders.findMany({
    where: (orders, { eq }) => eq(orders.status, 'pending'),
  });
  return Response.json(result);
};
```

## Cloudflare D1 (SQLite)

```typescript
import { drizzle } from 'drizzle-orm/d1';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env) {
    const db = drizzle(env.DB);
    const result = await db.select().from(orders).all();
    return new Response(JSON.stringify(result));
  },
};
```

## Vercel Postgres

```typescript
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';

export const db = drizzle(sql);

export async function getOrders() {
  return await db.query.orders.findMany({
    limit: 50,
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
  });
}
```

## Connection Pooling with pgBouncer

```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

neonConfig.poolQueryTimoutMillis = 30000;
neonConfig.usePgBouncer = true;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool);
```

## HTTP Query Mode

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// HTTP mode avoids TCP connection limits
const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: {
    cache: 'no-store',
  },
});

export const db = drizzle(sql);
```

## Edge Optimized Queries

```typescript
// Use prepared statements for reuse across requests
const getOrderById = db.select()
  .from(orders)
  .where(eq(orders.id, sql.placeholder('id')))
  .prepare('edge_get_order');

// Batch multiple queries in one network roundtrip
const [users, products] = await db.batch([
  db.select().from(users).limit(10),
  db.select().from(products).limit(10),
]);
```

## Migration Strategy for Edge

```bash
# Generate migrations locally
npx drizzle-kit generate

# Apply migrations in CI/CD, not at runtime
npx drizzle-kit migrate
```

```typescript
// scripts/migrate.ts
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

await migrate(db, { migrationsFolder: 'drizzle' });
```

## Type Safety Across Edge

```typescript
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

export async function createOrder(data: NewOrder): Promise<Order> {
  const [order] = await db.insert(orders).values(data).returning();
  return order;
}
```

## Key Points

- Neon HTTP driver works on edge runtimes without TCP
- Cloudflare D1 uses SQLite with Drizzle ORM integration
- Vercel Postgres provides serverless connection pooling
- pgBouncer mode handles connection limits at scale
- HTTP query mode avoids TCP overhead on edge
- Prepared statements optimize repeated queries
- Batch API reduces network roundtrips
- Run migrations in CI/CD, never at edge runtime
- InferSelectModel/InferInsertModel maintain type safety
- Edge environments require driver-specific Drizzle imports
