---
name: enterprise-compliance-audit
description: >
  Use this skill when performing compliance audits (SOC2, ISO 27001, GDPR, HIPAA, PCI).
  This skill enforces: control mapping, evidence collection, audit readiness, continuous monitoring.
  Do NOT use for: internal security reviews, vulnerability scans, pen test execution.
version: "2.1.0"
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

## Architecture / Decision Trees

### Framework Selection Decision Tree
```
Which industry/regulation applies?
├── Healthcare → HIPAA + SOC2
├── Financial services → PCI-DSS + SOX + SOC2
├── SaaS (enterprise customers) → SOC2
├── EU operations → GDPR + ISO 27001
├── Global → ISO 27001 + SOC2
└── Multi-regulated → Unified control framework with overlays
```

### Evidence Collection Automation Decision Tree
| Control Type | Automation Level | Tooling |
|-------------|-----------------|---------|
| Infrastructure config | Fully automatable | IaC state files, CSPM |
| Access reviews | Semi-automated | IdP + ticketing system |
| Training records | Fully automatable | LMS API → Evidence store |
| Penetration tests | Manual | Test report upload |
| Policy documents | Manual | Signed PDFs with versions |

### Compliance Maturity Model
| Level | Characteristics | Audit Experience |
|-------|----------------|-----------------|
| 1 - Reactive | No formal controls, ad-hoc evidence | Painful, many findings |
| 2 - Documented | Controls documented, manual evidence | Manageable, repeat findings |
| 3 - Automated | Automated evidence collection, continuous monitoring | Smooth, few findings |
| 4 - Integrated | Compliance built into DevSecOps, real-time dashboards | Effortless, proactive |
| 5 - Predictive | Risk-based controls, automated remediation | Audit in hours, not weeks |

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

## Standards Alignment

| Compliance Aspect | SOC2 | ISO 27001:2022 | GDPR | HIPAA | PCI DSS v4.0 |
|------------------|------|---------------|------|-------|-------------|
| Access Control | CC6.1 | A.9 | Art. 32 | 164.312(a)(1) | Req. 7 |
| Encryption | CC6.7 | A.8 | Art. 32 | 164.312(a)(2)(iv) | Req. 4 |
| Audit Logging | CC4.1 | A.12.4 | Art. 33 | 164.312(b) | Req. 10 |
| Change Management | CC8.1 | A.12.1 | — | 164.310(a)(2) | Req. 6.4 |
| Incident Response | CC7.3 | A.5.24 | Art. 33 | 164.308(a)(6) | Req. 12.10 |
| Vulnerability Mgmt | CC7.1 | A.8.8 | Art. 32 | 164.308(a)(1)(ii) | Req. 6.3 |
| Business Continuity | CC7.5 | A.5.29 | — | 164.308(a)(7)(i) | Req. 12.3 |

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

### Automated Compliance Testing Patterns
```python
# Compliance-as-Code: automated control testing
import subprocess, json, datetime

class ComplianceTest:
    def __init__(self, control_id, framework, description):
        self.control_id = control_id
        self.framework = framework
        self.description = description
        self.results = []

    def run_test(self, test_fn):
        start = datetime.datetime.utcnow()
        try:
            passed, evidence = test_fn()
            result = {
                "control_id": self.control_id,
                "timestamp": start.isoformat(),
                "duration_s": (datetime.datetime.utcnow() - start).total_seconds(),
                "passed": passed,
                "evidence": evidence
            }
        except Exception as e:
            result = {
                "control_id": self.control_id,
                "timestamp": start.isoformat(),
                "passed": False,
                "error": str(e)
            }
        self.results.append(result)
        return result

# Example control tests
def test_mfa_enforced():
    # Example: check if MFA is enforced for all users
    config = json.loads(subprocess.run(["cmd", "/c", "echo", '{"mfa":true}'], capture_output=True).stdout)
    return config["mfa"], {"mfa_config": config}

def test_encryption_at_rest():
    # Example: check if storage is encrypted
    config = {"encryption": "AES-256", "enabled": True}
    return config["enabled"], config

def test_access_reviews_current():
    # Example: check if access reviews completed within 90 days
    reviews = {"last_review": "2026-05-15", "completed": True}
    from datetime import datetime, timedelta
    last = datetime.fromisoformat(reviews["last_review"])
    current = last > (datetime.utcnow() - timedelta(days=90))
    return current, reviews

compliance_tests = [
    ComplianceTest("AC-1", "SOC2", "MFA enforced for all users"),
    ComplianceTest("ENC-1", "SOC2", "Encryption at rest enabled"),
    ComplianceTest("AC-2", "SOC2", "Access reviews within 90 days"),
]
```

