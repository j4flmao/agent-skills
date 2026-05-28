# NoSQL Query Optimization and Indexing

## Overview

Query optimization in NoSQL databases requires understanding how each database engine processes queries, the index structures it supports, and the physical data layout. Unlike relational databases where the optimizer chooses execution plans, NoSQL query performance depends almost entirely on schema design and index selection. This reference covers indexing strategies, query optimization patterns, performance monitoring, and query tuning for MongoDB, DynamoDB, and Cassandra.

## MongoDB Query Optimization

### Index Types

```
MongoDB index types:

1. Single-field index (B-tree)
├── Most common index type
├── Ascending (1) or descending (-1)
├── Supports: equality, range, sort
├── db.collection.createIndex({ field: 1 })
└── Use: primary query filter field

2. Compound index
├── Multiple fields in order of query selectivity
├── db.collection.createIndex({ a: 1, b: -1, c: 1 })
├── Supports prefix queries: a, a+b, a+b+c
├── Does NOT support non-prefix: b, c, b+c
├── Sort direction matters for multi-field sorts
└── Rule: equality fields first, sort fields next, range fields last

3. Multikey index
├── On array fields
├── db.collection.createIndex({ tags: 1 })
├── Each array element gets an index entry
├── Maximum index entry size: 1024 bytes
├── Compound multikey: only one array field per compound index
└── Use: filtering on array contents

4. Text index
├── Full-text search on string content
├── db.collection.createIndex({ content: "text", title: "text" })
├── Supports: $text query, stemming, stop words
├── Weights for relevance scoring
└── Use: search functionality (consider dedicated search engine for scale)

5. Geospatial index
├── 2dsphere for GeoJSON coordinates
├── 2d for legacy coordinates
├── db.collection.createIndex({ location: "2dsphere" })
├── Supports: $near, $geoWithin, $geoIntersects
└── Use: location-based queries

6. Hashed index
├── Hash of field value, even distribution
├── db.collection.createIndex({ shard_key: "hashed" })
├── Only supports equality queries (no range, no sort)
└── Use: shard key for time-series data

7. Wildcard index
├── Indexes all fields or matching pattern
├── db.collection.createIndex({ "$**": 1 })
├── db.collection.createIndex({ "metadata.$**": 1 })
├── Supports fields with unknown or dynamic names
└── Use: polymorphic schemas, legacy data with varying fields

8. Partial index
├── Only indexes documents matching filter
├── db.collection.createIndex(
│     { status: 1, created_at: -1 },
│     { partialFilterExpression: { status: { $ne: "archived" } } }
│   )
├── Smaller index, faster writes, smaller memory footprint
└── Use: filter out inactive/unwanted documents from index

9. TTL index
├── Automatically deletes documents after TTL
├── db.collection.createIndex({ created_at: 1 }, { expireAfterSeconds: 86400 })
├── Background cleanup job runs every 60 seconds
└── Use: session expiration, event retention, log cleanup
```

### Index Selection and Design

```
Equality-Sort-Range (ESR) rule:

Order index fields by: Equality fields → Sort fields → Range fields

Example query:
db.orders.find({
    status: "shipped",           // Equality
    customer_id: "CUST-123"      // Equality
}).sort({
    shipped_date: -1              // Sort
}).limit(20);

Index: { status: 1, customer_id: 1, shipped_date: -1 }

Example query with range:
db.orders.find({
    status: "shipped",           // Equality
    shipped_date: {              // Range
        $gte: ISODate("2025-01-01"),
        $lt: ISODate("2025-04-01")
    }
}).sort({
    shipped_date: 1              // Sort
});

Index: { status: 1, shipped_date: 1 }

Why ESR works:
├── Equality fields first: narrow to matching documents
├── Sort field next: index already sorted, no in-memory sort
├── Range field last: index range scan on final field
└── Avoid: range field before sort field → in-memory sort

Index intersection:
├── MongoDB can use multiple indexes per query
├── db.orders.find({ status: "shipped", total: { $gt: 100 } })
├── Uses: index on status + index on total
├── Intersection in memory (expensive for large result sets)
└── Prefer: compound index over intersection

Covered queries:
├── All required fields in the index
├── Query reads only from index, never touches documents
├── db.orders.find(
│       { status: "shipped" },
│       { _id: 0, order_id: 1, total: 1 }
│   ).hint({ status: 1, order_id: 1, total: 1 })
├── Huge performance win (reduced IO, no document fetch)
└── Use projection to include only indexed fields
```

