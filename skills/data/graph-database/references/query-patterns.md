# Graph Query Patterns Reference

## Cypher (Neo4j)

Cypher is Neo4j's declarative graph query language.

### Basic Pattern Matching

```cypher
// Match a node
MATCH (c:Customer {id: 'CUST-001'})
RETURN c.name, c.email, c.tier;

// Match a relationship
MATCH (c:Customer {id: 'CUST-001'})-[r:PURCHASED]->(o:Order)
RETURN c.name, o.id, o.total, r.timestamp;

// Match a path (2 hops)
MATCH (c:Customer {id: 'CUST-001'})-[:PURCHASED]->(:Order)-[:CONTAINS]->(p:Product)
RETURN c.name, p.name, p.category;

// Variable-length path
MATCH (c:Customer {id: 'CUST-001'})-[:PURCHASED*1..3]->(p:Product)
RETURN c.name, p.name, COUNT(*) AS purchase_count;
```

### Aggregation and Filtering

```cypher
// Aggregate: top products by revenue
MATCH (c:Customer)-[:PURCHASED]->(o:Order)-[:CONTAINS]->(p:Product)
WHERE o.created_at > datetime('2026-01-01')
RETURN p.name, p.category, SUM(o.total) AS total_revenue, COUNT(DISTINCT c) AS customer_count
ORDER BY total_revenue DESC
LIMIT 20;

// Filter with multiple conditions
MATCH (c:Customer {tier: 'platinum'})-[:PURCHASED]->(o:Order)
WHERE o.total > 500 AND o.created_at > datetime('2026-01-01')
RETURN c.name, o.id, o.total, o.created_at
ORDER BY o.total DESC;

// Existence check
MATCH (c:Customer)
WHERE NOT EXISTS {
    MATCH (c)-[:PURCHASED]->(:Order)
    WHERE o.created_at > datetime('2026-01-01')
}
RETURN c.name, c.email;
```

### Path Queries

```cypher
// Shortest path
MATCH p = shortestPath(
    (c1:Customer {id: 'CUST-001'})-[:PURCHASED*]-(c2:Customer {id: 'CUST-002'})
)
RETURN p;

// All paths between nodes
MATCH p = (c:Customer {id: 'CUST-001'})-[:PURCHASED*1..4]->(p:Product)
RETURN c.name, p.name, length(p) AS path_length;

// Relationship with properties
MATCH (c:Customer)-[r:PURCHASED {amount: 100.00}]->(o:Order)
RETURN c.name, o.id;
```

### Subqueries

```cypher
// Subquery: customers who bought products also bought by other high-value customers
MATCH (c:Customer {tier: 'platinum'})-[:PURCHASED]->(o:Order)-[:CONTAINS]->(p:Product)
WITH c, COLLECT(DISTINCT p.id) AS platinum_products
MATCH (other:Customer)-[:PURCHASED]->(:Order)-[:CONTAINS]->(similar:Product)
WHERE other.id <> c.id AND similar.id IN platinum_products
RETURN other.name, COUNT(DISTINCT similar) AS common_products
ORDER BY common_products DESC;

// EXISTS subquery (Neo4j 4.x+)
MATCH (c:Customer)
WHERE EXISTS {
    MATCH (c)-[:PURCHASED]->(o:Order)
    WHERE o.total > 10000
}
RETURN c.name, c.tier;
```

### Graph Algorithms via GDS

```cypher
// PageRank
CALL gds.pageRank.stream('customer-product-graph', {
    maxIterations: 20,
    dampingFactor: 0.85
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC
LIMIT 10;

// Community detection (Louvain)
CALL gds.louvain.stream('order-graph', {
    maxLevels: 5,
    maxIterations: 10
})
YIELD nodeId, communityId
RETURN gds.util.asNode(nodeId).name AS name, communityId
ORDER BY communityId;

// Node similarity (Jaccard)
CALL gds.nodeSimilarity.stream('product-graph', {
    similarityMetric: 'JACCARD',
    topK: 5
})
YIELD node1, node2, similarity
RETURN gds.util.asNode(node1).name AS product1,
       gds.util.asNode(node2).name AS product2,
       similarity
ORDER BY similarity DESC
LIMIT 20;
```

## Gremlin (JanusGraph, Neptune)

Gremlin is the graph traversal language for Apache TinkerPop.

### Basic Traversals

```groovy
// Find a vertex
g.V().has('Customer', 'id', 'CUST-001').values('name', 'email');

// Outgoing traversal
g.V().has('Customer', 'id', 'CUST-001')
    .out('PURCHASED').hasLabel('Order')
    .values('id', 'total');

// Incoming traversal
g.V().has('Customer', 'id', 'CUST-001')
    .in('PURCHASED_BY').hasLabel('Order')
    .values('id');

// 2-hop traversal
g.V().has('Customer', 'id', 'CUST-001')
    .out('PURCHASED').out('CONTAINS')
    .hasLabel('Product')
    .values('name', 'category');
```

### Filtering and Aggregation

