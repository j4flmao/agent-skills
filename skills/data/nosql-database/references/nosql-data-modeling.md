# NoSQL Data Modeling

## Overview

NoSQL data modeling follows fundamentally different principles than relational modeling. Instead of normalizing data and designing schemas around entities, NoSQL modeling starts with access patterns: "what queries will I run?" then designs the data layout to make those queries fast. This reference covers modeling patterns for document stores (MongoDB), wide-column stores (Cassandra), and key-value stores (DynamoDB), with emphasis on denormalization, embedding, and query-first design.

## Query-First Design Methodology

### The Process

```
Step 1: List all application queries
├── For each user story, identify the data needed
├── List: entity types, filter conditions, sort order, projection
├── Frequency: how often is each query run?
├── Latency requirement: real-time (<100ms), near-real-time (<1s), batch
└── Consistency requirement: strong vs eventual

Step 2: Group queries by access pattern
├── By partition key: queries that filter by the same attribute
├── By sort key: queries that order/filter by time, status, etc.
├── By entity type: queries accessing the same logical entity
└── By frequency: hot queries (high frequency) vs cold queries (rare)

Step 3: Design data layout per query group
├── Document/MongoDB: embed or reference related data
├── Cassandra: one table per query pattern
├── DynamoDB: single-table design with composite keys
└── Each query should read from minimal number of partitions

Step 4: Optimize for the most frequent queries
├── Denormalize hot-path data into the primary read entity
├── Store computed aggregates (count, sum) for dashboard queries
├── Accept write amplification for read optimization
└── Secondary indexes for less frequent query patterns

Step 5: Validate against all queries
├── Can every query be served within latency budget?
├── No cross-partition queries in Cassandra
├── No table scans in MongoDB (index coverage)
├── No full table scans in DynamoDB (use GSIs)
└── Item size within limits (16MB MongoDB, 400KB DynamoDB)

Query-first design template:

Query ID: Q01
Use case: Get order details by order ID
Frequency: 10,000/min (HOT)
Latency SLA: <50ms
Consistency: Strong
Data needed: order header + line items + customer name
Filter: order_id = ?
Projection: all fields
Index required: Primary key on order_id
Model: Single document in MongoDB, PK=ORDER#id in DynamoDB

Query ID: Q02
Use case: List orders by customer, sorted by date desc
Frequency: 1,000/min (WARM)
Latency SLA: <100ms
Consistency: Eventually consistent
Data needed: order_id, date, total, status
Filter: customer_id = ?
Sort: order_date DESC, limit 20
Index required: DynamoDB PK=CUST#id, SK=ORDER#date (composite)
Model: Same table as Q01 in single-table design
```

### Access Pattern Documentation

```
Access pattern matrix:

┌──────────────────────────────────────────────────────────────────────────────┐
│ Query    │ Entity       │ Filter            │ Sort     │ Freq  │ Latency    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Q01      │ Order        │ order_id          │ -        │ HOT   │ <50ms      │
│ Q02      │ Order        │ customer_id       │ date DESC│ WARM  │ <100ms     │
│ Q03      │ Customer     │ customer_id       │ -        │ WARM  │ <100ms     │
│ Q04      │ Order        │ status + date     │ date     │ COLD  │ <500ms     │
│ Q05      │ Product      │ category + price  │ price    │ COLD  │ <500ms     │
│ Q06      │ Order Line   │ order_id          │ line_num │ WARM  │ <200ms     │
│ Q07      │ Product      │ product_id        │ -        │ HOT   │ <50ms      │
│ Q08      │ Dashboard    │ date range        │ date     │ COLD  │ <5s (agg)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Document Store Modeling (MongoDB)

### Embedding vs Referencing

```
Decision rule: embed when sub-documents are always accessed with parent.

Embed when:
├── Sub-document is tightly coupled to parent (line items in order)
├── Sub-document is always queried with parent
├── Cardinality is bounded (max 100 items per order, 100 addresses per user)
├── Sub-document data changes infrequently
├── Data is read-heavy relative to writes
└── Example: order → line items, blog post → comments (capped)

Reference when:
├── Sub-document is shared across parents (tags, categories)
├── Sub-document is large and would exceed 16MB limit
├── Cardinality is unbounded (millions of comments per post)
├── Sub-document changes frequently independently of parent
├── Data is write-heavy relative to reads
└── Example: user → shared address, product inventory updates

