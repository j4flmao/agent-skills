# ABAC Policy Structure

## Policy Anatomy

An ABAC policy consists of four mandatory and one optional section:

```yaml
# 1. Target — which requests does this policy apply to?
target:
  resourceType: invoice
  actions: [approve]
  conditions:
    resource.amount: { gt: 10000 }

# 2. Conditions — under what circumstances is access allowed?
conditions:
  all:
    - subject.department == resource.department
    - subject.role in [manager, org-admin, super-admin]
    - subject.userId != resource.createdBy
  any:
    - environment.riskScore < 30
    - environment.deviceTrust > 80

# 3. Effect — allow or deny?
effect: allow

# 4. Metadata (optional)
id: pol-invoice-approve-large
version: "1.2"
priority: 100
description: "Managers can approve department invoices > $10K"
enabled: true
```

## XACML Reference Architecture

The eXtensible Access Control Markup Language (XACML) defines the standard ABAC architecture:

```
Request
   │
   ▼
┌──────────┐    ┌───────────┐    ┌──────────┐
│  PEP     │───>│   PDP     │───>│   PIP    │
│ (Policy  │    │ (Decision │    │ (Attribute│
│  Enforce │<───│  Point)   │<───│  Provider)│
│  Point)  │    └─────┬─────┘    └──────────┘
└──────────┘          │
                      │
               ┌──────┴──────┐
               │     PAP     │
               │ (Policy     │
               │  Admin Pt)  │
               └─────────────┘
```

| Component | Role | Example |
|-----------|------|---------|
| **PEP** | Intercepts request, enforces decision | API gateway middleware |
| **PDP** | Evaluates policies, returns decision | OPA, custom engine |
| **PIP** | Fetches attributes from sources | User DB, resource DB, risk engine |
| **PAP** | Manages policy lifecycle | Admin UI, Git repository |

## Condition Operators Reference

### Comparison operators

| Operator | Type | Example |
|----------|------|---------|
| `eq` | Equality | `{ eq: "manager" }` |
| `neq` | Inequality | `{ neq: "guest" }` |
| `gt` | Greater than | `{ gt: 10000 }` |
| `gte` | Greater or equal | `{ gte: 3 }` |
| `lt` | Less than | `{ lt: 0 }` |
| `lte` | Less or equal | `{ lte: 100 }` |
| `in` | Member of set | `{ in: ["admin", "manager"] }` |
| `notIn` | Not in set | `{ notIn: ["suspended", "deleted"] }` |
| `contains` | String includes | `{ contains: "admin" }` |
| `matches` | Regex match | `{ matches: "^svc-.*" }` |

### Set operators

| Operator | Type | Example |
|----------|------|---------|
| `subsetOf` | Set is subset | `{ subsetOf: ["read", "write"] }` |
| `overlaps` | Sets intersect | `{ overlaps: ["admin", "manager"] }` |
| `isEmpty` | Set is empty | `{ isEmpty: true }` |

### Range operators

| Operator | Type | Example |
|----------|------|---------|
| `between` | Between two values | `{ between: [9, 17] }` |
| `ipIn` | IP in CIDR range | `{ ipIn: "10.0.0.0/8" }` |
| `timeBefore` | Before time | `{ timeBefore: "18:00" }` |
| `timeAfter` | After time | `{ timeAfter: "08:00" }` |
| `dateBefore` | Before date | `{ dateBefore: "2026-12-31" }` |
| `dateAfter` | After date | `{ dateAfter: "2026-01-01" }` |

### String operators

| Operator | Type | Example |
|----------|------|---------|
| `startsWith` | Prefix match | `{ startsWith: "internal-" }` |
| `endsWith` | Suffix match | `{ endsWith: "@acme.com" }` |
| `stringLength` | Length check | `{ stringLength: { gt: 5 } }` |

## Policy Examples by Domain

### Healthcare (HIPAA)
```yaml
# Only treating physicians can access patient records
target:
  resourceType: patient-record
  actions: [read, update]
conditions:
  all:
    - subject.role in [physician, nurse, admin]
    - subject.department == resource.department
    - subject.isTreatingPhysician == true
    - environment.authMethod == mfa
effect: allow

# Emergency override for life-threatening situations
target:
  resourceType: patient-record
  actions: [read]
conditions:
  all:
    - subject.role == physician
    - environment.emergencyMode == true
    - environment.emergencyCode != null
effect: allow
```

