# Concurrency for Responsive Mobile Apps

Keeping the main (UI) thread free while doing work safely in parallel. Covers Kotlin coroutines on Android and Swift Concurrency on iOS, plus thread-pool sizing, cancellation and common hazards.

## The Main-Thread Rule

The main thread runs input handling, layout, drawing and lifecycle callbacks. Anything that blocks it causes jank, and long blocks cause:
- Android: ANR when input is not handled within 5 s (or a foreground BroadcastReceiver does not finish within its limit).
- iOS: hangs (main run loop unresponsive; Xcode reports hangs of 250 ms and longer) and watchdog terminations for long launches/resumes.

Never on the main thread: disk I/O, network, database queries, JSON parsing of large payloads, image decoding of large bitmaps, crypto on large data, `Thread.sleep`/semaphore waits.

## Android: Kotlin Coroutines

### Dispatchers
| Dispatcher | Backing | Use for |
|---|---|---|
| `Dispatchers.Main` / `Main.immediate` | Main looper | UI updates; `immediate` avoids a re-dispatch when already on main |
| `Dispatchers.Default` | Shared pool sized to CPU cores (min 2) | CPU-bound work: parsing, sorting, diffing |
| `Dispatchers.IO` | Elastic pool, default limit 64 threads (or cores if more), shares threads with Default | Blocking I/O: files, JDBC/Room blocking calls, legacy blocking SDKs |
| `Dispatchers.IO.limitedParallelism(n)` | View on IO | Cap concurrency to a resource, e.g. one DB writer |

### Structured scopes
```kotlin
class FeedViewModel(private val repo: FeedRepository) : ViewModel() {
  private val _state = MutableStateFlow<FeedState>(FeedState.Loading)
  val state: StateFlow<FeedState> = _state.asStateFlow()

  fun refresh() {
    viewModelScope.launch {                        // cancelled when ViewModel clears
      _state.value = try {
        FeedState.Loaded(repo.loadFeed())          // repo switches dispatcher itself
      } catch (e: CancellationException) {
        throw e                                    // never swallow cancellation
      } catch (e: IOException) {
        FeedState.Error(e.message ?: "network error")
      }
    }
  }
}

class FeedRepository(private val api: FeedApi, private val dao: FeedDao) {
  suspend fun loadFeed(): List<Item> = withContext(Dispatchers.IO) {
    val remote = api.fetch()
    dao.upsert(remote)
    remote
  }
}
```
Main-safety convention: every `suspend` function is safe to call from the main thread; the function that does blocking work does the `withContext` switch.

### Collecting flows with lifecycle
```kotlin
lifecycleScope.launch {
  repeatOnLifecycle(Lifecycle.State.STARTED) {    // stops collecting when in background
    viewModel.state.collect(::render)
  }
}
// Compose: val state by viewModel.state.collectAsStateWithLifecycle()
```

### Parallel decomposition
```kotlin
suspend fun loadHome(): Home = coroutineScope {
  val profile = async { api.profile() }
  val feed = async { api.feed() }
  Home(profile.await(), feed.await())   // if one fails, the sibling is cancelled
}
```
Use `supervisorScope` when siblings should survive each other's failures.

### Cancellation and blocking code
- Cancellation is cooperative: CPU loops should call `ensureActive()` or `yield()`.
- Wrap blocking calls that support interruption with `runInterruptible(Dispatchers.IO) { ... }`.
- Avoid `GlobalScope`; use an application-level `CoroutineScope(SupervisorJob() + Dispatchers.Default)` injected where work must outlive a screen, or WorkManager for work that must outlive the process.
- `runBlocking` on the main thread is a guaranteed jank/ANR source.

## iOS: Swift Concurrency

### Building blocks
| Construct | Purpose |
|---|---|
| `async`/`await` | Suspend without blocking a thread |
| `@MainActor` | Isolate UI state and code to the main thread |
| `actor` | Serialize access to mutable state |
| `Task { }` | Unstructured task inheriting actor context and priority |
| `Task.detached` | No inherited context; rarely needed |
| `async let`, `withTaskGroup` | Structured parallelism |
| `Sendable` | Compile-time check that values are safe to share across isolation domains |

```swift
@MainActor
@Observable
final class FeedModel {
  private(set) var items: [Item] = []
  private(set) var error: String?
  private let service: FeedService

  init(service: FeedService) { self.service = service }

  func refresh() async {
    do {
      items = try await service.loadFeed()     // runs off main; resumes on main
    } catch is CancellationError {
      return
    } catch {
      self.error = error.localizedDescription
    }
  }
}

actor FeedService {
  private var cache: [Item]?
  func loadFeed() async throws -> [Item] {
    if let cache { return cache }
    let (data, _) = try await URLSession.shared.data(from: URL(string: "https://api.example.com/feed")!)
    let decoded = try JSONDecoder().decode([Item].self, from: data)
    cache = decoded
    return decoded
  }
}
```
In SwiftUI, prefer `.task { await model.refresh() }`; it is cancelled automatically when the view disappears.

### Heavy CPU work
Actor methods still run on the cooperative thread pool, which has about one thread per core. Long synchronous CPU work inside them starves other tasks. Split work and check `Task.checkCancellation()`, or run it on a dedicated `DispatchQueue` and bridge with `withCheckedContinuation`.

### Swift 6 strict concurrency
- Swift 6 language mode turns data-race diagnostics into errors. Migrate module by module with `-strict-concurrency=complete` warnings first.
- Mark UI types `@MainActor`; make model values `Sendable` structs.
- Avoid `@unchecked Sendable` except for types you have proven thread-safe (e.g. guarded by a lock).

### Legacy GCD
- Use serial queues for state, `DispatchQueue.global(qos:)` with appropriate QoS (`.userInitiated` for user-waiting work, `.utility`, `.background`).
- Never `DispatchQueue.main.sync` from the main thread (deadlock), and never block the main thread on a semaphore waiting for async work.
- Mixing semaphores with Swift Concurrency can deadlock the cooperative pool.

## Shared Hazards

| Hazard | Symptom | Fix |
|---|---|---|
| Data race on shared mutable state | Random crashes, corrupted data | Confine to one thread/actor, or lock |
| Priority inversion | UI waits on low-priority work | Same QoS for dependent work; avoid blocking waits |
| Thread explosion | Memory and scheduler overhead | Bounded dispatchers, `limitedParallelism`, task groups with limits |
| Leaked work after screen closes | Battery drain, wasted network | Structured scopes (`viewModelScope`, `.task`) |
| Swallowed cancellation | Work continues after cancel | Rethrow `CancellationException` / `CancellationError` |
| UI update from background | Crash (iOS) or `CalledFromWrongThreadException` (Android) | Update on Main / `@MainActor` |

## Tooling
- Android: StrictMode thread policy, Perfetto thread states, coroutine debug agent (`-Dkotlinx.coroutines.debug`), Android Studio coroutine debugger.
- iOS: Thread Sanitizer, Main Thread Checker, Instruments "Swift Concurrency" and "Hangs" tools.

## Checklist
- [ ] No blocking calls on the main thread (StrictMode / Main Thread Checker clean)
- [ ] All async work owned by a lifecycle-bound scope
- [ ] Cancellation propagated, not swallowed
- [ ] Concurrency to shared resources bounded
- [ ] UI state isolated to Main / `@MainActor`
- [ ] TSan or strict concurrency checking enabled in CI for iOS
