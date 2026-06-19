# APIs Skill

## Overview
API design and implementation covers REST, WebSocket, and other communication protocols. This skill covers protocol selection, design patterns, error handling, versioning, authentication, and scaling strategies.

## Decision Tree: Protocol Selection

### REST vs WebSocket vs GraphQL vs gRPC
```
What does my API need?
├── CRUD operations, standard web/mobile clients → REST (most common, HTTP-native)
├── Real-time bidirectional communication → WebSocket
│   (chat, live notifications, collaborative editing, streaming data)
├── Flexible queries, multiple data sources → GraphQL
│   (complex UIs, multiple clients, bandwidth-constrained mobile)
├── High-performance internal microservices → gRPC
│   (low latency, polyglot services, streaming RPC)
└── Server-sent events needed but no client sending → SSE (simpler than WebSocket)
    (feed updates, notifications — one-way server→client)
```

### REST vs WebSocket Detailed Decision
```
Communication pattern:
├── Request-response, client-initiated → REST
├── Client subscribes to server events → WebSocket
├── Both directions, server-initiated → WebSocket
└── Polling every N seconds → Consider WebSocket or SSE

Connection overhead:
├── Can tolerate connection setup per request → REST
├── Persistent connection needed for latency → WebSocket
├── Millions of short-lived connections → REST (HTTP/2 multiplexing)
└── Dozens of persistent connections → WebSocket

Compatibility requirements:
├── Works through all proxies/firewalls → REST (HTTP only)
├── Works through HTTP proxies → WebSocket (uses HTTP upgrade)
└── Only works with same-origin → WebSocket (needs CORS-like handling)
```

## REST API Design Patterns

### Resource Naming Convention
```
Resources: plural nouns, lowercase, kebab-case
  GET    /users              # List users
  POST   /users              # Create user
  GET    /users/:id          # Get single user
  PUT    /users/:id          # Full update
  PATCH  /users/:id          # Partial update
  DELETE /users/:id          # Delete user

Relationships: nested for direct ownership
  GET    /users/:id/orders   # User's orders
  POST   /users/:id/orders   # Create order for user

Actions: verbs for non-CRUD operations
  POST   /users/:id/activate  # Activate user
  POST   /orders/:id/cancel   # Cancel order

Query parameters for filtering/pagination
  GET /users?role=admin&status=active&page=1&per_page=20
  GET /users?sort=-created_at  # Negative prefix = descending
```

### Standard Response Format
```typescript
// Success response
{
  "data": { /* resource or array */ },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Single resource
{ "data": { "id": 1, "name": "Alice", "email": "alice@example.com" } }

// Collection
{
  "data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 45, "totalPages": 3 }
}

// Error response (RFC 7807 Problem Details)
{
  "type": "/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "Request validation failed",
  "instance": "/api/users",
  "errors": {
    "email": ["Email is required", "Email must be valid"]
  },
  "traceId": "req-abc-123"
}
```

## Error Handling Patterns

### Status Code Decision Tree
```
What went wrong?
├── Client sent bad data (missing field, wrong type) → 400 Bad Request
├── Client not authenticated → 401 Unauthorized
├── Client not authorized (but authenticated) → 403 Forbidden
├── Resource doesn't exist → 404 Not Found
├── Method not supported on this resource → 405 Method Not Allowed
├── Conflict (duplicate, stale version) → 409 Conflict
├── Resource gone (permanently removed) → 410 Gone
├── Validation failed (semantic errors) → 422 Unprocessable Entity
├── Rate limited → 429 Too Many Requests (include Retry-After)
├── Unexpected server error → 500 Internal Server Error
├── Upstream service unavailable → 502 Bad Gateway
└── Service overloaded / maintenance → 503 Service Unavailable
```

### Global Error Handler Pattern
```typescript
// Express middleware
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const status = err instanceof HttpError ? err.status : 500;
  const body = {
    type: `/errors/${status}`,
    title: getStatusTitle(status),
    status,
    detail: status >= 500 ? 'Internal Server Error' : err.message,
    instance: req.path,
    traceId: req.headers['x-request-id'],
    timestamp: new Date().toISOString(),
  };

  if (status >= 500) {
    console.error('Server error:', err);
  }

  res.status(status).json(body);
}
```

## Versioning Strategy

