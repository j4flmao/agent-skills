---
name: devops-internal-developer-platform
description: >
  Deep dive into IDP design: golden path architecture, platform APIs, Backstage plugin development, software templates, tech docs, service catalog design, platform adoption, and developer experience measurement. Do NOT use for: surface-level platform engineering overview (devops-platform-engineering).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, internal-developer-platform, phase-3]
---

# Internal Developer Platform (Deep)

## Purpose
Design and build a production-grade Internal Developer Platform with golden paths, platform APIs, Backstage customization, and adoption measurement.

## Workflow

### Golden Path Architecture
```
Developer Request → Backstage Template → Template Processor
  ├── GitHub Repository (scaffolded with best practices)
  ├── CI/CD Pipeline (build, test, deploy)
  ├── Kubernetes Manifests (deploy, service, ingress, HPA)
  ├── Monitoring (dashboards, alerts, SLOs)
  ├── Documentation (README, API docs, runbooks)
  └── Service Catalog Entry (metadata, ownership, dependencies)
```

### Platform API Design
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Developer Portal | Backstage, Port, Cortex | UI for service catalog and templates |
| Orchestration | Backstage Scaffolder, Crossplane | Provision infrastructure and CI/CD |
| Infrastructure | Terraform, Pulumi, Kubernetes | Actual infrastructure resources |
| Policy | OPA, Kyverno, Datadog | Guardrails and compliance checks |

### Backstage Plugin Architecture
```
app-backend → plugin-auth-backend → plugin-catalog-backend → plugin-scaffolder-backend
                ↓                        ↓                        ↓
          auth providers           catalog processors       template actions
                ↓                        ↓                        ↓
          OAuth/OIDC               K8s/GitHub/AWS          Custom actions
```

### Adoption Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Platform adoption rate | > 80% of new services | % of new projects using platform |
| Time-to-production | < 1 hour | From template request to running in prod |
| Developer satisfaction | NPS > 50 | Quarterly survey |
| Platform uptime | 99.9% | Uptime of Backstage and APIs |

## References
  - references/adoption-strategy.md — Platform Adoption Strategy
  - references/backstage-plugins.md — Backstage Plugin Development
  - references/developer-portal-customization.md — Developer Portal Customization Guide
  - references/golden-paths.md — Golden Path Design Patterns
  - references/idp-adoption.md — IDP Adoption Strategies
  - references/idp-scorecard.md — IDP Scorecard: Maturity Assessment Framework
  - references/internal-developer-platform-advanced.md — Internal Developer Platform Advanced Topics
  - references/internal-developer-platform-fundamentals.md — Internal Developer Platform Fundamentals
