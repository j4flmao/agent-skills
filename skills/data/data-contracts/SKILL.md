---
name: data-data-contracts
description: >
  Use this skill when asked about data contract, data agreement, schema contract, producer/consumer contract, schema evolution, compatibility, data SLA, dbt contracts, or data product contract. This skill enforces: data contract definition with schema, semantics, SLA, and ownership, contract enforcement in CI/CD, schema compatibility checks (backward/forward/full), contract versioning, dbt contract configuration, and automated contract testing. Do NOT use for: data quality testing, data catalog management, or general API contract design.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, contracts, governance, phase-11]
---

# Data Data Contracts

## Purpose
Design and enforce data contracts between producers and consumers covering schema, semantics, SLA, ownership, versioning, and compatibility — with automated enforcement in CI/CD pipelines.

## Agent Protocol

### Trigger
Exact user phrases: "data contract", "data agreement", "schema contract", "producer consumer", "schema evolution", "compatibility", "data SLA", "dbt contracts", "data product contract", "contract testing", "breaking change schema".

### Input Context
- Data producers (source systems, pipelines, data products)
- Data consumers (analysts, ML models, dashboards, downstream systems)
- Current schema management approach
- Data platform and transformation tools
- Compliance and governance requirements

### Output Artifact
Data contract specification with schema, SLA terms, ownership; CI/CD enforcement pipeline with compatibility checks; versioning strategy.

### Response Format
```yaml
# Contract schema definition
# Semantic type definitions
# SLA configuration
# CI/CD enforcement pipeline
# Version compatibility matrix
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Contract schema defined with columns, types, constraints
- [ ] Semantic types documented per field
- [ ] SLA terms defined (freshness, volume, quality)
- [ ] Ownership and escalation assigned
- [ ] Contract versioning scheme established
- [ ] CI/CD enforcement pipeline configured
- [ ] Schema compatibility checks automated
- [ ] Breaking change detection and notification workflow

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Define Contract Schema

```yaml
contract:
  version: "1.2.0"
  dataset: analytics.fct_orders
  schema:
    columns:
      - name: order_id
        type: STRING
        required: true
        unique: true
        semantic_type: ORDER_ID
        tags: [PII, FINANCIAL]
      - name: customer_id
        type: STRING
        required: true
        semantic_type: CUSTOMER_ID
      - name: total_amount
        type: DECIMAL(18,2)
        required: true
        semantic_type: MONETARY_VALUE
        constraints:
          minimum: 0
          maximum: 100000
```

### Step 2: Define Semantic Types

| Type | Base Type | Validation | Example |
|---|---|---|---|
| ORDER_ID | STRING | Regex pattern | ORD-2026-001234 |
| CUSTOMER_ID | STRING | UUID format | a1b2c3d4-... |
| MONETARY_VALUE | DECIMAL | Positive | 150.00 |
| EMAIL | STRING | Email regex | user@org.com |
| ISO_DATE | DATE | ISO 8601 | 2026-05-22 |

### Step 3: Define SLA Terms

```yaml
sla:
  freshness:
    max_age: 3600  # seconds
    schedule: hourly
  volume:
    min_rows: 50000
    max_rows: 200000
  quality:
    null_threshold_pct: 1.0
    unique_threshold_pct: 99.9
    distribution_drift_pct: 5.0
  ownership:
    producer: team-orders-engine
    consumer: team-analytics
    escalation: dgovernance@org.com
```

### Step 4: Schema Compatibility

| Mode | Producer Can | Consumer Must | Use Case |
|---|---|---|---|
| **BACKWARD** | Delete column, add optional | Read old schema | Default |
| **FORWARD** | Add column, delete optional | Tolerate unknown | Stream consumers |
| **FULL** | Add optional only | Read any version | Strict governance |
| **NONE** | Any change | Recompile | Dev only |

### Step 5: dbt Contracts

```yaml
models:
  - name: fct_orders
    config:
      contract:
        enforced: true
    columns:
      - name: order_id
        data_type: string
        constraints: [not_null, unique]
        meta:
          semantic_type: ORDER_ID
      - name: total_amount
        data_type: numeric
        constraints: [not_null]
