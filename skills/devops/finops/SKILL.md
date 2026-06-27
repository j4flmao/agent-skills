---
name: devops-finops
description: |
  Trigger: "FinOps", "cloud cost", "cost optimization", "cloud spend",
  "cost allocation", "reserved instance", "savings plan", "cost tagging",
  "cloud budget", "cost governance", "FinOps framework", "cloud economics"
  Exclusion: Not for infra provisioning -- use cloud-specific skills.
version: 1.1.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, finops, cost, phase-7]
---

# devops-finops

## Purpose
Implement FinOps practices for cloud cost visibility, allocation, optimization, and governance -- covering compute, storage, Kubernetes, and organizational maturity from crawl to run.

## Agent Protocol

### Trigger
Any user message referencing cloud cost, FinOps, cost optimization, reserved instances, savings plans, tagging, budgets, chargeback, or Kubecost.

### Input Context
Cloud provider(s), current monthly spend, team structure, tagging conventions, optimization goals, compliance requirements.

### Output Artifact
Tagging strategy, budget alerts, right-sizing recommendations, RI/SP purchase plans, cost dashboards, chargeback/showback reports, K8s cost optimization config.

### Response Format
Tabular data, tagging schemas, policy definitions. CLI/API examples for cost tools.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
Tagging enforced, budgets active, right-sizing recommendations implemented, cost visibility dashboards deployed, chargeback process documented, K8s cost visibility enabled.

## Architecture / Decision Trees

### FinOps Maturity Model

| Stage | Capabilities | Metrics | Automation Level |
|---|---|---|---|
| Crawl | Tagging, basic budgets, monthly reports | Total spend, top services | Manual |
| Walk | Anomaly detection, RI/SP management, team allocation | Unit economics, coverage % | Semi-automated |
| Run | Automated optimization, chargeback, continuous governance | Efficiency KPIs, forecasting | Fully automated |

### Discount Vehicle Decision Tree
- Stable, known baseline workload: Reserved Instance (3-year all upfront).
- Diverse, growing compute footprint: Compute Savings Plan.
- Stateless, fault-tolerant workloads: Spot (up to 90% discount).
- Variable, unpredictable traffic: On-demand + auto-scaling.
- Hybrid EC2/Fargate/Lambda: Compute SP > EC2 SP.
- Short-term project (< 1 year): On-demand only (avoid commitment).

### Organization Structure Options

| Model | Structure | Best For |
|---|---|---|
| Centralized | Single FinOps team manages all | Small orgs (<100 people) |
| Federated | Each team manages own costs | Large orgs (>500 people) |
| Hub-and-Spoke | Central team + decentralized executors | Mid-size orgs |
| Embedded | FinOps practitioners in each team | Enterprise with dedicated budget |

### Resource Type Optimization Priority

| Resource Type | Optimization Potential | Effort | Priority |
|---|---|---|---|
| Compute (EC2, GCE, VM) | 30-60% savings | Medium | High |
| Kubernetes (idle, over-provisioned) | 40-60% savings | High | High |
| Storage (lifecycle, unattached) | 20-40% savings | Low | Medium |
| Data transfer (egress, cross-region) | 30-50% savings | Medium | High |
| Database (right-sizing, RI) | 25-50% savings | Medium | High |
| Serverless (over-provisioned memory/timeout) | 20-30% savings | Low | Medium |

## Core Workflow

### Step 1: Tagging Strategy
```hcl
# Terraform tagging convention
locals {
  required_tags = {
    Environment = var.environment    # dev, staging, prod
    CostCenter  = var.cost_center    # platform, data, ml, security
    Service     = var.service_name   # myapp, auth, payments
    Team        = var.team_name      # backend, frontend, infra
    Owner       = var.owner_email    # team lead email
    ManagedBy   = "terraform"
    CreatedAt   = formatdate("YYYY-MM-DD", timestamp())
  }
}

resource "aws_instance" "app" {
  tags = local.required_tags
  volume_tags = local.required_tags
}
```

### Step 2: Budget Alerts
```hcl
# AWS Budget with multiple thresholds and automation
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-budget-${var.service}"
  budget_type  = "COST"
  limit_amount = var.budget_amount
  limit_unit   = "USD"
  time_period_start = "2024-01-01_00:00"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 50
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"
    subscriber_email_addresses = [var.owner_email]
  }

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 80
    threshold_type      = "PERCENTAGE"
    notification_type   = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 100
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.cost_escalation.arn]
  }
}
```

