# Cloud Cost Visibility and Allocation

## Overview

Cost visibility and allocation form the foundation of any FinOps practice. Without accurate visibility into who is spending what on which services, optimization efforts cannot be targeted or measured. This reference covers cost visibility architecture, tagging strategies, allocation methodologies, dashboard design, and reporting automation across AWS, Azure, and GCP.

## Cost Visibility Architecture

### Data Sources

Understanding where cost data originates is critical for building accurate visibility.

```
    Cloud Providers                    Aggregation                    Consumption
+--------------------+          +--------------------+          +--------------------+
| AWS Cost & Usage   |          | Cost Management    |          | Engineering teams  |
| Report (CUR)       | -------> | Platform           | -------> | (dashboards)       |
| Azure Cost Details |          | (custom or vendor) |          | Finance (reports)  |
| GCP Billing Export |          |                    |          | Management (KPIs)  |
+--------------------+          +--------------------+          +--------------------+
          |                              |                              |
          v                              v                              v
  Raw billing data              Allocation + tagging            Actionable insights
  (hourly/daily)                (normalized)                    (decisions)
```

### Data Pipeline Architecture

```
[Cloud Provider]
    |
    | CUR / Billing Export (hourly)
    v
[S3 / BigQuery / Azure Storage]
    |
    | Cloud Function / Lambda (daily ETL)
    v
[Data Warehouse / Database]
    |
    | Query + API
    v
[Dashboard Layer]
    |-- Grafana
    |-- Tableau
    |-- Custom Dashboard
    |-- Cloud Native (Cost Explorer)
```

### AWS Cost and Usage Report (CUR)

```yaml
# CUR configuration
cur:
  report_name: "hourly-cost-report"
  compression: "GZIP"
  format: "Parquet"  # or CSV
  refresh_frequency: "HOURLY"
  include_resources: true
  include_split_cost:
    - "compute_savings_plan"
    - "reserved_instance"
  time_granularity: "HOURLY"
  s3_bucket: "my-cost-cur-bucket"
  s3_prefix: "cur/hourly/"

  # Key columns for allocation
  columns:
    - "line_item_type"
    - "line_item_usage_account_id"
    - "line_item_usage_start_date"
    - "product_service_name"
    - "line_item_resource_id"
    - "line_item_unblended_cost"
    - "line_item_blended_cost"
    - "line_item_usage_amount"
    - "savings_plan_savings_plan_effective_cost"
    - "resource_tags_user_cost_center"
    - "resource_tags_user_environment"
    - "resource_tags_user_team"
    - "resource_tags_user_project"
```

### Azure Cost Details

```yaml
# Azure cost data export
azure_cost:
  export_name: "daily-cost-export"
  type: "ActualCost"
  frequency: "Daily"
  dataset_configuration:
    granularity: "Daily"
    grouping:
      - type: "Tag"
        name: "costCenter"
      - type: "Tag"
        name: "environment"
      - type: "Tag"
        name: "team"
    inclusion: "AllTags"
  storage_account: "costexportsa"
  container: "costdata"
  directory: "azure/"
```

### GCP Billing Export

```yaml
# GCP billing export to BigQuery
gcp_cost:
  project_id: "cost-management-project"
  dataset_id: "billing_data"
  table_prefix: "gcp_billing_export"

  schema:
    - invoice.month
    - service.description
    - sku.description
    - usage_start_time
    - usage_end_time
    - project.id
    - project.name
    - project.labels.key
    - project.labels.value
    - cost
    - currency
    - credits
    - adjustment_info
```

## Tagging Strategy

### Mandatory Tags

