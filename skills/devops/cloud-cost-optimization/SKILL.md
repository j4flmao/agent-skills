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
| Network | CDN + compression | 20-60% | Medium |
| Network | Data transfer optimization | 10-40% | Medium |
| Database | Right-size + reserved | 30-60% | Low |
| Database | Serverless (Aurora/Cosmos) | 20-50% | Medium |
| Overall | Tagging + governance | Prevent waste | Low |

### Reserved Instance / Savings Plan Comparison
| Purchase Option | Discount | Commitment | Flexibility | Best For |
|---|---|---|---|---|
| AWS Savings Plan | 30-72% | 1 or 3 years | High (any compute) | Predictable compute |
| AWS Reserved Instances | 30-75% | 1 or 3 years | Low (specific instance) | Known instance types |
| Azure Reservations | 20-60% | 1 or 3 years | Low (specific VM size) | Stable VMs |
| Azure Savings Plan | 20-55% | 1 or 3 years | High (any compute) | Mixed compute |
| GCP CUD | 20-70% | 1 or 3 years | Resource-specific | Known consumption |

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

### Storage Tier Decision
| Access Pattern | AWS | Azure | GCP | Cost/GB |
|---|---|---|---|---|
| Daily | S3 Standard | Blob Hot | Standard | ~$0.023 |
| Weekly | S3 IA | Blob Cool | Nearline | ~$0.0125 |
| Monthly | Glacier IR | Blob Cold | Coldline | ~$0.0045 |
| Quarterly | Glacier | Archive | Archive | ~$0.001 |
| Yearly+ | DEEP Archive | Cool (blob) | Archive | ~$0.0005 |

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

## FinOps Maturity Model
| Level | Name | Characteristics | Automation |
|---|---|---|---|
| 1 | Crawl | Manual cost review, no tagging | None |
| 2 | Walk | Cost allocation tags, basic budgets | Scheduled reports |
| 3 | Run | Showback/chargeback, rightsizing | Auto-scaling, reservations |
| 4 | Fly | Unit economics, anomaly detection | Auto-stop, spot by default |
| 5 | Optimize | Continuous optimization culture | Fully automated governance |

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

## Rules & Constraints
- Tag all resources with Environment, Project, CostCenter, Owner.
- Set budget alerts at 50%, 80%, 100%, 150% for every project.
- Use spot/preemptible for stateless/fault-tolerant workloads.
- Enable lifecycle policies for all object storage.
- Review unused resources monthly; automate cleanup where possible.
- Right-size instances quarterly using Cloud Health/Compute Optimizer.
- Purchase reservations for >70% utilized baseline capacity.

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
