---
name: soc-operations
description: >
  Manage SOC operations, tiered analyst workflows, shift handovers, and security incident escalation.
  Use when the user asks about SOC, security operations center, SOC analyst, SOC tier, security monitoring, or SOC metrics.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, soc, phase-8]
---

# SOC Operations

## Purpose
Define SOC structure, analyst workflows, tier responsibilities, escalation paths, shift handovers, and SOC performance metrics. Build a high-performing security operations team that effectively detects, triages, investigates, and responds to security incidents.

## Agent Protocol

### Trigger
- "SOC", "security operations center", "SOC analyst", "SOC tier", "Tier 1", "Tier 2", "Tier 3"
- "security monitoring", "alert triage", "SOC workflow", "SOC runbook"
- "shift handover", "SOC dashboard", "SOC metrics", "MTTD", "MTTR"
- "escalation path", "security incident escalation", "SOC manager"
- "24/7 security coverage", "follow-the-sun", "SOC staffing"

### Input Context
- Organization size, industry, and regulatory environment
- Existing security tools (SIEM, EDR, SOAR, email security)
- Current team size and skill levels (if any)
- Incident volume: alerts per day, incident types
- Coverage hours: 8x5, 24x7, follow-the-sun
- Compliance requirements for incident response

### Output Artifact
SOC structure definition, tier workflows, escalation matrices, shift handover templates, metrics dashboards.

### Response Format
```
## SOC Structure
{Role definitions, tier responsibilities, reporting lines}

## Workflow
{Alert triage flow, escalation criteria, investigation process}

## Metrics
{MTTD, MTTR, alert volume, false positive rate with targets}
```

### Completion Criteria
- [ ] SOC structure defined with clear tier responsibilities and ratios
- [ ] Escalation paths documented with objective criteria
- [ ] Shift handover process defined with template
- [ ] Metrics defined with targets and measurement methods
- [ ] Runbook structure defined for top incident types
- [ ] Training and skill progression plan documented

## Architecture / Decision Trees

### SOC Structure Decision Tree

```
What is the organization size?
├── < 500 employees → MSSP (outsourced) or hybrid (managed EDR + internal triage)
├── 500-2000 employees → Hybrid SOC (Tier 1 internal, Tier 2/3 MSSP or part-time senior)
├── 2000-10000 employees → Internal SOC (Tier 1-2 internal, Tier 3 on-call senior)
└── > 10000 employees → Full internal SOC (Tier 1-3, threat intel, detection engineering)

What is the security maturity?
├── Level 1: Initial → Reactive, no SOC → Build Tier 1 triage capability
├── Level 2: Defined → Basic monitoring → Add Tier 2 investigation, SOAR automation
├── Level 3: Managed → Proactive detection → Add threat hunting, detection engineering
├── Level 4: Measured → Metrics-driven → Add purple team, threat intel integration
└── Level 5: Optimized → Predictive → Full SOC with all tiers, automation, intelligence

What are the coverage requirements?
├── 8x5 (business hours) → 3-5 analysts for single-shift coverage
├── 16x5 (extended hours) → 6-10 analysts for two shifts
├── 24x7 (follow-the-sun) → 12-15 analysts for three shifts + global coordination
└── 24x7 (internal night shift) → 15-20 analysts for four shifts (incl. night differential)
```

### Sourcing Model Decision Tree

```
What is the budget for SOC?
├── High budget → Build internal SOC (all tiers)
│   └── Best for: Regulated industries, large enterprises, IP-sensitive companies
├── Medium budget → Hybrid (internal Tier 1, MSSP Tier 2/3)
│   └── Best for: Mid-size companies, growing security team
└── Low budget → Fully outsourced MSSP
    └── Best for: Small companies, startups, limited security requirements

Is retention of institutional knowledge critical?
├── Yes → Internal SOC (knowledge stays in-house)
└── No → MSSP or Co-managed SOC

Are there data sovereignty requirements?
├── Yes → SOC must be in-region (internal or regional MSSP)
└── No → Any sourcing model
```

