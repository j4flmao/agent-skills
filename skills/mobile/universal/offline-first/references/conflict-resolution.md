# Conflict Resolution — Offline-First

## Overview

Conflict resolution is the mechanism that reconciles divergent data states when multiple devices or users modify the same data while offline. The strategy determines which changes win, how merges happen, and what happens when automatic resolution is not possible.

## Conflict Types

### Update-Update Conflict

Two devices modify the same field of the same record while offline:

```
Device A (offline): Product.price = $29.99
Device B (offline): Product.price = $24.99
Server: Product.price = $19.99 (original)
```

Resolution: Determined by conflict strategy (LWW, CRDT, manual, etc.)

### Create-Create Conflict

Two devices create a record with the same unique identifier:

```
Device A: Creates Order #1001 with items [A, B]
Device B: Creates Order #1001 with items [C, D]
```

Resolution: ID collision prevention (UUIDs, server-assigned IDs), merge on collision

### Delete-Update Conflict

One device deletes a record while another updates it:

```
Device A: Deletes Product #500
Device B: Updates Product #500.price = $39.99
```

Resolution: Delete wins (tombstone) or undelete (update wins)

### Add-Remove Conflict (List Operations)

Simultaneous add and remove on a list:

```
Device A: Adds user X to group
Device B: Removes user X from group
Server: Group members [A, B]
```

Resolution: CRDT-based set operations or timestamp-based ordering

## Conflict Resolution Strategies

### Last-Write-Wins (LWW)

The simplest strategy: the most recent write wins, regardless of which field was modified.

```kotlin
data class TimestampedValue<T>(
    val value: T,
    val timestamp: Long,
    val deviceId: String
) : Comparable<TimestampedValue<T>> {
    override fun compareTo(other: TimestampedValue<T>): Int {
        val ts = this.timestamp.compareTo(other.timestamp)
        if (ts != 0) return ts
        return this.deviceId.compareTo(other.deviceId)
    }
}

class LastWriteWinsResolver {
    fun <T> resolve(
        local: TimestampedValue<T>,
        remote: TimestampedValue<T>,
        server: TimestampedValue<T>
    ): TimestampedValue<T> {
        return maxOf(local, remote, server)
    }
}
```

**Pros**: Simple, deterministic, low storage overhead
**Cons**: Data loss — entire record replaced even if only one field changed

**Best for**: Independent entities where field-level granularity is not needed (user preferences, settings, counters)

### Per-Field LWW

Track timestamps per field instead of per record:

```kotlin
data class ProductField(
    val name: String,
    val value: Any?,
    val updatedAt: Long
)

data class ProductDocument(
    val id: String,
    val fields: Map<String, ProductField>,
    val createdAt: Long
)

class PerFieldResolver {
    fun resolve(local: ProductDocument, remote: ProductDocument): ProductDocument {
        val mergedFields = mutableMapOf<String, ProductField>()
        val allFieldNames = local.fields.keys + remote.fields.keys
        for (fieldName in allFieldNames) {
            val localField = local.fields[fieldName]
            val remoteField = remote.fields[fieldName]
            mergedFields[fieldName] = when {
                localField == null -> remoteField!!
                remoteField == null -> localField
                localField.updatedAt >= remoteField.updatedAt -> localField
                else -> remoteField
            }
        }
        return ProductDocument(id = local.id, fields = mergedFields, createdAt = local.createdAt)
    }
}
```

**Pros**: No data loss on non-conflicting fields, intuitive behavior
**Cons**: More storage (timestamp per field), clock skew issues

**Best for**: Complex documents where different users edit different fields (profiles, product details)

### Timestamp Authority

Server decides based on its own clock:

```kotlin
class TimestampAuthorityResolver(private val serverClock: ServerClock) {
    fun resolve(clientUpdate: Update, serverState: Document): Resolution {
        return when {
            clientUpdate.clientTimestamp <= serverState.lastModifiedTimestamp -> Resolution.Reject
            clientUpdate.clientTimestamp > serverState.lastModifiedTimestamp -> Resolution.Accept
            else -> {
                if (serverClock.now() > serverState.lastModifiedTimestamp)
                    Resolution.Accept
                else
                    Resolution.Reject
            }
        }
    }

    sealed class Resolution {
        object Accept : Resolution()
        object Reject : Resolution()
        data class Conflict(val resolution: Document) : Resolution()
    }
}
```

