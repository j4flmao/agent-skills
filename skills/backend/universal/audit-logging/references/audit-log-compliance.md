# Audit Log Compliance

## Regulatory Requirements by Framework

| Requirement | SOC 2 | SOX | HIPAA | GDPR | PCI DSS |
|-------------|-------|-----|-------|------|---------|
| Access logging | Yes | Yes | Yes | Yes | Yes |
| Tamper evidence | Yes | Yes | Yes | Recommended | Yes |
| Retention (years) | 1-2 | 7 | 6 | Varies | 1 |
| Quarterly review | Yes | Yes | Yes | Yes | Yes |
| User activity tracking | Yes | Yes | Yes | Yes | Yes |
| Privilege escalation logging | Yes | Yes | Yes | Recommended | Yes |
| Incident response logging | Yes | Yes | Yes | Yes | No |

## Compliance Event Mapping

```yaml
compliance_events:
  soc2_security:
    - user.login_failed
    - user.privilege_escalated
    - config.changed
    - firewall.rule_modified
    - access.revoked
  soc2_availability:
    - system.incident_detected
    - system.failover_initiated
    - backup.completed
    - system.restart
  hipaa_privacy:
    - phi.accessed
    - phi.modified
    - phi.exported
    - consent.revoked
  gdpr_rights:
    - dsr.received
    - dsr.erasure_completed
    - dsr.portability_completed
    - consent.granted
```

## Audit Table with Compliance Metadata

```sql
CREATE TABLE audit_log_compliance (
  id              BIGSERIAL PRIMARY KEY,
  event_type      VARCHAR(100) NOT NULL,
  actor_id        VARCHAR(100) NOT NULL,
  actor_type      VARCHAR(20) NOT NULL,
  resource_type   VARCHAR(50) NOT NULL,
  resource_id     VARCHAR(100),
  action          VARCHAR(10) NOT NULL,
  jurisdiction    VARCHAR(10),  -- GDPR, HIPAA, SOC2, etc.
  data_retention  INTERVAL NOT NULL DEFAULT '7 years',
  changes         JSONB,
  metadata        JSONB,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash            VARCHAR(64),
  previous_hash   VARCHAR(64)
);

-- Partition by retention period
CREATE TABLE audit_log_7yr PARTITION OF audit_log_compliance
  FOR VALUES FROM ('7 years') TO ('max');
CREATE TABLE audit_log_1yr PARTITION OF audit_log_compliance
  FOR VALUES FROM ('1 year') TO ('7 years');
```

## Right to Erasure (GDPR Article 17)

```typescript
async function handleErasureRequest(userId: string, dsrId: string): Promise<void> {
  // 1. Record the erasure request in audit log BEFORE erasing
  await auditLog.append({
    eventType: 'gdpr.erasure_request',
    actorId: 'system',
    resourceType: 'user',
    resourceId: userId,
    action: 'delete',
    metadata: { dsrId, requestType: 'right_to_erasure' },
  });

  // 2. Anonymize user data (do NOT cascade delete)
  await db.query(`
    UPDATE users SET
      email = NULL, name = NULL, phone = NULL,
      anonymized_at = NOW(), dsr_id = $2
    WHERE id = $1
  `, [userId, dsrId]);

  // 3. Log completion — this log entry is NOT deleted
  await auditLog.append({
    eventType: 'gdpr.erasure_completed',
    actorId: 'system',
    resourceType: 'user',
    resourceId: userId,
    action: 'delete',
    metadata: { dsrId, erasureDate: new Date().toISOString() },
  });
}
```

## Retention Policy Enforcement

```bash
# Archive job (weekly)
SELECT partition_table FROM archive_partitions
WHERE retention_end < NOW();

# For each expired partition:
pg_dump -t audit_log_old -F c > audit_archive_$(date +%Y%m%d).dump
aws s3 cp audit_archive_*.dump s3://compliance-archive/
DROP TABLE audit_log_old;

# Verify archive integrity
pg_restore --list audit_archive_20260525.dump | head -5
```

## Compliance Reporting

```sql
-- SOC 2 access review (quarterly)
SELECT actor_id, COUNT(*) AS access_count,
  ARRAY_AGG(DISTINCT resource_type) AS resources_accessed,
  MIN(occurred_at) AS first_access,
  MAX(occurred_at) AS last_access
FROM audit_log
WHERE occurred_at >= NOW() - INTERVAL '90 days'
  AND action IN ('read', 'update', 'delete')
GROUP BY actor_id
ORDER BY access_count DESC;

-- GDPR data access report
SELECT occurred_at, event_type, actor_id, resource_id, metadata->>'dsrId'
FROM audit_log
WHERE resource_type = 'user' AND resource_id = $1
  AND event_type LIKE 'gdpr.%'
ORDER BY occurred_at DESC;
```

## Alerting Rules

```yaml
alerts:
  - rule: "Multiple failed accesses"
    condition: "count(event_type = 'access.denied') > 10 in 5 minutes"
    severity: high
    channel: pagerduty
  - rule: "Bulk data export"
    condition: "count(event_type = 'data.export') > 5 in 1 hour from same actor"
    severity: medium
    channel: slack
  - rule: "Privilege escalation"
    condition: "event_type = 'role.escalated'"
    severity: critical
    channel: pagerduty
  - rule: "Hash chain break"
    condition: "verify_hash_chain() returns broken_links > 0"
    severity: critical
    channel: pagerduty
  - rule: "Retention approaching"
    condition: "max(occurred_at_for_jurisdiction) > retention_window - 30 days"
    severity: low
    channel: email
```
