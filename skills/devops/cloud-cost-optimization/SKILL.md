---
name: cloud-cost-optimization
description: >
  Use this skill when the user says 'cost optimization', 'FinOps', 'cloud cost',
  'AWS cost', 'Azure cost', 'GCP cost', 'budget', 'cost allocation',
  'reserved instance', 'savings plan', 'spot instance', 'right-sizing',
  'cost anomaly', 'showback', 'chargeback', 'unit economics'.
  Covers: cost visibility, FinOps practices, resource right-sizing,
  reserved/spot instances, storage tiering, budget alerts, cost allocation,
  multi-cloud cost comparison, showback/chargeback models.
  Do NOT use for: general architecture (use cloud-architecture),
  financial accounting (use FinOps skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud-cost, finops, optimization, phase-5]
---

# Cloud Cost Optimization

## Purpose
Optimize cloud costs through visibility, allocation, right-sizing, commitment discounts, automation, and FinOps governance.

## Architecture Decision Trees

### Cost Optimization Strategies by Category
| Category | Strategy | Savings | Effort |
|---|---|---|---|
| Compute | Right-sizing | 20-40% | Low |
| Compute | Spot/preemptible | 60-90% | Low |
| Compute | Reserved/Savings Plans | 30-60% | Low |
| Compute | Auto-scaling | 20-50% | Medium |
| Storage | Lifecycle policies | 40-70% | Low |
| Storage | Delete unused volumes/snapshots | 10-30% | Low |
| Storage | Object storage tiering | 30-60% | Low |
| Network | CDN + compression | 20-60% | Medium |
| Network | Data transfer optimization | 10-40% | Medium |
| Network | NAT gateway consolidation | 5-15% | Low |
| Database | Right-size + reserved | 30-60% | Low |
| Database | Serverless (Aurora/Cosmos) | 20-50% | Medium |
| Database | Read replicas for analytics | 10-30% | Medium |
| Overall | Tagging + governance | Prevent waste | Low |
| Overall | Anomaly detection | Catch spikes early | Medium |
| Overall | Commitments + volume discounts | 15-50% | Low |

### Reserved Instance / Savings Plan Comparison
| Purchase Option | Discount | Commitment | Flexibility | Best For |
|---|---|---|---|---|
| AWS Savings Plan | 30-72% | 1 or 3 years | High (any compute) | Predictable compute |
| AWS Reserved Instances | 30-75% | 1 or 3 years | Low (specific instance) | Known instance types |
| AWS Convertible RI | 30-54% | 1 or 3 years | Medium (change family) | Evolving workloads |
| Azure Reservations | 20-60% | 1 or 3 years | Low (specific VM size) | Stable VMs |
| Azure Savings Plan | 20-55% | 1 or 3 years | High (any compute) | Mixed compute |
| GCP CUD (resource) | 20-70% | 1 or 3 years | Resource-specific | Known consumption |
| GCP CUD (spend-based) | 10-30% | 1 year | High (any) | Variable workloads |

### Rightsizing Decision Tree
```
Is CPU utilization < 20%?
├── Yes → Can we use a smaller instance type?
│   ├── Yes → Downsize instance
│   └── No → Can we consolidate to fewer instances?
│       ├── Yes → Consolidate
│       └── No → Consider serverless/spot
└── No → Is workload predictable?
    ├── Yes → Reserved/Savings Plan
    └── No → Auto-scaling + spot
```

### Compute Selection Decision Tree
```
Is workload stateless and fault-tolerant?
├── Yes → Can use spot/preemptible?
│   ├── Yes → Spot instance (60-90% savings)
│   └── No → On-demand + Savings Plan
└── No → Is workload predictable (>70% utilization)?
    ├── Yes → Reserved Instance (30-75% savings)
    └── No → Is workload bursty/spiky?
        ├── Yes → Auto-scaling group + mix of on-demand/spot
        └── No → Serverless (Lambda/Cloud Functions)
```

