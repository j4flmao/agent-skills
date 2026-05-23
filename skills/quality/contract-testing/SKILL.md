---
name: quality-contract-testing
description: >
  Use this skill when setting up contract testing, Pact, consumer-driven contracts, provider contract verification, API compatibility, or integration testing between services. This skill enforces: consumer-driven contracts with Pact, provider-side verification, contract publishing to a broker, versioning strategy, CI pipeline integration, and breaking change detection. Do NOT use for: API end-to-end tests, schema validation only, or single-service testing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, backend, phase-10]
---

# Quality Contract Testing

## Purpose
Implement consumer-driven contract testing with Pact to verify API compatibility between services without brittle integration tests.

## Agent Protocol

### Trigger
Exact user phrases: "contract testing", "Pact", "Spring Cloud Contract", "consumer-driven contract", "provider contract", "API compatibility", "integration testing", "contract verification", "Pact broker", "CDC", "breaking change".

### Input Context
Before activating, verify:
- Service architecture (monolith, microservices, event-driven)
- Consumer and provider service names
- Communication protocol (HTTP REST, gRPC, async messaging)
- Existing test frameworks and CI setup

### Output Artifact
Contract testing setup with Pact consumer tests, provider verification, and CI pipeline configuration.

### Response Format
```yaml
# Contract architecture: consumers, providers, interactions
# Pact Broker configuration
```
```typescript
// Consumer test example
// Provider verification setup
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Consumer tests written for each API interaction
- [ ] Pact contracts generated and published to broker
- [ ] Provider verification tests configured
- [ ] Pact Broker deployed or SaaS configured
- [ ] CI pipeline with contract verification step
- [ ] Breaking change detection workflow established
- [ ] Canary release or version compatibility strategy in place

### Max Response Length
200 lines of configuration and test code.

## Consumer-Driven Contracts

### Pact Overview
Pact is a consumer-driven contract testing framework. The consumer defines the expected interaction (request + response) in a test. Pact generates a contract file from the consumer test. The contract is published to a Pact Broker. The provider fetches the contract and verifies it against the actual API. If verification fails, the provider cannot deploy.

### Consumer Test Setup (TypeScript)
Consumer tests define the expected request and response for each API interaction. Tests run against a mock provider started by Pact. Each interaction specifies: a description of what the consumer expects to receive, the provider state that must be set up before verification, the request details (method, path, headers, body), and the expected response (status, headers, body).

### Provider Verification Setup
Provider tests fetch the latest consumer contracts from the Pact Broker and verify each interaction against the provider's actual API. The provider starts a test server, runs the contract verifier, and checks that each consumer interaction's response matches the actual response. Provider states are set up via API calls to the provider's test endpoints or database seeding.

### Pact Broker Deployment
The Pact Broker stores contracts, verification results, and matrices of compatible versions. It can be self-hosted via Docker Compose or used as a SaaS product (PactFlow). The Broker exposes a web UI showing the network diagram of all service dependencies. Webhooks can be configured to notify consumers when a provider publishes a new verification result or whena contract changes.

### Versioning and Compatibility
Contracts are versioned by the consumer's application version (Git commit SHA). Tags identify which version is deployed to each environment (dev, staging, production). The can-i-deploy tool checks the Pact Broker for compatibility before any deployment. The Broker maintains a matrix of compatible consumer and provider versions.

### Breaking Change Detection
When a provider change breaks a consumer contract, the Broker shows exactly which consumer is affected, which interaction failed, and the exact response diff. The developer fixes the issue by making the change backward compatible (add new endpoint instead of modifying existing, add optional fields) or coordinating a multi-service deployment.

### CI Pipeline Integration
Consumer CI: test → publish pact → tag version. Provider CI: fetch pending contracts → verify → report results. Deployment check: can-i-deploy verifies all consumer contracts pass before provider deploys. The pipeline blocks deployment if can-i-deploy fails.

### Spring Cloud Contract Alternative
Spring Cloud Contract provides Groovy-based contract definitions for JVM projects. Contracts are defined as Groovy DSL files alongside the provider code. The provider generates a test stub from the contract. Consumer-side tests use the WireMock stub generated from the contract. Contracts are stored in a Git repository or Artifactory instead of a Pact Broker.

### WebSphere MQ Contract Testing
For messaging contracts, Pact supports message pacts. A message pact defines the expected message payload (key-value pairs or serialized objects) that the consumer expects from a message queue. The provider verification starts the message producer and checks that the produced message matches the expected format and content. Pact Broker stores message pacts alongside HTTP pacts.

## Workflow

### Step 1: Pact Setup
Install Pact CLI and Pact library for each language: `@pact-foundation/pact` (JS), `pact` (Ruby), `pact-jvm` (JVM), `pact-python`. Deploy Pact Broker (OSS or PactFlow SaaS) for contract sharing. Each consumer-provider pair has exactly one set of contracts.

### Step 2: Consumer Test
```typescript
// consumer test (order-service tests payment-service)
await provider.addInteraction({
  state: "a payment exists",
  uponReceiving: "a request for payment status",
  withRequest: { method: "GET", path: "/payments/123" },
  willRespondWith: {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { id: "123", status: "confirmed", amount: 49.99 },
  },
});
```

### Step 3: Provider Verification
Provider verifies all consumer contracts in CI. Run Pact verification against provider API — each interaction's request is sent, response checked against expected. Provider verification must be fast (< 1 min per contract).

### Step 4: Pact Broker
Publish contracts from consumer CI: `pact-broker publish ./pacts --consumer-app-version <sha> --tag <branch>`. Provider CI fetches latest contracts: `pact-broker can-i-deploy --pacticipant <service> --version <sha>`. Broker shows network diagram of all service dependencies.

### Step 5: CI Pipeline
Consumer CI: test → publish pact → tag version. Provider CI: fetch pending contracts → verify → report results. Deployment check: `can-i-deploy` verifies all consumer contracts pass before provider deploys. Matrix of compatible versions stored in broker.

### Step 6: Breaking Change Detection
When a provider change breaks a consumer contract: developer sees which consumer is affected, which interaction failed, and the exact diff. Fix options: 1) add new endpoint (deprecate old), 2) add optional field (backward compatible), 3) coordinate deploy with consumer.

### Step 7: Version Compatibility
Backward compatibility requires that new provider satisfies all existing consumer contracts. Use `pact-broker can-i-deploy` as deployment gate. For breaking changes: deploy new provider version alongside old, migrate consumers, remove old contracts.

## Contract Testing Lifecycle Diagram

```
Consumer Service Development
  ┌─────────────────────────────────────────┐
  │ 1. Write consumer test with Pact DSL    │
  │ 2. Pact creates contract file           │
  │ 3. CI runs consumer tests               │
  │ 4. CI publishes contract to Broker      │
  │ 5. CI tags version (feat/xxx, main)     │
  └─────────────────────────────────────────┘
                      │
                      ▼
  ┌─────────────────────────────────────────┐
  │          Pact Broker                     │
  │  - Stores all contract versions         │
  │  - Tracks verification results          │
  │  - Maintains compatibility matrix      │
  │  - Webhooks for notifications          │
  │  - can-i-deploy API                     │
  └─────────────────────────────────────────┘
                      │
                      ▼
