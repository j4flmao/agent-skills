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
