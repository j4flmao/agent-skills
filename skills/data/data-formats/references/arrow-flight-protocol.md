# Arrow Flight Protocol

## Overview

Arrow Flight is a gRPC-based protocol for high-throughput transfer of Arrow columnar data between services. It enables zero-copy data transport with parallel streaming.

### Protocol Architecture

Arrow Flight defines five core RPCs:
1. **GetFlightInfo** — client requests metadata about a dataset (schema, endpoints)
2. **DoGet** — client downloads a dataset as a stream of RecordBatches
3. **DoPut** — client uploads a dataset as a stream of RecordBatches
4. **DoExchange** — bidirectional streaming for query/response patterns
5. **ListFlights** — discover available datasets
6. **GetSchema** — get schema without data transfer
7. **ListActions** — discover server-side actions

### Transport Layer

Flight uses gRPC for transport with HTTP/2. Each RPC streams Arrow RecordBatches using the Arrow IPC format. The gRPC message payload is a FlightData protobuf containing the IPC message and optional application metadata.

## Flight Server Implementation

### Minimal gRPC Flight Server

```python
import pyarrow as pa
import pyarrow.flight as flight

class DataFlightServer(flight.FlightServerBase):
    def __init__(self, location: str = "grpc://0.0.0.0:8815"):
        super().__init__(location)
        self._tables: dict[str, pa.Table] = {}
        self._schemas: dict[str, pa.Schema] = {}

    def do_put(self, context, descriptor, reader, writer):
        table = reader.read_all()
        key = descriptor.path[0].decode()
        self._tables[key] = table
        self._schemas[key] = table.schema
        writer.write(flight.Result(b"OK"))

    def do_get(self, context, ticket):
        key = ticket.ticket.decode()
        table = self._tables.get(key)
        if table is None:
            raise ValueError(f"Table {key} not found")
        return flight.RecordBatchStream(table)

    def list_flights(self, context, criteria):
        for name, schema in self._schemas.items():
            yield flight.FlightInfo(
                schema,
                flight.FlightDescriptor.for_path(name),
                [],
                self._tables[name].num_rows,
                -1,
            )

    def get_schema(self, context, descriptor):
        key = descriptor.path[0].decode()
        schema = self._schemas.get(key)
        if schema is None:
            raise ValueError(f"Schema {key} not found")
        return flight.SchemaResult(schema)


# Start server
server = DataFlightServer()
server.serve()
```

### Flight Client

```python
import pyarrow.flight as flight

class FlightClient:
    def __init__(self, location: str = "grpc://localhost:8815"):
        self.client = flight.FlightClient(location)

    def upload_table(self, name: str, table: pa.Table):
        descriptor = flight.FlightDescriptor.for_path(name)
        writer, _ = self.client.do_put(descriptor, table.schema)
        writer.write_table(table)
        writer.close()

    def download_table(self, name: str) -> pa.Table:
        descriptor = flight.FlightDescriptor.for_path(name)
        info = self.client.get_flight_info(descriptor)
        reader = self.client.do_get(info.endpoints[0].ticket)
        return reader.read_all()

    def list_datasets(self) -> list[str]:
        return [
            info.descriptor.path[0].decode()
            for info in self.client.list_flights()
        ]


# Usage
client = FlightClient()
client.upload_table("orders", orders_table)
result = client.download_table("orders")
```

## Arrow IPC Format

Arrow IPC (Inter-Process Communication) is the serialization format used by Flight. It defines a flatbuffer-based schema and record batch serialization.

### IPC Message Format

```
IPC Stream:
┌──────────────────────┐
│ IPC CONTINUATION     │  (identifies Arrow stream)
├──────────────────────┤
│ Schema message       │  (flatbuffer-encoded schema)
├──────────────────────┤
│ Dictionary batches   │  (dictionary values for dictionary columns)
├──────────────────────┤
│ RecordBatch 1        │  (columnar data)
├──────────────────────┤
│ RecordBatch 2        │
├──────────────────────┤
│ ...                  │
├──────────────────────┤
│ EOS                  │  (end of stream marker)
└──────────────────────┘
```

### Writing Arrow IPC Files

```python
import pyarrow as pa
import pyarrow.ipc as ipc

table = pa.Table.from_pydict({
    "order_id": [1, 2, 3],
    "amount": [100.0, 200.0, 300.0],
    "status": ["a", "b", "c"],
})

# Streaming format (for Flight and real-time)
sink = pa.BufferOutputStream()
writer = ipc.new_stream(sink, table.schema)
writer.write_table(table)
writer.close()
stream_bytes = sink.getvalue()

# File format (random-access, includes offsets)
sink = pa.BufferOutputStream()
writer = ipc.new_file(sink, table.schema)
writer.write_table(table)
writer.close()
file_bytes = sink.getvalue()

# Reading
reader = ipc.open_stream(stream_bytes)
table = reader.read_all()
```

