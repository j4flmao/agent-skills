# Federation Cost Management

## Overview
In a federated GraphQL architecture, query complexity can grow exponentially as depth increases and entity resolution fans out across subgraphs. Cost management protects the supergraph from expensive queries that degrade performance for all consumers.

## Cost Analysis Fundamentals

### What Makes a Query Expensive
| Factor | Cost Driver | Example |
|--------|-------------|---------|
| Depth | Nested fields chaining across subgraphs | `user.orders[].items[].product.reviews[].author` |
| List sizes | Large collections require proportional work | `users(first: 1000) { orders { ... } }` |
| Entity resolution | Each subgraph hop adds latency | 3 subgraphs × 100 entities = 300 resolution calls |
| Computed fields | Expensive server-side calculations | Real-time aggregation, ML inference |
| Aliased fields | Repeated resolution of the same field | `a: user, b: user, c: user` |

## Demand Control Strategies

### Strategy 1: cost_bound (Static)
Assign fixed cost weights to fields and types. The router computes query cost at parse time and rejects expensive queries.

```yaml
demand_control:
  strategy: cost_bound
  list_cost: 1            # Cost multiplied by list size
  object_cost: 2          # Cost per nested object
  scoring:
    max_cost: 1000
    max_depth: 10
    max_aliases: 15
  reject_on_limit_exceeded: true
```

Static cost computation:
```
Query: { users { name orders { total items { product { name price } } } } }

Cost breakdown:
  users (list)                     = 1 × list_cost × avg_size
  ├── name (field)                 = 1
  ├── orders (list, nested 1)      = 1 × list_cost × avg_size × object_cost^1
  │   ├── total (field)            = 1
  │   └── items (list, nested 2)   = 1 × list_cost × avg_size × object_cost^2
  │       └── product (object, 3)  = 1 × object_cost^3
  │           ├── name (field)     = 1
  │           └── price (field)    = 1

Total = (1 × avg_users × 1) + ... (sum of all weighted field costs)
```

### Strategy 2: measured (Runtime)
Observe actual query cost at runtime and enforce limits based on real performance data.

```yaml
demand_control:
  strategy: measured
  metrics:
    enable: true
    period: 60s
  scoring:
    max_cost: 1000
    max_depth: 10
```

### Strategy 3: static (Simple Limiting)
Apply simple structural limits without cost weighting.

```yaml
demand_control:
  strategy: static
  max_depth: 8
  max_aliases: 15
  max_root_fields: 20
```

## Router-Level Cost Configuration

### Custom Field Cost Weights
```graphql
extend type Query {
  # Static weight — always costs 50
  heavyReport(filter: ReportFilter!): [ReportRow!]! @cost(weight: "50")

  # Dynamic weight — cost depends on 'first' argument value
  search(query: String!, first: Int!): SearchResult! @cost(weight: "first")

  # Multiplier — cost is multiplied by the list size argument
  activities(first: Int = 10): [Activity!]! @cost(weight: "multiply(first)")
}

extend type Mutation {
  # Mutations cost more by default
  bulkCreateOrders(inputs: [OrderInput!]!): [Order!]! @cost(weight: "multiply(size(inputs))")
}
```

### Per-Client Cost Budgets
```yaml
demand_control:
  clients:
    - id: "enterprise-1"
      max_cost: 5000
      max_depth: 15
    - id: "free-tier"
      max_cost: 100
      max_depth: 5
  default:
    max_cost: 1000
    max_depth: 10
```

## Entity Resolution Cost

### Cost of Entity Fan-Out
```
Query: { users(first: 50) { reviews { product { name } } } }

Resolution cost:
  50 users × 1 entity resolution (Users) = 50
  50 users × avg 3 reviews = 150 reviews
  150 reviews × 1 entity resolution (Product) = 150
  150 products × 1 entity resolution (Catalog) = 150

Total entity resolutions: 350
```

### Reducing Entity Resolution Cost
```graphql
# BAD — high entity fan-out
type User @key(fields: "id") {
  reviews: [Review!]!
}
type Review @key(fields: "id") {
  product: Product!
}

# GOOD — batch at query level, use @provides to inline fields
extend type User @key(fields: "id") {
  reviews(first: Int = 5): [Review!]!
}

type Review @key(fields: "id") {
  product: Product!
  productName: String @provides(fields: "name")  # No extra entity hop
}
```

