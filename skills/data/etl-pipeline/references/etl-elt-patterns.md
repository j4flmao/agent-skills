# ETL/ELT Patterns

## Pipeline Architecture

### ELT Flow (Recommended)
```
Source → Extract (Airbyte/Fivetran) → Staging (S3/raw tables) → Transform (dbt) → Mart (aggregated tables)
```
Extract: source connectors pull data from databases, APIs, or file systems. Load: raw data lands in staging tables with minimal transformation (column renaming, type casting). Transform: dbt models run in the warehouse to clean, join, and aggregate data. Mart: final tables optimized for dashboard and analytics consumption.

### ETL Flow (Legacy/Specific Cases)
```
Source → Extract → Transform (Spark/Python) → Load (warehouse tables)
```
Extract: pull data from source. Transform: process data in an external compute engine (Spark, Python, EMR). Load: write transformed data to warehouse tables. Used when transformations require ML models, complex algorithms, or data masking before storage.

## Airflow DAG Patterns

### DAG Structure Template
```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.dummy import DummyOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email_on_failure': True,
    'email': ['data-alerts@example.com'],
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
}

with DAG(
    'orders_pipeline',
    default_args=default_args,
    schedule='0 3 * * *',  # daily at 3am
    catchup=False,
    max_active_runs=1,
    sla_miss_callback=slack_sla_miss,
    tags=['orders', 'production'],
) as dag:
    start = DummyOperator(task_id='start')
    extract_orders = PythonOperator(
        task_id='extract_orders',
        python_callable=extract_from_source,
        provide_context=True,
    )
    validate_extract = PythonOperator(
        task_id='validate_extract',
        python_callable=validate_row_count,
    )
    load_staging = PythonOperator(
        task_id='load_staging',
        python_callable=load_to_s3,
    )
    start >> extract_orders >> validate_extract >> load_staging
```

### Task Organization
- One DAG per domain (orders, inventory, customers)
- Max 20 tasks per DAG for readability and manageability
- Group related tasks with `TaskGroup` for visual organization in the Airflow UI
- Use `SubDagOperator` sparingly (creates performance issues with backfills)
- Prefix task IDs with the stage: `extract_`, `validate_`, `load_`, `transform_`

### Airflow Pools and Concurrency
```python
# Limit concurrent extraction tasks across all DAGs
extract_pool = Pool(
    name='extract_pool',
    slots=4,  # Max 4 concurrent extractions
    description='Pool for extraction tasks'
)

# Use pool in task
PythonOperator(
    task_id='extract_orders',
    python_callable=extract_orders,
    pool='extract_pool',
    priority_weight=10,
)
```

## Incremental Loading Strategies

### Timestamp-Based (High Watermark)
```sql
-- High watermark query
SELECT MAX(modified_at) FROM staging.orders;

-- Incremental extract
SELECT * FROM source.orders
WHERE modified_at > :last_loaded_at;
```
Store watermark: Airflow Variable, control table, or XCom. Reset: set watermark to epoch for full refresh. Best for: append-only event data, tables with `modified_at` timestamps.

### Batch ID
```sql
SELECT * FROM source.orders
WHERE batch_id > :last_batch_id
ORDER BY batch_id;
```
Requires sequential batch IDs (auto-increment or timestamp). Best for: tables with sequential batch identifiers.

### CDC (Change Data Capture)
Debezium + Kafka: capture insert/update/delete events. Process in real-time via Kafka Streams or batch via nightly merge. Handles: schema changes (Debezium evolves with DB), large transactions (chunked), DDL events (separate topic). Best for: tables requiring real-time sync with source.

### Full Refresh
Monthly for reference data. Weekly for slowly changing dimensions. Trigger: `catchup=True` or manual backfill `airflow dags backfill -s 2026-01-01 -e 2026-01-31 orders_pipeline`. Best for: small dimension tables, reference data, initial load.

## Error Handling

### Error Classification
**Retryable**: connection timeout (DB connection lost, network timeout), rate limit (API throttling, warehouse overload), lock wait timeout (concurrent writes), disk full (staging area exhausted), network error (transient connectivity).  
**Non-retryable**: schema mismatch (column added/removed/renamed in source), invalid data format (null in non-null column, wrong data type), permission denied (credentials expired, access revoked), data integrity violation (duplicate primary keys, orphaned foreign keys).

### Retry Strategy
```python
retry_delay = timedelta(minutes=5 * (2 ** retry_count))
```
Exponential backoff: 5min, 25min, 125min. Max retries: 3 for transient, 0 for hard errors. Timeout: 2x expected runtime (max 6 hours).

### Dead Letter Queue
```sql
CREATE TABLE dlq.orders_errors (
    payload JSON,
    error_message TEXT,
    error_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_task VARCHAR(255),
    source_table VARCHAR(255),
    retry_count INT DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE
);
```
Failed records: store in DLQ table with full payload, error message, and timestamp. Alert: Slack notification on DLQ write. Recovery: reprocess via backfill script with date range.

### Pipeline Halt
Stop downstream tasks on critical failure. Manual resume after root cause fix. Backfill command: `airflow dags backfill -s 2026-05-01 -e 2026-05-22 orders_pipeline`.

## Data Validation

### Stage Validation Checks
- **Row count**: actual vs expected (within ±10% tolerance)
- **Null rate**: key columns must be <5% null
- **Freshness**: max age of data must be < 2x schedule interval
- **Schema**: column count, names, types match expected

### Transform Validation
- **Referential integrity**: every foreign key has matching primary key
- **Aggregate comparison**: totals match between source and target
- **Unique keys**: no duplicates in primary key columns
- **Distribution drift**: measure value distributions vs baseline

## Data Lineage

### Airflow Lineage
Airflow generates DAG lineage automatically. Each task's inputs and outputs are tracked. Use `outlets` and `inlets` on operators to specify data dependencies. Airflow 2.4+ supports dataset-based scheduling where DAGs are triggered when upstream datasets are updated.

### dbt Lineage
dbt generates model lineage showing dependencies between models. `dbt docs generate` produces a DAG of all model relationships. The lineage view shows upstream (sources and parent models) and downstream (child models and exposures) for each model.

### End-to-End Lineage
Combine Airflow and dbt lineage for complete data flow visibility. Tools like DataHub, Amundsen, or OpenLineage capture lineage from both systems and present a unified view showing: source → Airflow task → staging table → dbt model → mart table → dashboard.
