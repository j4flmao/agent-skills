---
name: data-data-observability
description: >
  Use this skill when designing data observability: data quality monitoring, data lineage, data profiling, anomaly detection, data health dashboards, freshness checks, row count tracking, schema drift detection, and data incident management. This skill enforces: monitoring all data pipeline stages, automated quality checks, column-level lineage, freshness SLAs, anomaly detection on row counts and distributions, and incident response playbooks. Do NOT use for: infrastructure monitoring (CPU/memory), application performance monitoring, or user analytics.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, observability, quality, phase-10]
---

# Data Observability

## Purpose
Design comprehensive data observability across pipelines: freshness, volume, schema, quality, lineage, and incident management.

## Agent Protocol

### Trigger
Exact user phrases: "data observability", "data quality monitoring", "data profiling", "data health", "freshness check", "row count anomaly", "schema drift", "data incident", "data lineage", "data monitoring", "observability platform".

### Input Context
- Data stack (warehouse, lake, pipelines, BI tools)
- Number of tables/datasets to monitor
- Existing quality checks and monitoring
- Team size and on-call rotation
- SLAs for data freshness and quality
- Incident management workflow
- Monitoring budget and tooling preferences

### Output Artifact
Data observability architecture with monitoring checks, alerting rules, and incident response playbook.

### Response Format
```yaml
# Observability checks per dataset
# Freshness, volume, schema, quality
# Alert thresholds
# Incident response workflow
```

### Completion Criteria
- [ ] Freshness checks configured for all critical datasets
- [ ] Volume monitoring with anomaly detection
- [ ] Schema drift detection on source and staging tables
- [ ] Quality checks on key columns (nulls, uniqueness, referential integrity)
- [ ] Lineage tracking from source to dashboard
- [ ] Alerting configured with severity levels
- [ ] Incident response runbook written

## Workflow

### Step 1: Dataset Inventory
Catalog all datasets by criticality and ownership. Tier 1: executive dashboards, financial reports, customer-facing data, regulatory data. Tier 2: operational reports, team-level analytics, internal tools. Tier 3: experimental, exploratory, ad-hoc queries.

#### Inventory Schema
For each dataset: name, owner, tier, source system, freshness SLA, location (table/view/API), upstream dependencies, downstream consumers, expected row count range, quality rules.

### Step 2: Freshness Monitoring

#### Freshness Checks
Check data arrival within expected SLA window. Monitor: last_updated timestamp vs expected schedule. For batch: compare DAG completion time to SLA time. For streaming: compare latest event timestamp to current time.

#### Freshness SLAs
| Tier | SLA | Alert After | Action |
|---|---|---|---|
| Tier 1 | < 1 hour | > 2 hours | PagerDuty |
| Tier 2 | < 1 day | > 1 day | Slack #data-eng |
| Tier 3 | < 1 week | > 1 week | Email digest |

### Step 3: Volume Monitoring

#### Row Count Tracking
Track row counts per partition or table. Compute rolling statistics (7-day, 30-day window). Alert on significant deviations from expected range.

#### Anomaly Detection Methods
Static threshold: absolute or percentage change from expected. Statistical: Z-score on rolling window (> 3 sigma = alert). Seasonal: compare to same day-of-week, day-of-month. ML: Prophet, isolation forest for complex patterns.

#### Volume Alert Thresholds
| Tier | Warning | Critical |
|---|---|---|
| Tier 1 | ±10% from rolling avg | ±20% from rolling avg |
| Tier 2 | ±20% from rolling avg | ±50% from rolling avg |
| Tier 3 | ±50% from rolling avg | ±80% from rolling avg |

### Step 4: Schema Monitoring

#### Drift Detection
Compare current schema against expected schema (stored as reference in data catalog). Detect: column additions, removals, renames, type changes, null ratio changes, default value changes.

#### Schema Check Implementation
```
Schema Check: staging_orders
  Expected: order_id STRING, customer_id STRING, total_amount DECIMAL(10,2), status STRING
  Actual: order_id STRING, customer_id STRING, total_amount DECIMAL(10,2), status STRING, discount_code STRING
  Status: WARNING — new column discount_code detected (non-breaking)
  
Schema Check: source_customers
  Expected: customer_id INT, name STRING, email STRING
  Actual: customer_id STRING, name STRING, email STRING
  Status: CRITICAL — type change on customer_id (INT → STRING)
```

### Step 5: Quality Monitoring

#### Quality Check Types
Completeness: null rate on required columns. Uniqueness: duplicate count on PK columns. Referential integrity: FK values exist in referenced table. Accepted values: categorical columns contain only expected values. Range: numeric columns within expected bounds. Distribution drift: distribution comparison (KS test for numeric, chi-square for categorical).

