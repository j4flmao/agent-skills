# Polars DataFrame Library

## Architecture

### Columnar Execution
Polars is built on **Apache Arrow** — data is stored in columnar format natively (no row-based conversion). The query engine uses:
- **Predicate pushdown**: filters are pushed to the scan level
- **Projection pushdown**: only required columns are read from source
- **Vectorized execution**: SIMD operations on Arrow arrays
- **Morsel-driven parallelism**: data is split into chunks (morsels) for parallel processing

### API Modes
```python
import polars as pl

# Eager API (pandas-like, immediate execution)
df = pl.DataFrame({"x": [1, 2, 3], "y": [4, 5, 6]})
result = df.filter(pl.col("x") > 1).group_by("x").agg(pl.col("y").sum())

# Lazy API (query plan optimization, recommended for performance)
q = pl.scan_csv("orders.csv")
q = q.filter(pl.col("amount") > 100)
q = q.group_by("customer_id").agg(pl.col("amount").sum())
result = q.collect()  # Optimized execution plan runs here

# Streaming (out-of-core for datasets larger than RAM)
result = q.collect(streaming=True)
```

### Query Plan Optimization
```python
q = pl.scan_parquet("orders/*.parquet")
q = q.filter(pl.col("order_date") > "2024-01-01")
q = q.select(["customer_id", "amount"])
q = q.group_by("customer_id").agg(pl.col("amount").mean())
print(q.explain())  # Shows optimized query plan
# AGGREGATE
#   PARQUET SCAN orders/*.parquet
#     PROJECTION: customer_id, amount, order_date
#     PREDICATION: order_date > "2024-01-01"
```

## Common Patterns

### Expression API (vs pandas method chaining)
```python
# Pandas: method chaining
result = df[df['amount'] > 100].groupby('customer_id')['amount'].sum()

# Polars: composable expressions
result = df.filter(pl.col('amount') > 100).group_by('customer_id').agg(
    pl.col('amount').sum()
)

# Complex expressions in a single group_by
result = df.group_by('customer_id').agg([
    pl.col('amount').sum().alias('total'),
    pl.col('amount').mean().alias('avg'),
    pl.col('order_id').count().alias('order_count'),
    pl.col('created_at').min().alias('first_order'),
    pl.col('status').first().alias('latest_status'),
])
```

### Window Functions
```python
# Partitioned row numbers, ranks, lag/lead
df.with_columns([
    pl.col('amount').rank('dense').over('customer_id').alias('order_rank'),
    pl.col('amount').shift(1).over('customer_id').alias('prev_amount'),
    pl.col('amount').diff().over('customer_id').alias('amount_change'),
    pl.col('amount').rolling_mean(3).alias('rolling_3_avg'),
])
```

## I/O Performance

### Read Operations
```python
# Fastest: Parquet (predicate + projection pushdown)
df = pl.read_parquet('orders/*.parquet', columns=['order_id', 'amount'])

# CSV (multiple threads, streaming)
df = pl.read_csv_batched('orders.csv', batch_size=10000)

# Database (pandas → Polars zero-copy via Arrow)
import pandas as pd
df = pl.from_pandas(pd.read_sql("SELECT * FROM orders", conn))

# Direct from NumPy
df = pl.from_numpy(np_array)
```

## Streaming Mode (Out-of-Core)
```python
# Process dataset larger than RAM
q = pl.scan_csv('massive_dataset.csv')
q = q.filter(pl.col('value') > 0)
q = q.group_by('category').agg(pl.col('amount').sum())
result = q.collect(streaming=True)
# Streaming mode materializes data in chunks, spills to disk as needed
```

## Comparison with pandas

| Feature | pandas | Polars |
|---------|--------|--------|
| Backend | NumPy (row+columnar mixed) | Apache Arrow (pure columnar) |
| Parallelism | Single-threaded (mostly) | Multi-threaded (all operations) |
| Memory | High (copies frequently) | Lower (zero-copy, views) |
| API | Method chaining | Expression-based |
| Lazy eval | No | Yes (with full optimization) |
| Index | Yes (column + row labels) | No (position-based only) |
| GroupBy | `groupby().agg()` | `group_by().agg(exprs)` |
| Out-of-core | No | Yes (streaming mode) |
| String perf | Slow (object dtype) | Fast (Arrow string arrays) |
| Null handling | `NaN` / `NaT` / `None` | `null` (single type) |

### Migration Path
```python
# Instead of pandas operations, use Polars equivalents:
# pandas:
result = df.groupby('dept')['salary'].agg(['mean', 'std']).reset_index()
# polars:
result = df.group_by('dept').agg([
    pl.col('salary').mean(),
    pl.col('salary').std(),
])
```
