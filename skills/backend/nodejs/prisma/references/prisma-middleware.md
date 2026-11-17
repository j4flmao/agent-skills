# Prisma Query Extensions (replacement for `$use` middleware)

`prisma.$use()` middleware was deprecated in Prisma 4.16 and removed in Prisma ORM 6.14.0. Use Client Extensions (`$extends`) with a `query` component instead. Differences that matter:

- An extension returns a **new** client; code must use the extended instance (`xprisma`), not the original.
- Extensions are isolated: each `$extends` call wraps the previous client, so order is explicit.
- `$allModels` / `$allOperations` replace `params.model` / `params.action` checks.

## Timing / Logging

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const xprisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        const result = await query(args);
        const ms = Math.round(performance.now() - start);
        logger.debug({ model, operation, ms }, 'prisma query');
        return result;
      },
    },
  },
});
```

## Soft Delete

Filtering reads is easy in an extension; turning `delete` into `update` is not (the operation cannot be swapped), so expose an explicit model method instead.

```typescript
const SOFT_DELETE_MODELS = new Set(['User', 'Order']);

export const softDeleteClient = prisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
      async findFirst({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args.where = { ...args.where, deletedAt: null };
        return query(args);
      },
    },
  },
  model: {
    user: {
      async softDelete(id: string) {
        return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
      },
    },
  },
});
```

Use a partial unique index (`WHERE "deletedAt" IS NULL`) in a SQL migration so uniqueness ignores deleted rows.

## Audit Log

Write the audit row in the same transaction as the change when it must not be lost; an extension hook that writes afterwards can miss entries on crash.

```typescript
export const auditedClient = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);
        if (['create', 'update', 'delete'].includes(operation) && model !== 'AuditLog') {
          await prisma.auditLog.create({
            data: {
              model,
              action: operation,
              recordId: (result as { id?: unknown })?.id?.toString() ?? null,
              changes: 'data' in args ? (args.data as object) : undefined,
            },
          });
        }
        return result;
      },
    },
  },
});
```

## Field Masking (result extension)

```typescript
export const maskedClient = prisma.$extends({
  result: {
    user: {
      maskedEmail: {
        needs: { email: true },
        compute(user) {
          const [name, domain] = user.email.split('@');
          return `${name[0]}***@${domain}`;
        },
      },
    },
  },
});
```

Prefer `omit` (GA since Prisma 6.2) to keep secrets such as `passwordHash` out of results entirely.

## Read Cache

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL! });
await redis.connect();

export const cachedClient = prisma.$extends({
  query: {
    product: {
      async findUnique({ args, query }) {
        const key = `product:v1:${JSON.stringify(args.where)}`;
        const hit = await redis.get(key);
        if (hit) return JSON.parse(hit);
        const result = await query(args);
        if (result) await redis.set(key, JSON.stringify(result), { EX: 300 });
        return result;
      },
      async update({ args, query }) {
        const result = await query(args);
        await redis.del(`product:v1:${JSON.stringify(args.where)}`); // delete after the write
        return result;
      },
    },
  },
});
```

Cache keys built from `args.where` must match exactly; for anything beyond single-row lookups use explicit cache-aside in the service layer (see `skills/backend/universal/caching/SKILL.md`).

## Validation

Validate at the API boundary (Zod in the route handler) first. A query extension is a second line of defence:

```typescript
import { z } from 'zod';

const userCreate = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
});

export const validatedClient = prisma.$extends({
  query: {
    user: {
      async create({ args, query }) {
        args.data = { ...args.data, ...userCreate.parse(args.data) };
        return query(args);
      },
    },
  },
});
```

## Tenant Isolation

Build one extended client per request with the tenant bound; never rely on a global mutable "current tenant".

```typescript
export function forTenant(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);
          const a = args as { where?: object; data?: object };
          if (operation === 'create') a.data = { ...a.data, tenantId };
          else if ('where' in a || operation.startsWith('find') || operation.endsWith('Many')) {
            a.where = { ...a.where, tenantId };
          }
          return query(a as typeof args);
        },
      },
    },
  });
}
```

For hard isolation, pair this with PostgreSQL Row-Level Security (`SET app.tenant_id` inside a transaction) so a forgotten filter cannot leak rows.

## Key Points

- `$use` no longer exists in current Prisma; migrate every middleware to `$extends`.
- Query extensions modify `args` or the result; result extensions add computed fields.
- Extensions wrap a client and return a new one; export and use the extended client.
- Keep authorization and tenant scoping enforced in the database too (RLS), not only in an extension.