Embedding depth guidelines:
├── Level 1 (shallow): embed directly in parent. Best for simple sub-documents.
├── Level 2 (moderate): embed with a few nested fields. Acceptable.
├── Level 3+ (deep): avoid deeply nested schemas. Hard to query and index.
└── Maximum: MongoDB 16MB document limit applies at any depth.

Example 1: Embedded (correct for orders/items):
{
  _id: ObjectId("..."),
  order_id: "ORD-001",
  customer_id: "CUST-123",
  order_date: ISODate("2025-03-15"),
  status: "shipped",
  items: [
    {
      product_id: "PROD-A",
      name: "Widget",
      qty: 2,
      unit_price: 10.00,
      line_total: 20.00
    },
    {
      product_id: "PROD-B",
      name: "Gadget",
      qty: 1,
      unit_price: 25.00,
      line_total: 25.00
    }
  ],
  subtotal: 45.00,
  tax: 4.50,
  total: 49.50,
  shipping_address: {
    street: "123 Main St",
    city: "Portland",
    state: "OR",
    zip: "97201"
  }
}

Example 2: Referenced (correct for shared products):
// Products collection
{
  _id: "PROD-A",
  name: "Widget",
  description: "A useful widget",
  category: "tools",
  current_price: 10.00,
  inventory_count: 500
}

// Orders collection (references product)
{
  _id: ObjectId("..."),
  order_id: "ORD-001",
  items: [
    {
      product_id: "PROD-A",       // Reference only
      product_name: "Widget",     // Denormalized for fast listing
      qty: 2,
      unit_price: 10.00,          // Price at time of order
      line_total: 20.00
    }
  ]
}

When to embed vs reference:
├── Items in order: EMBED (always accessed with order, bounded)
├── Products in order: REFERENCE + denormalize name (shared, frequently updated)
├── Comments on post: EMBED (capped to 100, always with post)
├── User profile + address: EMBED (few addresses, always with user)
├── User orders: REFERENCE (many orders, independent access)
├── Blog post tags: REFERENCE (shared across many posts)
└── Audit log entries: REFERENCE (unbounded, independent writes)
```

### Polymorphic Schemas

```
Document stores excel at polymorphic data (same collection, different shapes):

Pattern 1: Discriminator field
{
  _id: ObjectId("..."),
  type: "customer",     // discriminator
  name: "Acme Corp",
  email: "acme@co",
  billing_address: { ... }
}
{
  _id: ObjectId("..."),
  type: "employee",
  name: "John Doe",
  email: "john@co",
  department: "Engineering",
  hire_date: ISODate("2023-01-15")
}

// Query across types
db.people.find({ type: "customer", "billing_address.state": "OR" })

Pattern 2: Optional fields with sparse indexes
{
  _id: ObjectId("..."),
  entity_type: "order",
  status: "shipped",
  shipped_date: ISODate("2025-03-16"),
  tracking_number: "1Z999AA10123456784"  // only for shipped orders
}
{
  _id: ObjectId("..."),
  entity_type: "order",
  status: "pending",
  payment_method: "credit_card"  // only for pending orders
}

// Sparse index on optional field
db.orders.createIndex(
  { tracking_number: 1 },
  { sparse: true, unique: false }
)

Pattern 3: Schema versioning
{
  _id: ObjectId("..."),
  schema_version: 2,  // allow migration logic in app
  name: "Acme Corp",
  // v1 fields
  contact_email: "old@acme.co",
  // v2 fields
  contacts: [
    { email: "billing@acme.co", type: "billing" },
    { email: "support@acme.co", type: "support" }
  ]
}
```

### Document Growth and Migration

```
Document growth patterns:

Predictable growth:
├── Items in an order: bounded by business rules (max 100 items)
├── Addresses per user: typically 1-5
├── Embeds: safe for bounded, predictable growth
└── Monitor: use $bsonSize to check document size

Unpredictable growth:
├── Comments on a post: potentially unbounded
├── Tags per document: could grow with system
├── Solution: move to separate collection with reference
└── Alternative: paginate within document if bounded by app logic

Schema migration strategies:

Strategy 1: Lazy migration (recommended)
├── Application code handles both old and new schema versions
├── On read: detect old version, migrate to new, save back
├── On write: always write in latest schema version
├── Gradual: old documents migrate over time as they are accessed
└── No downtime, no batch migration job

