# Incident Lifecycle

## Overview
An incident follows a structured lifecycle: detection -> triage -> investigation -> mitigation -> resolution -> postmortem. Each phase has defined inputs, outputs, and responsibilities. The lifecycle ensures consistency, reduces chaos, and enables measurable improvement over time.

## Severity Matrix

| Severity | Definition | Response Time | Escalation | Examples |
|---|---|---|---|---|
| SEV1 | Complete service outage, data loss, security breach, SLA-impacting | 5 min | Page full team + management + exec on-call | Payment API down, database corruption, customer data exposed, auth system down |
| SEV2 | Major feature degradation, partial outage, >5% error rate | 15 min | Page primary on-call + secondary, notify manager | Search slow, checkout intermittent, 5% error rate, high latency |
| SEV3 | Minor feature issue, single-user impact, non-critical bug | 1 business hour | Ticket + slack channel, no page | Wrong label text, minor UI glitch, non-critical endpoint slow |
| SEV4 | Cosmetic, documentation, enhancement, tech debt | Next sprint | Ticket queue | Typo in docs, optional improvement, nice-to-have feature |

## Key Metrics
MTTD (Mean Time to Detect): measures efficiency of detection tooling. Calculate as average time from incident start to first acknowledged alert. Target: SEV1 <5min, SEV2 <15min. Improvement: add synthetic checks, log-based alerts, anomaly detection. MTTR (Mean Time to Resolve): measures end-to-end response effectiveness. Calculate as average time from alert acknowledgment to resolution. Target: SEV1 <60min, SEV2 <4hrs. Improvement: better runbooks, faster rollback, automated mitigation playbooks.

## Communication Cadence
SEV1: status update every 30 minutes to incident channel and stakeholders. Format: Current status, actions taken, next steps, ETA to resolution. SEV2: update every 60 minutes. SEV3: update at major changes. SEV4: no real-time updates — resolved in ticket. Communication channels: dedicated Slack/Teams incident channel, PagerDuty status updates, status page (if customer-facing), email to stakeholders per defined distribution list.

## Incident Channel Structure
Channel naming: `inc-{date}-{sev}-{service}` (e.g., `inc-20260523-sev1-payments`). Pinned posts: timeline, current IC, current status, action items, links to dashboards/runbooks. Channel sections: detection (alert details, affected services), investigation (hypotheses, findings, diagnostics), mitigation (actions taken, rollback status), resolution (verification steps, postmortem scheduling). Automated notifications: PagerDuty alert summary, Grafana dashboard links, runbook URL, on-call rotation card.

## Post-Incident Follow-Up
Postmortem scheduling: within 48h for SEV1, 1 week for SEV2. Action item tracking: tickets created in project management tool (Jira/Linear/Asana) with owner, due date, type (prevent/detect/mitigate/process). Action item review: weekly standup reviews open action items until closure target >90% closure within 30 days. Metrics review: weekly MTTD/MTTR trends presented in team retro. Runbook updates: modify runbook based on incident learnings within 1 week. Incident-driven roadmap: patterns identified across incidents feed into team roadmap for systemic improvements.
- **Monitor alerts**: Prometheus AlertManager, Datadog monitors, CloudWatch alarms, Grafana on-call
- **Synthetic checks**: automated browser tests (Playwright/Cypress), API health checks, uptime monitors (Pingdom, Checkly)
- **User reports**: support tickets (Zendesk/Intercom), Twitter mentions, app store reviews, community forums
- **Security scanning**: vulnerability alerts (Snyk, Trivy), intrusion detection (WAF, IDS), DDoS detection
- **Automated rollback triggers**: error rate threshold breach, latency spike, deploy health check failure
- **Log-based alerts**: error rate spikes in structured logs (ELK, Loki, Cloud Logging)

## Lifecycle Phases

### Phase 1: Detection (T+0 to T+5min)
Input: alert, user report, or automated signal. Actions: acknowledge alert, verify signal validity, open incident channel. Output: validated incident alert with preliminary severity.

### Phase 2: Triage (T+5min to T+15min)
Input: validated alert. Actions: classify severity using matrix, assign IC, notify escalation path, open incident channel, initial stakeholder comms. Decision points: severity upgrade/downgrade, need for additional SMEs. Output: IC assigned, severity set, communication channel open.

