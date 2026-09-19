---
title: Stateless Service Design
description: Statelessness, idempotency, replica scaling, load balancing affinity, and the rules that let convoy services scale horizontally.
---

# Stateless Services — Deep Reference

## 1. The Deal

A service is *stateless* if any replica can serve any request correctly. Everything except the game pod should be stateless: login, matchmaker, queue, lobby, rating, anti-cheat readers. Statelessness is the *single* property that makes a fleet scale horizontally.

## 2. The Stateless Checklist

| Property | Meaning |
|----------|---------|
| Request-self-contained | all context in the request + immutable store |
| No in-memory queue | use KV/stream (matchmaking queue is backed by Redis/Kafka) |
| Idempotent handlers | retry-safe (a double-request = one effect) |
| Versioned state | CAS on writes (later §) |
| No sticky connection | a client can hit any replica |

## 3. Where State Actually Lives (Stateless Services, Stateful Stores)

| Logic service | Its state store |
|---------------|-----------------|
| matchmaker | KV `playerId → {state, waitStart}` (Redis) + stream |
| lobby | KV per lobby document |
| rating | KV per player (mu,phi,sigma) with CAS |
| anti-cheat ledger | append-only store (immutable rows) |

**Golden rule**: state = store; replicas just *compute*. Restart any replica → fleet unchanged.

## 4. Idempotency Patterns (The Retry-Safe Core)

```cpp
// matchmaker accept (idempotent):
if (kv.Get(matchId).state == CONFIRMED) { return; }   // already
kv.Set(matchId, CONFIRMED, CAS-if-unset);
```
All writes: **compare-and-set (optimistic lock)** — `CAS(version)` retries on conflict. Retries therefore can't double-call.

Patterns:
- **Create-if-absent** for enqueue/offer.
- **Version gate** for cancel (only owner-version may cancel).
- **Exactly-once via idempotency key**: every write carries a client-supplied `opId`; store de-dupes by `opId`.

## 5. Replica Scaling & the Load Balancer

- Stateless services: LB → round-robin/sticky-within-TTL. Region affinity from the *client* (not needed for stateless).
- Health checks: `/healthz` metadata (db-reachability, stream-lag) — a replica that can't reach its store is *down*, not serving.
- Autoscale on: CPU + request-rate + queue depth (see capacity).

## 6. The Fatal Anti-Patterns

| Anti-pattern | Why fatal |
|--------------|-----------|
| In-memory session table | replica ≠ symmetric → sticky breaks scale |
| Push queue in the process | two replicas both consume → double-send |
| Non-idempotent decrement | a retry drains twice |
| LeaderBP in a stateless service | a leader is state |
| Direct DB by clients | choke; route via service |

## 7. Storage Consistency vs Statelessness

The LB slices traffic across replicas — consistency *within a request* is the store's job (aura). Rules: read-after-write on the same row within a request → route or read-modify-write correctly; otherwise stale reads are acceptable (matchmaker tolerates 5 s staleness).

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Sticky sessions (broke) | KV state + no-sticky |
| Two replicas double-enqueue | opId dedupe |
| Retry drains twice | idempotent index |
| Replica can't reach store but "healthy" | healthz checks store |
| Leader election in fleet | state-owned database |

## 9. Checklist

- [ ] Every service's state in a store (KV/stream/append-only).
- [ ] Idempotent + CAS writes with opId.
- [ ] LB healthz = {process, store, stream}.
- [ ] No sticky connections required.
- [ ] No in-process queues.
- [ ] Read-after-write consistency defined per service.