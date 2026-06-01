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
- Data volume and growth rate
- SLAs for data freshness and availability
- Existing monitoring and alerting infrastructure

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
- [ ] Data lineage tracking set up

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

## Airflow DAG Design

### DAG Structure
One DAG per data domain. Structure: `start → extract → validate_extract → load_staging → validate_staging → transform → validate_transform → load_mart → complete`. Task dependencies use the bitshift operator: `extract >> validate_extract >> load_staging`.

#### DAG Template

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator

default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'email_on_failure': True,
    'email': ['pager@company.com'],
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,
    'max_retry_delay': timedelta(hours=1),
    'execution_timeout': timedelta(hours=2),
    'sla': timedelta(minutes=30),
}

with DAG(
    'etl_orders_daily',
    default_args=default_args,
    description='Daily orders ETL from PostgreSQL to warehouse',
    schedule='0 3 * * *',  # Daily 3 AM
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=['etl', 'orders', 'daily'],
) as dag:
    start = DummyOperator(task_id='start')
    extract = PythonOperator(task_id='extract_orders', ...)
    complete = DummyOperator(task_id='complete')

    start >> extract >> complete
```

### Task Parameters

| Parameter | Value | Rationale |
|---|---|---|
| retries | 3 | Handle transient failures |
| retry_delay | 5 min | Immediate retry after brief outages |
| retry_exponential_backoff | true | Avoid thundering herd on recovery |
| max_retry_delay | 1 hour | Cap to prevent runaway scheduling |
| execution_timeout | 2x expected runtime | Prevent stuck tasks |
| sla | 30 min from schedule | Alert on delays |
| pool | domain_pool | Resource management |

### Scheduling Patterns
Daily: `0 3 * * *` (off-peak hours). Hourly: `0 * * * *`. Weekly: `0 4 * * 1` (Mondays 4am). Event-driven: use `TriggerDagRunOperator` from another DAG. Data-aware scheduling: use Airflow 2.4+ datasets as dependencies between DAGs. Sensor pattern: `ExternalTaskSensor` or `SqlSensor` to wait for upstream completion.

## dbt Transformation Patterns

### Model Organization

```
models/
  staging/
    stg_orders.sql        # Source-close, minimal transforms
    stg_customers.sql
    stg_payments.sql
  intermediate/
    int_order_details.sql # Business logic, joins
    int_customer_metrics.sql
  marts/
    fct_orders.sql        # Aggregated, consumption-ready
    dim_customers.sql
    dim_products.sql
```

#### Staging Model Pattern

```sql
-- models/staging/stg_orders.sql
WITH source AS (
    SELECT * FROM {{ source('postgres', 'orders') }}
),
renamed AS (
    SELECT
        id AS order_id,
        customer_id,
        order_date,
        status,
        total_amount,
        created_at,
        updated_at
    FROM source
    WHERE _deleted = false  -- Exclude soft-deleted records
)
SELECT * FROM renamed
```

#### Intermediate Model Pattern

```sql
-- models/intermediate/int_order_details.sql
WITH orders AS (
    SELECT * FROM {{ ref('stg_orders') }}
),
payments AS (
    SELECT * FROM {{ ref('stg_payments') }}
)
SELECT
    o.order_id,
    o.customer_id,
    o.order_date,
    o.status,
    o.total_amount,
    COALESCE(p.total_paid, 0) AS total_paid,
    o.total_amount - COALESCE(p.total_paid, 0) AS balance_due,
    CASE
        WHEN o.status = 'delivered' AND p.total_paid >= o.total_amount THEN 'paid'
        WHEN o.status = 'delivered' THEN 'payment_pending'
        WHEN o.status = 'cancelled' THEN 'cancelled'
        ELSE 'active'
    END AS order_health
FROM orders o
LEFT JOIN payments p ON o.order_id = p.order_id
```

### Testing

#### Generic Tests

```yaml
# schema.yml
version: 2
models:
  - name: stg_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('stg_customers')
              field: customer_id
      - name: status
        tests:
          - accepted_values:
              values: ['draft', 'submitted', 'confirmed', 'shipped', 'delivered', 'cancelled']
      - name: total_amount
        tests:
          - dbt_utils.expression_is_true:
              expression: '>= 0'