```groovy
// Filter: high-value orders
g.V().has('Customer', 'tier', 'platinum')
    .out('PURCHASED').hasLabel('Order')
    .has('total', gt(500))
    .values('id', 'total');

// Aggregation: count per category
g.V().hasLabel('Order')
    .out('CONTAINS').hasLabel('Product')
    .groupCount()
    .by('category')
    .next();

// Aggregation with ordering
g.V().has('Order', 'created_at', gte(datetime('2026-01-01')))
    .out('CONTAINS').hasLabel('Product')
    .group()
    .by('name')
    .by(count())
    .unfold()
    .order()
    .by(values, desc)
    .limit(10);
```

### Path Queries

```groovy
// Simple path
g.V().has('Customer', 'id', 'CUST-001')
    .repeat(out('PURCHASED')).times(2)
    .path()
    .by('name');

// Loop with conditions
g.V().has('Customer', 'id', 'CUST-001')
    .repeat(out())
    .until(hasLabel('Product'))
    .path()
    .by('name');

// Shortest path
g.V().has('Customer', 'id', 'CUST-001')
    .repeat(out().simplePath())
    .until(has('Customer', 'id', 'CUST-002'))
    .has('name')
    .limit(1)
    .path()
    .by('name');
```

### Advanced Traversals

```groovy
// Recommendation: products often bought together
g.V().has('Product', 'id', 'PROD-001')
    .in('CONTAINS').out('CONTAINS')
    .where(without('PROD-001'))
    .groupCount()
    .by('name')
    .order()
    .by(values, desc)
    .limit(5);

// Transactional traversal
g.tx().begin();
try {
    g.V().has('Customer', 'id', 'CUST-001')
        .property('tier', 'gold')
        .iterate();
    g.tx().commit();
} catch (Exception e) {
    g.tx().rollback();
}
```

## SPARQL (RDF)

SPARQL is the query language for RDF knowledge graphs.

### Basic Queries

```sparql
PREFIX schema: <http://schema.org/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?name ?email
WHERE {
    ?customer rdf:type schema:Person .
    ?customer schema:name ?name .
    ?customer schema:email ?email .
    ?customer schema:identifier "CUST-001" .
}
```

### Property Paths

```sparql
PREFIX schema: <http://schema.org/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

// Products purchased by customer's friends
SELECT ?customer ?friend ?product ?productName
WHERE {
    ?customer schema:identifier "CUST-001" .
    ?customer schema:knows ?friend .
    ?friend schema:purchased ?product .
    ?product schema:name ?productName .
}

// Variable-length path (friend of a friend)
SELECT ?person ?product
WHERE {
    ?person schema:identifier "CUST-001" .
    ?person schema:knows+ ?connection .
    ?connection schema:purchased ?product .
}
```

### Aggregation

```sparql
PREFIX schema: <http://schema.org/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?category (COUNT(?product) AS ?productCount) (SUM(?price) AS ?totalValue)
WHERE {
    ?product rdf:type schema:Product .
    ?product schema:category ?category .
    ?product schema:price ?price .
}
GROUP BY ?category
ORDER BY DESC(?totalValue)
LIMIT 10;
```

## Graph Algorithms

### Centrality Algorithms

```cypher
// PageRank: find influential nodes
CALL gds.pageRank.stream('graph', {
    maxIterations: 20,
    dampingFactor: 0.85
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC;

// Betweenness Centrality: find bridge nodes
CALL gds.betweenness.stream('graph', {
    samplingSize: 1000
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC;
```

### Community Detection

```cypher
// Louvain: find community structure
CALL gds.louvain.stream('graph', {
    maxLevels: 10
})
YIELD nodeId, communityId, intermediateCommunityIds
RETURN gds.util.asNode(nodeId).name AS name, communityId;

// Label Propagation: fast community detection
CALL gds.labelPropagation.stream('graph', {
    maxIterations: 100
})
YIELD nodeId, communityId
RETURN communityId, COUNT(*) AS memberCount
ORDER BY memberCount DESC;
```

### Path Finding

```cypher
// Shortest path (weighted)
MATCH (start:Location {name: 'Warehouse A'})
MATCH (end:Location {name: 'Store B'})
CALL gds.shortestPath.dijkstra.stream('shipping-graph', {
    sourceNode: start,
    targetNode: end,
    relationshipWeightProperty: 'distance_km'
})
YIELD index, sourceNode, targetNode, totalCost, nodeIds
RETURN index, totalCost, [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS path;
```

## Rules
- Start queries from the most selective pattern first
- Use LIMIT to cap fan-out in all user-facing queries
- Parameterize queries for plan caching
- Profile queries with PROFILE/EXPLAIN before optimization
- Avoid cartesian products between unrelated node sets
- Prefer EXISTS over OPTIONAL MATCH for existence checks
- GDS algorithms run on projected in-memory graphs, not stored
- Use batch operations (1000-5000 per transaction) for writes
- Monitor traversal depth — max 5 hops for OLTP queries
- Index all high-traffic property lookups
