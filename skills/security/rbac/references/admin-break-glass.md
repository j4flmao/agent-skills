# Admin & Break-Glass Patterns

## Admin Role Design

### Principle of least privilege for admins

Admin roles should follow the same least-privilege principle as regular roles. Just because someone is an "admin" doesn't mean they need access to everything.

```yaml
# Anti-pattern: single "admin" role with everything
admin:
  permissions: ['*']   # Too broad

# Better: scoped admin roles
admin-roles:
  user-admin:
    scope: org
    permissions:
      - user.create
      - user.read
      - user.update
      - user.deactivate
      - user.role.read

  system-admin:
    scope: global
    permissions:
      - infrastructure.*
      - deployment.*
      - monitoring.*
      - backup.*

  billing-admin:
    scope: org
    permissions:
      - subscription.*
      - invoice.read
      - invoice.manage
      - payment.*
      - refund.initiate

  security-admin:
    scope: global
    permissions:
      - audit-log.read
      - security.*
      - incident.manage
      - policy.configure
```

### Admin role hierarchy

```
super-admin (platform-wide, unrestricted)
  ├── org-admin (one subsidiary, full management)
  │     ├── user-admin (user management within org)
  │     ├── billing-admin (finance within org)
  │     └── support-admin (customer support within org)
  ├── system-admin (infrastructure, cross-org)
  └── security-admin (security + audit, cross-org)
      └── audit-admin (read-only audit)
```

## Super Admin Account Management

```yaml
super-admin-policy:
  count_limit: 2                       # Maximum 2 super-admin accounts
  assignment:
    approval: board_of_directors       # Requires board-level approval
    review: quarterly                  # Reviewed every 3 months
    term: 12_months                    # Must be re-approved annually

  authentication:
    mfa: required                      # Hardware security key preferred
    ip_restriction: true               # Only from approved IP ranges
    session_duration: 60_minutes       # Auto-logout after 60 min
    concurrent_sessions: 1             # Only one active session

  monitoring:
    all_actions_logged: true           # Every action is recorded
    real_time_alert: true             # Security team notified immediately
    screen_recording: optional         # For high-risk environments

  prohibitions:
    - "Cannot modify audit logs"
    - "Cannot change own role"
    - "Cannot delete tenant data without legal approval"
    - "Cannot access customer PII without documented reason"

  emergency_procedure:
    - "If super-admin access is needed outside normal procedures → use break-glass"
    - "If no super-admin is available → emergency recovery process"
```

## Break-Glass Access Procedure

### 1. Preparation (before incident)

```javascript
// Register break-glass users
async function registerBreakGlassUser(userId, reason) {
  // Generate emergency codes
  const codes = Array.from({ length: 5 }, () => ({
    code: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    usedAt: null,
  }));

  await prisma.breakGlassRegistration.create({
    data: {
      userId,
      reason,
      approvedBy: 'board-approval-ref-123',
      approvedAt: new Date(),
      codes: { create: codes },
      status: 'active',
    },
  });

  // Store codes securely (password manager, printed, sealed envelope)
  console.log('Emergency codes generated. Store securely:');
  codes.forEach((c, i) => console.log(`  Code ${i + 1}: ${c.code}`));
}
```

### 2. Activation (during incident)

```javascript
async function activateBreakGlass(userId, emergencyCode, reason, system) {
  // Validate code
  const code = await prisma.emergencyCode.findFirst({
    where: {
      code: emergencyCode,
      usedAt: null,
      expiresAt: { gt: new Date() },
      registration: { userId, status: 'active' },
    },
    include: { registration: true },
  });

  if (!code) {
    await auditLog('break_glass_failed', { userId, reason, system });
    throw new Error('Invalid or expired emergency code');
  }

  // Mark code as used
  await prisma.emergencyCode.update({
    where: { id: code.id },
    data: { usedAt: new Date(), usedInSession: reason },
  });

  // Create session
  const session = await prisma.emergencySession.create({
    data: {
      userId,
      system,
      reason,
      accessLevel: 'admin',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      status: 'active',
      ipAddress: getClientIp(),
      userAgent: getUserAgent(),
    },
  });

  // IMMEDIATE notification
  await notifySecurityTeam({
    severity: 'CRITICAL',
    title: 'BREAK-GLASS ACTIVATED',
    body: {
      userId, system, reason,
      sessionId: session.id,
      ip: session.ipAddress,
      expiresAt: session.expiresAt,
    },
  });

  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    accessLevel: 'admin',
  };
}
```

### 3. Monitoring (during session)

```javascript
// Middleware that enforces break-glass restrictions
async function breakGlassMiddleware(req, res, next) {
  const sessionId = req.headers['x-break-glass-session'];
  if (!sessionId) return next();

  const session = await prisma.emergencySession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.status !== 'active') {
    return res.status(401).json({ error: 'Invalid or expired break-glass session' });
  }

  if (new Date() > session.expiresAt) {
    await prisma.emergencySession.update({
      where: { id: sessionId },
      data: { status: 'expired' },
    });
    return res.status(401).json({ error: 'Break-glass session expired' });
  }

  // Log every action
  res.on('finish', async () => {
    await prisma.emergencyAction.create({
      data: {
        sessionId,
        action: `${req.method} ${req.path}`,
        resourceId: req.params.id,
        statusCode: res.statusCode,
        timestamp: new Date(),
      },
    });
  });

  next();
}
```

