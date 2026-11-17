# Contract Testing Advanced Patterns

## Overview
Advanced contract testing patterns: provider states with parameterized data, pact matchers, metadata-driven verification, and multi-provider contracts.

## Parameterized Provider States

```typescript
// Dynamic provider states with parameters
interface ProviderState {
  name: string;
  params?: Record<string, unknown>;
}

// Consumer test with parameterized state
const provider = new PactV3({
  consumer: 'WebApp',
  provider: 'OrderApi',
});

describe('Order detail with parameterized state', () => {
  it('returns a specific order by ID', async () => {
    await provider
      .given('order with ID exists', { orderId: 'order-123', status: 'shipped' })
      .uponReceiving('a request for a specific order')
      .withRequest({ method: 'GET', path: '/orders/order-123' })
      .willRespondWith({
        status: 200,
        body: {
          id: Pact.Matchers.string('order-123'),
          status: 'shipped',
        },
      });

    await provider.executeTest(async (mockServer) => {
      const api = new ApiClient(mockServer.url);
      const order = await api.getOrder('order-123');
      expect(order.status).toBe('shipped');
    });
  });
});

// Provider state handler with params
app.post('/test/setup', async (req, res) => {
  const { states } = req.body;

  for (const state of states) {
    switch (state.name) {
      case 'order with ID exists':
        await seedOrder({
          id: state.params.orderId,
          status: state.params.status,
          customerId: 'test-customer',
        });
        break;
      case 'user exists':
        await seedUser(state.params);
        break;
    }
  }

  res.status(200).send('OK');
});
```

## Advanced Pact Matchers

```typescript
describe('Advanced Pact Matchers', () => {
  it('uses flexible matchers for dynamic data', async () => {
    await provider
      .given('order list has orders')
      .uponReceiving('a request for order list')
      .withRequest({ method: 'GET', path: '/orders' })
      .willRespondWith({
        status: 200,
        body: {
          success: Pact.Matchers.boolean(true),
          data: {
            items: Pact.Matchers.eachLike({
              id: Pact.Matchers.string('0194fdc2-fa2f-7cc0-81d3-ff120745b99c'),
              status: Pact.Matchers.term({
                matcher: 'pending|confirmed|shipped|delivered|cancelled',
                generate: 'pending',
              }),
              total: Pact.Matchers.decimal(99.99),
              itemCount: Pact.Matchers.integer(3),
              createdAt: Pact.Matchers.isoDate(),
              customer: Pact.Matchers.term({
                matcher: '^https://api\\.company\\.com/v2/users/\\w+$',
                generate: 'https://api.company.com/v2/users/user_123',
              }),
              tags: Pact.Matchers.eachLike(Pact.Matchers.string('urgent'), { min: 1 }),
              metadata: Pact.Matchers.object({
                source: Pact.Matchers.string('web'),
              }),
            }, { min: 1 }),
            pagination: {
              page: Pact.Matchers.integer(1),
              limit: Pact.Matchers.integer(20),
              total: Pact.Matchers.integer(50),
              hasMore: Pact.Matchers.boolean(true),
            },
          },
        },
      });
  });
});
```

## Metadata-Driven Verification

```typescript
// Pact metadata for advanced verification control
interface PactMetadata {
  tags: string[];
  verificationOptions: {
    timeout: number;
    retryOnFail: boolean;
    skipVerification: boolean;
    providerStatesOnly: string[];
  };
  consumerVersion: string;
  consumerBranch: string;
}

class SmartPactVerifier {
  async verifyWithMetadata(providerBaseUrl: string): Promise<VerificationResult> {
    const pacts = await this.pactBroker.fetchPacts({ provider: 'OrderApi' });

    const results: VerificationResult[] = [];

    for (const pact of pacts) {
      const metadata = pact.metadata as PactMetadata;

      // Skip verification for non-production pacts
      if (metadata.verificationOptions?.skipVerification) {
        if (!metadata.tags.includes('production')) {
          results.push({ pact: pact.name, skipped: true });
          continue;
        }
      }

      // Set up only relevant provider states
      const relevantStates = metadata.verificationOptions?.providerStatesOnly;
      if (relevantStates?.length) {
        await this.setupProviderStates(relevantStates);
      }

      // Verify with custom options
      const result = await pact.verify({
        providerBaseUrl,
        timeout: metadata.verificationOptions?.timeout || 30000,
        retryOnFail: metadata.verificationOptions?.retryOnFail || false,
      });

      results.push({
        pact: pact.name,
        success: result.success,
        errors: result.errors,
      });
    }

    return { results, total: results.length, passed: results.filter(r => r.success).length };
  }
}
```

