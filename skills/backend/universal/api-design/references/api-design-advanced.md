# API Design Advanced Patterns

## Advanced Pagination Patterns

### Keyset Pagination (Seek Method)
Superior to offset-based for large datasets. Uses WHERE clause with composite index instead of LIMIT/OFFSET.

```sql
-- Instead of:
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 10000;

-- Use keyset pagination:
SELECT * FROM users WHERE (created_at, id) < ($lastCreatedAt, $lastId)
ORDER BY created_at DESC, id DESC LIMIT 20;
```

```typescript
interface KeysetPageParams {
  cursor?: string;  // Base64-encoded { id, sortValue }
  limit?: number;
}

interface KeysetPageResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

function encodeCursor(id: string, sortValue: string): string {
  return Buffer.from(JSON.stringify({ id, sv: sortValue })).toString('base64url');
}

function decodeCursor(cursor: string): { id: string; sv: string } {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}

async function paginateUsers(params: KeysetPageParams): Promise<KeysetPageResponse<User>> {
  const limit = Math.min(params.limit || 20, 100);
  const cursor = params.cursor ? decodeCursor(params.cursor) : null;

  let query = db('users')
    .select('*')
    .limit(limit + 1)  // +1 to detect hasMore
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc');

  if (cursor) {
    query = query.where(function () {
      this.where('created_at', '<', cursor.sv)
        .orWhere(function () {
          this.where('created_at', '=', cursor.sv)
            .where('id', '<', cursor.id);
        });
    });
  }

  const results = await query;
  const hasMore = results.length > limit;
  const data = results.slice(0, limit);

  return {
    data,
    nextCursor: hasMore
      ? encodeCursor(data[data.length - 1].id, data[data.length - 1].created_at)
      : null,
    hasMore,
  };
}
```

### Time-Based Partitioned Pagination
For time-series data, partition queries by time window:

```typescript
interface TimePartitionParams {
  startDate: string;
  endDate: string;
  interval: 'hour' | 'day' | 'week' | 'month';
  cursor?: string;
  limit?: number;
}

async function paginateByTimeWindow(params: TimePartitionParams): Promise<PaginatedResult<Event>> {
  const results: Event[] = [];
  const limit = params.limit || 100;
  const cursor = params.cursor ? new Date(params.cursor) : new Date(params.endDate);

  while (results.length < limit && cursor > new Date(params.startDate)) {
    const windowStart = new Date(cursor);
    const windowEnd = new Date(cursor);

    switch (params.interval) {
      case 'day': windowStart.setDate(windowStart.getDate() - 1); break;
      case 'hour': windowStart.setHours(windowStart.getHours() - 1); break;
      case 'week': windowStart.setDate(windowStart.getDate() - 7); break;
      case 'month': windowStart.setMonth(windowStart.getMonth() - 1); break;
    }

    const batch = await db('events')
      .where('occurred_at', '>', windowStart.toISOString())
      .where('occurred_at', '<=', windowEnd.toISOString())
      .orderBy('occurred_at', 'desc')
      .limit(limit - results.length);

    results.push(...batch);
    cursor.setTime(windowStart.getTime());
  }

  return {
    data: results.slice(0, limit),
    nextCursor: results.length >= limit ? cursor.toISOString() : null,
    hasMore: results.length >= limit,
  };
}
```

## Advanced Error Handling Patterns

### Structured Error Response with Retry Info
```json
{
  "error": {
    "code": "SERVICE_OVERLOADED",
    "message": "Payment service is temporarily unavailable",
    "retryable": true,
    "retryAfter": 30,
    "retryStrategy": "exponential_backoff",
    "details": [
      {
        "field": "payment_service",
        "code": "UPSTREAM_TIMEOUT",
        "message": "Payment gateway did not respond within 5 seconds"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-05-14T10:30:00Z"
  }
}
```

### Problem Details (RFC 7807)
```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account #12345 has balance 50.00 but transaction requires 75.00",
  "instance": "/v1/transactions",
  "balance": 50.00,
  "required": 75.00,
  "accountId": "12345"
}
```

### Error Aggregation for Batch Operations
```json
{
  "data": {
    "successCount": 8,
    "failureCount": 2,
    "results": [
      { "index": 0, "status": "created", "id": "uuid-1" },
      { "index": 1, "status": "failed", "error": { "code": "DUPLICATE_EMAIL", "message": "Email already exists" } }
    ]
  }
}
```

