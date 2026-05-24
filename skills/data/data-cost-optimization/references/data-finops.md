# Data FinOps Reference

## Resource Scheduling

### Auto-Suspend Configuration

```sql
-- Snowflake: Auto-suspend idle warehouses
CREATE WAREHOUSE prod_wh
    WAREHOUSE_SIZE = 'MEDIUM'
    AUTO_SUSPEND = 60            -- Suspend after 60 seconds idle
    AUTO_RESUME = TRUE
    MIN_CLUSTER_COUNT = 1
    MAX_CLUSTER_COUNT = 3
    SCALING_POLICY = 'ECONOMY';

-- For development workloads
CREATE WAREHOUSE dev_wh
    WAREHOUSE_SIZE = 'XSMALL'
    AUTO_SUSPEND = 300           -- 5 min for dev
    AUTO_RESUME = TRUE
    MIN_CLUSTER_COUNT = 1
    MAX_CLUSTER_COUNT = 1;

-- For batch workloads (run at specific times)
CREATE WAREHOUSE batch_wh
    WAREHOUSE_SIZE = 'LARGE'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE
    MIN_CLUSTER_COUNT = 3
    MAX_CLUSTER_COUNT = 10
    SCALING_POLICY = 'ECONOMY';
```

### Scheduled Warehouse Management

```sql
-- Using Snowflake tasks to manage warehouses by time
CREATE TASK suspend_dev_wh
    SCHEDULE = 'USING CRON 0 20 * * 1-5'
    AS
    ALTER WAREHOUSE dev_wh SUSPEND;

CREATE TASK resume_dev_wh
    SCHEDULE = 'USING CRON 0 8 * * 1-5'
    AS
    ALTER WAREHOUSE dev_wh RESUME;

-- BigQuery: slot scheduling is always-on
-- Use reservations with autoscaling instead
CREATE RESERVATION `my-project.US.prod-reservation`
    SLOT_CAPACITY = 0
    AUTOSCALE_MAX_SLOTS = 200;
```

### Serverless Compute

```yaml
# BigQuery: use serverless slots instead of reservations
# Pay only for queries executed
jobs:
  - type: QUERY
    project: my-project
    default_priority: INTERACTIVE  # Pay per TB scanned

  - type: QUERY
    project: my-project
    default_priority: BATCH       # Lower priority, cheaper
    batch_timeout: 6h

# Use batch priority for:
# - ETL and data pipeline queries
# - Backfill operations
# - Large reporting queries
# - ML training data preparation
```

## Storage Tiering Automation

### Automated Lifecycle Policies

```yaml
# AWS S3 lifecycle rules
LifecycleConfiguration:
  Rules:
    - Id: data-lake-tiering
      Status: Enabled
      Filter:
        Prefix: data/landing/
      Transitions:
        - Days: 30
          StorageClass: STANDARD_IA
          # 30-90 days: infrequent access
        - Days: 90
          StorageClass: GLACIER_INSTANT_RETRIEVAL
          # 90-365 days: cold but instant retrieval
        - Days: 365
          StorageClass: GLACIER_DEEP_ARCHIVE
          # 1 year+: archival, 12h retrieval
      Expiration:
        Days: 2555  # 7-year retention
```

### Storage Class Cost Comparison

| Class | Cost/GB/month | Retrieval | Min Duration | Min Size |
|-------|--------------|-----------|-------------|----------|
| S3 Standard | $0.023 | Instant | N/A | N/A |
| S3 Intelligent-Tiering | $0.023 + $0.0025 | Instant | N/A | N/A |
| S3 Standard-IA | $0.0125 | Instant | 30 days | 128 KB |
| S3 One Zone-IA | $0.01 | Instant | 30 days | 128 KB |
| Glacier Instant Retrieval | $0.004 | 1ms-5min | 90 days | 128 KB |
| Glacier Flexible | $0.0036 | 1-5 min | 90 days | 128 KB |
| Glacier Deep Archive | $0.00099 | 12 hours | 180 days | 128 KB |

### Automated Tiering Script

```python
import boto3
from datetime import datetime, timedelta

def apply_storage_tiering(bucket: str, prefix: str, days_to_tier: int, tier: str):
    """Apply storage class transition to objects meeting age criteria."""
    s3 = boto3.client('s3')
    paginator = s3.get_paginator('list_objects_v2')

    objects_to_tier = []
    cutoff_date = datetime.now() - timedelta(days=days_to_tier)

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get('Contents', []):
            if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                if obj['StorageClass'] != tier:
                    objects_to_tier.append({
                        'Key': obj['Key'],
                        'VersionId': obj.get('VersionId')
                    })

    # Batch process in chunks of 1000
    for i in range(0, len(objects_to_tier), 1000):
        chunk = objects_to_tier[i:i+1000]
        s3.copy_object(
            Bucket=bucket,
            CopySource={'Bucket': bucket, 'Key': obj['Key']},
            Key=obj['Key'],
            StorageClass=tier
        )
```

## Cost Allocation Per Team/Project

### Tagging Strategy

```sql
-- Snowflake: Tag warehouses with cost metadata
ALTER WAREHOUSE analytics_wh SET
    TAG cost_center = 'engineering',
    TAG team = 'analytics',
    TAG project = 'dashboard',
    TAG environment = 'production';

-- Snowflake: Tag tables with cost metadata
ALTER TABLE analytics.orders SET
    TAG cost_center = 'product',
    TAG data_domain = 'order',
    TAG owner_team = 'data-platform';

-- Query cost per tag
SELECT
    tag_name,
    tag_value,
    COUNT(*) AS object_count
FROM snowflake.account_usage.tag_references
WHERE tag_name IN ('cost_center', 'team', 'project')
GROUP BY tag_name, tag_value;
```

