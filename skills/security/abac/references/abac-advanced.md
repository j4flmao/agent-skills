# ABAC Advanced Topics

## Introduction
Advanced ABAC covers multi-party authorization, attribute-based encryption, ABAC at API gateway scale, ABAC in service meshes with OPA sidecars, real-time attribute propagation, and compliance-driven attribute governance.

## ABAC at Scale with OPA Sidecars
```yaml
# Kubernetes sidecar configuration for OPA
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    metadata:
      annotations:
        sidecar.opentelemetry.io/inject: "true"
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: OPA_URL
              value: "http://localhost:8181"
        - name: opa
          image: openpolicyagent/opa:latest
          args:
            - "run"
            - "--server"
            - "--addr=localhost:8181"
            - "--config-file=/etc/opa/config.yaml"
          volumeMounts:
            - name: opa-policies
              mountPath: /etc/opa
      volumes:
        - name: opa-policies
          configMap:
            name: authz-policies
```

## Hybrid RBAC-ABAC Architecture
```rego
# hybrid approach: RBAC as broad filter, ABAC for fine-grained
package authz

# First check role-based access
role_allowed {
    input.subject.role == "admin"
}
role_allowed {
    input.subject.role == "manager"
    input.resource.department == input.subject.department
}
role_allowed {
    input.subject.role == "user"
    input.action.type == "read"
}

# Then apply ABAC conditions
allow {
    role_allowed
    input.resource.classification != "restricted"
    input.environment.time between 6 and 22
    input.subject.clearance >= input.resource.min_clearance
}
```

## ABAC Testing with OPA Test Framework
```rego
package authz_test

import data.authz

test_engineering_read_internal {
    result := authz.allow with input as {
        "subject": {"department": "engineering", "role": "dev"},
        "resource": {"classification": "internal"},
        "action": {"type": "read"},
        "environment": {"time": 14},
    }
    result == true
}

test_engineering_cannot_read_confidential {
    result := authz.allow with input as {
        "subject": {"department": "engineering", "role": "dev"},
        "resource": {"classification": "confidential"},
        "action": {"type": "read"},
        "environment": {"time": 14},
    }
    result == false
}
```

## Attribute Governance
- Define attribute taxonomy centrally (no ad-hoc attributes)
- Validate attribute values against schema at runtime
- Monitor attribute drift — attributes that are never used should be removed
- Document attribute meaning and expected values
- Attribute ownership: who can assign/change attribute values
- Regular attribute audit: review attribute usage and effectiveness

## Performance Optimization
- Index policies by attribute combinations for faster lookup
- Cache decisions at PEP level (30-60s TTL by default)
- Use partial evaluation for pre-computed policy results
- Profile policy evaluation time with OPA's built-in metrics
- Batch attribute lookups when possible
- Use WebAssembly-compiled OPA for sub-millisecond evaluation

## Key Points
- OPA sidecars deploy ABAC at the service mesh layer
- Hybrid RBAC-ABAC provides practical enterprise authorization
- Test policies with OPA's built-in test framework
- Govern attributes centrally — no ad-hoc or undocumented attributes
- Optimize PDP performance with caching and partial evaluation
- Monitor policy evaluation time and set performance budgets
- Log all ABAC decisions for audit and tuning
