---
name: devops-dataops
description: >
  Use this skill when implementing DataOps: CI/CD for data pipelines, dbt CI/CD, SQLFluff, Great Expectations, data pipeline versioning, data testing in CI, data environment management, data contract CI, data lineage in CI/CD.
  This skill enforces: pipeline CI/CD configuration, data testing integration, environment promotion, data contract validation, rollback strategy.
  Do NOT use for: data warehouse schema design (use data-warehouse), ETL pipeline design (use etl-pipeline), general CI/CD (use cicd-pipeline).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, dataops, data, phase-11]
---

# DataOps Agent

## Purpose
Implements CI/CD pipelines for data transformations, testing, environment management, and data contract enforcement.

## Agent Protocol

### Trigger
User request includes: DataOps, CI/CD for data, data pipeline CI/CD, data testing CI, dbt CI/CD, SQLFluff, data pipeline deployment, data environment management, data contract CI.

### Protocol
1. Identify data transformation framework (dbt, SQLFluff, custom).
2. Design CI pipeline: linting, testing, model compilation.
3. Configure CD pipeline: environment promotion with validation gates.
4. Integrate data testing (dbt tests, Great Expectations).
5. Set up data contract validation in CI.
6. Define rollback strategy for failed deployments.
7. Enable data lineage tracking across environments.

## Output
DataOps pipeline with CI/CD config, dbt setup, data testing, environment promotion.

### Response Format
```
## DataOps Pipeline
### CI Configuration
Framework: {dbt/sqlfluff/custom}
Linting: {sqlfluff config} | Threshold: {strict/warn}
Testing: {dbt test / Great Expectations / both}
Model Compilation: {enabled/disabled}
Data Contract Validation: {schema check / row count / freshness}

### CD Pipeline
Environments: [{dev, staging, prod}]
Promotion Gates:
  dev→staging: {tests pass, lint pass}
  staging→prod: {tests pass, schema compat, manual approval}
Rollback Strategy: {dbt source freshness / version pin / reverse migration}

### Data Contracts
Validation: {CI on PR / scheduled / on deploy}
Enforcement: {hard block / warn / log}
Contract Registry: {location}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] CI pipeline lints and tests all data models on every PR.
- [ ] CD pipeline promotes models through environments with validation gates.
- [ ] Data contracts validated in CI with enforcement configured.
- [ ] Rollback strategy documented and tested.
- [ ] Data lineage tracked across environments.
- [ ] dbt slim CI or equivalent for incremental runs.
- [ ] Great Expectations or dbt tests running in CI.

## Workflow

### Step 1: dbt CI Setup
Use dbt slim CI to build only changed models on PR. Compare against production manifest. Run `dbt build --select state:modified+` for efficiency. Compile all models to catch syntax errors.

```yaml
# CI step
dbt deps
dbt build --select state:modified+ --vars '{ci: true}'
```

### Step 2: SQL Linting
Configure SQLFluff with project rules. Run on all .sql files. Use `--dialect postgres/bigquery/snowflake`. Set severity threshold: warn on style, error on anti-patterns.

### Step 3: Data Testing
dbt tests: unique, not_null, accepted_values, relationships, custom generic tests. Great Expectations: run via dbt-expectations package or as separate step. Test key columns: primary keys, foreign keys, column ranges, null rates.

### Step 4: Environment Promotion
Dev → Staging → Prod. Each promotion triggers validation. Dev: full build on merge. Staging: borrow production manifest for slim CI. Prod: deploy with `--full-refresh` on schema change, incremental otherwise.

### Step 5: Data Contracts
Define contract per model: schema (column name, type), row count range, freshness SLA. Validate on PR: schema must be compatible. Validate on schedule: freshness and row count. Fail CI on contract violation or warn based on severity.

### Step 6: Rollback
Version-pin dbt packages and dependencies. Use `dbt source freshness` to verify source data compatibility before rollback. Maintain migration scripts for breaking schema changes. Keep N-1 versions deployable.

### Step 7: Data Lineage
Use dbt docs for column-level lineage. Store lineage artifacts per environment. Compare lineage changes in PR reviews. Track upstream source dependencies for impact analysis.

## Rules
- Always use slim CI for dbt — never rebuild entire project on every PR.
- SQLFluff errors block merge — warnings do not.
- Every model must have at least uniqueness and not_null tests on primary key.
- Environment promotion must be gated on all tests passing.
- Schema changes must be backward compatible or have migration plan.
- Data contracts must include SLA expectations.
- Rollback must be tested in staging before production use.

## References
  - references/data-cicd.md — Data CI/CD
  - references/data-contracts-ops.md — Data Contracts Operations
  - references/data-observability.md — DataOps Observability
  - references/data-testing.md — Data Testing
  - references/dataops-advanced.md — Dataops Advanced Topics
  - references/dataops-fundamentals.md — Dataops Fundamentals
## Handoff
For data warehouse schema design, hand off to `data-warehouse`. For data pipeline ETL, hand off to `etl-pipeline`. For quality monitoring, hand off to `data-quality`.
