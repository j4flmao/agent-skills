# DataOps Data Quality Monitoring

## Overview

Data quality monitoring is a critical component of DataOps, ensuring that data transformations produce correct, complete, timely, and trustworthy outputs. This reference covers quality dimension frameworks, automated testing strategies, monitoring implementation, alerting, and incident response for data quality issues.

## Data Quality Framework

### Quality Dimensions

| Dimension | Definition | Example Metric | Target |
|---|---|---|---|
| Completeness | All required data is present | Null rate on critical columns | < 0.1% null |
| Accuracy | Data correctly represents reality | Deviation from source of truth | < 0.01% error |
| Timeliness | Data is available within expected time | Freshness from source | < 15 min lag |
| Consistency | Data agrees across systems | Cross-system value match | > 99.9% match |
| Uniqueness | No duplicate records | Duplicate key rate | < 0.01% dup |
| Validity | Data conforms to expected formats | Format compliance rate | > 99.9% |
| Integrity | Referential integrity maintained | Orphaned foreign keys | < 0.01% orphaned |

### Quality Tier Classification

```yaml
quality_tiers:
  critical:
    description: "Financial reporting, regulatory, customer-facing"
    sla:
      completeness: 99.99%
      accuracy: 99.99%
      timeliness: "5 minutes"
    monitoring:
      frequency: "every run"
      alert: "pagerduty"
      response_time: "15 minutes"

  high:
    description: "Operational dashboards, internal business decisions"
    sla:
      completeness: 99.9%
      accuracy: 99.9%
      timeliness: "1 hour"
    monitoring:
      frequency: "hourly"
      alert: "slack"
      response_time: "1 hour"

  medium:
    description: "Exploratory analytics, internal reports"
    sla:
      completeness: 99%
      accuracy: 99%
      timeliness: "1 day"
    monitoring:
      frequency: "daily"
      alert: "email"
      response_time: "24 hours"
```

### Testing Layers

```
+--------------------------------------------------+
|                  Production Monitoring            |
|  - Continuous quality checks on production data   |
|  - Alert on SLA breaches                          |
+--------------------------------------------------+
|                   Deployment Tests                |
|  - Full test suite on deploy                      |
|  - Contract validation                            |
+--------------------------------------------------+
|                   CI/CD Tests                     |
|  - dbt test on changed models                     |
|  - SQLFluff linting                               |
+--------------------------------------------------+
|                   Unit Tests                      |
|  - Model-level singular tests                     |
|  - Column-level generic tests                     |
+--------------------------------------------------+
```

## dbt Generic Tests

```yaml
version: 2

models:
  - name: stg_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref("stg_customers")
              field: customer_id
      - name: order_status
        tests:
          - accepted_values:
              values:
                - pending
                - shipped
                - delivered
                - cancelled
                - returned
      - name: order_amount
        tests:
          - not_null
          - dbt_expectations.expect_column_value_to_be_between:
              min_value: 0
              max_value: 1000000
              config:
                severity: warn

  - name: fct_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref("dim_customers")
              field: customer_id
    tests:
      - dbt_expectations.expect_table_row_count_to_be_between:
          min_value: 1000
          max_value: 100000000
          config:
            severity: error
            tags: ["critical"]
      - custom_test_freshness:
          max_hours: 24
          config:
            severity: error
            tags: ["critical"]
```

## Custom Generic Tests

```sql
{% test freshness(model, max_hours, column_name="updated_at") %}

with freshness_check as (
    select
        max({{ column_name }}) as max_timestamp,
        current_timestamp as now_timestamp
    from {{ model }}
)

select *
from freshness_check
where max_timestamp < (now_timestamp - interval '{{ max_hours }} hours')

{% endtest %}
```

```sql
{% test completeness(model, columns, threshold=1.0) %}

with completeness_check as (
    select
        count(*) as total_rows,
        {% for col in columns %}
        count({{ col }}) as {{ col }}_non_null,
        round(1.0 * count({{ col }}) / nullif(count(*), 0), 4) as {{ col }}_completeness
        {% if not loop.last %},{% endif %}
        {% endfor %}
    from {{ model }}
)

select *
from completeness_check
where 1=0
{% for col in columns %}
    or {{ col }}_completeness < {{ threshold }}
{% endfor %}

{% endtest %}
```

