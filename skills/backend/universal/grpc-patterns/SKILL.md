---
name: backend-grpc-patterns
description: >
  Use this skill when the user says 'gRPC', 'protobuf', 'protocol buffers', 'streaming RPC', 'unary call', 'server streaming', 'client streaming', 'bidirectional streaming', 'gRPC interceptor', 'gRPC error handling', 'protobuf schema', 'service definition', 'RPC design', or when designing gRPC APIs. This skill enforces consistent protobuf schema conventions, streaming patterns, interceptor chains, and structured error handling for gRPC services. Applies to any backend stack using gRPC. Do NOT use for: REST API design, GraphQL schema, message queue design, or frontend data fetching.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, grpc, phase-2, universal]
---

# Backend gRPC Patterns

## Purpose
Design consistent, production-grade gRPC services. Every RPC must follow the same conventions for protobuf schemas, streaming patterns, interceptors, error handling, and service versioning.

## Agent Protocol

### Trigger
Exact user phrases: "gRPC", "protobuf", "protocol buffers", "streaming RPC", "unary call", "server streaming", "client streaming", "bidirectional streaming", "gRPC interceptor", "gRPC error handling", "protobuf schema", "service definition", "design an RPC", "gRPC contract".

### Input Context
Before activating, verify:
- The service or feature being designed is known.
- The proto package name and version are known.
- The streaming model (unary/server-stream/client-stream/bidi) is chosen. If not, ask: "What streaming model do you need?"
- The language/runtime for code generation is known.

### Output Artifact
No file output unless the user requests it. Produces protobuf schema and RPC specifications as text.

### Response Format
For each RPC:
```
rpc {MethodName}({RequestType}) returns ({ResponseType})
Streaming: {none/server/client/bidirectional}
Auth: {required/optional/none}
Deadline: {timeout suggestion}
Errors: {list of gRPC status codes}
```

For a full service definition:
```
service {ServiceName} {
  {list of RPCs}
}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] All protobuf packages follow the naming conventions below.
- [ ] Every RPC has: method signature, streaming type, auth requirement, deadline, error codes.
- [ ] Protobuf messages are versioned in the package name.
- [ ] Error responses use standard gRPC status codes with rich detail.
- [ ] All streaming RPCs include proper backpressure handling.
- [ ] Interceptor chain is documented.

### Max Response Length
Per RPC: 6 lines. Per service: unlimited.

## Decision Tree

### Which RPC Pattern?

```
What is the communication pattern?
  ├── Request → Response (standard CRUD)
  │   └── Unary RPC — simplest, HTTP/2 under the hood
  ├── Request → stream of events (subscribe, watch, notifications)
  │   └── Server-streaming RPC — send multiple responses for one request
  ├── Stream of requests → single response (batch upload, long-form input)
  │   └── Client-streaming RPC — aggregate client data into one result
  ├── Stream → stream (chat, real-time sync, gaming)
  │   └── Bidirectional streaming — full-duplex communication
  └── Fire-and-forget (event, notification, pub/sub)
      └── Consider message queue instead — gRPC streaming is for persistent connections
```

### When to Use gRPC vs REST vs Message Queue?

```
gRPC:               Internal service-to-service, low latency, high throughput
                    Streaming, real-time, bidirectional
                    Polyglot environments (codegen for many languages)
REST:               External/public APIs (browsers, mobile, third-party)
                    Simple CRUD, cacheable resources
                    When HTTP semantics matter (caching, content negotiation)
Message Queue:      Async communication, event-driven, fire-and-forget
                    When services must be decoupled in time
                    When you need guaranteed delivery, retries, DLQ
```

## Workflow

### Step 1: Choose Streaming Model
```
Unary:              request → response                    (standard CRUD)
Server-streaming:   request → stream<response>            (list, watch, subscribe)
Client-streaming:   stream<request> → response            (batch upload, long-form input)
Bidirectional:      stream<request> → stream<response>    (chat, real-time sync, gaming)
```

### Step 2: Define Protobuf Package and Version
```
syntax = "proto3";

package acme.users.v1;

option go_package = "github.com/acme/gen/go/users/v1;usersv1";
option java_package = "com.acme.users.v1";
```

### Step 3: Define Messages
Use proto3. Follow these rules:
- `message` names are PascalCase: `CreateUserRequest`, `UserResponse`.
- Field names are snake_case: `user_id`, `created_at`.
- Field numbers are dense starting at 1. Never reuse a field number.
- Use `google.protobuf.Timestamp` for time, not int64 or string.
- Use `google.protobuf.FieldMask` for partial updates.
- Use `google.protobuf.Empty` for void responses.
- `oneof` for mutually exclusive fields.
- `map` for key-value pairs (never for large datasets).

```protobuf
message CreateUserRequest {
  string name = 1;
  string email = 2;
  google.protobuf.Timestamp birth_date = 3;
  oneof contact_preference {
    string phone = 4;
    string telegram = 5;
  }
}
```

### Step 4: Standard RPC Patterns
```
// CRUD service
service UserService {
  rpc CreateUser(CreateUserRequest) returns (User);
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc UpdateUser(UpdateUserRequest) returns (User);
  rpc DeleteUser(DeleteUserRequest) returns (google.protobuf.Empty);
}

