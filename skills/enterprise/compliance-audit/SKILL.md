---
name: enterprise-compliance-audit
description: >
  Use this skill when performing compliance audits (SOC2, ISO 27001, GDPR, HIPAA, PCI).
  This skill enforces: control mapping, evidence collection, audit readiness, continuous monitoring.
  Do NOT use for: internal security reviews, vulnerability scans, pen test execution.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, compliance, phase-8]
---

# Compliance Audit Agent

## Purpose
Guides compliance audits from framework selection through evidence packaging and remediation tracking.

## Agent Protocol

### Trigger
Exact user phrases: compliance, audit, SOC2, ISO27001, GDPR, HIPAA, audit trail, compliance check, security audit, regulatory compliance, audit evidence, control mapping, compliance gap, evidence collection, auditor readiness.

### Input Context
Before activating, verify:
- Which compliance framework(s) apply (SOC2/ISO 27001/GDPR/HIPAA/PCI)?
- What is the deployment scope (cloud provider, regions, shared infrastructure)?
- What data types are processed (PII, PHI, cardholder data, credentials)?
- What existing controls are already documented and operational?

### Output Artifact
Compliance gap analysis + evidence collection checklist + audit readiness report.

### Response Format
```
## [Framework] Compliance Assessment
### Scope
{systems, data types, regions included}

### Control Mapping
{control ID} | {control description} | {status} | {evidence location}

### Gap Analysis
| Gap | Severity | Remediation | Owner | Target |
|-----|----------|-------------|-------|--------|

### Evidence Package
{list of collected artifacts with timestamps}

### Readiness Score: {X/100}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Control framework mapped to system architecture
- [ ] Gap analysis completed with severity ratings
- [ ] Evidence collection automated for all controls
- [ ] Continuous monitoring configured for critical controls
- [ ] Remediation plan with owners and deadlines
- [ ] Audit evidence package assembled and verified
- [ ] Annual penetration test scheduled
- [ ] Vendor due diligence documented

### Max Response Length
8000 tokens

## Workflow

### Step 1: Framework Selection and Control Mapping
Identify the applicable compliance framework. Map each framework control to system components. Group by control domain (access control, encryption, logging, change management, incident response). Document inherited controls from cloud provider.

### Step 2: Gap Analysis Against Controls
For each mapped control, assess current implementation maturity (Not Implemented / Partial / Implemented / Automated). Rate severity of each gap (Critical / High / Medium / Low). Estimate remediation effort. Assign owners.

### Step 3: Evidence Collection Automation
Configure structured logging at all system boundaries. Enable audit trails for admin actions, data access, and configuration changes. Implement access review workflows. Automate evidence gathering scripts. Timestamp and hash all evidence for immutability.

### Step 4: Continuous Compliance Monitoring
Deploy compliance dashboards showing real-time control status. Configure alerts for control failures. Schedule periodic evidence collection. Monitor access logs for anomalous patterns. Track remediation progress.

### Step 5: Audit Preparation and Evidence Package
Assemble evidence package mapped to each control. Prepare system description document. Conduct pre-audit walkthrough with stakeholders. Prepare evidence access for auditors. Schedule interview slots.

### Step 6: Remediation Tracking
Log all findings in remediation tracker. Assign severity-appropriate SLAs. Track closure evidence. Verify remediation effectiveness. Report to compliance committee quarterly.

## Rules
- Evidence is immutable and timestamped with cryptographic hashes.
- Access logs retained per framework minimum (90 days SOC2, 365 days PCI, 6 years GDPR).
- Change management requires documented approval before production deployment.
- Data retention and deletion policies must be enforced at application level.
- Annual penetration test by independent third party is mandatory.
- Vendor due diligence must be documented before data sharing.
- Incident response plan tested at least annually.
- All evidence collection must be automated where technically feasible.

## References
  - references/audit-automation.md — Audit Automation
  - references/audit-checklist.md — Audit Checklist
  - references/audit-evidence.md — Audit Evidence Collection and Preservation
  - references/compliance-audit-advanced.md — Compliance Audit Advanced Topics
  - references/compliance-audit-fundamentals.md — Compliance Audit Fundamentals
  - references/compliance-frameworks.md — Compliance Frameworks Reference
## Handoff
For remediation implementation, hand off to `enterprise-sla-management` for tracking remediation SLAs, or `enterprise-cost-governance` for budgeting remediation costs.
