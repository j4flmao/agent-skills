# Graph Query Performance

## Overview

Graph query performance optimization focuses on reducing traversal cost through index utilization, query pattern optimization, caching, and platform-specific tuning. Unlike relational databases where join order matters, graph performance depends on traversal depth, cardinality estimation, and fan-out control.

## Cypher Query Optimization

### Execution Plan Analysis

Use PROFILE or EXPLAIN to understand query execution:

```cypher
// PROFILE executes the query and returns detailed metrics
PROFILE
MATCH (c:Customer {region: 'US'})
MATCH (c)-[:PURCHASED]->(o:Order)
WHERE o.total > 100
RETURN c.name, count(o) as order_count
ORDER BY order_count DESC
LIMIT 10;

// Output metrics to analyze:
// - db hits: total storage engine operations (minimize)
// - page cache hits/misses: memory efficiency
// - rows: cardinality at each operator
// - estimated rows: planner's cardinality estimate
```

Key metrics in PROFILE:

| Metric | Meaning | Target |
|---|---|---|
| db hits | Storage engine operations | Minimize |
| page cache hits | Cached data access | > 90% |
| estimated rows | Planner cardinality estimate | Close to actual |
| rows | Actual rows at operator | << 1M for OLTP |

### Index Utilization

```cypher
// Verify index usage
PROFILE
MATCH (c:Customer)
USING INDEX c:Customer(region)
WHERE c.region = 'US'
RETURN count(c);

// Force index usage when planner chooses wrong plan
MATCH (c:Customer)
USING INDEX c:Customer(region)
WHERE c.region = 'US'
MATCH (c)-[:PURCHASED]->(o:Order)
RETURN c.name, o.id;
```

### Pattern Optimization

#### Start with Most Selective Pattern

```cypher
// BAD: starts with high-cardinality pattern
MATCH (c:Customer)-[:PURCHASED]->(o:Order)-[:CONTAINS]->(p:Product)
WHERE p.sku = 'PRD-001'
RETURN c.name, o.id;

// GOOD: starts with most selective (product SKU)
MATCH (p:Product {sku: 'PRD-001'})
MATCH (p)<-[:CONTAINS]-(o:Order)<-[:PURCHASED]-(c:Customer)
RETURN c.name, o.id;
```

#### Early Filtering and LIMIT

```cypher
// BAD: filters after full traversal
MATCH (c:Customer)-[:PURCHASED]->(o:Order)
WHERE c.region = 'US'
RETURN c, o ORDER BY o.total DESC LIMIT 100;

// GOOD: filter early
MATCH (c:Customer {region: 'US'})
WITH c LIMIT 1000
MATCH (c)-[:PURCHASED]->(o:Order)
RETURN c.name, o.id, o.total
ORDER BY o.total DESC LIMIT 100;
```

#### Avoid Cartesian Products

```cypher
// BAD: implicit cartesian product
MATCH (c:Customer), (p:Product)
WHERE c.region = 'US' AND p.category = 'Electronics'
MATCH (c)-[:PURCHASED]->(:Order)-[:CONTAINS]->(p)
RETURN c.name, p.name;

// GOOD: explicit traversal
MATCH (c:Customer {region: 'US'})
MATCH (c)-[:PURCHASED]->(:Order)-[:CONTAINS]->(p:Product)
WHERE p.category = 'Electronics'
RETURN c.name, p.name;
```

### Variable Length Paths

```cypher
// Short variable-length paths (1-3 hops)
MATCH (c:Customer)-[:PURCHASED*1..3]->(p:Product)
RETURN c.name, collect(DISTINCT p.name);

// Deep paths may need upper bound
MATCH (c:Customer)-[:PURCHASED*1..5]->(p:Product)
RETURN c.name, count(DISTINCT p);

// Unbounded paths (use with extreme caution)
MATCH (c:Customer)-[:PURCHASED*]->(p:Product)  // No limit!
```

