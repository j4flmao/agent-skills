# Mobile Performance Architecture: Budgets, Structure, Observability

App-level design decisions that keep a mobile app fast as it grows: performance budgets, module structure, data/caching layers, and the observability pipeline that catches regressions. Platform-specific techniques live in the topic references (startup, UI pipeline, memory, network, battery).

## 1. Performance Budgets

Define budgets per critical user journey, measured on a named reference device class and build type.

| Metric | Example budget (set your own from baseline data) | Measured by |
|---|---|---|
| Cold start TTID | Below Android vitals threshold with large margin; Apple guidance about 400 ms to first frame | Macrobenchmark / XCTApplicationLaunchMetric |
| Time to full display (home) | Product-defined | `reportFullyDrawn` / signposts |
| Scroll jank / hitch rate | Product-defined percent of frames | FrameTimingMetric / XCTOSSignpostMetric scroll metrics |
| Peak memory on journey | Product-defined MB on low-RAM device | Memory profiler, MetricKit |
| Download size | Product-defined MB | Play Console / App Store Connect size reports |
| Network bytes per session | Product-defined | Proxy capture / analytics |

Rules:
- Budgets are tied to a device tier (e.g. "2-year-old mid-range Android, iPhone two generations back").
- A PR that exceeds a budget needs an explicit owner sign-off.
- Revisit budgets when baselines change, not to hide regressions.

## 2. Module Structure

```
app (thin shell: DI graph, navigation, startup orchestration)
 ├── feature-home        (UI + ViewModel)        loaded at start
 ├── feature-checkout    (UI + ViewModel)        loaded on navigation
 ├── feature-ar          (dynamic feature / on-demand resources)
 ├── core-data           (repositories, cache, sync)
 ├── core-network        (single HTTP client, interceptors)
 ├── core-ui             (design system, image loading)
 └── core-perf           (tracing helpers, metrics reporting)
```
Performance-relevant choices:
- Keep the startup path depending only on modules it needs; heavy SDKs belong in features loaded later.
- Android: Play Feature Delivery (dynamic feature modules) for large, rarely used features; iOS: on-demand resources for large assets.
- Fewer, larger frameworks on iOS reduce dyld work; use static linking or mergeable libraries.
- One owner module for networking and image loading prevents duplicate clients, pools and caches.

## 3. Data and Caching Layers

```
UI  <-  ViewModel/Model (in-memory state)
          <-  Repository
                ├─ memory cache (LruCache / NSCache)
                ├─ disk cache / database (Room, SQLDelight, Core Data/SwiftData, GRDB)
                └─ network (HTTP cache + API)
```
- Render from local data first (stale-while-revalidate), then refresh.
- Database queries off the main thread; observe with Flow / AsyncSequence.
- Paginate at every layer (Paging 3, cursor APIs).
- Precompute display models in the repository or ViewModel so UI code only binds.

## 4. Startup Orchestration

A single place decides what runs when:
```
Phase 0 (before first frame): crash reporting core, DI root, theme, first screen data from cache
Phase 1 (after first frame):  analytics, remote config fetch, feature flags refresh
Phase 2 (idle / background):  prefetch, cache cleanup, non-critical SDKs, WorkManager/BGTask scheduling
```
Android: Jetpack App Startup with lazy initializers plus a post-first-frame hook; iOS: deferred tasks started from the first view's `.task` or after `viewDidAppear`.

## 5. Threading Model

- Main thread: UI only.
- Bounded pools for CPU and I/O (Kotlin Dispatchers, Swift cooperative pool, dedicated serial queues for databases).
- One serialized writer for each database; many readers.
- All long-lived work owned by lifecycle-aware scopes or the OS scheduler (WorkManager, BGTaskScheduler).

## 6. Observability Pipeline

```
Device instrumentation         Collection              Backend                 Action
--------------------------     ------------------      --------------------    ------------------
trace sections / signposts  -> sampled sessions     -> aggregation by       -> dashboards per
JankStats / MetricKit       -> batched upload on       version, device,        journey
startup timestamps             Wi-Fi / app background  OS, country         -> alerts on regression
crash/ANR/hang reports                                                     -> release gating
```
Sources:
- Platform: Android vitals, Play Console; Xcode Organizer, MetricKit.
- SDKs: Firebase Performance Monitoring, Sentry, Datadog RUM, Embrace, or in-house collection.
- Lab: Macrobenchmark and XCTest metrics in CI on physical devices.

Design rules:
- Sample sessions (percent of users) to limit overhead and data cost.
- Tag every metric with app version, build, device model, OS version, and network type.
- Compare percentiles (p50, p90, p99), never only averages.
- Keep the instrumentation itself off the main thread and batched.

## 7. Governance

| Practice | Purpose |
|---|---|
| Performance owner per journey | Someone accountable for each budget |
| CI benchmarks on every merge to main | Catch regressions before release |
| Release gate on field metrics during staged rollout | Stop bad builds early |
| Third-party SDK review | Startup, size and network impact before adoption |
| Quarterly baseline refresh | Track drift on new OS versions and devices |

## Trade-offs

| Decision | Benefit | Cost |
|---|---|---|
| Dynamic feature modules / on-demand resources | Smaller install, faster startup | Download latency at first use, complexity |
| Aggressive caching | Instant screens, offline support | Staleness, invalidation logic, storage |
| Cross-platform UI framework | Shared code | Extra runtime/engine startup and memory overhead to manage |
| Heavy instrumentation | Better diagnosis | Overhead, data cost, privacy review |

## Checklist
- [ ] Budgets defined per journey and device tier
- [ ] Startup path depends only on required modules
- [ ] Single networking/image/database owners
- [ ] Startup phases documented and enforced
- [ ] Lab and field metrics feed the same dashboards
- [ ] Regressions block release via CI or rollout gates
