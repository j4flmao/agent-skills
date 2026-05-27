---
name: enterprise-rbac
description: >
  Use this skill when the user says 'RBAC', 'role-based access control', 'role hierarchy',
  'enterprise RBAC', 'separation of duties', 'SoD', 'role engineering', 'admin role', 'super admin',
  'master admin', 'break glass', 'JIT access', 'permission delegation', 'subsidiary permissions',
  'multi-org roles', 'NIST RBAC', or when designing role structures for enterprise organizations
  with complex hierarchies, subsidiaries, departments, and compliance requirements.
  This skill covers: NIST RBAC levels (Core/Hierarchical/Constrained), role hierarchy design,
  role engineering, enterprise org structures (parent/subsidiary/department/team), admin patterns
  (super admin, master admin, org admin, break-glass), SoD, temporary elevation, and permission
  delegation. Do NOT use for: authentication flows, JWT implementation, ABAC, ReBAC, or basic
  single-role permission checks covered by the authorization skill.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, rbac, access-control, authorization, enterprise, role-management, phase-6]
---

# Enterprise RBAC

## Purpose
Design role-based access control for enterprise organizations with complex hierarchies, multi-level subsidiaries, compliance-driven separation of duties, and flexible admin delegation. RBAC reduces audit complexity and makes permission reasoning predictable.

## Agent Protocol

### Trigger
Exact user phrases: "RBAC", "role-based access control", "role hierarchy", "enterprise RBAC", "separation of duties", "SoD", "role engineering", "admin role", "super admin", "master admin", "break glass", "JIT access", "permission delegation", "subsidiary permissions", "multi-org roles", "NIST RBAC", "role inheritance", "mutually exclusive roles", "access certification".

### Input Context
- Organization structure: parent company, subsidiaries, departments, teams.
- Number of distinct roles (current and projected).
- Compliance frameworks (SOC 2, SOX, HIPAA, PCI DSS, GDPR).
- Existing role structure (if any) and pain points.
- Identity provider and directory service.

### Output Artifact
RBAC architecture document: role hierarchy tree, permission inheritance model, SoD matrix, admin role definitions, elevation workflows, delegation policies.

### Response Format
```
RBAC Level: {Core|Hierarchical|Constrained}
Role Count: {total roles, admin roles, functional roles}
Hierarchy Depth: {levels}
SoD Conflicts: {pairs}
Elevation: {approval required|self-service|none}
Delegation: {enabled|disabled}
```

### Completion Criteria
- [ ] NIST RBAC level determined.
- [ ] Role hierarchy designed with inheritance.
- [ ] Enterprise org structure mapped to role scope.
- [ ] Admin roles defined (super admin, org admin, break-glass, etc.).
- [ ] SoD rules documented.
- [ ] Temporary elevation workflow specified.
- [ ] Permission delegation model defined.
- [ ] Role engineering process established.

### Max Response Length
RBAC architecture: 30 lines maximum.

## Workflow

### Step 1: Understand NIST RBAC Levels
The INCITS 359 RBAC standard defines four levels of increasing capability:

| Level | Name | Features | When |
|-------|------|----------|------|
| 0 | Flat RBAC | Users have roles, roles have permissions | Simple apps, < 10 roles |
| 1 | Core RBAC | Role assignment + authorization + review | Standard enterprise apps |
| 2 | Hierarchical RBAC | Role inheritance (general or limited) | Multi-level orgs, subsidiaries |
| 3 | Constrained RBAC | Static/Dynamic Separation of Duties | Compliance-driven (finance, healthcare) |

**Core RBAC elements:**
```
Users ──(UA)──> Roles ──(PA)──> Permissions
  │                              │
  └────── User Sessions ────────┘
```

- **UA (User Assignment)**: A user is assigned one or more roles.
- **PA (Permission Assignment)**: A role is assigned a set of permissions.
- **Session**: A user activates a subset of their assigned roles.
- **Review**: Administrator can review which users have which roles.

**Implementation recommendation:** Start at Level 1 (Core) and add hierarchy and constraints incrementally. Never implement Level 3 without Level 2.

### Step 2: Design Role Hierarchy

**General role hierarchy** (multiple inheritance):
```
                    super-admin
                   /           \
          org-admin             system-admin
          /        \                 |
       manager   billing-admin   devops-admin
       /     \        |              |
     lead   finance  support      deploy-bot
      |
    member
```

