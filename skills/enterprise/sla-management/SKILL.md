---
name: enterprise-sla-management
description: >
  Use this skill when defining SLAs, SLOs, error budgets, and service reliability targets.
  This skill enforces: SLO definition, error budget calculation, burn rate alerts, multi-tier SLA structures.
  Do NOT use for: incident response, on-call scheduling, postmortem writing.
version: "2.0.0"
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
Defines, measures, and enforces service level agreements with error budgets, burn rate alerts, and multi-tier reliability structures.

## Agent Protocol

### Trigger
Exact user phrases: SLA, service level agreement, uptime, SLO, error budget, availability, reliability target, service guarantee, SLA penalty, SLA monitoring, service level indicator, SLA breach, SLA reporting, SLA negotiation, service credit, burn rate, feature freeze.

### Input Context
- What services need SLO definitions and what are their current reliability baselines?
- What are the current latency (p50, p95, p99), error rate, and availability baselines?
- Is there an existing SLA structure with customers — what tiers, targets, and penalties exist?
- What are the penalty terms for SLA breaches and how are service credits calculated?
- What is the team's current on-call and incident response maturity?
- What are the business priorities: maximum reliability, feature velocity, or balanced?

### Output Artifact
SLA framework with SLO definitions, error budget calculations, burn rate alerting, and multi-tier structure.

