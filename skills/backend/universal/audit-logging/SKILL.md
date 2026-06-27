---
name: backend-audit-logging
description: >
  Use this skill when the user says 'audit log', 'audit trail', 'compliance logging', 'tamper-evident log', 'immutable log', 'audit table', 'change tracking', 'who changed what', 'data provenance', 'audit events', 'reporting log'. This skill implements immutable audit trails for compliance (SOC 2, SOX, HIPAA, GDPR). Applies to any backend stack. Do NOT use for: application logging (error logs, debug logs), metrics, or tracing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, audit-logging, compliance, security, immutable]
---

# Backend Audit Logging

## Purpose
Record every sensitive data access and state change in an immutable, tamper-evident audit trail for regulatory compliance (SOC 2, SOX, HIPAA, GDPR).

## Agent Protocol

### Trigger
Exact user phrases: "audit log", "audit trail", "compliance logging", "tamper-evident log", "immutable log", "audit table", "change tracking", "who changed what", "data provenance", "audit events", "reporting log".

### Input Context
- Regulatory framework (SOC 2, SOX, HIPAA, GDPR, PCI-DSS).
- Data classification and sensitive fields.
- Existing database and storage infrastructure.
- Retention requirements.

### Output Artifact
Audit log schema or implementation code. No file unless requested.

### Response Format
```
Event: {event type}
Actor: {user/system}
Resource: {resource type}:{id}
Action: {read|create|update|delete}
```

### Completion Criteria
- [ ] Audit events recorded for all sensitive operations
- [ ] Audit log is append-only (immutable)
- [ ] Tamper evidence implemented (hash chain or similar)
- [ ] Retention policy configured
- [ ] Audit logs queryable by actor, resource, and time range

## Architecture Decision Trees

### Storage Backend Decision Tree
```
What is the primary compliance requirement?
├── SOC 2 / SOX → PostgreSQL with hash chain (append-only table, partition by month)
├── HIPAA → Encrypted database with strict access controls + hash chain + 6-year retention
├── GDPR → Searchable storage with data deletion capability (anonymization, not deletion)
├── PCI-DSS → Immutable log with strict access controls, 1-year retention, quarterly review
└── General compliance → Cloud-native audit service (AWS CloudTrail, Azure Monitor)

What is the write volume?
├── < 1000 events/sec → Relational database (PostgreSQL, MySQL) with hash chain
├── 1000–10000 events/sec → Time-series database (TimescaleDB, ClickHouse)
└── > 10000 events/sec → Log aggregator (Elasticsearch) + batched hash chain
```

### Tamper Evidence Decision Tree
```
Is tamper evidence required by compliance framework?
├── Yes → Is regulatory framework HIPAA or PCI-DSS?
│   ├── Yes → Hash chain with periodic verification (quarterly) + external audit service
│   └── No → Hash chain (SHA-256 linked list) or digital signature per entry
└── No → Append-only table with database-level access controls (no hash chain needed)

Volume consideration:
├── Single DB (<1000/s) → Hash chain linking each row via previous_hash
├── Medium (1000–10000/s) → Batch Merkle tree, publish root hash periodically
└── High (>10000/s) → Periodic hash anchor (chain per batch, not per event)
```

### Audit Event Schema Decision Tree
```
What needs to be recorded?
├── Just who did what? → Minimal: actor, action, resource, timestamp
├── Plus what changed? → Standard: + resource_id, changes (diff), metadata, correlation_id
├── Plus proof of integrity? → Complete: + previous_hash, hash, digital_signature
└── Multi-tenant? → Complete + tenant_id
```

## Workflow

### Step 1: Define Audit Events

```yaml
events:
  user.access:       User accessed PII data
  user.update:       User profile updated
  payment.process:   Payment initiated or completed
  role.change:       User role or permission changed
  data.export:       Data exported (GDPR SAR)
  data.deletion:     Data deleted (right to be forgotten)
  settings.change:   System configuration changed
  auth.login:        User authentication succeeded
  auth.logout:       User session ended
  auth.failed:       Authentication failed
  admin.action:      Administrative action performed
  integration.call:  External API call made
  data.masked:       Sensitive data masked
  consent.granted:   User consent recorded
  consent.revoked:   User consent revoked
```

### Step 2: Create Audit Table (PostgreSQL)

