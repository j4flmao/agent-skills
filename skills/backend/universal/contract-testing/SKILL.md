---
name: backend-contract-testing
description: >
  Use this skill when the user says 'contract testing', 'Pact', 'consumer-driven contracts', 'CDC', 'provider verification', 'pact test', 'pactflow', 'contract test', 'consumer test', 'provider test'. This skill implements consumer-driven contract testing using Pact to ensure microservices communicate correctly without brittle integration tests. Applies to any backend stack. Do NOT use for: API documentation, OpenAPI schemas, end-to-end testing, or unit testing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, contract-testing, pact, cdc, testing]
---

# Backend Contract Testing

## Purpose
Use consumer-driven contract (CDC) testing with Pact to verify that provider services satisfy consumer expectations, replacing brittle end-to-end integration tests with fast, deterministic contract tests.

## Agent Protocol

### Trigger
Exact user phrases: "contract testing", "Pact", "consumer-driven contracts", "CDC", "provider verification", "pact test", "pactflow", "contract test", "consumer test", "provider test".

### Input Context
- Service architecture: list of consumers and providers.
- Existing test framework (Jest, JUnit, pytest, etc.).
- Pact broker or PactFlow URL if available.

### Output Artifact
Pact test code snippets or Pactfile. No file unless requested.

### Response Format
```
Consumer: {service}
Provider: {service}
Interactions: {N}
State: {provider state}
```

### Completion Criteria
- [ ] Consumer test written for each consumer-provider interaction.
- [ ] Provider verification test written for each provider.
- [ ] Pact files published to Pact broker.
- [ ] Provider verification runs in CI against the deployed provider.
- [ ] No hardcoded URLs or real data in Pact tests.

### Max Response Length
6 lines per interaction. 20 lines for full test.

## Architecture Decision Tree

### Should I Use Contract Testing?

```
Do consumer and provider belong to different teams?
  ├── Yes → Strongly consider contract testing
  └── No → Is the provider used by multiple consumers?
            ├── Yes → Contract testing recommended
            └── No → Would an E2E test be too slow/brittle?
                      ├── Yes → Contract testing may help
                      └── No → Simple unit/integration tests may suffice
```

### Which Approach?

```
Can the consumer change the contract independently?
  ├── Yes → Consumer-Driven Contract (CDC) with Pact
  └── No → Is the provider owned by the same team as the consumer?
            ├── Yes → Bi-Directional Contracts (Spring Cloud Contract or Pact)
            └── No → Provider-Driven Contracts (OpenAPI + Specmatic)
```

## Workflow

### Step 1: Write Consumer Test
```javascript
const provider = new PactV3({ consumer: 'OrderWeb', provider: 'OrderApi' });
await provider
  .given('order exists')
  .uponReceiving('a request for order by ID')
  .withRequest({ method: 'GET', path: '/orders/1' })
  .willRespondWith({ status: 200, body: { id: 1, status: 'pending' } });

await provider.executeTest(async (mockServer) => {
  const api = new OrderApiClient(mockServer.url);
  const order = await api.getOrder(1);
  expect(order.status).toBe('pending');
});
```

### Step 2: Publish Pact
```bash
npx pact-broker publish ./pacts --consumer-app-version 1.0.0 --branch main
```

### Step 3: Write Provider Verification
```javascript
@PactBroker
@Provider("OrderApi")
class OrderApiProviderTest {
  @Test
  @State("order exists")
  void verifyOrderEndpoint() {
    orderRepository.save(new Order(1, "pending"));
  }
}
```

### Step 4: Run Provider Verification in CI
```bash
npx pact-provider-verifier --provider-base-url http://localhost:8080 --pact-urls ./pacts
```

### Step 5: Check Verification Results
If verification fails: the provider made a breaking change. Either:
- Fix the provider to match the contract, or
- Update the consumer test, re-publish the pact, then fix the provider.

## Pact Matchers — Flexible Contract Definition

### Why Matchers?
Hardcoded values in contracts cause brittle tests. Matchers define the shape without constraining exact values.