```yaml
# Tagging taxonomy
tags:
  mandatory:
    - key: "cost-center"
      description: "Business unit or team responsible"
      values:
        - "platform"
        - "data"
        - "ml"
        - "security"
        - "product-a"
        - "product-b"
      enforcement: "CI/CD block on missing"
      propagation: "resource group -> child resources"

    - key: "environment"
      description: "Deployment stage"
      values:
        - "production"
        - "staging"
        - "development"
        - "testing"
        - "dr"
      enforcement: "CI/CD block on missing"

    - key: "owner"
      description: "Team or individual responsible"
      values:
        - "team-platform"
        - "team-backend"
        - "team-frontend"
        - "team-data"
      enforcement: "Auto-tag from creator metadata"

    - key: "project"
      description: "Specific project or initiative"
      values:
        - "migration-2025"
        - "feature-x"
        - "compliance-upgrade"
      enforcement: "CI/CD warn on missing"

  optional:
    - key: "application"
      description: "Microservice or application name"

    - key: "terraform"
      description: "Managed by Terraform"
      values:
        - "true"

    - key: "auto-stop"
      description: "Auto-stop non-production after hours"
      values:
        - "true"
        - "false"

    - key: "auto-delete"
      description: "Auto-delete after N days"
      values:
        - "30d"
        - "90d"
        - "never"
```

### Tag Propagation

```yaml
# Tag propagation rules
propagation:
  aws:
    - source: "auto-scaling-group"
      inherit: ["environment", "cost-center", "owner"]
      target: "ec2-instance"
      method: "configuration"  # ASG tag propagation

    - source: "cloudformation-stack"
      inherit: ["project", "environment"]
      target: "stack-resources"
      method: "stack-level-tag"

    - source: "resource-group"
      inherit: ["cost-center", "owner"]
      target: "group-members"
      method: "resource-group-tagging-api"

  azure:
    - source: "resource-group"
      inherit: ["costCenter", "environment", "team"]
      target: "rg-resources"
      method: "azure-policy-append-tag"

    - source: "management-group"
      inherit: ["costCenter"]
      target: "subscription-resources"
      method: "azure-policy-inherit-tag"

  gcp:
    - source: "project"
      inherit: ["cost-center", "environment"]
      target: "all-resources"
      method: "project-labels"

    - source: "folder"
      inherit: ["cost-center"]
      target: "project-resources"
      method: "folder-label-inheritance"
```

### Tagging Enforcement

```yaml
# Terraform tag enforcement
terraform:
  # Provider-level default tags
  provider:
    aws:
      default_tags:
        tags:
          cost-center = var.cost_center
          environment = var.environment
          owner       = var.owner
          terraform   = "true"

  # Sentinel policy for tag compliance
  sentinel_policy:
    rule "require_mandatory_tags" {
      condition = all resources as _, resource {
        all keys(mandatory_tags) as tag_key {
          resource.tags contains tag_key and
          resource.tags[tag_key] != ""
        }
      }
    }
```

```yaml
# CI/CD tag compliance check
tag_check:
  pre_deploy:
    - scan:
        provider: "aws"
        region: "us-east-1"
        check: "all_resources_have_mandatory_tags"
        missing_action: "block"
        notification: "slack:#tag-compliance"
    - scan:
        provider: "azure"
        subscription: "production"
        check: "tags_defined"
        missing_action: "block"
    - scan:
        provider: "gcp"
        project: "production"
        check: "labels_defined"
        missing_action: "block"
```

## Cost Allocation Models

### Direct Allocation

Resources fully attributable to a single cost center. Simplest model.

```
[EC2 instance]
    |-- tag: cost-center = platform
    |-- tag: project = api-service
    |-> 100% to platform cost center
```

### Proportional Allocation

Shared resources split across consumers.

```
[Shared RDS instance]
    |-- consumes:
    |   |-- service-a: 60%
    |   |-- service-b: 30%
    |   |-- service-c: 10%
    |-> allocation proportional to usage
```

### Hierarchical Allocation

Costs flow down from parent to child entities.

```
[Organization]
    |-- Engineering ($500k)
    |   |-- Platform ($200k)
    |   |   |-- Compute ($120k)
    |   |   |-- Storage ($50k)
    |   |   |-- Network ($30k)
    |   |-- Data ($150k)
    |   |-- ML ($100k)
    |   |-- Security ($50k)
    |-- Product ($300k)
    |   |-- Product A ($180k)
    |   |-- Product B ($120k)
```

