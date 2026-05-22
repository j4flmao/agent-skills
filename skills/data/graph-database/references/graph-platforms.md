# Graph Database Platforms

## Feature Matrix
| Feature | Neo4j | Neptune | JanusGraph |
|---------|-------|---------|------------|
| Query | Cypher | Gremlin + SPARQL | Gremlin |
| ACID | Full | Per-transaction | Per-backend |
| Storage | Native graph | Custom AWS | Cassandra, HBase, Bigtable |
| Indexing | Built-in | Built-in | Elasticsearch |
| HA | Causal clustering | Multi-AZ | Backend-dependent |
| Cloud | AuraDB | AWS Neptune | None managed |

## Neo4j

### Configuration
```yaml
dbms.memory.heap.initial_size: 4G
dbms.memory.heap.max_size: 8G
dbms.memory.pagecache.size: 4G
dbms.connector.bolt.listen_address: :7687
dbms.tx_log.rotation.retention_policy: 7 days
```

### Causal Clustering
```yaml
# Core
dbms.mode: CORE
causal_clustering.initial_discovery_members: core1:5000, core2:5000, core3:5000

# Read replica
dbms.mode: READ_REPLICA
causal_clustering.initial_discovery_members: core1:5000, core2:5000, core3:5000
```

### Cypher Best Practices
```cypher
// Use labels to restrict scans
MATCH (c:Customer) WHERE c.email = "alice@example.com"
MATCH (c) WHERE c.email = "alice@example.com"  -- slower

// Batch updates with UNWIND
UNWIND $batch AS row
MATCH (c:Customer {id: row.customer_id})
MATCH (p:Product {sku: row.product_sku})
CREATE (c)-[:PURCHASED {order_id: row.order_id, quantity: row.quantity}]->(p);
```

## Neptune

### Cluster Configuration
```yaml
cluster_identifier: neptune-graph-prod
instance_class: db.r5.4xlarge
neptune_storage_encryption: true
backup_retention_period: 7
replica_count: 1
```

### Gremlin Traversals
```groovy
g.V().has('Customer', 'tier', 'premium').
  where(out('PURCHASED').has('Product', 'category', 'electronics')).
  project('customer', 'purchases').
    by('name').
    by(out('PURCHASED').count()).
  order().by(select('purchases'), desc).limit(10)
```

### SPARQL
```sparql
PREFIX schema: <http://schema.org/>
SELECT ?person ?product WHERE {
  ?person schema:knows ?friend .
  ?friend schema:purchased ?product .
  ?product schema:category "electronics" .
} LIMIT 50
```

## JanusGraph

### Storage Configuration
```yaml
storage.backend: cassandra
storage.hostname: cassandra1,cassandra2,cassandra3
storage.cassandra.keyspace: janusgraph
storage.cassandra.read-consistency-level: LOCAL_QUORUM
storage.lock.wait-time: 10000ms

index.search.backend: elasticsearch
index.search.hostname: es1,es2,es3

cache.db-cache: true
cache.db-cache-clean-wait: 20ms
cache.db-cache-time: 180000
ids.block-size: 100000
```

### Schema Management
```groovy
mgmt = graph.openManagement()
customer = mgmt.makeVertexLabel('Customer').make()
purchased = mgmt.makeEdgeLabel('PURCHASED').multiplicity(MULTI).make()
name = mgmt.makePropertyKey('name').dataType(String.class).cardinality(Cardinality.SINGLE).make()
mgmt.buildIndex('byCustomerId', Vertex.class).addKey(customerId).unique().buildCompositeIndex()
mgmt.buildIndex('byProductName', Vertex.class).addKey(name, Mapping.TEXTSTRING.asParameter()).buildMixedIndex("search")
mgmt.commit()
```

## Cypher vs Gremlin

| Operation | Cypher | Gremlin |
|-----------|--------|---------|
| Find by property | `MATCH (c:Customer {id: "123"})` | `g.V().has('Customer', 'id', '123')` |
| Traverse | `MATCH (c)-[:PURCHASED]->(p)` | `g.V().out('PURCHASED')` |
| Filter | `WHERE c.tier = "premium"` | `.has('tier', 'premium')` |
| Aggregate | `RETURN c.name, COUNT(*)` | `.groupCount().by('name')` |
| Path | `MATCH p = (a)-[*..3]-(b)` | `.repeat(out()).times(3).path()` |

## References
- Neo4j ops: https://neo4j.com/docs/operations-manual/
- Neptune docs: https://docs.aws.amazon.com/neptune/
- JanusGraph: https://docs.janusgraph.org/
