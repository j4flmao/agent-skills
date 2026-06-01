---
name: data-modeling
description: >
  Use this skill when designing relational or graph data models — 3NF, star schema, Data Vault, property graphs, RDF graphs, table inheritance, temporal tables, graph traversal patterns, knowledge graphs. This skill enforces: normalization 3NF by default, denormalization only when performance-proven, surrogate keys over natural keys, graph modeling with node/edge design patterns, and schema-first design. Covers relational databases (PostgreSQL, MySQL) and graph databases (Neo4j, Amazon Neptune, Dgraph). Do NOT use for: dimensional modeling (see dimensional-modeling skill), NoSQL document modeling, or streaming data schemas.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, modeling, relational, graph, phase-7]
---

# Data Modeling

## Purpose
Design robust, maintainable data models for relational and graph data stores with clear schema design principles, normalization strategies, and traversal patterns.

## Agent Protocol

### Trigger
Exact user phrases: "data model", "schema design", "normalization", "denormalization", "3NF", "table inheritance", "soft delete", "surrogate key", "graph model", "property graph", "RDF", "knowledge graph", "node edge model", "graph traversal".

### Input Context
- Data store type (relational, graph, or hybrid)
- Access patterns (OLTP, OLAP, graph queries)
- Volume and growth expectations
- Consistency and integrity requirements
- Existing schema constraints and migration path
- Team expertise with relational vs graph technologies

### Output Artifact
DDL statements, graph schema definitions, migration scripts. No file unless requested.

### Response Format
```
## Entity: {name}
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| {field} | {type} | {constraints} | {notes} |
```
```
## Graph: {name}
Nodes: {node types with properties}
Edges: {edge types with properties}
Indexes: {indexed properties}
Traversal: {common query patterns}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Entities normalized to appropriate normal form
- [ ] Table inheritance pattern selected (if applicable)
- [ ] Temporal tracking strategy defined (if needed)
- [ ] Soft delete vs hard delete decided per entity
- [ ] Surrogate vs composite key decision documented per table
- [ ] Graph node/edge schema defined with property types
- [ ] Graph traversal patterns identified and indexed
- [ ] Migration strategy defined (expand-contract or in-place)

### Max Response Length
200 lines of schema and code.

## Workflow

### Step 1: Conceptual Model
Identify entities, relationships, and business rules independent of technology. Each entity represents a real-world object or concept. Relationships describe how entities interact. Business rules become constraints and invariants.

#### Conceptual Model Template
```
Entity: Order
  Attributes: order_id, order_date, total_amount, status, customer_id
  Relationships:
    belongs_to Customer (many-to-one)
    has_many OrderItem (one-to-many)
    has_many Payment (one-to-many)
Business Rules:
  - Total amount = sum of line items + tax + shipping
  - Order status transitions: draft → submitted → confirmed → shipped → delivered
  - An order cannot be deleted after shipment
```

#### Entity Discovery Techniques
Event storming: domain experts place sticky notes for domain events, commands, aggregates. Noun extraction: extract nouns from business requirements and user stories. CRUD analysis: identify create/read/update/delete operations per entity. Data flow mapping: trace data from source to consumption to identify entities.

### Step 2: Relational or Graph Decision

#### Decision Flow
```
Primary access pattern?
├── Fixed schema, complex joins, ACID required
│   └── Relational database (PostgreSQL, MySQL)
├── Highly connected data, variable-depth traversal
│   └── Graph database (Neo4j, Neptune, Dgraph)
├── Both needed
│   ├── Same data → Hybrid (relational for OLTP, graph for traversal)
│   └── Different data → Choose per workload
└── Schema evolves frequently
    └── Graph database (schemaless by default)