### Hybrid Allocation

Combination of direct, proportional, and hierarchical.

```yaml
# Hybrid allocation rules
allocation:
  method: "hybrid"

  direct:
    - resource_type: "ec2"
      basis: "resource_tags"
    - resource_type: "rds"
      basis: "resource_tags"
    - resource_type: "lambda"
      basis: "resource_tags"

  proportional:
    - resource_type: "nat-gateway"
      basis: "traffic_per_resource"
      allocation_period: "monthly"
    - resource_type: "transit-gateway"
      basis: "attachment_usage"
      allocation_period: "monthly"
    - resource_type: "shared-cluster"
      basis: "namespace_usage"
      allocation_period: "daily"

  hierarchical:
    - source: "organization"
      target: "business_units"
      allocation_basis: "headcount"
    - source: "business_unit"
      target: "teams"
      allocation_basis: "resource_usage"

  discounts:
    - type: "reserved_instance"
      allocation: "proportional_to_usage"
    - type: "savings_plan"
      allocation: "proportional_to_usage"
    - type: "volume_discount"
      allocation: "proportional_to_usage"
```

## Cost Dashboard Design

### Executive Dashboard

```yaml
# Executive summary dashboard
dashboard:
  name: "Cloud Cost Executive Summary"
  refresh: "daily"

  metrics:
    - name: "Total Month-to-Date Spend"
      type: "number"
      source: "cur_aggregate"
      format: "currency"
      comparison: "vs_budget"

    - name: "Month-over-Month Change"
      type: "percent"
      source: "cur_trend"
      format: "percent_with_arrow"
      comparison: "vs_previous_month"

    - name: "Year-over-Year Spend"
      type: "number"
      source: "cur_yoy"
      format: "currency"
      comparison: "vs_same_month_last_year"

    - name: "Budget Utilization"
      type: "gauge"
      source: "budget_tracking"
      format: "percent"
      thresholds:
        - value: 50
          color: "green"
        - value: 80
          color: "yellow"
        - value: 100
          color: "red"

  charts:
    - name: "Spend by Service (Top 10)"
      type: "bar"
      source: "cur_by_service"
      grouping: "service"
      limit: 10

    - name: "Spend by Cost Center"
      type: "pie"
      source: "cur_by_cost_center"
      grouping: "cost_center"

    - name: "Daily Spend Trend"
      type: "line"
      source: "cur_daily_trend"
      x_axis: "date"
      y_axis: "cost"
      compare: "budget_daily"

    - name: "Monthly Savings"
      type: "area"
      source: "savings_tracker"
      series:
        - "spot_savings"
        - "ri_savings"
        - "rightsizing_savings"
```

### Team Dashboard

```yaml
# Team-level cost dashboard
dashboard:
  name: "Team Cost Dashboard"
  scope: "cost_center:platform"
  refresh: "hourly"

  metrics:
    - name: "Team Spend Today"
      type: "number"
      source: "cur_team_daily"
      format: "currency"

    - name: "Team Spend This Month"
      type: "number"
      source: "cur_team_monthly"
      format: "currency"
      comparison: "vs_monthly_budget"

    - name: "Cost per Request"
      type: "number"
      source: "unit_cost_per_request"
      format: "currency"

  charts:
    - name: "Spend by Environment"
      type: "stacked_bar"
      source: "cur_by_env"
      grouping: "environment"
      stack: "service"

    - name: "Top Resources by Cost"
      type: "table"
      source: "cur_by_resource"
      columns:
        - "resource_id"
        - "service"
        - "cost"
        - "trend"

    - name: "Cost per Deployment"
      type: "timeseries"
      source: "unit_cost_per_deploy"

    - name: "Anomaly Timeline"
      type: "event_chart"
      source: "anomaly_events"
```

### Service Dashboard

