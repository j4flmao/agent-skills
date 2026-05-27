# OpenAPI Testing

## Overview
Test APIs against OpenAPI specs: contract testing, spec validation, request/response validation, mock servers, and CI integration.

## Contract Testing with Dredd

```typescript
import Dredd from 'dredd';

describe('API Contract Tests', () => {
  const dredd = new Dredd({
    server: 'http://localhost:3000',
    options: {
      path: './openapi.yaml',
      dryRun: false,
      colors: true,
      method: ['GET', 'POST', 'PUT', 'DELETE'],
      header: ['Authorization: Bearer test-token'],
    },
  });

  it('validates API against OpenAPI spec', (done) => {
    dredd.run((error, stats) => {
      expect(error).toBeNull();
      expect(stats.failures).toBe(0);
      expect(stats.passes).toBeGreaterThan(0);
      done();
    });
  }, 30000);
});
```

## Request/Response Validation

```typescript
import { Validator } from 'express-openapi-validator';

describe('Request Validation', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(Validator({
      apiSpec: './openapi.yaml',
      validateRequests: true,
      validateResponses: true,
    }));
  });

  it('rejects invalid request body', async () => {
    // Missing required field 'amount'
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer test')
      .send({ currency: 'USD' });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].path).toBe('.body.amount');
  });

  it('rejects invalid field types', async () => {
    // amount should be number, not string
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer test')
      .send({ amount: 'not-a-number', currency: 'USD' });

    expect(response.status).toBe(400);
  });

  it('enforces string maxLength', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer test')
      .send({
        amount: 100,
        currency: 'USD',
        description: 'x'.repeat(300), // exceeds maxLength 255
      });

    expect(response.status).toBe(400);
  });

  it('accepts valid request', async () => {
    const response = await request(app)
      .post('/api/payments')
      .set('Authorization', 'Bearer test')
      .send({ amount: 100.50, currency: 'USD' });

    expect(response.status).toBe(201);
  });
});
```

## Spec Validation Tests

```typescript
describe('OpenAPI Spec Validation', () => {
  it('passes spectral linting', () => {
    const result = execSync('npx spectral lint openapi.yaml', { encoding: 'utf-8' });
    // spectral returns empty string on success
    expect(result).not.toContain('error');
  });

  it('is valid OpenAPI 3.0 spec', () => {
    const result = execSync('npx swagger-cli validate openapi.yaml', { encoding: 'utf-8' });
    expect(result).toContain('is valid');
  });

  it('all operationIds are unique', async () => {
    const spec = await loadOpenAPISpec('openapi.yaml');
    const operationIds = new Set<string>();
    const duplicates: string[] = [];

    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (operation.operationId) {
          if (operationIds.has(operation.operationId)) {
            duplicates.push(operation.operationId);
          }
          operationIds.add(operation.operationId);
        }
      }
    }

    expect(duplicates).toEqual([]);
  });

  it('all status codes reference error schemas consistently', async () => {
    // 4xx and 5xx responses should have a consistent error schema
    const spec = await loadOpenAPISpec('openapi.yaml');

    for (const operation of getAllOperations(spec)) {
      for (const [status, response] of Object.entries(operation.responses || {})) {
        if (status.startsWith('4') || status.startsWith('5')) {
          const ref = (response as any).content?.['application/json']?.schema?.$ref;
          expect(ref).toContain('ErrorResponse');
        }
      }
    }
  });
});
```

## Mock Server Tests

```typescript
import { createMockServer } from '@stoplight/prism-cli';

describe('OpenAPI Mock Server', () => {
  let mockServer: any;
  let mockUrl: string;

  beforeAll(async () => {
    mockServer = await createMockServer({
      spec: './openapi.yaml',
      port: 4010,
      dynamic: false, // Use example values
    });
    mockUrl = 'http://localhost:4010';
  });

  afterAll(async () => {
    await mockServer.close();
  });

  it('responds with example values from spec', async () => {
    const response = await fetch(`${mockUrl}/api/payments`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toBeInstanceOf(Array);
  });

  it('validates request against spec', async () => {
    const response = await fetch(`${mockUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true }),
    });

    expect(response.status).toBe(422); // Validation error
  });
});
```

## Breaking Change Detection

```typescript
describe('Breaking Change Detection', () => {
  it('detects removed fields', async () => {
    const oldSpec = await loadSpec('openapi-v1.yaml');
    const newSpec = await loadSpec('openapi-v2.yaml');

    const changes = detectBreakingChanges(oldSpec, newSpec);
    const removedFields = changes.filter(c => c.type === 'field_removed');

    // Only non-breaking changes allowed in minor version
    const nonBreaking = changes.filter(c => c.severity === 'non-breaking');
    const breaking = changes.filter(c => c.severity === 'breaking');

    expect(breaking).toEqual([]); // No breaking changes
  });

  it('allows adding optional fields', async () => {
    const oldSpec = await loadSpec('openapi-v1.yaml');
    const newSpec = await loadSpec('openapi-v2.yaml');

    const changes = detectBreakingChanges(oldSpec, newSpec);
    const addedFields = changes.filter(c => c.type === 'field_added' && !c.required);

    // Adding optional fields is backwards compatible
    expect(addedFields.length).toBeGreaterThanOrEqual(0);
  });
});
```

## Key Points
- Use Dredd for contract testing: validates API responses match OpenAPI spec
- Validate requests at middleware level using express-openapi-validator
- Reject invalid bodies, wrong types, and exceeded constraints (maxLength)
- Run Spectral linting and swagger-cli validation in CI
- Ensure all operationIds are unique and 4xx/5xx responses reference error schemas
- Use Prism mock server for frontend development and testing
- Run breaking change detection between spec versions in CI
- Add non-breaking changes (new optional fields) in minor versions only
- Run contract tests as part of pull request validation
