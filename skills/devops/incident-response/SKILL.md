---
name: devops-incident-response
description: >
  Use this skill when the user says 'incident response', 'on-call', 'PagerDuty', 'OpsGenie', 'incident management', 'postmortem', 'runbook', 'severity', 'escalation', 'SEV', 'incident command', 'SEV1', 'SEV2', 'incident timeline'. This skill enforces: severity classification with clear definitions (SEV1-4), structured incident lifecycle from detection to resolution, runbook creation with step-by-step procedures, on-call scheduling with escalation policies, blameless postmortem culture, and incident command system roles (IC, Scribe, SME, Comms). Do NOT use for: routine bug tracking, feature development, or performance monitoring (those have dedicated skills).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, operations, phase-10]
---

# Incident Response

## Purpose
Establish a structured incident response framework with clear severity levels, defined roles, documented runbooks, and a blameless postmortem culture to minimize recovery time and prevent recurrence.

## Agent Protocol

### Trigger
"incident response", "on-call", "PagerDuty", "OpsGenie", "incident management", "postmortem", "runbook", "severity", "escalation", "SEV", "SEV1", "SEV2", "SEV3", "incident command", "IC role", "incident timeline", "blameless postmortem", "incident lifecycle", "incident detection", "incident mitigation", "MTTD", "MTTR".

### Input Context
- Current incident state (detected, ongoing, mitigated, resolved)
- Service affected and current impact (users down, degraded, partial)
- Severity level if already classified
- Team structure and on-call rotation
- Existing runbooks and their locations
- Communication channels (Slack, Teams, PagerDuty)
- Compliance requirements (SOC2, PCI, HIPAA postmortem timelines)

### Output Artifact
Incident response framework with severity matrix, lifecycle workflow, runbook template, on-call schedule, and postmortem process. For active incidents: structured timeline with IC assignments, action items, and communication updates.