## Great Expectations Integration

### Expectation Suite Definition

```python
import great_expectations as gx
from great_expectations.core.expectation_configuration import ExpectationConfiguration


def create_orders_suite():
    context = gx.get_context()

    suite = context.add_expectation_suite(
        expectation_suite_name="orders_quality_suite"
    )

    suite.add_expectation(
        ExpectationConfiguration(
            expectation_type="expect_table_columns_to_match_set",
            kwargs={
                "column_set": [
                    "order_id", "customer_id", "order_date",
                    "order_amount", "order_status"
                ]
            },
            meta={"critical": True}
        )
    )

    suite.add_expectation(
        ExpectationConfiguration(
            expectation_type="expect_column_values_to_be_unique",
            kwargs={"column": "order_id"},
            meta={"critical": True}
        )
    )

    suite.add_expectation(
        ExpectationConfiguration(
            expectation_type="expect_column_values_to_not_be_null",
            kwargs={"column": "order_id", "mostly": 1.0},
            meta={"critical": True}
        )
    )

    suite.add_expectation(
        ExpectationConfiguration(
            expectation_type="expect_column_values_to_not_be_null",
            kwargs={"column": "customer_id", "mostly": 0.99},
            meta={"critical": True}
        )
    )

    suite.add_expectation(
        ExpectationConfiguration(
            expectation_type="expect_column_values_to_be_between",
            kwargs={"column": "order_amount", "min_value": 0, "max_value": 1000000},
            meta={"severity": "error"}
        )
    )

    suite.add_expectation(
        ExpectationConfiguration(
            expectation_type="expect_column_values_to_be_in_set",
            kwargs={
                "column": "order_status",
                "value_set": ["pending", "shipped", "delivered", "cancelled", "returned"]
            },
            meta={"severity": "error"}
        )
    )

    suite.add_expectation(
        ExpectationConfiguration(
            expectation_type="expect_table_row_count_to_be_between",
            kwargs={"min_value": 1000, "max_value": 100000000},
            meta={"critical": True}
        )
    )

    context.save_expectation_suite(suite)
    return suite
```

### Checkpoint Configuration

```yaml
name: production_checkpoint
config_version: 3.0

module_name: great_expectations.checkpoint
class_name: Checkpoint

batches:
  - batch_request:
      datasource_name: production_dw
      data_connector_name: default_inferred_data_connector
      data_asset_name: fct_orders

expectation_suite_name: orders_quality_suite

action_list:
  - name: store_validation_result
    action:
      class_name: StoreValidationResultAction

  - name: store_evaluation_params
    action:
      class_name: StoreEvaluationParametersAction

  - name: update_data_docs
    action:
      class_name: UpdateDataDocsAction

  - name: send_slack_notification_on_failure
    action:
      class_name: SlackNotificationAction
      slack_webhook: ${SLACK_WEBHOOK}
      notify_on: failure

  - name: create_ticket_on_failure
    action:
      class_name: CreateTicketAction
      notify_on: failure
```

## Data Quality Monitoring Implementation

### Continuous Quality Monitor

