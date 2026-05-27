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
- [ ] Provider selection justified with trade-off analysis
- [ ] Landing zone design aligned to organizational maturity

### Provider Comparison Framework

```yaml
provider_comparison:
  compute:
    aws: "EC2, Lambda, ECS/EKS, Fargate"
    azure: "VM, Azure Functions, AKS, Container Apps"
    gcp: "Compute Engine, Cloud Functions, GKE, Cloud Run"
    selection_criteria: ["Container vs VM preference", "Serverless maturity", "GPU availability"]
    
  database:
    relational:
      aws: "RDS (Aurora), DynamoDB (NoSQL)"
      azure: "Azure SQL, Cosmos DB"
      gcp: "Cloud SQL, Spanner, Firestore"
    selection_criteria: ["Managed vs self-managed", "Multi-region needs", "Compatibility requirements"]
    
  networking:
    aws: "VPC, CloudFront, Route 53, Direct Connect"
    azure: "VNet, Front Door, Azure DNS, ExpressRoute"
    gcp: "VPC, Cloud CDN, Cloud DNS, Cloud Interconnect"
    selection_criteria: ["Global reach", "Hybrid connectivity", "CDN requirements"]
    
  security:
    aws: "IAM, KMS, WAF, Shield, GuardDuty"
    azure: "Entra ID, Key Vault, Application Gateway, Defender"
    gcp: "IAM, Cloud KMS, Cloud Armor, Security Command Center"
    selection_criteria: ["Compliance certifications", "SIEM integration", "IAM maturity"]

  decision_factors:
    primary:
      - "Organizational cloud maturity and existing investment"
      - "Team expertise and hiring market"
      - "Compliance and data residency requirements"
      - "Cost model (committed use discounts, savings plans)"
    secondary:
      - "Service availability in target regions"
      - "Integration with existing tools (monitoring, CI/CD)"
      - "Open source vs proprietary lock-in"
      - "Exit costs and portability"
```

### Well-Architected Framework Deep-Dive

```yaml
well_architected:
  operational_excellence:
    principles:
      - "Infrastructure as Code — all changes through IaC, no manual configuration"
      - "Small, reversible changes — deploy frequently, roll back quickly"
      - "Runbooks and playbooks — resolve without heroics"
      - "Learning from failures — blameless post-mortems, improvement backlog"
    questions:
      - "How do you understand the health of your workload?"
      - "How do you manage changes without impacting users?"
      - "How do you respond to operational events?"
      
  security:
    principles:
      - "Strong identity foundation — least privilege, centralize identity"
      - "Traceability — log all actions, monitor for anomalies"
      - "Apply security at all layers — network, application, data, access"
      - "Automate security best practices — policy as code"
    questions:
      - "How do you manage credentials and secrets?"
      - "How do you protect data at rest and in transit?"
      - "How do you detect and respond to security events?"
      
  reliability:
    principles:
      - "Automatically recover from failure — health checks, auto-scaling, self-healing"
      - "Test recovery procedures — game days, chaos engineering"
      - "Scale horizontally — distribute load across multiple resources"
      - "Stop guessing capacity — auto-scaling and serverless"
    questions:
      - "How do you design for availability and fault tolerance?"
      - "How do you back up data and test recovery?"
      - "How do you adapt to changes in demand?"
      
  performance_efficiency:
    principles:
      - "Democratize advanced technologies — managed services over custom"
      - "Go global in minutes — CDN, edge caching, multi-region"
      - "Use serverless architectures — reduce idle capacity"
      - "Experiment more often — load testing, perf testing in CI"
    questions:
      - "How do you select the right compute and storage options?"
      - "How do you monitor and improve performance?"
      - "How do you optimize resource utilization?"
      
  cost_optimization:
    principles:
      - "Adopt a consumption model — pay only for what you use"
      - "Measure overall efficiency — cost per transaction, per user"
      - "Stop spending money on undifferentiated heavy lifting — managed services"
      - "Analyze and attribute expenditure — tagging, cost allocation"
    questions:
      - "How do you manage cost allocation and governance?"
      - "How do you evaluate and optimize resource usage?"
      - "How do you plan for growth while controlling costs?"
      
  sustainability:
    principles:
      - "Understand your impact — measure carbon footprint"
      - "Establish sustainability goals — reduce per-transaction energy"
      - "Maximize utilization — right-size resources, eliminate waste"
      - "Adopt efficient hardware and architectures — Graviton, ARM, serverless"
    questions:
      - "How do you select regions for minimum environmental impact?"
      - "How do you optimize workloads for energy efficiency?"
      - "How do you reduce the environmental impact of data storage and networking?"
```

## References
  - references/cloud-architecture-advanced.md — Cloud Architecture Advanced Topics
  - references/cloud-architecture-fundamentals.md — Cloud Architecture Fundamentals
  - references/cloud-migration.md — Cloud Migration
  - references/landing-zone.md — Cloud Landing Zone Patterns
  - references/multi-cloud-strategy.md — Multi-Cloud Strategy
  - references/well-architected.md — Well-Architected Framework
## Handoff
Architecture implemented via devops-terraform (IaC) and devops-aws/azure/gcp. Security validated via security-* skills.