### 4. Review (after incident)

```javascript
async function reviewBreakGlass(sessionId, reviewerId) {
  const session = await prisma.emergencySession.findUnique({
    where: { id: sessionId },
    include: {
      actions: { orderBy: { timestamp: 'asc' } },
    },
  });

  // Generate review report
  const report = {
    sessionId: session.id,
    user: session.userId,
    system: session.system,
    reason: session.reason,
    duration: Math.round((session.expiresAt - session.activatedAt) / 60000),
    totalActions: session.actions.length,
    actionsByType: groupBy(session.actions, 'action'),
    riskAssessment: assessRisk(session.actions),
  };

  // Create review task
  await prisma.breakGlassReview.create({
    data: {
      sessionId,
      reviewerId,
      report: report,
      status: 'pending',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  return report;
}

function assessRisk(actions) {
  const HIGH_RISK = ['DELETE', 'DROP', 'ALTER', 'EXPORT', 'DEACTIVATE'];
  const risky = actions.filter(a => HIGH_RISK.some(r => a.action.includes(r)));
  return {
    level: risky.length > 0 ? 'high' : 'medium',
    riskyActions: risky,
    recommendation: risky.length > 0
      ? 'Requires additional review and possible rollback'
      : 'Standard review sufficient',
  };
}
```

## Admin Session Management

```javascript
class AdminSessionManager {
  // Create admin session with elevated security
  async createAdminSession(userId) {
    // Verify MFA
    if (!await verifyMFA(userId)) {
      throw new Error('MFA required for admin session');
    }

    // Check for existing session
    await this.terminateExistingSessions(userId);

    // Create session with restrictions
    const session = await prisma.adminSession.create({
      data: {
        userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        maxIdleMinutes: 15,
        ipRestricted: true,
        createdAt: new Date(),
      },
    });

    return session;
  }

  // Validate admin session on each request
  async validateSession(sessionId, ip) {
    const session = await prisma.adminSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'active') {
      return { valid: false, reason: 'Session not found or inactive' };
    }

    if (new Date() > session.expiresAt) {
      await this.expireSession(sessionId);
      return { valid: false, reason: 'Session expired' };
    }

    // Check idle timeout
    const lastActivity = session.lastActivityAt;
    const idleMinutes = (Date.now() - lastActivity.getTime()) / 60000;
    if (idleMinutes > session.maxIdleMinutes) {
      await this.expireSession(sessionId);
      return { valid: false, reason: 'Session idle timeout' };
    }

    // Check IP restriction
    if (session.ipRestricted && session.lastIp !== ip) {
      await this.logSecurityEvent('admin_session_ip_mismatch', {
        sessionId, expectedIp: session.lastIp, actualIp: ip
      });
      return { valid: false, reason: 'IP address changed' };
    }

    // Update last activity
    await prisma.adminSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date(), lastIp: ip },
    });

    return { valid: true };
  }
}
```

## Admin Action Approval Workflows

| Action | Approval Required | Approver | Timeout |
|--------|-----------------|----------|---------|
| Create super-admin | Board of directors | 3 of 5 board members | 7 days |
| Create org-admin | Org head | 1 approval | 48 hours |
| Delete tenant | Legal + CTO | 2 approvals | 14 days |
| Export all user data | DPO + Security | 2 approvals | 7 days |
| Change billing plan | Finance head | 1 approval | 24 hours |
| Deploy to production | Tech lead | 1 approval | 4 hours |
| Grant cross-org access | Org admin | 1 approval | 24 hours |

```javascript
async function createApprovalWorkflow(action, initiator, details) {
  const workflow = APPROVAL_WORKFLOWS[action];
  if (!workflow) {
    throw new Error(`No workflow defined for: ${action}`);
  }

  const request = await prisma.approvalRequest.create({
    data: {
      action,
      initiatorId: initiator,
      details,
      status: 'pending',
      requiredApprovals: workflow.requiredApprovals,
      expiresAt: new Date(Date.now() + workflow.timeoutMs),
      steps: {
        create: workflow.approvers.map((approverRole, i) => ({
          approverRole,
          step: i + 1,
          status: i === 0 ? 'pending' : 'waiting',
        })),
      },
    },
  });

  // Notify first approver
  await notifyApprovers(workflow.approvers[0], request);
  return request;
}
```

## Admin Security Checklist

- [ ] All admin accounts require MFA (hardware key > TOTP > SMS).
- [ ] Admin sessions auto-expire after 1 hour of inactivity.
- [ ] Concurrent admin sessions limited to 1.
- [ ] IP whitelist enforced for admin access.
- [ ] Every admin action is logged with immutable audit trail.
- [ ] Admin audit logs cannot be modified or deleted.
- [ ] Break-glass codes are stored offline (printed, sealed).
- [ ] Break-glass sessions expire in 30 minutes.
- [ ] Break-glass activation immediately notifies security team.
- [ ] All admin role assignments require approval.
- [ ] Quarterly review of all admin account holders.
- [ ] Admin count limits enforced at system level.
- [ ] No shared admin accounts (unique user per account).
- [ ] Admin API access requires separate API keys with restricted scopes.
