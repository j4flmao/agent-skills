# Contract Testing Workflow

## Full CDC Lifecycle

```
Consumer Team                    Pact Broker                 Provider Team
     │                               │                            │
     ├── Write consumer test ───────►│                            │
     │    (defines expected          │                            │
     │     interaction)              │                            │
     │                               │                            │
     ├── Publish pact ──────────────►│                            │
     │    (consumer-app-version,     │                            │
     │     branch)                   │                            │
     │                               ├── Webhook notification ──►│
     │                               │                            ├── Fetch latest pacts
     │                               │◄─── Provider fetches ─────┤
     │                               │     pacts                  │
     │                               │                            ├── Run provider
     │                               │                            │   verification
     │                               │◄─── Publish results ──────┤
     │                               │     (pass/fail)           │
     │◄── Can I deploy? ────────────│                            │
     │    checks verification        │                            │
     │    results                    │                            │
     │                               │                            │
     ├── Deploy to prod ────────────►│                            │
     │    (tag environment)          │                            │
     │                               │◄─── Deploy to prod ───────┤
     │                               │    (tag environment)       │
```

## Workflow Stages

### Stage 1: Consumer Test Definition

```typescript
// Consumer test — defines what the consumer expects
describe('OrderApiClient', () => {
  const provider = new PactV3({
    consumer: 'OrderWebApp',
    provider: 'OrderApiService',
  });

  it('should fetch order by ID', async () => {
    provider
      .given('order exists with ID 123')
      .uponReceiving('a GET request for order 123')
      .withRequest({ method: 'GET', path: '/api/orders/123' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: eachLike({
          id: like('123'),
          status: term({ generate: 'pending', matcher: 'pending|confirmed|cancelled' }),
          total: like(99.99),
          items: eachLike({ productId: like('p1'), quantity: like(1) }),
        }),
      });
    await provider.executeTest(async (mockServer) => {
      const client = new OrderApiClient(mockServer.url);
      const order = await client.getOrder('123');
      expect(order.status).toBeDefined();
    });
  });
});
```

### Stage 2: Pact Publication

```bash
# Publish all pact files to broker
npx pact-broker publish ./pacts \
  --consumer-app-version 1.2.3 \
  --branch main \
  --broker-base-url https://broker.example.com \
  --broker-token $PACT_BROKER_TOKEN

# Or use PactFlow CLI
pactflow publish ./pacts \
  --consumer-app-version 1.2.3 \
  --branch main
```

### Stage 3: Provider Verification

```typescript
// Provider verification test
@Provider("OrderApiService")
@PactBroker(
  url = "https://broker.example.com",
  token = "${PACT_BROKER_TOKEN}",
  consumerVersionSelectors = { @VersionSelector(latest = "true") }
)
class OrderApiProviderTest {

  @BeforeEach
  void setup(PactVerificationContext context) {
    context.setTarget(new HttpTestTarget("localhost", 8080, "/api"));
  }

  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void verifyPact(PactVerificationContext context) {
    context.verifyInteraction();
  }

  @State("order exists with ID 123")
  void orderExists() {
    orderRepository.save(new OrderEntity("123", "pending", 99.99));
  }

  @State("order does not exist")
  void orderNotExists() {
    orderRepository.deleteAll();
  }
}
```

### Stage 4: Can I Deploy?

```bash
# Check if consumer can deploy to production
npx pact-broker can-i-deploy \
  --pacticipant OrderWebApp \
  --version 1.2.3 \
  --to-environment production \
  --broker-base-url https://broker.example.com

# Check if provider can deploy
npx pact-broker can-i-deploy \
  --pacticipant OrderApiService \
  --version 2.0.0 \
  --to-environment production \
  --broker-base-url https://broker.example.com
```

### Stage 5: Tag on Deploy

```bash
# Tag consumer version after successful deployment
npx pact-broker tag \
  --pacticipant OrderWebApp \
  --version 1.2.3 \
  --tag production \
  --broker-base-url https://broker.example.com
```

## Provider State Management

```typescript
class ProviderStates {
  private fixtures: Record<string, () => Promise<void>> = {
    'order exists with ID 123': async () => {
      await db.orders.insert({ id: '123', status: 'pending', total: 99.99 });
    },
    'order does not exist': async () => {
      await db.orders.deleteAll();
    },
    'order is cancelled': async () => {
      await db.orders.insert({ id: '456', status: 'cancelled', total: 0 });
    },
    'user has admin role': async () => {
      await db.users.insert({ id: 'u1', role: 'admin' });
    },
  };

  async setup(state: string): Promise<void> {
    const setupFn = this.fixtures[state];
    if (!setupFn) throw new Error(`Unknown provider state: ${state}`);
    await setupFn();
  }

  async teardown(): Promise<void> {
    await db.clean();
  }
}
```

## Contract Testing Rules

| Rule | Rationale |
|------|-----------|
| One pact file per consumer-provider pair | Clear ownership, simple verification |
| Every interaction has a unique description + provider state | Precise identification for verification failures |
| Use matchers, never hardcoded values | Flexible provider implementations pass verification |
| Consumer tests use mock provider, never real provider | Fast, deterministic, no infrastructure needed |
| Provider verification runs against real provider impl | Validates actual API behavior |
| Pacts are published from CI, never locally | Ensures reproducible, traceable contracts |
| Verify contracts before deploying either side | Prevents production breaks from contract violations |

## Breaking Change Protocol

```
1. Consumer wants a new field or changed endpoint
2. Consumer adds new interaction to pact test
3. Consumer publishes updated pact
4. Provider verification FAILS (expected — provider hasn't changed yet)
5. Provider updates API to match new pact
6. Provider verification PASSES
7. Both sides can deploy independently
```

## Matrix Testing with Tags

```yaml
environments:
  production:
    consumer_tags: [prod]
    provider_tags: [prod]
  staging:
    consumer_tags: [staging, main]
    provider_tags: [staging, main]
  testing:
    consumer_tags: [feature/*]
    provider_tags: [main, feature/*]
```