### Response Format
```
## SLA Framework: {Service Name}
### Current Baseline: {latency p99, error rate, uptime}

### SLO Targets
| SLI | Target | Window | Measurement Method |
|-----|--------|--------|-------------------|
| {sli} | {target} | {window} | {method} |

### Error Budget
Total allowed downtime: {value} = (1 - SLO) x window
Current consumption: {X%}
Burn rate: {X/hour} — {fast / slow / nominal}
Projected exhaustion: {date} at current burn rate

### Tier Structure
Critical: {SLO targets} — {penalty terms}
Standard: {SLO targets} — {penalty terms}
Best-Effort: {no SLA} — {no penalty}

### Alerts
Page (immediate): burn rate >= {threshold} for {duration}
Digest (daily): burn rate >= {threshold} for {duration}
Predictive: budget projected to exhaust within {timeframe}

### Feature Freeze Policy
Trigger: error budget {X%} consumed
Action: {feature freeze scope and duration} until budget is replenished
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] SLO targets defined with SLI measurement methods and rolling windows
- [ ] Error budget formula established per service with consumption tracking
- [ ] Burn rate alerts configured with proper thresholds for fast/slow/predictive
- [ ] Multi-tier SLA structure documented with customer-to-tier mapping
- [ ] SLA reporting automated with dashboards per tier and per customer
- [ ] Penalty and service credit terms defined for breach scenarios
- [ ] Quarterly SLO review process documented with engineering and product
- [ ] Error budget policy for feature freeze defined and enforced
- [ ] SLO target validation against current system capacity

### Max Response Length
6500 tokens

## Workflow

### Step 1: SLO Definition
Define Service Level Indicators (SLIs) for each service: latency (p50, p95, p99) — measured from request receipt to response completion, excluding client-side network time; error rate (5xx / total requests) — includes all server-side errors, excludes client errors (4xx); uptime (successful requests / total requests) — using a request-based or time-based measurement window; throughput (requests per second) — peak and average loads.

For each SLI, define measurement method: server-side metrics from application performance monitoring, request-based (count successful vs. total requests), time-based (availability measured in minutes of uptime per window), synthetic monitoring (external probes measuring from user locations).

Set SLO targets based on: customer requirements (what does the contract require?), operational capability (what can the team consistently deliver?), business priorities (reliability vs. feature velocity), and competitive positioning (what do competitors offer?).

Use rolling windows for measurement: 30 days for availability SLOs, 7 days for latency SLOs. Rolling windows prevent permanent deficit from single incidents and allow recovery over time.

### Step 2: Error Budget Calculation
Error budget = (1 - SLO) x total measurement units in window. For availability: (1 - 0.999) x 30 days x 24 hours x 60 minutes = 43.2 minutes allowed downtime per month. For latency: (1 - 0.99) x total requests = 1% of requests may exceed latency target.

Distinguish between error budgets for internal SLOs (engineering targets) and contractual SLAs (customer-facing guarantees). Internal SLOs should be tighter than external SLAs to provide buffer.

Track error budget consumption rate: budget consumed / total budget x 100%. Monitor as a running percentage over the window. Define consumption thresholds: 50% (warning), 75% (alert), 100% (exhausted).

Define budget exhaustion policy: at 100% consumption, all non-critical feature work stops. Team focuses exclusively on reliability improvements until budget is replenished (error rate drops, budget accumulates). This creates a direct feedback loop between reliability and feature velocity.

### Step 3: Burn Rate Alerts
Configure multi-level burn rate alerts based on how fast the error budget is being consumed relative to the expected rate:

Fast burn rate: consuming budget at a rate that would exhaust it in < 6 hours if sustained. Triggers immediate page (PagerDuty, OpsGenie). Indicates critical incident requiring immediate response.

Slow burn rate: consuming budget at a rate that would exhaust it in < 3 days if sustained. Triggers daily digest alert. Indicates systemic issue requiring investigation but not immediate page.

Nominal burn rate: consuming budget at or below expected rate. No alert needed. Normal operation.

Predictive alerts: when the current burn rate trend indicates budget will exhaust before the window closes. "At current burn rate, budget will exhaust in 14 days." Allows proactive intervention before exhaustion.

Alert thresholds should be calibrated per service based on SLO target, traffic volume, and incident response time. A 99.99% SLO service has less error budget and needs faster alerting than a 99.9% service.

### Step 4: Multi-Tier SLA Structure
Define service tiers based on customer requirements and operational investment:

Critical tier (99.99% uptime, <10ms p99 latency, 15-minute response time): for enterprise customers with revenue-critical dependency on the service. Highest operational investment (dedicated support, proactive monitoring, redundancy across regions). Highest penalty for breach (5-10x monthly fee service credits).

Standard tier (99.9% uptime, <100ms p99 latency, 1-hour response time): for standard business customers. Standard operational support. Standard penalty for breach (1-5% monthly fee service credits per 0.1% below SLO).

Best-effort tier (no SLO, best reasonable effort): for free-tier or trial users. No guaranteed reliability. No SLA contract. No penalty for downtime.

Map customers to tiers in the contract. Document tier assignment with customer name, contract terms, SLA targets, penalty structure, and support commitment.

### Step 5: SLA Reporting and Penalty
Automate monthly SLA reports per customer: SLO attainment percentage (actual vs. target), downtime incidents (count, duration, root cause), latency performance (p50, p95, p99), service credits earned (if any), trend vs. previous months.

Track SLA attainment trend over rolling 12 months to identify degradation or improvement patterns. Report to executive monthly with overall SLA health score.

Service credits: calculate automatically based on breach duration and customer tier. Issue credits on next invoice. Track credit cost as a percentage of revenue — high credit costs indicate systemic reliability problems.

Quarterly SLO review: engineering and product review SLO targets, error budget consumption trends, burn rate patterns, and credit costs. Adjust SLO targets if system capacity has changed (upgraded infrastructure) or customer requirements have evolved.

## Decision Trees

### SLO Target Selection Decision Tree

1. Is there customer contractual SLA requirement?
   - YES -> Set SLO at contractual level. Set internal SLO 2x stricter than contractual. Ensure measurement methodology matches contract language.
   - NO -> Go to 2

2. Is there existing historical performance data (3+ months)?
   - YES -> Set SLO at current performance + 10% improvement margin. Validate achievable. Tighten quarterly.
   - NO -> Set conservative SLO (99.9% availability, 500ms p99 latency). Monitor for 3 months. Adjust based on actual performance.

3. Is the service customer-facing?
   - YES -> Set SLO based on user experience metrics (request-based measurement, user-perceived latency). Include synthetic monitoring from user locations.
   - NO -> Set SLO based on internal SLIs (system availability, internal API latency). May be looser than customer-facing services.

4. Is the service revenue-critical?
   - YES -> Set tight SLO (99.99%+). Low error budget tolerance. Fast burn rate alerts. Feature freeze at 50% budget consumption.
   - NO -> Set standard SLO (99.9%). Normal error budget. Standard burn rate alerts. Feature freeze at 100% consumption.

### Error Budget Policy Decision Tree

1. Has error budget reached 50% consumption?
   - YES -> Yellow status. Flag in engineering standup. Prioritize reliability work in next sprint. No feature freeze yet.
   - NO -> Green status. Normal feature work. Continue monitoring.

2. Has error budget reached 75% consumption?
   - YES -> Orange status. Escalate to engineering manager. Reliability sprint planned. Feature freeze discussions begin. Daily burn rate monitoring.
   - NO -> Continue current status.

3. Has error budget reached 100% consumption?
   - YES -> Red status. Feature freeze activated. All non-critical deployments blocked. Reliability rotation formed. Incident review accelerated. Budget replenishment plan required.
   - NO -> Continue current status. Review trend.

4. Is error budget replenishing after exhaustion?
   - YES -> Track replenishment rate. Lift feature freeze when budget exceeds 25% and holding steady. Post-incident review completed.
   - NO -> Investigate root cause of continued consumption. Escalate to executive. Consider SLO target adjustment.

### Multi-Tier SLA Design Decision Tree

1. Do customers have different willingness to pay?
   - YES -> Design tiers aligned to price points. Higher price = tighter SLO + faster support response. Ensure price delta justifies operational cost delta.
   - NO -> Single SLA tier for all customers. Consider two tiers (standard + premium) for future segmentation.

2. Is there existing customer contract diversity?
   - YES -> Map existing contracts to proposed tiers. Grandfather existing terms. Offer migration incentives to standardize.
   - NO -> Define tiers from scratch. Align with product pricing tiers.

3. Can operations team support differentiated response?
   - YES -> Implement dedicated support for critical tier. Pooled support for standard. Self-service for best-effort.
   - NO -> Start with two tiers (standard + premium). Expand as operations team grows.

## Framework / Methodologies

### Google SRE (Site Reliability Engineering) Framework
Core principles: service level indicators (SLIs) measure reliability from the user's perspective. Service level objectives (SLOs) set reliability targets. Error budgets define the acceptable amount of unreliability. Burn rate alerts trigger when error budget is consumed too quickly. Feature freeze stops feature work when error budget is exhausted.

Four golden signals: latency (time to serve request), traffic (demand on system), errors (failed requests), saturation (how full the service is). Monitor and set SLOs on all four signals.

### Multi-Window, Multi-Burn-Rate Alerting
Recommended by Google SRE for balancing detection speed with alert fatigue. Two windows (short and long), two burn rates (fast and slow). Short window + fast burn rate = immediate page (critical incident detected quickly). Long window + slow burn rate = daily alert (systemic degradation detected without noise). No alert when burn rate is nominal.

### Error Budget Policy Framework
Error budget tracking: consume budget when SLI falls below SLO threshold. Budget is replenished when SLI is above SLO threshold over the rolling window. Policy levels: green (>50% budget remaining) — normal feature work. Yellow (25-50% remaining) — reliability work prioritized, feature work slowed. Red (<25% remaining) — feature freeze, all hands on reliability.

### Three-Stage SLO Lifecycle
Stage 1 — Definition: define SLIs, set SLO targets, establish measurement, document for all services.

Stage 2 — Monitoring: implement instrumentation, build dashboards, configure alerts, track attainment.

Stage 3 — Improvement: review targets quarterly, analyze breach patterns, invest in reliability, tighten SLOs as capability improves.

### SLA Governance Framework

#### SLA Review Cadence
- Weekly: Error budget status in engineering standup. Burn rate trend review. Feature freeze status check.
- Monthly: SLA attainment report reviewed by engineering management. Service credit cost analysis. Top breach causes identified.
- Quarterly: SLO target review with engineering + product + executives. Tier structure assessment. Error budget policy adjustment. Capacity planning for reliability improvements.
- Annually: Full SLA framework audit. Competitive benchmark. Customer satisfaction correlation analysis. Framework version update.

#### SLA Governance Roles
- SLO Owner: Defines and maintains SLO targets per service. Reviews attainment. Proposes adjustments.
- Error Budget Manager: Monitors consumption. Enforces feature freeze policy. Escalates at threshold levels.
- SLA Reporting Lead: Generates monthly reports. Automates measurement and calculation. Maintains reporting infrastructure.
- Service Credit Approver: Validates credit calculations. Approves credit issuance. Tracks credit cost trends.

## Common Pitfalls

### SLOs Too Tight
Setting SLO targets that current system capacity cannot meet. Results in constant breach, exhausted error budget, feature freeze, and demoralized engineering team. Mitigation: set initial SLOs based on 3 months of historical performance data. Tighten gradually as reliability improves.

### SLOs Too Loose
Setting SLO targets that do not reflect customer expectations. Results in satisfied internal metrics but dissatisfied customers. Mitigation: validate SLO targets with customer requirements. Set targets at or above customer expectations.

### Error Budget Not Visible
Tracking error budgets in a dashboard that nobody checks. The error budget is useless if it is not visible to decision-makers. Mitigation: display error budget prominently on team dashboards, include in daily standups, and reference in sprint planning.

### Feature Freeze Not Enforced
Having an error budget policy but never enforcing the feature freeze when budget is exhausted. The error budget mechanism loses all credibility. Mitigation: automate feature freeze enforcement through deployment pipeline. Block non-critical deployments when budget is exhausted.

### Measuring the Wrong SLIs
Measuring internal metrics (server CPU, disk I/O) instead of user-facing metrics (request latency, error rate). The SLA should reflect the user experience, not internal system health. Mitigation: define SLIs from the user's perspective. Use request-based measurement, not system-based.

### Ignoring the Error Budget Window
Not accounting for the rolling window in error budget calculations. A fixed calendar month window resets every month, allowing a bad month to be followed by a fresh start. A rolling window carries deficits forward. Choose the window type that matches business requirements.

### One-Size-Fits-All SLA
All customers receive the same SLA regardless of their needs and revenue contribution. Enterprise customers overpay for basic SLA; small customers get SLA that cannot be operationally supported. Mitigation: implement multi-tier SLA structure. Align operational investment with customer value.

### Alert Fatigue from Poor Burn Rate Configuration
Single-threshold alerting on error budget creates too many pages. Team becomes desensitized and misses real incidents. Mitigation: implement multi-window, multi-burn-rate alerting. Calibrate thresholds per service. Test alert configurations.

## Best Practices

### SLO Definition
- Define SLIs from the user's perspective — measure what users experience, not what the system does internally.
- Use request-based measurement (successful requests / total requests) rather than time-based for accuracy.
- Set SLO targets based on historical data plus a margin for improvement, not aspirational targets.
- Make internal SLOs 2x stricter than external SLAs to provide buffer against customer-facing breaches.
- Document SLO targets, measurement methods, and window definitions in a shared SLO catalog.

### Error Budget Management
- Display error budget consumption on engineering dashboards in real time.
- Track error budget burn rate, not just consumption level — burn rate predicts exhaustion.
- Include error budget status in sprint planning: teams should allocate reliability work proportional to budget consumption.
- Automate feature freeze enforcement when error budget is exhausted — do not rely on manual decisions.
- Replenish error budget only through improved reliability, not window resets (for rolling windows).

### Alerting
- Use multi-window, multi-burn-rate alerting to balance detection speed and alert fatigue.
- Calibrate burn rate thresholds per service: tighter for critical services, looser for standard.
- Exclude planned maintenance windows from burn rate calculations.
- Test alert configurations regularly with chaos engineering or incident drills.
- Review alert effectiveness quarterly: how many pages led to incidents? How many incidents were missed?

### Multi-Tier Design
- Tier definitions should reflect real differences in operational investment and customer value.
- Map customers to tiers in the contract with clear target expectations.
- Provide tier-specific dashboards and reports to customers.
- Review tier assignments annually — customers may have upgraded needs.
- Support teams should be aligned with tiers (dedicated for critical, pooled for standard).

### SLA Negotiation
- Never commit to SLO targets that current system capacity cannot meet. Baseline for 3 months before negotiating.
- Define measurement methodology explicitly in contract language. Ambiguity leads to disputes.
- Include exclusion windows for planned maintenance. Define what counts as downtime and what does not.
- Define service credit calculation formula precisely. Use tiered credit rates (more credit for larger breaches).
- Include mutual SLA commitments: customer must maintain minimum usage, provide timely access, and follow integration guidelines.

## Templates & Tools

### SLO Definition Template
```
### Service: {service name}
| SLI | Measurement Method | Target | Window | Exclusions |
|-----|-------------------|--------|--------|-----------|
| Uptime | successful / total requests | {X%} | {30 days rolling} | maintenance, client errors |
| Latency p99 | {X}ms percentile from server logs | {X}ms | {7 days rolling} | scheduled jobs |
| Error rate | 5xx / total requests | {X}% | {7 days rolling} | client errors |

