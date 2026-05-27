---
name: backend-api-design
description: >
  Use this skill when the user says 'API design', 'REST API', 'GraphQL schema', 'endpoint design', 'API conventions', 'URL structure', 'HTTP methods', 'response format', 'API versioning', 'pagination', or when designing new API endpoints. This skill enforces consistent REST or GraphQL conventions: plural nouns, kebab-case URLs, consistent response envelopes, versioned endpoints, paginated lists, and structured error responses. Applies to any backend stack. Do NOT use for: database schema design, frontend data fetching, or authentication implementation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, api, phase-2, universal]
---

# Backend API Design

## Purpose
Design consistent, production-grade REST or GraphQL APIs. Every endpoint must follow the same conventions for URLs, requests, responses, errors, and pagination.

## Agent Protocol

### Trigger
Exact user phrases: "API design", "REST API", "GraphQL schema", "endpoint design", "API conventions", "URL structure", "HTTP methods", "response format", "API versioning", "pagination", "design an endpoint", "API contract".

### Input Context
Before activating, verify:
- The resource or feature being designed is known.
- The tech-spec for the feature exists or the user has described the resource.
- The chosen API style (REST/GraphQL) is known. If not, ask: "REST or GraphQL?"

### Output Artifact
No file output unless the user requests it. Produces endpoint specifications as text.

### Response Format
For each endpoint:
```
{method} {path}
Auth: {required/optional/none}
Request: {schema reference}
Response 2xx: {schema reference}
Errors: {list of error codes}
```

For a full API design, group by resource:
```
## {resource}
{list of endpoints}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations of REST principles.

### Completion Criteria
- [ ] All resources follow the naming conventions below.
- [ ] Every endpoint has: method, path, auth requirement, request schema, response schema, error codes.
- [ ] List endpoints are paginated.
- [ ] Response envelope is consistent across all endpoints.
- [ ] Error responses follow the standard format.
- [ ] No verbs in URL paths.

### Max Response Length
Per endpoint: 6 lines. Per resource: unlimited.

## Workflow

### Step 1: Choose API Style
REST: default for CRUD-heavy services with clear resources.
GraphQL: when clients need flexible data shapes or multiple resources in one request.

### Step 2: Design REST Resources
```
GET    /v1/{resources}              -> list (paginated)
GET    /v1/{resources}/{id}         -> single
POST   /v1/{resources}              -> create
PUT    /v1/{resources}/{id}         -> full replace
PATCH  /v1/{resources}/{id}         -> partial update
DELETE /v1/{resources}/{id}         -> delete

// Sub-resources
GET    /v1/{parents}/{parentId}/{children}

// Actions (when CRUD does not fit)
POST   /v1/{resources}/{id}/{action}
Example: POST /v1/orders/{id}/cancel

// Search
POST   /v1/{resources}/search
```

### Step 3: Naming Rules
- Plural nouns: /users, /orders, /products. Never singular: /user.
- kebab-case for multi-word: /order-items, /shipping-addresses.
- No verbs in CRUD paths: /users not /getUsers.
- Query parameters for filtering: ?status=active&sort=-createdAt.
- Version prefix: /v1/, /v2/. Never remove a version once released.

### Step 4: Response Envelope
Every response uses this exact structure:
```json
{
  "data": { "id": "uuid", ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-05-14T10:30:00Z"
  },
  "error": null
}
```

Error case:
```json
{
  "data": null,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with id abc-123 not found",
    "details": [
      { "field": "id", "reason": "not_found", "message": "No user matches this id" }
    ]
  }
}
```

### Step 5: Pagination
Every list endpoint uses cursor or offset pagination:
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "requestId": "uuid"
  }
}
```

### Step 6: Error Codes
| HTTP Status | Error Code | When |
|-------------|------------|------|
| 400 | VALIDATION_ERROR | Input validation failed |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Authenticated but no permission |
| 404 | NOT_FOUND | Resource does not exist |
| 409 | CONFLICT | State conflict (duplicate, stale version) |
| 422 | UNPROCESSABLE_ENTITY | Semantic validation failure |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error |

## Rules
- Always paginate list endpoints. Never return unbounded arrays.
- Error codes are UPPER_SNAKE_CASE strings, not HTTP status descriptions.
- Never expose internal IDs (auto-increment integers) in URLs or responses. Use UUIDs or slugs.
- Deprecate endpoints, do not delete them. Use Deprecation header.
- Response envelope is consistent in ALL cases — success and error. data is null when error is present.
- Every response includes requestId for tracing.
- If the API grows beyond 20 endpoints, consider splitting into separate services.

## References
  - references/api-design-documentation.md — API Design Documentation
  - references/api-design-security.md — API Design Security
  - references/api-error-handling.md — API Error Handling
  - references/api-pagination-filtering.md — API Pagination and Filtering
  - references/graphql-conventions.md — GraphQL Conventions
  - references/rest-conventions.md — REST API Conventions
## Handoff
No artifact produced unless requested.
Next skill: backend-database-patterns — design the data layer for these APIs.
Carry forward: API contracts, resource definitions, auth requirements, pagination strategy.
