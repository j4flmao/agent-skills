# Admission Controller Policies

## Policy Categories
| Category | Policy | Severity |
|----------|--------|----------|
| Security | Block privileged containers | Critical |
| Security | Require read-only root filesystem | High |
| Security | Block host network access | High |
| Security | Require seccomp profile | Medium |
| Compliance | Enforce Pod Security Standards | High |
| Compliance | Block deprecated API versions | Medium |
| Operations | Require resource limits | Medium |
| Operations | Require liveness/readiness probes | Low |

## Pod Security Standards
| Standard | What It Enforces |
|----------|------------------|
| Privileged | No restrictions |
| Baseline | Prevents known privilege escalations |
| Restricted | Follows Pod hardening best practices |

## Policy Engines
| Engine | Language | Strengths |
|--------|----------|-----------|
| OPA Gatekeeper | Rego | Most flexible, large community |
| Kyverno | YAML | Kubernetes-native, easier to write |
| Custom webhook | Any | Full control, more effort |
