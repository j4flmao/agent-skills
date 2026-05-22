# MongoDB and Cassandra Reference

## MongoDB Sharding

```javascript
sh.shardCollection("events.logs", { "_id": "hashed" })
sh.shardCollection("shop.orders", { "region": 1, "customer_id": 1 })
```

| Rule | Reason |
|------|--------|
| High cardinality | Avoid jumbo chunks |
| Low frequency | Avoid hot spots |
| Non-monotonic | Avoid hot shard on writes |

### Chunk Management
```javascript
sh.status()
sh.moveChunk("shop.orders", { customer_id: "abc" }, "shard02")
```

## MongoDB Aggregation Pipeline

```javascript
db.orders.aggregate([
    { $match: { status: "completed", total: { $gte: 50 } } },
    { $lookup: { from: "customers", localField: "customer_id", foreignField: "_id", as: "customer" } },
    { $unwind: "$customer" },
    { $group: {
        _id: { region: "$customer.region", month: { $month: "$created_at" } },
        total_revenue: { $sum: "$total" }, order_count: { $sum: 1 },
        avg_order_value: { $avg: "$total" },
    }},
    { $sort: { total_revenue: -1 } },
    { $limit: 20 },
]);
```

### Performance
```javascript
db.orders.createIndex({ status: 1, total: 1, created_at: -1 })
// $match and $limit early, $project to drop fields, allowDiskUse for large
```

## MongoDB Indexes

```javascript
db.products.createIndex({ sku: 1 }, { unique: true })
db.orders.createIndex({ customer_id: 1, created_at: -1, total: 1 })  // ESR rule
db.products.createIndex({ tags: 1 })  // multikey
db.products.createIndex(
    { name: "text", description: "text" },
    { weights: { name: 10, description: 5 } }
)
db.orders.createIndex(
    { created_at: -1 },
    { partialFilterExpression: { status: "pending" } }
)
```

## Cassandra Data Modeling

### Query-First Design
```cql
CREATE TABLE orders_by_customer (
    customer_id TEXT, order_date DATE, order_id TIMEUUID,
    total DECIMAL, status TEXT,
    PRIMARY KEY ((customer_id), order_date, order_id)
) WITH CLUSTERING ORDER BY (order_date DESC, order_id DESC);

CREATE TABLE orders_by_status (
    status TEXT, created_at TIMESTAMP, order_id UUID,
    customer_id TEXT, total DECIMAL,
    PRIMARY KEY ((status), created_at, order_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

### Partition Key Design
```cql
-- Bad: one partition per customer
PRIMARY KEY ((customer_id))

-- Good: compound partition key
PRIMARY KEY ((customer_id, order_month))

-- Time-series: partition by day
CREATE TABLE sensor_data (
    sensor_id TEXT, day DATE, ts TIMESTAMP, value DOUBLE,
    PRIMARY KEY ((sensor_id, day), ts)
) WITH CLUSTERING ORDER BY (ts DESC);
```

## CQL

```cql
CREATE TYPE address (street TEXT, city TEXT, state TEXT, zip TEXT);

CREATE TABLE customers (
    id UUID PRIMARY KEY, name TEXT, email TEXT,
    addresses MAP<TEXT, FROZEN<address>>,
    tags SET<TEXT>, created_at TIMESTAMP
);

-- Materialized view
CREATE MATERIALIZED VIEW customers_by_email AS
    SELECT * FROM customers WHERE email IS NOT NULL AND id IS NOT NULL
    PRIMARY KEY (email, id);
```

### Query Restrictions
```cql
SELECT * FROM orders_by_customer
WHERE customer_id = '123' AND order_date >= '2025-01-01';

-- Not allowed (no ALLOW FILTERING):
SELECT * FROM orders_by_customer WHERE total > 100;  -- ERROR
```

## Compaction Strategies

| Strategy | Use Case |
|----------|----------|
| STCS | Write-heavy, default |
| LCS | Read-heavy, predictable latency |
| TWCS | Time-series (per window) |

```cql
CREATE TABLE events WITH compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_unit': 'DAYS',
    'compaction_window_size': 1,
} AND gc_grace_seconds = 86400 AND default_time_to_live = 7776000;
```

## References
- MongoDB docs: https://www.mongodb.com/docs/manual/
- Cassandra docs: https://cassandra.apache.org/doc/latest/
