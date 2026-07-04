# Supergraph Configuration

## Schema Composition

### Composition Methods

| Method | Tool | Best For |
|--------|------|----------|
| Rover CLI | `rover supergraph compose` | CI/CD, local dev |
| Apollo GraphOS | Schema registry | Team collaboration |
| Custom compose | graphql-tools | Non-Apollo stacks |
| Federation.js | @apollo/composition | JS/TS ecosystems |

### Rover Composition
```bash
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql
```

```yaml
# supergraph.yaml
federation_version: 2
subgraphs:
  accounts:
    routing_url: http://accounts:4001/graphql
    schema:
      file: ./schemas/accounts.graphql
  products:
    routing_url: http://products:4002/graphql
    schema:
      file: ./schemas/products.graphql
  reviews:
    routing_url: http://reviews:4003/graphql
    schema:
      file: ./schemas/reviews.graphql
```

### CI/CD Integration
```yaml
# .github/workflows/supergraph.yml
name: Deploy Supergraph
on:
  push:
    paths:
      - "schemas/**/*.graphql"
jobs:
  compose:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: apollographql/setup-rover@v2
      - run: rover supergraph compose --config ./supergraph.yaml --output ./supergraph.graphql
      - run: rover graph publish my-graph@current --schema ./supergraph.graphql
```

## Type Merging Rules

### @key Directive
```graphql
type User @key(fields: "id") {
  id: ID!
  name: String
  email: String @external
}
```

### Resolvable vs Non-Resolvable Keys
```graphql
# Primary service (resolves the entity)
type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}

# Extended service (references the entity)
type Product @key(fields: "id", resolvable: false) {
  id: ID!
}
```

### Compound Keys
```graphql
type Review @key(fields: "productId authorId") {
  productId: ID!
  authorId: ID!
  rating: Int
  content: String
}
```

### Nested Keys
```graphql
type Organization @key(fields: "id") {
  id: ID!
  users: [User!]!
}

type User @key(fields: "organization { id }") {
  organization: Organization!
  role: String
}
```

## @shareable and @provides

### @shareable
```graphql
type Product @key(fields: "id") {
  id: ID!
  name: String! @shareable
  description: String! @shareable
  price: Float!
}
```

Mark fields that can be resolved by multiple subgraphs. Redundant but improves resilience.

### @provides
```graphql
type Query {
  topProducts: [Product!]!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  name: String! @external
  price: Float! @external
  inStock: Boolean! @requires(fields: "id")
}
```

### @requires
```graphql
extend type Product @key(fields: "id") {
  id: ID! @external
  weight: Int @external
  shippingCost: Float @requires(fields: "weight")
}
```

## @override

### Migration Pattern
```graphql
# New service takes over a field
type Product @key(fields: "id") {
  id: ID!
  name: String! @override(from: "products-service")
  description: String!
}
```

### Rollback Strategy
- Keep old subgraph deployed with field intact
- Remove `@override` to revert
- Deploy new composition without override

### Override Rules
- Only one subgraph can override a field
- Overridden field is still present in original but ignored by router
- Remove field from original after migration window

## Enum and Union Merging

### Enum Contribution
```graphql
# Subgraph A
enum Status {
  ACTIVE
  INACTIVE
}

# Subgraph B
extend enum Status {
  PENDING
  ARCHIVED
}
```

### Union Contribution
```graphql
# Subgraph A
union SearchResult = Product | Review

# Subgraph B
extend union SearchResult = User | Article
```

### Merge Rules
- Enum values across subgraphs are unioned
- Union members across subgraphs are unioned
- Duplicate enum values or union members are deduplicated
- Types referenced in unions must have `@key` directive

## Interface Merging

### Interface Spread Across Subgraphs
```graphql
# Subgraph A
interface Node {
  id: ID!
}

type Product implements Node @key(fields: "id") {
  id: ID!
  name: String!
}

# Subgraph B
interface Node {
  id: ID!
}

extend type Product implements Node @key(fields: "id") {
  id: ID! @external
  reviews: [Review!]!
}
```

