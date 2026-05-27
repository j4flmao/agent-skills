# Distributed Compute Memory Management

## Memory Management in Distributed Compute

Efficient memory management is critical for distributed data processing performance.

### Execution Memory Model

```python
from dataclasses import dataclass
from enum import Enum

class MemoryRegion(Enum):
    RESERVED = "reserved"         # System overhead
    EXECUTION = "execution"       # Shuffle, joins, aggregations
    STORAGE = "storage"           # Cached data, broadcast variables
    USER = "user"                 # User-defined functions

@dataclass
class MemoryConfig:
    total_memory_gb: float
    reserved_pct: float = 0.2     # 20% reserved for system
    execution_pct: float = 0.5    # 50% for execution
    storage_pct: float = 0.2      # 20% for caching
    user_pct: float = 0.1         # 10% for UDFs

class MemoryManager:
    def __init__(self, config: MemoryConfig):
        self.config = config
        self.usage: dict[MemoryRegion, float] = {
            MemoryRegion.RESERVED: config.total_memory_gb * config.reserved_pct,
            MemoryRegion.EXECUTION: 0,
            MemoryRegion.STORAGE: 0,
            MemoryRegion.USER: 0,
        }

    def request_execution(self, amount_gb: float) -> bool:
        available = self._available(MemoryRegion.EXECUTION)
        if amount_gb <= available:
            self.usage[MemoryRegion.EXECUTION] += amount_gb
            return True
        # Spill to disk if execution memory exhausted
        return False

    def request_storage(self, amount_gb: float) -> bool:
        available = self._available(MemoryRegion.STORAGE)
        if amount_gb <= available:
            self.usage[MemoryRegion.STORAGE] += amount_gb
            return True
        # Evict cached blocks to free storage memory
        return self._evict_cache(amount_gb)
```

### Spill to Disk

```python
class SpillManager:
    def __init__(self, spill_directory: str, compression: bool = True):
        self.spill_dir = spill_directory
        self.compression = compression
        os.makedirs(spill_dir, exist_ok=True)

    def spill_data(self, data: pd.DataFrame, job_id: str) -> str:
        spill_path = f"{self.spill_dir}/{job_id}_{uuid.uuid4()}.parquet"
        data.to_parquet(spill_path, compression="zstd" if self.compression else None)
        return spill_path

    def read_spilled(self, spill_path: str) -> pd.DataFrame:
        return pd.read_parquet(spill_path)

    def clean_spills(self, job_id: str):
        for file in glob.glob(f"{self.spill_dir}/{job_id}_*"):
            os.remove(file)
```

## Tuning Guide

```python
class MemoryTuningGuide:
    @staticmethod
    def recommend_config(workload: WorkloadProfile) -> MemoryConfig:
        if workload.type == "etl":
            return MemoryConfig(
                total_memory_gb=workload.executor_memory,
                execution_pct=0.6,
                storage_pct=0.15,
                user_pct=0.05,
            )
        elif workload.type == "interactive":
            return MemoryConfig(
                total_memory_gb=workload.executor_memory,
                execution_pct=0.3,
                storage_pct=0.5,  # More cache for repeated queries
                user_pct=0.05,
            )
        elif workload.type == "ml_training":
            return MemoryConfig(
                total_memory_gb=workload.executor_memory,
                execution_pct=0.4,
                storage_pct=0.1,
                user_pct=0.3,  # More room for model data
            )
```

## Key Points

- Memory regions: reserved, execution, storage, user
- Execution memory for shuffle, joins, aggregations
- Storage memory for cached data and broadcast variables
- Spill to disk when execution memory exhausted
- Compression for spilled data reduces disk I/O
- Evict least-recently-used cache blocks for storage memory pressure
- Tune memory allocation by workload type: ETL (60% execution), interactive (50% cache), ML (30% user)
- Monitor spill ratio: >10% indicates memory pressure
- Off-heap memory for JVM-based frameworks
- Unified memory model enables borrowing between execution and storage
