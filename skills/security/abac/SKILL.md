---
name: abac-access-control
description: >
  Use this skill when the user says 'ABAC', 'attribute-based access control', 'fine-grained
  permissions', 'policy-based access control', 'OPA', 'Rego', 'XACML', 'attribute policies',
  'context-aware authorization', 'dynamic permissions', 'risk-based access', 'environment-aware
  auth', 'conditional access', or when role-based permissions are insufficient and you need
  fine-grained control based on user attributes, resource properties, and environmental context.
  This skill covers: ABAC model (subject/resource/action/environment attributes), policy structure
  and combining algorithms, OPA/Rego implementation, hybrid RBAC-ABAC patterns, ABAC in
  applications, policy testing and simulation. Do NOT use for: basic role-based authorization,
  authentication flows, infrastructure policy (Kyverno/Gatekeeper), or Kubernetes admission control.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, abac, access-control, authorization, policy-engine, fine-grained, phase-7]
---

# Attribute-Based Access Control (ABAC)

## Purpose
Implement fine-grained access control using policies that evaluate attributes of the subject, resource, action, and environment. ABAC enables dynamic, context-aware authorization decisions without requiring per-role or per-user permission assignments.

## Agent Protocol

### Trigger
Exact user phrases: "ABAC", "attribute-based access control", "fine-grained permissions", "policy-based access", "OPA authorization", "Rego", "XACML", "attribute policies", "context-aware auth", "dynamic permissions", "risk-based access", "environment-aware auth", "conditional access", "policy combining", "attribute sources".

### Input Context
- Authorization requirements that RBAC cannot satisfy (document-level, context-dependent, multi-attribute).
- Available attribute sources (user profile, resource metadata, device info, geolocation, time).
- Existing auth infrastructure (JWT claims, user directory, resource database).
- Policy engine preference (OPA, Casbin, Cerbos, custom).
- Compliance rules that involve conditional access.

### Output Artifact
ABAC architecture: attribute catalog, policy structure, evaluation flow, engine integration plan, test strategy.

### Response Format
```
Policy Engine: {OPA|Casbin|Cerbos|custom}
Attribute Sources: {subject, resource, environment}
Policy Count: {total rules}
Combining Algorithm: {deny-overrides|allow-overrides|first-match}
Hybrid With: {RBAC|ReBAC|none}
```

### Completion Criteria
- [ ] Attribute sources identified and catalogued.
- [ ] Policy structure defined with conditions.
- [ ] Policy combining algorithm selected.
- [ ] Policy engine integration planned.
- [ ] Hybrid model (RBAC + ABAC) designed if applicable.
- [ ] ABAC test suite written with edge cases.
- [ ] Policy change management process defined.

### Max Response Length
ABAC architecture: 25 lines maximum.

## Workflow

### Step 1: Understand the ABAC Model

ABAC evaluates four attribute categories to reach an access decision:

```
Subject Attributes ──┐
                     ├──> Policy Evaluation ──> Allow/Deny
Resource Attributes ─┘
                     ┌──> Conditions (AND/OR/NOT)
Action Attributes ───┤
                     └──> Environment Attributes
```

**Attribute categories:**

| Category | Examples | Source |
|----------|----------|--------|
| **Subject** | role, department, clearance, location, team, managerId, employmentType | JWT claims, User DB, HR system |
| **Resource** | owner, department, classification, sensitivity, region, createdAt, status | Resource DB, metadata service |
| **Action** | read, write, delete, approve, delegate, export | Request method + path |
| **Environment** | time of day, IP range, device trust score, geolocation, risk score, auth method | Request context, device profiler |

**ABAC vs RBAC:**