**Implementation with inheritance:**
```javascript
// Role hierarchy definition
const ROLE_HIERARCHY = new Map([
  ['super-admin',    { parents: [],       scope: 'global',     type: 'admin' }],
  ['org-admin',      { parents: ['super-admin'], scope: 'org', type: 'admin' }],
  ['system-admin',   { parents: ['super-admin'], scope: 'global', type: 'admin' }],
  ['manager',        { parents: ['org-admin'],     scope: 'dept',   type: 'functional' }],
  ['billing-admin',  { parents: ['org-admin'],     scope: 'org',    type: 'admin' }],
  ['devops-admin',   { parents: ['system-admin'],  scope: 'global', type: 'admin' }],
  ['lead',           { parents: ['manager'],       scope: 'team',   type: 'functional' }],
  ['finance',        { parents: ['manager'],       scope: 'dept',   type: 'functional' }],
  ['support',        { parents: ['manager'],       scope: 'org',    type: 'functional' }],
  ['member',         { parents: ['lead'],          scope: 'self',   type: 'functional' }],
  ['deploy-bot',     { parents: ['devops-admin'],  scope: 'global', type: 'service' }],
]);

// Resolve effective permissions (inherited)
function resolvePermissions(roleName) {
  const visited = new Set();
  const permissions = [];
  const queue = [roleName];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const perms = PERMISSION_CATALOG.get(current) || [];
    permissions.push(...perms);
    const role = ROLE_HIERARCHY.get(current);
    if (role) queue.push(...role.parents);
  }
  return [...new Set(permissions)];
}
```

**Inheritance rules:**
- Junior roles inherit permissions from senior roles in the chain.
- A permission explicitly denied at a lower level cannot be re-allowed at a higher level (deny-takes-precedence).
- Maximum hierarchy depth: 7±2 levels (cognitive limit).
- A user with multiple roles gets the union of all inherited permissions.

### Step 3: Model Enterprise Org Structure

Map the org hierarchy to RBAC scopes:

```
Group Holding (parent company)
  ├── Subsidiary A (fully owned)
  │   ├── Engineering Department
  │   │   ├── Platform Team
  │   │   └── Product Team
  │   ├── Sales Department
  │   │   ├── Enterprise Sales Team
  │   │   └── SMB Sales Team
  │   └── Finance Department
  └── Subsidiary B (partial ownership)
      ├── Operations Department
      └── HR Department
```

**Scope model:**
```javascript
const ORG_SCOPE = {
  // Each level defines what resources the role can access
  'global':    { filter: (user) => ({}),                                                       label: 'Everything' },
  'org':       { filter: (user) => ({ orgId: user.orgId }),                                    label: 'One subsidiary' },
  'dept':      { filter: (user) => ({ orgId: user.orgId, deptId: user.deptId }),               label: 'One department' },
  'team':      { filter: (user) => ({ orgId: user.orgId, deptId: user.deptId, teamId: user.teamId }), label: 'One team' },
  'self':      { filter: (user) => ({ ownerId: user.id }),                                    label: 'Own resources' },
};

function scopeFilter(user) {
  const role = ROLE_HIERARCHY.get(user.role);
  if (!role) return ORG_SCOPE['self'].filter(user);
  return (ORG_SCOPE[role.scope] || ORG_SCOPE['self']).filter(user);
}
```

**Multi-org considerations:**
- A super-admin can operate across all subsidiaries.
- An org-admin is scoped to one subsidiary but sees all departments within it.
- A manager sees only their department, across all teams.
- Data access queries always append the scope filter.
- Cross-org data sharing requires explicit cross-org permission grants.

### Step 4: Implement Admin Roles

| Role | Scope | Permissions | Assignment | Audit |
|------|-------|-------------|------------|-------|
| **Super Admin** | Global | Everything (unrestricted) | Board-level approval, max 2 people | Real-time, all actions logged |
| **Master Admin** | Cross-org | All admin functions | CEO/CTO approval, max 5 people | Real-time, elevated logging |
| **Org Admin** | Single org | Full admin within org | Org head approval | Daily review |
| **System Admin** | Infrastructure | Deploy, config, monitor | CTO approval | Real-time |
| **Billing Admin** | Single org | Finance, subscriptions, invoices | Finance head approval | Weekly review |
| **Support Admin** | Single org | User mgmt, read-only data | Support head approval | Weekly review |
| **Audit Admin** | Global read | Read-only + audit log | Compliance officer approval | Read-only enforced |

