---
name: backend-graphql-patterns
description: >
  Use this skill when designing GraphQL schemas, resolvers, or data loading strategies. This skill enforces: schema-first design, N+1 prevention via DataLoader, directive-based auth, cursor-based pagination, and structured error handling. Applies to any backend stack with GraphQL. Do NOT use for: REST API design, gRPC service definition, or internal-only RPC endpoints.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, graphql, phase-6, universal]
---

# Backend GraphQL Patterns

## Purpose
Design production GraphQL schemas with resolvers, DataLoader batching, and auth.

## Agent Protocol

### Trigger
Exact user phrases: "GraphQL", "schema", "resolver", "query", "mutation", "subscription", "Apollo", "Relay", "GraphQL federation", "GraphQL gateway", "data loader", "N+1 GraphQL", "GraphQL authorization", "GraphQL pagination", "GQL schema design", "GraphQL error handling".

### Input Context
Before activating, verify:
- Schema size (number of types, depth of nesting)
- Data sources (primary database, REST APIs, gRPC services, external APIs)
- Authentication and authorization model (RBAC, ABAC, claims-based)
- Client types consuming the API (web SPA, mobile native, third-party, internal services)

### Output Artifact
GraphQL schema design with resolver patterns and DataLoader setup as formatted text.

### Response Format
```graphql
# Schema types, queries, mutations
```
```typescript
// DataLoader setup
// Resolver patterns
// Auth directive definitions
```
```yaml
# Query complexity limits
# Rate limiting rules
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Schema defined with types, queries, mutations, subscriptions
- [ ] N+1 query prevention via DataLoader batching
- [ ] Auth directives (@auth, @hasRole) applied to schema
- [ ] Pagination implemented as cursor-based (Relay edges/node pattern)
- [ ] Error handling with typed error codes and partial success
- [ ] Query complexity limits and rate limiting configured

### Max Response Length
300 lines of schema + resolver code, 50 lines of configuration.

## Decision Tree

### When to Use GraphQL?

```
What is the primary API consumer?
  ├── Multiple client types (web, mobile, third-party), different data needs
  │   └── GraphQL — clients control data shape, reduces over/under-fetching
  ├── Single client, well-defined views
  │   └── REST — simpler, cacheable, tooling maturity
  ├── Internal service-to-service communication
  │   └── gRPC — typed contracts, streaming, higher performance
  └── Public API for third-party developers
      └── REST with OpenAPI — industry standard, broad tooling support
```

### Schema Federation vs Single Schema?

```
How many teams/service own the graph?
  ├── One team, one service → Single schema (Apollo Server, Yoga)
  ├── Multiple teams, each owns domain → Federation (Apollo Federation)
  ├── Multiple services, no shared graph → Schema stitching (legacy) or Federation
  └── One team but multiple data sources → Single schema with resolvers delegating to services
```

### DataLoader vs Direct Query?

```
How is the related data accessed?
  ├── Same database → DataLoader batch function queries with WHERE ... IN (...)
  ├── Different database/service → DataLoader batch function calls each service
  ├── Always accessed together → Eager loading via SQL JOIN (more efficient than DataLoader)
  └── Rarely accessed → DataLoader with individual fetches (cache hit rate matters)
