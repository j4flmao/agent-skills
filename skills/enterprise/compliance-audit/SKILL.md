---
name: enterprise-compliance-audit
description: >
  Use this skill when performing compliance audits (SOC2, ISO 27001, GDPR, HIPAA, PCI).
  This skill enforces: control mapping, evidence collection, audit readiness, continuous monitoring.
  Do NOT use for: internal security reviews, vulnerability scans, pen test execution.
version: "2.0.0"
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

## Framework/Methodology

### AUDIT-READY Framework
A six-phase approach to achieving and maintaining audit readiness:

Phase 1 - Align: Identify applicable frameworks based on business domain, data types, customer requirements, and geographic presence. Map framework requirements to system architecture. Determine audit scope (systems, data, regions, shared infrastructure).

Phase 2 - Understand: Map controls to system components. Group by control domain (access control, encryption, logging, change management, incident response). Document inherited controls from cloud providers and vendors.

Phase 3 - Document: Create control implementation narratives. Define policies and procedures. Maintain evidence of operating effectiveness. Implement automated evidence collection where possible.

Phase 4 - Implement: Deploy technical controls. Configure logging, monitoring, and alerting. Establish access review workflows. Implement change management and deployment pipelines with compliance gates.

Phase 5 - Test: Conduct internal audits. Run penetration tests. Perform control testing (design and operating effectiveness). Remediate findings. Repeat until residual risk is acceptable.

Phase 6 - Ready: Assemble evidence package. Prepare system description. Pre-brief stakeholders. Schedule auditor interviews. Establish communication protocol for auditor questions.

### Control Types by Framework

Access Control (All frameworks): MFA, role-based access, least privilege, access reviews, termination procedures, session management.

Encryption (All frameworks): TLS for data in transit, AES-256 for data at rest, key management, certificate lifecycle management.

Logging and Monitoring (All frameworks): Audit trails for admin actions, data access, configuration changes. Log retention per framework. Alerting on security events.

Change Management (SOC2, ISO 27001, PCI): Change approval workflow, separation of duties, emergency change process, back-out procedures, production access controls.

Incident Response (All frameworks): Incident response plan, tested annually, documented procedures, communication plan, post-incident review.

Vulnerability Management (SOC2, ISO 27001, PCI, HIPAA): Regular vulnerability scans, penetration testing annually, patch management SLAs, vulnerability tracking to closure.

Data Protection (GDPR, HIPAA, PCI): Data classification, data inventory, data retention and deletion, data processing agreements, data portability, right to erasure.

Business Continuity (SOC2, ISO 27001, PCI): BCP/DR plans, tested annually, RPO/RTO defined, backup verification.

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

Framework selection criteria:
- Customer contracts: which frameworks do your customers require?
- Data types: PII (GDPR/CCPA), PHI (HIPAA), cardholder data (PCI-DSS)
- Geography: EU operations (GDPR), US healthcare (HIPAA), global (ISO 27001)
- Industry: SaaS (SOC2), healthcare (HIPAA), finance (PCI-DSS, SOX)
- Partnerships: some partners require specific certifications

Inherited controls: document which controls are covered by cloud provider certifications (AWS SOC2, Azure ISO 27001). The auditor will accept inherited controls but may ask for evidence that you verified the provider certifications.

### Step 2: Gap Analysis Against Controls
For each mapped control, assess current implementation maturity (Not Implemented / Partial / Implemented / Automated). Rate severity of each gap (Critical / High / Medium / Low). Estimate remediation effort. Assign owners.

Gap severity definitions:
- Critical: Control absence creates material risk. Immediate regulatory exposure. Remediation within 30 days.
- High: Control partially implemented but with significant gaps. Remediation within 60 days.
- Medium: Control implemented but not automated or fully documented. Remediation within 90 days.
- Low: Control implemented with minor documentation or evidence gaps. Remediation before audit starts.

Gap analysis output should be a prioritized remediation plan with assigned owners, target dates, and estimated effort. Review with executive sponsor.

### Step 3: Evidence Collection Automation
Configure structured logging at all system boundaries. Enable audit trails for admin actions, data access, and configuration changes. Implement access review workflows. Automate evidence gathering scripts. Timestamp and hash all evidence for immutability.

Evidence types:
- Configuration snapshots: Infrastructure-as-Code state files, CI/CD pipeline definitions
- Log exports: System logs, audit logs, access logs, change logs
- Policy documents: Signed policies, procedure documents, runbooks
- Review records: Access review sign-offs, change advisory board minutes, risk assessment reports
- Training records: Security awareness training completions, role-based training records
- Test results: Penetration test reports, vulnerability scan results, DR test reports

Evidence collection automation:
- Use CSPM tools for infrastructure evidence
- Schedule automated log export and archive
- Tag and hash evidence for immutability verification
- Maintain evidence index mapped to controls

