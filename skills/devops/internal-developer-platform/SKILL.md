---
name: devops-internal-developer-platform
description: >
  Deep dive into IDP design: golden path architecture, platform APIs, Backstage
  plugin development, software templates, tech docs, service catalog design,
  platform adoption, and developer experience measurement. Covers: Scaffolder
  custom actions, catalog entity modeling, Backstage backend plugin development,
  permission framework, techdocs customization, and platform maturity assessment.
  Do NOT use for: surface-level platform engineering overview (platform-engineering),
  CI/CD pipeline tooling (cicd-pipeline), or Kubernetes cluster management.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, internal-developer-platform, backstage, phase-3]
---

# Internal Developer Platform (Deep)

## Purpose
Design and build a production-grade Internal Developer Platform with golden paths, platform APIs, Backstage customization, and adoption measurement. Covers service catalog modeling, software template design, custom plugin development, and platform lifecycle management.

## Agent Protocol

### Trigger
Exact user phrases: "IDP", "internal developer platform", "Backstage", "golden path", "software template", "scaffolder", "Backstage plugin", "catalog entity", "techdocs", "developer portal", "platform adoption", "Backstage backend", "Backstage frontend", "custom action", "Backstage API", "service catalog".

### Input Context
- Team size and structure (number of dev teams, platform team size)
- Existing CI/CD tooling (GitHub Actions, GitLab, Jenkins)
- Infrastructure provider (Kubernetes, cloud, on-prem)
- Developer pain points (onboarding time, env setup, deployment)
- Backstage version and existing plugins (if any)

### Output Artifact
Backstage configuration files, custom plugin code (TypeScript), entity descriptor YAML, template YAML, scaffolder action definitions, and TechDocs config.

### Response Format
YAML entity descriptors, Backstage config YAML, TypeScript plugin code, or template YAML with no extraneous explanation. No preamble. No postamble.

### Completion Criteria
- [ ] Service catalog modeled with entities, relationships, and APIs
- [ ] Software templates created for 3+ common service types
- [ ] Custom scaffolder actions implemented (if needed)
- [ ] TechDocs configured with MkDocs
- [ ] Plugin backend/frontend customized if needed
- [ ] Adoption metrics defined and measurable

## Architecture / Decision Trees

### IDP Platform Decision Tree
```
Developer count?
  < 20 → Backstage (open-source, most flexible) or Port (SaaS, faster setup)
  20-100 → Backstage (full control, plugin ecosystem)
  100+ → Backstage (scalable, enterprise features)

Existing tooling?
  GitHub → Backstage (excellent GitHub integration)
  GitLab → Backstage (GitLab plugin mature)
  Jenkins → Backstage (community plugin, or custom)

Platform team size?
  1-2 → Port/Cortex (less maintenance overhead)
  3-5 → Backstage (can handle operations)
  5+ → Backstage (can build custom plugins)

Time to value?
  Weeks → Port/Cortex (SaaS, no infra)
  Months → Backstage (setup + customization)
```

### Catalog Entity Modeling Strategy

```yaml
# Component — the basic building block
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: order-service
  description: Order management microservice
  tags:
    - java
    - spring-boot
    - kafka
  annotations:
    github.com/project-slug: org/order-service
    backstage.io/techdocs-ref: dir:.
spec:
  type: service
  lifecycle: production
  owner: team-orders
  system: ecommerce-platform
  dependsOn:
    - Component:payment-gateway
    - Resource:orders-database
  providesApis:
    - order-api

# System — a group of components
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: ecommerce-platform
  description: E-commerce platform system
spec:
  owner: team-platform
  domain: sales

# Domain — top-level business capability
apiVersion: backstage.io/v1alpha1
kind: Domain
metadata:
  name: sales
  description: Sales and order management
spec:
  owner: business-unit-retail

# API — service interface definition
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: order-api
  description: Order management REST API
spec:
  type: openapi
  lifecycle: production
  owner: team-orders
  system: ecommerce-platform
  definition:
    $text: https://api.example.com/openapi.yaml

# Resource — infrastructure dependencies
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: orders-database
  description: PostgreSQL for order data
spec:
  type: database
  owner: team-platform
  system: ecommerce-platform
```

### Entity Relationship Diagram
```
Domain (sales)
  └── System (ecommerce-platform)
        ├── Component (order-service) ── API (order-api)
        ├── Component (payment-service) ── Resource (payment-gateway)
        ├── Component (inventory-service)
        ├── Resource (orders-database)
        └── Resource (redis-cache)
```

## Core Workflow

### Step 1: Catalog Setup and Ingestion

