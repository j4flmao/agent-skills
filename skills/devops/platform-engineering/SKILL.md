---
name: devops-platform-engineering
description: >
  Use when the user asks about platform engineering, Internal Developer Platform (IDP), Backstage, developer portals, golden paths, developer self-service, platform teams, or internal developer tooling. Do NOT use for: CI/CD pipeline setup (cicd-pipeline), Kubernetes cluster setup (kubernetes-patterns), or general DevOps automation (devops-terraform/ansible).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, platform-engineering, phase-3]
---

# Platform Engineering

## Purpose
Design and build Internal Developer Platforms (IDP) that accelerate developer velocity through self-service capabilities, golden paths, and standardized infrastructure.

## Agent Protocol

### Trigger
Exact user phrases: "platform engineering", "internal developer platform", "IDP", "Backstage", "developer portal", "golden path", "developer self-service", "platform team", "inner source", "developer experience", "DX platform".

### Input Context
- Existing CI/CD tooling (GitHub Actions, Jenkins, GitLab CI)
- Container orchestration platform (Kubernetes, Nomad, ECS)
- Cloud provider (AWS, Azure, GCP)
- Developer count and team structure
- Current pain points (waiting for infra, inconsistent tooling, no self-service)

### Output Artifact
- IDP architecture document
- Golden path templates
- Backstage configuration
- Platform adoption roadmap
- Service catalog structure

### Response Format
Markdown with architecture diagrams (ASCII), decision tables, and configuration examples.

### Completion Criteria
- [ ] Current state assessed (tools, teams, pain points)
- [ ] IDP architecture designed (portal, orchestrator, integrations)
- [ ] Golden paths defined for common developer workflows
- [ ] Adoption roadmap with phased rollout
- [ ] Backstage or alternative configured for service catalog

### Max Response Length
Unlimited for architecture design. 50 lines for configuration snippets.

## Decision Tree: IDP Platform Components
- Developer portal needed → Backstage (open source, extensible), Port (SaaS, low-code), or custom
- Infrastructure orchestration → Crossplane (Kubernetes-native), Terraform/Pulumi (stateful), or custom
- Service catalog → Backstage catalog (YAML/API registration), automated ingestion from K8s/CI/CD
- Software templates → Backstage scaffolder (React + JavaScript), custom API, Cookiecutter
- Policy enforcement → OPA/Gatekeeper, Kyverno, or custom validation webhooks
- Docs platform → Backstage TechDocs (MkDocs), GitBook, Confluence API

## Workflow

### Step 1: Assess Current State
| Area | Questions |
|------|-----------|
| CI/CD | What pipeline tool? How long to add a new service? |
| Infra | Self-service or ticket-based? Cloud or on-prem? |
| Discovery | How do devs find APIs, docs, service ownership? |
| Standards | Are there golden paths? Enforced or optional? |

### Step 2: Design IDP Architecture
```
Developer Portal (Backstage/Port/Deploy)
  ├── Service Catalog — all services, ownership, docs, APIs
  ├── Software Templates — scaffold new services with golden paths
  ├── Tech Docs — centralized documentation with MkDocs
  └── Plugin Ecosystem — CI/CD visibility, cost, security, testing
        │
Orchestrator (Terraform/Pulumi/Crossplane)
  ├── Infrastructure — Kubernetes, databases, queues, storage
  ├── CI/CD Pipelines — GitHub Actions, ArgoCD, Jenkins
  └── Policy Engine — OPA/Kyverno for guardrails
```

### Step 3: Define Golden Paths
| Path | What It Produces | Tech Stack |
|------|-----------------|------------|
| New microservice | Repo + CI/CD + K8s manifests + monitoring | Backstage template |
| New frontend app | Repo + CI/CD + CDN config + analytics | Backstage template |
| New data pipeline | Repo + CI/CD + Airflow DAG + schema | Backstage template |
| Add database | Terraform module + secrets + connection string | Self-service action |

### Step 4: Build Service Catalog
- All services registered with metadata (owner, language, SLAs, docs)
- Automated discovery (ingest from Kubernetes, Terraform, CI/CD)
- Linked to monitoring, cost, security, and testing data

