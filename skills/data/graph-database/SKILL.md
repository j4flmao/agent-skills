---
name: data-graph-database
description: >
  Use this skill when asked about Neo4j, Amazon Neptune, JanusGraph, graph database, graph model, Cypher, Gremlin, RDF, SPARQL, graph traversal, property graph, or knowledge graph. This skill enforces: graph data modeling (property graph, RDF), Neo4j/Cypher query patterns, Amazon Neptune/Gremlin traversal, JanusGraph architecture with backend storage, graph traversal optimization, knowledge graph design for connected domains, and performance tuning (indexing, caching, query planning). Do NOT use for: document storage, wide-column time-series, or full-text search.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, database, graph, phase-11]
---

# Data Graph Database

## Purpose
Design graph data models for connected domains (social networks, recommendation engines, knowledge graphs, fraud detection) with optimal traversal patterns, platform selection, and scaling strategy.

## Agent Protocol

### Trigger
Exact user phrases: "Neo4j", "Amazon Neptune", "JanusGraph", "graph database", "graph model", "Cypher", "Gremlin", "RDF", "SPARQL", "graph traversal", "property graph", "knowledge graph", "graph schema", "node label", "relationship", "graph query".

### Input Context
Before activating, verify:
- Domain data (nodes, relationships, properties, cardinality)
- Query patterns (depth of traversal, path enumeration, aggregations)
- Transaction volume (reads/sec, writes/sec, complexity)
- Consistency requirements (ACID vs CQRS)
- Existing graph platform (Neo4j, Neptune, JanusGraph) or greenfield
- Integration points (existing databases, streaming, ML pipelines)
- Expected graph size (millions, billions of nodes/edges)

### Output Artifact
Graph data model with node labels, relationship types, traversal patterns, and platform-specific deployment config.

### Response Format
```cypher
// Neo4j schema + constraints + traversal queries
```
```groovy
// Gremlin traversals for Neptune/JanusGraph
```
```yaml
# JanusGraph storage backend config
# Neptune cluster config
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Graph data model designed (property graph or RDF)
- [ ] Node labels and relationship types defined with constraints
- [ ] Indexes created for high-traffic property lookups
- [ ] Traversal patterns optimized for depth and cardinality
- [ ] Platform selected (Neo4j, Neptune, JanusGraph) with rationale
- [ ] Scaling strategy defined (sharding, replication, caching)
- [ ] Query performance verified with PROFILE/explain

### Max Response Length
300 lines of schema and queries.

## Workflow

### Step 1: Graph Data Modeling
Property graph: nodes (entities) with labels, relationships (edges) with types, properties on both. RDF: subject-predicate-object triples with URIs. Design around traversal patterns: ask "what queries will traverse from this node through which relationships?" Favor nodes for entities, relationships for connections, properties for attributes. Avoid overloading relationships with domain logic.

```cypher
// Property graph schema
CREATE CONSTRAINT customer_id IF NOT EXISTS FOR (c:Customer) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE;
CREATE INDEX product_category IF NOT EXISTS FOR (p:Product) ON (p.category);

// Node:Customer {id, name, email, tier}
// Node:Product {id, name, category, price}
// Node:Order {id, total, status, created_at}
// Rel:Customer->Order:PURCHASED {amount, timestamp}
// Rel:Order->Product:CONTAINS {quantity, unit_price}
// Rel:Customer->Product:REVIEWED {rating, text, timestamp}
```

### Step 2: Node and Relationship Design
Node labels represent entity types (User, Product, Location). Labels can be hierarchical: `User` and `PremiumUser`. Relationship types are directional verbs in present tense: `PURCHASED`, `REVIEWED`, `LOCATED_IN`, `MANAGED_BY`. Properties on relationships for context (rating, timestamp, quantity). Avoid generic relationships like `RELATED_TO`. Every relationship needs a direction, even if queried bidirectionally.

```cypher
// Bidirectional traversal: friends of friends
MATCH (u:User {id: '123'})-[:FRIENDS_WITH]-(friend)-[:FRIENDS_WITH]-(fof:User)
WHERE fof <> u
RETURN fof.name, COUNT(*) AS mutualFriends
ORDER BY mutualFriends DESC LIMIT 10;
```

### Step 3: Indexing and Constraints
Neo4j: BTREE indexes for exact property lookups, TEXT indexes for string contains/ends-with, RANGE for numeric/date comparisons, POINT for spatial queries, FULLTEXT for cross-label full-text search. Composite indexes for multi-property lookups. Node key constraints for uniqueness combinations. Existence constraints for mandatory properties.

```cypher
// Composite index
CREATE INDEX customer_region_tier IF NOT EXISTS FOR (c:Customer)
ON (c.region, c.tier);

