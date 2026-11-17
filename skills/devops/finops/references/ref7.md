# Cost Anomaly Detection and Alert Response

Budgets tell you when you pass a threshold at month end; anomaly detection tells you within a day that spend changed shape. This reference covers configuring native anomaly detection, building your own detector on billing exports, routing alerts to owners, and a response runbook.

## Native Services

| Provider | Service | Granularity | Notes |
|----------|---------|-------------|-------|
| AWS | Cost Anomaly Detection | Daily, by service, linked account, cost category or tag | ML-based; root-cause hints (service, account, region, usage type); free |
| Azure | Cost anomaly alerts (Cost Management) | Daily, per subscription | Configure under Cost alerts > anomaly alert |
| GCP | Billing anomaly detection | Daily, per project/billing account | Shown in Billing console; combine with budgets and Pub/Sub for automation |

Billing data lags (often several hours to a day), so anomaly detection catches problems the next day, not in minutes. For runaway costs that matter within hours (for example GPU fleets, public-facing autoscaling), alert on usage metrics directly: instance counts, Lambda concurrency, bytes egressed.

## AWS Setup (CLI)

```bash
aws ce create-anomaly-monitor --anomaly-monitor '{
  "MonitorName": "by-service",
  "MonitorType": "DIMENSIONAL",
  "MonitorDimension": "SERVICE"
}'

aws ce create-anomaly-monitor --anomaly-monitor '{
  "MonitorName": "team-payments",
  "MonitorType": "CUSTOM",
  "MonitorSpecification": {"Tags": {"Key": "team", "Values": ["payments"]}}
}'

aws ce create-anomaly-subscription --anomaly-subscription '{
  "SubscriptionName": "payments-immediate",
  "MonitorArnList": ["arn:aws:ce::123456789012:anomalymonitor/abc"],
  "Subscribers": [{"Type": "SNS", "Address": "arn:aws:sns:us-east-1:123456789012:cost-alerts"}],
  "Frequency": "IMMEDIATE",
  "ThresholdExpression": {"Dimensions": {"Key": "ANOMALY_TOTAL_IMPACT_ABSOLUTE",
                          "MatchOptions": ["GREATER_THAN_OR_EQUAL"], "Values": ["100"]}}
}'
```

Use one monitor per ownership boundary (team tag, account, cost category) so alerts route to the right people. Set thresholds relative to spend: a USD 100 impact is noise for a large account and critical for a small one; `ANOMALY_TOTAL_IMPACT_PERCENTAGE` combined with an absolute minimum avoids both problems.

## Building a Detector on Billing Exports

When you need custom dimensions or cross-cloud views, run a simple statistical detector on daily cost per (owner, service):

```sql
-- BigQuery: flag days where cost exceeds the trailing 28-day mean by 3 standard deviations
WITH daily AS (
  SELECT DATE(usage_start_time) AS day,
         (SELECT value FROM UNNEST(labels) WHERE key = 'team') AS team,
         service.description AS service,
         SUM(cost) AS cost
  FROM   `billing.gcp_billing_export_resource_v1_XXXXXX`
  WHERE  DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY)
  GROUP  BY 1, 2, 3
),
stats AS (
  SELECT *,
         AVG(cost)    OVER w AS mean_28d,
         STDDEV(cost) OVER w AS sd_28d
  FROM daily
  WINDOW w AS (PARTITION BY team, service ORDER BY UNIX_DATE(day)
               RANGE BETWEEN 28 PRECEDING AND 1 PRECEDING)
)
SELECT day, team, service, cost, mean_28d
FROM   stats
WHERE  day = DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)   -- allow for data lag
  AND  cost > mean_28d + 3 * IFNULL(sd_28d, 0)
  AND  cost - mean_28d > 50                              -- ignore tiny absolute changes
ORDER  BY cost - mean_28d DESC;
```

Weekly seasonality causes false positives; compare to the same weekday or use a seasonal model (for example BigQuery ML `ARIMA_PLUS` with `ML.DETECT_ANOMALIES`) when patterns are strong.

## Routing

| Alert | Route to | Channel |
|-------|----------|---------|
| Team-tagged anomaly | Owning team's channel + FinOps | Chat (via SNS/Event Grid/PubSub to webhook) |
| Untagged / unknown owner | FinOps + account owner | Chat + ticket |
| Large impact (above a severity threshold) | On-call of owning team | Paging tool |
| Budget forecast breach | Budget owner | Email + chat |

Include in the alert: service, account/subscription/project, region, usage type, impact amount and percentage, start date, and a link to a pre-filtered cost report.

## Response Runbook

1. **Acknowledge** within the agreed time; assign an investigator.
2. **Scope**: break the increase down by usage type, resource ID (from detailed export) and region.
3. **Correlate** with change events: deployments, infrastructure changes (CloudTrail / Activity Log / Audit Logs), traffic graphs, marketing events.
4. **Classify**:

| Class | Example | Action |
|-------|---------|--------|
| Expected growth | Launch, seasonal peak | Close; update forecast |
| Misconfiguration | Debug logging, missing lifecycle rule, autoscaling loop | Fix; estimate cost of incident |
| Waste | Forgotten test cluster | Cleanup procedure |
| Abuse / compromise | Unknown instances in unusual regions, sudden GPU usage, egress spike | Treat as a security incident: rotate credentials, isolate, involve security team |
| Billing artifact | Commitment purchase, credit expiry | Close; consider amortized view |

5. **Remediate** and verify in the next days' data.
6. **Record** root cause, cost impact and prevention (guardrail, policy, alert) in the anomaly log.

## Common Root Causes

| Symptom | Likely cause |
|---------|--------------|
| NAT gateway bytes jump | New service pulling large data from the internet or S3 without endpoints |
| Log ingest doubles | Log level change, new verbose library, retry storm |
| Data transfer between AZs up | New chatty dependency, misrouted traffic |
| Storage grows steadily | Missing lifecycle/retention, backup policy change |
| Compute hours jump in unused region | Compromised credentials (cryptomining) |
| Request-priced service spikes (S3, DynamoDB, API Gateway) | Client retry loop, crawler, missing cache |

## Prevention Feedback Loop

Each confirmed incident should produce at least one control: a budget, a policy, an alert on the usage metric, or a code change. Track the number of repeat anomalies by root cause; repeats mean the prevention step was missed.

## Checklist

- [ ] Native anomaly detection enabled in every cloud and account
- [ ] Monitors aligned to ownership boundaries with spend-relative thresholds
- [ ] Usage-metric alerts for fast-burning resources
- [ ] Alerts include context and a link to a filtered report
- [ ] Runbook with security escalation path for suspected abuse
- [ ] Anomaly log with root cause and prevention actions
