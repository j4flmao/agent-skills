---
name: api-graphql-federation
description: >
  Use when the user asks about GraphQL Federation, Apollo Federation, federated schema, subgraphs, supergraph, schema composition, @key/@requires/@external directives, or distributed GraphQL architecture. Do NOT use for: basic GraphQL schema design (backend-graphql-patterns), or single-service GraphQL APIs.
version: "2.0.0"
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
Design and implement GraphQL Federation: compose multiple subgraphs into a unified supergraph, manage distributed GraphQL architecture, and scale GraphQL across teams. Make informed build-vs-buy decisions between Apollo Federation and alternative distributed graph strategies.

## Workflow

### Federation Architecture
```
Supergraph (Apollo Router / Gateway)
  ├── Subgraph A (Users service) — @key(fields: "id")
  ├── Subgraph B (Orders service) — @key(fields: "id") @extends User
  ├── Subgraph C (Reviews service) — @key(fields: "id") @extends User
  └── Subgraph D (Inventory service) — standalone
```

### Apollo Federation vs. GraphQL Mesh Decision Tree

Use this decision framework when choosing between Apollo Federation and GraphQL Mesh:

| Criterion | Apollo Federation | GraphQL Mesh |
|-----------|-----------------|--------------|
| Schema ownership | Each subgraph owns its schema | Sources are existing APIs (REST, gRPC, SOAP, etc.) |
| Team topology | Multiple teams own separate subgraphs | Single team integrating existing backends |
| Source types | Native GraphQL only | Any source (REST, OpenAPI, gRPC, SQL, SOAP, etc.) |
| Composition model | Static composition via Rover CLI | Runtime schema stitching |
| Gateway | Apollo Router (Rust) or Gateway (Node.js) | Envelop, Yoga, or custom |
| Federation directives | @key, @extends, @requires, @provides, @shareable | Transformers, handlers, mesh config |
| Entity resolution | Built-in via __resolveReference | Manual stitching resolvers |
| Query planning | Automatic query planner | Manual or custom merge config |
| Performance | Optimized Rust router, plan caching | Depends on underlying gateway |
| Ecosystem maturity | Mature (Apollo GraphOS, Studio) | Growing (The Guild ecosystem) |
| When to choose | Greenfield GraphQL with multiple teams | Wrapping legacy/heterogeneous backends |

**Decision flow**:
1. Are all your sources already GraphQL? → Apollo Federation
2. Do you need to wrap REST/gRPC/SQL backends? → GraphQL Mesh
3. Do you have 3+ teams owning separate domains? → Apollo Federation
4. Is your primary goal API unification of legacy systems? → GraphQL Mesh
5. Hybrid approach: Use Mesh to convert REST → GraphQL, then compose those as subgraphs via Federation

### Federation Directives (Federation v2)
| Directive | Purpose | Example |
|-----------|---------|---------|
| @key | Primary key for entity | `@key(fields: "id")` |
| @extends | Extend type from another subgraph (implied in v2) | `type User @key(fields: "id")` |
| @external | Field defined in another subgraph (implied in v2) | `id: ID!` |
| @requires | Field requires data from another subgraph | `@requires(fields: "shippingZip")` |
| @provides | Field provides data to other subgraphs | `@provides(fields: "name")` |
| @shareable | Field can be resolved by multiple subgraphs | `@shareable` |
| @override | Migrate field resolution between subgraphs | `@override(from: "inventory")` |
| @inaccessible | Hide field from supergraph | `@inaccessible` |
| @composeDirective | Propagate directive to supergraph | `@composeDirective(name: "@authorized")` |
| @interfaceObject | Expose interface fields on entity | `@interfaceObject` |

### Subgraph Schema Example (Federation v2)
```graphql
# Users subgraph
type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String!
}

# Orders subgraph (extends User — no @extends needed in v2)
type User @key(fields: "id") {
    id: ID!
    orders: [Order!]!
}

type Order @key(fields: "id") {
    id: ID!
    userId: ID!
    total: Float!
    status: OrderStatus!
}
```

