# Fine-Grained Access Policies (ABAC)

## Policy Structure

A complete ABAC policy has four parts:

```yaml
policy:
  # 1. Target — which requests this policy applies to
  target:
    resourceType: invoice         # Required: resource type
    actions: [approve]            # Required: matching actions
    conditions:                   # Optional: fine-tune target match
      resource.amount: { gt: 10000 }

  # 2. Conditions — who/what/when/where is allowed
  conditions:
    all:                          # logical AND
      - subject.department == resource.department
      - subject.role in [manager, org-admin, super-admin]
      - subject.userId != resource.createdBy
    any:                          # logical OR (alternative)
      - environment.riskScore < 30
      - environment.deviceTrust > 80

  # 3. Effect — what happens when conditions are met
  effect: allow                   # or deny

  # 4. Metadata (optional)
  id: pol-invoice-approve-large
  priority: 100
  version: "1.2"
  description: "Managers can approve department invoices > $10K"
```

## Policy Combining

When multiple policies match, the combining algorithm decides:

### Deny-overrides (recommended for security)
```
Policy A: allow (subject.dept == resource.dept)
Policy B: deny  (resource.amount > 50000)

Invoice: $60K, same dept
Result: deny (one deny = whole deny)
```

### Allow-overrides
```
Policy A: allow (subject.role == admin)
Policy B: deny  (environment.hour > 18)

Admin at 9 PM
Result: allow (one allow = whole allow)
```

### First-applicable
```
Ordered policies:
  1. deny  if environment.riskScore > 80
  2. allow if subject.role == admin
  3. allow if subject.dept == resource.dept

Admin at risk 90
Result: deny (policy 1 matches first)
```

## Attribute Catalogs

### Subject attributes
```javascript
{
  userId:        'uuid',            // from JWT sub
  role:          'manager',         // from JWT role
  department:    'engineering',     // from user DB
  team:          'platform',        // from user DB
  location:      'US',              // from JWT or geo-IP
  clearance:     'level-2',         // from HR system
  employment:    'full-time',       // from HR system
  mfaEnabled:    true,              // from auth provider
  emailVerified: true,              // from auth provider
  accountAge:    365,               // computed
}
```

### Resource attributes
```javascript
{
  id:             'doc-456',
  type:           'document',
  ownerId:        'uuid',
  department:     'engineering',
  classification: 'confidential',    // public, internal, confidential, restricted
  sensitivity:    3,                  // 1-5 scale
  region:         'US',               // data residency
  status:         'active',           // active, archived, deleted
  createdAt:      '2025-01-15',
  metadata: {                         // custom attributes
    containsPII: false,
    contractValue: 50000,
  }
}
```

### Environment attributes
```javascript
{
  currentTime:    '14:30',           // from system clock
  currentDay:     'Monday',          // day of week
  currentDate:    '2026-05-25',
  sourceIp:       '10.0.1.50',       // from request
  networkType:    'corporate',        // corporate, vpn, public, partner
  deviceTrust:    85,                 // 0-100, from device profiler
  riskScore:      15,                 // 0-100, from risk engine
  authMethod:     'mfa',             // password, mfa, sso, certificate
  tenantId:       'tenant-abc',
  isBusinessHours: true,
}
```

## Policy Authoring Patterns

### Pattern 1: Role-conditioned (RBAC foundation)
```yaml
# Editors can edit, but only their department's docs
target:
  subject.role: editor
  action: document.write
condition:
  subject.department == resource.department
effect: allow
```

### Pattern 2: Context-sensitive
```yaml
# Sensitive operations need safe context
target:
  action: [document.delete, document.export, user.deactivate]
condition:
  environment.isBusinessHours == true
  environment.deviceTrust >= 80
  environment.authMethod == 'mfa'
effect: allow
```

### Pattern 3: Risk-adaptive
```yaml
# High-risk = restricted
target:
  effect: deny
condition:
  environment.riskScore > 80
effect: deny   # = deny-override for high risk

# Low risk = normal access
target:
  effect: allow
condition:
  environment.riskScore <= 30
  subject.role in [editor, manager]
effect: allow

# Medium risk = elevated requirements
target:
  effect: allow
condition:
  environment.riskScore > 30
  environment.riskScore <= 80
  subject.role in [manager, admin]
  environment.authMethod == 'mfa'
effect: allow
```

