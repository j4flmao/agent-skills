---
name: mobile-offline-first
description: >
  Use this skill when the user says 'offline-first', 'offline mode', 'offline
  sync', 'local storage', 'offline cache', 'sync strategy', 'conflict
  resolution', 'offline queue', 'mobile offline', 'local database'. Design
  offline-capable mobile apps with local storage, sync strategies, conflict
  resolution, and connectivity detection. Do NOT use for: web offline/PWA or
  server-side caching.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, offline, phase-7, universal]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Offline First

## Purpose
Guide for building mobile apps with offline-first architecture: local-first data, background sync, conflict resolution, and connectivity-aware UX.

## Agent Protocol

### Trigger
Phrases: "offline-first", "offline mode", "offline sync", "local storage", "offline cache", "sync strategy", "conflict resolution", "offline queue", "mobile offline", "local database"

### Input Context
- Data models and entity relationships
- API endpoints and data flow patterns
- Conflict resolution requirements per entity
- Sync frequency and triggers

### Output Artifact
Offline architecture: local DB schema, repository pattern with cache-first strategy, sync engine with queue/retry, conflict resolution rules, connectivity detection.

### Response Format
```
<offline-first>
<local-db>{schema, repository, cache-first reads}</local-db>
<sync>{triggers, queue, replay, idempotency}</sync>
<conflicts>{strategy per entity, manual resolution}</conflicts>
<connectivity>{detection, UI states}</connectivity>
</offline-first>
```
No preamble. No postamble. No explanations.

### Completion Criteria
- Local DB reads return data without network call (cache hit)
- Offline writes queued and replayed on connectivity restore
- Conflict resolution produces deterministic result per entity
- User sees clear offline/online status indicator
- Sync progress is visible during background sync

### Max Response Length
8000 tokens

## Decision Trees

### Offline Architecture Selection
```
What kind of data?
├── Reference data (product catalog, settings) → Cache-first, pull-only
│   └── No conflict risk. Just stale data.
├── User-generated (notes, photos, orders) → Local-first with sync queue
│   └── Conflict possible. Need idempotency + resolution.
├── Collaborative (shared docs, lists, boards) → CRDT or OT
│   └── Concurrent edits likely. Need merge strategy.
└── Financial/legal (transactions, signatures) → Optimistic local, server authority
    └── Conflicts must be manually resolved. No auto-merge.
```

### Local Database Selection
```
Cross-platform need?
├── Single platform
│   ├── Android → Room (compile-time SQL, Flow, migrations)
│   └── iOS → CoreData (SwiftUI integration, iCloud sync)
├── KMP (Kotlin Multiplatform) → SQLDelight (type-safe, cross-platform)
├── Hybrid/React Native → WatermelonDB (SQLite-based, lazy loading)
└── Simple key-value → MMKV (fast, no schema needed)
```

### Sync Trigger Strategy
```
How fresh does data need to be?
├── Seconds (chat, live collab) → WebSocket real-time push
├── Minutes (feeds, notifications) → Silent push + foreground sync
├── Hours (reference, catalog) → Periodic background sync (WorkManager / BGTaskScheduler)
└── On demand (user action required) → Pull-to-refresh only
```

## Workflow

### 1. Offline-First Architecture
The local database is the single source of truth. All reads go to local DB first. All writes go to local DB first, then sync to server. The network is a sync mechanism, not a data source.

Three layers:
- **Local data layer**: Room, CoreData, SQLDelight, or SQLite with repository pattern
- **Sync engine**: Monitors connectivity, replays queued writes, pulls remote changes, resolves conflicts
- **UI layer**: Observes local DB via reactive streams (Flow, Combine), displays connectivity state, shows staleness indicators

### 2. Local Database Selection
- **Room** (Android): compile-time SQL verification, Flow-based reactive queries, migrations
- **SQLDelight** (KMP): cross-platform, type-safe, generates drivers for Android/iOS/JVM
- **CoreData** (iOS native): SwiftUI @FetchRequest, iCloud sync, lightweight migration
- **Realm**: MongoDB Atlas Device Sync, real-time sync, larger binary
- **WatermelonDB**: SQLite lazy loading for React Native
- **MMKV**: Fast key-value, no schema, ideal for settings/cache

### 3. Repository Pattern with Cache-First Strategy
Read flow: return cached → check staleness TTL → if stale+online: fetch, update local DB, notify → if offline: return cached with staleness indicator.
Write flow: validate → write to local DB → enqueue sync op → if online, trigger immediate sync → UI reacts to local DB change.