### Query Profiling

```
MongoDB profiler levels:
├── level 0: Off (default)
├── level 1: Logs slow operations (> slowms threshold, default 100ms)
└── level 2: Logs all operations (use sparingly in production)

Enable profiling:
db.setProfilingLevel(1, { slowms: 50 })  # Log ops > 50ms
db.setProfilingLevel(2)                    # Log all ops

View slow queries:
db.system.profile.find({
    op: { $in: ["query", "command"] },
    millis: { $gt: 100 }
}).sort({ ts: -1 }).limit(10);

Profiler output analysis:
{
    "op": "query",
    "ns": "shop.orders",
    "command": {
        "find": "orders",
        "filter": { "status": "shipped" },
        "sort": { "created_at": -1 },
        "limit": 20
    },
    "keysExamined": 50000,
    "docsExamined": 50000,
    "nreturned": 20,
    "millis": 1200,
    "planSummary": "COLLSCAN",     // ← Problem: full collection scan
    "execStats": {
        "stage": "COLLSCAN",
        "direction": "forward",
        "docsExamined": 50000
    }
}

Red flags:
├── planSummary: COLLSCAN (%90 of slow queries)
├── keysExamined >> nreturned (poor index selectivity)
├── docsExamined >> nreturned (covered query opportunity)
├── millis > 100 (user-perceptible latency)
└── SORT stage without index (in-memory sort for large sets)

Profiling best practices:
├── Set slowms to 50-100ms in production
├── Enable profiler on replica set secondary nodes (read load)
├── Export profiler data to monitoring system (MongoDB Atlas, Datadog)
├── Correlate slow queries with CPU/memory spikes
└── Set alerts on P95 query latency > 100ms
```

### Aggregation Pipeline Optimization

```
Aggregation pipeline optimization rules:

Rule 1: $match early
├── First stage should be $match to filter documents
├── Reduces documents flowing into subsequent stages
├── Use indexed fields in $match for maximum benefit
├── MongoDB can use index for $match even if it's not first
└── Bad: $group → $match → $sort. Good: $match → $group → $sort

Rule 2: $project early and often
├── Remove unnecessary fields early in pipeline
├── Reduces memory per document in pipeline
├── Use $project before $group to minimize group memory
└── Bad: $group on all fields. Good: $project → $group

Rule 3: $sort after $match
├── $sort with $match at start can use index
├── db.orders.createIndex({ status: 1, created_at: -1 })
├── {$match: {status: "shipped"}} → {$sort: {created_at: -1}}
├── SORT stage uses index, no in-memory sort
└── Without index: 100MB sort buffer limit

Rule 4: $lookup on indexed foreign field
├── db.foreignCollection.createIndex({ foreignField: 1 })
├── $lookup does one query per document in pipeline
├── Without index: table scan per document (disaster)
├── With index: fast lookup per document
└── Rule of thumb: 1 $lookup per pipeline max

Rule 5: $unwind after $match
├── $unwind multiplies documents (1 → N)
├── Filter before unwind to reduce explosion
├── $match before $unwind: 100 docs → [unwind 10 each] → 1000 docs
├── $unwind first: 100 docs → [unwind 5 each] → 500 docs
└── $match on array: { tags: "urgent" } before $unwind

Rule 6: allowDiskUse for large aggregations
├── 100MB memory limit per pipeline stage
├── db.orders.aggregate(pipeline, { allowDiskUse: true })
├── Spills to temp files when exceeding memory
├── Slower but prevents out-of-memory errors
└── Monitor: aggregation.stageSpillToDisk rate

Aggregation stage memory limits:

Stage               │ Memory Limit    │ Spill to Disk
──────────────────────────────────────────────────────────
$sort               │ 100MB           │ allowDiskUse
$group              │ 100MB           │ allowDiskUse
$lookup             │ 100MB           │ No
$facet              │ 100MB total     │ allowDiskUse
$bucket             │ 100MB           │ allowDiskUse
$bucketAuto         │ 100MB           │ allowDiskUse
$addFields          │ 100MB           │ No (pipeline limit)
$project            │ 100MB           │ No (pipeline limit)
$unwind             │ No limit        │ Streams to disk

Explain aggregation plan:
db.orders.explain("executionStats").aggregate([
    { $match: { status: "shipped" } },
    { $group: { _id: "$customer_id", count: { $sum: 1 } } }
]);

Look for:
├── IXSCAN (index scan) instead of COLLSCAN
├── FETCH stage after IXSCAN (non-covered query)
├── SORT stage without SORT_KEY_GENERATOR (index sort)
├── stage: "GROUP" memory usage
└── nReturned << totalDocsExamined
```

