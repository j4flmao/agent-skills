# Platform Engineering Advanced: Control Planes, Resource Abstractions, Policy, Multi-Tenancy and Platform Reliability

Advanced implementation patterns for internal developer platforms at scale: Kubernetes-based control planes with Crossplane, designing resource abstractions, score/workload specifications, policy-as-code guardrails, multi-tenancy models, ephemeral environments, platform APIs and the platform's own reliability. Fundamentals, Backstage setup, golden paths and maturity are in sibling references.

## Control Plane Pattern

Treat infrastructure requests as declarative resources reconciled continuously, the same way Kubernetes reconciles Deployments.

```text
Developer claim (YAML in Git or via portal)
   -> GitOps (Argo CD / Flux) applies to control plane cluster
   -> Composition engine (Crossplane) renders managed resources
   -> Providers create cloud resources (RDS, Cloud SQL, buckets, IAM)
   -> Connection details written as Secrets / External Secrets to the workload namespace
```

Benefits: drift correction, a single API for many clouds, RBAC and policy on requests, and status reported back on the claim.

### Crossplane composite resource (v2 style)

```yaml
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: postgresinstances.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: PostgresInstance
    plural: postgresinstances
  scope: Namespaced
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                size:
                  type: string
                  enum: [small, medium, large]
                version:
                  type: string
                  enum: ["16", "17"]
              required: [size]
```

```yaml
apiVersion: platform.example.com/v1alpha1
kind: PostgresInstance
metadata:
  name: orders-db
  namespace: team-orders
spec:
  size: small
  version: "17"
```

Crossplane v2 (2025) allows namespaced composite resources directly, replacing the separate claim objects used in v1 (`apiextensions.crossplane.io/v1` with `claimNames`). A Composition (typically using function pipelines such as `function-patch-and-transform`, `function-go-templating` or KCL) maps `size: small` to concrete instance classes, storage, backups, encryption, network placement and monitoring. Check the API version supported by your Crossplane release.

Alternatives: Terraform/OpenTofu modules driven by automation (Atlantis, Terraform Cloud/HCP, Spacelift) with a request interface; Kratix promises; cloud-native operators (AWS Controllers for Kubernetes, Azure Service Operator, Config Connector).

## Designing Abstractions

| Principle | Example |
|-----------|---------|
| Expose intent, hide mechanics | `size: medium`, `tier: critical` instead of instance types and IOPS |
| Secure and compliant by default | Encryption, backups, private networking, tagging always on; no flag to disable |
| Escape hatches with ownership | Allow overrides through an explicit, reviewed field or a different composition |
| Versioned APIs | `v1alpha1` to `v1` with conversion; deprecation policy communicated |
| Status and outputs | Ready conditions, endpoints and secret references on the resource |
| Leaky abstractions are expected | Document what is underneath for debugging |

Avoid building abstractions for one consumer; extract them when the third team needs the same thing.

## Workload Specifications

Platform-agnostic workload descriptions let developers declare what a service needs while the platform decides how:

```yaml
# score.yaml (Score specification)
apiVersion: score.dev/v1b1
metadata:
  name: orders-api
containers:
  api:
    image: ghcr.io/example/orders-api:1.4.0
    variables:
      DATABASE_URL: ${resources.db.uri}
service:
  ports:
    http: {port: 80, targetPort: 8080}
resources:
  db:
    type: postgres
```

Implementations (`score-k8s`, `score-compose`, platform orchestrators) translate the spec into Kubernetes manifests or Compose files and provision the declared resources. Alternatives are opinionated Helm charts or the Open Application Model (KubeVela).

## Policy as Code

