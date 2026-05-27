# BI Tools Architecture

## Architectural Layers

Modern BI architectures separate concerns across semantic, query, presentation, and governance layers.

### Multi-Layer BI Stack

```python
class BIArchitecture:
    def __init__(self):
        self.layers = {
            "data_source": DataSourceLayer(),
            "semantic": SemanticLayer(),
            "query": QueryLayer(),
            "presentation": PresentationLayer(),
            "governance": GovernanceLayer(),
        }

    def process_query(self, request: BIRequest) -> BIResponse:
        # Validate governance
        self.layers["governance"].validate(request)

        # Resolve semantic definitions
        semantic_query = self.layers["semantic"].resolve(request.metric_definitions)

        # Execute against data source
        query = self.layers["query"].compile(semantic_query)
        results = self.layers["data_source"].execute(query)

        # Format for presentation
        return self.layers["presentation"].format(results, request.visualization)
```

### Semantic Layer

```python
class MetricDefinition:
    def __init__(self, name: str, sql_expr: str, data_type: str):
        self.name = name
        self.sql_expr = sql_expr
        self.data_type = data_type
        self.dimensions: list[str] = []
        self.filters: list[Filter] = []
        self.granularity: str | None = None

class SemanticLayer:
    def __init__(self):
        self.metrics: dict[str, MetricDefinition] = {}

    def register_metric(self, metric: MetricDefinition):
        self.metrics[metric.name] = metric

    def resolve(self, metric_names: list[str]) -> ResolvedQuery:
        selected_metrics = [self.metrics[n] for n in metric_names]
        return ResolvedQuery(
            select_clause=", ".join(m.sql_expr for m in selected_metrics),
            from_clause="FROM analytics.events",
            group_by_clause=", ".join(m.dimensions[0] for m in selected_metrics if m.dimensions),
        )
```

## Caching Architecture

```python
class BICacheManager:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.cache_ttl: dict[str, int] = {
            "dashboard": 300,    # 5 min
            "query": 60,         # 1 min
            "metadata": 3600,    # 1 hour
            "static": 86400,     # 1 day
        }

    def get_or_compute(
        self, cache_key: str, cache_type: str, compute_fn: Callable
    ) -> dict:
        cached = self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        result = compute_fn()
        ttl = self.cache_ttl.get(cache_type, 60)
        self.redis.setex(cache_key, ttl, json.dumps(result, default=str))
        return result

    def invalidate_dashboard(self, dashboard_id: str):
        pattern = f"dashboard:{dashboard_id}:*"
        for key in self.redis.scan_iter(match=pattern):
            self.redis.delete(key)
```

## Connection Pooling

```python
class BIDataSourcePool:
    def __init__(self, config: DBPoolConfig):
        self.pools: dict[str, ConnectionPool] = {}
        self.config = config

    def get_connection(self, datasource: str) -> Connection:
        if datasource not in self.pools:
            self.pools[datasource] = self._create_pool(datasource)
        return self.pools[datasource].getconn()

    def _create_pool(self, datasource: str) -> ConnectionPool:
        config = self.config.datasources[datasource]
        return ConnectionPool(
            minconn=config.min_connections or 2,
            maxconn=config.max_connections or 10,
            conn_max_age=3600,
        )

    def health_check(self) -> dict[str, bool]:
        results = {}
        for name, pool in self.pools.items():
            try:
                conn = pool.getconn()
                conn.execute("SELECT 1")
                pool.putconn(conn)
                results[name] = True
            except Exception:
                results[name] = False
        return results
```

## Key Points

- Separate semantic, query, and presentation layers for maintainability
- Semantic layer decouples metric definitions from physical schema
- Multi-level caching with appropriate TTLs per cache type
- Dashboard-level cache invalidation on data refresh
- Connection pooling prevents database overload from concurrent queries
- Row-level security enforced at the governance layer
- Query result caching with automatic expiration
- Health checks for all data source connections
- Rate limiting per user/team at the query layer
- Materialized aggregations for common query patterns
