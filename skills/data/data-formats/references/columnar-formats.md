# Columnar Formats Deep Dive Reference

## Parquet vs ORC vs Arrow

### Architecture Comparison

```
Parquet:
┌────────────────────────────────────┐
│  File                              │
│  ├── Row Group 1                   │
│  │   ├── Column Chunk (col1)       │
│  │   │   ├── Page 1 (Data Page)    │
│  │   │   ├── Page 2 (Dict Page)    │
│  │   │   └── ...                   │
│  │   ├── Column Chunk (col2)       │
│  │   └── ...                       │
│  ├── Row Group 2                   │
│  └── ...                           │
│  └── Footer (schema, stats, offsets)│
└────────────────────────────────────┘

ORC:
┌────────────────────────────────────┐
│  File                              │
│  ├── PostScript (file info)        │
│  ├── File Footer (schema, stats)   │
│  ├── Stripe 1                      │
│  │   ├── Index Data (row ranges)   │
│  │   ├── Row Data (columns)        │
│  │   └── Stripe Footer             │
│  ├── Stripe 2                      │
│  └── ...                           │
└────────────────────────────────────┘

Arrow (in-memory):
┌────────────────────────────────────┐
│  RecordBatch                       │
│  ├── Schema (field definitions)    │
│  ├── Column 1 (Array data)         │
│  │   ├── Validity bitmap           │
│  │   ├── Offsets (variable-length) │
│  │   └── Data buffer               │
│  ├── Column 2 (Array data)         │
│  └── ...                           │
└────────────────────────────────────┘
```

### Format Selection Guide

| Requirement | Parquet | ORC | Arrow |
|-------------|---------|-----|-------|
| Primary use | Disk storage | Disk storage (Hive) | In-memory processing |
| Read performance | Excellent (columnar) | Excellent (columnar) | Best (zero-copy) |
| Write performance | Good | Good | Best |
| Compression | Excellent (ZSTD, Snappy) | Excellent (ZLIB, ZSTD) | N/A (in-memory) |
| Schema evolution | Good (mergeSchema) | Good | Limited |
| ACID transactions | Via Iceberg/Delta | Native Hive ACID | N/A |
| Nested types | Good (repetition/definition levels) | Good | Good |
| Inter-language | Any (embedded libs) | Any (native readers) | C++, Python, Java, R, JS |
| Predicate pushdown | Statistics per column chunk | Built-in indexes | Manual filtering |
| Best engine | Spark, Presto, DuckDB | Hive, Spark | DataFrames (pandas, Polars) |

## Row Group Sizing

Row groups are horizontal partitions of a Parquet file. The optimal size depends on the workload.

### Sizing Guidelines

```yaml
row_group_sizing:
  spark:
    size: 256-512 MB
    rows: 1,000,000+
    rationale: "Aligns with Spark partition size; 1 row group = 1 task"
    config: "parquet.block.size=268435456"

  presto_trino:
    size: 128-256 MB
    rows: 500,000-1,000,000
    rationale: "Split detection for parallel reads"
    config: "parquet.block.size=134217728"

  duckdb:
    size: 512-1024 MB
    rows: 2,000,000+
    rationale: "Fast local I/O, larger groups reduce overhead"
    config: "row_group_size=1048576"

  point_lookups:
    size: 16-64 MB
    rows: 50,000-200,000
    rationale: "Minimize data read for point queries"
    config: "parquet.block.size=33554432"

  hive:
    size: 256 MB
    rows: 750,000
    rationale: "ORC stripe size default"
    config: "orc.stripe.size=268435456"
```

### Impact of Row Group Size

```
Small row groups (16-64 MB):
  + Better for point lookups and filters
  + Parallelism across more groups
  + Less memory per group
  - More overhead (more groups to read)
  - More metadata (more row group statistics)
  - More small files risk

Large row groups (256-1024 MB):
  + Better compression ratios
  + Less metadata overhead
  + Better full-scan performance
  - More memory per read
  - Less parallelism for small scans
  - Coarse filtering granularity
```

## Encoding

### Parquet Encoding Types

