# Compliance Frameworks Reference

## SOC 2 (Trust Services Criteria)

SOC 2 reports on controls related to the Trust Services Criteria: Security, Availability, Confidentiality, Processing Integrity, and Privacy.

### Audit Scope
```
Type I: Controls design at a point in time
Type II: Controls operating effectiveness over 6-12 months
Report duration: Typically 12 months with quarterly updates
```

### Trust Services Criteria
```
Security (Common Criteria CC1-CC9):
- CC1.x: Control Environment — integrity, ethical values, competence
- CC2.x: Communication — policies communicated, incident reporting
- CC3.x: Risk Assessment — identification, analysis, response
- CC4.x: Monitoring Activities — ongoing evaluations, remediation
- CC5.x: Control Activities — policies, procedures, segregation
- CC6.x: Logical/Physical Access — authentication, authorization, perimeter
- CC7.x: System Operations — monitoring, incident response, capacity
- CC8.x: Change Management — authorization, testing, approval
- CC9.x: Risk Mitigation — vendor management, business continuity

Availability (A1.x):
- Capacity planning, monitoring
- Incident handling and recovery
- Environmental protections

Confidentiality (C1.x):
- Data identification and classification
- Data access restrictions and encryption

Processing Integrity (PI1.x):
- Complete, accurate, and timely processing
- Quality assurance at processing stages

Privacy (P1-P5):
- Notice and consent (P1)
- Collection limited to purpose (P2)
- Retention and disposal (P3)
- Access to personal information (P4)
- Disclosure to third parties (P5)
```

### Evidence Collection for SOC 2
```
| Control Area | Evidence Required | Collection Method |
|-------------|------------------|-------------------|
| Logical Access | Access reviews, provisioning/deprovisioning logs | Automated from IdP |
| Change Management | Change tickets, approval records, test results | Ticketing system audit |
| Monitoring | Alert logs, incident reports, uptime dashboards | SIEM reports |
| Risk Assessment | Risk register, treatment plans, review minutes | Governance tooling |
| Vendor Management | Vendor risk assessments, contracts, SLAs | Vendor portal |
```

### SOC 2 Readiness Checklist
```
Set up logical access controls with SSO and MFA
Implement change management process with approval gates
Deploy monitoring and incident response
Define vendor management program
Conduct risk assessment
Document control descriptions
Run Type I readiness assessment
Remediate identified gaps
Begin Type II evidence collection period
```

## ISO 27001:2022

ISO 27001 specifies requirements for an Information Security Management System (ISMS).

### ISMS Requirements
```
Clause 4: Context of the organization
Clause 5: Leadership and commitment
Clause 6: Planning — risk assessment and treatment
Clause 7: Support — resources, competence, awareness
Clause 8: Operation — risk treatment, operational planning
Clause 9: Performance evaluation — monitoring, audit, review
Clause 10: Improvement — nonconformity, corrective action
```

### Annex A Controls (93 controls, 4 themes)
```
Organizational (A.5) — 37 controls:
- Information security policies (A.5.1)
- Information security roles (A.5.2)
- Segregation of duties (A.5.3)
- Supplier relationships (A.5.19-5.23)
- Incident management (A.5.24-5.26)

People (A.6) — 8 controls:
- Screening (A.6.1)
- Terms and conditions (A.6.2)
- Awareness and training (A.6.3)
- Disciplinary process (A.6.4)

Physical (A.7) — 14 controls:
- Physical security perimeters (A.7.1)
- Equipment security (A.7.9-7.10)
- Clear desk and screen (A.7.7-7.8)

Technological (A.8) — 34 controls:
- Access control (A.8.1-8.5)
- Cryptography (A.8.24)
- Vulnerability management (A.8.8)
- Logging and monitoring (A.8.15-8.16)
- Backup (A.8.13)
- Network security (A.8.20-8.22)
```

### ISO 27001 Certification Process
```
1. Gap analysis against Annex A controls
2. Risk assessment and treatment plan
3. Develop ISMS documentation (policies, procedures, SOA)
4. Implement controls
5. Internal audit
6. Management review
7. Stage 1 audit (documentation review)
8. Stage 2 audit (implementation verification)
9. Certification issued (valid 3 years)
10. Surveillance audits annually
```

