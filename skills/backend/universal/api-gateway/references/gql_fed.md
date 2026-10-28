# GraphQL Federation at the Gateway

Running a federated GraphQL router as (or behind) the API gateway: composing subgraphs into a supergraph, router configuration, and protecting the graph with persisted queries and operation limits. Schema design inside subgraphs belongs to the GraphQL skills; this file covers the gateway side.

## Components

| Component | Role |
|-----------|------|
| Subgraph | A GraphQL service owning part of the schema, annotated with Federation directives |
| Composition | Validates and merges subgraph schemas into a supergraph schema |
| Router / gateway | Receives client operations, builds a query plan, calls subgraphs, merges results |
| Schema registry | Stores subgraph versions, runs composition and breaking-change checks |

Router implementations: Apollo Router (Rust, Elastic License v2), WunderGraph Cosmo Router (Go, Apache 2.0), The Guild Hive Gateway (Node, MIT). Apollo's Node `@apollo/gateway` is superseded by the Router for new deployments.

## Federation 2 Subgraph Basics

```graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.3",
        import: ["@key", "@shareable", "@external", "@requires"])

type Product @key(fields: "id") {
  id: ID!
  name: String!
  priceCents: Int!
}
```

```graphql
# reviews subgraph contributes fields to Product
type Product @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
}
```

| Directive | Meaning |
|-----------|---------|
| `@key` | Entity primary key; subgraph can resolve the entity by it |
| `@shareable` | Field may be resolved by more than one subgraph |
| `@external` + `@requires` | Field needs data owned by another subgraph |
| `@provides` | Subgraph can return certain external fields on a path |
| `@override(from:)` | Migrate field ownership between subgraphs |
| `@inaccessible` | Hide from the public API but keep for composition |

Each entity-owning subgraph implements `__resolveReference` (or the framework equivalent) to load entities by key; batch these loads with DataLoader to avoid N+1 across the query plan.

## Composition in CI

```yaml
# supergraph.yaml
federation_version: =2.9.0
subgraphs:
  products:
    routing_url: http://products.internal:4001/graphql
    schema: { file: ./products.graphql }
  reviews:
    routing_url: http://reviews.internal:4002/graphql
    schema: { file: ./reviews.graphql }
```

```bash
rover supergraph compose --config supergraph.yaml > supergraph.graphql
rover subgraph check my-graph@prod --name reviews --schema reviews.graphql   # with GraphOS registry
```

- Block merges when composition fails or a check reports breaking changes against real client operations.
- Publish subgraph schemas only after the subgraph is deployed, so the router never plans against fields that do not exist yet.

## Router Configuration (Apollo Router example)

```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000
  introspection: false
cors:
  policy:
    origins: ["https://app.example.com"]
headers:
  all:
    request:
      - propagate: { named: authorization }
      - propagate: { named: x-request-id }
limits:
  max_depth: 15
  max_height: 200
  max_aliases: 30
  max_root_fields: 20
  http_max_request_bytes: 2000000
traffic_shaping:
  router:
    timeout: 30s
  all:
    timeout: 10s
persisted_queries:
  enabled: true
  safelist:
    enabled: true
    require_id: true
health_check:
  listen: 0.0.0.0:8088
  enabled: true
```

Verify option names against the router version you run; router configuration evolves between minor releases.

## Gateway Placement

```
client → edge gateway / WAF (TLS, coarse rate limit, auth)
       → GraphQL router (operation limits, query planning, header propagation)
       → subgraphs (field-level authorization)
```

- Keep the edge gateway for TLS, IP rules, and request size limits; GraphQL-aware controls belong in the router.
- Subgraphs must not be reachable from the internet; restrict with network policy or mTLS, since they expose `_entities`, which can bypass router-level checks.

## Protecting the Graph

| Control | Why |
|---------|-----|
| Persisted queries / safelist | Only pre-registered operations run; blocks arbitrary expensive queries |
| Depth, alias, root-field limits | Stops deeply nested or batched abuse |
| Cost/complexity analysis | Rate limit by computed cost, not by request count |
| Introspection off in production | Reduces schema discovery for attackers (not a security boundary) |
| Field-level authorization | Enforce in subgraphs or via `@authenticated`/`@requiresScopes` where supported |
| Timeouts per subgraph | One slow subgraph should not hold router workers |

## Caching

- HTTP caching is limited because most operations are `POST`; persisted queries allow `GET` with an operation ID and enable CDN caching for public data.
- Entity caching in the router (where supported) or per-subgraph response caching with `@cacheControl` hints.
- Never cache responses that depend on the `Authorization` header without including the user in the key.

## Observability

- Trace each operation with OpenTelemetry: router span → one span per subgraph fetch; propagate `traceparent` to subgraphs.
- Record operation name, client name/version, and error codes as attributes; reject anonymous operations in production to keep metrics meaningful.
- Track query plan cache hit rate; cache misses on every request indicate non-persisted, ad hoc operations.

## Pitfalls

- Treating federation as a free performance win: query plans add network hops; deep entity chains multiply latency.
- Two subgraphs defining the same field without `@shareable` → composition error, or with it but inconsistent data.
- Forgetting header propagation rules, so subgraphs cannot see auth context.
- Exposing subgraph endpoints publicly.

## Checklist

- [ ] Composition and breaking-change checks gate every subgraph change
- [ ] Persisted queries with safelist for first-party clients
- [ ] Depth, alias, size, and timeout limits configured
- [ ] Subgraphs private; auth context propagated explicitly
- [ ] Entity resolvers batched
- [ ] Per-operation tracing and client identification
