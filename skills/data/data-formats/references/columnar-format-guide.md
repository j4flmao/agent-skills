# Columnar Format Guide

## Parquet Architecture

### File Layout

```
Parquet File
├── Magic Number (4 bytes: "PAR1")
├── Row Group 1
│   ├── Column Chunk 1 (order_id)
│   │   ├── Page 1 (Data Page)
│   │   ├── Page 2 (Data Page)
│   │   └── Page 3 (Dictionary Page)
│   ├── Column Chunk 2 (customer_id)
│   │   ├── Page 1 (Data Page)
│   │   └── Page 2 (Data Page)
│   └── Column Chunk 3 (amount)
│       └── Page 1 (Data Page)
├── Row Group 2
│   └── ...
├── Row Group N
├── Footer Metadata
│   ├── Schema (column names, types, encoding)
│   ├── Row group metadata (offsets, sizes, stats)
│   ├── Key-value metadata
│   └── Version info
└── Footer Length (4 bytes) + Magic Number (4 bytes: "PAR1")
```

### Row Group Optimization

Row groups are the unit of parallelism and I/O in Parquet. Each row group is independently readable.

```python
import pyarrow.parquet as pq
import pyarrow as pa

# Optimal row group sizing for different workloads
def write_parquet_optimized(
    table: pa.Table,
    path: str,
    workload: str = "analytics",
):
    configs = {
        "analytics": {      # Full scan OLAP
            "row_group_size": 1048576,   # 1M rows
            "data_page_size": 1048576,   # 1 MB
            "compression": "ZSTD",
            "compression_level": 22,
        },
        "filter_heavy": {   # Many WHERE clauses, few columns
            "row_group_size": 262144,    # 256K rows
            "data_page_size": 65536,     # 64 KB
            "compression": "ZSTD",
            "compression_level": 19,
        },
        "point_lookup": {   # Single row retrieval
            "row_group_size": 65536,     # 64K rows
            "data_page_size": 16384,     # 16 KB
            "compression": "LZ4",
        },
        "archival": {       # Maximum compression
            "row_group_size": 2097152,   # 2M rows
            "data_page_size": 2097152,   # 2 MB
            "compression": "GZIP",
            "compression_level": 9,
        },
    }

    config = configs.get(workload, configs["analytics"])
    pq.write_table(
        table,
        path,
        row_group_size=config["row_group_size"],
        data_page_size=config["data_page_size"],
        compression=config["compression"],
        compression_level=config.get("compression_level"),
        write_statistics=True,
        store_schema=True,
    )
```

### Statistics and Predicate Pushdown

Parquet stores min/max/null_count statistics at row group and page level. Query engines use these to skip entire row groups that don't match filters:

```python
# Enable optimal statistics for predicate pushdown
pq.write_table(
    table,
    "orders.parquet",
    row_group_size=262144,
    write_statistics=["order_id", "customer_id", "order_date", "status"],
    # Include frequently filtered columns
)

# Query engines can skip row groups where no page matches the filter
# For DuckDB:
# SELECT * FROM 'orders.parquet' WHERE order_date >= '2026-01-01'
# DuckDB checks row group stats first, skips those outside the date range
```

### Encoding Selection

```python
# PyArrow: schema-level encoding hints
import pyarrow as pa

schema = pa.schema([
    pa.field("order_id", pa.int64()),
    pa.field("status", pa.dictionary(pa.int32(), pa.utf8())),
    # Dictionary encoding: low cardinality strings
    pa.field("timestamp", pa.timestamp("us")),
    # Delta encoding: monotonic timestamps (auto-selected by Parquet)
    pa.field("amount", pa.float64()),
    # Byte Stream Split: floats (auto-selected by Parquet 2.x)
    pa.field("tags", pa.list_(pa.utf8())),
    # No special encoding for lists
])

table = pa.Table.from_pydict(
    {
        "order_id": range(100000),
        "status": ["completed"] * 90000 + ["pending"] * 10000,
        "timestamp": [1000000 + i for i in range(100000)],
        "amount": [float(i * 1.5) for i in range(100000)],
        "tags": [["a", "b"], ["c"]] * 50000,
    },
    schema=schema,
)

pq.write_table(table, "encoded_orders.parquet", version="2.6")
```

| Encoding | Write Speed | Read Speed | Compression Ratio | Ideal For |
|---|---|---|---|---|
| PLAIN | ★★★★★ | ★★★★★ | 1x | All types, low CPU |
| DICTIONARY | ★★★ | ★★★★★ | 10-100x | Low-cardinality strings (< 10K) |
| RLE | ★★★★★ | ★★★★ | 5-50x | Boolean, repeated values |
| DELTA_BINARY_PACKED | ★★★ | ★★★ | 2-5x | Integers with small variance |
| DELTA_LENGTH_BYTE_ARRAY | ★★★ | ★★★ | 2-5x | Strings with similar lengths |
| DELTA_BYTE_ARRAY | ★★ | ★★★ | 2-3x | Sorted strings |
| BYTE_STREAM_SPLIT | ★★★★ | ★★★★ | 1.5-2.5x | Floats, doubles |

