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

### Max Response Length
200 lines of schema and code.

## Workflow

### Step 1: Conceptual Model
Identify entities, relationships, and business rules independent of technology. Each entity represents a real-world object or concept. Relationships describe how entities interact. Business rules become constraints and invariants.

### Step 2: Relational or Graph Decision
Choose based on access patterns:
- Relational: fixed schema, complex joins across many entities, strong consistency, ACID transactions
- Graph: highly connected data, variable-depth traversal, evolving schema, path-finding queries
- Hybrid: relational for transactional data, graph for relationship-heavy queries

### Step 3: Normalization
Normalize to 3NF by default. 1NF eliminates repeating groups and ensures atomic columns. 2NF eliminates partial dependencies (every non-key column depends on the full primary key). 3NF eliminates transitive dependencies (non-key columns depend only on the primary key). Denormalize only when query profiling proves it necessary.

### Step 4: Key Strategy
Surrogate keys (UUID v7 or SERIAL) as default. Natural keys only when guaranteed stable and unique (ISO country codes, tax IDs). Composite keys for join tables. Surrogate keys never change — they decouple the row identity from business meaning.

### Step 5: Graph Node/Edge Design
Nodes represent entities with properties. Edges represent relationships with direction and properties. Labels/ types categorize nodes and edges. Properties are key-value pairs indexed for query performance.

### Step 6: Indexing
Index foreign keys, frequently filtered columns, and graph traversal properties. Use composite indexes for multi-column filters. Use partial indexes for filtered queries on large tables. Use GIN indexes for JSON/array columns.

## Rules
- 3NF is the default. Denormalize only when performance-measured.
- Surrogate keys default. Natural keys only for stable identifiers.
- Prefer soft delete unless data retention law requires hard delete.
- Audit columns (created_at, updated_at, created_by) on every table.
- Every foreign key must be indexed.
- Graph properties used in WHERE and traversal must have indexes.
- Temporal tables use valid_from/valid_to or PERIOD FOR.

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