### Entity Resolution Deep Dive

Each subgraph that extends an entity must implement `__resolveReference`:

```typescript
// Users subgraph — entity origin
const resolvers = {
  User: {
    __resolveReference(ref, context) {
      return context.dataSources.users.findById(ref.id);
    },
  },
};

// Orders subgraph — entity extension
const resolvers = {
  User: {
    __resolveReference(ref, context) {
      // Return just enough to resolve orders
      return { id: ref.id };
    },
    orders(parent, _, context) {
      return context.dataSources.orders.findByUserId(parent.id);
    },
  },
};
```

**Resolution flow**:
1. Router receives query spanning multiple subgraphs
2. Router sends `_entities` query to Orders subgraph with representations `[{"__typename": "User", "id": "1"}]`
3. Subgraph calls `__resolveReference` with each representation
4. Subgraph returns the entity with only the fields requested from it
5. Router merges fields from all subgraph responses into a unified result

### @requires Resolution Flow
```graphql
# Shipping subgraph needs weight from another subgraph
type Product @key(fields: "id") {
  id: ID!
  weight: Int @external
  shippingCost: Float @requires(fields: "weight")
}
```

1. Router fetches `weight` from the subgraph that owns it
2. Router includes `weight` in the representation sent to Shipping subgraph
3. Shipping subgraph receives `{"__typename": "Product", "id": "1", "weight": 10}`
4. Computes `shippingCost` using the pre-fetched `weight`

### Supergraph Composition Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Subgraph A   │    │ Subgraph B   │    │ Subgraph C   │
│ Schema       │    │ Schema       │    │ Schema       │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                   ┌───────────────┐
                   │  Composition  │  rover supergraph compose
                   │    Engine     │
                   └───────┬───────┘
                           ▼
                   ┌───────────────┐
                   │   Supergraph  │  unified schema sent to router
                   │    Schema     │
                   └───────────────┘
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
  orders:
    routing_url: http://orders:4003/graphql
    schema:
      file: ./schemas/orders.graphql
```

```bash
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql
```

### Schema Evolution & Breaking Change Detection
```bash
# Check backward compatibility before deploying
rover subgraph check my-graph@current \
    --schema ./updated-accounts.graphql \
    --name accounts

# If check passes, publish the new schema
rover subgraph publish my-graph@current \
    --schema ./updated-accounts.graphql \
    --name accounts \
    --routing-url http://accounts:4001/graphql
```

**What rover subgraph check validates**:
- Field/type removals
- Argument changes
- @key directive changes
- Value type to entity conversion
- Enum value additions/removals

### Federated Tracing & Observability

#### OpenTelemetry in Apollo Router
```yaml
# router.yaml — federated tracing
telemetry:
  tracing:
    otlp:
      endpoint: http://otel-collector:4318
      protocol: http
    propagation:
      context: cloudtrace
      # Forward trace context to subgraphs
      forward:
        - "traceparent"
        - "x-cloud-trace-context"
    sampling:
      default: 0.1
      subgraphs:
        accounts: 1.0       # Trace all accounts requests
        reviews: 0.01       # Sample reviews at 1%
```

**What federated tracing reveals**:
- **Query plan generation** — time spent planning the multi-subgraph fetch
- **Per-subgraph latency** — which subgraph is the bottleneck
- **Fetch boundary count** — number of subgraph hops per query
- **Entity resolution** — time spent in `__resolveReference`
- **Representation passing** — overhead of data transfer between services

#### Apollo Studio Integration
```yaml
# router.yaml
telemetry:
  apollo:
    graphs:
      - graph_ref: my-graph@current
        key: ${APOLLO_KEY}
    field_usage: true        # Track field-level usage stats
    operation_counts: true   # Track operation frequency
