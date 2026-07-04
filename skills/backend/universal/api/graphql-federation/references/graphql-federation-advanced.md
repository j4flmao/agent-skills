# GraphQL Federation Advanced Topics

## Cost Analysis & Demand Control

### Strategy Comparison
| Strategy | Mechanism | Use Case |
|----------|-----------|----------|
| `cost_bound` | Static cost weights per field | Predictable query patterns |
| `measured` | Runtime cost observation | Variable workloads |
| `static` | Max depth + alias limits | Simple protection |

### Router-Level Demand Control
```yaml
demand_control:
  strategy: cost_bound
  list_cost: 1              # Cost per list element
  object_cost: 2            # Cost per nested object
  scoring:
    max_cost: 1000
    max_depth: 10
    max_aliases: 15
  reject_on_limit_exceeded: true
```

### Manual Field Cost Weights
```graphql
extend type Query {
  expensiveReport: [ReportRow!]! @cost(weight: "50")
  cheapLookup: Detail! @cost(weight: "1")
  users(first: Int!): [User!]! @cost(weight: "first")
}

extend type ReportRow {
  computedField: String! @cost(weight: "5")
}
```

### CI Cost Validation
```typescript
async function validateQueryCosts(supergraphSdl: string, operations: string[]) {
  const schema = buildSupergraphSchema(supergraphSdl);
  for (const operation of operations) {
    const cost = await calculateOperationCost(schema, operation);
    if (cost > 100) {
      throw new Error(
        `Operation exceeds cost budget: ${cost} > 100\n${operation}`
      );
    }
  }
}
```

## Contract Testing for Federated Schemas

### Validation Scope
1. **Key consistency**: `@key` field sets match across all subgraphs for each entity
2. **Type compatibility**: Same-named types share compatible field definitions (types, nullability)
3. **Enum alignment**: Enum value sets are intentionally compatible
4. **Interface conformance**: All implementing types satisfy interface requirements
5. **@requires validation**: Every required field is resolvable by the router
6. **@provides accuracy**: Provided fields actually exist in the originating subgraph

### Contract Test Suite
```typescript
describe('Federated Contract Tests', () => {
  const subgraphs = {
    accounts: loadSchema('./schemas/accounts.graphql'),
    catalog: loadSchema('./schemas/catalog.graphql'),
    orders: loadSchema('./schemas/orders.graphql'),
    reviews: loadSchema('./schemas/reviews.graphql'),
  };

  it('all @key definitions for User match identically', () => {
    const keys = Object.entries(subgraphs).map(([name, schema]) => ({
      subgraph: name,
      key: extractEntityKey(schema, 'User'),
    }));
    const uniqueKeys = new Set(keys.map(k => JSON.stringify(k.key)));
    expect(uniqueKeys.size).toBe(1);
  });

  it('Product type fields are compatible across catalog and inventory', () => {
    const catalogFields = getEntityFields(subgraphs.catalog, 'Product');
    const inventoryFields = getEntityFields(subgraphs.inventory, 'Product');
    const sharedFields = intersect(
      catalogFields.map(f => f.name),
      inventoryFields.map(f => f.name)
    );
    for (const fieldName of sharedFields) {
      const f1 = catalogFields.find(f => f.name === fieldName);
      const f2 = inventoryFields.find(f => f.name === fieldName);
      expect(f1.type.toString()).toBe(f2.type.toString());
    }
  });

  it('no orphan @requires references exist', () => {
    for (const [name, schema] of Object.entries(subgraphs)) {
      const requires = findRequiresDirectives(schema);
      for (const { parentType, requires: fields } of requires) {
        for (const field of fields.split(' ')) {
          expect(findField(schema, parentType, field)).toBeDefined();
        }
      }
    }
  });

  it('no orphan @provides references exist', () => {
    for (const [name, schema] of Object.entries(subgraphs)) {
      const provides = findProvidesDirectives(schema);
      for (const { parentType, provides: fields } of provides) {
        for (const field of fields.split(' ')) {
          expect(findField(schema, parentType, field)).toBeDefined();
        }
      }
    }
  });
});
```

