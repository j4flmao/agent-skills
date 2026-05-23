# SOC Structure

## Tier Model

### Tier 1 — Triage Analyst
- Monitor alerts, validate severity, initial triage
- Follow runbooks for known scenarios
- Escalate to Tier 2 if beyond runbook
- Document findings in case management
- Metrics: Alerts triaged/hour, false positive rate, escalation accuracy

### Tier 2 — Incident Responder
- Deep investigation of escalated incidents
- Containment actions, forensic collection
- Develop and update runbooks
- Coordinate with IT and business teams
- Metrics: Time to contain, incidents resolved without Tier 3, runbook coverage

### Tier 3 — Threat Hunter / SME
- Advanced threat hunting, malware analysis
- Root cause analysis, remediation design
- Detection rule development
- Threat intelligence integration
- Metrics: Hunt hypotheses tested, new detections created, mean time to remediate

## SOC Roles
| Role | Reports To | Key Responsibility |
|------|-----------|-------------------|
| SOC Analyst L1 | SOC Lead | Alert triage, initial response |
| SOC Analyst L2 | SOC Lead | Incident investigation, containment |
| SOC Analyst L3 | SOC Manager | Threat hunting, advanced analysis |
| SOC Lead | SOC Manager | Shift supervision, escalation management |
| SOC Manager | CISO | Operations, metrics, staffing, budget |
| Threat Intel Lead | SOC Manager | Intelligence feeds, TTP analysis |

## Shift Handover Template
```
**Shift**: 07:00-15:00 → 15:00-23:00
**Date**: YYYY-MM-DD

**Open Incidents**:
- INC-001: [Severity] [Status] [Summary] — [Owner]

**New Alerts**:
| Alert | Severity | Action Taken | Open? |
|-------|----------|-------------|-------|
| ... | ... | ... | Yes/No |

**Ongoing Investigations**:
- [Case #]: [Status] [Next Step] [Owner]

**Tools/Systems Down**:
- [Tool]: [Impact] [ETA]

**Handover Notes**:
[Anything the next shift needs to know]
```

## SOC Metrics
| Metric | Description | Target |
|--------|-------------|--------|
| MTTD (Mean Time to Detect) | Time from compromise to detection | < 1 hour |
| MTTR (Mean Time to Respond) | Time from detection to containment | < 4 hours |
| FP Rate | False positives / total alerts | < 10% |
| Alert Volume | Alerts per day | Trend-based |
| Escalation Rate | % of alerts escalated to T2 | 10-20% |
| Coverage | % of MITRE ATT&CK techniques covered | > 60% |