```sql
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  event_type      VARCHAR(50) NOT NULL,
  actor_id        VARCHAR(100) NOT NULL,
  actor_type      VARCHAR(20) NOT NULL,   -- 'user' | 'system' | 'api'
  resource_type   VARCHAR(50) NOT NULL,
  resource_id     VARCHAR(100),
  action          VARCHAR(10) NOT NULL,   -- 'create' | 'read' | 'update' | 'delete'
  changes         JSONB,                  -- diff of old/new values
  metadata        JSONB,                  -- IP, user-agent, requestId
  correlation_id  VARCHAR(64),            -- trace across services
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash            VARCHAR(64),            -- SHA-256 of previous row + this row data
  previous_hash   VARCHAR(64),
  tenant_id       VARCHAR(50),             -- for multi-tenant systems
  event_version   INT DEFAULT 1
);

-- Prevent UPDATE/DELETE via trigger
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log is append-only. UPDATE and DELETE are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER prevent_audit_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- Indexes for common queries
CREATE INDEX idx_audit_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_actor ON audit_log(actor_id, actor_type);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_occurred_at ON audit_log(occurred_at);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id) WHERE tenant_id IS NOT NULL;

-- Partition by month
CREATE TABLE audit_log_2026_01 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_log_2026_02 PARTITION OF audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### Step 3: Implement Hash Chain

```typescript
import { createHash } from 'crypto';

async function appendAuditLog(event: AuditEvent, db: Database): Promise<void> {
  const lastRow = await db.query('SELECT id, hash FROM audit_log ORDER BY id DESC LIMIT 1');
  const previousHash = lastRow.rows[0]?.hash || '';

  // Build entry with hash chain
  const entry = { ...event, previousHash };
  const canonicalData = canonicalize(entry);
  entry.hash = createHash('sha256')
    .update(previousHash + canonicalData)
    .digest('hex');

  await db.query('INSERT INTO audit_log SET ?', entry);
}