### Storage Tier Decision
| Access Pattern | AWS | Azure | GCP | Cost/GB |
|---|---|---|---|---|
| Daily | S3 Standard | Blob Hot | Standard | ~$0.023 |
| Weekly | S3 IA | Blob Cool | Nearline | ~$0.0125 |
| Monthly | Glacier IR | Blob Cold | Coldline | ~$0.0045 |
| Quarterly | Glacier | Archive | Archive | ~$0.001 |
| Yearly+ | DEEP Archive | Cool (blob) | Archive | ~$0.0005 |
| Critical | S3 One Zone IA | Blob Hot (LRS) | Standard (regional) | ~$0.01 |

### Anomaly Detection Decision Tree
```
Cost spike detected (>20% above baseline)?
├── Yes → Check by service:
│   ├── Compute → Check new instances, instance type changes, scaling events
│   ├── Network → Check data transfer (NAT gateway, cross-region, CDN egress)
│   ├── Storage → Check new volumes, snapshot frequency, lifecycle compliance
│   └── Database → Check IOPS burst, storage scaling, read replica count
└── No → Compare actual vs budget at category level
```

## Core Workflow

### Step 1: Cost Visibility — AWS Cost Explorer with Tags
```bash
# Enable cost allocation tags
aws ce create-cost-allocation-tags \
  --resource-arn arn:aws:ec2:us-east-1:123456789012:instance/i-123

# Cost and Usage Report
aws cur put-report-definition \
  --report-definition file://cur-definition.json

# Budget definition
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

### Step 2: Budget Alerts
```hcl
# Terraform: AWS Budget
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-production-budget"
  budget_type  = "COST"
  limit_amount = "50000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["Environment$production"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = ["finops@company.com", "cto@company.com"]
  }

  auto_adjust_data {
    auto_adjust_type = "FORECAST"
  }
}

resource "aws_budgets_budget_action" "auto_stop" {
  budget_name        = aws_budgets_budget.monthly.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.budget_action.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.stop_nonprod.arn
      roles      = [aws_iam_role.budget_action.name]
    }
  }

  subscriber {
    email_addresses = ["finops@company.com"]
  }
}
```

### Step 3: Right-Sizing with Compute Optimizer
```python
# right_size/recommendations.py
import boto3

def get_rightsizing_recommendations():
    """Get AWS Compute Optimizer recommendations."""
    client = boto3.client('compute-optimizer')

    recommendations = client.get_ec2_instance_recommendations(
        recommendation_preferences={
            'enhancedInfrastructureMetrics': 'Active',
            'externalMetricsPreference': {'source': 'Datadog'},
            'preferredResources': [
                {'name': 'instanceType', 'includeList': ['t3', 'm6i', 'c6i', 'r6i']}
            ]
        },
        filters=[{'name': 'Finding', 'values': ['Underprovisioned', 'Overprovisioned']}]
    )

    for rec in recommendations.get('instanceRecommendations', []):
        instance = rec['instanceArn'].split('/')[-1]
        finding = rec['finding']
        current = rec['currentInstanceType']
        recommended = rec['recommendationOptions'][0]['instanceType']
        savings = rec['recommendationOptions'][0].get('estimatedMonthlySavings', {}).get('value', 0)

        if finding == 'Overprovisioned':
            print(f"{instance}: {current} → {recommended} (save ${savings}/mo)")

    return recommendations
```

### Step 4: Cost Allocation Tags
```hcl
# tagging-policy.yaml (AWS Organizations SCP)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUntaggedResources",
      "Effect": "Deny",
      "Action": [
        "ec2:RunInstances",
        "rds:CreateDBInstance",
        "s3:CreateBucket"
      ],
      "Resource": "*",
      "Condition": {
        "Null": {
          "aws:RequestTag/Environment": "true",
          "aws:RequestTag/CostCenter": "true",
          "aws:RequestTag/Project": "true",
          "aws:RequestTag/Owner": "true"
        }
      }
    }
  ]
}
```

### Step 5: Automated Cleanup of Unused Resources
```python
# cleanup/unused_resources.py
import boto3
from datetime import datetime, timedelta

