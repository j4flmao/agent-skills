# Data Serialization Patterns

## Serialization Framework Choice

Choosing the right serialization framework depends on performance, schema evolution, and ecosystem requirements.

### Serialization Comparison

```python
from enum import Enum
from dataclasses import dataclass

class SerializationFormat(Enum):
    AVRO = "avro"
    PARQUET = "parquet"
    ORC = "orc"
    ARROW = "arrow"
    PROTOBUF = "protobuf"
    THRIFT = "thrift"
    JSON = "json"
    MSGPACK = "msgpack"

@dataclass
class FormatCapabilities:
    schema_evolution: bool
    splittable: bool
    compressed: bool
    columnar: bool
    row_oriented: bool
    language_agnostic: bool
    human_readable: bool
    schema_required: bool

FORMAT_MAP = {
    SerializationFormat.AVRO: FormatCapabilities(
        schema_evolution=True, splittable=True, compressed=True,
        columnar=False, row_oriented=True, language_agnostic=True,
        human_readable=False, schema_required=True,
    ),
    SerializationFormat.PARQUET: FormatCapabilities(
        schema_evolution=True, splittable=True, compressed=True,
        columnar=True, row_oriented=False, language_agnostic=True,
        human_readable=False, schema_required=True,
    ),
    SerializationFormat.ARROW: FormatCapabilities(
        schema_evolution=False, splittable=False, compressed=True,
        columnar=True, row_oriented=False, language_agnostic=True,
        human_readable=False, schema_required=True,
    ),
}
```

### Serialization Pipeline

```python
class SerializationPipeline:
    def __init__(self, format_config: FormatConfig):
        self.format = format_config

    def serialize_batch(self, records: list[dict], schema: Schema) -> bytes:
        if self.format == SerializationFormat.PARQUET:
            return self._to_parquet(records, schema)
        elif self.format == SerializationFormat.AVRO:
            return self._to_avro(records, schema)
        elif self.format == SerializationFormat.ARROW:
            return self._to_arrow(records, schema)

    def _to_parquet(self, records: list[dict], schema: Schema) -> bytes:
        import pyarrow as pa
        import pyarrow.parquet as pq

        table = pa.Table.from_pylist(records, schema=pa.schema(schema))
        buf = pa.BufferOutputStream()
        pq.write_table(
            table, buf,
            row_group_size=self.format.row_group_size or 1024 * 1024,
            compression=self.format.compression or "zstd",
            write_statistics=True,
        )
        return buf.getvalue().to_pybytes()
```

### Hybrid Approach

```python
class HybridSerialization:
    def select_format(self, use_case: SerializationUseCase) -> SerializationFormat:
        mapping = {
            "streaming_kafka": SerializationFormat.AVRO,
            "batch_analytics": SerializationFormat.PARQUET,
            "in_memory_compute": SerializationFormat.ARROW,
            "ml_training": SerializationFormat.TFRecord,
            "api_response": SerializationFormat.JSON,
            "inter_service": SerializationFormat.PROTOBUF,
        }
        return mapping.get(use_case, SerializationFormat.JSON)
```

## Key Points

- Match serialization format to use case: streaming (Avro), analytics (Parquet), compute (Arrow)
- Schema evolution supported by Avro, Parquet, ORC; not by Arrow
- Columnar formats (Parquet, ORC, Arrow) better for analytical queries
- Row-oriented formats (Avro, JSON) better for ETL and streaming
- Compression ratio varies: ZSTD > Snappy > LZ4 > Gzip
- Hybrid approaches use different formats for different pipeline stages
- Schema registry integration required for evolution support
- Arrow zero-copy enables high-throughput in-memory processing
- Splittable formats (Parquet, Avro, ORC) enable parallel processing
- Consider ecosystem integration when choosing serialization framework