```yaml
# app-config.yaml — catalog configuration
catalog:
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchName: backstage-integration
  rules:
    - allow: [Component, System, API, Resource, Domain, Group, User, Template]
  locations:
    - type: url
      target: https://github.com/org/service-catalog/blob/main/catalog-info.yaml
      rules:
        - allow: [System, Domain, Resource, API]
    - type: url
      target: https://github.com/org/order-service/blob/main/catalog-info.yaml
    - type: url
      target: https://github.com/org/payment-service/blob/main/catalog-info.yaml
    # GitHub discovery — automatically ingest all repos with catalog-info.yaml
    - type: discovery
      target: https://github.com/org-entities
      rules:
        - allow: [Component]
```

### Step 2: Software Templates

```yaml
# templates/new-microservice/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: new-microservice
  title: New Microservice
  description: Create a new microservice with CI/CD, K8s, and monitoring
  tags:
    - microservice
    - spring-boot
    - kubernetes
spec:
  owner: team-platform
  type: service

  parameters:
    - title: Service Details
      required:
        - serviceName
        - description
        - owner
      properties:
        serviceName:
          title: Service Name
          type: string
          pattern: '^[a-z0-9-]+$'
          ui:autofocus: true
        description:
          title: Description
          type: string
        owner:
          title: Owner
          type: string
          ui:field: OwnerPicker
          ui:options:
            allowedKinds: [Group]
        language:
          title: Language
          type: string
          default: java
          enum:
            - java
            - typescript
            - python
            - go
        database:
          title: Database
          type: string
          enum:
            - postgresql
            - mysql
            - none

    - title: Infrastructure
      properties:
        k8sNamespace:
          title: Kubernetes Namespace
          type: string
        replicas:
          title: Initial Replicas
          type: integer
          default: 2

  steps:
    - id: fetch-template
      name: Fetch Template
      action: fetch:template
      input:
        url: ./skeleton
        copyToTemplatedDir: true
        values:
          serviceName: ${{ parameters.serviceName }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}
          language: ${{ parameters.language }}
          database: ${{ parameters.database }}
          k8sNamespace: ${{ parameters.k8sNamespace }}
          replicas: ${{ parameters.replicas }}

    - id: publish
      name: Publish to GitHub
      action: publish:github
      input:
        repoUrl: github.com?owner=org&repo=${{ parameters.serviceName }}
        defaultBranch: main
        repoVisibility: private

    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml

    - id: create-ci
      name: Create CI Pipeline
      action: github:actions:create
      input:
        repoUrl: github.com?owner=org&repo=${{ parameters.serviceName }}
        workflowFilename: ci.yml
        workflowBody: |
          name: CI
          on: [push, pull_request]
          jobs:
            build:
              runs-on: ubuntu-latest
              steps:
                - uses: actions/checkout@v4
                - name: Build
                  run: make build
                - name: Test
                  run: make test

  output:
    links:
      - title: Repository
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Open in Catalog
        icon: catalog
        entityRef: ${{ steps.register.output.entityRef }}
```

### Step 3: Custom Scaffolder Action

```typescript
// packages/backend/src/plugins/scaffolder/actions/custom/setupMonitoring.ts
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { JsonObject } from '@backstage/types';
import { Config } from '@backstage/config';

export function createSetupMonitoringAction(options: { config: Config }) {
  const { config } = options;

  return createTemplateAction<JsonObject>({
    id: 'platform:setup-monitoring',
    description: 'Creates Grafana dashboard + Prometheus alerts for a service',
    schema: {
      input: {
        required: ['serviceName', 'namespace'],
        type: 'object',
        properties: {
          serviceName: { title: 'Service Name', type: 'string' },
          namespace: { title: 'Kubernetes Namespace', type: 'string' },
          sloTarget: { title: 'SLO Target (%)', type: 'number', default: 99.9 },
        },
      },
    },

    async handler(ctx) {
      const { serviceName, namespace, sloTarget } = ctx.input;

      ctx.logger.info(`Creating monitoring for ${serviceName}`);

      // Create Grafana dashboard via API
      const grafanaUrl = config.getString('grafana.url');
      const dashboardPayload = {
        title: `${serviceName} - Service Overview`,
        tags: ['backstage', 'generated', namespace as string],
        panels: [
          {
            title: 'Request Rate',
            targets: [{ expr: `sum(rate(http_requests_total{service="${serviceName}"}[5m]))` }],
          },
          {
            title: 'Error Rate',
            targets: [{ expr: `sum(rate(http_requests_total{service="${serviceName}",status=~"5.."}[5m]))` }],
          },
          {
            title: 'P99 Latency',
            targets: [{ expr: `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="${serviceName}"}[5m]))` }],
          },
        ],
      };

      // In production, use Grafana API client
      ctx.logger.info(`Dashboard payload prepared: ${JSON.stringify(dashboardPayload)}`);

      // Calculate error budget
      const errorBudget = 100 - (sloTarget as number);
      ctx.logger.info(`Error budget: ${errorBudget}% (${(sloTarget as number)}% SLO)`);

      ctx.output('dashboardUrl', `${grafanaUrl}/d/${serviceName}`);
      ctx.output('errorBudget', String(errorBudget));
    },
  });
}
```