### Internal SLO (2x stricter)
Uptime: {X%} | Latency: {X}ms | Error rate: {X}%
```

### Error Budget Calculator
```
### Service: {service name}
SLO Target: {X%} availability
Window: {30 days}
Total minutes in window: 43,200
Allowed downtime: 43,200 x (1 - {0.999}) = {43.2} minutes
Allowed failed requests: total_requests x (1 - {0.999})
Current budget consumed: {X minutes / X requests}
Consumption rate: {X%}

### Burn Rate Status
Fast burn (page): rate > {X}/hour for > {Y} minutes
Slow burn (digest): rate > {X}/hour for > {Y} hours
Nominal: rate <= expected rate
Projected exhaustion date: {date} at current burn rate
```

### Burn Rate Alert Configuration
```
### Service: {service name} — SLO: {99.9%}
Alert 1 — Fast burn (critical):
- Window: 1 hour
- Threshold: burn rate >= 10 (consuming 10x budget rate)
- Action: immediate page, incident response

Alert 2 — Slow burn (warning):
- Window: 6 hours
- Threshold: burn rate >= 2 (consuming 2x budget rate)
- Action: daily digest email, investigation ticket created

Alert 3 — Predictive (advisory):
- Window: 24 hours
- Threshold: projected exhaustion within 7 days
- Action: notify team lead, schedule reliability work

