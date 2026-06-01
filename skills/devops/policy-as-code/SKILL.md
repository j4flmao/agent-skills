---
name: devops-policy-as-code
description: >
  Use when the user asks about policy as code, OPA, Rego, Kyverno, admission
  controllers, policy enforcement, compliance as code, guardrails, or
  policy-based governance in Kubernetes/cloud. Covers: OPA/Rego policy writing,
  Gatekeeper constraint templates, Kyverno cluster policies, policy testing
  (conftest, opa test), CI/CD policy integration, mutation policies, policy
  reporting, and compliance automation.
  Do NOT use for: general compliance (enterprise-compliance-audit), security
  scanning (security-sast-dast), or RBAC design.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, policy-as-code, opa, kyverno, gatekeeper, phase-3]
---

# Policy as Code

## Purpose
Implement policy as code using OPA/Rego and Kyverno: write admission policies, enforce guardrails, validate configurations, and automate compliance checks in Kubernetes and cloud environments. Covers mutating and validating policies, constraint templates, policy testing, CI/CD integration, and policy lifecycle management.

## Agent Protocol

### Trigger
Exact user phrases: "policy as code", "OPA", "Open Policy Agent", "Rego", "Gatekeeper", "Kyverno", "admission controller", "admission webhook", "conftest", "constraint template", "constraint", "policy enforcement", "guardrails", "compliance as code", "policy testing", "opa test", "validate", "mutate", "generate", "policy report", "background scan".

### Input Context
- Existing policy tools (OPA, Kyverno, or none)
- Cluster/environment (Kubernetes, Terraform, CI/CD)
- Compliance requirements (PCI, SOC2, HIPAA, internal)
- Team structure and policy ownership
- Existing policy rules (if any, to migrate)

### Output Artifact
Policy definitions (Rego files, Kyverno YAML, Gatekeeper constraints), policy tests, CI/CD integration scripts, and policy reporting configuration.

### Response Format
Rego policy code, Kyverno ClusterPolicy YAML, constraint template YAML, or test files. No preamble. No postamble. No filler.

### Completion Criteria
- [ ] Policy framework selected (OPA/Gatekeeper, Kyverno, or hybrid)
- [ ] Core security policies defined (privileged containers, host networking, resource limits)
- [ ] Compliance policies defined (labels, annotations, encryption, network policies)
- [ ] Mutation policies defined (default labels, sidecar injection, resource defaults)
- [ ] Policy tests written and passing
- [ ] CI/CD integration established (conftest for IaC, admission for K8s)
- [ ] Policy reporting and monitoring configured
- [ ] Policy lifecycle management defined (review cadence, versioning)

## Architecture / Decision Trees

### Policy Engine Decision Tree

```
What kind of policies?
  Kubernetes admission only → Kyverno (K8s-native, YAML-based, or)
                               OPA Gatekeeper (Rego-based, more flexible)
  Multi-platform (K8s + Terraform + CI/CD + API gateways) → OPA (broadest support)

Team familiarity with Rego?
  Low/None → Kyverno (YAML policies, no new language)
  Moderate/High → OPA/Gatekeeper (more expressive, steeper learning curve)

Mutation policies needed?
  YES → Kyverno (native mutation support) or OPA with mutating webhook
  NO → Both work well

Background scanning needed?
  YES → Kyverno (built-in background scan, policy reports)
  NO → Both work well

Multi-cluster federation?
  YES → OPA Gatekeeper (constraint template distribution) or Kyverno with GitOps
  NO → Either
```

### Policy Categories

| Category | Examples | Engine | Priority |
|----------|----------|--------|----------|
| Security | No privileged containers, no hostNetwork, read-only root FS | Both | P0 |
| Security | Block insecure registries, enforce seccomp | Both | P1 |
| Compliance | Required labels, team annotations, cost center | Both | P1 |
| Operations | Require resource limits, probes, anti-affinity | Both | P2 |
| Operations | Default network policies, default deny ingress | Kyverno | P2 |
| Cost | Block expensive instance types, limit namespace quotas | Both | P2 |
| Governance | Enforce naming conventions, data classification labels | Both | P3 |
| Automation | Inject sidecars, add default tolerations | Kyverno | P3 |

## Core Workflow

### Step 1: OPA/Rego Policy Development

