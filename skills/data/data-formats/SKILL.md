---
name: data-formats
description: >
  Use this skill when asked about Apache Arrow, Parquet, Avro, ORC, Arrow Flight, columnar storage, row-oriented storage, compression, schema evolution, data file format, columnar vs row-oriented, file format comparison, or data serialization. This skill enforces: columnar format selection based on access patterns, Parquet row group sizing and encoding optimization, Arrow in-memory format for analytical workloads, Arrow Flight for high-performance data transport, compression codec selection, and schema evolution compatibility. Do NOT use for: streaming data formats (Avro for Kafka), data modeling, or database storage engine design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, data-formats, parquet, arrow, columnar, phase-11]
---

# Data Formats

## Purpose
Design efficient data storage and transfer using Apache Arrow, Parquet, Avro, and ORC formats with appropriate compression, schema evolution strategies, and high-performance transport via Arrow Flight.

## Agent Protocol

### Trigger
Exact user phrases: "Apache Arrow", "Parquet", "Avro", "ORC", "Arrow Flight", "columnar", "row-oriented", "compression", "schema evolution", "file format", "data format", "columnar storage", "data serialization", "row group", "arrow table", "IPC format", "Flight SQL".

### Input Context
Before activating, verify:
- Data access patterns (full scan, column projection, row lookup, point queries)
- Storage target (S3, HDFS, local disk, memory, network transfer)
- Write patterns (append-heavy, overwrite partitions, streaming)
- Processing framework (Spark, DuckDB, pandas, Polars, Dremio, ClickHouse)
- Schema evolution requirements (add/drop/rename columns over time)
- Compression requirements (storage cost vs CPU cost)

### Output Artifact
Data format specification with file layout, encoding, compression, and schema configuration as SQL, YAML, and Python.

### Response Format
```sql
-- Parquet DDL with encoding and compression
```
```python
-- Arrow table construction and IPC
```
```yaml
-- File format configuration for Spark/DuckDB
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Format selection justified by access pattern and workload
- [ ] Parquet row group size and page size configured
- [ ] Compression codec selected with rationale
- [ ] Schema evolution strategy documented
- [ ] Arrow Flight endpoint designed for transport
- [ ] Encoding selection for efficiency (dictionary, RLE, delta)

### Max Response Length
4096

## Workflow

### Format Selection Guide

| Requirement | Columnar (Parquet, ORC) | Row-Oriented (Avro, JSON) | In-Memory (Arrow) |
|---|---|---|---|
| Access pattern | Column projection, full scan | Row-by-row, lookups | Analytical processing |
| Write pattern | Batch, append to partitions | Streaming, Kafka | In-process, batch |
| Compression ratio | High (column similarity) | Low-Medium | N/A (memory) |
| Schema evolution | Backward compatible | Full support | Requires copy |
| Zero-copy reads | No (file-based) | No | Yes |
| Inter-language | Any (file-based) | Any | C++, Python, R, Java, JS |
| Best for | Data lakes, analytics | Message queues, Kafka | Compute engines |

### Parquet Deep Configuration

Parquet is a columnar storage format optimized for analytical workloads. It organizes data into row groups, column chunks, and pages.

```sql
-- DuckDB: Parquet read/write with tuning
SELECT *
FROM read_parquet(
    's3://data-lake/events/',
    hive_partitioning = true,
    file_row_number = true,
    union_by_name = true
);

COPY analytics.events TO 's3://data-lake/events/'
    (FORMAT PARQUET,
     COMPRESSION ZSTD,
     ROW_GROUP_SIZE 1048576,   -- 1M rows per row group
     PER_THREAD_OUTPUT TRUE);
