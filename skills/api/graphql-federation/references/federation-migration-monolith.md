# Migrating from Monolithic GraphQL to Federation

## Overview
Migrating a monolithic GraphQL service to federation is a multi-phase effort. The goal is to decompose a single GraphQL schema into independently owned, deployed, and scaled subgraphs without downtime or breaking changes for consumers.

## Migration Strategies

### Strategy 1: Strangler Fig (Recommended)
Gradually extract domain subgraphs from the monolith while maintaining a single supergraph:

```
Phase 0: Monolith          Phase 1: Coexistence         Phase 2: Extracted
┌─────────────┐            ┌──────────────────┐         ┌──────────────────┐
│  Monolith   │            │  Supergraph      │         │  Supergraph      │
│  GraphQL    │            │  ├─ Monolith     │         │  ├─ Accounts     │
│             │            │  └─ Accounts     │         │  ├─ Orders       │
│ Users       │            │                  │         │  ├─ Catalog      │
│ Orders      │            │ Monolith loses   │         │  └─ Reviews      │
│ Catalog     │            │ User type        │         │                  │
│ Reviews     │             (removed after    │         │ Monolith gone    │
└─────────────┘            │  migration)      │         └──────────────────┘
                            └──────────────────┘
```

### Strategy 2: Parallel Federation (Low-Risk)
Build the federated graph completely alongside the monolith, run both, then cut over:

```
Monolith continues serving all traffic
        +
New subgraphs compose into supergraph
        +
Gradually migrate consumers from monolith URL to supergraph URL
        +
Decommission monolith when zero traffic remains
```

### Strategy 3: Gateway Wrapper (Quickest)
Place a federation gateway in front of the monolith as a single subgraph, then extract domains:

```
┌──────────────┐
│   Router     │── supergraph composed from monolith-as-subgraph
└──────┬───────┘
       │
┌──────┴───────┐
│  Monolith    │── Single subgraph containing the full schema
│  (full API)  │
└──────────────┘
```

Advantage: The router handles auth, rate limiting, tracing immediately.
Disadvantage: No decomposition benefit until domains are extracted.

## Migration Workflow

### Step 1: Schema Audit
Analyze the existing monolithic schema:

```graphql
# 1. Identify entity types: types that appear in relationships across domains
#    E.g., User appears in: user queries, order.userId, review.authorId
# 2. Identify domain boundaries: group types by business domain
# 3. Identify shared types: types referenced across domain boundaries
# 4. Count field usage: which fields are most/least used (use Apollo Studio)
```

Domain mapping table:
```yaml
type_domain_map:
  User: accounts
  Organization: accounts
  Order: orders
  OrderItem: orders
  Product: catalog
  Category: catalog
  Review: reviews
  Shipment: shipping
  AuditLog: shared (value type)
  Address: shared (value type)
```

### Step 2: Add @key and Federation Directives to Monolith
Modify the monolith schema to include federation directives, treating it as the first subgraph:

```graphql
# Monolith schema adapted for federation
extend schema @link(url: "https://specs.apollo.dev/federation/v2.3",
  import: ["@key", "@shareable", "@external", "@requires", "@provides"])

type Query {
  users: [User!]!
  orders(userId: ID!): [Order!]!
  products: [Product!]!
}

type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
  orders: [Order!]!
  reviews: [Review!]!
}

type Order @key(fields: "id") {
  id: ID!
  userId: ID!
  total: Float!
  items: [OrderItem!]!
}

type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Float!
}

type Review @key(fields: "id") {
  id: ID!
  authorId: ID!
  productId: ID!
  rating: Int!
  content: String!
}
```

### Step 3: Create Supergraph with Monolith as First Subgraph
```yaml
# supergraph.yaml — Phase 1
federation_version: 2
subgraphs:
  monolith:
    routing_url: http://monolith:4000/graphql
    schema:
      file: ./schemas/monolith.graphql
```

### Step 4: Extract First Domain Subgraph
Extract the Accounts domain into its own subgraph:

```graphql
# accounts/subgraph.graphql — new subgraph
type Query {
  users: [User!]!
  user(id: ID!): User
}

type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}
```

Update the monolith to remove the extracted types:

```graphql
# monolith schema — after removing User type
# All User references become external
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]! @requires(fields: "id")
}

type Order @key(fields: "id") {
  id: ID!
  userId: ID!
  total: Float!
  items: [OrderItem!]!
}
```

### Step 5: Update Supergraph Config
```yaml
# supergraph.yaml — Phase 2
federation_version: 2
subgraphs:
  accounts:
    routing_url: http://accounts:4001/graphql
    schema:
      file: ./schemas/accounts.graphql
  monolith:
    routing_url: http://monolith:4000/graphql
    schema:
      file: ./schemas/monolith.graphql
```

### Step 6: Compose and Validate
```bash
# Compose
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql

# Check for composition errors
rover supergraph compose --config ./supergraph.yaml --output /dev/null 2>&1

# Validate no breaking changes
rover graph check my-graph@current --schema ./supergraph.graphql
```

