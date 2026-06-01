# API Design Performance

## Response Optimization

### Compression
- Use Brotli for JSON responses (30% smaller than Gzip at level 6)
- Gzip as fallback for clients without Brotli support
- Compress only responses >1KB (smaller responses cost more CPU to compress than bandwidth saved)
- Skip compression for streaming responses

### Payload Minimization
- Paginate all list endpoints with sensible defaults (limit=20, max=100)
- Implement sparse fieldsets (`?fields=id,name`)
- Remove null fields from JSON responses (`omitempty` in Go, `JsonIgnore(null)` in C#)
- Use integer enums instead of string enums in high-throughput APIs
- Flatten nested objects where possible (avoid >3 levels)
- Use compact JSON serialization (no whitespace)

### Connection Management
- HTTP/2 multiplexing for concurrent requests over single connection
- Keep-alive connections with 60s timeout for client-to-server
- Connection pooling with max 50 sockets per upstream host
- TCP fast open for reduced connection setup latency

## Database Query Optimization for APIs

### N+1 Prevention
```typescript
// Bad: N+1 queries
const orders = await db('orders').where('user_id', userId);
for (const order of orders) {
  order.items = await db('order_items').where('order_id', order.id);
}

// Good: JOIN
const orders = await db('orders')
  .join('order_items', 'orders.id', 'order_items.order_id')
  .where('orders.user_id', userId);

// Good: Batch loading
const orders = await db('orders').where('user_id', userId);
const orderIds = orders.map(o => o.id);
const items = await db('order_items').whereIn('order_id', orderIds);
const itemsByOrder = groupBy(items, 'order_id');
```

### Partial Response for Large Payloads
```typescript
// Accept-Patch / Range request for partial content
app.get('/v1/orders/:id', (req, res) => {
  const fields = req.query.fields?.split(',');

  if (fields) {
    // Only fetch requested fields from DB
    const requestedFields = fields.filter(f => ALLOWED_FIELDS.has(f));
    const order = await db('orders')
      .select(requestedFields)
      .where('id', req.params.id)
      .first();
    return res.json(order);
  }

  const order = await db('orders').where('id', req.params.id).first();
  res.json(order);
});
```

## Caching Strategies

### HTTP Caching Headers
```
Cache-Control: public, max-age=3600          — Public cache, 1 hour
Cache-Control: private, max-age=60           — User-specific, 1 minute
Cache-Control: no-cache                      — Revalidate with server
Cache-Control: no-store                       — Never cache
ETag: "abc123"                                — Version identifier
Last-Modified: Wed, 21 Oct 2025 07:28:00 GMT — Modification timestamp
```

### Cache Invalidation
- Time-based (TTL expiry)
- Event-driven (publish invalidation on resource update)
- Version-bumped (increment resource version on change)
- Pattern-based (purge by prefix: `users:*`)

### CDN Configuration
```yaml
# CloudFront / CDN caching rules
cache_behavior:
  /api/v1/products/*:
    ttl: 3600
    stale_while_revalidate: 86400
    query_string: true
    cookies: none
    
  /api/v1/users/*:
    ttl: 0
    forwarded_headers: [Authorization]
    
  /api/v1/search:
    ttl: 60
    query_string: true
```

## Database Indexing for API Queries

### Common API Query Patterns
```sql
-- List with filter and sort
CREATE INDEX idx_users_status_created ON users(status, created_at DESC);

-- Resource by parent
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Search by name
CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);

-- Unique lookup
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
```

### Composite Index Column Order
Place most selective (highest cardinality) column first:
```sql
-- Good: status has ~5 values, created_at is unique per row
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Bad: same index but worse for equality+range queries
-- (if filtering by status and sorting by created_at)
```

## Performance Testing

### Load Test Template
```typescript
import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady
    { duration: '2m', target: 200 },   // Spike
    { duration: '3m', target: 200 },   // Sustained spike
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const responses = http.batch([
    ['GET', 'https://api.example.com/v1/users?page=1&limit=20'],
    ['GET', 'https://api.example.com/v1/products?page=1&limit=20'],
  ]);

  responses.forEach(res => {
    check(res, {
      'status is 200': r => r.status === 200,
      'response time < 500ms': r => r.timings.duration < 500,
    });
  });

  sleep(1);
}
```

## Performance Budget

| Metric | Target | Alert | Critical |
|--------|--------|-------|----------|
| p50 response time | <100ms | >200ms | >500ms |
| p95 response time | <300ms | >500ms | >1000ms |
| p99 response time | <500ms | >1000ms | >2000ms |
| Error rate | <0.1% | >0.5% | >1% |
| Throughput per endpoint | >1000 req/s | <500 req/s | <100 req/s |
| Payload size (list) | <50KB | >100KB | >500KB |
| Cache hit ratio | >80% | <70% | <50% |
