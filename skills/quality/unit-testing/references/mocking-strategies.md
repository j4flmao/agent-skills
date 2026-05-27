# Mocking Strategies

## Overview

Mocking replaces real dependencies with controlled substitutes, enabling fast, isolated, deterministic unit tests. This reference covers mocking patterns, frameworks, and best practices for effective test isolation.

## Mocking Principles

### The Mocking Boundary Rule

Mock at the boundary of your system, not at internal implementation details.

```
Good: Mock HTTP responses (network boundary)
Good: Mock database queries (persistence boundary)
Bad:  Mock internal service methods
Bad:  Mock private functions
Bad:  Mock third-party library internals
```

### When to Mock vs Not to Mock

| Scenario | Approach | Rationale |
|----------|----------|-----------|
| External HTTP API | Mock with MSW | Slow, unreliable, external |
| Database | Mock with in-memory or TestContainers | Integration test, not unit |
| File system | Mock with memfs | Slow, side effects |
| Time (Date.now, setTimeout) | Mock with fake timers | Deterministic results |
| Random (Math.random) | Mock with seed | Reproducible tests |
| Environment variables | Mock process.env | Different per environment |
| Internal domain service | Use real implementation | Tests behavior, not implementation |
| Logger | Mock | Noisy, not part of contract |
| Email service | Mock | Side effects, slow |

## Manual Mocks

### Manual Mock Files (Vitest)

```typescript
// __mocks__/api-client.ts
export const apiClient = {
  get: vi.fn().mockResolvedValue({ data: [] }),
  post: vi.fn().mockResolvedValue({ data: { id: 1 } }),
  put: vi.fn().mockResolvedValue({ data: { success: true } }),
  delete: vi.fn().mockResolvedValue({ data: { success: true } }),
}
```

```typescript
// __mocks__/logger.ts
export const logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}
```

### Using Manual Mocks

```typescript
// Make Vitest use the manual mock
vi.mock('../services/api-client')
vi.mock('../utils/logger')

import { apiClient } from '../services/api-client'
import { logger } from '../utils/logger'

it('should call API and return data', async () => {
  apiClient.get.mockResolvedValue({ data: [{ id: 1, name: 'Test' }] })

  const result = await fetchUsers()
  expect(result).toEqual([{ id: 1, name: 'Test' }])
  expect(apiClient.get).toHaveBeenCalledWith('/users')
})
```

## Mocking Frameworks (vi.mock, jest.mock)

### vi.mock (Vitest)

```typescript
import { vi } from 'vitest'

// Auto-mock all exports from a module
vi.mock('../services/email-service')

// Mock with factory function
vi.mock('../services/payment-service', () => ({
  PaymentService: {
    processPayment: vi.fn().mockResolvedValue({ status: 'success' }),
    refund: vi.fn().mockResolvedValue({ status: 'refunded' }),
  },
}))

// Partial mock — keep some exports real
vi.mock('../utils/helpers', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    generateId: vi.fn().mockReturnValue('mocked-id'),
  }
})
```

### jest.mock (Jest)

```typescript
// Equivalent patterns for Jest
jest.mock('../services/email-service')

jest.mock('../services/payment-service', () => ({
  PaymentService: {
    processPayment: jest.fn().mockResolvedValue({ status: 'success' }),
    refund: jest.fn().mockResolvedValue({ status: 'refunded' }),
  },
}))
```

### vi.spyOn

```typescript
import { vi } from 'vitest'

it('should spy on method', () => {
  const service = new UserService()
  const spy = vi.spyOn(service, 'validate')

  service.createUser({ name: 'Alice' })
  expect(spy).toHaveBeenCalledWith({ name: 'Alice' })
})
```

## Partial Mocking

```typescript
vi.mock('../services/notification-service', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue(true),
    // sendSms uses the real implementation
  }
})
```

## Module Mocking

### Mocking Default Exports

```typescript
vi.mock('../config', () => ({
  default: {
    API_URL: 'http://test-api.com',
    TIMEOUT: 5000,
  },
}))
```

### Mocking Named Exports

```typescript
vi.mock('../utils/formatting', () => ({
  formatCurrency: vi.fn((amount: number) => `$${amount.toFixed(2)}`),
  formatDate: vi.fn((date: Date) => date.toISOString()),
}))
```

## Time Mocking (vi.useFakeTimers)

### Basic Time Mocking

```typescript
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should record timestamp on creation', () => {
  const now = new Date('2026-05-26T12:00:00Z')
  vi.setSystemTime(now)

  const user = createUser({ name: 'Alice' })
  expect(user.createdAt).toEqual(now)
})
```

### Testing setTimeout

```typescript
it('should call callback after delay', () => {
  const callback = vi.fn()
  scheduleNotification(callback, 5000)

  expect(callback).not.toHaveBeenCalled()
  vi.advanceTimersByTime(5000)
  expect(callback).toHaveBeenCalledTimes(1)
})
```