### Maintenance Window Exclusion
Configured maintenance windows: {schedule}
Excluded from burn rate calculation: {yes/no}
Manual override available: {yes/no}
```

### Multi-Tier SLA Template
```
### Tier: {Critical / Standard / Best-Effort}
| Metric | Target | Measurement | Penalty |
|--------|--------|------------|---------|
| Uptime | {X%}   | rolling 30 days | {credit calculation} |
| Latency p99 | {X}ms | rolling 7 days | {credit calculation} |
| Error rate | {X}% | rolling 7 days | {credit calculation} |
| Response time | {X} minutes | per incident | {credit calculation} |

### Customer Assignments
| Customer | Contract Date | Tier | Contact | Escalation |
|----------|-------------|------|---------|-----------|
| {customer} | {date} | {tier} | {contact} | {path} |

### Support Commitment
Critical: dedicated support engineer, 15-minute response, 1-hour fix, 24/7 coverage.
Standard: pooled support, 1-hour response, 4-hour fix, business hours coverage.
Best-Effort: community support, best effort, no guaranteed response time.
```

### SLA Report Template
```
### Monthly SLA Attainment Report
Service: {name}
Period: {month} {year}
Customer: {customer name} / Tier: {tier}

| SLI | Target | Actual | Attained | Trend |
|-----|--------|--------|---------|-------|
| Uptime | {X}% | {X}% | {yes/no} | {up/down/flat} |
| Latency p99 | {X}ms | {X}ms | {yes/no} | {up/down/flat} |
| Error rate | {X}% | {X}% | {yes/no} | {up/down/flat} |