### Version Selection Decision
```
Which versioning strategy?
├── Need clear, URL-visible version → URI versioning (/v1/, /v2/)
│   Pros: Easy to route, cache, test, discover
│   Cons: URL pollution, multiple code paths
├── Want clean URLs, RESTful purity → Header versioning (Accept header)
│   Pros: Clean URLs, follows REST principles
│   Cons: Harder to test, not cache-friendly
├── Simple internal API → Query parameter versioning (?v=1)
│   Pros: Simple to implement and test
│   Cons: URL pollution, caching edge cases
└── Need minimal client changes → Content negotiation (vendor MIME)
    Pros: Most RESTful, clean URLs
    Cons: Complex client setup, harder debugging
```

### Version Lifecycle
1. **Active**: Default version, fully supported
2. **Deprecated**: Still works, but sunset date announced
3. **Sunset**: Removed, returns 410 Gone

```typescript
// Deprecation headers
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/v1')) {
    res.setHeader('Deprecation', new Date('2026-01-01').toUTCString());
    res.setHeader('Sunset', new Date('2026-07-01').toUTCString());
    res.setHeader('Link', '</docs/migration-v1-v2>; rel="deprecation"');
  }
  next();
});
```

## WebSocket Patterns

### Connection Lifecycle
```
Client connects:
  1. Client requests wss://api.example.com/ws?token=<jwt>
  2. Server verifies token (verifyClient or post-connect auth)
  3. If valid: connection established, store in client map
  4. If invalid: close with 4001 status code
  5. Client receives confirmation or close frame

Active connection:
  1. Ping/pong every 30s to detect stale connections
  2. Validate message schema on every message
  3. Check authorization before processing actions
  4. Rate limit messages per connection

Reconnection:
  1. Client detects close (unexpected)
  2. Exponential backoff: 1s, 2s, 4s, 8s... max 30s
  3. Add jitter: random 0-1000ms to prevent thundering herd
  4. After reconnecting: resubscribe to channels, request missed messages
  5. Max retries: 10 attempts, then give up
  6. If close code 1000 (normal): don't reconnect

Disconnection:
  1. Server: close with appropriate code
  2. Client: stop reconnect timer, cleanup subscriptions
  3. Reconnect if unexpected (not 1000)
  4. Server: remove from client map, cleanup resources
```

### WebSocket Scaling Pattern
```
Small scale (<1000 concurrent connections):
  - Single server, direct connections
  - In-memory connection map

Medium scale (1K-100K concurrent):
  - Multiple servers with sticky sessions
  - Redis Pub/Sub for cross-instance messaging
  - Load balancer with sticky session support (NGINX, HAProxy)

Large scale (100K+ concurrent):
  - Dedicated WebSocket server cluster
  - Redis Pub/Sub or Kafka for message bus
  - Connection pooling and backpressure management
  - Horizontal pod autoscaling based on connection count
```

## Security Patterns

### Authentication Decision Tree
```
How should clients authenticate?
├── Server-to-server API → API keys (static, long-lived)
├── Mobile/web app (user-based) → JWT (short-lived access + refresh token)
├── Third-party developers → OAuth2 (authorization code flow)
├── Internal service → mTLS (mutual TLS certificates)
└── WebSocket → JWT in query param or first message
```

### Rate Limiting Pattern
```typescript
// Token bucket algorithm
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number,  // tokens per second
    private refillInterval: number = 1000  // ms
  ) {}

  tryConsume(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor((elapsed / this.refillInterval) * this.refillRate);
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
}
```

## API Documentation

### OpenAPI Pattern
```yaml
openapi: 3.1.0
info:
  title: User API
  version: 2.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: per_page
          in: query
          schema: { type: integer, default: 20 }
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items: { $ref: '#/components/schemas/User' }
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateUser' }
      responses:
        '201':
          description: Created
```

## Key Anti-Patterns
- **Breaking backward compatibility**: Additive changes only in same version
- **Exposing internal IDs to clients**: Use UUIDs or slugs instead of auto-increment IDs
- **No pagination on list endpoints**: Can crash clients with large datasets
- **Inconsistent error format**: Always use RFC 7807 Problem Details
- **HTTP status code misuse**: Don't return 200 with an error in the body
- **Verb-based URLs**: `getUsers` is not a URL; use `GET /users`
- **No rate limiting**: Opens the door for abuse
- **Not using HTTPS**: Sends credentials in plaintext
- **Returning stack traces in production**: Exposes implementation details
- **No API versioning**: Changes break existing clients
- **WebSocket without ping/pong**: Stale connections consume resources forever
- **Synchronous operations for long tasks**: Use 202 Accepted with status polling

