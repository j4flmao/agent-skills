# Provider Verification Deep Dive

## Verification Architecture

Provider verification runs the pact interactions against the actual provider service. It sets up the required provider state, makes the HTTP request as specified in the pact, and compares the response against the expected response.

```
Pact File → Read Interaction → Setup Provider State → Make Request → Compare Response → Report Result
```

## Setting Up Provider Verification

### Pact Broker Integration
```typescript
// Java/Spring — Pact broker pulls contracts
@Provider("OrderApi")
@PactBroker(
  url = "${PACT_BROKER_URL}",
  authentication = @PactBrokerAuth(token = "${PACT_BROKER_TOKEN}"),
  consumerVersionSelectors = {
    @VersionSelector(tag = "main"),
    @VersionSelector(tag = "prod")
  }
)
class OrderApiPactTest {
  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void verifyPact(PactVerificationContext context) {
    context.verifyInteraction();
  }

  @BeforeEach
  void setUp(PactVerificationContext context) {
    context.setTarget(new HttpTestTarget("localhost", 8080));
  }

  @State("order exists")
  void orderExists(Map<String, Object> params) {
    orderRepo.save(new Order((int) params.get("id"), "pending"));
  }
}
```

### CLI Provider Verification
```bash
# Using pact-provider-verifier CLI
npx pact-provider-verifier \
  --provider-base-url http://localhost:3000 \
  --pact-broker-base-url https://broker.example.com \
  --broker-token $TOKEN \
  --provider-app-version $SHA \
  --provider-version-branch main \
  --include-wip-pacts-since 2026-01-01 \
  --verbose
```

## State Handler Patterns

### Database Setup via Transaction
```typescript
class ProviderStateHandler {
  async setupState(name: string, params: Record<string, unknown>): Promise<void> {
    const tx = await this.db.beginTransaction();
    try {
      switch (name) {
        case 'order exists':
          await this.orderRepo.save(
            Order.create({ id: params.id as number, status: params.status as string })
          );
          break;
        case 'user with orders':
          const userId = params.userId as string;
          await this.userRepo.save(User.create({ id: userId }));
          for (const order of params.orders as Array<Record<string, unknown>>) {
            await this.orderRepo.save(Order.create({ userId, ...order }));
          }
          break;
      }
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  async teardownState(name: string, params: Record<string, unknown>): Promise<void> {
    // Clean up test data after verification
    switch (name) {
      case 'order exists':
        await this.orderRepo.deleteById(params.id as number);
        break;
      case 'user with orders':
        await this.orderRepo.deleteByUserId(params.userId as string);
        await this.userRepo.deleteById(params.userId as string);
        break;
    }
  }
}
```

### API-Based State Setup
```typescript
// Provider exposes a state setup endpoint (test-only)
app.post('/__setup', async (req, res) => {
  const { states } = req.body as { states: Array<{ name: string; params: Record<string, unknown> }> };

  for (const state of states) {
    const handler = stateHandlers.get(state.name);
    if (!handler) {
      return res.status(400).json({ error: `Unknown state: ${state.name}` });
    }
    await handler(state.params);
  }

  res.status(200).json({ status: 'ready' });
});
```

### State Teardown
After verification, clean up test data to avoid interference between interactions:
```typescript
afterEach(async () => {
  await db.query('TRUNCATE orders, users, payments RESTART IDENTITY CASCADE');
});
```

## Verification Strategies

### Tag-Based Verification
Select which consumer contract versions to verify based on tags:
```yaml
# Verify only production and main branch contracts
consumerVersionSelectors:
  - tag: 'prod'
  - tag: 'main'
  - tag: 'staging'
```

### WIP (Work in Progress) Verification
Allow pending contracts to be verified without blocking CI:
```bash
--include-wip-pacts-since 2026-01-01
```

Pending contracts:
- Are verified but do NOT cause CI failure
- Status shown in Pact Broker UI
- Promote to non-pending when both sides agree

### Branch-Based Verification
```yaml
# Automatically select contracts based on matching branch names
matchingBranch: true
```

## Response Comparison Rules

### Body Comparison
| Pact Statement | Provider Response | Result |
|---|---|---|
| `{ id: integer(1) }` | `{ id: 42 }` | PASS (integer matches) |
| `{ id: integer(1) }` | `{ id: "abc" }` | FAIL (type mismatch) |
| `{ id: 1 }` | `{ id: 1, extra: "field" }` | PASS (extra fields OK) |
| `{ id: 1, name: "John" }` | `{ id: 1 }` | FAIL (missing field) |

## Debugging Verification Failures

### Common Failures

| Failure | Likely Cause | Fix |
|---------|-------------|-----|
| Missing provider state | State handler not registered | Add state handler in provider test |
| Response body mismatch | Contract field changed | Update consumer test, re-publish |
| Status code differs | Provider changed endpoint | Align with consumer expectations |
| Type mismatch | New serialization format | Update matchers in consumer test |
| Provider state setup failed | Test data conflict | Clean state before setup |

### Diagnostic Commands
```bash
# View pact details
npx pact-broker describe-pact \
  --consumer OrderWeb \
  --provider OrderApi \
  --version latest

# View verification results
npx pact-broker can-i-deploy \
  --pacticipant OrderApi \
  --version 2.0.0 \
  --to main \
  --verbose

# Download pact file for inspection
npx pact-broker fetch-pact \
  --consumer OrderWeb \
  --provider OrderApi \
  --latest prod \
  --output ./order-web-order-api.json
```

## Performance Considerations

- Provider verification adds 30-90 seconds per provider to CI
- Parallelize verification across multiple providers
- Use can-i-deploy as a lightweight gate before full verification
- Cache provider startup across test runs

## Security

- State setup endpoint must NOT be exposed in production
- Use environment variable to enable/disable state endpoint
- Pact broker authentication via API tokens, never basic auth
- Pact files may contain example data — avoid real PII in test examples