### Step 4: Continuous Compliance Monitoring
Deploy compliance dashboards showing real-time control status. Configure alerts for control failures. Schedule periodic evidence collection. Monitor access logs for anomalous patterns. Track remediation progress.

Continuous monitoring components:
- Compliance posture dashboard (per framework, per control)
- Automated control testing (scheduled tests verify control effectiveness)
- Configuration drift detection (alert when IaC-defined config differs from actual)
- Access review automation (scheduled review reminders, automated certification)
- Vulnerability pipeline (scan results -> ticket -> remediation -> verification)

Monitoring tools: AWS Config, Azure Policy, GCP Organization Policy, CSPM platforms (Wiz, Prisma Cloud, CrowdStrike), SIEM integration.

### Step 5: Audit Preparation and Evidence Package
Assemble evidence package mapped to each control. Prepare system description document. Conduct pre-audit walkthrough with stakeholders. Prepare evidence access for auditors. Schedule interview slots.

Audit preparation timeline:
- T-90 days: Confirm audit scope and framework version. Update system description.
- T-60 days: Run internal readiness assessment. Remediate high-priority gaps.
- T-30 days: Assemble evidence package. Run mock audit interviews.
- T-14 days: Validate evidence accessibility. Confirm auditor schedule.
- T-7 days: Pre-brief executive team. Distribute evidence access instructions.
- T-0: Audit kickoff.

Evidence access: create a secure portal or shared drive with read-only access for auditors. Organize evidence by control. Include timestamps and hash verification.

### Step 6: Remediation Tracking
Log all findings in remediation tracker. Assign severity-appropriate SLAs. Track closure evidence. Verify remediation effectiveness. Report to compliance committee quarterly.

Remediation workflow:
1. Auditor identifies finding
2. Compliance team logs finding with severity, owner, due date
3. Owner implements remediation
4. Owner submits closure evidence
5. Compliance team verifies remediation
6. Internal audit validates effectiveness
7. Finding closed and reported to auditor

Track remediation metrics: open findings by severity, average time-to-close, findings aging, repeat findings (same issue recurring across audits).

## Common Pitfalls

Pitfall 1: Treating compliance as a point-in-time exercise. Compliance is not a project with an end date. It is an ongoing program. Controls degrade, personnel change, architecture evolves. Continuous monitoring is essential.

Pitfall 2: Manual evidence collection. Gathering evidence manually before each audit is time-consuming and error-prone. Automate evidence collection so it runs continuously. The audit package should be available at all times.

Pitfall 3: Over-relying on inherited controls. Cloud provider certifications reduce scope but do not eliminate it. You still need to demonstrate you have configured the provider services correctly (shared responsibility model).

Pitfall 4: Documenting controls but not operating them. A policy that no one follows is worse than no policy. Auditors will test operating effectiveness, not just design. Train teams and verify compliance.

Pitfall 5: Not scoping the audit correctly. Including too many systems increases cost and complexity. Excluding critical systems creates risk. Define scope boundaries clearly with system descriptions and data flow diagrams.

Pitfall 6: Ignoring vendor compliance. If a vendor processes data on your behalf, they are in scope. Vendor due diligence (SOC2 reports, ISO certificates, security questionnaires) must be current.

Pitfall 7: No remediation follow-through. Audit findings that are not tracked to closure will recur. A formal remediation program with owners, deadlines, and verification is required.

## Best Practices

Practice 1: Build compliance into development workflows. Infrastructure-as-Code templates should enforce compliance defaults. CI/CD pipelines should run compliance checks. Pull request templates should include compliance review checklist.

Practice 2: Automate evidence collection as early as possible. The goal is to have an audit-ready evidence package available on demand, not assembled in a panic before each audit.

Practice 3: Maintain a single source of truth for control status. A compliance dashboard that maps each control to its implementation status, evidence location, and owner. Update in real-time as systems change.

Practice 4: Run a pre-audit readiness assessment 60 days before the actual audit. Use an internal team or external consultant. Identify gaps while there is still time to remediate.

Practice 5: Train teams on compliance responsibilities. Developers should understand what controls apply to their code. Operations should understand evidence collection requirements. Security should understand monitoring expectations.

Practice 6: Conduct periodic tabletop audits. Walk through an audit scenario with the team. Practice answering auditor questions, accessing evidence, and demonstrating controls.

## Templates & Tools