#### Quality Check Configuration
```yaml
quality_checks:
  orders:
    - check: not_null
      columns: [order_id, customer_id, total_amount]
      severity: critical
    - check: unique
      columns: [order_id]
      severity: critical
    - check: accepted_values
      column: status
      values: [draft, submitted, confirmed, shipped, delivered, cancelled]
      severity: warning
    - check: range
      column: total_amount
      min: 0
      max: 100000
      severity: warning
    - check: relationship
      column: customer_id
      references: customers(customer_id)
      severity: critical
```

### Step 6: Lineage Tracking

#### Lineage Levels
Table-level: which tables feed into which. Column-level: which source columns produce which target columns. Transformation-level: what SQL logic transforms the data.

#### Implementation
Parse SQL queries to extract column-level lineage. Use dbt artifacts (manifest.json) for dbt transformations. Use OpenLineage for Spark/Flink jobs. Store lineage in data catalog (Datahub, Marquez, OpenMetadata). Guide root cause analysis: when a dashboard number is wrong, trace from dashboard → mart → transform → staging → source.

### Step 7: Data Health Dashboard

```yaml
dashboard:
  - section: "Pipeline Health"
    metrics:
      - pipeline_success_rate: "> 99%"
      - avg_completion_time: "+10% vs baseline"
      - freshness_compliance: "> 95% within SLA"
  
  - section: "Data Quality"
    metrics:
      - quality_score: "weighted pass rate"
      - open_incidents: "count by severity"
      - MTTR: "mean time to resolve"
  
  - section: "Coverage"
    metrics:
      - datasets_monitored: "X / Y total"
      - checks_per_dataset: "avg count"
      - tier_1_coverage: "> 99%"
```

### Step 8: Incident Response

#### Severity Levels
Sev1 (Critical): data down, customer-facing impact, financial report wrong. Response: 15min acknowledge, 1hr resolution or escalation. Sev2 (High): data delayed, internal report inaccurate, non-critical dashboard broken. Response: 1hr acknowledge, 4hr resolution. Sev3 (Medium): minor quality issue, cosmetic problem, non-blocking schema change. Response: next business day.

#### Incident Response Playbook
1. Acknowledge: alert received, owning team notified
2. Triage: assess severity, impact scope, affected consumers
3. Mitigate: fix root cause, or rollback to previous version, or use backup data
4. Communicate: notify consumers of issue, ETA for fix, workaround
5. Resolve: fix deployed, data verified, consumers notified
6. Post-mortem: root cause analysis, preventative measures, documentation

### Anomaly Detection Deep Dive

#### Statistical Process Control (SPC)

```python
# SPC-based volume monitoring
import numpy as np
from scipy import stats

def detect_volume_anomaly(current_count, historical_counts, method="zscore"):
    if method == "zscore":
        mean = np.mean(historical_counts)
        std = np.std(historical_counts)
        z = (current_count - mean) / max(std, 1)
        return abs(z) > 3  # Alert if > 3 sigma
    elif method == "mad":
        median = np.median(historical_counts)
        mad = np.median(np.abs(historical_counts - median))
        modified_z = 0.6745 * (current_count - median) / max(mad, 1)
        return abs(modified_z) > 3.5  # Robust threshold
    elif method == "iqr":
        q1, q3 = np.percentile(historical_counts, [25, 75])
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr  # Lower fence
        upper = q3 + 1.5 * iqr  # Upper fence
        return current_count < lower or current_count > upper
```

#### Prophet-Based Anomaly Detection

```yaml
# Prophet configuration for daily volume forecasting
prophet_config:
  daily_volume:
    changepoint_prior_scale: 0.05   # Flexibility of trend changes
    seasonality_prior_scale: 10.0   # Strength of weekly/yearly seasonality
    holidays_prior_scale: 10.0      # Holiday effect strength
    seasonality_mode: multiplicative  # For volume that scales with growth
    weekly_seasonality: true        # Day-of-week patterns
    yearly_seasonality: true        # Month-of-year patterns
    uncertainty_samples: 1000       # Prediction interval quality
    interval_width: 0.99            # 99% prediction interval
    
  alert_rules:
    - condition: "actual > upper_bound"
      severity: critical
      description: "Volume spike — possible duplicate data or pipeline issue"
    - condition: "actual < lower_bound"
      severity: critical
      description: "Volume drop — possible ingestion failure or upstream issue"
    - condition: "actual < lower_bound for 3 consecutive windows"
      severity: critical
      description: "Sustained volume drop — likely pipeline break"
```

#### Column-Level Distribution Monitoring

