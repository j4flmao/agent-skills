# Graph Data Modeling

## Property Graph vs RDF

### Property Graph Model
- Nodes have labels and key-value properties
- Relationships have types, direction, and properties
- Native graph traversal (pointer chasing)
- Best for: application databases, real-time queries

```cypher
// Property graph: Customer -> PURCHASED -> Product
(:Customer {name: "Alice", tier: "premium"})
-[:PURCHASED {amount: 250.00, timestamp: datetime("2025-03-15")}]->
(:Product {name: "Widget Pro", category: "electronics", price: 250.00})
```

### RDF Model
- Triple: subject -> predicate -> object
- Everything identified by URI
- OWL for formal ontologies and inference
- Best for: knowledge graphs, data integration, semantic web

```turtle
@prefix schema: <http://schema.org/> .
@prefix ex: <http://example.org/> .

ex:Alice a schema:Person ;
    schema:name "Alice" ;
    schema:knows ex:Bob .

ex:WidgetPro a schema:Product ;
    schema:name "Widget Pro" ;
    schema:category "electronics" .
```

## Node and Label Design

### Labeling Conventions
| Convention | Example | Guidance |
|------------|---------|----------|
| Singular noun | `:Customer` | Entity types |
| PascalCase | `:ProductCategory` | Multi-word labels |
| Hierarchical | `:User` and `:PremiumUser` | Subtype relationship |
| Role-based | `:Employee` vs `:Manager` | Same entity, different roles |

### Node Properties
```cypher
// Good: single entity, atomic properties
CREATE (c:Customer {
    id: "CUST-123",
    name: "Alice Johnson",
    email: "alice@example.com",
    tier: "premium",
    created_at: datetime("2024-01-15")
})

// Bad: embedding relationships as properties
CREATE (c:Customer {
    id: "CUST-123",
    purchased_products: ["PROD-A", "PROD-B"]  // should be relationships
})
```

## Relationship Design

### Relationship Type Conventions
| Pattern | Example | Direction |
|---------|---------|-----------|
| Present tense verb | `:PURCHASED` | Active voice |
| Past participle | `:LOCATED_IN` | State |
| Preposition | `:PART_OF` | Container |
| Domain-specific | `:MANAGED_BY`, `:REPORTS_TO` | Organization hierarchy |

### Relationship Properties
```cypher
// Relationship with context
MATCH (c:Customer {id: "CUST-123"})
MATCH (p:Product {sku: "PROD-A"})
CREATE (c)-[:PURCHASED {
    order_id: "ORD-001",
    quantity: 2,
    unit_price: 125.00,
    timestamp: datetime("2025-03-15")
}]->(p)

// Bidirectional traversal doesn't need both directions
MATCH (c:Customer)-[:PURCHASED]->(p:Product)
WHERE p.category = "electronics"
RETURN c.name, COUNT(*) AS purchases
```

## Naming Conventions

| Element | Style | Examples |
|---------|-------|----------|
| Node labels | PascalCase, singular | `Customer`, `ProductCategory`, `PurchaseOrder` |
| Relationship types | UPPER_SNAKE_CASE | `PURCHASED`, `LOCATED_IN`, `MANAGED_BY` |
| Properties | snake_case | `first_name`, `created_at`, `unit_price` |
| Index names | Descriptive | `idx_customer_email`, `idx_product_category` |
| Constraints | Action-oriented | `constraint_customer_id_unique` |

## Traversal Patterns

### Common Graph Traversal Patterns
```cypher
// 1. Direct relationship
MATCH (c:Customer {id: "123"})-[:PURCHASED]->(p:Product)
RETURN p.name;

// 2. Variable-length path (friend-of-friend)
MATCH (u:User {id: "123"})-[:FRIENDS_WITH*2..3]-(fof:User)
WHERE NOT (u)-[:FRIENDS_WITH]-(fof)
RETURN DISTINCT fof.name;

// 3. Shortest path
MATCH p = shortestPath(
    (a:Person {name: "Alice"})-[:KNOWS*]-(b:Person {name: "David"})
)
RETURN p;

// 4. Optional match (left outer join)
MATCH (c:Customer {id: "123"})
OPTIONAL MATCH (c)-[:PURCHASED]->(o:Order)
RETURN c.name, collect(o.id) AS orders;

// 5. Conditional traversal (where)
MATCH (c:Customer)-[:PURCHASED]->(o:Order)
WHERE o.total > 100 AND o.created_at > datetime("2025-01-01")
RETURN c.name, o.total;
```

### Aggregation in Traversals
```cypher
// Group by node label
MATCH (c:Customer)-[:PURCHASED]->(o:Order)
RETURN c.name,
       COUNT(o) AS order_count,
       SUM(o.total) AS total_spent,
       AVG(o.total) AS avg_order_value,
       MIN(o.total) AS min_order,
       MAX(o.total) AS max_order
ORDER BY total_spent DESC
LIMIT 20;
```

## Query Performance Optimization

### Profile and Plan Analysis
```cypher
// Profile query to see db hits
PROFILE
MATCH (c:Customer {tier: "premium"})
MATCH (c)-[:PURCHASED]->(o:Order)
RETURN c.name, COUNT(o) AS orders;

// Look for:
// - NodeByLabelScan (expensive, full scan)
// - Expand(All) vs Expand(Into) (Into is faster)
// - Rows vs DB hits ratio
```

### Use Parameters for Query Caching
```cypher
// Parameterized query (cached plan)
:PARAM customerId => "CUST-123", status => "shipped"

MATCH (c:Customer {id: $customerId})
MATCH (c)-[:PURCHASED]->(o:Order {status: $status})
RETURN o;
```

## References
- Neo4j graph modeling guide: https://neo4j.com/developer/graph-data-modeling/
- RDF 1.1 primer: https://www.w3.org/TR/rdf11-primer/
- Graph traversal patterns: https://neo4j.com/docs/getting-started/cypher/
