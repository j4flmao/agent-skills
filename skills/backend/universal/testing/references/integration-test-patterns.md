# Integration Test Patterns

## What to Test in Integration

| Component | Test Focus | Tooling |
|-----------|------------|---------|
| Repository | CRUD, queries, transactions | TestContainers, in-memory DB |
| API client | HTTP calls, serialization, error handling | WireMock, MockServer |
| Message consumer | Event handling, idempotency | Embedded broker |
| File storage | Upload, download, metadata | MinIO, LocalStack |
| Cache | Get, set, eviction, TTL | Embedded Redis |

## TestContainers Pattern

```typescript
// One container per test suite — shared across tests
const postgres = new PostgreSqlContainer('postgres:16');
let pool: Pool;

beforeAll(async () => {
  postgres.start();
  pool = new Pool({ connectionString: postgres.getConnectionUrl() });
  await runMigrations(pool);
});

afterAll(async () => {
  await pool.end();
  await postgres.stop();
});
```

## WireMock for External APIs

```typescript
const wiremock = new WireMockServer();
wiremock.start();

beforeAll(() => {
  wiremock.stubFor(post(urlPathEqualTo('/payments'))
    .withRequestBody(containing('amount'))
    .willReturn(jsonResponse({ status: 'success', transactionId: 'txn-123' }, 200))
  );
});

afterAll(() => wiremock.stop());
```

## Transaction Rollback Pattern

For test isolation without cleanup:

```typescript
let connection: Connection;

beforeEach(async () => {
  connection = await pool.connect();
  await connection.query('BEGIN');
});

afterEach(async () => {
  await connection.query('ROLLBACK');
  connection.release();
});
```

## Test Data Factories

```typescript
function createUser(overrides: Partial<UserProps> = {}): User {
  return User.create({
    email: `test-${uuid()}@example.com`,
    name: 'Test User',
    ...overrides
  });
}
```

## Testing Guidelines

- Each integration test tests ONE adapter.
- Use real infrastructure (Docker containers), not mocks.
- Tests are isolated — no shared mutable state between tests.
- Clean test data between runs. Transaction rollback is preferred.
- Integration tests are slower — separate them from unit tests.
- Run integration tests in CI, not in pre-commit hooks.
