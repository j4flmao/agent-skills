# Graph Data Modeling

## Overview

Graph data modeling is the practice of designing node labels, relationship types, and property distributions to represent connected domains. Unlike relational modeling (normalization-first), graph modeling starts from traversal patterns: how will the data be queried? This reference covers property graph modeling, RDF ontology design, naming conventions, patterns, anti-patterns, and best practices.

## Property Graph Model

### Core Concepts

A property graph consists of:
- **Nodes**: entities with labels and properties
- **Relationships**: typed, directed connections between nodes with properties
- **Labels**: node type classifications (multiple labels per node allowed)
- **Types**: relationship type (directional, single type per relationship)
- **Properties**: key-value pairs on both nodes and relationships

### Node Labels

Node labels categorize entities. A node can have multiple labels for hierarchical classification.

```cypher
// Single label
CREATE (:Customer {id: '123', name: 'Alice'});

// Multiple labels (hierarchical)
CREATE (:Customer:Premium:Wholesale {id: '456', name: 'Bob'});

// Query by any label
MATCH (c:Premium) RETURN c;
MATCH (c:Customer:Wholesale) RETURN c;
```

Label design principles:
- Labels are like entity types (similar to table names)
- Multiple labels enable multi-taxonomy categorization
- Label names are PascalCase by convention
- Avoid creating too many labels (stick to 10-30 per domain)
- Labels should have clear semantics that non-technical stakeholders understand

### Relationship Types

Relationship types describe the connection between nodes. They are directional and follow present-tense verb conventions.

```cypher
CREATE (alice:Customer {name: 'Alice'})
CREATE (order1:Order {id: 'ORD-001'})
CREATE (alice)-[:PURCHASED {at: datetime(), total: 150.00}]->(order1);

CREATE (order1)-[:CONTAINS {quantity: 2}]->(product1:Product {sku: 'PRD-001'});
```

Relationship design principles:
- Type names are UPPERCASE_VERBS by convention
- Direction matters: `(node1)-[:TYPE]->(node2)` is different from `(node2)-[:TYPE]->(node1)`
- Every relationship type must have clear inverse semantics
- Use specific verbs: `PURCHASED`, not `RELATED_TO`
- Maximum 30-50 relationship types per domain

### Properties on Relationships vs Nodes

A critical modeling decision is where to place properties:

| Property | Placement | Example |
|---|---|---|
| Entity attribute (static) | Node property | Customer name, email |
| Connection attribute (contextual) | Relationship property | Purchase date, quantity |
| Time-varying | Relationship property | Employment period, role |
| Aggregated | Node property (computed) | Order total, customer lifetime value |
| Many-to-many attribute | Relationship property | Rating, relationship strength |

```cypher
// GOOD: timestamps belong on the relationship
CREATE (:Customer {name: 'Alice'})-[:PURCHASED {
    at: datetime('2025-05-15T10:30:00'),
    total: 150.00,
    channel: 'web'
}]->(:Order {id: 'ORD-001'});

// BAD: timestamps as node properties lose connection context
CREATE (:Customer {name: 'Alice', last_purchase: datetime('2025-05-15T10:30:00')});
```

## Data Modeling Process

### Step 1: Query-Driven Design

Unlike relational modeling (normalize entities first, then query), graph modeling starts with queries:

```
1. List all query patterns
2. Identify entities in queries → nodes
3. Identify connections in queries → relationships
4. Identify attributes in queries → properties
5. Determine entry points for each query → indexes
6. Determine traversal depth → relationship design
7. Profile with representative data
```

Example query-driven design:

```
Query: "Find all products purchased by customers in the US who also bought product X"
Entities: Customer, Product, Order
Connections: Customer → PURCHASED → Order → CONTAINS → Product
Entry point: Customer.region = 'US' (index needed)
Traversal: Customer → Order → Product (2 hops)
Join condition: Product.sku = 'X' (nested query or second traversal)
```

### Step 2: Entity Identification

```
Domain entities → Node labels
  Customer, Product, Order, Supplier, Category, Review, Address
Each entity gets a label and unique constraint on its identifier
```

### Step 3: Relationship Identification

```
Connections between entities → Relationship types
  Customer → PURCHASED → Order
  Order → CONTAINS → Product
  Customer → REVIEWED → Product
  Product → BELONGS_TO → Category
  Product → SUPPLIED_BY → Supplier
  Order → SHIPPED_TO → Address
```

### Step 4: Property Distribution

