---
name: backend-contract-testing
description: >
  Use this skill when the user says 'contract testing', 'Pact', 'consumer-driven contracts', 'CDC', 'provider verification', 'pact test', 'pactflow', 'contract test', 'consumer test', 'provider test'. This skill implements consumer-driven contract testing using Pact to ensure microservices communicate correctly without brittle integration tests. Applies to any backend stack. Do NOT use for: API documentation, OpenAPI schemas, end-to-end testing, or unit testing.
version: "1.0.0"
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
    // Set up provider state — insert test data
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

## Rules
- One pact file per consumer-provider pair.
- Provider states must be meaningful and reproducible.
- Matchers over exact values: use `term()`, `like()`, `eachLike()` instead of hardcoded values.
- Never use Pact as a replacement for provider unit tests — it only verifies contract compliance.
- Always publish pacts from the consumer CI pipeline.
- Always verify pacts in the provider CI pipeline.
- Breaking a contract should fail the provider's CI build.

## References
  - references/cdc-workflow.md — Consumer-Driven Contract Workflow
  - references/contract-testing-advanced.md — Contract Testing Advanced Patterns
  - references/contract-testing-ci.md — Contract Testing CI Pipeline
  - references/contract-testing-tools.md — Contract Testing Tools
  - references/contract-testing-workflow.md — Contract Testing Workflow
  - references/pact-setup.md — Pact Contract Testing Setup
## Handoff
No artifact produced unless requested.
Next skill: idempotency — add safe retry semantics to the API endpoints.
Carry forward: consumer-provider relationships, pact broker URL, CI verification pipeline.