### Testing setInterval

```typescript
it('should poll every 10 seconds', () => {
  const onPoll = vi.fn()
  startPolling(onPoll, 10_000)

  vi.advanceTimersByTime(10_000)
  expect(onPoll).toHaveBeenCalledTimes(1)

  vi.advanceTimersByTime(10_000)
  expect(onPoll).toHaveBeenCalledTimes(2)
})
```

### Testing Debounce/Throttle

```typescript
it('should debounce rapid calls', () => {
  const handler = vi.fn()
  const debounced = debounce(handler, 300)

  debounced()
  debounced()
  debounced()

  expect(handler).not.toHaveBeenCalled()
  vi.advanceTimersByTime(300)
  expect(handler).toHaveBeenCalledTimes(1)
})
```

### Date Mocking

```typescript
it('should calculate age correctly', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-26'))

  const age = calculateAge('1990-05-26')
  expect(age).toBe(36)

  vi.useRealTimers()
})
```

## Network Mocking (MSW Integration)

```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('should fetch and return users', async () => {
  server.use(
    http.get('https://api.example.com/users', () => {
      return HttpResponse.json([
        { id: 1, name: 'Alice' },
      ])
    })
  )

  const users = await fetchUsers()
  expect(users).toHaveLength(1)
  expect(users[0].name).toBe('Alice')
})

it('should handle network error', async () => {
  server.use(
    http.get('https://api.example.com/users', () => {
      return HttpResponse.error()
    })
  )

  await expect(fetchUsers()).rejects.toThrow('Network error')
})
```

## Environment Mocking

```typescript
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('API_KEY', 'test-api-key')
  vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/test')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should use test API key', () => {
  const config = loadConfig()
  expect(config.apiKey).toBe('test-api-key')
})

it('should use production database URL in production', () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('DATABASE_URL', 'postgres://prod:5432/prod')

  const config = loadConfig()
  expect(config.databaseUrl).toContain('prod')
})
```

## Class Mocking

```typescript
// Using vi.mock for classes
vi.mock('../services/database-service', () => ({
  DatabaseService: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
    insert: vi.fn().mockResolvedValue({ id: 2 }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  })),
}))
```

### Constructor Mocking

```typescript
it('should create service with config', () => {
  const DatabaseServiceMock = vi.mocked(DatabaseService)

  const service = new UserService()
  expect(DatabaseServiceMock).toHaveBeenCalledWith({
    host: 'localhost',
    port: 5432,
  })
})
```

## Function Mocking

### Mock Implementations

```typescript
// Simple return value
vi.fn().mockReturnValue(42)

// Async return value
vi.fn().mockResolvedValue({ id: 1 })

// Sequential return values
vi.fn()
  .mockReturnValueOnce('first')
  .mockReturnValueOnce('second')
  .mockReturnValue('default')

// Custom implementation
vi.fn((input: string) => input.toUpperCase())

// Async custom implementation
vi.fn(async (id: number) => {
  if (id < 0) throw new Error('Invalid ID')
  return { id, name: 'User ' + id }
})
```

### Mock Call Assertions

```typescript
const mock = vi.fn()

mock('hello', 123)
mock({ key: 'value' })

expect(mock).toHaveBeenCalled()
expect(mock).toHaveBeenCalledTimes(1)
expect(mock).toHaveBeenCalledWith('hello', 123)
expect(mock).toHaveBeenLastCalledWith({ key: 'value' })
expect(mock).toHaveBeenNthCalledWith(1, 'hello', 123)
expect(mock).toHaveReturned()
expect(mock).toHaveReturnedTimes(2)
```

### Mock Return Value Assertions

```typescript
const mock = vi.fn((x: number) => x * 2)

mock(5)
mock(10)

expect(mock).toHaveReturnedWith(10)
expect(mock).toHaveLastReturnedWith(20)
expect(mock).toHaveNthReturnedWith(1, 10)
expect(mock).toHaveNthReturnedWith(2, 20)
```

## Mocking External Services

### HTTP Client Mocking

```typescript
it('should handle 404 from user service', async () => {
  server.use(
    http.get('https://user-service/api/users/999', () => {
      return new HttpResponse(null, { status: 404 })
    })
  )

  await expect(getUser(999)).rejects.toThrow('User not found')
})
```

### SQS/Kafka Mocking

```typescript
vi.mock('../services/message-queue', () => ({
  MessageQueue: {
    publish: vi.fn().mockResolvedValue({ messageId: 'msg-123' }),
    subscribe: vi.fn().mockImplementation((topic, handler) => {
      // Store handler for later invocation in tests
      handlers.set(topic, handler)
      return { unsubscribe: vi.fn() }
    }),
  },
}))
```

### S3/Blob Storage Mocking

