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

## Rules
- Every consumer-provider pair has its own Pact contract file
- Contracts are published on every consumer CI run
- Provider verifies ALL consumer contracts before deployment
- can-i-deploy gates all deployments — no bypass
- Contract versions are tagged by environment (dev, staging, prod)
- Never delete a contract — mark as deprecated
- Webhook on verification failure notifies affected teams
- Pact contract = executable documentation

## References
- `references/consumer-contracts.md` — Pact setup, consumer test, provider verification, contract broker
- `references/contract-workflow.md` — CI pipeline, versioning, breaking change detection, canary release

## Handoff
`quality-e2e-testing` for E2E tests that complement contract tests.
`devops-observability` for monitoring contract verification in CI/CD.
Carry forward: Pact contracts, broker configuration, CI pipeline config.
