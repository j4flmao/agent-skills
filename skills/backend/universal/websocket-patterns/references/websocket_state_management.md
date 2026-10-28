# WebSocket Server State Management at Scale

A WebSocket server holds long-lived connections, and with them state: who is connected, which rooms they joined, presence, per-connection buffers. This reference covers where that state should live, how to fan out across multiple nodes, presence tracking, connection lifecycle, and memory/backpressure limits.

## Kinds of State

| State | Lifetime | Where it should live |
|-------|----------|----------------------|
| Socket object, send buffer | Connection | Node memory (unavoidable) |
| Authenticated identity, scopes | Connection | Node memory, derived from token at handshake; re-validated on expiry |
| Room/topic subscriptions | Connection | Node memory + shared index if other nodes need it |
| Presence (who is online/where) | Seconds to minutes | Shared store with TTL (Redis) |
| Domain state (documents, chats) | Durable | Database / event log |
| Rate-limit counters | Seconds | Node memory per connection, or Redis per user |

Rule: anything another node or a restarted node needs must not live only in one node's memory.

## Multi-Node Fan-Out

Clients connect to different nodes; a message for room `board:123` must reach all of them.

```
             ┌──────── node A (clients 1,2 in board:123)
publisher ──►│ broker │
             └──────── node B (client 3 in board:123)
```

| Broker | Notes |
|--------|-------|
| Redis Pub/Sub | Simple, low latency, fire-and-forget (messages lost if a node is disconnected) |
| Redis Streams | Persistent, consumer groups, replay by ID |
| NATS / NATS JetStream | Subject-based routing; JetStream adds persistence |
| Kafka | Durable, high throughput; heavier for per-room routing |
| Managed services (AWS API Gateway WebSockets, Azure Web PubSub, Ably, Pusher) | Offload connection handling and fan-out |

Socket.IO: use an adapter (`@socket.io/redis-adapter` or `@socket.io/redis-streams-adapter`) so `io.to(room).emit()` reaches all nodes.

Plain `ws` with Redis Pub/Sub:

```typescript
import { createClient } from 'redis';
const pub = createClient({ url: process.env.REDIS_URL });
const sub = pub.duplicate();
await Promise.all([pub.connect(), sub.connect()]);

const rooms = new Map<string, Set<WebSocket>>();   // local index only

async function join(ws: WebSocket, room: string) {
  let set = rooms.get(room);
  if (!set) {
    set = new Set();
    rooms.set(room, set);
    await sub.subscribe(`room:${room}`, (msg) => {   // subscribe once per room per node
      for (const client of rooms.get(room) ?? []) {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
      }
    });
  }
  set.add(ws);
}

async function leave(ws: WebSocket, room: string) {
  const set = rooms.get(room);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    rooms.delete(room);
    await sub.unsubscribe(`room:${room}`);
  }
}

export const publish = (room: string, payload: unknown) => pub.publish(`room:${room}`, JSON.stringify(payload));
```

Each node subscribes only to rooms it has local members for, keeping broker traffic proportional to need.

## Sticky Sessions

- Native WebSockets stay on one connection once upgraded; load balancers need WebSocket support and adequate idle timeouts.
- Socket.IO with HTTP long-polling fallback requires sticky sessions (cookie or IP hash) because polling requests must hit the same node; or disable polling (`transports: ['websocket']`).
- Sticky routing by room (consistent hashing) can co-locate a room's members on one node, reducing fan-out, at the cost of uneven load.

## Presence

```typescript
// heartbeat-based presence with TTL
const PRESENCE_TTL_S = 60;

async function markOnline(userId: string, room: string, connId: string) {
  const key = `presence:${room}`;
  await pub.zAdd(key, { score: Date.now(), value: `${userId}:${connId}` });
  await pub.expire(key, PRESENCE_TTL_S * 2);
}

async function onlineUsers(room: string): Promise<string[]> {
  const key = `presence:${room}`;
  await pub.zRemRangeByScore(key, 0, Date.now() - PRESENCE_TTL_S * 1000);   // drop stale
  const members = await pub.zRange(key, 0, -1);
  return [...new Set(members.map((m) => m.split(':')[0]))];
}
```

- Track per connection (users may have several tabs/devices); a user is online if any connection is.
- Refresh on heartbeat; expire stale entries so crashed nodes do not leave ghosts.
- Debounce presence broadcasts (users flapping on bad networks).

## Connection Lifecycle

| Phase | Actions |
|-------|---------|
| Upgrade/handshake | Authenticate (token or cookie; check `Origin`), enforce per-user connection limits |
| Open | Register in local index, send initial state or ack |
| Heartbeat | Server pings at interval; terminate if no pong (detects half-open TCP) |
| Token expiry | Close with a policy code or request re-auth message; do not keep expired sessions open |
| Close | Remove from rooms and presence; release resources |
| Node shutdown | Stop accepting, send close frames (e.g. code 1012 service restart), let clients reconnect elsewhere with jitter |

Heartbeat with `ws`:

```typescript
wss.on('connection', (ws) => {
  (ws as any).isAlive = true;
  ws.on('pong', () => { (ws as any).isAlive = true; });
});
setInterval(() => {
  for (const ws of wss.clients) {
    if (!(ws as any).isAlive) { ws.terminate(); continue; }
    (ws as any).isAlive = false;
    ws.ping();
  }
}, 30_000).unref();
```

## Memory and Backpressure

- Per-connection memory: socket buffers, subscription sets, user context. Measure under load to size nodes.
- Check `ws.bufferedAmount` before sending; if above a threshold, drop non-critical messages, coalesce, or close the slow client.
- Cap message size (`maxPayload` in `ws`), messages per second per connection, rooms per connection.
- Avoid storing message history in node memory; use the event log.

## Scaling Out and Draining

- Scale on connection count and CPU/memory, not only requests per second.
- Deployment: drain nodes gradually; clients reconnect with randomized backoff to avoid thundering herds on the remaining nodes.
- Kubernetes: `terminationGracePeriodSeconds` long enough to close connections cleanly; a `preStop` hook to stop accepting new connections first.

## Observability

Metrics: active connections per node, joins/leaves per second, messages in/out, send buffer sizes, heartbeat terminations, broker publish latency, reconnect rate. Log connection IDs and user IDs (not tokens). See `websocket-monitoring.md`.

## Checklist

- [ ] Only connection-bound state in node memory
- [ ] Broker-backed fan-out across nodes; per-room subscription on demand
- [ ] Sticky sessions or websocket-only transport configured
- [ ] Presence per connection with TTL and debounced broadcasts
- [ ] Authenticated handshake, origin check, connection limits
- [ ] Heartbeats terminate dead connections
- [ ] Bounded buffers, payload size and rate limits
- [ ] Graceful drain on deploy with jittered client reconnects