### Phase 3: Investigation (T+15min to T+60min)
Input: IC and SMEs assembled. Actions: reproduce issue if safe, check dashboards/logs/traces, determine blast radius (users, services, regions), identify root cause candidate. Scribe records all actions with timestamps. Output: root cause hypothesis, blast radius documented, timeline populated.

### Phase 4: Mitigation (T+15min to T+120min)
Input: root cause hypothesis. Actions: stop the bleed (feature flag, rollback to last known good, reroute traffic, scale up, block malicious traffic), deploy fix to non-production first, test fix, deploy to production. Document every mitigation action. Communicate ETA to stakeholders via Comms. Output: service restored, users unblocked, mitigation steps documented.

### Phase 5: Resolution (T+30min to T+24h)
Input: mitigation confirmed. Actions: verify metrics return to baseline, confirm all users restored, run end-to-end validation tests, post resolution to incident channel, update status page, schedule postmortem. Output: incident declared resolved, status page updated, postmortem scheduled.

### Phase 6: Postmortem (T+48h to T+1week)
Input: incident timeline, action log, metrics data. Actions: blameless timeline review, root cause analysis, action item creation, report writing. Output: postmortem document published, action items tracked.

## Incident Command System

### Roles
- **IC (Incident Commander)**: one person, coordinates and delegates, communicates with stakeholders, never debugs. Switches from SME role when incident is declared.
- **Scribe**: live timeline, every action and decision with timestamp, not optional. Uses shared doc (Google Docs, Confluence, Notion).
- **SME(s)**: technical investigation and mitigation. Multiple SMEs per subsystem. Each SME reports findings to IC, does not coordinate cross-team.
- **Comms**: status updates at defined cadence, status page updates, external communication (customers, partners), regulatory notifications if required.

### Role Transitions
Handoffs documented in timeline. Incoming role reads timeline from start. Outgoing role provides 2-minute verbal summary. No role handoff during active mitigation unless absolutely necessary.

## Escalation Paths
Primary on-call -> Secondary on-call -> Engineering manager -> Director -> VP Engineering. Each level has defined notification method (page, phone, SMS). Escalation timer resets at each level. SEV1 auto-escalates to manager after 10min without acknowledgment.

## Runbook Structure Template

### Service: {service name}
#### Symptoms
What alerts fire (exact alert names from Prometheus/Datadog), what users experience (error messages, degraded performance), what dashboards show anomaly (Grafana panel name, metric query).

#### Triage (First 5 Minutes)
1. Check {dashboard link}: verify error rate, latency, throughput
2. Check {logs link}: search for error patterns in last 15 minutes
3. Check {tracing link}: identify slow or failing traces
4. Run `{diagnostic command}`: check service health endpoint
5. If {condition}: escalate to {team}/{SME}

#### Escalation
- Primary on-call: {name/rotation}, {contact method}
- Secondary on-call: {name/rotation}
- SME: {expertise}, {contact method}
- Escalation conditions: {error rate >5%}, {latency >2s}, {users impacted >100}
- Time before escalation: {5 minutes without progress}

#### Remediation
Step 1: {action} — {command or link}
Step 2: {action} — {expected outcome}
Step 3: {action} — {verification step}
Step 4: {action} — {comms needed before/after}

#### Verification
- Check {dashboard}: metric should return to {baseline}
- Run {test}: should return {expected result}
- Monitor for {duration}: confirm no regression

#### Rollback
If remediation fails: {rollback procedure}
If partial fix: {boundary conditions for partial resolution}

## Key Points
- SEV1 means existing customers are actively impacted — metrics don't lie
- Response time counts from detection to action, not detection to acknowledgment
- Every incident must have an IC assigned — nobody coordinates by default
- Timeline accuracy matters for postmortem — scribe is not optional
- Severity can change during incident — always re-evaluate
- Communication cadence is defined by severity, not by progress
- On-call rotation uses follow-the-sun for 24/7 coverage
- MTTD target: SEV1 < 5min, SEV2 < 15min
- MTTR target: SEV1 < 1hr, SEV2 < 4hrs
- Postmortem action items tracked in project management tool with single owner
- Runbooks are living documents — review quarterly, update after every incident
- Runbooks stored in version control alongside application code — same review process
- Tabletop exercises validate runbook accuracy without infrastructure cost