```python
import logging
from datetime import datetime
from typing import Dict, List, Optional
import pandas as pd
from sqlalchemy import create_engine


class DataQualityMonitor:

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)
        self.logger = logging.getLogger(__name__)

    def check_completeness(
        self,
        table: str,
        columns: List[str],
        schema: str = "public",
        threshold: float = 0.99
    ) -> Dict:
        query = f"""
        SELECT count(*) as total_rows,
               {', '.join(
                   f"count({col}) as {col}_count, "
                   f"round(1.0 * count({col}) / nullif(count(*), 0), 4) "
                   f"as {col}_completeness"
                   for col in columns
               )}
        FROM {schema}.{table}
        """

        result = pd.read_sql(query, self.engine)
        row = result.iloc[0]

        check_results = {
            "table": f"{schema}.{table}",
            "check_type": "completeness",
            "timestamp": datetime.now().isoformat(),
            "total_rows": int(row["total_rows"]),
            "columns": {}
        }

        all_passed = True
        for col in columns:
            completeness = float(row[f"{col}_completeness"])
            passed = completeness >= threshold
            check_results["columns"][col] = {
                "non_null_count": int(row[f"{col}_count"]),
                "completeness_ratio": completeness,
                "passed": passed,
                "threshold": threshold
            }
            if not passed:
                all_passed = False

        check_results["passed"] = all_passed
        return check_results

    def check_freshness(
        self,
        table: str,
        timestamp_column: str,
        schema: str = "public",
        max_lag_minutes: int = 60
    ) -> Dict:
        query = f"""
        SELECT max({timestamp_column}) as max_timestamp,
               current_timestamp as now,
               extract(epoch from (current_timestamp - max({timestamp_column})))
                   / 60 as lag_minutes
        FROM {schema}.{table}
        """

        result = pd.read_sql(query, self.engine)
        row = result.iloc[0]

        lag_minutes = float(row["lag_minutes"])
        passed = lag_minutes <= max_lag_minutes

        return {
            "table": f"{schema}.{table}",
            "check_type": "freshness",
            "timestamp": datetime.now().isoformat(),
            "max_timestamp": str(row["max_timestamp"]),
            "lag_minutes": lag_minutes,
            "max_lag_minutes": max_lag_minutes,
            "passed": passed
        }

    def check_row_count(
        self,
        table: str,
        schema: str = "public",
        min_rows: Optional[int] = None,
        max_rows: Optional[int] = None,
        expected_deviation_pct: Optional[float] = None
    ) -> Dict:
        current_query = f"SELECT count(*) as count FROM {schema}.{table}"
        current_count = int(
            pd.read_sql(current_query, self.engine).iloc[0]["count"]
        )

        passed = True
        details = {
            "table": f"{schema}.{table}",
            "check_type": "row_count",
            "timestamp": datetime.now().isoformat(),
            "current_count": current_count
        }

        if min_rows is not None:
            details["min_rows"] = min_rows
            if current_count < min_rows:
                passed = False

        if max_rows is not None:
            details["max_rows"] = max_rows
            if current_count > max_rows:
                passed = False

        if expected_deviation_pct is not None:
            hist_query = f"""
            SELECT avg(row_count) as avg_count
            FROM quality_metrics
            WHERE table_name = '{schema}.{table}'
              AND check_type = 'row_count'
              AND checked_at > now() - interval '30 days'
            """
            hist_result = pd.read_sql(hist_query, self.engine)
            if not hist_result.empty and hist_result.iloc[0]["avg_count"]:
                avg_count = hist_result.iloc[0]["avg_count"]
                deviation = abs(current_count - avg_count) / avg_count * 100
                details["expected_count"] = float(avg_count)
                details["deviation_pct"] = round(float(deviation), 2)
                if deviation > expected_deviation_pct:
                    passed = False

        details["passed"] = passed
        return details
```

## Monitoring Dashboard

### Quality Metrics Dashboard

```
+----------------------------------------------------------+
|  Data Quality Dashboard                                   |
+----------------------------------------------------------+
|  Overall: 98.7% passed | 1.3% failed | 12 violations     |
+----------------------------------------------------------+
|  Metric             | Target      | Current    | Status   |
|---------------------+-------------+------------+----------|
| Completeness        | > 99.9%     | 99.95%     | PASS     |
| Accuracy            | > 99.99%    | 99.98%     | WARN     |
| Timeliness          | < 15 min    | 12 min     | PASS     |
| Consistency         | > 99.9%     | 99.7%      | FAIL     |
| Uniqueness          | > 99.99%    | 99.99%     | PASS     |
| Validity            | > 99.9%     | 99.95%     | PASS     |
+----------------------------------------------------------+
```

