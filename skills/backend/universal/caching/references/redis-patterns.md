# Redis Patterns

## Data Structures

### Strings
```
SET user:abc123:name "Jane Doe" EX 3600
GET user:abc123:name
INCR page:views:5    → atomic counter (for rate limiting, stats)
SETNX lock:resource "uuid" EX 10    → distributed lock (NX = only set if not exists)
```

### Hashes
```
HSET user:abc123 name "Jane" email "jane@example.com" role "admin"
HGET user:abc123 name
HGETALL user:abc123
HINCRBY user:abc123 login_count 1
```
Best for: objects/maps. More memory efficient than serializing to string.

### Lists
```
LPUSH notifications:abc123 "New login"  → add to head
RPUSH notifications:abc123 "Order shipped" → add to tail
LPOP notifications:abc123       → remove and get from head
LRANGE notifications:abc123 0 -1 → get all
```
Best for: queues, recent activity, timelines.

### Sets
```
SADD user:abc123:roles "admin" "editor"
SISMEMBER user:abc123:roles "admin"  → check membership
SMEMBERS user:abc123:roles
SINTER group:admins group:active  → set intersection
```
Best for: tags, permissions, unique membership.

### Sorted Sets
```
ZADD leaderboard 1000 "user:abc" 900 "user:xyz"
ZINCRBY leaderboard 50 "user:abc"
ZREVRANGE leaderboard 0 9 WITHSCORES  → top 10
ZRANK leaderboard "user:abc"          → rank
```
Best for: leaderboards, rate limiting (sliding window), time-series.

### Bitmaps
```
SETBIT user:abc123:login_days 150 1   → mark day 150 as logged in
BITCOUNT user:abc123:login_days       → count login days
```
Best for: boolean flags at scale (e.g., daily active users).

## Rate Limiting with Sorted Sets (Sliding Window)
```lua
-- Sliding window rate limit
local key = KEYS[1]
local window = tonumber(ARGV[1])  -- window in seconds
local limit = tonumber(ARGV[2])   -- max requests
local now = tonumber(ARGV[3])

-- Remove entries outside window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current entries
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return 1  -- allow
else
    return 0  -- deny
end
```

## Distributed Lock
```python
import redis
import uuid

r = redis.Redis()

def acquire_lock(lock_name, ttl=10):
    lock_key = f"lock:{lock_name}"
    lock_value = str(uuid.uuid4())
    if r.setnx(lock_key, lock_value):
        r.expire(lock_key, ttl)
        return lock_value
    return None

def release_lock(lock_name, lock_value):
    # Lua script ensures atomic compare-and-delete
    script = """
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
    else
        return 0
    end
    """
    r.eval(script, 1, f"lock:{lock_name}", lock_value)
```

## Session Store
```python
# Store session
r.hset(f"session:{session_id}", mapping={
    "user_id": user_id,
    "role": role,
    "created_at": timestamp,
})
r.expire(f"session:{session_id}", 86400)  # 24h TTL

# Get session
session = r.hgetall(f"session:{session_id}")
```

## Message Queue Pattern
```python
# Producer
r.lpush("queue:emails", json.dumps(email_data))

# Consumer (blocking)
while True:
    _, data = r.brpop("queue:emails", timeout=5)
    email = json.loads(data)
    send_email(email)
```

## Cache Stampede Prevention (Mutex)
```python
def get_or_compute(key, ttl, compute_func):
    # Try cache
    value = r.get(key)
    if value is not None:
        return deserialize(value)

    # Cache miss — mutex
    lock_key = f"lock:{key}"
    lock_value = str(uuid.uuid4())

    if r.setnx(lock_key, lock_value):
        r.expire(lock_key, 10)
        try:
            value = compute_func()
            r.setex(key, ttl, serialize(value))
            return value
        finally:
            release_lock(lock_key, lock_value)
    else:
        # Wait and retry
        sleep(0.1)
        return get_or_compute(key, ttl, compute_func)
```

## Bloom Filter
```python
# Use RedisBloom module
r.bf().create("seen:events", 0.01, 1000000)  # 1% error rate, 1M capacity
r.bf().add("seen:events", "event_id_123")
r.bf().exists("seen:events", "event_id_123")  # True (may false-positive)
```
Best for: deduplication, spam filtering, cache-bloom (avoid cache miss on nonexistent keys).

## Pipeline / Batching
```python
pipe = r.pipeline()
pipe.set("key1", "value1")
pipe.set("key2", "value2")
pipe.get("key1")
results = pipe.execute()
```
Reduces round-trips. Use for batch operations.

## Monitoring
```
INFO memory    → used_memory, peak_memory, fragmentation_ratio
INFO stats     → hits, misses, hit_rate (keyspace_hits / (hits + misses))
INFO commandstats → slowlog
SLOWLOG GET 10 → recent slow commands
CLIENT LIST    → connected clients
```
