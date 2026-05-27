# Supergraph Composition

## Overview
Supergraph composition is the process of combining multiple subgraph schemas into a single unified supergraph schema that the gateway or router uses to plan and execute queries across services.

## Composition Pipeline

### Step 1: Subgraph Schema Collection
```graphql
# users/subgraph.graphql
type Query {
  users: [User!]!
  user(id: ID!): User
}

type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

# orders/subgraph.graphql
type Query {
  orders(userId: ID!): [Order!]!
}

type Order @key(fields: "id") {
  id: ID!
  userId: ID!
  product: String!
  amount: Float!
}

type User @key(fields: "id") @extends {
  id: ID! @external
  orders: [Order!]!
}

# reviews/subgraph.graphql
type Review @key(fields: "id") {
  id: ID!
  userId: ID!
  rating: Int!
  comment: String
}

type User @key(fields: "id") @extends {
  id: ID! @external
  reviews: [Review!]!
}
```

### Step 2: Supergraph Config
```yaml
# supergraph.yaml
federation_version: 2
subgraphs:
  users:
    routing_url: http://users-service:4001/graphql
    schema:
      file: ./schemas/users.graphql
  orders:
    routing_url: http://orders-service:4002/graphql
    schema:
      file: ./schemas/orders.graphql
  reviews:
    routing_url: http://reviews-service:4003/graphql
    schema:
      file: ./schemas/reviews.graphql
```

### Step 3: Compose Command
```bash
# Using Rover CLI
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql

# Using federation-js
npx @apollo/federation supergraph --config ./supergraph.yaml

# Using GraphOS
rover graph publish my-graph@current --schema ./supergraph.graphql
```

### Step 4: Generated Supergraph Schema
```graphql
# Composed supergraph (partial)
schema
  @core(feature: "https://specs.apollo.dev/federation/v2.3")
  @core(feature: "https://specs.apollo.dev/link/v1.0")
{
  query: Query
}

type Query {
  users: [User!]!
  user(id: ID!): User
  orders(userId: ID!): [Order!]!
}

type User {
  id: ID!
  name: String!
  email: String!
  orders: [Order!]!
  reviews: [Review!]!
}

type Order {
  id: ID!
  userId: ID!
  product: String!
  amount: Float!
}

type Review {
  id: ID!
  userId: ID!
  rating: Int!
  comment: String
}
```

## Essential Directives

### @key
```graphql
# Primary key for entity resolution across subgraphs
type Product @key(fields: "id") {
  id: ID!
  name: String!
}

# Compound key
type Product @key(fields: "sku") @key(fields: "upc") {
  sku: String!
  upc: String!
  name: String!
}

# Nested key
type User @key(fields: "organization { id }") {
  id: ID!
  organization: Organization!
}
```

### @extends and @external
```graphql
# Extending a type from another subgraph
type Product @key(fields: "id") @extends {
  id: ID! @external
  inStock: Boolean!
  shippingEstimate: String!
}
```

### @requires
```graphql
# Field depends on data from another subgraph
type Product @key(fields: "id") @extends {
  id: ID! @external
  weight: Int @external
  shippingEstimate: String! @requires(fields: "weight")
}
```

### @provides
```graphql
# Field provides data to other subgraphs
type User @key(fields: "id") {
  id: ID!
  name: String! @provides(fields: "name")
  orders: [Order!]!
}
```

### @shareable
```graphql
# Field resolved by multiple subgraphs
type Product {
  name: String! @shareable
  price: Float!
}
```

### @inaccessible
```graphql
# Field not exposed to clients but used internally
type User {
  internalId: String! @inaccessible
  name: String!
}
```

### @override
```graphql
# Override field resolution from another subgraph
type Product @key(fields: "id") {
  id: ID! @external
  name: String! @override(from: "inventory")
}
```

## Composition Rules

### Naming Conflicts
```graphql
# Conflict: same type defined in two subgraphs without @key
# Resolution: ensure at least one subgraph defines @key for entity types

# Conflict: different types with same name
# Resolution: rename or use @inaccessible on private fields
```

### Type Extension Rules
```graphql
# Valid: original definition with @key
type User @key(fields: "id") {
  id: ID!
  name: String!
}

# Valid: extension with @key and @extends
type User @key(fields: "id") @extends {
  id: ID! @external
  email: String!
}

# Invalid: extension without @key on non-entity
# type Address {
#   street: String!
# }
# type Address @extends {  # ERROR: base type is not an entity
#   city: String! @external
# }
```

