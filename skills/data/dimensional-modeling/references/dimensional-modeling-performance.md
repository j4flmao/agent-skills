# Dimensional Modeling Performance

## Query Performance Optimization

Dimensional models require specific optimization techniques for analytical query performance.

### Indexing Strategies

```python
class DimensionalIndexOptimizer:
    def optimize_fact_table(self, fact_table: str, dimensions: list[Dimension]):
        foreign_keys = [d.fk_column for d in dimensions if d.fk_column]
        date_key = [d.fk_column for d in dimensions if d.type == "date"][0]

        index_sql = f"""
        -- Bitmap indexes on low-cardinality foreign keys
        {self._bitmap_indexes(fact_table, foreign_keys)}

        -- Clustered index on date dimension for range queries
        CREATE INDEX idx_{fact_table}_date ON {fact_table}({date_key});

        -- Projection indexes for common query patterns
        CREATE MATERIALIZED VIEW mv_{fact_table}_daily AS
        SELECT {date_key},
               {', '.join(d.fk_column for d in dimensions if d.type != 'date')},
               COUNT(*) AS record_count,
               SUM(amount) AS total_amount
        FROM {fact_table}
        GROUP BY {date_key}, {', '.join(d.fk_column for d in dimensions if d.type != 'date')};
        """
        return index_sql

    def _bitmap_indexes(self, table: str, columns: list[str]) -> str:
        return "\n".join(
            f"CREATE BITMAP INDEX idx_{table}_{col} ON {table}({col});"
            for col in columns
        )
```

### Aggregation Management

```python
class AggregationDesigner:
    def __init__(self, query_patterns: list[QueryPattern]):
        self.patterns = query_patterns

    def recommend_aggregates(self) -> list[AggregateRecommendation]:
        recommendations = []
        for pattern in self.patterns:
            if pattern.frequency > 100 and pattern.rows_scanned > 1000000:
                agg = AggregateRecommendation(
                    name=f"agg_{pattern.name}",
                    grain=pattern.group_by_columns,
                    measures=pattern.measures,
                    estimated_size=self._estimate_size(pattern),
                    estimated_savings=pattern.rows_scanned * pattern.frequency,
                )
                recommendations.append(agg)

        recommendations.sort(key=lambda r: r.estimated_savings, reverse=True)
        return recommendations[:10]  # Top 10

    def _estimate_size(self, pattern: QueryPattern) -> int:
        cardinality = 1
        for col in pattern.group_by_columns:
            cardinality *= self._get_column_cardinality(col)
        return cardinality * len(pattern.measures) * 8  # ~8 bytes per measure
```

## Partitioning

```python
class PartitionDesigner:
    def design_partitioning(self, fact_table: str, date_column: str) -> str:
        return f"""
        CREATE TABLE {fact_table} (
            {self._get_fact_columns()}
        )
        PARTITION BY RANGE ({date_column})
        (
            PARTITION p_2023_01 VALUES LESS THAN ('2023-02-01'),
            PARTITION p_2023_02 VALUES LESS THAN ('2023-03-01'),
            PARTITION p_future VALUES LESS THAN (MAXVALUE)
        );
        """
```

## Key Points

- Bitmap indexes on low-cardinality foreign key columns
- Clustered index on date dimension for time-range queries
- Materialized views for common aggregation patterns
- Aggregate recommendations based on query frequency and scan volume
- Monthly partitioning for fact tables with partition pruning
- Top 10 aggregates cover ~60% of query workload
- Aggregate size estimation prevents storage surprises
- Partition elimination for date-filtered queries
- Covering indexes for dimension lookups
- Regular maintenance: statistics update, index rebuild, partition management
