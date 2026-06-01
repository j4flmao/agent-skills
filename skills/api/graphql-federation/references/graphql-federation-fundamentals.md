# GraphQL Federation Fundamentals

## Overview
GraphQL Federation is a distributed GraphQL architecture pattern enabling multiple subgraphs to compose into a unified supergraph. Each subgraph owns a bounded domain, exposes its own GraphQL schema, and is independently deployable. The supergraph gateway (Apollo Router or Gateway) plans and executes queries across subgraphs transparently to clients.

Federation v2 (the current standard) eliminates boilerplate directives from v1, making schemas cleaner and composition more intuitive. All examples here use Federation v2 unless stated.

## Core Concepts

### Supergraph
The supergraph is the unified schema clients query against. It merges all subgraph schemas, resolves type conflicts, and defines how entities extend across service boundaries. Generated at build time via `rover supergraph compose` or at runtime via Apollo GraphOS.

### Subgraph
An independently deployable GraphQL service owning a bounded domain context. Each subgraph:
- Defines its own schema with types, queries, mutations, subscriptions
- Declares entities using `@key` for cross-subgraph identity
- Optionally extends types from other subgraphs
- Has its own data store (database, external API, cache)
- Can be developed, tested, scaled, and deployed independently

### Entity
A GraphQL type referenceable across subgraph boundaries via `@key`. The origin subgraph defines the entity with its primary key; other subgraphs extend it by adding fields.

```graphql
# Accounts subgraph — origin
type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

# Orders subgraph — extension (no @extends in v2)
type User @key(fields: "id") {
  id: ID!
  orders: [Order!]!
}

# Reviews subgraph — extension
type User @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
}
```

### Composition
The process of merging subgraph schemas into one supergraph schema:

1. Collect all subgraph schemas
2. Resolve name conflicts (same type name, different definitions)
3. Merge entity types by matching `@key` directives
4. Generate a unified schema with all fields from all subgraphs
5. Produce a supergraph schema artifact used for query planning

### Query Planning
The router analyzes an incoming GraphQL operation to determine:
- Which subgraphs resolve each requested field
- Execution order (Sequence vs. Parallel) for subgraph fetches
- What entity representations (`__typename` + key fields) to pass
- How to merge results from multiple subgraphs

```graphql
# Query spanning 3 subgraphs
query {
  me {                  # Accounts
    name
    orders {            # Orders (needs User key from Accounts)
      total
      items {
        product {
          name          # Products (needs Product key from OrderItem)
        }
      }
    }
  }
}
```

Resulting plan:
```
Sequence:
  Fetch(Accounts): { me { name } }
  Sequence:
    Fetch(Orders): { _entities(representations) { orders { items { product { __typename id } } } } }
    Fetch(Products): { _entities(representations) { name } }
```

## Federation v2 Directives — Complete Reference

### @key
Declares entity identity. Types with `@key` can be extended across subgraphs.

```graphql
# Simple key
type User @key(fields: "id") { id: ID! }

# Compound key (multiple fields)
type Order @key(fields: "orderId lineItemId") { orderId: ID!; lineItemId: ID! }

# Nested key (key via relationship)
type User @key(fields: "organization { id }") { id: ID!; organization: Organization! }

# Multiple alternative keys
type Product @key(fields: "id") @key(fields: "sku") @key(fields: "upc") { ... }

# Non-resolvable key (reference only, no entity resolution)
type Product @key(fields: "id", resolvable: false) { id: ID! }
```

### @shareable
Field resolvable by multiple subgraphs. Router picks the fastest response.

```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String! @shareable   # Catalog and Search subgraphs both resolve this
  price: Float!              # Only one subgraph resolves this
}
```

### @provides
Advertises that a subgraph can resolve extra fields on an entity it references, reducing fetch boundaries.

```graphql
# Products subgraph: topProducts returns Product with name inline
# No need to fetch name from Catalog — Products provides it
type Query {
  topProducts: [Product!]!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  name: String! @external @provides(fields: "name")
  price: Float! @external @provides(fields: "currency")
}
```

### @requires
Declares a field depends on data from another subgraph. The router pre-fetches required data and includes it in the representation.

```graphql
extend type Product @key(fields: "id") {
  id: ID! @external
  weight: Int @external
  shippingCost: Float @requires(fields: "weight")
}
```

Resolution flow:
1. Router fetches `weight` from the owning subgraph
2. Includes `weight` in representation: `{"__typename": "Product", "id": "1", "weight": 10}`
3. Shipping subgraph computes `shippingCost` using `ref.weight`

