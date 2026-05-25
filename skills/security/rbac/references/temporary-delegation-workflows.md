# Temporary Elevation & Delegation Workflows

## Elevation Workflow Comparison

| Type | Setup | Approval | Duration | Use Case |
|------|-------|----------|----------|----------|
| Pre-approved elevation | Pre-configured policy | None (pre-approved) | Up to 4h | Regular admin tasks |
| Manager-approved | None | Direct manager | Up to 4h | Temporary team lead duties |
| Peer-approved | None | Two peers | Up to 2h | Backup coverage |
| Escalation chain | None | Multi-level | Up to 1h | Emergency decision |
| Emergency (break-glass) | Pre-registered codes | None (retroactive) | 30 min | System outage |

## Pre-Approved Elevation

### Setup
```javascript
// Admin pre-approves regular elevation patterns
async function createElevationPolicy({
  userId,
  targetRole,
  maxDuration,
  maxDaily,
  reasonRequired,
  manager,
}) {
  const policy = await prisma.elevationPolicy.create({
    data: {
      userId,
      targetRole,
      maxDuration,
      maxDaily,
      reasonRequired,
      approvedBy: manager,
      approvedAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      status: 'active',
    },
  });

  await auditLog('elevation_policy_created', {
    userId, targetRole, maxDuration, approvedBy: manager, policyId: policy.id,
  });

  return policy;
}
```

### Usage
```javascript
// One-click elevation for pre-approved users
async function selfElevate(userId, targetRole, reason) {
  const policy = await prisma.elevationPolicy.findFirst({
    where: {
      userId,
      targetRole,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
  });

  if (!policy) {
    return { success: false, error: 'No active elevation policy' };
  }

  // Check daily limit
  const today = await countTodayElevations(userId);
  if (today >= policy.maxDaily) {
    return { success: false, error: 'Daily elevation limit reached' };
  }

  // Validate reason
  if (policy.reasonRequired && (!reason || reason.length < 10)) {
    return { success: false, error: 'Detailed reason required' };
  }

  // Create session
  const session = await prisma.elevationSession.create({
    data: {
      userId,
      fromRole: await getUserRole(userId),
      toRole: targetRole,
      reason,
      policyId: policy.id,
      durationMinutes: policy.maxDuration,
      status: 'active',
      expiresAt: new Date(Date.now() + policy.maxDuration * 60_000),
      createdAt: new Date(),
    },
  });

  await auditLog('elevation_activated', {
    userId, targetRole, reason, sessionId: session.id,
    durationMinutes: policy.maxDuration,
  });

  return { success: true, session };
}
```

## Manager-Approved Elevation

```javascript
// Step 1: Request
async function requestElevation(userId, targetRole, durationMinutes, reason) {
  const user = await getUser(userId);

  // Validate
  if (!isEligibleForElevation(user.role, targetRole)) {
    throw new Error(`${user.role} cannot be elevated to ${targetRole}`);
  }

  if (durationMinutes > 240) {
    throw new Error('Maximum elevation duration is 4 hours');
  }

  // Get approver chain
  const approvers = await getApprovalChain(user, targetRole);

  // Create request
  const request = await prisma.elevationRequest.create({
    data: {
      userId,
      fromRole: user.role,
      toRole: targetRole,
      durationMinutes,
      reason,
      status: 'pending',
      approvers: {
        create: approvers.map((approver, i) => ({
          approverId: approver.id,
          step: i + 1,
          status: i === 0 ? 'pending' : 'waiting',
        })),
      },
    },
  });

  // Notify first approver
  await notifyApprover(approvers[0], request);
  return { requestId: request.id, status: 'pending' };
}

// Step 2: Approve
async function approveElevation(requestId, approverId, decision) {
  const request = await prisma.elevationRequest.findUnique({
    where: { id: requestId },
    include: { approvers: true },
  });

  if (!request || request.status !== 'pending') {
    throw new Error('Request not found or already processed');
  }

  // Find current pending step
  const currentStep = request.approvers.find(a => a.status === 'pending');
  if (!currentStep || currentStep.approverId !== approverId) {
    throw new Error('Not your turn to approve');
  }

  if (decision === 'denied') {
    await prisma.elevationRequest.update({
      where: { id: requestId },
      data: { status: 'denied', resolvedAt: new Date() },
    });
    await notifyUser(request.userId, {
      type: 'elevation_denied',
      message: 'Your elevation request was denied',
    });
    return { status: 'denied' };
  }

  // Mark step as approved
  await prisma.elevationApprover.update({
    where: { id: currentStep.id },
    data: { status: 'approved', approvedAt: new Date() },
  });

  // Check if more approvals needed
  const nextStep = request.approvers.find(a => a.status === 'waiting');
  if (nextStep) {
    // Notify next approver
    await prisma.elevationApprover.update({
      where: { id: nextStep.id },
      data: { status: 'pending' },
    });
    return { status: 'pending_more_approvals' };
  }

  // All approved — activate elevation
  const session = await prisma.elevationSession.create({
    data: {
      userId: request.userId,
      fromRole: request.fromRole,
      toRole: request.toRole,
      reason: request.reason,
      durationMinutes: request.durationMinutes,
      status: 'active',
      expiresAt: new Date(Date.now() + request.durationMinutes * 60_000),
    },
  });

  await prisma.elevationRequest.update({
    where: { id: requestId },
    data: { status: 'approved', resolvedAt: new Date(), sessionId: session.id },
  });

  await auditLog('elevation_approved', {
    requestId, userId: request.userId, targetRole: request.toRole,
    approvedBy: approverId,
  });

  await notifyUser(request.userId, {
    type: 'elevation_approved',
    message: `Elevated to ${request.toRole} for ${request.durationMinutes} minutes`,
  });

  return { status: 'approved', session };
}
```

