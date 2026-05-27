---
name: backend-distributed-locking
description: >
  Use this skill when the user says 'distributed lock', 'Redis lock', 'Redlock', 'ZooKeeper lock', 'advisory lock', 'PostgreSQL lock', 'pg_advisory_lock', 'lease', 'distributed mutex', 'lock timeouts', 'fencing token'. This skill implements distributed locking using Redis Redlock, ZooKeeper, PostgreSQL advisory locks, or lease-based mechanisms. Applies to any backend stack. Do NOT use for: single-process mutexes, database transaction serialization, or optimistic concurrency.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, distributed-locking, concurrency, coordination]
---

# Backend Distributed Locking

## Purpose
Coordinate access to shared resources across multiple service instances using distributed locks with guaranteed safety properties.

## Agent Protocol

### Trigger
Exact user phrases: "distributed lock", "Redis lock", "Redlock", "ZooKeeper lock", "advisory lock", "PostgreSQL lock", "pg_advisory_lock", "lease", "distributed mutex", "fencing token", "lock timeout".

### Input Context
- Resource being protected.
- Available infrastructure (Redis, PostgreSQL, ZooKeeper, etcd).
- Number of competing instances.
- Duration of the critical section.

### Output Artifact
Lock configuration or implementation code. No file unless requested.

### Response Format
```
Provider: {Redis|PostgreSQL|ZooKeeper|etcd}
Strategy: {Redlock|Advisory|Ephemeral|Lease}
TTL: {duration}
Safety: {fencing?}
```

### Completion Criteria
- [ ] Lock acquisition and release implemented correctly.
- [ ] Lock timeout (TTL) configured.
- [ ] Fencing token mechanism in place for critical resources.
- [ ] Deadlock prevention: no nested locks.
- [ ] Graceful degradation: lock acquisition failure does not crash the service.

### Max Response Length
4 lines per lock configuration. 20 lines for implementation.

## Workflow

### Step 1: Choose Lock Provider
| Provider | Best For | Trade-off |
|----------|----------|-----------|
| Redis | High throughput, short locks | Needs failover (Redlock) |
| PostgreSQL | Same DB as data | Lock contention impacts DB |
| ZooKeeper/etcd | Strong consistency | Operational complexity |
| In-memory | Single instance only | Not distributed |

### Step 2: Implement Lock (Redis/Redlock)
```javascript
const { Lock } = require('redlock');
const redlock = new Redlock([redis1, redis2, redis3], { driftFactor: 0.01 });

async function processResource() {
  const lock = await redlock.acquire(['resource:order-123'], 5000);
  try {
    // Critical section
    await updateOrderStatus('order-123', 'processing');
  } finally {
    await lock.release();
  }
}
```

### Step 3: Implement Fencing Token
```sql
-- PostgreSQL advisory lock with fencing
SELECT pg_advisory_xact_lock(12345);
UPDATE resources SET version = version + 1, status = 'locked' WHERE id = 12345 AND version = :expectedVersion;
-- version becomes the fencing token
```

### Step 4: Handle Lock Failure
```javascript
async function withLock(name, ttl, fn) {
  const lock = await redlock.acquire([name], ttl).catch(() => null);
  if (!lock) throw new Error('Lock acquisition failed — resource busy');
  try { return await fn(lock); }
  finally { await lock.release().catch(() => {}); }
}
```

### Step 5: Monitor Locks
Emit metrics: lock acquisition time, hold time, contention rate, timeout rate.

## Rules
- Always set a TTL (lease duration) on every lock. Never use indefinite locks.
- Release locks in `finally` blocks — never in the happy path only.
- Use fencing tokens for any lock protecting a write to shared storage.
- Keep critical sections as short as possible — locks are not transactions.
- Never acquire one lock while holding another (potential deadlock).
- Log every lock acquisition and release with duration.
- If a lock cannot be acquired, degrade gracefully — do not block indefinitely.

## References
  - references/lock-contention-analysis.md — Lock Contention Analysis
  - references/lock-deep-dive.md — Distributed Locking — Deep Dive
  - references/lock-implementations.md — Distributed Lock Implementations
  - references/lock-providers.md — Lock Provider Implementation Notes
  - references/lock-strategies.md — Distributed Lock Strategies
  - references/lock-testing.md — Lock Testing
## Handoff
No artifact produced unless requested.
Next skill: webhooks — deliver events from the service to external subscribers.
Carry forward: lock provider, TTL configuration, fencing requirement.
