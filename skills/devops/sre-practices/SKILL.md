---
name: devops-sre-practices
description: >
  Use when the user asks about Site Reliability Engineering, SRE, SLI, SLO,
  error budgets, toil reduction, reliability engineering, incident analysis,
  postmortems, production readiness, reliability dashboards, service level
  objectives, burn rate alerts, multi-window multi-burn-rate SLOs, or
  reliability maturity. This skill enforces: SLI/SLO definitions per service,
  error budget tracking with burn rate alerts, toil measurement and
  automation, blameless postmortems with action tracking, and production
  readiness reviews.
  Do NOT use for: general monitoring (monitoring), incident response tools
  (incident-response), or chaos engineering (chaos-engineering).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, sre, sli, slo, error-budget, reliability, phase-3]
---

# SRE Practices

## Purpose
Implement Site Reliability Engineering practices: define SLIs/SLOs aligned with business goals, manage error budgets with burn rate alerts, systematically reduce toil, conduct blameless incident analysis, build production readiness reviews, and mature reliability culture across the organization.

## Agent Protocol

### Trigger
Exact user phrases: "SRE", "site reliability", "SLI", "SLO", "error budget", "error budget policy", "burn rate", "toil", "toil reduction", "reliability engineering", "postmortem", "incident analysis", "5 whys", "production readiness review", "PRR", "reliability dashboard", "multi-window", "multi-burn-rate", "reliability maturity", "SLO monitoring", "service level objective", "service level indicator".

### Input Context
- Current monitoring and alerting stack (Prometheus, Datadog, Grafana)
- Existing incident response process
- Team size and on-call rotation structure
- Current service-level objectives (if any)
- Known reliability pain points and past incidents
- Business context (revenue-critical services vs internal tools)

### Output Artifact
SLI/SLO definition document, error budget policy, burn rate alert rules, toil assessment with reduction plan, postmortem template, production readiness checklist, and reliability dashboard configuration.

### Response Format
Prometheus recording rules, Grafana dashboard JSON, markdown documents, and YAML alert rules. No preamble. No postamble. No filler.

### Completion Criteria
- [ ] SLIs identified and instrumented for each tier of service
- [ ] SLO targets defined with business stakeholder agreement
- [ ] Error budget policy documented with burn rate alerts
- [ ] Error budget visible on a shared dashboard
- [ ] Toil assessment completed with measurable reduction targets
- [ ] Postmortem culture established (blameless, actionable, tracked)
- [ ] Production readiness review checklist created and used
- [ ] Reliability maturity baseline assessed with improvement roadmap

## Architecture / Decision Trees

### SLO Target Decision Tree

```
What is the service's business criticality?
  Revenue-critical (checkout, payments, auth):
    → User-facing API: 99.95% (3.5 nines), monthly error budget ~22 min
    → User-facing page load: 99.9% (3 nines), p95 < 2s

  Customer-facing but not revenue-critical (search, browse, profile):
    → 99.9% (3 nines), monthly error budget ~43 min

  Internal platform (CI/CD, monitoring, API gateways):
    → 99.9% (3 nines) if supporting revenue-critical services
    → 99.5% (2 nines) if dev-facing only

  Batch/async (reporting, analytics, ETL):
    → 99.5% (2 nines) with completion SLO (99.9% of jobs complete within SLA window)

  Internal tooling (admin panels, debug endpoints):
    → 99% (2 nines) — no SLO tracking needed

  Non-critical (demos, prototypes):
    → Best effort — no SLO
```

### Service Tier Classification

| Tier | Definition | SLO Target | Error Budget (30d) | On-call Response |
|------|------------|------------|-------------------|------------------|
| Tier 0 | Revenue-critical, customer-facing | 99.99% | 4.3 min | 5 min page |
| Tier 1 | Customer-facing, indirect revenue | 99.95% | 21.6 min | 15 min page |
| Tier 2 | Internal platform | 99.9% | 43.2 min | 30 min |
| Tier 3 | Internal tools, batch jobs | 99.5% | 3.6 h | 1 business hour |
| Tier 4 | Experimental, demos | Best effort | N/A | Next day |