**Pros**: Simple, single authority, no clock sync issues
**Cons**: Requires server clock, ignores client timestamp entirely

**Best for**: Single-writer scenarios where the server always knows best

### CRDT (Conflict-Free Replicated Data Types)

CRDTs are data types designed to converge automatically without conflict resolution.

**Operation-based CRDTs (CmRDTs)**:
- Operations are commutative — applying in any order produces the same result
- Example: `add(a)` and `add(b)` always result in set {a, b}

**State-based CRDTs (CvRDTs)**:
- Full state is merged via a monotonic merge function
- Example: G-Set (grow-only set) — merge = union

```kotlin
class GrowOnlySet<T> {
    private val elements = mutableSetOf<T>()

    fun add(element: T) { elements.add(element) }
    fun contains(element: T): Boolean = elements.contains(element)

    fun merge(other: GrowOnlySet<T>): GrowOnlySet<T> {
        val result = GrowOnlySet<T>()
        result.elements.addAll(this.elements)
        result.elements.addAll(other.elements)
        return result
    }
}

class TwoPhaseSet<T> {
    private val added = mutableSetOf<T>()
    private val removed = mutableSetOf<T>()

    fun add(element: T) { added.add(element) }
    fun remove(element: T) {
        if (added.contains(element)) removed.add(element)
    }
    fun contains(element: T): Boolean = added.contains(element) && !removed.contains(element)

    fun merge(other: TwoPhaseSet<T>): TwoPhaseSet<T> {
        val result = TwoPhaseSet<T>()
        result.added.addAll(this.added)
        result.added.addAll(other.added)
        result.removed.addAll(this.removed)
        result.removed.addAll(other.removed)
        return result
    }
}
```

**CRDT Types for Common Data Structures**:

| Data Structure | CRDT Type | Description |
|---------------|-----------|-------------|
| Counter | G-Counter, PN-Counter | Increment-only or increment/decrement |
| Set | G-Set, 2P-Set, OR-Set | Add-only, add/remove with tombstone, observed-remove |
| Register | LWW-Reg, MV-Reg | Last-write-wins register, multi-value register |
| Map | Map of CRDTs | Nested CRDTs for document structures |
| List/Sequence | RGA, LSEQ, WOOT | Replicated growable arrays, ordered sequences |

**Pros**: Mathematically guaranteed convergence, no conflicts
**Cons**: Higher complexity, storage overhead (tombstones), limited data structure support

**Best for**: Collaborative editing, concurrent counters, shopping lists, shared state

### Operational Transform (OT)

OT transforms operations against each other to produce a consistent result:

```
Device A: insert("hello", pos=0)  → insert "hello" at position 0
Device B: insert("world", pos=6) → insert "world" at position 6
Server:   "abcdef"

After OT transform:
Result: "helloworld"
```

OT is the foundation of Google Docs and similar collaborative editors. It requires:
- Operation transformation functions for each operation type
- Server coordinating operation order (or central authority)
- State vectors to track which operations have been applied

**Pros**: Handles ordered sequences well, mature technology
**Cons**: Requires central server, complex transformation functions, state management overhead

**Best for**: Real-time collaborative document editing, chat applications

### Custom Conflict Resolvers

Domain-specific resolution logic for complex business rules:

```kotlin
class InventoryConflictResolver {
    fun resolveStockLevel(local: StockLevel, remote: StockLevel, server: StockLevel): StockLevel {
        val localDelta = local.quantity - server.quantity
        val remoteDelta = remote.quantity - server.quantity

        // If both devices decreased stock (product sold), sum the deltas
        if (localDelta < 0 && remoteDelta < 0) {
            return StockLevel(
                sku = local.sku,
                quantity = server.quantity + localDelta + remoteDelta,
                version = maxOf(local.version, remote.version) + 1
            )
        }

        // If one device restocked, use the higher quantity
        if (localDelta > 0 || remoteDelta > 0) {
            return StockLevel(
                sku = local.sku,
                quantity = maxOf(local.quantity, remote.quantity),
                version = maxOf(local.version, remote.version) + 1
            )
        }

        // Default: last-write-wins
        return if (local.updatedAt >= remote.updatedAt) local else remote
    }
}
```

**Best for**: Business-specific merge logic, financial calculations, inventory management