```python
# Detect distribution drift on numeric columns
def detect_distribution_drift(
    current_sample, reference_sample, column_type="numeric"
):
    if column_type == "numeric":
        # Two-sample Kolmogorov-Smirnov test
        ks_stat, p_value = stats.ks_2samp(current_sample, reference_sample)
        drift_detected = p_value < 0.05  # Significant distribution change
        return { "statistic": ks_stat, "p_value": p_value, "drift": drift_detected }
    elif column_type == "categorical":
        # Chi-square test for categorical distribution
        current_freq = pd.Series(current_sample).value_counts(normalize=True)
        ref_freq = pd.Series(reference_sample).value_counts(normalize=True)
        chi2, p_value = stats.chisquare(current_freq, ref_freq)
        return { "statistic": chi2, "p_value": p_value, "drift": p_value < 0.05 }
```

### Step 9: Alert Routing and Escalation

#### Alert Routing Matrix

| Check Severity | Tier 1 Dataset | Tier 2 Dataset | Tier 3 Dataset |
|---|---|---|---|
| Critical | PagerDuty immediate + Slack @here | PagerDuty + Slack @channel | Slack @channel |
| Warning | Slack @channel + email | Slack channel | Slack thread |
| Info | Slack thread | Email digest | Log only |

#### On-Call Rotation

```yaml
on_call:
  schedule: "Primary / Secondary / Tertiary (weekly rotation)"
  coverage: "24/7 for Tier 1, business hours for Tier 2-3"
  
  escalation_policies:
    - level: 1
      responder: "Primary data engineer"
      response_sla: "15 minutes (Tier 1), 1 hour (Tier 2)"
    - level: 2
      responder: "Senior data engineer"
      response_sla: "30 minutes after level 1 escalation"
    - level: 3
      responder: "Data engineering manager"
      response_sla: "1 hour after level 2 escalation"

  handoff_process:
    - review open incidents before handoff
    - document known issues and ongoing investigations
    - update runbooks for any new incident patterns
    - confirm handoff in incident management tool
```

### Step 10: Runbook Templates

#### Common Failure Scenarios

```yaml
runbook_stale_data:
  name: "Data freshness SLA breach"
  symptoms:
    - "last_updated > SLA threshold"
    - "Dashboard shows 'data as of X hours ago' warning"
  triage:
    - "Check upstream source system availability"
    - "Check pipeline DAG for failures or delays"
    - "Check for resource contention (concurrent jobs, insufficient compute)"
    - "Check network connectivity to source system"
  resolution:
    - "If source issue: notify source owner, estimate recovery time"
    - "If pipeline failure: retry from last checkpoint"
    - "If resource contention: add compute resources or reschedule"
  verification:
    - "Data freshness check passes for 2 consecutive cycles"
    - "Downstream consumers confirm data is current"

runbook_volume_drop:
  name: "Abnormal volume decrease"
  symptoms:
    - "Row count below lower bound for current partition"
  triage:
    - "Check upstream extraction SQL — did WHERE clause change?"
    - "Check for schema changes — column removed or renamed?"
    - "Check source system for data availability"
    - "Check for deduplication logic errors"
  resolution:
    - "If extraction issue: fix SQL, backfill affected partition"
    - "If schema change: update schema expectations, reconcile data"
    - "If source issue: wait for recovery, document data gap"
  verification:
    - "Volume returns to expected range"
    - "No missing data for downstream consumers"

runbook_schema_drift:
  name: "Unexpected schema change"
  symptoms:
    - "Schema check returns WARNING or CRITICAL"
  triage:
    - "Compare actual vs expected schema: what changed?"
    - "Determine if change is breaking (type change, column removal)"
    - "Identify source of change (source system update, API version)"
    - "Assess impact on downstream consumers"
  resolution:
    - "If non-breaking: update expected schema, notify consumers"
    - "If breaking: coordinate with source owner, plan migration"
    - "Implement column mapping for backward compatibility"
  verification:
    - "Schema check passes with updated expectations"
    - "Downstream queries and transformations run correctly"
```

### Step 11: Integration Patterns

#### Observability-as-Code

```yaml
# dbt-expectations example (Great Expectations + dbt)
# tests/generic/test_row_count_between.sql
{% test row_count_between(model, min_count, max_count) %}
    WITH row_count AS (
        SELECT COUNT(*) AS cnt FROM {{ model }}
    )
    SELECT cnt FROM row_count
    WHERE cnt < {{ min_count }} OR cnt > {{ max_count }}
{% endtest %}

# Apply to a model:
# models/staging/stg_orders.yml
models:
  - name: stg_orders
    tests:
      - row_count_between:
          min_count: 10000
          max_count: 5000000
          severity: error
      - dbt_expectations.expect_column_values_to_be_between:
          column_name: total_amount
          min_value: 0
          max_value: 100000
          row_condition: "status != 'cancelled'"
```

