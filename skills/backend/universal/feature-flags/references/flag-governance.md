# Flag Governance

## Overview
Govern feature flags at scale: naming conventions, ownership, lifecycle management, stale flag detection, audit trails, and compliance.

## Flag Naming Convention

```typescript
type FlagCategory = 'release' | 'experiment' | 'ops' | 'permission';
type FlagScope = 'service' | 'global';

interface FlagDefinition {
  key: string; // e.g., 'checkout.new-flow'
  category: FlagCategory;
  scope: FlagScope;
  owner: string; // Team name
  description: string;
  created: Date;
  removalDate?: Date;
  tags: string[];
}

class FlagNamingValidator {
  private readonly PATTERN = /^[a-z0-9]+(\.[a-z0-9\-]+)+$/;

  validate(flag: FlagDefinition): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!this.PATTERN.test(flag.key)) {
      issues.push({
        field: 'key',
        message: 'Flag key must be dot-separated kebab-case: domain.feature.name',
      });
    }

    if (flag.key.split('.').length < 2) {
      issues.push({
        field: 'key',
        message: 'Flag key must have at least 2 segments: domain.feature',
      });
    }

    if (flag.category === 'release' && !flag.removalDate) {
      issues.push({
        field: 'removalDate',
        message: 'Release flags must have a removal date',
      });
    }

    if (!flag.owner) {
      issues.push({
        field: 'owner',
        message: 'Every flag must have an owning team',
      });
    }

    return { valid: issues.length === 0, issues };
  }
}
```

## Flag Lifecycle State Machine

```typescript
enum FlagState {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  STABLE = 'STABLE',      // Fully rolled out, no longer toggled
  DEPRECATED = 'DEPRECATED',
  REMOVED = 'REMOVED',    // Code references deleted
}

class FlagLifecycleManager {
  private allowedTransitions: Map<FlagState, FlagState[]> = new Map([
    [FlagState.DRAFT, [FlagState.ACTIVE]],
    [FlagState.ACTIVE, [FlagState.STABLE, FlagState.DEPRECATED]],
    [FlagState.STABLE, [FlagState.DEPRECATED]],
    [FlagState.DEPRECATED, [FlagState.REMOVED]],
  ]);

  transition(flag: Flag, to: FlagState): void {
    const allowed = this.allowedTransitions.get(flag.state);
    if (!allowed?.includes(to)) {
      throw new Error(`Cannot transition from ${flag.state} to ${to}`);
    }

    if (to === FlagState.REMOVED) {
      this.verifyCodeRemoved(flag);
    }

    flag.state = to;
    flag.updatedAt = new Date();
    auditLog.record({
      action: 'FLAG_STATE_CHANGE',
      flag: flag.key,
      from: flag.state,
      to,
      timestamp: new Date(),
    });
  }
}
```

## Stale Flag Detection

```typescript
class StaleFlagDetector {
  private readonly STALE_AFTER_DAYS = 90;
  private readonly CODE_STILL_REFERENCED = false;

  async scanForStaleFlags(): Promise<StaleFlagReport> {
    const allFlags = await flagService.getAllFlags();
    const staleFlags: StaleFlag[] = [];

    for (const flag of allFlags) {
      const reasons: string[] = [];

      // Check removal date passed
      if (flag.removalDate && flag.removalDate < new Date()) {
        reasons.push(`Past removal date by ${daysBetween(flag.removalDate, new Date())} days`);
      }

      // Check no recent changes (inactive flag)
      if (flag.updatedAt && daysBetween(flag.updatedAt, new Date()) > this.STALE_AFTER_DAYS) {
        reasons.push(`No changes in ${this.STALE_AFTER_DAYS}+ days`);
      }

      // Check 100% rollout with no targeting
      if (flag.percentage === 100 && !flag.targetingRules?.length) {
        reasons.push('100% rollout — feature is fully released');
      }

      if (reasons.length > 0) {
        staleFlags.push({
          key: flag.key,
          owner: flag.owner,
          state: flag.state,
          reasons,
          daysSinceUpdate: flag.updatedAt
            ? daysBetween(flag.updatedAt, new Date())
            : Infinity,
        });
      }
    }

    return {
      totalFlags: allFlags.length,
      staleFlags,
      stalePercentage: (staleFlags.length / allFlags.length) * 100,
      scannedAt: new Date(),
    };
  }

  async autoCleanup(): Promise<CleanupResult> {
    const report = await this.scanForStaleFlags();
    const candidates = report.staleFlags.filter(f =>
      f.daysSinceUpdate > this.STALE_AFTER_DAYS + 90 && // 6 months
      CODE_STILL_REFERENCED === false
    );

    let cleaned = 0;
    for (const flag of candidates) {
      // Create cleanup ticket
      await this.createCleanupTask(flag);
      cleaned++;
    }

    return { cleaned, total: candidates.length, timestamp: new Date() };
  }
}
```

