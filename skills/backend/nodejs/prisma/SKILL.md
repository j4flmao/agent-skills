---
name: nodejs-prisma
description: >
  Use this skill when working with Prisma ORM — schema modeling, migrations, queries, relations, middleware, and deployment. This skill enforces: data model normalization, relation conventions, Prisma Client best practices, migration safety, and performance optimization. Requires @prisma/client. Do NOT use for: Mongoose, TypeORM, Drizzle ORM, or non-relational databases.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nodejs, prisma, phase-10]
---

# Prisma ORM

## Purpose
Design database schemas, write performant queries, manage migrations, implement middleware, and optimize Prisma Client for production.

## Agent Protocol

### Trigger
User request includes: `prisma`, `prisma schema`, `prisma migrate`, `prisma client`, `prisma relation`, `prisma middleware`, `prisma query`, `prisma performance`, `prisma seed`, `prisma studio`.

### Input Context
- Database (PostgreSQL, MySQL, SQLite, SQL Server, MongoDB)
- Prisma version (5.x, 6.x)
- Schema complexity (relations, enums, composite keys)
- Deployment (Node.js, serverless, edge)

### Output Artifact
Schema definition, query examples, migration setup, middleware patterns, performance optimizations.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations.

### Completion Criteria
- Schema defined with proper relations, indexes, constraints
- Migrations generated and applied
- Queries use select, include, and where efficiently
- Middleware (interactive transactions, extensions) configured
- Connection pooling for serverless or production

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Prisma vs Drizzle ORM vs TypeORM vs Knex

| Criterion | Prisma | Drizzle ORM | TypeORM | Knex |
|-----------|--------|-------------|---------|------|
| Type safety | Full (generated) | Full (inferred) | Partial | None |
| Migration system | Prisma Migrate | Drizzle Kit | TypeORM migrations | Knex migrations |
| Query builder | Declarative (Prisma Client) | SQL-like | Active Record / Data Mapper | SQL builder |
| Relation handling | Include / select | Joins explicit | relations / find | Manual JOINs |
| Middleware/hooks | Extensions (v5+) | Middleware | Subscribers | Raw Knex plugins |
| Performance | Moderate (mapped layer) | High (thin wrapper) | Moderate | High |
| Bundle size | Large (generated client) | Tiny (tree-shakeable) | Large | Moderate |

Decision: Full type safety + auto-complete → Prisma. Maximum performance + SQL control → Drizzle. Active Record familiarity → TypeORM.

### Schema Design: Prisma vs Raw SQL

| Aspect | Prisma Schema | Raw SQL |
|--------|--------------|---------|
| Source of truth | schema.prisma | migrations |
| Readability | Declarative, concise | Verbose |
| Index management | @@index decorators | CREATE INDEX |
| Enum support | Native (enum keyword) | CREATE TYPE |
| Composite keys | @@id([field1, field2]) | Composite PK |

Decision: Prisma-first project → use schema.prisma as source of truth. Existing DB → introspect with `prisma db pull`.

## Workflow

### Step 1: Schema Definition

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["extendedWhereUnique"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  USER
  MODERATOR
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      UserRole @default(USER)
  active    Boolean  @default(true)
  profile   Profile?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email, active])
  @@map("users")
}

model Profile {
  id      String @id @default(uuid())
  bio     String?
  avatar  String?
  userId  String @unique
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId, published])
  @@map("posts")
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  posts Post[]

  @@map("tags")
}

model PostTag {
  postId String
  tagId  String
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}
```

### Step 2: Query Patterns

```typescript
// src/repositories/user.repository.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SELECT with specific fields
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
}

// Include relations (N+1 safe — Prisma batches)
export async function findUserWithProfile(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      posts: {
        where: { published: true },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

// Paginated list
export async function findUsers(page: number, limit: number) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.user.count(),
  ]);
  return { data: users, total, page, totalPages: Math.ceil(total / limit) };
}

// Create with nested write
export async function createUserWithProfile(data: CreateUserDto) {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      profile: {
        create: { bio: data.bio },
      },
    },
    include: { profile: true },
  });
}

// Batch update
export async function deactivateInactiveUsers(days: number) {
  const cutoff = new Date(Date.now() - days * 86400000);
  return prisma.user.updateMany({
    where: { lastLoginAt: { lt: cutoff }, active: true },
    data: { active: false },
  });
}

// Delete cascade (defined in schema)
export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}
```

### Step 3: Prisma Client Configuration

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: 'minimal',
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Step 4: Migrations

```bash
# Create migration from schema changes
npx prisma migrate dev --name add_user_profile

# Apply to production
npx prisma migrate deploy

# Reset (dev only — drops data)
npx prisma migrate reset

# Generate client after schema change
npx prisma generate

# View migration status
npx prisma migrate status
```

### Step 5: Middleware / Extensions (Prisma 5+)

```typescript
// src/lib/prisma-extension.ts
import { PrismaClient } from '@prisma/client';

