# Data Versioning GC and Retention

## Garbage Collection and Retention

Versioned data accumulates historical versions that must be managed for storage efficiency.

### Retention Policies

```python
from enum import Enum
from datetime import datetime, timedelta

class RetentionPolicy(Enum):
    KEEP_ALL = "keep_all"              # Infinite retention
    KEEP_DAYS = "keep_days"            # Keep for N days
    KEEP_VERSIONS = "keep_versions"    # Keep last N versions
    KEEP_WITH_SNAPSHOT = "keep_with_snapshot"  # Keep until next snapshot

@dataclass
class DatasetRetention:
    dataset: str
    policy: RetentionPolicy
    value: int | None = None          # Days or versions
    exclude_tags: list[str] = None    # Protected versions

class RetentionEnforcer:
    def __init__(self, backend: VersioningBackend):
        self.backend = backend

    def apply_retention(self, dataset: str, policy: DatasetRetention):
        history = self.backend.get_history(dataset)

        if policy.policy == RetentionPolicy.KEEP_DAYS:
            cutoff = datetime.utcnow() - timedelta(days=policy.value)
            versions = [v for v in history if v.timestamp < cutoff]
            self._delete_versions(dataset, versions, policy.exclude_tags)

        elif policy.policy == RetentionPolicy.KEEP_VERSIONS:
            sorted_versions = sorted(history, key=lambda v: v.timestamp, reverse=True)
            excess = sorted_versions[policy.value:]
            self._delete_versions(dataset, excess, policy.exclude_tags)
```

### Garbage Collection

```python
class GarbageCollector:
    def __init__(self, backend: VersioningBackend):
        self.backend = backend
        self.stats: GCStats = GCStats()

    def run_gc(self, dataset: str = None):
        if dataset:
            self._gc_dataset(dataset)
        else:
            for ds in self.backend.list_datasets():
                self._gc_dataset(ds)

    def _gc_dataset(self, dataset: str):
        # Find unreferenced data files
        referenced = self.backend.get_referenced_files(dataset)
        all_files = self.backend.get_all_files(dataset)
        orphaned = [f for f in all_files if f not in referenced]

        # Delete orphaned files
        for file in orphaned:
            self.backend.delete_file(dataset, file)
            self.stats.deleted_files += 1

        # Compact small files
        small_files = [f for f in referenced if f.size_mb < self.min_file_size]
        if small_files:
            self.backend.compact_files(dataset, small_files)
            self.stats.compactions += 1

    def schedule_gc(self, interval_hours: int = 24):
        while True:
            time.sleep(interval_hours * 3600)
            self.run_gc()
```

## Key Points

- Retention policies: keep days, keep versions, keep-with-snapshot, keep all
- GC removes orphaned data files not referenced by any version
- File compaction merges small files for storage efficiency
- Versions older than retention window are candidates for deletion
- Protected tags exempt specific versions from GC
- Schedule GC runs daily during off-peak hours
- Monitor GC impact: deleted files, storage reclaimed
- Vacuum operations physically delete soft-deleted data
- Version metadata preserved even after data GC
- Cold storage tiering for older versions rather than deletion