### @override
Migrates field resolution from one subgraph to another during gradual migration.

```graphql
# New search subgraph takes over name field from catalog
type Product @key(fields: "id") {
  id: ID!
  name: String! @override(from: "catalog")
  description: String!
}
```

### @inaccessible
Hides a field/type from the supergraph (internal use only).

```graphql
type User {
  internalId: ID! @inaccessible
  name: String!
}
```

### @composeDirective
Propagates a custom directive from subgraph into the supergraph schema.

```graphql
extend schema @composeDirective(name: "@authorized")
directive @authorized(role: String!) on FIELD_DEFINITION

type Query {
  adminData: [Secret!]! @authorized(role: "admin")
}
```

### @interfaceObject
Treats an interface as an entity-like type that can be extended by other subgraphs.

```graphql
# Subgraph A defines interface
interface Media { id: ID!; title: String! }

# Subgraph B extends interface as if it were an entity
type Media @interfaceObject @key(fields: "id") {
  id: ID!
  averageRating: Float!
}
```

## Subgraph Design Principles

### Bounded Context Mapping
Map each subgraph to a DDD bounded context:

| Subgraph | Domain | Owns | Extends |
|----------|--------|------|---------|
| Accounts | User identity, auth | User, Organization | — |
| Catalog | Product info, categories | Product, Category | — |
| Orders | Order processing | Order, LineItem | User, Product |
| Reviews | User feedback | Review | User, Product |
| Inventory | Stock, fulfillment | — | Product |
| Shipping | Delivery | Shipment | Product, Order |

### Subgraph Independence Rules
1. Each subgraph has its own database — no shared data stores
2. Subgraphs communicate only through the supergraph (no direct subgraph-to-subgraph HTTP calls)
3. Each subgraph deploys independently without coordinated releases
4. Adding a new subgraph does not change existing subgraphs
5. Subgraph failure must not cascade — circuit breakers and timeouts per subgraph
6. Subgraphs must not assume other subgraphs' internal implementation details

### Entity Ownership Pattern
- Exactly one origin subgraph defines the entity's `@key`
- Extension subgraphs add fields but never change field types or keys
- The origin implements `__resolveReference` returning the full entity by key
- Extension subgraphs implement `__resolveReference` returning just enough to resolve their fields (often just `{ id: ref.id }`)

## Schema Design Patterns

### Value Types vs. Entities
```graphql
# Value type — no @key, fully owned by one subgraph, cannot be extended
type Address {
  street: String!
  city: String!
  zip: String!
}

# Entity — has @key, extendable across subgraphs
type User @key(fields: "id") {
  id: ID!
  address: Address!
}
```

### Value types stay private to their owning subgraph. Use entities for any type that needs cross-subgraph references.

### Avoiding Circular Entity Dependencies
```graphql
# BAD — circular: User references Organization, Organization references User
type User @key(fields: "id") { organization: Organization! }
type Organization @key(fields: "id") { users: [User!]! }

# GOOD — break cycle: query-level access instead of entity field
type User @key(fields: "id") { organization: Organization! }
extend type Query {
  organizationUsers(orgId: ID!): [User!]!
}
```

### Interface Distribution
Interfaces must be redeclared in each subgraph that uses them. All implementing types across subgraphs must share the same `@key`.

```graphql
# Subgraph A
interface Node { id: ID! }
type Product implements Node @key(fields: "id") { id: ID!; name: String! }

# Subgraph B
interface Node { id: ID! }
extend type Product implements Node @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
}
```

### Enum and Union Merging
```graphql
# Subgraph A
enum Status { ACTIVE INACTIVE }
union SearchResult = Product | Review

# Subgraph B — extends both
extend enum Status { PENDING ARCHIVED }
extend union SearchResult = User | Article
```

Enums merge by unioning values; unions merge by unioning member types. Duplicates are deduplicated.

## Entity Resolution Mechanics

### Reference Resolver (Origin Subgraph)
```typescript
const resolvers = {
  User: {
    __resolveReference(ref, context) {
      return context.dataSources.users.findById(ref.id);
    },
  },
};
```

### Reference Resolver (Extension Subgraph)
```typescript
const resolvers = {
  User: {
    __resolveReference(ref) {
      // Only needs the ID — the field resolvers fetch from own DB
      return { id: ref.id };
    },
    orders(parent, _, context) {
      return context.dataSources.orders.findByUserId(parent.id);
    },
    reviews(parent, _, context) {
      return context.dataSources.reviews.findByAuthorId(parent.id);
    },
  },
};
```

