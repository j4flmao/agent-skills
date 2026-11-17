# Cloud Billing and Cost APIs Reference (AWS, Azure, GCP, FOCUS)

How to pull cost data programmatically for dashboards, chargeback and automation. Covers the query APIs (fast, aggregated, per-request cost) and the bulk exports (complete line items, used for data warehouses). Tagging, budgets and optimization tactics live in sibling references.

## Choosing a Source

| Need | AWS | Azure | GCP |
|------|-----|-------|-----|
| Ad-hoc aggregated query | Cost Explorer API (`ce`) | Cost Management Query API | Cloud Billing reports (UI) or BigQuery |
| Full line-item detail | Data Exports (CUR 2.0) to S3 | Cost Management Exports to Storage | Billing export to BigQuery |
| Vendor-neutral schema | Data Exports FOCUS 1.x | FOCUS export | FOCUS view over BigQuery export |
| Recommendations | Cost Optimization Hub, Compute Optimizer | Azure Advisor | Recommender API |

Rule of thumb: query APIs for small dashboards and alerts; exports for anything joined, historical, or allocated.

## FOCUS (FinOps Open Cost and Usage Specification)

FOCUS normalizes billing data across providers. Key columns:

| Column | Meaning |
|--------|---------|
| `BilledCost` | Amount invoiced for the row |
| `EffectiveCost` | Cost after amortizing upfront commitments and discounts |
| `ListCost` | Cost at public list price |
| `ChargeCategory` | Usage, Purchase, Tax, Credit, Adjustment |
| `ServiceName`, `ServiceCategory` | Normalized service grouping |
| `ResourceId`, `Tags` | Resource-level allocation |
| `ChargePeriodStart` / `ChargePeriodEnd` | Usage window |
| `CommitmentDiscountId` | Savings Plan / RI / CUD applied |

Use `EffectiveCost` for showback and unit economics, `BilledCost` for reconciling invoices.

## AWS Cost Explorer API

Each paginated request is billed (USD 0.01 at the time of writing), so cache results.

```bash
# Monthly unblended cost by service
aws ce get-cost-and-usage \
  --time-period Start=2026-09-01,End=2026-10-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost AmortizedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# Daily cost for one tag value, excluding credits and refunds
aws ce get-cost-and-usage \
  --time-period Start=2026-10-01,End=2026-10-27 \
  --granularity DAILY --metrics NetAmortizedCost \
  --filter '{"And":[
    {"Tags":{"Key":"team","Values":["payments"]}},
    {"Not":{"Dimensions":{"Key":"RECORD_TYPE","Values":["Credit","Refund"]}}}]}'

aws ce get-cost-forecast --time-period Start=2026-10-27,End=2026-11-01 \
  --metric AMORTIZED_COST --granularity MONTHLY
aws ce get-savings-plans-utilization --time-period Start=2026-09-01,End=2026-10-01
aws ce get-reservation-coverage --time-period Start=2026-09-01,End=2026-10-01
aws ce get-anomalies --date-interval StartDate=2026-10-01
```

Metric choice: `UnblendedCost` matches the invoice by charge date; `AmortizedCost` spreads upfront commitment fees; `NetAmortizedCost` also applies discounts. The `End` date is exclusive.

```python
import boto3

ce = boto3.client("ce")

def monthly_cost_by_service(start: str, end: str) -> dict[str, float]:
    totals: dict[str, float] = {}
    token = None
    while True:
        kwargs = dict(
            TimePeriod={"Start": start, "End": end},
            Granularity="MONTHLY",
            Metrics=["AmortizedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        )
        if token:
            kwargs["NextPageToken"] = token
        resp = ce.get_cost_and_usage(**kwargs)
        for period in resp["ResultsByTime"]:
            for group in period["Groups"]:
                svc = group["Keys"][0]
                totals[svc] = totals.get(svc, 0.0) + float(group["Metrics"]["AmortizedCost"]["Amount"])
        token = resp.get("NextPageToken")
        if not token:
            return totals
```

