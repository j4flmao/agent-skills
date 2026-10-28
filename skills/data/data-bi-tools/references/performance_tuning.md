# BI Performance Tuning

Making dashboards fast and affordable: diagnose where time goes, then fix the data model (aggregates, materializations), the warehouse (pruning, clustering, compute), the BI layer (caching, async queries, storage modes, extracts) and dashboard design.

## Where Dashboard Time Goes

```
user opens dashboard
  -> BI app: permission checks, render N charts, build N SQL queries
  -> cache hit? -> return
  -> warehouse: queue -> compile -> scan -> join/aggregate -> return rows
  -> BI app: post-process, serialize, render in browser
```
Measure per chart: query duration in the warehouse history, BI-side processing time, rows returned, and cache hit rate. Most slow dashboards are slow warehouse queries or too many charts.

## Data Model Fixes (largest gains)

| Technique | Effect |
|---|---|
| Pre-aggregated marts (daily/weekly grain) | Scan far fewer rows than raw facts |
| Wide, denormalized tables for BI | Fewer joins at query time |
| Materialized views / dynamic tables | Warehouse maintains aggregates incrementally (Snowflake materialized views and dynamic tables, BigQuery materialized views, Databricks materialized views) |
| Aggregate awareness | Tool picks aggregate tables automatically (Looker `aggregate_table`, Power BI aggregations, Cube pre-aggregations) |
| Semantic-layer caching | Cube pre-aggregations, dbt Semantic Layer caching |
| Trim history | Default dashboards to recent periods; archive old data to separate views |

```sql
-- Snowflake dynamic table maintained for BI
CREATE OR REPLACE DYNAMIC TABLE marts.daily_sales_by_region
  TARGET_LAG = '15 minutes'
  WAREHOUSE = transform_s
AS
SELECT order_date, region, product_category,
       SUM(amount) AS revenue, COUNT(DISTINCT customer_id) AS customers
FROM core.fct_orders
GROUP BY 1, 2, 3;
```

## Warehouse Fixes

| Warehouse | Levers |
|---|---|
| Snowflake | Clustering keys on large tables filtered by date/tenant; search optimization for point lookups; dedicated BI warehouse with multi-cluster scaling for concurrency; result cache (identical queries, unchanged data) |
| BigQuery | Partition + cluster; BI Engine reservation for in-memory acceleration; materialized views; require partition filters |
| Databricks SQL | Serverless SQL warehouses, liquid clustering, Photon, disk/result caching |
| Redshift | Sort/dist keys or automatic table optimization, concurrency scaling, materialized views with auto refresh |
| ClickHouse / Druid / Pinot | Real-time OLAP for sub-second, high-concurrency dashboards |

Ensure BI-generated SQL filters on partition/cluster columns: expose date filters as native filters mapped to those columns.

## BI Layer Fixes

### Caching
- Superset: `DATA_CACHE_CONFIG` (Redis) with per-dataset/per-database cache timeouts; warm caches after ETL via the API or cache-warmup tasks.
- Metabase: caching policies (duration, schedule, adaptive) per database, dashboard or question.
- Looker: datagroups trigger cache invalidation when ETL finishes (`sql_trigger` on a load timestamp).
- Power BI Import / Tableau extracts: the dataset itself is the cache; schedule refresh after ETL.

```lookml
datagroup: nightly_etl {
  sql_trigger: SELECT MAX(loaded_at) FROM core.etl_audit ;;
  max_cache_age: "24 hours"
}
explore: orders { persist_with: nightly_etl }
```

### Async queries
Run long queries asynchronously so web workers are not blocked (Superset `GLOBAL_ASYNC_QUERIES` feature flag with Celery workers and a websocket/polling transport; SQL Lab async per database).

### Storage modes (Power BI)
| Mode | Speed | Freshness | Notes |
|---|---|---|---|
| Import | Fastest (VertiPaq in-memory) | As of last refresh | Size limits per capacity; incremental refresh for large facts |
| DirectQuery | Depends on source | Live | Every visual sends queries; use aggregations and limit visuals |
| Dual | Mixed | Mixed | Dimension tables in Dual for composite models |
| Direct Lake (Fabric) | Near-import speed | Reads Delta tables in OneLake | Falls back to DirectQuery in some cases |

### Tableau
Extracts (Hyper) for heavy dashboards; live connections only on fast engines; use context filters sparingly; Performance Recorder to find slow sheets.

## Dashboard Design Fixes
- Fewer charts per dashboard (each is at least one query); split into tabs or drill-through pages.
- Avoid high-cardinality tables with tens of thousands of rows; provide export from a separate report.
- Use filters that map to partitioned/clustered columns; set default date ranges.
- Avoid `COUNT(DISTINCT)` on huge tables when approximate (`APPROX_COUNT_DISTINCT`/HLL) is acceptable.
- Replace calculated fields repeated in many charts with columns computed in dbt.
- Lazy-load below-the-fold charts where the tool supports it.

## Concurrency and Capacity
- Size web/worker tiers for peak concurrent viewers (Monday mornings, month-end).
- Use multi-cluster or autoscaling compute for BI warehouses; separate BI from ETL compute.
- Power BI capacities: monitor with the Fabric Capacity Metrics app; throttling occurs when capacity is overused.
- Rate-limit or queue scheduled reports so they do not all run at the top of the hour.

## Monitoring
| Metric | Source |
|---|---|
| p50/p95 dashboard load time | BI logs/telemetry, RUM in embedded apps |
| Query duration and bytes scanned per dashboard | Warehouse query history with query tags/labels |
| Cache hit rate | Redis/BI metrics |
| Top expensive dashboards | Warehouse cost by tag |
| Queueing time | Warehouse queued time, Celery queue length |

```sql
-- Snowflake: slowest BI queries by tag in the last 7 days
SELECT query_tag, COUNT(*) AS queries,
       MEDIAN(total_elapsed_time) / 1000 AS median_s,
       SUM(bytes_scanned) / POWER(1024, 3) AS gb_scanned
FROM snowflake.account_usage.query_history
WHERE warehouse_name = 'BI_WH' AND start_time > DATEADD(day, -7, CURRENT_TIMESTAMP())
GROUP BY 1 ORDER BY median_s DESC LIMIT 20;
```

## Checklist
- [ ] Slowest dashboards identified from query history
- [ ] BI reads pre-aggregated marts or materialized/dynamic tables
- [ ] Filters hit partition/cluster columns with default ranges
- [ ] Caches configured and invalidated/warmed by ETL completion
- [ ] Async execution for long queries
- [ ] Dedicated, autoscaling BI compute and query tags for cost attribution