### Multi-Key Resolution
```typescript
const resolvers = {
  Product: {
    __resolveReference(ref, context) {
      if (ref.id) return context.dataSources.products.findById(ref.id);
      if (ref.sku) return context.dataSources.products.findBySku(ref.sku);
      if (ref.upc) return context.dataSources.products.findByUpc(ref.upc);
      return null;
    },
  },
};
```

### Batch Entity Resolution (Preventing N+1)
```typescript
class BatchReferenceResolver {
  private pending = new Map<string, Promise<any>>();

  resolve(__typename: string, id: string): Promise<any> {
    const key = `${__typename}:${id}`;
    if (!this.pending.has(key)) {
      this.pending.set(key, this.batchLoad(__typename, [id]).then(
        results => results[0]
      ));
    }
    return this.pending.get(key)!;
  }

  private async batchLoad(__typename: string, ids: string[]): Promise<any[]> {
    switch (__typename) {
      case 'User': return db.users.findByIds(ids);
      case 'Product': return db.products.findByIds(ids);
      default: return ids.map(() => null);
    }
  }
}
```

## Composition Pipeline

### Supergraph Config
```yaml
federation_version: 2
subgraphs:
  accounts:
    routing_url: http://accounts:4001/graphql
    schema:
      file: ./schemas/accounts.graphql
  catalog:
    routing_url: http://catalog:4002/graphql
    schema:
      file: ./schemas/catalog.graphql
  reviews:
    routing_url: http://reviews:4003/graphql
    schema:
      file: ./schemas/reviews.graphql
```

### Composition Command
```bash
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql
```

### CI/CD Pipeline
```yaml
# .github/workflows/supergraph.yml
on:
  pull_request:
    paths: ['schemas/**']
jobs:
  check-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: apollographql/setup-rover@v2
      - name: Validate composition
        run: |
          rover supergraph compose --config ./supergraph.yaml --output /dev/null
      - name: Breaking change check
        run: |
          rover subgraph check my-graph@current \
            --schema ./schemas/accounts.graphql --name accounts
      - name: Publish
        if: github.ref == 'refs/heads/main'
        run: |
          rover subgraph publish my-graph@current \
            --schema ./schemas/accounts.graphql --name accounts \
            --routing-url http://accounts:4001/graphql
```

## Router vs. Gateway Decision

| Aspect | Apollo Router (Rust) | Apollo Gateway (Node.js) |
|--------|---------------------|--------------------------|
| Performance | ~10x faster, 1ms overhead | ~10ms overhead per request |
| Configuration | YAML file | Programmatic (JS/TS) |
| Extensibility | Rhai scripting, native plugins | Node.js middleware |
| Startup | Instant | Schema fetch on boot |
| Memory | ~50MB baseline | ~200MB baseline |
| Best for | Production at scale | Dev, moderate traffic, custom JS logic |

## Common Composition Errors and Fixes

| Error | Cause | Resolution |
|-------|-------|------------|
| `ENUM_MISMATCH` | Enum values differ between subgraphs | Align enum definitions across all subgraphs |
| `TYPE_MISMATCH` | Same name used as type in one, interface in another | Unify type kind |
| `EXTERNAL_MISSING` | @requires field not marked external | Ensure field is resolvable from owning subgraph |
| `KEY_MISSING` | Extended type without @key in origin | Add @key to origin subgraph |
| `REQUIRES_MISSING` | @requires references unavailable field | Field must be @external or locally defined |
| `DUPLICATE_FIELD` | Same field in multiple subgraphs without @shareable | Add @shareable or remove from one subgraph |
| `VALUE_TYPE_FIELD_MISMATCH` | Value type fields differ between subgraphs | Align value type definitions (best to keep in one subgraph) |

## Key Points
- Each subgraph owns its domain with independent deployment, testing, and scaling
- @key defines entity identity for cross-subgraph resolution
- Federation v2 eliminates @extends and @external — they are now implicit
- Composition merges subgraph schemas into a unified supergraph at build time
- Query planning automatically routes field resolution to appropriate subgraphs
- Entity resolution via __resolveReference enables cross-subgraph data retrieval
- @provides reduces fetch boundaries by embedding fields inline
- @requires declares field dependencies resolved by the router before resolution
- The router propagates user context (auth, tracing) to subgraphs via headers
- Value types are fully owned by a single subgraph and cannot be extended
- Circular entity references should be broken with query-level access patterns
