# BI Tools Performance Optimization

## Query Performance

Optimizing BI tool performance requires attention to the database, network, and presentation layers.

### Query Optimization Patterns

```python
class QueryOptimizer:
    def __init__(self):
        self.rules: list[OptimizationRule] = [
            PredicatePushdown(),
            ColumnPruning(),
            AggregationPushdown(),
            JoinOptimization(),
        ]

    def optimize(self, query: BIQuery) -> OptimizedQuery:
        optimized = query
        for rule in self.rules:
            optimized = rule.apply(optimized)
        return optimized


class PredicatePushdown(OptimizationRule):
    def apply(self, query: BIQuery) -> BIQuery:
        if query.time_range:
            query.filters.append(
                Filter("event_date", ">=", query.time_range.start)
            )
            query.filters.append(
                Filter("event_date", "<", query.time_range.end)
            )
        return query


class AggregationPushdown(OptimizationRule):
    def apply(self, query: BIQuery) -> BIQuery:
        if len(query.dimensions) + len(query.measures) < 10:
            query.pre_aggregate = True
        return query
```

### Materialized Aggregations

```python
class MaterializedAggregationManager:
    def __init__(self, db_connection):
        self.db = db_connection

    def create_aggregation(self, name: str, definition: AggregationDef):
        ddl = f"""
        CREATE MATERIALIZED VIEW agg_{name} AS
        SELECT {', '.join(definition.dimensions)},
               {', '.join(f"{fn}({col}) AS {fn}_{col}"
                         for fn, col in definition.measures)}
        FROM {definition.source_table}
        GROUP BY {', '.join(definition.dimensions)}
        WITH DATA
        """
        self.db.execute(ddl)

    def refresh_aggregation(self, name: str, concurrently: bool = True):
        refresh_sql = f"REFRESH MATERIALIZED VIEW {'CONCURRENTLY' if concurrently else ''} agg_{name}"
        self.db.execute(refresh_sql)
```

## Dashboard Load Time

```python
class DashboardPerformanceOptimizer:
    def __init__(self):
        self.optimizations: dict[str, bool] = {
            "lazy_loading": True,
            "query_parallelism": True,
            "result_caching": True,
            "data_pagination": True,
            "prefetch": False,
        }

    def optimize_dashboard(self, dashboard: Dashboard) -> Dashboard:
        if self.optimizations["lazy_loading"]:
            dashboard.load_mode = "lazy"
            for tile in dashboard.tiles:
                tile.visible = False
                tile.load_on_view = True

        if self.optimizations["query_parallelism"]:
            tiles_per_batch = min(4, len(dashboard.tiles))
            dashboard.tile_batches = [
                dashboard.tiles[i:i + tiles_per_batch]
                for i in range(0, len(dashboard.tiles), tiles_per_batch)
            ]

        return dashboard

    def measure_load_time(self, dashboard: Dashboard) -> LoadMetrics:
        start = time.perf_counter()
        for tile in dashboard.tiles:
            tile_start = time.perf_counter()
            tile.execute()
            tile.execution_time = time.perf_counter() - tile_start
        total = time.perf_counter() - start

        return LoadMetrics(
            total_time=total,
            slowest_tile=max(dashboard.tiles, key=lambda t: t.execution_time),
            tiles_over_2s=[t for t in dashboard.tiles if t.execution_time > 2],
        )
```

## Caching Strategy

```python
class BICacheStrategy:
    def __init__(self):
        self.levels = {
            "browser": BrowserCache(ttl=60),
            "application": ApplicationCache(ttl=300),
            "database": DatabaseCache(ttl=30),
        }

    def determine_ttl(self, query: BIQuery, data_freshness: Freshness) -> int:
        # Static reference data: cache for hours
        if query.is_reference_data:
            return 3600

        # Time-series with known freshness: cache until next refresh
        if data_freshness.next_refresh:
            return int((data_freshness.next_refresh - datetime.now()).total_seconds())

        # Real-time data: minimal caching
        if data_freshness.freshness_seconds < 60:
            return 5

        # Default: 5 minutes
        return 300
```

## Key Points

- Push predicates, column selection, and aggregations to the database
- Materialized views pre-compute expensive aggregations
- Lazy loading dashboard tiles to reduce initial load time
- Parallel query execution for multiple tiles in a dashboard
- Multi-level caching with TTL based on data freshness
- Pre-aggregate rollup tables for common dimension combinations
- Limit result sets with pagination and sensible defaults
- Profile slow tiles and set explicit timeouts per query
- Consider result size limits to prevent browser memory issues
- Schedule materialized view refreshes during off-peak hours
