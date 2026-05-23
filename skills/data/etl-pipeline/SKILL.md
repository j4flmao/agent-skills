---
name: data-etl-pipeline
description: >
  Use this skill when asked about ETL, ELT, data pipeline, Airflow, dbt, data transformation, data ingestion, batch processing, or pipeline orchestration. This skill enforces: pipeline architecture with Airflow DAG design, dbt transformation with incremental loading, error handling with retry and dead-letter, data validation checks, and observability. Do NOT use for: real-time streaming (Kafka/Flink), data warehouse schema design, or BI dashboard configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, engineering, phase-10]
---

# Data ETL Pipeline

## Purpose
Design reliable ETL/ELT pipelines with Airflow orchestration, dbt transformations, incremental strategies, error handling, and data validation.

## Agent Protocol

### Trigger
Exact user phrases: "ETL", "ELT", "data pipeline", "Airflow", "dbt", "data transformation", "data ingestion", "batch processing", "pipeline orchestration", "incremental load", "data pipeline design", "DAG", "data workflow", "extract load transform".

### Input Context
Before activating, verify:
- Source systems (databases, APIs, files, streams)
- Target warehouse (Snowflake, BigQuery, Redshift, DuckDB)
- Volume and frequency (daily/hourly batch, CDC, real-time)
- Orchestration preference (Airflow, Dagster, Prefect)
- Transformation tool (dbt, custom SQL, Spark)

### Output Artifact
ETL pipeline design with DAG structure, transformation config, error handling as YAML and SQL.

### Response Format
```python
# Airflow DAG skeleton
# Task definitions
```
```yaml
# dbt model config
# Incremental strategy
```
```sql
# Transformation query template
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Pipeline architecture diagram defined (sources → staging → warehouse)
- [ ] Airflow DAG structure with task dependencies and retries
- [ ] Incremental loading strategy selected and configured
- [ ] Error handling with retry, dead-letter, and notification
- [ ] Data validation checks on each stage
- [ ] Monitoring and alerting configured

### Max Response Length
300 lines of code and configuration.

## ETL vs ELT

### ETL (Extract, Transform, Load)
Transform happens before loading. Best for: on-premises databases, structured data, complex transformations requiring significant compute, regulatory environments requiring data masking before storage. ETL requires a transformation engine (Spark, Python) between extraction and loading. Transformation reduces data volume before warehouse storage, saving on warehouse costs.

### ELT (Extract, Load, Transform)
Transform happens in the warehouse. Best for: cloud warehouses (Snowflake, BigQuery, Redshift), raw data preservation, agile schema evolution, when the warehouse provides sufficient compute for transformations. ELT loads raw data into staging tables first, then transforms using SQL. Recommended for most cloud data warehouse pipelines.

### Decision Guide
| Factor | Choose ETL | Choose ELT |
|---|---|---|
| Target | On-prem DB or file system | Cloud data warehouse |
| Data volume | 100GB+ daily | Any |
| Transformation complexity | High (ML, NLP, image processing) | Moderate (SQL aggregations) |
| Compliance | PII masking required before storage | Column-level security in warehouse |
| Team skill set | Python/Spark engineers | SQL analysts |
| Schema stability | Fixed schema | Evolving schema |

## Airflow DAG Patterns

### DAG Structure
One DAG per data domain. Structure: `start → extract → validate_extract → load_staging → validate_staging → transform → validate_transform → load_mart → complete`. Task dependencies use the bitshift operator: `extract >> validate_extract >> load_staging`.

### Task Parameters
Every task has: retries (3 with exponential backoff), execution timeout (2x expected runtime), SLA (30 minutes miss → alert), and a retry delay (5 min base, doubling each attempt). Use `max_active_runs=1` for sequential execution. Use `catchup=False` to skip past schedule intervals on backfill.

### Scheduling Patterns
Daily: `0 3 * * *` (off-peak hours). Hourly: `0 * * * *`. Weekly: `0 4 * * 1` (Mondays 4am). Event-driven: use `TriggerDagRunOperator` from another DAG. Data-aware scheduling: use Airflow 2.4+ datasets as dependencies between DAGs.

## dbt Transformation Patterns

### Model Organization
Staging models (`stg_<source>__<table>.sql`) are source-close with minimal transformations — column renaming, type casting, dedup. Intermediate models (`int_<domain>__<purpose>.sql`) contain business logic, joins, and complex transformations. Mart models (`fct_<process>.sql`, `dim_<entity>.sql`) are aggregated, consumption-ready for dashboards and analytics.

### Testing
Generic tests on every column: unique, not_null, accepted_values, relationships. Custom generic tests for project-specific patterns (freshness, row count thresholds). Singular tests for complex business rule validation. Test severity: error (blocking), warn (informational). Run critical tests in CI.

### Documentation
Auto-generate docs with `dbt docs generate`. Add model descriptions using `doc()` blocks with markdown. Document column descriptions, model lineage, and test coverage.

### Snapshots
SCD Type 2 snapshots track historical changes to dimension tables. Strategy: `timestamp` (based on `updated_at` column) or `check` (based on column value changes). Query current records with `WHERE dbt_valid_to IS NULL`.

## Batch vs Incremental Processing

### Batch Processing
Process all data from the source in each run. Simple to implement and debug. Best for: small datasets, reference data, initial loads, nightly reporting. Full refresh is the default materialization for small dimension tables.

### Incremental Processing
Process only new or changed data since the last run. Complex to implement but efficient for large datasets. Best for: large fact tables, event data, append-only logs, daily/hourly loading. Implemented in dbt via `is_incremental()` macro with timestamp or batch ID filtering.

## S3 Staging

### Staging Area Design
Raw data lands in S3 (or equivalent cloud storage) partitioned by source, date, and load timestamp. Structure: `s3://data-lake/landing/<source>/<date>/<load_id>/`. Data is in columnar format (Parquet) for efficient querying. Glue Crawler or equivalent registers partitions in the metastore. Staging tables in the warehouse point to the S3 location.