## Workflow

### Step 1: SOC Tier Structure

**Tier 1 — Triage Analyst:**
Role: First line of defense. Monitor alert queue, validate alerts, close false positives, escalate confirmed events.
- Skills: Basic security knowledge, SIEM query, log analysis, runbook following
- Ratio: 60-70% of SOC headcount
- Metrics: Alerts triaged per shift, triage accuracy, time to triage
- Escalation: Tier 2 for confirmed positives

**Tier 2 — Incident Responder:**
Role: Deep investigation of confirmed incidents. Scope determination, containment, evidence collection.
- Skills: Advanced SIEM, EDR investigation, malware analysis, host/network forensics
- Ratio: 20-25% of SOC headcount
- Metrics: Investigation time, containment time, incidents handled per week
- Escalation: Tier 3 for complex incidents, APT, novel attack patterns

**Tier 3 — Senior Investigator / Threat Hunter:**
Role: Advanced forensics, reverse engineering, threat hunting, detection engineering, tool tuning.
- Skills: Memory analysis, reverse engineering, Python scripting, threat intel, malware analysis
- Ratio: 10-15% of SOC headcount
- Metrics: Threat hunting hypotheses tested, detection rules created, investigation depth
- Escalation: CISO / Legal / PR for major incidents

**SOC Manager:**
Role: Team management, resource planning, SLA monitoring, reporting, governance.
- Skills: Management, reporting, process improvement, vendor management
- Metrics: SOC maturity score, SLA compliance, team retention, budget adherence

**Additional Roles (larger SOCs):**
- Detection Engineer: Writes and tunes correlation rules, manages SIEM content
- Threat Intel Analyst: Manages intel feeds, produces CTI reports, supports hunting
- SOAR Engineer: Develops and maintains automation playbooks
- Forensic Analyst: Deep dive forensics (disk, memory, mobile, cloud)
- SOC Trainer: Maintains training program, runbook updates, tabletop exercises

### Step 2: Alert Triage Workflow

```
Alert Generated by SIEM/EDR
          ↓
    Tier 1 Triage Queue
          ↓
 ┌──────────────────────────────────────────────┐
 │ Validate Alert                               │
 │ - Is the alert a true positive?              │
 │ - Is there supporting evidence?              │
 │ - Is this a known false positive?            │
 └──────────────────────────────────────────────┘
      ├── False Positive → Document reason → Close
      ├── Benign with context → Add note → Close
      └── True Positive → Assign Severity
                ↓
 ┌──────────────────────────────────────────────┐
 │ Determine Severity                           │
 │ - Affected asset criticality (CMDB)          │
 │ - User privilege level                       │
 │ - Attack stage (recon vs exfiltration)       │
 │ - Business impact                            │
 └──────────────────────────────────────────────┘
                ↓
 ┌──────────────────────────────────────────────┐
 │ Escalation Decision                          │
 │ - CRITICAL → Immediate Tier 2/3 escalation   │
 │ - HIGH → Tier 2 investigation within SLA     │
 │ - MEDIUM → Tier 2 investigation, non-urgent  │
 │ - LOW → Log for trend analysis               │
 └──────────────────────────────────────────────┘
                ↓
    Tier 2 Investigation Queue
```

**Triage SLA Targets:**

| Severity | Confirmation SLA | Initial Response | Investigation SLA |
|----------|-----------------|-----------------|-------------------|
| CRITICAL | 5 minutes | Immediate | 30 minutes to containment |
| HIGH | 15 minutes | 15 minutes | 4 hours |
| MEDIUM | 1 hour | 1 hour | 24 hours |
| LOW | 24 hours | 24 hours | 72 hours |

### Step 3: Incident Investigation Process