### Performance Monitoring

```
MongoDB metrics to monitor:

Operation counters:
├── db.serverStatus().opcounters
├── Query, Insert, Update, Delete, GetMore, Command
├── Per-second rates (derived from counter deltas)
└── Alert on: command rate spike > 2x baseline

Query latency:
├── db.serverStatus().opLatencies
├── Reads: p50, p99 latency
├── Writes: p50, p99 latency
├── Commands: p50, p99 latency
└── Alert on: p99 reads > 100ms, p99 writes > 50ms

Connections:
├── db.serverStatus().connections
├── current, available, totalCreated
├── Default: 65536 max connections
└── Alert on: current > 80% of max

WiredTiger cache:
├── db.serverStatus().wiredTiger.cache
├── Cache hit ratio: target > 95%
├── Cache dirty bytes: < 20% of total cache
├── Cache page evictions: should be minimal
└── Alert on: cache hit ratio < 90%, evictions > 100/sec

Index usage:
├── db.collection.aggregate([
│       { $indexStats: {} }
│   ])
├── Accesses: number of operations using index
├── Since: timestamp of last stats reset
├── Ops: operations count
└── Identify: unused indexes (0 accesses) → drop them

Key metrics dashboard:
┌──────────────────────────────────────────────────────────┐
│ Active Queries    │ Connected Clients  │ Cache Hit Ratio │
│ 12 ops/sec        │ 42                 │ 97.3%           │
├──────────────────────────────────────────────────────────┤
│ P99 Read Latency  │ P99 Write Latency │ Page Faults/sec │
│ 45ms              │ 22ms              │ 2.1              │
├──────────────────────────────────────────────────────────┤
│ Open Cursors      │ Index Size         │ Data Size       │
│ 145               │ 1.2GB              │ 8.7GB           │
├──────────────────────────────────────────────────────────┤
│ Network In        │ Network Out        │ Disk Utilization│
│ 15MB/s            │ 120MB/s            │ 42%             │
└──────────────────────────────────────────────────────────┘

Replica set monitoring:
├── Replication lag: target < 2s
├── Oplog window: target > 24h
├── Secondary connection count: healthy secondaries
└── Alert on: replication lag > 10s, oplog window < 4h
```

## DynamoDB Query Optimization

### Read/Write Capacity

```
Capacity modes:

Provisioned:
├── Reads: RCU (Read Capacity Units)
├── Writes: WCU (Write Capacity Units)
├── 1 RCU = 1 strongly consistent read/sec of 4KB item
├── 1 RCU = 2 eventually consistent reads/sec of 4KB item
├── 1 WCU = 1 write/sec of 1KB item
├── Auto-scaling: Target utilization 70%, scale in/out
└── Cost: lower than on-demand for predictable workloads

On-demand:
├── Pay per request (no capacity planning)
├── Scales instantly to any traffic level
├── 2.5x more expensive than provisioned for steady workloads
└── Best for: unpredictable traffic, new applications

Capacity calculation:
├── Single item: 400 bytes → 1 RCU (rounded up to 4KB)
├── Single item: 5KB → 2 RCU (5KB / 4KB = 1.25, rounded up to 2)
├── Query returning 10 items of 2KB each → 20KB total
│   ├── Eventually consistent: 20KB / 8KB = 2.5 → 3 RCU
│   └── Strongly consistent: 20KB / 4KB = 5 → 5 RCU
├── Single write: 500 bytes → 1 WCU (rounded up to 1KB)
├── Single write: 2.5KB → 3 WCU (rounded up to 3KB)
└── Transaction write: 2x WCU per item

Capacity monitoring:
├── CloudWatch: ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits
├── ThrottledRequests: count of throttled operations
├── ReadThrottleEvents, WriteThrottleEvents
├── Alert on: throttled requests > 0 per minute
└── BurstCapacityRemaining: percentage of burst balance

Envelope the read to estimate read capacity
├── For Q item response, estimate total read size:
├── RCU = ceil(total_read_size_bytes / 4096)
├── Half for eventually consistent
└── Use GetItem for single item (most efficient)
```

### Query vs Scan

