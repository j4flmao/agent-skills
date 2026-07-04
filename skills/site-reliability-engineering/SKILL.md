---
name: site-reliability-engineering
description: >
  Comprehensive site reliability engineering skill
  for managing SLOs, SLAs, incident response,
  and infrastructure monitoring.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [sre, devops, reliability, monitoring]
---
# Site Reliability Engineering

## Purpose
This skill manages site reliability engineering tasks, covering SLO/SLA management, incident response, observability, and infrastructure scaling to ensure highly available systems.

## Core Principles
1. Embrace Risk: Balance reliability with feature velocity using error budgets.
2. Service Level Objectives: Define measurable reliability targets.
3. Eliminate Toil: Automate repetitive, non-creative operational tasks.
4. Monitoring: Base alerting on symptoms rather than causes.
5. Blameless Postmortems: Focus on systemic improvements rather than human error.

## Agent Protocol
- Triggers: Incident alerts, high error rates, SLA threshold breaches.
- Input Context Required: Metrics, logs, trace IDs, deployment history.
- Output Artifact: Incident reports, updated PromQL rules, runbooks.
- Response Formats:
```json
{
  "incident_id": "INC-1234",
  "status": "investigating",
  "affected_services": ["api-gateway"]
}
```

## Decision Matrix
```
[High Error Rate?]
      |
      v
+-------------+
| Yes -> Is it|--> (No) -> Log & Monitor
| localized?  |
+-------------+
      | (Yes)
      v
[Rollback Deployment]
```

## Detailed Architectural Overview
```
[Prometheus] --> [Alertmanager] --> [Agent] --> [PagerDuty/Slack]
     ^
     |
[Services/Nodes]
```
Lifecycle Diagram:
```
Define SLOs -> Implement Monitoring -> Alerting -> Incident Response -> Postmortem
```

## Workflow Steps
Phase 1: Preparation
1. Identify critical user journeys.
2. Define SLIs and SLOs.
3. Setup error budget tracking.
Phase 2: Observability Setup
1. Configure Prometheus scrapers.
2. Implement distributed tracing.
3. Set up centralized logging.
Phase 3: Alerting Configuration
1. Define symptom-based alerts.
2. Route alerts via Alertmanager.
3. Suppress noisy alerts.
Phase 4: Incident Response
1. Acknowledge alert.
2. Investigate root cause.
3. Mitigate impact.
Phase 5: Resolution
1. Verify system stability.
2. Resolve incident ticket.
3. Communicate resolution to stakeholders.
Phase 6: Post-Incident
1. Draft blameless postmortem.
2. Identify action items.
3. Update runbooks.

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| API 500s | DB overload | Scale read replicas |
| High Latency | Network partition | Check peering connections |
| Out of Memory | Memory leak | Restart pods, profile code |
| Disk Full | Log rotation failure | Clear old logs, fix rotation |
| Pod CrashLoop | Misconfiguration | Check configmaps/secrets |
| CPU Throttling| Limits too low | Increase CPU limits |

## Complete Execution Scenario
```
Alert -> Agent triggered -> Fetch logs -> Identify DB spike -> Restart connection pool -> Alert resolved
```

## Rules and Guidelines
1. Always prioritize user impact.
2. Never alert on causes, only symptoms.
3. Ensure actionable alerts.
4. Maintain blameless culture.
5. Document all operational procedures.

## Reference Guides
- [SLA Calculations](references/sla_calculations.md)
- [PromQL Rules](references/promql_rules.md)
- [Incident Management](references/incident_management.md)
- [SLO Definitions](references/slo_definitions.md)
- [Capacity Planning](references/capacity_planning.md)
- [Disaster Recovery](references/disaster_recovery.md)
- [Toil Reduction](references/toil_reduction.md)
- [On-Call Best Practices](references/on_call.md)

## Handoff
Refer to `infrastructure-as-code` skill for provisioning.
<!-- COMPRESSION_FOOTER_HTML_COMMENT_SRE -->