**Super admin constraints:**
```javascript
// Super admin limitations (for compliance)
const SUPER_ADMIN_CONSTRAINTS = {
  maxCount: 2,                        // Never more than 2
  requireBoardApproval: true,         // Cannot self-appoint
  actionsLogged: ['*'],               // Every action is logged
  cannotDeleteAuditLogs: true,        // Immutable audit trail
  breakGlassOnly: false,              // Standing access (not JIT)
  mfaRequired: true,                  // Always MFA
  ipRestricted: ['10.0.0.0/8'],       // Internal network only
};
```

**Break-glass (emergency access):**
```javascript
// Emergency access when normal auth is unavailable
async function activateBreakGlass(userId, reason, systemAffected) {
  // Validate user is registered for break-glass capability
  const user = await getBreakGlassUser(userId);
  if (!user || !user.breakGlassEnabled) {
    throw new Error('User not authorized for break-glass access');
  }

  // Generate one-time emergency code
  const emergencyCode = crypto.randomBytes(32).toString('hex');

  // Create time-limited emergency session
  const session = await prisma.emergencySession.create({
    data: {
      userId,
      reason,
      systemAffected,
      emergencyCode,
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60_000), // 30 minutes
      status: 'active',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }
  });

  // Notify security + affected system owners
  await Promise.all([
    notifySecurityTeam('BREAK_GLASS_ACTIVATED', {
      userId, reason, systemAffected, sessionId: session.id
    }),
    notifySystemOwners(systemAffected, {
      message: `Break-glass access activated for ${userId} on ${systemAffected}`,
      sessionId: session.id,
      expiresAt: session.expiresAt
    })
  ]);

  return {
    sessionId: session.id,
    emergencyCode,
    expiresAt: session.expiresAt,
    message: 'Break-glass access activated. This session is logged and monitored.'
  };
}

// Automatic expiry
async function expireStaleSessions() {
  await prisma.emergencySession.updateMany({
    where: { expiresAt: { lt: new Date() }, status: 'active' },
    data: { status: 'expired' }
  });
}
```

**Delegated admin pattern:**
```
Org Admin
  └── Department Manager (delegated admin for their dept)
        └── Team Lead (delegated admin for their team)
```

Delegated admins can:
- Manage users within their scope (add, remove, update roles).
- View audit logs for their scope.
- Configure team-specific settings.
- Cannot override org-level policies or access other scopes.

### Step 5: Implement Separation of Duties

**Static SoD (mutually exclusive roles):**
```javascript
// A user cannot hold both roles simultaneously
const SOD_STATIC = {
  // Financial controls
  'purchase-requester': ['purchase-approver'],
  'purchase-approver':  ['purchase-requester', 'purchase-receiver'],
  'purchase-receiver':  ['purchase-approver'],
  'payment-initiator':  ['payment-approver'],
  'payment-approver':   ['payment-initiator'],

  // System controls
  'developer':          ['qa-approver'],
  'qa-approver':        ['developer'],
  'deployer':           ['code-reviewer'],

  // Admin controls
  'user-admin':         ['auditor'],
  'auditor':            ['user-admin'],
};

function validateRoleAssignment(userId, newRole) {
  const currentRoles = getUserRoles(userId);
  const conflicts = SOD_STATIC[newRole] || [];
  for (const currentRole of currentRoles) {
    if (conflicts.includes(currentRole)) {
      return {
        allowed: false,
        reason: `Cannot hold both roles: ${newRole} and ${currentRole}`,
        conflictType: 'static_sod'
      };
    }
    // Check reverse
    const reverseConflicts = SOD_STATIC[currentRole] || [];
    if (reverseConflicts.includes(newRole)) {
      return {
        allowed: false,
        reason: `Cannot hold both roles: ${currentRole} and ${newRole}`,
        conflictType: 'static_sod'
      };
    }
  }
  return { allowed: true };
}
```

**Dynamic SoD (same user cannot act on same resource in conflicting roles):**
```javascript
// Two-person rule: different users for conflicting operations
async function enforceTwoPersonRule(action, resourceId, userId) {
  // Check for recent conflicting actions by same user
  const recentActions = await prisma.auditLog.findMany({
    where: {
      userId,
      resourceId,
      action: { in: getConflictingActions(action) },
      timestamp: { gte: subHours(new Date(), 24) }
    }
  });
  if (recentActions.length > 0) {
    return {
      allowed: false,
      reason: `Two-person rule: ${userId} already performed ` +
               `${recentActions[0].action} on this resource within 24h`,
      conflictType: 'dynamic_sod'
    };
  }
  return { allowed: true };
}
```

**Common compliance SoD mappings:**

