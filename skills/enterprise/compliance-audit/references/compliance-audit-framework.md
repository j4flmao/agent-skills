# Compliance Audit Framework Reference

## Overview

This reference provides a comprehensive framework for managing compliance audits across multiple regulatory standards. It covers framework selection, control mapping, evidence management, audit preparation, and continuous compliance monitoring. Designed to support SOC2, ISO 27001, GDPR, HIPAA, PCI-DSS, and custom compliance frameworks.

## Compliance Framework Selection

### Framework Comparison

| Framework | Industry | Scope | Control Count | Audit Cycle | Certification |
|-----------|----------|-------|---------------|-------------|---------------|
| SOC2 Type II | Technology, SaaS | Security, Availability, Confidentiality, Privacy, Processing Integrity | 50-150 (varies by trust service criteria) | Annual (minimum 6-month period) | Auditor attestation report |
| ISO 27001 | All industries | Information Security Management System (ISMS) | 114 controls (Annex A) | Annual surveillance, 3-year recertification | Formal certification |
| GDPR | Any processing EU personal data | Data protection, privacy, data subject rights | 99 articles | Ongoing, documented compliance | No formal certification (codes of conduct) |
| HIPAA | Healthcare, health data | Privacy, Security, Breach Notification | 42 standards (164.x) | Periodic review, incident-driven | No formal certification |
| PCI-DSS | Payment card processing | Cardholder data protection | 250+ requirements (v4.0) | Annual (quarterly scans) | Formal validation (SAQ or ROC) |
| SOX | Public companies | Financial reporting controls | Varies by company | Annual | Auditor attestation |
| FedRAMP | US government cloud | Cloud security | 325+ controls (baseline) | Annual, 3-year reauthorization | Formal authorization |

### Selection Decision Tree

1. What data do you process?
   - EU personal data -> GDPR
   - Health information -> HIPAA
   - Payment card data -> PCI-DSS
   - No regulated data -> SOC2 or ISO 27001 (customer-driven)

2. Who are your customers?
   - Enterprise customers -> SOC2 Type II (most common requirement)
   - Government -> FedRAMP
   - EU -> ISO 27001 + GDPR compliance
   - Healthcare -> HIPAA + SOC2

3. What is your business model?
   - SaaS/Cloud -> SOC2 (trust services criteria)
   - Financial reporting -> SOX
   - Managed services -> ISO 27001 (certification value)
   - Payment processing -> PCI-DSS

4. Multiple frameworks?
   - Start with SOC2 (most flexible, covers common controls)
   - Add framework-specific overlays
   - Use unified control framework approach

### Unified Control Framework Approach

When operating under multiple frameworks, use a unified control framework:

1. Map all controls from each framework into a single taxonomy
2. Identify overlapping controls (access control appears in all frameworks)
3. Design one control that satisfies multiple framework requirements
4. Tag controls with their primary framework and cross-references
5. Maintain evidence that satisfies all applicable frameworks

Example unified control: Access Control
```
Control ID: AC-01
Control Name: Access Provisioning and Deprovisioning
Description: User access is provisioned based on least privilege and revoked upon termination

Framework Mapping:
  SOC2: CC6.1, CC6.2
  ISO 27001: A.9.1.2, A.9.2.1, A.9.2.6
  HIPAA: 164.312(a)(1)
  PCI-DSS: 7.1, 7.2, 8.1
  GDPR: Art 32(1)(b)

Evidence:
  - Access request process (policies/procedures)
  - Access provisioning logs (1 month)
  - Quarterly access review records
  - Termination checklist with timestamps
  - Privileged access audit logs
```

## Control Categories and Implementation

### Access Control (Cross-framework)

Controls: Least privilege, role-based access, MFA, access reviews, session management, privileged access management (PAM).

Implementation patterns:
- Role-based access control (RBAC) in application and infrastructure
- Single sign-on (SSO) with SAML/OIDC for all systems
- Just-in-time (JIT) access for privileged accounts
- Privileged access management (PAM) to vault and rotate credentials
- Automated access reviews: schedule quarterly, track certifications
- Termination automation: deprovision accounts within 24 hours of offboarding

Evidence automation:
- IdP access logs (SSO provider)
- PAM session recordings and access requests
- Access review completion records
- Termination script execution logs

### Encryption and Key Management (Cross-framework)

Controls: Encryption at rest (AES-256), encryption in transit (TLS 1.2+), key management, certificate lifecycle.

Implementation patterns:
- TLS everywhere: configure minimum TLS 1.2, prefer 1.3
- Encrypt all storage volumes (EBS encryption-by-default)
- Database encryption (TDE or application-level, AES-256)
- Key management with HSM or cloud KMS
- Automated certificate renewal (ACME/LetsEncrypt or cert-manager)
- Secrets management: Vault, AWS Secrets Manager, Azure Key Vault

