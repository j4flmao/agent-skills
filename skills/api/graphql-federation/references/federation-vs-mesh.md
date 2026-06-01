# Apollo Federation vs. GraphQL Mesh

## Decision Framework

### Apollo Federation
**Best for**: Greenfield GraphQL with multiple teams owning independent domains.

| Strength | Detail |
|----------|--------|
| Native GraphQL composition | All subgraphs speak native GraphQL |
| Automatic query planning | Router automatically plans multi-subgraph fetches |
| Team autonomy | Each team owns and deploys their subgraph independently |
| Schema registry | Apollo GraphOS provides schema checks, validation, change tracking |
| Performance | Rust-based Apollo Router is extremely high-performance |
| Entity resolution | Built-in `__resolveReference` mechanism |
| Ecosystem | Rich tooling: Rover CLI, Apollo Studio, GraphOS |

### GraphQL Mesh
**Best for**: Wrapping existing APIs (REST, gRPC, SOAP, SQL) into a unified GraphQL interface.

| Strength | Detail |
|----------|--------|
| Source diversity | Supports 20+ source types natively (OpenAPI, gRPC, SQL, SOAP, Kafka, etc.) |
| No schema ownership | Sources don't need to be GraphQL-aware |
| Transformers | Built-in transforms: rename, filter, prefix, cache, etc. |
| Runtime composition | Composes at runtime, not build time |
| Federation compatibility | Can produce Federation-compatible subgraphs |
| The Guild ecosystem | Part of Envelop, Yoga, GraphQL-Codegen ecosystem |

## Comparison Matrix

| Feature | Apollo Federation | GraphQL Mesh |
|---------|-----------------|--------------|
| Source types | GraphQL only | Any (REST, gRPC, SQL, SOAP, Kafka, etc.) |
| Composition time | Build time (static) | Runtime (dynamic) |
| Gateway/router | Apollo Router (Rust) / Gateway (Node.js) | Envelop / Yoga / Custom |
| Entity resolution | Built-in (`__resolveReference`) | Manual (custom resolvers/mergers) |
| Query planning | Automatic | Manual configuration |
| Performance | High (compiled Rust router) | Moderate (depends on middleware) |
| Team model | Multi-team, each owns a subgraph | Single team unifying backends |
| Schema registry | Apollo GraphOS | None built-in |
| Breaking change detection | Built-in (rover subgraph check) | None built-in |
| Cost analysis | Built-in demand control | Manual |
| Complexity | Medium (Federation concepts) | Low-Medium (config-driven) |
| Learning curve | Steeper (directives, composition) | Gentler (JSON/YAML config) |
| Maturity | Highly mature (v2 stable) | Growing rapidly |

## Decision Flowchart

```
Start: Do you need to unify multiple APIs?
  │
  ├─ Are all sources already GraphQL?
  │    ├─ Yes → Apollo Federation
  │    └─ No → Continue
  │
  ├─ Do you have 3+ teams owning separate domains?
  │    ├─ Yes → Apollo Federation (each team builds GraphQL subgraphs)
  │    └─ No → Continue
  │
  ├─ Are you wrapping legacy REST/SOAP/SQL backends?
  │    ├─ Yes → GraphQL Mesh
  │    └─ No → Continue
  │
  ├─ Is your primary goal API unification of existing systems?
  │    ├─ Yes → GraphQL Mesh
  │    └─ No → Evaluate both
  │
  └─ Hybrid approach:
       GraphQL Mesh wraps REST → GraphQL subgraph
       → Those subgraphs feed into Apollo Federation
```

## Hybrid Architecture Example

```yaml
# Step 1: Mesh config wraps legacy REST API as GraphQL
# .meshrc.yaml
sources:
  - name: LegacyCRM
    handler:
      openapi:
        source: https://crm.example.com/openapi.yaml
  - name: LegacyERP
    handler:
      grpc:
        endpoint: erp.example.com:50051
        source: ./protos/erp.proto

transforms:
  - prefix:
      value: legacy_
      includeRootOperations: true

# Step 2: Mesh output treated as a Federation subgraph
# supergraph.yaml
subgraphs:
  legacy-crm:
    routing_url: http://mesh:4000/graphql
    schema:
      file: ./mesh-schema.graphql
  accounts:
    routing_url: http://accounts:4001/graphql
    schema:
      file: ./accounts.graphql
  orders:
    routing_url: http://orders:4002/graphql
    schema:
      file: ./orders.graphql
```

## When to Use Each

### Choose Apollo Federation When:
- All services are already or will be built as GraphQL APIs
- You have multiple teams that should own independent domains
- You need automatic query planning and entity resolution
- Performance at scale is critical (Apollo Router is 10x faster)
- You want schema registry, change checks, and field usage analytics
- Your organization follows DDD / bounded context patterns

### Choose GraphQL Mesh When:
- You need to unify existing REST, gRPC, SOAP, or SQL APIs
- You cannot modify the underlying services
- You need a quick GraphQL gateway over legacy systems
- Your team is small and the primary goal is API unification
- You need runtime schema composition based on config

### Choose Both (Hybrid) When:
- You have legacy systems that need wrapping (Mesh) plus new domain services (Federation)
- You want to gradually migrate from Mesh to Federation as services are rewritten
- Mesh handles source diversity, Federation handles composition and query planning
