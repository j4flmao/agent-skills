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
"incident response", "on-call", "PagerDuty", "OpsGenie", "incident management", "postmortem", "runbook", "severity", "escalation", "SEV", "SEV1", "SEV2", "SEV3", "incident command", "IC role", "incident timeline", "blameless postmortem", "incident lifecycle", "incident detection", "incident mitigation".

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

## Workflow

### Step 1: Classify Severity
SEV1 (Critical): complete service outage, data loss, security breach — response within 5min, page whole team. SEV2 (High): major feature degraded, partial outage, performance degradation — response within 15min, page primary on-call. SEV3 (Medium): minor feature issue, non-critical bug — response within 1 business hour, create ticket. SEV4 (Low): cosmetic issue, documentation bug, enhancement — next sprint planning, normal ticket.

### Step 2: Establish Incident Command
IC (Incident Commander): owns the incident end-to-end, delegates tasks, does not debug. Scribe: documents timeline, decisions, and actions in real-time. SME (Subject Matter Expert): technical investigation and mitigation — may be multiple. Comms: stakeholder communication, status updates, external notifications.

### Step 3: Detect and Triage
Detection sources: monitoring alerts (Prometheus, Datadog), user reports, automated health checks, security scanning. Validate alert is not a false positive. Classify severity. Escalate if outside on-call expertise. Open incident channel.

### Step 4: Investigate and Mitigate
Investigate: check dashboards, logs, metrics. Identify blast radius. Reproduce if safe. Mitigate: stop bleed first (rollback, feature flag, traffic drain), permanent fix second. Document every action in timeline via scribe.

### Step 5: Resolve and Communicate
Verify mitigation: confirm metrics return to baseline, test end-to-end. Declare resolved: post to incident channel, update status page. Communicate: summary to stakeholders, initial postmortem findings. Schedule postmortem.

## Rules
- IC does not touch the keyboard — IC delegates and coordinates
- Scribe documents in real-time — memory is unreliable under pressure
- Stop the bleed before finding root cause — mitigation first, investigation second
- NO blame in incident response — focus on what happened and what we can improve
- Postmortem must be scheduled before incident is closed — never "postmortem TBD"
- Communication cadence: SEV1 every 30min, SEV2 every 60min, SEV3 at major changes
- All incident channels are public by default — transparency over secrecy

## References
- `references/incident-lifecycle.md` — Severity matrix detailed definitions, detection methods, response procedures, mitigation strategies, resolution criteria, incident command system
- `references/postmortem.md` — Blameless culture principles, timeline construction, root cause analysis (5 Whys, fishbone), action item tracking, postmortem review meeting

## Handoff
`dev-loop/tech-debt-tracker` for action items from postmortem
`planning/create-roadmap` for incident-driven roadmap changes