### Compression Codec Selection

```python
# Benchmark compression trade-offs
import pyarrow.parquet as pq
import pyarrow as pa
import time

codecs = {
    "snappy": {"ratio": 2.0, "rank": 1},   # Best speed
    "zstd":   {"ratio": 3.8, "rank": 2},   # Best trade-off
    "gzip":   {"ratio": 4.5, "rank": 3},   # Best ratio
    "lz4":    {"ratio": 1.8, "rank": 4},   # Fastest
    "brotli": {"ratio": 4.8, "rank": 5},   # Max ratio
}

def benchmark_compression(table: pa.Table, codec: str) -> dict:
    start = time.time()
    path = f"bench_{codec}.parquet"
    pq.write_table(table, path, compression=codec, row_group_size=1048576)
    write_time = time.time() - start

    file_size = Path(path).stat().st_size
    raw_size = table.nbytes

    start = time.time()
    read_table = pq.read_table(path)
    read_time = time.time() - start

    return {
        "codec": codec,
        "raw_size_mb": raw_size / 1024 / 1024,
        "compressed_size_mb": file_size / 1024 / 1024,
        "ratio": raw_size / file_size,
        "write_speed_mbps": (raw_size / 1024 / 1024) / write_time,
        "read_speed_mbps": (raw_size / 1024 / 1024) / read_time,
    }

# Recommendation codec based on use case
def recommend_codec(
    storage_cost: float, cpu_cost: float, read_frequency: int
) -> str:
    """Recommend compression codec based on cost model."""
    if read_frequency > 1000:
        return "zstd"  # Balance of read speed and compression
    if storage_cost > cpu_cost * 10:
        return "brotli"  # Cheaper storage > expensive CPU
    if cpu_cost > storage_cost * 10:
        return "lz4"  # Cheaper CPU > expensive storage
    return "snappy"  # General purpose
```

## ORC Format

ORC is similar to Parquet with better ACID support in Hive:

```sql
-- ORC table with optimal configuration
CREATE TABLE analytics.log_events_orc (
    event_id BIGINT,
    session_id STRING,
    event_type STRING,
    event_timestamp TIMESTAMP,
    payload MAP<STRING, STRING>
)
STORED AS ORC
TBLPROPERTIES (
    'orc.compress.size' = '262144',
    'orc.stripe.size' = '268435456',      -- 256 MB stripes
    'orc.row.index.stride' = '10000',
    'orc.create.index' = 'true',
    'orc.bloom.filter.columns' = 'event_type',
    'orc.bloom.filter.fpp' = '0.05',
    'orc.compress' = 'ZSTD',
);

-- ORC vs Parquet size comparison
-- ORC with ZSTD: typically 10-15% smaller than Parquet
-- Parquet with ZSTD: typically faster reads due to better statistics
```

## Format Comparison Benchmarks

| Metric | Parquet | ORC | Avro | Arrow (IPC) |
|---|---|---|---|---|
| Compression ratio (ZSTD) | 4.2x | 4.5x | 2.1x | N/A |
| Write throughput (MB/s) | 120 | 90 | 200 | 800 |
| Read throughput (full scan) | 250 MB/s | 220 MB/s | 120 MB/s | 2 GB/s |
| Read throughput (column projection) | 500 MB/s | 450 MB/s | 120 MB/s | 2 GB/s |
| Schema evolution | Good | Good | Excellent | Poor |
| Predicate pushdown | Excellent | Excellent | None | N/A |
| ACID transactions | Via table format | Native in Hive | No | No |
| Language support | Universal | Hive/Spark heavy | Universal | C++, Python, R, Java, JS |

## Schema Evolution Best Practices

```python
# PyArrow: handle schema evolution when reading multiple Parquet files
import pyarrow.dataset as ds

# Read multiple Parquet files with potentially different schemas
dataset = ds.dataset(
    "s3://data-lake/orders/",
    format="parquet",
    partitioning=ds.partitioning(
        pa.schema([("year", pa.int16()), ("month", pa.int8())])
    ),
)

# Union schemas automatically (new columns appear as null)
table = dataset.to_table()
# If one file has 'discount' column and another doesn't,
# the result has 'discount' with nulls for older files

# Or use schema enforcement
projected_schema = pa.schema([
    pa.field("order_id", pa.int64()),
    pa.field("amount", pa.float64()),
    pa.field("discount", pa.float64()),
])
table = dataset.to_table(columns=projected_schema.names)
```

### Safe Schema Evolution Rules

1. **Always add columns as NULLABLE** — adding a required column breaks all existing files
2. **Never remove columns** — old files can't provide removed columns
3. **Only widen types** — int32 -> int64 is safe; int64 -> int32 is not
4. **Use `mergeSchema` or `union_by_name`** — Spark/DuckDB handles schema merging automatically
5. **Test schema changes** — read old files with new schema before deploying
6. **Version the schema** — store schema version in file metadata (`CREATED_WITH_SCHEMA_VERSION=2`)
