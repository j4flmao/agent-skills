# Consumer-Driven Contract Workflow

## The CDC Lifecycle

### Phase 1: Consumer Defines Contract
The consumer team writes a Pact test that describes exactly what they need from the provider.

```
Consumer Test:
"I need GET /orders/123 to return { id, status, total } with status=200"
```

The test generates a pact file (`orderweb-orderapi.json`):
```json
{
  "consumer": { "name": "OrderWeb" },
  "provider": { "name": "OrderApi" },
  "interactions": [{
    "description": "a request for order 123",
    "providerStates": [{ "name": "an order with ID 123 exists" }],
    "request": { "method": "GET", "path": "/orders/123" },
    "response": { "status": 200, "body": { "id": "123", "status": "pending" } }
  }]
}
```

### Phase 2: Publish Pact
The pact file is published to a Pact Broker (PactFlow, self-hosted broker).

### Phase 3: Provider Verifies
The provider fetches all pending pacts from the broker and runs verification tests.

```
Provider CI:
1. Fetch pacts for OrderApi from broker
2. Start OrderApi on random port
3. Run PactVerifier against each interaction
4. Publish verification results back to broker
```

### Phase 4: Matrix of Compatibility
The broker tracks which consumer version works with which provider version:

```
              Consumer OrderWeb v1.2  v1.3  v2.0
Provider
  OrderApi v1.0           ✅      ❌    ❌
  OrderApi v1.1           ✅      ✅    ❌
  OrderApi v2.0           ❌      ❌    ✅
```

## Can-I-Deploy
The broker provides a can-i-deploy tool that checks deployment safety:

```bash
npx pact-broker can-i-deploy \
  --pacticipant OrderApi \
  --version 1.1.0 \
  --to-environment production
```

Returns: "All verification results are published and successful. You can deploy."

If a consumer has an incompatible pact that has not been verified, the tool returns a failure — preventing the deployment.

## Branch-Based Workflow

```
feature/order-discount (consumer)    main (provider)
       │                                   │
       ├─ Write consumer test              │
       ├─ Pact published (branch)          │
       │                                   │
       ├─ Trigger provider build ──────────►
       │                                   ├─ Fetch pacts for branch
       │                                   ├─ Verify against provider
       │                                   └─ Publish results
       │                                   │
       ◄─ Check verification results ──────┘
       │
consumer passes → merge to main
```

## Provider State Management
Provider states are the mechanism for setting up test data. Strategies:

### 1. Database Setup
```java
@State("an order exists")
void setupOrder() {
  testDataRepository.save(new Order("123", "pending"));
}
@State("no orders exist")
void clearOrders() {
  testDataRepository.deleteAll();
}
```

### 2. API Endpoint (Provider States Endpoint)
```java
@RestController
class ProviderStateController {
  @PostMapping("/__setup")
  void setupState(@RequestBody StateRequest request) {
    // Execute state setup based on name
  }
}
```

### 3. Test Fixtures
Pre-load database with a set of fixture data and reference it in state names.

## Handling Breaking Changes

### Consumer wants a new field:
1. Consumer adds the field to the test with a fallback default.
2. Consumer publishes the pact.
3. Provider adds the field.
4. Provider verifies the pact.

### Provider wants to remove a field:
1. Provider checks pact broker — no consumer depends on the field.
2. If a consumer depends on it: deprecate field, communicate with consumer team, remove after transition.

## Contract Testing vs Integration Testing

| Aspect | Contract Testing | Integration Testing |
|--------|-----------------|-------------------|
| Speed | Milliseconds | Seconds to minutes |
| Isolation | No real dependencies | Real services |
| Determinism | Always deterministic | Flaky (network, state) |
| What it proves | Contract compliance | End-to-end correctness |
| When it breaks | Provider changed API | Network or state issue |
| CI trust | High (always trust) | Low (flaky) |
| Maintenance | ~1 test per interaction | ~1 test per flow |

CDC testing replaces coarse integration tests with fine-grained, deterministic contract tests. You still need a small number of end-to-end tests for critical paths.

## Best Practices
- Keep interactions focused: one logical thing per interaction.
- Use provider states to test edge cases: empty list, not found, invalid input.
- Run provider verification on every commit to main.
- Use webhooks: consumer CI triggers provider CI automatically.
- Monitor pact broker for expired or unused pacts.
- Tag pacts with environment (`main`, `prod`) for deployment gating.
