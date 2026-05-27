# Lakehouse Monitoring

## Operational Monitoring

Lakehouse monitoring covers data freshness, pipeline health, storage utilization, and query performance.

### Freshness Monitoring

```python
from datetime import datetime, timedelta
from pydantic import BaseModel

class FreshnessMonitor:
    def __init__(self, catalog: LakehouseCatalog):
        self.catalog = catalog

    def check_freshness(self, table: str, max_age: timedelta) -> bool:
        metadata = self.catalog.get_table_metadata(table)
        last_modified = metadata.get("last_modified")
        if not last_modified:
            return False
        age = datetime.utcnow() - last_modified
        return age <= max_age

    def freshness_report(self, tables: list[str]) -> dict[str, FreshnessStatus]:
        report = {}
        for table in tables:
            metadata = self.catalog.get_table_metadata(table)
            last_modified = metadata.get("last_modified")
            age = datetime.utcnow() - last_modified if last_modified else None

            if age is None:
                status = FreshnessStatus.UNKNOWN
            elif age <= timedelta(hours=1):
                status = FreshnessStatus.FRESH
            elif age <= timedelta(days=1):
                status = FreshnessStatus.STALE
            else:
                status = FreshnessStatus.OUTDATED

            report[table] = FreshnessStatus(
                status=status,
                last_modified=last_modified,
                age_hours=age.total_seconds() / 3600 if age else None,
            )

        return report
```

### Storage Monitoring

```python
class StorageMonitor:
    def __init__(self, storage_client: StorageClient):
        self.client = storage_client

    def get_zone_metrics(self, base_path: str) -> ZoneMetrics:
        zones = ["bronze", "silver", "gold"]
        metrics = {}

        for zone in zones:
            path = f"{base_path}/{zone}"
            zone_metrics = self._compute_zone_metrics(path)
            metrics[zone] = zone_metrics

        return ZoneMetrics(
            zones=metrics,
            total_size=sum(m.total_bytes for m in metrics.values()),
            total_files=sum(m.file_count for m in metrics.values()),
            snapshot_date=datetime.utcnow(),
        )

    def _compute_zone_metrics(self, path: str) -> ZoneMetricDetail:
        tables = self.client.list_tables(path)
        total_bytes = 0
        total_files = 0
        table_metrics = []

        for table in tables:
            table_path = f"{path}/{table}"
            size = self.client.get_size(table_path)
            files = self.client.get_file_count(table_path)
            total_bytes += size
            total_files += files
            table_metrics.append(TableMetric(
                name=table,
                size_bytes=size,
                file_count=files,
                avg_file_size=size / files if files > 0 else 0,
            ))

        return ZoneMetricDetail(
            total_bytes=total_bytes,
            file_count=total_files,
            tables=table_metrics,
        )
```

### Query Performance Monitoring

```python
class QueryPerformanceMonitor:
    def __init__(self, history_store: QueryHistoryStore):
        self.store = history_store

    def analyze_query_performance(self, engine: str, hours: int = 24) -> PerformanceReport:
        queries = self.store.get_recent(engine, hours)
        if not queries:
            return PerformanceReport.empty()

        slow_queries = [q for q in queries if q.duration_seconds > 30]
        return PerformanceReport(
            engine=engine,
            total_queries=len(queries),
            avg_duration=sum(q.duration_seconds for q in queries) / len(queries),
            p50_duration=sorted(q.duration_seconds for q in queries)[len(queries) // 2],
            p95_duration=sorted(q.duration_seconds for q in queries)[int(len(queries) * 0.95)],
            slow_query_count=len(slow_queries),
            data_scanned_gb=sum(q.bytes_scanned for q in queries) / (1024**3),
        )
```

## Key Points

- Freshness monitoring per table with configurable SLAs
- Storage metrics by zone: bronze, silver, gold
- Query performance tracking with P50/P95 latency
- Slow query detection and alerting (threshold > 30s)
- Data volume trends for capacity planning
- File compaction ratio monitoring (target: 256MB avg file size)
- Orphan file detection and cleanup automation
- Catalog sync status between engines
- Partition evolution tracking for schema changes
- Integration with PagerDuty/OpsGenie for critical alerts
