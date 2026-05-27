# Warehouse Cost Optimization

## Understanding Warehouse Costs
Cloud data warehouse costs typically consist of compute (execution), storage (data at rest), and data transfer components. Optimizing each requires different strategies.

## Compute Cost Management

### Snowflake Cost Optimization
```sql
-- View credit usage by warehouse
SELECT
    warehouse_name,
    SUM(credits_used) as total_credits,
    SUM(credits_used_compute) as compute_credits,
    SUM(credits_used_cloud_services) as cloud_credits
FROM snowflake.account_usage.warehouse_metering_history
WHERE start_time >= DATEADD('month', -1, CURRENT_TIMESTAMP())
GROUP BY 1
ORDER BY 2 DESC;

-- Set warehouse auto-suspend and auto-resume
ALTER WAREHOUSE analytics_wh
    SET AUTO_SUSPEND = 300   -- 5 minutes
        AUTO_RESUME = TRUE
        MIN_CLUSTER_COUNT = 1
        MAX_CLUSTER_COUNT = 3
        SCALING_POLICY = 'ECONOMY';

-- Resource monitors
CREATE RESOURCE MONITOR monthly_budget
    WITH CREDIT_QUOTA = 5000
        FREQUENCY = MONTHLY
        START_TIMESTAMP = '2024-01-01 00:00:00'
        TRIGGERS ON 80 PERCENT DO NOTIFY
                 ON 100 PERCENT DO SUSPEND
                 ON 110 PERCENT DO SUSPEND_IMMEDIATE;

ALTER WAREHOUSE analytics_wh
    SET RESOURCE_MONITOR = monthly_budget;
```

### BigQuery Cost Optimization
```sql
-- Analyze slot usage
SELECT
    job_type,
    query,
    total_slot_ms,
    total_bytes_processed,
    total_bytes_billed,
    TIMESTAMP_DIFF(end_time, start_time, SECOND) as execution_seconds
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY total_slot_ms DESC
LIMIT 20;

-- Set query quotas
ALTER PROJECT my_project
SET OPTIONS (
    default_query_job_timeout_ms = 3600000,
    default_partition_expiration_days = 365
);

-- BiqQuery reservation
CREATE RESERVATION my_reservation
OPTIONS (
    slot_capacity = 500,
    edition = 'STANDARD',
    autoscale_max_slots = 250
);
```

## Storage Optimization

### Partitioning and Clustering
```sql
-- Optimize partition strategy
SELECT
    table_name,
    row_count,
    partition_count,
    avg_partition_mb,
    CASE
        WHEN avg_partition_mb < 1 THEN 'Under-partitioned'
        WHEN avg_partition_mb > 100 THEN 'Over-partitioned'
        ELSE 'Good'
    END as partition_health
FROM warehouse_information_schema.partitions;

-- Data lifecycle management
ALTER TABLE analytics.daily_logs
    SET TBLPROPERTIES (
        'delta.logRetentionDuration' = '7 days',
        'delta.deletedFileRetentionDuration' = '7 days',
        'delta.autoOptimize.optimizeWrite' = 'true'
    );
```

## Query Optimization for Cost

### Reducing Bytes Scanned
```sql
-- Before: Full table scan
SELECT COUNT(*)
FROM orders
WHERE order_date >= '2024-01-01';

-- After: Partition pruning
SELECT COUNT(*)
FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date < '2024-02-01';
```

### Materialized Views
```sql
-- Create materialized view for common aggregations
CREATE MATERIALIZED VIEW daily_orders_mv AS
SELECT
    order_date,
    customer_segment,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue
FROM orders_fact o
JOIN customer_dim c ON o.customer_id = c.customer_id
GROUP BY 1, 2;
```

### Cluster Keys
```sql
-- Redshift: Define sort keys
CREATE TABLE orders_fact (
    order_id BIGINT DISTKEY,
    customer_id BIGINT,
    order_date DATE SORTKEY,
    total_amount DECIMAL(10,2),
    status VARCHAR(50)
)
DISTSTYLE KEY
SORTKEY (order_date, status);
```

## Cost Monitoring and Alerting
```python
from prometheus_client import Gauge
import boto3

WAREHOUSE_COST = Gauge(
    "warehouse_daily_cost",
    "Daily warehouse cost by service",
    ["warehouse", "service"]
)

def track_warehouse_costs():
    ce = boto3.client("ce", region_name="us-east-1")
    response = ce.get_cost_and_usage(
        TimePeriod={
            "Start": "2024-01-01",
            "End": "2024-01-31"
        },
        Granularity="DAILY",
        Metrics=["UnblendedCost"],
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}]
    )
    for result in response["ResultsByTime"]:
        for group in result["Groups"]:
            WAREHOUSE_COST.labels(
                warehouse="snowflake",
                service=group["Keys"][0]
            ).set(float(group["Metrics"]["UnblendedCost"]["Amount"]))
```

## Key Points
- Monitor compute usage with resource monitors and budgets
- Optimize partitioning to minimize bytes scanned
- Use materialized views for common aggregate queries
- Implement auto-suspend for idle warehouses
- Set slot/credit quotas to prevent runaway costs
- Track cost by team/project for chargeback
- Archive cold data to lower-cost storage tiers
- Regular audit of unused tables and orphaned storage
- Use compression and columnar formats to reduce storage
- Implement data lifecycle policies for automatic cleanup
