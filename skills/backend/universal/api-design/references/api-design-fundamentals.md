# API Design Fundamentals

## Core Design Principles

### Resource-Oriented Architecture
REST APIs model resources (nouns) and expose CRUD operations through HTTP methods. Every identifiable "thing" in the system — user, order, product, invoice — is a resource addressable by URI.

```
Resource = identifiable concept with a URI
Collection = group of resources of same type (/users)
Singleton = single resource (/users/abc123)
```

### Uniform Interface
The uniform interface constraint decouples clients from servers. Four sub-constraints:
1. **Identification of resources** — URIs identify resources, not operations
2. **Manipulation through representations** — Client modifies state via representations
3. **Self-descriptive messages** — Each message includes enough info to process it
4. **HATEOAS** — Hypermedia as the engine of application state (often optional in practice)

### Statelessness
Each request from a client contains all information needed to process it. No client context stored on the server between requests.

- Session state stored client-side (cookies, tokens)
- Every request authenticated independently
- No assumption about prior requests
- Improves visibility, reliability, and scalability

## HTTP Protocol Fundamentals

### HTTP Methods
| Method | Semantics | Idempotent | Safe | Request Body | Response Body |
|--------|-----------|------------|------|-------------|---------------|
| GET | Retrieve resource | Yes | Yes | No | Resource representation |
| POST | Create or action | No | No | Resource data | Created resource / action result |
| PUT | Full replace | Yes | No | Full resource data | Updated resource |
| PATCH | Partial update | No* | No | Partial resource data | Updated resource |
| DELETE | Remove resource | Yes | No | No | Usually 204 No Content |
| HEAD | Retrieve headers only | Yes | Yes | No | Headers only |
| OPTIONS | Discover allowed methods | Yes | Yes | No | Allow header |

\* PATCH can be made idempotent by including the full state of the changed fields.

### Idempotency Guarantees
- GET, HEAD, OPTIONS: always idempotent (no side effects)
- PUT, DELETE: idempotent by definition (same request = same result)
- POST: NOT idempotent (creates new resources)
- PATCH: NOT inherently idempotent (use conditional requests or content-type like JSON Merge Patch)

### HTTP Status Code Families
- **1xx (Informational)**: Request received, continuing (rarely used in APIs)
- **2xx (Success)**: Request received, understood, accepted
- **3xx (Redirection)**: Further action needed to complete request
- **4xx (Client Error)**: Request contains bad syntax or cannot be fulfilled
- **5xx (Server Error)**: Server failed to fulfill a valid request

### Common Status Codes
| Code | Name | When to Use |
|------|------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (new resource) |
| 204 | No Content | Successful DELETE |
| 304 | Not Modified | Conditional GET (ETag match) |
| 400 | Bad Request | Malformed syntax, validation failure |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but no permission |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | Wrong HTTP method for resource |
| 409 | Conflict | State conflict (duplicate, stale version) |
| 410 | Gone | Resource permanently removed |
| 415 | Unsupported Media Type | Wrong Content-Type |
| 422 | Unprocessable Entity | Semantic validation failure |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service failed |
| 503 | Service Unavailable | Temporarily overloaded or in maintenance |
| 504 | Gateway Timeout | Upstream service timed out |

## URL Design

### URL Components
```
https://api.example.com/v1/users/abc123?include=profile&fields=id,name
\___/  \____________/ \_/\___/\____/ \___________________________/
scheme     host       prefix version resource     query string
```

### Collection URLs
```
GET    /v1/{resources}                — List all
POST   /v1/{resources}                — Create new
GET    /v1/{resources}/{id}           — Get one
PUT    /v1/{resources}/{id}           — Replace
PATCH  /v1/{resources}/{id}           — Partial update
DELETE /v1/{resources}/{id}           — Delete
```

### Nested Resources
```
GET    /v1/{parent}/{parentId}/{child}           — List children
POST   /v1/{parent}/{parentId}/{child}           — Create child
GET    /v1/{parent}/{parentId}/{child}/{childId} — Get child
```

### Actions (Non-CRUD)
```
POST   /v1/{resource}/{id}/activate
POST   /v1/{resource}/{id}/cancel
POST   /v1/{resource}/{id}/resend
```

### Search Endpoints
```
GET    /v1/search?q={query}&type={resourceType}
POST   /v1/{resource}/search   (complex search payload)
```

## Resource Modeling

