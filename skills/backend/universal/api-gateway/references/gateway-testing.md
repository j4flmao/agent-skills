# API Gateway Testing

## Overview
Test gateway configurations, routing rules, plugins, and upstream integrations using integration tests, contract tests, and chaos engineering.

## Unit Testing Gateway Routes

```typescript
// Testing Express Gateway-style routes
describe('Gateway Router', () => {
  it('routes /orders requests to order-service', async () => {
    const response = await request(gateway)
      .get('/v2/orders/123')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.headers['x-upstream']).toBe('order-service');
  });

  it('rejects requests without auth token', async () => {
    const response = await request(gateway).get('/v2/orders/123');
    expect(response.status).toBe(401);
  });

  it('rate limits login endpoint', async () => {
    const attempts = Array(6).fill(null);
    for (const _ of attempts) {
      await request(gateway)
        .post('/v2/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
    }
    const response = await request(gateway)
      .post('/v2/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' });
    expect(response.status).toBe(429);
  });
});
```

## Testing Kong Declarative Config

```yaml
# kong-test.yaml — declarative config for integration tests
_format_version: "3.0"
services:
  - name: order-service
    url: http://wiremock:8080
    routes:
      - name: order-route
        paths:
          - /v2/orders
        methods:
          - GET
          - POST
    plugins:
      - name: rate-limiting
        config:
          minute: 100
      - name: key-auth
        config:
          key_names:
            - X-API-Key
```

```bash
# Start Kong with test config in Docker
docker run -d --name kong-test \
  -e "KONG_DATABASE=off" \
  -e "KONG_DECLARATIVE_CONFIG=/etc/kong/kong.yml" \
  -v ./kong-test.yml:/etc/kong/kong.yml \
  -p 8000:8000 \
  kong/kong-gateway
```

## WireMock for Upstream Stubs

```java
// WireMock stub for order-service
@BeforeEach
void setUp() {
    wireMockServer.stubFor(get(urlPathEqualTo("/v2/orders/123"))
        .willReturn(aResponse()
            .withStatus(200)
            .withHeader("Content-Type", "application/json")
            .withBody("""
                {
                    "id": "0194fdc2-fa2f-7cc0-81d3-ff120745b99c",
                    "status": "pending",
                    "customerId": "cust_123"
                }
            """)));

    wireMockServer.stubFor(get(urlPathEqualTo("/health"))
        .willReturn(aResponse().withStatus(200)));

    wireMockServer.stubFor(any(anyUrl())
        .atPriority(10)
        .willReturn(aResponse()
            .withStatus(503)
            .withBody("{\"error\":\"UPSTREAM_UNAVAILABLE\"}")));
}
```

## Testing Rate Limiting

```typescript
describe('Rate Limiting Plugin', () => {
  it('enforces per-client rate limits', async () => {
    const clientKey = 'test-client-1';
    const responses = [];

    // Send 100 requests
    for (let i = 0; i < 100; i++) {
      const res = await request(gateway)
        .get('/v2/products')
        .set('X-API-Key', clientKey);
      responses.push(res.status);
    }

    const tooManyRequests = responses.filter(s => s === 429);
    expect(tooManyRequests.length).toBeGreaterThan(0);
    expect(responses.filter(s => s === 200).length).toBe(100); // Reset for next test
  });

  it('returns correct rate limit headers', async () => {
    const res = await request(gateway)
      .get('/v2/products')
      .set('X-API-Key', 'test-key');

    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });
});
```

## Chaos Testing Gateway Resilience

```typescript
describe('Gateway Resilience', () => {
  it('circuit breaks when upstream fails', async () => {
    // Simulate upstream failure
    wireMockServer.stubFor(any(anyUrl())
        .willReturn(aResponse().withStatus(503)));

    // Send requests until circuit opens
    for (let i = 0; i < 10; i++) {
      await request(gateway).get('/v2/orders');
    }

    // Circuit should be open — expect fast failure
    const start = Date.now();
    const response = await request(gateway).get('/v2/orders');
    const latency = Date.now() - start;

    expect(response.status).toBe(503);
    expect(latency).toBeLessThan(100); // Fast failure without upstream call
  });

  it('returns stale cache when upstream is down', async () => {
    // Prime cache
    await request(gateway).get('/v2/products');

    // Kill upstream
    wireMockServer.stop();

    const response = await request(gateway).get('/v2/products');
    expect(response.status).toBe(200); // Served from cache
    expect(response.headers['x-cache-hit']).toBe('true');
  });
});
```

## CI Pipeline

```yaml
# .github/workflows/gateway-tests.yml
name: Gateway Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - name: Start Kong test instance
        run: docker compose -f docker-compose.test.yml up -d kong
      - name: Run gateway tests
        run: npm test -- --testPathPattern=gateway
      - name: Run chaos tests
        run: npm test -- --testPathPattern=chaos
      - name: Cleanup
        run: docker compose -f docker-compose.test.yml down
```

## Key Points
- Unit test routes, auth, and rate limiting logic
- Use declarative config with WireMock stubs for integration tests
- Test rate limit enforcement and header propagation
- Verify circuit breaker behavior and cache fallback under upstream failures
- Run chaos tests in CI to validate gateway resilience