### Security Control Mapping (YAML)
```yaml
# Unified control framework with framework overlays
unified_controls:
  access_control:
    uc-ac-1:
      description: Unique user identification and authentication
      soc2: CC6.1
      iso27001: A.9.4.2
      hipaa: "164.312(a)(1)"
      pci: "Req 8.3"
      gdpr: "Art. 32(1)(b)"
      evidence_source: idp_audit_log
      automation_level: fully_automated
      test_frequency: daily

    uc-ac-2:
      description: Role-based access control
      soc2: CC6.3
      iso27001: A.9.1.2
      hipaa: "164.312(a)(1)"
      pci: "Req 7.1"
      evidence_source: iam_role_assignment
      automation_level: fully_automated
      test_frequency: continuous

    uc-ac-3:
      description: Quarterly access reviews
      soc2: CC6.2
      iso27001: A.9.2.5
      hipaa: "164.308(a)(4)"
      pci: "Req 7.2"
      evidence_source: access_review_tool
      automation_level: semi_automated
      test_frequency: quarterly

  encryption:
    uc-enc-1:
      description: Data at rest encryption (AES-256)
      soc2: CC6.7
      iso27001: A.10.1.1
      hipaa: "164.312(a)(2)(iv)"
      pci: "Req 4.1"
      gdpr: "Art. 32(1)(a)"
      evidence_source: config_management_tool
      automation_level: fully_automated
      test_frequency: daily

    uc-enc-2:
      description: TLS for data in transit
      soc2: CC6.7
      iso27001: A.13.2.1
      hipaa: "164.312(e)(1)"
      pci: "Req 4.2"
      evidence_source: tls_scanner
      automation_level: fully_automated
      test_frequency: continuous
```

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

## Code Examples

### Control Mapping Automation (Python/YAML)
```yaml
controls:
  access-control:
    ac-1: { framework: soc2, ref: CC6.1, description: "Unique user IDs", evidence: idp_report }
    ac-2: { framework: soc2, ref: CC6.2, description: "Access reviews", evidence: access_review_log }
    ac-3: { framework: hipaa, ref: "164.312(a)(1)", description: "Unique user identification", evidence: idp_audit_log }
    ac-4: { framework: pci, ref: "Req 7", description: "Need-to-know access", evidence: access_control_list }

  encryption:
    enc-1: { framework: soc2, ref: CC6.7, description: "Encryption at rest", evidence: config_scan }
    enc-2: { framework: gdpr, ref: "Art 32", description: "Data protection measures", evidence: encryption_policy }
```

```python
# Automated evidence collector
import hashlib, json, datetime

class EvidenceCollector:
    def __init__(self, control_id, evidence_type):
        self.control_id = control_id
        self.evidence_type = evidence_type
        self.collected = []

    def snapshot_infra(self, config):
        evidence = {
            "control_id": self.control_id,
            "type": self.evidence_type,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "data": config,
            "hash": hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
        }
        self.collected.append(evidence)
        return evidence

    def log_export(self, log_entries, log_type="access"):
        evidence = {
            "control_id": self.control_id,
            "type": f"log_{log_type}",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "entries": len(log_entries),
            "first_entry": log_entries[0]["timestamp"] if log_entries else None,
            "last_entry": log_entries[-1]["timestamp"] if log_entries else None,
            "hash": hashlib.sha256(str(log_entries).encode()).hexdigest()
        }
        self.collected.append(evidence)
        return evidence

collector = EvidenceCollector("ac-1", "infra_config")
infra_state = {"iam_roles": 12, "mfa_enforced": True, "users": 145}
print(collector.snapshot_infra(infra_state))
```

