---
name: backend-api-design
description: >
  Use this skill when the user says 'API design', 'REST API', 'GraphQL schema', 'endpoint design', 'API conventions', 'URL structure', 'HTTP methods', 'response format', 'API versioning', 'pagination', or when designing new API endpoints. This skill enforces consistent REST or GraphQL conventions: plural nouns, kebab-case URLs, consistent response envelopes, versioned endpoints, paginated lists, and structured error responses. Applies to any backend stack. Do NOT use for: database schema design, frontend data fetching, or authentication implementation.
version: "2.0.0"
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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output. No explanations of REST principles.

### Completion Criteria
- [ ] All resources follow the naming conventions below.
- [ ] Every endpoint has: method, path, auth requirement, request schema, response schema, error codes.
- [ ] List endpoints are paginated.
- [ ] Response envelope is consistent across all endpoints.
- [ ] Error responses follow the standard format.
- [ ] No verbs in URL paths.

### Max Response Length
Per endpoint: 6 lines. Per resource: unlimited.

## Architecture Decision Trees

### REST vs GraphQL Decision Tree
```
What is the primary client type?
├── Public API with many consumers
│   ├── REST — broadest compatibility, cache-friendly, CDN-friendly
│   └── GraphQL only if clients need flexible data shapes
├── Single-page application (SPA)
│   ├── REST + BFF — simpler, more performant, better caching
│   └── GraphQL — if client needs to compose multiple resources
├── Mobile application
│   ├── REST + BFF — smaller payloads, server-controlled shapes
│   └── GraphQL — if network round-trips are the bottleneck
└── Service-to-service (internal)
    ├── REST — simple, familiar, good enough
    └── gRPC — if latency-critical or streaming needed
```

### Resource Modeling Decision Tree
```
Is it a thing (noun)?
├── Yes → Is it a top-level resource?
│   ├── Yes → /v1/{resources}
│   └── No → Is it always accessed through a parent?
│       ├── Yes → /v1/{parents}/{parentId}/{children}
│       └── No → Top-level resource with query filter
└── No → Is it an action (verb)?
    ├── Yes → POST /v1/{resources}/{id}/{action}
    └── No → Neither — reconsider modeling
```

### Pagination Strategy Decision Tree
```
Is the data real-time (new items inserted frequently)?
├── Yes → Cursor-based pagination — stable across insertions
└── No → Is the dataset small (<10K rows)?
    ├── Yes → Offset-based pagination — simpler, skip+limit
    └── No → Do users need random page access?
        ├── Yes → Offset-based with keyset pagination fallback
        └── No → Cursor-based pagination — best performance
```

### Consistency Model Decision Tree
```
Is immediate consistency required?
├── Yes → Synchronous writes, read-after-write guaranteed
│   └── Use REST with strong consistency patterns
└── No → Can the client tolerate stale data?
    ├── Yes → Eventual consistency, cache-friendly
    │   └── Use GraphQL with stale-while-revalidate
    └── No → Strong consistency within bounded context
        └── Use REST with version vectors / ETags
```

## Workflow

### Step 1: Choose API Style
REST: default for CRUD-heavy services with clear resources.
GraphQL: when clients need flexible data shapes or multiple resources in one request.
gRPC: when performance-critical, streaming, or polyglot service mesh.

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
GET    /v1/search?q={query}&type={resourceType}
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
| 400 | MALFORMED_REQUEST | Invalid JSON, bad encoding |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Authenticated but no permission |
| 404 | NOT_FOUND | Resource does not exist |
| 409 | CONFLICT | State conflict (duplicate, stale version) |
| 422 | UNPROCESSABLE_ENTITY | Semantic validation failure |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error |

## API Governance Framework

