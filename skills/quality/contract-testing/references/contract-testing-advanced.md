# Contract Testing Advanced Topics

## Introduction
Advanced contract testing covers message-based contracts, multi-provider verification, OAS-driven contract testing, evolutionary API design, and contract testing at scale in microservice ecosystems with hundreds of services.

## Message Pact (Async Contract Testing)
For event-driven architectures using message queues (Kafka, SQS, RabbitMQ), Pact supports message contracts:

```typescript
// Consumer side — message Pact
const messagePact = new MessagePact({
  consumer: "OrderService",
  provider: "PaymentService",
});

describe("Order event handling", () => {
  it("should handle order.created event", async () => {
    await messagePact
      .given("order is created")
      .expectsToReceive("an order created event")
      .withContent({
        id: like(1),
        amount: like(100.00),
        currency: term({ generate: "USD", matcher: "^(USD|EUR|GBP)$" }),
        customerEmail: like("customer@example.com"),
        items: eachLike({
          sku: like("SKU-001"),
          quantity: like(1),
        }),
      })
      .withMetadata({
        "content-type": "application/json",
        "message-source": "order-service",
      });

    await messagePact.verify(async (message) => {
      const handler = new PaymentHandler();
      const result = await handler.handleOrderCreated(message);
      expect(result.processed).toBe(true);
    });
  });
});
```

```typescript
// Provider side — message verification
const verifier = new Verifier({
  provider: "PaymentService",
  pactBrokerUrl: "https://pact-broker.company.com",
  providerVersion: "1.2.3",
  stateHandlers: {
    "order is created": async () => {
      await setupTestOrder();
    },
  },
});

await verifier.verifyMessageProviders({
  "an order created event": async () => {
    const event = await loadTestEvent("order-created.json");
    return event;
  },
});
```

## Bi-Directional Contract Testing
When consumer-driven contracts aren't feasible (third-party APIs, legacy providers), use bi-directional contracts with OpenAPI/Swagger:

```yaml
# OpenAPI spec serves as the contract
openapi: 3.0.0
info:
  title: Payment API
  version: 1.2.0
paths:
  /api/payments:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentRequest'
      responses:
        '200':
          description: Payment processed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentResponse'
```

Consumer validates their requests match the spec; provider tests validate the spec is implemented correctly. Tools like Dredd, Schemathesis, or Spectral validate both sides against the shared OAS.

## Multi-Provider Verification
In complex microservice topologies, one consumer may call multiple providers. Use Pact's `Verifier` with provider filters to verify groups:

```typescript
const verifier = new Verifier({
  provider: "API Gateway",
  pactBrokerUrl: "https://pact-broker.company.com",
  consumerVersionSelectors: [
    { tag: "prod", latest: true },
    { tag: "staging", latest: true },
  ],
  providerVersion: "1.2.3",
  enablePending: true,  // Allow pending pacts
  includeWipPactsSince: "2026-06-01",  // Work-in-progress contracts
});
```

## Evolutionary API Design with Contracts
Contract testing enables safe API evolution:
1. Add new optional fields to the contract — consumers who don't use them are unaffected
2. Add new endpoints alongside existing ones — migrate consumers gradually
3. Deprecate old fields via Pact Broker webhooks — notify consumer teams
4. Remove fields only when all consumers have migrated (can-i-deploy confirms)

## Can-I-Deploy Workflow
```yaml
deployment_workflow:
  steps:
    - name: "Build and test provider"
      command: "npm test"
    - name: "Verify consumer contracts"
      command: "npx pact-provider-verification"
    - name: "Check deployment safety"
      command: |
        pact-broker can-i-deploy \
          --pacticipant OrderService \
          --version 1.2.3 \
          --to-environment production
    - name: "Deploy to production"
      command: "deploy.sh production"
    - name: "Tag successful deployment"
      command: |
        pact-broker create-version-tag \
          --pacticipant OrderService \
          --version 1.2.3 \
          --tag production
```

## Contract Testing Maturity Model
- Level 1: Manual API contract reviews in meetings
- Level 2: Consumer tests written, contracts on Pact Broker, manual provider verification
- Level 3: Automated provider verification in CI, can-i-deploy in deployment pipeline
- Level 4: Message contracts for async systems, bi-directional for third-party APIs
- Level 5: Pending pacts enabled, WIP pacts for new interactions, auto-evolution governance

## Performance Considerations
- Pact consumer tests run in milliseconds (mock server in-process)
- Provider verification takes 1-5 seconds per Pact file (actual provider calls)
- Pact Broker queries for can-i-deploy take < 300ms
- CI pipeline adds 30-60 seconds for full contract verification

## Key Points
- Message Pact extends contract testing to async/event-driven architectures
- Bi-directional contracts use OpenAPI as shared contract for non-CDC scenarios
- Multi-provider verification validates complex service topologies
- Enable pending and WIP pacts for gradual contract evolution
- Integrate can-i-deploy into CI/CD pipeline for safe deployments
- Contract testing supports evolutionary API design without breaking consumers