**Investigation Methodology (P.E.A.C.E.):**
1. **Prepare**: Gather context — affected systems, users, data, timeline
2. **Enumerate**: Collect evidence — logs, memory, network captures, file systems
3. **Analyze**: Correlate evidence — process tree, network connections, user activity, lateral movement
4. **Contain**: Stop the spread — isolate endpoints, block IoCs, disable accounts
5. **Eradicate**: Remove threat — clean systems, patch vulnerabilities, rotate credentials

**Tier 2 Investigation Playbook Template:**
```yaml
investigation_playbook:
  incident_type: "Unauthorized Access - External"
  
  phase1_initial_triage:
    - "Confirm alert validity from SIEM alert details"
    - "Identify affected user account(s) and resource(s)"
    - "Check if user reported suspicious activity"
    - "Determine authentication method and source IP"
    queries:
      siem_example: "index=windows EventCode=4625 AccountName=<username> | stats count by Source_Network_Address"
  
  phase2_enrichment:
    - "GeoIP lookup on source IP addresses"
    - "Threat intel check on source IP (VirusTotal, AlienVault)"
    - "Asset criticality lookup in CMDB"
    - "User's recent activity timeline (last 24h)"
    - "Check for related alerts from same source"
    queries:
      siem_correlation: "index=* source_ip=<ip> | timechart count by sourcetype"
  
  phase3_investigation:
    - "Review authentication logs for brute force patterns"
    - "Check for successful login after failed attempts"
    - "Review privileged access changes for affected account"
    - "Check mail forwarding rules (if email account)"
    - "Review API access tokens and OAuth grants"
    - "Check for lateral movement from affected endpoint"
  
  phase4_containment:
    - "HIGH priority: Disable compromised account"
    - "Revoke active sessions and tokens"
    - "Block source IP on firewall/WAF"
    - "Force password reset for affected user"
    - "Enable MFA if not already enabled"
    - "Check if other accounts are similarly exposed"
  
  phase5_eradication:
    - "Identify root cause: weak password, no MFA, credential stuffing"
    - "Implement compensating controls"
    - "Update detection rules for similar patterns"
    - "Rotate credentials accessed by compromised account"
  
  phase6_recovery:
    - "Verify account security: password reset, MFA enforced"
    - "Restore any modified configurations"
    - "Monitor for 48 hours post-remediation"
    - "Close incident with lessons learned"
```

### Step 4: Escalation Matrix

```yaml
escalation_criteria:
  tier1_to_tier2:
    triggers:
      - "Confirmed true positive (any severity)"
      - "Alert involving C-level executive or sensitive system"
      - "Alert correlation across 3+ data sources"
      - "Potential data exfiltration"
      - "User-reported phishing that evaded email security"
    method: "Assign in SOAR case management system"
    sla: "15 minutes"

  tier2_to_tier3:
    triggers:
      - "Confirmed APT or nation-state actor"
      - "Novel malware or zero-day exploit"
      - "Incident spanning 10+ endpoints"
      - "Evidence of data exfiltration"
      - "Ransomware with encryption in progress"
      - "Unable to determine scope with available tools"
      - "Legal or compliance notification required"
    method: "Page senior investigator + open bridge call"
    sla: "5 minutes for CRITICAL, 30 minutes for HIGH"

  soc_to_management:
    triggers:
      - "Confirmed data breach with PII exposure"
      - "Ransomware impacting business operations"
      - "Regulatory notification requirement (GDPR, CCPA)"
      - "Law enforcement involvement"
      - "PR-sensitive incident"
      - "Incident exceeding 4 hours containment SLA"
    method: "Notify CISO, Legal, PR via incident channel"
    sla: "Immediate for data breach, 15 minutes for other"

  soc_to_engineering:
    triggers:
      - "Application vulnerability identified during investigation"
      - "Misconfiguration in cloud infrastructure"
      - "EDR/SIEM coverage gap preventing investigation"
    method: "Create ticket, assign in incident review"
    sla: "Next business day"
```

### Step 5: Shift Handover Process

**Handover Structure (15-minute overlap minimum):**

