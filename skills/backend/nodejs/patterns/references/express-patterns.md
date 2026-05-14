# Express Patterns

## Router Pattern

```typescript
import { Router } from 'express';
const router = Router({ mergeParams: true });
router.get('/', listOrders);
router.post('/', validate(createOrderSchema), createOrder);
export default router;
```

## Error Wrapper

```typescript
const asyncWrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

# Node.js Testing (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { app } from '../app';

describe('GET /orders', () => {
  it('returns 200', async () => {
    const res = await supertest(app).get('/api/v1/orders');
    expect(res.status).toBe(200);
  });
});
```