### 4. Sync Triggers and Frequency
- App foreground: immediate sync
- Periodic: WorkManager (15 min min) / BGTaskScheduler
- Silent push: wake app for sync
- Pull-to-refresh: user gesture
- After queue drain: replay writes, then fetch remote changes
- Adaptive: WiFi = frequent, cellular = reduced, battery low = pause

### 5. Conflict Resolution Strategies
- Last-write-wins: simplest, server timestamp authority
- Timestamp-based: client timestamp, server keeps latest
- CRDT: mathematically guaranteed convergence
- Three-way merge: base + local + remote = merged
- Manual: surface conflict to user, let them choose

### 6. Offline Queue Management
Persistent queue in local DB. Each operation: id, entity type, entity ID, action, payload, idempotency key, created timestamp, retry count, last error. FIFO replay with exponential backoff.

### 7. Connectivity Detection and UX
Android: ConnectivityManager.NetworkCallback. iOS: NWPathMonitor. UI: persistent offline banner, sync status indicator, disable mutation buttons with tooltip.

## Conflict Resolution Strategies

| Strategy | Use Case | Complexity | Data Loss Risk |
|---|---|---|---|
| Last-write-wins | Independent entities, timestamps | Low | Medium |
| Timestamp authority | Single-user-per-resource | Low | Low |
| CRDT | Concurrent edits, lists, counters | High | None |
| Three-way merge | Collaborative documents | Medium | Low |
| Manual | Financial, legal, medical | High | None (user decides) |

## Implementation

### Repository Pattern — Android Room
```kotlin
// OrderRepository.kt
class OrderRepository(
  private val dao: OrderDao,
  private val api: OrderApi,
  private val syncQueue: SyncQueue,
  private val connectivity: ConnectivityMonitor
) {
  fun getOrders(): Flow<List<Order>> = dao.observeAll()

  suspend fun refreshOrders() {
    if (!connectivity.isOnline()) return
    try {
      val remote = api.getOrders(updatedSince = lastSyncTimestamp)
      dao.upsertAll(remote.map { it.toEntity() })
      lastSyncTimestamp = System.currentTimeMillis()
    } catch (e: Exception) {
      // Silent — cached data still available
    }
  }

  suspend fun createOrder(order: Order) {
    val id = UUID.randomUUID().toString()
    val localOrder = order.copy(id = id, syncStatus = SyncStatus.PENDING)
    dao.insert(localOrder)
    syncQueue.enqueue(
      SyncOperation(
        entityType = "order",
        entityId = id,
        action = SyncAction.CREATE,
        payload = Json.encodeToString(order),
        idempotencyKey = generateIdempotencyKey(order)
      )
    )
    syncQueue.processIfOnline()
  }
}
```

### Sync Engine
```kotlin
// SyncEngine.kt
class SyncEngine(
  private val queue: SyncQueue,
  private val api: OrderApi,
  private val connectivity: ConnectivityMonitor
) {
  suspend fun processQueue() {
    if (!connectivity.isOnline()) return

    val operations = queue.getAllPending()
    for (op in operations) {
      try {
        when (op.action) {
          SyncAction.CREATE -> api.createOrder(op.payload, op.idempotencyKey)
          SyncAction.UPDATE -> api.updateOrder(op.entityId, op.payload, op.idempotencyKey)
          SyncAction.DELETE -> api.deleteOrder(op.entityId, op.idempotencyKey)
        }
        queue.remove(op.id)
      } catch (e: ConflictException) {
        resolveConflict(op, e)
      } catch (e: ServerException) {
        if (op.retryCount >= MAX_RETRIES) {
          queue.markFailed(op.id)
        } else {
          queue.incrementRetry(op.id)
          delay(calculateBackoff(op.retryCount))
        }
      }
    }
  }

  private fun calculateBackoff(retryCount: Int): Long {
    val delays = listOf(1000L, 2000L, 5000L, 15000L, 30000L, 60000L)
    return delays.getOrElse(retryCount) { 60000L }
  }
}
```

