# Lock Provider Implementation Notes

## Redis (Single Node)

### Installation

```bash
npm install ioredis
# or
npm install redis
```

### Basic Lock (SET NX)

```javascript
import { createClient } from 'redis'

const client = createClient({ url: process.env.REDIS_URL })

async function acquireLock(name, ttl) {
  const result = await client.set(`lock:${name}`, 'locked', {
    NX: true,
    PX: ttl,
  })
  return result !== null
}

async function releaseLock(name) {
  // Lua script for atomic release
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `
  await client.eval(script, { keys: [`lock:${name}`], arguments: ['locked'] })
}
```

### Redlock

```javascript
import Redlock from 'redlock'

const redlock = new Redlock(
  [
    new Redis(process.env.REDIS_URL_1),
    new Redis(process.env.REDIS_URL_2),
    new Redis(process.env.REDIS_URL_3),
  ],
  {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 100,
  }
)

const lock = await redlock.acquire(['lock:resource'], 5000)
try {
  // critical section
} finally {
  await lock.release()
}
```

### Lua Script for Atomic Lock + Extend

```lua
-- acquire.lua
local key = KEYS[1]
local ttl = ARGV[1]
local owner = ARGV[2]

if redis.call("set", key, owner, "NX", "PX", ttl) then
  return 1
end
return 0
```

```lua
-- extend.lua
local key = KEYS[1]
local owner = ARGV[1]
local ttl = ARGV[2]

if redis.call("get", key) == owner then
  return redis.call("pexpire", key, ttl)
end
return 0
```

### Config

| Parameter | Recommended | Note |
|---|---|---|
| TTL | 5-30s | Depends on critical section duration |
| Retry count | 3-10 | Higher = more contention |
| Retry delay | 100-500ms | Backoff between retries |
| Drift factor | 0.01 | Clock drift tolerance |

## PostgreSQL

### Advisory Locks

```sql
-- Session-level lock (manual release)
SELECT pg_advisory_lock(hashtext('resource:order-123'));
-- critical section
SELECT pg_advisory_unlock(hashtext('resource:order-123'));

-- Transaction-level (auto-release on commit/rollback)
SELECT pg_advisory_xact_lock(hashtext('resource:order-123'));

-- Two-argument form (namespace isolation)
SELECT pg_advisory_lock(1, hashtext('order-123'));  -- class 1
SELECT pg_advisory_lock(2, hashtext('payment-456')); -- class 2
```

### Node.js Implementation

```javascript
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function withAdvisoryLock(resourceId, fn) {
  const client = await pool.connect()
  try {
    const hash = hashCode(`resource:${resourceId}`)
    await client.query('SELECT pg_advisory_lock($1)', [hash])
    const result = await fn()
    await client.query('SELECT pg_advisory_unlock($1)', [hash])
    return result
  } finally {
    client.release()
  }
}

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
```

### Row-Level Lock

```sql
-- Pessimistic lock
BEGIN;
SELECT * FROM orders WHERE id = 'order-123' FOR UPDATE;
-- process order
UPDATE orders SET status = 'processed' WHERE id = 'order-123';
COMMIT;

-- Skip locked (process next available)
SELECT * FROM queue ORDER BY priority LIMIT 1 FOR UPDATE SKIP LOCKED;
```

### Limitations

- Advisory locks are session-scoped — connection pooling must use sticky sessions
- Lock contention impacts database performance
- No built-in fencing token (must implement manually)
- Not suitable for high-throughput scenarios

## ZooKeeper

### Installation

```xml
<!-- Maven -->
<dependency>
  <groupId>org.apache.curator</groupId>
  <artifactId>curator-recipes</artifactId>
  <version>5.5.0</version>
</dependency>
```

### Implementation

```java
import org.apache.curator.framework.CuratorFramework;
import org.apache.curator.framework.CuratorFrameworkFactory;
import org.apache.curator.framework.recipes.locks.InterProcessMutex;
import org.apache.curator.retry.ExponentialBackoffRetry;

CuratorFramework client = CuratorFrameworkFactory.newClient(
    "zk1:2181,zk2:2181,zk3:2181",
    new ExponentialBackoffRetry(1000, 3)
);
client.start();

InterProcessMutex lock = new InterProcessMutex(client, "/locks/resource-1");
lock.acquire(10, TimeUnit.SECONDS);
try {
    // critical section
} finally {
    lock.release();
}
```

### Node.js ZooKeeper

```javascript
import { createClient } from 'zookeeper'

const client = createClient({ connect: 'zk1:2181,zk2:2181,zk3:2181' })
await client.connect()

async function withZKLock(path, fn) {
  const lockPath = `${path}/lock-`
  const created = await client.create(lockPath, 'locked', {
    sequence: true,
    ephemeral: true,
  })
  // Check if we have the lowest sequence number
  const children = await client.getChildren(path)
  children.sort()
  if (created.includes(children[0])) {
    try { return await fn() }
    finally { await client.delete(created) }
  } else {
    // Watch the previous node
    const idx = children.findIndex(c => created.includes(c))
    await new Promise((resolve) => {
      client.watch(`${path}/${children[idx - 1]}`, resolve)
    })
    return withZKLock(path, fn)
  }
}
```

## etcd

### Installation

```bash
npm install @etcd/client
# or
go get go.etcd.io/etcd/client/v3
```

### Go Implementation

```go
import (
    "context"
    "go.etcd.io/etcd/client/v3/concurrency"
)

func withLock(ctx context.Context, client *concurrency.Session, key string, fn func() error) error {
    lock := concurrency.NewMutex(session, key)
    if err := lock.Lock(ctx); err != nil {
        return err
    }
    defer lock.Unlock(ctx)
    return fn()
}

session, _ := concurrency.NewSession(etcdClient)
defer session.Close()
withLock(context.TODO(), session, "/locks/order-123", func() error {
    // critical section
    return nil
})
```

### Node.js Implementation

```javascript
import { Etcd3 } from 'etcd3'

const client = new Etcd3({ hosts: 'localhost:2379' })
const lock = await client.lock('resource-1').acquire(5000)

try {
  // critical section
} finally {
  await lock.release()
}
```

### Lease Configuration

```go
// Configure lease TTL
session, err := concurrency.NewSession(client, concurrency.WithTTL(10))
```

## Lock Provider Comparison

| Feature | Redis | PostgreSQL | ZooKeeper | etcd |
|---|---|---|---|---|
| Consistency | Eventual | Strong | Strong | Strong |
| Throughput | Very High | Moderate | Moderate | Moderate |
| Latency | <1ms | 1-5ms | 5-20ms | 5-10ms |
| Fencing | Manual | Manual | Built-in | Built-in |
| Auto-cleanup | TTL expiry | Session end | Ephemeral node | Lease expiry |
| Operational cost | Low | None (existing) | High | Medium |
| Clock dependency | Yes | No | No | No |

## Failure Modes

### Redis
- **Node failure**: Single node loses lock state
- **Clock drift**: TTL expires early/late
- **Network partition**: Split-brain, both sides think they hold the lock

### PostgreSQL
- **Connection pool exhaustion**: Each lock consumes a connection
- **Deadlock detection**: PostgreSQL kills one transaction
- **Session cleanup**: Unreleased locks persist until session ends

### ZooKeeper
- **Session expiry**: Client disconnected briefly, lock released
- **Herding effect**: Many clients wake up simultaneously
- **Network partition**: Two clients may hold the lock briefly

### etcd
- **Lease expiry**: Clock drift causes premature lock release
- **Revision compaction**: Old lock records deleted
- **Network partition**: Only minority partition fails
