# Performance Optimization in ASP.NET Core and EF Core

Measure-first performance guidance for .NET services: profiling and benchmarking tools, EF Core query efficiency, allocation reduction, async and threading pitfalls, HTTP client usage, caching and response compression. Applies to .NET 8 and later.

## Measure First

| Tool | Use |
|------|-----|
| BenchmarkDotNet | Micro-benchmarks of methods with statistical rigor and allocation stats (`[MemoryDiagnoser]`) |
| `dotnet-counters` | Live runtime metrics: CPU, GC heap, allocation rate, thread pool queue, exceptions |
| `dotnet-trace` + PerfView / Visual Studio / speedscope | CPU sampling and event traces |
| `dotnet-gcdump`, `dotnet-dump` | Heap analysis, memory leaks |
| OpenTelemetry metrics and traces | Production latency per endpoint and dependency |
| Load testing (k6, NBomber, Bombardier) | Throughput and latency at target concurrency |

```bash
dotnet tool install -g dotnet-counters
dotnet-counters monitor -n Orders.Api --counters System.Runtime,Microsoft.AspNetCore.Hosting
```

```csharp
[MemoryDiagnoser]
public class SerializationBenchmarks
{
    private readonly Order _order = Order.Sample();

    [Benchmark(Baseline = true)]
    public string Reflection() => JsonSerializer.Serialize(_order);

    [Benchmark]
    public string SourceGenerated() => JsonSerializer.Serialize(_order, AppJsonContext.Default.Order);
}
```

Run benchmarks in Release mode, never under a debugger.

## EF Core Query Efficiency

Database access dominates most API latency.

```csharp
// Read-only projection: no tracking, only needed columns
var orders = await db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == customerId && o.CreatedAt >= since)
    .OrderByDescending(o => o.CreatedAt)
    .Select(o => new OrderSummary(o.Id, o.Total, o.Status))
    .Take(50)
    .ToListAsync(ct);
```

| Problem | Fix |
|---------|-----|
| N+1 queries (lazy loading or per-item queries in loops) | Projection with `Select`, `Include` for needed navigations, or batch by IDs |
| Cartesian explosion with multiple collection `Include`s | `AsSplitQuery()` or projection |
| Tracking overhead on reads | `AsNoTracking()`; or `UseQueryTrackingBehavior(NoTracking)` as default |
| Client-side evaluation of large sets | Keep filters translatable; check generated SQL |
| Offset pagination on deep pages | Keyset pagination (`WHERE (CreatedAt, Id) < (@lastCreatedAt, @lastId)`) |
| Row-by-row updates/deletes | `ExecuteUpdateAsync` / `ExecuteDeleteAsync` (set-based, .NET 7+) |
| Many inserts | Batching is automatic in `SaveChanges`; for bulk loads use `SqlBulkCopy` or COPY |
| Missing indexes | Read execution plans; index foreign keys and filter columns |

```csharp
await db.Orders
    .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
    .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Expired), ct);
```

Log SQL in development (`LogTo(Console.WriteLine, LogLevel.Information)` or the `Microsoft.EntityFrameworkCore.Database.Command` category) and inspect queries with `ToQueryString()`.

Other EF Core options:
- `AddDbContextPool<T>()` reuses context instances to cut allocation per request.
- Compiled queries (`EF.CompileAsyncQuery`) for very hot queries.
- Compiled models (`dotnet ef dbcontext optimize`) reduce startup for large models.

## Allocation and CPU

- Use `System.Text.Json` source generation (`JsonSerializerContext`) for hot types; required for Native AOT.
- `Span<T>`, `ReadOnlySpan<char>` and `stackalloc` for parsing without substrings.
- `ArrayPool<T>.Shared` for temporary buffers; return them in `finally`.
- `StringBuilder` or `string.Create` instead of repeated concatenation in loops.
- `FrozenDictionary` / `FrozenSet` (.NET 8+) for read-mostly lookup tables built at startup.
- Avoid LINQ in the hottest loops when profiling shows allocation cost; LINQ is fine elsewhere.
- Use `SearchValues<T>` (.NET 8+) for repeated character or substring searches.

## Async and Threading

| Anti-pattern | Effect | Fix |
|--------------|--------|-----|
| `.Result`, `.Wait()`, `GetAwaiter().GetResult()` on async code | Thread pool starvation under load | Async all the way |
| `Task.Run` in request handlers to "make it async" | Extra thread hop, no scalability gain | Call true async APIs |
| `async void` (except event handlers) | Unobserved exceptions crash process | Return `Task` |
| Not passing `CancellationToken` | Work continues after client disconnects | Accept and pass `ct` everywhere |
| Lock contention on hot paths | Throughput collapse | `ConcurrentDictionary`, partitioning, `System.Threading.Lock` (.NET 9+) for short critical sections |

Thread pool starvation symptom: `dotnet-counters` shows a growing ThreadPool Queue Length and latency rises while CPU stays low.

## HTTP Clients

```csharp
builder.Services.AddHttpClient<PaymentsClient>(c =>
{
    c.BaseAddress = new Uri(builder.Configuration["Payments:BaseUrl"]!);
    c.Timeout = TimeSpan.FromSeconds(10);
})
.AddStandardResilienceHandler();   // Microsoft.Extensions.Http.Resilience
```

- Never `new HttpClient()` per request (socket exhaustion); use `IHttpClientFactory` or a long-lived client with `PooledConnectionLifetime` for DNS changes.
- Stream large responses (`HttpCompletionOption.ResponseHeadersRead`, `ReadFromJsonAsAsyncEnumerable`).

## Caching and Output

| Mechanism | Scope | Use |
|-----------|-------|-----|
| `IMemoryCache` | Per instance | Hot, small, rebuildable data |
| `HybridCache` (.NET 9+, `Microsoft.Extensions.Caching.Hybrid`) | Memory + distributed, stampede protection | Default choice for application caching |
| Output caching (`AddOutputCache`, `.CacheOutput()`) | Server-side HTTP responses | Expensive GETs with cacheable results |
| Response caching / HTTP headers | Clients and CDNs | Public, cacheable resources |

See `state-management.md` for cache configuration and invalidation.

## Response Size and Server Settings

- Response compression (`AddResponseCompression` with Brotli/Gzip) for text responses when not already done by a reverse proxy; beware of compressing secrets over HTTPS together with attacker-controlled input (BREACH).
- Pagination limits on all list endpoints.
- Kestrel limits (`MaxRequestBodySize`, `MaxConcurrentConnections`) sized to protect the service.
- Server GC is the default for ASP.NET Core; in memory-constrained containers consider `DOTNET_GCHeapHardLimit` or the newer dynamic adaptation (DATAS, default in .NET 9+ server GC) behavior.

## Startup and Footprint

- ReadyToRun (`<PublishReadyToRun>true</PublishReadyToRun>`) reduces JIT at startup.
- Native AOT for fastest startup and smallest memory where library compatibility allows.
- Tiered PGO is on by default (.NET 8+) and improves steady-state throughput.

## Checklist

- [ ] Baseline latency/throughput measured with a load test
- [ ] Hot endpoints profiled; allocation rate checked
- [ ] EF Core reads use projections and `AsNoTracking`; no N+1
- [ ] Set-based updates for bulk changes; indexes verified with plans
- [ ] No sync-over-async; cancellation tokens propagated
- [ ] `IHttpClientFactory` with resilience handler and timeouts
- [ ] Caching applied where measured benefit exists