```

#### Relational Strengths
ACID transactions, mature ecosystem, strong consistency, complex queries via SQL, reporting and BI tools, well-known operational patterns. Best for: financial systems, inventory management, user accounts, any system requiring strict consistency.

#### Graph Strengths
Variable-depth traversals (friend-of-friend, supply chain), path-finding (shortest route, influence path), highly connected data queries, schema flexibility. Best for: social networks, recommendation engines, fraud detection (ring analysis), knowledge graphs, network/infrastructure management.

#### Hybrid Examples
Customer data in PostgreSQL for transactional processing, replicated to Neo4j for recommendation and fraud. Product catalog in PostgreSQL for CMS, with graph for personalized product discovery. Reference data in both with synchronization via CDC.

### Step 3: Normalization

#### Normal Forms Reference
1NF: each column holds atomic values (no arrays, no comma-separated lists), each row is unique, columns within a row are independent. 2NF: 1NF + every non-key column depends on the ENTIRE primary key (eliminate partial dependencies — relevant only for composite keys). 3NF: 2NF + every non-key column depends ONLY on the primary key (eliminate transitive dependencies — where A → B → C means C depends indirectly on A via B). BCNF: 3NF + every determinant is a candidate key. 4NF: BCNF + no multi-valued dependencies. 5NF: 4NF + join dependencies.

#### Normalization Examples

Unnormalized (one table):
| order_id | customer_name | customer_email | product_ids | product_names | quantities | prices |
|---|---|---|---|---|---|---|

1NF (atomic columns):
| order_id | customer_name | customer_email | product_id | product_name | quantity | price |
|---|---|---|---|---|---|---|
| O1 | Alice | a@x.com | P1 | Widget | 2 | 10.00 |
| O1 | Alice | a@x.com | P2 | Gadget | 1 | 25.00 |

2NF (remove partial dependency — separate order header from line items):
orders: order_id PK, customer_name, customer_email
order_items: order_id PK/FK, product_id PK/FK, quantity, price

3NF (remove transitive dependency — separate customer from order):
orders: order_id PK, customer_id FK, order_date, status
customers: customer_id PK, name, email, phone
order_items: order_id PK/FK, product_id PK/FK, quantity, unit_price
products: product_id PK, name, description, current_price

#### Denormalization Decision Tree
```
Performance requirement measured?
├── No → Stay normalized (3NF/BCNF)
├── Yes — query profiling shows joins are bottleneck
│   ├── Read-heavy, few writes → Add denormalized columns
│   ├── Reporting queries → Add summary/aggregate table
│   ├── High-traffic API → Add materialized view
│   └── Full-text search → Add search index (Elasticsearch)
└── Yes — but writes are frequent
    ├── Maintain denormalized data via triggers/CDC
    └── Accept eventual consistency with reconciliation job
```

#### Common Denormalization Patterns
Pre-join columns: add frequently-joined column values (customer_name in orders table) — manage via application logic or triggers. Summary tables: pre-aggregated totals (daily order summary) — refresh on schedule. Materialized views: database-managed pre-computed query results — refresh on demand or periodically. Report tables: denormalized tables optimized for specific reports — rebuild from normalized sources.

### Step 4: Key Strategy

#### Surrogate Keys
Auto-generated, meaningless unique identifiers. UUID v7 (time-ordered): globally unique, sortable by creation time, no sequential guessing. SERIAL/BIGSERIAL: auto-incrementing integer, compact, fast for indexing, but sequential and database-specific. UUID v4: random UUID, no ordering, poor index locality, but globally unique without coordination.

#### Decision: Surrogate vs Natural

| Factor | Surrogate | Natural |
|---|---|---|
| Stability | Never changes | Can change (customer email change) |
| Size | 16 bytes (UUID) or 4-8 bytes (serial) | Variable (VARCHAR) |
| Uniqueness | Guaranteed | Business-dependent |
| Meaning | None — just an identifier | Self-documenting |
| Distribution | Works across systems | May conflict |
| Performance | Fast integer/UUID | Slower string comparison |

Rules: surrogate keys as default. Natural keys: ISO country codes, tax IDs, SSNs, ISBNs — stable, unique, universally recognized. Composite keys: for join/link tables only (order_id + product_id).

#### Primary Key Examples

```sql
-- UUID v7 (PostgreSQL with pg_uuidv7)
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v7() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SERIAL (compact, PostgreSQL)
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL
);