// Full-text index across multiple labels
CREATE FULLTEXT INDEX product_search IF NOT EXISTS
FOR (p:Product|Category) ON EACH [p.name, p.description];

// Node key constraint
CREATE CONSTRAINT product_sku IF NOT EXISTS
FOR (p:Product) REQUIRE (p.sku) IS NODE KEY;
```

### Step 4: Traversal Optimization
Cardinality estimation drives query planning. Start with most selective pattern. Use `LIMIT` early to cap fan-out. Profile queries to find `Expand(Into)` vs `Expand(All)` — the former uses relationship start/end filtering. Avoid cartesian products. Use `USING INDEX` to force index selection. Parameterize all queries to leverage query caching.

```cypher
// Efficient traversal: start selective
PROFILE
MATCH (c:Customer {tier: 'premium'})
MATCH (c)-[:PURCHASED]->(o:Order)
WHERE o.total > 100 AND o.created_at > datetime('2025-01-01')
MATCH (o)-[:CONTAINS]->(p:Product {category: 'electronics'})
RETURN c.name, p.name, o.total
LIMIT 100;
```

```groovy
// Gremlin equivalent: start with selective filter
g.V().has('Customer', 'tier', 'premium').
  out('PURCHASED').hasLabel('Order').
  has('total', gt(100)).has('created_at', gt(datetime('2025-01-01'))).
  out('CONTAINS').has('Product', 'category', 'electronics').
  limit(100).
  project('customer', 'product', 'total').
    by(in('PURCHASED').values('name')).
    by(values('name')).
    by(in('PURCHASED').values('total'))
```

### Step 5: Platform Selection
Neo4j: full ACID, Cypher, strongest ecosystem, community edition for single instance, Aura for cloud. Neptune: managed AWS, Gremlin + SPARQL, multi-AZ, IAM auth, integrations with S3/Lambda. JanusGraph: open-source, pluggable backend (Cassandra, HBase, Bigtable), Elasticsearch for indexing, TinkerPop Gremlin, horizontal scaling.

| Feature | Neo4j | Neptune | JanusGraph |
|---------|-------|---------|------------|
| ACID | Yes | Per-transaction | Per-backend |
| Query | Cypher | Gremlin + SPARQL | Gremlin |
| Scaling | Read replicas | Multi-AZ | Horizontal (backed by Cassandra) |
| Storage | Native graph | AWS internal | Cassandra/HBase/Bigtable |
| HA | Causal clustering | Built-in | Depends on backend |

### Step 6: Scaling and Performance
Neo4j: causal clustering for writes, read replicas for reads, sharding via federation (4.0+). Neptune: auto-scaling storage (up to 128 TB), read replicas for read-heavy workloads. JanusGraph: partition graph across storage backend nodes, configure `storage.backend` for Cassandra/HBase, `index.search.backend` for Elasticsearch. PageRank and betweenness centrality: run as batch, not real-time.

```yaml
# JanusGraph configuration
storage.backend: cassandra
storage.hostname: cassandra-node1,cassandra-node2,cassandra-node3
storage.cassandra.keyspace: janusgraph
storage.lock.wait-time: 10000ms

index.search.backend: elasticsearch
index.search.hostname: es-node1,es-node2
index.search.elasticsearch.client-only: true

cache.db-cache: true
cache.db-cache-clean-wait: 20ms
cache.db-cache-time: 180000