### Step 4: TechDocs Configuration

```yaml
# mkdocs.yml — per-service documentation
site_name: Order Service
site_description: Order management microservice documentation
repo_url: https://github.com/org/order-service
edit_uri: edit/main/docs/

nav:
  - Overview: index.md
  - Architecture: architecture.md
  - API Reference: api.md
  - Deployment: deployment.md
  - Runbooks: runbooks/
    - Incident Response: runbooks/incidents.md
    - Scaling: runbooks/scaling.md
  - Development: development.md

plugins:
  - techdocs-core
  - mkdocs-monorepo-plugin

markdown_extensions:
  - admonition
  - codehilite
  - pymdownx.superfences
  - pymdownx.tabbed
  - pymdownx.details
```

```yaml
# app-config.yaml — TechDocs configuration
techdocs:
  builder: local  # Use 'external' for production (cloud build)
  generators:
    techdocs: mkdocs
  publisher:
    type: awsS3  # Or googleGcs, azureBlobStorage, openStackSwift
    awsS3:
      bucketName: backstage-techdocs-catalog
      bucketRootPath: /
      region: us-east-1
      s3ForcePathStyle: false
```

### Step 5: Backstage Plugin Architecture

```
packages/
  app/                        — Frontend app package
  backend/                    — Backend package
  plugins/
    custom-scaffolder-actions/ — Custom action implementations
    team-health-dashboard/     — Custom frontend plugin
    compliance-viewer/        — Custom backend + frontend plugin

Plugin categories:
  Catalog plugins:
    - @backstage/plugin-catalog (core)
    - @backstage/plugin-catalog-import (bulk import)
    - @backstage/plugin-catalog-graph (dependency graph)

  Scaffolder plugins:
    - @backstage/plugin-scaffolder (core)
    - @backstage/plugin-scaffolder-backend-module-github
    - @backstage/plugin-scaffolder-backend-module-gitlab

  Observability plugins:
    - @backstage/plugin-tech-insights (scorecards)
    - @backstage/plugin-cost-insights (cost tracking)
    - @backstage/plugin-dynatrace
    - @backstage/plugin-sentry

  Infrastructure plugins:
    - @backstage/plugin-kubernetes
    - @backstage/plugin-terraform
    - @backstage/plugin-pagerduty
    - @backstage/plugin-jenkins
```

### Step 6: Permission Framework

```typescript
// packages/backend/src/plugins/permission.ts
import { createPermissionIntegrationRouter } from '@backstage/plugin-permission-node';
import { createConditionFactory } from '@backstage/plugin-permission-node';

// Define custom permissions
export const templateExecutePermission = createPermission({
  name: 'scaffolder.template.execute',
  attributes: { action: 'create' },
});

export const catalogEntityDeletePermission = createPermission({
  name: 'catalog.entity.delete',
  attributes: { action: 'delete' },
});

// Condition factories for fine-grained access
export const catalogEntityConditionFactory = createConditionFactory({
  type: 'catalog-entity-condition',
  name: 'isOwner',
  description: 'Allow only entity owners',
  params: { owner: { type: 'string' } },
});

// Permission policy
class PlatformPermissionPolicy implements PermissionPolicy {
  async handle(request: PolicyQuery): Promise<PolicyDecision> {
    if (request.permission.name === 'scaffolder.template.execute') {
      // Only platform engineers can execute templates
      return {
        result: isPlatformEngineer(request.identity)
          ? AuthorizeResult.ALLOW
          : AuthorizeResult.DENY,
      };
    }
    return { result: AuthorizeResult.ALLOW };
  }
}
```

### Step 7: Platform Adoption Measurement

```
KPI Dashboard:

Adoption KPIs:
  - % of services in catalog: (registered services / total services) * 100
  - Template usage rate: (services created via templates / new services) * 100
  - Time-to-production: template creation → first deploy (target < 1h)
  - Service ownership completeness: % with documented owner
  - Documentation coverage: % with TechDocs published

Quality KPIs:
  - CI/CD passing rate: % of pipeline runs succeeding
  - Deployment frequency: deploys per week per service
  - Incident rate: incidents per service per month
  - Documentation freshness: % of docs updated in last 90 days

Experience KPIs:
  - Developer NPS: quarterly survey (target > 50)
  - Onboarding time: days to first production deployment (target < 3 days)
  - Platform support requests: tickets per platform engineer per week
  - Self-service success rate: % of actions completed without platform team

Cost KPIs:
  - Infrastructure cost per service: monthly spend tracked
  - Platform team cost per developer: platform team cost / total developers
  - Time saved: estimated hours saved via automation per developer per week
```