```
SHIFT HANDOVER REPORT
Date: 2026-06-01
Shift: Day (08:00-16:00) → Evening (16:00-00:00)
Handover By: Analyst Name
Handover To: Analyst Name

## Open Incidents
| ID | Severity | Type | Status | Owner | Next Action |
|----|----------|------|--------|-------|-------------|
| SOC-2026-042 | HIGH | Phishing | Investigating | jdoe | Review sandbox report |
| SOC-2026-043 | MEDIUM | Port Scan | Triaged | jdoe | Confirm source IP owner |

## Key Events This Shift
- 09:30 - Phishing campaign detected targeting finance dept (10 emails)
  - 5 emails deleted from inboxes, 5 users trained
  - Indicator blocked on email gateway
- 11:15 - Port scan detected from 203.0.113.50
  - Source is an MSSP scanner — added to allowlist
  - Tuned SIEM rule to exclude MSSP ranges
- 14:00 - EDR alert: suspicious PowerShell on HR-DB-01
  - Investigation in progress
  - Endpoint not yet isolated (DB server during business hours)
  - Next action: isolate at 18:00 if investigation not conclusive

## Pending Actions
- [ ] Update phishing rule to include new subject line patterns
- [ ] Request CMDB update for HR-DB-01 asset criticality
- [ ] Tune EDR exclusion for Nintex workflow tool (false positive)

## Threat Intelligence Highlights
- New Ryuk ransomware variant observed targeting healthcare
- Indicators: {ip_list, hash_list} in threat intel platform
- Please review relevant detection coverage on night shift

## Tools / System Status
- SIEM: Green (ingestion normal)
- EDR: Green (all endpoints reporting)
- Email Security: Yellow (delay in reporting — vendor ticket open)
- SOAR: Green

## Notes for Next Shift
- Infrastructure maintenance window: 02:00-04:00 (firewall firmware)
  - Expected: increased firewall logs, possible brief connectivity issues
- Incident response drill tomorrow 10:00 (phishing scenario)
```

**Handover checklist:**
- All open incidents have documented next actions and owners
- False positives from the shift are documented with tuning recommendations
- Tools and infrastructure status communicated
- Threat intelligence updates shared
- Maintenance windows and known issues communicated
- Runbooks and documentation updated with new findings
- Shift report saved to shared SOC knowledge base

### Step 6: SOC Metrics and KPIs

**Key Performance Indicators:**

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| MTTD (Mean Time to Detect) | Time from compromise to detection | < 1 hour for CRITICAL | SIEM alert timestamp - actual compromise time (estimated) |
| MTTA (Mean Time to Acknowledge) | Time from alert to analyst assignment | < 5 min CRITICAL, < 15 min HIGH | Alert timestamp - first analyst action |
| MTTR (Mean Time to Respond) | Time from detection to containment | < 30 min CRITICAL, < 4 hours HIGH | Alert timestamp - containment action timestamp |
| Triage Accuracy | % of escalated alerts that are true positives | > 90% | Confirmed TPs / Total escalations |
| False Positive Rate | % of alerts closed as benign | < 30% | FPs / Total alerts |
| Alert Volume | Alerts per day per analyst | 50-100 per analyst | SIEM alert count / analyst headcount |
| Mean Time to Close | Average time to close an incident | < 24 hours MEDIUM, < 72 hours LOW | Open timestamp - close timestamp |
| Backlog | Number of uninvestigated alerts | < 100 per shift | Queue depth in SIEM |
| Coverage | % of MITRE ATT&CK techniques detected | > 50% | Techniques with detections / Total techniques |
| Analyst Utilization | % of time on active investigation | > 70% | Investigation time / Total shift time |
| SLA Compliance | % of incidents handled within SLA | > 95% | Incidents within SLA / Total incidents |