```yaml
# Service-level cost dashboard
dashboard:
  name: "EC2 Cost Analysis"
  scope: "service:ec2"
  refresh: "hourly"

  metrics:
    - name: "EC2 Monthly Cost"
      type: "number"
      source: "cur_ec2_monthly"
      format: "currency"
      comparison: "vs_budget"

    - name: "Running Instances"
      type: "number"
      source: "ec2_running_count"

    - name: "Spot Coverage"
      type: "percent"
      source: "ec2_spot_percent"

    - name: "RI Coverage"
      type: "percent"
      source: "ec2_ri_coverage"

  charts:
    - name: "Cost by Instance Family"
      type: "bar"
      source: "cur_ec2_by_type"

    - name: "Instance Utilization Heatmap"
      type: "heatmap"
      source: "ec2_utilization"
      x_axis: "instance"
      y_axis: "metric"
      metrics:
        - "cpu_avg"
        - "memory_avg"
        - "network_in"
        - "network_out"

    - name: "Right-Sizing Recommendations"
      type: "table"
      source: "compute_optimizer_recommendations"
      columns:
        - "instance_id"
        - "current_type"
        - "recommended_type"
        - "estimated_savings"
        - "risk"
        - "action"
```

## Cost Allocation Reporting

### Monthly Allocation Report

```yaml
# Monthly cost allocation report
report:
  period: "2025-01"
  generated: "2025-02-01"
  method: "hybrid_allocation"

  summary:
    total_spend: "$1,250,000"
    budget: "$1,200,000"
    variance: "+$50,000 (4.2%)"
    savings_ytd: "$180,000"

  allocation_by_cost_center:
    - cost_center: "platform"
      direct: "$350,000"
      shared: "$50,000"
      total: "$400,000"
      budget: "$380,000"
      variance: "+$20,000 (5.3%)"
      teams:
        - name: "compute"
          cost: "$200,000"
        - name: "storage"
          cost: "$80,000"
        - name: "network"
          cost: "$60,000"
        - name: "database"
          cost: "$60,000"

    - cost_center: "data"
      direct: "$280,000"
      shared: "$40,000"
      total: "$320,000"
      budget: "$300,000"
      variance: "+$20,000 (6.7%)"

    - cost_center: "ml"
      direct: "$180,000"
      shared: "$30,000"
      total: "$210,000"
      budget: "$200,000"
      variance: "+$10,000 (5.0%)"

    - cost_center: "product-a"
      direct: "$200,000"
      shared: "$20,000"
      total: "$220,000"
      budget: "$220,000"
      variance: "$0 (0.0%)"

  shared_cost_allocation:
    - resource: "transit-gateway"
      total: "$15,000"
      allocation:
        - cost_center: "platform"
          amount: "$6,000"
          basis: "40% attachment usage"
        - cost_center: "data"
          amount: "$4,500"
          basis: "30% attachment usage"
        - cost_center: "ml"
          amount: "$3,000"
          basis: "20% attachment usage"
        - cost_center: "product-a"
          amount: "$1,500"
          basis: "10% attachment usage"

    - resource: "shared-monitoring"
      total: "$10,000"
      allocation:
        - cost_center: "platform"
          amount: "$4,000"
          basis: "40% workload count"
        - cost_center: "data"
          amount: "$3,000"
          basis: "30% workload count"
        - cost_center: "ml"
          amount: "$2,000"
          basis: "20% workload count"
        - cost_center: "product-a"
          amount: "$1,000"
          basis: "10% workload count"
```

## Anomaly Detection and Alerting

### Detection Rules