def cleanup_unused_volumes():
    ec2 = boto3.client('ec2')
    volumes = ec2.describe_volumes(Filters=[{'Name': 'status', 'Values': ['available']}])
    deleted = 0
    for vol in volumes['Volumes']:
        # Skip volumes tagged with "Preserve"
        tags = {t['Key']: t['Value'] for t in vol.get('Tags', [])}
        if tags.get('Preserve') == 'true':
            continue
        # Only delete volumes older than 7 days
        create_time = vol['CreateTime'].replace(tzinfo=None)
        if datetime.utcnow() - create_time > timedelta(days=7):
            ec2.delete_volume(VolumeId=vol['VolumeId'])
            print(f"Deleted unused volume: {vol['VolumeId']} ({vol['Size']}GB)")
            deleted += 1
    print(f"Deleted {deleted} unused volumes")

def cleanup_old_snapshots():
    ec2 = boto3.client('ec2')
    snapshots = ec2.describe_snapshots(OwnerIds=['self'])
    deleted = 0
    for snap in snapshots['Snapshots']:
        start_time = snap['StartTime'].replace(tzinfo=None)
        if datetime.utcnow() - start_time > timedelta(days=90):
            ec2.delete_snapshot(SnapshotId=snap['SnapshotId'])
            print(f"Deleted old snapshot: {snap['SnapshotId']}")
            deleted += 1
    print(f"Deleted {deleted} old snapshots")

def cleanup_unattached_eips():
    ec2 = boto3.client('ec2')
    addresses = ec2.describe_addresses(Filters=[{'Name': 'domain', 'Values': ['vpc']}])
    released = 0
    for addr in addresses['Addresses']:
        if 'InstanceId' not in addr and 'NetworkInterfaceId' not in addr:
            ec2.release_address(AllocationId=addr['AllocationId'])
            print(f"Released unattached EIP: {addr['PublicIp']}")
            released += 1
    print(f"Released {released} unattached EIPs")
```

### Step 6: Spot Instance Strategy
```hcl
# Terraform: EKS with Spot Node Group
resource "aws_eks_node_group" "spot" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "spot-workers"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = ["m6i.large", "m5.large", "c6i.large"]
  capacity_type   = "SPOT"

  scaling_config {
    desired_size = 3
    max_size     = 20
    min_size     = 1
  }

  tags = {
    "k8s.io/cluster-autoscaler/enabled" = "true"
    "Environment" = "production"
    "CapacityType" = "spot"
  }
}
```

### Step 7: Anomaly Detection with CloudWatch
```python
# anomaly/cost_anomaly_detection.py
import boto3
import json
from datetime import datetime, timedelta

def setup_cost_anomaly_monitor():
    """Create AWS Cost Anomaly Detection monitor."""
    ce = boto3.client('ce')

    monitor = ce.create_anomaly_monitor(
        anomalyMonitor={
            'MonitorName': 'Daily-Spend-Monitor',
            'MonitorType': 'CUSTOM',
            'MonitorSpecification': json.dumps({
                "And": [
                    {"Dimensions": {"Key": "SERVICE", "Values": ["Amazon EC2", "Amazon RDS", "Amazon S3"]}},
                    {"Tags": {"Key": "Environment", "Values": ["production"]}}
                ]
            })
        }
    )

    subscription = ce.create_anomaly_subscription(
        anomalySubscription={
            'SubscriptionName': 'FinOps-Alerts',
            'Frequency': 'DAILY',
            'ThresholdExpression': {
                "And": [
                    {"Dimensions": {"Key": "ANOMALY_TOTAL_IMPACT_ABSOLUTE", "Values": ["100"]}}
                ]
            }
        },
        monitorArnList=[monitor['anomalyMonitor']['MonitorArn']]
    )
    return monitor, subscription