### Identifying Resources
Questions to determine if something is a resource:
1. Is it a noun in the domain language? (order, user, product)
2. Can it be uniquely identified? (has an ID)
3. Does it have a lifecycle? (created, updated, deleted)
4. Is it meaningful to clients independently?

### Aggregate Design
Group related resources under an aggregate root:
- Order -> OrderItems (order aggregates items)
- Customer -> CustomerAddresses (customer aggregates addresses)
- Invoice -> InvoiceLineItems (invoice aggregates line items)

Rules:
- Access sub-resources only through the aggregate root
- Aggregate root has its own lifecycle
- Sub-resources rarely exist without the root

### Resource Granularity
| Granularity | Example | Pros | Cons |
|-------------|---------|------|------|
| Coarse | `/v1/customer-dashboard` | Fewer requests | Over-fetching, coupling |
| Fine | `/v1/customer`, `/v1/orders`, `/v1/payments` | Flexible, reusable | More requests, composition needed |
| Mixed | REST resources + BFF composition | Balanced | Extra BFF layer to maintain |

## HTTP Headers

### Request Headers
| Header | Purpose | Example |
|--------|---------|---------|
| `Authorization` | Authentication credentials | `Bearer eyJhbGci...` |
| `Content-Type` | Request body format | `application/json` |
| `Accept` | Desired response format | `application/json` |
| `Idempotency-Key` | Idempotency guarantee | `uuid-v7` |
| `If-None-Match` | Conditional GET (ETag) | `"abc123"` |
| `If-Modified-Since` | Conditional GET (date) | `Wed, 21 Oct 2025 07:28:00 GMT` |
| `X-Request-Id` | Client-generated request ID | `uuid-v7` |
| `X-Api-Version` | API version (header strategy) | `2026-05-01` |

### Response Headers
| Header | Purpose | Example |
|--------|---------|---------|
| `Content-Type` | Response format | `application/json` |
| `ETag` | Resource version identifier | `"abc123"` |
| `Last-Modified` | Last modification timestamp | `Wed, 21 Oct 2025 07:28:00 GMT` |
| `Cache-Control` | Caching directives | `private, max-age=60` |
| `Location` | Created resource URL | `/v1/users/abc123` |
| `X-Request-Id` | Trace ID | `uuid-v7` |
| `X-RateLimit-Limit` | Rate limit quota | `100` |
| `X-RateLimit-Remaining` | Remaining requests | `42` |
| `Retry-After` | Seconds before retry | `120` |
| `Deprecation` | Endpoint is deprecated | `true` |
| `Sunset` | Endpoint removal date | `Sat, 30 Nov 2026 23:59:59 GMT` |

## Content Negotiation

### Server-Driven Negotiation
Client sends `Accept` header, server chooses representation:
```
Accept: application/json
Accept: application/xml
Accept: application/vnd.myapp.v2+json
```

### Client-Driven Negotiation
Client includes format in URL:
```
GET /v1/users/123.json
GET /v1/users/123.xml
```

### Version via Content-Type
```
Content-Type: application/vnd.myapp.user-v2+json
Accept: application/vnd.myapp.user-v2+json
```

## Query Parameters

### Filtering
```
?status=active                            — Exact match
?createdAt.gte=2026-01-01                — Greater than or equal
?createdAt.lte=2026-06-30                — Less than or equal
?status=active,pending                   — IN list
?status.ne=deleted                       — Not equal
?name.like=john                          — Partial match
?price.between=10,100                    — Range
```

### Sorting
```
?sort=name                               — Ascending
?sort=-createdAt                         — Descending
?sort=name,-createdAt                    — Multi-field
```

### Field Selection (Sparse Fieldset)
```
?fields=id,name,email                     — Include only these fields
?fields=id,name,email,address            — GraphQL-like field selection
```

### Embedding Related Resources
```
?include=user,items,address               — Include related resources
?include=user.profile,items.product       — Nested includes
?expand=all                               — Expand everything (use cautiously)
```

## Validation Rules

### Request Validation
Every endpoint must validate:
1. **Required fields**: Present and non-null
2. **Type correctness**: String, number, boolean, array, object
3. **Format validation**: Email, UUID, date, URL
4. **Range validation**: Min/max for numbers, min/max length for strings
5. **Enum validation**: Value from allowed set
6. **Business rules**: Depends on domain logic

