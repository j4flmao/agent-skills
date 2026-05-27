# Lakehouse Query Engines

## Multi-Engine Architecture

Lakehouses support multiple query engines accessing the same data through a common catalog.

### Engine Selection

```python
from enum import Enum

class QueryEngine(Enum):
    SPARK = "spark"              # Batch ETL, complex transformations
    PREST O = "presto"            # Interactive SQL, ad-hoc queries
    TRINO = "trino"               # Federated queries, real-time
    DUCKDB = "duckdb"            # Local analytics, embedded
    DATABRICKS_SQL = "databricks_sql"  # Databricks warehouse
    ATHENA = "athena"            # Serverless, AWS integration
    REDSHIFT_SPECTRUM = "redshift_spectrum"  # Redshift external tables

@dataclass
class EngineCapability:
    batch_processing: bool
    interactive_queries: bool
    real_time_streaming: bool
    ml_integration: bool
    cost_model: str  # per_query | per_node | per_dbu
    max_concurrency: int
    latency_profile: str  # low | medium | high

ENGINE_CAPABILITIES = {
    QueryEngine.SPARK: EngineCapability(
        batch_processing=True, interactive_queries=False,
        real_time_streaming=True, ml_integration=True,
        cost_model="per_node", max_concurrency=50,
        latency_profile="high",
    ),
    QueryEngine.TRINO: EngineCapability(
        batch_processing=True, interactive_queries=True,
        real_time_streaming=False, ml_integration=False,
        cost_model="per_node", max_concurrency=200,
        latency_profile="low",
    ),
    QueryEngine.DUCKDB: EngineCapability(
        batch_processing=False, interactive_queries=True,
        real_time_streaming=False, ml_integration=True,
        cost_model="per_query", max_concurrency=1,
        latency_profile="low",
    ),
}
```

### Catalog Integration

```python
class LakehouseCatalog:
    def __init__(self):
        self.engines: dict[QueryEngine, CatalogConnection] = {}

    def register_engine(self, engine: QueryEngine, connection: CatalogConnection):
        self.engines[engine] = connection

    def create_table(self, table_def: TableDefinition):
        # Create table in all registered engines
        for engine, conn in self.engines.items():
            if engine in (QueryEngine.SPARK, QueryEngine.DATABRICKS_SQL):
                conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {table_def.name}
                    USING {table_def.format}
                    LOCATION '{table_def.location}'"
                    {self._partition_clause(table_def)}
                """)
            elif engine in (QueryEngine.TRINO, QueryEngine.ATHENA):
                conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS {table_def.name}
                    WITH (
                        format = '{table_def.format}',
                        external_location = '{table_def.location}'
                    )
                """)
```

## Workload Routing

```python
class WorkloadRouter:
    def route_query(self, query: str, priority: str) -> QueryEngine:
        if self._is_batch_etl(query):
            return QueryEngine.SPARK
        elif self._is_interactive(query) and priority == "low":
            return QueryEngine.ATHENA
        elif self._is_interactive(query) and priority == "high":
            return QueryEngine.TRINO
        elif self._is_small_query(query):
            return QueryEngine.DUCKDB
        return QueryEngine.TRINO

    def _is_batch_etl(self, query: str) -> bool:
        return any(kw in query.upper() for kw in
                   ["INSERT INTO", "CREATE TABLE AS", "MERGE INTO"])

    def _is_interactive(self, query: str) -> bool:
        return not self._is_batch_etl(query)

    def _is_small_query(self, query: str) -> bool:
        return len(query) < 1000 and "JOIN" not in query.upper()
```

## Key Points

- Choose engine by workload: Spark for ETL, Trino/Presto for interactive, DuckDB for local
- Common catalog (Hive Metastore, Unity Catalog, Glue) enables multi-engine access
- Workload routing directs queries to the optimal engine
- Consider cost model: per-node (reserved) vs per-query (serverless)
- Engine-specific table properties managed via catalog
- Cross-engine joins require federated query capabilities
- Monitor engine utilization to right-size cluster allocations
- Cache frequently accessed data in engine-local caches
- DuckDB for development, Trino for BI, Spark for production ETL
- Table format compatibility across engines: Delta, Iceberg, Hudi, Parquet
