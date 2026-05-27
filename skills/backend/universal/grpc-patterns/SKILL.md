---
name: backend-grpc-patterns
description: >
  Use this skill when the user says 'gRPC', 'protobuf', 'protocol buffers', 'streaming RPC', 'unary call', 'server streaming', 'client streaming', 'bidirectional streaming', 'gRPC interceptor', 'gRPC error handling', 'protobuf schema', 'service definition', 'RPC design', or when designing gRPC APIs. This skill enforces consistent protobuf schema conventions, streaming patterns, interceptor chains, and structured error handling for gRPC services. Applies to any backend stack using gRPC. Do NOT use for: REST API design, GraphQL schema, message queue design, or frontend data fetching.
version: "1.0.0"
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

## Rules
- Never reuse field numbers in protobuf — even after deletion, reserve them.
- All RPCs must have a deadline/timeout. Server enforces it; client sets it.
- Always return `google.rpc.Status` for errors, never bare strings.
- Use `RESOURCE_EXHAUSTED` for rate limiting, not `PERMISSION_DENIED`.
- Always paginate list RPCs with cursor tokens, never offset/limit.
- Server-streaming calls must support a `cancel` mechanism at the application level.
- Deprecate fields with `[deprecated = true]`, do not remove them until the next major package version.
- Client-streaming and bidi RPCs must handle client disconnect gracefully.

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
