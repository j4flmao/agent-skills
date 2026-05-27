# Test Organization

## Overview

Well-organized tests are maintainable, discoverable, and fast. This reference covers file structure, naming conventions, grouping patterns, test helpers, fixtures, and execution strategies for effective test organization.

## Test File Structure

### Co-located Tests

Tests live next to the source file they test:

```
src/
├── components/
│   ├── Button.tsx
│   ├── Button.test.tsx
│   ├── UserList.tsx
│   └── UserList.test.tsx
├── services/
│   ├── api.ts
│   └── api.test.ts
└── utils/
    ├── formatting.ts
    └── formatting.test.ts
```

**Pros:**
- Easy to find tests for a given module
- Tests stay in sync with source during refactoring
- Import paths are relative and short
- Clear ownership

**Cons:**
- Can clutter the source directory
- Not suitable if tests use different tooling (e.g., E2E)

### Centralized Tests

Tests are collected in a dedicated directory:

```
src/
├── components/
│   ├── Button.tsx
│   └── UserList.tsx
└── __tests__/
    ├── components/
    │   ├── Button.test.tsx
    │   └── UserList.test.tsx
    ├── services/
    │   └── api.test.ts
    └── utils/
        └── formatting.test.ts
```

**Pros:**
- Clean source directories
- Single test configuration applies
- Easy to run all tests at once

**Cons:**
- Import paths can get long
- Tests can drift from source during moves
- Less obvious ownership

### Hybrid Approach

Unit tests co-located, integration/E2E tests centralized:

```
src/
├── components/
│   ├── Button.tsx
│   ├── Button.test.tsx        ← Unit test
│   ├── UserList.tsx
│   └── UserList.test.tsx      ← Unit test
└── services/
    ├── api.ts
    └── api.test.ts            ← Unit test
tests/
├── integration/
│   └── user-flow.test.ts      ← Integration test
├── e2e/
│   └── checkout.spec.ts       ← E2E test
└── fixtures/
    └── users.json             ← Shared test data
```

**Recommendation:** Use the hybrid approach — unit tests co-located, integration and E2E tests centralized.

## Naming Conventions

### File Naming

| Pattern | Example | When to Use |
|---------|---------|-------------|
| `{name}.test.ts` | `button.test.ts` | Default Vitest convention |
| `{name}.spec.ts` | `api.spec.ts` | Common in Angular, Playwright |
| `{name}.test.tsx` | `UserList.test.tsx` | React/TSX components |
| `{name}.integration.test.ts` | `db.integration.test.ts` | Integration tests |
| `{name}.e2e.spec.ts` | `checkout.e2e.spec.ts` | E2E tests (Playwright) |

### Test Description Conventions

```typescript
// Component test naming
describe('Button', () => {
  it('should render with label', () => {})
  it('should call onClick when clicked', () => {})
  it('should be disabled when disabled prop is true', () => {})
})

// Feature/service test naming
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => {})
    it('should throw when email is invalid', () => {})
    it('should reject duplicate emails', () => {})
  })
})

// Behavior-driven naming
describe('UserLogin', () => {
  it('should allow user to login with valid credentials', () => {})
  it('should show error when password is wrong', () => {})
  it('should lock account after 5 failed attempts', () => {})
})
```

### Naming Best Practices

- **describe**: Use the component/service/module name
- **it**: Start with "should" and describe the expected behavior
- **Nested describe**: Group by method, state, or scenario
- **Avoid**: "should work properly", "should handle case"
- **Prefer**: "should return 404 when user ID does not exist"

## Describe/It Structure Patterns

### Feature-Based Organization

```typescript
describe('UserManagement', () => {
  describe('creating a user', () => {
    it('should create with valid fields', () => {})
    it('should reject empty name', () => {})
    it('should reject invalid email', () => {})
  })

  describe('updating a user', () => {
    it('should update name and email', () => {})
    it('should not change password without confirmation', () => {})
  })

  describe('deleting a user', () => {
    it('should soft delete user', () => {})
    it('should cascade delete to related records', () => {})
  })
})
```

