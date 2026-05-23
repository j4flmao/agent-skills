---
name: api-graphql-federation
description: >
  Use when the user asks about GraphQL Federation, Apollo Federation, federated schema, subgraphs, supergraph, schema composition, @key/@requires/@external directives, or distributed GraphQL architecture. Do NOT use for: basic GraphQL schema design (backend-graphql-patterns), or single-service GraphQL APIs.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [api, graphql-federation, phase-3]
---

# GraphQL Federation

## Purpose
Design and implement GraphQL Federation: compose multiple subgraphs into a unified supergraph, manage distributed GraphQL architecture, and scale GraphQL across teams.

## Workflow

### Federation Architecture
```
Supergraph (Apollo Router / Gateway)
  ├── Subgraph A (Users service) — @key(fields: "id")
  ├── Subgraph B (Orders service) — @key(fields: "id") @extends User
  ├── Subgraph C (Reviews service) — @key(fields: "id") @extends User
  └── Subgraph D (Inventory service) — standalone
```

### Federation Directives
| Directive | Purpose | Example |
|-----------|---------|---------|
| @key | Primary key for entity | `@key(fields: "id")` |
| @extends | Extend type from another subgraph | `type User @extends @key(fields: "id")` |
| @external | Field defined in another subgraph | `id: ID! @external` |
| @requires | Field requires data from another subgraph | `@requires(fields: "shippingZip")` |
| @provides | Field provides data to other subgraphs | `@provides(fields: "name")` |
| @shareable | Field can be resolved by multiple subgraphs | `@shareable` |

### Subgraph Schema Example
```graphql
# Users subgraph
type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
}

# Orders subgraph (extends User)
type User @key(fields: "id") @extends {
    id: ID! @external
    orders: [Order!]!
}
```

### Supergraph Composition
```
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql
```

## References
- `references/federation-architecture.md` — Federation architecture and subgraph design
- `references/supergraph-composition.md` — Supergraph composition and CI/CD
- `references/entity-resolution.md` — Entity resolution and reference resolver patterns