def get_recent_anomalies(hours_back=48):
    """Fetch recent cost anomalies."""
    ce = boto3.client('ce')
    now = datetime.utcnow()
    start = now - timedelta(hours=hours_back)

    anomalies = ce.get_anomalies(
        dateInterval={
            'Start': start.strftime('%Y-%m-%d'),
            'End': now.strftime('%Y-%m-%d')
        },
        impactType='TOTAL_IMPACT'
    )
    return anomalies.get('anomalies', [])
```

### Step 8: Showback / Chargeback Report
```python
# showback/generate_report.py
"""Generate showback report by cost center."""
import boto3
from datetime import datetime, timedelta
from collections import defaultdict

def get_costs_by_tag(tag_key="CostCenter", days_back=30):
    """Query AWS Cost Explorer by tag for showback."""
    ce = boto3.client('ce')
    end = datetime.utcnow().date()
    start = end - timedelta(days=days_back)

    response = ce.get_cost_and_usage(
        TimePeriod={'Start': start.isoformat(), 'End': end.isoformat()},
        Granularity='DAILY',
        Metrics=['UnblendedCost'],
        GroupBy=[{'Type': 'TAG', 'Key': tag_key}]
    )

    cost_centers = defaultdict(float)
    for day in response['ResultsByTime']:
        for group in day['Groups']:
            tag_value = group['Keys'][0].split('$')[-1] if '$' in group['Keys'][0] else 'untagged'
            amount = float(group['Metrics']['UnblendedCost']['Amount'])
            cost_centers[tag_value] += amount

    print(f"{'Cost Center':<20} {'Total Cost':>12}")
    print("-" * 32)
    for cc, cost in sorted(cost_centers.items(), key=lambda x: -x[1]):
        print(f"{cc:<20} ${cost:>9.2f}")
    print("-" * 32)
    print(f"{'TOTAL':<20} ${sum(cost_centers.values()):>9.2f}")

    return cost_centers
```

### Step 9: Azure Cost Management Export
```bash
# Create Azure cost export to storage account
az costmanagement export create \
  --name "monthly-cost-export" \
  --scope "/subscriptions/$SUBSCRIPTION_ID" \
  --storage-account-id "$STORAGE_ACCOUNT_ID" \
  --storage-container "cost-exports" \
  --type "MonthlyCost" \
  --data-set "ActualCost" \
  --schedule-frequency "Monthly" \
  --schedule-recurrence-period "Monthly" \
  --schedule-status "Active"

# Query Azure cost by resource group
az consumption pricesheet show \
  --billing-period-name "$PERIOD" \
  --output table

# Azure cost by tag
az consumption usage list \
  --billing-period-name "$PERIOD" \
  --query "[].{Department: tags.Department, Cost: pretaxCost}" \
  --output table
```

### Step 10: GCP Cost Optimization with Recommender
```bash
# List recommender insights for Compute
gcloud recommender insights list \
  --insight-type=google.compute.instance.MachineTypeInsight \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --format="json"

# Apply recommender for rightsizing
gcloud recommender recommendations list \
  --recommender=google.compute.instance.MachineTypeRecommender \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --format="table(name,primaryImpact.category,recommendedProjections)"

# List committed use discounts
gcloud billing accounts committed-use-discounts list \
  --billing-account=$BILLING_ACCOUNT_ID

# GCP budget alert
gcloud billing budgets create \
  --billing-account=$BILLING_ACCOUNT_ID \
  --display-name="monthly-production" \
  --budget-amount=50000 \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.8 \
  --threshold-rule=percent=1.0 \
  --notification-channel=projects/$PROJECT_ID/notificationChannels/$CHANNEL
```

### Step 11: Kubernetes Cost Optimization
```bash
# Install Kubecost
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm upgrade --install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="token"