### Governance Levels
```yaml
governance_levels:
  level_0_no_governance:
    description: "Each team designs APIs independently"
    characteristics: ["Inconsistent conventions across teams", "No API review process"]
    when_appropriate: "Single team, early stage startup, internal-only APIs"
    
  level_1_conventions:
    description: "Shared conventions documented but not enforced"
    characteristics: ["API style guide exists", "Naming conventions documented", "Error format agreed"]
    enforcement: "Manual review in PR — architect reviews API changes"
    when_appropriate: "2-3 teams, moderate API surface"
    
  level_2_spec_governance:
    description: "API specs validated automatically in CI"
    characteristics: ["OpenAPI/GraphQL spec mandatory", "Automated linting on spec", "Breaking change detection"]
    enforcement: "CI pipeline rejects PRs that violate conventions or break compatibility"
    tools: ["spectral (OpenAPI linting)", "openapi-diff (breaking change detection)", "graphql-inspector"]
    when_appropriate: "3-8 teams, growing API surface, external consumers"
    
  level_3_api_platform:
    description: "Centralized API management with developer portal"
    characteristics: ["API gateway with unified auth, rate limiting, analytics", "Developer portal for discovery", "API version lifecycle management"]
    enforcement: "Automated + manual — ARB reviews cross-cutting API changes"
    when_appropriate: "8+ teams, public APIs, B2B integrations"
```

### API Review Checklist
```yaml
api_review_checklist:
  naming_and_structure:
    - "Resource names are plural nouns, lowercase, kebab-case"
    - "No verbs in CRUD paths (use /orders not /getOrders)"
    - "Nested resources follow /parents/:parentId/children"
    - "Query parameters for filtering, sorting, pagination"
    - "Consistent date format (ISO 8601 — RFC 3339)"
    
  request_contract:
    - "Request body schema validated (JSON Schema / OpenAPI)"
    - "Required vs optional fields explicitly marked"
    - "Idempotency key accepted for mutation endpoints"
    - "Content-Type and Accept headers validated"
    - "Rate limit headers documented and enforced"
    
  response_contract:
    - "Consistent envelope — data, error, meta structure"
    - "Error codes are UPPER_SNAKE_CASE strings"
    - "Pagination meta included on all list endpoints"
    - "Response includes requestId for tracing"
    - "No internal implementation details exposed"
    
  backwards_compatibility:
    - "No removal or rename of existing fields"
    - "No change to existing field types"
    - "No narrowing of existing field constraints"
    - "Adding new fields is safe (clients should ignore unknown fields)"
    - "Adding new optional request fields is safe"
    - "Making required fields optional is safe"
    - "Making optional fields required is BREAKING"
    
  security:
    - "Authentication method defined (API key, JWT, OAuth2, mTLS)"
    - "Authorization model (RBAC, ABAC, scope-based)"
    - "Sensitive data not exposed in URLs or responses"
    - "Rate limiting configured with graduated tiers"
    - "HTTPS enforced — no cleartext endpoints"
```

## API Versioning Decision Tree
```yaml
versioning_decision_tree:
  "Are consumers external (third-party developers, partners)?":
    yes: "URI path versioning (v1, v2) — clear, obvious, easy to communicate"
    no_internal:
      "Can you coordinate deployments with all consumers?":
        yes: "No versioning — evolve API with backwards compatibility, coordinate changes"
        no: "Header versioning — consumers opt-in to new version without path changes"
        
  "Do mobile clients consume this API?":
    yes:
      "URI path versioning — app store versions can't change API paths dynamically"
      "Support last 2 major versions — force upgrade when dropping v1"
    no:
      "Header versioning or no versioning (backwards compatible evolution)"
      
  "Is the API in rapid iteration mode (<1 year old, <10 consumers)?":
    yes: "No versioning — additive changes only, feature flags for experiments"
    no: "Formal versioning strategy with deprecation policy (18-month minimum)"
```

## REST API Implementation Patterns

### Pattern: Consistent Error Responses
```typescript
// TypeScript error handler middleware
import { Request, Response, NextFunction } from 'express';

interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; reason: string; message: string }>;
}

class ApiResponse<T> {
  constructor(
    public data: T | null,
    public error: ApiError | null,
    public meta: { requestId: string; timestamp: string }
  ) {}

  static success<T>(data: T, requestId: string): ApiResponse<T> {
    return new ApiResponse(data, null, {
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  static error(code: string, message: string, requestId: string, details?: ApiError['details']): ApiResponse<null> {
    return new ApiResponse(null, { code, message, details }, {
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}

function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  
  if (err instanceof ValidationError) {
    res.status(400).json(ApiResponse.error('VALIDATION_ERROR', err.message, requestId, err.details));
  } else if (err instanceof NotFoundError) {
    res.status(404).json(ApiResponse.error('NOT_FOUND', err.message, requestId));
  } else if (err instanceof ConflictError) {
    res.status(409).json(ApiResponse.error('CONFLICT', err.message, requestId));
  } else {
    console.error('Unhandled error:', err);
    res.status(500).json(ApiResponse.error('INTERNAL_ERROR', 'An unexpected error occurred', requestId));
  }
}
```

