# Schema Evolution Reference

## Avro Schema Compatibility

Avro is the standard for data serialization in Kafka and streaming systems. Schema compatibility modes determine which schema changes are allowed.

### Compatibility Modes

| Mode | Reader Schema | Writer Schema | Description |
|------|--------------|--------------|-------------|
| BACKWARD | New | Old | New schema can read data written with old schema |
| FORWARD | Old | New | Old schema can read data written with new schema |
| FULL | Both | Both | Both backward and forward compatible |
| NONE | Any | Any | No compatibility checks (dev only) |

### BACKWARD Compatibility

New reader schema must be able to read old writer schema data.

```json
// Writer schema (old)
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "amount", "type": "double"}
  ]
}

// Reader schema (new) — BACKWARD compatible
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "discount", "type": ["null", "double"], "default": null}
    // Added field with default → reader handles old data
  ]
}
```

### FORWARD Compatibility

Old reader schema must be able to read new writer schema data.

```json
// Writer schema (new) — FORWARD compatible
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"}
    // "amount" removed
  ]
}

// Reader schema (old)
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "amount", "type": "double", "default": 0.0}
    // Default value allows missing field
  ]
}
```

### FULL Compatibility

Both new and old schemas can read each other's data.

```json
// Writer schema — FULL compatible with reader
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "discount", "type": ["null", "double"], "default": null}
    // Only adds fields with defaults
  ]
}

// Reader schema
{
  "type": "record",
  "name": "OrderEvent",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "amount", "type": "double"}
    // "discount" will be ignored (has default in writer)
  ]
}
```

### Breaking Schema Changes

```yaml
breaking_changes:
  - "Removing a field without default from writer"
  - "Adding a field without default to reader (BACKWARD)"
  - "Removing a field without default from reader (FORWARD)"
  - "Changing type incompatibly (int->string, double->int)"
  - "Renaming a field"
  - "Changing field order"
  - "Narrowing type (long->int) without alias"

safe_changes:
  - "Adding a field with default to reader (BACKWARD)"
  - "Removing a field with default from writer (BACKWARD)"
  - "Adding a field with default to writer (FORWARD)"
  - "Removing a field with default from reader (FORWARD)"
  - "Widening type (int->long, float->double)"
  - "Adding doc/aliases"
```

### Schema Registry Usage

```python
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer

# Configure schema registry
config = {
    'url': 'http://schema-registry:8081',
    'basic.auth.user.info': 'key:secret'
}
client = SchemaRegistryClient(config)

# Register schema with BACKWARD compatibility
subject = 'orders-value'
schema_str = json.dumps({
    "type": "record",
    "name": "OrderEvent",
    "fields": [
        {"name": "order_id", "type": "string"},
        {"name": "amount", "type": "double"},
        {"name": "customer_id", "type": ["null", "string"], "default": None}
    ]
})

# Check compatibility before registering
is_compatible = client.test_compatibility(
    subject_name=subject,
    schema=avro_schema
)
if is_compatible:
    schema_id = client.register_schema(subject, avro_schema)
else:
    raise SchemaIncompatibleError("Schema change is not backward compatible")
```

## Parquet Schema Merge

Parquet supports schema merging when reading multiple files with different schemas.

### Merge Schema Rules

```sql
-- Spark: Enable schema merging
spark.conf.set("spark.sql.parquet.mergeSchema", "true")

-- When reading a directory of Parquet files with different schemas:
-- File 1: id INT, name STRING, amount DOUBLE
-- File 2: id INT, name STRING, email STRING, amount DOUBLE
-- File 3: id INT, name STRING, amount DOUBLE, discount DOUBLE

-- Resulting merged schema:
-- id INT, name STRING, amount DOUBLE, email STRING, discount DOUBLE
-- Missing columns = NULL

-- Write with merge schema
df.write
    .mode("append")
    .option("mergeSchema", "true")
    .parquet("s3://data-lake/orders/")
```

### Parquet Schema Evolution Rules

| Change | Supported | Behavior |
|--------|-----------|----------|
| Add nullable column | Yes | Existing files return NULL |
| Add required column | No | Breaks read of old files |
| Remove column | No | New files won't have it; old files still readable |
| Rename column | No | Schema treats as separate column |
| Widen type (int→long) | Yes | Upcast promoted |
| Narrow type (long→int) | No | May lose data |
| Reorder columns | Yes | Column metadata handles mapping |

```python
# PyArrow: Schema evolution with union_by_name
import pyarrow.parquet as pq

# Read multiple Parquet files, unioning by column name
table = pq.read_table(
    "s3://data-lake/orders/",
    use_legacy_dataset=False,
    schema=None,  # Auto-detect and merge
    filters=[("order_date", ">=", "2026-01-01")]
)
```

## Iceberg Schema Evolution

Apache Iceberg provides robust schema evolution capabilities through its table format.

### Iceberg Schema Changes

```sql
-- Add a column
ALTER TABLE analytics.orders ADD COLUMN discount DECIMAL(5,2);

-- Add a column with default
ALTER TABLE analytics.orders ADD COLUMN source_system STRING DEFAULT 'web';

-- Drop a column (works without rewriting data)
ALTER TABLE analytics.orders DROP COLUMN legacy_field;

-- Rename a column
ALTER TABLE analytics.orders RENAME COLUMN cust_id TO customer_id;

-- Update column type (widening only)
ALTER TABLE analytics.orders ALTER COLUMN amount TYPE DECIMAL(12,2);

-- Reorder columns
ALTER TABLE analytics.orders ALTER COLUMN order_id FIRST;
```

### Iceberg Schema Evolution Rules

| Change | Iceberg | Parquet (mergeSchema) |
|--------|---------|----------------------|
| Add column | ✅ Easy, no rewrite | ✅ Requires mergeSchema |
| Drop column | ✅ No rewrite | ❌ Avoid |
| Rename column | ✅ No rewrite | ❌ |
| Widen type | ✅ | ✅ |
| Reorder columns | ✅ No effect | ✅ |
| Add nested field | ✅ | ✅ |
| Remove required | ✅ (allow null) | ❌ |
| Evolution history | ✅ Versioned | ❌ Not tracked |

### Iceberg Schema History

```sql
-- View schema history
SELECT *
FROM analytics.orders.history;

-- Time travel to previous schema
SELECT * FROM analytics.orders
  FOR SYSTEM_VERSION AS OF 2;

-- Diff schemas
SELECT *
FROM analytics.orders.changes
WHERE version IN (1, 2);
```

## Rules
- Use Avro for Kafka/streaming with BACKWARD compatibility mode
- Always add new fields with defaults in Avro schemas
- Never remove fields from Avro schemas without deprecation period
- Enable Parquet mergeSchema for data lakes with evolving schemas
- Prefer Iceberg or Delta Lake for robust schema evolution
- Test schema changes against production data before deployment
- Widening types (int→long, float→double) is safe; narrowing is not
- Schema Registry is mandatory for all production Avro topics
- Document every schema change with date, author, and rationale
- Version all schema definitions and store them in version control