| Framework | Required SoD |
|-----------|-------------|
| SOX | Create PO ≠ Approve PO, Record transaction ≠ Reconcile |
| SOC 2 | Developer ≠ Deployer, Admin ≠ Auditor |
| PCI DSS | Cardholder data access ≠ Security monitoring |
| HIPAA | Treat patient ≠ Access all patient records |
| GDPR | Data processor ≠ Data protection officer |

### Step 6: Implement Temporary Role Elevation

```javascript
// Self-service elevation for pre-approved roles
async function selfElevate(userId, targetRole, durationMinutes, reason) {
  // Check pre-approval
  const approval = await prisma.elevationPolicy.findFirst({
    where: {
      userId,
      targetRole,
      active: true,
      expiresAt: { gt: new Date() }
    }
  });
  if (!approval) {
    return { success: false, error: 'No active elevation policy found' };
  }

  // Create elevation session
  const elevation = await prisma.roleElevation.create({
    data: {
      userId,
      fromRole: getUserRole(userId),
      toRole: targetRole,
      reason,
      durationMinutes,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + durationMinutes * 60_000),
      status: 'active',
      approvalMethod: 'pre-approved'
    }
  });

  await logSecurityEvent('role_elevated', {
    userId, fromRole: elevation.fromRole, toRole: targetRole,
    reason, durationMinutes, elevationId: elevation.id
  });

  return { success: true, elevation };
}

// Manager-approval elevation workflow
async function requestElevation(userId, targetRole, durationMinutes, reason) {
  // Get user's manager
  const user = await getUser(userId);
  const managerId = user.managerId;
  if (!managerId) {
    throw new Error('No manager found for approval');
  }

  // Create pending elevation
  const elevation = await prisma.roleElevation.create({
    data: {
      userId, fromRole: user.role, toRole: targetRole,
      reason, durationMinutes, status: 'pending',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + durationMinutes * 60_000),
    }
  });

  // Notify manager
  await notifyUser(managerId, {
    type: 'elevation_approval',
    title: 'Role elevation request',
    body: `${userId} requests ${targetRole} for ${durationMinutes} minutes. Reason: ${reason}`,
    actionUrl: `/admin/elevations/${elevation.id}`,
    expiresIn: '2 hours'
  });

  return {
    success: true,
    elevationId: elevation.id,
    status: 'pending',
    message: 'Elevation request sent to manager for approval'
  };
}

// Scheduled expiry enforcer
// cron job running every minute
async function expireElevations() {
  const expired = await prisma.roleElevation.updateMany({
    where: {
      status: 'active',
      expiresAt: { lt: new Date() }
    },
    data: { status: 'expired' }
  });
  if (expired.count > 0) {
    await logSecurityEvent('elevations_expired', { count: expired.count });
  }
}
```

**Elevation rules:**
- Maximum elevation duration: 4 hours (reset requires re-approval).
- Elevation to super-admin requires at least 2 approvers.
- All elevations are logged and appear in access certifications.
- Concurrent elevations limited to 1 per user.
- Certain actions (delete, export all, deactivate admin) require elevation even for admins.

### Step 7: Implement Permission Delegation

User A (delegator) grants User B (delegate) the ability to act on A's behalf:

```javascript
// Delegation model
async function createDelegation({
  delegatorId,
  delegateId,
  resourceScope,     // { orgId, deptId, resourceType }
  permissions,       // ['read', 'write']
  reason,
  expiresAt
}) {
  // Validations
  if (!(await ownsScope(delegatorId, resourceScope))) {
    throw new Error('Delegator does not own the specified scope');
  }
  if (delegateId === delegatorId) {
    throw new Error('Cannot delegate to yourself');
  }

  // Check delegator has the permissions they're delegating
  const delegatorPerms = getEffectivePermissions(delegatorId);
  for (const perm of permissions) {
    if (!delegatorPerms.includes(perm)) {
      throw new Error(`Delegator does not have permission: ${perm}`);
    }
  }

  // Create delegation
  const delegation = await prisma.permissionDelegation.create({
    data: {
      delegatorId, delegateId,
      resourceScope,
      permissions,
      reason,
      expiresAt: new Date(expiresAt),
      status: 'active',
      createdAt: new Date()
    }
  });

  await logSecurityEvent('delegation_created', {
    delegatorId, delegateId,
    resourceScope, permissions,
    delegationId: delegation.id,
    expiresAt
  });

  return delegation;
}

// Delegation-aware authorization
async function authorizeWithDelegation(userId, action, resource) {
  // Direct authorization check
  if (await directAuthorize(userId, action, resource)) {
    return { allowed: true, method: 'direct' };
  }

  // Delegation check
  const delegation = await prisma.permissionDelegation.findFirst({
    where: {
      delegateId: userId,
      permissions: { has: action },
      status: 'active',
      expiresAt: { gt: new Date() },
      OR: [
        { resourceScope: { path: '$', equals: {} } }, // global
        { resourceScope: { path: '$.orgId', equals: resource.orgId } },
      ]
    }
  });

  if (delegation) {
    return { allowed: true, method: 'delegation', delegationId: delegation.id };
  }

  return { allowed: false, method: 'none' };
}

// Revoke delegation
async function revokeDelegation(delegationId, revokerId, reason) {
  const delegation = await prisma.permissionDelegation.update({
    where: { id: delegationId },
    data: { status: 'revoked', revokedAt: new Date(), revokedBy: revokerId }
  });
  await logSecurityEvent('delegation_revoked', {
    delegationId, revokerId, reason
  });
  // Notify delegate
  await notifyUser(delegation.delegateId, {
    type: 'delegation_revoked',
    message: `Your delegation from ${delegation.delegatorId} has been revoked. Reason: ${reason}`
  });
}
```