```javascript
// Instead of exact values:
body: { id: 1, status: 'pending', createdAt: '2026-01-01T00:00:00Z' }

// Use matchers for flexible contracts:
body: {
  id: Pact.Matchers.integer(1),
  status: Pact.Matchers.term({ matcher: 'pending|shipped|delivered', generate: 'pending' }),
  createdAt: Pact.Matchers.isoDate(),
}
```

### Matcher Reference
| Matcher | Purpose | Example |
|---------|---------|---------|
| `like(value)` | Type matching | `Pact.Matchers.like('any string')` |
| `term({ matcher, generate })` | Regex pattern | `Pact.Matchers.term({ matcher: '\\d{4}-\\d{2}-\\d{2}' })` |
| `eachLike(value, { min })` | Array matching | `Pact.Matchers.eachLike({ id: 1 }, { min: 1 })` |
| `integer(value)` | Integer type | `Pact.Matchers.integer(42)` |
| `decimal(value)` | Decimal type | `Pact.Matchers.decimal(99.99)` |
| `boolean(value)` | Boolean type | `Pact.Matchers.boolean(true)` |
| `isoDate()` | Date format | `Pact.Matchers.isoDate()` |
| `isoDateTime()` | DateTime format | `Pact.Matchers.isoDateTime()` |
| `uuid()` | UUID format | `Pact.Matchers.uuid()` |
| `object(shape)` | Object shape | `Pact.Matchers.object({ name: like('') })` |

## Provider State Management

### Parameterized Provider States
Provider states set up test data before verification. Parameterized states allow dynamic configuration.

```javascript
// Consumer test with parameterized state
await provider
  .given('order with ID exists', { orderId: 'order-123', status: 'shipped' })
  .uponReceiving('a request for a specific order')
  .withRequest({ method: 'GET', path: '/orders/order-123' })
  .willRespondWith({
    status: 200,
    body: { id: Pact.Matchers.string('order-123'), status: 'shipped' },
  });
```

```typescript
// Provider state handler
app.post('/test/setup', async (req, res) => {
  for (const state of req.body.states) {
    switch (state.name) {
      case 'order with ID exists':
        await seedOrder({ id: state.params.orderId, status: state.params.status });
        break;
      case 'customer exists':
        await seedCustomer(state.params);
        break;
    }
  }
  res.status(200).send('OK');
});
```

### State Handler Best Practices
- Each state handler is idempotent — running it twice is safe
- Clean up previous state before setting up new state
- Use transaction rollback after verification to avoid pollution
- States are isolated per interaction

## Consumer Test Patterns

### Single Endpoint Contract
```javascript
describe('GET /orders/:id', () => {
  it('returns order by ID', async () => {
    await provider
      .given('order exists', { id: 1 })
      .uponReceiving('a GET request for order by ID')
      .withRequest({ method: 'GET', path: '/orders/1' })
      .willRespondWith({ status: 200, body: { id: 1, status: 'pending' } });

    await provider.executeTest(async (mockServer) => {
      const client = new ApiClient(mockServer.url);
      const order = await client.getOrder(1);
      expect(order.status).toBe('pending');
    });
  });
});
```

### Error Response Contract
```javascript
describe('GET /orders/:id — not found', () => {
  it('returns 404 when order does not exist', async () => {
    await provider
      .given('order does not exist')
      .uponReceiving('a GET request for non-existent order')
      .withRequest({ method: 'GET', path: '/orders/999' })
      .willRespondWith({ status: 404, body: { error: 'Order not found' } });

    await provider.executeTest(async (mockServer) => {
      const client = new ApiClient(mockServer.url);
      await expect(client.getOrder(999)).rejects.toThrow('Order not found');
    });
  });
});
```

## Provider Verification Patterns

### Multiple Consumers
```typescript
@PactBroker(consumerVersionSelectors = [
  { tag: 'main' },
  { tag: 'prod' },
])
@Provider("OrderApi")
class ProviderPactTest {
  @BeforeEach
  void setUpProviderStates(PactVerificationContext context) {
    context.setTarget(new HttpTestTarget("localhost", 8080));
  }

  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void verifyPact(PactVerificationContext context) {
    context.verifyInteraction();
  }
}
```