## Data Validation

### Stage Validations
Row count thresholds (±10% from expected), null rates (<5% for key columns), freshness checks (data age < 2x schedule interval), schema validation (column count, names, types match expected). Failures halt the pipeline and trigger an alert.

### Transform Validations
Referential integrity (FKs match PKs), aggregate comparison (totals match between source and target), unique key enforcement (no duplicates in PK columns), distribution drift detection (value distributions compared to baseline). Quality check results are logged to a monitoring table.

## Error Handling

### Retry Strategy
Retryable errors: connection timeout, rate limit, lock wait timeout, network error. Non-retryable: schema mismatch, invalid data, permission denied. Exponential backoff for retries: 5min, 25min, 125min. Max 3 retries for transient errors, 0 for hard errors.

### Dead Letter Queue
Failed records written to a DLQ table with payload, error message, and timestamp. DLQ records are reviewed weekly for reprocessing or schema updates. Backfill script accepts a date range to reprocess DLQ records.

### Alerting
Slack alert on task failure. PagerDuty for consecutive failures >3. Email digest of daily pipeline health. Alert on: task failure, SLA miss, data validation failure, DLQ write, pipeline stall (>30 min without progress).

## Monitoring and Lineage

### Pipeline Health Metrics
DAG success rate (target >99%), average task duration, queue depth, data freshness lag, row count trends. Track in a monitoring dashboard (Datadog, Grafana, or Airflow's built-in metrics).

### Data Lineage
Airflow generates DAG lineage showing task dependencies and data flow. dbt generates model lineage showing transformation dependencies. Combine both for end-to-end lineage from source to dashboard. Store lineage metadata in OpenLineage or DataHub for cross-tool visibility.

## Pipeline Architecture Comparison

| Aspect | Batch ETL | Batch ELT | Micro-batch | CDC Streaming |
|---|---|---|---|---|
| Frequency | Daily/hourly | Daily/hourly | Every 5-15 min | Continuous |
| Latency | 1-24 hours | 1-24 hours | 5-15 min | < 1 second |
| Transform engine | Spark/Python | Warehouse SQL | Spark/Flink | Flink/Kafka Streams |
| Storage | Staging + warehouse | Raw + transformed | Raw + streaming | Kafka + warehouse |
| Complexity | High (transform engine) | Low (SQL only) | Medium | High |
| Cost | Medium (compute + storage) | Low (warehouse only) | Medium | High (streaming infra) |
| Use case | On-prem sources, compliance | Cloud warehouse, agile schema | Near-real-time dashboards | Real-time operations |

## dbt Test Maturity Model

| Level | Model Testing | CI Integration | Coverage |
|---|---|---|---|
| 1: Basic | Generic tests (unique, not_null) | Manual dbt test run | Key columns only |
| 2: Defined | + accepted_values, relationships | CI pipeline step | All columns on marts |
| 3: Managed | + custom generic tests, freshness tests | Blocking CI gate | All models, all columns |
| 4: Measured | + singular tests, data contract tests | CI gate + weekly full audit | Staging + intermediate + marts |
| 5: Optimized | + cross-model assertions, anomaly detection | CI gate + automated alerting | Full lineage, all transforms |

## Common Airflow DAG Patterns

### Sequential Pattern
```
start → extract → validate → load → transform → load_mart → complete
```
Best for: simple pipelines, single-source ingestion, weekly batch jobs.

### Fan-Out Pattern
```
start → extract_all
  ├── validate_orders → load_orders → transform_orders → load_order_mart
  ├── validate_customers → load_customers → transform_customers → load_customer_mart
  └── validate_inventory → load_inventory → transform_inventory → load_inventory_mart
complete
```
Best for: multi-source pipelines, independent domain processing.

### Conditional Branch Pattern
```
start → check_data_availability
  ├── [data available] → extract → validate → load → transform → complete
  └── [no data] → skip_run → complete (notify: no data today)
```
Best for: source systems with unreliable data delivery schedules.

### Join Pattern
```
start → extract_orders ────┐
start → extract_payments ──┤→ join_orders_payments → validate_join → load_mart → complete
                            └── wait_for_both (sensor)
```
Best for: pipelines requiring data from multiple sources before downstream processing.

## Error Handling Topology

```
Source → Extract Task
  ├── Success → Validate Task
  │   ├── Row count OK → Load Staging
  │   │   ├── Success → Transform
  │   │   └── Failure → Alert, halt pipeline
  │   └── Row count FAIL → Halt pipeline (schema/volume issue)
  └── Failure (retryable) → Retry (3x, exponential backoff)
      └── All retries exhausted → DLQ + Alert + Halt

Transform Task
  ├── Success → Validate Transform
  │   ├── Quality checks pass → Load Mart → Complete
  │   └── Quality checks fail → Alert, halt
  └── Failure (non-retryable) → DLQ + Alert + Halt
```

## Pipeline SLA Dashboard Metrics

| Metric | Good | Warning | Critical |
|---|---|---|---|
| DAG success rate (30d) | > 99% | > 95% | < 95% |
| Average task duration | Within baseline | +50% baseline | +100% baseline |
| Data freshness lag | < 1 schedule | > 1 schedule | > 2 schedules |
| DLQ size | < 100 | 100-1000 | > 1000 |
| Validation pass rate | > 99% | > 95% | < 95% |
| Retry rate | < 5% | 5-10% | > 10% |
| SLA miss rate | < 1% | 1-5% | > 5% |

## Additional ETL Tools

### Apache NiFi
NiFi provides a visual, no-code approach to data routing and transformation. Drag-and-drop processor chaining, data provenance tracking, backpressure, and priority queuing. Ideal for ingestion from heterogeneous sources and protocol translation. Deploy as a standalone cluster with ZooKeeper.

### Mage.ai
Mage.ai is a modern open-source ETL tool with Python-native pipeline definition. Pipelines are blocks connected in a DAG with `@transformer` and `@loader` decorators. Auto-generated UI, real-time monitoring, and built-in dbt/Spark/BigQuery integration.

### Kestra
Kestra uses declarative YAML for pipeline definitions with a powerful orchestration engine. Supports batch and event-driven workflows with built-in error handling, retries, and SLA monitoring. Plugin ecosystem covers ETL, dbt, Python, and cloud services.

### Cloud ETL Services
AWS Glue: serverless Spark-based ETL with schema crawler and auto-generated catalog. Azure Data Factory: 90+ built-in connectors with mapping data flows and trigger-based orchestration. GCP Dataflow: fully-managed Apache Beam for batch and streaming with auto-scaling and exactly-once semantics.

## Rules
- ELT over ETL for cloud warehouses
- One DAG per domain, max 20 tasks per DAG
- Every task has retry, timeout, and SLA
- Incremental by default, full refresh exception
- dbt tests on every model, run in CI and pipeline
- Failed records land in DLQ, never silently dropped
- Pipeline halted if source data fails validation
- All transformations idempotent
- Monitor data freshness, not just pipeline success
- Track row count trends for anomaly detection

## References
- `references/etl-elt-patterns.md` — ETL vs ELT, Airflow DAG patterns, incremental strategies, error handling topology, data validation, lineage
- `references/pipeline-monitoring.md` — dbt models, testing, documentation, snapshots, monitoring, alerting, SLAs, pipeline health dashboard
- `references/nifi-mage-patterns.md` — Apache NiFi visual data routing, Mage.ai Python-native pipelines, block-based ETL
- `references/cloud-etl-services.md` — AWS Glue serverless Spark, Azure Data Factory connectors, GCP Dataflow Beam

## Handoff
`data-data-quality` for validation rules and data contract enforcement
`data-data-warehouse` for target schema design and optimization
