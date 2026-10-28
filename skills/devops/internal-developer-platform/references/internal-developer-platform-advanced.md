# Internal Developer Platform: Advanced Topics

Advanced design topics for mature platforms: platform orchestration and workload specifications, environment management including ephemeral environments, multi-tenancy, guardrails with policy as code, Backstage at scale (new backend system, permissions, catalog performance), platform APIs, and versioning golden paths. Fundamentals are in `internal-developer-platform-fundamentals.md`.

## Platform Orchestration

Developers should describe **what** a workload needs; the platform decides **how** per environment.

| Approach | Tooling examples | Notes |
|----------|------------------|-------|
| Workload spec + orchestrator | Score spec (`score.yaml`) with score-k8s/score-compose, Humanitec Platform Orchestrator | Environment-agnostic workload definition, resources resolved by drivers |
| Kubernetes-native composition | Crossplane XRDs/Compositions, KRO (Kube Resource Orchestrator) | Platform APIs as CRDs; GitOps-friendly |
| Promise-based framework | Kratix | Platform "promises" fulfilled by pipelines across clusters |
| Template-only | Backstage scaffolder + Terraform modules | Simple start; drift after day 1 unless templates stay updatable |

### Score Example

```yaml
# score.yaml
apiVersion: score.dev/v1b1
metadata:
  name: orders-api
containers:
  main:
    image: .
    variables:
      DB_URL: postgres://${resources.db.username}:${resources.db.password}@${resources.db.host}:${resources.db.port}/${resources.db.name}
service:
  ports:
    http: { port: 80, targetPort: 8080 }
resources:
  db:
    type: postgres
  route:
    type: route
    params: { host: orders.example.com, path: /, port: 80 }
```

The same file renders to Docker Compose locally (`score-compose`) and Kubernetes manifests in clusters (`score-k8s`), with platform-defined provisioners mapping `type: postgres` to a container locally and a managed database in production.

### Platform API with Crossplane (v2)

```yaml
apiVersion: platform.acme.io/v1alpha1
kind: Database
metadata:
  name: orders-db
  namespace: team-orders
spec:
  engine: postgres
  size: small
```

The XRD defines allowed parameters (size enum, engine versions); compositions encode the organisation's defaults (encryption, backups, network, tags). See the `crossplane` skill for composition details.

## Environment Management

| Environment type | Purpose | Implementation notes |
|------------------|---------|----------------------|
| Local | Inner loop | Compose/Score, Tilt, Skaffold, dev containers |
| Ephemeral preview (per PR) | Review and integration tests | Namespaces or vclusters per PR, seeded data, TTL cleanup |
| Shared dev/staging | Integration with other teams | Stable versions of dependencies |
| Production | Customers | Strict policies, progressive delivery |

Ephemeral environment rules:
- Create on PR open, destroy on merge/close and after a TTL.
- Use lightweight dependencies (shared database server with per-environment schemas, or mocked external services) to control cost.
- Seed deterministic test data; never copy production PII.
- Track cost per environment and enforce quotas.

## Multi-Tenancy

| Model | Isolation | Trade-off |
|-------|-----------|-----------|
| Namespace per team/app | Soft (RBAC, NetworkPolicy, ResourceQuota, Pod Security Admission) | Cheap; shared control plane and node risks |
| Virtual clusters (vcluster) | Separate API server per tenant on shared nodes | Tenants can install CRDs; more overhead |
| Cluster per team/environment | Strong | Higher cost; fleet management needed |
| Cloud account/project per team | Strong blast-radius isolation | Requires landing zone automation |

Baseline per tenant: RBAC bound to team groups from the IdP, default-deny NetworkPolicies, quotas and limit ranges, separate secrets scopes, cost labels.

## Guardrails: Policy as Code

- Admission control: Kyverno or OPA Gatekeeper (or Kubernetes ValidatingAdmissionPolicy with CEL) to enforce required labels, image registries, resource limits, no privileged pods.
- IaC checks before apply: Conftest/OPA, Checkov, tfsec-style rules in pipelines.
- Prefer **mutating defaults** (add labels, default resources) and clear error messages over silent rejection.
- Run policies in audit mode first, measure violations, then enforce.

## Backstage at Scale

- **New backend system**: plugins and modules are installed with `backend.add(import('@backstage/plugin-...'))`; the legacy backend system is deprecated. Migrate custom plugins to `createBackendPlugin`/`createBackendModule`.
- **Frontend**: the new frontend system (extensions, blueprints) is progressing; check plugin compatibility before migrating.
- **Catalog performance**: prefer entity providers (pull from GitHub org discovery, cloud APIs, IdP) over thousands of manually registered locations; tune processing intervals; run multiple backend replicas with a shared Postgres.
- **Permissions framework**: define policies (`PermissionPolicy`) to restrict template execution, entity visibility and actions by ownership or group; enable it before opening the portal widely.
- **Scaffolder**: custom actions for internal APIs; templates call the platform API rather than writing infrastructure directly, so day-2 changes go through the same API.
- **Upgrades**: Backstage releases monthly; use `backstage-cli versions:bump` regularly to avoid painful jumps.

## Day-2 Operations of Golden Paths

Templates create code once; services then drift. Strategies:
- Keep shared logic in versioned libraries, base images, reusable CI workflows and Helm charts, not copied into each repo.
- Use update tooling (Renovate presets, template update tools such as Cruft/Copier for cookiecutter-style templates) to propagate changes.
- Track golden path version per service in the catalog; scorecards flag outdated versions.

## Platform APIs and Versioning

- Version platform APIs (CRD versions, API paths). Support N-1 versions with migration guides and automated migration PRs.
- Publish a changelog and deprecation policy; announce in the portal.
- Treat breaking changes like product changes: pilot with a few teams first.

## Measuring Platform Value

- Cost to serve vs time saved: hours saved per golden path use multiplied by usage.
- Lead time and change failure rate for teams on vs off golden paths (beware selection bias).
- Platform reliability: SLOs for the platform's own APIs, CI and CD (the platform is production for developers).

## Checklist

- [ ] Developer intent captured in a workload spec or platform API, not raw infrastructure
- [ ] Ephemeral environments with TTL, quotas and synthetic data
- [ ] Tenant isolation model chosen and baseline controls automated
- [ ] Policies rolled out audit-first with actionable messages
- [ ] Backstage on the new backend system with permissions enabled
- [ ] Golden path changes propagate to existing services
- [ ] Platform has SLOs, versioned APIs and a deprecation policy
