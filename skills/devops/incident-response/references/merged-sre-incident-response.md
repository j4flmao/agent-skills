# Incident Response: Triage Automation and Blameless Postmortems

> Reference for `devops/incident-response` — the entry point is [`../SKILL.md`](../SKILL.md). This file keeps only material the SKILL.md does not cover.

## Purpose
Reduce time-to-mitigate by turning raw alerts into a small number of enriched, correlated incidents with the right runbook attached, automate safe first-response actions, and close the loop with blameless postmortems whose action items actually get done.

## Correlation and Noise Reduction (Alertmanager)
```yaml
route:
  receiver: default
  group_by: [alertname, cluster, service]
  group_wait: 30s          # collect related alerts before first notification
  group_interval: 5m       # how often to send updates for a group
  repeat_interval: 4h
  routes:
    - matchers: [severity="page"]
      receiver: pagerduty-primary
      continue: false
    - matchers: [severity="ticket"]
      receiver: jira
inhibit_rules:
  # If the whole cluster is unreachable, don't page for every service in it
  - source_matchers: [alertname="ClusterUnreachable"]
    target_matchers: [severity="page"]
    equal: [cluster]
  # Node down suppresses pod-level alerts on that node
  - source_matchers: [alertname="NodeDown"]
    target_matchers: [alertname=~"KubePod.*"]
    equal: [node]
receivers:
  - name: pagerduty-primary
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/pd-routing-key
  - name: jira
    webhook_configs:
      - url: http://alert-to-jira.monitoring.svc:8080/hook
  - name: default
    webhook_configs:
      - url: http://alert-sink.monitoring.svc:8080/hook
```
Techniques beyond grouping: topology-aware suppression (suppress dependents of a failed dependency using the service graph), symptom-based paging (page on SLO burn, ticket on causes like disk filling), and `for:` durations to suppress flapping.

## Enrichment
Attach at alert time (labels/annotations or a webhook enricher):
- `team`, `service`, `runbook_url`, `dashboard_url` from the service catalog (e.g. Backstage).
- Recent deploys/config changes for the service (from CD system) — the most common incident cause.
- Current SLO burn and top error log lines.

## Runbook Automation
| Level | Example | Guardrails |
|---|---|---|
| Diagnostic (safe) | Collect pod logs/events, run `kubectl describe`, thread dumps, attach to incident | Read-only credentials |
| Mitigation with approval | Roll back last deploy, scale out, fail over | Human clicks approve in chat/incident tool |
| Fully automatic | Restart a stuck consumer, clear a known-bad cache key | Idempotent, max N per hour, auto-disable after repeated triggers, audit log, page if it doesn't fix |
Tools: Rundeck/PagerDuty Process Automation, StackStorm, Argo Workflows/Kubernetes Jobs triggered by webhook, cloud runbooks (AWS Systems Manager Automation).

Rule: automation that runs more than a few times per week signals a bug to fix, not a runbook to keep.

## Blameless Postmortems
**When:** every user-impacting incident above a severity threshold, any SLO budget burn > a set fraction, and near-misses worth learning from.
**Principles:** focus on how the system allowed the failure; examine the local rationality of responders ("what did the dashboards show, what did they know at the time"); no naming-and-blaming; facts with timestamps.

Template:
```
Title / Severity / Date / Authors / Status
Summary (3-4 sentences: impact, duration, root contributing factors, fix)
Impact: users affected, SLO budget consumed, revenue/data impact
Timeline (UTC): detection, escalation, key decisions, mitigation, resolution
Contributing factors (technical and organizational) — avoid single "root cause"
Detection: how we found out; how could we have found out sooner?
What went well / what was hard / where we got lucky
Action items: [type: prevent|detect|mitigate] [owner] [due date] [ticket link]
```
Action-item governance: track in the normal backlog with a label; review open items weekly in the ops review; escalate items past due. Tie to the error budget policy: if the budget is exhausted, prevention items for the largest contributors take priority over features.

## Metrics to Track
- MTTA (time to acknowledge), time to mitigate, time to resolve — trend, don't target blindly.
- Pages per shift and % actionable (aim for most pages to require action).
- Repeat incidents with the same contributing factor.
- Postmortem action items closed on time.

## Anti-Patterns
- Paging on causes (CPU 90%) instead of symptoms.
- Auto-remediation without rate limits (restart loops hide real outages).
- Postmortems that end with "human error" or "be more careful".
- Action items without owners/due dates, or stored only in the doc.

## Checklist
- [ ] Alertmanager grouping + inhibition reviewed against the last month's pages.
- [ ] Runbook link required on every paging rule (lint in CI).
- [ ] Automation tiers defined with approval and rate limits.
- [ ] Postmortem template + weekly review of action items.

## References
- [incident-lifecycle.md](incident-lifecycle.md), [incident-runbooks.md](incident-runbooks.md), [postmortem.md](postmortem.md)
- Toil reduction: `skills/devops/sre-practices/references/toil-automation.md`