### Step 3: Cost and Usage Report to BigQuery (GCP)
```sql
-- Query billing export for top spenders
SELECT
  service.description AS service,
  ROUND(SUM(cost), 2) AS total_cost,
  ROUND(SUM(usage.amount), 2) AS total_usage
FROM `project.dataset.gcp_billing_export_v1`
WHERE DATE(_PARTITIONTIME) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY service
ORDER BY total_cost DESC
LIMIT 10;
```

### Step 4: Right-Sizing Recommendation
```bash
# AWS Compute Optimizer recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --instance-arn arn:aws:ec2:us-east-1:123456789012:instance/i-12345

# Azure Advisor cost recommendations
az advisor recommendation list \
  --category Cost \
  --query "[].{Name:resourceName, Saving:savings}" \
  --output table

# GCP Recommender
gcloud recommender recommendations list \
  --project=my-project \
  --location=us-central1 \
  --recommender=google.compute.image.IdleResourceRecommender
```

### Step 5: Reserved Instance / Savings Plan Purchase
```bash
# AWS: Purchase Compute Savings Plan
aws savingsplans purchase-savings-plan \
  --savings-plan-offering-id <offering-id> \
  --commitment 1000.00 \
  --purchase-time "2024-01-01T00:00:00Z"

# AWS: Purchase EC2 RI
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id <offering-id> \
  --instance-count 5

# GCP: Purchase CUD
gcloud compute commitments create reservation \
  --project=my-project \
  --region=us-central1 \
  --plan=12-month \
  --resources=vcpu=100,memory=384GB
```

### Step 6: Kubecost Namespace Cost Allocation
```yaml
# Kubecost namespace annotations for cost allocation
apiVersion: v1
kind: Namespace
metadata:
  name: myapp-prod
  annotations:
    kubecost.owner: "team-backend"
    kubecost.env: "production"
    kubecost.app: "myapp"
    kubecost.cost-center: "platform"
    kubecost.budget: "5000"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: myapp-quota
  namespace: myapp-prod
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "32Gi"
    limits.cpu: "20"
    limits.memory: "64Gi"
```

### Step 7: Automated Remediation
```python
# Lambda function to stop untagged instances
def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    instances = ec2.describe_instances(
        Filters=[{'Name': 'tag-key', 'Values': ['CostCenter']}]
    )
    untagged = []
    for r in instances['Reservations']:
        for i in r['Instances']:
            if not i.get('Tags'):
                untagged.append(i['InstanceId'])
    if untagged:
        ec2.stop_instances(InstanceIds=untagged)
        send_slack_alert(f"Stopped untagged instances: {untagged}")
```

### Step 8: Storage Lifecycle Policy
```hcl
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"
    filter {
      prefix = "logs/"
    }
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    expiration {
      days = 365
    }
  }

  rule {
    id     = "noncurrent-version-cleanup"
    status = "Enabled"
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
```

## Anti-Patterns

### Anti-Pattern 1: Skipping Maturity Foundation
Jumping to automated optimization without establishing tagging, visibility, and allocation leads to chaos. Follow crawl-walk-run maturity. Do not automate before you can measure.

### Anti-Pattern 2: RI/SP Overcommitment
Buying RIs for unstable workloads or before right-sizing wastes money. Always right-size for 14 days first. Only commit to RIs for stable baseline under 60% utilization.

### Anti-Pattern 3: Chargeback Without Culture
Implementing finance-grade chargeback without team buy-in creates friction. Start with showback (visibility only). Transition to chargeback when teams understand their costs.

### Anti-Pattern 4: Alert Fatigue
Too many budget alerts lead to ignored alerts. Set meaningful thresholds: 50% (info), 80% (warn), 100% (critical), 150% (escalation). Route to cost center owners, not everyone.

### Anti-Pattern 5: Ignoring Orphaned Resources
Unattached volumes, idle load balancers, and orphaned snapshots accumulate silently. A single unattached volume costs $8/month, but 100 cost $800/month. Automate detection and remediation.

### Anti-Pattern 6: Overlooking Data Transfer
Teams optimize compute and storage but ignore egress. A data-heavy app can spend more on data transfer than compute. Use CDN for egress. Keep data in-region. Monitor NAT Gateway charges.

### Anti-Pattern 7: Neglecting SaaS Costs
FinOps focuses on cloud infrastructure but SaaS tools, API costs, and data transfer to third parties add up. Include SaaS costs in visibility dashboards. Review subscription utilization quarterly.

## Production Considerations

### Cost Visibility
- Dashboards per team, per service, per environment.
- Daily cost notifications to team leads.
- Weekly cost review with actionable insights.
- Monthly executive summary with trends.
- Unit economics KPIs tracked and trended.

