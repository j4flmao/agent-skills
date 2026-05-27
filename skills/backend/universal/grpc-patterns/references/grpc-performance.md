# gRPC Performance

## Overview
Optimize gRPC performance: connection management, streaming performance, message size, compression, deadline tuning, and benchmarking.

## Connection Management

```typescript
import * as grpc from '@grpc/grpc-js';

class ConnectionPool {
  private channels: Map<string, grpc.Channel> = new Map();
  private readonly maxChannels = 10;
  private readonly keepaliveMs = 300000; // 5 minutes
  private readonly keepaliveTimeoutMs = 20000; // 20 seconds

  getChannel(target: string): grpc.Channel {
    if (!this.channels.has(target)) {
      if (this.channels.size >= this.maxChannels) {
        // Close least recently used channel
        const oldest = this.channels.keys().next().value!;
        this.channels.get(oldest)!.close();
        this.channels.delete(oldest);
      }

      const channel = new grpc.Channel(target,
        grpc.ChannelCredentials.createSsl(),
        {
          'grpc.keepalive_time_ms': this.keepaliveMs,
          'grpc.keepalive_timeout_ms': this.keepaliveTimeoutMs,
          'grpc.keepalive_permit_without_calls': 1,
          'grpc.http2.max_pings_without_data': 0, // Allow pings even with no data
          'grpc.http2.min_time_between_pings_ms': 10000,
          'grpc.http2.min_ping_interval_without_data_ms': 5000,
        }
      );

      this.channels.set(target, channel);
    }

    return this.channels.get(target)!;
  }

  async shutdown(): Promise<void> {
    for (const channel of this.channels.values()) {
      channel.close();
    }
    this.channels.clear();
  }
}
```

## Streaming Performance

```typescript
class StreamingOptimizer {
  // Server streaming chat
  async chatStream(messages: AsyncIterable<ChatMessage>): Promise<void> {
    for await (const message of messages) {
      if (message.content.length > 4096) {
        // Large messages: compress and chunk
        const chunks = this.chunkMessage(message, 4096);
        for (const chunk of chunks) {
          await this.sendChunk(chunk);
          // Yield to event loop for backpressure
          await new Promise(resolve => setImmediate(resolve));
        }
      } else {
        await this.sendMessage(message);
      }
    }
  }

  // Flow control for bidirectional streaming
  async handleBidirectionalStream(
    call: grpc.ServerDuplexStream<Request, Response>
  ): Promise<void> {
    const highWaterMark = 100;
    let pendingCount = 0;

    call.on('data', async (request: Request) => {
      pendingCount++;

      if (pendingCount > highWaterMark) {
        call.pause(); // Apply backpressure
      }

      const response = await this.processRequest(request);
      call.write(response);
      pendingCount--;

      if (pendingCount <= highWaterMark && call.writableEnded === false) {
        call.resume();
      }
    });

    call.on('end', () => call.end());
  }
}
```

## Message Size Optimization

```typescript
class MessageOptimizer {
  // Compress large responses
  async compressResponse<T extends protobuf.Message>(response: T): Promise<Buffer> {
    const serialized = T.encode(response).finish();
    const compressed = await gzip(serialized);

    if (compressed.length < serialized.length) {
      return compressed;
    }
    return serialized; // Don't compress if it makes it larger
  }

  // Paginate large lists via server streaming
  async *paginateResults<T>(
    items: T[],
    pageSize = 100
  ): AsyncGenerator<T[]> {
    for (let i = 0; i < items.length; i += pageSize) {
      yield items.slice(i, i + pageSize);
      // Allow client to control flow via message consumption rate
    }
  }

  // Use field masks for partial responses
  applyFieldMask<T extends Record<string, unknown>>(
    message: T,
    paths: string[]
  ): Partial<T> {
    const result: Partial<T> = {};
    for (const path of paths) {
      if (path in message) {
        result[path as keyof T] = message[path];
      }
    }
    return result;
  }
}
```

## Deadline Configuration

```typescript
function configureDeadlines(): void {
  // Client-side deadline
  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + 30); // 30 second timeout

  // Per-RPC deadline
  client.getUser(
    { userId: '123' },
    { deadline },
    (error, response) => {
      if (error?.code === grpc.status.DEADLINE_EXCEEDED) {
        // Handle timeout — retry with backoff
        logger.warn('gRPC call timed out');
      }
    }
  );
}

// Deadline propagation (server forwarding to downstream services)
async function handleGetUser(
  call: grpc.ServerUnaryCall<GetUserRequest, User>,
  callback: grpc.sendUnaryData<User>
): Promise<void> {
  const remainingDeadline = call.getDeadline();
  if (remainingDeadline && remainingDeadline.getTime() < Date.now() + 5000) {
    callback({ code: grpc.status.DEADLINE_EXCEEDED, details: 'Not enough time to process' });
    return;
  }

  // Propagate deadline to downstream calls
  downstreamClient.getProfile(
    { userId: call.request.userId },
    { deadline: remainingDeadline },
    (error, profile) => {
      if (error) callback(error);
      else callback(null, { ...call.request, profile });
    }
  );
}
```

## Compression Configuration

```typescript
// Server: enable compression
import { compressionAlgorithms } from '@grpc/grpc-js';

function createCompressedServer(): grpc.Server {
  return new grpc.Server({
    compression: compressionAlgorithms.gzip,
    // Or use deflate for faster but slightly less compression
    // compression: compressionAlgorithms.deflate,
  });
}

// Client: request compression
function createClientWithCompression(): UserServiceClient {
  return new UserServiceClient(
    'api.example.com:443',
    grpc.credentials.createSsl(),
    {
      'grpc.default_compression_algorithm': 2, // gzip
      'grpc.default_compression_level': 2,      // medium
    }
  );
}
```

## Performance Benchmarks

```typescript
describe('gRPC Performance Benchmarks', () => {
  let server: grpc.Server;
  let client: UserServiceClient;

  beforeEach(async () => {
    server = new grpc.Server({ compression: compressionAlgorithms.gzip });
    // Start server, create client...
  });

  it('handles 1000 unary calls in under 5 seconds', async () => {
    const calls = Array.from({ length: 1000 }, (_, i) =>
      new Promise<void>((resolve, reject) => {
        client.getUser({ userId: String(i) }, (error) => {
          error ? reject(error) : resolve();
        });
      })
    );

    const start = Date.now();
    await Promise.all(calls);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
  });

  it('streams 10000 messages in under 2 seconds', async () => {
    const call = client.listUsers({});
    const messages: User[] = [];

    const start = Date.now();
    for await (const user of call) {
      messages.push(user);
    }
    const duration = Date.now() - start;

    expect(messages.length).toBe(10000);
    expect(duration).toBeLessThan(2000);
  });

  it('compression reduces payload size by >50%', async () => {
    const largePayload = { data: 'x'.repeat(100000) };
    const serialized = User.encode(largePayload).finish();
    const compressed = await gzip(serialized);

    expect(compressed.length).toBeLessThan(serialized.length * 0.5);
  });
});
```

## Key Points
- Use connection pooling with keepalive to maintain persistent connections
- Apply backpressure in bidirectional streaming when pending exceeds 100
- Compress messages with gzip when payload > compressible size
- Use server streaming for large result sets instead of single large messages
- Set deadlines on all RPCs and propagate to downstream calls
- Enable gzip compression at server and client level
- Batch metadata in headers rather than per-message
- Benchmark throughput: target 1000 unary calls under 5 seconds