| Dimension | RBAC | ABAC |
|-----------|------|------|
| Permission granularity | Role-level | Attribute-level (any combination) |
| Roles needed | 10-50 predefined roles | 0-5 base roles + policies |
| Policy change | New role or permission assignment | Update policy condition |
| Context awareness | None | Full (time, location, risk, etc.) |
| Audit complexity | Simple (role assignments) | Complex (attribute snapshots needed) |
| Implementation complexity | Low | High |
| Scalability | Linear with roles | Linear with policies |
| Best for | Stable org structures | Dynamic, context-sensitive environments |

### Step 2: Define Attribute Sources

Map every attribute available for policy decisions:

```javascript
// Attribute catalog
const ATTRIBUTE_CATALOG = {
  subject: {
    userId:         { type: 'string', source: 'jwt.sub' },
    role:           { type: 'string', source: 'jwt.role' },
    department:     { type: 'string', source: 'user_db.department' },
    clearance:      { type: 'string', source: 'user_db.clearance_level' },
    location:       { type: 'string', source: 'jwt.geo' },
    employmentType: { type: 'string', source: 'hr_system.type' },
    teamIds:        { type: 'string[]', source: 'user_db.teams' },
    managerId:      { type: 'string', source: 'user_db.manager_id' },
    mfaEnabled:     { type: 'boolean', source: 'user_db.mfa' },
  },
  resource: {
    resourceId:     { type: 'string', source: 'request.path' },
    resourceType:   { type: 'string', source: 'request.resource' },
    ownerId:        { type: 'string', source: 'resource_db.owner_id' },
    department:     { type: 'string', source: 'resource_db.department' },
    classification: { type: 'string', source: 'resource_db.classification' },
    sensitivity:    { type: 'number', source: 'resource_db.sensitivity_score' },
    region:         { type: 'string', source: 'resource_db.region' },
    status:         { type: 'string', source: 'resource_db.status' },
    createdAt:      { type: 'datetime', source: 'resource_db.created_at' },
  },
  action: {
    action:         { type: 'string', source: 'request.method' },
    isBatch:        { type: 'boolean', source: 'request.is_batch' },
    scope:          { type: 'string', source: 'request.query.scope' },
  },
  environment: {
    currentTime:    { type: 'time', source: 'system.clock' },
    currentDay:     { type: 'string', source: 'system.day_of_week' },
    sourceIp:       { type: 'string', source: 'request.ip' },
    networkType:    { type: 'string', source: 'device_profiler.network' },
    deviceTrust:    { type: 'number', source: 'device_profiler.trust_score' },
    riskScore:      { type: 'number', source: 'risk_engine.current_score' },
    authMethod:     { type: 'string', source: 'auth_context.method' },
    tenantId:       { type: 'string', source: 'request.tenant' },
  }
};
```

**Attribute provisioning rules:**
- Subject attributes come from the auth token (JWT) and are enriched from user DB when needed.
- Resource attributes are fetched alongside the resource (lazy, cached).
- Environment attributes are computed per-request (no caching).
- Never trust client-provided attributes for authorization decisions.
- Cache stable attributes (department, clearance) to avoid per-request lookups.

### Step 3: Design Policy Structure

```javascript
// Policy document structure
const POLICY = {
  // Policy metadata
  id: "pol-invoice-approve-large",
  version: "1.2",
  description: "Only department managers can approve invoices > $10K",
  enabled: true,
  priority: 100,                    // Higher = evaluated first

  // Target: which requests this policy applies to
  target: {
    resourceType: "invoice",
    actions: ["approve"],
    conditions: {
      all: [
        { "resource.amount": { gt: 10000 } }
      ]
    }
  },

  // Conditions: who/what/when/where is allowed
  conditions: {
    all: [
      // Subject must be in the same department as the resource
      { "subject.department": { eq: "resource.department" } },
      // Subject must have role of manager or higher
      { "subject.role": { in: ["manager", "org-admin", "super-admin"] } },
      // Subject cannot approve their own created invoice
      { "subject.userId": { neq: "resource.createdBy" } },
    ]
  },

  // Effect
  effect: "allow"
};
```

