# Prisma Middleware Reference

## Middleware Lifecycle

Prisma middleware executes on client operations with a request/response lifecycle.

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  // Pre-operation
  const start = Date.now();

  const result = await next(params);

  // Post-operation
  const duration = Date.now() - start;
  console.log(`Query ${params.model}.${params.action} took ${duration}ms`);

  return result;
});
```

## Soft Delete Middleware

```typescript
prisma.$use(async (params, next) => {
  // Intercept find queries to filter out soft-deleted records
  if (params.model === 'User' || params.model === 'Order') {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      params.args.where.deletedAt = null;
    }

    // Intercept delete actions as soft delete
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      if (!params.args.data) params.args.data = {};
      params.args.data.deletedAt = new Date();
    }
  }

  return next(params);
});
```

## Audit Log Middleware

```typescript
prisma.$use(async (params, next) => {
  const result = await next(params);

  if (['create', 'update', 'delete'].includes(params.action)) {
    await prisma.auditLog.create({
      data: {
        model: params.model!,
        action: params.action,
        recordId: result?.id?.toString(),
        timestamp: new Date(),
        changes: params.args?.data || null,
      },
    });
  }

  return result;
});
```

## Field Masking Middleware

```typescript
prisma.$use(async (params, next) => {
  const result = await next(params);

  // Mask sensitive fields in responses
  if (params.model === 'User' && result) {
    if (result.email) {
      const [name, domain] = result.email.split('@');
      result.email = `${name[0]}***@${domain}`;
    }
  }

  return result;
});
```

## Cache Middleware

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL! });

prisma.$use(async (params, next) => {
  // Only cache read operations
  if (params.action === 'findUnique' || params.action === 'findFirst') {
    const cacheKey = `${params.model}:${JSON.stringify(params.args)}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await next(params);

    if (result) {
      await redis.setEx(cacheKey, 300, JSON.stringify(result));
    }

    return result;
  }

  // Invalidate cache on writes
  if (params.action === 'create' || params.action === 'update' || params.action === 'delete') {
    const keys = await redis.keys(`${params.model}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }

  return next(params);
});
```

## Validation Middleware

```typescript
import { z } from 'zod';

const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(18).optional(),
});

prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'create') {
    const validation = userCreateSchema.safeParse(params.args.data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error.message}`);
    }
    params.args.data = validation.data;
  }

  return next(params);
});
```

## Tenant Isolation Middleware

```typescript
prisma.$use(async (params, next) => {
  const tenantId = getCurrentTenantId();

  if (tenantId && hasTenantField(params.model!)) {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};

    if (params.action === 'create') {
      params.args.data.tenantId = tenantId;
    } else {
      params.args.where.tenantId = tenantId;
    }
  }

  return next(params);
});
```

## Key Points

- Middleware runs in registration order as a chain
- Soft delete intercepts delete actions and sets deletedAt
- Audit logs capture all data mutations automatically
- Field masking hides sensitive fields in responses
- Cache middleware reduces database load for reads
- Schema validation prevents invalid data at Prisma level
- Tenant isolation filters queries to current tenant
- Each middleware receives params and next function
- Pre-hooks modify params before query execution
- Post-hooks transform results after query execution
