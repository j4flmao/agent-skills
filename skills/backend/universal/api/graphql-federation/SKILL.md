---
name: api-graphql-federation
description: >
  Use this skill when the user says 'graphql federation', 'apollo federation', 'supergraph', 'subgraph', 'schema composition', '@key directive', '@requires', '@shareable', 'apollo router', 'rover compose', 'federate graphql across teams'. Designs and implements Apollo Federation 2 supergraphs: subgraph boundaries, entity keys and resolution, composition and schema checks in CI, and router configuration for security, limits and telemetry. Do NOT use for: single-service GraphQL schema design (backend-graphql-patterns), resolver N+1 and query-cost tuning inside one server (backend-graphql-optimization), REST API gateways (backend api-gateway skills).
version: "2.1.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [api, graphql, federation, apollo-router, supergraph]
---

# GraphQL Federation

## Purpose
Compose multiple team-owned GraphQL services (subgraphs) into one supergraph served by a router, so each team ships its part of the graph independently. The skill covers where to draw subgraph boundaries, how entities are shared and resolved, how composition is validated, and how to configure the router safely.

## Agent Protocol

### Trigger
Exact user phrases: "graphql federation", "apollo federation", "supergraph", "subgraph", "schema composition", "@key directive", "@requires", "@shareable", "apollo router", "rover compose", "federate graphql across teams".

### Input Context
- Domains/teams and which data each owns.
- Existing GraphQL servers and libraries (Apollo Server + `@apollo/subgraph`, GraphQL Yoga, Strawberry, gqlgen, DGS, Hot Chocolate).
- Managed (GraphOS) or self-hosted composition; router choice (Apollo Router, or alternatives such as Hive Gateway / Cosmo Router).
- Auth model and latency budget.

### Output Artifact
Subgraph schemas with federation directives, entity resolvers, `supergraph.yaml`, CI check commands, and `router.yaml`. No files unless requested.

### Response Format
```
Subgraphs: {name -> owner team, owned types}
Entities: {Type @key(fields) -> origin subgraph, contributing subgraphs}
Cross-subgraph fields: {field @requires/@provides}
Composition: {rover supergraph compose | GraphOS managed} + check in CI
Router: auth {jwt}, limits {depth/aliases}, demand control {mode}, timeouts {per subgraph}
```

## When Federation Fits

| Situation | Recommendation |
|---|---|
| One team, one service | Single GraphQL server; federation adds a router hop and composition overhead |
| Several teams, distinct domains, all GraphQL-capable | Federation |
| Mostly REST/gRPC backends owned by others | Wrap them (GraphQL Mesh, Apollo Connectors, or a BFF subgraph) and compose |
| Strong need for cross-domain transactions in one mutation | Fix domain boundaries first; federation does not provide transactions |

Boundary rule: a subgraph per bounded context/team, not per database table. Many tiny subgraphs multiply query-plan fetches.

## Subgraph Schemas (Federation 2)

Every Federation 2 subgraph opts in with `@link` and imports the directives it uses.

```graphql
# accounts subgraph (origin of User)
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.7", import: ["@key", "@shareable"])

type User @key(fields: "id") {
  id: ID!
  name: String!
  email: String!
}

type Query {
  me: User
}
```

```graphql
# orders subgraph contributes User.orders
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.7", import: ["@key"])

type User @key(fields: "id") {
  id: ID!
  orders(first: Int = 20): [Order!]!
}

type Order @key(fields: "id") {
  id: ID!
  totalCents: Int!
  status: OrderStatus!
}

enum OrderStatus { PENDING PAID SHIPPED CANCELLED }
```

In Federation 2, `extend type` / `@extends` is not needed to contribute fields to an entity; key fields are shareable automatically. Non-key fields defined in more than one subgraph must be marked `@shareable` (or one definition `@external`).

## Directives

| Directive | Meaning |
|---|---|
| `@key(fields: "id")` | Declares an entity and the fields the router uses to reference it. Multiple keys allowed; `resolvable: false` for reference-only stubs |
| `@shareable` | Field (or type) may be resolved by more than one subgraph |
| `@external` | Field is defined elsewhere; used together with `@requires` or `@provides` |
| `@requires(fields: "weight")` | This field needs other subgraphs' fields; the router fetches them first and passes them in the representation |
| `@provides(fields: "name")` | On a field returning an entity: this subgraph can return those (`@external`) fields at this path, saving a fetch |
| `@override(from: "old")` | Moves a field's ownership to this subgraph (incremental migration; progressive `label` supported) |
| `@inaccessible` | Hides a field/type from the public API schema while still usable for composition |
| `@interfaceObject` | Lets a subgraph add fields to all implementations of an entity interface |
| `@composeDirective` | Preserves a custom directive in the supergraph |

`@requires` example:

```graphql
# shipping subgraph
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.7", import: ["@key", "@external", "@requires"])

type Product @key(fields: "id") {
  id: ID!
  weightGrams: Int @external
  shippingCostCents: Int @requires(fields: "weightGrams")
}
```

## Entity Resolution

The router asks a subgraph for entities through the `_entities(representations: [_Any!]!)` field. Each representation contains `__typename`, the key fields, and any `@requires` fields. The subgraph resolves them in `__resolveReference`; batch with DataLoader because one `_entities` call can carry many representations.