**SOC Dashboard:**
```python
# SOC Dashboard Data Model
soc_dashboard = {
    "current_alerts": {
        "critical": 2,
        "high": 8,
        "medium": 15,
        "low": 34
    },
    "alerts_trend": {
        "last_24h": 240,
        "last_7d": 1680,
        "avg_per_day": 240,
        "change_vs_last_week": "+12%"
    },
    "false_positive_rate": {
        "current": "28%",
        "target": "< 30%",
        "trend": "improving"
    },
    "incident_response_metrics": {
        "mttd": {
            "avg": "45 min",
            "target": "< 60 min",
            "p95": "120 min"
        },
        "mtta": {
            "critical": "3 min",
            "high": "12 min",
            "medium": "45 min"
        },
        "mttr": {
            "critical": "22 min",
            "high": "2.5 hours",
            "medium": "8 hours"
        }
    },
    "sla_compliance": {
        "current": "96.5%",
        "target": "> 95%",
        "breached_today": 0
    },
    "team_capacity": {
        "analysts_online": 4,
        "alerts_per_analyst": 60,
        "backlog": 45,
        "oldest_uninvestigated": "2h 15m"
    }
}
```

### Step 7: Shift Scheduling and Staffing

**Staffing Ratios:**
- Single SOC (8x5): 3-5 analysts for coverage, 1 manager
- Extended SOC (16x5): 6-10 analysts, 1-2 managers, rotation every 2 weeks
- 24x7 SOC (follow-the-sun): 12-15 analysts across 3 time zones, 1 SOC manager per region
- 24x7 SOC (in-house): 15-20 analysts for 4 shifts, shift differential pay

**Optimal Shift Patterns:**

| Pattern | Description | Pros | Cons |
|---------|-------------|------|------|
| 8-hour shifts (3 shifts) | Day (8-4), Swing (4-12), Night (12-8) | Standard, 5 days/week | Night shift burnout, handover gaps |
| 12-hour shifts (2 shifts) | Day (8-8), Night (8-8), 3-4 days/week | Longer off-time, fewer handovers | Fatigue, training time reduction |
| Follow-the-sun | US, EMEA, APAC hand off each shift | Continuous coverage, normal hours | Requires global presence, coordination overhead |
| Compressed 4x10 | 10-hour shifts, 4 days/week | 3-day weekend, better retention | Longer shifts, coverage on day 5 |

**Staffing Calculation:**
```
Analysts Needed = (Hours per day × Days per week) / (Hours per shift × Shifts per week per analyst)

Example (24x7 coverage, 8-hour shifts, 40-hour week):
Analysts = (24 × 7) / (8 × 5) = 168 / 40 = 4.2 → 5 analysts minimum
With PTO, sick leave, training: 5 × 1.5 = 8 analysts recommended
```

### Step 8: Knowledge Management and Training

**SOC Knowledge Base Structure:**
```
SOC-KB/
├── 01-Runbooks/
│   ├── phishing.md
│   ├── malware.md
│   ├── ransomware.md
│   ├── unauthorized-access.md
│   ├── data-exfiltration.md
│   ├── ddos.md
│   └── insider-threat.md
├── 02-Playbooks/
│   ├── soi-engineering/ (SOAR playbook documentation)
│   └── automation-flows/
├── 03-Tool-Guides/
│   ├── siem-query-library.md
│   ├── edr-investigation.md
│   ├── email-security.md
│   └── forensic-tools.md
├── 04-Cheat-Sheets/
│   ├── mitre-attack-mappings.md
│   ├── log-sources-reference.md
│   ├── ioc-extraction-patterns.md
│   └── splunk-kql-queries.md
├── 05-Lessons-Learned/
│   ├── incident-post-mortems/
│   └── quarterly-trend-reports/
└── 06-Training/
    ├── new-analyst-onboarding.md
    ├── tier-1-to-tier-2-progression.md
    └── certification-track.md
```

