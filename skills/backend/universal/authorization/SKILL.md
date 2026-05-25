---
name: backend-authorization
description: >
  Use this skill when the user says 'authorization', 'access control', 'RBAC', 'ABAC', 'ReBAC',
  'permissions', 'role', 'policy', 'Casbin', 'Cerbos', 'permission delegation', 'temporary access',
  'break glass', 'super admin', 'JIT elevation', 'role hierarchy', or when designing or implementing
  authorization for any backend application. This skill covers: authorization model selection (RBAC/ABAC/ReBAC),
  permission architecture design, role hierarchy and inheritance, admin/master admin patterns,
  temporary JIT elevation, permission delegation, fine-grained ABAC policies, policy engine integration
  (Casbin, OPA, Cerbos, Permit.io), and authorization testing. Do NOT use for: authentication flows,
  JWT implementation, OAuth2/OIDC configuration, session management, or frontend route guards.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, authorization, access-control, rbac, abac, phase-5]
---

# Backend Authorization

## Purpose
Design and implement authorization that is correct, auditable, and maintainable. Every protected resource must have an explicit access decision. Authorization rules live in code or policy, never in the developer's head.

## Agent Protocol

### Trigger
Exact user phrases: "authorization", "access control", "RBAC", "ABAC", "ReBAC", "permissions", "role", "policy engine", "Casbin", "Cerbos", "Permit.io", "OPA", "permission delegation", "temporary access", "break glass", "super admin", "master admin", "JIT elevation", "role hierarchy", "permission model", "least privilege", "separation of duties", "I want to restrict access".

### Input Context
- Application type and resource inventory (entities, actions per entity).
- User types and their organizational structure.
- Existing auth system (if any) — JWT claims, auth middleware.
- Compliance requirements (SOC 2, HIPAA, SOX, PCI DSS).
- Expected scale (users, roles, permissions, tenants).

### Output Artifact
Authorization architecture document: model selection, role tree, permission matrix, policy structure, integration plan.

### Response Format
```
Model: {RBAC|ABAC|ReBAC|Hybrid}
Role Tree: {top-level roles, hierarchy depth}
Granularity: {coarse|fine|mixed}
Policy Engine: {native|Casbin|OPA|Cerbos}
Admin Pattern: {flat|hierarchical|break-glass}
Testing: {matrix|regression|fuzzing}
```

### Completion Criteria
- [ ] Authorization model selected based on requirements.
- [ ] Permission architecture designed with levels and granularity.
- [ ] Role hierarchy defined with inheritance.
- [ ] Admin/super-admin patterns specified.
- [ ] Temporary elevation or delegation mechanism (if needed).
- [ ] Policy engine integration planned.
- [ ] Authorization test matrix written.

### Max Response Length
Authorization architecture: 25 lines maximum.

## Workflow

### Step 1: Identify Authorization Requirements
Map every resource and action in the system:

| Resource | Actions | Conditions |
|----------|---------|------------|
| Invoice | create, read, update, delete, approve | own dept only, business hours |
| User | read, update, deactivate | same org level |
| Workspace | create, read, update, delete, invite | quota limits |
| Report | generate, export, schedule | premium tier only |

Collect:
- **Resource inventory** — every entity the system manages.
- **Action catalog** — Create, Read, Update, Delete, Execute, Approve, Delegate.
- **User taxonomy** — types, org levels, relationships.
- **Environmental constraints** — time, location, device trust, risk score.
- **Compliance rules** — SoD, data segregation, retention policies.

### Step 2: Choose Authorization Model

| Model | Granularity | Complexity | Scale | Best For |
|-------|-------------|------------|-------|----------|
| ACL | Per-resource | Low | Small | Simple file sharing |
| RBAC (Core) | Role-level | Low | Large | Enterprise apps, orgs with clear roles |
| RBAC (Hierarchical) | Role-level + inheritance | Medium | Large | Multi-level orgs, subsidiaries |
| RBAC (Constrained) | Role + SoD | Medium | Large | Regulated industries |
| ABAC | Attribute-level | High | Very large | Multi-tenant, document-level, context-aware |
| ReBAC | Relationship-level | High | Very large | Collaboration, social, hierarchical data |

Decision matrix:
- Have < 10 roles with no hierarchy? → Core RBAC.
- Multiple org levels (parent → subsidiary → department)? → Hierarchical RBAC.
- Regulated (finance, healthcare)? → Constrained RBAC with SoD.
- Need document/row-level permissions? → ABAC or ABAC-over-RBAC.
- Social/collaboration app (who can see what depends on relationships)? → ReBAC.
- Different resources need different models? → Hybrid (RBAC core + ABAC for fine-grained).

