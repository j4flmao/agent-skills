# Internal Developer Platform Fundamentals

An Internal Developer Platform (IDP) is the set of self-service capabilities, tools and paved workflows a platform team provides so application teams can build, deploy and operate software without filing tickets. This reference covers the core concepts, building blocks, reference architecture, team model and how to measure success. Backstage specifics are in `backstage-plugins.md`; golden paths in `golden-paths.md`.

## Key Terms

| Term | Meaning |
|------|---------|
| Internal Developer Platform | The whole platform: APIs, automation, infrastructure abstractions, workflows |
| Internal Developer Portal | The UI/catalog front door to the platform (e.g. Backstage, Port, Cortex); one interface among several (CLI, API, Git) |
| Golden path (paved road) | Opinionated, supported way to do a common task (new service, new database) that is easy by default but not mandatory |
| Platform as a product | Platform team treats developers as customers: roadmap, research, adoption metrics |
| Thinnest viable platform | Smallest set of capabilities that removes the biggest friction; grow from there |
| Cognitive load | Mental effort a stream-aligned team spends on non-domain concerns; the platform should reduce it |

## Capability Map

| Capability | Typical implementation |
|------------|------------------------|
| Service catalog and ownership | Backstage catalog (`catalog-info.yaml`), ownership via teams/groups |
| Project scaffolding | Software templates / cookiecutter with CI, observability and security baked in |
| Source control and CI | GitHub/GitLab, reusable pipelines |
| Delivery / deployment | GitOps (Argo CD, Flux), progressive delivery |
| Infrastructure provisioning | Terraform/OpenTofu modules, Crossplane, Pulumi, behind self-service APIs |
| Environments | Shared dev/staging, ephemeral preview environments |
| Secrets and identity | Vault/cloud secret managers, workload identity, SSO |
| Observability | OpenTelemetry, dashboards and alerts provisioned per service |
| Security and compliance | Policy as code (OPA/Kyverno), scanning in pipelines, SBOMs |
| Documentation | TechDocs (docs-as-code) next to the code |
| Developer experience metrics | DORA, surveys, portal analytics |

## Reference Architecture (Planes)

```
Developer control plane : portal, CLI, Git repos (app + config), templates
Integration & delivery  : CI pipelines, artifact registry, CD/GitOps controllers
Resource plane          : Kubernetes clusters, databases, queues, cloud accounts
Monitoring & logging    : metrics, logs, traces, alerts
Security plane          : identity, secrets, policy enforcement, scanning
Platform orchestration  : APIs/controllers translating developer intent into resources
```

Developers express intent (a workload needs Postgres and a public route); the platform resolves it to concrete resources per environment.

## Interfaces: Meet Developers Where They Work

- **Git**: declarative files in the repo (`catalog-info.yaml`, workload spec, Helm values) reviewed via PRs.
- **Portal**: discovery, templates, scorecards, docs.
- **CLI/API**: automation and power users.
- **ChatOps** optional for common operations.

Every portal action should map to an API or Git change so it is auditable and automatable.

## Team Model

- Platform team as a Team Topologies platform team: provides X-as-a-Service to stream-aligned teams.
- Enabling team or platform advocates help teams adopt golden paths.
- Interaction modes: collaboration (discovering a new capability with a pilot team), X-as-a-Service (steady state), facilitating (coaching).
- Product manager role for the platform: prioritise by developer pain, not by tool novelty.

## Starting an IDP

1. **Discover**: interview teams, map the path from idea to production, measure lead time and wait states (tickets, approvals).
2. **Pick the top friction** (often new-service setup, environment provisioning, or deploy pipelines).
3. **Build a golden path** for it with one or two pilot teams.
4. **Catalog** existing services and owners early; ownership data powers everything else.
5. **Iterate**: add capabilities based on measured pain; deprecate bespoke paths gradually.

## Minimal Catalog Entry (Backstage)

```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payments-api
  description: Payment authorization and capture API
  annotations:
    github.com/project-slug: acme/payments-api
    backstage.io/techdocs-ref: dir:.
  tags: [java, grpc]
spec:
  type: service
  lifecycle: production
  owner: group:payments
  system: payments
  providesApis: [payments-grpc]
  dependsOn: [resource:payments-db]
```

## Measuring Success

| Category | Metrics |
|----------|---------|
| Delivery (DORA) | Deployment frequency, change lead time, change failure rate, failed deployment recovery time |
| Adoption | Share of services on golden paths, template usage, active portal users |
| Developer experience | Survey scores (e.g. SPACE/DevEx frameworks), time to first deploy for new hires, time to create a new service |
| Operations | Tickets to platform team per month, self-service success rate |
| Quality | Scorecard compliance (ownership, docs, alerts, security checks) |

Baseline before building; report trends, not one-off numbers.

## Common Mistakes

| Mistake | Better |
|---------|--------|
| Starting with the portal UI | Start with the workflow and APIs; portal later surfaces them |
| Mandating the platform before it is better | Make the golden path the easiest path; earn adoption |
| Building everything in-house | Compose open-source and managed services; build glue |
| Hiding all infrastructure | Abstract common cases, keep escape hatches for advanced teams |
| No ownership data | Catalog with owners from day one |
| Measuring only usage | Measure outcomes (lead time, cognitive load) |

## Checklist

- [ ] Developer journeys mapped and top friction points ranked
- [ ] Platform product owner and roadmap
- [ ] Service catalog with owners and lifecycle
- [ ] At least one golden path end to end (scaffold, CI, deploy, observe)
- [ ] Every portal action backed by API/Git
- [ ] Baseline DORA and DevEx metrics recorded
