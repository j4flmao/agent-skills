# Distributed Lock Implementations

## Redis/Redlock

```javascript
// Node.js — Redlock
const Client = require('ioredis');
const Redlock = require('redlock');

const redisClients = [
  new Client({ host: 'redis-1', port: 6379 }),
  new Client({ host: 'redis-2', port: 6379 }),
  new Client({ host: 'redis-3', port: 6379 }),
];

const redlock = new Redlock(redisClients, {
  driftFactor: 0.01,
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 100,
});

async function withLock(resource, ttl, fn) {
  let lock;
  try {
    lock = await redlock.acquire([`lock:${resource}`], ttl);
    return await fn(lock);
  } finally {
    if (lock) await lock.release().catch(() => {});
  }
}

// Usage
await withLock('order:123', 5000, async (lock) => {
  await processOrder('123');
});
```

```python
# Python — Redis lock
import redis
from contextlib import contextmanager

r = redis.Redis(decode_responses=True)

@contextmanager
def redis_lock(key: str, ttl: int = 30):
    lock_key = f"lock:{key}"
    acquired = r.setnx(lock_key, "locked")
    if not acquired:
        raise TimeoutError(f"Could not acquire lock: {key}")
    r.expire(lock_key, ttl)
    try:
        yield
    finally:
        r.delete(lock_key)
```

## ZooKeeper

```java
// Java — Curator (ZooKeeper)
CuratorFramework client = CuratorFrameworkFactory.newClient(
    "zk-1:2181,zk-2:2181,zk-3:2181",
    new ExponentialBackoffRetry(1000, 3)
);
client.start();

InterProcessMutex lock = new InterProcessMutex(client, "/locks/resource-123");
try {
  if (lock.acquire(5, TimeUnit.SECONDS)) {
    // Critical section
  }
} finally {
  lock.release();
}
```

## etcd

```go
// Go — etcd
import (
  "go.etcd.io/etcd/client/v3"
  "go.etcd.io/etcd/client/v3/concurrency"
)

cli, _ := clientv3.New(clientv3.Config{
  Endpoints: []string{"etcd-1:2379", "etcd-2:2379", "etcd-3:2379"},
})
defer cli.Close()

session, _ := concurrency.NewSession(cli)
defer session.Close()

lock := concurrency.NewMutex(session, "/locks/resource-123")
lock.Lock(context.TODO())
// Critical section
lock.Unlock(context.TODO())
```

## PostgreSQL Advisory Lock

```python
# Python — pg_advisory_lock
import psycopg2

conn = psycopg2.connect("dbname=app")
conn.autocommit = True

def with_advisory_lock(lock_id: int, fn):
    cur = conn.cursor()
    try:
        cur.execute("SELECT pg_advisory_lock(%s)", (lock_id,))
        return fn()
    finally:
        cur.execute("SELECT pg_advisory_unlock(%s)", (lock_id,))
        cur.close()

# Usage
with_advisory_lock(hash("resource:order:123") % (2**63), lambda: process_order())
```

## MySQL GET_LOCK

```sql
-- MySQL named lock
SELECT GET_LOCK('resource-123', 5);
-- 1 = acquired, 0 = timeout, NULL = error

-- Critical section
UPDATE resources SET status = 'locked' WHERE id = 123;

-- Release
SELECT RELEASE_LOCK('resource-123');
```

## Consensus-based (Raft)

```go
// HashiCorp Consul lock
lock, err := client.LockKey("locks/resource-123")
leaderCh, err := lock.Lock(nil)
if leaderCh == nil {
    // Failed to acquire
}
// Hold lock, watch leaderCh for release
lock.Unlock()
```

## Decision Matrix

| Requirement | Best Option |
|-------------|-------------|
| Max throughput, accept stale reads | Redis/Redlock |
| Strong consistency, coordination | ZooKeeper |
| K8s-native, cloud-friendly | etcd |
| Same DB as application, simple | PostgreSQL/MySQL |
| Multi-language, managed | HashiCorp Consul |
| Low latency, strong consistency | etcd |
| Global, geo-distributed | Google Cloud Spanner |
