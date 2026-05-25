# Temporary & Delegated Access

## JIT (Just-In-Time) Elevation

### Architecture

```
User → Elevation Request → Approval Flow → Time-bound Role → Auto-expire → Log
```

### Self-service elevation (pre-approved)
```javascript
async function selfElevate(userId, targetRole, durationMinutes, reason) {
  const policy = await getElevationPolicy(userId, targetRole);

  if (!policy) {
    return { success: false, error: 'No elevation policy found' };
  }

  // Check limits
  const active = await getActiveElevations(userId);
  if (active.length >= (policy.maxConcurrent || 1)) {
    return { success: false, error: 'Max concurrent elevations reached' };
  }

  const dailyCount = await getDailyElevationCount(userId);
  if (dailyCount >= (policy.dailyLimit || 3)) {
    return { success: false, error: 'Daily elevation limit reached' };
  }

  // Create elevation session
  const elevation = await createElevationSession({
    userId,
    fromRole: await getUserRole(userId),
    toRole: targetRole,
    reason,
    durationMinutes,
    status: 'active',
    expiresAt: Date.now() + durationMinutes * 60_000,
  });

  await auditLog('elevation_granted', {
    userId, targetRole, reason, durationMinutes,
    policyId: policy.id, elevationId: elevation.id
  });

  return elevation;
}

// Elevation policy definition
async function getElevationPolicy(userId, targetRole) {
  return {
    id: 'pol-elevate-manager',
    targetRole: 'manager',
    eligibleRoles: ['lead', 'senior'],
    maxDuration: 240,           // 4 hours max
    maxConcurrent: 1,
    dailyLimit: 3,
    requiresApproval: false,    // self-service
    approvalChain: [],          // no approval needed
    reasonRequired: true,
    reasonMinLength: 10,
  };
}
```

### Approval-based elevation
```javascript
async function requestElevation(userId, targetRole, durationMinutes, reason) {
  const user = await getUser(userId);

  // Find approver chain
  const approvalChain = await resolveApprovalChain(user, targetRole);

  const request = await prisma.elevationRequest.create({
    data: {
      userId,
      fromRole: user.role,
      toRole: targetRole,
      reason,
      durationMinutes,
      status: 'pending',
      approvalChain: {
        create: approvalChain.map((approver, i) => ({
          approverId: approver.id,
          step: i + 1,
          status: i === 0 ? 'pending' : 'waiting',
        })),
      },
    },
  });

  // Notify first approver
  await notify(approvalChain[0].id, {
    type: 'elevation_approval',
    title: `${user.name} requests ${targetRole} access`,
    body: `Reason: ${reason}\nDuration: ${durationMinutes} minutes`,
    actionUrl: `/admin/elevations/${request.id}`,
    expiresIn: '2 hours',
  });

  return request;
}
```

### Elevation enforcement
```javascript
// Middleware that checks for active elevation
async function authorizeWithElevation(req, res, next) {
  const user = req.user;

  // Standard authorization
  if (await hasPermission(user.id, req.action, req.resource)) {
    return next();
  }

  // Check active elevation
  const elevation = await prisma.roleElevation.findFirst({
    where: {
      userId: user.id,
      status: 'active',
      expiresAt: { gt: new Date() },
    },
  });

  if (!elevation) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if elevated role has the required permission
  const elevatedPerms = await getRolePermissions(elevation.toRole);
  if (hasPermissionCheck(elevatedPerms, req.action, req.resource)) {
    req.elevationId = elevation.id;
    return next();
  }

  return res.status(403).json({ error: 'Elevated role insufficient' });
}
```

## Permission Delegation

### Delegation model

```
User A (delegator) ──grants──> User B (delegate)
  │                              │
  │ scope: specific perms         │ acts on A's behalf
  │ duration: time-limited        │ audited under A's name
  │ revocable: yes               │
```