### Common Validation Errors
```
{ field: "email", code: "REQUIRED", message: "Email is required" }
{ field: "age", code: "INVALID_TYPE", message: "Must be a number" }
{ field: "email", code: "INVALID_FORMAT", message: "Must be a valid email" }
{ field: "age", code: "MINIMUM_EXCEEDED", message: "Must be at least 18" }
{ field: "name", code: "MAX_LENGTH", message: "Max 255 characters" }
{ field: "role", code: "INVALID_ENUM", message: "Must be one of: admin, user, moderator" }
```

## HATEOAS (Hypermedia)

### HAL Format
```json
{
  "_links": {
    "self": { "href": "/v1/orders/abc123" },
    "customer": { "href": "/v1/customers/xyz789" },
    "items": { "href": "/v1/orders/abc123/items" },
    "cancel": { "href": "/v1/orders/abc123/cancel" }
  },
  "id": "abc123",
  "status": "pending",
  "total": 49.99
}
```

### Collection with Links
```json
{
  "_links": {
    "self": { "href": "/v1/users?page=1" },
    "next": { "href": "/v1/users?page=2" },
    "prev": null,
    "first": { "href": "/v1/users?page=1" },
    "last": { "href": "/v1/users?page=8" }
  },
  "_embedded": {
    "users": [ ... ]
  },
  "total": 150
}
```

## REST Maturity Model

### Level 0: The Swamp of POX
One endpoint, one method (POST), all actions via XML payload.
```
POST /api
Body: <action>getUser</action><id>123</id>
```

### Level 1: Resources
Individual endpoints for each resource, but still one method.
```
POST /users
POST /users/123
Body: <action>update</action><name>John</name>
```

### Level 2: HTTP Verbs
Use HTTP methods for CRUD semantics.
```
GET    /users/123
POST   /users
DELETE /users/123
```

### Level 3: Hypermedia Controls
Responses include links to navigate the API.
```
GET /users/123
Response includes _links for related actions and resources
```

## API Documentation Essentials

### OpenAPI 3.1 Minimum Viable Spec
```yaml
openapi: 3.1.0
info:
  title: Users API
  version: 1.0.0
  description: CRUD operations for user management

paths:
  /users:
    get:
      summary: List all users
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
      responses:
        '200':
          description: Paginated list of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
    post:
      summary: Create a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
```

### Common OpenAPI Components
```yaml
components:
  schemas:
    ApiError:
      type: object
      required: [code, message]
      properties:
        code: { type: string, example: "VALIDATION_ERROR" }
        message: { type: string, example: "Validation failed" }
        details:
          type: array
          items:
            type: object
            properties:
              field: { type: string }
              reason: { type: string }

    PaginationMeta:
      type: object
      properties:
        page: { type: integer, example: 1 }
        limit: { type: integer, example: 20 }
        total: { type: integer, example: 150 }
        totalPages: { type: integer, example: 8 }
        hasNext: { type: boolean, example: true }
        hasPrev: { type: boolean, example: false }
```

## Common Design Patterns Reference

### Bulk Operations
```
POST   /v1/{resources}/batch      — Create/update many
Body: { "operations": [ { "method": "POST", "path": "/users", "body": {...} }, ... ] }
```

### Soft Delete
```
DELETE /v1/{resources}/{id}        — Sets deleted_at timestamp
GET    /v1/{resources}?deleted=true — Include soft-deleted
```

### Export/Import
```
POST   /v1/{resources}/export     — Returns CSV/JSON download URL
POST   /v1/{resources}/import     — Accepts CSV/JSON upload
```

### Webhook Registration
```
POST   /v1/webhooks
Body: { "url": "https://client.com/hooks", "events": ["order.created", "order.shipped"] }
```

### Health Check
```
GET    /v1/health                 — Basic health
GET    /v1/health/ready           — Readiness probe
GET    /v1/health/live            — Liveness probe
```

## Resource Lifecycle Patterns

### Standard Lifecycle
```
draft -> active -> archived -> deleted
```

### Order Lifecycle
```
pending -> confirmed -> processing -> shipped -> delivered
                                     -> cancelled
           -> payment_failed -> cancelled
```

### User Lifecycle
```
invited -> active -> suspended -> deactivated
```

Each state is a resource status. Transitions are actions:
```
POST /v1/orders/{id}/confirm
POST /v1/orders/{id}/cancel
POST /v1/orders/{id}/ship
```