## Audit Trail

```typescript
interface FlagAuditEvent {
  id: string;
  flagKey: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'STATE_CHANGE' | 'TARGETING_CHANGE';
  actor: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string;
  timestamp: Date;
}

class FlagAuditLogger {
  async log(event: FlagAuditEvent): Promise<void> {
    await FlagAuditLog.create(event);

    // Notify for sensitive changes
    if (this.isSensitiveChange(event)) {
      await NotificationService.send({
        channel: '#feature-flags',
        message: `*${event.actor}* ${event.action} *${event.flagKey}*\nReason: ${event.reason}`,
      });
    }
  }

  private isSensitiveChange(event: FlagAuditEvent): boolean {
    return [
      'ops' in (event.after || {}),
      event.action === 'DELETED',
      event.action === 'STATE_CHANGE',
    ].some(Boolean);
  }

  async getFlagHistory(flagKey: string, days = 90): Promise<FlagAuditEvent[]> {
    return FlagAuditLog.find({
      flagKey,
      timestamp: { $gte: new Date(Date.now() - days * 86400000) },
    }).sort({ timestamp: -1 }).lean();
  }
}
```

## Compliance and Approval

```typescript
class FlagComplianceChecker {
  async checkCompliance(): Promise<ComplianceReport> {
    const allFlags = await flagService.getAllFlags();
    const violations: ComplianceViolation[] = [];

    for (const flag of allFlags) {
      // Ownership check
      if (!flag.owner) {
        violations.push({
          flag: flag.key,
          type: 'NO_OWNER',
          severity: 'HIGH',
          message: 'Flag has no assigned owner',
        });
      }

      // Release flags must have removal date
      if (flag.category === 'release' && !flag.removalDate) {
        violations.push({
          flag: flag.key,
          type: 'NO_REMOVAL_DATE',
          severity: 'MEDIUM',
          message: 'Release flag missing removal date',
        });
      }

      // Kill switch check for critical features
      if (flag.isCritical && !flag.hasKillSwitch) {
        violations.push({
          flag: flag.key,
          type: 'NO_KILL_SWITCH',
          severity: 'CRITICAL',
          message: 'Critical feature flag missing kill switch',
        });
      }
    }

    return {
      totalFlags: allFlags.length,
      violations,
      compliant: violations.length === 0,
      checkedAt: new Date(),
    };
  }
}

// Approval workflow
class FlagApprovalWorkflow {
  async requestChange(flagKey: string, changes: FlagChange, requester: string): Promise<ApprovalRequest> {
    if (this.requiresApproval(changes)) {
      const request = await ApprovalRequest.create({
        flagKey,
        changes,
        requester,
        status: 'PENDING',
        createdAt: new Date(),
      });

      await NotificationService.send({
        to: this.getApprovers(flagKey),
        message: `Flag change requested: ${flagKey}`,
        link: `/approvals/${request.id}`,
      });

      return request;
    }

    // No approval needed — apply immediately
    await this.applyChanges(flagKey, changes, requester);
    return { autoApproved: true };
  }
}
```

## Key Points
- Enforce flag naming convention: dot-separated kebab-case (domain.feature.name)
- Implement flag lifecycle state machine: DRAFT → ACTIVE → STABLE → DEPRECATED → REMOVED
- Detect stale flags: past removal date, no changes in 90+ days, 100% rollout with no targeting
- Log every flag change with actor, before/after values, timestamp, and reason
- Require ownership, removal dates (release flags), and kill switches (critical flags)
- Implement approval workflow for production flag changes
- Auto-generate cleanup tickets for stale flags past 6 months
