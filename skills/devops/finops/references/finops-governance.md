# FinOps Governance

## Budget Alerts
```bash
aws budgets create-budget \
  --account-id 123456789 \
  --budget '{
    "BudgetName": "monthly-platform",
    "BudgetLimit": {"Amount": "50000", "Unit": "USD"},
    "TimePeriod": {"StartDate": "2026-01-01T00:00:00Z"},
    "TimeUnit": "MONTHLY",
    "CostFilters": {"TagKeyValue": ["cost-center:platform$"]}
  }' \
  --notifications-with-subscribers '[
    {"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 50}, "Subscribers": [{"Address": "team-alerts@example.com", "SubscriptionType": "EMAIL"}]},
    {"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 80}, "Subscribers": [{"Address": "team-alerts@example.com", "SubscriptionType": "EMAIL"}]},
    {"Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 100}, "Subscribers": [{"Address": "leadership@example.com", "SubscriptionType": "EMAIL"}]}
  ]'

az consumption budget create --budget-name "monthly-platform" \
  --category cost --amount 50000 --time-grain monthly \
  --start-date 2026-01-01 --end-date 2026-12-31 \
  --notifications '{"thresholdGte": {"50": {"enabled": true, "contact-emails": ["team-alerts@example.com"]}, "80": {"enabled": true, "contact-emails": ["team-alerts@example.com"]}, "100": {"enabled": true, "contact-emails": ["leadership@example.com"]}}}'

gcloud billing budgets create \
  --billing-account=XXXXXX-YYYYYY-ZZZZZZ \
  --display-name=monthly-platform --budget-amount=50000 \
  --threshold-rules=percent=0.5,percent=0.8,percent=1.0 \
  --filter-projects=projects/my-platform-prod \
  --notify-email=team-alerts@example.com
```

## Anomaly Detection
```yaml
anomaly:
  daily: daily_spend > rolling_avg_7d * 1.2
  weekly: weekly_spend > prev_week_spend * 1.3
  service: service_daily_spend > service_monthly_budget / 30 * 2
  actions:
    auto_tag_owner: true
    slack_channel: "#finops-alerts"
    escalate_after: "4h without response"
    auto_remediate: "scale down non-critical resources if anomaly persists >24h"
```

## Chargeback / Showback
```sql
SELECT labels.value AS team,
  ROUND(SUM(cost), 2) AS total_cost,
  ROUND(SUM(usage.amount), 0) AS total_usage
FROM `myproject.billing.gcp_billing_export_v1_XXXXXX`
CROSS JOIN UNNEST(labels) AS labels
WHERE labels.key = 'team'
  AND DATE(_PARTITIONTIME) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY team ORDER BY total_cost DESC;
```

```sql
SELECT line_item_usage_account_id, line_item_product_code,
  SUM(line_item_unblended_cost) AS cost
FROM "cost_and_usage_data"."cur_table"
WHERE line_item_usage_start_date >= date_trunc('month', now())
GROUP BY 1, 2;
```

Chargeback allocates real cost to teams (drives accountability). Showback reports cost without charging (drives visibility without financial impact). Hybrid approach: showback for visibility first 3 months, then chargeback. Cost allocation requires: (1) complete tagging, (2) shared cost splitting (e.g., shared K8s cluster by namespace), (3) discount allocation (RI/SP savings distributed proportionally).

## Kubecost Integration
```bash
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm install kubecost kubecost/cost-analyzer --namespace kubecost
```
Kubecost provides: namespace-level allocation, deployment-level right-sizing, cluster idle cost, carbon footprint tracking, budget alerts, and chargeback reports. Integrate with OAuth2 for SSO. Export cost data to BigQuery for custom reporting.

## Practice Maturity Model

| Level | Phase | Capabilities |
|-------|-------|-------------|
| 1 | Crawl | Cost visibility, basic tagging, monthly reports, manual review |
| 2 | Walk | Budget alerts, team-level allocation, anomaly detection, auto-remediation |
| 3 | Run | Automated optimization, chargeback, unit economics, KPIs, K8s cost visibility |

## Weekly Cost Review Agenda
1. Top 5 cost increases (service + team level)
2. Anomalies detected and resolution status
3. Right-sizing recommendations implemented
4. RI/SP coverage and utilization
5. Untagged resources report
6. Cost optimization savings YTD
7. Upcoming cost-impacting changes (deploys, migrations, new services)
8. Unit economics trends (cost per request/user/deploy)
9. K8s cluster idle cost and namespace allocation
10. Action items for next week

## Key Points
- Budget alerts at multiple thresholds (50/80/100/150%) for progressive escalation
- Anomaly detection should trigger investigation within 4 hours
- Chargeback requires complete tagging — incomplete tagging = inaccurate allocation
- Weekly reviews maintain cost culture — skip at your own risk
- Kubecost for K8s cost visibility, paired with Karpenter for automated optimization
- Unit economics connect engineering spend to business value