### Can-I-Deploy Check
```bash
# Check if the provider can be deployed without breaking consumers
npx pact-broker can-i-deploy \
  --pacticipant OrderApi \
  --version 2.0.0 \
  --to main

# Check if the consumer can be deployed
npx pact-broker can-i-deploy \
  --pacticipant OrderWeb \
  --version 1.5.0 \
  --to main \
  --latest prod
```

## Contract Testing in CI/CD

### Consumer CI Pipeline
```yaml
# GitHub Actions — Consumer
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --testPathPattern=consumer              # Run consumer tests
      - run: npx pact-broker publish ./pacts \                   # Publish contracts
          --consumer-app-version ${{ github.sha }} \
          --branch ${{ github.ref_name }}
      - run: npx pact-broker can-i-deploy \                      # Check compatibility
          --pacticipant OrderWeb \
          --version ${{ github.sha }} \
          --to main
```

### Provider CI Pipeline
```yaml
# GitHub Actions — Provider
jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm start & npx wait-on http://localhost:3000/health  # Start provider
      - run: npx pact-provider-verifier \                         # Verify contracts
          --provider-base-url http://localhost:3000 \
          --pact-broker-base-url ${{ vars.PACT_BROKER_URL }} \
          --broker-token ${{ secrets.PACT_BROKER_TOKEN }} \
          --provider-app-version ${{ github.sha }} \
          --provider-version-branch ${{ github.ref_name }}
```

## Production Considerations

### Pact Broker Setup
| Option | Pros | Cons |
|--------|------|------|
| PactFlow (SaaS) | Managed, webhooks, web UI | Cost per month |
| Self-hosted broker | Free, full control | Operational overhead |
| Pact files in S3/GCS | Simple, cheap | No can-i-deploy, no webhooks |

### Webhook Integration
Configure Pact Broker webhooks to trigger provider CI when consumer pacts change:
- Consumer publishes → webhook triggers provider verification
- Verification result → webhook notifies consumer

### Contract Versioning Strategy
- Tag contracts with branch name, environment, and version
- Main branch contracts = latest stable
- Feature branch contracts = work in progress
- Prod contracts = currently deployed

## Anti-Patterns

### Over-Matchering
Using matchers everywhere defeats the purpose of contracts. Use matchers for dynamic fields (IDs, dates, UUIDs) and exact values for business-important fields (status values, enum options, relationship keys).

### Testing Implementation Details
Pact tests should verify the API contract, not internal logic. Don't test database queries or business rules through Pact — those belong in unit tests.

### Skipping Provider Verification
Running consumer tests without verifying against the real provider gives false confidence. Always run provider verification in CI.

### Hardcoded URLs in Tests
Consumer tests should use the mock server URL (injected by Pact), not hardcoded URLs.

### Missing Error Contracts
Contracts should include both success and error responses. Consumer code must handle 4xx/5xx correctly.

## Performance

### Test Execution Time
- Consumer tests: milliseconds (in-process mock server)
- Provider verification: seconds (requires running provider)
- Total contract test suite: typically < 2 minutes

### Pact File Size
- Each interaction adds ~1KB to the pact file
- Monitor pact file growth — excessively large pact files may indicate testing too many details

## Security

- Pact broker tokens are secrets — store in CI secrets, never in code
- Pact files contain request/response examples — don't include real PII
- Provider state setup endpoints should only be accessible in test environments
- Use separate Pact broker instances for different environments

## Rules
- One pact file per consumer-provider pair.
- Provider states must be meaningful and reproducible.
- Matchers over exact values: use `term()`, `like()`, `eachLike()` instead of hardcoded values.
- Never use Pact as a replacement for provider unit tests — it only verifies contract compliance.
- Always publish pacts from the consumer CI pipeline.
- Always verify pacts in the provider CI pipeline.
- Breaking a contract should fail the provider's CI build.
- Every interaction needs a corresponding provider state.
- Success and error responses both need contract tests.
- Pact files are checked into version control alongside application code.

