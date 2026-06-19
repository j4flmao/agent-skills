# Contract Testing Fundamentals

## Overview
Contract testing verifies that services can communicate correctly by validating that each service's API interactions match a shared contract. Unlike integration tests that deploy multiple services, contract tests verify each service independently using recorded or generated contracts, providing fast, reliable feedback on API compatibility.

## Core Concepts

### Concept 1: Consumer-Driven Contracts (CDC)
The consumer defines the interactions it expects from the provider. The consumer writes tests that record the expected request and response. These are published as a contract. The provider verifies it can satisfy all consumer contracts. CDC ensures providers don't break consumers during changes.

### Concept 2: Pact
Pact is the most widely adopted contract testing framework. It implements CDC for HTTP and message-based interactions. Pact flow: consumer test → Pact file (contract) → Pact Broker → provider verification. Supports JavaScript, JVM, Python, Ruby, Go, .NET, and more.

### Concept 3: Provider Verification
The provider runs Pact verification tests that replay consumer expectations against the real provider. If the provider's response matches the consumer's expectations, the contract is verified. Provider verification can be run in CI to catch breaking changes before deployment.

### Concept 4: Pact Broker
Central repository for sharing contracts between consumers and providers. Stores versioned contracts, verification results, and dependency graphs. Enables can-i-deploy checks: query the broker to verify that all consumers and providers are compatible before deploying.

### Concept 5: Provider States
Provider states set up specific data conditions before verification. The consumer declares what state the provider must be in (e.g., "user exists", "order is pending"). The provider implements state handlers that set up the required data.

## Pact Flow

### Consumer Side (Fastify API client example)
```typescript
// consumer/pacts/order-service.pact.test.ts
import { PactV3, MatchersV3 } from "@pact-foundation/pact";
const { eachLike, like, term } = MatchersV3;

const provider = new PactV3({
  consumer: "WebApp",
  provider: "OrderService",
});

describe("Order Service API", () => {
  it("should return order details", async () => {
    provider
      .given("order exists", { orderId: 1 })
      .uponReceiving("a request for order details")
      .withRequest({
        method: "GET",
        path: "/api/orders/1",
        headers: { Accept: "application/json" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          id: like(1),
          status: term({ generate: "shipped", matcher: "^(pending|shipped|delivered)$" }),
          items: eachLike({ productId: like(1), quantity: like(1) }),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/orders/1`);
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.status).toBe("shipped");
    });
  });
});
```

### Provider Side (Express API verification)
```typescript
// provider/pact-verification.test.ts
import { Verifier } from "@pact-foundation/pact";
import { server } from "./server";

describe("Order Service Pact Verification", () => {
  it("should satisfy all consumer contracts", async () => {
    const verifier = new Verifier({
      provider: "OrderService",
      providerBaseUrl: "http://localhost:3001",
      pactBrokerUrl: "https://pact-broker.company.com",
      publishVerificationResult: true,
      providerVersion: "1.2.3",
      stateHandlers: {
        "order exists": async (parameters) => {
          await seedDatabase({ orderId: parameters.orderId });
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

## Framework Comparison

| Feature | Pact | Spring Cloud Contract | Postman/Newman | Microcks |
|---------|------|---------------------|----------------|----------|
| Protocol | HTTP, messaging | HTTP, messaging | HTTP | HTTP, messaging, gRPC |
| Approach | CDC | CDC, bidirectional | Example-based | API spec-driven |
| Broker | Pact Broker (OSS/hosted) | Stub Runner | No | Live API mocking |
| Can-I-Deploy | Native | Via CI | Manual | Via CI |
| Provider states | Native | Native | No | Via datasets |
| Contract format | Pact JSON | Groovy DSL | Postman collection | OpenAPI + dataset |
| Matchers | Rich (like, eachLike, term) | Regular expressions | Limited | JSON schema |
| Ecosystem maturity | Very high | High (JVM-focused) | High | Growing |
| Best for | Polyglot microservices | JVM ecosystem | API monitoring | API mock-first |

## When to Use Contract Testing
- Multiple services consuming the same API
- Microservices architecture with independent deployability
- CI/CD pipeline needing fast API compatibility checks
- Polyglot environments (different languages for consumer/provider)
- Before deploying provider changes that might break consumers

## When NOT to Use Contract Testing
- Monolithic applications (single deployable)
- APIs with no consumers yet (use API spec validation instead)
- Real-time/streaming protocols without Pact support
- Legacy systems that can't be easily instrumented

## Best Practices
- One Pact file per consumer-provider pair per interaction type
- Use matchers (like, eachLike, term) instead of exact values for flexible verification
- Define provider states for all data scenarios consumers need
- Publish verification results to the broker for can-i-deploy
- Run consumer tests on every commit; provider verification on provider changes
- Use can-i-deploy in CI pipeline before deployment
- Keep contracts versioned and tagged (prod, staging, test)
- Handle breaking changes: add new endpoint, retire old one, update consumers

## Common Pitfalls
- Testing too many interactions per Pact file (keep focused)
- Using exact values in expectations instead of matchers (brittle)
- Not defining provider states (verification failures from missing test data)
- Ignoring contract versioning (causes confusing deployment failures)
- Treating contract tests as replacement for integration tests (they verify contracts, not behavior)
- Forgetting to tag contracts in the broker (can-i-deploy needs tags)

## Key Points
- Consumer-driven contracts ensure providers don't break consumers
- Pact is the dominant framework with broad language support
- Pact Broker enables can-i-deploy for safe deployments
- Provider states ensure verification runs with proper test data
- Contract tests complement, not replace, integration tests
- Run consumer tests on commit, provider verification before deployment
