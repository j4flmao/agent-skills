# Contract Testing

Contract tests verify that service interactions follow agreed-upon contracts, preventing integration failures.

## Consumer-Driven Contracts (Pact)

The consumer defines expectations, and the provider verifies them:

```typescript
// Consumer test (ProductService client)
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'WebApp',
  provider: 'ProductService',
});

describe('ProductService client', () => {
  it('should return product by ID', async () => {
    provider
      .given('product exists')
      .uponReceiving('a request for a product')
      .withRequest({
        method: 'GET',
        path: '/products/123',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: MatchersV3.string('123'),
          name: MatchersV3.string('Wireless Headphones'),
          price: MatchersV3.decimal(79.99),
          inStock: MatchersV3.boolean(true),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const client = new ProductClient(mockServer.url);
      const product = await client.getProduct('123');
      expect(product.id).toBe('123');
      expect(product.name).toBe('Wireless Headphones');
    });
  });
});
```

## Provider Verification

The provider runs the consumer pact against the real API:

```typescript
// Provider verification (ProductService)
import { Verifier } from '@pact-foundation/pact';

describe('ProductService provider verification', () => {
  it('should satisfy all consumer contracts', async () => {
    const opts = {
      provider: 'ProductService',
      providerBaseUrl: 'http://localhost:3001',
      pactUrls: [path.resolve(__dirname, '../pacts/webapp-productservice.json')],
      stateHandlers: {
        'product exists': async () => {
          // Set up provider state
          await seedProduct({ id: '123', name: 'Wireless Headphones', price: 79.99, inStock: true });
        },
      },
    };

    await new Verifier(opts).verifyProvider();
  });
});
```

## Contract States

Define provider states that the consumer depends on:

```typescript
// Provider state setup
const stateHandlers = {
  'product exists': async (params: { id: string }) => {
    await db.products.insert({ id: params.id, name: 'Test Product', price: 49.99 });
  },
  'product does not exist': async () => {
    // No setup needed
  },
  'products list is empty': async () => {
    await db.products.truncate();
  },
  'multiple products exist': async () => {
    await db.products.insert([
      { id: '1', name: 'Product A', price: 10 },
      { id: '2', name: 'Product B', price: 20 },
    ]);
  },
};
```

## Matching Rules

Use flexible matchers instead of exact values:

```typescript
const { MatchersV3 } = require('@pact-foundation/pact');

// String that matches regex
MatchersV3.term({ generate: '2026-05-27T10:00:00Z', matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z' })

// ISO timestamp
MatchersV3.isoTimestamp()

// UUID
MatchersV3.uuid()

// Decimal number
MatchersV3.decimal()

// Array with at least one element matching schema
MatchersV3.eachLike({ id: MatchersV3.string(), name: MatchersV3.string() })
```

## Provider-Driven Contracts (Spring Cloud Contract)

```groovy
// contracts/shouldReturnProduct.groovy
Contract.make {
    description "should return product by ID"
    request {
        method GET()
        url "/products/123"
        headers {
            contentType applicationJson()
        }
    }
    response {
        status OK()
        headers {
            contentType applicationJson()
        }
        body([
            id: "123",
            name: "Wireless Headphones",
            price: 79.99
        ])
    }
}
```

## Broker Integration

Share contracts via a Pact Broker:

```typescript
async function publishContract(): Promise<void> {
  await pact.publishContracts({
    pactBrokerUrl: 'https://pact-broker.example.com',
    consumerVersion: '1.0.0',
    pactFiles: [path.resolve(__dirname, '../pacts/*.json')],
  });
}

// CI pipeline: can-i-deploy check
async function checkCanDeploy(): Promise<boolean> {
  const result = await pact.canDeploy({
    pactBrokerUrl: 'https://pact-broker.example.com',
    pacticipant: 'ProductService',
    version: '1.0.0',
    toEnvironment: 'production',
  });
  return result.success;
}
```

## Key Points
- Consumer-driven contracts: consumer defines expectations
- Provider verification: provider checks all consumer contracts
- Use state handlers to set up provider test data
- Use flexible matchers (not exact values) for non-deterministic fields
- Publish contracts to a Pact Broker for sharing across teams
- Use `can-i-deploy` in CI to prevent breaking changes from deploying
- Contract tests complement integration tests, not replace them
- Version contracts alongside consumer and provider code
