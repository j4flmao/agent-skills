# API Versioning — Compatibility Testing

## Overview
Automate backward-compatibility testing across API versions to ensure existing clients are not broken by version upgrades.

## Cross-Version Response Comparison

```typescript
// Compare v1 vs v2 responses for the same request
async function compareVersions(path: string, method: string, body?: any) {
  const v1Response = await request(app)
    [method.toLowerCase()](`/v1${path}`)
    .send(body);

  const v2Response = await request(app)
    [method.toLowerCase()](`/v2${path}`)
    .send(body);

  return {
    v1: { status: v1Response.status, body: v1Response.body },
    v2: { status: v2Response.status, body: v2Response.body },
    statusCompatible: v1Response.status === v2Response.status,
  };
}

describe('Cross-version backward compatibility', () => {
  it('GET /orders returns compatible responses across versions', async () => {
    const result = await compareVersions('/orders/123', 'GET');
    expect(result.statusCompatible).toBe(true);

    // v2 may have additional fields, but v1 fields must still exist
    const v1Fields = extractFieldPaths(result.v1.body);
    const v2Fields = extractFieldPaths(result.v2.body);

    for (const field of v1Fields) {
      expect(v2Fields).toContain(field);
    }
  });
});
```

## Deprecation Header Testing

```typescript
describe('Deprecation Headers', () => {
  it('v1 endpoints return deprecation headers', async () => {
    const res = await request(app).get('/v1/orders');
    expect(res.headers['sunset']).toBeDefined();
    expect(res.headers['deprecation']).toBeDefined();
    expect(new Date(res.headers['sunset'])).toBeInstanceOf(Date);
    expect(res.headers['link']).toContain('version=2');
  });

  it('v2 endpoints do not return deprecation headers', async () => {
    const res = await request(app).get('/v2/orders');
    expect(res.headers['deprecation']).toBeUndefined();
    expect(res.headers['sunset']).toBeUndefined();
  });
});
```

## Consumer Contract Compatibility

```typescript
// Test that all consumers' pacts pass against new version
describe('Provider verification', () => {
  it('v2 provider satisfies all v1 consumer pacts', async () => {
    // Fetch all v1 consumer pacts from broker
    const pacts = await pactBroker.fetchPacts({ provider: 'OrderApi', tag: 'v1' });

    for (const pact of pacts) {
      const result = await pact.verify({
        providerBaseUrl: `http://localhost:3000/v2`,
        providerStatesSetupUrl: `http://localhost:3000/test/setup`,
      });

      expect(result.success).toBe(true);
    }
  });
});
```

## Schema Compatibility Check

```typescript
// OpenAPI diff for breaking changes
import { diffSpecs } from 'openapi-diff';

async function checkBreakingChanges() {
  const oldSpec = await fetchSpec('main');
  const newSpec = await fetchSpec('current');

  const diffs = await diffSpecs(oldSpec, newSpec);
  const breakingChanges = diffs.filter(d => d.type === 'breaking');

  if (breakingChanges.length > 0) {
    throw new Error(`Breaking changes detected:\n${breakingChanges.map(d => `- ${d.message}`).join('\n')}`);
  }
}

describe('OpenAPI schema compatibility', () => {
  it('no breaking changes between versions', async () => {
    await expect(checkBreakingChanges()).resolves.not.toThrow();
  });
});
```

## Migration Test Suite

```typescript
// Test that clients can migrate from v1 to v2
describe('Version Migration', () => {
  it('client using v1 continues to work during migration window', async () => {
    const client = new ApiClient({ baseUrl: '/v1', apiKey: 'test' });
    const orders = await client.getOrders();
    expect(orders).toBeDefined();
  });

  it('client on v2 receives richer data', async () => {
    const clientV2 = new ApiClient({ baseUrl: '/v2', apiKey: 'test' });
    const order = await clientV2.getOrder('123');

    // v2 must have all v1 fields plus new ones
    expect(order.id).toBeDefined();
    expect(order.createdAt).toBeDefined();
    // v2 additions
    expect(order.updatedAt).toBeDefined();
    expect(order.tracking).toBeDefined();
  });
});
```

## Key Points
- Automate cross-version response comparison to catch regressions
- Verify deprecation headers on old API versions
- Run provider verification tests for all consumer pacts before releasing
- Diff OpenAPI specs to detect breaking changes automatically
- Test that clients on old versions continue working during migration windows
