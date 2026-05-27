# Authorization Delegation

## Overview
Implement temporary and delegated access patterns: JIT (just-in-time) elevation, permission delegation, break-glass access, and service account authorization.

## JIT Elevation

```typescript
interface JitElevationRequest {
  userId: string;
  requestedRole: string;
  resourceId: string;
  reason: string;
  duration: number; // minutes
  approvedBy?: string;
  justification: string;
  incidentId?: string;
}

class JitElevationService {
  private readonly MAX_ELEVATION_MINUTES = 120;
  private readonly MAX_ELEVATION_LEVEL = 1; // Can only elevate one level

  async requestElevation(request: JitElevationRequest): Promise<ElevationResult> {
    if (request.duration > this.MAX_ELEVATION_MINUTES) {
      return { success: false, error: 'Elevation duration exceeds maximum of 120 minutes' };
    }

    const user = await User.findById(request.userId);
    const roleHierarchy = await this.getRoleHierarchy();

    // Verify user can request target role (must be adjacent in hierarchy)
    if (!this.canElevate(user.role, request.requestedRole, roleHierarchy)) {
      return { success: false, error: 'Cannot elevate to requested role' };
    }

    // Check for existing active elevation
    const active = await ActiveElevation.findOne({
      userId: request.userId,
      expiresAt: { $gt: new Date() },
    });

    if (active) {
      return { success: false, error: 'Active elevation already exists' };
    }

    // For high-sensitivity roles, require approval
    if (this.requiresApproval(request.requestedRole)) {
      const approval = await ElevationApproval.create({
        ...request,
        status: 'pending',
        requestedAt: new Date(),
      });
      await this.notifyApprovers(approval);
      return { success: true, status: 'pending_approval', approvalId: approval.id };
    }

    // Auto-approve for standard elevations
    const elevation = await ActiveElevation.create({
      userId: request.userId,
      originalRole: user.role,
      elevatedRole: request.requestedRole,
      reason: request.reason,
      justification: request.justification,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + request.duration * 60000),
      approvedBy: request.approvedBy || 'auto',
    });

    await authzAuditService.logDecision({
      timestamp: new Date(),
      decision: 'allowed',
      userId: request.userId,
      action: 'elevate',
      resourceType: 'role',
      resourceId: request.requestedRole,
      reason: `JIT elevation: ${request.justification}`,
      context: { elevationId: elevation.id },
    });

    return { success: true, status: 'granted', elevation };
  }

  async verifyElevation(userId: string, requiredRole: string): Promise<boolean> {
    const active = await ActiveElevation.findOne({
      userId,
      elevatedRole: requiredRole,
      expiresAt: { $gt: new Date() },
    });

    return active !== null;
  }
}
```

## Permission Delegation

```typescript
interface DelegationRequest {
  fromUserId: string;
  toUserId: string;
  permissions: string[];
  resourceIds: string[];
  expiresAt: Date;
  reason: string;
}

class DelegationService {
  async delegate(request: DelegationRequest): Promise<DelegationResult> {
    // Verify delegator has all permissions being delegated
    const delegatorPermissions = await this.getUserPermissions(request.fromUserId);
    const hasAllPermissions = request.permissions.every(p =>
      delegatorPermissions.includes(p)
    );

    if (!hasAllPermissions) {
      return { success: false, error: 'Delegator does not have all requested permissions' };
    }

    // Verify delegatee exists and is active
    const delegatee = await User.findById(request.toUserId);
    if (!delegatee || !delegatee.active) {
      return { success: false, error: 'Delegatee not found or inactive' };
    }

    // Create delegation with constraint: delegated permissions never exceed delegator's
    const delegation = await PermissionDelegation.create({
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      permissions: request.permissions,
      resourceIds: request.resourceIds,
      grantedAt: new Date(),
      expiresAt: request.expiresAt,
      reason: request.reason,
      revoked: false,
    });

    await this.notifyDelegatee(delegation);
    await this.logDelegation(delegation);

    return { success: true, delegation };
  }

  async revoke(delegationId: string): Promise<void> {
    await PermissionDelegation.findByIdAndUpdate(delegationId, {
      revoked: true,
      revokedAt: new Date(),
    });

    await this.notifyDelegatorAndDelegatee(delegationId);
  }

  async checkDelegatedPermission(userId: string, permission: string, resourceId: string): Promise<boolean> {
    const delegation = await PermissionDelegation.findOne({
      toUserId: userId,
      permissions: permission,
      resourceIds: resourceId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });

    return delegation !== null;
  }
}
```

