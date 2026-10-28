# WebSocket Event Synchronization: Ordering, Resume, Snapshots and Optimistic Updates

Keeping clients consistent with server state over WebSockets requires more than broadcasting messages. Connections drop, messages arrive while a client is loading, and clients send conflicting edits. This reference covers sequence numbers, snapshot-plus-delta sync, resume after reconnect, idempotent application, and optimistic client updates. Reconnect timing/backoff is covered in `reconnection-strategy.md`.

## The Core Problem

```
t0 client fetches GET /board (state version 41)
t1 server applies change v42, broadcasts
t2 client opens WebSocket and subscribes   <- missed v42
t3 server broadcasts v43                    <- client applies v43 on v41: inconsistent
```

Fix: every event carries a position in an ordered stream, and clients subscribe from a known position.

## Event Envelope

```json
{
  "type": "card.moved",
  "stream": "board:123",
  "seq": 43,
  "eventId": "01JB8Z9K6Q3W8R5TQ1M2N4P7XY",
  "ts": "2026-10-27T10:15:00Z",
  "causationId": "client-op-7f3a",
  "data": { "cardId": "c9", "toColumn": "done", "position": 2 }
}
```

| Field | Purpose |
|-------|---------|
| `stream` | Ordering scope (per document/room/aggregate) |
| `seq` | Monotonic, gap-free per stream; assigned by the server at commit |
| `eventId` | Global unique ID for dedup |
| `causationId` | Links event to the client operation that caused it (for optimistic reconciliation) |

Order is only guaranteed per stream. Do not promise global ordering across streams.

## Assigning Sequence Numbers

Assign `seq` in the same transaction that changes state:

```sql
-- per-stream counter, incremented atomically with the change
UPDATE streams SET last_seq = last_seq + 1 WHERE id = $1 RETURNING last_seq;
INSERT INTO stream_events (stream_id, seq, type, data) VALUES ($1, $2, $3, $4);
```

Then publish via a transactional outbox (or log tailing/CDC) to the WebSocket fan-out layer. Publishing directly from request handlers after commit can lose events on crashes.

Alternatives: Redis Streams IDs, Kafka partition offsets (one partition per stream key), or event-store stream versions.

## Snapshot + Delta Subscription

```
1. Client: GET /boards/123            -> { state, version: 41 }
2. Client: WS subscribe { stream: "board:123", fromSeq: 42 }
3. Server: replays events 42..current from the event log, then streams live events
4. Client: applies events only if seq == lastApplied + 1
```

Server-side subscribe handler (TypeScript, `ws` style):

```typescript
async function handleSubscribe(socket: ClientSocket, stream: string, fromSeq: number) {
  await authorizeStream(socket.user, stream);                 // never trust client stream names
  socket.subscribe(stream);                                   // start buffering live events first
  const missed = await eventLog.read(stream, fromSeq, { limit: 1000 });
  if (missed.truncated) {
    return socket.send({ type: 'resync.required', stream });  // too far behind: refetch snapshot
  }
  for (const e of missed.events) socket.send(e);
  socket.flushBufferedAfter(stream, missed.lastSeq);          // drop buffered events <= lastSeq
}
```

Subscribing before reading history, then deduplicating by `seq`, avoids the gap between history read and live subscription.

## Client Application Rules

```typescript
class StreamState<S> {
  constructor(private state: S, private lastSeq: number,
              private apply: (s: S, e: Event) => S, private resync: () => Promise<void>) {}

  onEvent(e: Event) {
    if (e.seq <= this.lastSeq) return;                  // duplicate or old: ignore (idempotent)
    if (e.seq > this.lastSeq + 1) { void this.resync(); return; } // gap: request missing range or snapshot
    this.state = this.apply(this.state, e);
    this.lastSeq = e.seq;
  }
}
```

- Ignore events at or below `lastSeq`: delivery is at-least-once.
- On a gap, request the missing range (`fromSeq`) or fall back to a snapshot.
- Persist `lastSeq` (memory, or IndexedDB for offline apps) to resume after reconnect.

## Resume After Reconnect

On reconnect the client re-subscribes with `fromSeq = lastSeq + 1` for each stream. Server retention defines how far back resume works:

| Retention | Behavior |
|-----------|----------|
| Event log retained N hours/events | Resume within window; beyond it send `resync.required` |
| No retention (pure pub/sub) | Always refetch snapshot on reconnect |

Socket.IO v4 offers "connection state recovery" which replays missed packets for short disconnections (requires a compatible adapter); it does not replace application-level sequence handling for long gaps.

## Optimistic Updates

```
client op (opId=7f3a) -> apply locally as pending -> send command
server validates, commits as seq 44 with causationId=7f3a -> broadcast
client receives seq 44 with its causationId -> mark pending op confirmed
if server rejects -> roll back pending op and show error
```

Client approach: keep the confirmed state (from server events) and a queue of pending ops; render `confirmed + pending`. When an event with a pending op's `causationId` arrives, drop that op from the queue. Rebasing pending ops on top of new confirmed state avoids flicker.

## Conflict Handling

| Strategy | Fit |
|----------|-----|
| Server-authoritative validation with version check (`expectedVersion`) | Forms, boards, most business apps |
| Last-writer-wins per field with timestamps | Low-stakes settings |
| Operational Transformation | Collaborative text (central server) |
| CRDTs (Yjs, Automerge) | Collaborative editing, offline-first, peer sync |

For CRDT-based collaboration, the WebSocket carries CRDT updates; ordering and dedup are handled by the CRDT, and the server persists merged documents (e.g. Yjs with `y-websocket` or Hocuspocus).

## Delivery Semantics Summary

- Transport: TCP gives in-order delivery per connection, but messages in flight at disconnect are lost.
- Application: aim for at-least-once delivery with idempotent, sequence-checked application, giving effectively-once state.
- Acknowledgements from client to server (`ack { stream, seq }`) are useful when the server must know what the client has seen (notifications marked delivered).

## Backpressure and Large Catch-Ups

- Page replays (`limit`) and send `resync.required` beyond a threshold.
- Check `socket.bufferedAmount` (browser) or the server library's buffer size; slow consumers should be disconnected or downgraded to snapshot mode rather than buffering unbounded.
- Coalesce high-frequency updates (cursor positions, telemetry) by sending latest state at a fixed rate instead of every change.

## Testing

- Simulate disconnect mid-stream and assert no missing or duplicated application.
- Inject reordered and duplicated events into the client reducer.
- Concurrent writers to the same stream: verify gap-free `seq` and correct conflict responses.
- Property test: applying any delivery sequence with dedup/resync yields the same final state as the server.

## Checklist

- [ ] Per-stream monotonic `seq` assigned in the commit transaction
- [ ] Outbox or log-based publishing, not best-effort post-commit sends
- [ ] Subscribe-then-replay with dedup to close the snapshot gap
- [ ] Client ignores duplicates, detects gaps, resyncs
- [ ] Resume via `fromSeq` within a documented retention window
- [ ] Optimistic ops tracked by `causationId` and rolled back on rejection
- [ ] Bounded replays and slow-consumer handling