```
Query operations (preferred):
├── Operates on items with same partition key
├── Can filter on sort key (equality, range, begins_with, etc.)
├── Can limit number of items returned
├── Can paginate via LastEvaluatedKey
├── Efficient: only reads items in the partition
├── 1MB max response per query
└── Always prefer Query over Scan

Scan operations (avoid if possible):
├── Reads every item in the table
├── Crosses all partitions sequentially
├── Expensive: consumes RCU for every item read
├── Use ONLY when:
│   ├── No other access pattern available
│   ├── Exporting entire dataset
│   ├── Ad-hoc analytics (set limit!)
│   └── Table size is small (< 100 items)
├── Mitigate: use Limit parameter, parallel scan
└── Memory: scan result limited to 1MB

Best practice: never Scan a table > 100 items in production.
Use GSIs to create alternative access patterns instead.

Query optimization tips:
├── Use KeyConditionExpression (not FilterExpression for data reduction)
│   ├── KeyConditionExpression reduces items read (RCU saved)
│   └── FilterExpression reduces items returned (no RCU saved)
├── ProjectionExpression: return only needed attributes
├── Limit: restrict items per query page
├── ConsistentRead: use only when needed (2x RCU cost)
├── ReturnConsumedCapacity: monitor consumed capacity
└── Use pagination with LastEvaluatedKey for large results

Example: optimize query with projection
# Bad (reads entire item, then filters client-side)
response = table.query(
    KeyConditionExpression=Key('pk').eq('CUST#123'),
    FilterExpression=Attr('entity_type').eq('order')
)

# Good (uses SK structure to filter at storage level)
response = table.query(
    KeyConditionExpression=
        Key('pk').eq('CUST#123') &
        Key('sk').begins_with('ORDER#'),
    ProjectionExpression='order_id, total, status, created_at',
    Limit=20
)
```

### GSI Optimization

```
GSI design for query performance:

1. Sparse GSI
├── Only items with GSI attributes are indexed
├── Smaller index → fewer RCU needed for queries
├── Example: status field → only items with status attribute
├── GSI on status: orders, not products or customers
└── Smaller index cost, faster queries

2. GSI overloading
├── Same GSI partition key for multiple entity types
├── GSI1PK = entity_type (for listing by type)
├── GSI2PK = "STATUS#" + status (for listing by status)
├── GSI3PK = "CATEGORY#" + category (for product browsing)
└── Reuses GSI slots efficiently (max 20 GSIs)

3. GSI projected attributes
├── KEYS_ONLY: only PK/SK from base table + GSI keys
├── INCLUDE: specific attributes in index
│   ├── Smaller index, lower write cost
│   └── Only include frequently queried attributes
├── ALL: all base table attributes
│   ├── Largest index, highest write cost
│   └── No need for Fetch (read directly from GSI)
└── Choose: INCLUDE with attribute list for 80% use case

4. GSI writes
├── Each GSI write consumes 1 WCU from GSI's capacity
├── GSI writes are asynchronous (eventually consistent)
├── Write throughput to GSI partition is shared with base table
├── Hot GSI partition: if GSI PK has low cardinality
└── Example: status field with only 5 values → hot GSI partition

5. GSI query vs base table query
├── Base table query: strongly consistent (if requested)
├── GSI query: eventually consistent only
├── GSI write propagation delay: typically < 1 second
├── Read-your-writes: not guaranteed on GSI
└── For strong consistency: query base table, even if slower

GSI write amplification costs:
A single base table write triggers writes to:
├── Base table: 1 WCU
├── GSI1: 1 WCU (if GSI key changed)
├── GSI2: 1 WCU (if GSI key changed)
└── GSI3: 1 WCU (if GSI key changed)

With 3 GSIs → 1 write = up to 4 WCU cost (base + 3 GSIs)
With on-demand capacity: no concern (auto-scales)
With provisioned capacity: must provision for worst case
```

### Hot Partition Mitigation