```

```yaml
# Spark: Parquet write configuration
spark:
  conf:
    spark.sql.parquet.compression.codec: "zstd"
    spark.sql.parquet.mergeSchema: "true"
    spark.sql.parquet.filterPushdown: "true"
    spark.sql.parquet.recordLevelFilter: "true"
    spark.sql.parquet.columnarReaderBatchSize: "4096"
    spark.sql.parquet.outputTimestampType: "TIMESTAMP_MICROS"
  write:
    format: "parquet"
    options:
      parquet.block.size: 268435456     # 256 MB row group
      parquet.page.size: 1048576        # 1 MB page
      parquet.dictionary.page.size: 1048576  # 1 MB dict page
      parquet.enable.dictionary: "true"
      parquet.writer.version: "v2"
```

```python
# PyArrow: Parquet file writing with advanced config
import pyarrow as pa
import pyarrow.parquet as pq

table = pa.Table.from_pydict({
    "order_id": pa.array(range(1000000), type=pa.int64()),
    "customer_id": pa.array(range(1000000), type=pa.int64()),
    "order_date": pa.array([b"2026-01-01"] * 1000000, type=pa.string()),
    "amount": pa.array([49.99] * 1000000, type=pa.float64()),
    "status": pa.array(["completed"] * 1000000, type=pa.dictionary(pa.int32(), pa.string())),
})

pq.write_table(
    table,
    "orders.parquet",
    row_group_size=1048576,           # 1M rows per row group
    version="2.6",
    compression="ZSTD",
    compression_level=22,
    data_page_size=1048576,            # 1 MB data pages
    write_statistics=["order_id", "customer_id", "order_date"],
    store_schema=True,
)
```

#### Row Group Sizing Guidelines

| Workload | Row Group Size | Pages per Group | Rationale |
|---|---|---|---|
| OLAP (full scan) | 512 MB - 1 GB | 32-128 | Maximize I/O throughput |
| OLAP (with filters) | 128 MB - 256 MB | 16-64 | Balance filter + scan |
| Point lookups | 16 MB - 64 MB | 4-16 | Minimize read amplification |
| Spark/Databricks | 256 MB - 512 MB | 32-64 | 1 block = 1 split |
| DuckDB local | 1 GB+ | 64-256 | Fast local I/O |

#### Encoding Selection

| Encoding | Best For | Data Type | Compression Ratio |
|---|---|---|---|
| Plain | No encoding | Any | 1x |
| Dictionary | Low cardinality (< 10K unique) | String, enum | 10-100x |
| RLE | Run-length repetitive | Boolean, status | 5-50x |
| Delta | Monotonic or sequential | Timestamp, ID | 2-5x |
| Delta-Binary-Packed | Random integers | Int32, Int64 | 1.5-3x |
| Byte Stream Split | Floating point | Float, Double | 1.5-2x |

### Apache Arrow In-Memory Format

Arrow defines a language-agnostic columnar memory layout for zero-copy data sharing.

```python
# PyArrow: Arrow table and IPC
import pyarrow as pa

# Define schema
schema = pa.schema([
    pa.field("order_id", pa.int64()),
    pa.field("customer_id", pa.int64()),
    pa.field("amount", pa.float64()),
    pa.field("status", pa.utf8()),
    pa.field("tags", pa.list_(pa.utf8())),
])

# Create Arrow table (zero-copy, columnar layout)
batch = pa.RecordBatch.from_pydict(
    {
        "order_id": [1, 2, 3],
        "customer_id": [100, 101, 102],
        "amount": [29.99, 49.99, 99.99],
        "status": ["completed", "pending", "completed"],
        "tags": [["electronics"], ["clothing"], ["electronics", "sale"]],
    },
    schema=schema,
)

table = pa.Table.from_batches([batch])

# Arrow IPC: zero-copy serialization
import pyarrow.ipc as ipc

sink = pa.BufferOutputStream()
writer = ipc.new_file(sink, schema)
writer.write_table(table)
writer.close()

buf = sink.getvalue()
# buf is a shared memory buffer ready for transport
```

```python
# Arrow IPC flight server (minimal)
import pyarrow.flight as flight