## AWS Data Exports (CUR 2.0)

Data Exports delivers CUR 2.0 or FOCUS tables as Parquet to S3, refreshed up to several times a day. Query with Athena.

```sql
-- CUR 2.0: cost by team tag and service for one billing period
SELECT resource_tags['user_team']            AS team,
       line_item_product_code                AS service,
       SUM(line_item_unblended_cost)         AS unblended,
       SUM(COALESCE(savings_plan_savings_plan_effective_cost,
                    reservation_effective_cost,
                    line_item_unblended_cost)) AS approx_effective
FROM   cur2
WHERE  billing_period = '2026-09'
  AND  line_item_line_item_type IN ('Usage','SavingsPlanCoveredUsage','DiscountedUsage')
GROUP  BY 1, 2
ORDER  BY 3 DESC;
```

User-defined cost allocation tags appear only after they are activated in Billing and only from activation onward. In CUR 2.0 they live in the `resource_tags` map with a `user_` prefix.

## Azure Cost Management Query API

```bash
SCOPE="/subscriptions/$SUB_ID"   # or a management group / billing account scope
az rest --method post \
  --url "https://management.azure.com$SCOPE/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
  --body '{
    "type": "AmortizedCost",
    "timeframe": "MonthToDate",
    "dataset": {
      "granularity": "Daily",
      "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
      "grouping": [{"type": "Dimension", "name": "ServiceName"},
                   {"type": "TagKey",    "name": "team"}]
    }
  }'
```

- `type`: `ActualCost` (invoice view) or `AmortizedCost` (reservations spread).
- The API is throttled per scope; honor `x-ms-ratelimit-*` headers and `Retry-After`.
- For bulk data, create a scheduled export (`az costmanagement export create`) to a Storage account, including the FOCUS dataset.

## GCP Billing Export to BigQuery

Enable "Detailed usage cost" export in the billing account; data lands in `gcp_billing_export_resource_v1_<BILLING_ACCOUNT_ID>`.

```sql
-- Net cost (cost + credits) by project and service for September
SELECT project.id                    AS project,
       service.description           AS service,
       SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost
FROM   `billing.gcp_billing_export_resource_v1_XXXXXX`
WHERE  invoice.month = '202609'
GROUP  BY 1, 2
ORDER  BY net_cost DESC;

-- Cost by label
SELECT l.value AS team, SUM(cost) AS cost
FROM   `billing.gcp_billing_export_resource_v1_XXXXXX`, UNNEST(labels) l
WHERE  l.key = 'team' AND invoice.month = '202609'
GROUP  BY 1;
```

Credits (sustained use, committed use, promotions) are a repeated field with negative amounts; forgetting them overstates spend. Filter by `invoice.month` or the partition column to keep scans cheap.

## Recommendations APIs

```bash
aws cost-optimization-hub list-recommendations --filter '{"actionTypes":["Rightsize"]}'
aws compute-optimizer get-ec2-instance-recommendations
az advisor recommendation list --category Cost -o table
gcloud recommender recommendations list \
  --project=$PROJECT --location=us-central1-a \
  --recommender=google.compute.instance.MachineTypeRecommender
```

## Pitfalls

| Pitfall | Effect | Fix |
|---------|--------|-----|
| Mixing unblended and amortized metrics | Totals do not reconcile | Pick one per report; label it |
| Polling Cost Explorer every minute | API charges, stale data anyway | Data refreshes a few times a day; cache |
| Ignoring credits/refunds | Wrong net cost | Filter or include explicitly |
| Querying unpartitioned exports | Slow, expensive scans | Partition by billing period / invoice month |
| Tag not activated | Spend shows as untagged | Activate cost allocation tags early |

## Checklist

- [ ] Exports (CUR 2.0 / Azure export / BigQuery) enabled for every billing account
- [ ] One documented cost metric for showback (amortized / effective)
- [ ] API clients paginate, retry with backoff, and cache
- [ ] Credits, refunds, taxes handled explicitly
- [ ] Least-privilege read-only billing roles for automation
