# Policy Engines Comparison

## Overview

| Feature | Casbin | OPA (Open Policy Agent) | Cerbos | Permit.io |
|---------|--------|------------------------|--------|-----------|
| Type | Library | Service/sidecar | Service/sidecar | SaaS/self-hosted |
| Language | PERM metamodel | Rego | YAML | Visual editor + JSON |
| Deployment | In-app | Sidecar, WASM, HTTP | Sidecar, Docker | Cloud, Docker |
| Models | ACL, RBAC, ABAC | Any (Rego) | RBAC, ABAC, ReBAC | RBAC, ABAC, ReBAC |
| Performance | 1-5µs per check | 50-200µs per check | 5-20µs per check | 10-50ms (includes network) |
| Learning curve | Low | High | Low | Very low |
| Audit | Manual | Built-in decision logging | Built-in | Built-in |
| Multi-service | Per-service library | Centralized | Centralized | Centralized |

## Casbin

### Best for
- Single-service applications needing RBAC/ABAC.
- Teams that want authorization as a library, not a service.
- Polyglot environments (Go, Node, Python, Java, .NET, Rust, etc.).

### Model definition
```ini
# model.conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

### Policy file
```csv
# policy.csv
p, alice, data1, read
p, bob, data2, write
p, data2_admin, data2, read
p, data2_admin, data2, write

g, alice, data2_admin     # alice inherits data2_admin perms
g, bob, admin              # bob is admin
```

### API
```javascript
const enforcer = await casbin.newEnforcer('model.conf', 'policy.csv');

// Check
enforcer.enforce('alice', 'data1', 'read');   // true
enforcer.enforce('alice', 'data2', 'write');  // true (inherited)
enforcer.enforce('bob', 'data1', 'read');     // false

// Add role
enforcer.addRoleForUser('charlie', 'admin');

// Get roles
enforcer.getRolesForUser('alice');  // ['data2_admin']
```

### Pros & Cons
| Pro | Con |
|-----|-----|
| Fast (in-process) | No centralized audit |
| Broad language support | Policies not hot-reloadable by default |
| Mature (2017+) | Limited to PERM model |
| Rich model syntax | ABAC requires RBAC model extensions |

## OPA (Open Policy Agent)

### Best for
- Cloud-native (K8s admission control, Envoy authz).
- Multi-service environments needing centralized policy.
- Complex policy logic (Rego is a full policy language).
- Existing K8s/Gatekeeper users.

### Policy (Rego)
```rego
package httpapi.authz

# Allow GET for all users
allow {
  input.method == "GET"
}

# Allow admin POST
allow {
  input.method == "POST"
  user_has_role(input.user, "admin")
}

# Allow if user owns the resource
allow {
  input.method == "PUT"
  user_owns_resource(input.user, input.path)
}

user_has_role(user, role) {
  data.roles[user] == role
}

user_owns_resource(user, path) {
  regex.match(sprintf("^/users/%s/.*", [user]), path)
}
```

### Integration
```javascript
// Node.js OPA client
async function opaAuthorize(user, action, resource, context) {
  const input = {
    user: user.id,
    role: user.role,
    method: action,
    path: resource.path,
    attributes: {
      department: user.department,
      clearance: user.clearance,
      resourceOwner: resource.owner,
      resourceDept: resource.department,
      time: new Date().getHours(),
    },
  };

  const response = await fetch('http://opa:8181/v1/data/httpapi/authz/allow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });

  const result = await response.json();
  return result.result === true;
}
```

### Deployment
```
                ┌──────────┐
App ──HTTP──>  │   OPA    │
   <──decision─│ :8181    │
                └────┬─────┘
                     │
              ┌──────┴──────┐
              │ Policy Bundle│
              │ (filesystem,│
              │  HTTP, OCI) │
              └─────────────┘
```

### Pros & Cons
| Pro | Con |
|-----|-----|
| Most flexible (Turing-complete Rego) | Rego learning curve is steep |
| Native K8s integration | Slower than in-process libs |
| Hot-reload policies | More infrastructure to manage |
| Built-in decision logging | Overkill for simple apps |

## Cerbos

### Best for
- Teams wanting YAML-defined policies without writing code.
- Fine-grained RBAC/ABAC without Rego complexity.
- Applications needing centralized, auditable authorization.

### Policy (YAML)
```yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: document
  rules:
    - actions: ['create', 'read', 'update']
      effect: EFFECT_ALLOW
      roles:
        - admin
        - manager
        - editor
    - actions: ['delete']
      effect: EFFECT_ALLOW
      roles:
        - admin
    - actions: ['read']
      effect: EFFECT_ALLOW
      roles:
        - viewer
    - actions: ['update']
      effect: EFFECT_ALLOW
      roles:
        - editor
      condition:
        match:
          expr: request.resource.attr.department == request.principal.attr.department
    - actions: ['read']
      effect: EFFECT_ALLOW
      roles:
        - viewer
      condition:
        match:
          expr: request.resource.attr.visibility == "public"
```

### Integration
```javascript
const { HTTP } = require('@cerbos/sdk');

const cerbos = new HTTP('http://localhost:3593');

async function checkAccess(user, action, resource) {
  return cerbos.check({
    principal: { id: user.id, roles: [user.role], attr: user },
    resource:  { id: resource.id, kind: 'document', attr: resource },
    actions:   [action],
  });
}
```

### Pros & Cons
| Pro | Con |
|-----|-----|
| YAML policies = readable | Newer project (2021+) |
| Built-in audit | Smaller community |
| Condition expressions for ABAC | Limited to web API deployment |
| PDP, CPI, GitOps deployment | |

## Permit.io

### Best for
- Teams wanting authorization without building infrastructure.
- Rapid prototyping and MVP.
- Non-engineering stakeholders needing policy visibility.
- Multi-tenant SaaS applications.

### Integration
```javascript
import { Permit } from 'permitio';

const permit = new Permit({
  token: 'permit_key_xxx',
  pdp: 'http://localhost:7766',
});

// Check
const allowed = await permit.check(user.id, 'read', {
  type: 'document',
  tenant: user.tenantId,
});

// Assign role
await permit.api.users.assignRole({
  user: user.id,
  role: 'editor',
  tenant: user.tenantId,
});
```

### Pros & Cons
| Pro | Con |
|-----|-----|
| Visual policy editor | External dependency |
| Built-in multi-tenancy | Network latency for SaaS |
| RBAC + ABAC + ReBAC | Pricing for scale |
| Audit out of the box | Less control |

## Selection Guide

```
Which engine to use?
  ↓
  ↓→ Already using K8s? ──→ OPA/Gatekeeper
  ↓
  ↓→ Single service monolith?
  │   ↓
  │   → Familiar with Go, Node, Python? ──→ Casbin
  │   → Want YAML policies? ──→ Cerbos
  ↓
  ↓→ Microservices / multi-service?
  │   ↓
  │   → Need complex policy logic? ──→ OPA
  │   → Need simple readable policies? ──→ Cerbos
  │   → Want fully managed? ──→ Permit.io
  ↓
  ↓→ Need ReBAC (relationship-based)?
      → Permit.io, OPA, or dedicated SpiceDB
```

## Migration Path

```
No authorization
  ↓
  ↓── Casbin (library, fast path)
  ↓
  ↓── Cerbos (YAML, auditable)
  ↓
  ↓── OPA (complex policies, centralized)
  ↓
  ↓── Permit.io (managed, GUI, ReBAC)
```

Start simple. Only add complexity when your authorization model genuinely requires it.