```rego
package kubernetes.admission

# Deny privileged containers
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.privileged == true
    msg := sprintf("Container %v is privileged — not allowed", [container.name])
}

# Require resource limits on all containers
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits
    msg := sprintf("Container %v has no resource limits", [container.name])
}

# Block latest image tag
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    endswith(container.image, ":latest")
    msg := sprintf("Container %v uses latest tag: %v", [container.name, container.image])
}

# Require readOnlyRootFilesystem
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.readOnlyRootFilesystem != true
    msg := sprintf("Container %v must have readOnlyRootFilesystem: true", [container.name])
}

# Block hostNetwork
deny[msg] {
    input.request.kind.kind == "Pod"
    input.request.object.spec.hostNetwork == true
    msg := "Pod uses hostNetwork — not allowed"
}

# Require specific labels
deny[msg] {
    input.request.kind.kind == "Pod"
    required_labels := {"app.kubernetes.io/name", "app.kubernetes.io/instance", "owner"}
    label := required_labels[_]
    not input.request.object.metadata.labels[label]
    msg := sprintf("Required label %v is missing", [label])
}

# Enforce image from trusted registry
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not startswith(container.image, "trusted.registry.com/")
    not startswith(container.image, "gcr.io/trusted-project/")
    msg := sprintf("Container %v uses untrusted registry: %v", [container.name, container.image])
}
```

### Step 2: OPA Gatekeeper — Constraint Template

```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
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
            msg := sprintf("Missing labels: %v", [missing])
        }

        violation[{"msg": msg}] {
            container := input.review.object.spec.containers[_]
            not container.resources.limits
            msg := sprintf("Container %v has no resource limits", [container.name])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-labels
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
    namespaces:
      - "production"
  parameters:
    labels:
      - "app.kubernetes.io/name"
      - "app.kubernetes.io/instance"
      - "team"
      - "cost-center"
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-dev-labels
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - "development"
  parameters:
    labels:
      - "app.kubernetes.io/name"
      - "owner"
```

### Step 3: Kyverno — Validate Policies

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
  annotations:
    policies.kyverno.io/title: Require Resource Limits
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: high
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-resources
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "All containers must have CPU and memory limits"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
                  requests:
                    memory: "?*"
                    cpu: "?*"
---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: block-privileged-containers
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-privileged
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Privileged containers are not allowed"
        pattern:
          spec:
            =(ephemeralContainers):
              - =(securityContext):
                  =(privileged): "false"
            =(initContainers):
              - =(securityContext):
                  =(privileged): "false"
            containers:
              - =(securityContext):
                  =(privileged): "false"
    - name: check-allow-privilege-escalation
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Privilege escalation is not allowed"
        pattern:
          spec:
            containers:
              - =(securityContext):
                  =(allowPrivilegeEscalation): "false"
```

### Step 4: Kyverno — Mutate Policies

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: default-labels
spec:
  rules:
    - name: add-app-label
      match:
        any:
          - resources:
              kinds:
                - Pod
                - Deployment
                - StatefulSet
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(app.kubernetes.io/managed-by): kyverno
              +(app.kubernetes.io/part-of): "{{request.object.metadata.namespace}}"
    - name: add-default-network-policy
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        kind: NetworkPolicy
        name: default-deny-ingress
        namespace: "{{request.object.metadata.name}}"
        synchronize: true
        data:
          spec:
            podSelector: {}
            policyTypes:
              - Ingress

apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: auto-add-istio-sidecar
spec:
  rules:
    - name: inject-sidecar
      match:
        any:
          - resources:
              kinds:
                - Deployment
              annotations:
                sidecar-injector/inject: "true"
      mutate:
        patchStrategicMerge:
          spec:
            template:
              metadata:
                annotations:
                  sidecar.istio.io/inject: "true"
---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: default-resource-requests
spec:
  rules:
    - name: set-default-resources
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        any:
          - key: "{{request.operation}}"
            operator: In
            value:
              - CREATE
              - UPDATE
      mutate:
        patchStrategicMerge:
          spec:
            containers:
              - (name): "*"
                resources:
                  requests:
                    +(cpu): "100m"
                    +(memory): "128Mi"
                  limits:
                    +(cpu): "500m"
                    +(memory): "512Mi"
```

### Step 5: Policy Testing with OPA

