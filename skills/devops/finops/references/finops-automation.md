# FinOps Automation

## Automated Cost Remediation

```python
# Automated stop of non-production instances after hours
import boto3
from datetime import datetime, time

def stop_non_production_instances():
    ec2 = boto3.client('ec2')
    now = datetime.now()

    # Skip weekends
    if now.weekday() >= 5:
        return

    # Only run after 8 PM
    if now.time() < time(20, 0):
        return

    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:Environment', 'Values': ['dev', 'staging']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )

    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            if instance.get('State', {}).get('Name') == 'running':
                ec2.stop_instances(InstanceIds=[instance['InstanceId']])
                print(f"Stopped {instance['InstanceId']} ({instance['InstanceType']})")

# Cron: 0 20 * * 1-5
```

## Scheduled Scaling Automation

```yaml
# K8s cluster scaling schedule
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cron-scale-down
spec:
  triggers:
  - type: cron
    metadata:
      timezone: Asia/Ho_Chi_Minh
      start: 0 22 * * *   # Scale down at 10 PM
      end: 0 6 * * *      # Scale up at 6 AM
      desiredReplicas: "1"
```

## Tag Enforcement as Code

```rego
# OPA policy — require cost tags on all resources
package terraform

deny[msg] {
  resource := input.resource_changes[_]
  resource.type in [
    "aws_instance", "aws_lb", "aws_s3_bucket",
    "aws_rds_cluster", "aws_eks_cluster"
  ]
  not resource.change.after.tags.team
  msg := sprintf("%v %v missing tag: team", [resource.type, resource.address])
}

deny[msg] {
  resource := input.resource_changes[_]
  not resource.change.after.tags.cost_center
  msg := sprintf("%v %v missing tag: cost_center", [resource.type, resource.address])
}
```

## Budget Alert Automation

```yaml
# AWS Budget with automated action
Budgets:
  - name: monthly-infra
    limit: 50000
    actions:
      - threshold: 80%  # Warning at 80%
        action: SNS notification to Slack
      - threshold: 100%  # Alert at 100%
        action: SNS to PagerDuty
      - threshold: 120%  # Critical at 120%
        action: |
          - SNS to PagerDuty
          - Disable non-critical feature flags
          - Reduce auto-scaling max limits
```

## Cost Dashboard Automation

```json
{
  "dashboard": {
    "panels": [
      {
        "title": "Cost by Team",
        "query": "aws:CostExplorer:Daily",
        "group_by": "tag:team",
        "type": "bar"
      },
      {
        "title": "Waste Detection",
        "query": "aws:Resource:Unused",
        "type": "table",
        "columns": ["resource_id", "type", "monthly_cost", "days_idle"]
      },
      {
        "title": "Unit Economics",
        "query": "aws:CostExplorer:Monthly",
        "expressions": ["cost / transactions"],
        "type": "timeseries"
      }
    ]
  }
}
```

## Discount Automation

| Strategy | Automation | Savings |
|----------|------------|---------|
| RI purchase | Auto-purchase when utilization > 80% | 30-40% |
| Savings plan | Auto-opt for 1-year commitment | 20-30% |
| Spot fallback | Auto-switch to spot when available | 50-70% |
| Instance family switch | Auto-migrate to newer/lower-cost gen | 10-20% |
| Commit to use | Auto-commit based on 90th percentile | 15-25% |
