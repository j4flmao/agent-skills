# Pipeline Architecture

## Airflow DAG Patterns

### DAG Structure
```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email_on_failure': True,
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
- Max 20 tasks per DAG for readability
- Group related tasks with `TaskGroup`
- Use `SubDagOperator` sparingly (performance issues)

### Scheduling Patterns
- Daily: `0 3 * * *` (off-peak hours)
- Hourly: `0 * * * *`
- Weekly: `0 4 * * 1` (Mondays 4am)
- Event-driven: use `TriggerDagRunOperator` from another DAG
- Data-aware: use datasets as dependencies

### Monitoring Tasks
```python
sla_miss_callback = slack_notifier
task_failure_callback = pagerduty_notifier
```

## Incremental Loading Strategies

### Timestamp-Based
```sql
-- High watermark query
SELECT MAX(modified_at) FROM staging.orders;

-- Incremental extract
SELECT * FROM source.orders
WHERE modified_at > :last_loaded_at;
```
Store watermark: Airflow Variable, control table, or XCom. Reset: set watermark to epoch for full refresh.

### Batch ID
```sql
SELECT * FROM source.orders
WHERE batch_id > :last_batch_id
ORDER BY batch_id;
```
Requires sequential batch IDs (auto-increment or timestamp).

### CDC (Change Data Capture)
Debezium + Kafka: capture insert/update/delete events. Process in real-time or batch. Merge overnight to warehouse. Handles: schema changes (Debezium evolves), large transactions (chunked).

### Full Refresh
Monthly for reference data. Weekly for slowly changing dimensions. Trigger: `catchup=True` or manual backfill.

## Error Handling

### Error Classification
Retryable: connection timeout, rate limit, lock wait, disk full, network error. Non-retryable: schema mismatch, invalid data format, permission denied, data integrity violation.

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
    source_task VARCHAR(255)
);
```
Failed records: store in DLQ table with full payload, error message, timestamp. Alert: Slack notification on DLQ write. Recovery: reprocess via backfill script.

### Pipeline Halt
Stop downstream tasks on critical failure. Manual resume after root cause fix. Backfill: `airflow dags backfill -s 2026-05-01 -e 2026-05-22 orders_pipeline`.

## Data Validation

### Stage Validation Checks
- Row count: actual vs expected (within ±10%)
- Null rate: key columns must be <5% null
- Freshness: max age of data by schedule
- Schema: column count, names, types match expected

### Transform Validation
- Referential integrity: every FK has matching PK
- Aggregate comparison: totals match between source and target
- Unique keys: no duplicates in PK columns
- Distribution drift: measure value distributions vs baseline