### Pattern: Idempotent POST
```typescript
// Idempotency-Key support for mutation endpoints
import { Request, Response, NextFunction } from 'express';

interface IdempotencyRecord {
  key: string;
  status: 'pending' | 'completed';
  response?: { status: number; body: unknown };
  expiresAt: number;
}

class IdempotencyMiddleware {
  constructor(private store: { get(key: string): Promise<IdempotencyRecord | null>; set(key: string, value: IdempotencyRecord): Promise<void> }) {}

  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (req.method !== 'POST' && req.method !== 'PATCH') {
        return next();
      }

      const idempotencyKey = req.headers['idempotency-key'] as string;
      if (!idempotencyKey) {
        return next();
      }

      const existing = await this.store.get(idempotencyKey);
      if (existing) {
        if (existing.status === 'completed') {
          res.status(existing.response!.status).json(existing.response!.body);
          return;
        }
        if (existing.status === 'pending') {
          res.status(409).json({
            error: { code: 'CONFLICT', message: 'Request with this idempotency key is already being processed' },
          });
          return;
        }
      }

      await this.store.set(idempotencyKey, { key: idempotencyKey, status: 'pending', expiresAt: Date.now() + 86_400_000 });
      
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        this.store.set(idempotencyKey, { key: idempotencyKey, status: 'completed', response: { status: res.statusCode, body } });
        return originalJson(body);
      };

      next();
    };
  }
}
```

### Pattern: Sparse Fieldsets
```typescript
// GraphQL-style field selection for REST endpoints
function parseFields(fields: string | undefined): Set<string> | null {
  if (!fields) return null;
  return new Set(fields.split(',').map(f => f.trim()));
}

function filterFields<T extends Record<string, unknown>>(obj: T, allowed: Set<string> | null): Partial<T> {
  if (!allowed) return obj;
  const result: Partial<T> = {};
  for (const key of allowed) {
    if (key in obj) {
      result[key as keyof T] = obj[key as keyof T];
    }
  }
  return result;
}

// Usage: GET /users?fields=id,name,email
app.get('/users/:id', (req, res) => {
  const fields = parseFields(req.query.fields as string);
  const user = getUser(req.params.id);
  res.json(ApiResponse.success(filterFields(user, fields), req.id));
});
```

### Pattern: ETag-based Caching
```typescript
// ETag support for conditional requests
import { createHash } from 'crypto';

function generateETag(data: unknown): string {
  return `"${createHash('md5').update(JSON.stringify(data)).digest('hex')}"`;
}

async function conditionalGet(req: Request, res: Response, handler: () => Promise<unknown>): Promise<void> {
  const data = await handler();
  const etag = generateETag(data);

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.json(ApiResponse.success(data, req.id));
}

// Usage
app.get('/users/:id', async (req, res) => {
  await conditionalGet(req, res, () => getUser(req.params.id));
});
```

## GraphQL Implementation Patterns

### Pattern: DataLoader for N+1 Prevention
```typescript
import DataLoader from 'dataloader';

// Batch function — one DB query for many keys
async function batchUsers(ids: readonly string[]): Promise<User[]> {
  const users = await db.select('*').from('users').whereIn('id', ids);
  const userMap = new Map(users.map(u => [u.id, u]));
  return ids.map(id => userMap.get(id)!);
}

const userLoader = new DataLoader(batchUsers);

// Resolver uses DataLoader — automatic batching
const resolvers = {
  Query: {
    users: async (_: unknown, args: { ids: string[] }) => {
      return Promise.all(args.ids.map(id => userLoader.load(id)));
    },
  },
  Order: {
    customer: async (order: { customerId: string }) => {
      return userLoader.load(order.customerId);
    },
  },
};
```

