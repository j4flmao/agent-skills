# State Management in ASP.NET Core: Caching, Sessions and Distributed State

ASP.NET Core services should be stateless across requests so any instance can serve any request. State that must survive between requests lives in a database, a distributed cache, or the client. This reference covers in-memory and distributed caching (including `HybridCache`), cache invalidation, session state, concurrency control and where each kind of state belongs.

## Where State Belongs

| State | Store | Notes |
|-------|-------|-------|
| Business data (orders, accounts) | Database | Source of truth; transactions and constraints |
| Derived/expensive-to-compute data | Cache (memory, Redis) | Rebuildable; tolerate eviction |
| User authentication | Token (JWT) or auth cookie | Validate per request; avoid server-side session for auth when possible |
| Short-lived workflow state (wizard steps) | Database row with expiry, or client | Session state only for small, non-critical data |
| Cross-instance coordination | Database (row locks, unique constraints), Redis with care, or a lock service | Prefer database constraints over distributed locks |
| Per-request data | `HttpContext.Items`, scoped services | Gone after the request |

Do not keep mutable state in static fields or singletons unless it is a cache that tolerates per-instance divergence.

## In-Memory Cache

```csharp
builder.Services.AddMemoryCache(o => o.SizeLimit = 10_000);

public sealed class CountryCatalog(IMemoryCache cache, CatalogDbContext db)
{
    public Task<IReadOnlyList<Country>> GetAllAsync(CancellationToken ct) =>
        cache.GetOrCreateAsync("countries:all", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            entry.Size = 1;
            return (IReadOnlyList<Country>)await db.Countries.AsNoTracking().ToListAsync(ct);
        })!;
}
```

- Per instance: each pod caches separately and may serve slightly different data after updates.
- With `SizeLimit` set, every entry must declare `Size`.
- `GetOrCreateAsync` on `IMemoryCache` does not prevent concurrent factory execution (cache stampede); `HybridCache` does.

## HybridCache (.NET 9+)

`HybridCache` (package `Microsoft.Extensions.Caching.Hybrid`, usable from .NET 8 as well) combines an in-process L1 cache with an optional distributed L2 (`IDistributedCache`, for example Redis), with stampede protection and tag-based invalidation.

```csharp
builder.Services.AddStackExchangeRedisCache(o =>
    o.Configuration = builder.Configuration.GetConnectionString("Redis"));

builder.Services.AddHybridCache(o =>
{
    o.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(10),        // L2 (distributed)
        LocalCacheExpiration = TimeSpan.FromMinutes(1) // L1 (in-process)
    };
});

public sealed class ProductService(HybridCache cache, CatalogDbContext db)
{
    public ValueTask<ProductDto?> GetAsync(Guid id, CancellationToken ct) =>
        cache.GetOrCreateAsync(
            $"product:{id}",
            async token => await db.Products.AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new ProductDto(p.Id, p.Name, p.Price))
                .FirstOrDefaultAsync(token),
            tags: ["products"],
            cancellationToken: ct);

    public ValueTask InvalidateAsync(Guid id, CancellationToken ct) =>
        cache.RemoveAsync($"product:{id}", ct);
}
```

Keep `LocalCacheExpiration` short when other instances may update data: L1 entries on other instances are not invalidated by `RemoveAsync` on one instance unless you add a backplane-style notification.

## IDistributedCache Directly

For simple shared key-value needs:

```csharp
await cache.SetStringAsync($"rate:{userId}", json, new DistributedCacheEntryOptions
{
    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
}, ct);
```

Implementations: Redis (`Microsoft.Extensions.Caching.StackExchangeRedis`), SQL Server, PostgreSQL (community), and in-memory for tests. Serialization is your responsibility with the raw interface.

## Cache Invalidation Strategies

| Strategy | How | Trade-off |
|----------|-----|-----------|
| Time-based expiry | Absolute or sliding expiration | Simple; stale up to TTL |
| Explicit removal on write | Remove key after successful DB commit | Fresh; must cover every write path |
| Tag-based | `HybridCache.RemoveByTagAsync("products")` | Bulk invalidation of related entries |
| Versioned keys | Include a version or `rowversion` in the key | No delete needed; old keys expire |
| Event-driven | Publish change events; subscribers evict | Cross-service invalidation; eventual |

Remove from cache **after** the database commit succeeds; removing before commit lets a concurrent reader repopulate stale data.

## Session State

```csharp
builder.Services.AddDistributedMemoryCache();      // replace with Redis in production
builder.Services.AddSession(o =>
{
    o.IdleTimeout = TimeSpan.FromMinutes(20);
    o.Cookie.HttpOnly = true;
    o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    o.Cookie.SameSite = SameSiteMode.Lax;
    o.Cookie.IsEssential = true;
});
app.UseSession();
```

- Session is backed by `IDistributedCache`; with the in-memory implementation it is lost on restart and not shared across instances.
- Session access is not concurrency-safe across simultaneous requests from the same user (last write wins).
- Keep session small; store IDs, not object graphs. For APIs, prefer explicit resources with IDs over session state.

## Optimistic Concurrency

Prevent lost updates when two requests modify the same row:

```csharp
public class Order
{
    public Guid Id { get; set; }
    public OrderStatus Status { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = [];   // SQL Server rowversion
}
```

For PostgreSQL use the `xmin` system column (`builder.Property<uint>("xmin").IsRowVersion()` with Npgsql) or a manual version column. EF Core includes the version in the `WHERE` clause and throws `DbUpdateConcurrencyException` when zero rows are affected; map it to 409 Conflict, or to 412 when the client sent an `If-Match` ETag.

```csharp
app.MapPut("/orders/{id:guid}", async (Guid id, UpdateOrder req, OrdersDbContext db, CancellationToken ct) =>
{
    var order = await db.Orders.FindAsync([id], ct);
    if (order is null) return Results.NotFound();
    db.Entry(order).Property(o => o.RowVersion).OriginalValue = Convert.FromBase64String(req.Version);
    order.Status = req.Status;
    await db.SaveChangesAsync(ct);    // concurrency exception handled globally -> 409
    return Results.NoContent();
});
```

## Idempotency for State-Changing Requests

For POST endpoints that clients may retry, accept an `Idempotency-Key` header, store the key with the result in the same transaction as the side effect, and return the stored result on repeats. A unique index on (client ID, idempotency key) makes this race-free.

## Background and Long-Running State

- Work started by a request but completed later (exports, imports) should be persisted as a job record with status, processed by a background worker or queue consumer, and polled or notified.
- `IHostedService` instances run per pod; do not assume a single instance unless you use leader election or a scheduler that guarantees it.

## Blazor and SignalR Notes

- Blazor Server keeps per-circuit state in server memory; scale-out requires sticky sessions (Azure SignalR Service handles this) and state is lost if the circuit is lost unless persisted.
- SignalR across multiple instances needs a backplane (Redis or Azure SignalR Service).

## Checklist

- [ ] No business state in static fields or singletons
- [ ] HybridCache (or memory + distributed) with explicit TTLs
- [ ] Cache invalidated after successful commits; stampede protected
- [ ] Session only for small, non-critical data, backed by a distributed store
- [ ] Optimistic concurrency tokens on contended entities; conflicts mapped to 409/412
- [ ] Idempotency keys for retried POSTs
- [ ] Long-running work persisted as jobs, not held in memory
