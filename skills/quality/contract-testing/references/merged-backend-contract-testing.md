# Backend Contract Testing

## Purpose
Use consumer-driven contract (CDC) testing with Pact to verify that provider services satisfy consumer expectations, replacing brittle end-to-end integration tests with fast, deterministic contract tests.

Reference for the `quality-contract-testing` skill (entry point: [../SKILL.md](../SKILL.md)). Keeps the backend-oriented examples (Java JUnit provider tests, broker options, anti-patterns) that the skill does not repeat.

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
  └── No → Does the provider already publish an OpenAPI spec it keeps accurate?
            ├── Yes → Bi-Directional Contract Testing (PactFlow: consumer pact vs provider OpenAPI)
            └── No → Provider-Driven Contracts (Spring Cloud Contract on JVM, or OpenAPI + Specmatic)
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

### Step 3: Write Provider Verification (JUnit 5, pact-jvm)
```java
@Provider("OrderApi")
@PactBroker // reads pactbroker.url / pactbroker.auth.token from system properties or env
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderApiProviderTest {
  @LocalServerPort int port;
  @Autowired OrderRepository orderRepository;

  @BeforeEach
  void target(PactVerificationContext context) {
    context.setTarget(new HttpTestTarget("localhost", port));
  }

  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void verifyPact(PactVerificationContext context) {
    context.verifyInteraction();
  }

  @State("order exists")
  void orderExists() {
    orderRepository.save(new Order(1L, "pending"));
  }
}
```

### Step 4: Run Provider Verification in CI
Prefer the verifier built into your language binding (JUnit above, `Verifier` in pact-js below). For a language-agnostic CLI, the Rust `pact_verifier_cli` replaces the older Ruby `pact-provider-verifier`; fetch pacts from the broker with consumer version selectors and publish results with the provider version and branch.

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
  --version "$GIT_SHA" \
  --to-environment production

# Check if the consumer can be deployed
npx pact-broker can-i-deploy \
  --pacticipant OrderWeb \
  --version "$GIT_SHA" \
  --to-environment production

# After a successful deploy
npx pact-broker record-deployment --pacticipant OrderApi --version "$GIT_SHA" --environment production
```

## Contract Testing in CI/CD
See the consumer and provider GitHub Actions pipelines in [../SKILL.md](../SKILL.md#ci-pipeline-integration).

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
- Version = Git SHA; publish with `--branch`
- Main branch pacts = latest stable; feature branch pacts = work in progress (verify as pending)
- Record what runs where with `record-deployment` / `record-release`; tags are legacy
- Provider CI selects pacts with consumer version selectors (`mainBranch`, `deployedOrReleased`, `matchingBranch`)

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
- Use one broker with environments (`record-deployment`), not one broker per environment

## Rules
- One pact file per consumer-provider pair.
- Provider states must be meaningful and reproducible.
- Matchers for dynamic fields (`like`, `eachLike`, `regex` in `MatchersV3`); exact values for business-significant fields.
- Never use Pact as a replacement for provider unit tests — it only verifies contract compliance.
- Always publish pacts from the consumer CI pipeline.
- Always verify pacts in the provider CI pipeline.
- Breaking a contract should fail the provider's CI build.
- Every interaction needs a corresponding provider state.
- Success and error responses both need contract tests.
- Pact files are build artifacts published to the broker; do not hand-edit or commit them.

## References
  - contract-testing-fundamentals-2.md — Contract Testing Fundamentals
  - contract-testing-advanced-2.md — Contract Testing Advanced Patterns
  - cdc-workflow.md — Consumer-Driven Contract Workflow
  - contract-testing-ci.md — Contract Testing CI Pipeline
  - contract-testing-tools.md — Contract Testing Tools
  - contract-testing-workflow.md — Contract Testing Workflow
  - pact-setup-2.md — Pact Contract Testing Setup
  - provider-verification-deep.md — Provider Verification Deep Dive
## Implementation Patterns

### Pact Consumer Test

```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { API } from './api-client';

const { like, regex } = MatchersV3;

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
          email: regex('\\S+@\\S+\\.\\S+', 'john@example.com'),
          role: regex('^(admin|user|viewer)$', 'admin'),
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
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      consumerVersionSelectors: [{ mainBranch: true }, { deployedOrReleased: true }],
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_SHA,
      providerVersionBranch: process.env.GIT_BRANCH,
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
| Exact values instead of matchers | Tests fail on valid changes | Use `like`, `eachLike`, `regex` for dynamic fields |
| No provider state setup | Tests fail because DB state differs | Define provider states for each interaction |
| Contract tests as only tests | Doesn't test business logic | Contract tests complement unit + integration tests |
| Not publishing verification results | Can't know if provider is compatible | Always publish verification results to broker |

## Performance Optimization

- **Selective pact verification**: Only verify pacts for changed provider endpoints. Use the broker's `contract_requiring_verification_published` webhook to trigger verification only when a pact changes.
- **Parallel pact verification**: Verify multiple pacts in parallel for the same provider. Limit concurrency based on provider resources.
