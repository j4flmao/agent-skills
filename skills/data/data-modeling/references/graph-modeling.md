# Graph Modeling

## Purpose

Graph data modeling represents entities as nodes and relationships as edges, optimized for connected data and traversal queries. Unlike relational models where joins become expensive at depth, graph models excel at path-finding, recommendation, social network analysis, knowledge representation, and hierarchical queries. This covers labeled property graph model, node/edge design patterns, traversal patterns, indexing, and schema design for knowledge graphs, social networks, and recommendation systems.

## Graph Data Models

### Labeled Property Graph (LPG)

The most common graph model. Nodes have labels and properties. Edges have types, direction, and properties.

```
(Node:Person)─[:FRIENDS_WITH {since: 2020}]─>(Node:Person)
     │                                              │
     │                                              │
[:WORKS_AT {role: "Engineer"}]              [:WORKS_AT {role: "Designer"}]
     │                                              │
     ▼                                              ▼
(Node:Company {name: "Acme Corp", founded: 2010})
```

```cypher
// Neo4j — create nodes and relationships
CREATE (alice:Person {name: 'Alice', age: 30, email: 'alice@example.com'})
CREATE (bob:Person {name: 'Bob', age: 28, email: 'bob@example.com'})
CREATE (acme:Company {name: 'Acme Corp', founded: 2010, industry: 'Technology'})
CREATE (alice)-[:FRIENDS_WITH {since: 2020}]->(bob)
CREATE (alice)-[:WORKS_AT {role: 'Engineer', started: 2021}]->(acme)
CREATE (bob)-[:WORKS_AT {role: 'Designer', started: 2022}]->(acme)
```

### RDF Graph (Resource Description Framework)

Standard for the semantic web. Triples of subject-predicate-object.

```turtle
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix schema: <http://schema.org/> .

ex:alice a foaf:Person ;
    foaf:name "Alice" ;
    foaf:age 30 ;
    ex:email "alice@example.com" ;
    ex:worksAt ex:acme ;
    ex:role "Engineer" .

ex:bob a foaf:Person ;
    foaf:name "Bob" ;
    foaf:age 28 ;
    ex:email "bob@example.com" ;
    ex:worksAt ex:acme ;
    ex:role "Designer" .

ex:acme a schema:Organization ;
    schema:name "Acme Corp" ;
    schema:foundingDate "2010" ;
    schema:industry "Technology" .
```

### LPG vs RDF Comparison

| Aspect | Labeled Property Graph | RDF |
|--------|----------------------|-----|
| Data model | Nodes + edges + properties | Subject-predicate-object triples |
| Schema | Optional (labels constrain types) | Ontology (OWL, RDFS) |
| Query language | Cypher, Gremlin, GraphQL | SPARQL |
| Reasoning | Limited | Built-in inference |
| Interoperability | Less standardized | W3C standard |
| Performance | Fast traversal | Slower, more flexible |

## Node / Edge Design Patterns

### Node Design Principles

1. **Nodes represent entities** — people, places, things, concepts
2. **Labels categorize nodes** — use multiple labels for type hierarchy
3. **Properties on nodes** — attributes that describe the entity
4. **Nodes should be meaningful** — avoid creating nodes for simple attributes

```cypher
// Good node design
CREATE (alice:Person:Employee {name: 'Alice', employeeId: 'EMP001', email: 'alice@co.com'})

// Bad: creating a node for a simple attribute
CREATE (email:EmailAddress {value: 'alice@co.com'})
CREATE (alice)-[:HAS_EMAIL]->(email)
// Instead: store email as a property on Person
CREATE (alice:Person {email: 'alice@co.com'})
```

### Edge Design Principles

1. **Edges represent relationships** — actions, connections, ownership
2. **Type names are verbs** — `FRIENDS_WITH`, `WORKS_AT`, `PURCHASED`, `REVIEWED`
3. **Edges have direction** — always meaningful, even if bidirectional traversal is needed
4. **Properties on edges** — context about the relationship (timestamp, weight, role)

```cypher
// Edge with meaningful properties
CREATE (alice)-[:PURCHASED {
  orderId: 'ORD-123',
  amount: 59.99,
  timestamp: datetime('2026-05-15T10:30:00'),
  paymentMethod: 'credit_card'
}]->(product)

// Edge representing a review
CREATE (alice)-[:REVIEWED {
  rating: 5,
  text: 'Great product!',
  createdAt: datetime('2026-05-16')
}]->(product)
```