// Streaming service
service EventService {
  rpc Subscribe(SubscribeRequest) returns (stream Event);
  rpc Publish(stream PublishRequest) returns (PublishSummary);
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

### Step 5: Pagination for Streaming Lists
Server-streaming is preferred for large lists to avoid OOM:
```protobuf
message ListUsersRequest {
  string page_token = 1;    // opaque cursor, not a number
  int32 page_size = 2;      // max items to return
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;  // empty means no more
}
```

### Step 6: Error Handling
Always return standard gRPC status codes with rich detail via `google.rpc.Status`:

| gRPC Code | Number | When |
|-----------|--------|------|
| OK | 0 | Success |
| CANCELLED | 1 | Call cancelled by client |
| INVALID_ARGUMENT | 3 | Bad request input |
| DEADLINE_EXCEEDED | 4 | Timeout |
| NOT_FOUND | 5 | Resource not found |
| ALREADY_EXISTS | 6 | Duplicate resource |
| PERMISSION_DENIED | 7 | Auth failure |
| UNAUTHENTICATED | 16 | Missing credentials |
| RESOURCE_EXHAUSTED | 8 | Rate limited / quota |
| FAILED_PRECONDITION | 9 | System state wrong |
| ABORTED | 10 | Conflict (concurrent mutation) |
| INTERNAL | 13 | Unexpected server error |
| UNAVAILABLE | 14 | Service temporarily down |

Rich error detail:
```protobuf
import "google/rpc/error_details.proto";

message ErrorInfo {
  string reason = 1;
  string domain = 2;
  map<string, string> metadata = 3;
}
```

### Step 7: Interceptor Chain
Order matters — apply in this sequence:

```
Client side:
  1. Deadline/timeout interceptor (outermost)
  2. Auth token injection
  3. Tracing (OpenTelemetry span injection)
  4. Logging (request/response summary)
  5. Circuit breaker / retry (innermost)

Server side:
  1. Tracing (span creation) (outermost)
  2. Logging (request metadata)
  3. Auth validation (JWT, mTLS)
  4. Rate limiting
  5. Deadline enforcement (innermost)
```

```typescript
// gRPC server interceptor — auth + logging (Node.js)
import { ServerInterceptor, status } from '@grpc/grpc-js';

const authInterceptor: ServerInterceptor = (call, definition) => {
  const deadline = call.getDeadline();
  if (deadline && Date.now() > deadline.toMillis()) {
    call.emit('error', { code: status.DEADLINE_EXCEEDED, details: 'Deadline exceeded' });
    return;
  }
  const metadata = call.metadata;
  const token = metadata.get('authorization')[0] as string;
  if (!token) {
    call.emit('error', { code: status.UNAUTHENTICATED, details: 'Missing token' });
    return;
  }
  call.user = verifyToken(token);
  return new (definition as any)(call, definition);
};
```

```go
// gRPC server interceptor — logging (Go)
import (
  "google.golang.org/grpc"
  "google.golang.org/grpc/status"
)

func loggingUnaryInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
  start := time.Now()
  resp, err := handler(ctx, req)
  duration := time.Since(start)
  level := slog.LevelInfo
  if err != nil {
    level = slog.LevelError
  }
  slog.LogAttrs(ctx, level, "gRPC call",
    slog.String("method", info.FullMethod),
    slog.Duration("duration", duration),
    slog.String("status", status.Code(err).String()),
  )
  return resp, err
}
```

### Step 8: Streaming Implementation Patterns

Server-streaming with backpressure (Go):
```go
func (s *EventService) Subscribe(req *pb.SubscribeRequest, stream pb.EventService_SubscribeServer) error {
  // Backpressure: server controls send rate
  ch := s.eventBus.Subscribe(req.Topic)
  defer s.eventBus.Unsubscribe(req.Topic, ch)

  for {
    select {
    case event := <-ch:
      if err := stream.Send(event); err != nil {
        // Client disconnected or network error
        return err
      }
    case <-stream.Context().Done():
      // Client cancelled
      return stream.Context().Err()
    }
  }
}
```

Bidirectional streaming with flow control (Node.js):
```typescript
async function chat(call: ServerDuplexStream<ChatMessage, ChatMessage>) {
  call.on('data', (msg: ChatMessage) => {
    // Process incoming message
    // Use backpressure: call.write returns boolean (true = buffer ok, false = backpressure)
    const canWrite = call.write({
      id: msg.id,
      text: `Echo: ${msg.text}`,
      timestamp: now(),
    });
    if (!canWrite) {
      call.pause();  // Wait for drain event
      call.once('drain', () => call.resume());
    }
  });
  call.on('end', () => call.end());
}
```

### Step 9: Client-Side Patterns

```typescript
// gRPC client with deadline and retry
import { credentials, ServiceError } from '@grpc/grpc-js';

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const grpcErr = err as ServiceError;
      if (grpcErr.code === status.UNAVAILABLE && attempt < maxRetries - 1) {
        await delay(Math.pow(2, attempt) * 100);  // exponential backoff
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

const client = new UserServiceClient('localhost:50051', credentials.createInsecure());
const response = await callWithRetry(() => client.getUser({ userId: '123' }));
```

### Step 10: Service Versioning

```
Package version in proto:   acme.users.v1 → acme.users.v2
Never break existing v1 RPCs — add new RPCs in v2 or add fields to v1 messages
Field deprecation:
  string old_field = 3 [deprecated = true];
  // Add replacement field
  string new_field = 4;
Client migration: run both versions simultaneously, migrate clients one by one
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Timeouts | Every RPC must have a deadline. Server enforces; client sets |
| Connection management | Keep-alive pings (server: 1h idle, client: 30s). gRPC connection pooling |
| TLS | mTLS for inter-service. Use Kubernetes cert-manager or SPIFFE |
| Load balancing | Client-side load balancing (lookaside) or proxy (Envoy, Linkerd). Avoid random LB |
| Max message size | Default 4MB. Increase if needed, but prefer streaming for large payloads |
| Flow control | HTTP/2 flow control is automatic. Monitor `GOAWAY` frames for connection issues |
| Graceful shutdown | Drain connections: stop accepting, wait for in-flight, then shutdown |

## Performance

| Factor | Impact | Mitigation |
|--------|--------|-----------|
| Protobuf serialization | ~10x faster than JSON | Already using protobuf — good |
| Connection reuse | HTTP/2 multiplexing — many RPCs on one connection | Enable keep-alive |
| Message size | Large messages block the connection | Use streaming for >1MB |
| TLS handshake | Adds 1-3 RTT per connection | Connection pooling, HTTP/2 reduces connections |
| Reflection | Disable in production (security + startup perf) | Use proto descriptors, not reflection |

## Security

| Risk | Mitigation |
|------|-----------|
| No auth by default | Always require auth token in metadata. Use mTLS for inter-service |
| Reflection enabled in prod | Disable `grpc.reflection` in production |
| Large message DoS | Set `MaxReceiveMessageSize` (default 4MB, max 100MB) |
| Slow loris attack | Set `MaxConcurrentStreams` and connection timeouts |
| Unauthenticated streaming | Auth happens once at stream open — verify at reconnect |
| Metadata leaking secrets | Never log metadata (may contain tokens) |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Reusing field numbers | Removed field can be confused with new one | Always `reserved` removed fields |
| No deadlines | RPCs hang forever | Every RPC must set a deadline |
| Using int64 for timestamps | No timezone, no formatting | Use `google.protobuf.Timestamp` |
| Catching all errors as INTERNAL | Client cannot react appropriately | Return specific status codes |
| Streaming for single-item responses | Over-engineered, more complexity | Use unary |
| No backpressure in streaming | Server OOMs when client is slow | Respect `stream.Send()` return value |
| Blocking the event loop | gRPC uses async I/O — blocking starves the connection | Offload CPU work to thread pool |

## Rules
- Never reuse field numbers in protobuf — even after deletion, reserve them.
- All RPCs must have a deadline/timeout. Server enforces it; client sets it.
- Always return `google.rpc.Status` for errors, never bare strings.
- Use `RESOURCE_EXHAUSTED` for rate limiting, not `PERMISSION_DENIED`.
- Always paginate list RPCs with cursor tokens, never offset/limit.
- Server-streaming calls must support a `cancel` mechanism at the application level.
- Deprecate fields with `[deprecated = true]`, do not remove them until the next major package version.
- Client-streaming and bidi RPCs must handle client disconnect gracefully.
- Never use reflection in production.
- Always enable keep-alive pings on both client and server.
- Every interceptor must call the next handler exactly once.
- Use connection pooling for high-throughput scenarios.

## References
  - references/grpc-error-handling.md — gRPC Error Handling
  - references/grpc-interceptors.md — gRPC Interceptors
  - references/grpc-performance.md — gRPC Performance
  - references/grpc-security.md — gRPC Security
  - references/grpc-streaming.md — gRPC Streaming Patterns
  - references/grpc-testing.md — gRPC Testing
  - references/grpc-vs-rest.md — gRPC vs REST
  - references/protobuf-basics.md — Protocol Buffer Basics
## Handoff
No artifact produced unless requested.
Next skill: backend-message-queue — if the service needs async communication or event-driven patterns.
Next skill: backend-caching — if the service needs response caching or data store optimization.
Carry forward: protobuf schemas, service definitions, auth requirements, deadline configurations.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.