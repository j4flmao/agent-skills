# Cloud Cost Allocation

## Tagging Strategy

### Mandatory Tags

| Tag Key | Example Values | Purpose |
|---------|---------------|---------|
| `cost-center` | `eng-data`, `eng-ml`, `fin-analytics` | Cost attribution |
| `environment` | `dev`, `staging`, `prod` | Environment isolation |
| `owner` | `team-data`, `team-ml` | Resource ownership |
| `project` | `etl-pipeline`, `ml-training` | Project tracking |
| `created-by` | `terraform`, `manual` | Provisioning method |

### Enforcement
Block resource creation without mandatory tags using IaC (Terraform, CloudFormation) policies. Tag on creation — retroactive tagging is unreliable for historical cost.

## Cost Center Structure

### Single Account
Tags only. Best for small teams (< 50 people). Simple but limited granularity.

### Multi-Account
Separate accounts per cost center. Easier isolation and budgeting. Best for enterprises.

```
AWS Organization
├── Data Platform (account)
├── ML Platform (account)
├── Analytics (account)
├── Production (account)
├── Staging (account)
└── Development (account)
```

### Chargeback vs Showback
- **Showback**: Report costs per team without charging. Less friction, drives awareness.
- **Chargeback**: Deduct from team budget. Stronger accountability, more overhead.

## Budget Alerts

### Budget Structure
```yaml
budgets:
  - name: "data-platform-monthly"
    amount: 50000
    type: COST
    time_unit: MONTHLY
    alerts:
      - threshold: 50%  # Warning
        email: team-data@company.com
      - threshold: 80%  # Warning
        email: team-data@company.com
      - threshold: 90%  # Critical
        email: team-data@company.com
        webhook: https://hooks.slack.com/...
      - threshold: 100% # Hard limit
        email: team-data@company.com
        action: disable_noncritical_resources
```

### Anomaly Detection

```python
# AWS Cost Anomaly Detection
{
  "monitor_name": "data-weekly-spend",
  "monitor_type": "CUSTOM",
  "monitor_spec": {
    "metric": "AWS_EC2_SPEND",
    "evaluator": "PERIODIC",
    "threshold_expression": "(actual - expected) / expected > 0.2",
    "frequency": "DAILY"
  },
  "subscribers": ["team-data@company.com"]
}
```

### Multi-Account Budgets
Use AWS Organizations consolidated billing. Set budgets per linked account and overall. Aggregate alerts for organization-wide view.

## Resource Type Cost Breakdown

| Resource Type | Typical Cost Share | Optimization Potential |
|--------------|-------------------|----------------------|
| Compute (EC2, EKS) | 50-60% | High (spot, right-size) |
| Storage (S3, EBS) | 15-25% | Medium (lifecycle, tiers) |
| Data Transfer | 5-10% | Medium (CloudFront, Direct Connect) |
| Database (RDS, DynamoDB) | 10-15% | Medium (reserved, serverless) |
| Networking (NAT, ELB) | 3-5% | Low |

## Reporting

Generate weekly and monthly cost reports. Include:
- Spend by cost center and environment
- Top 10 most expensive resources
- Week-over-week spend change
- Anomalies detected
- Waste identified with estimated savings

Distribute to cost center owners. Review in weekly FinOps sync.

## Automation

- Auto-stop non-production resources on weekends
- Downsize underutilized instances automatically (with notification)
- Delete orphaned resources (ELBs, EBS, snapshots)
- Enforce tag compliance with auto-remediation
- Schedule right-sizing recommendations