### Pattern: Page-based Pagination (Connection Spec)
```graphql
type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

```typescript
async function resolveUsers(_: unknown, args: { first?: number; after?: string }): Promise<UserConnection> {
  const limit = Math.min(args.first || 20, 100);
  const cursor = args.after ? Buffer.from(args.after, 'base64').toString() : null;
  const cursorValue = cursor ? JSON.parse(cursor) : null;

  const query = db.select('*').from('users').limit(limit + 1);
  if (cursorValue) {
    query.where('created_at', '<', cursorValue.createdAt)
      .orWhere(db.raw('created_at = ? AND id < ?', [cursorValue.createdAt, cursorValue.id]));
  }
  query.orderBy('created_at', 'desc').orderBy('id', 'desc');

  const users = await query;
  const hasNextPage = users.length > limit;
  const nodes = users.slice(0, limit);

  const edges = nodes.map(node => ({
    node,
    cursor: Buffer.from(JSON.stringify({ id: node.id, createdAt: node.created_at })).toString('base64'),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: !!args.before,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
    },
    totalCount: await db('users').count('id as count').then(r => Number(r[0].count)),
  };
}
```

### Pattern: Field-Level Authorization
```typescript
import { GraphQLFieldResolver } from 'graphql';

function authorizedField<T>(resolver: GraphQLFieldResolver<T, unknown>, requiredPermission: string): GraphQLFieldResolver<T, unknown> {
  return async (source, args, context, info) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }
    if (!context.user.permissions.includes(requiredPermission) && !context.user.permissions.includes('*')) {
      return null; // Field returns null instead of throwing — secure by default
    }
    return resolver(source, args, context, info);
  };
}

const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String! @auth(requires: "user:read_email")
    ssn: String @auth(requires: "user:read_ssn")
  }
`;

// Schema directive implementation
class AuthDirective {
  visitFieldDefinition(field: GraphQLField<unknown, unknown>) {
    const { requires } = this.args;
    const originalResolve = field.resolve || defaultFieldResolver;
    field.resolve = (source, args, context, info) => {
      if (!context.user?.permissions?.includes(requires)) {
        throw new ForbiddenError(`Insufficient permissions. Required: ${requires}`);
      }
      return originalResolve(source, args, context, info);
    };
  }
}
```

## Production Considerations

### Rate Limiting at API Level
```typescript
// Token bucket rate limiter
class TokenBucketRateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private maxTokens: number,
    private refillRate: number,  // tokens per second
    private refillInterval: number  // ms between refills
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
      return true;
    }

    const elapsed = now - bucket.lastRefill;
    const refillAmount = Math.floor(elapsed / this.refillInterval) * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refillAmount);
    bucket.lastRefill = now;

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }
}

// Tiered rate limits
const RATE_LIMIT_TIERS = {
  free: { tokens: 20, refillRate: 1, refillInterval: 1000 },     // 20 req/s
  pro: { tokens: 100, refillRate: 10, refillInterval: 1000 },    // 100 req/s
  enterprise: { tokens: 1000, refillRate: 100, refillInterval: 1000 }, // 1000 req/s
};

// Rate limit headers
function setRateLimitHeaders(res: Response, tier: keyof typeof RATE_LIMIT_TIERS, remaining: number): void {
  const config = RATE_LIMIT_TIERS[tier];
  res.setHeader('X-RateLimit-Limit', config.tokens);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + config.refillInterval / 1000);
}
```

### Request Validation Pipeline
```typescript
import { z } from 'zod';

// Schema-first validation using Zod
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  age: z.number().int().min(18).max(150).optional(),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
});

type CreateUserRequest = z.infer<typeof createUserSchema>;

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      'VALIDATION_ERROR',
      result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        reason: issue.code,
        message: issue.message,
      }))
    );
  }
  return result.data;
}

// Usage in endpoint
app.post('/v1/users', (req, res) => {
  const validated = validate(createUserSchema, req.body);
  const user = createUser(validated);
  res.status(201).json(ApiResponse.success(user, req.id));
});
```

