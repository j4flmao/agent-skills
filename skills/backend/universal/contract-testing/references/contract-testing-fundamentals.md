# Contract Testing Fundamentals

## What is Contract Testing?

Contract testing verifies that two services (a consumer and a provider) can communicate correctly by testing each independently. The consumer defines its expectations in a contract file. The provider verifies that it satisfies those expectations.

Unlike E2E tests, contract tests:
- Run in milliseconds, not minutes
- Don't require all services to be running
- Fail with clear, specific messages
- Can be versioned and published to a broker

## Consumer-Driven Contracts (CDC)

In CDC, the consumer defines the contract. The provider must satisfy all consumer expectations. This ensures the provider never breaks the consumer's assumptions.

```
Consumer writes test → Pact generates contract file
    ↓
Contract published to Pact Broker
    ↓
Provider reads contract → Provider verifies it can satisfy contract
    ↓
Verification result published back to broker
```

## The Three Phases

### Phase 1: Consumer Writes Test
The consumer creates a Pact test that describes what it expects from the provider:

```javascript
// Consumer test — describes expected provider behavior
await provider
  .given('a user exists', { id: 1 })
  .uponReceiving('a request for user data')
  .withRequest({ method: 'GET', path: '/users/1' })
  .willRespondWith({
    status: 200,
    body: {
      id: Pact.Matchers.integer(1),
      name: Pact.Matchers.like('John'),
      email: Pact.Matchers.like('john@example.com'),
    },
  });
```

### Phase 2: Contract is Published
The generated Pact file is published to a Pact Broker (or stored in version control).

### Phase 3: Provider Verifies
The provider reads the pact and verifies it can satisfy the contract:

```javascript
// Provider verification — runs against the real provider
@Provider("UserApi")
class UserProviderTest {
  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void verifyPact(PactVerificationContext ctx) {
    ctx.verifyInteraction();
  }
}
```

## Key Concepts

### Interaction
A single request-response pair between consumer and provider. Each interaction has:
- A description
- A provider state
- Request details (method, path, headers, body)
- Expected response (status, headers, body)

### Provider State
Preconditions that must exist in the provider for the interaction to succeed. For example, "user exists with ID 1" or "order is already cancelled".

### Matcher vs Exact Value
| Matcher | Verifies | Example |
|---------|----------|---------|
| `like(value)` | Type matches value | `like('string')` matches any string |
| `term(matcher, generate)` | Regex pattern | `term('\\d+', '123')` matches digits |
| `eachLike(value)` | Array of shape | `eachLike({ id: integer(1) })` matches array of objects |
| `integer(value)` | Is integer | `integer(42)` matches any integer |
| `decimal(value)` | Is decimal | `decimal(99.99)` matches any decimal |

## Tool Comparison

| Tool | Approach | Language | Best For |
|------|----------|----------|----------|
| Pact | Consumer-driven | Multi-language | Microservices, independent teams |
| Spring Cloud Contract | Consumer-driven | JVM-specific | Spring Boot ecosystems |
| Specmatic | Bi-directional | Language-agnostic | OpenAPI-first teams |
| Approvals | Comparison-based | Multi-language | Simple contract verification |

## Common Workflow

1. **Identify consumer-provider pairs** — every pair gets its own pact file
2. **Write consumer tests** — one per interaction (success + error cases)
3. **Generate pact files** — automatic during consumer test run
4. **Publish to broker** — make contracts visible to provider team
5. **Run provider verification** — in provider CI pipeline
6. **Check can-i-deploy** — verify compatibility before deployment
7. **Deploy safely** — only deploy when both sides are compatible

## CI/CD Integration

### Consumer CI
```bash
# Run tests, publish contracts, check deployability
npm test -- --testPathPattern=pact
npx pact-broker publish ./pacts --consumer-app-version $SHA --branch $BRANCH
npx pact-broker can-i-deploy --pacticipant OrderWeb --version $SHA --to main
```

### Provider CI
```bash
# Start provider, verify against all published consumer contracts
npm start & npx wait-on http://localhost:3000/health
npx pact-provider-verifier --provider-base-url http://localhost:3000 \
  --pact-broker-base-url $PACT_BROKER_URL \
  --broker-token $BROKER_TOKEN \
  --provider-app-version $SHA
```

## When NOT to Use Contract Testing

- Single monolithic application (no service boundaries)
- In-process communication (function calls, not HTTP/RPC)
- Prototypes or throwaway code
- When both sides are owned and deployed by the same team (unit tests may suffice)
- When E2E tests are fast enough (< 1 minute) and reliable enough (< 1% flake rate)
