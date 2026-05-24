# Document Database Reference

## MongoDB Schema Design

### Embedding vs Referencing

```javascript
// Embedding: embed sub-documents for contained data accessed together
{
  _id: "order:123",
  customer: { id: "cust:456", name: "Acme", email: "acme@co" },
  items: [
    { product_id: "p:1", name: "Widget", qty: 2, price: 10.00 },
    { product_id: "p:2", name: "Gadget", qty: 1, price: 25.00 }
  ],
  total: 45.00,
  created_at: ISODate("2026-05-01T12:00:00Z")
}

// Referencing: use ObjectId references for shared/sparse data
{
  _id: ObjectId("..."),
  customer_id: ObjectId("..."),
  product_ids: [ObjectId("..."), ObjectId("...")],
  total: 45.00
}
```

Embed when: data is accessed together, has one-to-one or one-to-few cardinality, updates are atomic within the document. Reference when: data is shared across documents, has one-to-many or many-to-many cardinality, sub-document grows unbounded.

### Schema Design Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Single collection | All documents in one collection | Small datasets, simple queries |
| Bucket pattern | Group time-series into buckets | IoT, sensor readings |
| Operational pattern | Pre-compute aggregates | Dashboards, reporting |
| Polymorphic pattern | Documents with varying fields | Product catalog with different types |
| Extended reference | Store frequently accessed related data | Customer name in orders |

## Aggregation Pipeline

### Pipeline Stages

```javascript
db.orders.aggregate([
  { $match: { status: "completed", created_at: { $gte: ISODate("2026-01-01") } } },
  { $lookup: { from: "customers", localField: "customer_id", foreignField: "_id", as: "customer" } },
  { $unwind: "$customer" },
  { $group: {
    _id: { region: "$customer.region", month: { $dateToString: { format: "%Y-%m", date: "$created_at" } } },
    total_revenue: { $sum: "$total" },
    order_count: { $sum: 1 },
    avg_order_value: { $avg: "$total" }
  }},
  { $sort: { "_id.month": -1, total_revenue: -1 } },
  { $out: "monthly_region_summary" }
])
```

### Performance Rules

- Place `$match` and `$limit` as early as possible
- Use indexes for `$match` filter fields and `$sort` fields
- Avoid `$unwind` on large arrays (use `$lookup` with pipeline)
- Prefer `$lookup` with `pipeline` for filtered joins
- Use `allowDiskUse(true)` for memory-intensive sorts/group by
- Target sub-100ms aggregation for user-facing queries

## Indexing Strategy

```javascript
// Single field
db.orders.createIndex({ status: 1 })

// Compound (ESR rule: Equality, Sort, Range)
db.orders.createIndex({ status: 1, created_at: -1, total: 1 })

// Multikey (array field)
db.products.createIndex({ tags: 1 })

// Partial index (smaller, faster)
db.orders.createIndex(
  { status: 1, created_at: -1 },
  { partialFilterExpression: { status: "pending" } }
)

// TTL index (auto-expire)
db.sessions.createIndex(
  { last_accessed: 1 },
  { expireAfterSeconds: 86400 }
)

// Hashed index (for sharding)
db.events.createIndex({ user_id: "hashed" })
```

## Sharding

### Shard Key Selection

```javascript
// Hashed shard key for even distribution
sh.shardCollection("shop.orders", { order_id: "hashed" })

// Ranged shard key for query isolation
sh.shardCollection("analytics.events", { region: 1, timestamp: -1 })

// Compound shard key for balanced distribution + query support
sh.shardCollection("shop.orders", { customer_id: 1, created_at: -1 })
```

Good shard keys: high cardinality, even distribution, support common query patterns. Bad shard keys: monotonically increasing (all writes to one shard), low cardinality (jumbo chunks), static values (no distribution).

### Zone Sharding

```javascript
// Tag shards by region
sh.addShardTag("shard01", "US")
sh.addShardTag("shard02", "EU")

// Define zone range
sh.updateZoneKeyRange(
  "shop.orders",
  { region: "US" },
  { region: "US" },
  "US"
)
```

## Rules
- Embed for contained sub-documents accessed together
- Reference for shared entities or unbounded arrays
- Use ESR rule for compound index ordering
- Partial indexes for filtered queries (smaller index size)
- Hashed shard keys for time-series workloads
- Avoid unbounded array growth in documents
- Prefer `$lookup` with pipeline for filtered joins
- Use allowDiskUse for large aggregations
- Set TTL indexes for expiring data
- Monitor chunk distribution across shards