**Delegation types:**

| Type | Description | Duration | Approval |
|------|-------------|----------|----------|
| Absence delegation | Full permissions during leave | Set dates | Manager approval |
| Task delegation | Single task/resource | Until complete | Self-service |
| Standing delegation | Ongoing for a role | With expiration | Manager approval |
| Emergency delegation | Urgent, no pre-approval | 24h max | Auto-notify, retroactive approval |

### Step 8: Integrate RBAC with Policy Engines

**Casbin (Go, Node.js, Python, Java, .NET, Rust):**
```ini
# casbin_model.conf
[request_definition]
r = sub, org, obj, act

[policy_definition]
p = sub, org, obj, act

[role_definition]
g = _, _, _
g2 = _, _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.org) && (r.org == p.org || p.org == "*") && \
    keyMatch(r.obj, p.obj) && (r.act == p.act || p.act == "*")
```

**OPA (Rego) with enterprise RBAC:**
```rego
package enterprise_rbac

# Role hierarchy with inheritance
role_hierarchy = {
  "super-admin":  {"parent": null,  "scope": "global"},
  "org-admin":    {"parent": "super-admin", "scope": "org"},
  "manager":      {"parent": "org-admin",   "scope": "dept"},
  "lead":         {"parent": "manager",     "scope": "team"},
  "member":       {"parent": "lead",        "scope": "self"},
}

# Resolve inherited roles
inherited_roles[user] = roles {
  some role
  data.users[user].role == role
  roles = resolve_chain(role, [])
}

resolve_chain(role, acc) = all_roles {
  all_roles = concat(acc, [role])
  parent = role_hierarchy[role].parent
  parent != null
  all_roles = resolve_chain(parent, all_roles)
}

resolve_chain(role, acc) = acc {
  role_hierarchy[role].parent == null
}

# Authorization
default allow = false

allow {
  roles := inherited_roles[input.user_id]
  some role
  some perm in data.permissions[role]
  perm.resource == input.resource
  perm.action == input.action
}
```

## Rules
- Every role must have a documented purpose and owner.
- Maximum 2 super-admin accounts per system. Period.
- Role hierarchy depth must not exceed 7 levels.
- Static SoD conflicts must be enforced at role assignment, not just at access time.
- Temporary elevation must auto-expire. Never create permanent JIT roles.
- Delegated permissions cannot exceed the delegator's own permissions.
- All admin actions must be logged with immutable audit trail.
- Access certifications every 90 days for all roles, 30 days for admin roles.
- Break-glass access notifies security team immediately and expires in 30 minutes.
- Never assign users directly — always go through role assignment.

## References
  - references/admin-break-glass.md — Admin & Break-Glass Patterns
  - references/enterprise-org-structure.md — Enterprise Org Structure RBAC
  - references/framework-integration.md — RBAC Framework Integration
  - references/rbac-advanced.md — Rbac Advanced Topics
  - references/rbac-fundamentals.md — Rbac Fundamentals
  - references/rbac-migration.md — RBAC Migration & Audit
  - references/role-engineering.md — Role Engineering
  - references/temporary-delegation-workflows.md — Temporary Elevation & Delegation Workflows
## Handoff
No artifact produced unless requested.
Next skill: authorization (backend) — choose the right model, integrate RBAC into application.
Next skill: iam-governance — identity lifecycle, access certification, PAM.
Carry forward: role hierarchy, SoD matrix, elevation workflows, admin role definitions.