### Manual Resolution

Surface conflicts to the user for manual resolution:

```swift
struct ConflictResolutionUI: View {
    let localVersion: Document
    let remoteVersion: Document
    let serverVersion: Document
    let onResolve: (Document) -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("Sync Conflict")
                .font(.headline)
            Text("Another device changed this document while you were offline")
                .font(.subheadline)
                .foregroundColor(.secondary)

            ConflictComparisonView(
                local: localVersion,
                remote: remoteVersion,
                fieldName: "title"
            )

            HStack(spacing: 16) {
                Button("Keep My Changes") {
                    onResolve(localVersion)
                }
                .buttonStyle(.borderedProminent)

                Button("Keep Other Changes") {
                    onResolve(remoteVersion)
                }
                .buttonStyle(.bordered)

                Button("Keep Both (Merge)") {
                    onResolve(mergeDocuments(localVersion, remoteVersion))
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
    }
}
```

**Best for**: Financial transactions, legal agreements, medical records, high-stakes edits

## Conflict Detection

### Version Vectors

Version vectors track the causal history of a document across replicas:

```kotlin
data class VersionVector(
    val id: String,          // Document ID
    val versions: MutableMap<String, Int>  // Replica ID → version count
) {
    fun increment(replicaId: String) {
        versions[replicaId] = (versions[replicaId] ?: 0) + 1
    }

    fun isGreaterThan(other: VersionVector): Boolean {
        return this.versions.any { (replica, version) ->
            version > (other.versions[replica] ?: 0)
        } && other.versions.all { (replica, version) ->
            (this.versions[replica] ?: 0) >= version
        }
    }

    fun isConcurrentWith(other: VersionVector): Boolean {
        val thisGreater = this.versions.any { (replica, version) ->
            version > (other.versions[replica] ?: 0)
        }
        val otherGreater = other.versions.any { (replica, version) ->
            version > (this.versions[replica] ?: 0)
        }
        return thisGreater && otherGreater
    }
}

class ConflictDetector {
    fun detectConflict(
        localVector: VersionVector,
        remoteVector: VersionVector
    ): ConflictStatus {
        return when {
            localVector == remoteVector -> ConflictStatus.NoChanges
            localVector.isGreaterThan(remoteVector) -> ConflictStatus.FastForward
            remoteVector.isGreaterThan(localVector) -> ConflictStatus.FastForward
            localVector.isConcurrentWith(remoteVector) -> ConflictStatus.Conflict
            else -> ConflictStatus.Unknown
        }
    }

    enum class ConflictStatus {
        NoChanges, FastForward, Conflict, Unknown
    }
}
```

### Hybrid Logical Clocks

HLCs combine physical clocks with logical counters to provide causally-consistent timestamps:

```kotlin
data class HybridTimestamp(
    val wallClock: Long,  // Physical time in ms
    val logical: Int,     // Logical counter for same-wall-clock events
    val nodeId: String    // Node identifier for tie-breaking
) : Comparable<HybridTimestamp> {
    override fun compareTo(other: HybridTimestamp): Int {
        val wc = this.wallClock.compareTo(other.wallClock)
        if (wc != 0) return wc
        val lc = this.logical.compareTo(other.logical)
        if (lc != 0) return lc
        return this.nodeId.compareTo(other.nodeId)
    }
}

class HybridClock(private val nodeId: String) {
    private var lastWallClock: Long = 0
    private var logical: Int = 0

    fun now(): HybridTimestamp {
        val currentWallClock = System.currentTimeMillis()
        if (currentWallClock > lastWallClock) {
            logical = 0
            lastWallClock = currentWallClock
        } else {
            logical++
        }
        return HybridTimestamp(lastWallClock, logical, nodeId)
    }
}
```

## Merge Strategies

### Three-Way Merge

Three-way merge uses the common ancestor to reconcile differences:

```kotlin
data class ThreeWayMerge<T> (
    val base: T,       // Common ancestor (server version at last sync)
    val local: T,      // Local changes
    val remote: T      // Remote changes from server
)

class ThreeWayMergeResolver {
    fun resolveStringField(merge: ThreeWayMerge<String?>): String? {
        if (merge.local == merge.remote) return merge.local
        if (merge.local == merge.base) return merge.remote
        if (merge.remote == merge.base) return merge.local
        // Both changed: return local if preferred, or delegate to field-specific logic
        return resolveConflict(merge)
    }

    fun resolveListMerge(merge: ThreeWayMerge<List<String>>): List<String> {
        val addedByLocal = merge.local - merge.base.toSet()
        val addedByRemote = merge.remote - merge.base.toSet()
        val removedByLocal = merge.base - merge.local.toSet()
        val removedByRemote = merge.base - merge.remote.toSet()
        val baseSet = merge.base.toMutableSet()

        baseSet.addAll(addedByLocal)
        baseSet.addAll(addedByRemote)
        baseSet.removeAll(removedByLocal intersect removedByRemote.toSet())

        // Items removed by one and added by other: add wins
        val conflictAdds = (addedByLocal intersect removedByRemote) +
                           (addedByRemote intersect removedByLocal)
        baseSet.addAll(conflictAdds)

        return baseSet.toList()
    }
}
```

### Auto-Merge Rules

Define rules for automatic merging per field type:

```kotlin
class AutoMergeRules {
    val rules: Map<String, MergeRule> = mapOf(
        "title" to MergeRule.UseLatest,
        "description" to MergeRule.Concatenate("\n\n---\n\n"),
        "price" to MergeRule.UseServerValue,
        "stock" to MergeRule.SumDeltas,
        "tags" to MergeRule.Union,
        "isActive" to MergeRule.UseTrue,
        "category" to MergeRule.RequireManual
    )

    enum class MergeRule {
        UseLatest,          // Latest timestamp wins
        UseLocal,           // Local changes always win
        UseRemote,          // Remote changes always win
        UseServerValue,     // Server value is authority
        Concatenate,        // Append remote content to local
        SumDeltas,          // Sum the difference from base
        Union,              // Union of both sets
        Intersection,       // Common elements only
        UseTrue,            // If either is true, result is true
        RequireManual       // Always surface for user resolution
    }
}
```

## UI for Conflict Resolution

### Inline Conflict Indicator

Show conflicts inline during sync:

```swift
struct SyncStatusIndicator: View {
    let syncState: SyncState
    let unresolvedConflicts: Int

    var body: some View {
        HStack {
            switch syncState {
            case .synced:
                Image(systemName: "checkmark.icloud")
                    .foregroundColor(.green)
                Text("Synced")
            case .syncing:
                ProgressView()
                    .scaleEffect(0.8)
                Text("Syncing...")
            case .offline:
                Image(systemName: "icloud.slash")
                    .foregroundColor(.orange)
                Text("Offline")
            case .conflict:
                Image(systemName: "exclamationmark.icloud")
                    .foregroundColor(.red)
                Text("\(unresolvedConflicts) conflict(s)")
                    .foregroundColor(.red)
            }
        }
        .font(.caption)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}
```

### Conflict Review Screen

A dedicated screen for resolving sync conflicts:

```kotlin
@Composable
fun ConflictReviewScreen(
    conflicts: List<DocumentConflict>,
    onResolve: (String, ResolvedDocument) -> Unit
) {
    LazyColumn {
        items(conflicts) { conflict ->
            ConflictCard(
                conflict = conflict,
                onResolve = { resolution -> onResolve(conflict.id, resolution) }
            )
        }
    }
}

@Composable
fun ConflictCard(conflict: DocumentConflict, onResolve: (ResolvedDocument) -> Unit) {
    Card(modifier = Modifier.padding(8)) {
        Column(modifier = Modifier.padding(16)) {
            Text("Conflict: ${conflict.documentName}", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8))

            conflict.modifiedFields.forEach { field ->
                ConflictFieldRow(
                    fieldName = field.name,
                    localValue = field.localValue,
                    remoteValue = field.remoteValue,
                    selectedValue = field.localValue,
                    onSelect = { /* update selection */ }
                )
            }

            Spacer(Modifier.height(12))

            Row(horizontalArrangement = Arrangement.spacedBy(8)) {
                OutlinedButton(onClick = { onResolve(ResolvedDocument.LocalWins(conflict)) }) {
                    Text("Keep Mine")
                }
                OutlinedButton(onClick = { onResolve(ResolvedDocument.RemoteWins(conflict)) }) {
                    Text("Keep Other")
                }
                Button(onClick = { onResolve(ResolvedDocument.MergeFields(conflict)) }) {
                    Text("Merge")
                }
            }
        }
    }
}
```

