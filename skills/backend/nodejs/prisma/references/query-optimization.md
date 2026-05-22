# Query Optimization

## Eager Loading

### include vs select

```typescript
// include — full relation objects (heavier)
const user = await prisma.user.findUnique({
  where: { id: 'abc' },
  include: {
    posts: {
      include: {
        comments: true,
      },
    },
  },
});

// select — pick specific fields (lighter, more efficient)
const user = await prisma.user.findUnique({
  where: { id: 'abc' },
  select: {
    id: true,
    name: true,
    posts: {
      select: { id: true, title: true },
      take: 5,
    },
  },
});
```

**When to use each:**
- `include`: Need entire related objects, prototyping, simple queries
- `select`: Production queries, performance-critical paths, GraphQL resolvers
- `select` is more efficient — avoids fetching unused columns

### Filtering Relations

```typescript
const user = await prisma.user.findUnique({
  where: { id: 'abc' },
  include: {
    // Only include published posts
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});

// Nested relation filtering
const user = await prisma.user.findUnique({
  where: { id: 'abc' },
  include: {
    posts: {
      where: { published: true },
      include: {
        comments: {
          where: { moderated: true },
          select: { id: true, body: true },
        },
      },
    },
  },
});
```

## Pagination

### Offset Pagination (simple, small datasets)

```typescript
async function getPosts(page: number, pageSize: number) {
  const [data, total] = await Promise.all([
    prisma.post.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.count({ where: { published: true } }),
  ]);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPrevPage: page > 1,
    },
  };
}
```

### Cursor Pagination (preferred for large datasets)

```typescript
async function getPostsCursor(cursor?: string, limit = 20) {
  const posts = await prisma.post.findMany({
    take: limit,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, createdAt: true },
  });

  return {
    data: posts,
    meta: {
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
      hasNextPage: posts.length === limit,
    },
  };
}
```

### Keyset Pagination (for sorted queries)

```typescript
async function getPostsKeyset(
  where: { createdAt?: { lt: Date } } = {},
  limit = 20
) {
  const posts = await prisma.post.findMany({
    take: limit,
    where: { published: true, ...where },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, createdAt: true },
  });

  return {
    data: posts,
    meta: {
      nextCursor: posts.length === limit
        ? posts[posts.length - 1].createdAt.toISOString()
        : null,
    },
  };
}

// Usage: pass last item's createdAt as cursor
const page1 = await getPostsKeyset();
const page2 = await getPostsKeyset({
  createdAt: { lt: new Date(page1.meta.nextCursor!) },
});
```

## Raw Queries

When Prisma query API is insufficient:

```typescript
// Raw select — returns unknown[] (cast to typed result)
const users = await prisma.$queryRaw<User[]>`
  SELECT id, email, name
  FROM "User"
  WHERE email LIKE ${'%' + search + '%'}
  LIMIT ${limit}
`;

// Raw execute — for INSERT/UPDATE/DELETE
await prisma.$executeRaw`
  UPDATE "Order"
  SET status = 'CANCELLED'
  WHERE "createdAt" < ${thirtyDaysAgo}
  AND status = 'PENDING'
`;

// Parameterized queries (safe from injection)
const result = await prisma.$queryRaw`
  SELECT * FROM "Product"
  WHERE price BETWEEN ${min} AND ${max}
  AND category = ${category}
`;
```

**When to use raw queries:**
- Full-text search with database-specific syntax (PostgreSQL tsvector)
- Complex aggregations with window functions
- Bulk operations that need RETURNING clause
- Database-specific features not exposed by Prisma
- Migrating from legacy SQL codebase

## Connection Pooling

### Standard Pooling

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  connectionLimit: 10,      // max concurrent connections
  poolTimeout: 30,          // seconds to wait for connection
});
```

### PgBouncer for Serverless/Edge

```env
# .env — use transaction mode
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=5&pool_timeout=10"
```

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Prisma Accelerate (for edge/serverless)

```bash
npm install @prisma/extension-accelerate
```

```typescript
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())
```

## Batch Operations

```typescript
// Bulk create
await prisma.product.createMany({
  data: [
    { name: 'Widget', price: 9.99 },
    { name: 'Gadget', price: 19.99 },
  ],
  skipDuplicates: true,  // skip rows that violate unique constraints
});

// Bulk update (in transaction)
await prisma.$transaction(
  items.map(item =>
    prisma.product.update({
      where: { id: item.id },
      data: { stock: { decrement: item.quantity } },
    })
  )
);

// Bulk delete
await prisma.log.deleteMany({
  where: { createdAt: { lt: thirtyDaysAgo } },
});
```

## Query Performance Tips

1. **Use select over include** in production paths
2. **Limit relation fetches** with `take` inside `include`
3. **Use compound indexes** for filtered + sorted queries
4. **Avoid N+1** — batch related queries with `include` or `findMany({ where: { id: { in: ids } } })`
5. **Use raw queries** for complex aggregations
6. **Prefer cursor pagination** over offset for large datasets
7. **Monitor query log** in development with `log: ['query']`
8. **Use $transaction** for atomic multi-table operations
9. **Avoid JSON fields** in filtered queries — they can't be indexed efficiently
10. **Use @map and @@map** to match existing table/column names

## Monitoring

Enable query logging:

```typescript
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query:', e.query);
  console.log('Params:', e.params);
  console.log('Duration:', e.duration, 'ms');
});
```

## Query Plan Analysis

```sql
-- Run alongside Prisma to analyze slow queries
EXPLAIN ANALYZE
SELECT * FROM "Order" WHERE "customerId" = 'abc' ORDER BY "createdAt" DESC LIMIT 20;
```

Add database indexes for slow queries:

```prisma
model Order {
  id         String   @id @default(uuid())
  customerId String
  createdAt  DateTime @default(now())

  @@index([customerId, createdAt])  // compound index for filtered + sorted query
  @@index([status])                 // single index for filtered query
}
```
