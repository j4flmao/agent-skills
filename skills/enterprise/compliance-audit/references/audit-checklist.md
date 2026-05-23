# Audit Checklist

## Audit Preparation

### Pre-Audit Tasks
- [ ] Identify applicable frameworks (SOC2, HIPAA, PCI, GDPR, SOX)
- [ ] Define audit scope (systems, data, processes included)
- [ ] Assemble evidence repository
- [ ] Assign owners per control
- [ ] Review previous audit findings
- [ ] Run self-assessment against control matrix

### Evidence Collection
```
Policy Documents: Current versions, approval dates, review cycles
System Configs: Access logs, encryption settings, backup configs
Process Evidence: Change tickets, incident reports, access reviews
Training Records: Completion rates, dates, content versions
```

## Control Categories

### Access Control
- [ ] Role-based access control (RBAC) implemented
- [ ] Least privilege principle enforced
- [ ] Access reviews conducted quarterly
- [ ] Default-deny policies in place
- [ ] MFA enforced for privileged access
- [ ] Service accounts inventoried and reviewed
- [ ] Temporary access has expiration

### Data Protection
- [ ] Encryption at rest (AES-256) enabled
- [ ] Encryption in transit (TLS 1.3) configured
- [ ] Key management system in place
- [ ] Data classification labels applied
- [ ] Data retention schedules enforced
- [ ] Secure deletion capabilities verified
- [ ] Backup encryption verified

### Incident Response
- [ ] Incident response plan documented
- [ ] Roles and contact lists current
- [ ] Detection tools configured and monitored
- [ ] Escalation procedures defined
- [ ] Post-incident review process established
- [ ] Tabletop exercises conducted quarterly

### Change Management
- [ ] Change approval process defined
- [ ] Emergency change procedure documented
- [ ] Separation of duties for production changes
- [ ] Change records retained per policy
- [ ] Automated deployment with approval gates

## Control Testing

### Testing Methods
```
Inquiry: Interview process owners
Observation: Watch process execution
Inspection: Review documents and logs
Re-performance: Re-execute control steps
Automated: Scripted control validation
```

### Sampling Guidelines
```
Annual volume < 100: Test all
Annual volume 100-500: Test 25
Annual volume 500-2000: Test 40
Annual volume > 2000: Test 50
```

## Audit Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Planning | 2 weeks | Scope, timeline, evidence request list |
| Evidence Collection | 3 weeks | Control evidence uploaded |
| Testing | 2 weeks | Test results, gap analysis |
| Remediation | 2 weeks | Fix identified gaps |
| Reporting | 1 week | Final report, management letter |
| Closure | 1 week | Remediation evidence, sign-off |

## Common Findings

| Finding | Severity | Typical Root Cause |
|---------|----------|-------------------|
| Incomplete access reviews | Medium | No automated review tool |
| Missing encryption on dev data | Low | No policy enforcement in dev |
| Stale service accounts | Medium | No regular review process |
| Untested backup restoration | High | No scheduled restore tests |
| Outdated incident response plan | Medium | No periodic review cycle |
| Missing change approvals | Medium | Emergency bypass without tracking |

## Auditor Communication

### Evidence Requests
```
Respond within: 2 business days
Format: PDF or access-controlled link
Naming: {control-id}_{evidence-type}_{date}
Coverage: Include time period in scope
```

### Common Questions
- "Who has access to production data?"
- "How are encryption keys managed?"
- "What is the backup retention period?"
- "How do you detect and respond to incidents?"
- "How are changes reviewed and approved?"
