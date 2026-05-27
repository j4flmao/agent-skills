---
name: nodejs-prisma
description: >
  Use this skill when working with Prisma ORM — schema design, migrations, query optimization, relations, middleware, Prisma Client patterns. This skill enforces: proper relation modeling, migration workflow, eager loading vs lazy, connection pooling, soft deletes via middleware. Do NOT use for: TypeORM, Drizzle ORM, Mongoose, raw SQL-first workflows.
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

# Node.js Prisma

## Purpose
Design and optimize database schemas with Prisma ORM — schema modeling, migrations, query performance, and middleware.

## Agent Protocol

### Trigger
User request includes: `Prisma`, `Prisma ORM`, `database schema`, `migration`, `Prisma Client`, `Prisma Studio`, `schema.prisma`, `prisma migrate`, `prisma generate`, `prisma seed`.

### Input Context
- Database (PostgreSQL, MySQL, SQLite, MongoDB, SQL Server)
- Existing schema (if any)
- Relation patterns (one-to-many, many-to-many)
- Query patterns (read-heavy, write-heavy)

### Output Artifact
Prisma schema snippets, migration strategy, query patterns, middleware setup.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Schema models mapped correctly with relations
- Migration commands provided
- Query optimized with select/include/where
- Middleware configured (soft delete, audit)
- Connection pooling configured

### Max Response Length
4096 tokens

## Workflow

### Step 1: Prisma Project Setup
```bash
npm install prisma --save-dev
npm install @prisma/client

npx prisma init
# Creates:
#   prisma/schema.prisma
#   .env (with DATABASE_URL)
```

```typescript
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "referentialIntegrity"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Step 2: Schema Modeling

**One-to-Many:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Many-to-Many (implicit):**
```prisma
model Post {
  id      String   @id @default(uuid())
  title   String
  tags    Tag[]
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  posts Post[]
}
```

**Many-to-Many (explicit with extra fields):**
```prisma
model Order {
  id           String         @id @default(uuid())
  customerId   String
  customer     Customer       @relation(fields: [customerId], references: [id])
  items        OrderItem[]
  total        Decimal        @db.Decimal(10, 2)
  status       OrderStatus    @default(PENDING)
  createdAt    DateTime       @default(now())
}

model Product {
  id       String       @id @default(uuid())
  name     String
  price    Decimal      @db.Decimal(10, 2)
  orders   OrderItem[]
}

model OrderItem {
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Decimal @db.Decimal(10, 2)

  @@id([orderId, productId])
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

**Self-relation:**
```prisma
model Employee {
  id          String       @id @default(uuid())
  name        String
  managerId   String?
  manager     Employee?    @relation("ManagerSubordinates", fields: [managerId], references: [id])
  subordinates Employee[]  @relation("ManagerSubordinates")
}
```

### Step 3: Migration Workflow

```bash
# Create initial migration
npx prisma migrate dev --name init

# Create migration after schema changes
npx prisma migrate dev --name add-product-table

# Generate Prisma Client after schema changes
npx prisma generate

# Apply migrations to production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# View database
npx prisma studio
```

### Step 4: Prisma Client Queries

```typescript
// CRUD operations
const user = await prisma.user.create({
  data: { email: 'alice@example.com', name: 'Alice' },
});

const users = await prisma.user.findMany({
  where: { email: { contains: 'alice' } },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0,
});

const user = await prisma.user.findUnique({
  where: { email: 'alice@example.com' },
  include: { posts: true },
});

const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: 'New Name' },
});

const deleted = await prisma.user.delete({
  where: { id: userId },
});
```

### Step 5: Eager Loading (Include vs Select)

```typescript
// include — load entire relation
const userWithPosts = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    },
  },
});

// select — pick specific fields (more efficient)
const userSummary = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    name: true,
    posts: {
      select: { id: true, title: true },
      where: { published: true },
    },
  },
});

// Nested include
const order = await prisma.order.findUnique({
  where: { id: orderId },
  include: {
    customer: true,
    items: {
      include: { product: true },
    },
  },
});
```

### Step 6: Pagination

```typescript
// Offset pagination
const page = 1;
const pageSize = 20;

const [items, total] = await Promise.all([
  prisma.post.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    where: { published: true },
    orderBy: { createdAt: 'desc' },
  }),
  prisma.post.count({ where: { published: true } }),
]);

// Cursor pagination (preferred for large datasets)
const cursor = 'some-last-id';

const posts = await prisma.post.findMany({
  take: 20,
  skip: 1,         // skip the cursor itself
  cursor: { id: cursor },
  where: { published: true },
  orderBy: { createdAt: 'desc' },
});
```

### Step 7: Transactions

```typescript
// Interactive transaction
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  for (const item of items) {
    await tx.inventory.update({
      where: { productId: item.productId },
      data: { quantity: { decrement: item.quantity } },
    });
  }
  return order;
});

// Batch transaction
const [user, post] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'bob@test.com' } }),
  prisma.post.create({ data: { title: 'Hello', authorId: '...' } }),
]);
```

### Step 8: Middleware (Soft Delete)

```typescript
// Soft delete middleware
prisma.$use(async (params, next) => {
  // Intercept findMany, findFirst, findUnique
  if (params.model === 'User') {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    if (params.action === 'findUnique') {
      params.action = 'findFirst';
      params.args.where = { ...params.args.where, deletedAt: null };
    }
  }

  // Intercept delete -> update
  if (params.action === 'delete' && params.model === 'User') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }

  return next(params);
});

// Audit log middleware
prisma.$use(async (params, next) => {
  const result = await next(params);
  if (['create', 'update', 'delete'].includes(params.action)) {
    await auditLog.log({
      model: params.model,
      action: params.action,
      args: params.args,
      timestamp: new Date(),
    });
  }
  return result;
});
```

## Rules
- Single PrismaClient instance reused across app — no new PrismaClient() per request.
- Use implicit many-to-many unless junction table needs extra fields.
- Cursor pagination for large datasets, offset for small (<1000 rows).
- Avoid N+1 — always use include/select for related data.
- Transaction for operations that modify multiple related tables.
- Soft delete via middleware, never raw delete for user-facing data.
- Connection pooling with PgBouncer for serverless/edge environments.
- Field-level selects in production queries — never select *.
- Prisma migration files committed to git. Never run migrate dev in prod.

## References
  - references/prisma-advanced.md — Prisma Advanced Patterns
  - references/prisma-deployment.md — Prisma Deployment
  - references/prisma-middleware.md — Prisma Middleware Reference
  - references/prisma-relations.md — Prisma Relations Reference
  - references/query-optimization.md — Query Optimization
  - references/schema-migrations.md — Schema & Migrations
## Handoff
Hand off to `backend/nodejs/express/SKILL.md` for API layer integration or `backend/universal/api-response/SKILL.md` for response formatting.
