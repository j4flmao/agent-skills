---
name: cspm
description: >
  Cloud Security Posture Management (CSPM) — detect and remediate cloud
  misconfigurations, enforce compliance frameworks, manage cloud entitlements, and automate
  security responses. Use when the user asks about CSPM, cloud security posture, Wiz, Prisma Cloud,
  CIS benchmarks, compliance automation, CIEM, or cloud remediation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, cspm, cloud-security, phase-8]
---

# Cloud Security Posture Management

## Purpose
Implement CSPM to continuously monitor cloud environments for misconfigurations, enforce compliance frameworks (CIS, SOC 2, PCI DSS, HIPAA), automate remediation of security findings, and manage cloud identity entitlements.

## Agent Protocol

### Trigger
- "CSPM", "cloud security posture", "cloud misconfiguration", "Wiz", "Prisma Cloud"
- "CIS benchmark", "AWS Security Hub", "Azure Security Center", "GCP Security Command Center"
- "compliance automation", "cloud compliance", "SOC 2 cloud", "PCI DSS cloud"
- "auto-remediation", "AWS Config", "Azure Policy", "GCP Org Policy"
- "CIEM", "cloud entitlement", "permission analysis", "unused permissions", "Orca", "Lacework"

### Input Context
- Cloud providers and accounts/subscriptions/project structure
- Compliance frameworks required (CIS, SOC 2, PCI DSS, HIPAA, NIST)
- Current monitoring tools and SIEM integration points
- Incident response and ticketing workflow (SOAR, Jira, ServiceNow)

### Output Artifact
- CSPM deployment plan, compliance mapping matrices, automated remediation runbooks, CIEM analysis reports

### Response Format
```
## CSPM Architecture
{Platform selection, multi-account topology, data collection}

## Compliance Mapping
{Control-to-framework mappings, evidence collection}

## Remediation Strategy
{Auto-remediation rules, approval workflows, event-driven responses}
```

### Completion Criteria
- [ ] CSPM platform deployed across all cloud accounts/subscriptions
- [ ] Compliance frameworks mapped with automated evidence collection
- [ ] Auto-remediation rules deployed for critical misconfigurations
- [ ] CIEM analysis completed with unused permissions identified
- [ ] SIEM/SOAR integration configured for alert enrichment and response
- [ ] Dashboard and reporting set up for stakeholder review

## Workflow

1. ** Discover cloud inventory** — Map accounts, regions, services, and data stores
2. **Select CSPM platform** — Evaluate Wiz, Prisma Cloud, AWS Security Hub, Azure SC, GCP SCC
3. **Configure compliance benchmarks** — Enable CIS Benchmark scanning for each provider
4. **Tune alert severity** — Classify findings by risk: Critical, High, Medium, Low
5. **Implement auto-remediation** — Deploy AWS Config rules, Azure Policies, GCP Org Policies
6. **Integrate with SIEM/SOAR** — Forward findings to Splunk/Sentinel, trigger playbooks
7. **Perform CIEM analysis** — Review permissions, identify unused/over-privileged roles
8. **Continuous improvement** — Weekly posture reviews, quarterly compliance audits

## Rules
- Every cloud resource must be scanned within 24 hours of creation
- Critical and High findings must have automated or manual remediation within SLA
- All permissions must be reviewed quarterly (CIEM cycle)
- Compliance evidence must be collected automatically, never manually
- Changes to IAM policies must trigger immediate permission analysis

## References
  - references/automated-remediation.md — Automated Remediation for CSPM
  - references/ciem-permissions.md — CIEM — Cloud Infrastructure Entitlement Management
  - references/compliance-frameworks.md — Compliance Frameworks for CSPM
  - references/cspm-advanced.md — Cspm Advanced Topics
  - references/cspm-fundamentals.md — Cspm Fundamentals
  - references/cspm-integration.md — CSPM Integration
  - references/cspm-platforms.md — CSPM Platforms
## Handoff
CSPM outputs can be handed to devops for IaC policy enforcement, security-engineering for SIEM tuning, and compliance for audit evidence collection.
