# Audit Log Architecture

## Audit Pipeline Components

```
Application → Audit Collector → Audit Store → Audit Query API → Compliance Dashboard
                                    ↓
                              Archive (S3/Glacier)
```

## Collector Patterns

| Pattern | Approach | Latency | Best For |
|---------|----------|---------|----------|
| Middleware | HTTP/gRPC interceptor captures request context | Synchronous | Request-scoped audit |
| AOP/Decorator | Method-level annotation on domain services | Synchronous | Domain event audit |
| Async Queue | Emit audit event to queue, separate consumer writes | Async (seconds) | High-throughput systems |
| Database Trigger | `AFTER INSERT/UPDATE/DELETE` triggers | Synchronous | Direct DB access audit |

## Middleware-Based Collector

```typescript
// Express middleware — captures every request
function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    if (isAuditable(req.method, req.path)) {
      auditLog.append({
        eventType: `api.${req.method.toLowerCase()}`,
        actorId: req.user?.id || 'anonymous',
        actorType: req.user ? 'user' : 'api',
        resourceType: extractResource(req.path),
        resourceId: req.params.id,
        action: methodToAction(req.method),
        metadata: { ip: req.ip, duration: Date.now() - start, statusCode: res.statusCode },
      });
    }
  });
  next();
}
```

## AOP Decorator Collector

```typescript
// Decorator-based — captures domain service calls
function Auditable(eventType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const result = await original.apply(this, args);
      auditLog.append({
        eventType,
        actorId: args[0]?.userId || 'system',
        actorType: 'system',
        resourceType: target.constructor.name,
        action: 'update',
        metadata: { arguments: sanitize(args) },
      });
      return result;
    };
  };
}
```

## Storage Backend Comparison

| Store | Pros | Cons | Best For |
|-------|------|------|----------|
| PostgreSQL | ACID, hash chain, queryable | Storage cost, performance at scale | Low-moderate volume (<1M events/day) |
| Amazon QLDB | Immutable by design, cryptographic verification | AWS lock-in, limited query | Regulatory compliance |
| MongoDB Append-only | Flexible schema, TTL indexes | No built-in immutability | High-volume, flexible schema |
| Elasticsearch | Full-text search, aggregation | Not append-only by default | Log analysis and search |

## Query API Design

```typescript
class AuditQueryService {
  async query(filters: AuditQuery): Promise<PaginatedResult<AuditEvent>> {
    const query = this.buildQuery(filters);
    return this.store.query(query);
  }

  private buildQuery(filters: AuditQuery): QuerySpec {
    return {
      where: {
        eventType: filters.eventTypes ? { in: filters.eventTypes } : undefined,
        actorId: filters.actorId ? { eq: filters.actorId } : undefined,
        timestamp: {
          gte: filters.from || moment().subtract(30, 'days'),
          lte: filters.to || moment(),
        },
        resourceType: filters.resourceType ? { eq: filters.resourceType } : undefined,
      },
      orderBy: { timestamp: 'DESC' },
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }
}
```

## Retention and Archival

```yaml
retention:
  hot:
    duration: 7 days
    storage: primary database
    queryable: full API
  warm:
    duration: 1 year
    storage: S3/Glacier JSON lines
    queryable: delayed (restore from archive)
  cold:
    duration: 7 years
    storage: Glacier Deep Archive
    queryable: manual restore only
```

## Hash Chain Verification

```sql
-- Periodically verify chain integrity (cron job)
WITH chain_verify AS (
  SELECT id, hash, previous_hash,
    LAG(hash) OVER (ORDER BY id) AS expected_previous
  FROM audit_log
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
)
SELECT COUNT(*) AS broken_links
FROM chain_verify
WHERE id != (SELECT MIN(id) FROM chain_verify)
  AND previous_hash != expected_previous;
```

## Performance Considerations

- Batch writes: insert 100-500 events per batch instead of single inserts
- Partition by time: `audit_log_2026_05`, `audit_log_2026_06`
- Archive index: only index hot storage; warm storage uses file-level metadata
- Read replicas: route audit queries to read replicas, never primary