### Step 5: Backstage Configuration — Catalog
```yaml
# app-config.yaml
catalog:
  rules:
  - allow: [Component, API, Resource, Group, User, System, Domain]
  providers:
    kubernetes:
      schedule:
        frequency: { minutes: 5 }
        timeout: { seconds: 90 }
    terraform:
      schedule:
        frequency: { minutes: 15 }
        timeout: { minutes: 2 }
      resources:
      - group: '.*'
        type: '.*'
        stacks: ['production']

kubernetes:
  serviceLocatorMethod:
    type: 'multiTenant'
  clusterLocatorMethods:
  - type: 'config'
    clusters:
    - name: production
      url: https://prod-cluster.example.com
      authProvider: serviceAccount
      skipTLSVerify: false
      dashboardUrl: https://k8s-dashboard.example.com
```

### Step 6: Backstage Software Template
```yaml
apiVersion: backstage.io/v1beta1
kind: Template
metadata:
  name: microservice-template
  title: New Microservice
  description: Scaffold a new microservice with CI/CD, K8s, and monitoring
spec:
  owner: platform-team
  type: service
  parameters:
  - title: Service Details
    properties:
      serviceName:
        title: Service Name
        type: string
        pattern: '^[a-z0-9-]+$'
      description:
        title: Description
        type: string
      language:
        title: Language
        type: string
        enum: [typescript, python, go, java]
      owner:
        title: Team
        type: string
        ui:field: OwnerPicker
        ui:options:
          allowedKinds: [Group]
  - title: Infrastructure
    properties:
      databaseRequired:
        title: Database Required?
        type: boolean
        default: false
      cacheRequired:
        title: Cache Required?
        type: boolean
        default: false
  steps:
  - id: fetch-base
    name: Fetch Base Template
    action: fetch:template
    input:
      url: ./skeletons/microservice
      values:
        serviceName: ${{ parameters.serviceName }}
        language: ${{ parameters.language }}
        owner: ${{ parameters.owner }}
  - id: create-repo
    name: Create Repository
    action: publish:github
    input:
      repoUrl: github.com?owner=myorg&repo=${{ parameters.serviceName }}
      defaultBranch: main
  - id: register-catalog
    name: Register in Catalog
    action: catalog:register
    input:
      repoContentsUrl: ${{ steps['create-repo'].output.repoContentsUrl }}
      catalogInfoPath: /catalog-info.yaml
  - id: provision-infra
    name: Provision Infrastructure
    action: custom:provision-infra
    if: ${{ parameters.databaseRequired }}
    input:
      serviceName: ${{ parameters.serviceName }}
      environment: production
      resources:
      - type: postgres
        size: small
  output:
    links:
    - title: Repository
      url: ${{ steps['create-repo'].output.remoteUrl }}
    - title: Open in Catalog
      ui:redirect: /catalog/default/component/${{ parameters.serviceName }}
```

### Step 7: Backstage Custom Action (TypeScript)
```typescript
import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';

export const provisionDatabaseAction = createTemplateAction<{
  serviceName: string;
  environment: string;
  engine: string;
}>({
  id: 'custom:provision-database',
  description: 'Provisions a database instance for a service',
  schema: {
    input: {
      type: 'object',
      properties: {
        serviceName: { type: 'string' },
        environment: { type: 'string' },
        engine: { type: 'string', enum: ['postgres', 'mysql', 'redis'] },
      },
    },
  },
  async handler(ctx) {
    ctx.logger.info(`Provisioning ${ctx.input.engine} for ${ctx.input.serviceName}`);
    // Call Terraform Cloud API or Crossplane to provision
    const result = await provisionDatabase({
      name: `${ctx.input.serviceName}-${ctx.input.environment}`,
      engine: ctx.input.engine,
    });
    ctx.output('connectionString', result.connectionString);
    ctx.output('databaseHost', result.host);
  },
});
```

### Step 8: Golden Path Content — New Microservice
```
service-name/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint, test, build, scan
│       └── cd.yml              # Deploy to staging/prod
├── src/
│   ├── index.ts                # Entry point
│   ├── health.ts               # /health/live, /health/ready, /health/startup
│   └── routes/
│       └── api.ts              # API route handler
├── k8s/
│   ├── deployment.yaml         # Production deployment manifest
│   ├── service.yaml            # Service manifest
│   ├── ingress.yaml            # Ingress with TLS
│   ├── hpa.yaml                # HPA config
│   └── kustomization.yaml      # Kustomize overlay
├── config/
│   ├── staging.yaml
│   └── production.yaml
├── Dockerfile
├── package.json
├── tsconfig.json
├── catalog-info.yaml           # Backstage catalog registration
└── mkdocs.yml                  # TechDocs documentation
```