## Reconciliation Algorithms

### State-Based Reconciliation

```kotlin
class StateReconciler(private val localDb: LocalDatabase, private val remoteApi: RemoteApi) {

    suspend fun reconcile() {
        val localChanges = localDb.getPendingChanges()
        val remoteChanges = remoteApi.getChangesSince(localDb.lastSyncCursor)

        // Apply remote changes to local DB (with conflict resolution)
        for (change in remoteChanges) {
            applyRemoteChange(change)
        }

        // Send local changes to server (with conflict detection)
        for (change in localChanges) {
            val result = sendWithConflictDetection(change)
            when (result) {
                is SyncResult.Accepted -> localDb.markSynced(change.id)
                is SyncResult.Rejected -> localDb.markFailed(change.id, result.reason)
                is SyncResult.Conflict -> handleConflict(result.conflict)
            }
        }

        localDb.updateLastSyncCursor(remoteChanges.lastCursor)
    }
}
```

### Incremental Sync

```kotlin
data class SyncCursor(
    val lastSyncTimestamp: Long,
    val lastSyncVersion: Int,
    val partialSyncToken: String?
)

class IncrementalSyncManager(private val resolver: ConflictResolver) {

    suspend fun pullChanges(cursor: SyncCursor): SyncResult {
        val changes = api.getChanges(
            since = cursor.lastSyncTimestamp,
            batchSize = 100,
            continuationToken = cursor.partialSyncToken
        )

        var lastProcessedCursor = cursor
        for (change in changes.items) {
            val localDoc = localDb.getDocument(change.docId)
            if (localDoc == null) {
                localDb.insertDocument(change.document)
            } else {
                val resolved = resolver.resolve(localDoc, change.document)
                localDb.updateDocument(resolved)
            }
            lastProcessedCursor = SyncCursor(
                lastSyncTimestamp = change.timestamp,
                lastSyncVersion = change.version,
                partialSyncToken = changes.continuationToken
            )
        }

        return SyncResult.Success(lastProcessedCursor)
    }
}
```

## Error Handling

```kotlin
sealed class SyncError(val retryable: Boolean) {
    class NetworkError(cause: Throwable) : SyncError(retryable = true)
    class ServerError(code: Int, message: String) : SyncError(retryable = code >= 500)
    class ConflictError(docId: String) : SyncError(retryable = false)
    class ValidationError(field: String, reason: String) : SyncError(retryable = false)
    class TooManyRetries(operationId: String) : SyncError(retryable = false)
}

class ConflictResolutionErrorHandler {
    fun handle(error: SyncError, operation: PendingOperation) {
        when (error) {
            is SyncError.NetworkError -> {
                // Keep in queue, retry on next sync
                operation.incrementRetryCount()
            }
            is SyncError.ServerError -> {
                if (error.code == 409) {
                    // HTTP 409 Conflict — trigger resolution
                    triggerConflictResolution(operation)
                } else if (error.retryable) {
                    operation.scheduleRetry(exponentialBackoff(operation.retryCount))
                } else {
                    operation.markAsFailed(error.message)
                }
            }
            is SyncError.ConflictError -> {
                triggerConflictResolution(operation)
            }
            is SyncError.ValidationError -> {
                operation.markAsFailed("Validation: ${error.reason}")
            }
            is SyncError.TooManyRetries -> {
                operation.markAsFailed("Max retries exceeded")
            }
        }
    }

    private fun exponentialBackoff(retryCount: Int): Long {
        val delays = listOf(1000L, 2000L, 5000L, 15000L, 30000L, 60000L)
        return delays.getOrElse(retryCount) { 120000L }
    }
}
```

## Best Practices

- Choose conflict strategy per entity type — never use one strategy for all data
- Document conflict resolution rules in a central registry
- Version vectors for detecting concurrent modifications
- Three-way merge with common ancestor for complex documents
- CRDTs for collaborative data structures (sets, counters, lists)
- Surface conflicts to the user for high-stakes data
- Always use idempotency keys alongside conflict detection
- Test conflict scenarios in CI with deterministic fixtures
- Monitor conflict rates in production — rising rates indicate sync issues
- Provide undo capability for automatic conflict resolutions
- Log all conflict resolutions for audit trail
- Never silently drop conflicting data — prefer merge or surface to user