# Kubectl cost plugin
kubectl cost --namespace default \
  --show-usage \
  --show-allocations

# Karpenter for cost-effective node provisioning
helm upgrade --install karpenter oci://public.ecr.aws/karpenter/karpenter \
  --namespace karpenter \
  --create-namespace \
  --set "settings.interruptionQueueName=karpenter" \
  --set "nodeSelector.role=compute"

# Karpenter provisioner preferring spot
cat <<EOF | kubectl apply -f -
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
      nodeClassRef:
        name: default
  limits:
    cpu: 1000
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h
EOF
```

## FinOps Maturity Model
| Level | Name | Characteristics | Automation |
|---|---|---|---|
| 1 | Crawl | Manual cost review, no tagging | None |
| 2 | Walk | Cost allocation tags, basic budgets | Scheduled reports |
| 3 | Run | Showback/chargeback, rightsizing | Auto-scaling, reservations |
| 4 | Fly | Unit economics, anomaly detection | Auto-stop, spot by default |
| 5 | Optimize | Continuous optimization culture | Fully automated governance |

## Tool Comparison: Cloud Cost Management

| Tool | Provider | Features | Pricing | Best For |
|---|---|---|---|---|
| **AWS Cost Explorer** | AWS | CUR, budgets, anomaly detection, RI recommendations | Free | AWS-native cost analysis |
| **AWS Compute Optimizer** | AWS | Rightsizing, GPU optimization, license insights | Free | EC2/Lambda rightsizing |
| **Azure Cost Management** | Azure | Budgets, exports, advisor recommendations | Free | Azure-native cost analysis |
| **GCP Recommender** | GCP | Rightsizing, CUD recommendations, idle resources | Free | GCP-native optimization |
| **CloudHealth** | VMware | Multi-cloud, policy engine, showback | Per asset | Multi-cloud enterprises |
| **Vantage** | Third-party | Multi-cloud, HCM, anomaly alerts | Free tier + per spend | Startups to mid-market |
| **Kubecost** | Stackwatch | Kubernetes cost allocation, right-sizing | Free tier + per node | Kubernetes cost visibility |
| **Infracost** | Infracost | Terraform cost estimation in CI/CD | Free tier + team | IaC cost guardrails |

## Showback vs Chargeback Models
| Model | Description | When to Use | Implementation |
|---|---|---|---|
| **Showback** | Display costs per team/project without charging | Teams need visibility, no cross-charging required | Tag-based cost reports, dashboards |
| **Chargeback** | Bill teams for their actual cloud consumption | Budget accountability, decentralized spend control | Cost allocation tags + accounting integration |
| **Shadow IT Prevention** | Auto-approve with budget, alert on overage | Large organizations with many teams | SCP policies + budget actions |

## CI/CD Cost Guardrails with Infracost
```yaml
# .github/workflows/cost-check.yml
name: Cost Check
on: pull_request
jobs:
  cost-estimate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}
      - run: infracost breakdown --path=. --format=diff
      - name: Post comment
        uses: infracost/actions/comment@v3
        with:
          path: /tmp/infracost.json
          behavior: update
