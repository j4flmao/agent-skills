---
name: backend-audit-logging
description: >
  Use this skill when the user says 'audit log', 'audit trail', 'compliance logging', 'tamper-evident log', 'immutable log', 'audit table', 'change tracking', 'who changed what', 'data provenance', 'audit events', 'reporting log'. This skill implements immutable audit trails for compliance (SOC 2, SOX, HIPAA, GDPR). Applies to any backend stack. Do NOT use for: application logging (error logs, debug logs), metrics, or tracing.
version: "1.0.0"
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
- [ ] Audit events recorded for all sensitive operations.
- [ ] Audit log is append-only (immutable).
- [ ] Tamper evidence implemented (hash chain or similar).
- [ ] Retention policy configured.
- [ ] Audit logs queryable by actor, resource, and time range.

### Max Response Length
3 lines per event type. 15 lines for full implementation.

## Architecture / Decision Trees

### Storage Backend Decision Tree

```
What is the primary compliance requirement?
├── SOC 2 / SOX → PostgreSQL with hash chain (append-only table)
├── HIPAA → Encrypted database with strict access controls + hash chain
├── GDPR → Searchable storage with data deletion capability (anonymization)
├── PCI-DSS → Immutable log with strict access controls and 1-year retention
└── General compliance → Cloud-native audit service (AWS CloudTrail, Azure Monitor)

What is the write volume?
├── < 1000 events/sec → Relational database (PostgreSQL, MySQL)
├── 1000-10000 events/sec → Time-series database (TimescaleDB, InfluxDB)
└── > 10000 events/sec → Log aggregator (Elasticsearch) + blockchain-style batching
```

### Tamper Evidence Decision Tree

```
Is tamper evidence required by compliance framework?
├── Yes → Is regulatory framework HIPAA or PCI-DSS?
│   ├── Yes → Hash chain with periodic verification and external audit service
│   └── No → Hash chain (SHA-256 linked list) or digital signature
└── No → Append-only table with database-level access controls
```

### Event Schema Design

```
Minimal: actor, action, resource, timestamp
Standard: + resource_id, changes (diff), metadata, correlation_id
Complete: + previous_hash, hash, digital_signature, event_version, tenant_id
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
```

### Step 2: Create Audit Table
```sql
CREATE TABLE audit_log (
  id            BIGSERIAL PRIMARY KEY,
  event_type    VARCHAR(50) NOT NULL,
  actor_id      VARCHAR(100) NOT NULL,
  actor_type    VARCHAR(20) NOT NULL,   -- 'user' | 'system' | 'api'
  resource_type VARCHAR(50) NOT NULL,
  resource_id   VARCHAR(100),
  action        VARCHAR(10) NOT NULL,   -- 'create' | 'read' | 'update' | 'delete'
  changes       JSONB,                  -- diff of old/new values
  metadata      JSONB,                  -- IP, user-agent, requestId
  correlation_id VARCHAR(64),           -- trace across services
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash          VARCHAR(64),            -- SHA-256 of previous row + this row data
  previous_hash VARCHAR(64),
  tenant_id     VARCHAR(50)             -- for multi-tenant systems
);

-- Indexes for common queries
CREATE INDEX idx_audit_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_actor ON audit_log(actor_id, actor_type);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_occurred_at ON audit_log(occurred_at);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id) WHERE tenant_id IS NOT NULL;
```

### Step 3: Implement Hash Chain
```javascript
async function appendAuditLog(event) {
  const lastRow = await db.query('SELECT id, hash FROM audit_log ORDER BY id DESC LIMIT 1');
  const previousHash = lastRow.rows[0]?.hash || '';
  const row = { ...event, previousHash };
  row.hash = crypto.createHash('sha256')
    .update(previousHash + JSON.stringify(row, Object.keys(row).sort()))
    .digest('hex');
  await db.query('INSERT INTO audit_log SET ?', row);
}
```

### Step 4: Emit Audit Events from Code
```javascript
// ORM hook or middleware
auditLog.append({
  eventType: 'user.update',
  actorId: req.user.id,
  actorType: 'user',
  resourceType: 'user_profile',
  resourceId: profileId,
  action: 'update',
  changes: diff(oldProfile, newProfile),
  metadata: {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.id
  },
  correlationId: req.correlationId
});
```

### Step 5: Implement Retention and Archival
```bash
# Tier 1: Hot storage (7 days) — queryable via API, online
# Tier 2: Warm storage (1 year) — queryable with delay (S3/Glacier/Parquet export)
# Tier 3: Cold storage (7 years) — archived, not directly queryable
```