```typescript
vi.mock('../services/storage', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    upload: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/file.pdf' }),
    download: vi.fn().mockResolvedValue(Buffer.from('file content')),
    delete: vi.fn().mockResolvedValue({ deleted: true }),
    list: vi.fn().mockResolvedValue(['file1.pdf', 'file2.pdf']),
  })),
}))
```

## Mocking Database Calls in Unit Tests

### Repository Pattern Mocking

```typescript
vi.mock('../repositories/user-repository', () => ({
  UserRepository: {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

it('should create user via repository', async () => {
  const input = { name: 'Alice', email: 'alice@example.com' }
  const expected = { id: 1, ...input, createdAt: new Date() }

  vi.mocked(UserRepository.create).mockResolvedValue(expected)

  const result = await UserService.createUser(input)
  expect(result).toEqual(expected)
  expect(UserRepository.create).toHaveBeenCalledWith(input)
})
```

### ORM Mocking (Prisma, TypeORM)

```typescript
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  })),
}))
```

## Avoiding Over-Mocking

### The Mock Trap

```typescript
// BAD: Testing implementation, not behavior
it('should call internal method', () => {
  const validateMock = vi.spyOn(service, 'validate')
  service.process(input)
  expect(validateMock).toHaveBeenCalledWith(input)
})

// GOOD: Testing observable behavior
it('should return processed result', () => {
  const result = service.process(input)
  expect(result.status).toBe('success')
})
```

### Mock Only at Boundaries

```
           ┌─────────────┐
           │   Your Test  │
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │  Your Code   │ ← Test with real implementation
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │   Boundary   │ ← Mock here
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │  External    │
           │  Dependency  │
           └─────────────┘
```

### Signs of Over-Mocking

1. Tests break when you refactor internals (implementation coupling)
2. Tests need updating when you change a method signature
3. Tests mock multiple levels deep
4. Setup code is longer than assertion code
5. Tests pass but the real system fails

## Restoring Mocks After Tests

### Automatic Restoration (Vitest)

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    mockReset: true, // Reset all mocks between tests
    restoreMocks: true, // Restore original implementations
  },
})
```

### Manual Restoration

```typescript
afterEach(() => {
  vi.restoreAllMocks()  // Restore vi.spyOn and vi.stub
  vi.unstubAllEnvs()    // Restore stubbed env vars
  vi.unstubAllGlobals() // Restore stubbed globals
  vi.useRealTimers()    // Restore real timers if fake were used
})
```

### Per-Mock Restoration

```typescript
it('should reset mock between assertions', () => {
  const mock = vi.fn()

  mock('first call')
  expect(mock).toHaveBeenCalledTimes(1)

  mock.mockReset() // Clear calls and return values

  mock('second call')
  expect(mock).toHaveBeenCalledTimes(1)
})

it('should restore original implementation', () => {
  const mathMock = vi.spyOn(Math, 'random').mockReturnValue(0.5)

  expect(Math.random()).toBe(0.5)

  mathMock.mockRestore()

  // Math.random now uses real implementation
  expect(Math.random()).not.toBe(0.5)
})
```

## Advanced Patterns

### Mock Factory Functions

```typescript
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    role: 'user',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function createMockApiResponse<T>(data: T, overrides: Partial<Response> = {}) {
  return {
    status: 200,
    ok: true,
    json: vi.fn().mockResolvedValue(data),
    ...overrides,
  }
}

it('should handle different user roles', async () => {
  const adminUser = createMockUser({ role: 'admin' })
  server.use(
    http.get('/api/user', () => HttpResponse.json(adminUser))
  )

  const result = await fetchCurrentUser()
  expect(result.role).toBe('admin')
})
```

### Inline Mock vs Factory

```typescript
// Simple case — inline
vi.mocked(sendEmail).mockResolvedValue(true)

// Complex case — factory
function setupEmailMock() {
  const sentEmails: Email[] = []
  vi.mocked(sendEmail).mockImplementation(async (email: Email) => {
    sentEmails.push(email)
    return { messageId: `msg-${sentEmails.length}` }
  })
  return { sentEmails }
}

it('should queue email for later sending', async () => {
  const { sentEmails } = setupEmailMock()

  await registerUser({ email: 'test@example.com' })
  expect(sentEmails).toHaveLength(1)
  expect(sentEmails[0].to).toBe('test@example.com')
})
```

## Key Points

- Mock at system boundaries (network, persistence, time), not implementation internals
- Use `vi.mock()` for module-level mocking, `vi.spyOn()` for method spies
- Mock time with `vi.useFakeTimers()` for deterministic date/time tests
- Integrate MSW for network mocking alongside unit tests
- Use `vi.stubEnv()` for environment variable mocking
- Avoid over-mocking — if the mock setup is complex, the test is testing the wrong thing
- Factory functions make mock creation reusable and composable
- Always restore mocks in `afterEach` hooks with `vi.restoreAllMocks()`
- Use `mockReset: true` in Vitest config for automatic mock cleanup
- Test observable behavior, not implementation details