### API Documentation Generation
```typescript
// OpenAPI 3.1 spec generation from Zod schemas (using @anatine/zod-openapi)
import { generateSchema } from '@anatine/zod-openapi';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'post',
  path: '/v1/users',
  tags: ['Users'],
  request: {
    body: {
      content: { 'application/json': { schema: generateSchema(createUserSchema) } },
    },
  },
  responses: {
    201: {
      description: 'User created successfully',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } } },
    },
    400: { description: 'Validation error' },
    409: { description: 'Duplicate email' },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const spec = generator.generateDocument({
  openapi: '3.1.0',
  info: { title: 'User API', version: '1.0.0' },
});
```

## Anti-Patterns

### Anti-Pattern 1: Over-Nesting Resources
Bad: `/v1/orgs/{orgId}/workspaces/{wsId}/projects/{projId}/tasks/{taskId}/comments`
Problem: Deep nesting creates fragile URLs, poor cache granularity, hard to version.
Fix: Flatten after 2 levels. Use query parameters for scope.
Good: `/v1/tasks/{taskId}/comments?orgId=xxx&workspaceId=yyy`

### Anti-Pattern 2: Returning 200 for Errors
Bad: `{ "success": false, "error": "Not found" }` with HTTP 200
Problem: Clients cannot use HTTP status-based error handling. Proxies and caches treat it as success.
Fix: Always use appropriate HTTP status codes (404 for not found, 400 for bad request, etc.)

### Anti-Pattern 3: Leaking Internal IDs
Bad: `/v1/users/42` where 42 is an auto-increment PK
Problem: Exposes user count, allows enumeration attacks, couples client to internal schema.
Fix: Use UUID v7 or ULID. Expose only these as resource identifiers.

### Anti-Pattern 4: Inconsistent Pluralization
Bad: Mix of `/v1/user`, `/v1/orders`, `/v1/order-items`
Problem: Confuses clients, makes SDK generation inconsistent.
Fix: All resources are plural. Always.

### Anti-Pattern 5: No Pagination Defaults
Bad: `GET /v1/users` returns all 1M users
Problem: Server memory exhaustion, network timeouts, poor UX.
Fix: Always paginate. Default limit=20, max limit=100. Return pagination metadata.

### Anti-Pattern 6: Version in Header Only for Public APIs
Bad: Public API uses `X-API-Version: v2` with no visible version indicator
Problem: Devs testing in browser, curl, or Postman can't see the version easily. API documentation tools (Swagger UI) may not support header-based versioning.
Fix: Public APIs use URI path versioning. Header versioning is acceptable for internal APIs only.

### Anti-Pattern 7: Synchronous Cross-Service Calls in Request Path
Bad: API endpoint calls 3 other services synchronously to build a response
Problem: Total latency = sum of all service latencies. One slow service blocks all others.
Fix: Use async event-driven patterns for non-critical data. Use parallel Promise.all for independent calls. BFF pattern for composition.

## Security Considerations

### HTTPS Enforced at Every Layer
- TLS 1.3 minimum. Disable TLS 1.0, 1.1, SSLv3.
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Certificate pinning for mobile APIs (SHA-256 fingerprint in app bundle).

### Authentication Headers
- Bearer tokens in `Authorization` header only. Never in URL query parameters.
- API keys in `X-API-Key` header. Rotate quarterly minimum.
- Idempotency keys in `Idempotency-Key` header.

### Input Sanitization
- Reject oversized payloads (Content-Length > 1MB default).
- Validate Content-Type strictly (`application/json` for JSON APIs).
- SQL injection prevention: parameterized queries always. Never string interpolation.
- No eval, no deserialization of untrusted data.

### Response Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0  (deprecated but still used)
Content-Security-Policy: default-src 'none'
Cache-Control: no-store  (for authenticated responses)
```

### Rate Limiting Strategy
- Per-client (API key or token) rate limiting at gateway.
- Per-endpoint rate limiting for expensive operations (search, export).
- Graduated tiers: burst limit + sustained limit.
- Return `Retry-After` header on 429 responses.
- Rate limit headers on every response (X-RateLimit-*).

## Performance Considerations

### Response Compression
```typescript
// Express compression middleware
import compression from 'compression';
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,  // Default balance of speed vs ratio
  threshold: 1024,  // Only compress responses > 1KB
}));
```

### Connection Pooling
```typescript
// HTTP keep-alive for downstream calls
import http from 'http';
import https from 'https';

