# Audit Logging Fundamentals

## Audit Event Structure

Every audit event must contain:

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique event identifier | `evt_01JAN...` |
| `timestamp` | When the event occurred | `2024-01-01T00:00:00Z` |
| `actor` | Who performed the action | `user_abc123`, `system` |
| `action` | What was done | `user.login`, `order.create`, `document.delete` |
| `resource` | What was affected | `order_456`, `user_abc` |
| `result` | Outcome | `success`, `failure`, `denied` |
| `context` | Environment info | IP, user agent, session ID |
| `changes` | What changed (before/after) | `{"status": {"old": "pending", "new": "approved"}}` |

## Event Categories

| Category | Examples | Retention |
|----------|----------|-----------|
| Authentication | login, logout, MFA challenge, password reset | 90 days |
| Authorization | access denied, role change, permission grant | 1 year |
| Data access | read, export, download PII | 1 year |
| Data mutation | create, update, delete records | 7 years |
| Administrative | config change, user deactivation, system settings | 7 years |
| Compliance | consent given, data deletion request, privacy export | Duration of legal requirement |

## Delivery Semantics

| Guarantee | Meaning | Implementation |
|-----------|---------|----------------|
| At-most-once | Loss possible, no duplicates | Async fire-and-forget |
| At-least-once | No loss, possible duplicates | Retry queue, idempotent consumer |
| Exactly-once | No loss, no duplicates | Dedup + transactional outbox |

**Recommendation:** At-least-once for compliance events. At-most-once for debug/analytics events.

## Immutability

### Append-Only Log
```sql
-- Audit log table — never UPDATE or DELETE
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB,
    hash TEXT, -- SHA-256 of previous event + this event
    previous_hash TEXT REFERENCES audit_log(hash)
);

-- Only grant INSERT to application role
REVOKE UPDATE, DELETE ON audit_log FROM app_role;
```

## Storage Backends

| Backend | Write Throughput | Query | Retention | Cost |
|---------|-----------------|-------|-----------|------|
| PostgreSQL | 10K/sec | Full SQL | Unlimited | Moderate |
| ClickHouse | 100K/sec | SQL (analytical) | Unlimited | Low |
| Elasticsearch | 20K/sec | Full-text search | Rolling window | High |
| S3 + Athena | Batches | SQL over files | Archival | Very Low |
| Kafka | 1M/sec | Stream processing | Configurable | Moderate |

## Compliance Requirements

| Framework | Audit Requirement | Retention |
|-----------|------------------|-----------|
| SOC 2 | Access and activity logs | 90+ days |
| SOX | Financial data changes | 7 years |
| HIPAA | Access to PHI | 6 years |
| GDPR | Consent, access, deletion | Duration of processing |
| PCI DSS | All access to cardholder data | 1 year |
| FedRAMP | All system access | 90 days minimum |

## Testing Audit Logging

- Verify every auditable action produces an event
- Verify rejected/denied actions are also logged
- Verify PII is NOT logged in plaintext
- Verify retention policies are enforced
- Verify immutability (no deletes/updates)
- Verify hash chain integrity
- Verify time synchronization (NTP)