class AnalyticsFlightServer(flight.FlightServerBase):
    def __init__(self):
        super().__init__("grpc://0.0.0.0:8815")
        self.tables = {}

    def do_put(self, context, descriptor, reader, writer):
        table = reader.read_all()
        key = descriptor.path[0].decode()
        self.tables[key] = table
        writer.write(flight.Result(b"OK"))

    def do_get(self, context, ticket):
        key = ticket.ticket.decode()
        table = self.tables.get(key)
        if table is None:
            raise ValueError(f"Table {key} not found")
        return flight.RecordBatchStream(table)

# Client
client = flight.FlightClient("grpc://0.0.0.0:8815")
table = client.do_get(flight.Ticket(b"orders")).read_all()
print(f"Received {table.num_rows} rows")
```

### ORC (Optimized Row Columnar)

ORC is similar to Parquet with stronger ACID transaction support in Hive.

```sql
-- Hive/Spark: ORC table with ACID
CREATE TABLE analytics.events_orc (
    event_id STRING,
    user_id STRING,
    event_type STRING,
    event_date DATE,
    payload MAP<STRING, STRING>
)
STORED AS ORC
TBLPROPERTIES (
    'orc.compress' = 'ZLIB',
    'orc.compress.size' = '262144',
    'orc.stripe.size' = '268435456',
    'orc.row.index.stride' = '10000',
    'orc.create.index' = 'true',
    'orc.bloom.filter.columns' = 'event_type,event_date',
    'orc.bloom.filter.fpp' = '0.05',
    'transactional' = 'true',
    'transactional_properties' = 'insert_only'
);
```

### Avro Row-Oriented Format

Avro is best for streaming and message queue serialization.

```json
{
  "type": "record",
  "name": "OrderEvent",
  "namespace": "com.analytics.events",
  "doc": "Order event schema for Kafka",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "order_date", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "amount", "type": "double"},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record",
      "name": "OrderItem",
      "fields": [
        {"name": "sku", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "price", "type": "double"}
      ]
    }}},
    {"name": "status", "type": {"type": "enum", "name": "OrderStatus",
      "symbols": ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]}},
    {"name": "tags", "type": {"type": "array", "items": "string"}, "default": []}
  ]
}
```

### Schema Evolution Compatibility

| Change | Parquet | Avro | ORC | Arrow |
|---|---|---|---|---|
| Add column (nullable) | ✅ Backward | ✅ Backward | ✅ | ❌ |
| Add column (required) | ❌ | ❌ | ❌ | ❌ |
| Drop column | ❌ | ✅ Forward | ❌ | ❌ |
| Rename column | ❌ | ✅ (alias) | ❌ | ❌ |
| Widen type (int -> long) | ✅ | ✅ | ✅ | ❌ |
| Narrow type (long -> int) | ❌ | ❌ | ❌ | ❌ |
| Add default | ✅ (Parquet 2.x) | ✅ | ✅ | N/A |
| Reorder columns | ✅ | ❌ | ✅ | ✅ |

```sql
-- Parquet schema evolution: add nullable column
-- Both old files (without column) and new files work
CREATE TABLE analytics.orders (
    order_id BIGINT,
    customer_id BIGINT,
    amount DOUBLE,
    discount DOUBLE  -- nullable, added later
)
USING PARQUET
TBLPROPERTIES ('parquet.mergeschema' = 'true');
```

### Compression Codec Comparison

| Codec | Ratio | Speed (Write) | Speed (Read) | Splittable | Use Case |
|---|---|---|---|---|---|
| Snappy | 2x | ★★★★★ | ★★★★★ | Yes | General purpose, balance |
| Zstd | 3-5x | ★★★★ | ★★★★ | Yes | Best trade-off overall |
| Gzip | 3-5x | ★★★ | ★★★★ | Yes | Archival, high compression |
| LZ4 | 1.5-2x | ★★★★★ | ★★★★★ | Yes | Speed-critical, low CPU |
| LZO | 2x | ★★★★ | ★★★★★ | Yes | Legacy Hadoop |
| Brotli | 4-6x | ★★ | ★★★★ | Yes | Web, high compression |

```python
# Compression selection helper
import pyarrow.parquet as pq