## Advanced Versioning Strategies

### Multi-Version Router
```typescript
import { Router, Request, Response } from 'express';

class VersionRouter {
  private versions = new Map<string, Router>();

  register(version: string, router: Router): void {
    this.versions.set(version, router);
  }

  getRouter(): Router {
    const router = Router();

    // URI versioning
    router.use('/v:version(\\d+)', (req: Request, res: Response, next) => {
      const version = `v${req.params.version}`;
      const versionRouter = this.versions.get(version);
      if (!versionRouter) {
        return res.status(404).json({ error: { code: 'UNKNOWN_VERSION', message: `API version ${version} is not supported` } });
      }
      req.url = req.url.replace(`/v${req.params.version}`, '');
      versionRouter(req, res, next);
    });

    // Header versioning as fallback
    router.use((req: Request, res: Response, next) => {
      const version = req.headers['x-api-version'] as string || 'v1';
      const versionRouter = this.versions.get(version);
      if (versionRouter) {
        versionRouter(req, res, next);
      } else {
        next();
      }
    });

    // Default version
    const defaultRouter = this.versions.get('v1');
    if (defaultRouter) {
      router.use(defaultRouter);
    }

    return router;
  }
}

// Usage
const versionRouter = new VersionRouter();
versionRouter.register('v1', v1Router);
versionRouter.register('v2', v2Router);
app.use('/api', versionRouter.getRouter());
```

### Semantic Deprecation Headers
```typescript
function deprecationMiddleware(sunsetDate: string, migrationUrl: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate);
    res.setHeader('Link', `<${migrationUrl}>; rel="successor-version"`);
    res.setHeader('Warning', '299 - "This API version is deprecated. Migrate to the latest version."');
    next();
  };
}

// Per-endpoint deprecation
router.get('/v1/users', deprecationMiddleware('2026-12-31T23:59:59Z', '/v2/users'), v1Handler);
```

## Advanced Query Patterns

### Complex Filter Expressions
```typescript
type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'between' | 'exists';

interface FilterExpression {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

interface CompoundFilter {
  logic: 'and' | 'or' | 'not';
  filters: (FilterExpression | CompoundFilter)[];
}

function buildWhereClause(filter: CompoundFilter, query: KnexQueryBuilder): KnexQueryBuilder {
  switch (filter.logic) {
    case 'and':
      for (const f of filter.filters) {
        if ('logic' in f) {
          query.where(function () { buildWhereClause(f as CompoundFilter, this); });
        } else {
          const expr = f as FilterExpression;
          applyFilter(query, 'and', expr);
        }
      }
      break;
    case 'or':
      query.where(function () {
        for (const f of filter.filters) {
          if ('logic' in f) {
            this.orWhere(function () { buildWhereClause(f as CompoundFilter, this); });
          } else {
            applyFilter(this, 'or', f as FilterExpression);
          }
        }
      });
      break;
    case 'not':
      query.whereNot(function () { buildWhereClause(filter.filters[0] as CompoundFilter, this); });
      break;
  }
  return query;
}

// Usage: GET /users?filter={"logic":"and","filters":[{"field":"age","operator":"gte","value":18},{"field":"status","operator":"in","value":["active","pending"]}]}
```

### Bulk Read Operations
```typescript
// GET /v1/users?ids=id1,id2,id3 — batch by IDs
async function batchRead<T>(ids: string[], fetchFn: (id: string) => Promise<T>): Promise<Map<string, T>> {
  const results = await Promise.allSettled(ids.map(id => fetchFn(id)));
  const map = new Map<string, T>();
  for (let i = 0; i < ids.length; i++) {
    if (results[i].status === 'fulfilled') {
      map.set(ids[i], (results[i] as PromiseFulfilledResult<T>).value);
    }
  }
  return map;
}
```

## Advanced Security Patterns

### HMAC Request Signing
```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function signRequest(method: string, path: string, body: string, timestamp: string, secret: string): string {
  const message = [method, path, body, timestamp].join('\n');
  return createHmac('sha256', secret).update(message).digest('hex');
}

function verifySignature(req: Request, secret: string): boolean {
  const signature = req.headers['x-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;

  // Reject requests older than 5 minutes
  if (Math.abs(Date.now() - new Date(timestamp).getTime()) > 300_000) {
    return false;
  }

  const expected = signRequest(
    req.method,
    req.originalUrl,
    JSON.stringify(req.body),
    timestamp,
    secret
  );

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### JWT Best Practices for APIs
```typescript
interface AccessTokenPayload {
  sub: string;                    // User ID
  iss: string;                    // Issuer
  aud: string;                    // Audience (API identifier)
  exp: number;                    // Expiry (15 minutes)
  iat: number;                    // Issued at
  jti: string;                    // Unique token ID (for revocation)
  scp: string[];                  // Scopes/ permissions
  cid: string;                    // Client ID
  tid?: string;                   // Tenant ID (multi-tenant)
}

