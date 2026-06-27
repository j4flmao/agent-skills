---
name: backend-database-patterns
description: >
  Use this skill when the user says 'database design', 'schema design', 'query optimization', 'slow query', 'migration', 'index', 'ORM', 'repository pattern', 'N+1 problem', 'transaction', or when designing or troubleshooting the data layer. This skill enforces schema design principles, indexing strategy, N+1 detection and fixing, transaction boundaries, migration best practices, and the repository pattern. Applies to PostgreSQL, MySQL, MongoDB, and ORMs (TypeORM, Prisma, SQLAlchemy, Diesel, GORM, Spring Data). Do NOT use for: API design, caching, or frontend state management.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, database, phase-2, universal]
---

# Backend Database Patterns

## Purpose
Design efficient, maintainable database schemas and queries. Every schema change must be backward-compatible. Every query must be verifiable with EXPLAIN ANALYZE.

## Agent Protocol

### Trigger
Exact user phrases: "database design", "schema design", "query optimization", "slow query", "migration", "index", "ORM pattern", "repository pattern", "N+1 problem", "transaction", "table design", "data model".

### Input Context
Before activating, verify:
- The database type is known (PostgreSQL, MySQL, MongoDB, SQLite).
- The ORM or query framework is known (TypeORM, Prisma, SQLAlchemy, Diesel, GORM, Spring Data JDBC/JPA).
- The specific schema, query, or problem is described.

### Output Artifact
No file output unless requested. Produces text guidance.

### Response Format
Schema design:
```
## {entity}
| Field | Type | Constraints | Index |
|-------|------|-------------|-------|
```

Query fix:
```
## Problem: {description}
Root cause: {specific cause}
Fix: {specific change}
Verification: EXPLAIN ANALYZE {query}
```

Migration:
```
## Migration: {description}
Up: {SQL}
Down: {SQL}
Backward-compatible: {yes/no}
```

### Completion Criteria
- [ ] Schema design follows normalization principles (3NF by default).
- [ ] Indexes are specified for every foreign key and filtered column.
- [ ] N+1 queries are identified and fixed.
- [ ] Migration includes up AND down scripts.
- [ ] Migration is verified to be backward-compatible.
- [ ] Transaction boundaries are documented.

### Max Response Length
Schema: unlimited. Query fix: 6 lines. Migration: 10 lines.

## Architecture Decision Tree

### Normalize or Denormalize?

```
Is the data write-heavy with complex relationships?
  ├── Yes → Normalize (3NF by default)
  └── No → Is there a proven read performance problem (profiled)?
            ├── Yes → Denormalize (with documented trade-offs)
            └── No → Normalize first, optimize later
```

### Primary Key Choice

```
Is the system single-node with no sharding?
  ├── Yes → BIGSERIAL (auto-increment)
  └── No → Is time-sortable ordering needed?
            ├── Yes → UUID v7 (time-ordered, distributed-safe)
            └── No → UUID v4 (random, distributed-safe)
```

### Index Type Selection

```
Query pattern:
  ├── Equality lookup (WHERE x = ?) → B-tree
  ├── Range query (WHERE x BETWEEN ? AND ?) → B-tree
  ├── Multi-column filter → Composite B-tree (high-selectivity first)
  ├── Partial subset → Partial index (WHERE status = 'active')
  ├── Full-text search → GIN (tsvector)
  ├── JSON/array containment → GIN (jsonb, @>)
  ├── Geospatial query → GiST (geography, geometry)
  └── All columns in query → Covering index (INCLUDE)
```

### ORM vs Raw SQL?

```
What is your priority?
  ├── Developer productivity, CRUD-heavy → ORM (Prisma, TypeORM, SQLAlchemy)
  ├── Complex queries, performance-critical → Raw SQL + query builder (kysely, SQLAlchemy core)
  ├── Migration management → ORM migrations or standalone (Alembic, Flyway)
  └── Need both → Repository pattern with ORM for 80%, raw SQL for 20%
```

## Workflow

### Step 1: Schema Design
- Normalize to 3NF by default. Denormalize only when a performance measurement proves it necessary.
- UUID v7 for primary keys (time-sortable, no collisions in distributed systems).
- Every table has: id (UUID PK), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ).
- Soft deletes: use deleted_at TIMESTAMPTZ or is_active boolean.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
```

### Step 2: Indexing Strategy
| Index Type | When | Example |
|------------|------|---------|
| B-tree | Equality and range lookups | `WHERE status = 'active'` |
| Composite B-tree | Multi-column filters | `WHERE status = 'active' AND created_at > '2026-01-01'` |
| Partial | Filtered subset | `WHERE status = 'active'` on 10M rows, 90% inactive |
| Covering | All columns in query covered | Include selected columns to avoid heap lookups |
| GIN | JSON, arrays, full-text | `WHERE tags @> ['urgent']` |
| Unique | Uniqueness enforcement | `WHERE email IS NOT NULL` |
| BRIN | Large, naturally-ordered data | Time-series data, logs |
| Hash | Equality only, large values | URL lookup (smaller than B-tree) |

### Step 3: N+1 Detection and Fix
```typescript
// N+1 — BAD
const users = await db.user.findMany();  // 1 query
for (const user of users) {
  const posts = await db.post.findMany({ where: { userId: user.id } });  // N queries
}

