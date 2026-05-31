---
name: data-graph-database
description: >
  Use this skill when asked about Neo4j, Amazon Neptune, JanusGraph, graph database, graph model, Cypher, Gremlin, RDF, SPARQL, graph traversal, property graph, or knowledge graph. This skill enforces: graph data modeling (property graph, RDF), Neo4j/Cypher query patterns, Amazon Neptune/Gremlin traversal, JanusGraph architecture with backend storage, graph traversal optimization, knowledge graph design for connected domains, and performance tuning (indexing, caching, query planning). Do NOT use for: document storage, wide-column time-series, or full-text search.
version: "1.1.0"
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
- Existing graph platform or greenfield
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
Property graph: nodes (entities) with labels, relationships (edges) with types, properties on both. RDF: subject-predicate-object triples with URIs. Design around traversal patterns: ask "what queries will traverse from this node through which relationships?" Favor nodes for entities, relationships for connections, properties for attributes.

```cypher
// Property graph model for e-commerce
// (:Customer)-[:PURCHASED]->(:Order)-[:CONTAINS]->(:Product)
// (:Customer)-[:REVIEWED]->(:Product)
// Each relationship carries context: timestamp, quantity, rating
```

### Step 2: Node and Relationship Design
Node labels represent entity types. Labels can be hierarchical. Relationship types are directional verbs in present tense. Properties on relationships for context. Avoid generic relationships like `RELATED_TO`.

```cypher
// Node labels
CREATE CONSTRAINT customer_id FOR (c:Customer) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT product_sku FOR (p:Product) REQUIRE p.sku IS UNIQUE;

// Composite index for lookup
CREATE INDEX customer_region_idx FOR (c:Customer) ON (c.region, c.tier);
```

### Step 3: Indexing and Constraints
Neo4j: BTREE indexes for exact lookups, TEXT for string contains, RANGE for numeric/date, POINT for spatial, FULLTEXT for cross-label search. Composite indexes for multi-property lookups.

```cypher
// RANGE index for date filtering
CREATE RANGE INDEX order_date_idx FOR ()-[r:PURCHASED]-() ON (r.created_at);

// TEXT index for product search
CREATE TEXT INDEX product_name_idx FOR (p:Product) ON (p.name);

// FULLTEXT for cross-label search
CREATE FULLTEXT INDEX entity_search FOR (n:Customer|Product|Order) ON EACH [n.name, n.description];
```

### Step 4: Traversal Optimization
Start with most selective pattern. Use LIMIT early. Profile queries to find Expand(Into) vs Expand(All). Avoid cartesian products. Use USING INDEX to force index selection. Parameterize all queries.

```cypher
// Bad: full scan then filter
MATCH (c:Customer)-[:PURCHASED]->(o:Order)-[:CONTAINS]->(p:Product)
WHERE c.region = 'US' AND p.category = 'Electronics'
RETURN c.name, p.name LIMIT 100;

// Good: start with most selective, use indexes
MATCH (c:Customer) WHERE c.region = 'US'
WITH c LIMIT 100
MATCH (c)-[:PURCHASED]->(o:Order)-[:CONTAINS]->(p:Product)
WHERE p.category = 'Electronics'
RETURN c.name, p.name;

// Profile to verify plan
PROFILE
MATCH (c:Customer) WHERE c.region = 'US'
USING INDEX c:Customer(region)
RETURN count(c);
```

### Step 5: Platform Selection
Neo4j: full ACID, Cypher, strongest ecosystem. Neptune: managed AWS, Gremlin + SPARQL. JanusGraph: open-source, pluggable backend, horizontal scaling.

```yaml
# JanusGraph with Cassandra + Elasticsearch
storage:
  backend: cassandra
  hostname: ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
  port: 9160
  keyspace: janusgraph
index:
  search:
    backend: elasticsearch
    hostname: ["10.0.2.10", "10.0.2.11"]
    port: 9200
cache:
  db-cache: true
  db-cache-clean-wait: 20
```

