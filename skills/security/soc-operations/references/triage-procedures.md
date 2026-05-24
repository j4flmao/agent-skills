# Alert Triage Procedures

## Triage Taxonomy

### Alert Categories
| Category | Description | Examples |
|----------|-------------|----------|
| Malware Detection | Malicious software identified | EDR alert, AV detection, sandbox result |
| Network Anomaly | Unusual network behavior | Beaconing, data exfiltration, port scan |
| Authentication Anomaly | Unusual login activity | Brute force, impossible travel, off-hours |
| Account Compromise | Credential theft indicators | Suspicious privilege use, lateral movement |
| Phishing | Email-based attack | Reported phishing, malicious URL click |
| Policy Violation | Security policy breach | USB usage, unauthorized software, P2P |
| Data Leakage | Unauthorized data movement | Large file transfer, DLP alert |
| Vulnerability Exploit | Known CVE exploitation | Exploit attempt, suspicious payload |
| Insider Threat | Malicious/accidental insider | Privilege abuse, data destruction |
| Physical Security | Physical access issues | Badge bypass, tailgating, unauthorized entry |

### Triage Priority Matrix
```
              │ Criticality
              │ Low    Med    High   Critical
──────────────┼───────────────────────────
Confidence    │
  Low         │ L1     L2     L3     L3
  Medium      │ L1     L2     L2     L3
  High        │ L1     L1     L2     L2
  Confirmed   │ L1     L1     L1     L2
```

## Severity Classification

### Severity Definitions

**Critical (SEV-1):**
- Active, confirmed compromise with business impact
- Ransomware encryption in progress
- Data exfiltration actively occurring
- Critical system availability impacted
- Regulatory breach (PII/PHI exposure confirmed)
- Email: Response required within 15 minutes

**High (SEV-2):**
- Confirmed malware without encryption
- Credential theft with evidence of lateral movement
- Phishing with confirmed credential submission
- Suspicious privileged account activity
- Email: Response required within 30 minutes

**Medium (SEV-3):**
- Potential malware (unconfirmed)
- Brute force attack (blocked, no compromise)
- Single endpoint anomaly
- Policy violation by non-privileged user
- Email: Response required within 4 hours

**Low (SEV-4):**
- Informational alerts
- Policy violation without data loss
- Low-confidence detections
- Email: Response required within 24 hours

### Severity Calculation Factors
| Factor | Weight | Low (0) | Med (1) | High (2) | Critical (3) |
|--------|--------|---------|---------|----------|--------------|
| Asset criticality | ×3 | General | Business | Confidential | Critical |
| User privilege | ×2 | Standard | Power user | Admin | Domain Admin |
| Confidence | ×2 | < 30% | 30-60% | 60-90% | > 90% |
| Impact scope | ×3 | Single user | Multiple users | Department | Organization |
| Threat intel | ×1 | No match | Known TTP | Active campaign | Zero-day |

## Triage SLA

| Severity | Initial Triage | Containment Decision | Escalation | Closure |
|----------|---------------|---------------------|------------|---------|
| Critical | < 15 min | < 30 min | Immediate | < 4 hours |
| High | < 30 min | < 1 hour | < 30 min | < 8 hours |
| Medium | < 4 hours | < 8 hours | < 2 hours | < 48 hours |
| Low | < 24 hours | N/A | < 8 hours | < 7 days |

### SLA Breach Actions
| Severity | First Breach | Second Breach | Third Breach |
|----------|--------------|---------------|--------------|
| Critical | Auto-escalate to SOC Lead | Auto-escalate to SOC Manager | Pager duty escalation |
| High | Notify SOC Lead | Auto-escalate to SOC Lead | SOC Manager notification |
| Medium | SOC Lead weekly review | Process review | N/A |
| Low | Monthly review | N/A | N/A |

## Initial Investigation Steps

### T1 Triage Checklist

**1. Verify Alert**
- Is this a known false positive? Check runbook and suppression list
- Is severity correctly assigned? Recalculate if needed
- Review raw log/alert source for context

