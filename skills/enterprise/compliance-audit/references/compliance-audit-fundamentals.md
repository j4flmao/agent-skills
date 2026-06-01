# Compliance Audit Fundamentals

## Overview
Compliance audits verify that controls are designed effectively and operating consistently. This covers framework selection, control mapping, evidence collection, and audit readiness — the foundation of any compliance program.

## Core Concepts

### Compliance Frameworks
- SOC2 (Service Organization Control 2): Trust Services Criteria (security, availability, processing integrity, confidentiality, privacy). Type I = point-in-time, Type II = over period (6-12 months).
- ISO 27001: Information Security Management System (ISMS). Annex A controls. Certification valid 3 years with surveillance audits.
- GDPR: EU data protection regulation. Art. 5 principles, Art. 32 security, Art. 33 breach notification, Art. 17 right to erasure.
- HIPAA: US healthcare privacy and security. Privacy Rule, Security Rule, Breach Notification Rule.
- PCI DSS v4.0: Payment card industry. 12 requirements covering security management, access control, monitoring, and testing.

### Control Types
| Control Type | Example | Testing Method |
|-------------|---------|----------------|
| Preventive | MFA enforcement | Verify configuration |
| Detective | Log monitoring | Verify alert triggered |
| Corrective | Backup restore | Verify recovery |
| Directive | Acceptable use policy | Verify acknowledgment |

### Testing Methods
- Design Effectiveness: Is the control designed to meet the requirement? Reviewed through documentation and interviews.
- Operating Effectiveness: Does the control work consistently? Tested through sampling evidence over the audit period.
- Inquiry: Interview control owners and operators
- Observation: Watch the control being performed
- Inspection: Examine documents and records
- Re-performance: Independently execute the control

### Control Mapping
Map each framework requirement to system components. Group by domain: access control, encryption, logging, change management, vulnerability management, incident response, data protection, business continuity.

## Framework Selection

### Selection Criteria
| Factor | Framework | Priority |
|--------|-----------|----------|
| Industry | Healthcare -> HIPAA, Finance -> PCI + SOX | High |
| Customer contracts | Enterprise SaaS -> SOC2 | High |
| Geography | EU -> GDPR, Global -> ISO 27001 | High |
| Data type | PII -> GDPR/CCPA, PHI -> HIPAA, Card -> PCI | High |
| Partnerships | Partner requirements may mandate specific certifications | Medium |

### Unified Control Framework
For multi-framework compliance, define a single control set with framework-specific overlays. Each control maps to its primary framework and cross-references others. Example: Access Control maps to SOC2 CC6.1, ISO 27001 A.9, HIPAA 164.312(a)(1), PCI Req 7.

## Evidence Collection

### Evidence Types
- Configuration snapshots: IaC state files, CI/CD pipeline definitions
- Log exports: System logs, audit logs, access logs, change logs
- Policy documents: Signed policies, procedure documents, runbooks
- Review records: Access review sign-offs, CAB minutes, risk assessments
- Training records: Security awareness completions, role-based training
- Test results: Pen test reports, vulnerability scans, DR test results

### Evidence Integrity
Every evidence artifact should be: timestamped, cryptographically hashed, stored immutably, mapped to specific controls. Automated collection from source systems is more credible than manual exports.

## Audit Readiness

### Pre-Audit Timeline
| Milestone | Timeline | Action |
|-----------|----------|--------|
| Scope confirmation | T-90 days | Define systems, data, regions in scope |
| System description | T-90 days | Document architecture, data flows |
| Internal readiness | T-60 days | Run gap analysis, remediate findings |
| Evidence package | T-30 days | Assemble evidence per control |
| Mock audit | T-14 days | Practice interviews, verify evidence access |
| Executive pre-brief | T-7 days | Review findings, prepare responses |
| Audit kickoff | T-0 | Begin on-site/remote audit |

## Common Pitfalls

### Manual Evidence Collection
Gathering screenshots and PDFs before each audit is error-prone and stressful. Automate evidence collection so the audit package is available on demand.

### Point-in-Time Compliance
Compliance is not a project with an end date. Controls degrade, personnel change, architecture evolves. Continuous monitoring is essential.

### Over-Reliance on Inherited Controls
Cloud provider certifications reduce scope but don't eliminate responsibility. You still must demonstrate correct configuration of provider services.

### Unscoped Audits
Including too many systems increases cost. Excluding critical systems creates risk. Define scope boundaries clearly with system descriptions and data flow diagrams.

## Key Points
- Framework selection drives everything — choose based on domain, geography, and customer requirements
- Unified control framework reduces duplicate effort across multiple frameworks
- Automated evidence collection is the single highest-ROI investment for compliance
- Operating effectiveness matters more than design — test controls, not just document them
- Pre-audit readiness assessment 60 days before identifies gaps with time to remediate
- Evidence integrity (timestamps, hashes, immutability) is critical for auditor acceptance
- Vendor compliance is in scope — maintain current SOC2/ISO certificates for all vendors
- Continuous monitoring replaces point-in-time audit prep for mature programs