### Sync Queue with Idempotency
```dart
class SyncQueue {
  final Database db;

  Future<void> enqueue(SyncOperation op) async {
    await db.then((db) => db.insert('sync_queue', {
      'id': op.id,
      'entity_type': op.entityType,
      'entity_id': op.entityId,
      'action': op.action.index,
      'payload': jsonEncode(op.payload),
      'idempotency_key': op.idempotencyKey,
      'created_at': DateTime.now().toIso8601String(),
      'retry_count': 0,
      'status': 'pending',
    }));
  }

  Future<void> process() async {
    final ops = await db.then((db) => db.query('sync_queue',
      where: 'status = ?', whereArgs: ['pending'],
      orderBy: 'created_at ASC'));

    for (final op in ops) {
      try {
        await _execute(op);
        await db.then((db) => db.delete('sync_queue',
          where: 'id = ?', whereArgs: [op['id']]));
      } on ServerException catch (e) {
        if (e.statusCode == 409) {
          await _handleConflict(op);
        } else if ((op['retry_count'] as int) >= 5) {
          await db.then((db) => db.update('sync_queue',
            {'status': 'failed', 'last_error': e.message},
            where: 'id = ?', whereArgs: [op['id']]));
        } else {
          await db.then((db) => db.update('sync_queue',
            {'retry_count': (op['retry_count'] as int) + 1},
            where: 'id = ?', whereArgs: [op['id']]));
        }
      }
    }
  }

  String generateIdempotencyKey(Map<String, dynamic> payload) {
    final content = jsonEncode(payload);
    return sha256.convert(utf8.encode(content)).toString();
  }
}
```

### Background Sync — Android WorkManager
```kotlin
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  override suspend fun doWork(): Result {
    return try {
      syncEngine.processQueue()
      if (syncEngine.hasMorePages()) Result.retry()
      else Result.success()
    } catch (e: Exception) {
      Result.retry()
    }
  }

  companion object {
    fun schedule(context: Context) {
      val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

      val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
        15, TimeUnit.MINUTES
      ).setConstraints(constraints)
        .setBackoffCriteria(
          BackoffPolicy.EXPONENTIAL,
          1, TimeUnit.MINUTES
        )
        .build()

      WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(
          "offline-sync",
          ExistingPeriodicWorkPolicy.KEEP,
          syncRequest
        )
    }
  }
}
```

### Background Sync — iOS BGTaskScheduler
```swift
import BackgroundTasks

class BackgroundSyncManager {
  static let shared = BackgroundSyncManager()
  private let taskID = "com.example.app.sync"

  func register() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: taskID, using: nil) { task in
      self.handleSync(task: task as! BGAppRefreshTask)
    }
  }

  func schedule() {
    let request = BGAppRefreshTaskRequest(identifier: taskID)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)  // 15 min
    try? BGTaskScheduler.shared.submit(request)
  }

  private func handleSync(task: BGAppRefreshTask) {
    schedule()  // Schedule next refresh

    let operation = SyncOperation(context: persistentContainer.viewContext)
    operation.onComplete = {
      task.setTaskCompleted(success: true)
    }
    operation.onFail = {
      task.setTaskCompleted(success: false)
    }

    task.expirationHandler = {
      operation.cancel()
    }

    operation.start()
  }
}
```

### Connectivity Monitor
```dart
import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  bool _isOnline = true;

  Stream<bool> get connectivityStream => _connectivity.onConnectivityChanged
    .map((result) => result != ConnectivityResult.none);

  Future<bool> checkOnline() async {
    final result = await _connectivity.checkConnectivity();
    return result != ConnectivityResult.none;
  }

  void startMonitoring(void Function(bool) onChanged) {
    _connectivity.onConnectivityChanged.listen((result) {
      final online = result != ConnectivityResult.none;
      if (online && !_isOnline) {
        // Came back online — trigger sync
        SyncQueue.instance.process();
      }
      _isOnline = online;
      onChanged(online);
    });
  }
}
```

```swift
// iOS connectivity
import Network

class NetworkMonitor {
  static let shared = NetworkMonitor()
  private let monitor = NWPathMonitor()
  private let queue = DispatchQueue(label: "NetworkMonitor")

  var isConnected: Bool {
    monitor.currentPath.status == .satisfied
  }

  var isExpensive: Bool {
    monitor.currentPath.isExpensive
  }  // cellular vs WiFi

  func start() {
    monitor.pathUpdateHandler = { path in
      NotificationCenter.default.post(
        name: .connectivityChanged,
        object: path.status == .satisfied
      )
    }
    monitor.start(queue: queue)
  }
}
```

### Offline UI States
```dart
// Flutter — offline indicator
class ConnectivityBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<bool>(
      stream: ConnectivityService().connectivityStream,
      builder: (context, snapshot) {
        final online = snapshot.data ?? true;
        return Column(
          children: [
            if (!online)
              Container(
                width: double.infinity,
                color: Colors.orange.shade800,
                padding: EdgeInsets.symmetric(vertical: 4, horizontal: 16),
                child: Text('You are offline. Changes will sync when connected.',
                  style: TextStyle(color: Colors.white, fontSize: 12)),
              ),
            // Rest of app
          ],
        );
      },
    );
  }
}
```