**2. Entity Identification**
- What user is involved? Check AD status, recent activity
- What host is involved? Check asset criticality, recent events
- What IP(s) are involved? Check reputation, geo, internal/external

**3. Quick Enrichment**
- File hash → VirusTotal / sandbox check
- IP/Domain → Reputation check
- User → HR status (active, offboarding, terminated)
- Asset → CMDB (criticality, owner, patch status)

**4. Scope Assessment**
- Single host or multiple affected?
- Single user or department-wide?
- Timeframe: When did activity start?
- Has lateral movement occurred?

**5. Initial Decision**
- Benign → Close with documentation
- Suspicious → Escalate to T2 with notes
- Malicious → Execute containment, escalate

### T1 Investigation Tools
| Need | Tool | What to Check |
|------|------|---------------|
| User status | AD, HR system | Active, disabled, terminated, on leave |
| Asset info | CMDB, EDR | Criticality, owner, patch status, running processes |
| IP reputation | VT, AbuseIPDB | Malicious score, category, reports |
| File analysis | Sandbox, VT | Detection ratio, behavior, IoCs |
| Historical activity | SIEM | Related events, alerts on same entities |
| Network context | Firewall, Proxy | Blocked/allowed traffic, policy violations |

## Escalation Criteria

### T1 → T2 Escalation
- Confirmed malware on a host
- Credential theft or account compromise
- Multiple related alerts (alert storm)
- User/asset is critical or privileged
- Phishing with confirmed credential submission
- Network beaconing or C2 communication
- Any alert requiring containment actions

### T2 → T3 Escalation
- Ransomware or destructive malware
- Advanced persistent threat indicators
- Evidence of nation-state actor TTPs
- Root cause not identifiable after 4 hours
- Custom malware requiring reverse engineering
- Incident with major business impact
- Legal/regulatory notifiable incident

### Communication Templates

**Escalation Notification:**
```
INCIDENT: INC-{ID}
SEVERITY: {SEV-1/2/3}
TYPE: {Category}
TIME DETECTED: {Timestamp}
AFFECTED ENTITIES: {Users, Hosts, Systems}
INITIAL FINDINGS: {Summary of evidence}
ACTIONS TAKEN: {Containment, investigation steps}
NEXT STEPS: {Pending actions, requests}
ESCALATED BY: {Analyst name}
```

**Shift Handover:**
```
SHIFT: {Start} → {End}
OPEN INCIDENTS: {#}
  - INC-{ID}: {Severity} — {Status} — {Summary}
NEW ALERTS TODAY: {#}
  - {Type}: {Action Taken (closed, contained, escalated)}
PENDING ACTIONS: {Next steps for open cases}
NOTES: {Tool issues, ongoing incidents, points of interest}
```

## False Positive Management

### FP Handling Workflow
1. Analyst identifies FP during triage
2. Tag the alert as "confirmed_false_positive"
3. Add comment explaining why it's an FP
4. Submit tuning request to detection engineering
5. Close alert with FP disposition
6. Include in weekly FP review

### FP Categories
| Code | Description | Example |
|------|-------------|---------|
| FP-CONFIG | Log source misconfiguration | Wrong severity in source |
| FP-EXPECTED | Known-expected behavior | Admin running approved scripts |
| FP-RULE | Rule logic too broad | False match on common pattern |
| FP-BASELINE | Baseline changed | New application deployed |
| FP-TEST | Confirmed test activity | Red team or security test |
| FP-TOOL | Tool conflict/interference | AV scanning EDR process |

## T1 Analyst Quality Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Alerts triaged per shift | 30-50 | Alert count / shift |
| Triage accuracy | > 90% | Correctly classified vs reviewed |
| Mean triage time (per alert) | < 10 min | Time from assign to disposition |
| Escalation accuracy | > 85% | Correct escalations vs total |
| Documentation quality | > 80% | Peer review score |
| FP identification rate | > 95% | FPs correctly identified |
