# Replication Strategies: CDC vs ETL

## Choosing Between CDC and ETL Replication

The choice between CDC (Change Data Capture) and batch ETL replication depends on latency, volume, and complexity requirements.

### Decision Framework

```python
from enum import Enum
from dataclasses import dataclass

class ReplicationMode(Enum):
    CDC_LOG_BASED = "cdc_log"            # Database transaction logs
    CDC_TRIGGER_BASED = "cdc_trigger"    # Database triggers
    CDC_TIMESTAMP = "cdc_timestamp"      # Timestamp columns
    ETL_FULL = "etl_full"               # Full table copy
    ETL_INCREMENTAL = "etl_incremental"  # Incremental batch
    ETL_SNAPSHOT = "etl_snapshot"        # Periodic snapshots

@dataclass
class ReplicationRequirement:
    max_latency_seconds: int
    data_volume_gb: int
    change_frequency: str  # continuous, hourly, daily
    source_type: str       # oltp, olap, file, api
    target_type: str       # warehouse, lake, search, cache
    consistency_level: str # strong, eventual

class ReplicationAdvisor:
    def recommend(self, req: ReplicationRequirement) -> ReplicationMode:
        if req.max_latency_seconds < 60 and req.source_type == "oltp":
            return ReplicationMode.CDC_LOG_BASED
        elif req.max_latency_seconds < 3600:
            return ReplicationMode.ETL_INCREMENTAL
        elif req.max_latency_seconds < 86400:
            return ReplicationMode.ETL_SNAPSHOT
        else:
            return ReplicationMode.ETL_FULL
```

### CDC Advantages

```python
class CDCAnalyzer:
    def analyze_suitability(self, database: DatabaseProfile) -> CDCSuitability:
        factors = {
            "transaction_rate": database.txn_per_second,
            "table_count": database.table_count,
            "avg_row_size_bytes": database.avg_row_size,
            "has_primary_keys": database.tables_with_pk / database.table_count,
            "supports_wal": database.supports_wal,
        }

        score = 0
        if factors["transaction_rate"] > 100:
            score += 2
        if factors["has_primary_keys"] > 0.9:
            score += 3
        if factors["supports_wal"]:
            score += 3
        if factors["avg_row_size_bytes"] < 1000:
            score += 1

        return CDCSuitability(
            recommended=score >= 6,
            score=score,
            reasons=self._get_reasons(score, factors),
        )
```

### ETL Advantages

```python
class ETLAdvisor:
    def recommend_full_refresh(self, table: TableProfile) -> bool:
        # Full refresh is better when:
        # - Small table (< 10M rows)
        # - Few changes (< 5% daily)
        # - High ratio of updates vs inserts
        if table.row_count < 10_000_000:
            return True
        if table.daily_change_rate < 0.05:
            return True
        if table.update_ratio > 0.5:
            return True
        return False
```

## Key Points

- CDC preferred for sub-minute latency requirements
- ETL incremental good for hourly to daily replication
- Full refresh suitable for small tables (< 10M rows)
- Log-based CDC requires WAL support (PostgreSQL, MySQL)
- Timestamp CDC requires reliable timestamp columns
- Trigger-based CDC adds overhead to source database
- ETL simpler to debug and test than CDC
- CDC captures deletes and updates; ETL needs special handling
- Hybrid approaches use CDC for hot data, ETL for historical
- Consider source database load when choosing CDC over ETL