```kotlin
// Android — offline state in ViewModel
class OrderViewModel(private val repo: OrderRepository) : ViewModel() {
  val orders: StateFlow<List<Order>> = repo.getOrders()
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

  val syncStatus: StateFlow<SyncStatus> = repo.syncStatus
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), SyncStatus.Synced)

  val connectivityState: StateFlow<Boolean> = repo.connectivityMonitor
    .observeConnectivity()
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)
}
```

### CRDT — G-Counter Example
```kotlin
// Grow-only Counter CRDT
class GCounter {
  private val counts = mutableMapOf<String, Int>()

  fun increment(nodeId: String) {
    counts[nodeId] = (counts[nodeId] ?: 0) + 1
  }

  fun get(): Int = counts.values.sum()

  fun merge(other: GCounter) {
    other.counts.forEach { (node, count) ->
      counts[node] = maxOf(counts[node] ?: 0, count)
    }
  }
}
```

### Three-Way Merge Pattern
```kotlin
data class Document(
  val id: String,
  val title: String,
  val content: String,
  val version: Int
)

fun threeWayMerge(base: Document, local: Document, remote: Document): Document {
  return Document(
    id = base.id,
    title = if (local.title != base.title) local.title else remote.title,
    content = if (local.content != base.content) local.content else remote.content,
    version = maxOf(local.version, remote.version) + 1
  )
}
```

## Anti-Patterns
- **Treating network as source of truth**: Network goes down, app is useless. Local DB must be primary data store
- **Cache invalidation on offline**: If cache is invalidated when offline, app is empty. Never invalidate — show stale with indicator
- **Dropping offline writes on sync failure**: Data loss. Queue persistently with retry before giving up
- **No idempotency keys**: Duplicate requests = duplicate orders, charges, etc. Every mutation needs idempotency key
- **Background sync without constraints**: Drains battery and data. Respect low battery, metered networks, and OS limits
- **Blocking UI on sync**: Users shouldn't wait for data to arrive. Show cached immediately, sync in background
- **Single sync strategy for all entities**: Settings (hourly sync) vs chat (real-time) need different approaches
- **No offline write validation waiting for server**: Server rejects what passed client validation. Duplicate validation on both sides
- **Conflict resolution only on one device**: Resolution must be deterministic. All devices converge to same result
- **Replaying operations blindly on reconnect**: State might have changed while offline. Check preconditions before replaying
- **Full dataset sync every time**: Wastes bandwidth. Use delta sync with timestamp or version cursors
- **No user indication of offline state**: Users confused why data isn't updating. Show clear offline indicator

## Performance Considerations
- Index local DB on frequently queried fields (id, updatedAt, syncStatus)
- Batch writes into transactions (not one-by-one inserts)
- Keep sync queue operations small — store entity ID, not full payload, reference full data separately
- Delta sync only: use `updatedSince` timestamps to pull changed records only
- Limit concurrent sync operations to avoid thread starvation
- Monitor sync queue size — growing queue indicates persistent failure that needs attention
- Compress payloads for large sync operations (photos, attachments)
- Use reactive queries (Room Flow, CoreData NSFetchedResultsController) — avoid polling
- WatermelonDB for React Native: lazy loading, only fetch visible records

## Testing Offline Scenarios
- Turn off/on airplane mode while foreground, background, and during sync
- Kill app mid-sync — verify queue persists and resumes correctly
- Conflict tests: same entity edited on two devices offline, then bring both online
- Sync order: create offline, then update same entity before sync — verify only update sent
- Large queue: 1000+ pending operations — verify FIFO and no OOM
- Retry exhaustion: simulate 500 errors, verify item marked as failed and user notified
- Connectivity transitions: WiFi → cellular → offline → WiFi
- Time travel: change device clock to simulate stale TTL expiry
- Concurrent sync: same account on multiple devices, verify eventual consistency

## References
- `references/conflict-resolution.md` — Conflict Resolution for Offline-First
- `references/local-storage.md` — Local Storage
- `references/mobile-database.md` — Mobile Local Database
- `references/offline-first-architecture.md` — Offline-First Architecture
- `references/offline-sync.md` — Offline Sync
- `references/sync-strategies.md` — Sync Strategies

## Handoff
After offline-first setup, hand off to:
- `mobile/universal/networking` — Sync transport, API design for delta sync
- `mobile/universal/storage` — Local DB selection, schema design
- `mobile/universal/testing` — Offline scenario testing, sync testing
- `mobile/universal/performance` — Sync performance, DB query optimization
- `mobile/universal/push-notifications` — Silent push as sync trigger
- `mobile/android` — WorkManager, Room specifics
- `mobile/ios` — CoreData, BGTaskScheduler specifics