## Multi-Provider Contract

```typescript
// Consumer testing against multiple providers in one test
describe('Order creation — multi-provider contract', () => {
  const orderApi = new PactV3({ consumer: 'WebApp', provider: 'OrderApi' });
  const paymentApi = new PactV3({ consumer: 'WebApp', provider: 'PaymentApi' });

  it('completes order creation across services', async () => {
    // Order API interaction
    await orderApi
      .given('customer exists')
      .uponReceiving('a request to create an order')
      .withRequest({
        method: 'POST',
        path: '/orders',
        body: { customerId: 'cust_123', items: [{ productId: 'prod_1', quantity: 1 }] },
      })
      .willRespondWith({
        status: 201,
        body: { id: 'order_123', status: 'pending' },
      });

    // Payment API interaction (triggered by order creation)
    await paymentApi
      .given('pending payment for order')
      .uponReceiving('a request to process payment')
      .withRequest({
        method: 'POST',
        path: '/payments',
        body: {
          orderId: 'order_123',
          amount: 29.99,
          currency: 'USD',
        },
      })
      .willRespondWith({
        status: 200,
        body: { transactionId: 'txn_456', status: 'completed' },
      });

    // Execute both verifications
    await Promise.all([
      orderApi.executeTest(async (mockServer) => {
        const api = new ApiClient(mockServer.url);
        const order = await api.createOrder({ customerId: 'cust_123', items: [{ productId: 'prod_1', quantity: 1 }] });
        expect(order.id).toBeDefined();
      }),
      paymentApi.executeTest(async (mockServer) => {
        const api = new PaymentClient(mockServer.url);
        const payment = await api.processPayment({ orderId: 'order_123', amount: 29.99, currency: 'USD' });
        expect(payment.transactionId).toBeDefined();
      }),
    ]);
  });
});
```

## Pact File Analysis

```typescript
class PactAnalyzer {
  async analyzePacts(): Promise<Analysis> {
    const pacts = await this.pactBroker.getAllPacts();
    const analysis: Analysis = { consumers: [], unusedEndpoints: [] };

    // Track which endpoints are covered
    const coveredEndpoints = new Set<string>();

    for (const pact of pacts) {
      const consumer = pact.consumer.name;
      const interactions = pact.interactions;

      for (const interaction of interactions) {
        const endpoint = `${interaction.request.method} ${interaction.request.path}`;
        coveredEndpoints.add(endpoint);
      }

      analysis.consumers.push({
        name: consumer,
        interactionCount: interactions.length,
        endpoints: interactions.map(i => `${i.request.method} ${i.request.path}`),
        lastVerified: pact.lastVerifiedAt,
        verified: pact.lastVerificationSuccess,
      });
    }

    // Find API endpoints not covered by any contract
    const allEndpoints = await this.getAllApiEndpoints();
    for (const endpoint of allEndpoints) {
      if (!coveredEndpoints.has(endpoint)) {
        analysis.unusedEndpoints.push(endpoint);
      }
    }

    return analysis;
  }
}
```

## Key Points
- Use parameterized provider states for dynamic test data setup
- Leverage Pact matchers (eachLike, term, decimal, isoDate) for flexible matching
- Control verification with pact metadata (skip, timeout, tags)
- Test multi-provider interactions with separate pacts per provider
- Analyze pact coverage to identify untested API endpoints
