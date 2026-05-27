---
name: data-nosql-database
description: >
  Use this skill when asked about MongoDB, Cassandra, DynamoDB, Couchbase, CosmosDB, NoSQL, document database, wide-column, key-value, consistency model, CAP theorem, sharding, or denormalization. This skill enforces: NoSQL type selection (document, key-value, wide-column, graph), MongoDB aggregation pipeline and indexing, Cassandra data modeling with partition/clustering keys, DynamoDB single-table design with GSI/LSI, CAP theorem trade-offs, consistency models (eventual, strong, quorum), and denormalization patterns. Do NOT use for: relational schema design, graph database traversal, or full-text search configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, database, nosql, phase-11]
---

# Data NoSQL Database

## Purpose
Select and design NoSQL databases by access patterns, data shape, consistency requirements, and scale. Use document stores for flexible schemas, wide-column for high-scale writes, key-value for caching, and single-table designs for DynamoDB.

## Agent Protocol

### Trigger
Exact user phrases: "MongoDB", "Cassandra", "DynamoDB", "Couchbase", "CosmosDB", "NoSQL", "document database", "wide-column", "key-value", "consistency model", "CAP theorem", "sharding", "denormalization", "single-table design", "GSI", "LSI", "aggregation pipeline", "CQL".

### Input Context
Before activating, verify:
- Access patterns (known queries, write volume, read volume)
- Consistency requirements (strong, eventual, tunable)
- Data shape (nested documents, flat rows, time-series)
- Scale requirements (GB/TB/PB, throughput, latency SLAs)
- Team expertise (SQL background, NoSQL experience)
- Cloud vs on-premise deployment

### Output Artifact
NoSQL data model with access patterns, sharding strategy, consistency configuration, and platform-specific DDL.

### Response Format
```javascript
// MongoDB schema + indexes + aggregation
```
```cql
// Cassandra table DDL + compaction
```
```json
// DynamoDB table config + GSI/LSI
```
```yaml
# Consistency configuration
# Sharding strategy
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] NoSQL type selected based on access patterns and data shape
- [ ] Data model designed around known queries (query-first approach)
- [ ] Sharding/partition key chosen to avoid hot spots
- [ ] Secondary indexes designed (GSI, LSI, MongoDB secondary)
- [ ] Consistency model configured per operation
- [ ] Denormalization applied for read performance
- [ ] Write path optimized (compaction, write isolation)

### Max Response Length
300 lines of schema and configuration.

## Workflow

### Step 1: NoSQL Type Selection
Document (MongoDB, Couchbase): nested data, flexible schema, complex queries. Wide-column (Cassandra, Scylla): high-volume writes, time-series, predictable queries by partition key. Key-value (Redis, DynamoDB): simple lookups, caching, session store. Graph (Neo4j): relationships are first-class. Decision matrix: write volume, query complexity, consistency needs, schema flexibility.

| Pattern | Read Latency | Write Throughput | Query Flexibility | Consistency |
|---------|-------------|-----------------|-------------------|-------------|
| Document | Low | Medium | High | Tunable |
| Wide-column | Low | Very High | Low (by PK) | Tunable |
| Key-value | Very Low | Very High | Very Low | Configurable |
| Graph | Medium | Low | Very High (traversals) | Often strict |

### Step 2: Data Modeling (Query-First)
Map all access patterns before designing schemas. For every query define: partition key, sort/clustering key, filter conditions, projected attributes, consistency requirement. DynamoDB: single-table design with entity type attribute and hierarchical keys. MongoDB: embed for contained sub-items, reference for shared entities. Cassandra: one table per query pattern.

```json
// DynamoDB single-table: order + customer in one table
{
  "PK": "CUST#123",
  "SK": "ORDER#2025-03-15#ORD-001",
  "entity_type": "order",
  "customer_name": "Acme Corp",
  "total": 250.00,
  "status": "shipped",
  "items": ["PROD-A", "PROD-B"],
  "GSI1PK": "STATUS#shipped",
  "GSI1SK": "2025-03-15"
}
```

### Step 3: Sharding and Partitioning
MongoDB: shard key with high cardinality, low frequency, non-monotonic (hashed shard key for time-series). Cassandra: partition key distribution determines data placement; use compound partition keys for even distribution. DynamoDB: partition key hashed internally; use adaptive capacity for hot partitions. Avoid: monotonically increasing keys (all writes to one shard), low-cardinality keys (jumbo partitions).

```javascript
// MongoDB shard key: hashed for even distribution
sh.shardCollection("shop.orders", { "order_id": "hashed" })