Variable-length path performance degrades exponentially with depth:
- 1 hop: O(fanout)
- 2 hops: O(fanout^2)
- 3 hops: O(fanout^3)
- n hops: O(fanout^n)

Always specify upper bound. For unbounded queries, use graph algorithms instead.

### Using WITH for Pipelining

```cypher
// WITH creates pipeline boundaries and reduces cardinality
MATCH (c:Customer {tier: 'premium'})
WITH c LIMIT 100
MATCH (c)-[:PURCHASED]->(o:Order)
WHERE o.created_at > date('2025-01-01')
WITH c, count(o) as orders
WHERE orders > 5
RETURN c.name, orders
ORDER BY orders DESC;
```

## Gremlin Traversal Optimization

### Traversal Steps

```groovy
// Profile in Gremlin
g.V().has('Customer', 'region', 'US').
  limit(100).
  out('PURCHASED').
  hasLabel('Order').
  has('total', gt(100)).
  values('id').profile()
```

### Key Optimizations

```groovy
// BAD: full scan
g.V().hasLabel('Customer').has('region', 'US')

// GOOD: use index
g.V().has('Customer', 'region', 'US')

// BAD: no limit before fan-out
g.V().has('Customer', 'region', 'US').
  out('PURCHASED')

// GOOD: limit before fan-out
g.V().has('Customer', 'region', 'US').
  limit(100).
  out('PURCHASED')

// BAD: unlabeled edge traversal
g.V().has('Customer', 'id', '123').
  out()  // traverses ALL outgoing edges

// GOOD: labeled edge traversal
g.V().has('Customer', 'id', '123').
  out('PURCHASED', 'REVIEWED')
```

### Barrier Steps

```groovy
// fold creates a barrier (materializes all results)
g.V().has('Customer', 'region', 'US').
  out('PURCHASED').
  fold().  // barrier: all orders in memory

// Use unfold to continue traversal after fold
g.V().has('Customer', 'region', 'US').
  out('PURCHASED').
  fold().
  unfold().
  count()
```

### Step Strategies

```groovy
// Use hasNext/reduce for existence checks
g.V().has('Customer', 'id', '123').
  out('PURCHASED').
  has('total', gt(1000)).
  hasNext()  // boolean, stops early

// Use coalesce for conditional traversal
g.V().has('Customer', 'id', '123').
  coalesce(
    out('PURCHASED').has('total', gt(1000)).limit(10),
    constant([])
  )

// Use sideEffect for non-blocking operations
g.V().has('Customer', 'id', '123').
  sideEffect(out('PURCHASED').count().store('count')).
  values('name')
```

## Neptune-Specific Optimization

### Neptune DFE Mode

Neptune's Data Format Efficiency (DFE) mode optimizes query execution by pushing computation closer to storage.

```java
// Enable DFE via query hint
// % neptune.dfe = true

// DFE-optimized query
g.withSideEffect("Neptune#useDFE", true).
  V().has("Customer", "region", "US").
  limit(100).
  out("PURCHASED").
  has("total", gt(100)).
  count()
```

### Neptune Query Hints

```java
// Force index usage
g.withSideEffect("Neptune#indexSelectivity", "1").
  V().has("Customer", "email", "alice@org.com")

// Control query timeout
g.withSideEffect("Neptune#queryTimeoutMillis", 30000).
  V().has("Customer", "region", "US").
  repeat(out("PURCHASED")).times(5)
```

### Neptune Streams

Neptune Streams capture all changes for CDC:

```java
// Enable streams on cluster
// Updates appear in the stream with commit timestamps
// Streams can be consumed via Lambda or Kinesis
```

## JanusGraph Optimization

### Storage Backend Selection

```yaml
# Cassandra: best for write-heavy, high availability
storage.backend: cassandra
storage.hostname: ["10.0.1.10", "10.0.1.11"]

# BerkeleyDB JE: best for single-server, simplicity
storage.backend: berkeleyje
storage.directory: /data/janusgraph

# ScyllaDB: best for high-throughput, Cassandra-compatible
storage.backend: scylla
storage.hostname: ["10.0.2.10", "10.0.2.11"]
```