```yaml
encodings:
  plain:
    compression: ~1x
    best_for: "No encoding, raw values (fallback)"
    types: "Any"
    description: "Stores values as-is, no compression"

  dictionary:
    compression: 10-100x
    best_for: "Strings, enum, low-cardinality columns"
    types: "String, Int, small sets"
    description: "Builds dictionary of unique values, stores indices. Default for strings."
    spark: "parquet.enable.dictionary=true"

  rle:
    compression: 5-50x
    best_for: "Booleans, status flags, repeated values"
    types: "Boolean, Int (repetitive)"
    description: "Run-length encoding for consecutive identical values"

  delta:
    compression: 2-5x
    best_for: "Timestamps, sequential IDs, monotonic values"
    types: "Int64, Timestamp, Date"
    description: "Stores differences between consecutive values"

  delta_binary_packed:
    compression: 1.5-3x
    best_for: "Random integers, non-monotonic numeric"
    types: "Int32, Int64"
    description: "Widely used integer encoding in Parquet v2"

  byte_stream_split:
    compression: 1.5-2x
    best_for: "Floating point, doubles"
    types: "Float, Double"
    description: "Interleaves bytes by position for better compression"
```

### Encoding Selection by Data Type

```sql
-- PyArrow: configuring encoding per column
import pyarrow as pa
import pyarrow.parquet as pq

table = pa.table({
    "order_id": pa.array(range(1000000), type=pa.int64()),
    "status": pa.array(["completed"] * 1000000, type=pa.dictionary(pa.int32(), pa.utf8())),
    "amount": pa.array([49.99] * 1000000, type=pa.float64()),
    "description": pa.array(["order description"] * 1000000, type=pa.string()),
    "timestamp": pa.array([1000000] * 1000000, type=pa.timestamp('us')),
})

# Encoding is automatic in PyArrow but you can influence it:
pq.write_table(
    table,
    "orders.parquet",
    version="2.6",
    compression="ZSTD",
    row_group_size=1048576,
    write_statistics=["order_id", "status", "amount"],
    # Dictionary encoding auto-applied for string columns
    # Delta encoding auto-applied for sorted int64 columns
    # RLE encoded for boolean columns
)
```

## Statistics and Predicate Pushdown

Parquet stores min/max/null count statistics at multiple levels: file footer, row group, and page.

### Statistics Configuration

```sql
-- Spark: control statistics collection
spark.sql.parquet.filterPushdown=true
spark.sql.parquet.recordLevelFilter=true
spark.sql.parquet.columnarReaderBatchSize=4096

-- Enable statistics on write
-- PyArrow
pq.write_table(table, "file.parquet", write_statistics=["col1", "col2", "col3"])

-- Spark source configuration
spark
    .read
    .schema(schema)
    .option("parquet.readStatistics", "true")
    .parquet("s3://data/")
```

### How Predicate Pushdown Works

```sql
-- Query: customers with high value in 2026
SELECT * FROM orders
WHERE order_date >= '2026-01-01'
  AND amount > 1000;

-- Without predicate pushdown:
-- 1. Read all row groups
-- 2. Decompress all pages
-- 3. Filter rows

-- With predicate pushdown:
-- 1. Read row group statistics (min/max for order_date, amount)
-- 2. Skip row groups where order_date max < '2026-01-01'
-- 3. Skip row groups where amount max <= 1000
-- 4. Only read matching row groups
-- 5. Within row group, skip pages based on page-level stats
```

### Statistics Example

```
Row Group 1:
  order_date: min=2026-01-01, max=2026-01-15  →  INCLUDE
  amount: min=5.00, max=2500.00                →  INCLUDE

Row Group 2:
  order_date: min=2025-06-01, max=2025-12-31   →  SKIP (date < 2026)
  amount: min=10.00, max=5000.00               →  (skipped anyway)

Row Group 3:
  order_date: min=2026-02-01, max=2026-03-15   →  INCLUDE
  amount: min=0.50, max=950.00                 →  INCLUDE (max < 1000, but some may be > 1000...)

Wait — Row Group 3's max amount = 950 < 1000
  → SKIP Row Group 3 entirely (amount max <= 1000, so no rows match amount > 1000)

In practice: only Row Group 1 is scanned
```

## Rules
- Parquet for Spark/Presto; ORC for Hive; Arrow for in-memory computation
- Set row group size: 256 MB for Spark, 128 MB for Presto, 64 MB for point lookups
- Use dictionary encoding for strings with < 10K unique values
- Enable predicate pushdown for all columnar reads
- Collect statistics on filter columns for efficient pruning
- ZSTD compression for the best ratio-speed trade-off
- Use version 2.6 Parquet writer for latest encoding features
- Test encoding decisions with representative data samples
- Monitor compression ratio; poor ratio may indicate wrong encoding
- Enable Bloom filters on high-selectivity columns (ORC)