```

Studio provides:
- **Field usage heatmaps** — which fields are most requested
- **Operation traces** — waterfall view across subgraphs
- **Schema checks** — breaking change detection in CI
- **Cost analysis** — query complexity scoring

### Security in Federated Architecture

#### Layered Security Model
```
Client → Router (authN + rate limit) → Subgraph (authZ + validation)
```

#### Router-Level Authentication (JWT)
```yaml
# router.yaml
authentication:
  jwt:
    jwks_urls:
      - https://auth.example.com/.well-known/jwks.json
    issuer: https://auth.example.com/
    audiences:
      - my-api

headers:
  all:
    request:
      - propagate:
          matching: .*
      - insert:
          name: "x-user-id"
          value: "{{ authentication.jwt.sub }}"
      - insert:
          name: "x-user-roles"
          value: "{{ authentication.jwt.claims.roles }}"
```

#### Subgraph-Level Authorization
```typescript
// Each subgraph independently validates permissions
const resolvers = {
  Query: {
    userOrders: async (_, { userId }, { userId: authUserId, roles }) => {
      if (authUserId !== userId && !roles.includes('admin')) {
        throw new GraphQLError('Forbidden', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return db.orders.findByUserId(userId);
    },
  },
  User: {
    __resolveReference(ref, { userId, roles }) {
      // Guard entity resolution — don't leak existence
      if (!userId) return null;
      return db.users.findById(ref.id);
    },
  },
};
```

#### Protecting Against GraphQL-Specific Attacks

| Attack | Mitigation | Config |
|--------|-----------|--------|
| Deeply nested queries | Depth limiting | `max_depth: 10` |
| Query aliasing abuse | Alias limiting | `max_aliases: 15` |
| Entity list bombing | Max entities per request | `max_entities_per_request: 100` |
| Introspection scraping | Disable in production | `introspection: false` |
| Costly queries | Cost analysis | `demand_control.strategy: cost_bound` |

```yaml
# router.yaml — demand control
demand_control:
  strategy: cost_bound
  list_cost: 1
  object_cost: 2
  scoring:
    max_cost: 1000
    max_depth: 10
  reject_on_limit_exceeded: true

rate_limiting:
  global:
    capacity: 1000
    time_window: 60s
  per_user:
    capacity: 100
    time_window: 60s
```

### Production Considerations

#### Traffic Shaping Per Subgraph
```yaml
traffic_shaping:
  all:
    timeout: 30s
    compression: true
    http2:
      keepalive_interval: 30s
      keepalive_timeout: 10s
  subgraphs:
    accounts:
      timeout: 5s
      retry:
        max_retries: 3
        base_interval: 100ms
    reviews:
      timeout: 3s
      circuit_breaker:
        error_threshold: 0.5
        request_volume_threshold: 20
        sleep_window: 30s
        half_open_requests: 5
    inventory:
      timeout: 10s
      retry:
        max_retries: 2
```

#### Query Plan Caching
```yaml
query_planning:
  cache:
    enabled: true
    size: 10000
    ttl: 3600s
  experimental_plans: false
  incremental_delivery:
    enable_single_entity: true
```

Warm the cache on deploy:
```typescript
// Pre-warm common query plans
const commonQueries = [
  `query { me { id name } }`,
  `query { products(first: 10) { id name price } }`,
  `query { order(id: "hot") { id status total } }`,
];
await Promise.all(commonQueries.map(q => router.execute(q)));
```

#### Blue-Green Supergraph Deployment
```bash
# 1. Compose new supergraph
rover supergraph compose --config ./supergraph.v2.yaml --output supergraph.v2.graphql

# 2. Deploy to staging router
cp supergraph.v2.graphql /etc/apollo/supergraph.staging.graphql

# 3. Health check staging router
curl -f http://localhost:4001/.well-known/apollo/server-health

# 4. Promote to production
cp supergraph.v2.graphql /etc/apollo/supergraph.graphql

# 5. Reload production router
kill -HUP $(cat /var/run/apollo-router.pid)
```

### Performance Budgets
```yaml
performance_budget:
  max_fetch_count: 5        # Max subgraph hops per query
  max_query_depth: 8        # Max nesting depth
  max_latency_p99_ms: 500   # P99 latency across all subgraphs
  max_cost_per_query: 100   # Cost analysis limit
```

#### Reducing Fetch Boundaries with @provides
```graphql
# Products subgraph: users browsing products don't hit accounts
type Query {
  topProducts: [Product!]!
}

extend type Product @key(fields: "id") {
  id: ID! @external
  name: String! @external @provides(fields: "name")
  price: Float! @provides(fields: "currency")
}
```

### DataLoader Across Subgraphs
```typescript
// Batch-load entities to avoid N+1 resolution calls
class UserLoader {
  private batch = new Map<string, Promise<User>>();

  load(id: string): Promise<User> {
    if (!this.batch.has(id)) {
      this.batch.set(id, this.fetchBatch());
    }
    return this.batch.get(id)!;
  }

  private async fetchBatch(): Promise<void> {
    const ids = [...this.batch.keys()];
    const users = await db.users.findByIds(ids);
    for (const user of users) {
      this.batch.set(user.id, Promise.resolve(user));
    }
  }
}
```

### Testing Federated Graphs

#### Unit Test: Subgraph Entity Resolution
```typescript
describe('Accounts Subgraph', () => {
  it('resolves User entity by key', async () => {
    const result = await subgraph.executeQuery(`
      query ($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ... on User { id name email }
        }
      }
    `, {
      representations: [{ __typename: 'User', id: '1' }],
    });

    expect(result.data._entities[0].name).toBe('Alice');
  });
});
```

#### Integration Test: Cross-Subgraph Query
```typescript
describe('Supergraph: User with Orders', () => {
  it('resolves fields across subgraphs', async () => {
    const query = `
      query { user(id: "1") { name orders { total status } } }
    `;
    const result = await gateway.execute(query);
    expect(result.data.user.name).toBe('Alice');
    expect(result.data.user.orders).toHaveLength(3);
  });
});
```

#### Contract Testing Between Subgraphs
```typescript
// Each subgraph publishes its schema contract
// CI validates that contracts remain compatible
describe('Contracts', () => {
  it('accounts subgraph schema is valid', async () => {
    const schema = fs.readFileSync('./schemas/accounts.graphql', 'utf8');
    const errors = await validateSchema(schema);
    expect(errors).toHaveLength(0);
  });

  it('orders extension of User is compatible', () => {
    // Verify @key fields match across subgraphs
    const userKey = extractKey(accountsSchema, 'User');
    const orderUserKey = extractKey(ordersSchema, 'User');
    expect(userKey).toEqual(orderUserKey);
  });
});
```

### Common Composition Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ENUM_MISMATCH` | Enum values differ between subgraphs | Align enum definitions |
| `TYPE_MISMATCH` | Same name used for type vs interface | Unify type kind |
| `EXTERNAL_MISSING` | Referenced field not @external | Mark field as external |
| `KEY_MISSING` | Type extended but no @key in origin | Add @key to origin |
| `REQUIRES_MISSING` | @requires field unavailable | Ensure field is resolvable |
| `DUPLICATE_FIELD` | Field defined in multiple subgraphs without @shareable | Add @shareable |

### Migration Guide: Federation 1 → Federation 2

| Federation 1 | Federation 2 |
|-------------|-------------|
| `@extends` | Unnecessary (all type extensions are implicit) |
| `@external` | Unnecessary (fields owned elsewhere assumed external) |
| `gateway.js` | `@apollo/gateway` v2+ handles automatically |
| Composition | `rover supergraph compose` with `federation_version: 2` |

**Steps**:
1. Update `federation_version` to `2` in supergraph config
2. Remove all `@extends` and `@external` directives from subgraph schemas
3. Update to `@apollo/gateway@^2.0` or deploy Apollo Router
4. Run rover supergraph compose to validate
5. Deploy new supergraph

### Key Metrics Dashboard

| Metric | Source | What It Reveals |
|--------|--------|----------------|
| `apollo_router_query_planning_duration_ms` | Router | Plan cache hit/miss |
| `apollo_router_subgraph_request_duration_ms` | Router | Per-subgraph health |
| `apollo_router_fetch_count` | Router | Schema design efficiency |
| `apollo_router_cache_hit_ratio` | Router | Cache tuning needed |
| `apollo_router_error_rate` | Router | Subgraph failures |
| `apollo_router_entities_per_request` | Router | Entity list bombing |
| Subgraph P99 latency | Subgraph metrics | Data-level bottlenecks |

## Team Topology Patterns

### Subgraph Ownership Models
| Model | Description | Team Structure | When to Use |
|-------|-------------|---------------|-------------|
| Domain-aligned | One subgraph per bounded context | Each domain team owns 1 subgraph | Clear domain boundaries, DDD org |
| Split by volatility | Seperate read vs write subgraphs | Platform + domain teams | High read/write asymmetry |
| API gateway pattern | Subgraph wraps existing REST/gRPC | Integration team owns gateway | Legacy system integration |
| Shared subgraph | Cross-cutting concerns (auth, audit) | Platform team | truly shared capabilities |

### Team API Contract
```yaml
team_contract:
  subgraph_owners:
    accounts: team-identity
    orders: team-commerce
    catalog: team-product
    reviews: team-engagement
    inventory: team-fulfillment

  communication:
    - Subgraph schema changes communicated 2 weeks in advance
    - Breaking changes require API council approval
    - Monthly cross-team schema sync meeting
    - Shared Slack channel for federation alerts

  dependencies:
    - Teams maintain their subgraph's @key definitions
    - Extension subgraphs coordinate with origin subgraph owners
    - Schema registry (Apollo GraphOS) tracks all published schemas
```

## Schema Lifecycle Management

### Subgraph Schema Version Flow
```
Development → PR Review → Contract Tests → Staging → Canary → Production
                                                                   ↓
                                                            Apollo GraphOS
                                                          Schema Registry
                                                                   ↓
                                                         Supergraph Compose
                                                                   ↓
                                                         Router Deploy
```

### Schema Change Notification
```yaml
schema_change_process:
  additive: # New fields, types, endpoints
    notification: optional (Slack channel)
    review: none required
    deploy: any time

  breaking: # Field removal, type change, @key change
    notification: required (2 weeks minimum)
    review: API council approval
    approval_period: 2 weeks
    deploy: coordinated rollout with all affected teams
    rollback: pre-approved rollback plan required
```

### Schema Tagging Strategy
```yaml
schema_tags:
  - tag: current
    description: Currently deployed supergraph schema
    updated_on: each successful deployment

  - tag: candidate
    description: Next schema to be deployed (canary)
    updated_on: after composition validation

  - tag: previous
    description: Previously deployed schema (for rollback)
    updated_on: each deployment (rotate: keep last 3)

  - tag: stable-{date}
    description: Snapshot of stable schemas
    updated_on: monthly
```

## Incident Management for Federated Graphs

### Incident Classification
| Severity | Definition | Response Time | Example |
|----------|-----------|---------------|---------|
| P0 | Complete supergraph outage | < 5 min | Router crash, composition failure |
| P1 | Subgraph degradation | < 15 min | High latency in Orders subgraph |
| P2 | Isolated field errors | < 1 hour | Specific resolver returns errors |
| P3 | Non-critical anomalies | < 1 day | Suboptimal query plan |

### Incident Response Playbook
```yaml
playbook:
  p0_outage:
    detection:
      - Error rate > 5% spike (Prometheus alert)
      - Health check failure
      - PagerDuty escalation
    immediate:
      - Check router health: curl -f http://router:8088/health
      - Check last supergraph deployment: git log --oneline -1
      - Rollback to previous supergraph:
          cp /etc/apollo/supergraph.previous.graphql /etc/apollo/supergraph.graphql
          kill -HUP $(cat /var/run/apollo-router.pid)
      - Verify recovery: curl -f http://router:4000/.well-known/apollo/server-health
    investigation:
      - Check router logs for composition errors
      - Check Apollo Studio for failed operations
      - Check subgraph health endpoints individually
    resolution:
      - Isolate failing subgraph or schema change
      - Deploy hotfix or revert change
      - Post-mortem within 24 hours

  p1_subgraph_degradation:
    detection:
      - Subgraph P99 > 500ms (Grafana alert)
      - Subgraph error rate > 2%
    immediate:
      - Enable circuit breaker for degraded subgraph
      - Reduce timeout for affected subgraph
      - Scale subgraph horizontally if possible
    investigation:
      - Review subgraph deployment timeline
      - Check DB connection pool saturation
      - Review recent code changes to subgraph
    resolution:
      - Apply subgraph-level fix
      - Monitor for 1 hour post-fix
      - Restore normal traffic_shaping config
```

## Advanced Tracing with Custom Spans

### Router Rhai Telemetry Script
```rust
// router.rhai — custom span injection
fn supergraph_service(service) {
    service.map_request(|request| {
        // Tag requests by client type
        let user_agent = request.router_request.headers["user-agent"];
        if user_agent contains "MobileApp" {
            request.context.client_type = "mobile";
        } else if user_agent contains "WebKit" {
            request.context.client_type = "web";
        } else {
            request.context.client_type = "api";
        }
        request
    });

    service.map_response(|response| {
        // Log slow queries
        if response.context.duration > 1000 {
            log_warning(`Slow query detected: ${response.context.operation_name}`);
        }
        response
    });
}
```

### Custom Subgraph Span Attributes
```typescript
const resolvers = {
  Query: {
    users: async (_, __, { tracer }) => {
      return tracer.startActiveSpan('users.query', (span) => {
        span.setAttribute('db.system', 'postgresql');
        span.setAttribute('db.table', 'users');
        span.setAttribute('query.plan', 'index_scan');
        return db.users.findAll();
      });
    },
  },
  User: {
    __resolveReference: async (ref, { tracer }) => {
      return tracer.startActiveSpan('entity_resolution', (span) => {
        span.setAttribute('entity.type', 'User');
        span.setAttribute('entity.id', ref.id);
        span.setAttribute('resolver', 'primary');
        return db.users.findById(ref.id);
      });
    },
  },
};
```

## References
- `references/graphql-federation-fundamentals.md` — Federation v2 core concepts, directives, entity types, subgraph design
- `references/graphql-federation-advanced.md` — Advanced topics: cost analysis, contract testing, migration strategies, multi-region
- `references/entity-resolution.md` — Entity resolution patterns, __resolveReference, @requires, @provides flow
- `references/federation-architecture.md` — Subgraph design principles, Fed 1 vs Fed 2 comparison
- `references/federation-deployment.md` — Production deployment, CI/CD, rollback procedures
- `references/federation-performance.md` — Query planning, caching, DataLoader, performance budgets
- `references/federation-security.md` — AuthN at router, authZ at subgraph, rate limiting, DoS protection
- `references/federation-testing.md` — Unit, integration, contract testing patterns
- `references/supergraph-composition.md` — Composition pipeline, directives, CI/CD
- `references/supergraph-config.md` — Router configuration, traffic shaping, query plans
- `references/federation-vs-mesh.md` — Apollo Federation vs GraphQL Mesh comparison
- `references/federated-tracing.md` — OpenTelemetry, Studio integration, distributed tracing
- `references/federation-migration-monolith.md` — Migrating from monolithic GraphQL to federation (Strangler Fig)
- `references/federation-cost-management.md` — Cost analysis, demand control, entity resolution cost optimization