## API Design Patterns

### RESTful Resource Naming
```
GET    /users                    # List users
GET    /users/:id                # Get user by ID
POST   /users                    # Create user
PUT    /users/:id                # Full update
PATCH  /users/:id                # Partial update
DELETE /users/:id                # Delete user
GET    /users/:id/orders         # Sub-resource collection
GET    /users/:id/orders/:orderId  # Nested resource

# Actions on resources (not verbs in URL)
POST   /users/:id/activate       # RPC-style action
POST   /users/:id/deactivate
POST   /orders/:id/cancel

# Search — keep simple
GET    /users?q=search&page=1&limit=20
# Complex search — use POST with body
POST   /users/search
```

### Pagination Strategies
```json
// Cursor-based (recommended for large sets)
GET /users?cursor=eyJpZCI6MTAwfQ&limit=20
Response:
{
  "data": [...],
  "nextCursor": "eyJpZCI6MTIwfQ",
  "hasMore": true
}

// Offset-based (simpler, fragile with inserts)
GET /users?page=2&limit=20
Response:
{
  "data": [...],
  "page": 2,
  "totalPages": 50,
  "totalItems": 1000
}

// Keyset-based (efficient, stable)
GET /users?after_id=100&limit=20
Response: [...]
Link: <https://api.example.com/users?after_id=120&limit=20>; rel="next"
```

### Error Response Format (RFC 9457)
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request body contains invalid fields.",
  "instance": "/api/users",
  "errors": [
    {
      "field": "email",
      "message": "Email is not a valid email address",
      "code": "INVALID_FORMAT"
    },
    {
      "field": "age",
      "message": "Age must be between 0 and 150",
      "code": "OUT_OF_RANGE"
    }
  ]
}
```

### Rate Limiting Headers
```
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1687193600
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
```

### API Versioning Strategies

| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| URL path | `GET /v1/users` | Simple, explicit | URL pollution, routing overhead |
| Header | `Accept: application/vnd.api+json;version=1` | Clean URLs | Harder to discover |
| Query param | `GET /users?version=1` | Easy to test | Caching issues, not standard |
| No versioning | Backward-compatible changes only | No version management | Breaking changes require coordination |

**Recommendation**: URL path versioning for public APIs, header-based for internal/microservice APIs. Deprecate with `Sunset` header:
```
Deprecation: true
Sunset: Sat, 01 Jan 2026 00:00:00 GMT
Link: <https://docs.api.example.com/v2-migration>; rel="deprecation"
```

### HATEOAS & Discoverability
```json
GET /users/42
{
  "id": 42,
  "name": "Alice",
  "_links": {
    "self": { "href": "/users/42" },
    "orders": { "href": "/users/42/orders" },
    "profile": { "href": "/users/42/profile" }
  }
}
```

## OpenAPI / Swagger Patterns

### OpenAPI 3.1 Structure
```yaml
openapi: 3.1.0
info:
  title: User API
  version: 1.0.0
  description: API for managing users
paths:
  /users:
    get:
      summary: List all users
      parameters:
        - name: page
          in: query
          schema: { type: integer, minimum: 1, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, maximum: 100, default: 20 }
      responses:
        '200':
          description: Paginated list of users
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  nextCursor:
                    type: string
                  hasMore:
                    type: boolean
components:
  schemas:
    User:
      type: object
      required: [id, name, email]
      properties:
        id: { type: integer, readOnly: true }
        name: { type: string, minLength: 1, maxLength: 100 }
        email: { type: string, format: email }
        createdAt: { type: string, format: date-time, readOnly: true }
```

### API Client Generation
```bash
# TypeScript/JavaScript
npx openapi-typescript schema.yaml -o src/api/schema.d.ts
npx orval --input schema.yaml --output src/api/generated

# Python
pip install openapi-python-client
openapi-python-client generate --path schema.yaml

# Swift
brew install swagger-codegen
swagger-codegen generate -i schema.yaml -l swift5