Evidence automation:
- TLS configuration scans (Qualys, Mozilla Observatory)
- Encryption-at-rest verification (cloud config rules)
- Certificate expiry monitoring dashboard
- KMS key rotation logs

### Logging and Monitoring (Cross-framework)

Controls: Audit logging, log retention, security monitoring, SIEM integration, alerting.

Implementation patterns:
- Centralized logging to SIEM (Splunk, ELK, Sentinel)
- Audit logs: admin actions, data access, config changes
- Log retention: 90 days hot, 365 days warm, 6+ years cold
- Immutable log storage (append-only, no deletion)
- Security alerts for: failed auth, privilege escalation, data egress
- Scheduled log reviews (automated pattern detection)

Evidence automation:
- SIEM health dashboard (logs ingested, retention, alerting)
- Failed login reports
- Admin action audit logs
- Log retention verification (automated query)
- Alert response time tracking

### Change Management (SOC2, ISO 27001, PCI)

Controls: Change approval, separation of duties, emergency change process, back-out procedures.

Implementation patterns:
- CI/CD pipeline with peer review
- Change Advisory Board (CAB) for significant changes
- Emergency change process with post-hoc review
- Change tracking in ticketing system (must link to request)
- Production access restricted and audited
- Configuration management via IaC (Terraform, CloudFormation)

Evidence automation:
- Change request log from ticketing system
- CI/CD deployment audit trail
- Emergency change records with after-action review
- IaC state change history
- Production access session logs

### Incident Response (All frameworks)

Controls: Incident response plan, tested annually, documented procedures, communication plan.

Implementation patterns:
- Incident response runbook for each severity level
- Security incident classification matrix
- On-call rotation and escalation procedures
- Communication templates (internal, customer, regulatory)
- Post-incident review process within 5 business days

Evidence automation:
- Incident log from ticketing system
- Incident timeline documentation
- Post-incident review records
- Annual tabletop exercise report
- Communication logs during incidents

## Audit Preparation and Execution

### Audit Preparation Timeline

```
T-12 months: Select framework and audit firm (if new engagement)
T-90 days: Confirm audit scope. Update system description.
T-60 days: Internal readiness assessment. Remediate gaps.
T-45 days: Assemble evidence package. Run mock auditor interviews.
T-30 days: Pre-audit walkthrough with all stakeholders.
T-14 days: Validate evidence accessibility for auditors.
T-7 days: Pre-brief executive leadership. Confirm schedule.
T-0: Audit kickoff meeting.
```

### Evidence Package Organization

Organize evidence by control structure:

```
Evidence Package: SOC2 Type II - January 2025
  /Control-Catalog
    /CC6.1-Access-Control
      /Policies
        - access-control-policy-v2.1.pdf (signed, dated)
      /Procedures
        - user-provisioning-sop.md
        - access-review-process.md
      /Evidence
        - access-review-q4-2024.csv (completed reviews)
        - user-provisioning-logs-202501.csv
        - termination-audit-202501.csv
        - idp-mfa-enforcement-report.pdf
    /CC7.2-Change-Management
      /Policies
        - change-management-policy-v2.3.pdf
      /Procedures
        - ci-cd-deployment-process.md
        - emergency-change-process.md
      /Evidence
        - change-tickets-202501.csv
        - emergency-change-reviews-202501.csv
        - ci-cd-deployment-log-202501.csv
```

### Evidence Collection Automation Script

```python
# collect_evidence.py - automated evidence collection for compliance
import boto3
import json
import hashlib
from datetime import datetime

def collect_access_control_evidence():
    """Collect access control evidence for SOC2/ISO controls."""
    iam = boto3.client('iam')
    identitystore = boto3.client('identitystore')

    evidence = {
        "collection_date": datetime.utcnow().isoformat(),
        "control_mapping": "SOC2 CC6.1, ISO A.9",
        "artifacts": []
    }

    # 1. Collect IAM user list and last activity
    users = iam.list_users()
    evidence["artifacts"].append({
        "type": "iam_user_report",
        "data": users,
        "hash": hashlib.sha256(json.dumps(users, default=str).encode()).hexdigest()
    })

    # 2. Collect active access key ages
    access_keys = []
    for user in users['Users']:
        keys = iam.list_access_keys(UserName=user['UserName'])
        access_keys.extend(keys['AccessKeyMetadata'])

    evidence["artifacts"].append({
        "type": "access_key_age_report",
        "data": access_keys,
        "hash": hashlib.sha256(json.dumps(access_keys, default=str).encode()).hexdigest()
    })

    # 3. Export to evidence storage
    s3 = boto3.client('s3')
    s3.put_object(
        Bucket='compliance-evidence',
        Key=f"access-control/{datetime.utcnow().strftime('%Y-%m-%d')}/evidence.json",
        Body=json.dumps(evidence, default=str)
    )
    return evidence
```

## Continuous Compliance Monitoring

### Real-Time Compliance Dashboard

Monitor control status in real-time:

```yaml
dashboard: Continuous Compliance Status
controls:
  - id: AC-01 (Access Control)
    status: COMPLIANT
    last_verified: 2025-01-15T14:30:00Z
    evidence_count: 47
    automation: FULLY_AUTOMATED
  - id: ENC-01 (Encryption at Rest)
    status: COMPLIANT
    last_verified: 2025-01-15T14:30:00Z
    compliance_pct: 99.8
    non_compliant_resources: 3
    variance: "3 EBS volumes created without encryption (auto-remediated)"
  - id: LOG-01 (Audit Logging)
    status: NON_COMPLIANT
    last_verified: 2025-01-14T14:30:00Z
    issue: "Log shipping to SIEM delayed > 5 minutes"
    assigned_to: devops-team
```

### Automated Control Testing

Use policy-as-code to validate controls continuously:

```python
# compliance_tests.py
def test_encryption_at_rest():
    """
    Test that all EBS volumes have encryption enabled.
    Fails if any volume is unencrypted.
    """
    ec2 = boto3.client('ec2')
    violations = []
    volumes = ec2.describe_volumes(MaxResults=1000)

    for vol in volumes['Volumes']:
        if vol.get('Encrypted') is not True:
            if 'aws:' in vol.get('Tags', []) or 'amazon' in vol.get('Tags', []):
                continue  # skip AWS-managed volumes
            violations.append({
                'volume_id': vol['VolumeId'],
                'state': vol['State'],
                'size': vol['Size'],
                'attached': bool(vol.get('Attachments', [])),
                'tags': vol.get('Tags', [])
            })

    return violations  # empty list = compliant

def test_vpc_flow_logs():
    """
    Test that all VPCs have flow logs enabled.
    """
    violations = []
    ec2 = boto3.client('ec2')
    vpcs = ec2.describe_vpcs()

    for vpc in vpcs['Vpcs']:
        flow_logs = ec2.describe_flow_logs(
            Filters=[{'Name': 'resource-id', 'Values': [vpc['VpcId']]}]
        )
        if not flow_logs['FlowLogs']:
            violations.append(vpc['VpcId'])

    return violations
```

## Audit Engagement Management

### Auditor Selection Criteria

Factors for selecting an audit firm:
- Framework expertise: proven experience with your specific framework
- Industry knowledge: familiarity with your sector
- Team composition: qualified auditors (CISA, CISSP, QSA, etc.)
- Reference check: speak with 2-3 current clients
- Cultural fit: communication style, responsiveness
- Cost: scope-dependent, typically $30K-$150K for SOC2
- Conflict check: ensure no advisory conflicts

### Managing Auditor Requests

Establish a single point of contact (audit liaison) for all auditor requests:

- Respond to all requests within 24 hours (48 max)
- If evidence does not exist, say so honestly (do not fabricate)
- If you cannot provide evidence within the requested timeframe, communicate a realistic timeline
- Escalate unusual or out-of-scope requests to the audit lead
- Document every request and response in a tracker

Common auditor evidencing:
- Walkthroughs: Show the auditor how the control operates. Have a prepared script.
- Samples: Provide a representative sample (25-40 items for annual testing)
- Screenshots: Time-stamped, with system identification
- Reports: Generated from the system, not manually created
- Logs: Raw, unmodified, with retention verification

### Handling Auditor Findings

When the auditor identifies a finding:

1. Acknowledge finding and ask clarifying questions
2. Agree on severity classification
3. Request remediation timeline expectations
4. Implement remediation before final report if possible (for some frameworks)
5. Document remediation with evidence
6. Request the auditor verify closure

Finding severity:
- Deficiency: Control is not designed or operating effectively
- Significant Deficiency: More severe than a deficiency but not material
- Material Weakness: Could result in material misstatement

Response to findings:
- Create corrective action plan with owners and deadlines
- Implement remediation
- Re-test and provide evidence to auditor
- Report closure in next audit committee meeting

## Post-Audit Activities

### After-Action Review

Following each audit cycle:
1. What went well in the audit process?
2. What was difficult or stressful?
3. Where did evidence collection struggle?
4. What findings recurred from the previous audit?
5. How can next year's audit be more efficient?
6. What new controls are needed for the next year?

### Roadmap to Next Audit

Create a 12-month plan immediately after each audit:

```
Month 1-3: Remediate all audit findings
Month 1-6: Implement new controls per roadmap
Month 4-6: Automate evidence collection for new controls
Month 7-9: Internal readiness assessment
Month 10-11: Remediate pre-audit gaps
Month 12: Audit preparation and execution
```

### Continuous Improvement Metrics

Track year-over-year:
- Time to close audit (reduce X% each year)
- Number of findings (target: zero repeat findings)
- Evidence automation percentage (target: 80%+ automated)
- Internal readiness score (target: 95%+ before external audit)
- Cost per audit (aim to reduce as efficiency improves)
- Auditor relationship satisfaction (survey the team)