### Gap Analysis Reporter (Markdown Template)
```markdown
# Compliance Gap Analysis - {Date}
## Framework: {SOC2/ISO27001/GDPR/HIPAA/PCI}

| Control ID | Description | Status | Gap | Severity | Owner | Remediation |
|------------|-------------|--------|-----|----------|-------|-------------|
| CC6.1      | Unique IDs  | ✅     | -   | -        | -     | -           |
| CC6.2      | Access Rev  | ⚠️     | No quarterly reviews | High | IAM Team | Implement auto-certification |
| CC7.1      | Vuln Mgmt   | ❌     | No automated scanning | Critical | Sec Team | Deploy CSPM |

### Risk Scoring
- Critical gaps (remediation < 30 days): {count}
- High gaps (remediation < 60 days): {count}
- Medium gaps (remediation < 90 days): {count}
- Low gaps (before audit): {count}

### Readiness Score: {85/100}
```

## Anti-Patterns

### Anti-Pattern 1: Compliance Theater
Implementing controls that look good in documentation but have no operational reality. Examples: writing an access control policy without enforcing MFA, having a password policy that allows `Password123!`, maintaining a runbook that no one follows. Auditors increasingly test operating effectiveness, not just design.

### Anti-Pattern 2: Point-in-Time Audit Prep
Scrambling for 6 weeks before the audit to collect evidence. This is stressful, error-prone, and creates a "cleanup" culture. Real compliance is 365-day continuous evidence collection with automated tooling.

### Anti-Pattern 3: Framework Proliferation
Adopting every framework the business touches leads to hundreds of overlapping controls without consolidation. Teams become overwhelmed and compliance fatigue sets in. Use a unified control framework with framework-specific overlays.

### Anti-Pattern 4: Ignoring the Shared Responsibility Model
Assuming the cloud provider's SOC2 certification covers your entire compliance scope. The provider is certified for the security OF the cloud, not security IN the cloud. Customer-configurable controls (access, encryption, logging) remain your responsibility.

### Anti-Pattern 5: Evidence Without Integrity
Screenshots and PDFs without timestamps or hashes can be challenged by auditors. Every evidence artifact should be timestamped, hashed, and stored immutably. Automated collection from source systems is more credible than manual exports.

## Case Studies

### Case Study 1: SOC2 Type II in 6 Months
A SaaS startup needed SOC2 Type II for an enterprise customer within 6 months. Using an automated compliance platform, they mapped 120 controls, implemented 35 new technical controls, and automated evidence collection for 80% of controls. The internal readiness assessment at T-60 days identified 12 gaps which were remediated by T-14 days. The Type II audit passed with zero findings. Total compliance program cost: under $50K.

### Case Study 2: Multi-Framework Alignment
A healthcare SaaS company needed SOC2 + HIPAA + GDPR compliance simultaneously. By defining a unified control framework (270 controls total) with framework-specific overlays, they eliminated duplicate evidence collection. Each control had a primary framework mapping and cross-reference to other frameworks. The combined audit program cost 30% less than three separate programs. Audit burden reduced from 6 weeks to 3 weeks.

### Case Study 3: Failed Audit Recovery
A fintech company failed their SOC2 Type II audit due to insufficient access control evidence. Gap analysis showed access reviews were conducted but not documented with sign-offs, and termination procedures were not consistently followed. The remediation program implemented automated access review workflows, termination verification, and quarterly reporting. The re-audit passed with one low-severity finding.

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
  - references/compliance-incident-response.md -- Compliance Incident Response and Breach Notification
## Handoff
For remediation implementation, hand off to `enterprise-sla-management` for tracking remediation SLAs, or `enterprise-cost-governance` for budgeting remediation costs.