**Condition operators:**

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `{ eq: "admin" }` |
| `neq` | Not equals | `{ neq: "guest" }` |
| `gt` / `gte` | Greater than / >= | `{ gt: 10000 }` |
| `lt` / `lte` | Less than / <= | `{ lte: 5 }` |
| `in` | In set | `{ in: ["admin", "manager"] }` |
| `notIn` | Not in set | `{ notIn: ["banned", "suspended"] }` |
| `contains` | String/array contains | `{ contains: "admin" }` |
| `matches` | Regex | `{ matches: "^svc-.*" }` |
| `between` | Range | `{ between: [9, 17] }` |
| `ipIn` | IP range | `{ ipIn: "10.0.0.0/8" }` |
| `timeBefore` / `timeAfter` | Time comparison | `{ timeBefore: "18:00" }` |

**Policy combining algorithms:**

```javascript
// Deny-overrides (most restrictive)
function denyOverrides(results) {
  for (const r of results) {
    if (r.effect === 'deny') return 'deny';
  }
  const hasAllow = results.some(r => r.effect === 'allow');
  return hasAllow ? 'allow' : 'notApplicable';
}

// Allow-overrides (most permissive)
function allowOverrides(results) {
  for (const r of results) {
    if (r.effect === 'allow') return 'allow';
  }
  return 'deny';
}

// First-applicable
function firstApplicable(results) {
  for (const r of results) {
    if (r.effect === 'allow' || r.effect === 'deny') return r.effect;
  }
  return 'notApplicable';
}

// Only-one-applicable
function onlyOneApplicable(results) {
  const applicable = results.filter(r => r.effect !== 'notApplicable');
  return applicable.length === 1 ? applicable[0].effect : 'deny';
}
```

| Algorithm | Use Case |
|-----------|----------|
| Deny-overrides | Security-first: any deny blocks access |
| Allow-overrides | Productivity-first: any allow grants access |
| First-applicable | Ordered rules: most specific first |
| Only-one-applicable | Strict: exactly one policy must match |

### Step 4: Implement ABAC with OPA/Rego

```rego
package abac

# ==========================================
# Attribute definitions
# ==========================================

# Subject attributes from JWT
subject_attr = {
  "user_id":   input.subject.userId,
  "role":      input.subject.role,
  "dept":      input.subject.department,
  "clearance": input.subject.clearance,
  "location":  input.subject.location,
}

# Resource attributes from database
resource_attr = {
  "id":         input.resource.resourceId,
  "type":       input.resource.resourceType,
  "owner":      input.resource.ownerId,
  "dept":       input.resource.department,
  "class":      input.resource.classification,
  "sensitivity": input.resource.sensitivity,
  "status":     input.resource.status,
  "region":     input.resource.region,
}

# Environment attributes from request context
env_attr = {
  "time":       time.clock([1])[0],     # current hour
  "day":        time.clock([7])[0],      # day of week
  "ip":         input.environment.sourceIp,
  "device_trust": input.environment.deviceTrust,
  "risk_score": input.environment.riskScore,
}

# ==========================================
# Helper functions
# ==========================================

# Role hierarchy check
is_at_least(target_role) {
  hierarchy := {"viewer": 0, "member": 1, "lead": 2,
                "manager": 3, "org-admin": 4, "super-admin": 5}
  hierarchy[subject_attr.role] >= hierarchy[target_role]
}

# Working hours (9 AM - 5 PM, Mon-Fri)
is_business_hours {
  env_attr.time >= 9
  env_attr.time < 17
  env_attr.day >= 1
  env_attr.day <= 5
}

# ==========================================
# Policies
# ==========================================

# Default: deny everything
default allow = false

# Policy 1: Admin can do anything within their scope
allow {
  subject_attr.role == "super-admin"
}

allow {
  subject_attr.role == "org-admin"
  resource_attr.region == input.subject.region
}

# Policy 2: Department access (same department)
allow {
  is_at_least("member")
  resource_attr.dept == subject_attr.dept
  resource_attr.class != "confidential"
}

# Policy 3: Confidential documents need clearance
allow {
  resource_attr.class == "confidential"
  subject_attr.clearance == "level-3"
  resource_attr.dept == subject_attr.dept
}

# Policy 4: Owner can do anything on their own resource
allow {
  resource_attr.owner == subject_attr.user_id
}

# Policy 5: Sensitive operations require business hours + lower risk
allow {
  input.action.action == "approve"
  is_business_hours
  env_attr.risk_score < 50
  resource_attr.sensitivity <= 3
  is_at_least("lead")
  resource_attr.dept == subject_attr.dept
}

# Policy 6: Export requires high trust device + MFA
allow {
  input.action.action == "export"
  env_attr.device_trust >= 80
  subject_attr.location == resource_attr.region
  is_at_least("manager")
}

# Policy 7: Cross-region access allowed during business hours with low risk
allow {
  resource_attr.region != subject_attr.location
  is_business_hours
  env_attr.risk_score < 30
  is_at_least("manager")
}
```