```rego
# test_policies_test.rego
package kubernetes.admission.test

import data.kubernetes.admission

test_deny_privileged_container {
    admission.deny[_] with input as {
        "request": {
            "kind": {"kind": "Pod"},
            "object": {
                "metadata": {"name": "test-pod"},
                "spec": {
                    "containers": [
                        {
                            "name": "app",
                            "image": "nginx",
                            "securityContext": {"privileged": true}
                        }
                    ]
                }
            }
        }
    }
}

test_allow_non_privileged {
    not admission.deny[_] with input as {
        "request": {
            "kind": {"kind": "Pod"},
            "object": {
                "metadata": {"labels": {
                    "app.kubernetes.io/name": "test",
                    "app.kubernetes.io/instance": "test",
                    "owner": "team-a"
                }},
                "spec": {
                    "containers": [
                        {
                            "name": "app",
                            "image": "trusted.registry.com/app:v1.0.0",
                            "resources": {
                                "limits": {"cpu": "500m", "memory": "512Mi"},
                                "requests": {"cpu": "250m", "memory": "256Mi"}
                            },
                            "securityContext": {
                                "readOnlyRootFilesystem": true,
                                "privileged": false
                            }
                        }
                    ]
                }
            }
        }
    }
}

test_deny_missing_labels {
    admission.deny[_] with input as {
        "request": {
            "kind": {"kind": "Pod"},
            "object": {
                "metadata": {"name": "test-pod"},
                "spec": {
                    "containers": [
                        {
                            "name": "app",
                            "image": "nginx",
                            "resources": {"limits": {"cpu": "500m"}},
                            "securityContext": {"readOnlyRootFilesystem": true}
                        }
                    ]
                }
            }
        }
    }
}

test_deny_latest_tag {
    admission.deny[_] with input as {
        "request": {
            "kind": {"kind": "Pod"},
            "object": {
                "metadata": {"labels": {
                    "app.kubernetes.io/name": "test",
                    "app.kubernetes.io/instance": "test",
                    "owner": "team-a"
                }},
                "spec": {
                    "containers": [
                        {
                            "name": "app",
                            "image": "nginx:latest",
                            "resources": {
                                "limits": {"cpu": "500m", "memory": "512Mi"},
                                "requests": {"cpu": "250m", "memory": "256Mi"}
                            },
                            "securityContext": {
                                "readOnlyRootFilesystem": true,
                                "privileged": false
                            }
                        }
                    ]
                }
            }
        }
    }
}
```

```bash
# Run policy tests
opa test ./policies/ -v

# Coverage report
opa test ./policies/ --coverage -v

# Format Rego
opa fmt ./policies/

# Evaluate against input
opa eval --data ./policies/ --input ./input.json "data.kubernetes.admission"
```

### Step 6: CI/CD Policy Integration (Conftest)

```rego
# conftest_policy.rego
package main

# Deny privileged containers in Docker Compose
deny[msg] {
    service := input.services[key]
    service.privileged == true
    msg := sprintf("Service %v is privileged — not allowed", [key])
}

# Require image tags
deny[msg] {
    service := input.services[key]
    not contains(service.image, ":")
    msg := sprintf("Service %v uses untagged image: %v", [key, service.image])
}

# Require healthcheck
deny[msg] {
    service := input.services[key]
    not service.healthcheck
    msg := sprintf("Service %v has no healthcheck", [key])
}
```

```yaml
# .github/workflows/policy-check.yml
name: Policy Check
on:
  pull_request:
    paths:
      - 'deploy/**'
      - 'terraform/**'
jobs:
  conftest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test Kubernetes manifests
        uses: open-policy-agent/conftest-action@v2
        with:
          files: deploy/**/*.yaml
          policy: policies/kubernetes/
      - name: Test Terraform plans
        run: |
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json
          conftest test plan.json --policy policies/terraform/
      - name: Test Docker Compose
        run: |
          conftest test docker-compose.yml --policy policies/docker/
```

### Step 7: Kyverno Background Scanning

```yaml
apiVersion: kyverno.io/v2
kind: ClusterPolicy
metadata:
  name: audit-existing-resources
spec:
  validationFailureAction: Audit  # Audit mode — don't block
  background: true                # Scan existing resources
  rules:
    - name: audit-privileged-pods
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Privileged containers are not allowed"
        pattern:
          spec:
            containers:
              - =(securityContext):
                  =(privileged): "false"
---
apiVersion: kyverno.io/v2
kind: PolicyReport
metadata:
  name: compliance-report
  namespace: production
spec:
  results:
    - policy: audit-existing-resources
      rule: audit-privileged-pods
      resources:
        - kind: Pod
          name: legacy-app-7f8b9
          namespace: production
      result: fail
      scored: true
      severity: high
      message: "Container legacy-app is privileged"
      timestamp: "2026-05-01T10:00:00Z"
```

### Step 8: Policy Lifecycle Management

```yaml
# Policy versioning and promotion
# policies/
# ├── development/          # Enforced in dev, audit in prod
# │   ├── require-labels.rego
# │   └── require-resources.rego
# ├── staging/              # Enforced in staging
# │   ├── block-privileged.yaml
# │   └── require-probes.yaml
# └── production/           # Enforced in production
#     ├── block-privileged.yaml
#     ├── require-resources.yaml
#     ├── require-probes.yaml
#     ├── require-network-policies.yaml
#     ├── require-encryption.yaml
#     └── block-insecure-registries.yaml

# Promotion gates:
#   development → audit only, no blocking
#   staging → enforce core security, audit extras
#   production → enforce all security + compliance
```