ids.block-size: 100000
```

### Step 7: Graph Analytics and Algorithms
Neo4j Graph Data Science (GDS) library for graph algorithms: centrality (PageRank, Betweenness, Closeness, Degree), community detection (Louvain, Label Propagation, Weakly Connected Components), path finding (Shortest Path, A*, Dijkstra), node similarity (Jaccard, Cosine, Pearson), and node embeddings (FastRP, GraphSAGE, node2vec). Run algorithms on projected in-memory graphs. Use graph catalog for managing multiple projections. Tune concurrency and batch size for large graphs.

```cypher
// PageRank in GDS
CALL gds.pageRank.stream('myGraph', {
    maxIterations: 20,
    dampingFactor: 0.85,
    concurrency: 4
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC LIMIT 20;

// Community detection with Louvain
CALL gds.louvain.stream('myGraph', {
    maxLevels: 10,
    maxIterations: 10,
    includeIntermediateCommunities: false
})
YIELD nodeId, communityId, intermediateCommunityIds
RETURN gds.util.asNode(nodeId).name AS name, communityId;
```

### Step 8: Graph Data Import and ETL
Batch import: Neo4j-admin import for initial bulk loads from CSV (fastest), LOAD CSV for incremental imports with Cypher, APOC procedures for periodic execution and parallel processing. Streaming: Kafka connect for real-time graph updates. Data modeling for import: use temporary nodes for deduplication, batch commits every 1000-5000 rows, create constraints and indexes before import. Handle large CSV files with field terminator and quote character configuration.

```cypher
// LOAD CSV with periodic commit
:auto USING PERIODIC COMMIT 1000
LOAD CSV WITH HEADERS FROM 'file:///customers.csv' AS row
MERGE (c:Customer {id: row.customer_id})
SET c.name = row.name, c.email = row.email, c.tier = row.tier;

// APOC parallel batch processing
CALL apoc.periodic.iterate(
    'LOAD CSV WITH HEADERS FROM "file:///orders.csv" AS row RETURN row',
    'MATCH (c:Customer {id: row.customer_id})
     MERGE (o:Order {id: row.order_id})
     SET o.total = toFloat(row.total), o.status = row.status
     MERGE (c)-[:PURCHASED {timestamp: datetime(row.created_at)}]->(o)',
    {batchSize: 1000, parallel: true, retries: 2}
);
```

### Step 9: Knowledge Graph Design
Ontology: define classes, properties, and relationships as a schema. RDF/OWL for formal semantics with inference. Property graph for application use with performance needs. SKOS for taxonomies and thesauri. Named entity resolution: deduplicate via identity resolution (sameAs links). Graph embeddings for ML feature extraction.

```sparql
# SPARQL query for RDF knowledge graph
PREFIX schema: <http://schema.org/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?person ?product WHERE {
  ?person rdf:type schema:Person .
  ?person schema:knows ?friend .
  ?friend schema:purchased ?product .
  ?product schema:category "electronics" .
}
LIMIT 50
```

## Rules
- Model nodes for entities, relationships for connections
- Every relationship type is a directional present-tense verb
- Add indexes for every high-traffic property lookup
- Use composite indexes for multi-property lookups
- Start queries from the most selective pattern
- Profile before optimizing, never guess traversal performance
- Keep traversal depth manageable (max 5 hops for OLTP)
- Use pagination and LIMIT for all user-facing queries
- Batch write operations in transactions of 1000-5000 operations
- Avoid fan-out patterns that explode cardinality

## References
  - references/graph-algorithms.md — Graph Algorithms
  - references/graph-modeling.md — Graph Data Modeling
  - references/graph-performance.md — Graph Database Performance
  - references/graph-platforms.md — Graph Database Platforms
  - references/graph-use-cases.md — Graph Database Use Cases Reference
  - references/query-patterns.md — Graph Query Patterns Reference
## Handoff
`data-nosql-database` for non-relational data stores
`ml-feature-engineering` for graph feature extraction (PageRank, embeddings)
