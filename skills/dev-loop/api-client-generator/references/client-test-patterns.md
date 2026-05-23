# API Client Testing Patterns

## Testing Layers

```
┌─────────────────────────────┐
│  Contract Tests             │  ← Spec vs implementation
├─────────────────────────────┤
│  Integration Tests          │  ← Real HTTP with test server
├─────────────────────────────┤
│  Snapshot / Record-Replay   │  ← Recorded responses
├─────────────────────────────┤
│  Unit Tests (mocked)        │  ← Mocked HTTP layer
└─────────────────────────────┘
```

## Mocked HTTP Tests

### TypeScript — Mock Service Worker (MSW)

```typescript
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiClient } from './client'

const server = setupServer(
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ])
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('fetches users', async () => {
  const users = await apiClient.getUsers()
  expect(users).toHaveLength(2)
  expect(users[0].name).toBe('Alice')
})

test('handles 404', async () => {
  server.use(
    http.get('https://api.example.com/users', () => {
      return new HttpResponse(null, { status: 404 })
    }),
  )
  await expect(apiClient.getUsers()).rejects.toThrow('Not Found')
})
```

### Python — responses library

```python
import responses
import pytest
from my_client import api_client

@responses.activate
def test_fetch_users():
    responses.get(
        'https://api.example.com/users',
        json=[{'id': 1, 'name': 'Alice'}],
        status=200,
    )
    users = api_client.get_users()
    assert len(users) == 1

@responses.activate
def test_handles_timeout():
    responses.get(
        'https://api.example.com/users',
        body=requests.ConnectionError('Connection refused'),
    )
    with pytest.raises(api_client.ConnectionError):
        api_client.get_users()
```

### Go — httptest

```go
func TestFetchUsers(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        assert.Equal(t, "GET", r.Method)
        assert.Equal(t, "/users", r.URL.Path)
        assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(200)
        fmt.Fprint(w, `[{"id":1,"name":"Alice"}]`)
    }))
    defer server.Close()

    client := NewClient(server.URL, "test-token")
    users, err := client.GetUsers()
    assert.NoError(t, err)
    assert.Len(t, users, 1)
}
```

## Record-Replay Tests

### Polly.js (TypeScript)

```typescript
import { Polly } from '@pollyjs/core'
import NodeHttpAdapter from '@pollyjs/adapter-node-http'
import FSPersister from '@pollyjs/persister-fs'

Polly.register(NodeHttpAdapter)
Polly.register(FSPersister)

describe('API client recordings', () => {
  let polly: Polly

  beforeEach(() => {
    polly = new Polly('users-api', {
      adapters: ['node-http'],
      persister: 'fs',
      recordIfMissing: true,
      recordingName: 'get-users',
    })
  })

  afterEach(async () => {
    await polly.stop()
  })

  test('getUsers records response', async () => {
    const users = await apiClient.getUsers()
    expect(users).toBeDefined()
  })
})
```

### VCR.py (Python)

```python
import vcr
from my_client import api_client

@vcr.use_cassette('fixtures/vcr/get_users.yaml')
def test_fetch_users():
    users = api_client.get_users()
    assert len(users) > 0
```

## Contract Tests

### Pact — Consumer-Driven Contracts

```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact'

const provider = new PactV3({
  consumer: 'WebApp',
  provider: 'UsersAPI',
})

describe('Pact with UsersAPI', () => {
  it('returns a user by ID', async () => {
    provider
      .uponReceiving('a request for user 1')
      .withRequest({
        method: 'GET',
        path: '/users/1',
        headers: { Authorization: 'Bearer valid-token' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: MatchersV3.like({ id: 1, name: 'Alice' }),
      })

    await provider.executeTest(async (mockServer) => {
      const client = new ApiClient(mockServer.url, 'valid-token')
      const user = await client.getUser(1)
      expect(user.name).toBe('Alice')
    })
  })
})
```

## Auth Token Handling Tests

```typescript
describe('auth token management', () => {
  test('injects token from auth provider', async () => {
    const authProvider = { getToken: () => 'test-token' }
    const client = new ApiClient(authProvider)

    server.use(
      http.get('*/users', ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer test-token')
        return HttpResponse.json([])
      }),
    )

    await client.getUsers()
  })

  test('retries on 401 with new token', async () => {
    let callCount = 0
    server.use(
      http.get('*/users', () => {
        callCount++
        if (callCount === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json([])
      }),
    )

    const authProvider = {
      token: 'expired-token',
      refresh: async () => { this.token = 'new-token' },
      getToken: () => this.token,
    }
    const client = new ApiClient(authProvider)
    await client.getUsers()
    expect(callCount).toBe(2)
  })
})
```

## Retry & Error Handling Tests

```typescript
test('retries on network error up to max retries', async () => {
  let attempts = 0
  server.use(
    http.get('*/users', () => {
      attempts++
      if (attempts <= 2) return HttpResponse.error()
      return HttpResponse.json([])
    }),
  )

  await apiClient.getUsers()
  expect(attempts).toBe(3)
})

test('throws after exhausting retries', async () => {
  server.use(
    http.get('*/users', () => HttpResponse.error()),
  )
  await expect(apiClient.getUsers()).rejects.toThrow()
})
```

## Test Data Factories

```typescript
// factories/user.ts
import { faker } from '@faker-js/faker'

export function buildUser(overrides = {}) {
  return {
    id: faker.number.int(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['admin', 'user']),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  }
}

// Usage in tests
const users = Array.from({ length: 10 }, () => buildUser())
const admin = buildUser({ role: 'admin' })
const emptyList = []
```

## Pagination Tests

```typescript
test('handles cursor-based pagination', async () => {
  const allUsers = Array.from({ length: 25 }, (_, i) => buildUser({ id: i + 1 }))

  server.use(
    http.get('*/users', ({ request }) => {
      const url = new URL(request.url)
      const cursor = parseInt(url.searchParams.get('cursor') || '0')
      const page = allUsers.slice(cursor, cursor + 10)
      return HttpResponse.json({
        data: page,
        nextCursor: cursor + 10 < allUsers.length ? cursor + 10 : null,
      })
    }),
  )

  const page1 = await apiClient.getUsers({ limit: 10 })
  expect(page1.data).toHaveLength(10)
  expect(page1.nextCursor).toBe(10)

  const page2 = await apiClient.getUsers({ cursor: page1.nextCursor, limit: 10 })
  expect(page2.data).toHaveLength(10)

  const page3 = await apiClient.getUsers({ cursor: page2.nextCursor, limit: 10 })
  expect(page3.data).toHaveLength(5)
  expect(page3.nextCursor).toBeNull()
})
```

## Testing Checklist

- [ ] Happy path: valid request returns expected response shape
- [ ] Error path: each error code (400, 401, 403, 404, 500) handled
- [ ] Network errors: timeout, DNS failure, connection refused
- [ ] Auth: token injection, token refresh, expired token
- [ ] Retry: correct number of retries, backoff timing
- [ ] Pagination: empty, single page, multi-page, last page
- [ ] File uploads: single file, multiple files, large files
- [ ] Request cancellation: abort signal stops in-flight request
- [ ] Headers: custom headers passed correctly
- [ ] Query params: serialization, encoding, empty values
