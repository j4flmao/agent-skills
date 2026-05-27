# Format Migration Strategies

## Migrating Between Data Formats

Changing data formats in production requires careful planning to avoid data loss and downtime.

### Migration Planning

```python
from enum import Enum
from datetime import datetime, timedelta

class MigrationStrategy(Enum):
    DUAL_WRITE = "dual_write"           # Write both old and new, switch readers
    BACKFILL = "backfill"               # Convert all existing data
    HYBRID = "hybrid"                   # New data in new format, old stays
    IN_PLACE = "in_place"              # Convert in place with locking

class FormatMigration:
    def __init__(self, source: str, target: str, dataset: str):
        self.source = source
        self.target = target
        self.dataset = dataset
        self.strategy = self._recommend_strategy()

    def _recommend_strategy(self) -> MigrationStrategy:
        if self._is_ctas_compatible():
            return MigrationStrategy.IN_PLACE
        elif self._has_downstream_consumers():
            return MigrationStrategy.DUAL_WRITE
        else:
            return MigrationStrategy.BACKFILL

    def _is_ctas_compatible(self) -> bool:
        return self.source in ("parquet", "orc") and self.target in ("parquet", "orc")

    def _has_downstream_consumers(self) -> bool:
        return True
```

### Dual Write Implementation

```python
class DualWriteFormatManager:
    def __init__(self, old_writer: DataWriter, new_writer: DataWriter):
        self.old = old_writer
        self.new = new_writer
        self.validation_results: list[ValidationResult] = []

    def write_dual(self, data: list[dict]):
        old_path = self.old.write(data)
        new_path = self.new.write(data)
        self.validate(old_path, new_path)

    def validate(self, old_path: str, new_path: str):
        old_count = self._count_records(old_path)
        new_count = self._count_records(new_path)
        match = old_count == new_count

        if not match:
            self.validation_results.append(ValidationResult(
                phase="dual_write",
                passed=False,
                discrepancy=f"Record count mismatch: old={old_count}, new={new_count}",
            ))
        else:
            self.validation_results.append(ValidationResult(
                phase="dual_write",
                passed=True,
                discrepancy=None,
            ))

    def switchover(self, min_validations: int = 100) -> bool:
        recent = self.validation_results[-min_validations:]
        pass_rate = sum(1 for r in recent if r.passed) / len(recent)
        return pass_rate >= 0.999
```

### Backfill Strategy

```python
from concurrent.futures import ThreadPoolExecutor

class BackfillManager:
    def __init__(self, source_path: str, target_format: str):
        self.source = source_path
        self.target_format = target_format
        self.executor = ThreadPoolExecutor(max_workers=8)

    def backfill(self, partition_col: str = None) -> BackfillReport:
        if partition_col:
            partitions = self._list_partitions(partition_col)
            futures = {
                self.executor.submit(self._convert_partition, p): p
                for p in partitions
            }
        else:
            future = self.executor.submit(self._convert_all)
            futures = {future: "all"}

        results = {}
        for future in as_completed(futures):
            partition = futures[future]
            try:
                result = future.result()
                results[partition] = result
            except Exception as e:
                results[partition] = {"error": str(e)}

        return BackfillReport(
            total_partitions=len(partitions) if partition_col else 1,
            succeeded=sum(1 for r in results.values() if "error" not in r),
            failed=sum(1 for r in results.values() if "error" in r),
            total_bytes_converted=sum(
                r.get("bytes", 0) for r in results.values()
            ),
        )
```

## Key Points

- Dual write strategy minimizes downtime for consumer-facing datasets
- Backfill converts historical data to new format in parallel
- In-place migration using CREATE TABLE AS SELECT for format-compatible engines
- Validate record counts and checksums during dual-write phase
- 99.9% pass rate threshold before switchover
- Partition-level backfill enables incremental migration
- Rollback plan required: keep old format data for 30 days post-migration
- Schema compatibility checking before migration execution
- Performance benchmark both formats before committing to migration
- Update all downstream references (table locations, catalog entries, pipelines)
