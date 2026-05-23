# Sync Strategies

## Sync Triggers Reference

| Trigger | Platform API | Frequency | Battery Impact |
|---------|-------------|-----------|---------------|
| App foreground | `onResume` / `applicationDidBecomeActive` | Every launch | Low |
| Periodic (15-30 min) | WorkManager (Android) / BGTaskScheduler (iOS) | Configurable | Medium |
| Push notification | FCM silent push / APNs remote notification | As needed | Low |
| Pull-to-refresh | User gesture | On demand | Medium |
| Queue drain | After pending writes replayed | After queue cleared | Medium |
| Connectivity restored | NetworkCallback / NWPathMonitor | When online | Low |
| Deep link with sync param | URL parameter `?sync=true` | As needed | Low |

## Sync Engine Flow

```
sync():
  1. Check connectivity:
     └─ offline → update UI indicator, skip sync

  2. Push local changes (outgoing queue):
     a. Load pending_operations ordered by created_at ASC
     b. For each operation:
        ├─ POST /api/sync with { entity_type, entity_id, action, payload, idempotency_key }
        ├─ 200 OK → remove from queue, update local DB with server response
        ├─ 409 Conflict → trigger conflict resolution handler
        ├─ 422 Validation → log error, remove from queue (invalid data)
        └─ 5xx Server Error → exponential backoff, keep in queue

  3. Pull remote changes:
     a. GET /api/sync/changes?since={last_sync_timestamp}&limit=100
     b. Apply server changes to local DB (INSERT/UPDATE/DELETE)
     c. Handle deletions: DELETE local records not in server response
     d. Update last_sync_timestamp to server's newest timestamp
     e. If response has more: request next page with cursor

  4. Notify UI:
     └─ Post sync completion event → UI updates indicators
```

## Conflict Resolution Strategies

### Strategy Selection by Entity Type

```kotlin
// Conflict resolution configuration per entity
data class EntitySyncConfig(
    val entityType: String,
    val resolutionStrategy: ResolutionStrategy,
    val priority: SyncPriority = SyncPriority.SERVER_AUTHORITY
)

enum class SyncPriority { CLIENT_AUTHORITY, SERVER_AUTHORITY, MERGE }

// Resolution strategies
sealed class ResolutionStrategy {
    // Last-write-wins: compare timestamps, keep latest
    data class LastWriteWins(val authority: SyncAuthority) : ResolutionStrategy()

    // Timestamp vector: each field tracked independently
    data class TimestampVector : ResolutionStrategy()

    // CRDT: conflict-free replicated data type (counters, registers, sets)
    data class Crdt(val type: CrdtType) : ResolutionStrategy()

    // Three-way merge: base + local + remote
    data class ThreeWayMerge : ResolutionStrategy()

    // Manual: surface to user for resolution
    data class Manual(val timeoutMs: Long = 86_400_000L) : ResolutionStrategy()
}

enum class SyncAuthority { SERVER, CLIENT, LAST_TIMESTAMP }
enum class CrdtType { COUNTER, LWW_REGISTER, G_SET, OR_SET, LWW_MAP }

// Usage
val syncConfigs = listOf(
    EntitySyncConfig("product", ResolutionStrategy.LastWriteWins(SyncAuthority.SERVER)),
    EntitySyncConfig("cart_item", ResolutionStrategy.Crdt(CrdtType.OR_SET)),
    EntitySyncConfig("user_profile", ResolutionStrategy.TimestampVector),
    EntitySyncConfig("order", ResolutionStrategy.Manual())
)
```

### CRDT — Grow-only Set (G-Set)

```kotlin
// CRDT: elements can only be added, never removed
data class GrowOnlySet<T>(val items: Set<T> = emptySet()) {
    fun add(element: T): GrowOnlySet<T> = copy(items = items + element)
    fun merge(other: GrowOnlySet<T>): GrowOnlySet<T> = copy(items = items + other.items)
    fun contains(element: T): Boolean = element in items
}

// CRDT: LWW Register (Last-Write-Wins per field)
data class LwwRegister<T>(val value: T, val timestamp: Long) {
    fun merge(other: LwwRegister<T>): LwwRegister<T> =
        if (this.timestamp >= other.timestamp) this else other
}
```

### Conflict Resolution Decision Tree

```
Conflict detected
    │
    ├─ Is entity financial/legal/medical?
    │   └─ Yes → Manual resolution (surface to user)
    │
    ├─ Does entity have a single writer?
    │   └─ Yes → Last-write-wins (server timestamp)
    │
    ├─ Is entity a collection/list?
    │   └─ Yes → CRDT (OR-Set for add/remove, LWW for ordering)
    │
    ├─ Is entity a document with mergeable fields?
    │   └─ Yes → Three-way merge (base + local + remote)
    │
    └─ Otherwise → Last-write-wins with server authority
```

## Pending Queue Schema

```sql
CREATE TABLE pending_operations (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
    payload TEXT NOT NULL,               -- JSON serialized full entity
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 6,
    last_error TEXT,
    last_error_at INTEGER,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'failed'))
);

CREATE INDEX idx_pending_created ON pending_operations(created_at ASC);
CREATE INDEX idx_pending_status ON pending_operations(status);
```

## Idempotency Key Generation

```kotlin
fun generateIdempotencyKey(entityId: String, action: String, payload: String): String {
    val contentHash = payload.md5().take(8)
    val nonce = randomUUID().toString().take(8)
    return "${entityId}:${action}:${contentHash}:${nonce}"
}

// Server-side deduplication
fun shouldProcess(idempotencyKey: String): Boolean {
    return !processedKeys.exists(idempotencyKey) // 200 on duplicate
}
```

## Retry with Exponential Backoff

```kotlin
val retryDelays = listOf(1_000, 2_000, 5_000, 15_000, 30_000, 60_000) // ms

fun nextDelayMs(retryCount: Int, maxRetries: Int = 6): Long {
    if (retryCount >= maxRetries) return -1 // permanent failure
    return retryDelays.getOrElse(retryCount) { 300_000 } // cap at 5 min
}

// With jitter to prevent thundering herd
fun nextDelayWithJitter(retryCount: Int): Long {
    val baseDelay = nextDelayMs(retryCount)
    val jitter = (0..1000).random()
    return baseDelay + jitter
}
```

## Delta Sync with Cursors

```kotlin
data class SyncCursor(
    val lastTimestamp: Long = 0,
    val lastId: String = "",
    val pageSize: Int = 100
)

// Client sends cursor → server returns changes since cursor
data class SyncResponse(
    val changes: List<EntityChange>,
    val newCursor: SyncCursor,
    val hasMore: Boolean
)

// Client saves cursor after successful sync
suspend fun pullChanges(cursor: SyncCursor): SyncResponse {
    val response = api.getChanges(
        since = cursor.lastTimestamp,
        sinceId = cursor.lastId,
        limit = cursor.pageSize
    )
    applyChanges(response.changes)
    return response
}
```

No preamble. No postamble. No explanations.