// Fixed — eager loading
const users = await db.user.findMany({ include: { posts: true } });  // 1 query with JOIN
```

```python
# N+1 — BAD
users = await User.objects.all()  # 1 query
for user in users:
    posts = await Post.objects.filter(user=user).all()  # N queries

# Fixed — select_related
users = await User.objects.select_related('posts').all()  # 1 query
```

### Step 4: Migration Best Practices
1. Every migration must have BOTH up and down scripts.
2. All migrations must be backward-compatible.
3. Three-phase destructive changes:
   - Phase 1: Add new column/table. Dual-write to old and new.
   - Phase 2: Backfill data. Switch reads to new. Verify consistency.
   - Phase 3 (after monitoring period): Remove old column/table.
4. Never drop a column in the same deployment that stops writing to it.
5. Test migrations against a copy of production data before running in production.

```sql
-- Phase 1: Add new column, dual-write
ALTER TABLE orders ADD COLUMN status_v2 VARCHAR(20);
-- Application writes to both `status` (old) and `status_v2` (new)

-- Phase 2: Backfill and switch reads
UPDATE orders SET status_v2 = status WHERE status_v2 IS NULL;
-- Application reads from `status_v2`, writes to `status_v2` only

-- Phase 3: Remove old column
ALTER TABLE orders DROP COLUMN status;
```

### Step 5: Transaction Boundaries
- Transactions belong in Application use cases, NOT in controllers or repositories.
- Keep transactions as short as possible.
- Never hold a transaction open during external API calls or file I/O.
- Use Unit of Work pattern for coordinating multiple repository operations.

```typescript
class TransferFundsHandler {
  async execute(command: TransferFundsCommand): Promise<Result> {
    return this.unitOfWork.execute(async () => {
      const from = await this.accountRepo.findById(command.fromAccountId);
      const to = await this.accountRepo.findById(command.toAccountId);
      from.withdraw(command.amount);
      to.deposit(command.amount);
      await this.accountRepo.save(from);
      await this.accountRepo.save(to);
      return Result.success();
    });
  }
}
```

### Step 6: Repository Pattern
```
Interface (Domain):
  interface UserRepository {
    findById(id: UserId): Promise<User | null>
    findByEmail(email: Email): Promise<User | null>
    save(user: User): Promise<void>
  }

Implementation (Infrastructure):
  class PostgresUserRepository implements UserRepository {
    constructor(private db: Database) {}
    // ORM-specific implementation, mapped to Domain entity
  }
```

### Step 7: Pagination Patterns

```sql
-- OFFSET-based (BAD for large datasets — scans skipped rows)
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 40;

-- Keyset / cursor-based (GOOD — uses index, constant time)
SELECT * FROM orders WHERE id > 'last-uuid' ORDER BY id LIMIT 20;
```

```typescript
// Keyset pagination with composite cursor
async function paginateOrders(cursor?: { id: string; createdAt: Date }, limit = 20) {
  return db.order.findMany({
    where: cursor ? {
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
    } : undefined,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
  });
}
```

### Step 8: View / Materialized View Patterns

```sql
-- Materialized view for expensive aggregations
CREATE MATERIALIZED VIEW monthly_sales AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS order_count,
  SUM(total_amount) AS revenue
FROM orders
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
WITH DATA;

-- Refresh on schedule (not on every write)
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales;
```

## Query Optimization

### EXPLAIN ANALYZE Checklist
```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = '123' AND status = 'pending';