## References
  - references/contract-testing-fundamentals.md — Contract Testing Fundamentals
  - references/contract-testing-advanced.md — Contract Testing Advanced Patterns
  - references/cdc-workflow.md — Consumer-Driven Contract Workflow
  - references/contract-testing-ci.md — Contract Testing CI Pipeline
  - references/contract-testing-tools.md — Contract Testing Tools
  - references/contract-testing-workflow.md — Contract Testing Workflow
  - references/pact-setup.md — Pact Contract Testing Setup
  - references/provider-verification-deep.md — Provider Verification Deep Dive
## Handoff
No artifact produced unless requested.
Next skill: idempotency — add safe retry semantics to the API endpoints.
Carry forward: consumer-provider relationships, pact broker URL, CI verification pipeline.

## Implementation Patterns

### Pact Consumer Test

```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { API } from './api-client';

const { like, term, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'WebApp',
  provider: 'UserService',
});

describe('UserService API', () => {
  it('returns user by ID', async () => {
    provider
      .given('user with ID 123 exists')
      .uponReceiving('a request for user 123')
      .withRequest({
        method: 'GET',
        path: '/api/users/123',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: like('123'),
          name: like('John Doe'),
          email: term({ generate: 'john@example.com', matcher: '\\S+@\\S+\\.\\S+' }),
          role: term({ generate: 'admin', matcher: 'admin|user|viewer' }),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const api = new API(mockServer.url);
      const user = await api.getUser('123');
      expect(user.id).toBe('123');
      expect(user.name).toBeDefined();
    });
  });

  it('returns 404 for non-existent user', async () => {
    provider
      .given('user with ID 999 does not exist')
      .uponReceiving('a request for non-existent user')
      .withRequest({
        method: 'GET',
        path: '/api/users/999',
      })
      .willRespondWith({ status: 404 });

    await provider.executeTest(async (mockServer) => {
      const api = new API(mockServer.url);
      await expect(api.getUser('999')).rejects.toThrow();
    });
  });
});
```

### Pact Provider Verification

```typescript
import { Verifier } from '@pact-foundation/pact';
import { startApp } from './app';

describe('UserService Pact Verification', () => {
  let server: any;

  beforeAll(async () => {
    server = await startApp(4000);
  });

  afterAll(async () => {
    await server.close();
  });

  it('verifies consumer contracts', async () => {
    const verifier = new Verifier({
      provider: 'UserService',
      providerBaseUrl: 'http://localhost:4000',
      pactBrokerUrl: 'https://pact-broker.example.com',
      publishVerificationResult: true,
      providerVersion: '1.0.0',
      stateHandlers: {
        'user with ID 123 exists': async () => {
          // Set up test data
          await setupUser({ id: '123', name: 'John Doe' });
        },
        'user with ID 999 does not exist': async () => {
          // Ensure user doesn't exist
          await deleteUser('999');
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

## Architecture Decision Trees

### Contract Testing Scope

```
What's the interaction pattern?
├── Synchronous HTTP (REST, GraphQL)
│   └── Pact (consumer-driven contracts)
│       ├── Consumer defines expectations
│       ├── Provider verifies against real implementation
│       └── Pact broker stores and manages versions
│
├── Asynchronous messaging (Kafka, SQS)
│   └── Pact message pacts
│       ├── Consumer expects a message with specific format
│       ├── Provider verifies it can produce the message
│       └── Message content not timing
│
├── Internal service-to-service
│   └── Contract testing + API spec
│       ├── Version contracts by API version
│       ├── CI fails on breaking changes
│       └── Deploy only if contracts pass
│
└── External third-party API
    └── Contract testing (cannot verify)
        ├── Consumer tests document assumptions
        └── Monitor for breaking changes in production
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Exact values instead of matchers | Tests fail on valid changes | Use like(), eachLike(), term() for flexibility |
| No provider state setup | Tests fail because DB state differs | Define provider states for each interaction |
| Contract tests as only tests | Doesn't test business logic | Contract tests complement unit + integration tests |
| Not publishing verification results | Can't know if provider is compatible | Always publish verification results to broker |

## Performance Optimization

- **Selective pact verification**: Only verify pacts for changed provider endpoints. Use pact broker's webhook to trigger verification on pact change. Reduces verification time by 70%.
- **Parallel pact verification**: Verify multiple pacts in parallel for the same provider. Limit concurrency based on provider resources.
