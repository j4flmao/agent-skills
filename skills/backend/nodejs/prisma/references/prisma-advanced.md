# Prisma Advanced Patterns

## Middleware (Deprecated) vs Extensions

```typescript
// Old: Middleware (deprecated in Prisma 5+)
prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'findUnique') {
    params.action = 'findFirst';
    params.args.where = { ...params.args.where, deletedAt: null };
  }
  return next(params);
});

// New: Client Extensions (Prisma 5+)
const xprisma = prisma.$extends({
  query: {
    user: {
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
});
```

## Soft Delete Extension

```typescript
export const softDeleteExtension = Prisma.defineExtension({
  name: 'soft-delete',
  query: {
    $allModels: {
      async delete({ model, args, query }) {
        if (model !== 'User') return query(args);
        return (prisma as any)[model].update({
          ...args,
          data: { deletedAt: new Date() },
        });
      },
      async findUnique({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
});
```

## Computed Fields

```typescript
export const computedFieldsExtension = Prisma.defineExtension({
  result: {
    order: {
      totalWithTax: {
        needs: { totalAmount: true },
        compute(order) {
          return order.totalAmount * 1.1; // 10% tax
        },
      },
      itemCount: {
        needs: { items: true },
        compute(order) {
          return order.items?.length || 0;
        },
      },
    },
  },
});
```

## Model Hooks via Extensions

```typescript
import { Prisma } from '@prisma/client';

export const auditExtension = Prisma.defineExtension({
  name: 'audit-log',
  query: {
    order: {
      async create({ args, query }) {
        const result = await query(args);
        await auditLog.create({
          data: {
            action: 'CREATE',
            model: 'Order',
            recordId: result.id,
            data: args.data,
          },
        });
        return result;
      },
    },
  },
});
```

## Batch Operations

```typescript
// createMany — bulk insert
await prisma.product.createMany({
  data: products,
  skipDuplicates: true,
});

// Bulk update in transaction
await prisma.$transaction(
  items.map(item =>
    prisma.product.update({
      where: { id: item.id },
      data: { stock: { decrement: item.quantity } },
    })
  )
);

// deleteMany — bulk delete
await prisma.log.deleteMany({
  where: { createdAt: { lt: thirtyDaysAgo } },
});

// updateMany — bulk update
await prisma.order.updateMany({
  where: { status: 'PENDING', createdAt: { lt: cutoffDate } },
  data: { status: 'CANCELLED' },
});
```

## Raw Queries with Typing

```typescript
import { Prisma } from '@prisma/client';

// Typed raw query
const users = await prisma.$queryRaw<User[]>`
  SELECT id, email, name
  FROM "User"
  WHERE email ILIKE ${'%' + search + '%'}
`;

// Raw execute
const result = await prisma.$executeRaw`
  UPDATE "Order"
  SET status = 'CANCELLED'
  WHERE created_at < ${cutoff}
`;

// Raw with specific Prisma types
const orders = await prisma.$queryRaw<
  Prisma.OrderGetPayload<{ select: { id: true; status: true } }>[]
>`SELECT id, status FROM "Order" WHERE status = 'PENDING'`;
```

## JSON Fields

```typescript
model Product {
  id      String @id @default(uuid())
  name    String
  metadata Json   // Flexible key-value data
}

// Query JSON fields
const products = await prisma.product.findMany({
  where: {
    metadata: {
      path: ['color'],
      equals: 'red',
    },
  },
});

// Filter by JSON array contains
const products = await prisma.product.findMany({
  where: {
    metadata: {
      array_contains: { key: 'size', value: 'L' },
    },
  },
});
```

## Full-Text Search (PostgreSQL)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

model Post {
  id    String @id @default(uuid())
  title String
  body  String

  @@index([title, body], type: FullText)
}
```

```typescript
// Search
const posts = await prisma.post.findMany({
  where: {
    OR: [
      { title: { search: 'database optimization' } },
      { body: { search: 'database optimization' } },
    ],
  },
  orderBy: { _relevance: { fields: ['title', 'body'], search: 'database', sort: 'desc' } },
});
```

## Connection Pooling

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
  // For serverless with PgBouncer
  // DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=5"
});
```