### State-Based Organization

```typescript
describe('UserProfile', () => {
  describe('when user is logged in', () => {
    it('should show profile information', () => {})
    it('should allow editing', () => {})
  })

  describe('when user is logged out', () => {
    it('should redirect to login', () => {})
  })

  describe('when profile is loading', () => {
    it('should show spinner', () => {})
  })

  describe('when profile load fails', () => {
    it('should show error message', () => {})
    it('should show retry button', () => {})
  })
})
```

### Boundary/Edge Case Organization

```typescript
describe('calculateShipping', () => {
  describe('with standard delivery', () => {
    it('should return $5 for orders under $50', () => {})
    it('should return $0 for orders over $50', () => {})
  })

  describe('with express delivery', () => {
    it('should return $15 for orders under $50', () => {})
    it('should return $10 for orders over $50', () => {})
  })

  describe('edge cases', () => {
    it('should handle zero quantity', () => {})
    it('should handle maximum weight', () => {})
    it('should handle international addresses', () => {})
  })
})
```

## Test Helpers and Factories (Builders)

### Builder Pattern

```typescript
// test-utils/user-builder.ts
type UserOverrides = Partial<{
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: Date
}>

function buildUser(overrides: UserOverrides = {}): User {
  return {
    id: 1,
    name: 'Default Name',
    email: 'default@example.com',
    role: 'user',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

// Usage
const adminUser = buildUser({ role: 'admin', name: 'Alice' })
const inactiveUser = buildUser({ isActive: false })
```

### Request Builder

```typescript
// test-utils/request-builder.ts
function buildRequest(overrides: Partial<RequestInit> = {}): RequestInit {
  return {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...overrides,
  }
}

function buildApiResponse<T>(
  data: T,
  overrides: Partial<Response> = {}
): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    ...overrides,
  } as Response
}
```

### Async Test Helpers

```typescript
// test-utils/async-helpers.ts
async function waitFor(
  callback: () => void,
  timeout = 1000,
  interval = 50
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      callback()
      return
    } catch {
      await new Promise((r) => setTimeout(r, interval))
    }
  }
  callback() // Last attempt — will throw if still failing
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
```

## Test Fixtures

### Static Fixtures

```typescript
// tests/fixtures/users.ts
export const mockUsers = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com' },
]

// tests/fixtures/responses.ts
export const apiResponses = {
  users: {
    success: { status: 200, body: { data: mockUsers, total: 3 } },
    empty: { status: 200, body: { data: [], total: 0 } },
    error: { status: 500, body: { error: 'Internal server error' } },
  },
}
```

### JSON Fixtures

```json
// tests/fixtures/product-response.json
{
  "id": "prod-123",
  "name": "Test Product",
  "price": 29.99,
  "currency": "USD",
  "inStock": true,
  "categories": ["electronics", "accessories"],
  "reviews": [
    { "id": 1, "rating": 5, "comment": "Great product" }
  ]
}
```

```typescript
import productResponse from '../fixtures/product-response.json'

it('should parse product response', () => {
  const product = parseProduct(productResponse)
  expect(product.name).toBe('Test Product')
  expect(product.price).toBe(29.99)
})
```

### Dynamic Fixtures with Faker

```typescript
import { faker } from '@faker-js/faker'

function generateUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    bio: faker.lorem.sentence(),
    avatar: faker.image.avatar(),
    ...overrides,
  }
}

function generateUserList(count = 10): User[] {
  return Array.from({ length: count }, () => generateUser())
}

it('should render generated user list', () => {
  const users = generateUserList(5)
  render(<UserList users={users} />)
  expect(screen.getAllByRole('listitem')).toHaveLength(5)
})
```

## Sharing Setup Across Tests

### beforeEach/afterEach Setup

