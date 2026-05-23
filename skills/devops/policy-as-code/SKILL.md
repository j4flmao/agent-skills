---
name: devops-policy-as-code
description: >
  Use when the user asks about policy as code, OPA, Rego, Kyverno, admission controllers, policy enforcement, compliance as code, guardrails, or policy-based governance in Kubernetes/cloud. Do NOT use for: general compliance (enterprise-compliance-audit), security scanning (security-sast-dast), or RBAC design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, policy-as-code, phase-3]
---

# Policy as Code

## Purpose
Implement policy as code using OPA/Rego and Kyverno: write admission policies, enforce guardrails, validate configurations, and automate compliance checks in Kubernetes and cloud environments.

## Workflow

### Policy-as-Code Stack
```
OPA (Open Policy Agent)
├── Rego language — declarative policy language
├── Gatekeeper — Kubernetes admission controller
├── Conftest — policy testing for configuration files
└── OPA-Envoy — sidecar for API authorization

Kyverno
├── Kubernetes-native policies (YAML, not Rego)
├── Mutate, validate, generate, and clean-up
└── Policy reports and background scanning
```

### OPA/Gatekeeper Constraint Template Example
```rego
# Require all containers have resource limits
violation[{"msg": msg}] {
    container := input.review.object.spec.containers[_]
    not container.resources.limits
    msg := sprintf("Container %v has no resource limits", [container.name])
}
```

### Kyverno Policy Example
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  validationFailureAction: Enforce
  rules:
  - name: check-app-label
    match:
      any:
      - resources:
          kinds: ["Deployment", "StatefulSet"]
    validate:
      message: "label 'app.kubernetes.io/name' is required"
      pattern:
        metadata:
          labels:
            app.kubernetes.io/name: "?*"
```

### Policy Categories
| Category | OPA/Gatekeeper | Kyverno |
|----------|---------------|---------|
| Security | Block privileged containers, read-only root FS | Auto-mount SA tokens, seccomp |
| Compliance | Enforce encryption, audit logging | Pod Security Standards |
| Operations | Require resource limits, probes, anti-affinity | Default labels, annotations |
| Cost | Block expensive instance types | Limit namespace resource quotas |
| Governance | Require specific annotations, team labels | Generate default NetworkPolicies |

## References
- `references/opa-rego-patterns.md` — OPA/Rego policy patterns and best practices
- `references/kyverno-policies.md` — Kyverno policy examples and cluster policies
- `references/policy-testing.md` — Policy testing, CI/CD integration, and audit logging

## Handoff
Related skills: devops-platform-engineering, devops-gitops-advanced, enterprise-compliance-audit, security-container-security.