```yaml
# Anomaly detection configuration
anomaly_detection:
  daily_check:
    enabled: true
    description: "Daily spend anomaly by cost center"
    query: |
      SELECT cost_center, SUM(cost) as daily_total
      FROM cur_hourly
      WHERE date = CURRENT_DATE
      GROUP BY cost_center
    comparison: "trailing_7_day_avg"
    threshold_percent: 20
    cooldown_hours: 24
    notification:
      channels:
        - "slack:#finops-alerts"
        - "email:finops-team@company.com"
      template: |
        Anomaly detected: {cost_center} spend {actual} vs avg {expected}
        Difference: {percent}% above threshold of {threshold}%

  weekly_check:
    enabled: true
    description: "Week over week spend comparison"
    query: |
      SELECT cost_center, SUM(cost) as weekly_total
      FROM cur_hourly
      WHERE week = CURRENT_WEEK
      GROUP BY cost_center
    comparison: "previous_week"
    threshold_percent: 30
    notification:
      channels:
        - "slack:#finops-alerts"

  service_level:
    enabled: true
    description: "Service-level spend anomaly"
    query: |
      SELECT service, cost_center, SUM(cost) as service_daily
      FROM cur_hourly
      WHERE date = CURRENT_DATE
      GROUP BY service, cost_center
    comparison: "budget_proportional"
    threshold_expression: "daily_spend > (monthly_budget / 30 * 2)"
    notification:
      channels:
        - "slack:#finops-alerts"
        - "email:{cost_center_owner}"

  new_resource_type:
    enabled: true
    description: "Detect new resource types"
    query: |
      SELECT DISTINCT product_service_name
      FROM cur_hourly
      WHERE date = CURRENT_DATE
    comparison: "known_services_list"
    threshold: "any_new_service"
    notification:
      channels:
        - "email:cloud-team@company.com"

  untagged_resource:
    enabled: true
    description: "Detect resources without mandatory tags"
    query: |
      SELECT resource_id, product_service_name, cost
      FROM cur_hourly
      WHERE tags_cost_center IS NULL
        OR tags_environment IS NULL
        OR tags_owner IS NULL
    notification:
      channels:
        - "slack:#finops-untagged"
      aggregation: "daily_summary"
```

### Alert Routing

```yaml
# Alert routing configuration
alert_routing:
  critical:
    conditions:
      - anomaly_severity: "critical"
      - budget_exhausted: true
      - spend_doubled: true
    channels:
      - "pagerduty:finops-critical"
      - "slack:#finops-critical"
      - "email:cto@company.com"
    response_sla: "1 hour"

  warning:
    conditions:
      - anomaly_severity: "warning"
      - budget_at_80_percent: true
      - ri_coverage_below_50: true
    channels:
      - "slack:#finops-alerts"
      - "email:finops-team@company.com"
    response_sla: "4 hours"

  info:
    conditions:
      - anomaly_severity: "info"
      - budget_at_50_percent: true
      - new_service_detected: true
    channels:
      - "slack:#finops-alerts"
    response_sla: "24 hours"
```

## Cost Visibility Automation

### Automated Report Generation

```python
# Automated cost report generation
import boto3
import pandas as pd
from datetime import datetime, timedelta

def generate_daily_cost_report():
    """
    Generate and distribute daily cost report by cost center
    """
    cur_client = boto3.client('ce')

    # Get yesterday's cost by cost center tag
    response = cur_client.get_cost_and_usage(
        TimePeriod={
            'Start': (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d'),
            'End': datetime.now().strftime('%Y-%m-%d')
        },
        Granularity='DAILY',
        Metrics=['UnblendedCost'],
        GroupBy=[
            {'Type': 'TAG', 'Key': 'cost-center'}
        ]
    )

    # Transform to DataFrame
    data = []
    for group in response['ResultsByTime'][0]['Groups']:
        data.append({
            'cost_center': group['Keys'][0].split(':')[-1],
            'cost': float(group['Metrics']['UnblendedCost']['Amount']),
            'currency': group['Metrics']['UnblendedCost']['Unit']
        })

    df = pd.DataFrame(data)

    # Add budget comparison
    budgets = get_cost_center_budgets()
    df['budget'] = df['cost_center'].map(budgets)
    df['budget_utilization'] = (df['cost'] / df['budget'] * 100).round(1)

    # Sort by cost descending
    df = df.sort_values('cost', ascending=False)

    # Generate report
    report = {
        'date': datetime.now().strftime('%Y-%m-%d'),
        'total_cost': df['cost'].sum(),
        'total_budget': df['budget'].sum(),
        'cost_centers': df.to_dict('records')
    }

    # Send to Slack
    send_slack_notification(report)

    # Send to email
    send_email_report(report)

    return report


def send_slack_notification(report):
    """
    Send cost report to Slack
    """
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"Daily Cost Report - {report['date']}"
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Total Spend:* ${report['total_cost']:,.2f}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Total Budget:* ${report['total_budget']:,.2f}"
                }
            ]
        },
        {
            "type": "divider"
        }
    ]

    for cc in report['cost_centers'][:10]:
        blocks.append({
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*{cc['cost_center']}*"},
                {"type": "mrkdwn", "text": f"${cc['cost']:,.2f} ({cc['budget_utilization']}%)"}
            ]
        })

    # Send to Slack webhook
    import requests
    requests.post(SLACK_WEBHOOK_URL, json={"blocks": blocks})
```

