# OPA/Rego ABAC Implementation

## OPA Architecture for ABAC

```
                    ┌─────────────┐
Request ──> PEP ──> │    OPA     │ ──> Decision
(Service)           │  localhost  │
                    │   :8181     │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Policy Bundles│
                    │ (Rego files) │
                    └─────────────┘
```

## Rego Policy Structure for ABAC

### Input document structure
```rego
# Input format expected by OPA
input = {
  "subject": {
    "id": "user-123",
    "role": "manager",
    "department": "engineering",
    "clearance": "level-2",
    "location": "US",
    "mfa_enabled": true,
  },
  "resource": {
    "type": "invoice",
    "id": "inv-456",
    "amount": 15000,
    "department": "engineering",
    "owner": "user-456",
    "classification": "confidential",
    "sensitivity": 3,
    "region": "US",
  },
  "action": {
    "method": "POST",
    "action": "approve",
    "path": "/api/invoices/inv-456/approve",
  },
  "environment": {
    "time": 14,
    "day": 3,
    "ip": "10.0.1.50",
    "risk_score": 25,
    "device_trust": 85,
    "auth_method": "mfa",
    "is_business_hours": true,
  },
}
```

### Complete ABAC policy in Rego
```rego
package abac

# ==========================================
# Default: deny everything
# ==========================================
default allow = false

# ==========================================
# Helper functions
# ==========================================

# Role hierarchy check
role_rank = {
  "viewer": 0,
  "member": 1,
  "lead": 2,
  "manager": 3,
  "org-admin": 4,
  "super-admin": 5,
}

is_at_least(target) {
  role_rank[input.subject.role] >= role_rank[target]
}

# Business hours (9 AM - 5 PM, Mon-Fri)
is_business_hours {
  input.environment.time >= 9
  input.environment.time < 17
  input.environment.day >= 1
  input.environment.day <= 5
}

# Own resource check
is_owner {
  input.subject.id == input.resource.owner
}

# Same department check
same_department {
  input.subject.department == input.resource.department
}

# ==========================================
# Policy: Super Admin
# ==========================================
allow {
  input.subject.role == "super-admin"
}

# ==========================================
# Policy: Org Admin (scoped to region)
# ==========================================
allow {
  input.subject.role == "org-admin"
  input.subject.region == input.resource.region
}

# ==========================================
# Policy: Owner access
# ==========================================
allow {
  is_owner
  input.action.action != "delete"   # Owner cannot delete (requires admin)
  input.resource.classification != "restricted"
}

# ==========================================
# Policy: Department access (same dept, non-confidential)
# ==========================================
allow {
  is_at_least("member")
  same_department
  input.resource.classification != "confidential"
  input.resource.classification != "restricted"
}

# ==========================================
# Policy: Confidential document access (requires clearance)
# ==========================================
allow {
  input.resource.classification == "confidential"
  same_department
  input.subject.clearance == "level-3"
  input.subject.clearance == "level-4"
  input.subject.clearance == "level-5"
}

# ==========================================
# Policy: Sensitive operations (approve, delete, export)
# ==========================================
allow {
  input.action.action in ["approve", "delete", "export"]
  is_business_hours
  input.environment.risk_score < 50
  input.resource.sensitivity <= 3
  is_at_least("lead")
  same_department
}

# ==========================================
# Policy: Approve with amount threshold
# ==========================================
allow {
  input.action.action == "approve"
  input.resource.amount <= 10000
  is_at_least("lead")
  same_department
  input.subject.id != input.resource.owner   # No self-approval
}

allow {
  input.action.action == "approve"
  input.resource.amount > 10000
  is_at_least("manager")
  same_department
  input.subject.id != input.resource.owner
}

# ==========================================
# Policy: Cross-region access (requires business hours + low risk)
# ==========================================
allow {
  input.subject.region != input.resource.region
  is_business_hours
  input.environment.risk_score < 30
  is_at_least("manager")
  input.environment.device_trust >= 80
}

# ==========================================
# Policy: High-risk environment restrictions
# ==========================================
allow {
  input.environment.risk_score > 80
  is_at_least("org-admin")
  input.environment.auth_method == "mfa"
}
```

## OPA Deployment

### Sidecar deployment (recommended)
```yaml
# docker-compose.yml
services:
  app:
    image: my-app:latest
    ports:
      - "3000:3000"
    environment:
      OPA_URL: http://opa:8181

  opa:
    image: openpolicyagent/opa:latest
    ports:
      - "8181:8181"
    command:
      - "run"
      - "--server"
      - "--log-level=info"
      - "--decision-log-console=true"
      - "/policies"
    volumes:
      - ./policies:/policies
    healthcheck:
      test: ["CMD", "wget", "-q", "http://localhost:8181/health"]
      interval: 10s
      timeout: 3s
```