### Entity Cache Configuration
```yaml
entity_cache:
  enabled: true
  ttl: 30s
  max_entities: 100000
  redis:
    urls: ["redis://redis-cache:6379"]
  rules:
    - typename: "Product"
      ttl: 300s           # Products change infrequently
    - typename: "User"
      ttl: 10s            # User data changes more often
```

## Depth Limiting in Federation

### Why Depth Matters
In a federated schema, depth N can spawn N subgraph traversals:
```
Depth 1: Query.user → Accounts (1 hop)
Depth 2: Query.user.orders → Accounts + Orders (2 hops)
Depth 3: Query.user.orders.items → Accounts + Orders + Catalog (3 hops)
Depth 4: Query.user.orders.items.product.reviews → + Reviews (4 hops)
```

### Configuring Depth Limits
```yaml
demand_control:
  scoring:
    max_depth: 8
```

### Graceful Depth Violation
```yaml
demand_control:
  scoring:
    max_depth: 10
  on_limit_exceeded: truncate  # Instead of reject, truncate at depth limit
```

## Query Cost Analytics

### Cost Metrics Dashboard
```yaml
# Prometheus metrics from Apollo Router
telemetry:
  metrics:
    prometheus:
      enabled: true
    instruments:
      router:
        demand_control:
          rejected_total: true
          estimated_cost: true
          actual_cost: true
```

### Tracking Expensive Queries
```sql
-- Identify top 10 most expensive operations
SELECT
  operation_name,
  COUNT(*) as execution_count,
  AVG(estimated_cost) as avg_cost,
  MAX(estimated_cost) as max_cost,
  AVG(actual_cost) as avg_actual_cost,
  SUM(estimated_cost) as total_cost_budget
FROM operation_costs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY operation_name
ORDER BY avg_cost DESC
LIMIT 10;
```

### Cost Budget Enforcement in CI
```typescript
async function enforceCostBudget(
  supergraphSdl: string,
  operations: { name: string; query: string }[],
  maxCost: number
): Promise<void> {
  const schema = buildFederatedSchema(supergraphSdl);
  const violations: string[] = [];

  for (const { name, query } of operations) {
    const cost = calculateOperationCost(schema, query);
    if (cost > maxCost) {
      violations.push(
        `${name}: estimated cost ${cost} exceeds budget ${maxCost}`
      );
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Cost budget violations:\n${violations.join('\n')}`
    );
  }
}
```

## Per-Operation Cost Budgets

### Operation-Specific Limits
```yaml
demand_control:
  operations:
    - pattern: "IntrospectionQuery"
      max_cost: 5000
      allow: true
    - pattern: "Login"
      max_cost: 10
      allow: true
    - pattern: ".*"
      max_cost: 1000
      allow: true
```

### Cost Allowlist for Critical Operations
```yaml
demand_control:
  allowlist:
    - "GetUser"
    - "GetProduct"
    - "CreateOrder"
  mode: allowlist_only   # Reject any operation not in the allowlist
```

## Rate Limiting by Cost

### Cost-Based Rate Limiting
```yaml
rate_limiting:
  global:
    cost_budget: 100000     # Total cost budget per time window
    time_window: 60s
  per_client:
    cost_budget: 5000       # Per-client cost budget
    time_window: 60s
  rejection:
    strategy: cost          # Reject based on cumulative cost, not request count
    error_message: "API cost budget exceeded. Reduce query complexity or try again later."
```

### Tiered Cost Budgets
```yaml
tiers:
  free:
    max_cost_per_query: 50
    cost_budget_per_hour: 1000
    max_depth: 5
  pro:
    max_cost_per_query: 500
    cost_budget_per_hour: 10000
    max_depth: 10
  enterprise:
    max_cost_per_query: 5000
    cost_budget_per_hour: 100000
    max_depth: 15
```

## Cost Optimization Patterns

### 1. Flatten Deeply Nested Schema
```graphql
# BAD — 4 levels deep
type Query { me: User! }
type User @key(fields: "id") { orders: [Order!]! }
type Order @key(fields: "id") { items: [OrderItem!]! }
type OrderItem @key(fields: "id") { product: Product! }

