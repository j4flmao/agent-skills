# FinOps Governance

## Budget Alerts

```bash
# AWS Budget
aws budgets create-budget \
  --account-id 123456789 \
  --budget '{
    "BudgetName": "monthly-platform",
    "BudgetLimit": {"Amount": "50000", "Unit": "USD"},
    "TimePeriod": {"StartDate": "2026-01-01T00:00:00Z"},
    "TimeUnit": "MONTHLY",
    "CostFilters": {"TagKeyValue": ["cost-center:platform$"]},
    "PlannedBudgetLimits": {}
  }' \
  --notifications-with-subscribers '[
    {"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 50, "ThresholdType": "PERCENTAGE"}, "Subscribers": [{"Address": "team-alerts@example.com", "SubscriptionType": "EMAIL"}]},
    {"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 80, "ThresholdType": "PERCENTAGE"}, "Subscribers": [{"Address": "team-alerts@example.com", "SubscriptionType": "EMAIL"}]},
    {"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 100, "ThresholdType": "PERCENTAGE"}, "Subscribers": [{"Address": "leadership@example.com", "SubscriptionType": "EMAIL"}]}
  ]'

# Azure Budget
az consumption budget create \
  --budget-name "monthly-platform" \
  --category cost \
  --amount 50000 \
  --time-grain monthly \
  --start-date 2026-01-01 \
  --end-date 2026-12-31 \
  --notifications '{"thresholdGte": {"50": {"enabled": true, "contact-emails": ["team-alerts@example.com"]}, "80": {"enabled": true, "contact-emails": ["team-alerts@example.com"]}, "100": {"enabled": true, "contact-emails": ["leadership@example.com"]}}}'

# GCP Budget
gcp:
  gcloud billing budgets create \
    --billing-account=XXXXXX-YYYYYY-ZZZZZZ \
    --display-name=monthly-platform \
    --budget-amount=50000 \
    --threshold-rules=percent=0.5,percent=0.8,percent=1.0 \
    --filter-projects=projects/my-platform-prod \
    --notify-email=team-alerts@example.com
```

## Anomaly Detection

```python
# Anomaly detection logic
anomaly:
  # Daily spend vs trailing 7-day rolling average
  alert if: daily_spend > rolling_avg_7d * 1.2

  # Weekly spend vs previous week
  alert if: weekly_spend > prev_week_spend * 1.3

  # Service-level spikes
  alert if: service_daily_spend > service_monthly_budget / 30 * 2

  # Actions:
  auto_tag_owner: true
  slack_channel: "#finops-alerts"
  escalate_after: "4h without response"
```

## Chargeback / Showback

```sql
-- BigQuery cost breakdown by team
SELECT
  labels.value AS team,
  ROUND(SUM(cost), 2) AS total_cost,
  ROUND(SUM(usage.amount), 0) AS total_usage
FROM `myproject.billing.gcp_billing_export_v1_XXXXXX`
CROSS JOIN UNNEST(labels) AS labels
WHERE labels.key = 'team'
  AND DATE(_PARTITIONTIME) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY team
ORDER BY total_cost DESC;
```

```bash
# AWS Cost and Usage Report
# Enable CUR in Billing Console, query via Athena
SELECT
  line_item_usage_account_id,
  line_item_product_code,
  SUM(line_item_unblended_cost) AS cost
FROM "cost_and_usage_data"."cur_table"
WHERE line_item_usage_start_date >= date_trunc('month', now())
GROUP BY 1, 2;
```

## Practice Maturity Model

| Level | Phase | Capabilities |
|-------|-------|-------------|
| 1 | Crawl | Cost visibility, basic tagging, monthly reports |
| 2 | Walk | Budget alerts, team-level allocation, anomaly detection |
| 3 | Run | Automated optimization, chargeback, unit economics, KPIs |

## Weekly Cost Review Agenda

1. Top 5 cost increases (service + team level)
2. Anomalies detected and resolution status
3. Right-sizing recommendations implemented
4. RI/SP coverage and utilization
5. Untagged resources report
6. Cost optimization savings YTD
7. Upcoming cost-impacting changes
8. Unit economics trends
