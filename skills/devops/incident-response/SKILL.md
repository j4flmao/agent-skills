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

### Severity Matrix (Detailed)
| Severity | Definition | Response Time | Escalation | Page |
|---|---|---|---|---|
| SEV1 | Complete outage, data loss, security breach, SLA-impacting | 5 min | Full team + management + exec | PagerDuty high-urgency |
| SEV2 | Major feature degraded, partial outage, >5% errors | 15 min | Primary + secondary on-call | PagerDuty high-urgency |
| SEV3 | Minor feature issue, single-user impact, non-critical bug | 1 business hour | Slack + ticket | PagerDuty low-urgency |
| SEV4 | Cosmetic, docs, enhancement, tech debt | Next sprint | Ticket queue | None |

### Incident Command Roles
IC (Incident Commander): owns incident end-to-end, delegates tasks, communicates with stakeholders, does NOT debug. Scribe: real-time timeline documentation — every action, decision, timestamp. SME: technical investigation and mitigation — one per subsystem, reports to IC. Comms: stakeholder status updates, status page updates, external notifications, regulatory reporting if needed. Role transitions: handoff documented in timeline with verbal 2-min summary.

### Runbook Structure
Symptoms: what alerts fire, what users experience, error messages. Triage: first checks, quick diagnostics, initial investigation commands. Escalation: conditions for escalation, who to contact (primary -> secondary -> manager). Remediation: step-by-step recovery procedures with exact commands and expected outcomes. Runbooks stored in version control alongside application code, reviewed quarterly at minimum.

### On-Call Scheduling
Primary on-call: first responder, acknowledges within SLA. Secondary: backup for overflow and deep investigation. Escalation path: primary -> secondary -> engineering manager -> VP. Tools: PagerDuty/OpsGenie for schedules, alert routing, escalation policies, incident tracking. Rotation: weekly shifts, max 7 consecutive days. Follow-the-sun for global teams. Handoff: Friday overlap, written summary of ongoing issues.

### Incident Metrics
MTTD (Mean Time to Detect): time from incident start to first alert. Target: SEV1 <5min, SEV2 <15min. MTTR (Mean Time to Resolve): time from detection to resolution. Target: SEV1 <1hr, SEV2 <4hrs. Track weekly trends, set improvement targets. Metrics drive investment in detection tooling, runbook quality, and on-call training.

## Incident Lifecycle in Depth

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

### Step 1: Classify Severity
SEV1 (Critical): complete service outage, data loss, security breach — response within 5min, page whole team + management. SEV2 (High): major feature degraded, partial outage, performance degradation affecting >5% of users — response within 15min, page primary on-call. SEV3 (Medium): minor feature issue, non-critical bug, single-user impact — response within 1 business hour, create ticket, slack notification. SEV4 (Low): cosmetic issue, documentation bug, enhancement — next sprint planning, normal ticket queue.

### Step 2: Establish Incident Command
IC (Incident Commander): owns the incident end-to-end, delegates tasks, does not debug. Scribe: documents timeline, decisions, and actions in real-time. SME (Subject Matter Expert): technical investigation and mitigation — may be multiple per subsystem. Comms: stakeholder communication, status updates, external notifications, status page updates.

### Step 3: Detect and Triage
Detection sources: monitoring alerts (Prometheus, Datadog, CloudWatch), synthetic checks (browser tests, API health probes), user reports (support tickets, social media), automated health checks, security scanning (vulnerability alerts, intrusion detection). Validate alert is not a false positive. Classify severity using matrix. Escalate if outside on-call expertise. Open dedicated incident channel.

### Step 4: Investigate and Mitigate
Investigate: check dashboards, logs, traces. Identify blast radius (users affected, services impacted). Reproduce if safe. Mitigate: stop bleed first (feature flag, rollback, traffic drain, scale up), permanent fix second. Document every action in timeline via scribe. Communicate ETA to stakeholders.

### Step 5: Resolve and Learn
Verify mitigation: confirm metrics return to baseline, test end-to-end. Declare resolved: post to incident channel, update status page. Communicate: summary to stakeholders, initial postmortem findings. Schedule postmortem within SLA (SEV1: 48h, SEV2: 1 week, SEV3: next sprint). Track action items to completion.

### Step 6: Measure Incident Metrics
MTTD (Mean Time to Detect): time from incident start to detection. MTTR (Mean Time to Resolve): time from detection to resolution. Track weekly trends, set improvement targets. Use metrics to identify gaps in detection coverage, response speed, and tooling.

### Step 7: On-Call Scheduling
Primary on-call: first responder, carries phone, acknowledges within SLA. Secondary on-call: backup, handles overflow, covers primary during deep investigation. Escalation path: primary → secondary → engineering manager → VP. Tools: PagerDuty or OpsGenie for scheduling, alert routing, escalation policies, and incident tracking. Rotation: weekly shifts, follow-the-sun for global teams.

### Step 8: Maintain Runbooks
Runbook structure per service: symptoms (what alerts fire, what users experience), triage (first checks, quick diagnostics), escalation (when to escalate and to whom), remediation (step-by-step recovery procedures). Runbooks stored in version control, reviewed quarterly, tested during game days.

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