### Finance (SOX)
```yaml
# Two-person rule for payments
target:
  resourceType: payment
  actions: [approve]
conditions:
  all:
    - subject.role in [finance-manager, finance-director]
    - subject.userId != resource.initiatedBy
    - count_approvals(resource.id) < 2
    - environment.isBusinessHours == true
effect: allow
```

### Multi-tenant SaaS
```yaml
# Tenant isolation: user can only access own tenant data
target:
  resourceType: any
  actions: [read, write, delete]
conditions:
  all:
    - resource.tenantId == subject.tenantId
    - subject.role != guest
effect: allow

# Cross-tenant admin access
target:
  resourceType: any
  actions: [read]
conditions:
  all:
    - subject.role == support-admin
    - resource.tenantId in subject.supportTenants
    - environment.isBusinessHours == true
    - environment.authMethod == mfa
effect: allow
```

### Document management
```yaml
# Owner + team access
target:
  resourceType: document
  actions: [read, write]
conditions:
  any:
    - subject.userId == resource.ownerId
    - subject.teamId in resource.sharedWithTeams
    - subject.role in [admin, manager]
effect: allow

# Confidential documents
target:
  resourceType: document
  actions: [read]
conditions:
  all:
    - resource.classification == confidential
    - subject.clearance in [level-3, level-4, level-5]
    - subject.department == resource.department
    - environment.deviceTrust >= 80
effect: allow
```

## Policy Performance Optimization

### Indexing strategy
```
Policy Index by:
  resourceType → [policies]
  action → [policies]
  (resourceType, action) → [policies]

Evaluation:
  1. Lookup policies by (resourceType, action) → O(1)
  2. Filter by target conditions → O(n) for n matching policies
  3. Evaluate conditions → O(m) for m conditions
```

### Caching strategy
```javascript
// Cache compiled policies
const policyCache = new Map();

function getCompiledPolicies(resourceType, action) {
  const key = `${resourceType}:${action}`;
  if (policyCache.has(key)) {
    return policyCache.get(key);
  }
  const policies = loadAndCompilePolicies(resourceType, action);
  policyCache.set(key, policies);
  return policies;
}

// Cache attribute lookups
const attrCache = new Map();
async function getResourceAttributes(resourceId) {
  if (attrCache.has(resourceId)) {
    return attrCache.get(resourceId);
  }
  const attrs = await fetchResourceAttributes(resourceId);
  attrCache.set(resourceId, attrs);
  setTimeout(() => attrCache.delete(resourceId), 5000); // 5s TTL
  return attrs;
}
```

### Evaluation order optimization
1. Check static conditions first (role, resource type) → fastest.
2. Check cached attributes next (department, clearance).
3. Check computed attributes last (risk score, device trust) → slowest.
4. Short-circuit on deny-override: stop on first deny match.

## Policy Management

### Storage
```yaml
# Option 1: File-based (GitOps)
policies/
  documents.yaml
  invoices.yaml
  users.yaml
  workspaces.yaml

# Option 2: Database
policies table:
  id, resource_type, actions, conditions, effect, priority, version, enabled, created_at

# Option 3: OPA bundles
bundles/
  /policies
    documents.rego
    invoices.rego
```

### Versioning
```javascript
// Policy version history
const POLICY_VERSION = {
  current: 'v1.2.0',
  history: [
    { version: 'v1.0.0', date: '2026-01-15', changes: 'Initial policies' },
    { version: 'v1.1.0', date: '2026-03-01', changes: 'Added invoice policies' },
    { version: 'v1.2.0', date: '2026-05-25', changes: 'Added risk-based conditions' },
  ],
};

// Rollback capability
async function rollbackPolicy(policyId, targetVersion) {
  const snapshot = await prisma.policySnapshot.findFirst({
    where: { policyId, version: targetVersion },
  });
  if (!snapshot) throw new Error('Version not found');
  await prisma.policy.update({
    where: { id: policyId },
    data: { conditions: snapshot.conditions, version: snapshot.version },
  });
}
```

### Testing in CI
```yaml
# .github/workflows/policy-tests.yml
name: Policy Tests
on:
  pull_request:
    paths:
      - 'policies/**'
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test              # Run policy test suite
      - run: npm run policy-simulate  # Simulate against production access patterns
      - run: npm run policy-lint      # Validate YAML structure
```
