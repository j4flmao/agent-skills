# Bottleneck Analysis Reference

Use this reference after capturing a profile when you must turn raw signals
(flame graphs, GC logs, query plans, OS counters) into a ranked list of fixes.
Each section covers (1) the strong/weak symptoms that distinguish this class
from neighbours, (2) the underlying mechanics so you can avoid superficial
diagnoses, (3) concrete fixes with code, and (4) the metrics you should re-
measure to verify the fix actually moved the needle.

## How to Classify a Bottleneck (Decision Tree)

```
Is the request slow?
├── Yes ─┬── CPU% high (>70%, single core saturated)?
│        │     ├── Yes → CPU-bound (Section: CPU)
│        │     └── No  → Continue
│        ├── IOwait% high (>20%) OR thread pool full?
│        │     ├── Yes → I/O-bound (Section: Disk I/O / DB)
│        │     └── No  → Continue
│        ├── Network RTT or payload large (>50ms / >100KB)?
│        │     ├── Yes → Network-bound (Section: Network)
│        │     └── No  → Continue
│        ├── GC time fraction > 5% OR allocation rate > 200MB/s?
│        │     ├── Yes → Memory/GC-bound (Section: Memory)
│        │     └── No  → Continue
│        ├── Lock wait / event loop lag visible?
│        │     ├── Yes → Concurrency-bound (Section: Lock Contention)
│        │     └── No  → Continue
│        └── DB cpu / query time high?
│              ├── Yes → DB-bound (Section: Database)
│              └── No  → Re-profile with deeper instrumentation
└── No  → Stop. Do not optimize what is not measured.
```

The decision tree is intentionally biased toward early termination. Most teams
optimize prematurely because they skip the disqualification step. If CPU%,
IOwait%, RTT, GC% and lock-wait counters all look healthy, the slowness is
almost always *queue-induced* (request queueing, connection-pool waits) and
not visible in single-request profiles — switch to load-test traces with the
queueing metric enabled before you touch code.

---

## 1. Database Bottlenecks

### Strong vs Weak Symptoms

| Signal | Strong DB-bound | Weak / Ambiguous |
|--------|-----------------|------------------|
| App CPU% | < 30% during slow path | > 70% |
| Wait events | `IO`, `Lock`, `IPC` (Postgres `pg_stat_activity.wait_event`) | `none`/active running |
| Connection pool | Saturated / queue depth > pool size | Free connections always |
| `EXPLAIN ANALYZE` cost | rows examined ≫ rows returned | rows examined ≈ rows returned |
| Slow query log entries | Many, repeated query shapes | None for the slow endpoint |

If the app is hot but the DB is idle, the bottleneck is application code
(serialization, ORM hydration). If both are hot, suspect N+1.

### Mechanics

A "slow query" almost never has one cause. The dominant patterns are:

1. **N+1**: one query loads N parents, then N follow-up queries load
   children. Latency = `Q_parent + N × (Q_child_round_trip)`. With
   `Q_child_round_trip = 1ms` and `N = 200`, you pay 200ms in pure round
   trips, no matter how fast each child query is.
2. **Missing/wrong index**: optimizer chooses a sequential scan. Cost grows
   linearly with table size; latency goes from sub-millisecond to seconds as
   the table grows.
3. **Implicit type coercion**: index is unusable when `WHERE user_id =
   '123'` matches `user_id BIGINT`. The planner casts on the column side
   and skips the index.
4. **Lock contention**: long-running UPDATE on a hot row blocks readers in
   `SERIALIZABLE`/`REPEATABLE READ`. Show with `pg_locks` or
   `SHOW ENGINE INNODB STATUS`.
5. **Buffer-pool miss storm**: a new query pattern evicts the working set;
   subsequent requests pay disk cost. Show via `pg_stat_database.blks_hit /
   (blks_hit + blks_read)` dropping below 0.95.
6. **Plan flip**: planner statistics get stale after large insert/delete;
   the same SQL flips from index scan to seq scan. Show by capturing
   `EXPLAIN` periodically.

### Detection Commands

```sql
-- Postgres: top 10 by total time
SELECT queryid, calls, mean_exec_time, total_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Postgres: live wait events
SELECT pid, state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE state != 'idle';

-- MySQL: top by latency
SELECT digest_text, count_star, avg_timer_wait/1e9 AS avg_ms
FROM performance_schema.events_statements_summary_by_digest
ORDER BY sum_timer_wait DESC LIMIT 10;

-- MongoDB: profiler at 100ms
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(20);
```