| Layer | Tool | Example rule |
|-------|------|--------------|
| CI (pre-merge) | Conftest/OPA, Checkov, Trivy config | Terraform must tag resources; images from approved registries |
| Kubernetes admission | Kyverno, OPA Gatekeeper, ValidatingAdmissionPolicy (CEL, built in) | No privileged pods; resource requests required; owner label required |
| Runtime | Falco, Tetragon | Alert on shell in container |
| Cloud | AWS SCPs, Azure Policy, GCP Org Policy | Region restrictions, encryption required |

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-owner-label
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  validations:
    - expression: "has(object.metadata.labels) && 'owner' in object.metadata.labels"
      message: "deployments must have an 'owner' label"
```

A `ValidatingAdmissionPolicyBinding` activates the policy for selected namespaces. Roll out new policies in audit/warn mode first, publish violations to owners, then enforce.

## Multi-Tenancy Models

| Model | Isolation | Cost | Use |
|-------|-----------|------|-----|
| Namespace per team/app in shared clusters | Soft (RBAC, quotas, network policies) | Lowest | Default for internal teams |
| Virtual clusters (vCluster) | Separate API servers on shared nodes | Medium | Teams needing cluster-admin-like control, CRDs |
| Dedicated clusters | Strong | Highest | Regulated workloads, very different requirements |

Namespace tenancy baseline: `ResourceQuota`, `LimitRange`, default-deny `NetworkPolicy`, Pod Security Admission `restricted`, per-tenant RBAC groups from the identity provider, and cost allocation labels. Hierarchical namespace tooling or Capsule can manage tenant groups.

## Ephemeral Environments

- Preview environment per pull request: namespace (or vCluster) created by the pipeline or Argo CD ApplicationSet pull-request generator, seeded test data, URL posted on the PR, destroyed on merge or TTL.
- Share expensive dependencies (databases with per-PR schemas, shared message brokers with prefixed topics) where full isolation is unnecessary.
- Enforce TTL and quotas to control cost.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: orders-previews
spec:
  generators:
    - pullRequest:
        github:
          owner: example
          repo: orders-api
        requeueAfterSeconds: 300
  template:
    metadata:
      name: "orders-pr-{{number}}"
    spec:
      project: previews
      source:
        repoURL: https://github.com/example/orders-api
        targetRevision: "{{head_sha}}"
        path: deploy/preview
      destination:
        server: https://kubernetes.default.svc
        namespace: "orders-pr-{{number}}"
      syncPolicy:
        automated: {prune: true}
        syncOptions: ["CreateNamespace=true"]
```

## Platform APIs and Extensibility

- Every portal action should have an API or Git-based equivalent for automation.
- Publish platform capabilities as versioned APIs (Kubernetes CRDs, REST, Terraform modules) with changelogs.
- Allow contribution: inner-source model for templates and modules with review by the platform team.

## Platform Reliability

The platform is production infrastructure for every team; outages block all deployments.

| Component | SLO example |
|-----------|-------------|
| CI system | Pipeline start latency and success rate excluding test failures |
| GitOps controllers | Time from commit to synced |
| Provisioning (Crossplane/Terraform automation) | Time to ready; success rate |
| Portal | Availability |
| Shared clusters | API server availability; node provisioning time |

Practices: on-call for platform components, change management with canaries for shared controllers and policies, disaster recovery for control plane clusters (etcd backups, GitOps re-bootstrap), and upgrade cadence for Kubernetes and add-ons with compatibility testing.

## Scaling the Platform Organization

- Split platform teams by capability (delivery, runtime, data, developer experience) once one team cannot own everything.
- Product managers for the platform with a public roadmap.
- Deprecation policy for old paths, with migration tooling rather than mandates alone.

## Checklist

- [ ] Infrastructure requests are declarative, reconciled and status-reporting
- [ ] Abstractions express intent, are secure by default and versioned
- [ ] Policies enforced at CI, admission and cloud layers, rolled out audit-first
- [ ] Tenancy model chosen with quotas, network policies and pod security
- [ ] Preview environments with TTL and cost controls
- [ ] Platform components have SLOs, on-call and DR
- [ ] Every capability available via API or Git, not only the portal
