---
name: data-data-observability
description: >
  Use this skill when asked about data observability, Monte Carlo, Sifflet, Bigeye, data downtime, data freshness, data volume, data distribution, data SLA, data quality monitoring, or data pipeline monitoring. This skill enforces: data observability dimensions (freshness, volume, distribution, schema, lineage), monitoring setup with vendor tools, anomaly detection for data, data SLA/SLO definition, and incident response for data. Do NOT use for: infrastructure monitoring, application performance monitoring, or business KPI dashboards.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, observability, monitoring, phase-11]
---

# Data Data Observability

## Purpose
Build a data observability framework covering five dimensions (freshness, volume, distribution, schema, lineage) with monitoring tools, SLA definitions, anomaly detection, and incident response.

## Agent Protocol

### Trigger
Exact user phrases: "data observability", "Monte Carlo", "Sifflet", "Bigeye", "data downtime", "data freshness", "data volume", "data distribution", "data SLA", "data quality monitoring", "data pipeline monitoring", "data incident", "data health".

### Input Context
- Data stack (warehouse, lake, streaming, transformation)
- Critical data assets and their business impact
- Current monitoring approach (if any)
- Alerting infrastructure (PagerDuty, Slack, OpsGenie)
- Team size and on-call rotation

### Output Artifact
Data observability framework with dimension definitions, monitoring tool configuration, SLA/SLO definitions, anomaly detection rules, and incident response runbook.

### Response Format
```yaml
# Observability dimensions with metrics
# Monitoring tool config (Monte Carlo/Sifflet/Bigeye)
# SLA + SLO definitions per dataset
# Anomaly detection rules
# Incident response flow
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Five observability dimensions defined with measurable metrics
- [ ] Monitoring tool configured for all critical datasets
- [ ] Anomaly detection rules tuned per dataset profile
- [ ] SLA/SLO defined for each data tier
- [ ] Incident response process documented with escalation
- [ ] Observability dashboard built for stakeholders
- [ ] Runbooks created for common failure modes

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Define Observability Dimensions

| Dimension | Measure | Detection Method |
|---|---|---|
| **Freshness** | Time since last successful data load | Scheduled check vs expected interval |
| **Volume** | Row count, table size, partition count | Compare to trailing 30-day average |
| **Distribution** | NULL ratio, min/max/avg/percentiles of numeric cols, cardinality | Z-score, KS test vs historical |
| **Schema** | Column count, column names, data types, nullability | Compare to registered schema |
| **Lineage** | Pipeline completeness, upstream failures | DAG traversal, root cause analysis |

Each dimension scored 0-100 per dataset. Overall health = weighted average: freshness 25%, volume 15%, distribution 25%, schema 20%, lineage 15%.

### Step 2: Select Monitoring Tool

| Tool | Strengths | Limitations |
|---|---|---|
| **Monte Carlo** | Auto-generated monitors, end-to-end lineage, Slack integration | Cost, vendor lock-in |
| **Sifflet** | Active metadata, root cause analysis, column-level drift | Newer platform |
| **Bigeye** | Hyperscalable, SLO-driven, code-first | Steeper learning curve |
| **Open-source** | Great Expectations + Elementary + dbt | Requires assembly, no lineage |

Default: Monte Carlo for mid-large orgs with budget. Open-source stack (GE + Elementary) for cost-sensitive teams. Hybrid: Monte Carlo for critical data, open-source for rest.

### Step 3: Configure Monitoring (Monte Carlo Example)

```yaml
monitors:
  - name: freshness_check_fct_orders
    type: freshness
    table: analytics.fct_orders
    schedule: hourly
    expectation: fresh_data_within: 3600  # 1 hour
    severity: HIGH
    action: alert_pagerduty

  - name: volume_check_fct_orders
    type: volume
    table: analytics.fct_orders
    granularity: day
    field: row_count
    expectation: within_range [50000, 200000]
    lookback: 30
    severity: HIGH

  - name: distribution_check_total_amount
    type: distribution
    table: analytics.fct_orders
    column: total_amount
    method: z_score
    threshold: 3.0
    severity: MEDIUM
```

### Step 4: Anomaly Detection

| Algorithm | Use Case | Parameters |
|---|---|---|
| **Z-score** | Numeric metrics, normal distribution | Threshold: 2.5-3.5 |
| **IQR** | Non-normal distributions | Multiplier: 1.5-3.0 |
| **Seasonal decomposition** | Time-series with seasonality | Period: 7d or 30d |
| **KS test** | Distribution drift detection | P-value: 0.01 |
| **DBSCAN** | Multi-dimensional anomalies | Eps: 0.5, MinPts: 5 |

Tune per dataset: profile 30 days of historical data, set thresholds at 99th percentile. Auto-adjust every 7 days.

### Step 5: Define SLA/SLO

| Tier | Examples | Freshness | Volume | Distribution | Schema |
|---|---|---|---|---|---|
| **Critical** | Financial reports, customer data | 99.9% on time | ±5% | Drift < 2% | 100% match |
| **High** | Operational dashboards, team metrics | 99% on time | ±15% | Drift < 5% | 100% match |
| **Medium** | Internal analysis, ad-hoc | 95% on time | ±30% | Drift < 10% | No check |
| **Low** | Exploratory, experimental | Best effort | Best effort | Best effort | No check |

SLO: `freshness_pct = successful_runs / total_runs * 100` over 30d rolling window. Violation if below tier threshold for 2 consecutive windows.

### Step 6: Incident Response

```
Alert fires (PagerDuty/Slack)
  → Automated diagnostic (check upstream, check last good run)
  → Assign severity (SEV1: critical data down, SEV2: degraded, SEV3: minor)
  → Page on-call engineer
  → Investigate (runbook: check logs, check upstream, check schema changes)
  → Remediate (rollback, patch, reprocess)
  → Postmortem (5 whys, action items)
  → Update monitors (tune threshold if false positive)
```

SEV1 response: 5 min acknowledge, 30 min mitigation. SEV2: 15 min acknowledge, 2 hr mitigation. SEV3: next business day.

### Step 7: Observability Dashboard

Per-dataset tiles showing: health score (0-100), trend (7d sparkline), last check timestamp, dimension breakdown bars. Summary view: total datasets monitored, datasets with active alerts, mean health score by tier, top 5 failing monitors, freshness compliance (30d), volume anomalies today.

## Rules
- Every critical dataset monitored on all five dimensions
- Anomaly thresholds tuned per dataset, not global
- Freshness SLA defined and enforced for all production data
- Automated diagnostic on every alert before paging
- Monthly SLO report distributed to data domain owners
- Observability alerts go to on-call rotation, not individual
- Postmortem for every SEV1 and SEV2 incident
- No dataset promoted to production without monitors

## References
- `references/observability-dimensions.md` — Freshness, volume, distribution, schema, lineage detection, anomaly algorithms
- `references/observability-setup.md` — Monte Carlo, Sifflet, Bigeye integration, SLA definition, alerting, incident response

## Handoff
`data-data-quality` for detailed quality test configuration. `data-data-platform` for platform monitoring integration. `data-data-catalog` for linking observability metadata to catalog. `data-data-contracts` for SLA enforcement in contracts.