## Permission Delegation Workflow

### Direct delegation
```
User A (delegator)
  │
  ├─→ User B (delegate)
  │     Receives permissions: [document.write, workspace.read]
  │     Scope: Engineering Department
  │     Duration: 14 days
  │
  └─→ Can revoke anytime
```

### Delegation with approval
```
User A (delegator)
  │
  ├─→ Manager Approval
  │     ↓
  ├─→ User B (delegate)
  │     Receives limited permissions for specific task
  │     Duration: 7 days
  │
  └─→ Manager can revoke too
```

```javascript
async function delegateWithApproval(delegatorId, delegateId, permissions, scope, reason, expiresAt) {
  // Validations
  if (!(await ownsScope(delegatorId, scope))) {
    throw new Error('Delegator does not own scope');
  }

  // Get delegator's manager
  const delegator = await getUser(delegatorId);
  if (!delegator.managerId) {
    throw new Error('No manager found for approval');
  }

  // Create pending delegation
  const delegation = await prisma.delegation.create({
    data: {
      delegatorId,
      delegateId,
      permissions,
      scope,
      reason,
      status: 'pending',
      expiresAt,
      createdAt: new Date(),
    },
  });

  // Request manager approval
  await notifyUser(delegator.managerId, {
    type: 'delegation_approval',
    title: 'Delegation request needs approval',
    body: `${delegatorId} wants to delegate ${permissions.join(', ')} to ${delegateId}.
           Scope: ${JSON.stringify(scope)}. Reason: ${reason}`,
    actionUrl: `/admin/delegations/${delegation.id}`,
    expiresIn: '24 hours',
  });

  return { delegationId: delegation.id, status: 'pending' };
}
```

## Automatic Expiry Enforcer

```javascript
// Cron job: runs every minute
async function expireTimeBoundAccess() {
  const now = new Date();

  // Expire elevations
  const expiredElevations = await prisma.elevationSession.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: now },
    },
    data: { status: 'expired' },
  });

  // Expire delegations
  const expiredDelegations = await prisma.delegation.updateMany({
    where: {
      status: { in: ['active', 'pending'] },
      expiresAt: { lt: now },
    },
    data: { status: 'expired' },
  });

  // Expire break-glass sessions
  const expiredBreakGlass = await prisma.emergencySession.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: now },
    },
    data: { status: 'expired' },
  });

  if (expiredElevations.count + expiredDelegations.count + expiredBreakGlass.count > 0) {
    await auditLog('time_bound_access_expired', {
      elevations: expiredElevations.count,
      delegations: expiredDelegations.count,
      breakGlass: expiredBreakGlass.count,
      timestamp: now,
    });
  }
}
```

## Audit Trail

```javascript
// Every elevation, delegation, and break-glass event is logged
async function auditLog(event, data) {
  await prisma.securityAuditLog.create({
    data: {
      event,
      timestamp: new Date(),
      data,
      metadata: {
        source: 'authorization-service',
        version: '1.0',
      },
    },
  });

  // High-severity events trigger real-time alerts
  if (HIGH_SEVERITY_EVENTS.includes(event)) {
    await notifySecurityTeam({
      severity: 'HIGH',
      event,
      data,
    });
  }
}

const HIGH_SEVERITY_EVENTS = [
  'break_glass_activated',
  'elevation_to_super_admin',
  'elevation_denied',
  'delegation_to_admin',
  'cross_org_delegation',
  'elevation_policy_expired',
];
```

## Workflow Decision Guide

```
Need temporary access?
  ↓
  ↓→ Is this an emergency (system down, security incident)?
  │   ↓
  │   → Use break-glass (pre-registered code, 30 min, notify security)
  ↓
  ↓→ Are you pre-approved for this role?
  │   ↓
  │   → Yes → Self-elevate (instant, up to 4h)
  │   → No  → Request elevation (manager approval, up to 4h)
  ↓
  ↓→ Do you need someone else to act on your behalf?
  │   ↓
  │   → For a specific task → Delegate (up to 14 days)
  │   → For a regular duty → Pre-approved delegation policy
  ↓
  ↓→ Do you need someone else to cover for absence?
      → Delegate with manager approval
```