### Audit Readiness Checklist
```
## Pre-Audit Preparation
- [ ] Audit scope documented and approved
- [ ] System description current and accurate
- [ ] Control matrix mapped to framework requirements
- [ ] Evidence collection automated for all controls
- [ ] Continuous monitoring dashboards operational
- [ ] Penetration test completed (within 12 months)
- [ ] Vendor due diligence documents current
- [ ] Internal readiness assessment completed
- [ ] Remediation plan for open findings in progress

## Evidence Package
- [ ] Policy documents (signed, dated, current)
- [ ] Procedure documents (operating procedures, runbooks)
- [ ] Configuration evidence (IaC state, system configs)
- [ ] Log evidence (access logs, audit logs, change logs)
- [ ] Review evidence (access review sign-offs, CAB minutes)
- [ ] Test evidence (pen test report, vulnerability scans, DR tests)
- [ ] Training evidence (completion records, awareness training)

## During Audit
- [ ] Audit kickoff completed with scope confirmation
- [ ] Evidence access provided to auditors
- [ ] Interviews scheduled and attended
- [ ] Requests for information responded within 24 hours
- [ ] Daily debrief with audit team
- [ ] Preliminary findings reviewed
```

### Tools Reference
- Vanta / Drata / Secureframe for automated compliance
- Wiz / Prisma Cloud for CSPM and compliance scanning
- AWS Audit Manager for AWS-native compliance
- Jira / Asana for remediation tracking
- Confluence / Notion for policy documentation
- Okta / Azure AD for access control evidence
- Splunk / ELK for log management and audit trails

### Common Framework Requirements Matrix
| Control Area           | SOC2 | ISO 27001 | GDPR | HIPAA | PCI-DSS |
|------------------------|------|-----------|------|-------|---------|
| Access Control         | Yes  | A.9       | Art 32| 164.312| Req 7  |
| Encryption             | Yes  | A.10      | Art 32| 164.312| Req 4  |
| Logging and Monitoring | Yes  | A.12      | Art 33| 164.312| Req 10 |
| Change Management      | Yes  | A.12      | -    | 164.310| Req 6  |
| Incident Response      | Yes  | A.16      | Art 33| 164.308| Req 12 |
| Vulnerability Mgmt     | Yes  | A.12      | Art 32| 164.308| Req 6  |
| Business Continuity    | Yes  | A.17      | -    | 164.308| Req 12 |
| Data Protection        | -    | A.8       | Art 5 | 164.514| Req 3  |

## Case Studies

### Case Study 1: SOC2 Type II in 6 Months
A SaaS startup needed SOC2 Type II for an enterprise customer within 6 months. Using an automated compliance platform, they mapped 120 controls, implemented 35 new technical controls, and automated evidence collection for 80% of controls. The internal readiness assessment at T-60 days identified 12 gaps which were remediated by T-14 days. The Type II audit passed with zero findings. Total compliance program cost: under $50K.

### Case Study 2: Multi-Framework Alignment
A healthcare SaaS company needed SOC2 + HIPAA + GDPR compliance simultaneously. By defining a unified control framework (270 controls total) with framework-specific overlays, they eliminated duplicate evidence collection. Each control had a primary framework mapping and cross-reference to other frameworks. The combined audit program cost 30% less than three separate programs. Audit burden reduced from 6 weeks to 3 weeks.

### Case Study 3: Failed Audit Recovery
A fintech company failed their SOC2 Type II audit due to insufficient access control evidence. Gap analysis showed access reviews were conducted but not documented with sign-offs, and termination procedures were not consistently followed. The remediation program implemented automated access review workflows, termination verification, and quarterly reporting. The re-audit passed with one low-severity finding. Lessons learned: evidence of control operation is as important as the control itself.

## Rules
- Evidence is immutable and timestamped with cryptographic hashes.
- Access logs retained per framework minimum (90 days SOC2, 365 days PCI, 6 years GDPR).
- Change management requires documented approval before production deployment.
- Data retention and deletion policies must be enforced at application level.
- Annual penetration test by independent third party is mandatory.
- Vendor due diligence must be documented before data sharing.
- Incident response plan tested at least annually.
- All evidence collection must be automated where technically feasible.
- Control implementation must be verified by test evidence, not just design documentation.
- Compliance training conducted at onboarding and annually thereafter.
- Access reviews conducted quarterly for privileged access, annually for standard access.
- Internal readiness assessment performed minimum 60 days before external audit.
- Audit findings tracked in formal remediation program with owners and deadlines.
- Cloud provider certifications reviewed annually for continued applicability.

## References
  - references/audit-automation.md -- Audit Automation
  - references/audit-checklist.md -- Audit Checklist
  - references/audit-evidence.md -- Audit Evidence Collection and Preservation
  - references/compliance-audit-advanced.md -- Compliance Audit Advanced Topics
  - references/compliance-audit-framework.md -- Compliance Audit Framework Reference
  - references/compliance-automation-tools.md -- Compliance Automation Tools Reference
  - references/compliance-audit-fundamentals.md -- Compliance Audit Fundamentals
  - references/compliance-frameworks.md -- Compliance Frameworks Reference
## Handoff
For remediation implementation, hand off to `enterprise-sla-management` for tracking remediation SLAs, or `enterprise-cost-governance` for budgeting remediation costs.