```typescript
describe('UserRepository', () => {
  let db: Database
  let repository: UserRepository

  beforeEach(async () => {
    db = await createTestDatabase()
    repository = new UserRepository(db)
  })

  afterEach(async () => {
    await db.cleanup()
  })

  it('should save user', async () => {
    await repository.save(buildUser())
    const found = await repository.findById(1)
    expect(found).toBeDefined()
  })
})
```

### Test Suite Setup

```typescript
describe('API Integration', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await TestServer.start()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(async () => {
    await server.clearDatabase()
  })

  it('should return users', async () => {
    const response = await fetch(`${server.url}/api/users`)
    expect(response.status).toBe(200)
  })
})
```

### Shared Helpers via Setup Files

```typescript
// vitest.setup.ts — Global helpers
import { expect } from 'vitest'
import { buildUser, buildRequest } from './test-utils'

// Make builders globally available
globalThis.buildUser = buildUser
globalThis.buildRequest = buildRequest

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    return {
      pass: received >= floor && received <= ceiling,
      message: () => `expected ${received} to be within range ${floor}-${ceiling}`,
    }
  },
})
```

## Test Configuration Files

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // File patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],

    // Environment
    environment: 'jsdom',
    globals: true,

    // Setup
    setupFiles: ['./vitest.setup.ts'],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.d.ts',
        'src/types/**',
      ],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 75,
        statements: 80,
      },
    },

    // Mock behavior
    mockReset: true,
    restoreMocks: true,

    // Performance
    testTimeout: 5000,
    hookTimeout: 10000,
    maxConcurrency: 5,
  },
})
```

### jest.config.ts

```typescript
export default {
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFilesAfterSetup: ['./jest.setup.ts'],
  testEnvironment: 'jsdom',
  testTimeout: 10000,
}
```

## Test Tags and Annotations

### Vitest Tags

```typescript
import { describe, it } from 'vitest'

// Tag tests for selective running
describe('Database Tests', { tags: ['integration', 'database'] }, () => {
  it('should connect to database', () => {})
})

describe('API Tests', { tags: ['integration', 'api'] }, () => {
  it('should fetch users', () => {})
})
```

```bash
# Run only database tests
npx vitest --tags integration --tags database

# Exclude slow tests
npx vitest --tags ~slow
```

### Skip, Only, Todo

```typescript
// Skip a test
it.skip('should handle edge case', () => {})

// Run only this test (useful for debugging)
it.only('should be the only test running', () => {})

// Mark as todo (shown in output but not run)
it.todo('should handle concurrent requests')
```

## Organizing by Feature vs Type

### Feature-Based

```
src/
├── features/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── LoginForm.test.tsx
│   │   ├── auth-service.ts
│   │   ├── auth-service.test.ts
│   │   └── auth-types.ts
│   ├── billing/
│   │   ├── InvoiceList.tsx
│   │   ├── InvoiceList.test.tsx
│   │   ├── billing-service.ts
│   │   └── billing-service.test.ts
│   └── dashboard/
│       ├── Dashboard.tsx
│       ├── Dashboard.test.tsx
│       └── dashboard-service.ts
```

### Type-Based

```
src/
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx
│   ├── billing/
│   │   └── InvoiceList.tsx
│   └── dashboard/
│       └── Dashboard.tsx
├── services/
│   ├── auth-service.ts
│   ├── billing-service.ts
│   └── dashboard-service.ts
└── __tests__/
    ├── components/
    │   └── LoginForm.test.tsx
    └── services/
        └── auth-service.test.ts
```

**Recommendation:** Feature-based for most projects. It scales better and keeps related code together.

## Test Suite Performance

### Parallel Execution

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Run files in parallel (default)
    fileParallelism: true,

    // Max workers
    maxWorkers: 4,

    // Pool per worker
    pool: 'forks', // or 'threads'

    // Sequence settings
    sequence: {
      // Run tests within a file sequentially by default
      concurrent: false,
    },
  },
})
```