### Response Format
```
Incident: {ID or name}
Severity: {SEV1-4}
Status: {detected/investigating/mitigated/resolved}
IC: {name}
Scribe: {name}
Timeline:
  T+0: Detection [{method}]
  T+{n}: Investigation [{current status}]
  T+{n}: Mitigation [{action}]
  T+{n}: Resolution [{target}]
Action Items: [{n} open, {n} completed]
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Severity level assigned with documented criteria
- [ ] Incident command roles assigned (IC, Scribe, SME, Comms)
- [ ] Timeline established with detection method and key milestones
- [ ] Mitigation steps identified and executed
- [ ] Postmortem scheduled (SEV1: within 48h, SEV2: within 1 week)
- [ ] Communication sent to stakeholders at defined cadence

### Max Response Length
500 lines

## Components

### Severity Matrix
| Severity | Definition | Response Time | Escalation | Page |
|---|---|---|---|---|
| SEV1 | Complete outage, data loss, security breach, SLA-impacting | 5 min | Full team + management + exec | PagerDuty high-urgency |
| SEV2 | Major feature degraded, partial outage, >5% errors | 15 min | Primary + secondary on-call | PagerDuty high-urgency |
| SEV3 | Minor feature issue, single-user impact, non-critical bug | 1 business hour | Slack + ticket | PagerDuty low-urgency |
| SEV4 | Cosmetic, docs, enhancement, tech debt | Next sprint | Ticket queue | None |

### Incident Command Roles
IC (Incident Commander): owns incident end-to-end, delegates tasks, communicates with stakeholders, does NOT debug. Scribe: real-time timeline documentation — every action, decision, timestamp. SME: technical investigation and mitigation — one per subsystem, reports to IC. Comms: stakeholder status updates, status page updates, external notifications, regulatory reporting if needed. Role transitions: handoff documented in timeline with verbal 2-min summary.

### On-Call Scheduling
Primary on-call: first responder, acknowledges within SLA. Secondary: backup for overflow and deep investigation. Escalation path: primary -> secondary -> engineering manager -> VP. Tools: PagerDuty/OpsGenie for schedules, alert routing, escalation policies, incident tracking. Rotation: weekly shifts, max 7 consecutive days. Follow-the-sun for global teams. Handoff: Friday overlap, written summary of ongoing issues.

### Incident Metrics
MTTD (Mean Time to Detect): time from incident start to first alert. Target: SEV1 <5min, SEV2 <15min. MTTR (Mean Time to Resolve): time from detection to resolution. Target: SEV1 <1hr, SEV2 <4hrs. Track weekly trends, set improvement targets. Metrics drive investment in detection tooling, runbook quality, and on-call training.

## Incident Lifecycle

### Detection Phase (T+0 to T+5min)
Detection sources: monitoring alerts (Prometheus AlertManager, Datadog, CloudWatch), synthetic checks (Playwright/Cypress browser tests, uptime monitors), user reports (support tickets via Zendesk/Intercom, social media mentions), security scanning (Snyk, Trivy, WAF alerts), automated rollback triggers (deploy health check failure, error rate threshold). Validate alert is not a false positive before declaring incident.

### Triage Phase (T+5min to T+15min)
Validate alert, classify severity using matrix, assign IC, open dedicated incident channel in Slack/Teams. Initial stakeholder notification via PagerDuty status update. Decision: severity upgrade/downgrade. If outside on-call expertise, escalate immediately without attempting deep investigation.

### Investigation Phase (T+15min to T+60min)
IC delegates investigation to SMEs. Check dashboards (Grafana, Datadog), logs (Loki, ELK, Cloud Logging), traces (Jaeger, Zipkin). Identify blast radius: users affected, services impacted, regions involved. Reproduce in staging or isolated environment. Scribe records every action with precise timestamp.

### Mitigation Phase (T+15min to T+120min)
Stop the bleed first: feature flag toggle, rollback to last known good, reroute traffic to healthy region, scale up, block malicious IPs. Deploy permanent fix to non-production first, test, then deploy to production with canary. Communicate ETA to stakeholders via Comms at defined cadence. Scribe documents all mitigation steps and outcomes.

### Resolution Phase (T+30min to T+24h)
Verify metrics return to baseline (p99 latency, error rate, throughput). Run end-to-end validation tests. Post resolution to incident channel. Update status page. Schedule postmortem within SLA window. Archive incident channel. Send post-incident summary to stakeholders.

### Postmortem Phase (T+48h to T+1week)
Schedule postmortem meeting: SEV1 within 48h, SEV2 within 1 week, SEV3 in next sprint. Write blameless timeline. Conduct 5 Whys root cause analysis. Create action items with single owner and due date. Share postmortem internally — every incident is a learning opportunity. Track action items to completion.

## Runbook Template
```markdown
# Runbook: [Service Name]

## Symptoms
- Alert: [Alert name] firing — [description]
- User impact: [what users experience]
- Error messages: [relevant error patterns]

## Triage (First 5 Minutes)
1. Check [dashboard link] for current state
2. Run: `kubectl get pods -n [namespace] -o wide`
3. Check logs: `kubectl logs -n [namespace] [pod] --tail=100`
4. Check metric: [query in Prometheus/Grafana]

## Escalation
| Condition | Action |
|-----------|--------|
| Pods crash-looping | Page secondary on-call |
| Data inconsistency | Page DBA team |
| Security concern | Page security team |

## Remediation
### Option A: Rollback
```bash
kubectl rollout undo deployment/[name] -n [namespace]
```

### Option B: Scale Up
```bash
kubectl scale deployment/[name] --replicas=5 -n [namespace]
```

### Option C: Feature Flag
Disable feature [name] via [flag management tool]

## Verification
- [ ] Error rate < 0.1% (check [dashboard link])
- [ ] p99 latency < 200ms
- [ ] All pods Running and Ready
- [ ] Integration tests passing
```

## Postmortem Template
```markdown
# Postmortem: [Title]

## Incident Summary
- Date: YYYY-MM-DD
- Duration: [start] to [end] (X hours)
- Severity: SEV[X]
- Services affected: [list]

## Timeline
| Time (UTC) | Event |
|---|---|
| T+0 | [Detection] |
| T+X | [Action taken] |
| T+Y | [Mitigation applied] |
| T+Z | [Resolution confirmed] |

## Impact
- Users affected: [count or percentage]
- Revenue impact: [amount if measurable]
- Data loss: [yes/no, extent]

## Root Cause (5 Whys)
1. Why did it happen? [answer]
2. Why? [deeper answer]
3. Why? [deeper answer]
4. Why? [deeper answer]
5. Why? [root cause]