### Step 3: Design Permission Architecture
Define permission levels and granularity:

```
Global (SaaS-wide)
  └── Organization (company)
        └── Workspace (project/team)
              └── Resource (document, record, asset)
                    └── Field (specific column/attribute)
```

Coarse-grained permissions (RBAC level):
- `workspace.read`, `workspace.write`, `workspace.delete`
- Role: `editor` can `workspace.read` + `workspace.write`

Fine-grained permissions (ABAC level):
- `document.read` where `document.department == user.department`
- `invoice.approve` where `amount < 10000 && user.role == 'manager'`

Permission types:
| Type | Example | Enforcement |
|------|---------|-------------|
| Functional | `report.export` | UI hide + API guard |
| Data | `read own records only` | Query filter + row-level security |
| Field | `view salary column` | GraphQL field resolver |
| Environmental | `approve during business hours` | Policy condition |
| Administrative | `deactivate user` | Admin guard + audit |

### Step 4: Implement RBAC Core
```javascript
// Role-to-permission mapping (source of truth)
const PERMISSIONS = {
  admin:     ['*'],
  manager:   ['workspace.*', 'report.*', 'user.read', 'user.invite'],
  editor:    ['workspace.read', 'workspace.write', 'document.*'],
  viewer:    ['workspace.read', 'document.read'],
  guest:     ['document.read']
};

// Authorization check
function authorize(user, action, resource) {
  const role = user.role;
  const permissions = PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return permissions.some(p =>
    p === `${resource}.${action}` ||
    p === `${resource}.*` ||
    p === `*.${action}` ||
    p === '*'
  );
}
```

Rules:
- Permissions use `{resource}.{action}` format with wildcard support.
- One role = one set of permissions. No per-user overrides (use attribute-based for exceptions).
- Role is assigned at user level, stored in JWT or session.
- Never hardcode user IDs in permission checks.

### Step 5: Implement Advanced RBAC

**Role hierarchy** with inheritance:
```
super-admin         (everything, cross-org)
  └── org-admin    (everything within one org)
        └── manager  (inherits manager perms + department scope)
              └── lead  (inherits lead perms + team scope)
                    └── member (basic perms)
```

```javascript
// Role hierarchy with inherited permissions
const ROLE_HIERARCHY = {
  'super-admin':  { parent: null,   scope: 'global' },
  'org-admin':    { parent: 'super-admin'  | 'org-admin'   | 'manager'      | 'lead'         | null, scope: 'org' },
  'manager':      { parent: 'org-admin',    scope: 'department' },
  'lead':         { parent: 'manager',      scope: 'team' },
  'member':       { parent: 'lead',         scope: 'self' }
};

function getEffectivePermissions(role) {
  let perms = new Set(PERMISSIONS[role] || []);
  let current = ROLE_HIERARCHY[role];
  while (current?.parent) {
    const parentPerms = PERMISSIONS[current.parent] || [];
    parentPerms.forEach(p => perms.add(p));
    current = ROLE_HIERARCHY[current.parent];
  }
  return [...perms];
}
```

**Separation of Duties (SoD)**:
```javascript
// Static SoD — mutually exclusive roles
const SOD_STATIC = {
  'purchase-approver': ['purchase-requester', 'purchase-receiver'],
  'auditor':           ['accountant', 'treasurer']
};

// Dynamic SoD — cannot act on same resource
function checkDynamicSoD(userId, action, resourceId) {
  const history = getRecentActions(userId, resourceId);
  if (action === 'approve' && history.includes('submit')) {
    return false; // Cannot approve your own submission
  }
  return true;
}
```

**Scope-based authorization** for multi-org:
```javascript
function authorizeScoped(user, action, resource, resourceOrgId) {
  const roleInfo = ROLE_HIERARCHY[user.role];
  if (!roleInfo) return false;

  // Scope check
  switch (roleInfo.scope) {
    case 'global':  return true;  // super-admin sees everything
    case 'org':     return user.orgId === resourceOrgId;
    case 'department': return user.deptId === getResourceDept(resourceOrgId);
    case 'team':    return user.teamId === getResourceTeam(resourceOrgId);
    case 'self':    return user.id === getResourceOwner(resourceOrgId);
    default:        return false;
  }
}
```

### Step 6: Implement Fine-Grained Access (ABAC)

For when role-level is too coarse:

