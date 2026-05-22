---
name: backend-graphql-patterns
description: >
  Use this skill when designing GraphQL schemas, resolvers, or data loading strategies. This skill enforces: schema-first design, N+1 prevention via DataLoader, directive-based auth, cursor-based pagination, and structured error handling. Applies to any backend stack with GraphQL. Do NOT use for: REST API design, gRPC service definition, or internal-only RPC endpoints.
version: "1.0.0"
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

## Workflow

### Step 1: Schema-First Design
Write the SDL before resolvers. Enforce naming conventions: PascalCase for types, camelCase for fields, UPPER_SNAKE_CASE for enums. All list fields are non-null (`[Type]!`) with non-null items (`[Type!]!`). Input types end with `Input`, payload types end with `Payload`. Every type gets a `id: ID!` field.

### Step 2: Query Design
Use cursor-based pagination with the Relay connection pattern: `first`/`after`/`last`/`before` arguments, `edges { node { ... } cursor }`, `pageInfo { hasNextPage hasPreviousPage startCursor endCursor }`. Filtering via `where` input object, sorting via `orderBy` enum. Limit max page size to 100.

### Step 3: Mutation Design
Follow the input → payload pattern. Every mutation accepts a single `input: { clientMutationId: String, ...fields }` argument and returns a `Payload` type with `{ clientMutationId: String, error: ErrorUnion, ...resultFields }`. Prefer idempotent mutations with `idempotencyKey` in input. Batch mutations into single request where possible.

### Step 4: DataLoader Pattern
Create one DataLoader per data source per request lifecycle. Batch function receives array of keys, returns array of values in same order. Cache per request — never across requests. Use `dataloader` library (JS) or `DataLoader` (Java/C#). Place DataLoader instantiation in request context factory. Handle partial failures: map null for missing keys.

### Step 5: Auth and Authorization
Use `@auth` directive for authentication requirement. Use `@hasRole(roles: ["ADMIN"])` for role-based access. Use `@hasScope(scopes: ["read:users"])` for scope-based access. Implement field-level auth via middleware wrapping resolver. Query complexity limits: max 1000 points per query, depth limit 7. Rate limit per user/IP: 1000 queries per minute for reads, 100 mutations per minute for writes.

### Step 6: Error Handling
Return errors in `errors` array with `extensions.code` for machine-readable error codes, `extensions.errors` for field-level validation errors. Use union types for expected errors (e.g., `UserNotFoundError`, `UnauthorizedError`). Partial success: return both `payload` and `error` in mutation response. Log all unexpected errors with trace ID.

## Rules
- Schema is the contract — version it, never break clients
- Every query has complexity limit — set at gateway level
- DataLoader per-request, never shared across requests
- Mutations return `{ clientMutationId, error, ...payload }`
- Pagination is cursor-based, never offset-based
- Subscriptions use pub/sub, authenticate on connect

## References
- `references/graphql-schema-design.md` — Naming conventions, type design, nullability rules, SDL patterns
- `references/apollo-federation.md` — Federation directives, gateway configuration, entity resolution

## Handoff
`backend-api-design` for REST-GraphQL coexistence strategy
