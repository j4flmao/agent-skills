# API Response Testing

## Overview
Test API response contracts end-to-end using contract tests, schema validation, and automated response assertions.

## Pact Consumer Test for Response Contract

```typescript
// consumer test for order response
const provider = new PactV3({
  consumer: 'OrderWeb',
  provider: 'OrderApi',
});

describe('Order API response contract', () => {
  it('returns order with correct shape', async () => {
    await provider
      .given('order exists')
      .uponReceiving('a request for order by ID')
      .withRequest({ method: 'GET', path: '/v2/orders/123' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          success: Pact.Matchers.boolean(true),
          data: {
            id: Pact.Matchers.string('0194fdc2-fa2f-7cc0-81d3-ff120745b99c'),
            status: Pact.Matchers.term({ matcher: 'pending|confirmed|shipped', generate: 'pending' }),
            total: Pact.Matchers.decimal(99.99),
            createdAt: Pact.Matchers.isoDate(),
          },
          error: null,
        },
      });

    await provider.executeTest(async (mockServer) => {
      const api = new ApiClient(mockServer.url);
      const response = await api.getOrder('123');
      expect(response.success).toBe(true);
      expect(response.data.id).toBeDefined();
      expect(response.data.total).toBeGreaterThan(0);
    });
  });
});
```

## Schema Validation Tests

```typescript
import { z } from 'zod';

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().nullable(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }).nullable(),
});

const PaginatedResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    items: z.array(z.unknown()),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().min(0),
      totalPages: z.number().int().min(0),
    }),
  }),
});

describe('Response Schema Validation', () => {
  it('validates successful response shape', () => {
    const response = {
      success: true,
      data: { id: '123' },
      error: null,
    };
    const result = ApiResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('validates error response shape', () => {
    const response = {
      success: false,
      data: null,
      error: { code: 'NOT_FOUND', message: 'Order not found', requestId: 'req_abc' },
    };
    const result = ApiResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('rejects invalid response missing required fields', () => {
    const response = { data: 'missing success and error' };
    const result = ApiResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});
```

## Integration Tests for Response Contract

```typescript
describe('GET /v2/orders Response Contract', () => {
  let app: Express;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  it('200 response matches OpenAPI schema', async () => {
    const res = await request(app)
      .get('/v2/orders/0194fdc2-fa2f-7cc0-81d3-ff120745b99c')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchSchema('OrderResponse');
    expect(res.body.success).toBe(true);
    expect(res.body.error).toBeNull();
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('404 error response matches error schema', async () => {
    const res = await request(app)
      .get('/v2/orders/nonexistent')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(404);
    expect(res.body).toMatchSchema('ErrorResponse');
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });
});
```

## Automated Response Contract CI

```yaml
# .github/workflows/response-contract.yml
name: Response Contract Tests
on:
  pull_request:
    paths:
      - 'src/routes/**'
      - 'src/schemas/**'
jobs:
  contract-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Start API
        run: npm start & npx wait-on http://localhost:3000/health
      - name: Run response contract tests
        run: npm test -- --testPathPattern=response-contract
      - name: Run OpenAPI spec validation
        run: npx swagger-cli validate ./openapi.yaml
      - name: Check for breaking response changes
        run: npx openapi-diff --old=main:openapi.yaml --new=openapi.yaml
```

## Key Points
- Use Pact consumer tests to verify response contracts between services
- Validate response shapes with Zod/JSON Schema in automated tests
- Test both success and error response formats for every endpoint
- Verify responses match OpenAPI specifications
- Run response contract tests in CI to catch breaking changes
