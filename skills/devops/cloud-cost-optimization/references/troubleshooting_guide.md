# Troubleshooting Cloud Cost Problems

A practical guide to diagnosing unexpected spend: a structured investigation flow, how to drill down in each cloud, a catalog of common culprits with fixes, and problems with the cost data itself (missing tags, numbers that do not reconcile).

## Investigation Flow

```text
1. Confirm      -> Is it real? Compare amortized vs unblended, check credits, data lag
2. Localize     -> Which account/subscription/project, service, region?
3. Decompose    -> Which usage type / SKU / meter? Price change or quantity change?
4. Attribute    -> Which resource IDs? Which owner/tag?
5. Correlate    -> Deployments, config changes, traffic, events at the start time
6. Fix          -> Remediate, then verify in billing data 1 to 2 days later
7. Prevent      -> Guardrail, alert or policy so it cannot recur silently
```

Always ask: did the **price** change (rate, discount expiry, commitment ended) or the **quantity** (usage)? `cost = quantity x rate`; billing exports expose both (`line_item_usage_amount`, `line_item_unblended_rate` in CUR 2.0; `usage.amount` and `cost` in GCP exports; `quantity` and `effectivePrice` in Azure exports).

## Drill-Down Commands

```bash
# AWS: daily cost by usage type for one service
aws ce get-cost-and-usage --time-period Start=2026-10-01,End=2026-10-27 \
  --granularity DAILY --metrics UnblendedCost UsageQuantity \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Elastic Compute Cloud - Compute"]}}' \
  --group-by Type=DIMENSION,Key=USAGE_TYPE
```

```sql
-- AWS CUR 2.0: top resources for a usage type on a given day
SELECT line_item_resource_id, SUM(line_item_unblended_cost) AS cost
FROM   cur2
WHERE  billing_period = '2026-10'
  AND  line_item_usage_type LIKE '%NatGateway-Bytes%'
  AND  DATE(line_item_usage_start_date) = DATE '2026-10-20'
GROUP  BY 1 ORDER BY 2 DESC LIMIT 20;
```

Azure: Cost analysis with grouping by Meter and Resource, or the Query API with `"grouping":[{"type":"Dimension","name":"MeterSubcategory"},{"type":"Dimension","name":"ResourceId"}]`.

GCP: group the BigQuery export by `sku.description` and `resource.name` (detailed export).

Find who changed what:

```bash
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=RunInstances \
  --start-time 2026-10-19T00:00:00Z --end-time 2026-10-21T00:00:00Z
az monitor activity-log list --start-time 2026-10-19 --end-time 2026-10-21 \
  --query "[?operationName.value=='Microsoft.Compute/virtualMachines/write']"
gcloud logging read 'protoPayload.methodName="v1.compute.instances.insert"' --freshness=7d
```

## Common Culprits

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| NAT Gateway bytes processed up | Workloads pulling from S3/DynamoDB or container registries via NAT | Gateway VPC endpoints (S3, DynamoDB), interface endpoints for ECR; pull-through cache |
| Inter-AZ data transfer up | Chatty cross-zone calls, load balancer cross-zone traffic, replication | Zone-aware routing; co-locate; review replication |
| Internet egress up | New download feature, missing CDN caching, crawler traffic | CDN with correct cache headers; WAF bot control; compression |
| CloudWatch / Log Analytics / Cloud Logging up | Debug logging enabled, new verbose component | Fix log level; filter in pipeline; set retention |
| EBS / managed disk cost up with stable compute | Orphaned volumes, snapshots accumulating | Cleanup; snapshot lifecycle policies (Data Lifecycle Manager / backup policies) |
| S3 request charges up | Small-object writes, list-heavy clients, retry loops | Batch writes; cache listings; fix client retry behavior |
| Lambda cost up | Duration increase from slow dependency, recursive invocation loop | Timeouts, fix dependency; AWS recursive loop detection; concurrency limits |
| EC2 compute up with no deploy | Autoscaling stuck high (bad metric), Savings Plan or RI expired | Fix scaling policy; check commitment expirations |
| Kubernetes node count up | Pods with inflated requests, DaemonSets, unschedulable pods causing scale-up | Rightsize requests; review pending pods and autoscaler logs |
| Database cost up | Storage autoscaling, IOPS increase, new replica, backup retention change | Query tuning; review storage and backup settings |
| Charges in unexpected regions | Forgotten test resources or compromised credentials | Investigate as security incident if unknown |
| Public IPv4 charges appeared or rose | Per-address charges for all public IPv4 on AWS | Remove unneeded public IPs; use IPv6, NAT or load balancers |

## Data Problems

### Spend shows as untagged

- Cost allocation tag not activated (AWS) or applied after the usage period; tags are not applied retroactively.
- Resource type does not support tags or does not propagate them (for example some data transfer and support charges).
- Tag key casing differs (`Team` vs `team`): standardize with tag policies.
- Fix: activate tags, enforce at creation, allocate untaggable shared costs by rule.

### Numbers do not match between tools

| Mismatch | Explanation |
|----------|-------------|
| Cost Explorer vs invoice | Unblended vs amortized; credits, refunds and taxes included or not |
| Cost Explorer vs CUR | Different refresh times; CUR is restated during the month |
| Kubernetes tool vs cloud bill | List prices vs discounted prices; idle and shared costs excluded |
| Azure portal vs export | ActualCost vs AmortizedCost dataset |
| GCP report vs BigQuery | Credits not included in the query |

Agree on one metric and one source of truth for reporting, and document it.

### Month-to-date looks too high or low

- Billing data lags; the last 24 to 48 hours are incomplete.
- Upfront commitment fees appear on the purchase date in unblended views.
- Monthly fees (support plans, some subscriptions, Route 53 hosted zones) post at the start of the month.

## Escalation and Support

- Open a billing support case (free on all AWS, Azure and GCP support levels for billing questions) when charges look wrong or when compromise is suspected.
- Provide account IDs, dates, service, usage type and resource IDs.

## Prevention After Each Incident

| Root cause class | Preventive control |
|------------------|--------------------|
| Configuration change | Policy-as-code check in CI, cost estimate on PR |
| Missing lifecycle/retention | Default retention policies via organization policy or IaC modules |
| Runaway scaling | Max replicas/instances, quotas, anomaly alerts on usage metrics |
| Credential compromise | Region/SKU guardrails, no long-lived keys, threat detection |
| Expired commitment | Expiry alerts 90 days ahead |

## Checklist

- [ ] Price vs quantity determined for every investigated increase
- [ ] Root cause tied to resource IDs and an owner
- [ ] Change history correlated with the start time
- [ ] Fix verified in billing data after the lag
- [ ] Preventive control added and recorded in the anomaly log
