# SRE Fundamentals: Principles, Team Models and Production Readiness Reviews

The operating model of Site Reliability Engineering: core principles, how SRE engages with product teams, on-call expectations, and the production readiness review (PRR) that gates services into SRE-supported production. SLIs/SLOs, error budgets, incidents, toil and capacity have dedicated references in this skill.

## Core Principles

| Principle | Practice |
|---|---|
| Reliability is a feature with a target | SLOs agreed with product; 100 % is the wrong target |
| Error budgets balance velocity and risk | Budget remaining → ship; exhausted → reliability work first |
| Toil is bounded | Aim to keep operational toil below about half of SRE time; automate the rest |
| Monitoring serves humans | Alert on symptoms users feel; page only for urgent, actionable issues |
| Blameless learning | Postmortems focus on systems and contributing factors, not individuals |
| Simplicity | Fewer moving parts, fewer failure modes |
| Gradual change | Progressive rollouts, fast rollback, feature flags |

## Engagement Models

| Model | Description | Fits |
|---|---|---|
| Embedded | SRE sits in a product team | Early adoption, high-risk services |
| Consulting | SRE advises, product team operates | Many teams, limited SREs |
| Platform | SRE builds paved roads (deploy, observability, SLO tooling) used by all | Scale |
| Shared on-call / handoff | SRE takes primary on-call after PRR; can hand back if service is unhealthy | Mature, critical services |
| "You build it, you run it" + SRE support | Product teams on-call; SRE owns tooling and incident process | Common in cloud-native orgs |

The handback rule (SRE returns pager if the service exceeds its operational load) keeps incentives aligned.

## On-Call Fundamentals

- Rotations sized so each engineer is on-call a sustainable fraction of time (e.g. one week in six to eight), with primary and secondary.
- Paging volume target: a handful of pages per shift at most; each page actionable and linked to a runbook.
- Follow-the-sun for global teams to avoid night pages where possible.
- Compensation/time off for on-call; handoff notes between shifts.
- Escalation policies tested; contact details current.

## Production Readiness Review (PRR)

A structured review before a service launches or before SRE takes on support.

| Area | Questions |
|---|---|
| Architecture | Dependencies listed with their SLOs? Single points of failure? Multi-zone/region? |
| SLOs | User-centric SLIs defined, SLO targets agreed, dashboards live? |
| Monitoring & alerting | Symptom-based alerts with runbooks? Burn-rate alerts? Logs/traces correlated? |
| Capacity | Load tested to expected peak with headroom? Autoscaling verified? Quotas known? |
| Change management | Progressive rollout, automated rollback, config changes reviewed? |
| Failure handling | Timeouts, retries with backoff, circuit breakers, graceful degradation, load shedding? |
| Data | Backups, restore tested, RPO/RTO documented? |
| Security | Secrets management, least privilege, dependency scanning, audit logs? |
| Operations | Runbooks, on-call rotation, escalation, ownership metadata (service catalog)? |
| Disaster recovery | Region/zone failure plan exercised? |

Outcome: launch approved, approved with tracked action items, or blocked with required fixes. Track findings as tickets with owners and dates.

## PRR Checklist Template

```markdown
Service: checkout       Owner team: payments     Tier: 1
SLOs: availability 99.9% / 28d (HTTP non-5xx), latency p95 < 300 ms
Dashboards: <link>      Runbooks: <link>         On-call: payments-primary
Dependencies: payments-db (99.95%), fraud-api (99.9%), queue (managed)
Load test: 2x projected peak, p95 within SLO, no errors       [x]
Rollback: automated canary analysis + one-click rollback       [x]
Backups: daily + PITR, restore drill 2026-10-01                [x]
Open items: add circuit breaker for fraud-api (due 2026-11-15) [ ]
```

## Service Tiers

| Tier | Impact | Expectations |
|---|---|---|
| 1 | Revenue/safety critical, user-facing | 24/7 on-call, strict SLOs, multi-zone minimum, PRR mandatory |
| 2 | Important, degraded experience if down | Business-hours plus best-effort paging, SLOs |
| 3 | Internal/tooling | Ticket-based support |

Tiering determines investment; not every service needs four nines.

## Reliability Work Intake

- Error budget policy triggers (see `error-budget-policy.md`).
- Postmortem action items prioritized by recurrence risk.
- Toil reduction backlog with measured hours saved.
- PRR findings.

Review this backlog with product owners on a fixed cadence so reliability work competes fairly with features.

## Checklist
- [ ] Engagement model and handback rules documented
- [ ] On-call rotation sustainable with runbooks and escalation
- [ ] Services tiered; tier drives SLO and on-call expectations
- [ ] PRR completed before launch or SRE support, findings tracked
- [ ] Reliability backlog reviewed regularly with product
