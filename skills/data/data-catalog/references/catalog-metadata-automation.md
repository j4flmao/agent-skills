# Catalog Metadata Automation

## Automated Metadata Ingestion

Metadata automation reduces manual cataloging effort and ensures freshness.

### Ingestion Framework

```python
from abc import ABC, abstractmethod
from datetime import datetime
from pydantic import BaseModel

class MetadataSource(ABC):
    @abstractmethod
    def extract(self) -> list[Asset]:
        pass

    @abstractmethod
    def validate(self) -> bool:
        pass

class SnowflakeSource(MetadataSource):
    def __init__(self, connection_string: str):
        self.conn = connection_string

    def extract(self) -> list[Asset]:
        query = """
        SELECT
            table_catalog AS database_name,
            table_schema AS schema_name,
            table_name,
            table_type,
            comment AS description,
            row_count,
            bytes
        FROM information_schema.tables
        WHERE table_schema NOT IN ('INFORMATION_SCHEMA')
        """
        results = self.conn.execute(query)
        return [Asset(
            name=f"{r.database_name}.{r.schema_name}.{r.table_name}",
            asset_type="table",
            description=r.description or "",
            metadata={
                "row_count": r.row_count,
                "size_bytes": r.bytes,
                "table_type": r.table_type,
            },
            source="snowflake",
        ) for r in results]

class dbtSource(MetadataSource):
    def __init__(self, manifest_path: str):
        self.manifest = json.load(open(manifest_path))

    def extract(self) -> list[Asset]:
        assets = []
        for node_name, node in self.manifest["nodes"].items():
            if node["resource_type"] == "model":
                assets.append(Asset(
                    name=node["name"],
                    asset_type="dbt_model",
                    description=node.get("description", ""),
                    metadata={
                        "materialized": node["config"].get("materialized"),
                        "database": node["database"],
                        "schema": node["schema"],
                        "depends_on": node["depends_on"]["nodes"],
                    },
                    source="dbt",
                ))
        return assets
```

### Incremental Sync

```python
class IncrementalMetadataSync:
    def __init__(self, catalog_client, state_store: StateStore):
        self.catalog = catalog_client
        self.state = state_store

    def sync(self, source: MetadataSource):
        last_sync = self.state.get(f"last_sync:{type(source).__name__}")
        assets = source.extract()

        for asset in assets:
            existing = self.catalog.get_asset(asset.name)
            if not existing:
                self.catalog.create_asset(asset)
            elif existing.hash != asset.hash:
                self.catalog.update_asset(asset)
            else:
                asset.skipped = True

        self.state.set(
            f"last_sync:{type(source).__name__}",
            datetime.utcnow().isoformat(),
        )
        return SyncReport(
            created=sum(1 for a in assets if not getattr(a, 'skipped', False)),
            updated=sum(1 for a in assets if not getattr(a, 'skipped', False)),
            skipped=sum(1 for a in assets if getattr(a, 'skipped', False)),
        )
```

## Lineage Automation

```python
class LineageExtractor:
    def extract_lineage(self, assets: list[Asset]) -> list[LineageEdge]:
        edges = []
        for asset in assets:
            if asset.source == "dbt":
                for dep in asset.metadata.get("depends_on", []):
                    edges.append(LineageEdge(
                        source=self._resolve_asset_name(dep),
                        target=asset.name,
                        transformation=asset.name,
                        metadata={
                            "materialized": asset.metadata.get("materialized"),
                        },
                    ))
            elif asset.source == "airflow":
                for task in asset.metadata.get("tasks", []):
                    for input_table in task.get("inputs", []):
                        for output_table in task.get("outputs", []):
                            edges.append(LineageEdge(
                                source=self._normalize_name(input_table),
                                target=self._normalize_name(output_table),
                                transformation=f"{asset.name}.{task['name']}",
                                metadata={"task_id": task["id"]},
                            ))
        return edges
```

## Key Points

- Abstract MetadataSource interface for different platforms
- Incremental sync using hash comparison to minimize updates
- State store tracks last sync timestamp per source
- dbt manifest parsing extracts model lineage and dependencies
- Snowflake information_schema queries for table metadata
- Airflow DAG parsing extracts task-level data lineage
- Skip unchanged assets to reduce catalog API load
- Sync reports provide observability into metadata freshness
- Schedule sync jobs via Airflow or cron for continuous freshness
- Lineage extraction supports multi-hop transformations
