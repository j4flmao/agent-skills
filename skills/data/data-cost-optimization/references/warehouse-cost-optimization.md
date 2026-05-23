# Warehouse Cost Optimization

## Snowflake Credit Analysis
```sql
-- Credit by warehouse (last 30 days)
SELECT warehouse_name, SUM(credits_used) as total_credits,
    ROUND(SUM(credits_used_compute) * 2.0, 2) as cost_usd
FROM snowflake.account_usage.warehouse_metering_history
WHERE start_time >= DATEADD('day', -30, CURRENT_DATE)
GROUP BY warehouse_name ORDER BY total_credits DESC;

-- Most expensive queries
SELECT query_id, LEFT(query_text, 100), warehouse_size,
    ROUND(credits_used_cloud_services * 2.0, 4) as cost_usd,
    ROUND(bytes_spilled_to_remote / POWER(1024, 3), 2) as remote_spill_gb
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD('day', -7, CURRENT_DATE)
ORDER BY cost_usd DESC LIMIT 20;

-- Idle warehouse (> 15% cloud services = idle)
SELECT warehouse_name,
    ROUND(AVG(credits_used_cloud_services) / NULLIF(AVG(credits_used), 0) * 100, 2) as cloud_pct
FROM snowflake.account_usage.warehouse_metering_history
WHERE start_time >= DATEADD('day', -30, CURRENT_DATE)
GROUP BY warehouse_name HAVING cloud_pct > 15;
```

## Warehouse Sizing Guide
| Size | Credits/Hr | Max Concurrency | Best For |
|---|---|---|---|
| XSMALL | 1 | 8 | Dev, ad-hoc |
| SMALL | 2 | 16 | Light prod |
| MEDIUM | 4 | 32 | Most prod workloads |
| LARGE | 8 | 64 | Heavy transforms |
| XLARGE | 16 | 128 | Large fact processing |

Right-size via `WAREHOUSE_LOAD_HISTORY`: high queue + low clusters → upsize. Low queue + low utilization → downsize.

```sql
SELECT warehouse_name, AVG(avg_running) as avg_concurrent, AVG(avg_queued) as avg_queued
FROM snowflake.account_usage.warehouse_load_history
WHERE start_time >= DATEADD('day', -30, CURRENT_DATE) GROUP BY warehouse_name;
```

## Query Optimization
```sql
-- Bad: full scan
SELECT * FROM orders WHERE YEAR(order_date) = 2026;
-- Good: partition prune
SELECT * FROM orders WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01';

-- Cluster on high-cardinality filter keys
ALTER TABLE orders CLUSTER BY (customer_id);

-- Materialized view for expensive aggregation
CREATE MATERIALIZED VIEW mv_daily_orders AS
SELECT order_date, COUNT(*), SUM(amount) FROM orders GROUP BY order_date;

-- Search optimization for point lookups
ALTER TABLE orders ADD SEARCH OPTIMIZATION;

-- Approximate count distinct
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events;  -- ~1% error, much cheaper
```

## BigQuery Slot Management
```yaml
reservations:
  - name: prod-reservation
    project: data-prod
    location: US
    slot_count: 100
    plan: ANNUAL
    autoscale: {min_slots: 50, max_slots: 200}
  - name: adhoc
    project: data-analytics
    slot_count: 50
    plan: FLEX

assignments:
  - reservation: prod-reservation
    job_type: QUERY
    project: data-prod
```

```sql
-- Slot usage per user
SELECT user_email, SUM(total_slot_ms)/3600000 as slot_hours
FROM `region-US`.INFORMATION_SCHEMA.JOBS_BY_USER
WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY user_email ORDER BY slot_hours DESC;

-- Optimal slot commitment: p95 peak
SELECT ROUND(PERCENTILE_CONT(peak_slots, 0.95) OVER()) as p95_peak
FROM hourly_slots LIMIT 1;
```

## Cost Allocation
```sql
ALTER WAREHOUSE prod_wh SET TAG cost_center = 'data-platform', team = 'analytics';

-- Query cost by tag
SELECT tr.tag_value as cost_center, SUM(wmh.credits_used_compute) * 2.0 as total_cost
FROM snowflake.account_usage.warehouse_metering_history wmh
JOIN snowflake.account_usage.tag_references tr ON tr.object_name = wmh.warehouse_name
WHERE tr.tag_name = 'cost_center' GROUP BY cost_center;
```

## Rules
- Auto-suspend idle warehouses within 60 seconds
- Economy scaling for production workloads
- Cluster on high-cardinality filter columns
- Partition large tables on date columns
- Prefer materialized views over repeated aggregations
- Review top 10 most expensive queries weekly
- Tag resources with cost_center, team, environment
- Set budget alerts at 50/80/90/100%