### Cost Allocation Queries

```sql
-- Snowflake: Credit consumption by tag
SELECT
    tr.tag_value AS team,
    SUM(wmh.credits_used) AS total_credits,
    ROUND(SUM(wmh.credits_used) * 2.0, 2) AS estimated_cost
FROM snowflake.account_usage.warehouse_metering_history wmh
JOIN snowflake.account_usage.tag_references tr
    ON wmh.warehouse_name = tr.object_name
    AND tr.tag_name = 'team'
    AND tr.domain = 'WAREHOUSE'
WHERE wmh.start_time >= DATEADD('month', -1, CURRENT_TIMESTAMP())
GROUP BY tr.tag_value
ORDER BY total_credits DESC;

-- BigQuery: Slot usage by label
SELECT
    label.value AS team,
    SUM(total_slot_ms) / 3600000 AS total_slot_hours,
    COUNT(*) AS query_count
FROM `region-US`.INFORMATION_SCHEMA.JOBS_BY_PROJECT,
UNNEST(labels) AS label
WHERE label.key = 'team'
  AND creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY team
ORDER BY total_slot_hours DESC;
```

## Budget Alerts

### Monitoring Budget Thresholds

```python
import boto3
import json

class BudgetAlertManager:
    def __init__(self):
        self.budgets = boto3.client('budgets')
        self.account_id = boto3.client('sts').get_caller_identity()['Account']

    def create_cost_budget(self, name: str, amount: float, thresholds: list):
        """Create a budget with alert thresholds."""
        self.budgets.create_budget(
            AccountId=self.account_id,
            Budget={
                'BudgetName': name,
                'BudgetLimit': {'Amount': str(amount), 'Unit': 'USD'},
                'CostTypes': {'IncludeTax': False},
                'TimeUnit': 'MONTHLY',
                'BudgetType': 'COST',
            },
            NotificationsWithSubscribers=[
                {
                    'Notification': {
                        'NotificationType': 'ACTUAL',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': threshold,
                        'ThresholdType': 'PERCENTAGE',
                    },
                    'Subscribers': [
                        {'SubscriptionType': 'SNS_TOPIC', 'Address': 'arn:aws:sns:us-east-1:...'}
                    ]
                }
                for threshold in thresholds
            ]
        )

# Create budgets per team
manager = BudgetAlertManager()
manager.create_cost_budget(
    name="data-platform-prod",
    amount=50000,  # $50,000 monthly
    thresholds=[50, 80, 90, 100]  # Alert at 50%, 80%, 90%, 100%
)
```

## Cost Dashboards

### Snowflake Cost Dashboard

```sql
-- Daily cost trend
SELECT
    DATE(start_time) AS day,
    SUM(credits_used) AS total_credits,
    ROUND(SUM(credits_used) * 2.0, 2) AS cost_usd
FROM snowflake.account_usage.warehouse_metering_history
WHERE start_time >= DATEADD('month', -1, CURRENT_TIMESTAMP())
GROUP BY day
ORDER BY day;

-- Cost by service component
SELECT
    warehouse_name,
    SUM(credits_used_compute) AS compute_credits,
    SUM(credits_used_cloud_services) AS cloud_credits,
    ROUND(SUM(credits_used) * 2.0, 2) AS total_cost
FROM snowflake.account_usage.warehouse_metering_history
WHERE start_time >= DATEADD('month', -1, CURRENT_TIMESTAMP())
GROUP BY warehouse_name
ORDER BY total_cost DESC;

-- Storage cost breakdown
SELECT
    object_type,
    SUM(avg_storage_bytes) / 1e12 AS avg_tb,
    ROUND(SUM(avg_storage_bytes) * 0.023 / 1e12, 2) AS monthly_cost
FROM snowflake.account_usage.daily_storage_usage_history
WHERE usage_date >= DATEADD('month', -1, CURRENT_DATE())
GROUP BY object_type;
```

### Cost Optimization Recommendations

```yaml
recommendations:
  warehouses:
    - warehouse: "prod_wh"
      suggestion: "Reduce from LARGE to MEDIUM"
      estimated_savings: "$1,200/month"
      risk: "Low - peak usage analysis shows 60% utilization"
    - warehouse: "analytics_wh"
      suggestion: "Reduce auto-suspend from 600 to 60 seconds"
      estimated_savings: "$400/month"
      risk: "None - no active users after 6 PM"

  queries:
    - query: "daily_report_2026"
      suggestion: "Add materialized view"
      estimated_savings: "$800/month"
      risk: "Low - query runs 4 times daily"
```

## Rules
- Set auto-suspend to 60 seconds for all production warehouses
- Use XSMALL for dev, MEDIUM max for production workloads
- Tag all resources with cost_center, team, environment
- Schedule budgets at 50%, 80%, 90%, 100% thresholds per team
- Review top 10 most expensive queries every week
- Implement storage tiering: 30d Standard → 90d IA → 365d Glacier → Deep Archive
- Use BATCH priority for non-interactive BigQuery queries (50% cost reduction)
- Set up chargeback/showback reports per team monthly
- Alert on any un-tagged warehouse or dataset
- Review and right-size warehouses quarterly based on 90-day usage trends