### Common Edge Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| Ownership | Node A owns Node B | `(:User)-[:OWNS]->(:Document)` |
| Membership | Node A belongs to Node B | `(:Person)-[:MEMBER_OF]->(:Team)` |
| Hierarchy | Parent-child relationship | `(:Category)-[:SUBCATEGORY_OF]->(:Category)` |
| Temporal | Time-bound relationship | `(:Employee)-[:WORKED_AT {from, to}]->(:Department)` |
| Weighted | Relationship with intensity | `(:Product)-[:SIMILAR_TO {score: 0.85}]->(:Product)` |
| Sequential | Ordered relationship | `(:Task)-[:NEXT]->(:Task)` |

## Graph Traversal Patterns

### Breadth-First Search (BFS)

```cypher
// Find all friends of friends (2 levels deep)
MATCH (alice:Person {name: 'Alice'})-[:FRIENDS_WITH*1..2]->(friend)
RETURN DISTINCT friend.name, friend.email

// Find shortest path between two people
MATCH p = shortestPath(
  (alice:Person {name: 'Alice'})-[:FRIENDS_WITH*]-(bob:Person {name: 'Bob'})
)
RETURN [node IN nodes(p) | node.name] AS path
```

### Path Finding

```cypher
// Find all paths from warehouse to store (logistics)
MATCH path = (warehouse:Warehouse {id: 'WH-1'})-[:TRANSITS_TO*1..5]->(store:Store {id: 'STORE-5'})
WHERE ALL(r IN relationships(path) WHERE r.status = 'active')
RETURN path,
       reduce(totalDist = 0, r IN relationships(path) | totalDist + r.distanceMiles) AS totalDistance
ORDER BY totalDistance ASC
LIMIT 3

// Variable-length traversal with filtering
MATCH (manager:Person {role: 'Manager'})-[:MANAGES*1..4]->(report:Person)
WHERE report.department = 'Engineering'
RETURN manager.name, collect(report.name) AS team
```

### Aggregation Traversal

```cypher
// Aggregate across relationships
MATCH (product:Product {id: 'PROD-123'})<-[review:REVIEWED]-()
RETURN
  count(review) AS reviewCount,
  avg(review.rating) AS averageRating,
  min(review.createdAt) AS firstReview,
  max(review.createdAt) AS lastReview

// Find most connected people
MATCH (person:Person)-[:FRIENDS_WITH]-()
RETURN person.name, count(*) AS connectionCount
ORDER BY connectionCount DESC
LIMIT 10
```

### Recommendation Traversal

```cypher
// Collaborative filtering: people who bought this also bought...
MATCH (target:Product {id: 'PROD-123'})<-[:PURCHASED]-(customer:Person)
MATCH (customer)-[:PURCHASED]->(other:Product)
WHERE other.id <> 'PROD-123'
RETURN other.name, count(*) AS frequency
ORDER BY frequency DESC
LIMIT 5

// Content-based: similar products by category and tags
MATCH (product:Product {id: 'PROD-123'})
MATCH (product)-[:IN_CATEGORY]->(category:Category)
MATCH (similar:Product)-[:IN_CATEGORY]->(category)
WHERE similar.id <> product.id
  AND size(apoc.coll.intersection(product.tags, similar.tags)) > 2
RETURN similar.name, similar.price,
       size(apoc.coll.intersection(product.tags, similar.tags)) AS commonTags
ORDER BY commonTags DESC
LIMIT 10
```

## Graph Indexing

### Node Property Indexes

```cypher
// Neo4j — create indexes on frequently queried properties
CREATE INDEX person_email_index FOR (p:Person) ON (p.email);
CREATE INDEX person_name_index FOR (p:Person) ON (p.name);
CREATE INDEX product_sku_index FOR (p:Product) ON (p.sku);

// Composite index for multi-property lookups
CREATE INDEX person_lookup_index FOR (p:Person) ON (p.lastName, p.firstName);

// Full-text index (for search)
CREATE FULLTEXT INDEX person_search FOR (p:Person) ON EACH [p.name, p.email, p.bio];
```

### Full-Text Search

```cypher
// Neo4j full-text search
CALL db.index.fulltext.queryNodes('person_search', 'Alice Smith')
YIELD node, score
RETURN node.name, node.email, score
ORDER BY score DESC
LIMIT 10
```

### Relationship Indexes

