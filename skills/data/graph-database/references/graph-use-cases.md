# Graph Database Use Cases Reference

## Recommendation Engines

### Collaborative Filtering with Graphs

```cypher
// Product recommendations based on other customers who bought the same items
MATCH (target:Customer {id: 'CUST-001'})
MATCH (target)-[:PURCHASED]->(order:Order)-[:CONTAINS]->(product:Product)
MATCH (product)<-[:CONTAINS]-(otherOrder:Order)<-[:PURCHASED]-(similar:Customer)
WHERE similar.id <> target.id
MATCH (similar)-[:PURCHASED]->(:Order)-[:CONTAINS]->(recommended:Product)
WHERE NOT EXISTS {
    MATCH (target)-[:PURCHASED]->(:Order)-[:CONTAINS]->(recommended)
}
RETURN recommended.name, recommended.category, COUNT(DISTINCT similar) AS similarityScore
ORDER BY similarityScore DESC
LIMIT 20;

// Using GDS node similarity for batch recommendations
CALL gds.nodeSimilarity.stream('customer-product-graph', {
    similarityMetric: 'JACCARD',
    topK: 5,
    similarityCutoff: 0.1
})
YIELD node1, node2, similarity
RETURN gds.util.asNode(node1).name AS customer1,
       gds.util.asNode(node2).name AS customer2,
       similarity
ORDER BY similarity DESC;
```

### Personalized Ranking

```cypher
// Rank recommended products by category affinity
MATCH (c:Customer {id: 'CUST-001'})
MATCH (c)-[:PURCHASED]->(:Order)-[:CONTAINS]->(bought:Product)
WITH c, bought.category AS preferredCategory, COUNT(*) AS categoryScore
ORDER BY categoryScore DESC
LIMIT 3

MATCH (preferredProduct:Product)
WHERE preferredProduct.category IN [preferredCategory]
  AND NOT EXISTS {
    MATCH (c)-[:PURCHASED]->(:Order)-[:CONTAINS]->(preferredProduct)
  }
MATCH (preferredProduct)<-[:CONTAINS]-(:Order)<-[:PURCHASED]-(other:Customer)
WITH preferredProduct, COUNT(DISTINCT other) AS popularity
RETURN preferredProduct.name, preferredProduct.category, popularity
ORDER BY popularity DESC
LIMIT 10;
```

## Fraud Detection

### Real-Time Fraud Pattern Detection

```cypher
// Detect rapid transactions across different merchants
MATCH (c:Customer {id: 'CUST-001'})-[r:PURCHASED]->(o:Order)
WITH c, o, r
ORDER BY r.timestamp DESC
WITH c, COLLECT({order: o, ts: r.timestamp})[..10] AS recentOrders

UNWIND recentOrders AS order1
UNWIND recentOrders AS order2
WITH c, order1, order2
WHERE order1.ts <> order2.ts
  AND abs(duration.between(order1.ts, order2.ts).minutes) < 5
  AND order1.order.merchant_id <> order2.order.merchant_id
RETURN c.id, c.name,
       COUNT(DISTINCT order1.order.merchant_id) AS distinctMerchants,
       COUNT(*) AS rapidTransactions
HAVING distinctMerchants >= 3;

// Suspicious account networks
MATCH (device:Device {fingerprint: 'device-abc-123'})
MATCH (device)<-[:USES_DEVICE]-(account:Account)
MATCH (account)-[:TRANSFERRED_TO]->(otherAccount:Account)
OPTIONAL MATCH (otherAccount)-[:TRANSFERRED_TO]->(furtherAccount:Account)
RETURN device.id,
       COLLECT(DISTINCT account.id) AS accounts,
       COLLECT(DISTINCT otherAccount.id) AS transfers,
       COLLECT(DISTINCT furtherAccount.id) AS furtherTransfers;
```

### Ring Detection

```cypher
// Detect circular transaction patterns (money laundering rings)
MATCH (a1:Account)-[:TRANSFERRED_TO]->(a2:Account)
MATCH (a2)-[:TRANSFERRED_TO]->(a3:Account)
MATCH (a3)-[:TRANSFERRED_TO]->(a1:Account)
WHERE id(a1) < id(a2)  -- Prevent duplicate cycles
RETURN a1.id, a2.id, a3.id,
       SUM(a1.amount + a2.amount + a3.amount) AS totalCycledAmount
LIMIT 100;
```

## Knowledge Graphs

### Enterprise Knowledge Graph Schema

```cypher
// Create enterprise knowledge graph nodes
CREATE (product:Product {
    id: 'PROD-001',
    name: 'Enterprise Data Platform',
    category: 'Software',
    price: 50000
})

CREATE (tech:Technology {
    name: 'Apache Spark',
    category: 'Data Processing'
})

CREATE (capability:Capability {
    name: 'Real-time Analytics',
    domain: 'Data & Analytics'
})

CREATE (team:Team {
    name: 'Data Engineering',
    department: 'Engineering'
})

// Relationships in knowledge graph
CREATE (product)-[:BUILT_ON]->(tech)
CREATE (product)-[:ENABLES]->(capability)
CREATE (team)-[:OWNS]->(product)
CREATE (capability)-[:ALIGNED_TO {priority: 'high'}]->(:StrategicInitiative {name: 'Data Modernization'})
```

### Querying Knowledge Graphs