## Contributing Factors
- [Factor 1]: [explanation]
- [Factor 2]: [explanation]

## Action Items
| # | Action | Owner | Due Date | Status |
|---|---|---|---|---|
| 1 | [action] | [name] | YYYY-MM-DD | [open/closed] |
| 2 | [action] | [name] | YYYY-MM-DD | [open/closed] |

## Prevention
- [System change to prevent recurrence]
- [Monitoring gap identified and filled]
- [Runbook updated with new findings]

## Lessons Learned
- What went well: [1], [2], [3]
- What went wrong: [1], [2], [3]
- What to improve: [1], [2], [3]
```

## PagerDuty Configuration (Terraform)
```hcl
resource "pagerduty_service" "critical" {
  name        = "Production Critical"
  description = "SEV1/SEV2 production incidents"
  alert_creation = "create_incidents"
}

resource "pagerduty_escalation_policy" "primary" {
  name      = "Primary On-Call"
  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary.id
    }
  }
  rule {
    escalation_delay_in_minutes = 15
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.secondary.id
    }
  }
  rule {
    escalation_delay_in_minutes = 5
    target {
      type = "user_reference"
      id   = pagerduty_user.manager.id
    }
  }
}

resource "pagerduty_schedule" "primary" {
  name      = "Primary Weekday"
  time_zone = "UTC"
  layer {
    name                         = "Weekly Rotation"
    start                        = "2026-01-05T08:00:00Z"
    rotation_virtual_start       = "2026-01-05T08:00:00Z"
    rotation_turn_length_seconds = 604800
    users                        = [for u in pagerduty_user.oncall : u.id]
  }
}
```

## Incident Channel Template (Slack)
```
:rotating_light: *INCIDENT DECLARED* :rotating_light:
*Incident ID*: INC-{date}-{number}
*Severity*: SEV{1-4}
*Service*: {service name}
*Detected*: {time} via {method}
*IC*: @{name}
*Scribe*: @{name}
*Status*: Investigating / Mitigating / Resolved

*Current Impact*: {description}
*Timeline*: https://link.to/timeline
*Runbook*: https://link.to/runbook

Next update: {time}
```

## War Room Protocol
1. Open incident channel: `#inc-{date}-{severity}`
2. IC posts initial incident brief (template above)
3. SME posts current findings in thread under their service
4. Scribe maintains timeline in pinned channel message
5. Comms posts status page updates: initial -> investigating -> ETA -> resolved
6. IC posts 5-min status check reminder for SEV1, 15-min for SEV2
7. All decision-making happens in channel — no DMs for incident work
8. No more than 3 people actively debugging simultaneously (avoid confusion)
9. IC designates a separate channel for deep investigation: `#inc-{id}-debug`
10. Post-incident: archive channel, link in postmortem doc

## Tabletop Exercise Template
```markdown
# Tabletop Exercise: [Scenario]

## Scenario
[Description of incident scenario, e.g., "Database primary fails, read replicas are 5 min behind"]

## Participants
- IC: [name]
- Scribe: [name]
- SME: [name]
- Comms: [name]
- Observer: [name]

## Timeline (Facilitator)
| Time | Event | Expected Response |
|---|---|---|
| T+0 | Alert fires: database connection pool exhausted | IC declares incident |
| T+5 | Pagers fire | On-call acknowledges |
| T+10 | [New info] | Team investigates |
| T+20 | [Escalation needed] | IC escalates |
| T+30 | [Mitigation option] | Team decides action |

## Debrief
- What went well:
- Gaps identified:
- Runbook updates needed:
- Training needs:
```

## Status Page Communication Templates
```markdown
# Initial
We are investigating reports of [issue] affecting [service]. Users may experience [symptom]. We will provide updates every [cadence].

# Investigating
We have identified the issue as [root cause] and are working on mitigation. [Progress update].

# Monitoring
[Fix] has been deployed. We are monitoring metrics closely for the next [time period].

# Resolved
The issue has been resolved. [Service] is operating normally. A postmortem will be published within [timeline].
```

## Tool Comparison: Incident Management Platforms