## Core Workflow

### Step 1: Define SLIs (Service Level Indicators)

```yaml
slis:
  availability:
    definition: "Fraction of successful requests"
    measurement: "sum(rate(http_requests_total{status!~'5..'}[5m])) / sum(rate(http_requests_total[5m]))"
    source: "Prometheus from application metrics"
    excludes:
      - "Planned maintenance windows"
      - "Client-side errors (4xx)"

  latency:
    definition: "Fraction of requests below threshold"
    measurement: |
      sum(rate(http_request_duration_seconds_bucket{le="0.2"}[5m]))
      /
      sum(rate(http_request_duration_seconds_count[5m]))
    source: "Prometheus histogram"
    thresholds:
      p50: "100ms"
      p95: "200ms"
      p99: "500ms"

  freshness:
    definition: "Age of latest data point"
    measurement: "time() - max(timestamp_seconds)"
    source: "Application metric"
    threshold: "300s (5 minutes since last update)"

  durability:
    definition: "Fraction of written data not lost"
    measurement: "Audit-based (not real-time metric)"
    source: "Periodic integrity checks"
    threshold: "99.999999% (11 nines)"

  throughput:
    definition: "Request rate relative to expected minimum"
    measurement: "sum(rate(http_requests_total[5m]))"
    source: "Prometheus"
    threshold: "> 10 req/s (baseline - 50% drop = page)"
```

### Step 2: Set SLO Targets with Error Budgets

```yaml
slo_definitions:
  tier_0_api:
    service_name: "checkout-api"
    sli_composition:
      availability: 0.5    # 50% weight
      latency_p95: 0.5     # 50% weight
    target: 99.99          # 4 nines
    target_period: 30d     # Rolling 30 days
    error_budget: 4.32 min # (1 - 0.9999) * 30 * 24 * 60
    consequence: "Error budget exhausted → freeze all feature deploys"

  tier_1_api:
    service_name: "search-api"
    sli_composition:
      availability: 0.3
      latency_p95: 0.7
    target: 99.95
    target_period: 30d
    error_budget: 21.6 min
    consequence: "Slow deploys, review all changes"

  tier_2_service:
    service_name: "ci-pipeline"
    sli_composition:
      availability: 1.0   # Single SLI
    target: 99.9
    target_period: 30d
    error_budget: 43.2 min
    consequence: "Prioritize reliability work"
```

### Step 3: Multi-Window, Multi-Burn-Rate Alerts