```

## Schema Design

### Naming Conventions
Types are PascalCase (`UserProfile`, `OrderItem`). Fields and arguments are camelCase (`firstName`, `createdAt`). Enums are UPPER_SNAKE_CASE (`ORDER_STATUS_PENDING`, `ROLE_ADMIN`). Input types end with `Input` (`CreateUserInput`). Payload types end with `Payload` (`CreateUserPayload`). Union members describe the error (`NotFoundError`, `UnauthorizedError`). All list fields are non-null (`[Type]!`) with non-null items (`[Type!]!`). Every type gets an `id: ID!` field.

### Type System Design
Define types based on domain entities, not database tables. Each type represents a concept in the business domain. Use interfaces for shared fields across types (e.g., `Node` interface with `id: ID!`). Use unions for heterogeneous return types (e.g., search results that can be users, posts, or comments). Use enums for fields with a fixed set of values. Use scalars for custom validation (e.g., `DateTime`, `Email`, `URL`).

### Query Design
Root query fields represent entry points into the data graph. One query field per root entity type. Arguments for filtering, sorting, and pagination on list queries. Use the Relay connection pattern for all list fields. Avoid deeply nested queries by designing the schema to flatten common access patterns. Document every query field with a description that explains what it returns and any side effects.

### Mutation Design
Every mutation accepts a single `input` argument and returns a `Payload` type. The input type includes a `clientMutationId: String` field for idempotency. The payload type includes `clientMutationId: String`, an optional `error` field, and the mutation result. Mutations are named as actions: `createUser`, `updateOrder`, `deleteProduct`. Prefer idempotent mutations with an `idempotencyKey` in the input. Batch mutations into a single request using a mutation root field that accepts an array of inputs.

### Subscription Design
Subscriptions use a pub/sub pattern. The client subscribes to an event topic and receives real-time updates when events are published. Subscription fields return a single event payload each time an event occurs. Authenticate the subscription connection, not individual events. Use a filter argument to allow clients to subscribe to specific subsets of events. Implement subscriptions over WebSocket for bidirectional communication or SSE for server-to-client only.

## Resolver Patterns

### Resolver Architecture
Each resolver is a function that returns data for a specific field. Resolvers can be async, throw errors, or return promises. The resolver receives four arguments: `parent` (the result of the parent resolver), `args` (the field arguments), `context` (shared across all resolvers in a request), and `info` (query execution information). Resolvers should be thin — they delegate to service layer functions and never contain business logic. Use resolver middleware for cross-cutting concerns like authentication, authorization, logging, and error handling.

### DataLoader Batching
Create one DataLoader per data source per request lifecycle. The batch function receives an array of keys and returns an array of values in the same order. Cache per request — never across requests. Use the `dataloader` library (JS/TS) or equivalent in other languages. Place DataLoader instantiation in the request context factory so it is available to all resolvers. Handle partial failures by mapping null for missing keys in the correct position.

```typescript
// DataLoader setup — per request
function createLoaders(db: Database) {
  return {
    userLoader: new DataLoader<string, User>(async (ids) => {
      const users = await db.user.findMany({ where: { id: { in: ids } } });
      return ids.map(id => users.find(u => u.id === id) ?? null);
    }),
    orderLoader: new DataLoader<string, Order[]>(async (userIds) => {
      const orders = await db.order.findMany({ where: { userId: { in: userIds } } });
      return userIds.map(id => orders.filter(o => o.userId === id));
    }),
  };
}
```

### Caching Strategy
DataLoader provides per-request caching automatically. For cross-request caching, use a distributed cache (Redis, Memcached) in the DataLoader batch function. Cache keys include the entity type and ID. Set appropriate TTLs based on data volatility. Invalidate cache entries when mutations modify data. Use cache tags for group invalidation.

### N+1 Prevention
The N+1 problem occurs when a resolver fetches a list of N items and then makes N additional queries to fetch related data for each item. DataLoader prevents this by batching all requests for the same data type into a single query. Always use DataLoader for any field that resolves related data from a different data source (database, REST API, or another GraphQL service). Profile resolver performance with Apollo Tracing or OpenTelemetry to detect N+1 queries in production.

## Authorization

### Field-Level Authorization
Use a custom directive `@auth` to mark fields that require authentication. Use `@hasRole(roles: ["ADMIN"])` for role-based access control. Use `@hasScope(scopes: ["read:users"])` for scope-based access control. Implement field-level auth via resolver middleware that wraps the resolver function. At the field level, authorization can return null (hide the field) or throw an authorization error.

### Directive-Based Authorization
Define schema directives for authorization:
```graphql
directive @auth on FIELD_DEFINITION
directive @hasRole(roles: [String!]!) on FIELD_DEFINITION
directive @hasScope(scopes: [String!]!) on FIELD_DEFINITION
```
The directive implementation checks the current user's roles/scopes against the required values before executing the resolver. If authorization fails, the directive returns an authorization error.

### Query Complexity Limits
Set complexity limits at the gateway level. Each field has a complexity cost. Simple field access costs 1 point. List fields cost `1 + childCost * pageSize`. Deeply nested queries cost exponentially more. Max 1000 points per query. Depth limit of 7 levels. Rate limit per user/IP: 1000 queries per minute for reads, 100 mutations per minute for writes.

## Federation

### Apollo Federation Directives
Federation allows composing a single graph from multiple subgraphs. `@key(fields: "id")` defines the primary key on an entity for cross-subgraph resolution. `@extends` marks a type that extends an entity defined in another subgraph. `@external` marks a field defined in another subgraph. `@provides(fields: "name")` indicates the subgraph can resolve the field without querying another subgraph. `@requires(fields: "price")` indicates the subgraph needs the specified fields from another subgraph.

### Entity Resolution
Each subgraph defines entities using `@key`. The subgraph implements `__resolveReference` to resolve an entity by its key fields. The gateway uses `__resolveReference` to fetch entity data from the owning subgraph. Entity references flow through query plans automatically. Subgraphs are independently deployable as long as the supergraph schema is validated.

### Federation Gateway Configuration
The gateway fetches the supergraph schema from Apollo Uplink, a managed federation service, or a local supergraph file. The gateway creates query plans that distribute sub-queries to the appropriate subgraphs. Query plans are cached and reused for identical operations. Gateway supports request retries, timeouts, and circuit breakers per subgraph.

## Subscriptions

### WebSocket Implementation
Use the `graphql-ws` library for WebSocket-based subscriptions. The server maintains a pub/sub system (in-memory for single instance, Redis pub/sub for multi-instance). Each subscription creates a pub/sub listener. When the client disconnects, the listener is cleaned up. Authentication happens at the WebSocket connection level using the connection params.

### SSE Implementation
For server-to-server communication or when WebSocket is not available, use Server-Sent Events (SSE). The client sends a POST request to subscribe and receives events as a stream. SSE is simpler than WebSocket but only supports server-to-client communication. Use the `@graphql-yoga/plugin-sse` or implement SSE manually with ReadableStream.

## Pagination

### Cursor-Based Pagination
Use the Relay connection pattern for all list fields. Arguments: `first`, `after`, `last`, `before`. Return type: `Connection` type with `edges` (array of `Edge` types) and `pageInfo` (hasNextPage, hasPreviousPage, startCursor, endCursor). Each `Edge` has a `node` (the actual data) and a `cursor` (opaque string for pagination). Cursors are base64-encoded values (typically the encoded ID or creation timestamp + ID). Max page size: 100 items. Default page size: 20 items.

## Error Handling

### Error Response Format
Return errors in the `errors` array with `extensions.code` for machine-readable error codes. Use `extensions.errors` for field-level validation errors. Use union types for expected errors (e.g., `UserNotFoundError`, `UnauthorizedError`). Partial success: return both `payload` and `error` in mutation response. Log all unexpected errors with a trace ID.

### Typed Error Unions
```graphql
union CreateUserError = EmailTakenError | ValidationError | RateLimitError

