# API Response Validation

## Overview
Validate API responses against schemas to ensure consistency, catch regressions, and enforce contract compliance across all endpoints.

## Schema-Based Response Validation

```typescript
import { z } from 'zod';

// Response schema for order endpoint
const OrderResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
    })).min(1),
    total: z.number().positive(),
    createdAt: z.string().datetime(),
  }),
});

function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Response validation failed: ${result.error.message}`);
  }
  return result.data;
}

// Apply in response middleware
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (res.statusCode >= 200 && res.statusCode < 300 && body?.data) {
      try {
        validateResponse(OrderResponseSchema, body);
      } catch (err) {
        console.error('Response schema violation:', err);
      }
    }
    return originalJson(body);
  };
  next();
});
```

## Testing Response Consistency

```typescript
describe('API Response Consistency', () => {
  it('returns consistent envelope for all endpoints', async () => {
    const endpoints = [
      { method: 'GET', path: '/v2/orders' },
      { method: 'GET', path: '/v2/orders/123' },
      { method: 'POST', path: '/v2/orders', body: { /* valid */ } },
      { method: 'GET', path: '/v2/users/me' },
      { method: 'GET', path: '/v2/products' },
    ];

    for (const endpoint of endpoints) {
      const res = await request(app)
        [endpoint.method.toLowerCase()](endpoint.path)
        .send(endpoint.body);

      // Every response must have success and data/error
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.success).toBe('boolean');
    }
  });

  it('paginated responses include required fields', async () => {
    const res = await request(app).get('/v2/orders?page=1&limit=20');
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('pagination');
    expect(res.body.data.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });
});
```

## Validation Error Format Enforcement

```typescript
describe('Error Response Format', () => {
  const errorCases = [
    { path: '/v2/orders/nonexistent', expectedStatus: 404, expectedCode: 'NOT_FOUND' },
    { path: '/v2/orders', method: 'POST', body: {}, expectedStatus: 422, expectedCode: 'VALIDATION_ERROR' },
    { path: '/v2/admin/users', expectedStatus: 403, expectedCode: 'FORBIDDEN' },
    { path: '/v2/orders', method: 'POST', headers: {}, expectedStatus: 401, expectedCode: 'UNAUTHORIZED' },
  ];

  for (const { path, method = 'GET', body, headers, expectedStatus, expectedCode } of errorCases) {
    it(`returns ${expectedCode} for ${method} ${path}`, async () => {
      const req = request(app)[method.toLowerCase()](path);
      if (body) req.send(body);
      if (headers) req.set(headers);

      const res = await req;
      expect(res.status).toBe(expectedStatus);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(expectedCode);
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error).toHaveProperty('requestId');
      expect(res.body.data).toBeNull();
    });
  }
});
```

## Response Type Safety

```typescript
// TypeScript ensures response type consistency at compile time
interface ApiResponse<T> {
  success: true;
  data: T;
  error: null;
}

interface ApiError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

type ApiResult<T> = ApiResponse<T> | ApiError;

function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { success: true, data, error: null };
  res.status(status).json(body);
}

function sendError(res: Response, code: string, message: string, status = 400): void {
  const body: ApiError = {
    success: false,
    data: null,
    error: { code, message, requestId: res.locals.requestId },
  };
  res.status(status).json(body);
}
```

## Key Points
- Define response schemas with Zod/TypeScript for every endpoint
- Validate responses in middleware to catch schema violations
- Test that every endpoint returns the consistent envelope format
- Verify error responses have required fields: code, message, requestId
- Use TypeScript union types (ApiResponse<T> | ApiError) for compile-time safety