### Fixes

```sql
-- Build index without blocking writers (Postgres)
CREATE INDEX CONCURRENTLY idx_orders_status_created
  ON orders(status, created_at DESC)
  WHERE status IN ('pending','paid');

-- Verify the planner is using it
EXPLAIN (ANALYZE, BUFFERS)
  SELECT * FROM orders WHERE status = 'pending'
  ORDER BY created_at DESC LIMIT 50;
```

```ruby
# N+1 fix in Rails ORM
# Before: 1 + N queries
Order.where(status: 'pending').each { |o| puts o.line_items.count }
# After: 2 queries (one for orders, one for line_items)
Order.where(status: 'pending').includes(:line_items).each { |o| puts o.line_items.length }
```

```typescript
// N+1 fix in TypeORM / Prisma
// Bad: lazy-loads each user.posts inside the loop
const users = await prisma.user.findMany();
for (const u of users) {
  const posts = await prisma.post.findMany({ where: { userId: u.id } });
}
// Good: eager fetch in one query
const users = await prisma.user.findMany({ include: { posts: true } });
```

```sql
-- Lock-aware batched UPDATE to avoid hot-row blocking
UPDATE orders SET status = 'archived'
WHERE id IN (
  SELECT id FROM orders
  WHERE status = 'completed' AND completed_at < now() - interval '90 days'
  ORDER BY id LIMIT 1000
  FOR UPDATE SKIP LOCKED
);
```

### Verification Metrics

- `mean_exec_time` of the targeted query: must drop by ≥10× to consider
  the fix successful for index work.