**Training Program:**
- Month 1-2: New analyst onboarding (tool training, runbook study, shadowing senior analysts)
- Month 3-4: Supervised triage (reviewed by Tier 2, accuracy tracking)
- Month 5-6: Independent triage (all alert types, escalation decisions)
- Ongoing: Weekly training session (1 hour: new techniques, tool updates, incident reviews)
- Quarterly: Tabletop exercise (simulated incident, team response validation)
- Annual: Certification support (SANS, CISSP, Security+, CEH)

### Step 9: Tabletop Exercises and Drills

**Exercise Types:**

| Type | Frequency | Duration | Participants | Objective |
|------|-----------|----------|-------------|-----------|
| Small tabletop | Monthly | 30 min | SOC team | Test specific playbook |
| Full scenario | Quarterly | 2 hours | SOC + engineering + management | Test end-to-end response |
| Purple team | Quarterly | 4 hours | SOC + red team | Test detection coverage |
| Major incident drill | Annually | 4 hours | All stakeholders | Test crisis response |
| Compliance drill | Annually | 2 hours | SOC + compliance | Test regulatory reporting |

**Tabletop Scenario Template:**
```yaml
scenario: "Ransomware Attack - Initial Access via Phishing"
participants: [Tier 1, Tier 2, SOC Manager, IT Engineering]
duration: 90 minutes

phase1_injection:
  time: "T+0"
  inject: "EDR alerts: PowerShell executing encoded command on workstations 3-5"
  expected_actions:
    tier1: "Validate alert, check process tree, escalate to Tier 2"
    tier2: "Investigate parent process, check email gateway for related phishing"

phase2_expansion:
  time: "T+15"
  inject: "Files with .encrypted extension appearing on share drive"
  expected_actions:
    tier2: "Confirm ransomware, isolate affected endpoints, initiate IR"
    soc_manager: "Declare incident, assemble response team"

phase3_containment:
  time: "T+30"
  inject: "Domain controller showing anomalous activity"
  expected_actions:
    tier2: "Isolate all affected systems, block C2 IPs on firewall"
    tier3: "Analyze ransomware sample, determine encryption method"

phase4_recovery:
  time: "T+60"
  inject: "Backup team confirms clean backups available"
  expected_actions:
    tier2: "Verify no lateral movement, begin restore process"
    soc_manager: "Update stakeholders, prepare incident report"

phase5_debrief:
  time: "T+90"
  inject: "Scenario complete"
  expected_actions:
    all: "Lessons learned, detection gaps, process improvements"
```

## Common Pitfalls

### Pitfall 1: Insufficient Tier 1 Training
Tier 1 analysts without adequate training miss true positives and escalate false positives. Invest 4-6 weeks of onboarding before independent triage.

### Pitfall 2: No Clear Escalation Criteria
Without documented escalation criteria, analysts either escalate everything (overwhelming Tier 2) or escalate nothing (missing incidents). Define objective criteria with examples.

### Pitfall 3: Alert Fatigue
Too many alerts desensitize analysts and cause real incidents to be missed. Invest in tuning to reduce alert volume. Target: < 100 alerts per analyst per day.

### Pitfall 4: Burnout from Shift Work
Night shifts, rotating schedules, and high-pressure environments cause burnout. Rotate shifts every 2 weeks, provide shift differential, enforce PTO. Monitor for burnout indicators.

### Pitfall 5: No Knowledge Transfer
Institutional knowledge lost when analysts leave. Maintain runbooks, document investigation techniques, record shift handovers. Require knowledge base contributions.

### Pitfall 6: Measuring Wrong Metrics
Tracking volume only (alerts processed) without quality (accuracy, containment time) rewards speed over effectiveness. Balance volume and quality metrics.

### Pitfall 7: Ignoring Threat Intelligence
SOC disconnected from threat intelligence misses relevant threats. Integrate CTI feeds into SIEM, brief analysts on current threats at shift start.

### Pitfall 8: No Career Progression
Without growth path, good analysts leave. Define Tier 1→2→3 progression with clear criteria. Support certifications and conference attendance.

