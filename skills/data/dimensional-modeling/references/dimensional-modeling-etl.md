# Dimensional Modeling ETL

## ETL for Dimensional Models

Loading dimensional models requires specific ETL patterns for fact and dimension tables.

### Dimension Loading

```python
from datetime import datetime

class DimensionLoader:
    def __init__(self, warehouse: WarehouseClient):
        self.warehouse = warehouse

    def load_scd_type2(self, dim_table: str, source_query: str, natural_key: str):
        # Detect changes
        changes = self.warehouse.execute(f"""
            SELECT source.*
            FROM ({source_query}) source
            LEFT JOIN {dim_table} dim
                ON dim.{natural_key} = source.{natural_key}
                AND dim.current_flag = 'Y'
            WHERE dim.{natural_key} IS NULL
               OR MD5(dim.hash_value) != MD5(source.hash_value)
        """)

        if not changes:
            return LoadResult(rows_updated=0)

        # Expire current records
        self.warehouse.execute(f"""
            UPDATE {dim_table}
            SET current_flag = 'N',
                end_date = CURRENT_DATE
            WHERE {natural_key} IN ({self._ids(changes)})
              AND current_flag = 'Y'
        """)

        # Insert new records
        for row in changes:
            row["current_flag"] = "Y"
            row["start_date"] = datetime.utcnow().date()
            row["end_date"] = None
            self.warehouse.insert(dim_table, row)

        return LoadResult(rows_updated=len(changes))

    def load_scd_type1(self, dim_table: str, source_query: str):
        return self.warehouse.execute(f"""
            MERGE INTO {dim_table} AS target
            USING ({source_query}) AS source
            ON target.natural_key = source.natural_key
            WHEN MATCHED THEN UPDATE SET
                {self._update_columns(source_query)}
            WHEN NOT MATCHED THEN INSERT
                {self._insert_columns(source_query)}
        """)
```

### Fact Loading

```python
class FactLoader:
    def __init__(self, warehouse: WarehouseClient):
        self.warehouse = warehouse

    def load_incremental(self, fact_table: str, source_query: str,
                         surrogate_keys: list[SurrogateKey]):
        # Build dimension lookup joins
        joins = []
        select = []
        for sk in surrogate_keys:
            joins.append(f"""
                LEFT JOIN {sk.dim_table} dim_{sk.name}
                    ON dim_{sk.name}.{sk.natural_key} = src.{sk.natural_key}
                    AND dim_{sk.name}.current_flag = 'Y'
            """)
            select.append(f"dim_{sk.name}.{sk.surrogate_key} AS {sk.fk_column}")

        self.warehouse.execute(f"""
            INSERT INTO {fact_table} ({', '.join(select)})
            SELECT {', '.join(col for col in select)}
            FROM ({source_query}) src
            {chr(10).join(joins)}
        """)
```

## Slowly Changing Dimension Types

```python
class SCDDecisionGuide:
    def recommend_type(self, dimension: DimensionProfile) -> str:
        if dimension.historical_tracking_required:
            if dimension.row_count < 1000000 and dimension.change_rate < 0.1:
                return "SCD Type 2"  # Full history, manageable size
            else:
                return "SCD Type 1 with snapshot table"  # Current + periodic snapshots
        else:
            return "SCD Type 1"  # Overwrite only
```

## Key Points

- SCD Type 2 for dimensions requiring full history tracking
- SCD Type 1 for dimensions where only current state matters
- Fact loading uses surrogate key lookup from dimensions
- Incremental fact load based on source change timestamps
- Merge statements for upsert operations
- Hash comparison for efficient change detection
- Batch loading with transaction boundaries
- Referential integrity checks after load
- Fact table partition switching for fast bulk loads
- Dimension key validation before fact load
