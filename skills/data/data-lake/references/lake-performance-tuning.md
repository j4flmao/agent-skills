# Data Lake Performance Tuning

## Query Performance Optimization

Data lake query performance depends on file layout, partitioning, and metadata optimization.

### Partitioning Strategy

```python
class PartitionOptimizer:
    def __init__(self, table_path: str):
        self.table_path = table_path

    def recommend_partitions(self, query_patterns: list[QueryPattern]) -> list[str]:
        column_frequency = {}
        for pattern in query_patterns:
            for col in pattern.filter_columns:
                column_frequency[col] = column_frequency.get(col, 0) + 1

        sorted_columns = sorted(
            column_frequency.items(),
            key=lambda x: x[1],
            reverse=True,
        )

        recommendations = []
        for col, freq in sorted_columns[:3]:
            cardinality = self._estimate_cardinality(col)
            if 10 <= cardinality <= 10000:
                recommendations.append(col)

        return recommendations

    def _estimate_cardinality(self, column: str) -> int:
        query = f"SELECT COUNT(DISTINCT {column}) FROM {self.table_path}"
        return execute(query)[0][0]
```

### File Compaction

```python
class FileCompactor:
    def __init__(self, spark_session):
        self.spark = spark_session

    def compact_table(
        self, table_path: str,
        target_file_size_mb: int = 256,
        max_files_per_partition: int = 10
    ):
        df = self.spark.read.format("delta").load(table_path)
        num_partitions = self._num_partitions(table_path)

        if num_partitions > max_files_per_partition:
            new_num_partitions = ceil(
                self._total_size_mb(table_path) / target_file_size_mb
            )
            df = df.coalesce(new_num_partitions)
            df.write \
                .format("delta") \
                .mode("overwrite") \
                .option("replaceWhere", "true") \
                .save(table_path)

    def _num_partitions(self, path: str) -> int:
        return len(glob.glob(f"{path}/*.parquet"))

    def _total_size_mb(self, path: str) -> float:
        total_bytes = sum(
            os.path.getsize(f) for f in glob.glob(f"{path}/*.parquet")
        )
        return total_bytes / (1024 * 1024)
```

### Statistics Collection

```python
class StatisticsManager:
    def collect_stats(self, table_path: str):
        stats_queries = {
            "row_count": f"SELECT COUNT(*) FROM {table_path}",
            "null_counts": f"""
                SELECT {', '.join(
                    f"SUM(CASE WHEN {c} IS NULL THEN 1 ELSE 0 END) AS {c}_nulls"
                    for c in self._get_columns(table_path)
                )}
                FROM {table_path}
            """,
            "min_max": f"""
                SELECT {', '.join(
                    f"MIN({c}) AS {c}_min, MAX({c}) AS {c}_max"
                    for c in self._get_columns(table_path)
                )}
                FROM {table_path}
            """,
            "ndv": f"""
                SELECT {', '.join(
                    f"COUNT(DISTINCT {c}) AS {c}_ndv"
                    for c in self._get_columns(table_path)
                )}
                FROM {table_path}
            """,
        }
        return {name: execute(q)[0] for name, q in stats_queries.items()}
```

## Key Points

- Partition on columns with 10-10K distinct values for optimal pruning
- Compact small files to target 256MB per file for efficient reads
- Collect and maintain statistics for query optimizer
- Z-order or Hive-style bucketing for high-cardinality columns
- Use file listing optimization with Delta/Iceberg manifests
- Predicate pushdown reduces data scanned per query
- Vectorized reads for Parquet/ORC improve scan throughput
- Avoid over-partitioning (thousands of partitions = overhead)
- Materialized snapshots for frequently queried aggregations
- Data skipping via min/max statistics at file and page level
