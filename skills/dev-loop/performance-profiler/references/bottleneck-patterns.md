# Bottleneck Patterns Reference

## Database Bottlenecks

### N+1 Queries

**Symptom:** API that returns a list takes exponentially longer as list size grows.

```
GET /orders → 200ms for 10 orders, 2s for 100 orders
```

**Detection:**
```typescript
// ORM log shows many queries for a single endpoint
Order.findAll()  // 1 query
  .then(orders => Promise.all(
    orders.map(o => User.findByPk(o.userId))  // N queries!
  ))
```

**Fix:** Eager loading or batch loading
```typescript
Order.findAll({ include: [{ model: User }] })  // 1 query with JOIN
```

### Missing Index

**Symptom:** Sequential scan on large table under EXPLAIN ANALYZE.

```sql
-- Slow query (SEQ SCAN on 1M rows)
SELECT * FROM orders WHERE status = 'pending' AND created_at > '2026-01-01';

-- Add composite index
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
```

**Detection:**
```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE status = 'pending';
-- Look for: Seq Scan, high rows= estimate vs actual, high Buffers
```

### Lock Contention

**Symptom:** Read queries block behind writes; deadlocks in logs.

**Patterns:**
- Row lock escalation to table lock
- UPDATE on same rows from multiple connections
- Foreign key validation on parent table
- Missing index causing row lock to escalate

**Fix:**
```sql
-- Add index on foreign key columns
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Use NOWAIT or SKIP LOCKED
SELECT * FROM orders FOR UPDATE SKIP LOCKED;
```

### Connection Pool Exhaustion

**Symptom:** "Timeout: pool exhausted" or "Connection refused" under load.

**Detection:**
```bash
# Check pool utilization
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction';
```

**Fix:**
```typescript
const pool = new Pool({
  max: 20,        // Increase from default 10
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})
```

## CPU Bottlenecks

### Hot Loop / Tight Computation

**Symptom:** Single function dominates CPU profile (wide plateau in flame graph).

```typescript
// Before: O(n²) in hot path
function calculateDiscounts(orders: Order[]) {
  return orders.map(o => {
    const rules = getDiscountRules()  // Called N times!
    return applyRules(o, rules)
  })
}

// After: hoisted
function calculateDiscounts(orders: Order[]) {
  const rules = getDiscountRules()  // Called once
  return orders.map(o => applyRules(o, rules))
}
```

### Serialization/Deserialization

**Symptom:** High CPU in JSON.parse/stringify, protobuf serialization.

**Detection:**
```bash
# Flame graph shows wide _JSON sections
# Profile shows significant time in serialize/deserialize
```

**Fix:**
```typescript
// Use faster serialization for internal APIs
// JSON → MessagePack or protobuf for high-throughput paths
// Cache serialized responses
const cache = new Map<string, string>()
app.get('/api/users', (req, res) => {
  const key = req.url
  if (cache.has(key)) return res.type('json').send(cache.get(key))
  const data = serialize(users)
  cache.set(key, data)
  res.send(data)
})
```

### Regex Backtracking

**Symptom:** Input-dependent CPU spikes, especially on long strings.

```typescript
// Vulnerable to catastrophic backtracking
const EMAIL_REGEX = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/

// Fixed: atomic groups, bounded quantifiers
const SAFE_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```

## Memory Bottlenecks

### Object Allocation Pressure

**Symptom:** Frequent GC pauses, sawtooth memory pattern.

```typescript
// Before: allocates new array on every call
function getActiveUsers() {
  return users.filter(u => u.active).map(u => ({ id: u.id, name: u.name }))
}

// After: reuse objects (if called in hot loop)
function getActiveUsers() {
  const result: UserView[] = []
  for (const u of users) {
    if (u.active) result.push({ id: u.id, name: u.name })
  }
  return result
}
```

### Memory Leak Patterns