Strategy 2: Batch migration
├── Script iterates all documents, updates schema
├── Use cursor with batch size for large collections
├── db.collection.updateMany with $rename, $unset, $set
├── Requires: application downtime or dual-write during migration
└── Best for: breaking schema changes

Strategy 3: Backfill with change stream
├── Use MongoDB Change Streams to capture old-schema writes
├── Transform in change stream handler
├── Write new format to separate collection or update in place
├── Eventually consistent: old docs remain until next read
└── Complex: requires stream processing infrastructure
```

## Wide-Column Modeling (Cassandra)

### One Table Per Query Pattern

```
Cassandra's primary rule: design one table for each query pattern.

Customer orders query:
CREATE TABLE orders_by_customer (
    customer_id TEXT,
    order_month TEXT,
    order_id TIMEUUID,
    total DECIMAL,
    status TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY ((customer_id, order_month), order_id)
) WITH CLUSTERING ORDER BY (order_id DESC);

Order by status query:
CREATE TABLE orders_by_status (
    status TEXT,
    created_at TIMESTAMP,
    order_id UUID,
    customer_id TEXT,
    total DECIMAL,
    PRIMARY KEY ((status), created_at, order_id)
) WITH CLUSTERING ORDER BY (created_at DESC);

Order by ID (direct lookup):
CREATE TABLE orders_by_id (
    order_id UUID,
    customer_id TEXT,
    total DECIMAL,
    status TEXT,
    line_items LIST<FROZEN<line_item_type>>,
    created_at TIMESTAMP,
    PRIMARY KEY ((order_id))
);

Each table stores the same data but organized for a specific query.
Application writes to all relevant tables (or uses materialized views).

Best practices for Cassandra table design:
├── Partition key: high cardinality, even distribution
├── Clustering columns: defined by sort/filter order in queries
├── Max partitions per query: 1 (no cross-partition queries)
├── Max rows per partition: < 100,000 (avoid large partitions)
├── Denormalize: store all needed columns in each table
└── Avoid: secondary indexes, ALLOW FILTERING, IN queries on partition key
```

### Partition Key Design

```
Partition key strategies:

1. Simple partition key (single column)
├── Best for: unique IDs, user IDs, session tokens
├── Example: PRIMARY KEY ((user_id))
├── Size: 1 row per partition typically
└── Risk: none (high cardinality, even distribution)

2. Compound partition key (multiple columns)
├── Best for: multi-tenant, time-bucketed data
├── Example: PRIMARY KEY ((tenant_id, month))
├── Even distribution across partitions
└── Allows: time-bucketed pruning for queries

3. Time-bucketed partition key
├── Best for: time-series data
├── Example: PRIMARY KEY ((sensor_id, day), timestamp)
├── Each partition: 1 day of data per sensor
├── TTL: drop old partitions (expire data after 90 days)
└── Size: controllable by bucket size (hour, day, week)

Partition size estimation:
target_rows_per_partition = max_rows_to_scan / number_of_queries
max_partition_size_mb = 100  # Cassandra best practice

Example: sensor readings at 1 reading/second
├── Hourly bucket: 3,600 rows/partition → ~1MB (good)
├── Daily bucket: 86,400 rows/partition → ~25MB (acceptable)
├── Weekly bucket: 604,800 rows/partition → ~170MB (too large)
└── Choice: hourly bucket for hot data, daily for warm, monthly for cold

Partition key selection checklist:
├── High cardinality: thousands to millions of unique values
├── Even distribution: each partition gets roughly equal writes
├── Query alignment: queries specify exact partition key
├── Controllable size: partition won't grow unbounded
└── Avoid: monotonically increasing, low cardinality, null values
```

### Clustering Column Design

```
Clustering columns define sort order and uniqueness within a partition:

Single clustering column:
CREATE TABLE events_by_user (
    user_id TEXT,
    event_time TIMESTAMP,
    event_type TEXT,
    data TEXT,
    PRIMARY KEY ((user_id), event_time)
) WITH CLUSTERING ORDER BY (event_time DESC);

├── 1-N rows per partition
├── Sorted by event_time
├── Query: range scan on event_time
├── Query: WHERE user_id=? AND event_time > ?
└── Query: WHERE user_id=? AND event_time < ?