### Step 8: Platform Maturity Assessment

```yaml
maturity_assessment:
  level_0_ad_hoc:
    characteristics: "Every team manages infra separately, no standards"
    adoption: "< 20%"
    time_to_prod: "Days to weeks"

  level_1_standardized:
    characteristics: "Shared CI/CD templates, basic catalog, documented patterns"
    adoption: "20-50%"
    time_to_prod: "Hours to days"

  level_2_self_service:
    characteristics: "Software templates, automated provisioning, Backstage catalog"
    adoption: "50-80%"
    time_to_prod: "Minutes to hours"

  level_3_platform_product:
    characteristics: "Custom plugins, full automation, inner source, cost showback"
    adoption: "80-95%"
    time_to_prod: "Minutes"
    nps_target: "> 50"

  level_4_autonomous:
    characteristics: "AI-assisted development, automated remediation, predictive scaling"
    adoption: "> 95%"
    time_to_prod: "Sub-minute"
    nps_target: "> 70"
```

## Production Considerations

### Backstage Scaling
```
Database: PostgreSQL (production) — avoid SQLite
  Connection pool: 20-50 connections per backend instance
  Migrations: automated via `backstage-cli migrations:run`

Compute:
  Backend: 2-4 CPU, 4-8GB RAM per instance
  Frontend: 1-2 CPU, 2-4GB RAM (serves static files, minimal compute)
  Min 2 instances for HA

Auth:
  OIDC provider (Okta, Azure AD, Keycloak) — not guest mode
  Token expiration: 1h access, 24h refresh

Caching:
  Redis for session cache and catalog cache
  Tune catalog cache TTL based on update frequency
```

### Security Considerations
```
- Backstage runs with a service account — scope permissions to least privilege
- GitHub tokens: fine-grained PATs with repo-scoped access
- TechDocs S3 bucket: block public access, use presigned URLs
- Secrets stored in external vault (AWS Secrets Manager, Vault)
- API keys rotated automatically via Backstage config reload
- Audit logging for all scaffolder actions
- Rate limiting on scaffolder endpoints (prevent abuse)
- CORS configured to allow only known Backstage domains
- OIDC enforced for all user-facing endpoints
```

### Common Pitfalls

1. **Over-engineering the catalog**: Not every resource needs to be a catalog entity. Start with components and systems.
2. **Templates too rigid**: Golden paths should be 80% standard, 20% flexible. Include escape hatches for advanced users.
3. **No platform team SLAs**: If the platform is unreliable, developers will bypass it. Aim for 99.9% uptime.
4. **Building before listening**: Talk to developers first. Solve their actual pain points, not what the platform team assumes.
5. **Ignoring the inner source loop**: Platform improvements should come from developers, not just the platform team.
6. **Catalog drift**: Entities go out of sync with actual deployments. Use automated ingestion, not manual registration.
7. **Permission model too complex**: Start with simple role-based access, iterate to fine-grained conditions.
8. **Throwing everything in one template**: Create focused templates (microservice, frontend, pipeline, function) rather than monolithic ones.

## Compared With

| Aspect | Backstage (self-hosted) | Port | Cortex | Humanitec |
|--------|------------------------|------|--------|------------|
| Open source | Yes | No | No | No |
| Custom plugins | Full SDK | Limited | Limited | Limited |
| Software templates | Scaffolder | Blueprints | Service catalog only | Workload specs |
| TechDocs | Built-in (MkDocs) | External | External | External |
| Scorecards | Tech Insights | Built-in | Built-in | No |
| Cost tracking | Cost Insights plugin | Premium | Built-in | No |
| Setup effort | 2-4 weeks | Hours | Days | Days |
| Maintenance | High | Low | Medium | Medium |
| Team size required | 3+ platform engineers | 1-2 | 1-2 | 2-3 |

## References
- references/adoption-strategy.md — Platform Adoption Strategy
- references/backstage-plugins.md — Backstage Plugin Development
- references/developer-portal-customization.md — Developer Portal Customization Guide
- references/golden-paths.md — Golden Path Design Patterns
- references/idp-adoption.md — IDP Adoption Strategies
- references/idp-scorecard.md — IDP Scorecard: Maturity Assessment Framework
- references/internal-developer-platform-advanced.md — Internal Developer Platform Advanced Topics
- references/internal-developer-platform-fundamentals.md — Internal Developer Platform Fundamentals
- references/catalog-modeling.md — Entity Catalog Modeling
- references/template-design.md — Software Template Design Patterns
- references/permission-framework.md — Backstage Permission Framework
- references/techdocs-config.md — TechDocs Configuration Guide

## Handoff
Related skills: platform-engineering (IDP high-level strategy), policy-as-code (guardrails), progressive-delivery (deployment), sre-practices (reliability SLOs), cicd-pipeline (CI/CD integration).
