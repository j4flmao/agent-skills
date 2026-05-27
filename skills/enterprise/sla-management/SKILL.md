---
name: enterprise-sla-management
description: >
  Use this skill when defining SLAs, SLOs, error budgets, and service reliability targets.
  This skill enforces: SLO definition, error budget calculation, burn rate alerts, multi-tier SLA structures.
  Do NOT use for: incident response, on-call scheduling, postmortem writing.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, sla, phase-8]
---

# SLA Management Agent

## Purpose
Defines, measures, and enforces service level agreements with error budgets and burn rate alerts.

## Agent Protocol

### Trigger
Exact user phrases: SLA, service level agreement, uptime, SLO, error budget, availability, reliability target, service guarantee, SLA penalty, SLA monitoring, service level indicator, SLA breach, SLA reporting.

### Input Context
- What services need SLO definitions?
- What are the current latency, error rate, and availability baselines?
- Is there an existing SLA structure with customers?
- What are the penalty terms for SLA breaches?

### Output Artifact
SLA framework with SLO definitions, error budget calculations, burn rate alerting, and multi-tier structure.

### Response Format
```
## SLA Framework: {Service Name}
### Current Baseline: {latency p99, error rate, uptime}

### SLO Targets
| SLI | Target | Window | Measurement |
|-----|--------|--------|-------------|

### Error Budget
{total allowed downtime = (1 - SLO) × window}
{current consumption: X%}
{burn rate: X / hour}

### Tier Structure
{critical / standard / best-effort}

### Alerts
{burn rate, budget consumed, breach prediction}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] SLO targets defined with SLI measurement
- [ ] Error budget formula established per service
- [ ] Burn rate alerts configured with proper thresholds
- [ ] Multi-tier SLA structure documented
- [ ] SLA reporting automated with dashboards
- [ ] Penalty terms defined for breach scenarios
- [ ] Quarterly SLO review process documented
- [ ] Error budget policy for feature freeze

### Max Response Length
6500 tokens

## Workflow

### Step 1: SLO Definition
Define SLIs for each service: latency (p50, p95, p99), error rate (5xx / total), uptime (successful requests / total), throughput (requests/second). Set SLO targets based on customer requirements and operational capability. Use rolling windows (30 days for availability, 7 days for latency).

### Step 2: Error Budget Calculation
Error budget = (1 - SLO) × total requests in window. Example: 99.9% SLO over 30 days = 43m 12s allowed downtime. Calculate consumption rate. Define budget exhaustion policy: feature freeze at 100% consumption, focus on reliability.

### Step 3: Burn Rate Alerts
Configure multi-level burn rate alerts. Fast burn rate (consuming budget multiple times faster than expected) triggers immediate page. Slow burn rate (steady consumption above expected) triggers daily digest. Predictive alerts when budget is projected to exhaust within window.

### Step 4: Multi-Tier SLA Structure
Define tiers: Critical (99.99% uptime, <10ms p99, 15min response), Standard (99.9% uptime, <100ms p99, 1hr response), Best-Effort (no SLA, best reasonable effort). Map customers to tiers. Define credits and penalties per tier.

### Step 5: SLA Reporting and Penalty
Automate monthly SLA reports per customer. Track SLA attainment trend. Calculate service credits for breaches. Report to executive monthly. Conduct quarterly SLO review.

## Rules
- SLO targets must be achievable with current system capacity.
- Error budgets must have documented consumption policies.
- Burn rate alerts must not fire during planned maintenance windows.
- Multi-tier SLA requires clear mapping of customer to tier.
- SLA reports must be generated automatically from SLI data.
- Service credits must be calculated and issued automatically.
- SLOs reviewed quarterly with engineering and product.
- Feature freeze enforced when error budget fully consumed.

## References
  - references/error-budget.md — Error Budget Management
  - references/sla-definitions.md — SLA Definitions
  - references/sla-management-advanced.md — Sla Management Advanced Topics
  - references/sla-management-fundamentals.md — Sla Management Fundamentals
  - references/sla-monitoring.md — SLA Monitoring
  - references/slo-definition.md — SLO Definition Guide
## Handoff
For compliance-related SLA requirements, hand off to `enterprise-compliance-audit`. For cost implications of SLA tiers, hand off to `enterprise-cost-governance`.