#### Integration with Data Catalog

```yaml
# OpenMetadata integration
# Automatically sync observed schemas to catalog
# Link quality check results to dataset entries
# Enable searching/filtering datasets by quality score

integration_pipeline:
  - step: "Ingest schemas from warehouse into catalog"
  - step: "Run quality checks against ingested schemas"
  - step: "Publish check results to data catalog as dataset properties"
  - step: "Update dataset tier based on quality score trends"
  - step: "Notify dataset owners when tier changes"

quality_score_formula:
  # Weighted score: critical checks count 3x, warnings 1x
  score = (passed_critical * 3 + passed_warning * 1) / (total_critical * 3 + total_warning * 1)
  tier_promotion: "score > 0.95 for 30 consecutive days → next tier"
  tier_demotion: "score < 0.80 for 7 consecutive days → previous tier"
```

### Step 12: Observability Platform Selection

#### Platform Comparison

| Feature | Monte Carlo | Soda Cloud | Great Expectations | Elementary |
|---|---|---|---|---|
| Freshness monitoring | Automatic | Configurable | Custom | Manual |
| Volume anomaly | ML-based | Rule-based | Custom | Rule-based |
| Schema drift | Automatic | Configurable | Manual | Configurable |
| Quality checks | Built-in | Custom SQL | Python expectations | dbt-based |
| Lineage | Automatic | Manual | Via dbt | Via dbt |
| Alerting | Slack, PagerDuty, email | Slack, email | Custom | Slack, email |
| ML anomaly detection | Yes | No | No | No |
| Self-hosted | No | Yes (Soda Core) | Yes | Yes |
| Pricing | Per GB monitored | Per check row | Free (OSS) | Free (OSS) |

#### Selection Decision Tree

```
Team size and expertise?
├── Small team (< 5), need quick setup
│   └── Soda Cloud (fast deployment, good defaults)
├── Large enterprise, many datasets
│   ├── Budget available → Monte Carlo (ML-based, automatic)
│   └── Budget constrained → Elementary + dbt (OSS, dbt-native)
└── Deep data testing in CI/CD
    └── Great Expectations (most flexible, Python-native)
```

### Step 13: Cost of Observability

#### Cost-Benefit Analysis

```yaml
# Cost of NOT having observability
cost_of_no_observability:
  - "Bad data reaching dashboards → wrong business decisions"
  - "Engineers manually checking data freshness"
  - "Delayed incident detection → hours of bad data served"
  - "No root cause analysis → repeated incidents"
  
typical_roi:
  # Example: mid-size data team (10 engineers, 500 tables)
  without_observability:
    - "5 incidents/month × 4 hours MTTR × $150/hr = $3,000/month"
    - "2 bad data releases/month × $5,000 cleanup = $10,000/month"
    - "Total: $13,000/month"
  
  with_observability:
    - "Platform cost: $1,000-3,000/month"
    - "Reduced MTTR: 4 hours → 1 hour = $750/month"
    - "Prevented bad data releases: $10,000/month"
    - "Net savings: $7,750-11,250/month"
```

### Decision Trees (continued)

#### Quality Check Selection
```
What aspect are we validating?
├── Completeness
│   ├── Required fields → not_null check
│   └── Optional fields with high fill rate → null_ratio trend
├── Uniqueness
│   ├── Primary key → unique check (fail on duplicates)
│   └── Natural key → unique check (warn on duplicates)
├── Accuracy
│   ├── Numeric range → between values or percentile-based
│   └── Categorical values → accepted values set
├── Consistency
│   ├── Cross-field logic → custom SQL expression
│   └── Referential integrity → FK match in parent table
└── Timeliness
    ├── Batch arrival → freshness checkpoint
    └── Streaming latency → event_time vs process_time delta
```

## Rules
- Monitor every pipeline stage — not just the final output
- Fail the pipeline on critical quality checks — don't let bad data flow
- Track lineage for root cause analysis
- Set alert thresholds based on statistical baselines, not arbitrary values
- Document ownership for every dataset
- Review observability coverage quarterly
- Automate incident response — runbooks for common failures
- Monitor monitoring — if observability is down, you're blind
- Alert on data freshness, not just pipeline completion
- Track MTTR as a observability effectiveness metric
- Use SPC or Prophet for anomaly detection — static thresholds miss gradual drift
- Integrate observability with data catalog for single-pane-of-glass
- Run column-level distribution monitoring for early schema change detection
- Define escalation paths before incidents happen
- Implement observability-as-code for version-controlled check definitions
- Price observability platforms against cost of bad data, not just subscription cost

## References
  - references/data-quality-management.md — Data Quality Management
  - references/observability-platform.md — Observability Platform
  - references/observability-rules.md — Observability Rules Reference