### Create delegation
```javascript
async function createDelegation({
  delegatorId,
  delegateId,
  permissions,         // ['document.write', 'workspace.read']
  resourceScope,       // { orgId, deptId, resourceType }
  reason,
  expiresAt,
}) {
  // Validations
  if (!(await ownsScope(delegatorId, resourceScope))) {
    throw new Error('Delegator does not own scope');
  }
  if (delegateId === delegatorId) {
    throw new Error('Cannot delegate to self');
  }
  if (delegateHasRole(delegateId, delegatorId)) {
    throw new Error('Delegate already has equal or higher access');
  }

  // Verify delegator has the permissions they're delegating
  const delegatorPerms = await getEffectivePermissions(delegatorId, resourceScope);
  for (const perm of permissions) {
    if (!delegatorPerms.includes(perm)) {
      throw new Error(`Cannot delegate permission you don't have: ${perm}`);
    }
  }

  const delegation = await prisma.delegation.create({
    data: {
      delegatorId,
      delegateId,
      permissions,
      resourceScope,
      reason,
      status: 'active',
      expiresAt: new Date(expiresAt),
    },
  });

  await auditLog('delegation_created', {
    delegatorId, delegateId, permissions, resourceScope,
    delegationId: delegation.id, expiresAt
  });

  await notify(delegateId, {
    type: 'delegation_received',
    message: `${delegatorId} delegated ${permissions.join(', ')} to you`,
    expiresAt,
  });

  return delegation;
}
```

### Delegation-aware authorization
```javascript
async function authorizeWithDelegation(userId, action, resource) {
  // Direct check
  if (await directAuthorize(userId, action, resource)) {
    return { allowed: true, via: 'direct' };
  }

  // Delegation check
  const delegations = await prisma.delegation.findMany({
    where: {
      delegateId: userId,
      status: 'active',
      expiresAt: { gt: new Date() },
      permissions: { has: action },
    },
  });

  for (const del of delegations) {
    if (scopeMatches(del.resourceScope, resource)) {
      return { allowed: true, via: 'delegation', delegationId: del.id, delegatorId: del.delegatorId };
    }
  }

  return { allowed: false, via: 'none' };
}
```

### Revoke delegation
```javascript
async function revokeDelegation(delegationId, revokerId, reason) {
  const delegation = await prisma.delegation.findUnique({
    where: { id: delegationId },
  });

  if (!delegation) throw new Error('Delegation not found');
  if (delegation.delegatorId !== revokerId) {
    throw new Error('Only the delegator can revoke');
  }

  await prisma.delegation.update({
    where: { id: delegationId },
    data: { status: 'revoked', revokedAt: new Date(), revokeReason: reason },
  });

  await notify(delegation.delegateId, {
    type: 'delegation_revoked',
    message: `Your delegation from ${delegation.delegatorId} was revoked. Reason: ${reason}`,
  });

  await auditLog('delegation_revoked', {
    delegationId, revokerId, reason
  });
}
```

## Break-Glass Access

Break-glass is an emergency procedure when normal authorization fails or is unavailable.

### When to use break-glass
- Auth provider is down.
- Admin user locked out.
- Production incident requiring immediate access.
- Emergency data recovery.
- Security incident response.

### Break-glass implementation
```javascript
async function activateBreakGlass(userId, reason, systemId, emergencyCode) {
  // Validate emergency code
  const code = await prisma.emergencyCode.findUnique({
    where: { code: emergencyCode, active: true },
  });

  if (!code) {
    throw new Error('Invalid or expired emergency code');
  }

  // Verify user is authorized for break-glass
  if (!code.authorizedUsers.includes(userId)) {
    throw new Error('User not authorized for this emergency code');
  }

  // Create emergency session
  const session = await prisma.emergencySession.create({
    data: {
      userId,
      systemId,
      reason,
      emergencyCodeId: code.id,
      status: 'active',
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60_000), // 30 min
      ipAddress: getClientIp(),
      userAgent: getUserAgent(),
    },
  });

  // Real-time alert
  await Promise.all([
    notifySecurityTeam('BREAK_GLASS_ACTIVATED', {
      userId, reason, systemId, sessionId: session.id,
      timestamp: session.activatedAt, ip: session.ipAddress,
    }),
    notifySystemOwner(systemId, {
      message: `Break-glass access on ${systemId}`,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    }),
  ]);

  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    warning: 'All actions are logged and monitored. Use only for emergency.',
  };
}
```

### Break-glass audit
```javascript
async function auditBreakGlassAction(sessionId, action, resource, success) {
  await prisma.emergencyAction.create({
    data: {
      sessionId,
      action,
      resourceId: resource,
      success,
      timestamp: new Date(),
    },
  });
}
```

### Break-glass rules
- Maximum 30 minutes per session.
- Cannot extend; must create new session.
- 2-factor authentication required even for break-glass.
- Security team notified in real-time.
- All actions recorded with immutable audit trail.
- Retrospective review required within 24 hours.
- Abuse of break-glass = immediate termination of break-glass privileges.

## Comparison

| Feature | JIT Elevation | Permission Delegation | Break-Glass |
|---------|---------------|----------------------|-------------|
| Purpose | Temporary role upgrade | Act on behalf of another | Emergency override |
| Duration | Hours (max 4) | Days-weeks (max 90) | Minutes (max 30) |
| Approval | Pre-approved or manager | Self-service | Pre-registered code |
| Audit | Standard | Standard | Critical + real-time |
| Scope | Role upgrade | Delegate's permissions | Full admin access |
| Revocation | Auto-expire | Manual or auto-expire | Auto-expire |
| Notification | None | Delegator + delegate | Security team |
| Frequency | Planned | Planned | Rare (emergency only) |
