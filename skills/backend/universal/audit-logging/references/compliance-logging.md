# Compliance Logging

## SOC 2 Requirements

- **Security**: Log all authentication attempts, privilege escalations, and configuration changes.
- **Availability**: Log uptime checks, incident responses, and failover events.
- **Confidentiality**: Log data access events (who accessed what PII and when).
- **Processing Integrity**: Log data processing pipelines and transformation steps.

## GDPR Requirements

- **Right to erasure**: When deleting a user, log the deletion event. Retain the log (not the data).
- **Consent tracking**: Log consent grants, revocations, and version.
- **Data access request**: Log when and what data was exported.

```json
{
  "event": "gdpr.erasure",
  "actor": "system",
  "resource": {"type": "user", "id": "user_42"},
  "details": "Full erasure requested via DSR #DSR-2026-039",
  "retention_exception": "audit_log",
  "timestamp": "2026-05-23T10:15:30Z"
}
```

## Data Retention

| Type | Retention | Action |
|------|-----------|--------|
| Audit logs | 3-7 years | Archive then delete |
| Authentication logs | 12 months | Delete after |
| Debug logs | 30 days | Auto-purge |
| Backup snapshots | Per policy | Rotate |

## Immutable Storage Implementation

- Use append-only tables with restricted permissions.
- Database triggers to prevent UPDATE/DELETE.
- Consider Amazon QLDB, PostgreSQL with `security_barrier` policy.

```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    event JSONB NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE RULE audit_log_no_update AS
    ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS
    ON DELETE TO audit_log DO INSTEAD NOTHING;
```

## Alerting

- Real-time alerts on security-critical events (login failures > 5, privilege escalation).
- Daily digest for compliance team.
- Weekly integrity check (re-verify hash chain).