### Value Type vs Entity
```graphql
# Value type: no @key, owned by single subgraph
type Address {
  street: String!
  city: String!
  zip: String!
}

# Entity: has @key, extendable by other subgraphs
type User @key(fields: "id") {
  id: ID!
  address: Address!
}
```

## Composition Strategies

### Monolithic First
```yaml
# Start with all types in one subgraph, extract later
federation_version: 2
subgraphs:
  monolith:
    routing_url: http://api:4001/graphql
    schema:
      file: ./schemas/monolith.graphql
```

### Domain-Based Splitting
```yaml
# Split by business domain
subgraphs:
  users:
    schema:
      file: ./schemas/users.graphql
  catalog:
    schema:
      file: ./schemas/catalog.graphql
  orders:
    schema:
      file: ./schemas/orders.graphql
  payments:
    schema:
      file: ./schemas/payments.graphql
  reviews:
    schema:
      file: ./schemas/reviews.graphql
```

### Layer-Based Splitting
```yaml
# Split by architectural layer
subgraphs:
  api:
    schema:
      file: ./schemas/api.graphql
  domain:
    schema:
      file: ./schemas/domain.graphql
  data:
    schema:
      file: ./schemas/data.graphql
```

## Composition Errors

### Common Errors and Solutions
```graphql
# Error: [ENUM_MISMATCH] Enum "Status" has different values in different subgraphs
# Fix: ensure enum definitions match exactly across subgraphs

# Error: [TYPE_MISMATCH] Type "User" defined as interface and type in different subgraphs
# Fix: unify type kind across all subgraphs

# Error: [EXTERNAL_MISSING] Field "email" not marked @external in extending subgraph
# Fix: add @external directive

# Error: [KEY_MISSING] Type "User" extended in subgraph but not entity
# Fix: add @key to original definition

# Error: [REQUIRES_MISSING] @requires references field not available in this subgraph
# Fix: ensure required fields are @external or defined locally
```

## Composition with Rover

### CI/CD Pipeline
```yaml
# .github/workflows/composition.yml
name: Supergraph Composition
on:
  pull_request:
    paths:
      - 'schemas/**/*.graphql'
jobs:
  compose:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: apollographql/setup-rover@v2
      - name: Check composition
        run: |
          rover supergraph compose --config ./supergraph.yaml \
            --output ./composed.graphql
      - name: Validate
        run: |
          rover graph check my-graph@current \
            --schema ./composed.graphql
      - name: Publish
        if: github.ref == 'refs/heads/main'
        run: |
          rover graph publish my-graph@current \
            --schema ./composed.graphql
```

### Local Development
```bash
# Compose locally for testing
rover supergraph compose --config ./supergraph.dev.yaml > dev-supergraph.graphql

# Start local router
APOLLO_GRAPH_REF=my-graph@current \
APOLLO_KEY=$APOLLO_KEY \
./router --config ./router.yaml

# Check composition without publishing
rover supergraph compose --config ./supergraph.yaml \
  --output /dev/null 2>&1 | head -20
```

## Gateway vs Router

### Apollo Router (Rust)
```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000
  path: /
  introspection: true

cors:
  origins:
    - http://localhost:3000

headers:
  all:
    request:
      - propagate:
          matching: .*

telemetry:
  metrics:
    prometheus:
      enabled: true
      listen: 0.0.0.0:9090
```

### Apollo Gateway (Node.js)
```typescript
const { ApolloGateway } = require('@apollo/gateway')
const { ApolloServer } = require('@apollo/server')

const gateway = new ApolloGateway({
  supergraphSdl: fs.readFileSync('./supergraph.graphql', 'utf8'),
})

const server = new ApolloServer({ gateway })
await server.listen(4000)
```

## Key Points
- Composition merges subgraph schemas into a unified supergraph
- @key defines entity identity for cross-subgraph resolution
- @extends + @external marks types extended from other subgraphs
- @requires declares field dependencies on other subgraphs
- @provides advertises resolvable fields to other subgraphs
- @shareable allows multiple subgraphs to resolve the same field
- Rover CLI composes subgraphs from YAML config
- CI pipeline validates composition before publishing
- Apollo Router (Rust) is the recommended production gateway
- Composition errors are detected at build time, not runtime