### CI Gate Configuration
```yaml
# .github/workflows/contract-tests.yml
on:
  pull_request:
    paths: ['schemas/**/*.graphql']
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:contracts
      - run: npm run validate:composition
      - name: Block on contract failure
        if: failure()
        run: exit 1
```

## Advanced Entity Resolution Patterns

### Non-Resolvable Keys
When a subgraph only references an entity without needing to resolve it:

```graphql
# Inventory subgraph tracks stock by Product ID
# It cannot and should not resolve full Product entities
type Product @key(fields: "id", resolvable: false) {
  id: ID! @external
}
```

The router will never send `_entities` queries to this subgraph for Product.

### @interfaceObject Pattern
Enables adding fields to all implementations of an interface from a single subgraph:

```graphql
# Subgraph A: defines interface and implementations
interface Media { id: ID!; title: String! }
type Book implements Media @key(fields: "id") { id: ID!; title: String!; author: String! }
type Movie implements Media @key(fields: "id") { id: ID!; title: String!; director: String! }

# Subgraph B: adds averageRating to ALL Media types via @interfaceObject
type Media @interfaceObject @key(fields: "id") {
  id: ID!
  averageRating: Float!
  totalReviews: Int!
}
```

### Federated Pagination Pattern
```graphql
# Orders subgraph owns the paginated connection
type Query {
  userOrders(userId: ID!, first: Int!, after: String): OrderConnection!
}

type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
}

type OrderEdge {
  cursor: String!
  node: Order!
}

# Accounts subgraph provides a convenience field
extend type User @key(fields: "id") {
  id: ID! @external
  orders(first: Int! = 10, after: String): OrderConnection
    @requires(fields: "id")
}
```

## Schema Migration Strategies

### Monolith to Federation: Strangler Fig
Phase 1 — Coexistence:
```yaml
federation_version: 2
subgraphs:
  legacy:
    routing_url: http://monolith:4000/graphql
    schema:
      file: ./schemas/legacy.graphql
  users:
    routing_url: http://users:4001/graphql
    schema:
      file: ./schemas/users.graphql
```

Phase 2 — Extract domain:
- Move User type from legacy to users subgraph
- Legacy retains full schema but router prefers users subgraph
- Use @override to migrate field resolution gradually

Phase 3 — Legacy decommission:
- Once all types are extracted, remove legacy subgraph
- Validate zero fields are orphaned

### Field Migration with @override
```graphql
# Step 1: New subgraph overrides name field
type Product @key(fields: "id") {
  id: ID!
  name: String! @override(from: "catalog")
  description: String! @shareable
}

# Step 2 (after migration window): Remove name from catalog subgraph
# Step 3 (after validation): Remove @override directive
```

### Breaking Change Management Checklist
```yaml
breaking_change_process:
  - [ ] rover subgraph check passes (no composition errors)
  - [ ] Contract tests updated and passing
  - [ ] All downstream subgraph teams notified (minimum 2 weeks)
  - [ ] Migration guide published for internal consumers
  - [ ] Canary deployment: 5% → 25% → 100% traffic
  - [ ] Error rate monitoring for 24 hours post-deploy
  - [ ] Rollback plan: restore previous supergraph schema
  - [ ] Schema version tagged in repository
```

## Multi-Region Federation

### Regional Topology
```
us-east-1                          eu-west-1
┌─────────────────┐               ┌─────────────────┐
│ Router (us)     │               │ Router (eu)     │
│ Subgraph A (us) │               │ Subgraph A (eu) │
│ Subgraph B (us) │               │ Subgraph B (eu) │
└─────────────────┘               └─────────────────┘
       │                                   │
       └────────── Global Schema ──────────┘
```

