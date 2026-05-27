---
name: soc-operations
description: >
  Manage SOC operations, tiered analyst workflows, shift handovers, and security incident escalation.
  Use when the user asks about SOC, security operations center, SOC analyst, SOC tier, security monitoring, or SOC metrics.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, soc, phase-8]
---

# SOC Operations

## Purpose
Define SOC structure, analyst workflows, tier responsibilities, escalation paths, shift handovers, and SOC performance metrics.

## Agent Protocol

### Trigger
- "SOC", "security operations center", "SOC analyst", "SOC tier", "Tier 1", "Tier 2", "Tier 3"
- "security monitoring", "alert triage", "SOC workflow", "SOC runbook"
- "shift handover", "SOC dashboard", "SOC metrics", "MTTD", "MTTR"
- "escalation path", "security incident escalation", "SOC manager"
- "24/7 security coverage", "follow-the-sun", "SOC staffing"

### Input Context
- If organization size, industry, and existing security tools are not provided, ask.

### Output Artifact
- SOC runbooks, escalation matrices, shift handover templates, SOC metrics dashboards

### Response Format
```
## SOC Structure
{Role definition, tier responsibilities}

## Workflow
{Alert triage flow, escalation criteria}

## Metrics
{MTTD, MTTR, alert volume, false positive rate}
```

### Completion Criteria
- [ ] SOC structure defined with clear tier responsibilities
- [ ] Escalation paths documented with criteria
- [ ] Shift handover process defined
- [ ] Metrics defined with targets

## References
  - references/soc-metrics.md — SOC Metrics and Reporting
  - references/soc-operations-advanced.md — Soc Operations Advanced Topics
  - references/soc-operations-fundamentals.md — Soc Operations Fundamentals
  - references/soc-runbooks.md — SOC Runbook Templates
  - references/soc-structure.md — SOC Structure
  - references/threat-hunting.md — Threat Hunting in SOC
  - references/triage-procedures.md — Alert Triage Procedures
## Handoff
Output artifacts can be handed to devops-monitoring for SIEM integration, or management for org planning.
