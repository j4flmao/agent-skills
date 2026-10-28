---
name: lang-csharp
description: >
  Use this skill when the user says 'C#', 'csharp', '.NET', 'dotnet', 'async await C#', 'LINQ', 'nullable reference types', 'Span<T>', 'records', 'pattern matching', 'IDisposable', 'xUnit', 'NuGet', 'dotnet CLI'. Writes and reviews modern C# on current .NET (LTS .NET 10): language features, async/await correctness, nullable reference types, LINQ and allocation-aware code, resource disposal, project/build setup and testing. Do NOT use for: ASP.NET Core service architecture (use backend/dotnet/*), Unity scripting (use unity / unity-csharp), .NET MAUI apps (use mobile-dotnet-maui), desktop UI frameworks (use desktop skills).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [languages, csharp, dotnet, async, linq]
---

# C#

## Purpose
C# combines a managed runtime with value types, spans and a mature async model. Most production bugs come from async misuse (deadlocks, `async void`, unobserved tasks), null handling, and hidden allocations. This skill covers the idioms and settings that prevent them on current .NET.

## Agent Protocol

### Trigger
"C#", "csharp", ".NET", "dotnet", "async await", "LINQ", "nullable reference types", "Span<T>", "records", "pattern matching", "IDisposable", "xUnit", "NuGet".

### Input Context
- Target framework (`net10.0` LTS, `net8.0` LTS, `netstandard2.0` for libraries) and C# language version
- App type (library, console, ASP.NET Core, worker, desktop) and AOT/trimming needs
- Analyzer/nullable settings in the `.csproj`

### Output Artifact
C# code, `.csproj` settings, or review findings. No file unless requested.

### Response Format
```
TFM/C#: {net10.0 / C# 14}
Change: {what and why}
Code: {snippet}
Async/nullability notes: {cancellation, ConfigureAwait, null contracts}
Verify: {dotnet test, analyzers, benchmarks}
```

## 1. Project Baseline
```xml
<PropertyGroup>
  <TargetFramework>net10.0</TargetFramework>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <AnalysisLevel>latest-recommended</AnalysisLevel>
</PropertyGroup>
```
- .NET releases yearly in November; even-numbered releases are LTS (3 years), odd ones STS (2 years as of .NET 9's policy change). Pin the SDK with `global.json`; central package versions via `Directory.Packages.props`.

## 2. Types
- `class` (reference), `struct` (value; keep small and preferably `readonly struct`), `record`/`record struct` for immutable data with value equality and `with` expressions.
- Primary constructors (C# 12) for DI-style classes: `public sealed class OrderService(IClock clock, IOrderRepo repo) { ... }`.
- Pattern matching: `switch` expressions, property and list patterns:
```csharp
decimal Discount(Order o) => o switch
{
    { Total: > 1000m, Customer.IsVip: true } => 0.15m,
    { Items: [_, _, _, ..] }                  => 0.05m,   // 3+ items
    _                                         => 0m,
};
```
- Nullable reference types: `string?` may be null, `string` must not. Fix warnings rather than suppressing with `!`; validate at boundaries with `ArgumentNullException.ThrowIfNull(arg)`.

## 3. Async/Await
- Return `Task`/`Task<T>` (or `ValueTask` for hot paths that often complete synchronously — await it once only). `async void` only for event handlers: exceptions there crash the process.
- Never block on async code (`.Result`, `.Wait()`, `GetAwaiter().GetResult()`): it wastes thread-pool threads and deadlocks under a synchronisation context (UI, legacy ASP.NET).
- Pass `CancellationToken` through every async API and honour it.
- Libraries may use `ConfigureAwait(false)`; ASP.NET Core has no synchronisation context, so it is unnecessary in app code there.
- Concurrency: `Task.WhenAll` for fan-out, `Parallel.ForEachAsync` with `MaxDegreeOfParallelism` for bounded parallel I/O, `Channel<T>` for producer/consumer, `SemaphoreSlim` for async locking (no `lock` around `await`).
```csharp
public async Task<IReadOnlyList<Price>> FetchAllAsync(IEnumerable<string> skus, CancellationToken ct)
{
    var results = new ConcurrentBag<Price>();
    await Parallel.ForEachAsync(skus, new ParallelOptions { MaxDegreeOfParallelism = 8, CancellationToken = ct },
        async (sku, token) => results.Add(await _client.GetPriceAsync(sku, token)));
    return results.ToList();
}
```

## 4. LINQ and Allocations
- LINQ is fine for clarity; in hot loops it allocates enumerators/delegates — use loops or `Span<T>` there after profiling.
- Deferred execution: queries run on enumeration; materialise once (`ToList()`) when enumerating more than once. With EF Core, keep queries `IQueryable` until the server-side shape is final.
- `Span<T>`/`ReadOnlySpan<T>`/`Memory<T>` for slicing without copies; `stackalloc` for small buffers; `ArrayPool<T>.Shared` for large temporary arrays; `StringBuilder` or `string.Create` for building strings in loops.
- Measure with BenchmarkDotNet (`[MemoryDiagnoser]`), not stopwatch loops.

## 5. Resources and Exceptions
- `using var x = ...;` / `await using` for `IDisposable`/`IAsyncDisposable`. Do not dispose objects you do not own.
- `HttpClient`: reuse via `IHttpClientFactory` or a long-lived static instance (with `PooledConnectionLifetime`) — `new HttpClient()` per request exhausts sockets.
- Throw specific exceptions; catch where you can handle; rethrow with `throw;` to keep the stack trace. Log with structured templates: `logger.LogError(ex, "Failed to load order {OrderId}", id);`.

## 6. Performance and Deployment
- Server GC + tiered compilation + Dynamic PGO are defaults on modern .NET.
- Native AOT (`<PublishAot>true</PublishAot>`) for fast-starting CLIs/services: requires trim-safe code — prefer source generators (System.Text.Json `JsonSerializerContext`, regex `[GeneratedRegex]`, logging `[LoggerMessage]`) over reflection.
- `dotnet publish -c Release -r linux-x64` for self-contained builds; container images via `dotnet publish /t:PublishContainer`.

## 7. Testing
xUnit (or NUnit/MSTest), `FluentAssertions`/`Shouldly` style assertions, NSubstitute or Moq for doubles, `WebApplicationFactory` for ASP.NET Core integration tests, Testcontainers for real dependencies. See `references/csharp-testing.md`.

## 8. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| `async void` methods | unobservable exceptions, crash | `async Task` |
| `.Result` / `.Wait()` | deadlocks, thread starvation | `await` all the way |
| `lock` around `await` | compile error / misuse attempts with Monitor | `SemaphoreSlim.WaitAsync` |
| `new HttpClient()` per call | socket exhaustion | factory / shared client |
| Catch-all `catch (Exception) {}` | hidden failures | handle specific exceptions, log |
| Mutable structs | copies silently diverge | `readonly struct` / records |
| Ignoring nullable warnings with `!` | NREs at runtime | fix the contract |

## 9. Checklist
- [ ] Nullable enabled, warnings as errors, analyzers on
- [ ] Async all the way with cancellation tokens; no sync-over-async
- [ ] Disposables owned and disposed exactly once
- [ ] Hot paths benchmarked with BenchmarkDotNet before optimising
- [ ] AOT/trimming warnings clean if publishing AOT

## References
- `references/csharp-fundamentals.md` — value vs reference types, LINQ, async basics
- `references/csharp-advanced.md` — Span, reflection, source generators
- `references/design-patterns-generics.md` — generics and design patterns
- `references/csharp-testing.md` — xUnit, mocking, assertions
