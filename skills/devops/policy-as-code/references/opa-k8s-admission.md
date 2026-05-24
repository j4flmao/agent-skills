# OPA Gatekeeper for Kubernetes Admission Control

Gatekeeper integrates OPA with Kubernetes as an admission webhook, enforcing policies via ConstraintTemplates and Constraints.

## Architecture

```
Kubernetes API Server
    ↓ (admission review request)
Gatekeeper Webhook
    ↓
OPA Engine (evaluate against policies)
    ↓ (admission review response)
Kubernetes API Server (allow/deny)
```

## ConstraintTemplate

Defines the reusable policy logic in Rego:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        
        violation[{"msg": msg}] {
            provided := {label | input.review.object.metadata.labels[label]}
            required := {label | label := input.parameters.labels[_]}
            missing := required - provided
            count(missing) > 0
            msg := sprintf("missing required labels: %v", [missing])
        }
```

## Constraint

Instantiates a ConstraintTemplate with specific parameters:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod", "Service", "ConfigMap"]
    namespaces:
      - "production"
      - "staging"
    labelSelector:
      matchLabels:
        environment: production
  parameters:
    labels:
      - "team"
      - "app.kubernetes.io/name"
```

## Enforcement Actions

| Action | Behavior |
|--------|----------|
| `deny` | Block the request (default) |
| `dryrun` | Log violations but allow request |
| `warn` | Return warning but allow request |

## Dry Run and Audit

```yaml
spec:
  enforcementAction: dryrun
---
# Audit results
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  enforcementAction: dryrun
status:
  auditTimestamp: "2026-05-24T10:00:00Z"
  violations:
    - enforcementAction: dryrun
      kind: Pod
      name: legacy-pod
      namespace: default
      message: "missing required labels: team"
  totalViolations: 3
```

## Mutation with Gatekeeper

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: Assign
metadata:
  name: add-label-owner
spec:
  applyTo:
    - groups: [""]
      versions: ["v1"]
      kinds: ["Pod"]
  match:
    scope: Namespaced
    kinds:
      - apiGroups: ["*"]
        kinds: ["Pod"]
  location: "metadata.labels.owner"
  parameters:
    assign:
      value:
        fromMetadata:
          field: namespace
```

### Assign Metadata

```yaml
apiVersion: mutations.gatekeeper.sh/v1
kind: AssignMetadata
metadata:
  name: default-label
spec:
  location: "metadata.labels.managed-by"
  parameters:
    assign:
      value: "gatekeeper"
```

## Data Replication

Sync cluster data for policy evaluation:

```yaml
apiVersion: config.gatekeeper.sh/v1alpha1
kind: Config
metadata:
  name: config
  namespace: gatekeeper-system
spec:
  sync:
    syncOnly:
      - group: ""
        version: "v1"
        kind: "Namespace"
      - group: ""
        version: "v1"
        kind: "Pod"
      - group: "networking.k8s.io"
        version: "v1"
        kind: "NetworkPolicy"
```

## Advanced Policy Examples

### Container Image Registry Constraint

```rego
package allowed_registries

violation[{"msg": msg}] {
    container := input.review.object.spec.containers[_]
    not startswith(container.image, "allowed-registry.io/")
    msg := sprintf("container %v uses disallowed registry: %v", [container.name, container.image])
}
```

### Pod Security Standards

```rego
package pod_security

violation[{"msg": msg}] {
    container := input.review.object.spec.containers[_]
    container.securityContext.runAsUser == 0
    msg := sprintf("container %v runs as root", [container.name])
}
```

## Monitoring

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: gatekeeper-metrics
  namespace: gatekeeper-system
spec:
  endpoints:
    - port: metrics
      interval: 30s
  selector:
    matchLabels:
      gatekeeper.sh/operation: webhook
```

Key metrics: `gatekeeper_constraints`, `gatekeeper_constraint_templates`, `gatekeeper_violations`, `gatekeeper_audit_seconds`.

## Helm Installation

```bash
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm install gatekeeper/gatekeeper \
  --name-template=gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace \
  --set replicas=3 \
  --set auditInterval=60 \
  --set enableMutation=true \
  --set enableExternalData=true
```

Gatekeeper brings OPA's powerful policy engine to Kubernetes with CRD-based policy management, audit capabilities, and mutation support.
