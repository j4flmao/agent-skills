# gRPC Streaming Patterns

## Streaming Types

### Unary (Standard RPC)
```
Client → single request → Server → single response
```
Use for: CRUD, auth, lookups, any request-response where the response fits in memory.

```protobuf
rpc GetUser(GetUserRequest) returns (User);
```

### Server-Streaming
```
Client → single request → Server → stream of responses
```
Use for: list endpoints, watch/subscribe, event feeds, real-time notifications.

```protobuf
rpc ListUsers(ListUsersRequest) returns (stream User);
rpc WatchUser(WatchUserRequest) returns (stream UserEvent);
```

Key considerations:
- Client can cancel at any time → server must check `Context().Err()`.
- Server controls flow rate — use `time.Sleep` or backpressure tokens.
- Each message should be small. For large payloads, batch into chunks.
- Set `MaxRecvMsgSize` on both client and server to avoid OOM on streaming.

### Client-Streaming
```
Client → stream of requests → Server → single response
```
Use for: batch upload, long-form input, sensor data aggregation.

```protobuf
rpc UploadLogs(stream LogEntry) returns (UploadSummary);
rpc AggregateMetrics(stream Metric) returns (AggregateResult);
```

Key considerations:
- Client signals end of stream by closing the send side.
- Server must buffer or process incrementally to avoid OOM.
- Set deadlines even for streaming RPCs.

### Bidirectional Streaming
```
Client → stream of requests ↔ Server → stream of responses
```
Use for: chat, real-time game state, collaborative editing, streaming data sync.

```protobuf
rpc Chat(stream ChatMessage) returns (stream ChatMessage);
rpc SyncData(stream SyncRequest) returns (stream SyncResponse);
```

Key considerations:
- Client and server streams are independent — each side reads/writes at its own pace.
- Use goroutines (or language equivalent) to handle concurrent read/write.
- Coordinate lifecycle — both sides must agree on when the stream ends.
- Implement application-level keepalive (ping/pong messages).

## Error Handling in Streams
```
Server-side stream error:
  - Send error as a message in the stream, then close with error status.
  - Client: check stream.Recv() error for status code.

Client-side stream error:
  - Client closes send stream with error.
  - Server: check Recv() error, clean up resources.
```

## Flow Control and Backpressure
```
gRPC uses HTTP/2 flow control at the transport layer.
  - Initial window size: 65535 bytes (configurable via initial_window_size).
  - Each side maintains a flow control window.

For large streaming:
  - Increase initial window size for high-throughput streams.
  - Monitor pending data in the flow control window.
  - Use smaller message sizes to improve flow control granularity.
```

## Deadlines and Cancellation
```go
// Client sets deadline
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
stream, err := client.Chat(ctx)

// Server checks cancellation
select {
case <-ctx.Done():
    return ctx.Err()  // canceled or deadline exceeded
default:
    // continue processing
}
```

## Pattern: Server-Streaming Pagination
```protobuf
rpc ListOrders(ListOrdersRequest) returns (stream Order);

message ListOrdersRequest {
  string page_token = 1;  // opaque cursor, empty for first page
  int32 page_size = 2;    // max items to return (server may return less)
}
```

Server sends pages as stream messages. Client sends new `page_token` in a follow-up request. This avoids large in-memory pages while keeping the streaming contract.

## Pattern: Watch / Subscribe
```protobuf
rpc WatchUser(WatchUserRequest) returns (stream UserEvent);

message WatchUserRequest {
  string user_id = 1;
}

message UserEvent {
  string event_type = 1;  // "updated", "deleted", "suspended"
  User user = 2;
  int64 sequence_number = 3;  // for ordering and replay
}
```

Client reconnects on disconnect, sending last `sequence_number` to resume from where it left off.
