---
name: data-data-strategy
description: >
  Use this skill when designing data strategy, data vision, data operating model, data culture, data maturity assessment, data ownership, or data governance roadmap. This skill enforces: maturity model assessment across people/process/tech/governance, vision and strategic pillar definition, operating model selection (centralized/federated/hybrid), data culture building with literacy programs, and data ownership frameworks with RACI and SLA. Do NOT use for: specific data platform architecture, ETL pipeline design, or tool-specific data engineering decisions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, strategy, governance, phase-7]
---

# Data Strategy

## Purpose
Define and execute a comprehensive data strategy covering maturity assessment, vision and strategic pillars, operating model design, data culture development, and data ownership frameworks with clear accountability.

## Agent Protocol

### Trigger
Exact user phrases: "data strategy", "data vision", "data maturity", "data operating model", "data culture", "data ownership", "data governance roadmap", "CDO", "chief data officer", "data literacy", "data champions", "data transformation", "data COE", "data domain", "data steward".

### Input Context
- Organization size, industry, and current data maturity level
- Existing data infrastructure and tooling
- Business priorities and use cases for data
- Organizational structure and reporting lines
- Regulatory and compliance requirements
- Current data challenges (quality, access, trust, skills)

### Output Artifact
Data strategy document with maturity assessment, vision statement, strategic roadmap, operating model design, culture plan, and ownership framework.

### Response Format
```yaml
# Maturity assessment results
# Strategic pillars
```
```markdown
# Vision statement
# Use case prioritization
```
```sql
-- Domain ownership tables
-- RACI matrix
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Data maturity assessed across people, process, tech, governance
- [ ] Vision statement drafted with strategic pillars
- [ ] Operating model (centralized/federated/hybrid) selected and designed
- [ ] Data culture plan with literacy program and champion network
- [ ] Data ownership framework with domain definitions, RACI, and SLAs
- [ ] 3-year investment roadmap with quick wins identified
- [ ] KPIs and metrics defined for strategy tracking

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Assess Data Maturity
Evaluate current state across four dimensions using a 5-level maturity model. Level 1 (Initial): ad-hoc, no governance, siloed. Level 2 (Managed): basic processes, some standards, project-level governance. Level 3 (Defined): enterprise standards, data stewardship, quality metrics. Level 4 (Quantitatively Managed): measured processes, data-driven culture, predictive quality. Level 5 (Optimizing): continuous improvement, automated governance, data as strategic asset.

### Step 2: Define Vision and Strategic Pillars
Craft a vision statement articulating the future state of data within the organization. Define 3-5 strategic pillars that support the vision: data governance, data architecture, data literacy, analytics and AI, data-driven operations. Map each pillar to business outcomes.

### Step 3: Design Operating Model
Select operating model based on organizational structure and maturity. Centralized: single CDO office, all data teams report up. Federated: data teams embedded in business units with central COE. Hybrid: central platform team with domain-aligned data stewards. Define data COE responsibilities, domain team structure, and decision rights.

### Step 4: Build Data Culture
Launch data literacy program with tiered training (basic, intermediate, advanced). Establish data champion network with representatives from each business unit. Create internal data community with show-and-tell sessions, hackathons, and a data newsletter. Implement metrics-driven decision framework.

### Step 5: Establish Data Ownership
Define data domains aligned with business functions (customer, product, finance, supply chain). Assign data owners (senior business leaders) and data stewards (operational roles). Create accountability matrix with decision rights, escalation paths, and SLA framework for data quality and access.

## Rules
- Maturity assessment is the foundation — never skip it before defining strategy
- Vision must connect to business outcomes, not just technology
- Operating model must match organizational culture, not aspirational ideal
- Data literacy programs need executive sponsorship to succeed
- Data owners are business roles, not IT roles
- RACI matrix must cover all data domains and decision types
- 3-year roadmap includes quick wins (0-6 months), foundations (6-18 months), and transformation (18-36 months)
- Review and update strategy annually based on progress and changing business needs

## References
  - references/data-culture.md — Data Culture Reference
  - references/data-ethics-framework.md — Data Ethics Framework
  - references/data-maturity.md — Data Maturity Reference
  - references/data-operating-model.md — Data Operating Model Reference
  - references/data-ownership.md — Data Ownership Reference
  - references/data-strategy-metrics.md — Data Strategy Metrics
  - references/data-vision.md — Data Vision and Strategy Reference
## Handoff
`data-data-platform` for platform architecture aligned with strategy
`data-data-governance` for governance policy execution
`data-data-quality` for quality metrics and monitoring
