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
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash          VARCHAR(64),            -- SHA-256 of previous row + this row
  previous_hash VARCHAR(64)
);
```

### Step 3: Implement Hash Chain
```javascript
async function appendAuditLog(event) {
  const lastRow = await db.query('SELECT id, hash FROM audit_log ORDER BY id DESC LIMIT 1');
  const previousHash = lastRow.rows[0]?.hash || '';
  const row = { ...event, previousHash };
  row.hash = crypto.createHash('sha256').update(previousHash + JSON.stringify(row)).digest('hex');
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
  metadata: { ip: req.ip, userAgent: req.headers['user-agent'] },
});
```

### Step 5: Implement Retention and Archival
```bash
# Tier 1: Hot storage (7 days) — queryable via API
# Tier 2: Warm storage (1 year) — queryable with delay (S3/Glacier)
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

## Rules
- Audit logs are append-only — never UPDATE or DELETE rows.
- Always record who (actor), what (action), when (timestamp), and what changed (diff).
- Include a hash chain for tamper evidence.
- Never log the actual sensitive values in the diff — log that access occurred.
- Time must be in UTC with timezone, never server local time.
- Retention policy must meet the strictest regulatory requirement (usually 7 years).
- Reject any request that does not include audit context (actor, resource, action).
- Test tamper detection regularly (at least quarterly for SOC 2).

## References
  - references/audit-log-architecture.md — Audit Log Architecture
  - references/audit-log-compliance.md — Audit Log Compliance
  - references/audit-log-implementation.md — Audit Log Implementation
  - references/audit-log-monitoring.md — Audit Log Monitoring
  - references/audit-trail.md — Audit Trail
  - references/compliance-logging.md — Compliance Logging
## Handoff
No artifact produced unless requested.
Next skill: plugin-architecture — extend the audit system with custom event handlers.
Carry forward: audit event types, retention policy, tamper evidence strategy.