// MongoDB shard key: ranged for geographic queries
sh.shardCollection("analytics.events", { "region": 1, "timestamp": -1 })
```

```cql
// Cassandra compound partition key with clustering
CREATE TABLE orders_by_customer (
    customer_id TEXT,
    order_month TEXT,
    order_id TIMEUUID,
    total DECIMAL,
    status TEXT,
    PRIMARY KEY ((customer_id, order_month), order_id)
) WITH CLUSTERING ORDER BY (order_id DESC);
```

### Step 4: Secondary Indexes
MongoDB: single-field, compound, multikey (arrays), text, geospatial, hashed. Use partial indexes to reduce index size. DynamoDB GSI: alternative partition key, eventually consistent by default, projected attributes control cost. LSI: same partition key, different sort key, strongly consistent, 5 per table. Cassandra secondary indexes: local (per node) for low-cardinality columns; SASI (deprecated) for full-text. Prefer materialized views over indexes in Cassandra.

```json
{
  "TableName": "orders",
  "KeySchema": [
    { "AttributeName": "customer_id", "KeyType": "HASH" },
    { "AttributeName": "order_date", "KeyType": "RANGE" }
  ],
  "GlobalSecondaryIndexes": [{
    "IndexName": "GSI-Status-Date",
    "KeySchema": [
      { "AttributeName": "status", "KeyType": "HASH" },
      { "AttributeName": "shipped_date", "KeyType": "RANGE" }
    ],
    "Projection": { "ProjectionType": "INCLUDE", "NonKeyAttributes": ["total"] }
  }]
}
```

### Step 5: Consistency and CAP
CAP trade-off: partition tolerance is mandatory (P), choose consistency (CP) or availability (AP). MongoDB: primary reads (strong), secondary reads (eventual), majority write concern. Cassandra: ONE (high availability), QUORUM (balanced), ALL (strong). DynamoDB: eventually consistent reads (default), strongly consistent reads (1 WCU headroom). Use quorum-based reads for critical data, eventual for dashboards.

```yaml
# MongoDB write concern
writeConcern:
  w: majority
  j: true
  wtimeout: 5000

# Cassandra consistency per query
SELECT * FROM orders WHERE customer_id = '123'
  USING CONSISTENCY LOCAL_QUORUM;
