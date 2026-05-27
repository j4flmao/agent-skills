---
name: cloud-architecture
description: >
  Design cloud architecture, landing zones, multi-cloud strategy, well-architected frameworks, and cloud migration patterns.
  Use when the user asks about cloud architecture, landing zone, well-architected, cloud migration, or multi-cloud strategy.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud, phase-5]
---

# Cloud Architecture

## Purpose
Design cloud infrastructure architecture including landing zones, well-architected framework evaluation, cloud migration strategy, and multi-cloud architecture.

## Agent Protocol

### Trigger
- "cloud architecture", "cloud design", "cloud infrastructure"
- "landing zone", "cloud foundation", "cloud platform"
- "well-architected", "pillar review", "cloud framework"
- "cloud migration", "lift and shift", "replatform", "refactor to cloud"
- "multi-cloud", "hybrid cloud", "cloud strategy", "cloud provider comparison"
- "AWS architecture", "Azure architecture", "GCP architecture", "cloud region"
- "VPC design", "cloud networking", "cloud security architecture"
- "cloud governance", "cloud policy", "cloud compliance"

### Input Context
- If cloud provider, workload type, and compliance requirements are not provided, ask.

### Output Artifact
- Architecture diagrams, landing zone designs, well-architected review reports, migration plans

### Response Format
```
## Architecture
{Cloud components, topology, data flow}

## Considerations
{Security, cost, performance, reliability, operational excellence}

## Implementation
{Step-by-step implementation plan}
```

### Completion Criteria
- [ ] Cloud architecture designed with all components
- [ ] Well-architected pillars addressed
- [ ] Migration strategy defined (if applicable)
- [ ] Cost and security considerations documented

## References
  - references/cloud-architecture-advanced.md — Cloud Architecture Advanced Topics
  - references/cloud-architecture-fundamentals.md — Cloud Architecture Fundamentals
  - references/cloud-migration.md — Cloud Migration
  - references/landing-zone.md — Cloud Landing Zone Patterns
  - references/multi-cloud-strategy.md — Multi-Cloud Strategy
  - references/well-architected.md — Well-Architected Framework
## Handoff
Architecture implemented via devops-terraform (IaC) and devops-aws/azure/gcp. Security validated via security-* skills.