| Feature | PagerDuty | OpsGenie | incident.io | Grafana OnCall |
|---|---|---|---|---|
| Alert routing | Yes (intelligent) | Yes (team-based) | Yes | Yes |
| On-call scheduling | Yes (advanced) | Yes | Yes | Yes |
| Incident tracking | Via integrations | Yes (built-in) | Yes (native) | Yes (native) |
| Status page | Via integrations | Via integrations | Built-in | Via Grafana |
| Postmortem tool | No (add-on) | No | Built-in | No |
| War room | No (Slack add-on) | No | Yes (Slack-native) | No |
| Runbook automation | Yes (via Actions) | Yes (via Rules) | Yes (via Playbooks) | Yes (via webhooks) |
| Pricing | $$$ | $$ | $$$ | Free (OSS) |
| Best for | Large orgs, complex routing | Mid-size, Atlassian stack | Modern incident platform | Grafana ecosystem |

## Security Incident Response Addendum

### Security Severity Classification
| Severity | Definition | Examples | Response |
|---|---|---|---|
| SEV1-SEC | Active breach, data exfiltration, ransomware | Unauthorized access, crypto mining, CVE exploitation | Full security team + legal + exec within 5 min |
| SEV2-SEC | Vulnerability with exploitation evidence | XSS found in production, exposed secrets | Security team within 15 min |
| SEV3-SEC | Vulnerability without exploitation | Dependency CVE, misconfigured S3 bucket | Patch within SLA (72h) |
| SEV4-SEC | Best practice gap | Over-permissioned IAM role, missing WAF rule | Next sprint |

### Security Incident Response Steps
1. Isolate affected systems immediately — do not investigate before containment
2. Preserve forensic evidence: snapshot instances, capture logs, dump memory
3. Rotate all credentials that may have been exposed
4. Engage legal team before any external communication
5. Document chain of custody for any forensic data
6. Do not reimage or rebuild compromised instances until forensics complete
7. Coordinate disclosure with security team and legal — never disclose without approval

### Runbook Automation Script
```python
# runbook_automation/auto_responder.py
"""Automated incident response actions."""
import boto3
import requests
import json
from datetime import datetime

class IncidentAutoResponder:
    def __init__(self, pagerduty_token, slack_webhook):
        self.pd_token = pagerduty_token
        self.slack_webhook = slack_webhook

    def create_pagerduty_incident(self, title, severity, service_id, escalation_policy_id):
        headers = {
            "Authorization": f"Token token={self.pd_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "incident": {
                "type": "incident",
                "title": title,
                "service": {"id": service_id, "type": "service_reference"},
                "escalation_policy": {"id": escalation_policy_id, "type": "escalation_policy_reference"},
                "urgency": "high" if severity in ("SEV1", "SEV2") else "low",
                "body": {
                    "type": "incident_body",
                    "details": f"Auto-created by {self.__class__.__name__} at {datetime.utcnow().isoformat()}",
                },
            }
        }
        resp = requests.post(
            "https://api.pagerduty.com/incidents",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["incident"]

    def notify_slack_channel(self, channel, message):
        payload = {"channel": channel, "text": message, "mrkdwn": True}
        resp = requests.post(self.slack_webhook, json=payload)
        resp.raise_for_status()

    def stop_unhealthy_deployment(self, namespace, deployment):
        """Auto-rollback deployment if health check fails."""
        # This would use kubernetes client in practice
        print(f"[{datetime.utcnow().isoformat()}] Rolling back {namespace}/{deployment}")

    def tag_instance_for_forensics(self, instance_id):
        """Tag EC2 instance for forensic preservation."""
        ec2 = boto3.client("ec2")
        ec2.create_tags(
            Resources=[instance_id],
            Tags=[{"Key": "IncidentForensics", "Value": "Preserve"},
                  {"Key": "PreservedAt", "Value": datetime.utcnow().isoformat()}],
        )
```