### Step 7: Deploy and Monitor
```bash
# Deploy accounts subgraph
kubectl apply -f k8s/accounts-deployment.yaml

# Deploy updated supergraph to router
cp supergraph.graphql /etc/apollo/supergraph.graphql
kill -HUP $(cat /var/run/apollo-router.pid)

# Monitor
# - Error rate per subgraph
# - Account subgraph latency vs previous monolith latency
# - Composition errors
```

### Step 8: Repeat for Each Domain
Extract Orders, Catalog, Reviews, etc. one domain at a time.

### Step 9: Decommission Monolith
Once all domains are extracted:
```yaml
# supergraph.yaml — Final
federation_version: 2
subgraphs:
  accounts:
    routing_url: http://accounts:4001/graphql
    schema:
      file: ./schemas/accounts.graphql
  orders:
    routing_url: http://orders:4002/graphql
    schema:
      file: ./schemas/orders.graphql
  catalog:
    routing_url: http://catalog:4003/graphql
    schema:
      file: ./schemas/catalog.graphql
  reviews:
    routing_url: http://reviews:4004/graphql
    schema:
      file: ./schemas/reviews.graphql
```

## Migration Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Composition fails after extraction | Blocked deployment | Run rover check in CI, test extraction in staging |
| Extracted subgraph has higher latency than monolith | Degraded UX | Performance test subgraph independently, add caching |
| @key mismatch between old and new subgraph | Null entity fields | Contract tests validate key consistency |
| Monolith removal breaks unextracted types | Schema errors | Only remove types after confirming zero fields orphaned |
| Consumer code depends on internal field ordering | Unexpected behavior | All consumer-facing behavior must be identical |

## Rollback Plan

### Per-Domain Rollback
```yaml
rollback_procedure:
  trigger: error_rate > 2% or p99_latency > 500ms for 5 minutes

  steps:
    1. Revert subgraph to previous version (or redirect to monolith)
    2. Restore previous supergraph schema (before extraction)
    3. Deploy restored supergraph to router
    4. Verify traffic is flowing through monolith again
    5. Investigate root cause before retrying extraction
```

### Full Rollback
```bash
# 1. Restore monolith to pre-federation state
kubectl apply -f k8s/monolith-pre-federation.yaml

# 2. Restore original supergraph config
cp supergraph.backup.graphql /etc/apollo/supergraph.graphql

# 3. Restart router
kill -HUP $(cat /var/run/apollo-router.pid)

# 4. Verify traffic
curl -f http://localhost:4000/.well-known/apollo/server-health

# 5. Scale down new subgraphs
kubectl scale deployment accounts-subgraph --replicas=0
```

## Migration Checklist

```yaml
pre_migration:
  - [ ] Complete schema audit: all entity types identified
  - [ ] Domain boundaries defined and agreed by teams
  - [ ] Performance baseline established (latency, error rate, throughput)
  - [ ] Router infrastructure provisioned (or gateway configured)
  - [ ] Observability tools configured (tracing, metrics, logging)
  - [ ] Rollback plan documented and rehearsed

per_domain:
  - [ ] Subgraph schema extracted and compiled
  - [ ] Entity resolver implemented in new subgraph
  - [ ] Contract tests pass (key consistency, field compatibility)
  - [ ] Monolith updated: extracted types removed, @external references added
  - [ ] Supergraph composes successfully
  - [ ] Canary deployment: 5% traffic to new subgraph
  - [ ] Error rate and latency monitored for 24 hours
  - [ ] Full traffic cutover to extracted subgraph
  - [ ] Monolith code for extracted domain deprecated

post_migration:
  - [ ] All domains extracted from monolith
  - [ ] Zero traffic to monolith verified
  - [ ] Monolith infrastructure decommissioned
  - [ ] Performance post-baseline measured and documented
  - [ ] Migration retrospective conducted
```

## Migration Tooling

### Schema Diff Tool
```typescript
function diffSchemas(monolith: string, supergraph: string): DiffResult {
  const monolithTypes = parseSchema(monolith);
  const supergraphTypes = parseSchema(supergraph);

  const missing = monolithTypes.filter(
    t => !supergraphTypes.find(s => s.name === t.name)
  );
  const changed = monolithTypes.filter(t => {
    const s = supergraphTypes.find(st => st.name === t.name);
    return s && !typesEqual(t, s);
  });

  return {
    typesRemoved: missing.map(t => t.name),
    typesChanged: changed.map(t => ({
      name: t.name,
      diffs: fieldDiff(t, supergraphTypes.find(s => s.name === t.name)),
    })),
    backwardCompatible: missing.length === 0 && changed.every(c => isBackwardCompatible(c)),
  };
}
```

## Key Points
- Strangler Fig pattern: extract one domain at a time, maintaining a working supergraph
- Begin by adding federation directives to the existing monolith schema
- Extract domains incrementally — never attempt a big-bang migration
- Each extraction requires: new subgraph + monolith removal of extracted types + supergraph update
- Contract tests (key consistency, field compatibility) prevent composition errors
- Rollback at the domain level: revert subgraph, restore previous supergraph
- Performance baseline before migration is essential for measuring impact
- Router infrastructure (auth, rate limiting, tracing) delivers value even before any domain extraction
- @override can be used for gradual field-level migration without breaking changes
- Monitor error rate and latency for 24+ hours after each domain extraction
