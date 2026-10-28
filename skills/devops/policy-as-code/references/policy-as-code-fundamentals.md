# Policy as Code Fundamentals

Policy as code (PaC) expresses organizational rules (security, compliance, cost, reliability) as machine-readable policies stored in version control, tested like software, and enforced automatically at defined points. This reference covers concepts, enforcement points, the main engines and how to choose between them, and the policy lifecycle. Engine-specific deep dives (Rego, Gatekeeper, Kyverno, Terraform, CI, testing) are in sibling references.

## Why Policy as Code
| Manual policy | Policy as code |
|---|---|
| Wiki pages and review checklists | Executable rules |
| Inconsistent enforcement by reviewers | Same decision every time |
| Found late (audits, incidents) | Found early (PR, admission) |
| Hard to prove compliance | Decision logs and reports as evidence |

## Core Concepts

| Concept | Meaning |
|---|---|
| Policy | Rule over structured input (JSON/YAML/HCL plan) returning allow/deny/warnings |
| Input | The object being evaluated: Kubernetes resource, Terraform plan JSON, API request, cloud resource config |
| Data/context | External facts used by the policy: allowed registries, team ownership, exceptions |
| Decision | Allow, deny, warn, or mutate, plus messages |
| Enforcement point | Where the decision is applied (CI, admission, runtime, API gateway, cloud control plane) |
| Mode | Audit/dry-run (report only), warn, enforce (block) |
| Exception | Approved, time-bound deviation tracked in code |

## Enforcement Points (shift left and guard right)

```
IDE / pre-commit -> CI (PR checks on code, IaC plans, manifests) -> deploy-time admission (Kubernetes)
   -> cloud control plane guardrails (SCPs, Azure Policy, Org Policy) -> runtime/continuous audit
```
| Point | Example tools | Catches |
|---|---|---|
| CI | Conftest (OPA), Checkov, Trivy config, KICS, tfsec rules in Trivy, Kyverno CLI | Misconfigurations before merge |
| Kubernetes admission | OPA Gatekeeper, Kyverno, ValidatingAdmissionPolicy (CEL, built-in GA since Kubernetes 1.30) | Anything applied to the cluster, including manual `kubectl` |
| Cloud control plane | AWS SCPs/RCPs and Config rules, Azure Policy, Google Cloud Organization Policy | Actions through console/API/CLI |
| Terraform platforms | HCP Terraform/Terraform Enterprise Sentinel or OPA policy sets, Spacelift/env0 OPA policies | Plans before apply |
| Application authorization | OPA, Cedar (Amazon Verified Permissions), OpenFGA | Per-request access decisions |

Use more than one layer: CI gives fast feedback; admission/control-plane enforcement cannot be bypassed by skipping CI.

## Engines Compared

| Engine | Language | Strengths | Considerations |
|---|---|---|---|
| OPA | Rego | General purpose; any JSON input; huge ecosystem (Gatekeeper, Conftest) | Rego learning curve |
| Gatekeeper | Rego in ConstraintTemplates | Kubernetes-native CRDs, audit of existing resources, mutation | Kubernetes only |
| Kyverno | YAML (with CEL support) | Kubernetes-native, validate/mutate/generate/verifyImages, no new language | Kubernetes focused (CLI can test manifests in CI) |
| ValidatingAdmissionPolicy | CEL | Built into the API server, no webhook to operate | Validation only (mutation via MutatingAdmissionPolicy is newer), simpler rules |
| Sentinel | Sentinel | Tight HashiCorp integration | Commercial HashiCorp products |
| Cedar | Cedar | Fast, analyzable authorization policies | Application authz, not infra config |
| Cloud-native | JSON policy definitions | No extra infrastructure | Provider-specific |

## A First Policy (three engines, same rule: no `:latest` images)

Rego (Conftest / Gatekeeper style input):
```rego
package kubernetes.images

import rego.v1

deny contains msg if {
  some c in input.spec.template.spec.containers
  endswith(c.image, ":latest")
  msg := sprintf("container %s uses a :latest image tag", [c.name])
}
```

Kyverno:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
spec:
  rules:
    - name: require-pinned-tag
      match:
        any:
          - resources: { kinds: [Pod] }
      validate:
        failureAction: Audit           # rule-level since Kyverno 1.13; switch to Enforce after review
        message: "Images must not use the :latest tag."
        pattern:
          spec:
            containers:
              - image: "!*:latest"
```

ValidatingAdmissionPolicy (CEL):
```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: disallow-latest-tag
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    - expression: "object.spec.template.spec.containers.all(c, !c.image.endsWith(':latest'))"
      message: "Images must not use the :latest tag."
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: disallow-latest-tag
spec:
  policyName: disallow-latest-tag
  validationActions: ["Warn", "Audit"]       # add "Deny" when ready
```

## Policy Lifecycle
1. **Author** in git with an owner and rationale (link to the control/standard it implements).
2. **Test** with unit tests (allowed and denied fixtures) in CI.
3. **Release** versioned bundles/manifests.
4. **Roll out** in audit mode, review violations, fix or grant exceptions.
5. **Enforce** (deny) once violations are resolved.
6. **Monitor** decision logs and policy reports; track exceptions to expiry.
7. **Retire** obsolete policies.

## Common Starter Policies
| Domain | Policy |
|---|---|
| Kubernetes | No privileged containers, run as non-root, resource requests/limits, allowed registries, signed images, required labels |
| IaC | Encryption at rest, no public buckets, no `0.0.0.0/0` on admin ports, required tags, approved regions/instance types |
| Cloud org | Deny disabling audit logging, restrict regions, deny root user actions |
| CI/CD | Required reviewers, pinned actions by SHA, no plaintext secrets |

## Good Policy Messages
State what failed, where, why it matters, and how to fix:
"Deployment payments/api container `app` runs as root. Set `securityContext.runAsNonRoot: true` (CIS 5.2.6). Exception process: PLAT-123."

## Checklist
- [ ] Policies in git with owners and linked controls
- [ ] At least two enforcement layers (CI + admission/control plane)
- [ ] Unit tests for allow and deny cases
- [ ] Audit-before-enforce rollout
- [ ] Exceptions explicit, approved and time-bound
- [ ] Decision logs/reports collected as compliance evidence