```javascript
// ABAC policy rule
const POLICY = {
  "effect": "deny",
  "target": {
    "resource": "invoice",
    "action": "approve"
  },
  "condition": {
    "all": [
      { "subject.role": { "neq": "admin" } },
      { "resource.amount": { "gt": 10000 } },
      { "subject.department": { "neq": "resource.department" } }
    ]
  }
};

// ABAC evaluation engine
function evaluateABAC(subject, resource, action, env, policies) {
  for (const policy of policies) {
    if (matchesTarget(policy.target, resource, action)) {
      if (evaluateConditions(policy.condition, { subject, resource, env })) {
        return policy.effect === 'allow';
      }
    }
  }
  return false; // default deny
}
```

**Attribute sources:**
| Attribute Type | Examples | Source |
|---------------|----------|--------|
| Subject | role, department, clearance, location | JWT token / User DB |
| Resource | owner, department, classification, tier | Resource DB |
| Action | read, write, approve, delete | Request path + method |
| Environment | time, IP, device trust, risk score | Request context |

### Step 7: Implement Temporary & Delegated Permissions

**JIT (Just-In-Time) elevation:**
```javascript
// Elevation request
async function elevateRole(userId, targetRole, reason, durationMinutes) {
  if (!canRequestElevation(userId, targetRole)) {
    throw new Error('Elevation not permitted');
  }
  const approval = await requestApproval(userId, targetRole, reason);
  if (!approval.approved) {
    throw new Error('Elevation denied');
  }
  // Create time-bound elevation
  await createElevation({
    userId,
    elevatedRole: targetRole,
    expiresAt: Date.now() + durationMinutes * 60_000,
    reason,
    approvedBy: approval.approvedBy,
    auditId: crypto.randomUUID()
  });
  // Log audit event
  await logSecurityEvent('role_elevation', {
    userId, targetRole, reason, durationMinutes, approvedBy: approval.approvedBy
  });
}
```

**Permission delegation:**
```javascript
async function delegatePermission(delegatorId, delegateId, actions, resourceScope, expiresAt) {
  // Verify delegator owns the resource scope
  if (!ownsScope(delegatorId, resourceScope)) {
    throw new Error('Cannot delegate what you do not own');
  }
  await createDelegation({
    delegatorId, delegateId, actions, resourceScope, expiresAt,
    revoked: false
  });
}

// Check including delegation
function authorizeWithDelegation(user, action, resource) {
  return (
    authorize(user, action, resource) ||
    hasDelegatedPermission(user.id, action, resource)
  );
}
```

**Break-glass (emergency access):**
```javascript
async function breakGlassAccess(userId, resourceId, reason) {
  // Must have break-glass capability
  if (!userHasCapability(userId, 'break-glass')) {
    throw new Error('User not authorized for break-glass');
  }
  // Create time-limited emergency session
  const session = await createEmergencySession({
    userId,
    resourceId,
    reason,
    accessLevel: 'admin',
    expiresAt: Date.now() + 30 * 60_000, // 30 minutes
    multiFactorRequired: true
  });
  // Notify security team immediately
  await notifySecurityTeam('BREAK_GLASS_ACTIVATED', {
    userId, resourceId, reason, sessionId: session.id
  });
  // Log everything
  await logSecurityEvent('break_glass', {
    userId, resourceId, reason, sessionId: session.id
  });
  return session;
}
```

**Admin role patterns:**

| Pattern | Access | Use Case |
|---------|--------|----------|
| Super Admin | Unrestricted, cross-system | Platform-wide emergency, initial setup |
| Org Admin | Full within one org unit | Subsidiary administration |
| System Admin | Infrastructure only | DevOps, deployments |
| Audit Admin | Read-only + audit log | Compliance, investigations |
| Support Admin | User management + read | Customer support |
| Billing Admin | Finance + subscriptions | Billing operations |
| Delegated Admin | Scoped subset of admin | Department leads managing their team |

### Step 8: Integrate Policy Engines

| Engine | Language | Model | Deployment | Best For |
|--------|----------|-------|------------|----------|
| **Casbin** | Go, Node.js, Python, Java, .NET, Rust | PERM metamodel | In-app library | RBAC/ABAC/ACL in any language |
| **OPA/Rego** | Rego | Declarative policies | Sidecar/bundle | Cloud-native, K8s, multi-service |
| **Cerbos** | YAML | Resource policies | Sidecar/Docker | Fine-grained, user-friendly |
| **Permit.io** | Python, Node.js, Go, REST | RBAC/ABAC/ReBAC | SaaS/self-hosted | Rapid deployment, GUI policy editor |
| **AuthZed/SpiceDB** | Zanzibar | Relationship tuples | gRPC API | ReBAC at scale |