-- Natural key (stable identifier)
CREATE TABLE countries (
    iso_code CHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Composite key (join table)
CREATE TABLE order_items (
    order_id UUID REFERENCES orders(id) NOT NULL,
    product_id BIGSERIAL REFERENCES products(id) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
```

### Step 5: Table Inheritance Patterns

#### Single Table Inheritance
All subclasses in one table with nullable columns. Pros: simple, no joins, easy to query. Cons: wasted space on nulls, hard to add constraints per subclass, table width grows. Best for: few subclasses, few unique columns per subclass.

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('credit_card', 'bank_transfer', 'paypal')),
    -- Credit card specific
    card_last_four VARCHAR(4),
    card_expiry DATE,
    -- Bank transfer specific
    bank_account VARCHAR(50),
    routing_number VARCHAR(9),
    -- Paypal specific
    paypal_email VARCHAR(255),
    CHECK (payment_type = 'credit_card' AND card_last_four IS NOT NULL OR
           payment_type != 'credit_card' AND card_last_four IS NULL)
);
```

#### Class Table Inheritance
One table per class (base + subclasses) sharing the same PK. Pros: no nullable columns, proper constraints per subclass, normalized. Cons: requires join to get full data. Best for: many subclasses, many unique columns per subclass.

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_card_payments (
    id UUID PRIMARY KEY REFERENCES payments(id),
    card_last_four VARCHAR(4) NOT NULL,
    card_expiry DATE NOT NULL
);

CREATE TABLE bank_transfer_payments (
    id UUID PRIMARY KEY REFERENCES payments(id),
    bank_account VARCHAR(50) NOT NULL,
    routing_number VARCHAR(9) NOT NULL
);
```

### Step 6: Temporal Tables

#### Strategy Selection
Valid time: when the fact was true in reality. Transaction time: when the fact was recorded in the database. Bi-temporal: both valid and transaction time. Decision: valid time for business reporting (report sales as of fiscal date), transaction time for audit (show data as it appeared yesterday), bi-temporal for regulated industries needing both.

#### Implementation Patterns

```sql
-- Valid time with valid_from/valid_to
CREATE TABLE product_price (
    product_id UUID REFERENCES products(id),
    price DECIMAL(10,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,  -- NULL means currently valid
    PRIMARY KEY (product_id, valid_from)
);

-- Query current price
SELECT * FROM product_price
WHERE product_id = $1 AND valid_to IS NULL;

-- Query price as of specific date
SELECT * FROM product_price
WHERE product_id = $1
  AND valid_from <= $as_of_date
  AND (valid_to IS NULL OR valid_to > $as_of_date);
```

```sql
-- PostgreSQL system-versioned temporal tables (PG 17+)
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    status TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    sys_period tstzrange NOT NULL DEFAULT tstzrange(now(), null)
);

CREATE TABLE orders_history (LIKE orders);
CREATE TRIGGER version_orders BEFORE INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION version_table('sys_period', 'orders_history');

-- Query as of specific time
SELECT * FROM orders FOR SYSTEM_TIME AS OF '2026-01-15 12:00:00';
```

### Step 7: Soft Delete vs Hard Delete

#### Decision Tree
```
Legal/regulatory retention requirement?
├── Yes → Hard delete after retention period (permanent)
├── No
│   ├── Data used in historical reporting?
│   │   ├── Yes → Soft delete (mark inactive, keep for FK integrity)
│   │   └── No → Hard delete (permanent removal)
│   ├── User data privacy request (GDPR right to erasure)?
│   │   ├── Yes → Anonymize instead of delete
│   │   └── No → Soft delete
│   └── Risk of accidental deletion needing recovery?
│       ├── Yes → Soft delete with purge job after 30 days
│       └── No → Hard delete
```

```sql
-- Soft delete pattern
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMPTZ;

-- Queries exclude deleted
SELECT * FROM customers WHERE deleted_at IS NULL;

-- Unique index excluding soft-deleted
CREATE UNIQUE INDEX idx_customers_email_active
ON customers(email) WHERE deleted_at IS NULL;
```

### Step 8: Graph Node/Edge Design

#### Property Graph Model
Nodes: entities with labels and properties. Edges: relationships with direction, type, and properties.

```cypher
// Neo4j schema example
CREATE CONSTRAINT customer_id IF NOT EXISTS FOR (c:Customer) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE;

// Node definitions
// (:Customer {id, name, email, segment, created_at})
// (:Product {id, name, category, price})
// (:Order {id, total, status, created_at})

// Edge definitions
// (:Customer)-[:PLACED {at}]->(:Order)
// (:Order)-[:INCLUDES {quantity, unit_price}]->(:Product)
// (:Product)-[:BELONGS_TO]->(:Category)
// (:Customer)-[:FRIENDS_WITH {since}]->(:Customer)
```

#### RDF Graph Model
Subject-predicate-object triples using URIs. Best for: knowledge graphs, linked data, data integration across domains.

```turtle
@prefix ex: <http://example.org/> .
@prefix schema: <http://schema.org/> .

ex:order-123 a ex:Order ;
    schema:orderDate "2026-01-15"^^xsd:date ;
    schema:price "245.00"^^xsd:decimal ;
    ex:placedBy ex:customer-456 ;
    ex:includes ex:line-item-789 .

ex:customer-456 a ex:Customer ;
    schema:name "Alice Smith" ;
    schema:email "alice@example.com" .
```

### Step 9: Indexing Strategy

#### Index Types by Use Case

| Index Type | Use Case | Example |
|---|---|---|
| B-tree (default) | Equality, range queries, sorting | `CREATE INDEX ON orders(created_at)` |
| Hash | Equality only | `CREATE INDEX ON orders USING HASH(status)` |
| GiST | Full-text search, geometric, range | `CREATE INDEX ON events USING GIST(occurred_at, daterange)` |
| GIN | Array, JSON, full-text search | `CREATE INDEX ON products USING GIN(tags)` |
| BRIN | Large, naturally ordered tables | `CREATE INDEX ON logs USING BRIN(created_at)` |
| Composite | Multi-column filters | `CREATE INDEX ON orders(status, created_at)` |
| Partial | Filtered queries on subset | `CREATE INDEX ON orders(created_at) WHERE status = 'pending'` |
| Covering | Index-only scans | `CREATE INDEX ON orders(customer_id) INCLUDE(total_amount)` |

#### Indexing Rules
Every foreign key must be indexed. Index columns used in WHERE, JOIN, ORDER BY, GROUP BY. Prefer composite indexes for common multi-column filter patterns. Use partial indexes for large tables with skewed data. Order columns in composite indexes: equality first, then range. Monitor unused indexes and remove them.

```sql
-- Order matters: equality columns first, range columns last
CREATE INDEX idx_orders_status_created
ON orders(status, created_at);
-- WHERE status = 'shipped' AND created_at > '2026-01-01' → uses index efficiently

-- Covering index for index-only scans
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id) INCLUDE(total_amount, status, created_at);
```

### Step 10: Migration Strategy

#### Expand-Contract Pattern
Phase 1 (Expand): Add new schema alongside existing. Create new tables, columns, or databases. Write to both old and new. Phase 2 (Migrate): Backfill data from old to new. Phase 3 (Contract): Remove old schema, drop old tables, remove dual-write code.

```sql
-- Phase 1: Add new column
ALTER TABLE orders ADD COLUMN new_status VARCHAR(20);
-- Update application to write to both status and new_status

-- Phase 2: Backfill
UPDATE orders SET new_status = status WHERE new_status IS NULL;

-- Phase 3: Remove old
ALTER TABLE orders DROP COLUMN status;
ALTER TABLE orders RENAME COLUMN new_status TO status;
```

#### Versioned Schema Migrations
Use Liquibase, Flyway, or Alembic. Naming: V{version}__{description}.sql. Every migration is transactional and reversible. Never modify a committed migration — create a new one. Migration ordering: sequential version numbers, not timestamps.

## Decision Trees

### Key Strategy Decision Tree
```
Will the key value ever change?
├── Yes (email, username, phone) → Surrogate key
├── No
│   ├── Is it globally unique and standardized?
│   │   ├── Yes (ISO code, tax ID, ISBN) → Natural key
│   │   └── No → Surrogate key
└── Is multi-system coordination needed?
    ├── Yes → UUID v7 (time-ordered)
    └── No → SERIAL/BIGSERIAL
```

### Normal Form Decision Tree
```
What is the workload?
├── OLTP (many small writes, point queries)
│   ├── 3NF or BCNF by default
│   ├── Denormalize only when profiling proves necessity
│   └── Use views for denormalized access patterns
├── OLAP (large reads, aggregations, reporting)
│   ├── Star schema (dimensional modeling)
│   ├── Limited normalization on dimensions
│   └── Denormalized fact tables
└── Mixed (HTAP)
    ├── Normalized OLTP schema
    └── Replicate to OLAP store for analytics
```

### Table Inheritance Decision Tree
```
How many subclasses?
├── 2-3 subclasses, few unique attributes
│   └── Single table inheritance
├── 3+ subclasses, many unique attributes
│   ├── Few queries need all subclass data → Class table inheritance
│   └── Queries always need all subclass data → Single table with JSON
└── Subclasses differ significantly in behavior
    └── Separate tables entirely (no shared base)
```

## Anti-Patterns

### Over-Normalization
Symptom: queries joining 15+ tables for simple lookups. Consequence: poor read performance, complex queries. Fix: selectively denormalize, use views, materialize frequently-joined paths.

### Under-Normalization (God Table)
Symptom: single table with 100+ columns, repeated data across rows. Consequence: update anomalies, data inconsistency, bloat. Fix: normalize to 3NF, separate entities.

### Natural Keys as Primary Keys
Symptom: email as PK, username as PK, SSN as PK. Consequence: slow joins (string comparison), cascading updates when value changes, security exposure (PII in FK). Fix: surrogate keys with unique constraint on natural identifiers.

### One-Size-Fits-All Schema
Symptom: same schema for OLTP and OLAP. Consequence: suboptimal for both. Fix: normalized for OLTP, star schema for OLAP, replicate via ETL/CDC.

### Ignoring Index Maintenance
Symptom: 50 indexes on a table, all used in different queries. Consequence: write slowdown, index bloat, vacuum overhead. Fix: monitor index usage, remove unused indexes, use partial indexes.

## Performance Patterns

### Read Replicas
Route read queries to replicas, writes to primary. Use for: reporting workloads, dashboard queries, read-heavy APIs. Ensure: replication lag monitoring, tolerate stale reads.

### Partitioning
Range partitioning by time (orders by month) for natural data lifecycle management. List partitioning by category (region, status). Hash partitioning for even distribution. Benefits: partition pruning for faster queries, easy data archival (detach partition).

```sql
-- Range partitioning by month
CREATE TABLE orders (
    id UUID NOT NULL,
    created_at DATE NOT NULL,
    total_amount DECIMAL(10,2)
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_01 PARTITION OF orders
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE orders_2026_02 PARTITION OF orders
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### Caching
Application-level cache (Redis) for frequently-read, infrequently-updated data. Query cache for identical queries. Materialized views for complex aggregations. CDN for static data. Always set TTLs and have cache invalidation strategy.

## Testing Patterns

### Schema Test Categories
Structural tests: all tables have primary keys, all FKs are indexed, no duplicate indexes, column types match application expectations. Integrity tests: FK constraints are not violated, unique constraints hold, check constraints validate data. Migration tests: migrations run forward and backward, rollback produces original state, no data loss on migration.

### CI Pipeline for Schema Changes
Check commit → lint SQL (sqlfluff) → run on ephemeral DB → verify schema → run migration test → run integration tests → deploy to staging. Use tools like pgTAP, Sqitch, or custom scripts.

## Rules
- 3NF is the default. Denormalize only when performance-measured.
- Surrogate keys default. Natural keys only for stable identifiers.
- Prefer soft delete unless data retention law requires hard delete.
- Audit columns (created_at, updated_at, created_by) on every table.
- Every foreign key must be indexed.
- Graph properties used in WHERE and traversal must have indexes.
- Temporal tables use valid_from/valid_to or PERIOD FOR.
- Migration strategy must include rollback plan.
- Never modify a committed migration — create a new one.
- Test schema changes against production-scale data volume.
- Model for access patterns, not just data structure.
- Document all design decisions and trade-offs in ADRs.

## References
  - references/data-vault-patterns.md — Data Vault Patterns
  - references/dimensional-modeling.md — Dimensional Modeling
  - references/domain-driven-data-modeling.md — Domain-Driven Data Modeling
  - references/graph-modeling.md — Graph Modeling
  - references/modeling-best-practices.md — Data Modeling Best Practices
  - references/modeling-change-management.md — Model Change Management
  - references/modeling-data-contracts.md — Data Contracts in Modeling
  - references/relational-modeling.md — Relational Modeling
## Handoff
`data-dimensional-modeling` for star schemas and dimensional models
`backend-database-patterns` for query optimization and indexing
`data-nosql-database` for document/column-family modeling
