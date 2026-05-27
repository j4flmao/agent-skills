# File Format Benchmarks

## Benchmark Methodology
File format selection impacts storage costs, query performance, and pipeline efficiency. Evidence-based benchmarks help make informed decisions.

## Benchmark Framework

### Test Configuration
```python
import time
import os
import pandas as pd
import pyarrow.parquet as pq
import pyarrow as pa

class FileFormatBenchmark:
    def __init__(self, data_dir="benchmark_data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.results = []

    def generate_test_data(self, row_count, column_types):
        """Generate benchmark data with specified characteristics."""
        data = {}
        for col_name, col_type in column_types.items():
            if col_type == "int":
                data[col_name] = range(row_count)
            elif col_type == "float":
                import numpy as np
                data[col_name] = np.random.randn(row_count)
            elif col_type == "string":
                import string
                words = ["apple", "banana", "cherry", "date", "elderberry"]
                data[col_name] = np.random.choice(words, row_count)
            elif col_type == "timestamp":
                base = pd.Timestamp("2024-01-01")
                data[col_name] = [base + pd.Timedelta(seconds=i) for i in range(row_count)]

        return pd.DataFrame(data)

    def benchmark_write(self, df, formats):
        """Benchmark write performance for different formats."""
        for fmt in formats:
            filepath = os.path.join(self.data_dir, f"test.{fmt}")
            start = time.time()

            if fmt == "parquet":
                df.to_parquet(filepath, compression="zstd")
            elif fmt == "csv":
                df.to_csv(filepath, index=False)
            elif fmt == "feather":
                df.to_feather(filepath)
            elif fmt == "orc":
                import pyarrow.orc as orc
                table = pa.Table.from_pandas(df)
                orc.write_table(table, filepath)

            duration = time.time() - start
            file_size = os.path.getsize(filepath)

            self.results.append({
                "format": fmt,
                "operation": "write",
                "duration_seconds": duration,
                "file_size_mb": file_size / 1024 / 1024,
                "row_count": len(df),
                "compression_ratio": df.memory_usage(deep=True).sum() / file_size
            })
            os.remove(filepath)

    def benchmark_read(self, formats):
        """Benchmark read performance scanning all columns."""
        for fmt in formats:
            filepath = os.path.join(self.data_dir, f"test.{fmt}")
            start = time.time()

            if fmt == "parquet":
                df = pd.read_parquet(filepath)
            elif fmt == "csv":
                df = pd.read_csv(filepath)
            elif fmt == "feather":
                df = pd.read_feather(filepath)
            elif fmt == "orc":
                import pyarrow.orc as orc
                table = orc.read_table(filepath)
                df = table.to_pandas()

            duration = time.time() - start
            self.results.append({
                "format": fmt,
                "operation": "read",
                "duration_seconds": duration,
                "row_count": len(df)
            })

    def benchmark_predicate_pushdown(self, formats, filter_column, filter_value):
        """Benchmark column pruning and predicate pushdown."""
        for fmt in formats:
            filepath = os.path.join(self.data_dir, f"test.{fmt}")
            start = time.time()

            if fmt == "parquet":
                df = pd.read_parquet(
                    filepath,
                    filters=[(filter_column, ">=", filter_value)],
                    columns=[filter_column, "id"]
                )
            elif fmt == "csv":
                df = pd.read_csv(filepath)
                df = df[df[filter_column] >= filter_value][[filter_column, "id"]]
            elif fmt == "feather":
                df = pd.read_feather(filepath)
                df = df[df[filter_column] >= filter_value][[filter_column, "id"]]

            duration = time.time() - start
            self.results.append({
                "format": fmt,
                "operation": "filtered_read",
                "duration_seconds": duration,
                "rows_returned": len(df)
            })

    def report(self):
        """Generate benchmark summary."""
        import json
        summary = {}
        for result in self.results:
            key = f"{result['format']}_{result['operation']}"
            if key not in summary:
                summary[key] = []
            summary[key].append(result["duration_seconds"])

        for key, durations in summary.items():
            import numpy as np
            print(f"{key}:")
            print(f"  Mean: {np.mean(durations):.3f}s")
            print(f"  Median: {np.median(durations):.3f}s")
            print(f"  P95: {np.percentile(durations, 95):.3f}s")
            print(f"  Min: {np.min(durations):.3f}s")
            print(f"  Max: {np.max(durations):.3f}s")
```

## Format Selection Guide

### Decision Matrix
| Requirement | Parquet | ORC | Avro | CSV | JSON |
|-------------|---------|-----|------|-----|------|
| Columnar access | ✓✓ | ✓✓ | ✗ | ✗ | ✗ |
| Compression ratio | ✓✓ | ✓✓ | ✓ | ✗ | ✗ |
| Schema evolution | ✓ | ✓ | ✓✓ | N/A | ✓ |
| Streaming support | ✗ | ✗ | ✓✓ | ✓ | ✓ |
| Human readable | ✗ | ✗ | ✗ | ✓✓ | ✓✓ |
| Splittable | ✓✓ | ✓✓ | ✓ | ✗ | ✓ |
| ML framework support | ✓✓ | ✓ | ✓ | ✓✓ | ✓ |
| Write performance | ✓ | ✓ | ✓✓ | ✓✓ | ✓ |

## Key Points
- Parquet offers the best combination of compression and query performance
- ORC is comparable to Parquet but more common in Hive/Tez ecosystems
- Avro is best for streaming and write-heavy workloads
- CSV/JSON should be avoided for analytical workloads
- Test with your specific data characteristics, not synthetic data
- Consider both write and read patterns when choosing formats
- Enable predicate pushdown for columnar formats
- Factor in tool and framework ecosystem compatibility
- Consider schema evolution requirements for long-lived data
- Benchmark with production-scale data volumes for accurate results