### Step 6: Scaling and Performance
Neo4j: causal clustering, read replicas. Neptune: auto-scaling storage. JanusGraph: partition across storage backend, Elasticsearch for indexing.

Neo4j causal clustering: core servers handle writes (RAFT consensus), read replicas handle reads. Minimum 3 core servers for production. Read replicas auto-scale based on query load.

Neptune: serverless or provisioned. Storage auto-scales to 128TB. Use Neptune Streams for change data capture. Enable DFE (Data Format Efficiency) for faster query execution.

JanusGraph: partition graph across Cassandra nodes. Configure `ids.block-size` based on write rate. Use `storage.lock.wait-time` for transaction conflict handling.

### Step 7: Graph Algorithms
Neo4j GDS: centrality (PageRank, Betweenness), community detection (Louvain, Label Propagation), path finding (Shortest Path), node similarity (Jaccard, Cosine). Run on projected in-memory graphs.

```cypher
// Project graph into memory
CALL gds.graph.project('myGraph', 'Customer', {
  PURCHASED: { orientation: 'UNDIRECTED' }
});

// Run PageRank
CALL gds.pageRank.stream('myGraph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS customer, score
ORDER BY score DESC LIMIT 20;

// Community detection
CALL gds.louvain.stream('myGraph')
YIELD nodeId, communityId
RETURN communityId, count(*) AS members;

// Clean up
CALL gds.graph.drop('myGraph');
```

### Step 8: Graph Data Import
Batch: neo4j-admin import, LOAD CSV, APOC. Stream: Kafka connect. Import best practices: temporary nodes for dedup, batch commits every 1000-5000 rows, create constraints before import.

```bash
# neo4j-admin bulk import
neo4j-admin database import full \
  --nodes=Customer=customers-header.csv,customers.csv \
  --nodes=Product=products-header.csv,products.csv \
  --relationships=PURCHASED=purchases-header.csv,purchases.csv \
  --trim-strings=true \
  --ignore-extra-columns=true
```

```cypher
// APOC periodic batch commit
CALL apoc.periodic.commit(
  "MATCH (c:Customer) WHERE c.batch_id IS NULL
   WITH c LIMIT 5000
   SET c.batch_id = $batch
   RETURN count(*)",
  {batch: 123}
);
```

### Step 9: Knowledge Graph Design
Ontology with RDF/OWL for formal semantics. Property graph for application use. SKOS for taxonomies. Named entity resolution via sameAs links. Graph embeddings for ML feature extraction.

```turtle
# RDF ontology snippet
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix schema: <http://schema.org/> .
@prefix ex: <http://example.org/ontology/> .

ex:Product a rdfs:Class ;
  rdfs:label "Product" ;
  rdfs:subClassOf schema:Product .

ex:suppliedBy a rdf:Property ;
  rdfs:domain ex:Product ;
  rdfs:range ex:Supplier .
```

### Step 10: GraphQL Integration
Graph databases pair naturally with GraphQL APIs. Use Neo4j GraphQL library to auto-generate GraphQL schema from the graph model. This provides real-time graph traversal through a standard API.

```javascript
// Neo4j GraphQL schema
const typeDefs = `
  type Customer {
    id: ID!
    name: String!
    email: String!
    purchased: [Order!]! @relationship(type: "PURCHASED", direction: OUT)
  }
  type Order {
    id: ID!
    total: Float!
    createdAt: DateTime!
    contains: [Product!]! @relationship(type: "CONTAINS", direction: OUT)
    customer: Customer! @relationship(type: "PURCHASED", direction: IN)
  }
  type Product {
    id: ID!
    name: String!
    sku: String!
    category: String!
    reviews: [Review!]! @relationship(type: "REVIEWED", direction: IN)
  }
`;
```

## Architecture / Decision Trees

### Platform Selection

