# Kubernetes Patterns: Advanced Policy, Admission, and Workload Hardening

Advanced platform patterns for multi-team clusters: enforcing standards with admission control (Pod Security Admission, ValidatingAdmissionPolicy, policy engines), tenant isolation, resource governance, in-place resizing, and safe progressive delivery. Builds on `kubernetes-patterns-fundamentals.md`.

## Admission Control Layers

```
kubectl / GitOps → API server → authentication → authorization (RBAC)
                 → mutating admission (webhooks, MutatingAdmissionPolicy)
                 → schema validation
                 → validating admission (Pod Security Admission, ValidatingAdmissionPolicy, webhooks)
                 → etcd
```

| Mechanism | Strengths | Trade-offs |
|-----------|-----------|-----------|
| Pod Security Admission (built in, GA 1.25) | Zero install; enforces Pod Security Standards per namespace | Only three fixed profiles |
| ValidatingAdmissionPolicy (CEL, GA 1.30) | In-process, no webhook latency or availability risk | CEL expressions; validation only |
| MutatingAdmissionPolicy (CEL) | In-process mutation | Newer; check feature status for your version |
| Kyverno / OPA Gatekeeper | Rich policies, mutation, generation, reporting | Webhook availability and latency; extra components |

## Pod Security Admission

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

- `restricted` requires non-root, no privilege escalation, dropped capabilities, RuntimeDefault seccomp.
- Roll out with `warn`/`audit` first, then `enforce`.
- System namespaces (CNI, CSI, monitoring agents) often need `privileged`; isolate them.

## ValidatingAdmissionPolicy (CEL)

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata: { name: require-immutable-images }
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments", "statefulsets", "daemonsets"]
  validations:
    - expression: >-
        object.spec.template.spec.containers.all(c,
          !c.image.endsWith(':latest') && (c.image.contains('@sha256:') || c.image.contains(':')))
      message: "Images must use an explicit, non-latest tag or digest"
    - expression: >-
        object.spec.template.spec.containers.all(c,
          has(c.resources.requests) && has(c.resources.requests.memory))
      message: "Every container must declare a memory request"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata: { name: require-immutable-images }
spec:
  policyName: require-immutable-images
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels: { platform.example.com/tenant: "true" }
```

Use `validationActions: [Warn, Audit]` to trial a policy before `Deny`.

## Policy Engines

Kyverno example generating a default-deny NetworkPolicy in every new tenant namespace:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: default-deny-netpol }
spec:
  rules:
    - name: generate-default-deny
      match:
        any:
          - resources:
              kinds: [Namespace]
              selector: { matchLabels: { platform.example.com/tenant: "true" } }
      generate:
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        name: default-deny
        namespace: "{{request.object.metadata.name}}"
        synchronize: true
        data:
          spec:
            podSelector: {}
            policyTypes: [Ingress, Egress]
```

Run webhook-based engines with multiple replicas, PDBs, and sensible `failurePolicy` and timeouts; exclude `kube-system` to avoid locking yourself out.

## Multi-Tenancy Patterns

| Model | Isolation | Use |
|-------|-----------|-----|
| Namespace per team/app | RBAC, quotas, NetworkPolicy, PSA | Most internal platforms |
| Virtual clusters (vCluster) | Separate control plane per tenant on shared nodes | Tenants needing cluster-admin-like APIs/CRDs |
| Dedicated node pools per tenant | Taints/tolerations + node affinity | Noisy-neighbour or compliance separation |
| Cluster per tenant | Strongest | Regulated or hostile tenants |

Namespace tenancy baseline per namespace: RoleBindings to tenant groups (never cluster-admin), ResourceQuota, LimitRange, default-deny NetworkPolicy, PSA labels, and a dedicated ServiceAccount per workload.

## Resource Governance

```yaml
apiVersion: v1
kind: ResourceQuota
metadata: { name: team-quota, namespace: team-a }
spec:
  hard:
    requests.cpu: "40"
    requests.memory: 80Gi
    limits.memory: 120Gi
    persistentvolumeclaims: "20"
    services.loadbalancers: "2"
---
apiVersion: v1
kind: LimitRange
metadata: { name: defaults, namespace: team-a }
spec:
  limits:
    - type: Container
      defaultRequest: { cpu: 100m, memory: 128Mi }
      default: { memory: 512Mi }
      max: { memory: 8Gi }
```

- Quotas on `requests.*` require every pod to declare requests; LimitRange defaults fill gaps.
- Use PriorityClasses so platform components preempt tenant workloads under pressure, and cap who can use high priorities via quota scopes.

## In-Place Pod Resize

Kubernetes can change container CPU/memory requests and limits without recreating the pod (beta and enabled by default since 1.33). Resize via the `resize` subresource:

```bash
kubectl patch pod app-7d9f --subresource resize --patch \
  '{"spec":{"containers":[{"name":"app","resources":{"requests":{"cpu":"800m"},"limits":{"cpu":"800m"}}}]}}'
```

- `resizePolicy` per resource controls whether a container restart is required (memory decreases often need it).
- VPA can use in-place updates in newer releases, reducing disruption for vertical scaling.

## Progressive Delivery with Analysis

Argo Rollouts canary with automated metric analysis:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: checkout }
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - analysis: { templates: [{ templateName: error-rate }] }
        - setWeight: 50
        - pause: { duration: 10m }
  selector: { matchLabels: { app: checkout } }
  template:
    metadata: { labels: { app: checkout } }
    spec:
      containers: [{ name: checkout, image: ghcr.io/org/checkout:2.4.0 }]
```

The `AnalysisTemplate` queries Prometheus (e.g. 5xx ratio) and aborts the rollout automatically when thresholds are exceeded. Flagger provides equivalent automation with service meshes and Gateway API.

## Supply Chain Enforcement

- Verify image signatures at admission (Sigstore policy-controller, Kyverno `verifyImages`, Connaisseur) so only images signed by CI run.
- Restrict registries to an allow-list.
- Require SBOM/provenance attestations for production namespaces.

## Pitfalls

- Webhook policies with `failurePolicy: Fail` and a single replica: an outage blocks all deployments, including fixes.
- Enforcing `restricted` PSA cluster-wide on day one, breaking system components.
- Quotas without LimitRange defaults, so pods without requests are rejected with confusing errors.
- Tenants granted permission to create RoleBindings, allowing privilege escalation.

## Checklist

- [ ] PSA labels on every namespace (`restricted` for tenants)
- [ ] CEL ValidatingAdmissionPolicies for org standards; trial with Warn/Audit
- [ ] Policy engine (if used) highly available and excluding system namespaces
- [ ] Tenant namespaces bootstrapped with RBAC, quotas, LimitRange, default-deny
- [ ] PriorityClasses and quota scopes defined
- [ ] Automated canary analysis for critical services
- [ ] Image signature verification at admission