```cypher
// Neo4j 5+ — relationship property indexes
CREATE INDEX purchase_date_index FOR ()-[r:PURCHASED]-() ON (r.timestamp);

// Composite index on relationship properties
CREATE INDEX review_score_index FOR ()-[r:REVIEWED]-() ON (r.rating, r.createdAt);
```

### Indexing Strategy

| Query Pattern | Index Type | Example |
|--------------|------------|---------|
| Node lookup by property | B-tree index | `MATCH (p:Person {email: '...'})` |
| Range queries | B-tree index | `WHERE p.age > 30` |
| Text search | Full-text index | `WHERE p.name CONTAINS '...'` |
| Relationship property | B-tree (on rel) | `WHERE r.timestamp > date('2026-01-01')` |
| Geo queries | Spatial index | `WHERE distance(p.location, point) < 1000` |

## Graph Schema Design

### Knowledge Graphs

```cypher
// Knowledge graph schema pattern
// Nodes represent real-world entities (people, places, events, concepts)
// Edges represent semantic relationships

// Create a knowledge graph about technology companies
CREATE (apple:Company:Organization {
  name: 'Apple Inc.',
  founded: 1976,
  headquarters: 'Cupertino, CA',
  revenue: 394.3,
  industry: 'Technology'
})

CREATE (timCook:Person {
  name: 'Tim Cook',
  birthYear: 1960,
  role: 'CEO'
})

CREATE (iphone:Product {
  name: 'iPhone 16',
  releaseYear: 2024,
  category: 'Smartphone'
})

CREATE (apple)<-[:EMPLOYS {since: 1998, role: 'CEO'}]-(timCook)
CREATE (apple)-[:PRODUCES]->(iphone)
CREATE (iphone)-[:COMPETES_WITH]->(samsungGalaxy:Product {name: 'Galaxy S25'})

// Query: find all relationships involving Apple
MATCH (apple:Company {name: 'Apple Inc.'})-[r]-(connected)
RETURN type(r), connected.name
```

### Social Network

```cypher
// Social graph schema
// Users, posts, comments, likes, follows

CREATE (alice:User {
  id: 'user-1',
  username: 'alice',
  name: 'Alice Johnson',
  joinedAt: datetime('2024-01-15')
})

CREATE (post:Post {
  id: 'post-1',
  content: 'Hello world!',
  createdAt: datetime('2026-05-15T10:00:00'),
  tags: ['introduction', 'hello']
})

CREATE (alice)-[:POSTED]->(post)
CREATE (alice)-[:FOLLOWS {since: datetime('2026-03-01')}]->(bob:User {id: 'user-2', username: 'bob'})

// Social graph queries

// Feed: posts from followed users (last 20)
MATCH (me:User {id: 'user-1'})-[:FOLLOWS]->(followed:User)
MATCH (followed)-[:POSTED]->(post:Post)
RETURN post, followed.username, post.createdAt
ORDER BY post.createdAt DESC
LIMIT 20

// Mutual friends
MATCH (alice:User {id: 'user-1'})-[:FOLLOWS]->(common:User)<-[:FOLLOWS]-(bob:User {id: 'user-2'})
RETURN common.username

// Friend-of-friend suggestions (excluding existing follows)
MATCH (me:User {id: 'user-1'})-[:FOLLOWS]->(friend:User)
MATCH (friend)-[:FOLLOWS]->(suggestion:User)
WHERE NOT EXISTS((me)-[:FOLLOWS]->(suggestion))
  AND me <> suggestion
RETURN suggestion.username, count(*) AS commonFriends
ORDER BY commonFriends DESC
LIMIT 10
```

### Recommendation System

