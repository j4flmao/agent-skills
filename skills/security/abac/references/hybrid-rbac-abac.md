# Hybrid RBAC-ABAC Models

## Why Hybrid?

RBAC and ABAC address different concerns:

| Concern | RBAC | ABAC |
|---------|------|------|
| "Who can access this feature?" | ✓ Role gate | Can, but overkill |
| "Who can edit this document?" | Coarse (whole role) | ✓ Attribute conditions |
| "Can they access during off-hours?" | No support | ✓ Environment attributes |
| "Can they access from another region?" | No support | ✓ Location attributes |
| Is the model auditable? | ✓ Simple | Complex |
| Can I onboard 1000 users quickly? | ✓ Assign role | Must define policies |

**Combine them:** RBAC for broad access tiers, ABAC for fine-grained conditions.

## Hybrid Model 1: RBAC-First (Default)

```
Request
  │
  ▼
Phase 1: RBAC Check
  │
  ├─ No role-based permission → Deny
  │
  └─ Has role-based permission
       │
       ▼
Phase 2: ABAC Check (if applicable)
       │
       ├─ No ABAC constraints for this action → Allow
       │
       └─ ABAC constraints defined
            │
            ├─ Conditions met → Allow
            │
            └─ Conditions not met → Deny
```

```javascript
function hybridAuthorize(user, action, resource, context) {
  // Phase 1: RBAC gate
  const rolePerms = getRolePermissions(user.role);
  const basePerm = `${resource.type}.${action}`;

  if (!hasPermission(rolePerms, basePerm)) {
    return false; // Fast reject — no role-based access
  }

  // Phase 2: Check if ABAC conditions apply
  const abacRules = getABACRules(resource.type, action);
  if (abacRules.length === 0) {
    return true; // No ABAC constraints — allow
  }

  // Evaluate ABAC
  const request = {
    subject: user,
    resource,
    action: { type: action },
    environment: context,
  };

  const result = evaluateABAC(abacRules, request);
  return result === 'allow';
}

// Performance: RBAC-only actions skip ABAC entirely
const RBAC_ONLY_ACTIONS = {
  'dashboard': ['read'],
  'report': ['read', 'list'],
  'profile': ['read', 'update'],
};
```

### Best for
- 80% of access decisions handled by role alone.
- Only sensitive/critical actions need ABAC refinement.
- Easy to understand and audit.

## Hybrid Model 2: ABAC-Over-RBAC

Role defines the scope, ABAC adds the constraints:

```javascript
const RBAC_BASE = {
  admin:   { permissions: ['*'],                           scope: 'global' },
  manager: { permissions: ['document.*', 'workspace.*'],   scope: 'department' },
  editor:  { permissions: ['document.create', 'document.read', 'document.write'], scope: 'department' },
  viewer:  { permissions: ['document.read'],               scope: 'department' },
};

const ABAC_OVERLAYS = [
  // Even managers cannot delete if document is archived
  {
    target:  { actions: ['delete'], resourceCondition: { status: 'archived' } },
    require: { 'subject.role': { in: ['admin', 'super-admin'] } },
  },
  // Export requires MFA + business hours
  {
    target:  { actions: ['export'] },
    require: {
      'environment.authMethod': { eq: 'mfa' },
      'environment.isBusinessHours': { eq: true },
    },
  },
  // Edit locked documents requires admin
  {
    target:  { actions: ['write'], resourceCondition: { locked: true } },
    require: { 'subject.role': { in: ['admin', 'super-admin'] } },
  },
];
```

### Best for
- Document management, content systems.
- Multi-tenant where tenants have different policies.
- Regulatory environments (override standard access for compliance).

## Hybrid Model 3: Dual-Model (Admin RBAC, User ABAC)

Different authorization models for different user types:

```javascript
async function dualModelAuthorize(user, action, resource, context) {
  if (user.type === 'internal') {
    // Internal employees: RBAC (predictable, auditable)
    return rbacAuthorize(user.role, action, resource);
  } else {
    // External users (customers, partners): ABAC (flexible, contextual)
    return abacAuthorize(user, action, resource, context);
  }
}
```

### Best for
- B2B SaaS with internal admin tools.
- Platforms with both employees and customers.
- Partner/collaborator access programs.

## Hybrid Model 4: Scope-Aware (RBAC + ABAC + Tenancy)

```javascript
function tenantAwareAuthorize(user, action, resource, context) {
  // Step 1: RBAC: does this role have the base permission?
  if (!roleHasPermission(user.role, action)) return false;

  // Step 2: Scope: does user's scope include this resource?
  const scope = resolveScope(user);
  if (!scope.includes(resource.tenantId)) return false;

  // Step 3: ABAC: apply tenant-specific policies
  const tenantPolicies = getTenantPolicies(resource.tenantId);
  if (tenantPolicies.length > 0) {
    return evaluateABAC(tenantPolicies, { subject: user, resource, action, environment: context });
  }

  return true;
}
```

### Best for
- Multi-tenant SaaS platforms.
- Each tenant may have custom access policies.
- Global RBAC structure + per-tenant ABAC customization.

## Migration: RBAC → Hybrid ABAC

### Step 1: Identify ABAC candidates
```javascript
// Find actions where RBAC alone causes problems
const PROBLEM_PATTERNS = [
  {
    symptom: "Manager can approve own expenses",
    solution: "ABAC: subject.id != resource.createdBy",
  },
  {
    symptom: "Help desk can see all customer data",
    solution: "ABAC: resource.supportTier <= subject.maxTier",
  },
  {
    symptom: "Vendor access outside business hours",
    solution: "ABAC: environment.isBusinessHours == true",
  },
  {
    symptom: "API tokens with more access than needed",
    solution: "ABAC: restrict action based on token scope",
  },
];
```

### Step 2: Add ABAC without breaking RBAC
```javascript
// Start with allow-only ABAC (can only add restrictions)
const ABAC_INITIAL = [
  // Restrictive only — never expand access beyond RBAC
  {
    target: { resourceType: 'payment', actions: ['approve'] },
    conditions: {
      all: [
        { 'subject.role': { in: ['finance-manager', 'finance-director'] } },
        { 'subject.id': { neq: 'resource.initiatedBy' } }, // No self-approval
        { 'resource.amount': { lt: 100000 } },
      ],
    },
    effect: 'allow',
  },
  // Default deny for anything else
];

// Test: ensure no existing RBAC permissions are broken
async function testMigration() {
  const testCases = loadCurrentRBACBehavior();
  for (const tc of testCases) {
    const hybridResult = hybridAuthorize(tc.user, tc.action, tc.resource, {});
    expect(hybridResult).toBe(tc.expected); // Must match existing behavior
  }
}
```

### Step 3: Gradual rollout
1. Enable ABAC in audit-only mode (log what would be denied).
2. Review denied actions for false positives.
3. Fix policies.
4. Enable enforcement per action type.
5. Remove RBAC-only checks for migrated actions.

## Decision Matrix

| Scenario | Model | Justification |
|----------|-------|---------------|
| Internal admin panel | RBAC-only | Predictable, auditable, simple |
| Customer-facing docs | RBAC + ABAC | Role tiers + doc-level conditions |
| Multi-tenant app | Scope RBAC + per-tenant ABAC | Global roles + tenant customization |
| B2B with partners | RBAC for employees, ABAC for partners | Different access patterns |
| Compliance-heavy | Constrained RBAC + ABAC | SoD by RBAC, conditions by ABAC |
| E-commerce | RBAC for ops, ABAC for orders | Role for features, conditions for data |
| Healthcare | RBAC + strict ABAC | Role for feature access, ABAC for patient data |