### Governance Automation
- IaC templates with mandatory tagging enforcement.
- Budget auto-creation for new projects.
- Cost anomaly detection with auto-remediation.
- Automated waste remediation (unattached volumes, orphaned snapshots).
- Quarterly cost optimization roadmap.

### RI/SP Management
- Monthly utilization review -- alert if under 70%.
- Fresh purchase recommendation report monthly.
- Expiring reservation renewal 60 days before expiry.
- Allocation of savings to consuming teams.
- Regular right-sizing before any RI purchase.

### Kubernetes Cost Optimization
- Kubecost for namespace-level allocation.
- Karpenter for dynamic node provisioning.
- VPA recommendations for resource right-sizing.
- HPA tuning to avoid over-provisioning.
- Namespace resource quotas.
- Spot node pools for fault-tolerant workloads.
- Eliminate orphaned resources (PVs, LBs).

## Rules
- Every resource has mandatory cost allocation tags.
- Budget alerts configured before any resource deployment.
- Right-size before buying reserved capacity.
- Spot instances for non-critical, fault-tolerant workloads.
- Delete unused resources weekly.
- Unit economics tracked and trended monthly.
- Reserved instances only for stable baseline over 60% utilization.
- Cross-team chargeback to drive accountability.
- K8s cost visibility via Kubecost.
- Data transfer costs tracked and minimized.
- Anomaly alerts actionable within 24 hours.
- Weekly cost reviews with engineering.
- Tagging compliance target over 95%.
- RI/SP utilization must be over 70%.
- Showback before chargeback.
- Cost optimization decisions documented in ADRs.

## Compared With

### FinOps vs ITFM
FinOps: cloud-specific cost management with team accountability and continuous optimization. ITFM: broader discipline covering all IT costs (hardware, software, personnel). FinOps is a subset of ITFM for cloud costs with DevOps culture.

### FinOps vs Cloud Cost Optimization
FinOps includes cost optimization as one pillar but also covers visibility, allocation, governance, and maturity. Cost optimization is technical; FinOps is organizational and technical.

### FinOps vs Traditional IT Chargeback
Traditional chargeback is annual, static, and opaque. FinOps chargeback is continuous, granular (per resource/namespace), and transparent. FinOps provides showback before chargeback.

## Operations & Maintenance

### Weekly Cost Review
1. Review top spenders by service and team.
2. Discuss anomalies and waste.
3. RI/SP utilization check.
4. Action items from previous week.
5. Tagging compliance report.

### Monthly Cost Review
1. Executive summary: total vs budget, month-over-month, YTD savings.
2. Top 10 cost increases with breakdown.
3. Anomaly report: detected, investigated, resolved.
4. RI/SP report: coverage, utilization, expiring.
5. Right-sizing report: recommendations and savings.
6. Storage optimization: lifecycle savings, orphaned cleanup.
7. Kubernetes: namespace spend, idle cluster, Kubecost recs.
8. Unit economics: cost per user/request/transaction.
9. Governance review: tagging compliance, budget compliance.

### Cost Scenarios

#### Scenario: Unexpected Spend Spike
Detection: daily anomaly alert shows 35% increase in compute. Investigation: drill into billing export by service, region, label. Root cause: new deployment without spot flag. Fix: tag with spot config, add CI validation.

#### Scenario: Idle Resources
Detection: weekly idle resource report. Investigation: identify owners via creator tag. Fix: delete unattached volumes, orphaned LBs, idle NAT. Automation: auto-delete after grace period.

#### Scenario: RI Coverage Gap
Detection: monthly RI report shows coverage dropped from 65% to 45%. Investigation: new workload without RI. Fix: purchase additional RI, adjust workload. Automation: alert when coverage under 50%.

## References
- references/finops-fundamentals.md -- Finops Fundamentals
- references/finops-advanced.md -- Finops Advanced Topics
- references/finops-automation.md -- FinOps Automation
- references/finops-governance.md -- FinOps Governance
- references/finops-practices.md -- FinOps Practices
- references/cost-optimization.md -- Cost Optimization
- references/finops-maturity-model.md -- FinOps Maturity Model
- references/finops-cost-optimization-levers.md -- Cost Optimization Levers

## Handoff
Hand off to finops for cost visibility and optimization. Hand off to cloud-specific skills (aws/azure/gcp) for resource provisioning at optimized price.

## Architecture Decision Trees

### Reserved vs On-demand Instances

| Decision | Reserved (1yr/3yr) | On-demand / Spot |
|---|---|---|
| Discount | 30-70% | 0-90% (spot) |
| Commitment | 1-3 year term | None / ephemeral |
| Flexibility | Convertible or standard | Full |
| Workload fit | Steady-state, predictable | Variable, batch, stateless |
| Risk | Over-provisioning if demand shrinks | Spot termination, price spikes |
| Best for | Databases, production K8s | CI runners, dev, batch jobs |