### Automated Untagged Resource Detection

```python
# Automated untagged resource scan
def scan_untagged_resources(provider, region):
    untagged_resources = []

    if provider == 'aws':
        ec2 = boto3.client('ec2', region_name=region)
        rds = boto3.client('rds', region_name=region)
        elb = boto3.client('elbv2', region_name=region)

        # Check EC2 instances
        instances = ec2.describe_instances()
        for reservation in instances['Reservations']:
            for instance in reservation['Instances']:
                tags = {t['Key']: t['Value'] for t in instance.get('Tags', [])}
                missing = [t for t in MANDATORY_TAGS if t not in tags]
                if missing:
                    untagged_resources.append({
                        'resource_id': instance['InstanceId'],
                        'service': 'EC2',
                        'missing_tags': missing,
                        'launch_time': str(instance['LaunchTime']),
                        'state': instance['State']['Name']
                    })

        # Check RDS instances
        db_instances = rds.describe_db_instances()
        for db in db_instances['DBInstances']:
            tags = {t['Key']: t['Value'] for t in db.get('TagList', [])}
            missing = [t for t in MANDATORY_TAGS if t not in tags]
            if missing:
                untagged_resources.append({
                    'resource_id': db['DBInstanceIdentifier'],
                    'service': 'RDS',
                    'missing_tags': missing,
                    'engine': db['Engine']
                })

    elif provider == 'azure':
        # Azure resource scan
        from azure.identity import DefaultAzureCredential
        from azure.mgmt.resource import ResourceManagementClient

        credential = DefaultAzureCredential()
        client = ResourceManagementClient(credential, SUBSCRIPTION_ID)

        resources = client.resources.list()
        for resource in resources:
            tags = resource.tags or {}
            missing = [t for t in MANDATORY_TAGS if t not in tags]
            if missing:
                untagged_resources.append({
                    'resource_id': resource.id,
                    'service': resource.type,
                    'missing_tags': missing
                })

    return untagged_resources
```

## Key Points

- Cost visibility requires hourly billing data from cloud providers (CUR, Cost Details, Billing Export)
- Tagging strategy with 5-7 mandatory tags is foundational for cost allocation
- Tag propagation from resource groups to children is essential for coverage
- Direct allocation is simplest; proportional and hierarchical handle shared resources
- Discount allocation (RI/SP savings) must be proportionally distributed to consuming teams
- Dashboards should serve three audiences: executive (summary), team (actionable), service (detailed)
- Anomaly detection at daily, weekly, and service levels with appropriate routing
- Automated reports reduce manual effort and ensure consistent visibility
- Untagged resource detection must be automated and reported to owners
- Cost allocation methodology should be reviewed and adjusted quarterly
- Unit economics bridges cost visibility to business value
- Showback reports educate teams; chargeback drives accountability
- Tagging compliance enforcement in CI/CD prevents tag drift
- Regular (weekly/monthly) cost reviews maintain momentum and accountability
- Cost visibility is a continuous process, not a one-time setup
