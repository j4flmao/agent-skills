# SOC Operations Fundamentals

## Overview
A Security Operations Center (SOC) is a centralized team responsible for monitoring, detecting, analyzing, and responding to cybersecurity incidents. SOC operations cover people, processes, and technology working together to protect an organization's assets 24/7.

## Core Concepts

### Concept 1: SOC Team Roles
| Role | Level | Responsibilities |
|------|-------|-----------------|
| SOC Analyst (Tier 1) | Junior | Monitor alerts, triage, initial investigation, escalate |
| SOC Analyst (Tier 2) | Senior | Deep investigation, incident analysis, threat hunting |
| SOC Engineer (Tier 3) | Expert | Advanced forensics, reverse engineering, tool tuning |
| SOC Manager | Leadership | Team management, reporting, process improvement |
| Threat Hunter | Specialist | Proactive search for hidden threats, hypothesis-driven |
| Detection Engineer | Specialist | Rule writing, detection logic, tool optimization |

### Concept 2: Alert Triage Process
1. **Acknowledge**: Claim the alert within SLA (1-5 minutes for critical)
2. **Validate**: Is this a true positive or false positive?
3. **Enrich**: Gather context — asset owner, criticality, related events, threat intel
4. **Prioritize**: Determine severity based on impact and urgency
5. **Contain**: Stop the attack from spreading
6. **Investigate**: Root cause analysis
7. **Remediate**: Remove threat, restore systems
8. **Report**: Document findings and actions

### Concept 3: SOC Service Tiers
- **MSSP (Managed Security Service Provider)**: Third-party SOC, cost-effective, limited context
- **Internal SOC**: In-house team, deep organizational knowledge, higher cost
- **Co-managed SOC**: Hybrid — internal team with MSSP support for after-hours
- **Virtual SOC**: Distributed team across time zones, 24/7 coverage

### Concept 4: Key SOC Metrics
- **MTTD (Mean Time to Detect)**: Time from compromise to detection
- **MTTR (Mean Time to Respond)**: Time from detection to containment/remediation
- **Alert volume**: Number of alerts per day/week/month
- **False positive rate**: % of alerts that are not real incidents
- **Escalation rate**: % of alerts escalated to Tier 2/3
- **SLA compliance**: % of alerts triaged within SLA

## Implementation Guide

### Step 1: Shift Handover Template
```yaml
shift_handover:
  date: "2026-06-19"
  shift_start: "06:00 UTC"
  shift_end: "14:00 UTC"
  analyst: "John Smith"

  summary:
    total_alerts_received: 47
    true_positives: 12
    false_positives: 32
    escalated: 3
    open_incidents: 2

  critical_incidents:
    - id: "INC-2026-00142"
      title: "Phishing Campaign - Fake O365"
      severity: CRITICAL
      status: "Containment in progress"
      current_analyst: "John Smith"
      next_steps: "Continue user containment, escalate to IT for password reset"

  noteworthy_events:
    - "Port scan detected from 45.33.32.156 — auto-blocked by firewall"
    - "OWA brute force attempt on 5 user accounts — all blocked"
    - "DLP alert on file upload to personal Gmail — denied"

  open_actions:
    - "Follow up on firewall rule change request FR-2026-0089"
    - "Update watchlist with new IoCs from intel feed"
    - "Document phishing incident for weekly report"

  tools_status:
    SIEM: "OK — 98.2% log ingestion"
    EDR: "OK — all endpoints reporting"
    Mail_Security: "Degraded — 2/4 scanners online, ticket EX-2026-0101 open"
    FW: "OK"
    SOAR: "OK"
```

### Step 2: Incident Severity Matrix
```yaml
severity_matrix:
  CRITICAL:
    description: "Active compromise of critical systems or data"
    response_sla: "2 minutes acknowledge, 15 minutes containment"
    examples:
      - "Ransomware outbreak"
      - "Active data exfiltration"
      - "Domain admin compromise"
      - "Payment system breach"
    notification: ["SOC Manager", "CISO", "Legal", "Exec"]

  HIGH:
    description: "Active threat with potential for significant damage"
    response_sla: "5 minutes acknowledge, 30 minutes containment"
    examples:
      - "Phishing campaign with successful compromise"
      - "Privilege escalation detected"
      - "Malware outbreak on non-critical systems"
      - "Extensive credential theft"
    notification: ["SOC Manager", "Security Engineering"]

  MEDIUM:
    description: "Suspicious activity with limited evidence of compromise"
    response_sla: "15 minutes acknowledge, 4 hours investigation"
    examples:
      - "Single endpoint with suspicious behavior"
      - "Failed brute force attempts"
      - "Policy violation"
      - "Single user phishing click"
    notification: ["SOC Lead"]

  LOW:
    description: "Informational or compliance-related event"
    response_sla: "60 minutes acknowledge, 24 hours investigation"
    examples:
      - "User attempted to access blocked website"
      - "USB device connected"
      - "Scheduled scan completed"
      - "System with missing security update"
    notification: ["Ticket system only"]
```