function canonicalize(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

// Hash chain verification
async function verifyChainIntegrity(db: Database): Promise<{ chainIntact: boolean; brokenLinks: number }> {
  const result = await db.raw(`
    SELECT COUNT(*) as broken FROM (
      SELECT id, hash, previous_hash,
        LAG(hash) OVER (ORDER BY id) as expected_previous
      FROM audit_log
    ) sub
    WHERE sub.previous_hash != COALESCE(sub.expected_previous, '')
  `);
  return { chainIntact: Number(result.rows[0].broken) === 0, brokenLinks: Number(result.rows[0].broken) };
}
```

### Step 4: Emit Audit Events from Code

```typescript
// ORM hook or middleware
auditService.append({
  eventType: 'user.update',
  actorId: req.user.id,
  actorType: 'user',
  resourceType: 'user_profile',
  resourceId: profileId,
  action: 'update',
  changes: diff(oldProfile, newProfile),  // Only non-sensitive fields
  metadata: {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.id,
  },
  correlationId: req.correlationId,
});
```

**Python example:**
```python
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import hashlib, json

@dataclass
class AuditEvent:
    event_type: str
    actor_id: str
    actor_type: str
    resource_type: str
    resource_id: str
    action: str
    changes: dict | None = None
    metadata: dict | None = None
    correlation_id: str = ""
    tenant_id: str = ""
    occurred_at: str = ""

class AuditService:
    def __init__(self, db):
        self.db = db

    async def append(self, event: AuditEvent):
        event.occurred_at = datetime.now(timezone.utc).isoformat()
        last = await self.db.fetch("SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1")
        previous_hash = last[0]["hash"] if last else ""

        data = {**asdict(event), "previous_hash": previous_hash}
        canonical = json.dumps(data, sort_keys=True)
        data["hash"] = hashlib.sha256((previous_hash + canonical).encode()).hexdigest()

        await self.db.execute("INSERT INTO audit_log VALUES (...)", data)
```

### Step 5: Audit Query Service

```typescript
class AuditQueryService {
  async search({ actorId, resourceType, eventType, from, to, page, limit }: AuditSearchParams): Promise<AuditSearchResult> {
    let query = knex('audit_log')
      .where('occurred_at', '>=', from)
      .where('occurred_at', '<=', to);

    if (actorId) query.where('actor_id', actorId);
    if (resourceType) query.where('resource_type', resourceType);
    if (eventType) query.where('event_type', eventType);

    const total = await query.clone().count('id as count').first();
    const rows = await query
      .orderBy('occurred_at', 'desc')
      .offset((page - 1) * limit)
      .limit(limit);

    return { rows, total: Number(total.count), page, limit };
  }

  async verifyIntegrity(): Promise<{ chainIntact: boolean }> {
    const result = await db.raw(`
      SELECT COUNT(*) as broken FROM (
        SELECT id, hash, previous_hash,
          LAG(hash) OVER (ORDER BY id) as expected_previous
        FROM audit_log
      ) sub
      WHERE sub.previous_hash != COALESCE(sub.expected_previous, '')
    `);
    return { chainIntact: Number(result.rows[0].broken) === 0 };
  }
}
```

### Step 6: Implement Retention and Archival

```
Tier 1: Hot storage (7-30 days) — queryable via API, online (SSD)
Tier 2: Warm storage (1 year) — queryable with delay (S3/Parquet export, query via Athena)
Tier 3: Cold storage (7 years) — archived, not directly queryable (Glacier/Deep Archive)
```

```typescript
class AuditArchivalService {
  async archiveToS3(endDate: Date): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await knex('audit_log')
      .where('occurred_at', '<', endDate)
      .where('occurred_at', '>=', thirtyDaysAgo);

    // Write to Parquet in S3
    await s3.putObject({
      Bucket: 'audit-archive',
      Key: `year=${endDate.getUTCFullYear()}/month=${endDate.getUTCMonth() + 1}/audit.parquet`,
      Body: await toParquet(rows),
    });

    // Delete from hot storage
    await knex('audit_log')
      .where('occurred_at', '<', endDate)
      .delete();
  }
}
```

## Production Considerations

### Write Performance
- Audit log writes must be asynchronous — never block the request path
- Use a message queue (Kafka, RabbitMQ, SQS) between application and audit storage
- Batch writes: collect events for 100ms or 100 events, then flush
- Hash computation adds ~0.1ms per entry — negligible for <1000/s
- For high-volume, use batch hash chains (Merkle tree per batch, not per entry)

### Compliance Requirements Per Framework

| Framework | Retention | Review Frequency | Special Requirements |
|-----------|-----------|-----------------|---------------------|
| SOC 2 | 12 months minimum | Quarterly | Access control, tamper evidence |
| SOX | 7 years | Annual | Immutable, auditor access |
| HIPAA | 6 years | Annual | Encryption, access logs, BAA |
| GDPR | Until consent revoked | On request | Erasure capability, consent tracking |
| PCI-DSS | 12 months | Quarterly | Cardholder data protection, logging |

### ClickHouse for High-Volume Audit
```sql
CREATE TABLE audit_log (
    event_type String,
    actor_id String,
    actor_type String,
    resource_type String,
    resource_id String,
    action String,
    changes String,
    metadata String,
    correlation_id String,
    tenant_id String,
    occurred_at DateTime('UTC'),
    event_version UInt8,
    hash String,
    previous_hash String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (occurred_at, event_type, actor_id)
TTL occurred_at + INTERVAL 7 YEAR DELETE;
```

## Anti-Patterns

### Anti-Pattern 1: Logging Sensitive Values in Diff
Recording actual SSN, credit card numbers, or passwords in the changes diff.
Fix: Use tokenization or masking — show that a field changed, not what it changed to.

### Anti-Pattern 2: No Correlation ID Across Services
Each service logs audit events independently without a common trace ID.
Fix: Propagate correlation ID through all services, include in every audit event.

### Anti-Pattern 3: Blocking on Audit Writes
Using synchronous DB inserts for audit logging impacts main request latency.
Fix: Use async writes, message queues, or background batch processing.

### Anti-Pattern 4: Single Point of Failure in Chain
Running hash chain on a single database without monitoring.
Fix: Implement periodic verification, remote backups, alert on chain breaks.

### Anti-Pattern 5: Ignoring Clock Skew
Distributed systems log events with different server clocks.
Fix: NTP-synchronized clocks, log in UTC, timestamp at application layer not database.

### Anti-Pattern 6: No Audit Coverage for System Actions
Auditing only user actions but missing cron jobs, background workers, admin scripts.
Fix: Every state change must be audited regardless of initiator.

### Anti-Pattern 7: Monolithic Audit Table
Single audit_log table for all event types creates query performance issues.
Fix: Partition by time or use separate tables for different event categories.

### Anti-Pattern 8: Mutable Audit Log
Allowing UPDATE or DELETE on audit records defeats the purpose.
Fix: Database triggers to prevent mutations, restricted permissions.

## Security Considerations

### Access Control
- Role-based access for audit log queries (auditor, admin, security)
- Read-only access for most roles
- No one (including DBAs) can delete audit log entries
- Audit log access is itself audited
- Encrypt sensitive fields within audit entries

### Immutability Enforcement
- Database triggers to prevent UPDATE/DELETE
- Application-level write-once check (reject updates to existing entries)
- WORM storage at the filesystem level for archived data
- Restricted database permissions (INSERT only for app user)
- Hash chain verification detects any tampering

### Encryption
- Encrypt audit log at rest (TDE or column-level encryption)
- Encrypt sensitive fields (PII, PHI) within the audit entry
- Use separate encryption keys for audit data
- Key rotation without data re-encryption (envelope encryption)

## Comparative Analysis

### Hash Chain vs WORM Storage vs Digital Signatures
| Aspect | Hash Chain | WORM Storage | Digital Signatures |
|--------|------------|-------------|-------------------|
| Tamper detection | Verifiable by anyone | Physical immutability | Verifiable with public key |
| Implementation | Application-level | Storage-level | Application-level |
| Cost | Low (in-DB) | Medium (specialized HW) | Low (compute only) |
| Performance | ~0.1ms per entry | Writes are cheap | ~1ms per entry |
| Key management | None | None | Private key protection |
| Compliance acceptance | Widely accepted | Gold standard | Accepted |

### Database Audit vs Application Audit
| Aspect | Database Audit (pgAudit) | Application Audit |
|--------|-------------------------|-------------------|
| Granularity | Row-level, all changes | Business context |
| Context | SQL statements only | Actor, reason, business action |
| Coupling | Zero (DB plugin) | Application code required |
| Tamper evidence | DB-level | Application-level hash chain |
| Queryability | SQL only | Rich API with business filters |
| Performance overhead | 5-15% on DB | Minimal (async) |

### PostgreSQL vs Elasticsearch vs ClickHouse
| Aspect | PostgreSQL | Elasticsearch | ClickHouse |
|--------|-----------|---------------|------------|
| Write throughput | <5000/s | 5000-50000/s | >50000/s |
| Query latency | <10ms | <100ms | <50ms |
| Compression | 2:1 | 3:1 | 5-10:1 |
| Hash chain support | Native | Requires external | Requires external |
| Operational complexity | Low | High | Medium |

## Performance Considerations
- Async writes via message queue to avoid blocking requests
- Batch inserts (100 records or 100ms window) for throughput
- Partition by month for query performance and archival
- Archive data > retention to Parquet/ORC on object storage
- Index only columns used in common queries — avoid over-indexing
- Hash computation: SHA-256 of ~1KB = ~0.05ms. Negligible.
- For >100K events/sec, use Kafka + Flink + ClickHouse pipeline
- Cold data in object storage costs ~$0.023/GB/month (S3 Glacier)

## Rules
- Audit logs are append-only. Never UPDATE or DELETE rows.
- Always record who (actor), what (action), when (timestamp), and what changed (diff).
- Include a hash chain for tamper evidence. Verify chain integrity quarterly.
- Never log actual sensitive values in the diff. Log that access occurred and mask values.
- Time must be in UTC with timezone, never server local time.
- Retention policy must meet the strictest regulatory requirement (usually 7 years).
- Reject any request that does not include audit context (actor, resource, action).
- Test tamper detection regularly (at least quarterly for SOC 2).
- Include correlation IDs for cross-service traceability.
- Partition or archive data older than retention period — do not delete.
- Make audit logs queryable by actor, resource type, event type, and time range.
- Implement role-based access control on audit log access.
- Monitor audit log write failures and alert immediately.

## References
- `references/audit-log-architecture.md` — Architectural patterns for audit logging systems
- `references/audit-log-compliance.md` — Compliance requirements mapping for audit logs
- `references/audit-log-implementation.md` — Implementation guides and code examples
- `references/audit-log-monitoring.md` — Monitoring and alerting for audit log systems
- `references/audit-trail.md` — Audit trail design principles
- `references/compliance-logging.md` — Compliance logging best practices
- `references/audit-log-fundamentals.md` — Audit Logging Fundamentals
- `references/audit-log-advanced.md` — Audit Logging Advanced Patterns
- `references/audit-log-storage-comparison.md` — Audit Storage Backend Comparison

## Handoff
No artifact produced unless requested.
Next skill: plugin-architecture — extend the audit system with custom event handlers.
Carry forward: audit event types, retention policy, tamper evidence strategy.
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