### Index Configuration

```yaml
# Composite index (exact match)
index:
  search:
    backend: elasticsearch
    hostname: ["10.0.3.10", "10.0.3.11"]

# Mixed index (full-text, range)
index.search.backend: elasticsearch

# Vertex-centric index (for edge-heavy traversals)
schema.vertexcentric: true
```

### JanusGraph Configuration

```yaml
# ID block allocation
ids.block-size: 100000  # Adjust based on write rate

# Cache configuration
cache.db-cache: true
cache.db-cache-clean-wait: 20
cache.db-cache-time: 180000  # 3 minutes
cache.db-cache-size: 0.5  # 50% of heap

# Transaction
storage.lock.wait-time: 10000  # 10 seconds
tx.max-commit-time: 10000
```

## Indexing Strategies

### Neo4j Index Types

```cypher
// BTREE: exact lookups and range queries (default)
CREATE RANGE INDEX customer_region_idx FOR (c:Customer) ON (c.region);
CREATE RANGE INDEX order_date_idx FOR ()-[r:PURCHASED]-() ON (r.created_at);

// TEXT: string contains operations
CREATE TEXT INDEX customer_name_idx FOR (c:Customer) ON (c.name);

// POINT: spatial queries
CREATE POINT INDEX customer_location_idx FOR (c:Customer) ON (c.location);

// FULLTEXT: cross-label full-text search
CREATE FULLTEXT INDEX entity_search FOR (n:Customer|Product|Supplier)
    ON EACH [n.name, n.description];

// LOOKUP: index by label/relationship type (internal, auto-created)
```

### Composite Indexes

```cypher
// Single property
CREATE INDEX customer_email_idx FOR (c:Customer) ON (c.email);

// Composite properties
CREATE INDEX customer_region_tier_idx FOR (c:Customer)
    ON (c.region, c.tier);

// Index-backed constraints
CREATE CONSTRAINT unique_email FOR (c:Customer)
    REQUIRE c.email IS UNIQUE;
```

Composite index design rules:
- Leading column should be the most selective
- Use equality predicates on leading columns
- Range predicates work best on trailing columns
- Queries must include leading column to use the index

### When to Index Relationship Properties

```cypher
// Index relationship properties only when queried
CREATE RANGE INDEX purchase_date_idx FOR ()-[r:PURCHASED]-() ON (r.created_at);

// Query that benefits:
MATCH (c:Customer {id: '123'})-[r:PURCHASED]->(o:Order)
WHERE r.created_at >= date('2025-01-01')
RETURN o.id;
```

Relationship property indexes are expensive — only create if queries frequently filter on relationship properties.

## Query Performance Benchmarks

### Traversal Depth Performance

| Depth | Query Type | Small Graph (1M nodes) | Medium Graph (10M nodes) | Large Graph (100M nodes) |
|---|---|---|---|---|
| 1 hop | Direct neighbor | < 1ms | < 1ms | < 5ms |
| 2 hops | Friend of friend | 1-5ms | 5-20ms | 20-100ms |
| 3 hops | 3rd degree | 5-50ms | 20-200ms | 100-1000ms |
| 4 hops | 4th degree | 50-500ms | 200-2000ms | 1-10s |
| 5 hops | 5th degree | 500-5000ms | 2-20s | 10-60s+ |

### Fan-Out Impact

| Fan-Out per Node | 1 Hop | 2 Hops | 3 Hops |
|---|---|---|---|
| 10 | 10 | 100 | 1,000 |
| 100 | 100 | 10,000 | 1,000,000 |
| 500 | 500 | 250,000 | 125,000,000 |
| 1000 | 1,000 | 1,000,000 | 1,000,000,000 |