```
Hot partition causes:
├── Uneven partition key distribution
├── One customer with 100x more data than average
├── Time-series data with monotonically increasing partition key
├── GSI with low cardinality partition key
└── Burst traffic pattern (flash sale, event)

Detection:
├── CloudWatch: ConsumedReadCapacityUnits per partition
├── CloudWatch: SystemErrors (throttling from hot partition)
├── DynamoDB API: DescribeTable returns ItemCount per partition distribution
└── Monitor: WriteThrottleEvents on any partition

Mitigation strategies:

1. Adaptive capacity (automatic)
├── DynamoDB automatically rebalances partitions
├── Hot partition gets more throughput
├── Available for: on-demand mode, auto-scaling provisioned
├── No action needed
└── Latency: rebalancing takes 5-30 minutes

2. Write sharding
├── Add a random suffix to partition key
├── Distributes writes across N partitions
├── On read: query all N suffixes, merge results
├── Complexity: application-level logic
└── Good for: customer with 10x traffic (suffix = 1-10)

Write sharding example:
# Write: distribute across suffixes
suffix = random.randint(1, 10)
pk = f"CUST#{customer_id}#{suffix}"

# Read: query all suffixes in parallel
for suffix in range(1, 11):
    pk = f"CUST#{customer_id}#{suffix}"
    tasks.append(query_table(pk, sk_prefix))

3. Composite key design
├── Break hot partition into multiple partitions
├── Add a second dimension to partition key
├── Example: instead of PK = customer_id
│   Use: PK = customer_id + year_month
├── Reads: query across multiple months then merge
└── Good for: time-series data with hot current month

4. GSI partition distribution
├── Avoid GSI partition key with < 100 values
├── Use composite GSI keys for even distribution
├── Example: instead of PK = status (5 values)
│   Use: PK = status + date_bucket (100s of values)
├── Query: specify status + date range
└── Good for: status-based queries with data distribution
```

### DynamoDB Accelerator (DAX)

```
DAX is an in-memory cache for DynamoDB:

When to use DAX:
├── Read-heavy workloads (95%+ reads)
├── Sub-millisecond read latency required
├── Eventually consistent reads acceptable
├── High read volume repetitive queries
└── Hot item patterns (same items read frequently)

When NOT to use DAX:
├── Write-heavy workloads
├── Strongly consistent reads required (DAX is eventually consistent)
├── Infrequently accessed data
├── Items change very frequently (cache thrashing)
└── Low query volume (DynamoDB direct is fast enough)

DAX performance:
├── Read latency: microseconds to ~1ms
├── DynamoDB direct latency: 5-20ms
├── Cache hit ratio target: > 90%
├── Throughput: millions of requests per minute per cluster
└── Cluster size: 1-10 nodes

DAX pricing:
├── t3.small ~ $0.05/hr/node
├── r5.large ~ $0.25/hr/node
├── 3-node cluster r5.large: ~ $540/month
└── Break-even: 40% reduction in DynamoDB RCU

DAX cache management:
├── TTL: default 5 minutes (configurable)
├── Item cache: stores individual items
├── Query cache: stores query results
├── Invalidation: on write to DynamoDB (DAX intercepts)
├── Cache warming: pre-load common items after deployment
└── Monitoring: CacheHitCount, CacheMissCount, ItemCacheHits

DAX example configuration:
# Create DAX cluster
aws dax create-cluster \
    --cluster-name my-dax \
    --node-type r5.large \
    --replication-factor 3 \
    --iam-role-arn arn:aws:iam::123456:role/DAXServiceRole

# Use DAX client
from dax import DAXClient
dax_client = DAXClient(
    session=boto3.Session(),
    dax_endpoint="my-dax.cluster.region.dax.amazonaws.com:8111"
)
dax_table = dax_client.Table('orders')
response = dax_table.get_item(Key={'pk': 'CUST#123', 'sk': 'CUSTOMER#META'})
```

## Cassandra Query Optimization

### Read Path

```
Cassandra read path:

1. Read request arrives at coordinator node
2. Coordinator determines which replicas have the data
3. Read repair chance: coordinator checks consistency of replicas
4. For each partition:
   ├── Check row cache (if enabled, useful for hot partitions)
   ├── Check partition key cache (disk location of partition)
   ├── Check compression offset map
   ├── Read SSTable bloom filter (quick exclusion)
   ├── Read SSTable partition key cache
   ├── Read SSTable summary (partition range index)
   ├── Read SSTable index (exact partition location)
   └── Read SSTable data (the actual rows)
5. Merge results from multiple SSTables
6. Apply row-level tombstone removal
7. Return results to coordinator

Read optimization levels:

├── Level 1: Row cache hit (fastest, microseconds)
│   ├── Entire row in memory
│   └── Only for frequently accessed hot partitions
├── Level 2: Partition key cache hit (fast, microseconds)
│   ├── Disk offset known, single SSTable read
│   └── Enable with: partition_key_cache_size_in_mb
├── Level 3: Bloom filter pass + key cache miss (moderate)
│   ├── Must read SSTable index to find partition
│   └── Multiple SSTables may need reading
├── Level 4: Full SSTable scan (slow, milliseconds)
│   ├── Bloom filter doesn't eliminate any SSTable
│   └── Reads multiple SSTable indexes
└── Level 5: Multi-partition query + merge (slowest)
    ├── Cross-partition query (avoid!)
    └── Coordinator merges results from multiple nodes

Read consistency levels:
├── ONE: fastest, read from nearest replica
├── LOCAL_ONE: read from local DC replica
├── QUORUM: read from majority (strong consistency)
├── LOCAL_QUORUM: read from local DC majority
├── ALL: read from all replicas (slowest, strongest)
└── Choose: LOCAL_QUORUM for strong reads, LOCAL_ONE for eventual
```

