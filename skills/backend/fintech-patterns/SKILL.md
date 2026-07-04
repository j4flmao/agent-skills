---
name: Fintech Patterns
description: >
  Comprehensive guide to backend fintech patterns including
  double-entry accounting, idempotency, PCI-DSS compliance,
  and transaction ledgers.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - backend
  - fintech
  - ledger
  - architecture
---

# Fintech Patterns

## Purpose
This skill defines the architectural standards, state management strategies, and security best practices for developing highly resilient, high-throughput fintech backend systems. It covers the implementation of strict double-entry accounting ledgers, robust idempotency controls, and stringent adherence to PCI-DSS compliance requirements, ensuring financial data integrity at all times.

## Core Principles
1. **Double-Entry Consistency:** Total debits must always strictly equal total credits within a single atomic transaction.
2. **Strict Idempotency:** All financial operations must process requests exactly once regardless of network retries.
3. **Immutability:** Ledgers are append-only; state changes are never mutated or deleted, only compensated.
4. **Security by Design:** All PII and PAN data must be tokenized and encrypted at rest and in transit.
5. **High Availability:** Systems must be designed with CQRS, Event Sourcing, and sharding to sustain high read/write throughput without downtime.

## Agent Protocol

### Triggers
- Designing new financial ledgers
- Implementing payment gateway integrations
- Auditing existing systems for PCI-DSS compliance

### Input Context Required
- High-level business requirements for the financial flow
- Expected transaction volume and throughput
- Existing database and infrastructure constraints

### Output Artifact
A complete architectural design or code implementation encompassing the necessary bounded contexts, database schemas, and API definitions.

### Response Formats
```json
{
  "transaction_id": "tx_987654321",
  "idempotency_key": "idem_123456789",
  "status": "COMPLETED",
  "entries": [
    {"account": "acc_user", "amount": -100.00, "currency": "USD"},
    {"account": "acc_merchant", "amount": 100.00, "currency": "USD"}
  ]
}
```

## Decision Matrix
```text
Is the operation purely informational?
+-- Yes --> Use CQRS Read Model
+-- No --> Does it affect financial balances?
    +-- Yes --> Requires Double-Entry Ledger Transaction & Idempotency Key
    +-- No --> Standard CRUD operation
```

## Detailed Architectural Overview
```text
+-------------------+       +--------------------+       +-------------------+
| Payment Gateway   | ----> | Idempotency Layer  | ----> | Transaction SAGA  |
+-------------------+       +--------------------+       +-------------------+
                                                               |
                                                               v
                                                     +-------------------+
                                                     | Append-Only Ledger|
                                                     +-------------------+
```
### Lifecycle
1. Request received with Idempotency-Key header
2. Validate Idempotency state
3. Execute SAGA (Debit + Credit)
4. Persist to Event Store
5. Update Read Projections
6. Return Response

## Workflow Steps

### Phase 1: Ingestion
1. Validate incoming payload and JWT claims
2. Extract and cache idempotency key
3. Perform basic schema validation

### Phase 2: Orchestration
1. Initiate distributed SAGA pattern
2. Acquire distributed locks on participant accounts
3. Prepare pending state in local DB

### Phase 3: Execution
1. Append Debit entry to the ledger
2. Append Credit entry to the ledger
3. Verify zero-sum constraint

### Phase 4: Commit
1. Commit the transaction to the database
2. Publish domain event to the message broker
3. Release distributed locks

### Phase 5: Projection
1. Consume domain event asynchronously
2. Update materialized views for account balances
3. Invalidate relevant caches

### Phase 6: Resolution
1. Update idempotency state to SUCCESS
2. Format response payload
3. Return 200 OK to caller

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Balance Mismatch | Zero-sum constraint failed | Halt processing and trigger manual reconciliation |
| Duplicate Transaction | Idempotency key collision | Investigate client retry mechanisms |
| Deadlocks | Suboptimal distributed lock acquisition order | Ensure locks are acquired in consistent alphabetical order |
| High Latency | Database index bloat on ledger table | Partition ledger table by date/month |
| Unhandled Exceptions | Missing SAGA compensation | Implement dead-letter queues and automated retries |
| SAGA Stalled | Network partition during orchestrator execution | Run periodic background sweepers to resume SAGAs |

## Complete Execution Scenario
```text
[Client] -> POST /transfer
            Idempotency-Key: xyz
            [API Gateway] -> Validates JWT
            [Transfer Service] -> Checks Idempotency cache
                               -> Acquires lock on Acc A & Acc B
                               -> DB Tx Start
                               -> Insert Ledger (Debit A)
                               -> Insert Ledger (Credit B)
                               -> DB Tx Commit
                               -> Publish Event
            [Read Model Updater] <- Consumes Event
                                 <- Updates Balance Views
```

## Rules and Guidelines
1. Never delete a ledger entry.
2. All financial APIs must require an Idempotency-Key header.
3. Use integers (cents) or Decimals for currency, never floats.
4. Separate the transaction processing bounded context from the user management context.
5. All sensitive data must be encrypted with rotating KMS keys.

## Reference Guides
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
Refer to `backend/api-design` for general API standards.
Refer to `infrastructure/database-scaling` for sharding strategies.

<!-- Compression Footer -->
<!-- COMPRESSED_SKILL_V2 -->