```

#### Test Maturity Model

| Level | Model Testing | CI Integration | Coverage |
|---|---|---|---|
| 1: Basic | Generic tests (unique, not_null) | Manual dbt test run | Key columns only |
| 2: Defined | + accepted_values, relationships | CI pipeline step | All columns on marts |
| 3: Managed | + custom generic tests, freshness tests | Blocking CI gate | All models, all columns |
| 4: Measured | + singular tests, data contract tests | CI gate + weekly full audit | Staging + intermediate + marts |
| 5: Optimized | + cross-model assertions, anomaly detection | CI gate + automated alerting | Full lineage, all transforms |

### Documentation

```yaml
# schema.yml — model and column descriptions
version: 2
models:
  - name: fct_orders
    description: >
      Order fact table containing one row per completed order.
      Used for revenue reporting, sales analysis, and forecasting.
    columns:
      - name: order_id
        description: "Unique identifier for each order from source system"
        tests: [unique, not_null]
      - name: total_amount
        description: "Total order amount including tax and shipping, in USD"
```

### Snapshots
SCD Type 2 snapshots track historical changes to dimension tables. Strategy: `timestamp` (based on `updated_at` column) or `check` (based on column value changes). Query current records with `WHERE dbt_valid_to IS NULL`.

```sql
-- snapshots/customers.sql
{% snapshot customers_snapshot %}
{{
    config(
        target_schema='snapshots',
        unique_key='customer_id',
        strategy='timestamp',
        updated_at='updated_at',
        invalidate_hard_deletes=True
    )
}}
SELECT * FROM {{ source('postgres', 'customers') }}
{% endsnapshot %}
```

## Batch vs Incremental Processing

### Batch Processing
Process all data from the source in each run. Simple to implement and debug. Best for: small datasets, reference data, initial loads, nightly reporting. Full refresh is the default materialization for small dimension tables.

### Incremental Processing
Process only new or changed data since the last run. Complex to implement but efficient for large datasets. Best for: large fact tables, event data, append-only logs, daily/hourly loading.

```sql
{{ config(materialized='incremental', unique_key='order_id') }}

SELECT * FROM {{ source('postgres', 'orders') }}
{% if is_incremental() %}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

#### Incremental Strategies

| Strategy | Method | When to Use |
|---|---|---|
| Timestamp | `WHERE updated_at > max(updated_at)` | Append-only or update-tracked tables |
| Batch ID | `WHERE batch_id > max(batch_id)` | Batch-oriented ingestion |
| Full refresh | Truncate and reload | Small tables, dimension tables |
| Merge/Upsert | `unique_key` + merge logic | CDC, upsert-heavy streams |
| Insert+Delete | Insert new, delete removed | Replace all records per partition |
| Micro-batch | 5-15 min intervals | Near-real-time with batch tooling |

## S3 Staging

### Staging Area Design
Raw data lands in S3 (or equivalent cloud storage) partitioned by source, date, and load timestamp. Structure: `s3://data-lake/landing/<source>/<date>/<load_id>/`. Data is in columnar format (Parquet) for efficient querying. Glue Crawler or equivalent registers partitions in the metastore. Staging tables in the warehouse point to the S3 location.

```yaml
staging_area:
  raw: s3://data-lake/raw/salesforce/
  structure: "{source}/{object}/{year}/{month}/{day}/{load_id}/"
  format: parquet
  compression: zstd
  retention: 30 days raw, 7 days staging
  validation:
    - row_count_match
    - schema_compatibility
    - checksum_verification
```

## Data Validation

### Stage Validations

| Check | Threshold | Action |
|---|---|---|
| Row count delta | ±10% from expected | Halt, alert |
| Null rate | <5% for key columns | Halt, alert |
| Freshness | < 2x schedule interval | Halt, alert |
| Schema validation | Column count, names, types match | Halt, alert |
| Row-level checksum | Match source checksum | Halt, alert |
| Duplicate keys | 0 duplicates | Halt, alert |

### Transform Validations
Referential integrity: FK columns match PK values in referenced tables. Aggregate comparison: totals match between source and target (SUM, COUNT). Unique key enforcement: no duplicates in PK columns. Distribution drift: value distributions compared to baseline (Kolmogorov-Smirnov test for numerical fields).

```python
# Custom validation hook
def validate_row_count(df, expected_min=1000, expected_max=None):
    count = df.count()
    if count < expected_min:
        raise ValueError(f"Row count {count} below minimum {expected_min}")
    if expected_max and count > expected_max:
        raise ValueError(f"Row count {count} exceeds maximum {expected_max}")
    return True
```

## Error Handling

### Retry Strategy

| Error Type | Retryable | Max Retries | Backoff | Fallback |
|---|---|---|---|---|
| Connection timeout | Yes | 3 | 5min, 25min, 125min | DLQ |
| Rate limit | Yes | 5 | 1min, 2min, 4min, 8min, 16min | DLQ |
| Lock wait timeout | Yes | 3 | 1min, 5min, 15min | DLQ |
| Schema mismatch | No | 0 | - | Halt + Alert |
| Invalid data | No | 0 | - | DLQ |
| Permission denied | No | 0 | - | Halt + Alert |