### Savings Plan vs Reserved Instances

| Dimension | Savings Plan | EC2 RI |
|---|---|---|
| Scope | Compute ($/hr commitment) | Instance family × region |
| Coverage | EC2, Fargate, Lambda | EC2 only |
| Flexibility | Instance family changes okay | Locked to family |
| Management | Simpler (single $ commitment) | Per-instance-type tracking |

## Implementation Patterns

### YAML: AWS Budget with Cost Anomaly Alert

```yaml
Budgets:
  - BudgetName: "Monthly-Infrastructure"
    BudgetType: "COST"
    BudgetLimit:
      Amount: 50000
      Unit: USD
    TimePeriod:
      Start: "2026-01-01"
    TimeUnit: "MONTHLY"
    CostFilters:
      TagKeyValue:
        - "Environment$production"
    NotificationThresholds:
      - Threshold: 80
        ComparisonOperator: GREATER_THAN
        NotificationType: ACTUAL
        Subscribers:
          - Address: finops@company.com
            SubscriptionType: EMAIL
      - Threshold: 100
        ComparisonOperator: GREATER_THAN
        NotificationType: FORECASTED
        Subscribers:
          - Address: finops-team@company.com
            SubscriptionType: EMAIL
            SubscriptionType: SLACK
```

### Bash: Tag Compliance Scanner

```bash
#!/usr/bin/env bash
set -euo pipefail

check_tag_compliance() {
  local required_tags=("Environment" "Owner" "CostCenter" "Project")
  local violations=0

  aws resourcegroupstaggingapi get-resources \
    --query 'ResourceTagMappingList[?Tags == `null` || length(Tags) == `0`]' \
    --output json | jq -c '.[]' | while read -r resource; do
    arn=$(echo "$resource" | jq -r '.ResourceARN')
    echo "UNTAGGED: $arn"
    violations=$((violations + 1))
  done

  echo "Total untagged resources: $violations"
  return "$violations"
}
```

## Production Considerations

- Establish a **FinOps Center of Excellence (CoE)** with engineering, finance, and operations
- Tag **all resources** with Environment, Owner, CostCenter, and Project for chargeback/showback
- Set up **monthly budget reviews** with engineering teams to review anomalies and optimizations
- Implement **automated right-sizing** recommendations using AWS Compute Optimizer / Azure Advisor
- Use **commitment-based discounts** (RIs, Savings Plans) for baseline compute; spot/on-demand for burst
- Track **unit economics** (cost per transaction, per user, per GB stored) for business-aligned reporting
- Publish **cost dashboards** in Grafana/Looker with daily granularity and team breakdowns

## Anti-Patterns

- Ignoring **data transfer costs** — cross-region, NAT gateway, and egress often exceed compute cost
- Over-provisioning **without right-sizing** — using large instances when smaller ones suffice
- Leaving **idle resources** running overnight/weekends — dev instances should auto-stop on schedule
- Skipping **storage lifecycle policies** — hot storage is expensive for cold data
- Using **premium support tiers** for non-production accounts — reduce to developer tier for dev
- Treating **FinOps as finance-only** — engineering must be involved in cost decisions
- Applying **blanket discounts** without per-team attribution — kills accountability

## Performance Optimization (Cost-Efficiency)

- Use **Spot Instances** for stateless workloads (CI runners, batch processing, canary deployments)
- Enable **auto-scaling** with proper min/max limits — over-provisioning baseline + scale for spikes
- Implement **storage tiering**: hot (SSD) → warm (HDD) → cold (S3 Glacier) → archive (Deep Archive)
- Configure **lifecycle policies** on S3/Blob Storage to transition objects and expire old versions
- Use **graviton/ARM instances** for compute workloads — 20-40% better price-performance
- Consolidate **small workloads** into larger instances — higher density, lower per-unit cost
- Cache **frequently accessed data** with CDN / Redis to reduce compute and bandwidth costs

## Security Considerations

- Control **IAM permissions** for cost data — restrict `ce:*`, `budgets:*`, `pricing:*` to FinOps team
- Enable **AWS Organizations SCP** to prevent teams from launching expensive instance types
- Set **billing alarms** with SNS notifications to Slack/PagerDuty on threshold breaches
- Audit **resource creation** with CloudTrail and cross-reference with budget tag requirements
- Use **IAM roles** for programmatic cost API access instead of long-lived access keys
- Restrict **permissions** to modify budgets and alerts to a small admin group
- Monitor **cost anomaly** with AWS Cost Anomaly Detection or third-party FinOps platforms