```

### Step 6: Denormalization Patterns
Computed fields: store aggregates (order count, total spent) to avoid joins. Complex attributes: embed line items in orders, comments in posts. Cross-entity data: duplicate customer name in each order for fast listing. Pre-joined data: create materialized join tables. Path enumeration: store full category path. Pre-joined data eliminates read-time joins at the cost of write-time complexity.

```javascript
// MongoDB embedded items
{
  "_id": "order:123",
  "customer": { "id": "cust:456", "name": "Acme", "email": "acme@co" },
  "items": [
    { "product_id": "p:1", "name": "Widget", "qty": 2, "price": 10.00 }
  ],
  "total": 20.00
}
```

### Step 7: Aggregation and Analytics
MongoDB aggregation pipeline stages: $match (filter early), $project (shape documents), $group (group by key), $sort (order results), $limit/$skip (pagination), $unwind (deconstruct arrays), $lookup (join across collections), $bucket (histogram), $facet (multi-faceted aggregation). Performance: use indexes for $match and $sort stages; $lookup requires index on foreign collection; avoid $unwind on large arrays; use allowDiskUse for memory-intensive pipelines. Use $merge to output aggregation results to a new collection.

```javascript
// Order analytics with facet
db.orders.aggregate([
    { $match: { created_at: { $gte: ISODate("2025-01-01") } } },
    { $facet: {
        by_status: [
            { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$total" } } }
        ],
        by_region: [
            { $lookup: { from: "customers", localField: "customer_id", foreignField: "_id", as: "customer" } },
            { $unwind: "$customer" },
            { $group: { _id: "$customer.region", count: { $sum: 1 }, revenue: { $sum: "$total" } } }
        ],
        daily_trend: [
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]
    } }
]);
```

### Step 8: Backup and Restoration Strategies
MongoDB: mongodump for logical backups (slower, cross-version), file-system snapshots for fast physical backups (EBS snapshots, LVM), Ops Manager for continuous backup with point-in-time recovery. Cassandra: nodetool snapshot for hard-link snapshots, incremental backups with incremental_backups=true, commit log archiving for point-in-time recovery. DynamoDB: on-demand backup (full copy), point-in-time recovery (PITR) for last 35 days, cross-region replication for DR.

```yaml
# Cassandra backup configuration
incremental_backups: true
commitlog_archiving:
  properties_dir: /etc/cassandra/commitlog_archiving.properties
  archive_command: "cp %path /backup/commitlog/%name"
  restore_command: "cp /backup/commitlog/%name %path"
```

### Step 9: Security and Access Control
MongoDB: SCRAM-SHA-256 authentication, x.509 certificate auth, LDAP/Kerberos integration, field-level encryption, audit logging. Cassandra: role-based access control with CQL GRANT/REVOKE, mTLS for inter-node encryption, system_auth keyspace replication across all datacenters. DynamoDB: IAM policies for table-level access, VPC endpoints for network isolation, KMS encryption at rest, DAX encryption in transit.

```cql
-- Cassandra RBAC
CREATE ROLE app_user WITH PASSWORD = 'secure_password' AND LOGIN = true;
GRANT SELECT ON KEYSPACE shop TO app_user;
GRANT MODIFY ON TABLE shop.orders TO app_user;
```

## Rules (updated)

### Write Path Optimization
MongoDB: bulk writes, ordered=false for best-effort, journaled writes. Cassandra: compaction strategy determines write amplification (STCS for write-heavy, LCS for read-heavy, TWCS for time-series). DynamoDB: provisioned capacity with auto-scaling, burst capacity for spikes. Write isolation: avoid read-before-write patterns (conditional updates in DynamoDB, upserts in Cassandra).

```cql
// Cassandra compaction: TimeWindowCompactionStrategy for time-series
CREATE TABLE sensor_readings (
    sensor_id TEXT,
    day TEXT,
    ts TIMESTAMP,
    value DOUBLE,
    PRIMARY KEY ((sensor_id, day), ts)
) WITH CLUSTERING ORDER BY (ts DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'DAYS'
  };
```

## Rules
- Query-first design: model around known access patterns, never data shape
- Single-table design in DynamoDB for all related entities
- One table per query pattern in Cassandra
- Embed in MongoDB when sub-documents are accessed together
- Shard key must have high cardinality and even distribution
- Hashed shard keys for time-series to prevent hot spots
- Use eventual consistency for read-heavy dashboards
- Strong consistency for critical financial data
- Denormalize to avoid reads spanning partitions
- No cross-partition queries in Cassandra

## References
  - references/document-db.md — Document Database Reference
  - references/dynamodb-couchbase.md — DynamoDB and Couchbase Reference
  - references/mongodb-cassandra.md — MongoDB and Cassandra Reference
  - references/nosql-cap-theorem.md — NoSQL CAP Theorem
  - references/nosql-performance-tuning.md — NoSQL Performance Tuning
  - references/wide-column.md — Wide-Column Database Reference
## Handoff
`data-graph-database` for relationship-heavy queries
`data-search-engine` for full-text search over NoSQL data