// Token validation middleware
function validateToken(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    throw new AuthenticationError('Missing authentication token');
  }

  try {
    const payload = jwt.verify(token, getPublicKey(), {
      algorithms: ['RS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      clockTolerance: 30,  // 30 seconds clock skew
    }) as AccessTokenPayload;

    // Check if token is revoked
    if (isTokenRevoked(payload.jti)) {
      throw new AuthenticationError('Token has been revoked');
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    }
    throw new AuthenticationError('Invalid token');
  }
}
```

## Advanced Rate Limiting Patterns

### Sliding Window Log
```typescript
class SlidingWindowRateLimiter {
  constructor(
    private redis: RedisClient,
    private windowMs: number,
    private maxRequests: number
  ) {}

  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const redisKey = `ratelimit:${key}`;

    // Remove expired entries
    await this.redis.zremrangebyscore(redisKey, 0, windowStart);

    // Count requests in current window
    const count = await this.redis.zcard(redisKey);

    if (count >= this.maxRequests) {
      const oldest = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
      const resetTime = parseInt(oldest[1]) + this.windowMs;
      return { allowed: false, remaining: 0, resetTime };
    }

    // Add current request
    await this.redis.zadd(redisKey, now, `${now}-${crypto.randomUUID()}`);
    await this.redis.expire(redisKey, Math.ceil(this.windowMs / 1000));

    return { allowed: true, remaining: this.maxRequests - count - 1, resetTime: now + this.windowMs };
  }
}
```

### Distributed Rate Limiting with Redis
```typescript
class DistributedRateLimiter {
  constructor(private redis: RedisClient) {}