### Step 3: Communication Templates
```markdown
# IR Communication Template

**Subject**: [SEVERITY] Incident INC-YYYY-NNNNN - Brief Title

**Summary**: What happened, when, affected systems

**Current Status**: Contained / Investigating / Remediating / Resolved

**Actions Taken**:
- [ ] Alert acknowledged at HH:MM UTC
- [ ] Immediate containment verified at HH:MM UTC
- [ ] Root cause identified: X
- [ ] Remediation plan: Y

**Next Update**: Expected within 1-2 hours (Critical) / EOD (High)

**Contact**: SOC Lead: Name / Phone / Email
```

### Step 4: SOC Runbook Example (Ransomware)
```yaml
runbook:
  name: "Ransomware Containment"
  severity: "CRITICAL"
  steps:
    - id: "1"
      action: "Isolate affected endpoint(s) from network"
      command: "EDR isolate or disable switch port"
      owner: "Tier 1"

    - id: "2"
      action: "Disable user account(s)"
      command: "Disable AD account, revoke sessions"
      owner: "Tier 1"

    - id: "3"
      action: "Identify scope — which systems are affected?"
      command: "Check EDR logs for lateral movement indicators"
      owner: "Tier 2"

    - id: "4"
      action: "Preserve evidence — snapshot affected systems"
      command: "Create disk snapshot, collect memory dump"
      owner: "Tier 2"

    - id: "5"
      action: "Block C2 infrastructure at firewall"
      command: "Block known malicious domains/IPs"
      owner: "Tier 2"

    - id: "6"
      action: "Notify SOC Manager and CISO"
      owner: "Tier 2"

    - id: "7"
      action: "Engage IR retainer (if applicable)"
      owner: "SOC Manager"

    - id: "8"
      action: "Begin forensics investigation"
      command: "Analyze entry vector, persistence mechanism, data exfil"
      owner: "Tier 3"

    - id: "9"
      action: "Remediate — remove malware, restore from clean backup"
      owner: "Tier 3 + IT"

    - id: "10"
      action: "Post-incident review — document lessons learned"
      owner: "SOC Manager"
```

## Best Practices
- Define clear severity matrix with SLAs for each level
- Document triage process and escalation criteria
- Use shift handover templates for seamless transition
- Maintain runbooks for common incident types
- Automate alert enrichment to reduce analyst workload
- Conduct regular tabletop exercises and drills
- Implement continuous training and skills development
- Track SOC metrics for continuous improvement
- Build relationships with IT, engineering, and business teams
- Implement a knowledge base of resolved incidents

## Common Pitfalls
- Alert fatigue — too many low-value alerts drowning out critical signals
- Understaffing — not enough analysts for 24/7 coverage
- No defined escalation process — analysts don't know who to call
- Lack of runbooks — analysts reinvent processes each time
- Poor handover — critical context lost between shifts
- No continuous improvement — same problems happen repeatedly
- Siloed SOC — no communication with IT or business teams
- Metrics measured but not acted upon
- Burnout — high stress, shift work, repetitive tasks without rotation
- Technology-first mindset — tools without process and training

## Key Points
- SOC monitors, detects, analyzes, and responds to security incidents
- Tiered team: T1 triage, T2 investigation, T3 advanced analysis
- Alert triage: acknowledge → validate → enrich → prioritize → contain → investigate → remediate → report
- Severity matrix defines SLAs: Critical = 2 min, High = 5 min, Medium = 15 min, Low = 60 min
- Defined escalation paths and notification procedures
- Maintain runbooks for common incident types
- Track MTTD, MTTR, FP rate, SLA compliance
- Shift handover templates ensure continuity
- Regular drills and tabletop exercises improve readiness
- Continuous improvement based on post-incident reviews
