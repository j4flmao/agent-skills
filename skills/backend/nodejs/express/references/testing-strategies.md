# Express Testing Strategies

## Unit Test Setup

```typescript
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('GET /api/v1/users', () => {
  it('should return paginated users', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });
});
```

## Integration Test with Database

```typescript
import { createApp } from '../src/app';
import { pool } from '../src/config/database';
import { runMigrations, clearDatabase } from './test-helpers';

let app: Express;

beforeAll(async () => {
  await runMigrations();
  app = createApp();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/v1/users', () => {
  it('should create a new user', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);

    expect(res.body.data.name).toBe('John');
  });

  it('should return 400 for duplicate email', async () => {
    await request(app).post('/api/v1/users').send({ name: 'John', email: 'john@example.com' });
    const res = await request(app).post('/api/v1/users').send({ name: 'Jane', email: 'john@example.com' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## Mock Middleware

```typescript
// Mock auth middleware in tests
jest.mock('../src/common/middleware/auth', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { userId: 'test-user-id', role: 'admin' };
    next();
  },
}));
```

## Testing Error Handler

```typescript
describe('Error Handler', () => {
  it('should return structured error for AppError', async () => {
    const res = await request(app).get('/api/v1/error-test').expect(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'TEST_ERROR', message: 'Test error' },
    });
  });

  it('should return 500 for unhandled errors', async () => {
    const res = await request(app).get('/api/v1/internal-error').expect(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('An unexpected error occurred');
  });
});
```

## Best Practices

- Use `createApp()` factory pattern — don't expose `app.listen()` in app module.
- Test each middleware independently.
- Use supertest for HTTP-level integration tests.
- Never hit production databases — use dedicated test DB or containers.
- Test error paths (validation errors, auth failures, not found, internal errors).