**OPA integration (Node.js sidecar):**
```javascript
const OPA = require('@openpolicyagent/opa-wasm');

// Load policy bundle
const policy = await OPA.loadPolicy(fs.readFileSync('policy.wasm'));

async function authorize(req) {
  // Build input document
  const input = {
    subject: {
      userId: req.user.id,
      role: req.user.role,
      department: req.user.department,
      clearance: req.user.clearance,
      location: req.headers['cf-ipcountry'],
    },
    resource: {
      resourceId: req.params.id,
      resourceType: req.params.resource,
      ownerId: resource.ownerId,
      department: resource.department,
      classification: resource.classification,
      sensitivity: resource.sensitivity,
      region: resource.region,
      status: resource.status,
    },
    action: {
      action: mapHttpToAction(req.method),
      isBatch: req.query.batch === 'true',
    },
    environment: {
      sourceIp: req.ip,
      deviceTrust: req.headers['x-device-trust'],
      riskScore: await getRiskScore(req.user.id),
      authMethod: req.auth.method,
    },
  };

  // Evaluate
  const result = policy.evaluate(input);
  return result[0].result === true;
}
```

### Step 5: Implement ABAC with Casbin

```javascript
const { newEnforcer } = require('casbin');
const { MongooseAdapter } = require('casbin-mongoose');

// casbin_model.conf
// [request_definition]
// r = sub, obj, act, domain
// [policy_definition]
// p = sub, obj, act, domain, effect
// [matchers]
// m = r.sub == p.sub || p.sub == "*" && \
//     keyMatch(r.obj, p.obj) && \
//     (r.act == p.act || p.act == "*") && \
//     r.domain == p.domain

// Attribute-based: enrich subject/object with attributes
async function abacEnforce(user, resource, action) {
  const enforcer = await newEnforcer('model.conf', 'policy.csv');

  // Add subject attributes as roles (Casbin RBAC-style)
  for (const attr of [user.role, user.department, user.clearance]) {
    await enforcer.addRoleForUser(user.id, attr);
  }

  // Add resource attributes as resource roles
  for (const attr of [resource.classification, resource.department]) {
    await enforcer.addRoleForUser(resource.id, attr); // using resource as "user"
  }

  return enforcer.enforce(user.id, resource.id, action, user.tenantId);
}
```

### Step 6: Combine ABAC with RBAC (Hybrid Model)

Most production systems use a hybrid: RBAC for coarse-grained access, ABAC for fine-grained exceptions:

```javascript
function hybridAuthorize(user, action, resource, context) {
  // Phase 1: RBAC check (fast path)
  const rbacResult = rbacAuthorize(user.role, action, resource);
  if (rbacResult === 'deny') return false;  // Fast reject
  if (rbacResult === 'allow' && !hasABACConstraints(action, resource)) {
    return true;  // Fast allow (no ABAC needed for this action)
  }

  // Phase 2: ABAC check (slow path)
  const abacResult = abacAuthorize({
    subject: user,
    resource,
    action: { type: action },
    environment: context
  });
  return abacResult;
}
```

**Hybrid patterns:**

| Pattern | RBAC Part | ABAC Part | Best For |
|---------|-----------|-----------|----------|
| RBAC-first | Role gates access | Attributes refine within role | General enterprise apps |
| ABAC-over-RBAC | Role determines scope | ABAC handles conditions | Document management |
| RBAC for admin, ABAC for end-user | Admin is RBAC, user is ABAC | Different models by user type | B2B SaaS |
| Attribute-enriched RBAC | Core RBAC model | Attributes as dynamic constraints | Multi-tenant apps |

**Example: ABAC-over-RBAC for document management:**
```javascript
// RBAC: role determines base permissions
const BASE_PERMS = {
  admin:   ['document.*'],
  editor:  ['document.create', 'document.read', 'document.write'],
  viewer:  ['document.read'],
};

// ABAC: conditions refine within role
const ABAC_OVERRIDES = [
  {
    // Editors can only edit their own department's documents
    target:  { role: 'editor', action: 'document.write' },
    require: { 'user.dept': { eq: 'resource.dept' } }
  },
  {
    // Viewers can read confidential docs only during business hours
    target:  { role: 'viewer', action: 'document.read', classification: 'confidential' },
    require: { 'env.hour': { between: [9, 17] }, 'env.weekday': { in: [1,2,3,4,5] } }
  },
  {
    // Export restricted to office IP range
    target:  { action: 'document.export' },
    require: { 'env.ip': { ipIn: '10.0.0.0/8' } }
  },
];

function hybridCheck(user, action, resource, env) {
  // Step 1: RBAC gate
  if (!baseRoleHasPermission(user.role, action)) return false;

  // Step 2: Check ABAC overrides
  for (const override of ABAC_OVERRIDES) {
    if (matchesTarget(override.target, user, action, resource)) {
      if (!evaluateConditions(override.require, { user, resource, env })) {
        return false; // ABAC condition blocks
      }
    }
  }

  return true;
}
```

### Step 7: Test & Audit ABAC Policies

```javascript
// Policy test cases
const ABAC_TESTS = [
  // [description, subject, resource, action, environment, expected]
  [
    'Manager can approve dept invoice under 10K during work hours',
    { role: 'manager', department: 'eng' },
    { type: 'invoice', amount: 5000, department: 'eng', ownerId: 'user2' },
    { action: 'approve' },
    { hour: 14, weekday: 3, riskScore: 20 },
    true
  ],
  [
    'Manager cannot approve their own invoice',
    { role: 'manager', department: 'eng', userId: 'user1' },
    { type: 'invoice', amount: 5000, department: 'eng', ownerId: 'user1' },
    { action: 'approve' },
    { hour: 14, weekday: 3, riskScore: 20 },
    false  // self-approval blocked
  ],
  [
    'Manager cannot approve large invoice outside dept',
    { role: 'manager', department: 'eng' },
    { type: 'invoice', amount: 50000, department: 'finance', ownerId: 'user2' },
    { action: 'approve' },
    { hour: 14, weekday: 3, riskScore: 20 },
    false
  ],
  [
    'Viewer cannot read confidential at night',
    { role: 'viewer', department: 'eng', clearance: 'level-1' },
    { type: 'document', classification: 'confidential', department: 'eng' },
    { action: 'read' },
    { hour: 22, weekday: 6, riskScore: 10 },
    false
  ],
  [
    'High risk score blocks sensitive operations',
    { role: 'lead', department: 'eng', userId: 'user1' },
    { type: 'invoice', amount: 1000, department: 'eng', sensitivity: 4 },
    { action: 'approve' },
    { hour: 14, weekday: 3, riskScore: 80 },
    false
  ],
];

test('ABAC policy suite', () => {
  for (const [desc, subject, resource, action, env, expected] of ABAC_TESTS) {
    const result = authorize({ ...subject }, action.action, resource, env);
    expect(result).toBe(expected);
  }
});
```