### Violations Table

| Table | Check Type | Severity | Failed At | Duration | Owner |
|---|---|---|---|---|---|
| fct_orders | completeness | critical | 2025-01-15 10:30 | 45 min | team-data |
| dim_customers | freshness | high | 2025-01-15 09:15 | 2h 15min | team-platform |
| stg_payments | row_count | critical | 2025-01-14 23:00 | 30 min | team-data |

## Alerting Configuration

### Alert Rules

```yaml
alert_rules:
  critical_test_failure:
    condition: "test_results.critical_failed > 0"
    channels:
      - "pagerduty:data-quality"
      - "slack:#data-quality-critical"
    response_sla: "15 minutes"
    auto_create_ticket: true

  sla_breach:
    condition: "quality_sla_tier.critical AND current < target"
    channels:
      - "slack:#data-quality"
      - "email:data-owner"
    response_sla: "1 hour"

  data_freshness_violation:
    condition: "freshness_lag > sla_max_lag"
    channels:
      - "slack:#data-pipeline"
    response_sla: "2 hours"

  row_count_anomaly:
    condition: "row_count_deviation > 20%"
    channels:
      - "slack:#data-quality"
    cooldown: "6 hours"
```

## Data Quality Incident Response

### Incident Classification

```yaml
incident_classification:
  severity_1:
    description: "Complete data loss or corruption in critical dataset"
    response_time: "15 minutes"
    escalation: "VP of Engineering"
    examples:
      - "fct_orders table dropped"
      - "Wrong data loaded into financial reports table"

  severity_2:
    description: "Partial data loss or quality degradation in critical dataset"
    response_time: "1 hour"
    escalation: "Data Engineering Manager"
    examples:
      - "30% of order records missing for current day"
      - "One critical column has > 10% null values"

  severity_3:
    description: "Non-critical quality issue or warning"
    response_time: "24 hours"
    escalation: "Data Engineering Lead"
    examples:
      - "Row count increased by 15% (unexpected but not breaking)"
      - "Freshness SLA missed by 30 minutes"

  severity_4:
    description: "Informational, no immediate action required"
    response_time: "Next business day"
    examples:
      - "Test coverage dropped by 1%"
      - "Long-term trend of decreasing completeness"
```

### Incident Response Process

1. **Detection**: Automated monitoring alert or user report
2. **Triage**:
   - Determine affected datasets and consumers
   - Classify severity based on impact
   - Assign incident owner
3. **Containment**:
   - Stop downstream processing if data is corrupted
   - Isolate affected tables if partial failure
   - Notify known consumers
4. **Investigation**:
   - Check pipeline logs (dbt, Airflow, custom ETL)
   - Verify source data freshness and quality
   - Run data comparison queries
5. **Remediation**:
   - Fix root cause (code, configuration, source data)
   - Backfill or recalculate affected data
   - Run verification queries
6. **Verification**:
   - Confirm data quality restored
   - Run full test suite on affected tables
   - Verify downstream consumers functioning
7. **Postmortem**:
   - Document root cause and timeline
   - Add preventive monitoring
   - Update runbooks

## Quality Scorecard

### Weekly Scorecard Template

```yaml
scorecard:
  period: "2025-W03"
  generated: "2025-01-20"

  overall:
    quality_score: 94.2
    previous_week: 93.8
    trend: "improving"

  by_domain:
    - domain: "orders"
      score: 96.7
      tests_total: 45
      tests_passed: 44
      tests_failed: 1
      violations:
        - test: "freshness"
          severity: "warning"
          duration: "2 hours"

    - domain: "customers"
      score: 92.1
      tests_total: 38
      tests_passed: 35
      tests_failed: 3
      violations:
        - test: "completeness"
          severity: "critical"
          duration: "1 hour"
        - test: "uniqueness"
          severity: "high"
          duration: "resolved"

    - domain: "payments"
      score: 98.5
      tests_total: 32
      tests_passed: 32
      tests_failed: 0

  by_dimension:
    completeness: 99.2
    accuracy: 99.8
    timeliness: 97.1
    consistency: 98.5
    uniqueness: 99.9
    validity: 99.7

  trends:
    - metric: "test_pass_rate"
      values: [98.1, 98.3, 97.9, 98.2, 98.5]
      direction: "up"

    - metric: "mean_time_to_detect"
      values: [12, 10, 8, 7, 5]
      unit: "minutes"
      direction: "down"

    - metric: "mean_time_to_resolve"
      values: [85, 72, 65, 58, 45]
      unit: "minutes"
      direction: "down"
```