**Casbin example (Node.js):**
```javascript
const { newEnforcer } = require('casbin');

// model.conf (RBAC with hierarchy)
// [request_definition]
// r = sub, obj, act
// [policy_definition]
// p = sub, obj, act
// [role_definition]
// g = _, _
// g2 = _, _
// [matchers]
// m = g(r.sub, p.sub) || g2(r.sub, p.sub) && r.obj == p.obj && r.act == p.act

const enforcer = await newEnforcer('model.conf', 'policy.csv');
const allowed = await enforcer.enforce('alice', 'invoice:123', 'approve');
```

**OPA example (Rego):**
```rego
package authz

default allow = false

# RBAC rules
allow {
  user_has_role(input.user_id, "admin")
}

allow {
  role := user_role(input.user_id)
  permission := data.permissions[role][_]
  permission.resource == input.resource
  permission.action == input.action
}

user_has_role(user_id, role) {
  data.roles[user_id] == role
}

user_role(user_id) := data.roles[user_id]
```

### Step 9: Test & Audit Authorization

**Permission matrix testing:**
```javascript
// Test every role against every resource+action
const TEST_MATRIX = [
  { role: 'admin',     actions: ['*'],                           expected: 'allow' },
  { role: 'manager',   actions: ['workspace.*', 'report.*'],     expected: 'allow' },
  { role: 'manager',   actions: ['workspace.delete'],            expected: 'deny' },
  { role: 'editor',    actions: ['workspace.read', 'doc.write'], expected: 'allow' },
  { role: 'editor',    actions: ['workspace.delete'],            expected: 'deny' },
  { role: 'viewer',    actions: ['workspace.write'],             expected: 'deny' },
];

test('authorization matrix', () => {
  for (const { role, actions, expected } of TEST_MATRIX) {
    for (const action of actions) {
      const result = authorize({ role }, action, 'workspace');
      expect(result).toBe(expected);
    }
  }
});
```

**Negative testing:**
- Unauthenticated access → deny.
- Expired tokens → deny.
- Deleted users → deny.
- Out-of-scope org → deny.
- Rollback after elevation expires → previous perms restored.

**Audit requirements:**
- Log every authorization decision (allowed or denied) with: timestamp, user, action, resource, decision, reason.
- Log every role change, permission grant/revoke, elevation, delegation.
- Weekly reports on denied access attempts (potential attacks).
- Quarterly access certification: "Does every user still need their current roles?"

**Regression testing for policy changes:**
- Maintain a test suite for every permission set.
- Run on every change to role definitions or policies.
- Snapshot current behavior before changes, diff after.

## Rules
- Default deny: if no policy explicitly allows, access is denied.
- Authorize at the right layer — data-level enforcement (RLS, query filter) is mandatory, UI hiding is optional UX.
- Never trust client-side permissions. Always enforce server-side.
- Role assignments and permission grants must have an audit trail with who approved them.
- Temporary elevation must expire automatically. Never leave JIT roles permanent.
- Break-glass access must notify security immediately and expire within 30 minutes.
- Delegated permissions must not exceed the delegator's own permissions.
- Every user has exactly one role. Use attributes for exceptions, not custom roles.
- Permission changes propagate immediately (no cache) or with documented delay.

## References
- `references/authorization-models.md` — RBAC vs ABAC vs ReBAC comparison and decision guide
- `references/permission-architecture.md` — Permission levels, granularity, scope design
- `references/rbac-hierarchy.md` — Role hierarchy, inheritance, SoD, admin/master admin patterns
- `references/fine-grained-policies.md` — ABAC implementation, attribute sources, policy structure
- `references/temporary-delegated-access.md` — JIT elevation, permission delegation, break-glass
- `references/policy-engines-comparison.md` — Casbin, OPA, Cerbos, Permit.io comparison and integration
- `references/authorization-testing.md` — Authorization testing strategies, matrix, regression
- `references/authorization-middleware.md` — Auth middleware in Express, NestJS, FastAPI, Spring Boot, ASP.NET, Go
- `references/data-level-authorization.md` — PostgreSQL RLS, Prisma policies, field-level access, GraphQL auth

## Handoff
No artifact produced unless requested.
Next skill: authentication (frontend) — implement login UI, route guards, token storage for the auth system.
Next skill: multi-tenancy — combine authorization with tenant isolation for SaaS apps.
Next skill: api-security — apply authorization to API endpoints with rate limiting and WAF.
Carry forward: authorization model, role tree, permission matrix, policy engine choice.