Fan-out explosion is the most common performance issue in graph databases. Always use LIMIT and early filtering.

## Caching

### Neo4j Page Cache

```yaml
# Neo4j configuration
dbms.memory.pagecache.size: 24g  # 50-70% of available RAM
dbms.memory.heap.max_size: 16g   # 30-50% of available RAM
```

Page cache hit ratio target: > 90% for read-heavy workloads.

```cypher
// Check page cache hit ratio
CALL dbms.listConfig() YIELD name, value
WHERE name CONTAINS 'pagecache';
// Or via JMX: neo4j.page_cache.hits / neo4j.page_cache.faults
```

### Query Cache

Neo4j caches compiled query plans. Parameterized queries reuse cached plans:

```cypher
// Parameterized query (plan is cached)
MATCH (c:Customer {id: $customer_id})
MATCH (c)-[:PURCHASED]->(o:Order)
RETURN o.id, o.total;

// Execute with parameters
:param customer_id => '123';
:param customer_id => '456';  // Uses cached plan
```

### Neptune Cache

Neptune automatically caches frequently accessed data:

```
- Buffer cache: caches raw data
- OPC (Operator Cache): caches query results
- Gremlin compilation cache: caches compiled queries
- Storage volume: auto-caches hot data
```

## Bulk Operations

### Batch Writes

```cypher
// Bad: individual transactions
CREATE (:Customer {id: '1'});
CREATE (:Customer {id: '2'});
// ... 1M transactions

// Good: batching with APOC
CALL apoc.periodic.iterate(
    "UNWIND $customers AS c RETURN c",
    "CREATE (n:Customer {id: c.id, name: c.name})",
    {batchSize: 5000, iterateList: true, parallel: true}
)
```

### Bulk Import

```bash
# neo4j-admin bulk import (fastest method)
neo4j-admin database import full \
  --nodes=Customer=customers-header.csv,customers.csv \
  --nodes=Product=products-header.csv,products.csv \
  --relationships=PURCHASED=purchases-header.csv,purchases.csv \
  --trim-strings=true \
  --ignore-extra-columns=true \
  --high-io=true
```

### Periodic Execution

```cypher
// APOC periodic commit for large transactions
CALL apoc.periodic.commit(
    "MATCH (c:Customer) WHERE c.last_updated IS NULL WITH c LIMIT $limit
     SET c.last_updated = timestamp()
     RETURN count(*)",
    {limit: 5000}
);
```

## Query Anti-Patterns

1. **Unbounded traversal**: `MATCH (c)-[*]->(p)` without depth limit. Always specify max depth.
2. **No index on entry point**: every traversal starts somewhere. Index the entry property.
3. **Generic relationship types**: `RELATED_TO` means the planner can't optimize traversal.
4. **Filtering after high-fan-out**: filter early, not after traversing millions of intermediate nodes.
5. **No LIMIT on large result sets**: returning millions of rows to the client.
6. **Mixing traversal and aggregation without cardinality control**: aggregating after unbounded paths.
7. **Non-parameterized queries**: query plan is recompiled every time.
8. **Eager operations in high-cardinality contexts**: operations that force eager loading (distinct, collect on large sets).
9. **Using string contains instead of TEXT index**: simple CONTAINS does full scan.
10. **Over-indexing relationship properties**: relationship indexes are expensive. Index only when queries filter on relationship properties.

## References
- Neo4j Performance Tuning: https://neo4j.com/docs/operations-manual/current/performance/
- Cypher Execution Plans: https://neo4j.com/docs/cypher-manual/current/execution-plans/
- Gremlin Query Optimization: https://tinkerpop.apache.org/docs/current/reference/#traversal-strategies
- Neptune Query Optimization: https://docs.aws.amazon.com/neptune/latest/userguide/gremlin-query-hints.html
- JanusGraph Configuration: https://docs.janusgraph.org/operations/configure/
- APOC Procedures: https://neo4j.com/docs/apoc/current/
