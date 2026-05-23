# ETL Integration Patterns

## ETL vs ELT

| Aspect | ETL (Extract-Transform-Load) | ELT (Extract-Load-Transform) |
|--------|------------------------------|------------------------------|
| Transform location | Staging/transform server | Target data warehouse |
| Data volume | Small to medium | Large |
| Processing engine | Dedicated ETL tool | Warehouse compute (Snowflake, BigQuery) |
| Schema-on-write | Yes | Yes (raw) then no (transformed) |
| Latency | Higher (transform before load) | Lower (load raw, transform on read) |
| Use case | Compliance, data quality | Analytics, large-scale |

## Batch ETL Pipeline

### Architecture
```
Source ──→ Extract ──→ Staging ──→ Transform ──→ Load ──→ Target
           │            │            │             │        │
           ▼            ▼            ▼             ▼        ▼
      Connectors    Raw files    SQL/Python    Optimized   DW/Datalake
```

### Implementation
```python
def etl_pipeline(source_config, target_config):
    # Extract
    raw_data = extract_from_source(source_config)
    save_to_staging(raw_data, f"staging/{source_config['name']}/{date}")
    
    # Transform
    transformed = transform(raw_data)
    validate_quality(transformed)
    
    # Load
    load_to_target(transformed, target_config)
```

## Streaming Integration (CDC)

### Change Data Capture
```yaml
source:
  type: "postgres"
  plugin: "pgoutput"  # native PostgreSQL replication
  
  tables:
    - "public.orders"
    - "public.customers"
  
  publication: "cdc_pub"
  slot: "integration_slot"

sink:
  type: "kafka"  # Debezium → Kafka
  topic_prefix: "cdc."
  format: "avro"  # schema registry
```

### CDC Events
```json
{
  "op": "c",        // c=create, u=update, d=delete, r=read
  "ts_ms": 1742034000000,
  "before": null,
  "after": {
    "id": 12345,
    "customer_id": 789,
    "status": "shipped",
    "updated_at": "2026-03-15T10:00:00Z"
  },
  "source": {
    "table": "orders",
    "lsn": 98765432
  }
}
```

## ETL Tool Comparison

| Tool | Type | Language | Scale | Scheduling | Cost |
|------|------|----------|-------|------------|------|
| Airbyte | Open-source | Python | Medium | Built-in | Free/Cloud |
| Fivetran | Managed | N/A | High | Built-in | $$$ |
| dbt | Transform only | SQL | High | Orchestrator | Free/Cloud |
| Airflow | Orchestration | Python | High | Built-in | Free |
| Spark | Processing | Python/Scala | Very High | External | Free |
| Informatica | Enterprise | Low-code | High | Built-in | $$$$ |

## Data Quality in ETL

### Validation Checks
```python
def validate_row(row, rules):
    errors = []
    for rule in rules:
        if rule["type"] == "not_null":
            if row[rule["column"]] is None:
                errors.append(f"{rule['column']} is null")
        elif rule["type"] == "unique":
            # Check against previously seen values
            pass
        elif rule["type"] == "range":
            if not (rule["min"] <= row[rule["column"]] <= rule["max"]):
                errors.append(f"{rule['column']} out of range")
        elif rule["type"] == "referential":
            # Check foreign key exists
            pass
    return errors
```

### Error Handling
```
Reject row: Log error, send to dead letter queue
Retry: Exponential backoff for transient failures
Alert: Notify on >1% error rate
Abort: Stop pipeline on schema mismatch
```

## Orchestration

### Airflow DAG Example
```python
from airflow import DAG
from airflow.operators.python import PythonOperator

with DAG("etl_orders", schedule="0 2 * * *") as dag:
    extract = PythonOperator(task_id="extract", python_callable=extract)
    validate = PythonOperator(task_id="validate", python_callable=validate)
    transform = PythonOperator(task_id="transform", python_callable=transform)
    load = PythonOperator(task_id="load", python_callable=load)
    notify = PythonOperator(task_id="notify", python_callable=notify)

    extract >> validate >> transform >> load >> notify
```

## SLA Targets

| Stage | Duration Target | Check |
|-------|----------------|-------|
| Extract | <30 min | Full success |
| Validate | <5 min | Data quality >99% |
| Transform | <60 min | Row count match |
| Load | <15 min | Constraints pass |
| Total | <2 hours | End-to-end verification |