| Pattern | Detection | Fix |
|---------|-----------|-----|
| Static collections growing | Heap snapshot grows unbounded | Add eviction, use WeakMap |
| Event listeners never removed | Retained in profiler | Use AbortController, cleanup |
| Closure capturing large scope | Closure size in profile | Explicit null after use |
| Cache without eviction | Cache grows forever | Add TTL, LRU, or size limit |
| Thread-local request data | Threads accumulate | Request-scoped context |

```typescript
// Leaking: event listener registered but never removed
class Service {
  constructor() {
    emitter.on('event', this.handle)  // No cleanup!
  }
}

// Fixed
class Service {
  private abort = new AbortController()
  constructor() {
    emitter.on('event', this.handle, { signal: this.abort.signal })
  }
  dispose() { this.abort.abort() }
}
```

## I/O Bottlenecks

### Synchronous Blocking

**Symptom:** Low CPU utilization but high latency; all threads blocked.

```typescript
// Bad: blocks event loop
function processRequest(req: Request) {
  const data = fs.readFileSync('/data/dictionary.csv')  // Blocking!
  return compute(req, data)
}

// Good: async
async function processRequest(req: Request) {
  const data = await fs.promises.readFile('/data/dictionary.csv')
  return compute(req, data)
}
```

### Chatty API Calls

**Symptom:** Waterfall of sequential HTTP requests in traces.

**Detection:**
- Trace shows 5+ sequential external calls per request
- Flame graph shows wide gaps (waiting for network)

**Fix:**
```typescript
// Sequential calls
const user = await getUser(id)
const orders = await getOrders(user.id)       // Depends on user
const payments = await getPayments(user.id)   // Depends on user

// Parallel independent calls
const [user, profile] = await Promise.all([
  getUser(id),
  getProfile(id),
])
```

## Application-Level Patterns

### Cache Stampede

**Symptom:** Cache miss cascades — multiple requests all recompute the same expensive value.

```typescript
// Bad: all requests compute on miss
async function getExpensiveData(id: string) {
  let data = cache.get(id)
  if (!data) {
    data = await computeExpensive(id)   // Stampede!
    cache.set(id, data)
  }
  return data
}

// Good: deduplicate concurrent misses
const pending = new Map<string, Promise<Data>>()

async function getExpensiveData(id: string) {
  let data = cache.get(id)
  if (data) return data

  if (!pending.has(id)) {
    pending.set(id, computeExpensive(id).then(d => {
      cache.set(id, d)
      pending.delete(id)
      return d
    }))
  }
  return pending.get(id)!
}
```

### Circuit Breaker Pattern

Prevents cascading failures when a downstream service is degrading:

```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 10000,
  onOpen: () => logger.warn('Circuit opened — requests failing fast'),
})

async function callDownstream() {
  if (!breaker.isAllowed()) throw new Error('Service unavailable')
  try {
    const result = await fetch(url)
    breaker.onSuccess()
    return result
  } catch (err) {
    breaker.onFailure()
    throw err
  }
}
```

## Prioritization Matrix

| Bottleneck | Detection Difficulty | Fix Difficulty | Typical Impact |
|------------|---------------------|----------------|----------------|
| N+1 query | Easy (ORM log) | Easy | 10-100x latency |
| Missing index | Easy (EXPLAIN) | Easy | 10-100x query time |
| Serialization hot path | Medium (flame graph) | Medium | 2-10x throughput |
| Memory leak | Hard (heap diff) | Medium-Hard | Eventual OOM |
| Synchronous blocking | Medium (thread dumps) | Easy | Event loop stall |
| Cache stampede | Medium | Medium | 5-50x transient spike |
| Lock contention | Medium (wait events) | Hard | Accumulated latency |
| Object allocation | Medium (GC logs) | Medium | GC pause, throughput |

## Optimization Order

1. **Database** — Missing indexes and N+1 are the highest ROI fixes
2. **Serialization** — Often the widest app-level stack in flame graphs
3. **Caching** — Add cache with appropriate TTL for expensive computations
4. **Algorithm** — Replace O(n²) with O(n log n) or O(n)
5. **Async conversion** — Replace blocking calls with async I/O
6. **Memory** — Reduce allocation rate, fix leaks
7. **Architecture** — Split service, add queues, change data model