```cypher
// Find all products for a strategic initiative
MATCH (initiative:StrategicInitiative {name: 'Data Modernization'})
MATCH (capability)-[:ALIGNED_TO]->(initiative)
MATCH (product)-[:ENABLES]->(capability)
MATCH (team)-[:OWNS]->(product)
RETURN initiative.name,
       COLLECT(DISTINCT capability.name) AS capabilities,
       COLLECT(DISTINCT product.name) AS products,
       COLLECT(DISTINCT team.name) AS teams;

// Impact analysis: what's affected if a technology is deprecated?
MATCH (deprecated:Technology {name: 'Apache Spark'})
MATCH (product)-[:BUILT_ON]->(deprecated)
MATCH (product)-[:ENABLES]->(capability)
MATCH (capability)-[:ALIGNED_TO]->(initiative:StrategicInitiative)
RETURN deprecated.name AS deprecatedTech,
       COLLECT(DISTINCT product.name) AS affectedProducts,
       COLLECT(DISTINCT capability.name) AS affectedCapabilities,
       COLLECT(DISTINCT initiative.name) AS affectedInitiatives;
```

## Network Analysis

### Social Network Analysis

```cypher
// Find influencers (high PageRank)
CALL gds.pageRank.stream('social-graph', {
    maxIterations: 20,
    dampingFactor: 0.85
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS person, score
ORDER BY score DESC
LIMIT 20;

// Find communities
CALL gds.louvain.stream('social-graph', {
    maxLevels: 5
})
YIELD nodeId, communityId
WITH communityId, COLLECT(gds.util.asNode(nodeId).name) AS members,
     COUNT(*) AS memberCount
WHERE memberCount > 10
RETURN communityId, memberCount, members[..5]
ORDER BY memberCount DESC;

// Find bridges between communities
CALL gds.betweenness.stream('social-graph', {
    samplingSize: 10000
})
YIELD nodeId, score
WHERE score > 0.1  -- Significant bridges
RETURN gds.util.asNode(nodeId).name AS bridgePerson, score
ORDER BY score DESC;
```

### Influence Propagation

```cypher
// Simulate influence spread from a node
MATCH (influencer:Person {id: 'PERSON-001'})
CALL gds.bellmanFord.stream('social-graph', {
    sourceNode: influencer,
    relationshipWeightProperty: 'influence_weight'
})
YIELD targetNode, distance
WHERE distance <= 3  -- Within 3 hops
RETURN gds.util.asNode(targetNode).name AS influencedPerson, distance
ORDER BY distance;
```

## Identity Resolution

### Entity Resolution with Graphs

```cypher
// Match identities across systems by shared attributes
MATCH (crm:CustomerCRM {email: 'john@example.com'})
MATCH (support:CustomerSupport {email: 'john@example.com'})
MATCH (mktg:CustomerMarketing {email: 'john@example.com'})

// Create unified identity
MERGE (unified:UnifiedCustomer {global_id: 'GLOBAL-001'})
ON CREATE SET unified.name = crm.name,
              unified.email = crm.email,
              unified.created_at = timestamp()

// Link identities
MERGE (crm)-[:IS_SAME_AS]->(unified)
MERGE (support)-[:IS_SAME_AS]->(unified)
MERGE (mktg)-[:IS_SAME_AS]->(unified);
```

### Deduplication

```cypher
// Find potential duplicate customers
MATCH (c1:Customer)
MATCH (c2:Customer)
WHERE id(c1) < id(c2)
  AND (
    c1.email = c2.email
    OR (c1.phone = c2.phone AND c1.phone IS NOT NULL)
    OR (c1.name = c2.name AND c1.address = c2.address)
  )
RETURN c1.id, c1.name, c1.email,
       c2.id, c2.name, c2.email,
       CASE
         WHEN c1.email = c2.email THEN 'exact_match_email'
         WHEN c1.phone = c2.phone THEN 'exact_match_phone'
         ELSE 'name_address_match'
       END AS matchType;
```

## Master Data Management

### Product Hierarchy

```cypher
// Product category hierarchy
CREATE (electronics:Category {name: 'Electronics'})
CREATE (computers:Category {name: 'Computers'})
CREATE (laptops:Category {name: 'Laptops'})
CREATE (accessories:Category {name: 'Accessories'})

CREATE (electronics)-[:HAS_SUBCATEGORY]->(computers)
CREATE (computers)-[:HAS_SUBCATEGORY]->(laptops)
CREATE (computers)-[:HAS_SUBCATEGORY]->(accessories)

// Product with hierarchy
CREATE (product:Product {id: 'PROD-001', name: 'MacBook Pro'})
CREATE (product)-[:BELONGS_TO]->(laptops)

// Query: all products in Electronics hierarchy
MATCH (electronics:Category {name: 'Electronics'})
MATCH (electronics)-[:HAS_SUBCATEGORY*]->(subCategory:Category)
MATCH (product:Product)-[:BELONGS_TO]->(subCategory)
RETURN product.name, subCategory.name
ORDER BY subCategory.name;

// Query: product category path
MATCH path = (product:Product {id: 'PROD-001'})-[:BELONGS_TO]->(:Category)-[:HAS_SUBCATEGORY*0..]->(root:Category)
WHERE NOT EXISTS {
    MATCH (root)-[:HAS_SUBCATEGORY]->()  -- Root has no parent
}
RETURN product.name,
       [node IN nodes(path) | node.name] AS categoryPath;
```

## Rules
- Recommendation: collaborative filtering via common neighbor traversal
- Fraud detection: use path patterns for rings, velocity, and device clusters
- Knowledge graphs: model business concepts as nodes, relationships as connections
- Network analysis: use GDS algorithms (PageRank, Louvain, Betweenness)
- Identity resolution: graph enables cross-system entity linking
- Master data management: hierarchies modeled as tree structures
- Profile graph traversal patterns before optimizing with indexes
- Use weighted relationships for ranking and scoring
- Monitor traversal depth: limit user-facing queries to 3-5 hops
- Batch identity resolution: use periodic commit for large datasets