### Incidents
{count} incidents, {total duration} downtime
Root causes: {summary}

### Service Credits
Credits earned: {amount} ({X}% of monthly fee)
Credits issued: {yes/no} — credit memo {number}

### Overall Assessment
{pass / breach — summary}
```

### Quarterly SLO Review Template
```
### SLO Review: {service name}
Review date: {date}
Participants: {engineering, product, management}

### SLO Performance (past 3 months)
Uptime attainment: {X%} vs. target {X%}
Latency attainment: {X%} vs. target {X%}
Error rate attainment: {X%} vs. target {X%}
Error budget consumption: {X%} average

### Breach Analysis
Breaches: {count} | Total credit cost: {amount}
Root cause themes: {summary}
Remediation actions: {list and status}

### SLO Target Adjustment
Proposed changes: {list}
Rationale: {reasons}
Approved: {yes/no} — effective: {date}

### Action Items
| Action | Owner | Due Date |
|--------|-------|---------|
| {action} | {owner} | {date} |
```

## Case Studies

### E-Commerce SLA Tier Restructuring
An e-commerce platform had a single SLA for all customers: 99.9% uptime. Enterprise customers complained that latency was too high during peak shopping periods (p99 latency of 800ms vs. a 200ms expectation). Support was overwhelmed with SLA breach claims from customers who were paying very different amounts.

Restructured into three tiers: Critical (99.99% uptime, <100ms p99, dedicated support) for top 20 customers generating 60% of revenue; Standard (99.9% uptime, <500ms p99, standard support) for mid-market customers; Best-Effort (no SLA) for small customers on self-serve plans.

Results: enterprise customer satisfaction improved 40%. Support team focused on critical tier customers. Service credit costs decreased 35% because targets matched operational capability per tier. Revenue from critical tier customers grew 22% after the restructuring.

### Error Budget Feature Freeze Enforcement
A SaaS company had a 99.9% SLO for their core API service but never enforced the error budget policy. Error budget was repeatedly exhausted. Reliability degraded. Customer complaints increased. Engineering team was asked to maintain both feature velocity and reliability without trade-offs.

Implemented automated feature freeze: deployment pipeline checks error budget consumption before allowing non-critical deployments. At budget exhaustion, only reliability fixes, dependency upgrades, and security patches could be deployed. Over 6 months: error budget consumption dropped from 140% average to 40% average. Feature velocity initially dropped 30% but recovered to 90% of pre-freeze levels as reliability improved and fewer incidents interrupted feature work. Customer NPS improved from 28 to 52.

### Multi-Window Burn Rate Alert Implementation
A fintech service had a single alert: page when error budget drops below 50%. Alert fatigue was high — 23 pages per week, most of which were noise. Real incidents were missed because the team was desensitized to alerts.

Implemented multi-window, multi-burn-rate alerting: fast burn (1-hour window, burn rate > 10) — immediate page, average 2 per week. Slow burn (6-hour window, burn rate > 2) — daily digest, average 5 per week but batched into one notification. Predictive (24-hour window, projected exhaustion within 7 days) — team notification, 1-2 per week.

Results: pages reduced from 23 to 2 per week. Incident response time improved because the team responded to real pages instead of ignoring noise. Two incidents that would have been missed under the old system were caught early by slow burn alerts. Team satisfaction with on-call improved significantly.

### SaaS SLA Negotiation Gone Wrong
A B2B SaaS company negotiated a 99.99% SLA to win a large enterprise deal without validating current system capability. Actual system availability was 99.95%. The first month after signing delivered three incidents totaling 45 minutes of downtime. The error budget of 4.32 minutes was exhausted on day 3. Service credits for the first quarter exceeded the contract's annual revenue.

Remediation: immediate reliability investment (multi-region deployment, load testing, redundancy). Renegotiated SLA to 99.95% with a 99.99% target for a subset of APIs. Implemented real-time SLO dashboards for the customer. Internal SLO set at 99.995% to provide buffer. Lessons learned: never negotiate SLA without validating against current system capability. Include phase-in period in new SLAs.

## Rules
- SLO targets must be achievable with current system capacity — do not commit to targets that cannot be met.
- Error budgets must have documented consumption policies and escalation procedures.
- Burn rate alerts must not fire during planned maintenance windows (with proper exclusion).
- Multi-tier SLA requires clear mapping of customer to tier with documented contract terms.
- SLA reports must be generated automatically from SLI data — no manual calculation.
- Service credits must be calculated and issued automatically based on predefined formulas.
- SLOs reviewed quarterly with engineering and product stakeholders.
- Feature freeze enforced when error budget is fully consumed — reliability takes priority.
- Internal SLOs must be stricter than external SLAs to provide buffer against breaches.
- Error budget consumption rate must be visible to all engineering teams, not just management.
- SLA monitoring must use request-based measurement for accuracy, not time-based approximation.
- SLA negotiation requires validation against current system capacity before commitment.
- Multi-tier SLA structure must align operational investment with customer revenue contribution.
- Burn rate alert thresholds calibrated per service, not one-size-fits-all.
- SLO targets tightened incrementally as reliability improves, not in large jumps.

## References
  - references/error-budget.md — Error Budget Management
  - references/sla-definitions.md — SLA Definitions and Terminology
  - references/sla-design-negotiation.md — SLA Design and Negotiation
  - references/sla-management-advanced.md — SLA Management Advanced Topics
  - references/sla-management-fundamentals.md — SLA Management Fundamentals
  - references/sla-monitoring.md — SLA Monitoring
  - references/sla-monitoring-reporting.md — SLA Monitoring and Reporting
  - references/slo-definition.md — SLO Definition Guide

## Handoff
For compliance-related SLA requirements, hand off to `enterprise-compliance-audit`. For cost implications of SLA tiers and service credits, hand off to `enterprise-cost-governance`. For incident response processes triggered by burn rate alerts, hand off to `enterprise-incident-response`.
