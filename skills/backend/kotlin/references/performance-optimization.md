# Kotlin Backend Performance Optimization

Measuring and improving throughput, latency, and memory of Kotlin/JVM services. Profile first; the fixes below target the issues profiling most often reveals.

## Measure Before Changing

| Tool | Use |
|------|-----|
| JDK Flight Recorder (`-XX:StartFlightRecording`) + JDK Mission Control | Low-overhead production profiling: CPU, allocations, locks, GC |
| async-profiler | CPU/allocation flame graphs, wall-clock mode for blocked threads |
| kotlinx-benchmark / JMH | Microbenchmarks with warmup and forked JVMs |
| Micrometer + Prometheus | Latency percentiles, pool usage, GC pauses in production |
| k6 / Gatling | Load tests against a realistic environment |

```bash
java -XX:StartFlightRecording=duration=120s,filename=rec.jfr,settings=profile -jar app.jar
jcmd <pid> JFR.start duration=60s filename=/tmp/rec.jfr
```

Never benchmark with a single `measureTimeMillis` call; JIT warmup dominates.

## Coroutines and Dispatchers

| Work | Dispatcher |
|------|-----------|
| Non-blocking I/O (Ktor client, R2DBC) | Caller's context; no switch needed |
| Blocking JDBC/file I/O | `Dispatchers.IO` (default 64 threads, elastic) |
| CPU-heavy work | `Dispatchers.Default` (cores-sized) |
| Bounded blocking to a pool of size N | `Dispatchers.IO.limitedParallelism(N)` |

```kotlin
private val dbDispatcher = Dispatchers.IO.limitedParallelism(20)   // match JDBC pool size

suspend fun findOrders(customerId: Long) = withContext(dbDispatcher) {
    dataSource.connection.use { conn -> queryOrders(conn, customerId) }
}
```

Blocking a Netty event-loop thread stalls every request on that loop; async-profiler wall-clock mode shows it.

### Parallel Fan-out with Bounds

```kotlin
suspend fun loadAll(ids: List<Long>): List<Product> = coroutineScope {
    val permits = Semaphore(16)
    ids.map { id -> async { permits.withPermit { client.getProduct(id) } } }.awaitAll()
}
```

Unbounded `async` over thousands of ids overloads downstream services and connection pools.

### Virtual Threads (JDK 21+)

Spring Boot 3.2+ supports `spring.threads.virtual.enabled=true`, letting blocking MVC/JDBC code scale without coroutines. Avoid long `synchronized` blocks around blocking calls on JDK versions that still pin carrier threads (pinning on `synchronized` was removed in JDK 24).

## Allocation Reduction

- `@JvmInline value class` for typed IDs avoids boxing in most non-generic uses.
- Use `Sequence` only for long chains on large collections where intermediate lists matter; for small collections, `List` operations are faster.
- `buildList { }` / `buildString { }` with known capacity in hot paths.
- Avoid `String.format` and regex compilation in loops; hoist `Regex` to a top-level `val`.
- `inline` higher-order functions in hot paths remove lambda allocation; do not inline large bodies.

## Serialization

- kotlinx.serialization uses compile-time generated serializers (no reflection); configure one shared `Json` instance (`Json { ignoreUnknownKeys = true }`) — creating `Json` per call is costly.
- Jackson: register `jacksonObjectMapper()` once; `ObjectMapper` is thread-safe after configuration.
- Stream large responses (`call.respondOutputStream`, `Flow` with NDJSON) instead of building giant lists.

## Database Access

- Size the connection pool (HikariCP `maximumPoolSize`) from DB capacity, not thread count; small pools (10–30) usually beat large ones.
- Fetch only needed columns; paginate with keyset (`WHERE id > ? ORDER BY id LIMIT ?`), not large `OFFSET`.
- Batch inserts (`batchInsert` in Exposed, JDBC `addBatch`).
- Eliminate N+1 queries: join or `WHERE id = ANY(?)`.
- Enable `reWriteBatchedInserts=true` for the PostgreSQL JDBC driver when batching.

## HTTP Client

```kotlin
val client = HttpClient(CIO) {
    install(HttpTimeout) {
        connectTimeoutMillis = 2_000
        requestTimeoutMillis = 5_000
    }
    engine { maxConnectionsCount = 200 }
}
```

Create clients once and reuse them; a client per request leaks connection pools and threads.

## JVM and GC Settings

| Setting | Guidance |
|---------|----------|
| `-XX:MaxRAMPercentage=75` | Heap sized from container limit |
| G1 (default) | Good general choice for most services |
| ZGC (`-XX:+UseZGC`, generational by default in JDK 23+) | Low pause times for large heaps |
| `-Xlog:gc*:file=gc.log` | Keep GC logs for incident analysis |
| CDS / AppCDS, Spring AOT, CRaC, GraalVM native | Startup time reduction |

Tune only with evidence from GC logs or JFR.

## Caching

- In-process: Caffeine with size bound and TTL; use `AsyncCache` for coroutine-friendly loading via futures.
- Distributed: Redis with explicit TTL and stampede protection (single-flight per key).
- Cache keys must include tenant/locale when responses vary by them.

## Pitfalls

- `runBlocking` inside request handlers or other coroutines → thread starvation.
- `Dispatchers.IO` used for CPU work → oversubscription.
- Logging string interpolation at DEBUG in hot loops; use `logger.debug { "Loaded $count rows" }` lambdas (kotlin-logging) so the message is built only when enabled.
- Unbounded in-memory caches and `MutableSharedFlow` buffers.

## Checklist

- [ ] Profiled with JFR/async-profiler under realistic load
- [ ] No blocking calls on event-loop threads
- [ ] Fan-out bounded by semaphore or `limitedParallelism`
- [ ] Shared, reused HTTP clients and serializers
- [ ] Pool sizes derived from downstream capacity
- [ ] Container-aware heap settings and GC logs enabled
