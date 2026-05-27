# Virtualization Connectors

## Connecting to Data Sources

Data virtualization engines connect to diverse data sources through plugin connectors.

### Connector Architecture

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class DataSourceConfig:
    name: str
    type: str
    connection_string: str
    credentials: dict
    properties: dict[str, str]

class Connector(ABC):
    @abstractmethod
    def test_connection(self) -> bool:
        pass

    @abstractmethod
    def get_schema(self) -> list[TableSchema]:
        pass

    @abstractmethod
    def get_statistics(self) -> DataSourceStats:
        pass

class PostgresConnector(Connector):
    def __init__(self, config: DataSourceConfig):
        self.config = config
        self.properties = {
            "connection_pool_size": "10",
            "query_timeout": "5m",
            "allow_drop_table": "false",
        }

    def test_connection(self) -> bool:
        try:
            conn = psycopg2.connect(self.config.connection_string)
            conn.close()
            return True
        except Exception:
            return False

    def get_schema(self) -> list[TableSchema]:
        conn = psycopg2.connect(self.config.connection_string)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_schema, table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        """)
        return [TableSchema(schema=r[0], table=r[1], column=r[2], type=r[3])
                for r in cursor.fetchall()]
```

### Connector Configuration

```python
class ConnectorManager:
    def __init__(self):
        self.connectors: dict[str, Connector] = {}

    def register_connector(self, config: DataSourceConfig):
        if config.type == "postgresql":
            connector = PostgresConnector(config)
        elif config.type == "bigquery":
            connector = BigQueryConnector(config)
        elif config.type == "snowflake":
            connector = SnowflakeConnector(config)
        elif config.type == "mysql":
            connector = MySQLConnector(config)

        if connector.test_connection():
            self.connectors[config.name] = connector
        else:
            raise ConnectionError(f"Failed to connect to {config.name}")

    def get_all_schemas(self) -> dict[str, list[TableSchema]]:
        return {
            name: conn.get_schema()
            for name, conn in self.connectors.items()
        }
```

## Key Points

- Abstract connector interface: test, get_schema, get_statistics
- Plugin architecture enables new data sources without engine changes
- Connection pooling with configurable pool size
- Query timeout per connector prevents runaway queries
- Statistics collection for query optimization
- Schema caching with configurable refresh interval
- Credential management through secret vault
- TLS required for all connector connections
- Retry logic with exponential backoff for transient failures
- Health checks at configurable intervals for each connector