```cypher
// Recommendation graph schema
// Users, products, categories, purchases, reviews

// Product → Category hierarchy
CREATE (electronics:Category {name: 'Electronics'})
CREATE (phones:Category {name: 'Phones'})
CREATE (laptops:Category {name: 'Laptops'})
CREATE (phones)-[:SUBCATEGORY_OF]->(electronics)
CREATE (laptops)-[:SUBCATEGORY_OF]->(electronics)

// User interactions
CREATE (alice:User {id: 'u1'})-[:PURCHASED {quantity: 1, timestamp: datetime('2026-05-01')}]->(phone:Product {id: 'p1', name: 'Phone X', price: 999})
CREATE (alice)-[:VIEWED {timestamp: datetime('2026-05-10'), duration: 120}]->(laptop:Product {id: 'p2', name: 'Laptop Pro', price: 1999})
CREATE (alice)-[:REVIEWED {rating: 5, text: 'Great phone!'}]->(phone)

// Recommendation queries

// Item-based: "Customers who bought this also bought"
MATCH (target:Product {id: 'p1'})<-[:PURCHASED]-(customer:User)
MATCH (customer)-[:PURCHASED]->(other:Product)
WHERE other.id <> target.id
RETURN other.name, count(*) AS coPurchaseCount
ORDER BY coPurchaseCount DESC
LIMIT 5

// User-based collaborative filtering
MATCH (target:User {id: 'u1'})-[:PURCHASED]->(product:Product)
MATCH (similar:User)-[:PURCHASED]->(product)
WHERE similar.id <> target.id
MATCH (similar)-[:PURCHASED]->(recommendation:Product)
WHERE NOT EXISTS((target)-[:PURCHASED]->(recommendation))
RETURN recommendation.name, count(*) AS score
ORDER BY score DESC
LIMIT 5

// Content-based filtering (by category + tags)
MATCH (user:User {id: 'u1'})-[:PURCHASED|VIEWED]->(product:Product)
MATCH (product)-[:IN_CATEGORY]->(category:Category)
MATCH (recommendation:Product)-[:IN_CATEGORY]->(category)
WHERE NOT EXISTS((user)-[:PURCHASED]->(recommendation))
  AND recommendation.id <> product.id
RETURN recommendation.name, count(DISTINCT category) AS categoryMatch
ORDER BY categoryMatch DESC
LIMIT 10
```

### Graph Schema Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| Over-connecting | Connecting every node to every other | Add meaningful edges only; use computed relationships |
| Attributes as nodes | Storing a simple attribute as a connected node | Store as node property |
| No labels | All nodes have the same label | Use specific labels (Person, Product, Order) |
| Dense nodes | A node has millions of connected edges | Split into intermediate nodes or shard |
| Missing direction | Relationships that don't have meaningful direction | Always set a meaningful direction |
| No indexing | Traversal scanning all nodes | Index on all queried properties |

## Graph Query Optimization

### Profile Queries

```cypher
// Before optimization — profile the query
PROFILE
MATCH (user:User {id: 'u1'})-[:FRIENDS_WITH*1..3]-(connected)
RETURN count(DISTINCT connected)

// After adding index
CREATE INDEX user_id_index FOR (u:User) ON (u.id);
```

### Query Optimization Tips

1. **Anchor early** — start traversal from a specific node using an indexed property
2. **Limit variable-length paths** — use `*1..3` instead of `*`
3. **Filter early** — add WHERE clauses before traversals
4. **Use directed relationships** — `-[:TYPE]->` instead of `-[:TYPE]-`
5. **Prefer integer IDs** for indexed properties over strings
6. **Use `count(DISTINCT n)`** instead of collecting and counting
7. **Avoid `OPTIONAL MATCH`** when a regular `MATCH` works

```cypher
// Before (slow)
MATCH (user:User)
WHERE user.name CONTAINS 'Ali'
OPTIONAL MATCH (user)-[:FRIENDS_WITH]->(friend)
RETURN user, count(friend)

// After (faster) — index on name, early filtering
CREATE INDEX user_name_index FOR (u:User) ON (u.name)

MATCH (user:User)
WHERE user.name STARTS WITH 'Ali'
MATCH (user)-[:FRIENDS_WITH]->(friend)  // Regular MATCH
RETURN user, count(DISTINCT friend)
```

## Key Points

- Labeled Property Graphs (Neo4j, Amazon Neptune) are best for application data with connected queries.
- RDF graphs are best for semantic web, data integration, and ontology-driven applications.
- Nodes represent entities with labels and properties. Edges represent relationships with types, direction, and properties.
- Use verbs for edge types (FRIENDS_WITH, PURCHASED, WORKS_AT) — past tense for factual, present for current.
- Index all properties used in WHERE and MATCH filters. Use full-text indexes for text search.
- Anchor graph traversals at a specific indexed node before expanding outward.
- Variable-length paths (*1..n) are powerful but expensive — limit the depth.
- Common use cases: social networks (friends/follows), recommendations (collaborative + content-based filtering), knowledge graphs (entity relationships), and hierarchy navigation.
- Profile queries before and after optimization. Use PROFILE and EXPLAIN in Cypher.
- Avoid dense nodes, over-connecting, and storing attributes as nodes.