# Kotlin
openapi-generator generate -i schema.yaml -g kotlin -o api-client/
```

## Webhook Patterns

### Webhook Delivery Contract
```json
// POST to registered webhook URL
{
  "event": "order.created",
  "id": "evt_abc123",
  "created": "2024-06-15T10:30:00Z",
  "data": {
    "orderId": "ord_456",
    "total": 2999,
    "currency": "usd"
  }
}
```

**Delivery guarantees:**
- Retry with exponential backoff: 0s → 10s → 30s → 60s → 5m → 30m → 2h → 6h
- Max retries: 8 (over ~9 hours)
- Dead letter queue after max retries
- Idempotency key in header: `Idempotency-Key: evt_abc123`
- Signature header: `X-Signature: sha256=....` (HMAC with shared secret)

## GraphQL API Patterns

### Schema Design
```graphql
type Query {
  user(id: ID!): User
  users(page: Int, limit: Int): UserConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): UserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UserPayload!
}

type User {
  id: ID!
  name: String!
  email: String!
  orders(first: Int, after: String): OrderConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type UserPayload {
  user: User
  errors: [UserError!]
}

type UserError {
  field: String!
  message: String!
}
```

### N+1 Prevention
```javascript
// DataLoader pattern (JavaScript/TypeScript)
const DataLoader = require('dataloader');

const userLoader = new DataLoader(async (ids) => {
  const users = await db.select('*').from('users').whereIn('id', ids);
  return ids.map(id => users.find(u => u.id === id));
});

// In resolver:
Query: {
  user: (_, { id }) => userLoader.load(id),
},
User: {
  orders: (user, args) => orderLoader.load(user.id),
}
```

## Security Patterns

### Authentication Headers
```
# Bearer JWT
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# API Key (for service-to-service)
X-API-Key: sk_live_abc123def456

# Mutual TLS (mTLS)
# Requires client certificate validation at TLS layer
```

### Input Validation
```typescript
// Zod schema (TypeScript)
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

// Sanitize before processing
const validated = createUserSchema.parse(req.body);
```

### CORS Configuration
```typescript
// Fastify example
import cors from '@fastify/cors';

app.register(cors, {
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
```

## API Testing Patterns

### Contract Testing (Pact)
```typescript
// Consumer test
const pact = new Pact({ consumer: 'WebApp', provider: 'UserAPI' });

describe('User API contract', () => {
  beforeAll(() => pact.setup());
  afterAll(() => pact.finalize());

  it('returns user by ID', async () => {
    await pact
      .given('user 42 exists')
      .uponReceiving('a request for user 42')
      .withRequest({ method: 'GET', path: '/users/42' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { id: 42, name: 'Alice', email: 'alice@example.com' },
      });

    const response = await apiClient.getUser(42);
    expect(response).toEqual({ id: 42, name: 'Alice', email: 'alice@example.com' });
  });
});
```

### Integration Testing
```typescript
import supertest from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('POST /users', () => {
  it('creates a user and returns 201', async () => {
    const response = await supertest(app)
      .post('/users')
      .send({ name: 'Alice', email: 'alice@example.com' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Alice',
    });
  });

  it('rejects invalid email with 422', async () => {
    const response = await supertest(app)
      .post('/users')
      .send({ name: 'Alice', email: 'not-an-email' })
      .expect(422);

    expect(response.body.errors[0].field).toBe('email');
  });
});
```

## Rate Limiting Implementation
```typescript
// Token bucket algorithm (TypeScript)
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number,  // tokens per second
    private refillInterval: number = 1000  // ms
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  consume(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(
      (elapsed / this.refillInterval) * this.refillRate
    );
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

## Async API / Event-Driven Patterns

### Event Schema (CloudEvents)
```json
{
  "specversion": "1.0",
  "type": "com.example.order.created",
  "source": "/orders/12345",
  "id": "evt_abc123",
  "time": "2024-06-15T10:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "12345",
    "total": 2999,
    "currency": "usd",
    "items": [
      { "productId": "prod_abc", "quantity": 2, "price": 1499 }
    ]
  }
}
```

### Message Queue Patterns
| Pattern | Use Case | Technology |
|---------|----------|------------|
| Publish/Subscribe | Broadcast events to multiple consumers | Redis Pub/Sub, Kafka, NATS |
| Work Queue | Distribute tasks among workers | RabbitMQ, SQS, Bull (Redis) |
| Dead Letter Queue | Handle failed messages | SQS DLQ, RabbitMQ DLX |
| Competing Consumers | Scale processing horizontally | Any queue with consumer groups |
| Saga | Distributed transaction coordination | Kafka + orchestrator service |