```

## Security Considerations for Cost Data
- Cost data reveals business activity patterns — restrict access to need-to-know roles
- AWS CUR data in S3 must use SSE-S3 or SSE-KMS encryption
- Budget alert webhooks can leak if not using HTTPS destinations
- Cost allocation tags containing PII (e.g., CostCenter=legal-case-123) can leak sensitive metadata
- Use least-privilege IAM for cost explorer access: `ce:GetCostAndUsage`, `ce:GetAnomalies` only
- Audit cost-related API calls with CloudTrail for unauthorized access attempts
- Mask cost data in shared dashboards by using IAM conditions on `ce:GetPreferences`

## Multi-Cloud Cost Comparison Framework
| Factor | AWS | Azure | GCP | Notes |
|---|---|---|---|---|
| Compute (4 vCPU, 16GB) | ~$140/mo (m6i.xlarge) | ~$140/mo (D4s v5) | ~$130/mo (n2-standard-4) | On-demand, us-east |
| Spot discount | 60-90% | 50-90% | 60-91% | Varies by instance/region |
| Egress (1TB/mo) | ~$90 | ~$85 | ~$80 | Internet transfer |
| Object storage (1TB) | ~$23/mo (S3 Std) | ~$20/mo (Blob Hot) | ~$20/mo (Standard) | First TB, us-east |
| K8s management | ~$73/mo (EKS) | ~$73/mo (AKS) | ~$73/mo (GKE) | Per cluster |
| Support (Developer) | ~$30/mo | Free | Free | Included in GCP/Azure |

## Production Considerations
- Enable CUR (Cost and Usage Report) in AWS on day one — backfill is not possible
- Tag all resources at creation time — retroactive tagging is painful and incomplete
- Set up anomaly detection monitors for 10%+ daily spend increases
- Review spot instance termination rates per instance family before committing
- Use spending limits for sandbox/dev accounts via AWS Budgets actions
- Automate RI/Savings Plan purchases for steady-state capacity
- Implement HCM (Hierarchical Cost Models) in Vantage or similar for multi-level allocation
- Right-size quarterly — never assume last quarter's sizing is optimal
- Enable S3 Intelligent-Tiering for unpredictable access patterns
- Monitor NAT gateway costs — they are the #1 hidden network cost
- Consolidate small workloads into fewer instances to reduce licensing costs

## Anti-Patterns

### Anti-Pattern 1: No Cost Visibility
Not knowing what you spend. Activate cost allocation tags and set up cost and usage reports on day one.

### Anti-Pattern 2: Over-Provisioning
Buying the largest instance type "just in case". Start small, monitor utilization, scale up based on data.

### Anti-Pattern 3: Orphaned Resources
Unused EBS volumes, EIPs, load balancers accumulate costs. Automate cleanup of unattached resources.

### Anti-Pattern 4: Ignoring Data Transfer Costs
Data transfer between regions and to internet can exceed compute costs. Design for data locality; use CDN.

### Anti-Pattern 5: On-Demand Everything
Running everything on-demand without reservations. Purchase RIs/Savings Plans for baseline capacity (30-60% discount).

### Anti-Pattern 6: Tag Hoarding
Creating hundreds of tag keys without a governance model. Stick to 5-10 standard tag keys with documented values.

### Anti-Pattern 7: Premature Rightsizing
Downgrading instances before verifying performance impact. Always rightsize during low-traffic windows with rollback plan.

### Anti-Pattern 8: Ignoring Kubernetes Overhead
Running 20 microservices on 20 separate pods each with 1 CPU request. Consolidate and right-size resource requests/limits.

## Rules & Constraints
- Tag all resources with Environment, Project, CostCenter, Owner.
- Set budget alerts at 50%, 80%, 100%, 150% for every project.
- Use spot/preemptible for stateless/fault-tolerant workloads.
- Enable lifecycle policies for all object storage.
- Review unused resources monthly; automate cleanup where possible.
- Right-size instances quarterly using Cloud Health/Compute Optimizer.
- Purchase reservations for >70% utilized baseline capacity.
- Cost allocation tags must be enforced via SCP/policy at account creation.
- Never deploy untagged resources to production (CI/CD gate).
- CloudTrail must be enabled on all accounts for cost anomaly forensics.
- Review and reconcile CUR data monthly for billing accuracy.

## References
  - references/cloud-cost-optimization-advanced.md
  - references/cloud-cost-optimization-finops.md
  - references/cloud-cost-optimization-fundamentals.md
  - references/cloud-cost-visibility-allocation.md
  - references/compute-optimization.md
  - references/cost-allocation.md
  - references/cost-optimization.md
  - references/storage-network-optimization.md
  - references/anomaly-detection-guide.md

## Handoff
Next: **finops** — FinOps maturity and governance.
