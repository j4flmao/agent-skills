---
title: Reliable Event Queue
description: Reliable ordered event delivery, ACKs, replay-on-disconnect, dedup and priorities for important gameplay events.
---

# Event Queue — Deep Reference

## 1. State vs Event Revisited

- **Replicated state**: latest-wins (UDP-unreliable). Loss harmless.
- **Reliable events**: "you picked the sword", "the flag fell", "you won" — must arrive once, in order, exactly.

Rule of thumb: if the world would be wrong without it → reliable event. Everything else → state.

## 2. The Event Queue Design

```cpp
struct NetEvent { uint32 id; uint32 kind; uint8 flags; bytes payload; };
// per connection:
deque<NetEvent> outQueue;       // pending, unacked
std::unordered_map<uint32,Tick> inOrderedBuf; // out-of-order hold
uint32 lastSentSeq; uint32 lastAck;
```

- Events appended by any system (`eEvents.Push(cxn, kind, data)`).
- Sender batch: up to N events per packet (with seq).
- Receiver: buffer out-of-order events; process in seq order when a gap fills (or a timeout forces skip + request).

## 3. Ordering & Dedup

- Each event has a global `seq` per connection (or per-match for broadcast events).
- Duplicates: a retransmission after ACK loss is caught by `seenSeq` set (last 128 seqs).
- In-order rule: never apply a later event before an earlier one (this preserves determinism — state machines depend on it).

## 4. ACK & Retransmission (Selective)

- Receiver sends `ackSeq` on each packet (or a compact ack list).
- Sender `retransqu(drop, send again)` for unacked beyond `retransmitTimeout` (e.g., 1.5× RTT).
- Use **selective ACK / NACK** when feasible; else whole-window ack (bytewise).

```cpp
if (now > lastSent[i].time + MAXRTT*1.5) → reinsert event[i] at head
```
Cap retries (e.g., 8) → then declare event failed (match system degrades gracefully).

## 5. Priorities

| Priority | Events | Behavior |
|----------|--------|-----------|
| Critical | round end, match-end, loot confirm | first out, never dropped |
| Normal | ability caster state, pickups | default |
| Low | emotes, world chatter | yield if the out-queue is long |

Priorities fold into the *order* of the deque (priority-ordered insert), not separate queues (keeps ordering guarantees global).

## 6. Replay on Disconnect (The "Didn't Miss the Loot" Rule)

- On reconnect: server replays all unacked events from `lastAckedSeq+1`.
- The event **must be idempotent** on replay: "pick up" replayed twice must not give two swords, and the state must be the same (a loot respawn behaves consistently). Server-side the effects happen once (state is authoritative); the client reb cst just needs the final tells.
- Mark events `replayable` (idempotent semantics recorded at design time).

## 7. Event vs Snapshot Consistency

Events and replicated state can disagree mid-flight (state says hp=10, event says "died"). Rule: state is truth for *current* values; events are truth for *transitions*. Clients resolve "died+hp10" → trigger death animation + resync to authoritative hp=0 on the next snapshot.

## 8. Testing

- Fault inject: drop 5%, duplicate 2%, delay 100 ms → assert: every event eventually arrives once, in order, no crashes, no double-loot.
- Replay test: kill a connection for 2 s, reconnect → replayed events complete idempotently.

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Events on the unreliable channel | reliable queue |
| Retransmit forever | capped retries + fail-flag |
| Double-apply on replay (loot x2) | idempotent design + dedup |
| Out-of-order apply | seq-sort before apply |
| No priorities → emotes starve shots | priority-order insert |
| Queue unbounded | cap + drop low first |

## 10. Checklist

- [ ] Separate reliable event queue per cxn.
- [ ] Global seq + out-of-order buffer + dedup.
- [ ] Selective ack/retransmit with cap.
- [ ] Priority-ordered deque.
- [ ] Replay-from-lastAck on reconnect; idempotent events.
- [ ] Fault-inject tests green.