-- What to check:
-- 1. Seq Scan vs Index Scan → Seq Scan means missing index
-- 2. Actual rows vs estimated rows → Large difference means stale statistics
-- 3. Execution time → Is it acceptable?
-- 4. Nested Loop vs Hash Join → Nested Loop with many rows means missing index
```

### Common Optimization Patterns
| Problem | Pattern | Fix |
|---------|---------|-----|
| Seq scan on large table | Missing index | Add index on filtered columns |
| Slow JOIN | Missing FK index | Index all foreign keys |
| Slow ORDER BY | Sort-based | Index on sort column |
| Slow COUNT(*) on big table | Full scan | Use approximate count or index-only scan |
| Slow pagination | OFFSET-based | Use keyset pagination (WHERE id > ?) |
| Slow DISTINCT | Sort-based | Add index on distinct column |
| Slow GROUP BY | Hash/sort | Add index on group + aggregate columns |

### Query Tuning Workflow

```
1. Identify slow query (APM, pg_stat_statements, slow query log)
2. Run EXPLAIN ANALYZE
3. Check for Seq Scan → Add index
4. Check for sort (filesort) → Add index on sort column
5. Check row estimate vs actual → Run ANALYZE
6. Check for Nested Loop with large outer → Consider Hash Join or better index
7. Measure improvement, repeat if needed
```

## Performance

### Connection Pool Configuration
```yaml
# PostgreSQL connection pool
pool:
  min: 2          # Keep at least 2 connections
  max: 20         # Max connections (CPU cores × 2 + disk)
  idleTimeout: 10000     # Close idle connections after 10s
  acquireTimeout: 30000  # Wait 30s before timing out
  maxUses: 5000          # Recycle connection after 5000 uses
```

### Batch Operations
```typescript
// Batch insert — avoid individual INSERT statements
await db.insert(users).values([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  // ... up to 1000 rows
]);
```

### Read Replicas
```
Write → Primary node
Read  → Replica nodes (load-balanced)

Application patterns:
  - Use read replicas for reporting, analytics, background jobs
  - Be aware of replication lag (typically <100ms in same region)
  - Read-your-writes: after a write, route reads to primary for N seconds
  - Never assume replica is fully in sync with primary
```

## Security

### SQL Injection Prevention
```typescript
// BAD — string interpolation
await db.query(`SELECT * FROM users WHERE email = '${email}'`);  // SQL injection!

// GOOD — parameterized query
await db.query('SELECT * FROM users WHERE email = $1', [email]);
await db.user.findUnique({ where: { email } });  // ORM handles parameterization
```

### Least Privilege
```sql
-- Application user should have minimal permissions
GRANT SELECT, INSERT, UPDATE ON orders TO app_user;
GRANT USAGE ON SEQUENCE orders_id_seq TO app_user;
-- No DELETE, no DROP, no schema modifications
```

## Anti-Patterns

1. **SELECT \***: Retrieves more columns than needed, breaks index-only scans.
2. **No migration down script**: Makes rollbacks impossible.
3. **Breaking migration**: Adding NOT NULL without default to existing table.
4. **N+1 in API response**: Lazy-loading in serializers causes N+1 queries.
5. **Too many indexes**: Each INSERT/UPDATE has to update all indexes.
6. **No FK indexes**: DELETE on parent locks full child table scan.
7. **Oversized transactions**: Holding transactions during API calls or file I/O.
8. **Enum as string**: Using VARCHAR with app-level validation instead of native DB enum.
9. **Missing unique constraint**: Relying on application-level uniqueness only.
10. **No read replicas for reporting**: Heavy reporting queries impact user-facing transactions.
11. **Connection leak**: Not releasing connections in all code paths.
12. **Lazy loading in serializers**: N+1 generated by framework serialization.

## Rules
- Never expose raw database entities (ORM models) outside the Infrastructure layer.
- Always use parameterized queries. Never string interpolation in SQL.
- Every SELECT explicitly lists columns. No SELECT *.
- Migrations must be reviewed and tested. Never run untested migrations on production.
- Before optimizing, run EXPLAIN ANALYZE. Assumptions are often wrong.
- Index every foreign key column.
- Every migration has both up and down scripts.
- Soft deletes by default. Hard deletes are a privileged operation.
- Transactions belong in Application layer, never in controllers or repositories.
- Use keyset pagination for large datasets, never OFFSET.
- Test migrations against production-sized data before deployment.
- Always use native DB enums instead of VARCHAR with app-level validation.

## References
  - references/connection-pooling.md — Connection Pooling
  - references/database-fundamentals.md — Database Patterns Fundamentals
  - references/database-migration-patterns.md — Database Migration Patterns
  - references/database-sharding.md — Database Sharding
  - references/database-testing.md — Database Testing
  - references/migration-guide.md — Database Migration Guide
  - references/migration-strategies.md — Migration Strategies
  - references/query-optimization.md — Database Query Optimization Guide
  - references/table-design-rules.md — Table Design Rules
  - references/transaction-isolation.md — Transaction Isolation Levels
## Handoff
No artifact produced.
Next skill: backend-auth-patterns — secure the data layer.
Carry forward: schema design, repository interfaces, database type, ORM framework.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.