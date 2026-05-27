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

## Workflow

### Step 1: Assess Current State
Identify existing tools, team topology, and friction points.

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

### Step 5: Rollout & Iterate
- Phase 1: Service catalog + documentation (quick wins)
- Phase 2: Software templates for 2-3 common paths
- Phase 3: Self-service actions for infrastructure
- Phase 4: Policy enforcement + cost/showback
- Phase 5: Inner source and platform contributions

## Platform Maturity Model

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

## Golden Path Design Patterns

```yaml
golden_path_patterns:
  path_structure:
    what_it_produces:
      - "Source repository with starter code template"
      - "CI/CD pipeline configuration"
      - "Containerization (Dockerfile, Helm chart, or serverless config)"
      - "Monitoring dashboard and alert rules"
      - "Documentation template (README, API docs, runbook)"
      - "Security scanning configuration"
      - "Environment configurations (dev, staging, prod)"
      
    scaffolding_approach:
      template_based: "Cookiecutter / yeoman / plop — generate repo from template"
      pipeline_integrated: "Backstage software templates — scaffold from developer portal"
      composition: "Assemble from modular building blocks — terraform modules, pipeline templates"
      
  exit_strategy:
    when_to_exit: "Team outgrows golden path defaults (custom framework, unusual architecture)"
    how_to_exit: "Fork the template, document deviations, register custom service in catalog"
    platform_role: "Accept deviations, review for platform improvement opportunities, maintain compatibility"
    
  measurement:
    adoption: "% of new services created via golden path"
    satisfaction: "Developer NPS on golden path experience"
    productivity: "Time from idea to production for golden path services"
    maintenance: "Cost to update golden path when platform changes"
```

## Platform Adoption Anti-Patterns

```yaml
adoption_anti_patterns:
  build_it_and_they_will_come:
    problem: "Platform team builds features without developer input"
    sign: "Low adoption rates, teams building parallel solutions"
    solution: "Treat platform as product — developer research, feedback loops, beta programs"
    
  forced_adoption:
    problem: "Mandating platform usage without flexibility"
    sign: "Shadow platforms emerge, teams find workarounds"
    solution: "Golden paths with escape hatches, demonstrate value before mandating"
    
  platform_team_as_ops:
    problem: "Platform team becomes bottleneck — every request goes through them"
    sign: "Platform team doing manual work, no self-service"
    solution: "Prioritize self-service capabilities, automate common requests"
    
  over_abstraction:
    problem: "Platform hides too much — developers can't debug or customize"
    sign: "Teams can't diagnose production issues, frustrated by magic"
    solution: "Expose appropriate details, provide debugging tools, document internals"
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

## References
  - references/backstage-config.md — Backstage Configuration Guide
  - references/idp-blueprint.md — IDP Architecture Blueprint
  - references/platform-engineering-advanced.md — Platform Engineering Advanced Topics
  - references/platform-engineering-fundamentals.md — Platform Engineering Fundamentals
  - references/platform-patterns.md — Platform Engineering Patterns
  - references/platform-teams.md — Platform Team Models
## Handoff
Related skills: devops-sre-practices (reliability), devops-internal-developer-platform (deep IDP), devops-policy-as-code (guardrails), devops-progressive-delivery (deployment strategies).