```yaml
# Prometheus alerting rules for SLO burn rate
groups:
  - name: slo_burn_rate
    interval: 30s
    rules:
      # For a 99.9% SLO with 30d window:

      # Fast burn: budget exhausted in <1h → page immediately
      - alert: SLOFastBurn
        expr: |
          (
            1 - (
              sum(rate(http_requests_total{service="checkout-api",status!~"5.."}[1m]))
              / sum(rate(http_requests_total{service="checkout-api"}[1m]))
            )
          ) > (14.4 * 0.001)  # 14.4x burn rate → exhausted in ~2 days
        for: 5m
        labels:
          severity: P0
          slo: 99.9
          window: short
        annotations:
          summary: "SLO burn rate critical — {{ $labels.service }}"
          description: "Error budget burning > 14x rate for 5m. Remaining budget will exhaust in <2 days."

      # Slow burn: budget exhausted in 7-30 days → ticket
      - alert: SLOSlowBurn
        expr: |
          (
            1 - (
              sum(rate(http_requests_total{service="checkout-api",status!~"5.."}[30m]))
              / sum(rate(http_requests_total{service="checkout-api"}[30m]))
            )
          ) > (3 * 0.001)  # 3x burn rate → exhausted in ~10 days
        for: 30m
        labels:
          severity: P1
          slo: 99.9
          window: long
        annotations:
          summary: "SLO burn rate elevated — {{ $labels.service }}"
          description: "Error budget burning at 3x rate. Track and investigate."

  - name: error_budget
    interval: 5m
    rules:
      - record: service:error_budget_remaining_ratio
        expr: |
          1 - (
            sum over time (
              ( 1 - (rate(http_requests_total{status!~"5.."}[5m]) / rate(http_requests_total[5m])) )
              [30d:5m]
            )
            / (1 - 0.999)
          )

      - record: service:error_budget_remaining_seconds
        expr: |
          service:error_budget_remaining_ratio
          * 2592000 * (1 - 0.999)  # 30d in seconds * (1 - SLO)

      - alert: ErrorBudgetExhausted
        expr: service:error_budget_remaining_ratio <= 0
        labels:
          severity: P0
        annotations:
          summary: "Error budget exhausted — {{ $labels.service }}"
          description: "Error budget is 0. Feature deploys frozen. Focus on reliability."

      - alert: ErrorBudgetWarning
        expr: service:error_budget_remaining_ratio <= 0.5
        for: 1h
        labels:
          severity: P2
        annotations:
          summary: "50% of error budget consumed — {{ $labels.service }}"
          description: "Half of monthly error budget used in {{ $value | humanizeDuration }}"
```

### Step 4: Error Budget Policy

```yaml
error_budget_policy:
  purpose: >
    Error budgets balance reliability and velocity. Teams can spend their
    error budget on features. When the budget is depleted, they must focus
    on reliability until it recovers.

  budget_allocation:
    thresholds:
      - remaining: "> 50%"
        status: "Healthy"
        actions: "Normal operations. Deploy freely. Focus on features."
      - remaining: "25-50%"
        status: "Warning"
        actions: "Monitor. Slow deploys. Review changes before shipping."
      - remaining: "10-25%"
        status: "Critical"
        actions: "Feature freeze. All hands on reliability. Only hotfixes."
      - remaining: "< 10%"
        status: "Emergency"
        actions: "Roll back risky features. War room for root cause. Executive notification."
      - remaining: "0% (exhausted)"
        status: "Exhausted"
        actions: "No feature deploys. All engineering works on reliability. Postmortem required."

  recovery:
    mechanism: "Budget replenishes over 30-day rolling window"
    rate: "~1/30 of total budget per day at normal error rates"
    notification: "Daily email when budget < 25%"

  exceptions:
    process: "VP-level approval required for any deploy with exhausted error budget"
    allowed_reasons:
      - "Security vulnerability fix"
      - "Compliance requirement"
      - "Customer-reported P0 bug"
    documentation: "Exception logged, reviewed at monthly SRE review"

  consequences:
    - "Feature deploys frozen until budget recovers above 10%"
    - "Incident review required for budget-exhausting events"
    - "Monthly reliability review with engineering leadership"
    - "SLO target review — may be too aggressive or too loose"
```

### Step 5: Reliability Dashboard (Grafana)

```json
{
  "dashboard": {
    "title": "SLO Overview",
    "tags": ["sre", "slo", "error-budget"],
    "panels": [
      {
        "title": "Error Budget Remaining (%)",
        "type": "gauge",
        "targets": [
          {
            "expr": "service:error_budget_remaining_ratio{service=~\"$service\"} * 100",
            "legendFormat": "{{ service }}"
          }
        ],
        "thresholds": [
          { "value": 0, "color": "red" },
          { "value": 10, "color": "orange" },
          { "value": 50, "color": "green" }
        ]
      },
      {
        "title": "Burn Rate (1h window)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "14.4 * (1 - (sum(rate(http_requests_total{service=~\"$service\",status!~\"5..\"}[1m])) / sum(rate(http_requests_total{service=~\"$service\"}[1m]))))",
            "legendFormat": "{{ service }}"
          }
        ],
        "thresholds": [
          { "value": 1, "color": "green" },
          { "value": 3, "color": "orange" },
          { "value": 14.4, "color": "red" }
        ]
      },
      {
        "title": "SLO Compliance (30d rolling)",
        "type": "stat",
        "targets": [
          {
            "expr": "avg_over_time((sum(rate(http_requests_total{service=~\"$service\",status!~\"5..\"}[5m])) / sum(rate(http_requests_total{service=~\"$service\"}[5m])))[30d:5m]) * 100",
            "legendFormat": "SLI vs {{ $service }} SLO"
          }
        ]
      }
    ]
  }
}
```