### Write Path

```
Cassandra write path:

1. Write request arrives at coordinator
2. Coordinator writes to commit log (durability)
3. Coordinator writes to memtable (in-memory sorted structure)
4. Coordinator responds to client (acknowledged) ← fast path
5. Memtable fills up → flushed to SSTable on disk
6. SSTables accumulate → compaction merges them

Write optimization levels:

Writes are always fast in Cassandra:
├── No reads required before writes (no read-before-write)
├── Only append operations (no in-place updates)
├── Commit log is sequential append (very fast)
├── Memtable write is in-memory (very fast)
└── Typical write latency: 0.1-1ms per node

Write consistency levels:
├── ANY: fastest, written to coordinator only (risk of loss)
├── ONE: written to one replica
├── LOCAL_ONE: written to one local DC replica
├── QUORUM: written to majority of replicas
├── EACH_QUORUM: written to majority in each DC
├── ALL: written to all replicas (slowest, safest)
└── Choose: LOCAL_QUORUM for durability, LOCAL_ONE for speed

Write anti-patterns:
├── Read-before-write: "if not exists then insert"
│   ├── Requires a read before write
│   ├── Much slower than blind write
│   └── Use: LWT (lightweight transactions) with IF NOT EXISTS
├── Batch with different partition keys
│   ├── Coordinator must coordinate across nodes
│   ├── High latency, high coordinator load
│   └── Only batch same-partition operations
├── Frequent updates to same row
│   └── Creates many tombstones (read overhead)
```
```

### Compaction Strategies

```
Compaction merges SSTables, removes tombstones, reclaims space:

1. SizeTieredCompactionStrategy (STCS) - default
├── Triggers when N SSTables of similar size exist
├── Merges similarly sized SSTables into one
├── Write amplification: 5-10x
├── Space amplification: 10-50% extra disk
├── Best for: write-heavy workloads, any data type
├── Drawback: can have up to 50+ SSTables per partition
└── Read amplification: high (many SSTables to merge on read)

2. LeveledCompactionStrategy (LCS)
├── Organizes SSTables into levels (L0, L1, L2, ...)
├── L0: up to 4 SSTables (minor compaction)
├── L1: 10 SSTables of 160MB each
├── L2: 100 SSTables of 160MB each
├── Write amplification: 10-20x (higher than STCS)
├── Space amplification: 10% (better than STCS)
├── Read amplification: low (1-2 SSTables per partition)
├── Best for: read-heavy workloads
├── Drawback: higher write amplification, more CPU
└── Good for: order by status queries, where reads dominate

3. TimeWindowCompactionStrategy (TWCS) - recommended for TS
├── Groups SSTables by time window (hour, day, month)
├── Each window's SSTables compacted into one
├── New window gets all writes (no mixing old/new data)
├── Write amplification: lowest (1-2x)
├── Space amplification: very low
├── Read amplification: low (1-2 SSTables per partition)
├── Best for: time-series data
└── TTL: automatic expiration per window

Compaction strategy selection matrix:

Workload Type       │ STCS    │ LCS    │ TWCS
─────────────────────────────────────────────────
Write-heavy         │ Best    │ OK     │ Time-series only
Read-heavy          │ OK      │ Best   │ Time-series only
Time-series         │ Avoid   │ Avoid  │ Best
Mixed (RW)          │ Good    │ Good   │ Time-series only
Frequent deletes    │ Good    │ OK     │ OK (with TTL)
Intermittent writes │ Good    │ OK     │ OK (with timeout)

Configuration example:
CREATE TABLE sensor_readings (
    sensor_id TEXT,
    day TEXT,
    hour TEXT,
    ts TIMESTAMP,
    value DOUBLE,
    PRIMARY KEY ((sensor_id, day, hour), ts)
) WITH CLUSTERING ORDER BY (ts DESC)
  AND compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'HOURS',
    'compaction_window_purge': 3600
  }
  AND default_time_to_live = 2592000;  -- 30 days