Provider Service Development
  ┌─────────────────────────────────────────┐
  │ 1. CI fetches consumer contracts        │
  │ 2. Provider sets up test state          │
  │ 3. Verifier checks each interaction     │
  │ 4. Publishes verification results       │
  │ 5. Runs can-i-deploy check              │
  │    ├── Pass → Deploy to staging/prod   │
  │    └── Fail → Block, notify team       │
  └─────────────────────────────────────────┘
```

## Consumer-Provider Interaction Matrix

| Consumer | Provider | Protocol | Endpoints | Contracts |
|---|---|---|---|---|
| OrderService | PaymentService | HTTP REST | GET /payments/:id, POST /payments | 3 interactions |
| OrderService | InventoryService | HTTP REST | GET /inventory/:sku, POST /inventory/reserve | 2 interactions |
| NotificationService | UserService | gRPC | GetUserPreferences, UpdatePreferences | 2 RPCs |
| DataPipeline | OrderService | HTTP REST | GET /orders/bulk | 1 interaction |
| Dashboard | AnalyticsService | Async (MQ) | order_metrics_updated event | 1 message pact |

## Pact Verification Matrix

| Provider Version | Consumer Version | Payment Contract | Inventory Contract | Status |
|---|---|---|---|---|
| v2.3.0 | OrderService v1.5.0 | ✅ Pass | ✅ Pass | Compatible |
| v2.3.0 | OrderService v1.4.0 | ✅ Pass | ❌ Fail (new endpoint) | Breaking change |
| v2.3.0 | NotificationService v3.1.0 | — | — | No contract |
| v2.2.0 | OrderService v1.5.0 | ✅ Pass | ✅ Pass | Compatible |

## Contract Testing vs E2E Testing

| Aspect | Contract Testing | E2E Testing |
|---|---|---|
| Scope | Single provider-consumer pair | Entire system |
| Speed | Fast (< 1 min per contract) | Slow (10-60 min) |
| Reliability | High (deterministic) | Low (flaky) |
| Failure diagnosis | Exact diff shown | Requires log analysis |
| Deployment blocking | Yes (can-i-deploy) | No (informational) |
| Environment | CI pipeline | Full staging environment |
| Test data | Provider states | Real data |

## Contract Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | Ad-hoc integration tests | Manual API testing, brittle E2E suites |
| 2: Defined | Basic consumer tests | Single consumer, no broker, manual verification |
| 3: Managed | Broker with CI integration | Pact Broker, CI verification, canary checks |
| 4: Measured | Multi-service contracts | All services covered, webhook alerts, trend reports |
| 5: Optimized | Cross-team contract governance | Contract review board, automated compatibility gates, SLA dashboards |

## Rules
- Every consumer-provider pair has its own Pact contract file
- Contracts are published on every consumer CI run
- Provider verifies ALL consumer contracts before deployment
- can-i-deploy gates all deployments — no bypass
- Contract versions are tagged by environment (dev, staging, prod)
- Never delete a contract — mark as deprecated
- Webhook on verification failure notifies affected teams
- Pact contract = executable documentation
- Providers verify contracts before deploying to staging
- Consumer contracts define what the provider must support

## References
- `references/pact-patterns.md` — Pact setup, consumer test patterns, Pact matchers, Pact Broker configuration, message pacts, Spring Cloud Contract
- `references/provider-verification.md` — Provider verification, CI pipeline, versioning, breaking change detection, canary release, webhook notification, contract lifecycle

## Handoff
`quality-e2e-testing` for E2E tests that complement contract tests.
`devops-observability` for monitoring contract verification in CI/CD.
Carry forward: Pact contracts, broker configuration, CI pipeline config.