### Step 6: Toil Assessment and Reduction

```yaml
toil_assessment:
  definition: >
    Toil is manual, repetitive, automatable, tactical, and devoid of
    enduring value. If it has all five characteristics, it's toil.

  categories:
    manual_deployments:
      description: "Deploying via SSH or clicking buttons in console"
      current_hours_week: 8
      automation_strategy: "CI/CD pipeline with GitOps"
      target_hours_week: 1
      effort_estimate: "2 weeks"
      priority: P0

    alert_triage:
      description: "Investigating non-actionable alerts"
      current_hours_week: 12
      automation_strategy: "Tune alert thresholds, add runbooks, auto-remediate"
      target_hours_week: 3
      effort_estimate: "3 weeks"
      priority: P1

    infrastructure_requests:
      description: "Manual provisioning of resources"
      current_hours_week: 10
      automation_strategy: "Terraform modules + Backstage self-service"
      target_hours_week: 2
      effort_estimate: "4 weeks"
      priority: P1

    on_call_handoffs:
      description: "Unstructured handoffs with no context"
      current_hours_week: 3
      automation_strategy: "Standardized handoff template + dashboard"
      target_hours_week: 1
      effort_estimate: "1 week"
      priority: P2

  metrics:
    measurement: "Weekly time tracking for each engineer"
    target: "Toil < 50% of engineering time per week"
    review_cadence: "Monthly in team retro"
    trend: "Track quarterly — should decrease year-over-year"

  automation_gates:
    - "Any manual step done 3+ times → automate"
    - "Any repetitive task > 30 min/week → automate"
    - "Any deployment step not in CI/CD → automate"
    - "Any manual approval that always approves → remove the gate"
```

### Step 7: Production Readiness Review (PRR)

```yaml
production_readiness_review:
  purpose: >
    Ensure new services meet reliability, security, and operability
    standards before serving production traffic.

  checklist:
    architecture:
      - "Service architecture documented (diagram, dependencies, data flow)"
      - "Failure modes documented (what happens when each dependency fails)"
      - "Degraded mode supports reduced functionality"
      - "No single point of failure in critical path"
      - "Load testing completed at 2x expected peak"

    observability:
      - "Structured JSON logging with traceId correlation"
      - "RED metrics instrumented (Rate, Errors, Duration)"
      - "SLIs defined and SLOs agreed with stakeholders"
      - "Grafana dashboard created (service + business metrics)"
      - "Prometheus alert rules defined (symptom-based only)"
      - "Distributed tracing (OpenTelemetry) configured"

    reliability:
      - "Error budget tracking configured"
      - "Graceful degradation — service does not cascade failure"
      - "Circuit breakers or rate limiters for downstream dependencies"
      - "Retry with exponential backoff and jitter"
      - "Timeouts configured for all external calls"
      - "Health check endpoints: /health, /ready, /metrics"

    deployment:
      - "CI/CD pipeline passes (build, test, lint, security scan)"
      - "Canary or blue-green deployment configured"
      - "Automated rollback on metric degradation"
      - "Database migrations run automatically (forward + backward)"

    security:
      - "OWASP Top 10 vulnerabilities reviewed"
      - "Secrets stored in Vault, not in code or env"
      - "Principle of least privilege for IAM/service accounts"
      - "Dependency vulnerabilities scanned and remediated"
      - "TLS termination configured"

    operations:
      - "Runbook documented (incident response, recovery, escalation)"
      - "On-call team trained on service behavior"
      - "PagerDuty/Opsgenie integration with accurate routing"
      - "Capacity plan documented (growth projections)"
      - "Disaster recovery plan tested"

  cadence: "Every new service. Every major refactor. Quarterly for existing services."
  approval: "SRE team lead + Engineering manager sign-off"
```