### Interface Rules
- Interface must be redeclared in each subgraph that uses it
- All implementing types must share @key
- Fields defined on interface are implicitly @shareable

## Router Configuration

### Apollo Router YAML
```yaml
# router.yaml
supergraph:
  introspection: true
  listen: 0.0.0.0:4000

cors:
  origins:
    - https://app.example.com
  allow_credentials: true

headers:
  all:
    request:
      - propagate:
          named: "x-user-id"

demand_control:
  strategy: measured
  max_request_size: 2mb

traffic_shaping:
  all:
    timeout: 30s
    compression: true

health_check:
  listen: 0.0.0.0:8088
  enabled: true
```

### Traffic Shaping Per Subgraph
```yaml
traffic_shaping:
  subgraphs:
    accounts:
      timeout: 5s
      retry: true
      compression: false
    products:
      timeout: 10s
      retry:
        max_retries: 3
        base_interval: 100ms
    reviews:
      timeout: 3s
```

### Rate Limiting
```yaml
rate_limiting:
  enabled: true
  global:
    capacity: 1000
    interval: 60s
  per_subgraph:
    reviews:
      capacity: 100
      interval: 60s
```

### Header Propagation
```yaml
headers:
  all:
    request:
      - propagate:
          matching: "^x-.*"
      - propagate:
          named: "authorization"
        default: "anonymous"
    response:
      - set:
          name: "x-request-id"
          value: "{context.request_id}"
```

## Query Planning

### Plan Visualization
```graphql
# Query
query {
  me {
    name
    reviews {
      content
      product { name }
    }
  }
}
```

```
QueryPlan {
  Sequence {
    Fetch(service: "accounts") {
      { me { name } }
    },
    Parallel {
      Fetch(service: "reviews") {
        { reviews { content product { __typename id } } }
      },
      Flatten(
        Fetch(service: "products") {
          { ... on Product { name } }
        }
      )
    }
  }
}
```

### Performance Implications
- Each Fetch boundary is an HTTP round trip
- Parallel Fetch groups execute concurrently
- Deeply nested types across services increase latency
- Use @provides to reduce hops

### Plan Caching
```yaml
query_planning:
  cache:
    enabled: true
    size: 5000
    ttl: 3600s
```

## Cost Analysis

### Query Cost Calculation
```yaml
demand_control:
  strategy: cost_bound
  list_cost: 1
  object_cost: 2
  scoring:
    max_cost: 1000
    max_depth: 10
```

### Cost Rules
- Each field: 1 point
- Each list element: list_cost * elements
- Nested objects: object_cost per level
- Truncate queries exceeding max_cost

## Supergraph Deployment

### Blue-Green Strategy
```bash
# Deploy new supergraph schema
rover supergraph compose --config ./supergraph.v2.yaml --output supergraph.v2.graphql

# Deploy to staging
cp supergraph.v2.graphql /etc/apollo/supergraph.staging.graphql

# Health check
curl -f http://localhost:4000/.well-known/apollo/server-health

# Promote to production
cp supergraph.v2.graphql /etc/apollo/supergraph.graphql
```

### Rollback Procedure
```bash
# Revert to previous schema
cp /etc/apollo/supergraph.backup.graphql /etc/apollo/supergraph.graphql

# Reload router
kill -HUP $(cat /var/run/apollo-router.pid)
```

### Canary Deployments
```yaml
# Deploy new schema to canary router only
canary:
  percentage: 5
  router: apollo-router-canary:4000
  health_checks:
    error_rate_threshold: 0.01
    latency_p99_threshold: 500ms
```

## Key Points
- Supergraph composition merges subgraph schemas into a unified graph
- Rover CLI is the standard tool for local and CI composition
- @key, @shareable, @provides, @requires control type merging
- @override enables gradual field migration between subgraphs
- Router configuration controls traffic shaping, headers, rate limiting
- Query plan visualization reveals cross-subgraph fetch boundaries
- Blue-green and canary deployments reduce composition risk
- Cost analysis prevents runaway queries in production

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Apollo Federation v2 directives, supergraph schema compositions, query planning, and entity resolution patterns.
-->