Manual compaction operations:
├── nodetool compact <keyspace> <table>  -- force compaction
├── nodetool cleanup                      -- remove stale data
├── nodetool scrub                        -- repair corrupted SSTables
├── nodetool upgradeSSTable               -- upgrade to current version
├── Monitor: PendingCompaction (should stay near 0)
└── Schedule: maintenance window for compaction-heavy operations
```

### Tombstone Management

```
Tombstones are markers for deleted data:

Why tombstones exist:
├── Cassandra is an append-only system
├── Deletes create tombstone entries
├── TTL expiration creates tombstone entries
├── Updates create new column versions (old versions become tombstones)
└── Compaction eventually removes tombstones

Tombstone problems:
├── Read overhead: coordinator must skip tombstones during read
├── Memory: tombstones held in memory during read
├── Query timeout: > 100K tombstones per query triggers timeout
├── Aborted queries: "Cannot achieve consistency level" due to tombstone overload
└── Disk waste: tombstones occupy disk space until compaction

Tombstone thresholds (cassandra.yaml):
├── tombstone_warn_threshold: 1000 (log warning)
├── tombstone_failure_threshold: 100000 (abort query, return error)
└── Monitor: TombstoneScannedHistograms in query tracing

Tombstone monitoring:
# Check tombstone count per table
nodetool tablestats <keyspace>.<table>
Look for: "SSTables per read" and "Tombstones per read"

# Trace query tombstone behavior
cqlsh> TRACING ON;
cqlsh> SELECT * FROM orders WHERE customer_id='CUST-123';
Look for: "Scanned 50000 tombstones" in trace output

Tombstone mitigation:

1. Use TTL instead of explicit deletes
├── Automatically marks as expired after TTL
├── No explicit DELETE call needed
├── Still creates tombstone at TTL expiry
└── Better than unbounded data with DELETE

2. TWCS compaction with purge
├── compaction_window_purge: seconds to keep tombstones
├── Set slightly longer than read time for that window
├── Tombstones from old windows purged aggressively
└── Good for time-series where old data doesn't need deletes

3. Avoid anti-pattern: UPDATE same column frequently
├── Each UPDATE creates new column + tombstone for old
├── Read must skip old tombstones
└── Instead: use list/set append, or design to avoid updates

4. Avoid anti-pattern: null inserts (INSERT with null values)
├── Creates tombstone for null column
├── Better to omit column entirely
└── Cassandra doesn't store nulls

5. Run compaction on tables with high tombstone count
nodetool compact <keyspace> <table>

6. Tombstone-aware query design
├── Add time-bounded filters to skip expired partitions
├── WHERE day='2025-03-15' AND ts > '2025-03-15T12:00:00Z'
├── Avoid: full partition scans on tables with TTL
└── Use: clustering key filters that exclude old data
```

### Query Tracing and Monitoring

```
Cassandra query tracing:

Enable tracing:
cqlsh> TRACING ON;
cqlsh> SELECT * FROM orders_by_customer WHERE customer_id='CUST-123';

Trace output:
Tracing session: abc123
Activity                                                      | Timestamp    | Source
Coordinator activates query                                   | 11:00:00.001 | node-1
Executing single-partition query on orders_by_customer        | 11:00:00.002 | node-1
Acquiring sstable references                                  | 11:00:00.003 | node-1
Skipped 10/12 SSTables based on bloom filter                 | 11:00:00.004 | node-1  ← Good
Merging data from 2 memtables and 2 sstables                  | 11:00:00.005 | node-1  ← 4 sources
Read 0 live rows and 50000 tombstones                        | 11:00:00.100 | node-1  ← PROBLEM
Scanned 1 partition                                           | 11:00:00.101 | node-1
Request complete                                              | 11:00:00.102 | node-1

Red flags in trace:
├── Skipped 0/N SSTables based on bloom filter → bloom filter too small
├── Read N live rows and M tombstones → M >> N, tombstone problem
├── Scanned N partitions (N > 1) → cross-partition query
├── Read repair → old data being repaired (increased consistency)
└── Timeout errors → coordinator retried

nodetool commands for performance:
├── nodetool cfstats                        -- table-level metrics
├── nodetool tablestats                     -- same as cfstats
├── nodetool tpstats                        -- thread pool stats
├── nodetool proxyhistograms                -- coordinator latency
├── nodetool compactionstats                -- pending compaction
├── nodetool netstats                       -- network / streaming
├── nodetool gossipinfo                     -- cluster membership
├── nodetool info                            -- node health
└── nodetool status                         -- cluster state