Compound clustering column:
CREATE TABLE chat_messages (
    room_id TEXT,
    bucket_day TEXT,
    message_time TIMEUUID,
    message_id UUID,
    sender TEXT,
    content TEXT,
    PRIMARY KEY ((room_id, bucket_day), message_time, message_id)
) WITH CLUSTERING ORDER BY (message_time DESC, message_id ASC);

├── message_time: range filter for time queries
├── message_id: uniqueness within same millisecond
├── Query: WHERE room_id=? AND bucket_day=? AND message_time > ?
└── Query: WHERE room_id=? AND bucket_day=? ORDER BY message_time LIMIT 50

Clustering column rules:
├── Columns in ORDER BY must be clustering columns
├── Clustering order defined at table creation (can't change)
├── Range queries only on the last clustering column in the filter
├── Preceding clustering columns must use equality filters
├── DESC order for most-recent-first queries (time-series)
└── ASC order for enumeration-type queries (alphabetical listing)
```

### Materialized Views

```
Cassandra materialized views maintain a secondary table automatically:

Base table:
CREATE TABLE orders_by_customer (
    customer_id TEXT,
    order_id TIMEUUID,
    total DECIMAL,
    status TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY ((customer_id), order_id)
);

Materialized view by status:
CREATE MATERIALIZED VIEW orders_by_status AS
    SELECT customer_id, order_id, total, status, created_at
    FROM orders_by_customer
    WHERE status IS NOT NULL AND customer_id IS NOT NULL AND order_id IS NOT NULL
    PRIMARY KEY ((status), created_at, customer_id, order_id)
    WITH CLUSTERING ORDER BY (created_at DESC, customer_id ASC);

Materialized view limitations:
├── Base table primary key columns must be in view primary key
├── All view primary key columns must be NOT NULL (IS NOT NULL in WHERE)
├── No value transformations (must be SELECT *)
├── Updates to base table primary key break the view
├── Performance: view updates add latency to base writes
├── Filtering: view WHERE clause can only reference primary key columns
└── Known issues: view inconsistencies under heavy write load

Materialized view alternatives:
├── Application-level dual-write (write to both tables)
├── Apache Spark or similar for async view maintenance
├── CDC-based materialization with Apache Pulsar/Kafka
└── Recommendation: prefer application-level dual-write for control
```

### Time-Series Data Modeling

```
Time-series patterns in Cassandra:

Pattern 1: Sensor readings (high frequency, per sensor)
CREATE TABLE sensor_readings (
    sensor_id TEXT,
    day TEXT,
    hour TEXT,
    reading_time TIMESTAMP,
    value DOUBLE,
    unit TEXT,
    PRIMARY KEY ((sensor_id, day, hour), reading_time)
) WITH CLUSTERING ORDER BY (reading_time DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'HOURS'
  };

├── Partition key: (sensor_id, day, hour) = finite, predictable size
├── 3,600 rows/partition at 1 reading/sec
├── Compaction: TWCS with 1-hour windows
├── TTL: set based on retention (1 day raw, 30 days aggregated)
└── Query: SELECT * FROM sensor_readings WHERE sensor_id='A' AND day='2025-03-15' AND hour='14'

Pattern 2: Event stream (variable frequency, variable cardinality)
CREATE TABLE events (
    event_type TEXT,
    year_month TEXT,
    event_time TIMEUUID,
    event_id UUID,
    payload TEXT,
    source TEXT,
    PRIMARY KEY ((event_type, year_month), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'MONTHS'
  };

├── Partition key: (event_type, year_month) - bounded by month
├── Variable rows per partition (depends on event volume)
├── Compaction: TWCS with monthly windows
├── TTL: 12 months for compliance
└── Query: SELECT * FROM events WHERE event_type='page_view' AND year_month='2025-03'

Pattern 3: Rollup/aggregation table
CREATE TABLE hourly_metrics (
    metric_name TEXT,
    date_hour TEXT,
    metric_time TIMESTAMP,
    min_value DOUBLE,
    max_value DOUBLE,
    avg_value DOUBLE,
    count INT,
    p50_value DOUBLE,
    p95_value DOUBLE,
    p99_value DOUBLE,
    PRIMARY KEY ((metric_name, date_hour), metric_time)
) WITH CLUSTERING ORDER BY (metric_time DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'DAYS'
  };

├── Rollup: hourly from raw data, daily from hourly, etc.
├── 1 row per hour per metric
├── Pre-computed percentiles: avoids heavy computation at query time
└── Query: SELECT * FROM hourly_metrics WHERE metric_name='api_latency' AND date_hour='2025-03-15'
```

## DynamoDB Single-Table Design

### Entity Relationship Modeling

```
Single-table design packs multiple entity types into one table using composite keys.

Key naming convention:
├── PK (Partition Key): entity identifier
├── SK (Sort Key): entity subtype or attribute
├── GSI1PK/GSI1SK: Global Secondary Index keys
├── GSI2PK/GSI2SK: Second GSI
└── entity_type: discriminator attribute

Entity key patterns:

Customer:     PK = CUST#<id>          SK = CUSTOMER#META
Order:        PK = CUST#<id>          SK = ORDER#<order_id>
Order Item:   PK = ORDER#<order_id>   SK = ITEM#<sku>
Product:      PK = PROD#<sku>         SK = PRODUCT#META
Category:     PK = CAT#<name>         SK = CATEGORY#META

GSI patterns:
├── GSI1: entity_type / created_at (list all by type, sorted by time)
├── GSI2: order_status / shipped_date (list orders by status)
└── GSI3: category / product_price (list products by category)

Access patterns with single-table:

Q01: Get customer by ID
├── PK = CUST#123, SK = CUSTOMER#META
├── Query with PK, SK = CUSTOMER#META
└── 1 item returned

Q02: Get all orders for customer
├── PK = CUST#123, SK begins_with ORDER#
├── Query with PK, SK condition BEGINS_WITH
└── Multiple items (all orders)

Q03: Get specific order with items
├── Query 1: PK = CUST#123, SK = ORDER#ORD-001
├── Query 2: PK = ORDER#ORD-001, SK begins_with ITEM#
└── 2 queries (or BatchGetItem)

Q04: List orders by status
├── GSI1PK = STATUS#shipped, GSI1SK = shipped_date
├── Query on GSI
└── Multiple items across all customers

Q05: Get products by category
├── GSI2PK = CATEGORY#tools, GSI2SK = price
├── Query on GSI
└── Multiple items sorted by price
```

### Complete Single-Table Example

```
E-commerce single-table design:

{
  "PK": "CUST#123",
  "SK": "CUSTOMER#META",
  "entity_type": "customer",
  "name": "Acme Corp",
  "email": "acme@co",
  "created_at": "2025-01-15T10:00:00Z",
  "tier": "gold",
  "total_orders": 15,
  "total_spent": 12500.00,
  "GSI1PK": "CUSTOMER#2025-01",  // created month for listing
  "GSI1SK": "2025-01-15T10:00:00Z"
}

{
  "PK": "CUST#123",
  "SK": "ORDER#2025-03-15#ORD-001",
  "entity_type": "order",
  "order_id": "ORD-001",
  "status": "shipped",
  "total": 250.00,
  "item_count": 3,
  "shipped_date": "2025-03-16",
  "customer_name": "Acme Corp",  // denormalized for listing
  "shipping_address": { ... },
  "GSI1PK": "STATUS#shipped",
  "GSI1SK": "2025-03-16T14:00:00Z",
  "GSI2PK": "ORDER#2025-03",
  "GSI2SK": "2025-03-15T10:30:00Z"
}

{
  "PK": "ORDER#ORD-001",
  "SK": "ITEM#PROD-A",
  "entity_type": "order_item",
  "product_name": "Widget",
  "qty": 2,
  "unit_price": 10.00,
  "line_total": 20.00
}

{
  "PK": "PROD#PROD-A",
  "SK": "PRODUCT#META",
  "entity_type": "product",
  "name": "Widget",
  "category": "tools",
  "price": 10.00,
  "inventory": 500,
  "GSI1PK": "CATEGORY#tools",
  "GSI1SK": "10.00"
}

Table key schema:
├── Primary Key: PK (String) + SK (String)
├── GSI1: GSI1PK (String) + GSI1SK (String)
├── GSI2: GSI2PK (String) + GSI2SK (String)

GSI projections:
├── GSI1: INCLUDE (entity_type, status, total, customer_name)
├── GSI2: ALL (all attributes)
└── GSI3: KEYS_ONLY (if only need PK/SK to then query)

Access pattern to query mapping:
├── Q01 (get customer) → Query: PK=CUST#123, SK=CUSTOMER#META
├── Q02 (customer orders) → Query: PK=CUST#123, SK BEGINS_WITH ORDER#
├── Q03 (order details) → Query: PK=CUST#123, SK=ORDER#ORD-001 + Query: PK=ORDER#ORD-001, SK BEGINS_WITH ITEM#
├── Q04 (orders by status) → Query: GSI1:PK=STATUS#shipped, SK BETWEEN date1 AND date2
├── Q05 (products by category) → Query: GSI1:PK=CATEGORY#tools, SK BETWEEN price1 AND price2
└── Q06 (recent customers) → Query: GSI1:PK=CUSTOMER#2025-03, SK >= cutoff
```

### GSI and LSI Design

```
Global Secondary Index (GSI) best practices:

GSI creation:
├── Max 20 GSIs per table (soft limit: 20)
├── Each GSI has its own provisioned throughput (or uses table's on-demand)
├── GSI key schema: partition key + optional sort key
├── Projection: KEYS_ONLY, INCLUDE, or ALL
├── Writes to GSI are asynchronous (eventually consistent)
└── Cannot query GSI with strong consistency

GSI key design patterns:
├── Entity type as GSI partition key (for listing all items of a type)
│   GSI1PK = entity_type, GSI1SK = created_at
├── Status as GSI partition key (for finding items by state)
│   GSI2PK = "STATUS#" + status, GSI2SK = last_updated
├── Category as GSI partition key (for product catalog browsing)
│   GSI3PK = "CATEGORY#" + category, GSI3SK = price
└── Composite key for multi-tenancy
    GSI1PK = tenant_id + "#" + entity_type, GSI1SK = created_at

GSI throughput considerations:
├── Each GSI has its own read/write capacity
├── Write capacity units consumed: 1 WCU per write to main table + 1 WCU per GSI write
├── A table with 2 GSIs costs 3x the write throughput
├── On-demand mode: GSIs scale automatically with table
└── Hot GSI partition: same problem as hot table partition

Local Secondary Index (LSI) best practices:
├── Max 5 LSIs per table
├── Same partition key as table, different sort key
├── Strongly consistent queries (unlike GSI)
├── Created only at table creation time (cannot add later)
├── No additional write capacity cost (shares table throughput)
└── Max item size in LSI: 10GB per partition key (same as table)

LSI use cases:
├── Query by different sort order: same PK but alternative sort
├── Query by different attribute: same PK, sort by status instead of date
└── Limited to 10GB per partition key value
```

## Denormalization Patterns

### Common Denormalization Strategies

```
Pattern 1: Duplicate attributes
├── Store customer name in each order (avoids join)
├── Store product name in each order item (avoids join)
├── Store category path in each product (avoids recursive lookup)
├── Cost: write amplification (update all copies when name changes)
└── Benefit: single read for listing query

Pattern 2: Computed aggregates
├── Store order count in customer record
├── Store total spent in customer record
├── Store product rating in product record
├── Update on each new order/review
└── No need to compute COUNT(*)/SUM(*) at read time

Pattern 3: Pre-joined data
├── Create a materialized collection for dashboard queries
├── Store order + customer + items in one wide document
├── MongoDB: aggregation pipeline with $merge to materialize
├── Cassandra: application-level dual-write to materialized table
└── Cost: redundant storage + write complexity

Pattern 4: Hierarchical denormalization
├── Category tree: store full path in each product
├── Comment thread: store parent_id + root_id for tree traversal
├── Organization hierarchy: store org path in each user
└── Eliminates recursive querying

Denormalization trade-off matrix:

Pattern         │ Read Benefit     │ Write Cost    │ Complexity
────────────────────────────────────────────────────────────────
Duplicate attr  │ 1 read vs 2 reads │ +1 field update │ Low
Computed agg    │ 1 read vs 1 agg   │ +counter update  │ Low
Pre-joined      │ 1 read vs N reads │ N writes        │ Medium
Hierarchical    │ 1 read vs N reads │ +path field     │ Low
```

### Write Path Considerations

```
Denormalization increases write complexity:

Simple write (no denormalization):
INSERT INTO orders (...) VALUES (...);
→ 1 write operation

Denormalized write:
INSERT INTO orders (...) VALUES (...);
UPDATE customers SET order_count = order_count + 1, total_spent = total_spent + 250 WHERE id = '123';
→ 2-3 write operations

Handling denormalized data consistency:

Strategy 1: Strong consistency via transactions
├── MongoDB: session.withTransaction() for multi-document updates
├── DynamoDB: TransactWriteItems for up to 25 operations
├── Cassandra: BATCH for atomic multi-table writes (performance cost)
└── Drawback: transaction latency higher than individual writes

Strategy 2: Eventually consistent denormalization
├── Update primary entity first
├── Update denormalized copies asynchronously (queue or CDC)
├── Application tolerates stale denormalized data (e.g., customer name in order)
├── Acceptable for: display names, aggregated counts (eventual)
└── Not acceptable for: financial balances, inventory counts

Strategy 3: Background reconciliation
├── Periodic job: scan denormalized data, verify against source of truth
├── Use change data capture (CDC) stream to drive updates
├── MongoDB Change Streams + worker process
├── DynamoDB Streams + Lambda function
└── Cassandra CDC + Kafka connector

When NOT to denormalize:
├── Data changes frequently (use reference instead)
├── Financial balance reconciliation requires strong consistency
├── Data is very large (several KB+) and duplicated many times
├── Write volume is very high and denormalization would bottleneck
└── Entity is the primary source of truth (keep normalized)
```

## Schema Evolution

### Handling Schema Changes

```
Non-breaking changes (safe in all NoSQL databases):
├── Adding new optional fields → backward compatible
├── Adding new entity types → new discrimination value
├── Removing unused fields → stop writing, eventually delete
├── Lengthening field maximums → no schema enforcement
└── Adding new indexes → operational change, no data migration

Breaking changes (require migration strategy):
├── Renaming a field → write new, read both
├── Splitting one field into multiple → migration needed
├── Changing key structure → full re-write of items
├── Changing relationship pattern (embed→reference) → data migration
└── Changing partitioning strategy → full re-partition

Migration approaches by database:

MongoDB migration:
├── Online: write new format alongside old, dual-read
├── Batch: script with cursor processing each document
├── Change stream: process in real-time via CDC
└── Approaches: lazy migration (on read), batch migration, zero-downtime

Cassandra migration (keyspace change):
├── Create new table with updated schema
├── Dual-write to old and new tables
├── Backfill new table from old table (Spark job)
├── Verify consistency between old and new
├── Switch reads to new table
├── Drop old table
└── Complexity: HIGH (Cassandra schema changes are restrictive)

DynamoDB migration:
├── Create new table with updated key structure
├── Export old table to S3 (via DynamoDB export to S3)
├── Transform data (Athena, EMR, Lambda)
├── Import into new table (S3 import to DynamoDB)
├── Dual-write or cutover
└── Complexity: MEDIUM (no downtime export/import available)
```

## Conclusion

NoSQL data modeling requires a fundamental mindset shift from relational design:

1. **Query-first**: Design schema around specific access patterns, not entity relationships
2. **Denormalize**: Accept redundancy for read performance. Computed fields, duplicated attributes.
3. **Key design is critical**: Partition key determines scalability. Sort key determines query capability.
4. **Size matters**: Partition size, document size, item size all have limits. Plan accordingly.
5. **One table per pattern** (Cassandra) or **single-table design** (DynamoDB): Both avoid joins.
6. **Embed vs reference**: Embed for contained, always-with-parent data. Reference for shared or unbounded.
7. **Consistency trade-offs**: Eventual consistency enables scale. Strong consistency limits throughput.
8. **Schema evolution**: Design for change. Lazy migration, new fields, versioned schemas.
9. **Write amplification**: Denormalization, indexes, and GSIs all increase write cost.
10. **Test at scale**: 1000 rows works with any design. 100M rows reveals design flaws.

## References

- MongoDB Data Modeling: `mongodb.com/docs/manual/core/data-modeling-introduction`
- MongoDB Schema Design Anti-Patterns: `mongodb.com/blog/post/building-with-patterns-a-summary`
- Cassandra Data Modeling: `cassandra.apache.org/doc/latest/cassandra/data_modeling`
- DynamoDB Single-Table Design: `docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html`
- DynamoDB Advanced Design Patterns: `aws.amazon.com/blogs/database/how-to-use-single-table-design-with-dynamodb`
- NoSQL Distilled (Martin Fowler): Data modeling patterns book
- AWS re:Invent 2022: DynamoDB Advanced Design Patterns (DAT403)
- Cassandra Time Series Data Modeling: `datastax.com/blog/time-series-data-modeling-cassandra`