```

### Step 6: CI/CD Enforcement

```yaml
jobs:
  contract-check:
    steps:
      - uses: actions/checkout@v4
      - name: Validate Contract
        run: |
          python scripts/validate_contract.py \
            --contract contracts/fct_orders.yaml \
            --schema current_schema.json \
            --compatibility backward
      - name: Check Breaking Changes
        run: |
          python scripts/check_breaking.py \
            --old contracts/fct_orders_v1.yaml \
            --new contracts/fct_orders_v2.yaml
      - name: Validate with dbt
        run: dbt run --select fct_orders --fail-fast
```

### Step 7: Contract Versioning

Version scheme: MAJOR (breaking), MINOR (additive), PATCH (fixes). Breaking change = MAJOR bump. All consumers of previous version must acknowledge before MAJOR takes effect.

### Step 8: Contract Lifecycle Management

Contracts progress through stages: DRAFT (under development), REVIEW (submitted for consumer review), ACTIVE (enforced in production), DEPRECATED (replaced by newer version, 30-day notice), RETIRED (no longer in use). Each transition is tracked with who approved and when.

### Step 9: Automated Contract Testing

Beyond schema validation, test contracts with Great Expectations suites. For each contract column, auto-generate expectations: expect_column_to_exist, expect_column_values_to_not_be_null, expect_column_values_to_be_between, expect_column_values_to_match_regex. Run these as part of the data pipeline and report results back to the contract.

### Step 10: Contract Impact Analysis

When a contract changes, compute the impact: which consumers are affected, which dashboards reference the dataset, which downstream pipelines depend on it. Use the catalog's lineage graph to compute impact. Notify all affected parties before the change takes effect.

## Architecture / Decision Trees

### Compatibility Mode Selection

```
New/updated contract
  ├── Batch data pipeline → BACKWARD
  ├── CDC/stream consumer → FORWARD
  ├── Regulated data (SOX, HIPAA) → FULL
  ├── Dev/test environment → NONE
  └── dbt model → enforced via dbt contracts
```

### Breaking Change Decision

```
Schema change proposed
  ├── Add column (nullable, default) → MINOR
  ├── Add column (required, no default) → MAJOR (breaking)
  ├── Remove column → MAJOR (breaking)
  ├── Widen type (INT->LONG) → MINOR
  ├── Narrow type (LONG->INT) → MAJOR (breaking)
  ├── Rename column → MAJOR (add new, deprecate old, remove later)
  └── Add constraint (NOT NULL on existing) → MAJOR
```

### Contract Storage Topology

```
Where to store contracts:
  ├── Same repo as producer code → Tightly coupled, easy to maintain
  ├── Dedicated contracts repo → Centralized governance, harder to sync
  ├── In catalog metadata → Always in sync with actual schema
  └── In data product definition → Best for data mesh architectures
