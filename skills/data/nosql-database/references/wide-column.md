# Wide-Column Database Reference

## Cassandra Data Modeling

### Query-First Design

Every table is designed around a specific query pattern. Define access patterns first, then model tables.

```cql
-- Access pattern: Get orders by customer for a given month
CREATE TABLE orders_by_customer (
    customer_id TEXT,
    order_month TEXT,
    order_id TIMEUUID,
    total DECIMAL,
    status TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY ((customer_id, order_month), order_id)
) WITH CLUSTERING ORDER BY (order_id DESC);

-- Access pattern: Get orders by status and date range
CREATE TABLE orders_by_status (
    status TEXT,
    created_at DATE,
    order_id UUID,
    customer_id TEXT,
    total DECIMAL,
    PRIMARY KEY ((status), created_at, order_id)
);
```

### Partition Key Design

| Partition Key | Distribution | Query Support | Risk |
|---|---|---|---|
| High cardinality (user_id) | Even | Single user queries | OK |
| Compound (customer_id, month) | Even + time-local | Customer + time range | Good |
| Low cardinality (status) | Skewed (most "completed") | Broad scans | Hot partitions |
| Time-based (day) | Uneven time growth | Time-range queries | Hot last partition |

### Clustering Columns

```cql
-- Clustering order determines storage order and query sorting
-- ORDER BY is only supported in the clustering direction
CREATE TABLE sensor_readings (
    sensor_id TEXT,
    day DATE,
    reading_ts TIMESTAMP,
    value DOUBLE,
    PRIMARY KEY ((sensor_id, day), reading_ts)
) WITH CLUSTERING ORDER BY (reading_ts DESC);

-- Query: latest readings for a sensor-day
SELECT * FROM sensor_readings
WHERE sensor_id = 'sensor-001' AND day = '2026-05-01'
ORDER BY reading_ts DESC
LIMIT 10;
```

## CQL Patterns

```cql
-- Batch write (atomic within partition, not cross-partition)
BEGIN BATCH
    INSERT INTO orders_by_customer (customer_id, order_month, order_id, total, status)
    VALUES ('cust-1', '2026-05', now(), 150.00, 'completed');
    INSERT INTO orders_by_status (status, created_at, order_id, customer_id, total)
    VALUES ('completed', '2026-05-01', now(), 'cust-1', 150.00);
APPLY BATCH;

-- Lightweight transaction (compare-and-set)
INSERT INTO customers (customer_id, email, name)
VALUES ('cust-1', 'alice@co', 'Alice')
IF NOT EXISTS;

-- User-defined type
CREATE TYPE address (
    street TEXT,
    city TEXT,
    state TEXT,
    zip TEXT
);

-- Update UDT field
UPDATE customers SET address = { street: '123 Main', city: 'NYC', state: 'NY', zip: '10001' }
WHERE customer_id = 'cust-1';
```

## DynamoDB Single-Table Design

### Hierarchical Keys

```json
{
  "PK": "CUST#123",
  "SK": "ORDER#2026-05-01#ORD-001",
  "entity_type": "order",
  "customer_name": "Acme Corp",
  "total": 250.00,
  "status": "shipped",
  "GSI1PK": "STATUS#shipped",
  "GSI1SK": "2026-05-01",
  "LSI1SK": "250.00"
}
```

| Access Pattern | Query | Key Expression |
|---|---|---|
| Get customer | `PK=CUST#123, SK begins_with="CUST#"` | PK only |
| Get customer orders | `PK=CUST#123, SK begins_with="ORDER#"` | PK + SK range |
| Get orders by status | `GSI1PK=STATUS#shipped` | GSI PK |
| Get orders by status+date | `GSI1PK=STATUS#shipped, SK >= DATE` | GSI PK + SK range |

### GSI and LSI

```json
{
  "TableName": "orders",
  "KeySchema": [
    { "AttributeName": "PK", "KeyType": "HASH" },
    { "AttributeName": "SK", "KeyType": "RANGE" }
  ],
  "GlobalSecondaryIndexes": [{
    "IndexName": "GSI-Status",
    "KeySchema": [
      { "AttributeName": "GSI1PK", "KeyType": "HASH" },
      { "AttributeName": "GSI1SK", "KeyType": "RANGE" }
    ],
    "Projection": { "ProjectionType": "KEYS_ONLY" }
  }],
  "LocalSecondaryIndexes": [{
    "IndexName": "LSI-Amount",
    "KeySchema": [
      { "AttributeName": "PK", "KeyType": "HASH" },
      { "AttributeName": "LSI1SK", "KeyType": "RANGE" }
    ],
    "Projection": { "ProjectionType": "ALL" }
  }]
}
```

### DynamoDB Advanced Patterns

```python
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('orders')

# Transactional write (all or nothing)
response = table.transact_write(
    TransactItems=[
        {
            'Put': {
                'TableName': 'orders',
                'Item': {
                    'PK': 'CUST#123',
                    'SK': 'ORDER#2026-05-01#ORD-001',
                    'total': 250.00
                },
                'ConditionExpression': 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
            }
        },
        {
            'Update': {
                'TableName': 'orders',
                'Key': {'PK': 'CUST#123', 'SK': 'CUST#123'},
                'UpdateExpression': 'ADD order_count :inc',
                'ExpressionAttributeValues': {':inc': 1}
            }
        }
    ]
)
```

## Compaction Strategies

| Strategy | Write Pattern | Read Pattern | Space Amplification |
|---|---|---|---|
| SizeTieredCompaction (STCS) | Write-heavy | Any | High (up to 10x) |
| LeveledCompaction (LCS) | Mixed | Read-heavy | Low (~1.1x) |
| TimeWindowCompaction (TWCS) | Time-series | Time-range | Low |

```cql
-- TWCS for time-series data
CREATE TABLE sensor_readings (
    sensor_id TEXT,
    day DATE,
    reading_ts TIMESTAMP,
    value DOUBLE,
    PRIMARY KEY ((sensor_id, day), reading_ts)
) WITH CLUSTERING ORDER BY (reading_ts DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'DAYS'
  };
```

## Rules
- One table per query pattern in Cassandra
- Single-table design with hierarchical keys in DynamoDB
- Partition key must have high cardinality for even distribution
- No cross-partition queries (Cassandra) or use Scan (DynamoDB, expensive)
- Clustering order matches the most common sort order
- GSI is eventually consistent; LSI is strongly consistent
- Keep item size under 10KB in DynamoDB for optimal throughput
- Use TWCS for time-series data (Cassandra)
- Batch writes within same partition only (Cassandra)
- Use conditional writes for idempotent operations
