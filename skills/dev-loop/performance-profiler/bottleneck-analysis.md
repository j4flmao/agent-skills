# Bottleneck Analysis

## Database Bottlenecks

The most common bottleneck in backend applications. Always profile database queries before blaming other layers.

### N+1 Query Pattern
Detected by: seeing the same query repeated N times with different parameters in profiling output. The first query loads a list, then each iteration triggers a second query. Fix: eager loading (JOIN in SQL, Include() in EF Core, select_related in Django ORM, Preload in GORM).

### Missing Indexes
Detected by: sequential scans on large tables in EXPLAIN ANALYZE output. Fix: add B-tree index for equality conditions and range scans, add covering indexes for frequently accessed columns, add GIN indexes for JSONB/array columns. Verify with `EXPLAIN ANALYZE` after adding — check that Seq Scan → Index Scan.

### Slow Joins
Symptoms: high CPU on database server, queries with large join counts. Fix: ensure join columns are indexed on both sides, avoid joining tables with mismatched column types (prevents index use), consider denormalization for frequently joined hot paths, use materialized views for complex join-heavy reporting queries.

### Lock Contention
Symptoms: queries in "waiting" state, application timeouts, deadlocks in logs. Fix: reduce transaction duration (move slow operations outside the transaction), use row-level locking instead of table-level, set appropriate isolation levels (READ COMMITTED for most cases, avoid SERIALIZABLE unless needed), add retry logic with exponential backoff for deadlock victims. Query `pg_locks` or `sys.dm_tran_locks` to identify blocker chains.

### Connection Pool Exhaustion
Symptoms: connection timeout errors, threads blocked on pool acquisition, database server CPU <50% but application is slow. Fix: increase pool size appropriately (pool_size = T * (C - 1) + 1 where T = thread count and C = max concurrent queries per thread), reduce connection hold time, implement connection health checks, use async database drivers to release connections while waiting.

## Network Bottlenecks

### Chatty API Calls
Symptoms: waterfall chart showing many sequential HTTP requests, high call count per operation. Fix: batch requests (GraphQL, OData, bulk endpoints), parallelize independent calls, consolidate related endpoints, implement response caching to eliminate duplicate calls.

### Serialization Overhead
Symptoms: high CPU in serialization library functions in profiling output, large payload sizes. Fix: use faster serialization (Protocol Buffers, MessagePack instead of JSON where possible), reduce payload size (field selection, pagination, compression with gzip/brotli), enable HTTP/2 for header compression and multiplexing.

### TLS Handshake
Symptoms: high "TLS" or "SSL" time in network waterfall, connection establishment dominating request time. Fix: enable TLS session resumption (session tickets, session IDs), implement HTTP keep-alive and connection pooling, use TLS 1.3 (reduced to 1-RTT handshake, or 0-RTT for repeat connections), consider terminating TLS at a reverse proxy close to clients.

### Bandwidth Limits
Symptoms: throughput plateaus regardless of server scaling, gap between theoretical and actual throughput. Fix: compress responses, use CDN for static assets, implement data pagination with cursor-based pagination, reduce image/media sizes (WebP, AVIF, responsive resolution), move large data transfers to background jobs.

## CPU Bottlenecks

### Tight Loops
Symptoms: single function dominating CPU profile, high instructions-per-cycle count, function time concentrated in a few lines. Fix: move invariant computation outside the loop, replace O(n²) algorithms with O(n log n) or O(n) alternatives, use vectorized operations (SIMD, NumPy, .NET Vector<T>), hoist memory allocations outside loops.

### Regex Backtracking
Symptoms: regex functions showing high CPU, especially with "evil regex" patterns. Fix: avoid nested quantifiers in same pattern (e.g., `(a+)+b`), use possessive quantifiers (`*+` `++` `?+`) where available, set timeout on regex execution, replace complex regexes with simpler string operations (startswith, contains, indexOf chains), pre-compile regex patterns used in hot paths.

### Serialization/Deserialization
Symptoms: JSON serializer showing as the top CPU consumer, high allocation rate from string and byte array creation. Fix: use source-generated serializers (System.Text.Json source gen, json_serializable in Dart), pre-compile serialization mappings, use schema-based formats (Protobuf, FlatBuffers) for internal services, stream objects instead of buffering entire payloads.

### Garbage Collection
Symptoms: frequent GC pauses in the profile, high "% Time in GC" metric, sawtooth memory usage patterns. Fix: reduce allocation rate (object pooling, structs instead of classes for small types), reduce large object heap allocations (arrays >85KB), tune GC mode (Server GC for throughput, Workstation GC for latency), use spanning APIs to avoid substrings and array copies.

## Memory Bottlenecks

### Memory Leaks
Symptoms: heap size grows monotonically over time, OOM crashes after hours/days of operation, Gen 2 heap size never decreases. Detection: take heap snapshots at intervals and diff. Look for types that grow between snapshots. Trace retention path to find the unintentional root reference. See Memory Leak Detection in debugging-strategy skill.

### GC Pressure
Symptoms: high CPU in garbage collector (GC), frequent collections, thread pauses from stop-the-world GC. Fix: reduce allocation frequency and size, use pooling for frequently allocated objects, avoid allocating in hot paths, use value types for small frequently-allocated data, tune GC latency mode.

