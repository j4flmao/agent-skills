# Offline Sync

## Sync Triggers

| Trigger | Method | Frequency |
|---------|--------|-----------|
| App foreground | `applicationDidBecomeActive` / `onResume` | Every launch |
| Periodic | WorkManager (Android) / BGTaskScheduler (iOS) | 15-30 min interval |
| Push notification | Silent push with sync command | As needed |
| Pull-to-refresh | User gesture | On demand |
| Mutation queue | After replaying queued writes | After queue drain |

## Sync Engine Flow

```
1. Check connectivity → fail fast with pending indicator
2. Push local mutations (queue replay):
   a. Sort queue by creation timestamp ASC
   b. For each operation: send with idempotency key
   c. On success: remove from queue, update local DB with server response
   d. On 409 Conflict: trigger conflict resolution handler
   e. On 5xx: exponential backoff, keep in queue
3. Pull remote changes:
   a. GET /sync/changes?since={lastSyncTimestamp}
   b. Apply server changes to local DB
   c. Update lastSyncTimestamp
4. Notify UI of sync completion
```

## Conflict Resolution Strategies

```kotlin
sealed class ResolutionStrategy {
  data class LastWriteWins(val source: Source = Source.SERVER) : Strategy()
  data class Crdt(val mergeFn: (Any, Any) -> Any) : Strategy()
  data class ThreeWayMerge(val base: Any, val local: Any, val remote: Any) : Strategy()
  data class Manual(val entityType: KClass<*>) : Strategy()
}
```

## Pending Queue Schema

```sql
CREATE TABLE pending_operations (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,       -- JSON serialized
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);
```

## Idempotency Key Generation

```kotlin
fun generateIdempotencyKey(entityId: String, action: String): String {
  val nonce = randomUUID().toString().take(8)
  return "${entityId}:${action}:${nonce}"
}
```

## Retry with Backoff

```kotlin
val retryDelays = listOf(1_000, 2_000, 5_000, 15_000, 30_000, 60_000) // ms
fun nextDelay(retryCount: Int): Long =
  retryDelays.getOrElse(retryCount) { 300_000 } // cap at 5 min
```