const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  scheduling: 'lifo',
});

// Share agent across all outbound requests
async function fetchFromService(url: string): Promise<unknown> {
  const response = await fetch(url, { agent });
  return response.json();
}
```

### Response Size Optimization
- Paginate all list endpoints (default 20, max 100).
- Sparse fieldsets (`?fields=id,name`).
- Compress responses (Brotli for JSON, Gzip fallback).
- Avoid deeply nested JSON responses (>3 levels).
- Use integer enums instead of string enums where possible.
- Remove null fields from responses (omitempty/JSON skipnull).

### Caching Strategy
- HTTP caching headers: `ETag`, `Last-Modified`, `Cache-Control`.
- Conditional requests: `If-None-Match`, `If-Modified-Since`.
- Cache static responses at CDN edge.
- Private cache for user-specific data (`Cache-Control: private`).
- No cache for mutation endpoints.

## Trade-offs

### REST vs GraphQL
| Aspect | REST | GraphQL |
|--------|------|---------|
| Caching | Natural HTTP caching | Requires custom resolver caching |
| Payload size | Fixed — may over/under-fetch | Client-controlled — minimal |
| Versioning | URI path or header | Deprecation fields, schema evolution |
| Tooling | Mature (Swagger, Postman collections) | Growing (GraphiQL, Apollo Studio) |
| N+1 problem | Avoided by design | Requires DataLoader pattern |
| File upload | Multipart/form-data | Requires custom scalar or separate upload API |
| Learning curve | Low | Moderate |
| Performance | Predictable per-endpoint | Varies by query complexity |
| Monitoring | Per-endpoint metrics | Per-resolver deep tracing |

### URI vs Header Versioning
| Aspect | URI Versioning | Header Versioning |
|--------|---------------|-------------------|
| Visibility | Explicit in URL | Hidden from URL |
| Cache isolation | Natural (different URLs) | Requires Vary header |
| Client complexity | Simple (just change URL) | Moderate (header configuration) |
| Browser testing | Direct in address bar | Requires extension or tool |
| API gateway routing | Path-based routing | Header-based routing |
| SEO impact | Multiple indexed versions | Single URL, single SEO value |

### Offset vs Cursor Pagination
| Aspect | Offset | Cursor |
|--------|--------|--------|
| Stability | Unstable with inserts | Stable |
| Performance | Degrades with large offset | O(1) with indexed cursor |
| Random access | Supported (page N) | Not supported (no page numbers) |
| Implementation | Simple (LIMIT/OFFSET) | Complex (cursor encoding/decoding) |
| Real-time feeds | Poor (missed/duplicate items) | Excellent |
| Admin panels | Good (page jumping) | Poor (sequential scanning) |

## Rules
- Always paginate list endpoints. Never return unbounded arrays.
- Error codes are UPPER_SNAKE_CASE strings, not HTTP status descriptions.
- Never expose internal IDs (auto-increment integers) in URLs or responses. Use UUIDs or slugs.
- Deprecate endpoints, do not delete them. Use Deprecation header.
- Response envelope is consistent in ALL cases — success and error. data is null when error is present.
- Every response includes requestId for tracing.
- If the API grows beyond 20 endpoints, consider splitting into separate services.
- API design decisions must be documented as ADRs — especially versioning, auth, and conventions.
- Governance level should match API maturity — don't over-govern early-stage APIs.
- Every breaking change requires a new version. Additive changes can go in existing version.
- Validate all input at the boundary. Never trust client data.
- Use asynchronous communication for cross-service data that isn't request-critical.

## References
  - references/api-design-documentation.md — API Design Documentation
  - references/api-design-security.md — API Design Security
  - references/api-error-handling.md — API Error Handling
  - references/api-pagination-filtering.md — API Pagination and Filtering
  - references/api-design-fundamentals.md — API Design Fundamentals
  - references/api-design-advanced.md — API Design Advanced Patterns
  - references/graphql-conventions.md — GraphQL Conventions
  - references/rest-conventions.md — REST API Conventions

## Handoff
No artifact produced unless requested.
Next skill: backend-database-patterns — design the data layer for these APIs.
Carry forward: API contracts, resource definitions, auth requirements, pagination strategy.