Key metrics to monitor:
├── Read latency: p50 < 5ms, p99 < 50ms
├── Write latency: p50 < 2ms, p99 < 20ms
├── Pending compactions: target 0
├── SSTables per read: < 5 ideally
├── Tombstones per read: < 100 ideally
├── Cache hit ratio (key cache): > 90%
├── Gossip convergence: < 60s
└── Hinted handoff count: < 1000 per node
```

## Cross-Database Query Optimization Summary

### Optimization by Database

```
Optimization priorities by database:

MongoDB:
├── 1. Index all query patterns (ESR rule)
├── 2. Avoid COLLSCAN (use explain)
├── 3. Covered queries (all data in index)
├── 4. Aggregation: $match early, indexed $lookup
├── 5. WiredTiger cache hit ratio > 95%
├── 6. Monitor: slow query log, index usage stats
└── 7. Shard key: high cardinality, even distribution

DynamoDB:
├── 1. Single-table design with composite keys
├── 2. Query over Scan (always)
├── 3. GSI design: sparse, overloaded, projected
├── 4. Avoid hot partitions (write sharding, composite PK)
├── 5. RCU/WCU right-sizing (auto-scaling vs on-demand)
├── 6. DAX for read-heavy sub-millisecond needs
└── 7. Monitor: throttled requests, consumed capacity

Cassandra:
├── 1. One table per query pattern (no cross-partition queries)
├── 2. Partition key: even distribution, bounded size
├── 3. Compaction strategy: TWCS for time-series, LCS for read-heavy
├── 4. Tombstone management: TTL, sparse deletes, compaction
├── 5. Bloom filter sizing: 10-15% of memory
├── 6. Key cache sizing: 100-200MB
└── 7. Monitor: SSTables per read, tombstone scan rate
```

### Common Performance Anti-Patterns

```
MongoDB:
├── Missing indexes on query fields → COLLSCAN
├── Non-selective indexes (low cardinality) → many index scans
├── Large $lookup without index on foreign collection
├── $unwind on large arrays before filtering
├── In-memory sort on > 100MB of data
├── Sparse queries (returning most of collection)
└── Too many indexes (write performance impact)

DynamoDB:
├── Scan on production tables
├── Table per entity type (instead of single-table)
├── Hot partition from uneven key distribution
├── Over-provisioned or under-provisioned capacity
├── FilterExpression for data reduction (doesn't save RCU)
├── Strongly consistent reads when eventual would work
└── Item size > 4KB (disproportionate RCU consumption)

Cassandra:
├── Cross-partition queries (multiple partition keys in WHERE)
├── ALLOW FILTERING (full scan, extremely slow)
├── Batch with different partition keys
├── Read-before-write patterns (inefficient)
├── High tombstone count from frequent deletes/updates
├── Many SSTables per partition (compaction too infrequent)
└── Large partitions (> 100K rows or > 100MB)
```

## Conclusion

NoSQL query optimization is fundamentally about data modeling and index design:

1. **Index everything you query**: Every access pattern should have a covering index.
2. **Minimize scanned data**: Limit the number of documents/rows read per query.
3. **Design for single-partition queries**: Cross-partition reads are expensive in all NoSQL databases.
4. **Monitor query performance**: Explain plans, trace output, latency metrics.
5. **Avoid anti-patterns**: Full scans, cross-partition queries, tombstone buildup.
6. **Right-size capacity**: Under-provisioning causes throttling. Over-provisioning wastes money.
7. **Cache strategically**: Application cache, DAX, row cache — reduce read load.
8. **Test at scale**: Performance characteristics change dramatically at production data volumes.
9. **Compact regularly**: SSTable merge, tombstone cleanup, index rebuild.
10. **Iterate**: Schema design is never final. Measure, optimize, redesign.

## References

- MongoDB Indexing Strategies: `mongodb.com/docs/manual/indexes`
- MongoDB Explain Output: `mongodb.com/docs/manual/reference/explain-results`
- DynamoDB Query and Scan: `docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html`
- DynamoDB Best Practices: `docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html`
- Cassandra Read Path: `cassandra.apache.org/doc/latest/cassandra/architecture/reading.html`
- Cassandra Compaction: `cassandra.apache.org/doc/latest/cassandra/operating/compaction`
- NoSQL Performance Tuning: General performance tuning reference
- AWS re:Invent 2022: DynamoDB Deep Dive (DAT321)
