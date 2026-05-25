# API Client Test Strategies

## Unit Testing Clients

### Request Serialization
```typescript
describe('request serializer', () => {
  it('serializes query parameters correctly', () => {
    const params = { page: 1, limit: 10, filter: 'active' }
    const query = serializeQuery(params)
    expect(query).toBe('page=1&limit=10&filter=active')
  })

  it('handles array parameters', () => {
    const params = { ids: [1, 2, 3] }
    const query = serializeQuery(params)
    expect(query).toBe('ids=1,2,3')
  })

  it('omits null/undefined values', () => {
    const params = { name: 'test', optional: null }
    const query = serializeQuery(params)
    expect(query).toBe('name=test')
  })
})
```

### Response Parsing
- Test successful responses with expected payload shape
- Test error responses with different status codes
- Test network errors (timeout, connection refused)
- Test partial/malformed response handling

### Authentication
- Test token injection in headers
- Test token refresh flow
- Test unauthorized response handling

## Integration Testing

### Mock Server Patterns
- WireMock for REST services
- MockServer for dynamic responses
- Pact for consumer-driven contract tests
- MSW (Mock Service Worker) for frontend clients

### Test Fixtures
```typescript
const userFixture = {
  id: 'usr_123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  createdAt: '2024-01-15T10:00:00Z',
}
```

### Error Scenario Coverage
| Scenario | Client Behavior |
|----------|----------------|
| 400 Bad Request | Parse validation errors |
| 401 Unauthorized | Trigger token refresh |
| 403 Forbidden | Surface permission error |
| 404 Not Found | Return null or error |
| 429 Rate Limited | Implement retry with backoff |
| 500 Server Error | Return generic error |
| Timeout | Throw timeout error |

## End-to-End Testing

### Client Health Check
- Verify client connects to real API
- Verify authentication flow works end-to-end
- Verify critical endpoints return expected shapes

### Retry Logic Testing
- Test exponential backoff behavior
- Test max retry count enforcement
- Test circuit breaker integration
- Test idempotency for retried requests

### Performance Testing
- Measure request latency percentiles (p50, p95, p99)
- Test concurrent request handling
- Validate connection pool behavior
- Test rate limiter integration