```
Need graph database?
  ├── Full ACID, rich ecosystem, Cypher? → Neo4j
  ├── AWS-managed, Gremlin + SPARQL? → Neptune
  ├── Open source, horizontal scale, pluggable? → JanusGraph
  ├── Large-scale analytics, not OLTP? → TigerGraph
  ├── RDF/SPARQL knowledge graph? → Stardog / GraphDB
  └── Graph visualization and exploration? → Neo4j + Bloom / Linkurious
```

### Model Design

```
Design traversal:
  1. List all query patterns
  2. Identify entities → nodes
  3. Identify connections → relationships
  4. Identify attributes → properties
  5. Choose property location (node vs relationship)
  6. Define indexes for entry-point lookups
  7. Profile traversal with representative data

Property placement decision:
  Attribute that describes the connection? → relationship property
  Attribute that belongs to the entity? → node property
  Attribute varies per connection? → relationship property
  Attribute is constant for entity? → node property
```

## Common Pitfalls

1. **Generic relationships**: `RELATED_TO`, `CONNECTED_TO` lose semantic meaning. Use specific verbs: `PURCHASED`, `MANAGED_BY`, `LOCATED_IN`.
2. **Overly deep traversals**: 6+ hop queries in OLTP degrade performance. Pre-compute for deep paths.
3. **Missing indexes on entry points**: every traversal starts somewhere. Index all high-traffic property lookups.
4. **Fan-out explosion**: one node connected to millions of others. Use LIMIT and pagination.
5. **Properties on nodes that belong on relationships**: context like timestamp and quantity belong on the relationship, not the node.
6. **No schema constraints**: unlabeled nodes and invalid relationships accumulate. Always use constraints.
7. **Loading entire graph into memory in GDS**: projected graphs must fit in available heap. Use node filtering to reduce size.
8. **No batch commit on large imports**: importing millions of nodes in a single transaction causes OOM.
9. **RDF without reasoning support**: SPARQL inference queries are slow without a reasoner engine.
10. **JanusGraph backend storage mismatch**: Cassandra for write-heavy, BerkeleyDB for single-server, ScyllaDB for high-throughput.
11. **Neptune query timeout not configured**: long-running Gremlin traversals timeout at 15min default. Set appropriate timeout for analytics queries.
12. **Missing relationship direction in queries**: Cypher can traverse both ways but specifying direction improves plan stability.
13. **Indexing relationship properties without need**: relationship property indexes are expensive. Index only if traversals filter on relationship properties.

## Best Practices

- Model for traversal patterns first, entity structure second.
- Use composite indexes for multi-property lookups (region + tier).
- Profile every query before production. Never guess traversal performance.
- Keep traversal depth max 5 hops for OLTP. Use pre-computation for deeper paths.
- Batch write operations in 1000-5000 transaction batches.
- Use parameterized queries for plan caching.
- Monitor cache hit ratio: target > 90% for read-heavy workloads.
- Use APOC for complex operations: periodic execution, parallel processing.
- For knowledge graphs: define ontology before ingesting data.
- Use Neo4j Fabric for multi-database federated queries.
- Model time-varying graphs with relationship properties (valid_from, valid_to) rather than separate nodes.
- Use graph projections (GDS) for analytics to avoid production query interference.
- Set Neo4j heap to 16-32GB for graphs up to 100M nodes/edges.
- Enable query logging for queries exceeding 1 second in production.
- Test with production-scale data — graph performance changes non-linearly with size.

## Compared With

| Feature | Neo4j | Neptune | JanusGraph | TigerGraph |
|---|---|---|---|---|
| ACID | Yes | Per-transaction | Per-backend | Yes |
| Query | Cypher | Gremlin + SPARQL | Gremlin | GSQL |
| Scaling | Read replicas, causal clustering | Multi-AZ, storage auto-scale | Horizontal (Cassandra) | MPP shared-nothing |
| Storage | Native graph | Internal | Pluggable | Native MPP |
| HA | Causal clustering | Built-in | Backend-dependent | Built-in |
| Cloud | Aura | AWS | Any | TigerGraph Cloud |
| In-memory analytics | GDS | DFE | N/A | Built-in |
| OLTP vs OLAP | Both | Both | OLTP-heavy | OLAP-heavy |
| Ecosystem | Largest | AWS-native | Open-source | Growing |