### Regional Router Configuration
```yaml
# router-us-east.yaml
supergraph:
  listen: 0.0.0.0:4000
subgraphs:
  accounts:
    routing_url: http://accounts.us-east.internal:4001/graphql
  catalog:
    routing_url: http://catalog.us-east.internal:4002/graphql

# router-eu-west.yaml
supergraph:
  listen: 0.0.0.0:4000
subgraphs:
  accounts:
    routing_url: http://accounts.eu-west.internal:4001/graphql
  catalog:
    routing_url: http://catalog.eu-west.internal:4002/graphql
```

## Federated Subscription Support

### Subscription Passthrough
```yaml
subscription:
  mode: passthrough
  websocket:
    path: /ws
    protocols:
      - graphql-ws          # Recommended
      - graphql-transport-ws
  subgraphs:
    accounts:
      path: /ws
    orders:
      path: /ws
```

### Multi-Source Subscription Aggregation
```graphql
# Client subscribes to a single endpoint
# Router fans out to relevant subgraphs and merges events
subscription {
  userUpdated(id: "1") {  # Accounts subgraph
    id
    name
    email
  }
  orderCreated {           # Orders subgraph
    id
    status
    total
  }
}
```

## Subgraph Performance Profiling

### Router-Side Metrics
```yaml
telemetry:
  metrics:
    prometheus:
      enabled: true
      listen: 0.0.0.0:9090
  instrumentation:
    subgraph:
      request_duration: true
      request_size: true
      response_size: true
      # Track entity resolution separately
      entities:
        count: true
        duration: true
```

### Per-Subgraph Budget Alerts
```yaml
# Prometheus alert rules
groups:
  - name: federation-performance
    rules:
      - alert: SubgraphLatencyBudgetExceeded
        expr: |
          histogram_quantile(0.99,
            rate(apollo_router_subgraph_request_duration_ms_bucket{subgraph="reviews"}[5m])
          ) > 200
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Reviews subgraph P99 latency exceeds 200ms"

      - alert: SubgraphErrorRateSpike
        expr: |
          rate(apollo_router_subgraph_errors_total{subgraph="orders"}[5m])
          /
          rate(apollo_router_subgraph_requests_total{subgraph="orders"}[5m])
          > 0.05
        for: 2m
        labels: { severity: critical }
```

### Router Rhai Script for Custom Metrics
```rust
// Router Rhai script — track expensive query patterns
fn supergraph_service(service) {
    service.map_request(|request| {
        let op = request.query.operation;
        if request.query.query_string contains "expensiveReport" {
            request.context.is_expensive = true;
        }
        request
    });

    service.map_response(|response| {
        if response.context.is_expensive {
            // Emit custom metric for expensive queries
            response.context.metrics_counter("expensive_queries_total", 1);
        }
        response
    });
}
```

## High-Cardinality Entity Resolution Optimization

### Batch DataLoader Pattern
```typescript
class FederatedDataLoader {
  private loaders = new Map<string, DataLoader<string, any>>();

  entity(ref: { __typename: string; id: string }): Promise<any> {
    const { __typename, id } = ref;
    if (!this.loaders.has(__typename)) {
      this.loaders.set(__typename, new DataLoader(
        (ids: string[]) => this.batchResolve(__typename, ids),
        { maxBatchSize: 100 }
      ));
    }
    return this.loaders.get(__typename)!.load(id);
  }

  private async batchResolve(typename: string, ids: string[]): Promise<any[]> {
    switch (typename) {
      case 'User':
        return db.users.findByIds(ids);
      case 'Product':
        return db.products.findByIds(ids);
      case 'Order':
        return db.orders.findByIds(ids);
      default:
        return ids.map(() => null);
    }
  }
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
```

## Router Plugins and Customization