type CreateUserPayload {
  clientMutationId: String
  error: CreateUserError
  user: User
}
```
The client checks for the `error` field first. If present, handle the error. If absent, the `user` field contains the result.

## Resolver Implementation Patterns

### Query Resolver Pattern
```typescript
const resolvers = {
  Query: {
    user: async (_, { id }, { dataLoaders, auth }) => {
      auth.requireAuthentication();
      return dataLoaders.userLoader.load(id);
    },
    users: async (_, { first, after, filter, orderBy }, { dataLoaders }) => {
      return dataLoaders.userConnectionLoader.load({ first, after, filter, orderBy });
    },
  },
};
```

### Mutation Resolver Pattern
```typescript
const resolvers = {
  Mutation: {
    createUser: async (_, { input }, { dataLoaders, auth, services }) => {
      const user = await services.userService.create(input);
      dataLoaders.userLoader.clear(user.id); // invalidate cache
      return { clientMutationId: input.clientMutationId, user };
    },
  },
};
```

### Subscription Resolver Pattern
```typescript
const resolvers = {
  Subscription: {
    orderCreated: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator('ORDER_CREATED'),
        (payload, variables) => !variables.userId || payload.orderCreated.userId === variables.userId,
      ),
    },
  },
};
```

## Common Schema Patterns

### Pagination Arguments Pattern
All query fields returning lists use the same pagination argument pattern:
```graphql
interface Connection {
  edges: [Edge!]!
  pageInfo: PageInfo!
}