# GOOD — flatten at query level
type Query {
  me: User!
  myOrderItems: [OrderItem!]!   # Direct access, fewer hops
}
```

### 2. Use @provides to Eliminate Hops
```graphql
# Without @provides: 2 hops (reviews → product → catalog)
# With @provides: 1 hop (reviews → product with name inline)
extend type Review @key(fields: "id") {
  id: ID! @external
  product: Product!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  name: String! @external @provides(fields: "name")
  # Reviews subgraph resolves product.name inline
}
```

### 3. Paginate Everything
```graphql
type Query {
  # BAD — no pagination
  allUsers: [User!]!

  # GOOD — paginated with max limit
  users(first: Int! = 20, after: String): UserConnection!
}
```

### 4. Limit List Sizes at Schema Level
```graphql
extend type User @key(fields: "id") {
  # BAD — unlimited list
  orders: [Order!]!

  # GOOD — paginated with default limit
  orders(first: Int! = 10, after: String): OrderConnection!
}

extend type Order @key(fields: "id") {
  # BAD — always returns all items
  items: [OrderItem!]!

  # GOOD — limited list
  items(first: Int! = 5): [OrderItem!]!
}
```

### 5. Use Persisted Queries for High-Volume Endpoints
```yaml
persisted_queries:
  enabled: true
  mode: allow_only       # Only allow pre-registered queries
  log_unknown: true      # Log rejected queries for analysis
  store:
    type: redis
    url: redis://redis:6379
```

### 6. Denormalize Hot Fields
```typescript
// Instead of resolving author.name via entity hop to Accounts subgraph,
// store the author name directly in the review (denormalized)
interface Review {
  id: string;
  content: string;
  authorId: string;
  authorName: string;  // Denormalized — refreshed on profile update
}
```

## Cost Monitoring Alerts

### Prometheus Alert Rules
```yaml
groups:
  - name: federation-cost
    rules:
      - alert: HighQueryCost
        expr: |
          rate(apollo_router_demand_control_estimated_cost_sum[5m])
          /
          rate(apollo_router_demand_control_estimated_cost_count[5m])
          > 500
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Average query cost exceeds 500"

      - alert: CostRejectionRate
        expr: |
          rate(apollo_router_demand_control_rejected_total[5m])
          >
          0
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: "Queries being rejected due to cost limits"

      - alert: EntityResolutionFanOut
        expr: |
          rate(apollo_router_entities_per_request_sum[5m])
          /
          rate(apollo_router_entities_per_request_count[5m])
          > 50
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Average entity resolution count exceeds 50 per request"
```

## Performance Budgets as Code

```yaml
# federation-budget.yaml
budget:
  query:
    max_cost: 1000
    max_depth: 8
    max_aliases: 15
    max_fetch_count: 5
    max_entity_resolutions: 50

  subgraph:
    accounts:
      p99_latency: 100ms
      error_rate: 0.01
      timeout: 5s
    orders:
      p99_latency: 200ms
      error_rate: 0.01
      timeout: 10s
    reviews:
      p99_latency: 300ms
      error_rate: 0.02
      timeout: 5s

  router:
    p99_latency: 50ms       # Router overhead (excluding subgraph time)
    query_plan_cache_hit: 0.95
```

## Key Points
- Cost-bound demand control assigns static weights to fields and rejects expensive queries
- Entity fan-out is the primary cost driver in federated graphs — limit with pagination and @provides
- Entity caching reduces repeated resolution costs for hot entities
- Depth limiting prevents excessively nested queries from consuming resources
- Per-client cost budgets enable granular control for different consumer tiers
- Flattening schema design reduces fetch boundaries and entity resolution count
- Denormalizing hot fields eliminates entity hops entirely
- Persisted queries prevent arbitrary query execution in high-security environments
- Cost monitoring (Prometheus alerts) detects budget violations in real-time
- Performance budgets as code enforce cost limits in CI before deployment

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Apollo Federation v2 directives, supergraph schema compositions, query planning, and entity resolution patterns.
-->