**Policy coverage analysis:**
```javascript
// Analyze which attribute combinations are covered
function analyzePolicyCoverage(policies) {
  const coverage = {
    'all_conditions': [],
    'coverage_by_action': {},
    'uncovered_combinations': [],
  };

  const actions = ['read', 'write', 'delete', 'approve', 'export'];
  const roles = ['viewer', 'member', 'lead', 'manager', 'org-admin'];

  for (const action of actions) {
    coverage.coverage_by_action[action] = { allowed: [], denied: [] };
    for (const role of roles) {
      // Try with different attribute combinations
      const result = policySimulator({
        subject: { role, department: 'eng', clearance: 'level-2', location: 'US' },
        action: { action },
        resource: { department: 'eng', classification: 'public', sensitivity: 2 },
        environment: { hour: 14, weekday: 3, deviceTrust: 90, riskScore: 10 }
      });
      if (result) {
        coverage.coverage_by_action[action].allowed.push(role);
      } else {
        coverage.coverage_by_action[action].denied.push(role);
      }
    }
  }
  return coverage;
}
```

**Audit logging for ABAC decisions:**
```javascript
function logABACDecision(user, action, resource, env, result, matchedPolicies) {
  logger.info({
    event: 'authorization',
    timestamp: new Date().toISOString(),
    decision: result ? 'allow' : 'deny',
    subject: {
      id: user.id,
      role: user.role,
      department: user.department,
      attributes: user, // snapshot all relevant attributes
    },
    resource: {
      id: resource.id,
      type: resource.type,
      attributes: resource,
    },
    action,
    environment: {
      time: env.hour,
      day: env.weekday,
      ip: env.ip,
      riskScore: env.riskScore,
      deviceTrust: env.deviceTrust,
    },
    matchedPolicies, // which policies matched and their decisions
  });
}
```

## Rules
- Default deny: no matching policy = deny. Always.
- Subject attributes come from authenticated source (JWT claims, not user input).
- Resource attributes come from server-side data, never from client request body.
- Environment attributes are computed server-side per request.
- Cache attribute lookups but never cache the final authorization decision (context changes).
- Policy changes take effect immediately; version all policies.
- ABAC is not a replacement for RBAC — use hybrid.
- Every ABAC decision must be logged with attribute snapshot for audit.
- Test every policy with minimum/maximum/boundary attribute values.
- Risk-based policies must have a floor: never allow if risk > 90 regardless of other attributes.

## References
- `references/abac-policy-structure.md` — Policy anatomy, combining algorithms, condition operators, XACML reference
- `references/opa-abac-implementation.md` — OPA/Rego for ABAC, deployment patterns, performance tuning
- `references/hybrid-rbac-abac.md` — Hybrid RBAC-ABAC models, integration patterns, migration guide
- `references/abac-testing.md` — ABAC policy testing, simulation, coverage analysis, regression
- `references/abac-envoy-deployment.md` — OPA + Envoy ext_authz, K8s deployment, performance tuning, production checklist
- `references/abac-policy-management.md` — Policy-as-code CI/CD, canary deployment, rollback, monitoring, governance

## Handoff
No artifact produced unless requested.
Next skill: authorization (backend) — integrate ABAC into the overall authorization architecture.
Next skill: enterprise-rbac — complement ABAC with RBAC for coarse-grained role structure.
Next skill: api-security — apply ABAC to API endpoints with OPA sidecar.
Carry forward: policy structure, attribute catalog, combining algorithm, engine choice.