### Cache Bloat
Symptoms: object cache grows beyond expected size, memory pressure from cached data, cache hit rate does not improve with size increase. Fix: set maximum cache size with eviction policy (LRU, LFU, TTL), use weak references for cachable objects, profile cache hit rate vs size to find the optimal balance, implement cache partitioning for multi-tenant scenarios.

### Object Allocation Hot Spots
Symptoms: high allocation rate in profiling output, frequent Gen 0/1 collections, high CPU from allocation overhead. Fix: pre-allocate buffers and reuse, convert LINQ queries to loops (each LINQ call allocates enumerator objects), use StringBuilder for string concatenation in loops, avoid closures in hot paths (each closure allocates), use arrays instead of List<T> for fixed-size collections.

## I/O Bottlenecks

### Synchronous Blocking
Symptoms: threads in "Waiting" or "Blocked" state in thread pool, many threads in stack traces showing file read/write, low CPU utilization despite high latency. Fix: use async I/O everywhere (ReadAsync, WriteAsync, sendfile), increase thread pool size only as temporary measure, verify async actually goes async — missing await or .Result causes sync-over-async.

### Connection Pool Exhaustion (I/O)
Symptoms: timeouts acquiring connections from pool, all connections in use in database monitoring, threads blocked on pool wait. Fix: increase pool limits, reduce connection hold duration, close connections in finally blocks or use statements, implement circuit breaker for failing dependencies, verify connection leak tracking.

### Disk Saturation
Symptoms: high iowait % in `top`/`vmstat`, high disk queue length, read/write latency >10ms. Fix: move data to faster storage (NVMe over HDD), increase filesystem cache (vm.dirty_ratio), implement read/write caches, reduce fsync frequency (trade durability for speed where appropriate), partition data across multiple disks.

## Async / Event Loop Bottlenecks

### Event Loop Starvation
Node.js, Python asyncio, and other event-loop runtimes share a single thread for all application code. A single CPU-bound operation blocks ALL concurrent requests. Symptoms: all concurrent requests slow down simultaneously, event loop lag metric increases, one endpoint causing latency for unrelated endpoints. Fix: offload CPU work to worker threads or child processes, break long operations with `setImmediate` / `asyncio.sleep(0)`, use native async I/O for all blocking operations.

### Promise / Future Chaining
Deep chains of `.then()` or `await` create sequential dependencies that extend total execution time. Symptoms: waterfall profile with many short segments, high total time but low per-segment time. Fix: parallelize independent promises with `Promise.all`, use `Promise.allSettled` when partial results are acceptable, restructure chains to compute independent values concurrently.

### Callback Queue Saturation
When the callback queue grows faster than the event loop can drain it, latency increases linearly. Symptoms: callbacks scheduled but not executed for seconds, queue depth growing under load. Fix: implement backpressure (stop accepting new work when queue exceeds limit), use streaming APIs instead of buffering, increase number of event loop threads if runtime supports it.

## Lock Contention

### Mutex / Monitor Contention
Multiple threads competing for the same lock. Symptoms: threads spending significant time in "waiting" or "blocked" state in thread dumps, lock contention events in profiler, CPU utilization below 100% despite high load. Fix: reduce lock duration (move work outside lock), reduce lock frequency (batch operations, optimistic concurrency), replace exclusive locks with read-write locks for read-dominated workloads, use lock-free data structures (ConcurrentDictionary, atomic operations, RCU).

### Deadlocks
Two or more threads each holding a lock the other needs. Symptoms: threads frozen with no progress, periodic thread dump shows threads in BLOCKED state with a circular wait graph, application throughput drops to zero for specific operations. Fix: enforce lock ordering (always acquire locks in the same order), use timeout-based lock acquisition (`TryEnter` with timeout), use lock hierarchy with validation, detect deadlocks programmatically with watchdog threads.

### Thread Pool Starvation
All threads in the pool are blocked, no thread available to process new work. Symptoms: thread pool grows to maximum, new work queued, response latency increases linearly with queue depth, async operation not completing because the continuation requires a thread from the same pool. Fix: never block on async operations (avoid `.Result`, `.Wait()` in .NET; avoid `get()` on futures in Java), increase thread pool limits temporarily, use dedicated thread pool for long-running operations, implement circuit breaker to fail fast instead of queuing indefinitely.

## Prioritization

Apply Amdahl's law to prioritize fixes. The bottleneck that consumes the most time yields the largest potential improvement. Use this order:

1. Measure all candidate bottlenecks under the same workload.
2. Rank by total time contribution (CPU × frequency, I/O wait, blocked time).
3. Estimate speedup for each candidate using Amdahl's law: speedup = 1 / ((1 - P) + P / S) where P is the fraction of time in the parallelizable portion and S is the speedup of that portion.
4. Fix the highest-impact bottleneck first.
5. Remeasure — the next bottleneck is now more prominent.
6. Repeat until the remaining bottlenecks have acceptable impact.

Common trap: optimizing a function that takes 5% of total time yields at most 5% improvement. Skip it and find the 40% contributor. Use profiling data to rank, not intuition — developers consistently misidentify bottlenecks without measurement.