### Incident Metrics Collector
```python
# metrics/collect_incident_metrics.py
"""Collect and report incident response metrics."""
from datetime import datetime, timedelta

def calculate_mttd(detection_time, incident_start_time):
    """Mean Time to Detect in minutes."""
    delta = detection_time - incident_start_time
    return delta.total_seconds() / 60

def calculate_mttr(resolution_time, detection_time):
    """Mean Time to Resolve in minutes."""
    delta = resolution_time - detection_time
    return delta.total_seconds() / 60

def track_weekly_metrics(incidents):
    """Aggregate incident metrics for weekly review."""
    total = len(incidents)
    if total == 0:
        return {"total": 0, "avg_mttd": 0, "avg_mttr": 0, "by_severity": {}}

    avg_mttd = sum(i["mttd_min"] for i in incidents) / total
    avg_mttr = sum(i["mttr_min"] for i in incidents) / total

    by_severity = {}
    for incident in incidents:
        sev = incident["severity"]
        if sev not in by_severity:
            by_severity[sev] = {"count": 0, "total_mttr": 0}
        by_severity[sev]["count"] += 1
        by_severity[sev]["total_mttr"] += incident["mttr_min"]

    for sev in by_severity:
        count = by_severity[sev]["count"]
        by_severity[sev]["avg_mttr"] = by_severity[sev]["total_mttr"] / count

    return {
        "total": total,
        "avg_mttd_min": round(avg_mttd, 1),
        "avg_mttr_min": round(avg_mttr, 1),
        "by_severity": by_severity,
    }
```

## Rules
- IC does not touch the keyboard — IC delegates and coordinates
- Scribe documents in real-time — memory is unreliable under pressure
- Stop the bleed before finding root cause — mitigation first, investigation second
- NO blame in incident response — focus on what happened and what we can improve
- Postmortem must be scheduled before incident is closed — never "postmortem TBD"
- Communication cadence: SEV1 every 30min, SEV2 every 60min, SEV3 at major changes
- All incident channels are public by default — transparency over secrecy
- Runbooks tested quarterly via tabletop exercises
- MTTD/MTTR tracked weekly and reviewed in team retro
- On-call shifts max 7 days to prevent burnout
- Postmortem action items have single owners and due dates
- SEV1 postmortem must be published within 48 hours
- Postmortem action items must be tracked to closure in a visible board

## Production Considerations
- Automate incident creation: PagerDuty + Slack integration fires channel creation automatically.
- Runbook discovery: link runbooks directly in alert payload so on-call finds them immediately.
- Postmortem tracking: use a project board to track action items to completion.
- Game days: run quarterly chaos engineering exercises that simulate real incidents.
- SLA tracking: record time-to-acknowledge and time-to-resolve per incident.
- Read-only Friday: avoid production changes that could trigger incidents before weekend.
- Blameless culture: frame postmortems as system improvements, not individual failures.
- Incident taxonomy: tag incidents by type (deploy, dependency, capacity, security) for trend analysis.
- Rate-limit PagerDuty alerts during major events to prevent alert fatigue.
- Maintain a "Incident Commander handbook" with escalation contacts and common runbook links.
- Use a dedicated Slack channel for live incident feed vs. a separate channel for coordination.
- Cross-train on-call engineers so any team member can handle any service's runbook.
- Run postmortem action item review in every sprint retro until all items are closed.

## Anti-Patterns
- IC also debugging — loses situational awareness, misses escalation triggers.
- No scribe — timeline reconstructed from memory, inaccurate.
- Fixing root cause before stopping the bleed — prolonged user impact.
- Blaming individuals in postmortem — discourages reporting, hides systemic issues.
- Skipping postmortem because "it was a simple mistake" — misses systemic improvements.
- Alert fatigue from too many P0 alerts — real incidents lost in noise.
- On-call shifting without handoff — context lost at shift change.
- No runbook — on-call wastes time figuring out basic triage steps.
- Postmortem without action items — same incident repeats.
- Incident channel goes silent — stakeholders don't know status.

## References
  - references/incident-lifecycle.md — Incident Lifecycle
  - references/incident-metrics.md — Incident Metrics
  - references/incident-response-advanced.md — Incident Response Advanced Topics
  - references/incident-response-fundamentals.md — Incident Response Fundamentals
  - references/incident-runbooks.md — Incident Runbooks
  - references/postmortem.md — Postmortem Process
  - references/severity-classification.md — Severity Classification
  - references/war-room-protocol.md — War Room Protocol
## Handoff
`dev-loop/tech-debt-tracker` for action items from postmortem
`planning/create-roadmap` for incident-driven roadmap changes