### Step 9: Platform Maturity Model
```yaml
platform_maturity:
  level_0_no_platform:
    description: "Every team manages their own infrastructure manually"
    characteristics:
      - "Ticket-based infrastructure requests"
      - "No standardized tooling"
      - "Each team reinvents CI/CD, monitoring, deployment"
      - "No service catalog or discovery"
    dev_experience: "Slow — days to provision resources, weeks to add new service"

  level_1_automated_infrastructure:
    description: "Infrastructure automation exists but is team-specific"
    characteristics:
      - "IaC adopted but per-team implementations"
      - "CI/CD pipelines per project"
      - "Basic monitoring and alerting"
      - "Shared credentials management"
    dev_experience: "Better — hours to provision, but inconsistent across teams"

  level_2_platform_emerges:
    description: "Dedicated platform team forms, shared tooling emerges"
    characteristics:
      - "Platform team owns CI/CD, monitoring, shared IaC modules"
      - "Golden paths for 2-3 common service types"
      - "Service catalog with basic metadata"
      - "Standardized container images and base configurations"
    dev_experience: "Good — minutes to provision, consistent tooling across teams"

  level_3_internal_developer_platform:
    description: "Self-service IDP with developer portal"
    characteristics:
      - "Developer portal (Backstage/Port) with service catalog"
      - "Software templates for all common service types"
      - "Self-service infrastructure actions (databases, queues, caches)"
      - "Automated cost tagging and showback"
      - "Policy as code with automated guardrails"
    dev_experience: "Excellent — minutes to scaffold service, click to provision infra"

  level_4_platform_ecosystem:
    description: "Platform is a product with inner source contributions"
    characteristics:
      - "Platform as a product — roadmap, feedback loops, SLAs"
      - "Inner source — teams contribute to platform components"
      - "Dynamic golden paths updated based on usage patterns"
      - "Cross-platform orchestration (multi-cloud, hybrid)"
      - "Automated compliance and security posturing"
    dev_experience: "Exceptional — platform anticipates needs, teams focus on business logic"
```

### Step 10: Platform Team Models
| Model | Structure | Best For |
|-------|-----------|----------|
| **Platform as a service** | Dedicated team builds and maintains platform | >50 engineers, multiple product teams |
| **Platform as a product** | Platform team with product manager, roadmap, and SLAs | >100 engineers, formal adoption |
| **Federated platform** | Platform core + embedded platform champions | Large org, diverse tech stacks |
| **Platform enablement** | Platform team enables teams to self-serve, minimal gatekeeping | DevOps-mature org, strong SRE culture |

### Step 11: Adoption KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| Time-to-production for new service | < 1 day | From first PR to production traffic |
| Golden path adoption rate | > 80% | % of new services using golden paths |
| Platform NPS | > 30 | Quarterly developer survey |
| Self-service completion rate | > 90% | % of infra requests via self-service |
| Platform uptime | > 99.9% | Platform components availability |
| On-call burden reduction | 50% | Reduction in OpsGenie alerts per team |

### Step 12: IDP Cost Showback
```yaml
# Backstage cost plugin configuration
costInsights:
  products:
    compute:
      name: Kubernetes Compute
      aggregation: [namespace]
      breakdown: [deployment, service]
    storage:
      name: Cloud Storage
      aggregation: [bucket, volume]
    database:
      name: Managed Databases
      aggregation: [instance]
  currency: USD
  engineerCost: 150000  # Fully loaded annual cost
  alerts:
    - title: Cost Anomaly Detected
      filter:
        product: compute
        metric: cost
        change: 50%  # Alert if cost jumps 50%+
```

## Rules
- Platform must reduce, not increase, cognitive load for developers
- Every golden path must have a clear "exit" for when developers outgrow it
- Platform team is a product team: treat developers as customers
- Measure success by developer velocity, not platform features shipped
- All platform components must have documented SLAs for the platform team
- Adopt incrementally — level 1 before level 2, never skip maturity levels
- Platform features should be optional first, compelling second, default third
- Every golden path must include observability, security, and cost tracking

## Production Considerations
- Backstage needs PostgreSQL and adequate compute for catalog processing.
- Software templates should include CodeQL/Snyk scanning by default.
- Service catalog entities must auto-expire if not refreshed within 30 days.
- Platform SLAs: catalog < 200ms p99, template scaffolding < 30s.
- Monitor golden path adoption rates dashboards weekly.
- Conduct quarterly platform roadmap reviews with developer feedback.
- Implement cost showback early to drive efficient resource usage.