## Production Considerations

### Performance and Scaling
```
OPA/Gatekeeper:
  - Constraint evaluation < 1ms per admission request
  - Gatekeeper controller: 1 CPU, 512Mi for 50+ constraints
  - Max 100 constraints per controller recommended
  - Cache size monitoring: gatekeeper_constraints

Kyverno:
  - Policy evaluation < 5ms per admission request
  - Kyverno controller: 2 CPU, 1Gi for 50+ policies
  - Webhook timeout: 10s (configurable via failurePolicy)
  - Background scanning cadence: every 8h default

Both:
  - Use failurePolicy: Ignore for non-critical policies (prevents cluster outage)
  - Monitor webhook latency and failure rates
  - Set resource limits on policy controllers
  - Avoid overloading with too many webhooks (>50 policies per controller)
```

### Security Considerations
```
- Admission webhooks can block cluster operations if misconfigured
  → Always test policies in Audit mode first
  → Use failurePolicy: Fail for security policies
  → Use failurePolicy: Ignore for cosmetic/compliance policies
  → Exclude kube-system from restrictive policies

- Policy engine compromise is cluster compromise
  → Restrict access to policy CRDs (constraint templates)
  → Use separate service accounts for policy controllers
  → Audit policy changes via Kubernetes audit log

- Policy as code in CI/CD prevents bad configs from reaching the cluster
  → Run conftest in pre-commit hooks for immediate feedback
  → Run conftest in CI for PR validation
  → Run admission webhooks in cluster for defense-in-depth
```

### Common Pitfalls

1. **Too many blocking policies**: Developers will push back. Start with 5 core security policies, add more gradually.
2. **No Audit mode first**: Every policy should run in Audit mode for 2 weeks before switching to Enforce.
3. **Ignoring performance**: Each admission webhook adds 3-5ms latency. Group related policies into fewer webhooks.
4. **Policy sprawl**: 100+ small policies are harder to manage than 20-30 focused policies.
5. **Missing policy tests**: Untested Rego code has bugs. Every policy needs tests covering pass and fail cases.
6. **No policy review cadence**: Policies become stale. Review every quarter with stakeholders.
7. **Overly broad matching**: A policy matching all kinds can break CRD controllers. Scope policies to specific kinds.
8. **Forgetting exclusions**: Admission webhooks need to exclude control plane components (kube-system, istio-system).
9. **Drift between environments**: Policies in dev, staging, and prod should be version-controlled and promoted.
10. **No policy alerting**: Policy violations must alert the platform team, even in Audit mode.

## Compared With

| Aspect | OPA/Gatekeeper | Kyverno | jsPolicy |
|--------|---------------|---------|----------|
| Policy language | Rego (declarative) | YAML (no new language) | JavaScript/TypeScript |
| Learning curve | High | Low | Medium |
| Mutation support | Custom webhook | Native | Native |
| Background scan | External tooling | Built-in | Limited |
| Policy testing | opa test (built-in) | kyverno test (built-in) | Jest |
| CI/CD integration | conftest | kyverno-json | Custom |
| Multi-platform | K8s, Terraform, API, Envoy, Cloud | K8s-native | K8s-native |
| Community size | Very Large | Large | Small |
| Ecosystem tools | Conftest, Gatekeeper, Envoy | kyverno-json, Policy Reporter | Limited |
| Performance | <1ms per rule | <5ms per policy | <10ms per policy |

## References
- references/kyverno-policies.md — Kyverno Policies
- references/opa-k8s-admission.md — OPA Gatekeeper for Kubernetes Admission Control
- references/opa-policy-language.md — OPA/Rego Deep Dive
- references/policy-as-code-advanced.md — Policy As Code Advanced Topics
- references/policy-as-code-fundamentals.md — Policy As Code Fundamentals
- references/policy-ci-cd.md — Policy-as-Code in CI/CD
- references/policy-testing.md — OPA/Rego Policy Patterns
- references/policy-lifecycle.md — Policy Lifecycle and Versioning
- references/kyverno-mutation.md — Kyverno Mutation Patterns
- references/performance-tuning.md — Policy Engine Performance Tuning

## Handoff
Related skills: platform-engineering (guardrails in IDP), gitops-advanced (policy sync with GitOps), kubernetes-operators (admission webhooks), security-container-security (Pod Security Standards), enterprise-compliance-audit (compliance reporting).
