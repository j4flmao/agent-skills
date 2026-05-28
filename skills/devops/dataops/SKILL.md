---
name: devops-dataops
description: >
  Use this skill when implementing DataOps: CI/CD for data pipelines, dbt CI/CD, SQLFluff, Great Expectations, data pipeline versioning, data testing in CI, data environment management, data contract CI, data lineage in CI/CD.
  This skill enforces: pipeline CI/CD configuration, data testing integration, environment promotion, data contract validation, rollback strategy.
  Do NOT use for: data warehouse schema design (use data-warehouse), ETL pipeline design (use etl-pipeline), general CI/CD (use cicd-pipeline).
version: "1.1.0"
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
  dev-staging: {tests pass, lint pass}
  staging-prod: {tests pass, schema compat, manual approval}
Rollback Strategy: {dbt source freshness / version pin / reverse migration}

### Data Contracts
Validation: {CI on PR / scheduled / on deploy}
Enforcement: {hard block / warn / log}
Contract Registry: {location}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick.

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

Store the production manifest artifact and use it in CI for state comparison. Use `dbt source freshness` in CI to detect stale upstream sources before building.

### Step 2: SQL Linting
Configure SQLFluff with project rules. Run on all .sql files. Use `--dialect postgres/bigquery/snowflake`. Set severity threshold: warn on style, error on anti-patterns. Include rules for: keyword capitalisation, consistent indentation, comma placement, line length limits. Exclude rules that conflict with project conventions.

### Step 3: Data Testing
dbt tests: unique, not_null, accepted_values, relationships, custom generic tests. Great Expectations: run via dbt-expectations package or as separate step. Test key columns: primary keys, foreign keys, column ranges, null rates. Set up test coverage targets: each model must have at least uniqueness and not_null on primary key. Run tests in parallel where possible.

### Step 4: Environment Promotion
Dev -> Staging -> Prod. Each promotion triggers validation. Dev: full build on merge. Staging: borrow production manifest for slim CI. Prod: deploy with `--full-refresh` on schema change, incremental otherwise. Use dbt `--target` for environment-specific configs. Verify source freshness before promotion.

### Step 5: Data Contracts
Define contract per model: schema (column name, type), row count range, freshness SLA. Validate on PR: schema must be compatible. Validate on schedule: freshness and row count. Fail CI on contract violation or warn based on severity. Store contracts in a registry (YAML files or schema registry). Automatically detect contract drift.

### Step 6: Rollback
Version-pin dbt packages and dependencies. Use `dbt source freshness` to verify source data compatibility before rollback. Maintain migration scripts for breaking schema changes. Keep N-1 versions deployable. For failed deployment: revert to previous git tag and redeploy. For data corruption: restore from backup, rebuild downstream models.

### Step 7: Data Lineage
Use dbt docs for column-level lineage. Store lineage artifacts per environment. Compare lineage changes in PR reviews. Track upstream source dependencies for impact analysis. Maintain a data lineage document for critical reports.

## Architecture / Decision Trees

### CI/CD Architecture Options

| Approach | Description | Best For |
|---|---|---|
| dbt Slim CI | Only build changed models | Large dbt projects |
| Full Rebuild CI | Build all models every time | Small projects, first-time setup |
| GE + dbt | Great Expectations quality + dbt transformation | Data quality focused teams |
| dbt-expectations | Great Expectations tests inside dbt | dbt-centric teams |

### dbt vs Custom Pipeline Decision Tree
- Small team, standard SQL transformations: dbt (best developer experience)
- Complex multi-language pipelines (Python, Scala, SQL): custom framework
- Heavy data quality requirements: dbt + Great Expectations
- Real-time transformations: streaming pipeline (Flink, Kafka Streams)
- Legacy SQL already exists: wrap in dbt incrementally
- Airflow exists in org: Airflow + dbt together (Airflow orchestrates, dbt transforms)

### Testing Framework Choice

| Tool | Scope | Language | Integration |
|---|---|---|---|
| dbt test | dbt models | SQL/YAML | Native in dbt |
| Great Expectations | Any data source | Python | Standalone or Airflow |
| dbt-expectations | dbt models | SQL/YAML | Package for dbt |
| Soda | Any data source | YAML | Standalone or CI |
| Deequ | Spark data | Scala/Python | Spark jobs |

### Environment Strategy

| Environment | Purpose | Data Freshness | CI/CD Trigger |
|---|---|---|---|
| Dev | Development, testing | Stale snapshot | PR created |
| Staging | Integration testing | Near-production | PR merged |
| Prod | Production | Live | Manual approval |

## Common Pitfalls

### Pitfall 1: No Slim CI in Large dbt Projects
Building all models on every PR takes hours. Without slim CI, CI pipeline time grows linearly with model count. Always use `state:modified+` selector. Store production manifest as CI artifact. Compare against production manifest, not staging.

### Pitfall 2: Ignoring Source Freshness
Models compile and tests pass against stale sources, then fail in production because source data changed. Run `dbt source freshness` before building. Set freshness thresholds per source. Fail CI if source data exceeds freshness SLA.

### Pitfall 3: No Data Contract Validation
Downstream consumers are surprised when column types change, columns are dropped, or row counts drop. Define contracts per model. Validate breaking changes in CI. Use schema checking tools. Notify downstream consumers of contract changes.