### Custom Auth Plugin (Rust)
```rust
use apollo_router::plugin::Plugin;
use apollo_router::services::supergraph;
use apollo_router::Context;

struct AuthPlugin {
    api_key_header: String,
}

#[async_trait]
impl Plugin for AuthPlugin {
    async fn supergraph_service(
        &self,
        service: supergraph::BoxService,
    ) -> supergraph::BoxService {
        service
            .map_request(|mut req: supergraph::Request| {
                let headers = req.router_request.headers();
                if let Some(api_key) = headers.get(&self.api_key_header) {
                    req.context.insert("api_key", api_key.to_str().unwrap());
                    // Validate API key and set user context
                    req.context.insert("user_id", validate_and_extract_user(api_key));
                }
                req
            })
            .boxed()
    }
}
```

### Header Propagation and Transformation
```yaml
headers:
  all:
    request:
      - propagate:
          matching: "^x-.*"
      - propagate:
          named: "authorization"
        default: "anonymous"
      - remove:
          named: "cookie"
      - insert:
          name: "x-request-id"
          value: "{context.request_id}"
    response:
      - set:
          name: "x-request-id"
          value: "{context.request_id}"
      - set:
          name: "x-trace-id"
          value: "{context.trace_id}"
```

## Production Runbook

### Startup Sequence
```bash
# 1. Compose supergraph
rover supergraph compose --config ./supergraph.yaml --output ./supergraph.graphql

# 2. Validate supergraph
rover graph check my-graph@current --schema ./supergraph.graphql

# 3. Start router with new schema
./router --config ./router.yaml --supergraph ./supergraph.graphql

# 4. Health check
curl -f http://localhost:8088/health

# 5. Warm query plan cache
node ./scripts/warm-cache.js
```

### Incident Response: Subgraph Degradation
```yaml
incident_response:
  symptom: Orders subgraph P99 latency > 1s
  impact: All queries hitting orders subgraph are slow
  immediate:
    - Enable circuit breaker for orders subgraph
    - Consider reducing orders subgraph timeout from 10s to 3s
    - Scale orders subgraph horizontally
  mitigate:
    - If circuit breaker opens: requests to orders fields return errors instead of hanging
    - Consider removing orders subgraph and serving degraded responses
    - Notify downstream consumers of degraded service
  resolve:
    - Fix root cause (DB query, connection pool, deployment issue)
    - Re-enable normal traffic shaping
    - Post-mortem: add alert thresholds to catch earlier
```

### Blue-Green Supergraph Deployment
```bash
# Deploy blue (new)
rover supergraph compose --config ./supergraph.v2.yaml --output supergraph.v2.graphql
cp supergraph.v2.graphql /etc/apollo/supergraph.blue.graphql
docker-compose up -d router-blue

# Validate blue
curl -f http://localhost:4001/.well-known/apollo/server-health

# Switch traffic
docker-compose up -d router-green  # original (green)
docker-compose scale router=0       # scale down old
docker-compose up -d router         # start with blue supergraph

# Rollback if needed
cp /etc/apollo/supergraph.green.graphql /etc/apollo/supergraph.graphql
```

## Key Points
- Cost analysis at the router prevents runaway queries — use demand control
- Contract testing validates cross-subgraph compatibility in CI before deployment
- Non-resolvable keys (`resolvable: false`) prevent unnecessary entity queries
- @interfaceObject enables field injection across all implementations of an interface
- Strangler Fig pattern enables incremental monolith-to-federation migration
- @override gradually migrates field resolution between subgraphs
- Multi-region requires per-region router instances with colocated subgraphs
- Batch entity resolution (DataLoader) prevents N+1 at the supergraph level
- Subscriptions need passthrough mode in the router configuration
- Rhai scripting enables custom metrics without deploying new router binaries
- Circuit breakers prevent cascading failures from degraded subgraphs
- Blue-green deployment minimizes risk during supergraph schema changes

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Apollo Federation v2 directives, supergraph schema compositions, query planning, and entity resolution patterns.
-->