### Step 8: Postmortem and Incident Analysis

```yaml
postmortem:
  template:
    title: "Postmortem: {{ incident_title }}"
    date: "{{ date }}"
    severity: "SEV{{ N }}"
    duration: "{{ start }} → {{ end }} ({{ total_duration }})"
    services_affected:
      - "{{ service_name }}"

    summary: |
      {{ 2-3 sentence description }}

    timeline:
      - "{{ T+0 }} — [Detection] {{ how detected }}"
      - "{{ T+N }} — [Investigation] {{ finding }}"
      - "{{ T+N }} — [Mitigation] {{ action taken }}"
      - "{{ T+N }} — [Resolution] {{ how resolved }}"

    impact:
      - "Users affected: {{ number }}"
      - "Revenue impact: {{ $ amount }}"
      - "Error budget consumed: {{ % }}"

    root_cause:
      five_whys: |
        Why did the service fail? → {{ answer }}
        Why did that happen? → {{ answer }}
        Why? → {{ answer }}
        Why? → {{ answer }}
        Why? → {{ answer }}

    contributing_factors:
      - "Factor 1: {{ description }}"
      - "Factor 2: {{ description }}"

    action_items:
      - priority: P0
        description: "{{ actionable fix }}"
        owner: "{{ person }}"
        due_date: "{{ date }}"
        type: "mitigate / prevent / detect / process"
      - priority: P1
        description: "{{ }}"
        owner: "{{ }}"
        due_date: "{{ }}"

    lessons_learned:
      - "What went well: {{ }}"
      - "What went wrong: {{ }}"
      - "What we'll do differently: {{ }}"

  guidelines:
    - "Blameless by default — focus on systems, not people"
    - "Schedule SEV1 postmortem within 48h, SEV2 within 1 week"
    - "Action items must have single owner and due date"
    - "Track action items to closure — 95% closure target"
    - "Share postmortem org-wide — every incident is a learning opportunity"
    - "Classify incidents by severity (SEV1-4) and by type (bug, change, dependency, process, security)"
```

## Production Considerations

### SLO Burn Rate Alert Design

```
Multi-window, multi-burn-rate approach:
  Short window (1-5m) + high threshold = fast detection of catastrophic failures
  Long window (30m-6h) + low threshold = early warning of gradual degradation

Example for 99.9% SLO:
  Fast burn: 14.4x rate (budget gone in 2 days), 5m window, page
  Medium burn: 6x rate (budget gone in 5 days), 30m window, page on-call
  Slow burn: 3x rate (budget gone in 10 days), 6h window, create ticket
  Very slow burn: 1.5x rate (budget gone in 20 days), 24h window, daily report

  This gives you:
    - Immediate page for catastrophic outage
    - Early warning for gradual degradation
    - No paging for brief blips (use proper for duration)
```

### Common SLI/SLO Mistakes

