# Audit Log Monitoring

## Overview
Monitor audit log systems for anomalies, verify tamper evidence integrity, set up compliance reporting, and detect suspicious activity patterns.

## Tamper Evidence Verification

```sql
-- Scheduled integrity check: detect tampered audit logs
WITH RECURSIVE chain_verify AS (
    SELECT id, hash, previous_hash, hash AS computed_hash, 1 AS depth
    FROM audit_log
    WHERE previous_hash IS NULL

    UNION ALL

    SELECT a.id, a.hash, a.previous_hash,
           SHA256(ROW_TO_JSON(a.*)::text) AS computed_hash,
           cv.depth + 1
    FROM audit_log a
    INNER JOIN chain_verify cv ON a.previous_hash = cv.hash
)
SELECT
    COUNT(*) AS total_entries,
    COUNT(*) FILTER (WHERE hash != computed_hash) AS tampered_entries,
    COUNT(*) FILTER (WHERE hash = computed_hash) AS valid_entries,
    MAX(depth) AS chain_depth
FROM chain_verify;
```

## Anomaly Detection

```typescript
class AuditAnomalyDetector {
  async detectAnomalies(windowMinutes: number = 60): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const since = new Date(Date.now() - windowMinutes * 60000);

    // Spike in access to sensitive resources
    const sensitiveAccess = await this.detectSensitiveAccessSpike(since);
    anomalies.push(...sensitiveAccess);

    // Failed access attempts
    const failedAttempts = await this.detectFailedAccessPattern(since);
    anomalies.push(...failedAttempts);

    // Unusual hours access
    const unusualHours = await this.detectUnusualHoursAccess(since);
    anomalies.push(...unusualHours);

    // Bulk data access
    const bulkAccess = await this.detectBulkAccess(since);
    anomalies.push(...bulkAccess);

    return anomalies;
  }

  private async detectSensitiveAccessSpike(since: Date): Promise<Anomaly[]> {
    const baseline = await this.getBaselineRate('sensitive_resource.access', 24);
    const current = await AuditLog.count({
      where: {
        eventType: Like('%.read'),
        metadata: { contains: { sensitive: true } },
        occurredAt: { $gte: since },
      },
    });

    if (current > baseline * 3) {
      return [{
        type: 'SENSITIVE_ACCESS_SPIKE',
        severity: 'high',
        message: `Sensitive resource access ${current} vs baseline ${baseline} in last hour`,
        currentValue: current,
        baselineValue: baseline,
        timestamp: new Date(),
      }];
    }
    return [];
  }

  private async detectFailedAccessPattern(since: Date): Promise<Anomaly[]> {
    const failedAttempts = await AuditLog.find({
      where: {
        eventType: 'authorization.failed',
        occurredAt: { $gte: since },
      },
    });

    // Group by actor
    const byActor = new Map<string, number>();
    for (const attempt of failedAttempts) {
      const key = `${attempt.actorType}:${attempt.actorId}`;
      byActor.set(key, (byActor.get(key) || 0) + 1);
    }

    const anomalies: Anomaly[] = [];
    for (const [actor, count] of byActor) {
      if (count > 10) {
        anomalies.push({
          type: 'REPEATED_FAILED_ACCESS',
          severity: count > 50 ? 'critical' : 'medium',
          message: `${actor} failed access ${count} times in last hour`,
          actor,
          count,
          timestamp: new Date(),
        });
      }
    }
    return anomalies;
  }

  private async detectBulkAccess(since: Date): Promise<Anomaly[]> {
    const bulkAccess = await AuditLog.find({
      where: {
        action: 'read',
        occurredAt: { $gte: since },
      },
    });

    // Actor with unusually high read volume
    const byActor = new Map<string, number>();
    for (const entry of bulkAccess) {
      const key = `${entry.actorType}:${entry.actorId}`;
      byActor.set(key, (byActor.get(key) || 0) + 1);
    }

    const anomalies: Anomaly[] = [];
    for (const [actor, count] of byActor) {
      if (count > 1000) {
        anomalies.push({
          type: 'BULK_DATA_ACCESS',
          severity: 'high',
          message: `${actor} read ${count} resources in last hour (potential data exfiltration)`,
          actor,
          count,
          timestamp: new Date(),
        });
      }
    }
    return anomalies;
  }
}
```

## Compliance Reporting

```typescript
class ComplianceReporter {
  async generateAccessReport(userId: string, startDate: Date, endDate: Date): Promise<AccessReport> {
    const entries = await AuditLog.find({
      where: {
        actorId: userId,
        occurredAt: { $gte: startDate, $lte: endDate },
      },
      order: { occurredAt: 'DESC' },
    });

    return {
      userId,
      period: { start: startDate, end: endDate },
      totalActions: entries.length,
      byResourceType: this.groupBy(entries, 'resourceType'),
      byAction: this.groupBy(entries, 'action'),
      byDate: this.groupByDate(entries),
      sensitiveAccess: entries.filter(e =>
        e.eventType.includes('sensitive') || e.metadata?.sensitive
      ).map(e => ({
        resourceType: e.resourceType,
        resourceId: e.resourceId,
        action: e.action,
        timestamp: e.occurredAt,
        ip: e.metadata?.ip,
      })),
      integrityVerified: await this.verifyIntegrity(),
    };
  }

  async generateComplianceSummary(): Promise<ComplianceSummary> {
    const integrityCheck = await auditLogger.verifyIntegrity();
    const retentionStats = await this.getRetentionStats();

    return {
      reportGeneratedAt: new Date(),
      integrityStatus: integrityCheck ? 'PASS' : 'FAIL',
      totalEntries: retentionStats.total,
      oldestEntry: retentionStats.oldest,
      newestEntry: retentionStats.newest,
      storageSizeMB: retentionStats.storageSizeMB,
      retentionCompliant: this.checkRetentionCompliance(retentionStats),
      pendingPurgeCount: retentionStats.pendingPurge,
      nextScheduledPurge: retentionStats.nextPurgeDate,
    };
  }
}
```

## Retention Policy Enforcement

```typescript
// Scheduled retention enforcement
cron.schedule('0 2 * * 0', async () => {
  // Tier 1: Hot storage (30 days) — full detail
  // Tier 2: Warm storage (1 year) — aggregated
  // Tier 3: Cold storage (7 years) — archived

  const now = new Date();

  // Archive entries older than 1 year
  const archiveCutoff = new Date(now.getTime() - 365 * 86400000);
  const toArchive = await AuditLog.find({
    where: { occurredAt: { $lt: archiveCutoff } },
    take: 10000,
  });

  if (toArchive.length > 0) {
    await archiveToColdStorage(toArchive);
    await AuditLog.delete(toArchive.map(e => e.id));
  }

  // Purge cold storage entries older than 7 years
  const purgeCutoff = new Date(now.getTime() - 7 * 365 * 86400000);
  await purgeColdStorage(purgeCutoff);
});
```

## Key Points
- Run scheduled integrity checks to detect tampered audit log chains
- Monitor for anomalies: sensitive access spikes, repeated failures, bulk access
- Generate compliance access reports per user with full activity history
- Enforce retention tiers: hot (30 days), warm (1 year), cold (7 years)
- Alert on integrity failures and suspicious patterns immediately