```ts
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import DataLoader from 'dataloader';
import { parse } from 'graphql';
import { readFileSync } from 'node:fs';
import { usersRepo, type User } from './users-repo';

const typeDefs = parse(readFileSync('./accounts.graphql', 'utf8'));

type Ctx = { userById: DataLoader<string, User | null> };

const resolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: Ctx & { userId?: string }) =>
      ctx.userId ? ctx.userById.load(ctx.userId) : null,
  },
  User: {
    __resolveReference: (ref: { id: string }, ctx: Ctx) => ctx.userById.load(ref.id),
  },
};

const server = new ApolloServer({ schema: buildSubgraphSchema({ typeDefs, resolvers }) });

await startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({
    userId: req.headers['x-user-id'] as string | undefined, // set only by trusted router
    userById: new DataLoader<string, User | null>(async (ids) => {
      const rows = await usersRepo.findByIds([...ids]);
      const byId = new Map(rows.map((u) => [u.id, u]));
      return ids.map((id) => byId.get(id) ?? null);
    }),
  }),
});
```

## Composition and Schema Checks

```yaml
# supergraph.yaml (local composition with Rover)
federation_version: =2.7.0
subgraphs:
  accounts:
    routing_url: http://accounts:4001/graphql
    schema:
      file: ./schemas/accounts.graphql
  orders:
    routing_url: http://orders:4002/graphql
    schema:
      file: ./schemas/orders.graphql
```

```bash
rover supergraph compose --config ./supergraph.yaml --output supergraph.graphql

# With GraphOS: check against real client traffic before merge, publish after deploy
rover subgraph check  my-graph@prod --name accounts --schema ./schemas/accounts.graphql
rover subgraph publish my-graph@prod --name accounts --schema ./schemas/accounts.graphql \
  --routing-url http://accounts:4001/graphql
```

Without GraphOS, run composition in CI on every subgraph PR and use a schema-diff tool (e.g. GraphQL Inspector) for breaking-change detection.

Common composition failures: a non-key field defined in two subgraphs without `@shareable`; `@requires`/`@provides` referencing fields not marked `@external`; inconsistent enum or field types across subgraphs; `@key` fields that do not exist on the type.

## Router Configuration (Apollo Router)

```yaml
# router.yaml
supergraph:
  listen: 0.0.0.0:4000
  introspection: false

health_check:
  listen: 0.0.0.0:8088
  enabled: true            # GET /health

authentication:
  router:
    jwt:
      jwks:
        - url: https://auth.example.com/.well-known/jwks.json

headers:
  all:
    request:
      - propagate:
          named: authorization   # subgraphs re-verify or trust the router network

limits:
  max_depth: 15
  max_aliases: 30
  max_root_fields: 20

demand_control:
  enabled: true
  mode: measure              # observe costs first, then switch to enforce
  strategy:
    static_estimated:
      list_size: 50
      max: 5000

traffic_shaping:
  router:
    global_rate_limit:
      capacity: 1000
      interval: 1s
  all:
    timeout: 10s
  subgraphs:
    accounts:
      timeout: 3s

telemetry:
  exporters:
    tracing:
      common:
        sampler: 0.1
      otlp:
        enabled: true
        endpoint: http://otel-collector:4317
        protocol: grpc
```

Notes:
- Supply the supergraph with `--supergraph supergraph.graphql` and `--hot-reload` (self-hosted), or via `APOLLO_KEY` + `APOLLO_GRAPH_REF` for managed federation, which delivers new supergraphs without restarts.
- Some features (e.g. `@authenticated`/`@requiresScopes` authorization directives, demand control, some telemetry) require a GraphOS plan; confirm licensing before relying on them.
- Subgraphs must not be reachable directly from the internet: `_entities` lets callers fetch any entity by key, bypassing router-level checks.

## Performance
- Minimize sequential fetches: each entity hop in the query plan adds a round trip. Look at query plans for hot operations.
- Batch `__resolveReference` with DataLoader.
- Use `@provides` when a subgraph already has denormalized data for a nested entity.
- Set per-subgraph timeouts below the router timeout; return partial data with errors for non-critical subgraphs (nullable fields help).

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Subgraph per table/microservice with chatty entity hops | Subgraph per domain/team |
| Exposing subgraphs publicly | Network policy: router-only access |
| Trusting `x-user-id` headers from any caller | Router injects, subgraphs only reachable from router, or verify JWT in subgraphs |
| Breaking changes merged without composition/check | Compose + check in CI as a required status |
| Shared "common" subgraph that every team edits | Clear ownership; use `@shareable` value types sparingly |

## Checklist
- [ ] Subgraph ownership and entity origins documented.
- [ ] All subgraphs on Federation 2 `@link` with explicit imports.
- [ ] Entity resolvers batched; `_entities` not publicly reachable.
- [ ] Composition and breaking-change checks block merges.
- [ ] Router: JWT auth, introspection off in prod, depth/alias limits, demand control measured then enforced, per-subgraph timeouts.
- [ ] Tracing across router and subgraphs with W3C trace context.

## References
- [Federation fundamentals](references/graphql-federation-fundamentals.md)
- [Federation architecture](references/federation-architecture.md)
- [Entity resolution](references/entity-resolution.md)
- [Supergraph composition](references/supergraph-composition.md)
- [Supergraph/router config](references/supergraph-config.md)
- [Federation security](references/federation-security.md)
- [Federation performance](references/federation-performance.md)
- [Federation cost management](references/federation-cost-management.md)
- [Federated tracing](references/federated-tracing.md)
- [Federation testing](references/federation-testing.md)
- [Federation deployment](references/federation-deployment.md)
- [Federation vs Mesh](references/federation-vs-mesh.md)
- [Migrating a monolith to federation](references/federation-migration-monolith.md)
- [Federation advanced](references/graphql-federation-advanced.md)

Note: reference files may contain router configuration from older Router versions; verify keys against the current Apollo Router configuration reference.