1. **SLOs too tight**: 99.99% for every service leads to massive cost and alert fatigue. Match SLO to business criticality.
2. **No stakeholder agreement**: SLOs must be agreed with product/business owners, not just SRE team.
3. **Unrealistic targets**: 100% availability is impossible and counterproductive. Every 9 increases operational cost 10x.
4. **Counting all errors**: Exclude 4xx client errors from availability SLIs. Only count server-side failures.
5. **Missing SLIs for critical paths**: If authentication is a dependency of checkout, auth should have a tighter SLO.
6. **SLOs without error budgets**: SLOs alone create fear of deployment. Error budgets give permission to ship.
7. **No burn rate alerts**: Waiting until the monthly error budget is empty is too late. Alert on high burn rates.
8. **Manual toil tracking**: If toil isn't measured, it can't be reduced. Use time tracking or estimation.
9. **Postmortem without action tracking**: Postmortem action items that don't get done erode trust in the process.
10. **PRR without enforcement**: Production readiness review is optional? Then it won't happen. Gate deployments on PRR sign-off.

### Reliability Maturity Model

```yaml
reliability_maturity:
  level_1_reactive:
    description: "Firefighting mode, no SLOs, manual operations"
    characteristics:
      - "No SLOs or SLIs defined"
      - "Incidents handled reactively"
      - "Toil > 50% of engineering time"
      - "Postmortems rare or blame-focused"
      - "Deployments are high-risk events"

  level_2_defined:
    description: "Basic SLOs, error budgets, postmortems exist"
    characteristics:
      - "SLIs defined for top 5 services"
      - "Error budgets tracked (not always enforced)"
      - "Postmortems scheduled within SLA"
      - "Toil tracked but not systematically reduced"
      - "Some automated rollbacks"

  level_3_managed:
    description: "SLOs enforced, systematic toil reduction"
    characteristics:
      - "SLOs for all customer-facing services"
      - "Error budget policy enforced"
      - "Burn rate alerts for all production SLOs"
      - "Toil reduction roadmap in place"
      - "PRR for new services"

  level_4_quantitative:
    description: "Data-driven reliability, proactive prevention"
    characteristics:
      - "Multi-window burn rate alerts everywhere"
      - "Reliability dashboards visible org-wide"
      - "Toil < 20% of engineering time"
      - "Chaos engineering for resilience testing"
      - "Capacity planning based on growth models"

  level_5_optimizing:
    description: "Autonomous reliability, self-healing, predictive"
    characteristics:
      - "Automated remediation for common failure modes"
      - "Predictive failure detection (ML-based anomaly)"
      - "Game days and chaos engineering are routine"
      - "Platform team provides reliability as a service"
      - "Toil < 10% of engineering time"
```

## Compared With

| Aspect | SRE (Google model) | DevOps | Traditional Ops |
|--------|-------------------|--------|-----------------|
| Risk tolerance | Error budgets | Shared ownership | Zero tolerance |
| Changes | Encouraged (within budget) | Frequent, small | Change advisory board |
| Metrics | SLIs/SLOs/error budgets | DORA metrics | Uptime only |
| Incident response | Blameless postmortem | Blameless | Root cause analysis |
| Automation | Toil elimination | CI/CD | Manual runbooks |
| Team structure | SRE team + dev collaboration | Cross-functional | Separate ops team |
| On-call | Devs share on-call | Devs own ops | Dedicated ops on-call |

## References
- references/error-budget-policy.md — Error Budget Policy Design
- references/incident-analysis.md — Incident Analysis Framework
- references/incident-command.md — Incident Command Structure
- references/sli-slo-guide.md — SLI/SLO Definition Guide
- references/sre-practices-advanced.md — SRE Practices Advanced Topics
- references/sre-practices-fundamentals.md — SRE Practices Fundamentals
- references/sre-slos.md — SLO / SLI / SLA Definitions
- references/toil-automation.md — Toil Reduction Guide
- references/burn-rate-alerts.md — Multi-Window Burn Rate Alert Design
- references/prr-checklist.md — Production Readiness Review Checklist
- references/reliability-maturity.md — Reliability Maturity Model

## Handoff
Related skills: platform-engineering (IDP for self-service toil reduction), incident-response (on-call and incident management), chaos-engineering (resilience testing), monitoring (observability stack for SLO data), progressive-delivery (deployment strategies for safe changes).
