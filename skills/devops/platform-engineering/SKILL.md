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

## Rules
- Platform must reduce, not increase, cognitive load for developers
- Every golden path must have a clear "exit" for when developers outgrow it
- Platform team is a product team: treat developers as customers
- Measure success by developer velocity, not platform features shipped
- All platform components must have documented SLAs for the platform team

## References
- `references/platform-patterns.md` — Platform engineering patterns and anti-patterns
- `references/backstage-config.md` — Backstage setup, plugins, and software templates
- `references/idp-blueprint.md` — IDP architecture blueprint and adoption roadmap
- `references/platform-teams.md` — Platform team models, APIs, internal products, team topology

## Handoff
Related skills: devops-sre-practices (reliability), devops-internal-developer-platform (deep IDP), devops-policy-as-code (guardrails), devops-progressive-delivery (deployment strategies).