  async checkLimit(
    key: string,
    maxBurst: number,
    sustainedRate: number,  // requests per second
    windowSize: number      // in seconds
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Math.floor(Date.now() / 1000);
    const redisKey = `ratelimit:${key}`;

    // Generic cell rate algorithm
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local max_burst = tonumber(ARGV[3])
      local rate = tonumber(ARGV[4])

      local last = redis.call('GET', key .. ':last')
      if not last then
        redis.call('SET', key .. ':last', now)
        redis.call('SET', key .. ':tokens', max_burst - 1)
        return {1, max_burst - 1}
      end

      local tokens = tonumber(redis.call('GET', key .. ':tokens') or max_burst)
      local elapsed = now - tonumber(last)
      local new_tokens = math.min(max_burst, tokens + elapsed * rate)

      if new_tokens >= 1 then
        redis.call('SET', key .. ':tokens', new_tokens - 1)
        redis.call('SET', key .. ':last', now)
        redis.call('EXPIRE', key .. ':tokens', window)
        redis.call('EXPIRE', key .. ':last', window)
        return {1, math.floor(new_tokens - 1)}
      else
        return {0, 0}
      end
    `;

    const result = await this.redis.eval(script, [redisKey], [now, windowSize, maxBurst, sustainedRate]);
    return { allowed: result[0] === 1, remaining: result[1] };
  }
}
```

## API Observability

### Structured Request Logging
```typescript
interface RequestLogEntry {
  requestId: string;
  method: string;
  path: string;
  query: Record<string, string>;
  statusCode: number;
  durationMs: number;
  userAgent: string;
  clientIp: string;
  userId?: string;
  apiVersion: string;
  errorCode?: string;
  responseSize: number;
}

function logRequest(req: Request, res: Response, durationMs: number): void {
  const entry: RequestLogEntry = {
    requestId: req.id,
    method: req.method,
    path: req.route?.path || req.path,
    query: req.query as Record<string, string>,
    statusCode: res.statusCode,
    durationMs,
    userAgent: req.headers['user-agent'] || '',
    clientIp: req.ip,
    userId: req.user?.sub,
    apiVersion: req.params.version || req.headers['x-api-version'] as string || 'v1',
    errorCode: res.locals.errorCode,
    responseSize: parseInt(res.getHeader('content-length') as string) || 0,
  };

  if (res.statusCode >= 500) {
    logger.error(entry, 'API request failed');
  } else if (res.statusCode >= 400) {
    logger.warn(entry, 'API client error');
  } else {
    logger.info(entry, 'API request completed');
  }
}
```

### API Metrics
```typescript
// Prometheus-style metrics
const apiMetrics = {
  requestDuration: new Histogram({
    name: 'api_request_duration_seconds',
    help: 'API request duration in seconds',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  }),
  requestTotal: new Counter({
    name: 'api_requests_total',
    help: 'Total API requests',
    labelNames: ['method', 'path', 'status_code'],
  }),
  activeRequests: new Gauge({
    name: 'api_active_requests',
    help: 'Currently active requests',
  }),
  responseSize: new Histogram({
    name: 'api_response_size_bytes',
    help: 'API response size in bytes',
    labelNames: ['path'],
    buckets: [100, 1000, 10000, 100000, 1000000],
  }),
  errorsByCode: new Counter({
    name: 'api_errors_total',
    help: 'API errors by error code',
    labelNames: ['error_code', 'path'],
  }),
};
```

## Advanced GraphQL Patterns

### Federation with Apollo
```typescript
// User service — extends types from other services
const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    name: String!
    reviews: [Review!]!
  }

  extend type Review @key(fields: "id") {
    id: ID! @external
    authorId: ID! @external
    author: User! @requires(fields: "authorId")
  }
`;

const resolvers: Resolvers = {
  User: {
    __resolveReference(ref: { id: string }) {
      return userService.findById(ref.id);
    },
    reviews(user: User) {
      return reviewService.findByAuthorId(user.id);
    },
  },
  Review: {
    author(review: Review) {
      return { __typename: 'User', id: review.authorId };
    },
  },
};
```

### Subscription with Backpressure
```typescript
import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';

const pubsub = new PubSub();

const resolvers = {
  Subscription: {
    orderUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ORDER_UPDATED']),
        (payload, variables) => {
          return payload.orderUpdated.orderId === variables.orderId
            || variables.orderId === '*';
        }
      ),
      resolve: (payload: { orderUpdated: OrderEvent }) => {
        return payload.orderUpdated;
      },
    },
  },
};

// Publisher
pubsub.publish('ORDER_UPDATED', {
  orderUpdated: { orderId: '123', status: 'shipped', timestamp: new Date().toISOString() },
});
```

## API Testing Patterns

### Contract Testing with OpenAPI
```typescript
import { OpenAPIValidator } from 'express-openapi-validator';

// Auto-validate all requests/responses against OpenAPI spec
app.use(
  OpenAPIValidator.middleware({
    apiSpec: './openapi.yaml',
    validateRequests: true,
    validateResponses: true,
    formats: ['email', 'uuid', 'date-time'],
    validateSecurity: true,
  })
);
```

### Snapshot Testing
```typescript
import { expect } from 'vitest';

test('GET /v1/users/:id returns expected shape', async () => {
  const response = await request(app).get('/v1/users/abc123');
  expect(response.status).toBe(200);
  expect(response.body).toMatchSnapshot({
    meta: { requestId: expect.any(String), timestamp: expect.any(String) },
  });
});

test('POST /v1/users validates required fields', async () => {
  const response = await request(app)
    .post('/v1/users')
    .send({ name: 'John' });  // missing email
  expect(response.status).toBe(400);
  expect(response.body.error.details).toContainEqual(
    expect.objectContaining({ field: 'email', reason: 'required' })
  );
});
```

## API Version Lifecycle

### Version States
```
Proposal -> Alpha -> Beta -> GA -> Deprecated -> Sunset -> Removed

Proposal:      RFC, not yet implemented
Alpha:         Internal testing, may break
Beta:          External preview, breaking changes possible
GA:            Stable, backward-compatible changes only
Deprecated:    No new features, bug fixes only, sunset date set
Sunset:        No longer available, returns 410 Gone
Removed:       Endpoint deleted
```

### Version Support Matrix
| Version | Status | Release Date | Sunset Date | Support |
|---------|--------|-------------|-------------|---------|
| v1 | Sunset | 2024-01-15 | 2026-06-30 | Critical bugs only |
| v2 | GA | 2025-03-01 | 2027-12-31 | Full |
| v3 | Beta | 2026-05-01 | N/A | Best effort |