```
For each property, decide: node or relationship?
  Customer.name → Node property
  Order.total → Node property (computed from line items)
  PURCHASED.at → Relationship property
  CONTAINS.quantity → Relationship property
  REVIEWED.rating → Relationship property
  REVIEWED.comment → Relationship property
```

### Step 5: Index and Constraint Design

```
Entry point properties → Index
  Customer.id (unique constraint)
  Customer.email (unique constraint)
  Customer.region (range index for filtering)
  Product.sku (unique constraint)
  Product.name (text index for search)
  Order.created_at (range index for time-range queries)
```

## Modeling Patterns

### Pattern 1: Simple Hierarchy

```
(:Manager)-[:MANAGES]->(:Employee)

For a single-level hierarchy (manager → employee):
- Direct and simple
- LIMIT depth to 1-2 levels
- Add properties for level/role
```

### Pattern 2: Recursive Hierarchy

```
(:Employee)-[:REPORTS_TO]->(:Employee)

For reporting structures of any depth:
- Use variable-length paths
- MATCH (e:Employee)-[:REPORTS_TO*1..5]->(manager)
- Watch for cycles
- Profile performance for deep trees
```

### Pattern 3: Time-Varying Relationships

```cypher
// Model employment periods with valid_from/valid_to
CREATE (alice:Employee {name: 'Alice'})
CREATE (acme:Company {name: 'Acme Corp'})
CREATE (alice)-[:EMPLOYED_AT {
    role: 'Engineer',
    valid_from: date('2023-01-01'),
    valid_to: date('2024-06-30'),
    is_current: false
}]->(acme);

// Current employment
CREATE (alice)-[:EMPLOYED_AT {
    role: 'Senior Engineer',
    valid_from: date('2024-07-01'),
    valid_to: null,
    is_current: true
}]->(acme);
```

### Pattern 4: Many-to-Many with Context

```cypher
// Products and categories (many-to-many)
(:Product)-[:ASSIGNED_TO {weight: 0.8, assigned_by: 'ML'}]
  ->(:Category {name: 'Electronics'})

// A product can be in multiple categories with different relevance scores
```

### Pattern 5: Graph as Index

```cypher
// Use the graph to index entities for fast lookup
// Then traverse for the actual query
MATCH (c:Customer {email: 'alice@org.com'})
MATCH (c)-[:PURCHASED]->(o:Order)-[:CONTAINS]->(p:Product)
WHERE p.category = 'Electronics'
RETURN p.name, o.created_at
```

### Pattern 6: Intermediate Node

When a relationship needs to carry many properties or has its own lifecycle, promote it to an intermediate node:

```cypher
// Instead of a rich relationship:
(:Student)-[:ENROLLED {
    enrollment_date: date,
    grade: 'A',
    semester: '2025-Spring',
    status: 'active',
    credits: 3
}]->(:Course)

// Promote to intermediate node:
(:Student)-[:HAS_ENROLLMENT]->(:Enrollment {
    enrollment_date: date,
    grade: 'A',
    semester: '2025-Spring',
    status: 'active',
    credits: 3
})-[:FOR_COURSE]->(:Course)
```

This enables:
- Multiple relationships to the intermediate node
- Querying the enrollment directly
- Attaching audit trail to the enrollment
- More efficient property-indexed lookups

## RDF and Semantic Modeling

### RDF Basics

RDF (Resource Description Framework) models data as subject-predicate-object triples:

```turtle
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:Alice rdf:type ex:Customer .
ex:Alice ex:hasName "Alice Smith" .
ex:Alice ex:hasEmail "alice@org.com" .
ex:ORD-001 rdf:type ex:Order .
ex:Alice ex:purchased ex:ORD-001 .
ex:ORD-001 ex:hasTotal "150.00"^^xsd:decimal .
```

### RDFS and OWL

RDFS (RDF Schema) adds class hierarchies and property domains/ranges.
OWL (Web Ontology Language) adds advanced reasoning capabilities.

```turtle
# RDFS ontology
ex:Customer rdfs:subClassOf ex:Person .
ex:Employee rdfs:subClassOf ex:Person .
ex:hasEmail rdfs:domain ex:Person ;
            rdfs:range xsd:string .
ex:purchased rdfs:domain ex:Customer ;
             rdfs:range ex:Order .

# OWL restrictions
ex:Customer rdfs:subClassOf [
    rdf:type owl:Restriction ;
    owl:onProperty ex:hasEmail ;
    owl:cardinality 1
] .
```

When to use RDF vs property graph:

