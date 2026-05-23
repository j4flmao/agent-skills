---
name: devops-kubernetes-operators
description: >
  Use when the user asks about Kubernetes operators, custom controllers, operator pattern, Kubebuilder, Operator SDK, custom resource definitions (CRD), reconciliation loops, or extending Kubernetes with custom resources. Do NOT use for: basic Kubernetes usage (kubernetes-patterns), Helm charts (helm-patterns), or general Kubernetes management.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, kubernetes-operators, phase-3]
---

# Kubernetes Operators

## Purpose
Build Kubernetes operators and custom controllers using Kubebuilder, Operator SDK, or raw controller-runtime to automate application management on Kubernetes.

## Workflow

### Operator Architecture
```
Custom Resource (CR) → Controller (Reconcile Loop) → Desired State
       ↓                        ↓                           ↓
  API Extension           Watches CR events            Create/Update/Delete
  (CRD)                   Diff actual vs desired        Kubernetes resources
```

### When to Build an Operator
| Scenario | Build Operator? | Alternative |
|----------|----------------|-------------|
| Deploy a complex app | ✅ Yes | Helm + ArgoCD |
| Automate backup/restore | ✅ Yes | CronJob + scripts |
| Manage external resources | ✅ Yes | Crossplane |
| Simple deployment | ❌ No | Helm chart |
| Stateless app | ❌ No | Deployment + Service |

### Kubebuilder Project Structure
```
project/
├── api/ — CRD type definitions (Go structs)
├── internal/controller/ — reconciliation logic
├── config/ — manifests (CRD, RBAC, webhook, controller)
│   ├── crd/ — generated CRD YAML
│   ├── rbac/ — ClusterRole, ServiceAccount
│   ├── webhook/ — admission webhooks
│   └── samples/ — example CRs
├── Dockerfile — controller image
├── Makefile — build, test, deploy targets
└── go.mod — Go module
```

### Reconciliation Loop Pattern
```go
func (r *MyResourceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // 1. Fetch the CR
    // 2. Get current state
    // 3. Diff desired vs actual
    // 4. Create/Update/Delete subresources
    // 5. Update CR status
    // 6. Requeue if needed
}
```

## References
- `references/operator-patterns.md` — Operator design patterns and best practices
- `references/kubebuilder-guide.md` — Kubebuilder setup and development guide
- `references/reconciliation-logic.md` — Reconciliation loop patterns and error handling

## Handoff
Related skills: kubernetes-patterns, helm-patterns, devops-gitops-advanced, devops-policy-as-code.