interface Edge {
  node: Node!
  cursor: String!
}
```

### Filter Input Pattern
Filter inputs use a consistent structure with AND, OR, and field-specific operators:
```graphql
input UserFilter {
  AND: [UserFilter!]
  OR: [UserFilter!]
  name: StringFilter
  email: StringFilter
  createdAt: DateFilter
}

input StringFilter {
  eq: String
  contains: String
  startsWith: String
  in: [String!]
}
```

### Sort Input Pattern
Sort inputs use a reusable enum pattern:
```graphql
input UserOrderBy {
  field: UserSortField!
  direction: SortDirection!
}

enum UserSortField { NAME EMAIL CREATED_AT }
enum SortDirection { ASC DESC }
```

### Error Union Pattern
Expected errors use union types with a standardized interface:
```graphql
interface Error {
  message: String!
  code: String!
}

type NotFoundError implements Error {
  message: String!
  code: String!
  resourceId: String!
}

type ValidationError implements Error {
  message: String!
  code: String!
  fields: [FieldError!]!
}

type FieldError {
  field: String!
  message: String!
  code: String!
}
```

## Performance Optimization Patterns

### Resolver Batching
Batch multiple DataLoader loads into a single database query. When a resolver needs data from multiple sources, the DataLoader batch function can query all sources in parallel using Promise.all or equivalent.

### Query Complexity Budgeting
Allocate complexity points per field based on data source access cost. Fields resolved from the same database call cost 1 point. Fields resolved from external API calls cost 5+ points. List fields cost `1 + childCost * expectedPageSize`. Set a per-query budget of 1000 points and reject queries that exceed it.

```typescript
// Apollo Server — query complexity plugin
const complexityPlugin = {
  async requestDidStart() {
    return {
      async responseForOperation(ctx) {
        const complexity = estimateComplexity({
          schema: ctx.schema,
          query: ctx.request.query,
          variables: ctx.request.variables,
        });
        if (complexity > 1000) {
          return { errors: [{ message: 'Query too complex', extensions: { code: 'COMPLEXITY_LIMIT', complexity } }] };
        }
      },
    };
  },
};
```

### Response Caching
Use Apollo cache hints to set cache policies per type and field. `@cacheControl(maxAge: 60, scope: PUBLIC)` on types enables CDN caching. Per-request DataLoader caching prevents duplicate data fetches within the same query. For cross-request caching, use Redis in the DataLoader batch function.

### Persisted Queries
Register common queries by hash to reduce request size and prevent arbitrary query execution. The client sends a hash instead of the full query string. The server looks up the query by hash. Persisted queries are whitelisted through CI/CD and cannot contain arbitrary operations.

```typescript
// Persisted queries setup (Apollo)
const persistedQueries = new Map([
  ['hash1', 'query GetUser($id: ID!) { user(id: $id) { name email } }'],
  ['hash2', 'query GetOrders { orders { id total status } }'],
]);

app.use('/graphql', (req, res, next) => {
  if (req.body.extensions?.persistedQuery) {
    const { sha256Hash } = req.body.extensions.persistedQuery;
    req.body.query = persistedQueries.get(sha256Hash) || req.body.query;
  }
  next();
});
```

## Rules
- Schema is the contract — version it, never break clients
- Every query has complexity limit — set at gateway level
- DataLoader per-request, never shared across requests
- Mutations return `{ clientMutationId, error, ...payload }`
- Pagination is cursor-based, never offset-based
- Subscriptions use pub/sub, authenticate on connect
- Persisted queries for production, full queries for development
- Complexity budget: max 1000 points per query
- Depth limit: max 7 levels of nesting
- Rate limit: 1000 reads/min/user, 100 writes/min/user
- Always use DataLoader for relation fields to prevent N+1
- Never expose internal DB fields directly in the schema
- All nullable fields should return null instead of throwing for missing data

## References
  - references/federation-subscriptions.md — Federation and Subscriptions
  - references/graphql-federation.md — GraphQL Federation
  - references/graphql-migration.md — GraphQL Migration
  - references/graphql-monitoring.md — GraphQL Monitoring
  - references/graphql-performance.md — GraphQL Performance
  - references/graphql-security.md — GraphQL Security
  - references/graphql-tooling.md — GraphQL Tooling and Code Generation
  - references/schema-resolvers.md — Schema and Resolvers
## Handoff
`backend-api-design` for REST-GraphQL coexistence strategy