export const xprisma = new PrismaClient()
  .$extends({
    query: {
      user: {
        async create({ args, query }) {
          // Auto-generate slug or hash password before create
          return query(args);
        },
        async findUnique({ args, query }) {
          // Soft-delete filter
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
      },
    },
    result: {
      user: {
        fullName: {
          needs: { firstName: true, lastName: true },
          compute(user) {
            return `${user.firstName} ${user.lastName}`;
          },
        },
      },
    },
    model: {
      user: {
        async findByEmail(email: string) {
          return prisma.user.findUnique({ where: { email } });
        },
      },
    },
  });
```

### Step 6: Interactive Transactions

```typescript
// Transfer funds with transaction
export async function transferFunds(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const fromAccount = await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });

    if (fromAccount.balance < 0) {
      throw new Error('Insufficient funds');
    }

    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });

    await tx.transaction.create({
      data: { fromId, toId, amount, type: 'TRANSFER' },
    });
  });
}
```

### Step 7: Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'Admin',
      role: 'ADMIN',
      profile: { create: { bio: 'System admin' } },
      posts: {
        create: [
          { title: 'First Post', content: 'Hello world', published: true },
          { title: 'Draft', content: 'Not yet published' },
        ],
      },
    },
  });
  console.log('Seeded user:', user.id);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

## Production Considerations

### Connection Pooling (Serverless)

```typescript
// Connection pool for serverless (Vercel, Lambda)
import { PrismaClient } from '@prisma/client';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });
```

### Query Performance
- Use `select` over `include` when only specific fields needed
- Batch relation loading: Prisma already batches via `DATABASE_URL` connection
- Use raw queries with `$queryRaw` for complex aggregations
- Add `@@index` on frequently filtered/sorted columns
- Use `@relation` with `onDelete: Cascade` for referential integrity at DB level
- Limit relation depth — each `include` adds a JOIN

### Error Handling
```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

try {
  await prisma.user.create({ data: { email: 'dupe@test.com' } });
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') { // Unique constraint violation
      throw new ConflictError('Email already exists');
    }
    if (error.code === 'P2025') { // Record not found
      throw new NotFoundError('User not found');
    }
  }
  throw error;
}
```

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Full object in select | Overfetches data, slower queries | Select only needed fields |
| Nested create without `createMany` | Multiple round trips | Use `createMany` for batch inserts |
| Missing `@updatedAt` | No auto-update timestamp | Always add `@updatedAt` on mutable models |
| No connection pooling for serverless | Cold starts, connection exhaustion | Use Prisma Accelerate or pgBouncer |
| N+1 via loop queries | Sequential DB calls | Use `include` or batch with `findMany` |
| Schema drift (manual DB changes) | Out of sync with Prisma schema | Always use Prisma Migrate |

## Security Considerations
- Raw queries (`$queryRawUnsafe`) risk SQL injection — use `$queryRaw` with parameterized templates
- Prisma validates input types, but always validate business rules in application layer
- Connection string in `.env` — never committed to repo
- Audit logging via Prisma middleware for sensitive models
- Field-level `@map` for column obfuscation not needed — use DB-level encryption
- Use `select` to avoid exposing sensitive fields (password hash, etc.)

## Testing Strategies

```typescript
import { PrismaClient } from '@prisma/client';
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';

const prisma = new PrismaClient();

describe('User Repository', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and find user', async () => {
    const user = await createUser({ email: 'test@test.com', name: 'Test' });
    const found = await findUserById(user.id);
    expect(found?.email).toBe('test@test.com');
  });
});
```

Use separate test database with test user. Use `prisma migrate deploy` in CI. Use `@prisma/nextjs-monorepo-workaround-plugin` for monorepos.

## Rules
- Schema is the source of truth — `prisma migrate dev` after every schema change.
- `prisma generate` after every pull/sync — always regenerate client.
- `select` over `include` for production queries — minimize data transfer.
- Soft deletes via `deletedAt` + middleware filter — never hard delete user data.
- `$transaction` for atomic multi-table operations.
- `$extends` for cross-cutting concerns (soft delete, audit, computed fields).
- No `prisma.$disconnect()` in serverless handlers — let adapter handle pooling.
- Index all foreign keys and frequently queried columns.

## References
  - references/prisma-advanced.md — Prisma Advanced Patterns
  - references/prisma-deployment.md — Deployment and Performance
  - references/prisma-middleware.md — Middleware and Extensions
  - references/prisma-relations.md — Relation Patterns
  - references/query-optimization.md — Query Optimization
  - references/schema-migrations.md — Schema and Migration Patterns
## Handoff
Hand off to `backend/nodejs/drizzle/SKILL.md` for Drizzle ORM patterns or `backend/nodejs/patterns/SKILL.md` for advanced Node patterns.
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