## HIPAA Security Rule

### Safeguard Categories
```
Administrative Safeguards:
- Security management process (risk analysis, sanction policy)
- Security personnel (assigned security officer)
- Information access management (authorization, access establishment)
- Workforce training and management (security awareness, training)
- Security incident procedures (response, reporting)
- Contingency plan (backup, disaster recovery, emergency mode)
- Evaluation (periodic technical/nontechnical evaluation)
- Business associate contracts (BA agreements)

Physical Safeguards:
- Facility access controls (contingency operations, facility security)
- Workstation use and security
- Device and media controls (disposal, re-use, accountability)

Technical Safeguards:
- Access control (unique user ID, emergency access, automatic logoff)
- Audit controls (hardware, software, transactional logs)
- Integrity controls (mechanism to authenticate ePHI)
- Person or entity authentication
- Transmission security (integrity controls, encryption)
```

### HIPAA Audit Protocol
```
| Requirement | Evidence | Frequency |
|-------------|----------|-----------|
| Risk analysis | Completed risk assessment document | Annually |
| Security training | Training records, attendance logs | Upon hire, annually |
| Access logs | System access reports | Quarterly review |
| BA agreements | Signed BAAs for all vendors | Before data sharing |
| Incident response | Incident reports, post-mortems | Within 48 hours |
| Contingency tests | Test results, lessons learned | Annually |
```

## GDPR Compliance

### Key Articles
```
Article 5: Principles — lawfulness, fairness, transparency
Article 6: Lawful processing bases
Article 7: Consent conditions
Article 15: Data subject access rights
Article 17: Right to erasure (right to be forgotten)
Article 20: Data portability
Article 25: Data protection by design and default
Article 30: Records of processing activities
Article 32: Security of processing
Article 33: Breach notification (72 hours)
Article 35: Data protection impact assessment
Article 37: Data protection officer appointment
Article 46: International data transfers
```

### GDPR Audit Evidence
```
Processing activity records (Article 30)
Consent records with timestamps and opt-in evidence
DSAR log with response tracking
Data retention schedules and purge records
DPIA documents for high-risk processing
Breach notification records
Data processing agreements with processors
International transfer mechanism documentation (SCCs, BCRs)
Privacy notice versions and publication dates
Data protection officer appointment records
```

## PCI DSS v4.0

### Requirements by Objective
```
Build and Maintain Secure Network:
- Req 1: Firewall and network security controls
- Req 2: Secure configuration of systems

Protect Cardholder Data:
- Req 3: Protect stored cardholder data
- Req 4: Encrypt transmission over public networks

Maintain Vulnerability Management:
- Req 5: Anti-malware protection
- Req 6: Secure development and patch management

Implement Access Control:
- Req 7: Restrict access by business need-to-know
- Req 8: Identify and authenticate system access
- Req 9: Restrict physical access

Monitor and Test Networks:
- Req 10: Log and monitor all access
- Req 11: Regular security testing

Maintain Information Security Policy:
- Req 12: Organizational security policies
```

### SAQ Types
```
SAQ A: Card-not-present merchants, all functions outsourced
SAQ B: Imprint or standalone dial-out terminals
SAQ C: Payment application systems connected to internet
SAQ D: All other merchants and service providers
SAQ P2PE: Validated P2PE solution users
```

### PCI Audit Evidence
```
Network diagrams with CDE boundaries
Vulnerability scan reports (internal and external)
Penetration test reports (annually and after changes)
Access control lists and review records
Incident response plan and test results
Security awareness training records
Quarterly ASV scan passing reports
Firewall rule review documentation
Change management records for CDE systems
Data retention and disposal procedures
```

## Evidence Collection Best Practices

### Automatable Evidence
```
System configuration snapshots
Access log exports
Vulnerability scan results
Patch compliance reports
User access review status
Backup verification reports
Monitoring alert records
Intrusion detection logs
```

### Manual Evidence Requirements
```
Policies must be version-controlled with approval dates
Procedures must include step-by-step instructions with screenshots
Training records must include attendee lists and dates
Meeting minutes must include attendees, decisions, action items
Risk assessments must include methodology, findings, remediation
Vendor assessments must include contracts, SOC reports, due diligence
```
