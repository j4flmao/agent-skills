---
name: backend-websocket-patterns
description: >
  Use this skill when the user says 'WebSocket', 'real-time', 'socket.io', 'WS connection', 'reconnection', 'WS rooms', 'broadcast', 'WS scaling', 'WS clustering', 'pub/sub over WS', 'SSE', 'Server-Sent Events', 'long polling', 'WS handshake', or when designing real-time communication. This skill enforces consistent WebSocket patterns: connection lifecycle, room management, reconnection strategies, message framing, and horizontal scaling. Applies to any backend stack. Do NOT use for: REST API design, gRPC streaming, message queue design, or frontend rendering.
version: "2.0.0"
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

## Decision Tree

### Which Transport?

```
What is your use case?
  ├── Bidirectional, need low latency, full control
  │   └── Raw WebSocket — minimal overhead, no auto-reconnect, no fallback
  ├── Bidirectional, need auto-reconnect, rooms, fallback
  │   └── Socket.IO — rooms, namespaces, auto-reconnect, long-polling fallback
  ├── Server→client only (notifications, stream updates)
  │   └── SSE (Server-Sent Events) — simpler, HTTP-native, auto-reconnect via EventSource
  └── Client needs to push AND receive, but SSE + POST is simpler
      └── SSE for server→client + POST for client→server (REST-like)
```

### Single Node vs Multi-Node?

```
How many instances?
  ├── Single instance (small app, dev, low traffic)
  │   └── In-memory socket map, no external deps
  ├── Multiple instances, sticky sessions available
  │   └── Sticky sessions + in-memory socket map (server affinity)
  ├── Multiple instances, no sticky sessions
  │   └── External pub/sub (Redis, NATS, Kafka) for cross-node broadcast
  └── Global scale, many regions
      └── Global pub/sub + edge WebSocket termination
```

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

### Step 7: Raw WebSocket Server Implementation (Node.js)

```typescript
import { WebSocketServer, WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  userId: string;
  rooms: Set<string>;
  lastPing: number;
}

class WSServer {
  private clients = new Map<string, Client>();
  private rooms = new Map<string, Set<string>>();
  private wss: WebSocketServer;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    setInterval(() => this.checkHeartbeat(), 30000);
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
    if (!token) { ws.close(4001, 'Unauthorized'); return; }

    const userId = verifyToken(token);
    if (!userId) { ws.close(4001, 'Invalid token'); return; }

    const client: Client = { ws, userId, rooms: new Set(), lastPing: Date.now() };
    const clientId = `${userId}-${uuidv4()}`;
    this.clients.set(clientId, client);

    ws.on('message', (data) => this.handleMessage(clientId, client, data));
    ws.on('close', () => this.handleDisconnect(clientId, client));
    ws.on('pong', () => { client.lastPing = Date.now(); });

    ws.send(JSON.stringify({ event: 'connected', data: { clientId } }));
  }

  private handleMessage(clientId: string, client: Client, data: WebSocket.RawData) {
    try {
      const msg = JSON.parse(data.toString());
      switch (msg.event) {
        case 'join':
          this.joinRoom(client, msg.data.roomId);
          break;
        case 'leave':
          this.leaveRoom(client, msg.data.roomId);
          break;
        case 'message':
          this.broadcastToRoom(msg.data.roomId, { event: 'message', data: { clientId, text: msg.data.text }, id: uuidv4(), timestamp: new Date().toISOString() }, clientId);
          break;
        default:
          client.ws.send(JSON.stringify({ event: 'error', data: { code: 'UNKNOWN_EVENT', message: `Unknown event: ${msg.event}` } }));
      }
    } catch (err) {
      client.ws.send(JSON.stringify({ event: 'error', data: { code: 'PARSE_ERROR', message: 'Invalid JSON' } }));
    }
  }

  private joinRoom(client: Client, roomId: string) {
    client.rooms.add(roomId);
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Set());
    this.rooms.get(roomId)!.add(client.ws as any);
  }

  private broadcastToRoom(roomId: string, message: object, exceptClientId?: string) {
    const clients = this.rooms.get(roomId);
    if (!clients) return;
    for (const [id, client] of this.clients) {
      if (id !== exceptClientId && client.rooms.has(roomId)) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  private checkHeartbeat() {
    const now = Date.now();
    for (const [id, client] of this.clients) {
      if (now - client.lastPing > 60000) {
        client.ws.terminate();
        this.clients.delete(id);
      }
    }
  }
}
```

### Step 8: Socket.IO Implementation

```typescript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const io = new Server({
  cors: { origin: process.env.CORS_ORIGIN },
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e5,  // 100KB max message
});

// Auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.data.user = verifyToken(token);
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.data.user.id}`);

  socket.on('join:room', (roomId) => socket.join(roomId));
  socket.on('leave:room', (roomId) => socket.leave(roomId));

  socket.on('message:room', (data) => {
    io.to(data.roomId).emit('message', {
      userId: socket.data.user.id,
      text: data.text,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { userId: socket.data.user.id });
  });
});

