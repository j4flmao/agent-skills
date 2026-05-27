# Incremental Loading Strategies

## Why Incremental Loading
Full refreshes become impractical as data volumes grow. Incremental loading processes only new or changed data since the last run, reducing processing time, compute costs, and resource utilization.

## Incremental Loading Patterns

### Timestamp-Based Incremental
The most common pattern uses a timestamp column to identify new/changed records.

```sql
-- Source query with timestamp filter
SELECT *
FROM source_table
WHERE updated_at > (
    SELECT COALESCE(MAX(watermark), '1970-01-01')
    FROM metadata.incremental_watermarks
    WHERE table_name = 'source_table'
);
```

### dbt Incremental Models
```sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge',
    on_schema_change='fail'
) }}

SELECT
    order_id,
    customer_id,
    order_date,
    status,
    total_amount,
    updated_at
FROM {{ source('raw', 'orders') }}

{% if is_incremental() %}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

### Merge Strategies
```sql
-- Snowflake merge
MERGE INTO dim_customer AS target
USING (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY customer_id ORDER BY updated_at DESC
    ) AS rn
    FROM staging_customers
    WHERE updated_at > (
        SELECT COALESCE(MAX(last_processed), '1970-01-01')
        FROM metadata.watermarks WHERE table_name = 'dim_customer'
    )
) AS source ON target.customer_id = source.customer_id AND source.rn = 1

WHEN MATCHED AND target.updated_at < source.updated_at THEN
    UPDATE SET
        full_name = source.full_name,
        email = source.email,
        address = source.address,
        updated_at = source.updated_at

WHEN NOT MATCHED THEN
    INSERT (customer_id, full_name, email, address, created_at, updated_at)
    VALUES (source.customer_id, source.full_name, source.email,
            source.address, source.created_at, source.updated_at);
```

### BigQuery Merge with CDC
```sql
-- BigQuery MERGE with dedup
MERGE INTO `project.dataset.dim_customer` AS target
USING (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY customer_id ORDER BY updated_at DESC
    ) AS rn
    FROM `project.staging.customers`
    WHERE _ts > (
        SELECT last_processed_ts
        FROM `project.metadata.watermarks`
        WHERE table_name = 'dim_customer'
    )
) AS source
ON target.customer_id = source.customer_id AND source.rn = 1

WHEN MATCHED AND target.hash_diff <> source.hash_diff THEN
    UPDATE SET
        full_name = source.full_name,
        email = source.email,
        hash_diff = source.hash_diff,
        updated_at = source.updated_at

WHEN NOT MATCHED THEN
    INSERT (customer_id, full_name, email, hash_diff, updated_at)
    VALUES (source.customer_id, source.full_name, source.email,
            source.hash_diff, source.updated_at);
```

## Handling Deletions

### Soft Delete Pattern
```sql
-- Include soft delete status
SELECT
    customer_id,
    full_name,
    email,
    CASE WHEN is_deleted = 1 THEN 'DELETED' ELSE 'ACTIVE' END AS status,
    updated_at
FROM source_customers
WHERE updated_at > (SELECT MAX(watermark) FROM metadata.watermarks);
```

### Hard Delete Detection
```python
def detect_deletes(source_table, target_table, key_column):
    """Detect records deleted from source since last load."""
    source_keys = set(spark.table(source_table)
                     .select(key_column)
                     .distinct()
                     .toPandas()[key_column])
    target_keys = set(spark.table(target_table)
                     .select(key_column)
                     .distinct()
                     .toPandas()[key_column])
    deleted = target_keys - source_keys
    return deleted
```

## Watermark Management

### Watermark Table Schema
```sql
CREATE TABLE metadata.incremental_watermarks (
    table_name VARCHAR(200) PRIMARY KEY,
    watermark_column VARCHAR(100),
    watermark_value TIMESTAMP,
    row_count INT,
    batch_id VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Updating Watermarks
```python
def update_watermark(table_name, watermark_value, row_count, batch_id):
    query = f"""
        MERGE INTO metadata.incremental_watermarks AS target
        USING (SELECT '{table_name}' AS table_name) AS source
        ON target.table_name = source.table_name
        WHEN MATCHED THEN UPDATE SET
            watermark_value = '{watermark_value}',
            row_count = {row_count},
            batch_id = '{batch_id}',
            updated_at = CURRENT_TIMESTAMP
        WHEN NOT MATCHED THEN INSERT
            (table_name, watermark_column, watermark_value,
             row_count, batch_id, updated_at)
        VALUES ('{table_name}', 'updated_at', '{watermark_value}',
                {row_count}, '{batch_id}', CURRENT_TIMESTAMP)
    """
    spark.sql(query)
```

## Change Data Capture (CDC)

### Debezium Integration
```yaml
# Debezium connector config
{
  "name": "orders-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql.primary",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "secure_password",
    "database.server.name": "orders-db",
    "table.include.list": "orders.orders,orders.order_items",
    "database.history.kafka.bootstrap.servers": "kafka:9092",
    "database.history.kafka.topic": "schema-changes.orders",
    "include.schema.changes": "true",
    "tombstones.on.delete": "false",
    "decimal.handling.mode": "double"
  }
}
```

### CDC Processing
```python
def process_cdc_batch(batch_df):
    """Process CDC events with inserts, updates, and deletes."""
    inserts = batch_df.filter(col("op") == "c")
    updates = batch_df.filter(col("op") == "u")
    deletes = batch_df.filter(col("op") == "d")

    # Process each type
    if inserts.count() > 0:
        inserts.select("after.*").write \
            .mode("append").saveAsTable("target_orders")

    if updates.count() > 0:
        updates.select("after.*").write \
            .mode("append").saveAsTable("target_orders")

    if deletes.count() > 0:
        deletes.select("before.order_id").write \
            .mode("append").saveAsTable("deleted_orders")
```

## Validation and Reconciliation

### Row Count Reconciliation
```python
def reconcile(source_table, target_table, batch_id):
    source_count = spark.table(source_table).count()
    target_count = spark.table(target_table).count()

    reconciliation_record = {
        "batch_id": batch_id,
        "source_table": source_table,
        "target_table": target_table,
        "source_row_count": source_count,
        "target_row_count": target_count,
        "difference": abs(source_count - target_count),
        "reconciled_at": datetime.now()
    }

    if reconciliation_record["difference"] > 0:
        log_warning(f"Row count mismatch: {reconciliation_record}")

    spark.createDataFrame([reconciliation_record]) \
        .write.mode("append").saveAsTable("metadata.reconciliation_log")

    return reconciliation_record
```

## Key Points
- Use incremental loading whenever full refreshes are impractical due to data volume
- Choose the right strategy: timestamp-based, CDC-based, or batch comparison
- Implement proper watermark management for idempotent incremental runs
- Handle record updates, inserts, and deletes explicitly
- Use MERGE/UPSERT patterns for upserting into target tables
- Validate row counts and data quality after each incremental load
- Monitor incremental load performance and lag
- Design for idempotency: re-running the same batch should produce the same result
- Use hash comparison for detecting actual data changes vs timestamp changes
- Plan for schema evolution handling in incremental pipelines
