# Compression and Encoding

## Compression Codecs
Choosing the right compression codec balances compression ratio, speed, and resource utilization for data warehouse and data lake workloads.

## Codec Comparison

### Performance Characteristics
| Codec | Ratio | Write Speed | Read Speed | CPU Usage | Use Case |
|-------|-------|-------------|------------|-----------|----------|
| ZSTD | High (3-5x) | Medium | Medium | Medium | General purpose, best overall |
| Snappy | Medium (2-3x) | Fast | Fast | Low | Write-heavy, real-time |
| Gzip | Very High (4-8x) | Slow | Slow | High | Archival, cold storage |
| LZ4 | Low (1.5-2x) | Very Fast | Very Fast | Very Low | Transient data, hot data |
| Brotli | Very High (5-10x) | Very Slow | Slow | Very High | HTTP compression, static files |

### ZSTD in Practice
```python
import zstandard as zstd

class ZstdCompressor:
    def __init__(self, level=3, threads=4):
        self.compressor = zstd.ZstdCompressor(level=level, threads=threads)
        self.decompressor = zstd.ZstdDecompressor()

    def compress_file(self, input_path, output_path):
        with open(input_path, "rb") as src, open(output_path, "wb") as dst:
            self.compressor.copy_stream(src, dst)

    def compress_parquet(self, df, output_path):
        df.to_parquet(output_path, compression="zstd", compression_level=3)

    def benchmark(self, data_size_mb=100):
        import time
        import numpy as np

        data = np.random.bytes(data_size_mb * 1024 * 1024)

        codecs = {
            "zstd": lambda d: zstd.compress(d, 3),
            "snappy": lambda d: snappy.compress(d),
            "gzip": lambda d: gzip.compress(d),
            "lz4": lambda d: lz4.block.compress(d),
        }

        results = {}
        for name, fn in codecs.items():
            start = time.time()
            compressed = fn(data)
            duration = time.time() - start
            results[name] = {
                "original_mb": len(data) / 1024 / 1024,
                "compressed_mb": len(compressed) / 1024 / 1024,
                "ratio": len(data) / len(compressed),
                "speed_mbps": (len(data) / 1024 / 1024) / duration
            }
        return results
```

## Encoding Strategies

### Dictionary Encoding
```python
def analyze_dictionary_encoding(series):
    """Analyze if a column is a good candidate for dictionary encoding."""
    unique_count = series.nunique()
    total_count = len(series)
    cardinality_ratio = unique_count / total_count

    return {
        "column": series.name,
        "unique_values": unique_count,
        "total_values": total_count,
        "cardinality_ratio": cardinality_ratio,
        "recommended": cardinality_ratio < 0.1,
        "explanation": (
            "Good for dictionary encoding" if cardinality_ratio < 0.1
            else "High cardinality, consider plain encoding"
        )
    }
```

### Run-Length Encoding (RLE)
```python
def analyze_rle_efficiency(series):
    """Analyze if sorted data benefits from RLE encoding."""
    sorted_series = series.sort_values()
    runs = 0
    prev = None
    run_lengths = []

    for val in sorted_series:
        if val != prev:
            runs += 1
            if prev is not None and run_lengths:
                run_lengths.append(runs)
            runs = 1
        else:
            runs += 1
        prev = val

    run_lengths.append(runs)

    return {
        "column": series.name,
        "total_values": len(series),
        "total_runs": len(run_lengths),
        "avg_run_length": np.mean(run_lengths),
        "max_run_length": max(run_lengths),
        "compression_factor": len(series) / len(run_lengths),
        "rle_efficient": len(run_lengths) < len(series) / 10
    }
```

### Delta Encoding
```python
def delta_encode(values):
    """Encode as differences between consecutive values."""
    encoded = [values[0]]
    for i in range(1, len(values)):
        encoded.append(values[i] - values[i - 1])
    return encoded

def delta_decode(encoded):
    """Decode delta-encoded values."""
    decoded = [encoded[0]]
    for i in range(1, len(encoded)):
        decoded.append(decoded[i - 1] + encoded[i])
    return decoded
```

## Codec Selection Guide

### By Use Case
| Use Case | Recommended Codec | Rationale |
|----------|------------------|-----------|
| Hot data (frequent queries) | Snappy or LZ4 | Fast decompression for query performance |
| Warm data (occasional queries) | ZSTD level 3 | Good balance of speed and compression |
| Cold data (rare queries) | Gzip or ZSTD level 9 | Maximum compression for cost savings |
| Streaming data | Snappy | Low latency compression |
| Data transfer | ZSTD level 1 | Fast compression/decompression |

### Parquet Configuration
```python
import pyarrow as pa
import pyarrow.parquet as pq

parquet_write_options = {
    "compression": "zstd",
    "compression_level": 3,
    "row_group_size": 1024 * 1024,  # 1M rows per group
    "data_page_size": 1024 * 1024,  # 1MB data pages
    "dictionary_page_size": 512 * 1024,  # 512KB dictionary pages
    "use_dictionary": True,
    "write_statistics": True,
    "version": "2.6"
}

def write_optimized_parquet(df, path):
    table = pa.Table.from_pandas(df)
    pq.write_table(table, path, **parquet_write_options)
```

## Key Points
- ZSTD is the best general-purpose compression codec for data lakes
- Use Snappy or LZ4 for write-heavy and streaming workloads
- Dictionary encoding works best for low-cardinality columns
- RLE is efficient when data is sorted with long runs of identical values
- Delta encoding is ideal for monotonically increasing values (timestamps, IDs)
- Enable column statistics in Parquet for predicate pushdown
- Configure row group and page sizes based on access patterns
- Test compression with representative data samples
- Consider the read-to-write ratio when selecting codecs
- Use higher compression levels for archival and cold storage