Graph vs relational: graph excels at many-to-many relationships, variable-depth traversals, and path queries. Relational excels at aggregate queries, strict schemas, and ACID-compliant transactions over known relationships. Use graph when the value is in the connections, not just the entities.

Graph vs document (MongoDB): document stores embed related data, limiting traversal to one level. Graph stores normalize relationships, enabling arbitrary-depth traversal. Use graph for highly connected data, document for aggregate-root patterns.

## Performance

- Cypher query planning: < 10ms for simple queries, < 100ms for complex.
- Gremlin traversal on Neptune: 1000+ traversals/second per instance.
- Neo4j GDS PageRank on 1M nodes, 10M edges: 30-60 seconds.
- LOAD CSV import: 50K-100K nodes/second on single instance.
- Index lookup: < 1ms per lookup (BTREE).
- Full-text search: 10-50ms across 1M indexed entities.
- Neo4j heap: allocate 50% of RAM to heap, 50% to OS page cache.
- Write throughput: Neo4j 5K-20K writes/sec per core server (SSD-dependent).
- Query cache: Neo4j caches query plans; reuse parameterized queries for 10-100x plan cache hits.
- Page cache sizing: allocate enough page cache to hold the hot working set. For 100GB graph with 20GB working set, allocate 24GB page cache.
- Neptune storage auto-scales but write I/O is limited by instance class. Use larger instances for write-heavy workloads.
- JanusGraph: each query may hit both storage backend and index backend. Elasticsearch latency dominates query time for indexed lookups. Target <10ms ES response.
- Bulk import (neo4j-admin): 1M nodes/sec on SSD. LOAD CSV with periodic commit: 10K-50K nodes/sec.

## Tooling

| Tool | Purpose |
|---|---|
| Neo4j Browser | Query editor and visualization |
| Neo4j GDS | Graph algorithms library |
| APOC | Utility procedures |
| Cypher Shell | Command-line query tool |
| Gremlin Console | Server-less query testing |
| Neptune Workbench | Jupyter notebooks for Neptune |
| JanusGraph Server | Gremlin server with backend config |
| Arrows | Graph data modeling visualization |
| Neo4j Bloom | Graph visualization for business users |
| Linkurious | Graph visualization and investigation |
| GraphXR | 3D graph visualization |
| Apache TinkerPop | Graph computing framework |
| Neo4j GraphQL | Auto-generated GraphQL from graph model |
| RDF4J / Jena | RDF and SPARQL toolkits |
| Stardog | Enterprise RDF knowledge graph |

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
- Index all entry-point properties (foreign keys, unique IDs)
- Use parameterized queries for plan caching
- Enable query logging for queries > 1 second in production
- Set Neo4j page cache for hot working set
- Test with production-scale data before deployment
- Create constraints before bulk import
- Use graph projections for analytics workloads
- Monitor cache hit ratio (target > 90%)
- Model time-varying data with valid_from/valid_to on relationships
- Document every relationship type with direction semantics

## References
  - references/graph-algorithms.md — Graph Algorithms
  - references/graph-modeling.md — Graph Data Modeling
  - references/graph-performance.md — Graph Database Performance
  - references/graph-platforms.md — Graph Database Platforms
  - references/graph-use-cases.md — Graph Database Use Cases Reference
  - references/query-patterns.md — Graph Query Patterns Reference
  - references/graph-data-modeling.md — Graph Data Modeling Deep Dive
  - references/graph-query-performance.md — Query Performance Reference
## Handoff
`data-nosql-database` for non-relational data stores
`ml-feature-engineering` for graph feature extraction (PageRank, embeddings)