## Data Quality Tools

### Tool Comparison

| Tool | Type | Strengths | Weaknesses |
|---|---|---|---|
| dbt test | Native dbt | Simple, integrated, fast | Limited to dbt models |
| Great Expectations | Standalone | Comprehensive, profiling, docs | Complex setup, Python heavy |
| Soda Core | Standalone | Simple YAML, CI-friendly | Smaller community |
| dbt-expectations | dbt package | GE inside dbt | Subset of GE features |
| Deequ | Spark native | Scalable, large datasets | Spark-only, complex setup |
| Monte Carlo | SaaS | Automated, ML-based | Cost, vendor lock-in |

### Framework Selection

```
Data Quality Tool Decision:
- Using dbt already: start with dbt test + dbt-expectations
- Need profiling/exploration: Great Expectations
- Simple CI checks: Soda Core
- Spark workloads: Deequ
- Budget available for automation: Monte Carlo or similar SaaS
- Multiple data sources: Great Expectations or Soda
```

## Quality Monitoring Pipeline

### Pipeline Architecture

```
[Source Data] -> [Ingestion Pipeline] -> [Raw Zone]
                                              |
                                      [Quality Checks]
                                      (completeness,
                                       freshness,
                                       schema validation)
                                              |
                                              v
                                      [Transformation]
                                      (dbt models)
                                              |
                                      [Quality Checks]
                                      (dbt test, GE,
                                       row counts, freshness)
                                              |
                                              v
                                      [Consumption Layer]
                                      (reporting, analytics, ML)
                                              |
                                      [Continuous Monitoring]
                                      (scheduled quality checks,
                                       SLA monitoring,
                                       data drift detection)
```

### Scheduled Monitoring Jobs

```yaml
monitoring_jobs:
  hourly:
    - check_freshness: "fct_orders.updated_at < 60 min"
    - check_row_count: "fct_orders > 1000"

  daily:
    - run_dbt_tests: "dbt test --select tag:critical"
    - run_ge_suite: "great_expectations checkpoint run production_checkpoint"
    - check_completeness: "all models > 99%"

  weekly:
    - full_test_suite: "dbt test"
    - data_profiling: "great_expectations suite profile"
    - quality_scorecard: "generate and distribute"
    - sla_review: "all SLAs for period"

  monthly:
    - drift_detection: "compare distributions to baseline"
    - coverage_review: "test coverage by model"
    - quality_tier_review: "reclassify models as needed"
```

## Key Points

- Quality dimensions: completeness, accuracy, timeliness, consistency, uniqueness, validity, integrity
- Quality tiers (critical/high/medium/low) define SLA, monitoring frequency, and alert routing
- Test layers: unit tests (dbt) -> CI/CD tests -> deployment tests -> production monitoring
- dbt generic tests cover uniqueness, not-null, accepted values, and relationships
- Custom generic tests extend coverage for freshness, completeness, and domain-specific rules
- Great Expectations provides comprehensive profiling, expectation suites, and data docs
- Continuous monitoring with automated checks at hourly/daily/weekly/monthly cadence
- Incident classification (S1-S4) determines response time and escalation path
- Quality scorecards provide trend visibility and domain-level health
- Mean time to detect and resolve are key DQ process metrics
- Integration between dbt, Great Expectations, and custom monitoring provides defense in depth
- Automated Slack/email/PagerDuty alerts with proper routing and cooldown
- Regular SLA reviews and quality tier reassessment ensure relevance