### Step 6: Tamper Verification
```sql
-- Verify hash chain integrity
SELECT COUNT(*) FROM (
  SELECT id, hash, previous_hash,
    LAG(hash) OVER (ORDER BY id) as computed_previous
  FROM audit_log
) t WHERE previous_hash != computed_previous;
-- If count > 0, the log has been tampered with.
```

### Step 7: Audit Query API
```javascript
class AuditQueryService {
  async search({ actorId, resourceType, eventType, from, to, page, limit }) {
    const query = knex('audit_log')
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

  async verifyIntegrity() {
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

## Common Pitfalls

### Pitfall 1: Logging Sensitive Values in Diff
Recording actual SSN, credit card numbers, or passwords in the changes diff. Use tokenization or masking: show that a field changed, not what it changed to.

### Pitfall 2: No Correlation ID Across Services
In microservice architectures, each service logs audit events independently without a common trace ID. This makes reconstructing a user's full action sequence impossible.

### Pitfall 3: Blocking on Audit Writes
Using synchronous database inserts for audit logging impacts main request latency. Use async writes, message queues, or background batch processing.

### Pitfall 4: Single Points of Failure in the Chain
Running the hash chain on a single database without monitoring. Implement periodic verification, remote backups, and alerting on chain breaks.

### Pitfall 5: Ignoring Clock Skew
Distributed systems log events with different server clocks. Always use NTP-synchronized clocks and log in UTC. Timestamp events at the application layer, not the database.

### Pitfall 6: No Audit Coverage for System Actions
Auditing only user-initiated actions but missing cron jobs, background workers, and admin scripts. Every state change must be audited regardless of initiator.

### Pitfall 7: Monolithic Audit Table
Using a single audit_log table for all event types creates query performance issues. Partition by time or use separate tables for different event categories.

## Best Practices

- Use an append-only storage mechanism (immutable table, WORM storage, event store).
- Implement a hash chain or Merkle tree for tamper evidence.
- Log at the service boundary, not deep inside internal functions.
- Use structured event schemas with versioning for forward compatibility.
- Include correlation IDs to trace events across microservices.
- Always log in UTC with timezone information, never server local time.
- Implement async audit writing to avoid impacting main request latency.
- Mask or tokenize sensitive values in the diff — log that a change occurred, not the sensitive value.
- Partition audit data by time for query performance and lifecycle management.
- Test tamper detection regularly (quarterly minimum).
- Provide a query API for auditors with role-based access control.
- Log reads of sensitive data (PII, PHI, financial data), not just writes.

## Compared With

### Database Audit Log vs Application Audit Log
Database audit logs capture all changes at the DB level (pgAudit, MariaDB Audit Plugin). Application logs capture business context. Use both: database logs for raw data changes, application logs for business intent.

### Hash Chain vs WORM Storage
Hash chains provide verifiable tamper evidence on standard storage. WORM (Write Once Read Many) provides physical immutability at the storage layer. Use hash chains for cost-effective verification. Use WORM for regulatory requirements requiring physical immutability.

### PostgreSQL Audit vs Dedicated Audit Service
PostgreSQL with audit table is simpler and cost-effective for moderate volume. Dedicated services (AWS CloudTrail, Azure Monitor, Auditd) scale better and provide native integration. Choose based on volume, compliance needs, and cloud provider.

### Centralized vs Decentralized Audit
Centralized audit stores all events in one system for easy querying. Decentralized stores events per service with global correlation via event bus. Choose centralized for simpler compliance reporting. Choose decentralized for microservice autonomy.

## Performance Considerations

- Audit log writes should be asynchronous. Use a message queue (RabbitMQ, Kafka) between application and audit storage.
- Batch audit writes: collect events for 100ms or 100 events, then flush.
- Partition audit tables by month for query performance and easy archival.
- Archive data older than retention period to Parquet/ORC files on object storage.
- Hash computation adds CPU overhead. Use streaming hash computation for large payloads.
- Index only columns used in common queries. Avoid over-indexing on high-write tables.
- Consider columnar storage (ClickHouse, TimescaleDB) for high-volume audit analytics.
- For >100k events/sec, use a dedicated event pipeline (Kafka → Flink → Object Store).

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
- `references/audit-log-architecture.md` — Deep architecture patterns, storage backends, hash chain internals
- `references/audit-log-compliance.md` — Detailed compliance mapping for SOC 2, HIPAA, GDPR, PCI-DSS, SOX

## Handoff
No artifact produced unless requested.
Next skill: plugin-architecture — extend the audit system with custom event handlers.
Carry forward: audit event types, retention policy, tamper evidence strategy.