```

## Common Pitfalls

1. **Contract out of sync with actual schema**: contract defines columns that don't match the table. Fix: auto-generate contract from schema, or validate contract against schema in CI.
2. **Breaking changes without notification**: producers change contracts, consumers break silently. Fix: enforce consumer acknowledgment for MAJOR changes.
3. **SLA too strict or too loose**: unrealistic freshness or volume bounds cause constant false alerts. Fix: base SLA on observed metrics with 20% buffer.
4. **No automated enforcement**: contract exists as documentation only. Fix: CI/CD gates that block non-compliant changes.
5. **Multiple contracts per dataset**: conflicting contracts cause confusion. Fix: single contract per dataset with all consumer terms.
6. **No rollback plan**: breaking change deployed, consumers can't read data. Fix: maintain backward compatibility for at least 14 days.
7. **Contract defined but not monitored**: SLA breaches happen silently. Fix: automate SLA monitoring with alerting.
8. **dbt contracts not enforced for all models**: only some models have contracts. Fix: require contracts for all production models.
9. **Contract versioning ignored**: everyone uses latest version, no tracking. Fix: enforce semver and track which version each consumer uses.
10. **No contract for source data**: contracts only on transformed data. Source systems also need contracts.

## Best Practices

- Contracts are versioned, immutable after publication. New versions supersede old ones.
- Every production dataset must have a contract before being discoverable in the catalog.
- Schema compatibility enforced automatically in CI/CD on every change.
- Consumer acknowledgment tracked and auditable for MAJOR changes.
- dbt contracts enforced at build time (not runtime).
- Contract is source of truth: schema must match contract exactly.
- SLA terms include notification channels for breaches.
- Distribution drift detection: alert when data distribution deviates > 5% from baseline.
- Auto-generate contract from schema for existing datasets, then manually enrich.
- Store contract alongside data product definition for mesh architectures.
- Review all contracts quarterly with producer and consumer representatives.
- Use contract templates for consistency across teams.
- Monitor contract enforcement pass/fail rates over time.

## Compared With

| Feature | dbt Contracts | Data Contract YAML | Schema Registry | Great Expectations |
|---|---|---|---|---|
| Scope | dbt models | Any dataset | Streaming topics | Data quality |
| Schema enforcement | Build time | CI/CD | Serialization | Runtime |
| SLA support | No | Yes | No | No |
| Ownership tracking | Basic | Structured | Basic | No |
| Compatibility checks | Implicit | Explicit | Native | No |
| Notification workflow | No | Yes | Limited | Yes (alerts) |
| Versioning | dbt version | Semver | Schema version | No |

Data contracts vs schema registry: schema registry handles technical schema compatibility at serialization time. Data contracts cover the full agreement: schema, SLA, semantics, ownership, and lifecycle. They work together: contract's schema section can reference schema registry subjects.

Data contracts vs data quality: quality tools validate data against expectations at runtime. Contracts define the expectations that quality tools should enforce. The contract is the "what" and quality tools are the "how."

## Performance

- Contract validation: < 1s per contract (schema comparison + rule evaluation).
- dbt contract enforcement: adds negligible overhead to dbt run.
- CI/CD check: 5-30s depending on schema size and number of consumers.
- Breaking change detection: < 2s per contract (schema diff algorithm).
- SLA monitoring: continuous, alert within 1 minute of breach detection.
- Contract storage: Redis or Postgres, < 10ms per read.
- Impact analysis: lineage traversal adds 2-10s depending on graph size.
- Scale: contract enforcement pipeline handles 100+ contracts per CI run.
- Notification: email/slack notification within 30 seconds of breach detection.

## Tooling

| Tool | Purpose |
|---|---|
| dbt | Contract enforcement for data models |
| Great Expectations | Data quality expectations matching contract terms |
| Soda | Data quality monitoring, SLA enforcement |
| Monte Carlo | Data observability, drift detection |
| Marquez / OpenLineage | Lineage for impact analysis |
| Custom CI/CD scripts | Contract validation in GitHub/GitLab |
| DataHub / OpenMetadata | Contract storage and discovery |
| Apache Avro / Protobuf | Schema definition for contracts with schema registry integration |

## Rules
- Every production dataset has a contract with explicit schema, SLA, and owner
- Schema compatibility checked automatically on every PR
- Breaking changes require consumer acknowledgment before deploy
- Contract versioning follows semver
- dbt contracts enforced at build time
- Contract is source of truth — schema must match contract
- No undocumented columns in production datasets
- SLA breach triggers contract violation notification
- Contracts reviewed quarterly by producer and consumer
- Auto-generate contracts for existing datasets, manually enrich
- Only one contract per dataset
- Maintain backward compatibility for at least 14 days after breaking change
- Contracts stored alongside data product definitions
- Impact analysis required before MAJOR version changes

## References
  - references/contract-definition.md — Data Contract Definition
  - references/contract-enforcement.md — Contract Enforcement
  - references/contract-examples.md — Data Contract Examples
  - references/contract-integration-patterns.md — Contract Integration Patterns
  - references/contract-lifecycle-management.md — Contract Lifecycle Management
  - references/contract-migration-strategies.md — Contract Migration Strategies
  - references/contract-monitoring-enforcement.md — Contract Monitoring and Enforcement
  - references/schema-evolution-policies.md — Schema Evolution Policies
  - references/data-contracts-schema-evolution.md — Schema Evolution in Contracts
  - references/data-contracts-governance.md — Contract Governance Reference
## Handoff
`data-data-quality` for quality dimension enforcement in contracts. `data-data-catalog` for contract metadata. `data-data-observability` for SLA monitoring. `data-schema-registry` for schema registry integration.
