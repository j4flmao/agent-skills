# Compliance Incident Response

## Overview
Security incidents have compliance implications that go beyond technical remediation. Breach notification deadlines, evidence preservation, regulatory reporting, and audit impacts must be managed alongside the technical response. This reference covers compliance-aware incident response.

## Breach Notification Requirements by Framework

### Notification Timelines
| Framework | Trigger | Notification Deadline | Notify Whom |
|-----------|---------|---------------------|-------------|
| GDPR Art. 33 | Personal data breach | 72 hours | Supervisory authority |
| GDPR Art. 34 | High risk to rights | Without undue delay | Data subjects |
| HIPAA Breach Rule | Unsecured PHI breach | 60 days | HHS + affected individuals |
| PCI DSS Req. 12.10.1 | Cardholder data incident | Immediately | Acquirer + card brands |
| CCPA | Personal information breach | Without undue delay | California residents |
| SEC (public companies) | Material cybersecurity incident | 4 business days | SEC (Form 8-K) |
| State breach laws (US) | Personal information | Varies (30-60 days) | State AG + affected |

### Determining Notification Triggers
- GDPR: Personal data breach = breach of security leading to access/alteration/loss of personal data. Notification required unless data is encrypted and key not compromised.
- HIPAA: Breach of unsecured PHI. Risk assessment determines probability of compromise: (1) nature of data, (2) who accessed, (3) whether data was actually acquired, (4) mitigation.
- PCI: Any incident involving cardholder data. Notify acquirer immediately. Preserve evidence for forensic investigation.

## Evidence Preservation for Compliance

### Forensic Evidence Collection
During incident response, evidence must be preserved in a forensically sound manner:
- Create bit-for-bit disk images (not just file copies)
- Capture memory before powering down
- Record chain of custody for all evidence
- Timestamp and hash all evidence artifacts
- Store evidence on write-once media
- Document every action taken during investigation

### Legal Hold
When litigation or regulatory action is reasonably anticipated, issue a legal hold notice. Preserve all relevant data: logs, emails, messages, documents, database snapshots. Suspend normal data retention/deletion policies for held data. Monitor compliance with hold.

## Compliance During Incident Response

### Incident Classification for Compliance
| Classification | Description | Compliance Actions |
|---------------|-------------|-------------------|
| Security Incident | Any adverse event | Log, investigate per policy |
| Data Breach | Confirmed unauthorized data access | Legal notification, regulatory reporting |
| Privacy Incident | Personal data mishandled | DPO notification, risk assessment |
| Compliance Incident | Control failure discovered | Internal reporting, control remediation |
| Criminal Incident | Laws violated | Law enforcement notification |

### Compliance Checklist During Incident
1. [ ] Preserve all evidence (logs, memory, disk images)
2. [ ] Document timeline of events and actions taken
3. [ ] Determine if breach notification is required
4. [ ] Notify DPO/privacy officer immediately
5. [ ] Engage legal counsel before external communications
6. [ ] Initiate legal hold on relevant data
7. [ ] Prepare regulatory notification (within timeline)
8. [ ] Conduct post-incident compliance review
9. [ ] Update risk assessment and control documentation
10. [ ] Report to board/executives as required

### Communication with Regulators
- Have a pre-approved communication template for each applicable regulator
- Designate a single point of contact for regulatory communication
- Legal counsel reviews all regulatory communications before sending
- Provide facts, not speculation. If details are unknown, state that investigation is ongoing.
- Document all communications with regulators.

## Compliance Impact of Incidents

### Audit Impacts
A security incident during an audit period affects the audit:
- Control failures observed during the incident may be audit findings
- Evidence of incomplete incident response (missed notification deadlines) is a finding
- Post-incident improvements demonstrate good governance
- Full disclosure to auditors is required (concealment is worse than the incident)

### Remediation Requirements
Post-incident, compliance frameworks require:
- Root cause analysis (RCA) documented
- Remediation actions implemented and verified
- Controls updated to prevent recurrence
- Lessons learned shared with relevant teams
- Board/management notification as required by policy

## Integration with Incident Response Plan

### Compliance Review in Incident Process
The incident response plan must include compliance checkpoints:
1. Detection: Is this a reportable incident? (Compliance + Security assess)
2. Containment: Preserve evidence per forensic standards
3. Investigation: Document timeline, root cause, data accessed
4. Notification: Legal determines regulatory notification requirements
5. Recovery: Verify controls restored to compliant state
6. Post-mortem: Compliance review of incident handling

### Training Requirements
Incident responders must be trained on:
- Breach notification triggers per applicable frameworks
- Evidence preservation procedures
- Legal hold process
- Communication restrictions (no speculation, no external statements without approval)
- Documentation requirements for compliance evidence

## Key Points
- Breach notification deadlines are non-negotiable — know your timelines before an incident
- Evidence preservation is a compliance requirement, not just a technical best practice
- Legal counsel must be engaged before any external communication about an incident
- Post-incident compliance review is mandatory for maintaining certification
- Incident response training must include compliance awareness for all responders
- Full disclosure of incidents to auditors is required — concealment risks certification revocation
- Pre-approved communication templates for regulators save critical time during an incident