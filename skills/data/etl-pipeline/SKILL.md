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

## Workflow

### Step 1: Pipeline Architecture
Extract → Load → Transform (ELT) preferred for cloud warehouses. Extract: source connectors (Airbyte, Fivetran, custom Python). Load: raw data into staging tables (landing zone). Transform: dbt models for cleaning, joining, aggregating. Orchestration: Airflow DAG schedules and monitors. Architecture: source → staging (raw) → integration (cleaned) → mart (aggregated).

### Step 2: Airflow DAG Design
One DAG per data domain. Structure: `start → extract → validate_extract → load_staging → validate_staging → transform → validate_transform → load_mart → complete`. Task dependencies: `extract >> validate_extract >> load_staging`. Retry: 3 retries with exponential backoff (5min, 25min, 125min). Timeout: 2x expected runtime. SLA: 30min miss → alert.

### Step 3: Incremental Loading
Strategy: timestamp-based (modified_at > last_run) for most sources. High-watermark: store `last_loaded_at` in Airflow Variable or control table. CDC: Debezium + Kafka for real-time changes, merge overnight. Full refresh: weekly for reference data, monthly for audit. Implement: dbt `is_incremental()` macro — insert new rows, update changed rows.

### Step 4: dbt Transformation
Models: staging (source-close, minimal changes), intermediate (business logic, joins), marts (aggregated, consumption-ready). Testing: not null, unique, accepted values, referential integrity, custom tests. Documentation: `dbt docs generate` — model descriptions, column descriptions, lineage. Materialization: incremental for facts, table for aggregates, view for simple transforms.

### Step 5: Error Handling
Retryable errors: connection timeout, rate limit, lock wait timeout. Non-retryable: schema mismatch, invalid data, permission denied. DLQ: failed records written to error table with payload, error message, timestamp. Notification: Slack alert on task failure, PagerDuty for consecutive failures >3. Manual recovery: backfill script with date range parameter.

### Step 6: Data Validation
Stage validations: row count threshold (±10% from expected), null rate (<5% for key columns), freshness (data age < 2x schedule). Transform validations: referential integrity preserved, aggregate totals match source, unique keys maintained. Pipeline health: DAG success rate, average duration, queue depth.

## Rules
- ELT over ETL for cloud warehouses
- One DAG per domain, max 20 tasks per DAG
- Every task has retry, timeout, and SLA
- Incremental by default, full refresh exception
- dbt tests on every model, run in CI and pipeline
- Failed records land in DLQ, never silently dropped
- Pipeline halted if source data fails validation
- All transformations idempotent

## References
- `references/pipeline-architecture.md` — Airflow DAG patterns, incremental strategies, error handling topology
- `references/transformation.md` — dbt models, testing, documentation, snapshots, incremental strategies

## Handoff
`data-data-quality` for validation rules and data contract enforcement
`data-data-warehouse` for target schema design and optimization