| Factor | Property Graph | RDF/OWL |
|---|---|---|
| Schema flexibility | Schema-optional | Schema-imposed |
| Reasoning | None | OWL inference |
| Query language | Cypher, Gremlin | SPARQL |
| Tooling | Neo4j, Neptune, JanusGraph | Stardog, GraphDB, Jena |
| Standardization | Less standard | W3C standards |
| Performance | Better for traversals | Better for inference |
| Best for | Applications, analytics | Knowledge graphs, data integration |

## Knowledge Graph Design

### Ontology-First Approach

For knowledge graphs, define the ontology before ingesting data:

```
1. Domain analysis → key concepts and relationships
2. Ontology definition → classes, properties, constraints
3. Mapping rules → how source data maps to ontology
4. Named entity resolution → entity linking and dedup
5. Data ingestion → triple generation and validation
6. Reasoning → infer new relationships via OWL
7. Validation → query against ontology requirements
```

### Entity Resolution

```cypher
// sameAs links for entity resolution
CREATE (ex:ExternalEntity {id: 'ext-001', name: 'Alice Smith'})
CREATE (internal:Customer {id: 'cust-123', name: 'A. Smith'})
CREATE (ex)-[:SAME_AS {confidence: 0.92, method: 'ML_matcher'}]->(internal);

// Query merged entities
MATCH (ex:ExternalEntity)-[:SAME_AS]->(c:Customer)
WHERE ex.id = 'ext-001'
RETURN c.name, c.id
```

### Taxonomies with SKOS

```turtle
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

ex:Electronics rdf:type skos:Concept ;
    skos:prefLabel "Electronics"@en ;
    skos:broader ex:Products ;
    skos:narrower ex:Computers, ex:Phones, ex:Audio .

ex:Computers skos:prefLabel "Computers"@en ;
    skos:broader ex:Electronics .
```

SKOS properties: `broader`, `narrower`, `related`, `exactMatch`,
`closeMatch`, `prefLabel`, `altLabel`, `definition`, `example`.

## Graph Embeddings for ML

Graph embeddings convert graph elements (nodes, relationships, whole graphs) into vector representations for machine learning.

```python
from node2vec import Node2Vec

# Generate walks
model = Node2Vec(
    graph, dimensions=128,
    walk_length=30, num_walks=200,
    workers=4, p=1, q=1
)

# Train word2vec on walks
embeddings = model.fit(window=10, min_count=1, batch_words=4)

# Use embeddings as features
features = embeddings.wv['customer_123']
```

Embedding methods:
- **node2vec**: random walks + word2vec (flexible, general)
- **DeepWalk**: uniform random walks (simple, fast)
- **TransE**: translates entities and relations in vector space (link prediction)
- **GraphSAGE**: inductive embedding with feature aggregation (large graphs)
- **GCN**: spectral graph convolution (transductive, semi-supervised)
- **GAT**: attention-based neighborhood aggregation (weighted neighbors)

## Modeling Anti-Patterns

1. **Generic relationship types**: `RELATED_TO`, `CONNECTED_TO`, `ASSOCIATED_WITH` lose all semantic meaning. Always use specific verbs.
2. **Deep nesting without aggregation**: 6+ hops for OLTP queries kills performance. Pre-aggregate or use graph projection.
3. **Properties duplicating relationship semantics**: storing `manager_of` as a property on an Employee node instead of a `MANAGES` relationship.
4. **Over-normalization**: creating a separate node for every attribute, resulting in a spider-like graph where simple properties become node traversal overhead.
5. **Ignoring direction semantics**: modeling `(Person)-[:PARENT_OF]->(Person)` without clear direction convention leads to confusing queries.
6. **No constraints on entry points**: every query starts with an unindexed property scan, leading to full graph scans.
7. **Using relationship properties for data that belongs on nodes**: storing customer name on PURCHASED relationship instead of Customer node.
8. **Creating duplicate relationships**: both `(A)-[:KNOWS]->(B)` and `(B)-[:KNOWS]->(A)` instead of a single undirected KNOWS relationship.

## References
- Robinson, Webber, Eifrem. "Graph Databases" (O'Reilly, 2015)
- Neo4j Graph Data Modeling Guidelines: https://neo4j.com/developer/guide-data-modeling/
- Angles and Gutierrez. "Survey of Graph Database Models" (ACM Computing Surveys, 2008)
- W3C RDF Primer: https://www.w3.org/TR/rdf11-primer/
- W3C OWL Overview: https://www.w3.org/OWL/
- Grover and Leskovec. "node2vec: Scalable Feature Learning for Networks" (KDD 2016)
- RDF 1.1 Turtle: https://www.w3.org/TR/turtle/
- SKOS Reference: https://www.w3.org/TR/skos-reference/