## Anti-Patterns
- Build it and they will come — platform built without developer input, low adoption.
- Forced adoption — teams create shadow platforms as workarounds.
- Platform team as ops bottleneck — every request goes through them, no self-service.
- Over-abstraction — too much hidden, developers can't debug or customize.
- Boiling the ocean — trying to build everything at once, never shipping.
- Not serving your own dogfood — platform team doesn't use the platform.
- Gold-plating — perfecting features for the 10% case, ignoring the 90%.
- No exit strategy — golden paths become golden handcuffs.

## References
  - references/backstage-config.md — Backstage Configuration Guide
  - references/idp-blueprint.md — IDP Architecture Blueprint
  - references/platform-engineering-advanced.md — Platform Engineering Advanced Topics
  - references/platform-engineering-fundamentals.md — Platform Engineering Fundamentals
  - references/platform-patterns.md — Platform Engineering Patterns
  - references/platform-teams.md — Platform Team Models
## Handoff
Related skills: devops-sre-practices (reliability), devops-internal-developer-platform (deep IDP), devops-policy-as-code (guardrails), devops-progressive-delivery (deployment strategies).

## Architecture Decision Trees

### Build vs Buy Internal Developer Platform

| Decision | Build (Backstage/Terraform) | Buy (Humanitec, Port, Cortex) |
|---|---|---|
| Customization | Full (any tech stack) | Vendor's existing integrations |
| Time to value | 6-12 months | 1-3 months |
| Maintenance | Internal team owns | Vendor handles SLAs |
| Cost | Engineering salaries | Per-developer licensing |
| Flexibility | Unlimited (any abstraction) | Limited to platform capabilities |
| Best for | Large eng orgs (>200 devs) | Mid-size teams, rapid adoption |

### Golden Paths vs Freedom of Choice

| Aspect | Golden Paths | Free Choice |
|---|---|---|
| Developer velocity | Fast (opinionated, paved road) | Slower (every team reinvents) |
| Operational burden | Low (standardized platform) | High (N different ways to deploy) |
| Innovation | Standard patterns, consistent | Teams experiment freely |
| Onboarding | Quick (one way to do things) | Steep (learn team's choices) |
| Security | Centralized guardrails | Per-team security decisions |

## Implementation Patterns

### Backstage Entity Descriptor (YAML)

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Payment processing service
  annotations:
    github.com/project-slug: acme/payment-service
    backstage.io/techdocs-ref: dir:.
    pagerduty.com/service-id: PXXXXX
  tags:
    - java
    - spring-boot
    - mission-critical
spec:
  type: service
  lifecycle: production
  owner: team-finance
  system: payment-platform
  dependsOn:
    - component:default/database
    - resource:default/kafka-cluster
  providesApis:
    - payment-api
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: payment-api
  description: Payment REST API
spec:
  type: openapi
  lifecycle: production
  owner: team-finance
  definition:
    $text: https://github.com/acme/payment-service/blob/main/openapi.yaml
```

### Terraform: Platform Resource Abstraction

```hcl
module "microservice" {
  source = "github.com/acme/terraform-platform-modules//microservice"

  service_name = "payment-service"
  environment  = "production"
  team         = "team-finance"

  container_port = 8080
  cpu            = "1"
  memory         = "2Gi"
  replicas       = { min = 2, max = 10 }

  database = {
    engine  = "postgres"
    version = "15"
    size    = "db.t3.medium"
    storage = 100
  }

  observability = {
    log_level     = "info"
    tracing       = true
    alert_slack   = "#alerts-finance"
    pagerduty     = "PXXXXX"
  }
}
```

## Production Considerations (Platform View)

- Define **service level objectives (SLOs)** for platform API availability and latency
- Implement **self-service catalog** so developers can provision resources without a ticket
- Publish **platform maturity model** to communicate which features are stable, beta, or deprecated
- Collect **developer satisfaction metrics** (DORA, SPACE, quarterly surveys) to guide investments
- Run **migration weeks** to move teams from old patterns to new platform abstractions
- Establish **platform SLAs**: for onboarding (24h), for incident response (15m critical)
- Maintain **platform changelog** and deprecation policy with 3-month notice period

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.