### Pitfall 9: Runbooks Not Updated
Outdated runbooks cause investigation delays. Runbooks reviewed quarterly and updated after each major incident. Version-controlled in knowledge base.

### Pitfall 10: Understaffing During Peak Times
Staffing for average volume fails during incidents or campaigns. Build in 30% capacity buffer. Have on-call escalation for surge events.

## Best Practices

- Implement clear tier structure: Tier 1 (triage), Tier 2 (investigation), Tier 3 (advanced/specialized)
- Automate triage for common alerts: known FPs auto-closed, known IoCs auto-escalated
- Maintain runbooks for top 20 incident types with step-by-step investigation procedures
- Conduct bi-weekly purple team exercises to validate detection and response
- Track analyst progression with skill matrix: SIEM, EDR, forensics, cloud, malware analysis
- Implement shift handover with mandatory 15-minute overlap for knowledge transfer
- Measure what matters: MTTA, MTTR, triage accuracy, false positive rate, SLA compliance
- Invest in training: weekly 1-hour sessions, quarterly tabletops, annual certifications
- Build knowledge base: document every investigation, update runbooks, share lessons learned
- Use threat intelligence in operations: brief analysts on current threats, integrate into SIEM
- Plan for analyst burnout: rotate shifts, enforce breaks, monitor workload
- Budget for 30% capacity buffer above average alert volume for surge events

## Performance Considerations

- Triage capacity: experienced Tier 1 handles 50-100 alerts per 8-hour shift
- Investigation time: Tier 2 investigation averages 30-60 minutes per confirmed incident
- MTTR improvement: automation reduces containment time 40-60% for playbook-covered incidents
- False positive reduction: mature tuning program reduces FP rate from 50%+ to under 30% in 6 months
- Tool integration: integrated SIEM+SOAR reduces average investigation time 25-35%
- Training ROI: well-trained analysts have 20% higher triage accuracy and 15% faster MTTA

## SOC Maturity Model

| Level | Name | Characteristics | Metrics |
|-------|------|----------------|---------|
| 1 | Initial | Reactive, no defined process | MTTD: days-weeks, FP rate > 70%, no automation |
| 2 | Defined | Basic processes, tool integration | MTTD: hours, Tier structure, basic runbooks |
| 3 | Managed | Proactive monitoring, SOAR automation | MTTD: minutes-hours, FP rate < 50%, automated triage |
| 4 | Measured | Metrics-driven, threat hunting | MTTD: minutes, FP rate < 30%, threat intel integrated, regular purple team |
| 5 | Optimized | Predictive defense, full automation | MTTD: real-time, FP rate < 15%, AI-assisted analysis, automated containment |

## Rules

- Every alert must be triaged within SLA based on severity (CRITICAL: 5min, HIGH: 15min, MEDIUM: 1h, LOW: 24h)
- Tier 1 must not investigate for more than 15 minutes — escalate if not conclusive
- All investigation steps must be documented in the case management system
- Shift handover must include open incidents, pending actions, and tool status
- Runbooks must be updated within 5 business days after each major incident
- False positive rate must be tracked per rule and per analyst
- No alert should be closed without a documented disposition reason
- Escalation criteria must be objective and documented — never subjective
- Weekly SOC meeting: review top incidents, tuning opportunities, threat intel updates
- Monthly trend report: alert volume, incident types, SLA compliance, team performance
- Quarterly tabletop exercise with all tiers to validate processes

## References
  - references/soc-metrics.md — SOC Metrics and Reporting
  - references/soc-operations-advanced.md — Soc Operations Advanced Topics
  - references/soc-operations-fundamentals.md — Soc Operations Fundamentals
  - references/soc-runbooks.md — SOC Runbook Templates
  - references/soc-structure.md — SOC Structure
  - references/threat-hunting.md — Threat Hunting in SOC
  - references/triage-procedures.md — Alert Triage Procedures
## Handoff
Output artifacts can be handed to devops-monitoring for SIEM integration, or management for org planning.
