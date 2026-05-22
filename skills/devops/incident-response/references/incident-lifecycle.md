# Incident Lifecycle

## Overview
An incident follows a structured lifecycle: detection → triage → investigation → mitigation → resolution → postmortem. Each phase has defined inputs, outputs, and responsibilities.

## Severity Matrix

| Severity | Definition | Response Time | Escalation | Examples |
|---|---|---|---|---|
| SEV1 | Complete service outage, data loss, security breach | 5 min | Page full team + management | Payment API down, database corruption, customer data exposed |
| SEV2 | Major feature degradation, partial outage | 15 min | Page primary on-call | Search slow, checkout intermittent, 5% error rate |
| SEV3 | Minor feature issue, non-critical bug | 1 business hour | Ticket + slack | Wrong label text, minor UI glitch, non-critical endpoint slow |
| SEV4 | Cosmetic, documentation, enhancement | Next sprint | Ticket | Typo in docs, optional improvement, nice-to-have feature |

## Detection
- **Monitor alerts**: Prometheus AlertManager, Datadog monitors, CloudWatch alarms
- **Synthetic checks**: automated browser tests, API health checks, uptime monitors
- **User reports**: support tickets, Twitter mentions, app store reviews
- **Security scanning**: vulnerability alerts, intrusion detection, DDoS detection
- **Automated rollback triggers**: error rate threshold breach, latency spike

## Response Phases

### Triage (5-15 min)
Validate alert is real (not false positive). Classify severity. Assign IC. Open incident channel. Initial comms to stakeholders.

### Investigation (15-60 min)
Reproduce if safe. Check dashboards, logs, traces. Determine blast radius. Identify root cause candidate. Scribe records timeline.

### Mitigation (15-120 min)
Stop the bleed: feature flag, rollback, reroute traffic, scale up. Deploy fix to non-production first. Document mitigation actions. Communicate ETA.

### Resolution (1-24h)
Verify metrics back to baseline. Confirm all users restored. Post to incident channel. Update status page. Schedule postmortem.

## Incident Command Structure
- **IC**: Coordinates, delegates, communicates with stakeholders — one person, no debugging
- **Scribe**: Live timeline — every action, decision, timestamp
- **SME(s)**: Technical investigation and mitigation — multiple possible
- **Comms**: Status updates, status page, external communication

## Key Points
- SEV1 means existing customers are actively impacted — metrics don't lie
- Response time counts from detection to action, not detection to acknowledgment
- Every incident must have an IC assigned — nobody coordinates by default
- Timeline accuracy matters for postmortem — scribe is not optional
