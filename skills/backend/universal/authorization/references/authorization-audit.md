# Authorization Audit

## Overview
Log every authorization decision for compliance and security analysis. Track who accessed what, whether it was allowed or denied, and why.

## Authorization Decision Logging

```typescript
interface AuthorizationDecision {
  timestamp: Date;
  decision: 'allowed' | 'denied';
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  context: {
    ip: string;
    userAgent: string;
    roles: string[];
    attributes: Record<string, unknown>;
  };
}

class AuthzAuditService {
  async logDecision(decision: AuthorizationDecision): Promise<void> {
    await AuthzAuditLog.create({
      ...decision,
      timestamp: new Date(),
    });
  }

  async getDecisionsByUser(userId: string, options: {
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<AuthorizationDecision[]> {
    const query: any = { userId };
    if (options.from) query.timestamp = { $gte: options.from };
    if (options.to) query.timestamp = { ...query.timestamp, $lte: options.to };
    return AuthzAuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 100)
      .lean();
  }

  async getDeniedAccessReport(days: number): Promise<DeniedAccessReport> {
    const since = new Date(Date.now() - days * 86400000);

    const deniedLogs = await AuthzAuditLog.find({
      decision: 'denied',
      timestamp: { $gte: since },
    }).lean();

    const byUser = this.groupBy(deniedLogs, 'userId');
    const byResource = this.groupBy(deniedLogs, 'resourceType');
    const byReason = this.groupBy(deniedLogs, 'reason');

    const suspicious: SuspiciousActivity[] = [];
    for (const [userId, entries] of Object.entries(byUser)) {
      if (entries.length > 20) {
        suspicious.push({
          userId,
          deniedCount: entries.length,
          reason: 'Excessive denied access attempts',
          firstAttempt: entries[entries.length - 1].timestamp,
          lastAttempt: entries[0].timestamp,
          resources: [...new Set(entries.map(e => e.resourceType))],
        });
      }
    }

    return {
      totalDenied: deniedLogs.length,
      period: { days, since },
      uniqueUsers: Object.keys(byUser).length,
      byResource: Object.entries(byResource).map(([resource, count]) => ({ resource, count })),
      topRejectedReasons: Object.entries(byReason)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 10)
        .map(([reason, entries]) => ({ reason, count: entries.length })),
      suspiciousActivity: suspicious,
    };
  }
}
```

## Access Review Reports

```typescript
class AccessReviewService {
  async generateUserAccessReport(userId: string, period: number): Promise<UserAccessReport> {
    const since = new Date(Date.now() - period * 86400000);

    const decisions = await AuthzAuditLog.find({
      userId,
      timestamp: { $gte: since },
    }).sort({ timestamp: -1 }).lean();

    return {
      userId,
      period: { days: period, since },
      totalDecisions: decisions.length,
      allowedCount: decisions.filter(d => d.decision === 'allowed').length,
      deniedCount: decisions.filter(d => d.decision === 'denied').length,
      byResource: this.groupBy(decisions, 'resourceType'),
      byAction: this.groupBy(decisions, 'action'),
      recentActivity: decisions.slice(0, 50).map(d => ({
        timestamp: d.timestamp,
        decision: d.decision,
        action: d.action,
        resource: `${d.resourceType}:${d.resourceId}`,
        reason: d.reason,
      })),
    };
  }

  async quarterlyAccessCertification(): Promise<CertificationReport> {
    const activeUsers = await User.find({ active: true, roles: { $ne: [] } });
    const period = 90; // days

    const reports = [];
    for (const user of activeUsers) {
      const report = await this.generateUserAccessReport(user.id, period);
      reports.push({
        userId: user.id,
        userName: user.name,
        roles: user.roles,
        lastActive: report.recentActivity[0]?.timestamp,
        totalAccess: report.totalDecisions,
        deniedAccess: report.deniedCount,
        resourcesAccessed: Object.keys(report.byResource).length,
        needsReview: report.deniedCount > 10,
      });
    }

    return {
      generatedAt: new Date(),
      period: `${period} days`,
      totalUsers: reports.length,
      usersNeedingReview: reports.filter(r => r.needsReview).length,
      users: reports,
    };
  }
}
```

## Real-Time Denied Access Alerting

```typescript
class DeniedAccessMonitor {
  private readonly WINDOW_MINUTES = 5;
  private readonly THRESHOLD = 10;

  async check(event: AuthorizationDecision): Promise<void> {
    if (event.decision !== 'denied') return;

    const recent = await AuthzAuditLog.countDocuments({
      decision: 'denied',
      userId: event.userId,
      timestamp: { $gte: new Date(Date.now() - this.WINDOW_MINUTES * 60000) },
    });

    if (recent >= this.THRESHOLD) {
      await alertService.send({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'critical',
        userId: event.userId,
        attempts: recent,
        window: `${this.WINDOW_MINUTES} minutes`,
        reason: `User ${event.userId} denied ${recent} times in ${this.WINDOW_MINUTES} minutes`,
      });
    }
  }
}
```

## Audit Trail for Permission Changes

```typescript
// Log all role/permission changes
class PermissionAudit {
  async logChange(params: {
    changedBy: string;
    targetUserId: string;
    changeType: 'role_assigned' | 'role_revoked' | 'permission_granted' | 'permission_revoked';
    before: unknown;
    after: unknown;
    reason: string;
  }): Promise<void> {
    await PermissionAuditLog.create({
      ...params,
      timestamp: new Date(),
      ip: currentRequest.ip,
    });
  }

  async getChangeHistory(userId: string): Promise<PermissionChange[]> {
    return PermissionAuditLog.find({
      $or: [{ changedBy: userId }, { targetUserId: userId }],
    }).sort({ timestamp: -1 }).lean();
  }
}
```

## Key Points
- Log every authorization decision (allowed or denied) with full context
- Monitor for suspicious activity: excessive denials, unusual resource access
- Generate quarterly access certification reports for compliance
- Alert in real-time when users hit high denial rates
- Maintain immutable audit trail for all permission changes
