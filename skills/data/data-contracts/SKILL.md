---
name: data-data-contracts
description: >
  Use this skill when asked about data contract, data agreement, schema contract, producer/consumer contract, schema evolution, compatibility, data SLA, dbt contracts, or data product contract. This skill enforces: data contract definition with schema, semantics, SLA, and ownership, contract enforcement in CI/CD, schema compatibility checks (backward/forward/full), contract versioning, dbt contract configuration, and automated contract testing. Do NOT use for: data quality testing, data catalog management, or general API contract design.
version: "1.0.0"
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
  description: "Daily order fact table for revenue reporting"

  schema:
    columns:
      - name: order_id
        type: STRING
        required: true
        unique: true
        description: "Unique order identifier"
        semantic_type: ORDER_ID
        examples: ["ORD-2026-001234", "ORD-2026-001235"]
        tags: [PII, FINANCIAL]

      - name: customer_id
        type: STRING
        required: true
        description: "Customer identifier"
        semantic_type: CUSTOMER_ID
        tags: [PII]

      - name: total_amount
        type: DECIMAL(18,2)
        required: true
        description: "Order total in USD"
        semantic_type: MONETARY_VALUE
        constraints:
          minimum: 0
          maximum: 100000
```

Each column has: name, type, required, unique, description, semantic_type, allowed_values (for enums), tags, PII classification.

### Step 2: Define Semantic Types

| Semantic Type | Base Type | Validation | Example |
|---|---|---|---|
| **ORDER_ID** | STRING | Regex `ORD-\d{4}-\d{6}` | ORD-2026-001234 |
| **CUSTOMER_ID** | STRING | UUID format | a1b2c3d4-... |
| **MONETARY_VALUE** | DECIMAL(18,2) | Positive, >0 | 150.00 |
| **EMAIL** | STRING | Email regex | user@org.com |
| **ISO_DATE** | DATE | ISO 8601 | 2026-05-22 |
| **PHONE** | STRING | E.164 regex | +14155551234 |

### Step 3: Define SLA Terms

```yaml
sla:
  freshness:
    max_age: 3600  # seconds
    schedule: hourly
    expected_by: "2026-05-22T11:00:00Z"
  volume:
    min_rows: 50000
    max_rows: 200000
    trend_window_days: 30
  quality:
    null_threshold_pct: 1.0
    unique_threshold_pct: 99.9
    distribution_drift_pct: 5.0
  ownership:
    producer: team-orders-engine
    producer_contact: oncall-orders@org.com
    consumer: team-analytics
    consumer_contact: oncall-analytics@org.com
    escalation: dgovernance@org.com
```

### Step 4: Schema Compatibility

| Mode | Producer Can | Consumer Must | Use Case |
|---|---|---|---|
| **BACKWARD** | Delete column, add optional | Read old schema | Default for most pipelines |
| **FORWARD** | Add column, delete optional | Tolerate unknown | Stream consumers |
| **FULL** | Add optional only | Read any version | Strict governance |
| **NONE** | Any change | Recompile | Development only |

Check: `compatibility = backward` means new schema can read old data. `forward` means old schema can read new data. `full` = both directions.

### Step 5: dbt Contracts

```yaml
# dbt/models/analytics/fct_orders.yml
models:
  - name: fct_orders
    description: "Daily order fact - revenue reporting"
    config:
      contract:
        enforced: true
        alias: fct_orders
    columns:
      - name: order_id
        data_type: string
        description: "Unique order identifier"
        constraints: [not_null, unique]
        tags: [PII]
        meta:
          semantic_type: ORDER_ID
          sensitivity: high
      - name: total_amount
        data_type: numeric
        description: "Order total in USD"
        constraints: [not_null]
        meta:
          semantic_type: MONETARY_VALUE
          min_value: 0
```

Run `dbt run --select fct_orders` — contract enforced at build time. Schema mismatch → build failure.

### Step 5a: Schema Evolution Rules

```json
{
  "compatibility_modes": {
    "backward": "New schema reads old data — default for batch",
    "forward": "Old schema reads new data — stream consumers",
    "full": "Both directions — strict governance",
    "none": "Any change — dev only"
  },
  "breaking": [
    "DROP_COLUMN: MAJOR + notify all consumers",
    "RENAME_COLUMN: add new, deprecate old, remove in MAJOR",
    "TYPE_NARROWING: widening only (INT->LONG->STRING)",
    "REQUIRED_ADD: backfill nulls before switching"
  ],
  "workflow": [
    "PR with updated contract → CI compares schemas",
    "Classify breaking vs non-breaking",
    "Notify consumers, 14-day review for breaking",
    "Semver bump: MAJOR(breaking) MINOR(additive) PATCH(fix)",
    "Consumer acknowledgment required before MAJOR deploy"
  ]
}
```

Policy: BACKWARD default. FORWARD for CDC streams. FULL for regulated data. NONE for dev.

### Step 6: CI/CD Enforcement

```yaml
# .github/workflows/contract-check.yml
jobs:
  contract-check:
    runs-on: ubuntu-latest
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
            --new contracts/fct_orders_v2.yaml \
            --mode BACKWARD
      - name: Notify Consumers
        if: failure()
        run: |
          curl -X POST -H "Content-type: application/json" \
            --data '{"text":"Breaking contract change detected for fct_orders"}' \
            ${{ secrets.SLACK_WEBHOOK }}
      - name: Validate with dbt
        run: dbt run --select fct_orders --fail-fast
      - name: Test Contract Integrity
        run: dbt test --select tag:contract --store_failures
```

### Step 7: Contract Versioning

```
contracts/
  analytics/
    fct_orders/
      v1.0.0.yaml
      v1.1.0.yaml
      v2.0.0.yaml (breaking)
schemas/
  analytics/
    fct_orders/
      v1.0.0.avsc
      v1.1.0.avsc
      v2.0.0.avsc
```

Version scheme: `MAJOR` (breaking), `MINOR` (additive), `PATCH` (fixes). Breaking change = MAJOR bump. Notification: all consumers of previous version must acknowledge before MAJOR takes effect.

## Rules
- Every production dataset has a contract with explicit schema, SLA, and owner
- Schema compatibility checked automatically on every PR
- Breaking changes require consumer acknowledgment before deploy
- Contract versioning follows semver
- dbt contracts enforced at build time
- Contract is source of truth — schema must match contract
- No undocumented columns in production datasets
- SLA breach triggers contract violation notification

## References
- `references/contract-definition.md` — Contract schema, semantic types, SLA terms, ownership, dbt contracts, versioning
- `references/contract-enforcement.md` — CI/CD contract testing, schema compatibility checks, producer/consumer workflows, breaking change detection
- `references/contract-examples.md` — Multi-model dbt contracts, Kafka Avro contracts, contract SLA templates
- `references/schema-evolution-policies.md` — Compatibility modes, breaking vs non-breaking changes, evolution workflow, schema registry integration

## Handoff
`data-data-quality` for quality dimension enforcement in contracts. `data-data-catalog` for contract metadata. `data-data-observability` for SLA monitoring. `data-schema-registry` for schema registry integration.