### Dead Letter Queue

```sql
-- DLQ table structure
CREATE TABLE pipeline_dlq (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dag_id VARCHAR(100) NOT NULL,
    task_id VARCHAR(100) NOT NULL,
    execution_date TIMESTAMPTZ NOT NULL,
    source_table VARCHAR(200),
    record_id VARCHAR(200),
    payload JSONB,
    error_message TEXT,
    error_type VARCHAR(100),
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolution VARCHAR(500)
);

-- Backfill query
INSERT INTO staging_orders (
    SELECT * FROM pipeline_dlq
    WHERE dag_id = 'etl_orders_daily'
    AND resolved_at IS NULL
    AND error_type = 'invalid_data_format'
);
```

### Alerting

| Event | Channel | Priority | Runbook |
|---|---|---|---|
| Task failure | Slack #data-pipelines | Medium | Check task logs, review code |
| 3 consecutive failures | PagerDuty | High | Investigate immediately |
| SLA miss | Slack @data-eng | High | Prioritize next business day |
| Validation failure | Slack #data-quality | Medium | Review data, update rules |
| DLQ write | Slack #data-pipelines | Low | Weekly review meeting |

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

## Orchestration Comparison

| Platform | Language | Scheduler | Best For |
|---|---|---|---|
| Apache Airflow | Python | Centralized/polling | Enterprise, complex DAGs, large ecosystem |
| Dagster | Python | Event-driven, asset-focused | Data platform teams, asset lineage |
| Prefect | Python | Cloud or self-hosted | Teams wanting Python-native, modern UX |
| Kestra | YAML | Event-driven | YAML-first teams, declarative pipelines |
| AWS Step Functions | JSON/ASL | Event-driven | AWS-native serverless pipelines |
| Azure Data Factory | JSON/UI | Cloud-native | Azure shops, no-code ETL |

## Additional ETL Tools

### Apache NiFi
NiFi provides a visual, no-code approach to data routing and transformation. Drag-and-drop processor chaining, data provenance tracking, backpressure, and priority queuing. Ideal for ingestion from heterogeneous sources and protocol translation. Deploy as a standalone cluster with ZooKeeper.

### Mage.ai
Mage.ai is a modern open-source ETL tool with Python-native pipeline definition. Pipelines are blocks connected in a DAG with `@transformer` and `@loader` decorators. Auto-generated UI, real-time monitoring, and built-in dbt/Spark/BigQuery integration.

### Kestra
Kestra uses declarative YAML for pipeline definitions with a powerful orchestration engine. Supports batch and event-driven workflows with built-in error handling, retries, and SLA monitoring. Plugin ecosystem covers ETL, dbt, Python, and cloud services.

### Cloud ETL Services
AWS Glue: serverless Spark-based ETL with schema crawler and auto-generated catalog. Azure Data Factory: 90+ built-in connectors with mapping data flows and trigger-based orchestration. GCP Dataflow: fully-managed Apache Beam for batch and streaming with auto-scaling and exactly-once semantics.

## Pipeline CI/CD

### Testing Pipeline
```yaml
# .github/workflows/dbt-ci.yml
jobs:
  dbt-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dbt-labs/dbt-action@v1
        with:
          dbt_command: dbt build --select state:modified+ --target ci
      - uses: dbt-labs/dbt-action@v1
        with:
          dbt_command: dbt docs generate
```

### Deployment Pipeline
```yaml
# Deploy steps:
# 1. PR merged to main → trigger staging deployment
# 2. Build and test in staging environment
# 3. Run dbt run --full-refresh on staging (weekly)
# 4. Smoke tests pass (row counts, freshness)
# 5. Promote to production: dbt run --target prod
# 6. Run dbt test --target prod (post-deployment validation)
# 7. Rollback: dbt run --select fct_orders --vars '{"prev_version": true}'
```

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
- dbt artifacts archived for lineage tracking
- Backfills are run as separate DAG runs with catchup
- Pipeline code reviewed and tested before production deploy
- Every pipeline has a documented owner and on-call rotation

## References
  - references/cloud-etl-services.md — Cloud ETL Services
  - references/data-pipeline-cicd.md — Data Pipeline CI/CD
  - references/etl-elt-patterns.md — ETL/ELT Patterns
  - references/etl-pipeline-design.md — ETL Pipeline Design
  - references/nifi-mage-patterns.md — Apache NiFi and Mage.ai ETL Patterns
  - references/pipeline-monitoring.md — Pipeline Monitoring
## Handoff
`data-data-quality` for validation rules and data contract enforcement
`data-data-warehouse` for target schema design and optimization