### Pitfall 4: Skipping Test Coverage Targets
"Tests pass" means nothing if there are no tests. Set minimum test coverage per model. Primary keys must have unique + not_null tests. Foreign keys must have relationship tests. Track test coverage in CI dashboard.

### Pitfall 5: Full Refresh in Production Without Testing
Running `dbt run --full-refresh` in production without testing can break downstream models. Always test full refresh in staging first. Use `--full-refresh --select <specific models>` for targeted refreshes. Backup tables before destructive operations.

### Pitfall 6: Environment Config Drift
Dev, staging, and prod configurations diverge over time. Use dbt profiles in version control. Use environment variables for secrets and connection strings. Test in staging with production-like data volume. Synchronize config changes across environments.

### Pitfall 7: No Rollback Plan for Failed Deployments
When a dbt deployment fails mid-run, partial state corrupts downstream models. Always wrap deployment in reversible steps. Use dbt `--target` to manage parallel environments. Have a documented rollback procedure tested in staging.

## Best Practices

### Code Organization
- Organize models by staging, intermediate, and mart layers
- Use consistent naming: `stg_<source>_<entity>`, `int_<domain>`, `fct_<fact>`, `dim_<dimension>`
- Keep model SQL focused on single transformation
- Use YAML config for repeated parameters
- Document model descriptions in schema YAML
- Use source definitions for upstream tables

### Testing Strategy
- Every model: unique + not_null + relationships (key tests)
- Every mart: row_count > 0 + recency < 24h
- Columns with enumerated values: accepted_values
- Columns with range constraints: custom generic test
- Run test coverage report in CI PR comments
- Set up freshness SLA for all sources

### CI/CD Pipeline Design
- CI: lint (SQLFluff) + compile (dbt) + test (dbt test) + source freshness
- CD: deploy to staging, run all tests, validate contracts, manual approval for prod
- CD prod: incremental deploy, run critical tests only, monitor for 30 min
- Rollback: git revert + redeploy
- Pipeline must complete within 30 minutes for dev and staging

## Compared With

### dbt vs SQLFluff vs Great Expectations
dbt: transformation framework (build, run, test SQL). SQLFluff: SQL linter (style and anti-patterns only). Great Expectations: data quality testing framework (profiling, expectations, validation). These are complementary, not competing. Use all three: dbt for transforms, SQLFluff for linting, GE for quality.

### DataOps vs MLOps
DataOps: CI/CD for data pipelines, testing, environment promotion, contracts. MLOps: CI/CD for ML models, feature stores, model registry, A/B testing. Overlap in CI/CD tooling but different artifacts (SQL vs models). DataOps deals with deterministic transformations; MLOps with statistical models.

### dbt vs Airflow
dbt: transformation layer (SELECT statements, SQL transformations). Airflow: orchestration layer (DAG of tasks, scheduling, monitoring). dbt runs inside Airflow DAG as a task. They are complementary: Airflow triggers dbt runs. Never use one to replace the other.

## Operations & Maintenance

### dbt Pipeline Maintenance
- Weekly: review run history for failures, latency
- Monthly: update dbt version, test compatibility
- Quarterly: review model performance, optimize slow models
- As needed: update package dependencies
- Monitor: `dbt run` duration, test pass rate, freshness SLA adherence

### Data Contract Lifecycle
1. Define contract in YAML registry
2. Validate contract in CI on PR
3. Enforce contract on deployment
4. Monitor contract adherence in production
5. Update contract when schema evolves
6. Deprecate contract when model is retired

### Testing Cadence
- Per commit: dbt compile, SQLFluff lint
- Per PR: dbt slim CI, dbt test (changed models)
- Per deploy: dbt test (all models), GE suite, contract validation
- Daily: source freshness, data quality monitoring
- Weekly: full test suite, test coverage report

### Incident Response for Data Pipeline
1. Identify failed model: check dbt run output
2. Determine failure type: compilation error, test failure, timeout
3. For compilation errors: fix SQL, redeploy
4. For test failures: check source data quality, adjust tests
5. For timeouts: optimize SQL, increase timeout
6. Rollback if needed: restore previous version, rebuild downstream
7. Document root cause and preventive measures

## Rules
- Always use slim CI for dbt -- never rebuild entire project on every PR
- SQLFluff errors block merge -- warnings do not
- Every model must have at least uniqueness and not_null tests on primary key
- Environment promotion must be gated on all tests passing
- Schema changes must be backward compatible or have migration plan
- Data contracts must include SLA expectations
- Rollback must be tested in staging before production use
- Source freshness checked before every deployment
- Model directory must follow staging/intermediate/mart convention
- dbt packages version-pinned in packages.yml
- CI pipeline must complete within 30 minutes for dev
- CD to production requires manual approval gate
- Run history retained for minimum 90 days
- Data contracts enforced in CI for all production-facing models

## References
- references/dataops-fundamentals.md -- Dataops Fundamentals
- references/dataops-advanced.md -- Dataops Advanced Topics
- references/data-cicd.md -- Data CI/CD
- references/data-testing.md -- Data Testing
- references/data-contracts-ops.md -- Data Contracts Operations
- references/data-observability.md -- DataOps Observability
- references/dataops-pipeline-orchestration.md -- Pipeline Orchestration
- references/dataops-data-quality-monitoring.md -- Data Quality Monitoring

## Handoff
For data warehouse schema design, hand off to `data-warehouse`. For data pipeline ETL, hand off to `etl-pipeline`. For quality monitoring, hand off to `data-quality`.