def recommend_compression(data_size_gb: float, cpu_cores: int, storage_cost_gb_per_month: float) -> str:
    """Recommend compression codec based on trade-offs."""
    comp = {
        "snappy": {"ratio": 2.0, "speed": 5, "cpu_cost": 1},
        "zstd":  {"ratio": 4.0, "speed": 4, "cpu_cost": 2},
        "gzip":  {"ratio": 4.5, "speed": 3, "cpu_cost": 3},
        "lz4":   {"ratio": 1.8, "speed": 5, "cpu_cost": 1},
    }

    storage_cost_raw = data_size_gb * storage_cost_gb_per_month
    savings = {k: storage_cost_raw - storage_cost_raw / v["ratio"] for k, v in comp.items()}
    return max(savings, key=savings.get)

print(recommend_compression(1000, 16, 0.023))
# Likely "zstd" for most workloads
```

### Arrow Flight Protocol

Arrow Flight is a gRPC-based protocol for high-throughput data transfer using Arrow's columnar format.

```python
# Arrow Flight: DoExchange for bidirectional streaming
class FlightAnalyticsServer(flight.FlightServerBase):
    def do_exchange(self, context, descriptor, reader, writer):
        """Streaming query with row-level results."""
        for data in reader:
            table = data.data
            # Process streaming data
            result = self._process_query(table)
            writer.write_batch(result)

    def list_flights(self, context, criteria):
        """Discover available datasets."""
        for name, schema in self._catalog.items():
            yield flight.FlightInfo(
                schema,
                flight.FlightDescriptor.for_path(name),
                [],
                -1,  # unknown row count
                -1,  # unknown size
            )

# Client: Arrow Flight SQL query
client = flight.FlightClient("grpc://flight-server:8815")
info = client.get_flight_info(
    flight.FlightDescriptor.for_command(b"SELECT * FROM orders WHERE amount > 100")
)
reader = client.do_get(info.endpoints[0].ticket)
table = reader.read_all()
print(f"Result: {table.num_rows} rows, {table.num_columns} columns")
```

## Rules
- Use Parquet for analytical data lakes and columnar scans; Avro for streaming/Kafka; Arrow for in-memory computation
- Set row group size to match workload: 256 MB for Spark, 1 GB+ for DuckDB, 64 MB for point lookups
- Always compress Parquet/ORC with Zstd for the best ratio-speed trade-off
- Use dictionary encoding for string columns with cardinality < 10,000 unique values
- Enable `mergeSchema` for Parquet tables that evolve over time
- Use Arrow IPC for zero-copy data transfer within the same process or shared memory
- Use Arrow Flight for high-throughput remote data transfer (gRPC + columnar)
- Test schema evolution changes with existing files before production deployment
- Set statistics collection for filter columns to enable predicate pushdown
- Use RLE encoding for boolean and low-cardinality enum columns

## References
- `references/columnar-format-guide.md` — Parquet row group and page architecture, ORC stripe and index configuration, encoding selection (dictionary, RLE, delta, BPS), compression codec trade-offs, schema evolution strategy, and format comparison benchmarks
- `references/arrow-flight-protocol.md` — Arrow IPC format, Flight gRPC protocol, Flight SQL, DoExchange streaming, client/server patterns, authentication, and performance optimization

## Handoff
`data-streaming` for Kafka/Avro schema management and stream processing
`data-data-lake` for Parquet/ORC file organization in data lake storage
`data-data-lakehouse` for table format (Iceberg, Delta Lake, Hudi) integration
