---
name: backend-websocket-patterns
description: >
  Use this skill when the user says 'WebSocket', 'real-time', 'socket.io', 'WS connection', 'reconnection', 'WS rooms', 'broadcast', 'WS scaling', 'WS clustering', 'pub/sub over WS', 'SSE', 'Server-Sent Events', 'long polling', 'WS handshake', or when designing real-time communication. This skill enforces consistent WebSocket patterns: connection lifecycle, room management, reconnection strategies, message framing, and horizontal scaling. Applies to any backend stack. Do NOT use for: REST API design, gRPC streaming, message queue design, or frontend rendering.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, websocket, phase-2, universal]
---

# Backend WebSocket Patterns

## Purpose
Design consistent, production-grade WebSocket services. Every connection must follow the same conventions for handshake, message framing, room management, reconnection, error handling, and cross-node scaling.

## Agent Protocol

### Trigger
Exact user phrases: "WebSocket", "real-time", "socket.io", "WS connection", "reconnection", "WS rooms", "broadcast", "WS scaling", "WS clustering", "pub/sub over WS", "SSE", "Server-Sent Events", "long polling", "WS handshake", "design a WebSocket server".

### Input Context
Before activating, verify:
- The real-time feature being designed is known.
- The transport (raw WebSocket / Socket.IO / SSE) is chosen. If not, ask: "Raw WebSocket, Socket.IO, or SSE?"
- The scaling requirement (single node vs multi-node) is known.
- The authentication model is known.

### Output Artifact
No file output unless the user requests it. Produces WebSocket connection specs and message protocols as text.

### Response Format
For each message type:
```
Event: {event_name}
Direction: {client→server | server→client | bidirectional}
Payload: {schema reference}
Ack: {required/optional/none}
```

For a full connection spec:
```
## Connection
Endpoint: {ws/wss}://{host}/{path}
Auth: {mechanism}

## Messages
{list of message types}

## Lifecycle
{connection → auth → subscribe → message → disconnect}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Connection lifecycle (handshake, auth, heartbeat, teardown) is documented.
- [ ] Every message type has: event name, direction, payload schema, ack requirement.
- [ ] Reconnection strategy (backoff, max attempts, jitter) is defined.
- [ ] Room/subscription model is defined.
- [ ] Scaling strategy (sticky sessions vs external pub/sub) is documented.
- [ ] Error handling and disconnect scenarios are covered.

### Max Response Length
Per message type: 5 lines. Per connection spec: unlimited.

## Workflow

### Step 1: Choose Transport
```
Raw WebSocket:  minimal overhead, full control, no auto-reconnect, no fallback
Socket.IO:      rooms, namespaces, auto-reconnect, fallback to long-polling
SSE:            server→only, text-only, auto-reconnect via EventSource, no binary
```

### Step 2: Define Connection Lifecycle
```
1. TCP handshake → HTTP upgrade request
2. Auth verification (token in query param / first message / cookie)
3. Heartbeat established (ping/pong every N seconds)
4. Subscribe to rooms/channels
5. Message exchange
6. Graceful disconnect (close frame with code + reason)
```

### Step 3: Message Framing
Use a consistent JSON envelope for every message:
```json
{
  "event": "string",
  "data": {},
  "id": "uuid",
  "timestamp": "2026-05-18T10:00:00Z"
}
```

Ack response:
```json
{
  "event": "ack",
  "data": { "ackId": "uuid", "status": "ok" },
  "id": "uuid",
  "timestamp": "2026-05-18T10:00:01Z"
}
```

Error response:
```json
{
  "event": "error",
  "data": { "code": "INVALID_MESSAGE", "message": "Reason" },
  "id": "uuid",
  "timestamp": "2026-05-18T10:00:01Z"
}
```

### Step 4: Room / Subscription Model
```
JOIN room:{roomId}     → Subscribe to room events
LEAVE room:{roomId}    → Unsubscribe from room events

Server broadcasts:
  {event, data}        → All clients in room
  {event, data, except: [clientId]} → All clients except sender
```

Room metadata (track per room):
```
{ roomId, memberCount, metadata: {}, createdAt }
```

### Step 5: Reconnection Strategy
```
Exponential backoff with jitter:
  Attempt 1: 1s
  Attempt 2: 2s
  Attempt 3: 4s
  Attempt 4: 8s
  ...
  Max delay: 30s
  Max attempts: 10
  Jitter: ±50%

On reconnect:
  1. New handshake + auth
  2. Client sends resume with last received event ID
  3. Server replays missed events from buffer (configurable TTL)
```

### Step 6: Scaling Across Nodes
```
Single node:   direct in-memory map of sockets
Multi node:    external pub/sub (Redis, NATS, Kafka)
               + sticky sessions (if no external pub/sub)
               + OR: global adapter (Socket.IO Redis adapter)
```

Never trust sticky sessions alone for reliability. Always pair with external pub/sub.

## Rules
- Always use WSS (WebSocket over TLS) in production. Never WS.
- Every connection must have a heartbeat (ping/pong or application-level).
- Set a reasonable message size limit (e.g., 100KB) to prevent OOM.
- Never send raw unformatted data — use a consistent JSON envelope.
- Rate-limit messages per connection (e.g., 100 msg/s) to prevent abuse.
- Close connections that fail heartbeat N times (e.g., 3 missed pongs).
- Use close codes 1000 (normal), 1001 (going away), 1008 (policy violation), 1011 (internal error).
- Buffer messages for offline clients only up to a configurable TTL and limit.

## References
- `references/websocket-basics.md` — WebSocket protocol fundamentals
- `references/socket-io-patterns.md` — Socket.IO-specific patterns
- `references/reconnection-strategy.md` — Reconnection and resilience
- `references/ws-vs-sse.md` — WebSocket vs SSE comparison

## Handoff
No artifact produced unless requested.
Next skill: backend-message-queue — if real-time events need to be persisted or fanned out to other services.
Carry forward: message schemas, room model, auth mechanism, scaling strategy.