### Pattern 4: Temporal
```yaml
# Off-hours access requires manager role + reason
target:
  environment.isBusinessHours == false
  action in [document.write, workspace.configure]
condition:
  subject.role in [manager, org-admin]
  request.reason != null
  request.reason.length > 10
effect: allow
```

### Pattern 5: Geography/data residency
```yaml
# Data stays in region unless admin
target:
  resource.region != subject.location
condition:
  subject.role == 'org-admin'
  environment.isBusinessHours == true
effect: allow

# Default: deny cross-region access
target:
  resource.region != subject.location
effect: deny
```

### Pattern 6: Hierarchical data
```yaml
# Team lead can see their team + sub-teams
target:
  action: document.read
condition:
  subject.team in resource.ancestorTeams   # resource has parent team chain
  or subject.role in [org-admin, super-admin]
effect: allow
```

### Pattern 7: Quota-based
```yaml
# Prevent creating too many resources
target:
  action: workspace.create
condition:
  count_user_workspaces(subject.userId) < subject.maxWorkspaces
effect: allow
```

## Evaluation Engine

```javascript
class PolicyEngine {
  constructor(policies, combine) {
    this.policies = policies.sort((a, b) => b.priority - a.priority);
    this.combine = combine || 'deny-overrides';
  }

  evaluate(request) {
    const results = [];

    for (const policy of this.policies) {
      if (!this.matchesTarget(policy.target, request)) continue;

      const conditionMet = this.evaluateConditions(policy.conditions, request);
      if (conditionMet) {
        results.push({ policyId: policy.id, effect: policy.effect });
      }

      // First-applicable: stop at first match
      if (this.combine === 'first-applicable' && conditionMet) {
        break;
      }
    }

    return this.combineResults(results);
  }

  matchesTarget(target, request) {
    if (target.resourceType && target.resourceType !== request.resource.type) return false;
    if (target.actions && !target.actions.includes(request.action)) return false;
    if (target.conditions) {
      return this.evaluateConditions({ all: target.conditions }, request);
    }
    return true;
  }

  evaluateConditions(conditions, request) {
    if (!conditions) return true;

    // AND conditions (all must pass)
    if (conditions.all) {
      return conditions.all.every(c => this.evaluateCondition(c, request));
    }

    // OR conditions (any must pass)
    if (conditions.any) {
      return conditions.any.some(c => this.evaluateCondition(c, request));
    }

    return true;
  }

  evaluateCondition(condition, request) {
    const [category, attr] = Object.keys(condition)[0].split('.');
    const attrs = request[category] || {};
    const actual = attrs[attr];
    const constraint = Object.values(condition)[0];
    const [operator, expected] = Object.entries(constraint)[0];

    return this.compare(operator, actual, expected, request);
  }

  compare(op, actual, expected, request) {
    switch (op) {
      case 'eq':    return actual === expected;
      case 'neq':   return actual !== expected;
      case 'gt':    return actual > expected;
      case 'gte':   return actual >= expected;
      case 'lt':    return actual < expected;
      case 'lte':   return actual <= expected;
      case 'in':    return expected.includes(actual);
      case 'notIn': return !expected.includes(actual);
      case 'contains': return actual?.includes(expected);
      case 'between':  return actual >= expected[0] && actual <= expected[1];
      default: return false;
    }
  }

  combineResults(results) {
    switch (this.combine) {
      case 'allow-overrides':
        return results.some(r => r.effect === 'allow') ? 'allow' : 'deny';
      case 'deny-overrides':
        return results.some(r => r.effect === 'deny') ? 'deny' : 'allow';
      case 'first-applicable':
        return results.length > 0 ? results[0].effect : 'deny';
      default:
        return results.some(r => r.effect === 'deny') ? 'deny' : 'allow';
    }
  }
}
```

## Performance Optimization

| Technique | Impact | Trade-off |
|-----------|--------|-----------|
| Index attribute sources | Faster attribute resolution | Storage overhead |
| Cache resource attributes | Avoid per-request DB calls | 5-15s TTL, stale data possible |
| Pre-filter by role (RBAC first) | Skip ABAC for 80% of requests | Two-phase check |
| Policy indexing by resource type | O(n) → O(1) policy lookup | Memory for index |
| Batch policy evaluation | 1 DB call vs N | Complexity |
| WASM-based policy engine | 10x faster than HTTP sidecar | Deployment complexity |