### Marking Tests as Concurrent

```typescript
import { describe, it } from 'vitest'

describe('Independent Calculations', () => {
  // These run concurrently within the same file
  it.concurrent('should calculate tax', async () => {})
  it.concurrent('should calculate discount', async () => {})
  it.concurrent('should calculate shipping', async () => {})

  // But this depends on a shared state — must run sequentially
  it('should calculate total with all components', () => {})
})
```

### Sharding Tests in CI

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Config for sharding
  },
})
```

```bash
# CI job 1
npx vitest --shard=1/4

# CI job 2
npx vitest --shard=2/4

# CI job 3
npx vitest --shard=3/4

# CI job 4
npx vitest --shard=4/4
```

## Watch Mode

### Vitest Watch

```bash
# Default watch mode
npx vitest

# Watch with specific pattern
npx vitest --watch --reporter=verbose

# Run changed files only
npx vitest --changed
```

### File Watching Configuration

```typescript
export default defineConfig({
  test: {
    watch: {
      // Files to ignore during watch
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    },
  },
})
```

## Test Data Factories

### Simple Factory

```typescript
// test-utils/factories.ts
import { faker } from '@faker-js/faker'

let idCounter = 1

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: idCounter++,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['admin', 'user'] as const),
    isActive: faker.datatype.boolean(0.8),
    createdAt: faker.date.past(),
    ...overrides,
  }
}

export function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: faker.string.uuid(),
    userId: createUser().id,
    total: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
    status: faker.helpers.arrayElement(['pending', 'paid', 'shipped'] as const),
    items: Array.from({ length: faker.number.int(5) }, createOrderItem),
    ...overrides,
  }
}

export function createOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: faker.string.uuid(),
    productId: faker.string.uuid(),
    quantity: faker.number.int({ min: 1, max: 10 }),
    price: faker.number.float({ min: 5, max: 200, fractionDigits: 2 }),
    ...overrides,
  }
}
```

## Test Organization Anti-Patterns

### Anti-pattern: God Test File

```typescript
// BAD: One file tests everything
describe('Application', () => {
  it('should test auth', () => {})
  it('should test products', () => {})
  it('should test billing', () => {})
  // ... 500 more tests
})

// GOOD: One file per module
```

### Anti-pattern: Deep Nesting

```typescript
// BAD: Unnecessary nesting
describe('Application', () => {
  describe('Services', () => {
    describe('User', () => {
      describe('Creation', () => {
        describe('Validation', () => {
          it('should...', () => {})
        })
      })
    })
  })
})

// GOOD: Flat when possible
describe('UserService', () => {
  describe('createUser', () => {
    it('should...', () => {})
  })
})
```

### Anti-pattern: Shared Mutable State

```typescript
// BAD: Tests depend on each other
let user: User

beforeEach(() => {
  user = createUser()
})

it('test 1', () => {
  user.name = 'Modified'
  expect(something).toBe(true)
})

it('test 2', () => {
  // Expects user.name to be "Default Name" — broken!
})

// GOOD: Each test creates its own data
it('test 1', () => {
  const user = createUser({ name: 'Modified' })
  expect(something).toBe(true)
})

it('test 2', () => {
  const user = createUser()
  expect(something).toBe(true)
})
```

## Key Points

- Co-locate unit tests with source, centralize integration/E2E tests
- Name tests descriptively: "should {expected behavior} when {condition}"
- Organize describe blocks by feature, state, or boundary
- Use builder/factory patterns for test data creation
- Use Faker for generating varied, realistic test data
- Share setup via `beforeEach` but avoid shared mutable state
- Configure test timeouts, coverage thresholds, and mock behavior in config files
- Use Vitest tags for selective test execution
- Run tests in parallel with `it.concurrent` for independent operations
- Shard tests in CI for faster execution
- Use watch mode during development for fast feedback
- Avoid god test files, deep nesting, and shared mutable state
