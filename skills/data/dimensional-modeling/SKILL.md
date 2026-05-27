---
name: data-dimensional-modeling
description: >
  Use this skill when designing dimensional data models — Kimball star schemas, Data Vault 2.0, slowly changing dimensions, fact table design, or bus matrix development. This skill enforces: Kimball 4-step methodology (business process, grain, dimensions, facts), star schema design with conformed dimensions, SCD Type 0-6 selection, fact table granularity and additive/non-additive measures, and Data Vault 2.0 hub/link/satellite modeling. Do NOT use for: OLTP normalization, NoSQL data modeling, or data lake table format design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, modeling, warehouse, phase-7]
---

# Dimensional Modeling

## Purpose
Design robust dimensional data models for analytical workloads following Kimball methodology, star schema best practices, slowly changing dimension strategies, fact table design patterns, and Data Vault 2.0 architecture.

## Agent Protocol

### Trigger
Exact user phrases: "dimensional modeling", "Kimball", "star schema", "snowflake schema", "bus matrix", "conformed dimension", "slowly changing dimension", "SCD", "fact table", "dimension table", "data vault", "hub link satellite", "grain declaration", "surrogate key", "degenerate dimension".

### Input Context
- Business processes to model (sales, inventory, orders, payments)
- Source systems and data granularity
- Reporting and analytics requirements
- Query patterns (aggregations, drill-down, slice-and-dice)
- Data volume and growth rate
- Historical tracking requirements (how far back, what changes to track)

### Output Artifact
Dimensional model with bus matrix, star schemas, SCD strategy, fact table designs, and DDL statements.

### Response Format
```sql
-- Dimension and fact table DDL
-- SCD implementation
```
```yaml
# Bus matrix
# Grain declaration
```
```markdown
# Design decisions and trade-offs
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Business process selected and grain declared
- [ ] Bus matrix created showing dimensions by process
- [ ] Conformed dimensions identified and standardized
- [ ] SCD type selected per dimension attribute
- [ ] Fact table type (transaction, periodic snapshot, accumulating) selected
- [ ] Additive, semi-additive, and non-additive measures classified
- [ ] Surrogate key strategy defined
- [ ] Data Vault model designed if applicable

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Select Business Process
Identify core business processes that generate measurable events: sales transactions, order fulfillment, inventory movements, customer interactions. Each process becomes a fact table candidate. Prioritize by business impact and data availability.

### Step 2: Declare Grain
Grain defines what a single row in the fact table represents. Examples: one row per sales line item, one row per daily inventory snapshot, one row per order header. The grain must be precise and unambiguous. It determines what dimensions are possible and at what granularity.

### Step 3: Identify Dimensions
Identify who, what, where, when, why, and how of the business process. Dimensions are the entry points for queries: customer, product, date, store, promotion. Ensure dimensions are conformed — same dimension used across multiple fact tables with consistent keys and attributes.

### Step 4: Identify Facts
Facts are the measurements from the business process. Classify as additive (summable across all dimensions), semi-additive (summable across some dimensions, e.g., balance across time), or non-additive (ratios, percentages). Ensure every fact aligns with the declared grain.

### Step 5: Design Star Schema
Build star schema with a central fact table surrounded by dimension tables. Use surrogate keys (meaningless integers) for dimension joins. Consider snowflake dimensions only when necessary for hierarchy management. Apply degenerate dimensions for transaction identifiers (order number, invoice number) stored directly in the fact table.

### Step 6: Apply SCD Strategy
Select SCD type for each dimension attribute based on tracking requirements. Type 0 for permanent attributes, Type 1 for corrections, Type 2 for full history, Type 3 for limited history, Type 4 for rapidly changing attributes, Type 6 for hybrid scenarios.

### Step 7: Design Fact Tables
Select fact table type: transaction fact for atomic events, periodic snapshot for regular intervals (daily account balance), accumulating snapshot for processes with defined milestones (order-to-delivery pipeline). Add factless fact tables for event coverage analysis.

### Step 8: Consider Data Vault
For enterprise-scale data platforms, consider Data Vault 2.0. Hubs store business keys, Links store relationships, Satellites store descriptive attributes. Raw vault preserves source fidelity; business vault adds business rules. Hash keys enable distributed loading.

## Rules
- Declare grain before designing dimensions or facts — everything follows from grain
- Conformed dimensions are non-negotiable for cross-process analysis
- Surrogate keys always, never use business keys in dimension joins
- Type 2 SCD for any attribute where historical reporting matters
- Facts must match the declared grain exactly
- Degenerate dimensions for transaction identifiers only
- Data Vault for enterprise EDW; star schema for presentation layer
- Snowflake dimensions only when hierarchies exceed 3 levels
- Test grain by querying: can I aggregate to the right level?

## References
  - references/data-vault.md — Data Vault 2.0 Reference
  - references/dimensional-modeling-etl.md — Dimensional Modeling ETL
  - references/dimensional-modeling-performance.md — Dimensional Modeling Performance
  - references/fact-table-design.md — Fact Table Design Reference
  - references/kimball-methodology.md — Kimball Methodology Reference
  - references/scd-types.md — Slowly Changing Dimensions Reference
  - references/star-schema.md — Star Schema Design Reference
## Handoff
`data-etl-pipeline` for ETL/ELT implementation of dimensional models
`data-data-warehouse` for warehouse platform-specific optimizations
`data-data-quality` for dimension and fact quality monitoring