## Flight SQL

Flight SQL extends Arrow Flight with SQL query capabilities:

```python
# Flight SQL client
from pyarrow.flight import FlightClient, Ticket, FlightDescriptor

client = FlightClient("grpc://flight-sql-server:8815")

# Execute SQL query
command = flight.sql.FlightSQL()
info = command.execute(client, "SELECT order_id, amount FROM orders WHERE amount > 100")

# Read results
reader = client.do_get(info.endpoints[0].ticket)
result_table = reader.read_all()

# Prepared statements
prepared = command.prepare(client, "SELECT * FROM orders WHERE order_id = ?")
prepared.set_parameters(1, pa.scalar(42, type=pa.int64()))
reader = client.do_get(prepared.execute().endpoints[0].ticket)
result = reader.read_all()
```

## Performance Optimization

### Parallel Endpoint Pattern

Flight supports partitioned reads where large datasets are split across multiple endpoints:

```python
# Server advertises multiple endpoints
def get_flight_info(self, context, descriptor):
    partition_count = 8
    endpoints = []
    for i in range(partition_count):
        ticket = flight.Ticket(f"orders_partition_{i}".encode())
        location = flight.Location.for_grpc_tcp("worker-node", 8815)
        endpoints.append(flight.FlightEndpoint(ticket, [location]))
    return flight.FlightInfo(
        schema=self._schemas["orders"],
        descriptor=descriptor,
        endpoints=endpoints,
        total_records=10000000,
        total_bytes=500000000,
    )

# Client reads partitions in parallel
import concurrent.futures

info = client.get_flight_info(descriptor)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    futures = [
        pool.submit(lambda ep: client.do_get(ep.ticket).read_all(), ep)
        for ep in info.endpoints
    ]
    tables = [f.result() for f in futures]
result = pa.concat_tables(tables)
```

### Compression

Flight supports gRPC compression at the transport level:

```python
# Enable compression (deflate)
client = flight.FlightClient(
    "grpc://localhost:8815",
    generic_options=[("grpc.default_compression_algorithm", 2)],  # 2=deflate
)

# Or use Arrow IPC compression within the stream
import pyarrow.ipc as ipc

options = ipc.IpcWriteOptions(
    compression=pa.Codec("ZSTD"),
)
sink = pa.BufferOutputStream()
writer = ipc.new_stream(sink, schema, options=options)
writer.write_batch(batch)
writer.close()
```

### Performance Benchmarks

| Scenario | Flight | gRPC Protobuf | REST JSON | TCP Socket |
|---|---|---|---|---|
| 1M rows, 10 columns | 0.8s | 4.2s | 28s | 1.1s |
| 10M rows, 50 columns | 12s | 58s | >5min | 15s |
| Throughput (single stream) | 3.2 GB/s | 480 MB/s | 45 MB/s | 2.1 GB/s |
| Throughput (8 streams) | 12 GB/s | 1.8 GB/s | 120 MB/s | 8 GB/s |
| Memory per row (10 cols) | 320 bytes | 520 bytes | 1.2 KB | 320 bytes |

## Authentication and Security

```python
# Server with authentication
class SecureFlightServer(flight.FlightServerBase):
    def authenticate(self, context, server_incoming, server_outgoing):
        token = server_incoming.read().to_pybytes().decode()
        if token == "valid_token":
            return b"session_token_abc"
        raise flight.FlightUnauthenticatedError("Invalid credentials")

    def do_get(self, context, ticket):
        # Verify authentication
        if context.peer_identity() is None:
            raise flight.FlightUnauthenticatedError("Not authenticated")
        return super().do_get(context, ticket)

# Client with authentication
client = flight.FlightClient("grpc://localhost:8815")
bearer_token = b"valid_token"
options = flight.FlightCallOptions(headers=[(b"authorization", bearer_token)])
reader = client.do_get(ticket, options=options)
```

## Common Patterns

### Micro-Batch Streaming

```python
# Server sends incremental results
class StreamingFlightServer(flight.FlightServerBase):
    def do_exchange(self, context, descriptor, reader, writer):
        for data in reader:
            batch: pa.RecordBatch = data.data
            processed = self._process_batch(batch)
            writer.write_batch(processed)
            # Client receives intermediate results in real-time
```

### Metadata Exchange

```python
# Embed application metadata in FlightData
custom_metadata = {
    "query_id": "abc-123",
    "elapsed_ms": "45",
    "partition_index": "0",
}
metadata = flight.FlightDescriptor.for_path("orders").to_flatbuffer()
# Metadata is sent alongside each RecordBatch
```