### WASM deployment (in-process, faster)
```javascript
// Node.js OPA WASM
const { loadPolicy } = require('@openpolicyagent/opa-wasm');

async function initOPA() {
  const policyWasm = fs.readFileSync('policy.wasm');
  const policy = await loadPolicy(policyWasm);
  return policy;
}

// In-process evaluation (no HTTP call)
function evaluate(policy, input) {
  const result = policy.evaluate(input);
  return result[0].result;
}

// Usage in middleware
const opa = await initOPA();

async function authMiddleware(req, res, next) {
  const input = buildInput(req);
  const allowed = evaluate(opa, input);

  if (!allowed) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}
```

### Bundle deployment (hot-reload)
```yaml
# opa-config.yaml
services:
  bundle-server:
    url: https://policies.mycompany.com

bundles:
  authz:
    service: bundle-server
    resource: bundles/authz.tar.gz
    polling:
      min_delay_seconds: 60
      max_delay_seconds: 120

decision_logs:
  console: true
```

## Performance Tuning

### Optimization techniques

```rego
# BAD: Inefficient — creates entire list before iterating
allow {
  some role
  role = data.roles[input.user][_]
  data.permissions[role][_] == input.action
}

# GOOD: Efficient — short-circuits on first match
allow {
  data.user_roles[input.user] = role
  data.role_perms[role][input.action]
}

# BAD: Computes every time
allow {
  count(data.users) > 1000   # Expensive every evaluation
}

# GOOD: Pre-compute
# Compute at bundle build time, not evaluation time
```

### Caching
```yaml
# OPA caching configuration
caching:
  inter_query_builtin_cache:
    max_size_bytes: 104857600   # 100MB
  inter_query_value_cache:
    max_size_bytes: 52428800    # 50MB
```

### Rule indexing
OPA automatically indexes rules by `input` fields. Structure your input to maximize index usage:

```rego
# OPA will index by input.resource.type and input.action.action
allow {
  input.resource.type == "document"
  input.action.action == "read"
  # ... conditions
}
```

## Decision Logging

### OPA decision logs
```json
{
  "labels": {
    "id": "opa-1",
    "version": "0.58.0"
  },
  "decision_id": "4b8a9c2f-1d3e-4f6a-8b7c-9d0e1f2a3b4c",
  "input": {
    "subject": {"role": "manager"},
    "resource": {"type": "invoice"},
    "action": {"action": "approve"},
    "environment": {"risk_score": 25}
  },
  "result": true,
  "timestamp": "2026-05-25T14:30:00Z",
  "metrics": {
    "timer_rego_explain_eval_ns": 125000,
    "timer_rego_query_eval_ns": 150000
  }
}
```

### Custom audit integration
```javascript
// Forward OPA decisions to your audit system
async function auditMiddleware(decision) {
  await prisma.authDecision.create({
    data: {
      decisionId: decision.decision_id,
      userId: decision.input.subject.id,
      action: decision.input.action.action,
      resource: decision.input.resource.id,
      allowed: decision.result,
      timestamp: new Date(decision.timestamp),
      latency: decision.metrics?.timer_rego_query_eval_ns,
    },
  });

  if (!decision.result) {
    // Track denied attempts for security monitoring
    await trackDeniedAccess(decision.input);
  }
}
```

## Testing Rego Policies

```rego
package test_abac

import data.abac

# Test data
test_subject = {"role": "manager", "department": "eng", "id": "user-1", "region": "US"}
test_resource = {"type": "invoice", "amount": 5000, "department": "eng", "owner": "user-2", "region": "US"}
test_action = {"action": "approve"}
test_env = {"time": 14, "day": 3, "risk_score": 20, "device_trust": 85, "auth_method": "password"}

# Test cases
test_manager_approve_dept_invoice {
  abac.allow with input as {
    "subject": test_subject,
    "resource": test_resource,
    "action": test_action,
    "environment": test_env,
  }
}

test_no_self_approval {
  not abac.allow with input as {
    "subject": {"role": "manager", "department": "eng", "id": "user-1"},
    "resource": {"type": "invoice", "amount": 5000, "department": "eng", "owner": "user-1"},
    "action": {"action": "approve"},
    "environment": test_env,
  }
}

test_high_risk_blocks {
  not abac.allow with input as {
    "subject": test_subject,
    "resource": test_resource,
    "action": test_action,
    "environment": {"time": 14, "day": 3, "risk_score": 85, "device_trust": 50},
  }
}
```

## Tools

| Tool | Purpose | Command |
|------|---------|---------|
| **opa eval** | Evaluate Rego expressions | `opa eval "data.abac.allow" --input input.json --data policy.rego` |
| **opa test** | Run Rego tests | `opa test ./policies/` |
| **opa fmt** | Format Rego files | `opa fmt -w *.rego` |
| **opa build** | Build OPA bundles | `opa build -b policies/` |
| **opa check** | Syntax check | `opa check *.rego` |
| **Rego Playground** | Online editor/tester | https://play.openpolicyagent.org |