// Redis adapter for multi-node
const pub = createClient({ url: process.env.REDIS_URL });
const sub = pub.duplicate();
io.adapter(createAdapter(pub, sub));

io.listen(3001);
```

### Step 9: Heartbeat and Connection Health

```typescript
// Raw WebSocket heartbeat
const HEARTBEAT_INTERVAL = 25000;  // 25s
const HEARTBEAT_TIMEOUT = 10000;   // 10s grace period

function startHeartbeat(ws: WebSocket) {
  const interval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) { clearInterval(interval); return; }
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  ws.on('close', () => clearInterval(interval));
}

// Client-side heartbeat handler
ws.addEventListener('close', (event) => {
  if (event.code === 1006) {
    // Abnormal closure — attempt reconnect
    reconnect();
  }
});
```

### Step 10: Rate Limiting Per Connection

```typescript
class ConnectionRateLimiter {
  private limits = new Map<string, { count: number; resetAt: number }>();

  allow(clientId: string, maxPerSecond = 100): boolean {
    const now = Date.now();
    const entry = this.limits.get(clientId);
    if (!entry || now > entry.resetAt) {
      this.limits.set(clientId, { count: 1, resetAt: now + 1000 });
      return true;
    }
    if (entry.count >= maxPerSecond) return false;
    entry.count++;
    return true;
  }
}
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Connection limit per node | OS file descriptor limit. Set ulimit -n 65536. Monitor connection count |
| Memory per connection | ~50KB for idle WebSocket, ~100KB for Socket.IO. Plan RAM accordingly |
| Message throughput | Raw WS: ~100K msg/s per node. Socket.IO: ~10K msg/s per node |
| Sticky sessions | Required for Socket.IO without Redis. Use cookie-based or header-based affinity |
| Graceful shutdown | Drain connections: send close frame, wait for ack, then terminate |
| TLS termination | At load balancer (AWS ALB, Nginx, Envoy), not in application |

## Security

| Risk | Mitigation |
|------|-----------|
| Unauthorized connections | Auth token in handshake (query param, header, or first message) |
| Message injection | Validate and sanitize all message content server-side |
| Cross-origin WebSocket | Check Origin header against allowlist on upgrade |
| Message flooding | Rate limit per connection: 100 msg/s default |
| Sensitive data in broadcast | Verify room membership before sending. Never broadcast to all |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Broadcasting to all clients | Privacy leak, spam, security risk | Always broadcast to specific rooms |
| No heartbeat | Zombie connections accumulate | Ping/pong or application-level heartbeat |
| Sending raw strings | Cannot parse or validate consistently | Use JSON envelope with event type |
| No message size limit | OOM from large messages | Set 100KB max message size |
| Sticky sessions without fallback | Node failure drops all connections | Add external pub/sub for redundancy |
| Storing full message history in memory | Memory grows unbounded | Limit buffer to N messages per room with TTL |
| Blocking event loop in handler | All connections starve | Offload heavy processing to worker threads or queue |

## Rules
- Always use WSS (WebSocket over TLS) in production. Never WS.
- Every connection must have a heartbeat (ping/pong or application-level).
- Set a reasonable message size limit (e.g., 100KB) to prevent OOM.
- Never send raw unformatted data — use a consistent JSON envelope.
- Rate-limit messages per connection (e.g., 100 msg/s) to prevent abuse.
- Close connections that fail heartbeat N times (e.g., 3 missed pongs).
- Use close codes 1000 (normal), 1001 (going away), 1008 (policy violation), 1011 (internal error).
- Buffer messages for offline clients only up to a configurable TTL and limit.
- Always verify room membership before broadcasting.
- Never expose internal client IDs or socket IDs to unauthorized clients.
- Use external pub/sub (Redis) for multi-node deployments — never rely on sticky sessions alone.

## References
  - references/reconnection-strategy.md — Reconnection Strategy
  - references/socket-io-patterns.md — Socket.IO Patterns
  - references/websocket-auth.md — WebSocket Authentication
  - references/websocket-basics.md — WebSocket Basics
  - references/websocket-implementation.md — WebSocket Implementation Patterns
  - references/websocket-monitoring.md — WebSocket Monitoring
  - references/websocket-patterns.md — WebSocket Message Protocol
  - references/ws-vs-sse.md — WebSocket vs SSE (Server-Sent Events)
## Handoff
No artifact produced unless requested.
Next skill: backend-message-queue — if real-time events need to be persisted or fanned out to other services.
Carry forward: message schemas, room model, auth mechanism, scaling strategy.
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