- `buffer cache hit ratio`: should stay > 0.98 after the change.
- Connection pool wait events: must approach zero under the same load.
- End-to-end p95 latency for the endpoint: drop in proportion to query
  share of total latency (Amdahl's law).

---

## 2. CPU Bottlenecks

### Strong vs Weak Symptoms

| Signal | Strong CPU-bound | Weak / Ambiguous |
|--------|------------------|------------------|
| Single-thread CPU% | Pinned at 100% | < 50% |
| Flame graph | Tall plateau in user code | Wide kernel/syscall plateau |
| Context-switch rate | Low (< 10K/sec/core) | High |
| iowait% | Near zero | > 20% |
| Event-loop lag (Node/Python) | High and growing | Stable |

### Mechanics

CPU bottlenecks fall into three deep categories:

1. **Algorithmic**: O(n²) where O(n log n) would do. Look for nested
   loops, repeated linear searches, naïve set membership checks.
2. **Constant-factor**: correct algorithm, but the constant is large —
   regex backtracking, JSON parsing of large bodies, serialization of
   deeply nested objects.
3. **Cache/branch unfriendliness**: pointer chasing, polymorphic dispatch
   in tight loops, mispredicted branches. Visible only under hardware-
   counter profiling (`perf stat -e cache-misses,branch-misses`).

### Detection

```bash
# Linux: which thread is hot
top -H -p $(pgrep -f myapp)

# Per-function CPU samples (no debug symbols needed for sampling profile)
perf record -F 199 -g --call-graph dwarf -p $(pgrep myapp) -- sleep 30
perf report --stdio --no-children | head -40

# Detect catastrophic regex backtracking (Node)
NODE_OPTIONS="--prof" node app.js
# Run load, then:
node --prof-process isolate-*.log | head -50
```

### Fixes

```javascript
// Memoization of pure functions in a hot loop
const memo = new Map();
function classify(input) {
  if (memo.has(input)) return memo.get(input);
  const r = expensiveClassify(input);
  if (memo.size < 10_000) memo.set(input, r); // bounded cache
  return r;
}

// Offload to worker thread (Node.js)
const { Worker } = require('worker_threads');
const w = new Worker('./pdf-render.js', { workerData: { jobId } });
w.on('message', (out) => respond(out));
```

```python
# Replace O(n) list-membership with O(1) set
ALLOWED = set(load_allowed_users())          # was: list
def is_allowed(uid: str) -> bool:
    return uid in ALLOWED                    # O(1)
```

```go
// Avoid regex compile in hot path
var slugRE = regexp.MustCompile(`[^a-z0-9-]`) // compile once
func slugify(s string) string { return slugRE.ReplaceAllString(s, "-") }
```

### Verification Metrics

- Single-thread CPU% during the slow path: should drop below saturation.
- p99 latency: smaller drop than p50 if the optimization removed work
  uniformly; larger drop than p50 if it removed worst-case work.
- Throughput (req/s): should rise in inverse proportion to CPU time
  saved per request.

---

## 3. Memory & GC Bottlenecks

### Strong vs Weak Symptoms

| Signal | Strong Memory-bound | Weak |
|--------|---------------------|------|
| Heap chart | Sawtooth growing trend | Sawtooth stable |
| `% Time in GC` | > 10% | < 2% |
| Pause-time p99 (G1/ZGC) | > 200ms | < 50ms |
| RSS over time | Monotonic growth | Flat |
| OOM-killer events | Present | Absent |

### Mechanics

- **Leak** (unbounded growth): an object graph keeps growing because a
  reference is never released. Common roots: global caches without
  eviction, event listeners not removed, closures capturing large state,
  thread-local storage in long-lived workers.
- **Pressure** (allocation rate): code is correct but allocates too
  much, forcing constant collection. Common roots: defensive copies,
  string concatenation in loops, building intermediate collections.
- **Fragmentation**: heap is full of dead objects with live objects
  scattered. Affects native heaps (C/C++) and large-object heaps (.NET
  LOH, JVM humongous regions).
- **Pinning**: pinned native handles prevent compaction. Affects
  long-lived IO buffers in .NET; fix with `ArrayPool<T>` or
  `Memory<T>.Pin()` minimisation.

### Detection

```bash
# Java: rolling GC log
java -Xlog:gc*,gc+heap=info,gc+age=trace:file=gc.log:time,uptime,level,tags -Xmx4g -jar app.jar

# .NET: GC events
dotnet-counters monitor --process-id <pid> System.Runtime

# Node.js: heap snapshots over time
kill -USR2 <pid>          # writes heapdump
# Compare snapshots in Chrome DevTools 'Memory' tab — Comparison view

# Linux: who is allocating
valgrind --tool=massif --pages-as-heap=yes ./binary
ms_print massif.out.<pid>
```

### Fixes

```javascript
// Bounded LRU cache instead of unbounded Map
const LRU = require('lru-cache');
const cache = new LRU({ max: 5000, ttl: 60_000 });

// Stream-based processing instead of buffer-the-world
fs.createReadStream('huge.csv')
  .pipe(csv())
  .on('data', row => processRow(row))
  .on('end', () => done());
```

```csharp
// .NET: pool large byte buffers
private static readonly ArrayPool<byte> Pool = ArrayPool<byte>.Shared;
byte[] buf = Pool.Rent(65_536);
try { /* use buf */ } finally { Pool.Return(buf); }
```

```java
// Pre-size StringBuilder to avoid copy storms
StringBuilder sb = new StringBuilder(input.length() + 64);
for (var x : input) sb.append(x);
```

### Verification Metrics

- Allocation rate (MB/s): target < 100 MB/s for managed runtimes.
- `% Time in GC`: target < 2%.
- Old-gen growth slope across a 1-hour stable load: must be ≈ 0.
- p99 pause time: should not exceed your latency budget.

---

## 4. Network Bottlenecks

### Strong vs Weak Symptoms

| Signal | Strong Network-bound | Weak |
|--------|----------------------|------|
| Waterfall | Many small sequential requests | One slow request |
| Bandwidth | > 70% of link utilised | < 10% |
| Retransmission rate | > 0.5% (`netstat -s`) | < 0.01% |
| TLS handshake | > 100ms per call | One-time / pooled |
| Payload size | > 500KB per response | < 50KB |

### Mechanics

- **Chatty interface**: client makes N calls to compose one screen.
  Each call pays the same RTT + TLS + auth + parsing overhead.
- **Head-of-line blocking**: HTTP/1.1 keeps requests strictly ordered on
  a connection; one slow request stalls the rest. HTTP/2 helps at the
  HTTP layer but TCP HOL persists; HTTP/3 (QUIC) fixes both.
- **TLS renegotiation**: every cold connection pays handshake cost
  (1-RTT TLS 1.3, 2-RTT TLS 1.2). Long-lived pools amortise this.
- **Serialization cost**: JSON parse/stringify of large bodies dominates
  for payloads > 1 MB; switch to a binary format (Protobuf, MessagePack,
  Cap'n Proto) or stream-parse (ndjson).

### Detection

```bash
# Network-level
ss -ti                  # per-connection RTT, cwnd, retrans
tcpdump -i any -w cap.pcap host api.svc
wireshark cap.pcap      # find retransmits, slow handshakes

# HTTP-level
curl -w '@curl-format.txt' -o /dev/null -s https://api.svc/endpoint
# curl-format.txt:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total:       %{time_total}\n
```

### Fixes

```javascript
// Connection pooling + keep-alive
const https = require('https');
const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  scheduling: 'fifo',
});
fetch('https://api/x', { agent });
```

```graphql
# Replace 5 round trips with 1 GraphQL query
query Dashboard($uid: ID!) {
  user(id: $uid)         { id name }
  recentOrders(uid: $uid){ id total }
  notifications(uid: $uid){ id text }
}
```

```nginx
# Enable HTTP/2 + Brotli
listen 443 ssl http2;
brotli on;
brotli_comp_level 4;
brotli_types application/json text/plain;
```

### Verification Metrics

- Number of requests per user action: should fall.
- Average payload size after compression: target < 50KB for JSON.
- TLS handshake count per minute: should drop with keep-alive.
- p95 of `time_starttransfer`: drops when server-side compute or
  serialisation is the issue.

---

## 5. Disk I/O Bottlenecks

### Strong vs Weak Symptoms

| Signal | Strong Disk-bound | Weak |
|--------|-------------------|------|
| iowait% | > 30% | < 5% |
| `await` per device (iostat) | > 50ms | < 5ms |
| Queue depth (`avgqu-sz`) | > 4 | < 0.5 |
| Sync calls in async runtime | Yes (`fs.readFileSync` in Node) | No |
| fsync rate | > 1000/s (database checkpoint storm) | < 10/s |

### Mechanics

- **Random IOPS exhaustion**: workload pattern is random small reads,
  disk IOPS limit < workload demand. Cloud-block devices have
  documented IOPS caps (e.g., gp3 baseline 3000 IOPS).
- **Sync calls in event-loop runtimes**: blocking I/O on the main loop
  stalls all concurrent work. Each sync call adds its full latency to
  every request currently in flight.
- **fsync stampedes**: many writers commit simultaneously; the disk
  serialises them; tail latency spikes.
- **Read amplification**: reading 8KB triggers a 64KB filesystem read
  due to readahead; many random 8KB reads waste bandwidth.

### Detection

```bash
# Per-device counters every 1s
iostat -x 1

# Which process is doing I/O
iotop -oPa

# eBPF tools: latency histogram per device
biolatency-bpfcc 10 1
```

### Fixes

```javascript
// Stream instead of read-all (Node)
const rs = fs.createReadStream('huge.json');
rs.pipe(JSONStream.parse('items.*')).on('data', emit);
```

```sql
-- Postgres: reduce WAL fsync pressure
ALTER SYSTEM SET synchronous_commit = 'remote_apply'; -- if replicas exist
ALTER SYSTEM SET commit_delay = 1000;                 -- µs, batches fsync
ALTER SYSTEM SET commit_siblings = 5;
SELECT pg_reload_conf();
```

```bash
# Move hot tablespace to a higher-IOPS volume
# AWS: switch from gp2 to gp3 with provisioned IOPS
aws ec2 modify-volume --volume-id vol-123 --volume-type gp3 --iops 6000
```

### Verification Metrics

- Per-device `await`: target < 10ms.
- iowait% during peak: target < 10%.
- Sync-call count per second on the event loop: target 0.

---

## 6. Lock Contention & Async Bottlenecks

### Strong vs Weak Symptoms

| Signal | Strong Lock/Async-bound | Weak |
|--------|-------------------------|------|
| Mutex wait time / total | > 20% | < 5% |
| Threads `BLOCKED` in jstack | many | few |
| Event loop lag (Node, Python) | > 50ms | < 10ms |
| Throughput vs concurrency | Flat or declining | Linear up to CPU saturation |
| Goroutine count (Go) | Growing without bound | Bounded |

### Mechanics

- **Contention on a single mutex**: classic database connection pool
  lock, cache lock, or in-memory map mutex. Throughput plateaus far
  below CPU saturation.
- **Convoying**: a slow critical section forces many short critical
  sections to queue. Common with logging that writes to a synchronous
  appender.
- **False sharing**: two unrelated variables share a cache line. Threads
  fighting for them ping-pong cache lines. Detectable with `perf c2c`.
- **Async starvation**: a blocking call inside an async function holds
  the event loop hostage. All callbacks queue behind it.

### Detection

```bash
# Java: take thread dump every 5s and grep BLOCKED
for i in 1 2 3; do jstack $(pgrep java) > dump_$i.txt; sleep 5; done
grep -c BLOCKED dump_*.txt

# Go: contention profile
go tool pprof -http=:8080 'http://localhost:6060/debug/pprof/mutex'

# Node.js event loop lag
const monitorEventLoopDelay = require('perf_hooks').monitorEventLoopDelay;
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable(); setInterval(() => console.log(h.mean, h.max), 1000);
```

### Fixes

```java
// Shard a hot lock by key
ConcurrentHashMap<String, ReentrantLock> shards = new ConcurrentHashMap<>();
ReentrantLock lockFor(String key) {
  return shards.computeIfAbsent(key, k -> new ReentrantLock());
}
```

```javascript
// Move CPU-heavy work off the event loop
const { Worker } = require('worker_threads');
function compute(buf) {
  return new Promise((resolve, reject) => {
    const w = new Worker('./worker.js', { workerData: buf });
    w.once('message', resolve); w.once('error', reject);
  });
}
```

```go
// Bounded goroutine pool to avoid runaway concurrency
sem := make(chan struct{}, runtime.NumCPU()*2)
for _, item := range work {
  sem <- struct{}{}
  go func(it Item) { defer func(){ <-sem }(); handle(it) }(item)
}
```

### Verification Metrics

- Mutex wait time / total run time: target < 5%.
- Throughput when concurrency is increased: should rise until CPU
  saturates, not plateau early.
- Event-loop lag p99: target < 50ms for interactive workloads.

---

## Amdahl's Law in Practice

`Speedup_total = 1 / ((1 - P) + P / S)` where `P` is the *measured* time
fraction of the section you optimised and `S` is the local speedup.

Examples:
- The slow query took 200 ms out of a 400 ms request (P = 0.5). You
  index it and it now runs in 20 ms (S = 10). Total speedup is
  `1 / (0.5 + 0.05) = 1.82×`. Request now 220 ms.
- A function uses 5% of total time (P = 0.05). You make it 100× faster.
  Speedup is `1 / (0.95 + 0.0005) ≈ 1.05×`. Not worth the engineering.

**Rule**: if the targeted section is < 10% of total time, the
*maximum* you can ever save is 10% — and you almost never get the
maximum. Spend engineering only on sections > 20% of total time.

---

## Tail Latency: When p50 Lies

A healthy p50 with a sick p99 nearly always indicates one of:

1. **Queueing**: requests wait behind a head-of-line blocker.
2. **GC pause**: STW collection halts every request currently in flight.
3. **Cache miss storm**: cold-start requests pay the full cost.
4. **Hot keys**: a few entities (e.g. one popular user) take all the
   traffic and serialise on locks or DB rows.
5. **Coordinated omission**: your load generator stops pushing during
   slowdowns, hiding the worst events. Use `wrk2` or `k6` with
   constant-rate load instead of constant-VU.

When p99 ≫ p50, profile **only the slow requests**. Add request-level
tracing (OpenTelemetry) and filter spans by duration.

---

## Bottleneck Priority Heuristics

1. Fix the biggest bottleneck first — measure first, do not guess.
2. Order of expected impact in a typical web service:
   `DB > Network > CPU > Memory > Disk I/O`
   but verify with profile, do not assume.
3. If p95 ≫ p50, attack tail-latency causes (queues, GC, hot keys)
   before mean-latency causes.
4. Re-profile after every fix — fixing one bottleneck almost always
   exposes the next.
5. Stop when the system is inside its latency / cost budget. There is
   always one more optimisation; usually it is not worth its risk.

---

## Bottleneck Cheat-Sheet

| Symptom | Likely Cause | First Check |
|---------|--------------|-------------|
| iowait > 30% | Disk I/O | `iostat -x 1` |
| App CPU 100%, DB idle | App-side compute | flame graph |
| App CPU low, DB CPU high | Slow query | `pg_stat_statements` |
| Latency rises with users, throughput flat | Lock contention | mutex profile |
| Memory grows monotonically | Leak | heap diff |
| GC% > 10% | Allocation pressure | allocation profile |
| Many tiny HTTP calls | Chatty client | trace waterfall |
| TLS handshake on every call | No keep-alive | `ss -ti` |
| p99 ≫ p50, p50 fine | Queueing / GC | latency histogram, GC log |
| Slow only for some users | Hot keys / IDOR | per-tenant profile |
