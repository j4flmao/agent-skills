# Node.js Testing

## Vitest Setup
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] }
  }
});
```

## Unit Tests
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('UserService', () => {
  it('should create user', async () => {
    const result = await createUser({ email: 'test@test.com' });
    expect(result).toMatchObject({ email: 'test@test.com' });
  });
});
```

## Integration Tests
```typescript
import supertest from 'supertest';
import { app } from '../src/app';

describe('POST /api/users', () => {
  it('returns 201 on success', async () => {
    const res = await supertest(app)
      .post('/api/users')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(201);
  });
});
```

## Mocking
```typescript
vi.mock('../services/email');
import { sendWelcome } from '../services/email';

it('sends welcome email', async () => {
  vi.mocked(sendWelcome).mockResolvedValue({ sent: true });
  // test
  expect(sendWelcome).toHaveBeenCalledWith('test@test.com');
});
```