## Break-Glass Access

```typescript
class BreakGlassService {
  private readonly BREAK_GLASS_DURATION = 30; // minutes
  private readonly NOTIFICATION_IMMEDIATE = true;

  async requestBreakGlass(params: {
    userId: string;
    resourceId: string;
    reason: string;
    incidentId?: string;
  }): Promise<BreakGlassResult> {
    // Log the break-glass request immediately
    await BreakGlassLog.create({
      ...params,
      requestedAt: new Date(),
      status: 'granted', // Break-glass is granted immediately, then audited
      duration: this.BREAK_GLASS_DURATION,
    });

    // Grant temporary access
    const elevation = await ActiveElevation.create({
      userId: params.userId,
      originalRole: 'user',
      elevatedRole: 'emergency_access',
      reason: `BREAK_GLASS: ${params.reason}`,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + this.BREAK_GLASS_DURATION * 60000),
      isBreakGlass: true,
      incidentId: params.incidentId,
    });

    // Immediate notification to security team
    if (this.NOTIFICATION_IMMEDIATE) {
      await alertService.send({
        type: 'BREAK_GLASS_ACCESS_GRANTED',
        severity: 'critical',
        userId: params.userId,
        resourceId: params.resourceId,
        reason: params.reason,
        expiresAt: elevation.expiresAt,
      });
    }

    await authzAuditService.logDecision({
      timestamp: new Date(),
      decision: 'allowed',
      userId: params.userId,
      action: 'break_glass',
      resourceType: 'emergency',
      resourceId: params.resourceId,
      reason: `BREAK GLASS: ${params.reason}`,
      context: { elevationId: elevation.id, incidentId: params.incidentId },
    });

    return {
      success: true,
      elevationId: elevation.id,
      expiresAt: elevation.expiresAt,
      duration: this.BREAK_GLASS_DURATION,
    };
  }

  async generateBreakGlassReport(days: number): Promise<BreakGlassReport> {
    const since = new Date(Date.now() - days * 86400000);
    const incidents = await BreakGlassLog.find({
      requestedAt: { $gte: since },
    }).sort({ requestedAt: -1 }).lean();

    return {
      totalIncidents: incidents.length,
      period: days,
      incidents: incidents.map(i => ({
        userId: i.userId,
        resourceId: i.resourceId,
        reason: i.reason,
        requestedAt: i.requestedAt,
        duration: i.duration,
        hasIncidentReport: !!i.incidentId,
      })),
      summary: {
        uniqueUsers: new Set(incidents.map(i => i.userId)).size,
        mostCommonReason: this.mostCommon(incidents.map(i => i.reason)),
      },
    };
  }
}
```

## Service Account Authorization

```typescript
class ServiceAccountAuth {
  async createServiceAccount(name: string, permissions: string[]): Promise<ServiceAccount> {
    const apiKey = `sa_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const account = await ServiceAccount.create({
      name,
      hashedApiKey: hashedKey,
      permissions,
      active: true,
      createdAt: new Date(),
      lastUsedAt: null,
    });

    return { ...account.toObject(), apiKey }; // Return API key once
  }

  async verifyServiceAccountAccess(apiKey: string, requiredPermission: string): Promise<boolean> {
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const account = await ServiceAccount.findOne({
      hashedApiKey: hash,
      active: true,
    });

    if (!account) return false;

    // Update last used
    account.lastUsedAt = new Date();
    await account.save();

    return account.permissions.includes(requiredPermission);
  }
}
```

## Key Points
- JIT elevation: request temporary role elevation with auto-expiry and optional approval
- Permission delegation: delegate subset of permissions with resource scoping
- Break-glass: immediate emergency access with automatic security notification
- Service accounts: scoped API keys with specific permissions and usage tracking
- All delegation events must be logged for audit compliance
