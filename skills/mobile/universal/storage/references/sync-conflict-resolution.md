# Sync Conflict Resolution

## Overview

Conflict resolution is the process of reconciling divergent data modifications made across multiple replicas in a distributed or offline-first system. When two or more devices modify the same data independently without a central coordinator, conflicts arise that must be resolved to produce a consistent state.

This reference covers conflict types, resolution strategies, algorithms, tools, testing approaches, and best practices for building robust conflict resolution into mobile applications.

---

## Conflict Types

### Create/Create

Two devices create records with the same logical identity (same ID, same unique constraint) while offline.

```typescript
// Device A creates order ABC-123 offline
// Device B creates order ABC-123 offline (same UUID collision or same business key)
// On sync: two different orders claim the same identifier

// Resolution strategies:
// 1. UUID namespace partitioning — each device owns a UUID range
// 2. Append device ID to generated IDs — "ABC-123-deviceA"
// 3. Merge into a single record with combined fields
// 4. Keep both with renamed IDs, let user deduplicate
```

### Create/Delete

One device creates a record while another device deletes the same record (or its container).

```kotlin
// Device A creates Document("receipt-1", amount = 100) offline
// Device B deletes Document("receipt-1") offline
// On sync: should the document exist or not?

// Resolution strategies:
// 1. Tombstone-based: if delete happened after create, delete wins
// 2. Create wins: restored deleted record
// 3. Deferred: flag for user review
```

### Update/Update

Two devices modify the same field(s) of the same record while offline.

```swift
// Device A sets contact.name = "John Smith" at t1
// Device B sets contact.name = "Jonathon Smythe" at t2
// On sync: whose value wins?

// Resolution strategies:
// 1. Last-write-wins (LWW) using wall clock or vector clock
// 2. Multi-value register — keep both, let user choose
// 3. Field-level merge — combine non-conflicting fields
// 4. Custom merge function — domain-specific logic
```

### Delete/Update

One device updates a record while another device deletes it.

```javascript
// Device A updates task.status = "completed" offline
// Device B deletes task offline  
// On sync: should the update revive the task?

// Resolution strategies:
// 1. Delete wins — tombstone prevents resurrection
// 2. Update wins — resurrect the updated record
// 3. User prompt — "This item was deleted elsewhere. Apply update anyway?"
```

### Move/Move

Two devices move the same item to different parent locations.

```dart
// Device A moves file to /Documents/Work/ offline
// Device B moves file to /Documents/Personal/ offline
// On sync: which parent wins?

// Resolution strategies:
// 1. Last-write-wins on parent reference
// 2. Multi-parent register (union) — item appears in both locations
// 3. Conflict folder — move to a "Conflicts" directory
```

### Offline Divergence

Prolonged offline periods where replicas independently process many writes, leading to highly divergent states.

```typescript
// Device A offline for 7 days, processes 500 mutations
// Device B offline for 7 days, processes 300 mutations
// Device C offline for 7 days, processes 200 mutations
// On sync: 1000 mutations to reconcile across 3 replicas

// Resolution strategies:
// 1. Incremental sync with dependency ordering
// 2. State-based CRDT with delta compression
// 3. Multi-step reconciliation with intermediate checkpoints
// 4. Full state snapshot with three-way merge
```

---

## CRDT-Based Approaches

### Overview

Conflict-free Replicated Data Types (CRDTs) are data structures that can be replicated across multiple devices and merged automatically without requiring consensus or manual conflict resolution. CRDTs guarantee that all replicas converge to the same state, provided all updates are eventually delivered.

### State-Based CRDTs (CvRDTs)

State-based CRDTs propagate the entire state between replicas. The merge function must be commutative, associative, and idempotent (a join-semilattice).

```typescript
// Grow-Only Set (G-Set) — state-based CRDT
class GSet<T> {
  private elements: Set<T> = new Set();

  add(element: T): void {
    this.elements.add(element);
  }

  merge(other: GSet<T>): GSet<T> {
    const merged = new GSet<T>();
    merged.elements = new Set([...this.elements, ...other.elements]);
    return merged;
  }

  lookup(element: T): boolean {
    return this.elements.has(element);
  }
}
```

```kotlin
// Last-Write-Wins Register (LWW) — state-based CRDT
data class LWWRegister<T>(
    val value: T,
    val timestamp: Long  // Lamport or wall clock
) {
    fun merge(other: LWWRegister<T>): LWWRegister<T> {
        return if (this.timestamp >= other.timestamp) this else other
    }
}

// Two-Phase Set (2P-Set) — supports add and remove
data class TwoPSet<T>(
    private val added: GSet<T> = GSet(),
    private val removed: GSet<T> = GSet()
) {
    fun add(element: T) { added.add(element) }
    fun remove(element: T) { removed.add(element) }
    fun contains(element: T): Boolean = added.contains(element) && !removed.contains(element)
    fun merge(other: TwoPSet<T>): TwoPSet<T> {
        return TwoPSet(added.merge(other.added), removed.merge(other.removed))
    }
}
```

### Operation-Based CRDTs (CmRDTs)

Operation-based CRDTs propagate individual operations rather than full state. Operations must be commutative at the receiving end.

```typescript
// Grow-Only Counter — operation-based CRDT
class GCounter {
  private counts: Map<string, number> = new Map();

  increment(replicaId: string, delta: number = 1): void {
    this.counts.set(replicaId, (this.counts.get(replicaId) || 0) + delta);
  }

  // Operation to send to other replicas
  prepareIncrement(replicaId: string, delta: number = 1): { replicaId: string; delta: number } {
    return { replicaId, delta };
  }

  // Apply operation from another replica
  applyIncrement(op: { replicaId: string; delta: number }): void {
    const current = this.counts.get(op.replicaId) || 0;
    this.counts.set(op.replicaId, current + op.delta);
  }

  value(): number {
    return Array.from(this.counts.values()).reduce((a, b) => a + b, 0);
  }
}
```

### RGA (Replicated Growable Array)

RGA is a CRDT for ordered sequences (lists, text, arrays). Each element carries a unique identifier derived from a replica ID and a causal timestamp.

```typescript
// RGA node
interface RGANode<T> {
  id: string;          // Unique identifier (replicaId + sequence number)
  value: T;
  deleted: boolean;
  parentId: string;    // ID of the previous element at insertion time
}

// Insert operation
function insertAfter<T>(list: RGANode<T>[], refId: string, value: T, replicaId: string): void {
  const newNode: RGANode<T> = {
    id: `${replicaId}:${Date.now()}`,
    value,
    deleted: false,
    parentId: refId,
  };
  // Find insertion point: after the referenced node, before next sibling with same parentId chain
  const refIndex = list.findIndex(n => n.id === refId);
  let insertIndex = refIndex + 1;
  while (insertIndex < list.length && list[insertIndex].parentId === refId) {
    insertIndex++;
  }
  list.splice(insertIndex, 0, newNode);
}

// Merge: take the union of all nodes, resolve ordering by maintaining causal relationships
function mergeLists<T>(local: RGANode<T>[], remote: RGANode<T>[]): RGANode<T>[] {
  const merged = new Map<string, RGANode<T>>();
  for (const node of [...local, ...remote]) {
    merged.set(node.id, node);
  }
  // Rebuild ordering using parentId references
  return topologicalSort(Array.from(merged.values()));
}
```

### LWW (Last-Write-Wins) Register

The simplest CRDT — each write is tagged with a timestamp, and the latest timestamp wins.

```swift
// LWW Register in Swift
struct LWWRegister<T> {
    let replicaId: String
    private var value: T
    private var timestamp: Int64  // Hybrid Logical Clock or Lamport

    mutating func set(_ newValue: T, at timestamp: Int64) {
        if timestamp > self.timestamp {
            self.value = newValue
            self.timestamp = timestamp
        }
    }

    mutating func merge(with other: LWWRegister<T>) {
        if other.timestamp > self.timestamp {
            self.value = other.value
            self.timestamp = other.timestamp
        }
    }

    func get() -> T { value }
}

// Extension: Multi-value register
struct MVRegister<T> {
    var values: [(T, Int64, String)] = []  // (value, timestamp, replicaId)

    mutating func set(_ newValue: T, at timestamp: Int64, by replicaId: String) {
        // Concurrent writes become siblings
        values = values.filter { $0.1 > timestamp || ($0.1 == timestamp && $0.2 == replicaId) }
        values.append((newValue, timestamp, replicaId))
    }

    mutating func merge(with other: MVRegister<T>) {
        var combined = Dictionary(grouping: values + other.values, by: { ($0.1, $0.2) })
            .mapValues { $0.last! }
        values = Array(combined.values)
    }

    func get() -> [T] {
        let maxTimestamp = values.map(\.1).max() ?? 0
        return values.filter { $0.1 == maxTimestamp }.map(\.0)
    }
}
```

### Delta-State CRDTs

Delta-state CRDTs combine the benefits of state-based and operation-based approaches. Instead of sending the full state, each replica sends only the delta (changes since last sync).

```kotlin
// Delta-State Counter
data class DeltaGCounter(
    private val replicaId: String,
    private var state: Map<String, Long> = mapOf(replicaId to 0L)
) {
    fun increment(delta: Long = 1): DeltaGCounter {
        state = state + (replicaId to (state[replicaId] ?: 0) + delta)
        return this
    }

    fun delta(other: Map<String, Long>): Map<String, Long> {
        // Compute delta: entries in our state not reflected in other's state
        return state.filter { (k, v) -> v > (other[k] ?: 0) }
    }

    fun merge(delta: Map<String, Long>) {
        state = state.toMutableMap().apply {
            delta.forEach { (k, v) -> put(k, maxOf(get(k) ?: 0, v)) }
        }
    }

    fun value() = state.values.sum()
}
```

---

## Operational Transform (OT)

### Overview

Operational Transform (OT) is a technique for maintaining consistency across replicas by transforming operations before applying them to account for concurrent edits. Unlike CRDTs which guarantee convergence through mathematical properties, OT transforms operations to achieve intention preservation.

### Core Algorithm

```typescript
// Operation types for a text editor
interface Op {
  type: "insert" | "delete" | "retain";
  chars?: string;
  count?: number;
}

// Transform function: given op1 (local) and op2 (remote, concurrent),
// transform op1 so it can be applied after op2
function transform(op1: Op, op2: Op): Op {
  if (op2.type === "retain") {
    return op1;
  }

  if (op1.type === "retain") {
    if (op2.type === "insert") {
      return { ...op1, count: op1.count! + op2.chars!.length };
    }
    if (op2.type === "delete") {
      return { ...op1, count: op1.count! - op2.count! };
    }
  }

  if (op1.type === "insert" && op2.type === "insert") {
    // OT formula: position-based tie-breaking (server, client, etc.)
    return { ...op1, chars: op1.chars };
  }

  if (op1.type === "delete" && op2.type === "insert") {
    // Delete at position p1, insert at p2
    // If p1 >= p2, shift delete position forward
    return op1;
  }

  if (op1.type === "delete" && op2.type === "delete") {
    // Both deleting — adjust positions
    return op1;
  }

  throw new Error("Unhandled transform pair");
}
```

### OT vs CRDT Decision Matrix

| Criteria | OT | CRDT |
|----------|----|------|
| Complexity | Complex (many edge cases) | Simpler (mathematical guarantees) |
| Intention preservation | Strong | Moderate |
| Sequence/rich text | Mature (used in Google Docs) | Growing (automerge, yrs) |
| Network requirements | Requires ordered delivery (usually via server) | P2P-friendly, any delivery order |
| Storage overhead | Low (operations) | Higher (metadata per element) |
| Concurrency model | Central or decentralized with transform server | Fully decentralized |

### OT Use Cases

- Collaborative text editing (Google Docs, Etherpad, ShareJS)
- Real-time collaborative diagramming
- Collaborative code editing
- Applications requiring strong intention preservation

---

## Conflict-Free Strategies

### Last-Write-Wins with Vector Clocks

Vector clocks track causal relationships between replicas without requiring synchronized wall clocks.

```kotlin
// Vector Clock implementation
data class VectorClock(val clocks: Map<String, Int> = emptyMap()) {
    fun tick(replicaId: String): VectorClock {
        return copy(clocks = clocks + (replicaId to (clocks[replicaId] ?: 0) + 1))
    }

    fun happensBefore(other: VectorClock): Boolean {
        // This clock is strictly less than other in all entries
        val allKeys = clocks.keys + other.clocks.keys
        var strictlyLess = false
        for (key in allKeys) {
            val a = clocks[key] ?: 0
            val b = other.clocks[key] ?: 0
            if (a > b) return false
            if (a < b) strictlyLess = true
        }
        return strictlyLess
    }

    fun concurrent(other: VectorClock): Boolean {
        return !happensBefore(other) && !other.happensBefore(this)
    }
}

// Dotted Version Vector — version vector with "dotted" entries for pending operations
data class DottedVersionVector(
    val versions: Map<String, Int> = emptyMap(),     // acknowledged versions per replica
    val dots: Map<String, Int> = emptyMap()           // pending (not yet acknowledged) dots
)
```

### Multi-Value Registers (MVR)

When concurrent writes occur, MVRs keep all values as "siblings." Applications or users must resolve the siblings on read.

```javascript
// CouchDB-style multi-version concurrency
class MultiValueRegister {
  constructor() {
    this.siblings = [];
  }

  write(value, rev) {
    // Rev is the revision being modified
    this.siblings = this.siblings.filter(s => s.rev !== rev);
    this.siblings.push({ value, rev: this.generateRev(), timestamp: Date.now() });
  }

  read() {
    if (this.siblings.length === 1) {
      return { value: this.siblings[0].value, resolved: true };
    }
    // Multiple siblings — needs resolution
    return { values: this.siblings.map(s => s.value), resolved: false };
  }

  resolve(values) {
    this.siblings = values.map(v => ({ value: v, rev: this.generateRev() }));
  }

  generateRev() {
    return `rev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
```

### MVCC (Multi-Version Concurrency Control)

MVCC maintains multiple versions of each record, enabling conflict detection at read time and conflict resolution at write time.

```sql
-- MVCC schema for sync conflicts
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    current_version INTEGER NOT NULL DEFAULT 1,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
);

CREATE TABLE document_versions (
    id TEXT NOT NULL,
    version INTEGER NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    parent_version INTEGER,
    merged_from TEXT,  -- JSON array of version IDs
    PRIMARY KEY (id, version),
    FOREIGN KEY (id) REFERENCES documents(id)
);

CREATE TABLE document_conflicts (
    id TEXT NOT NULL,
    version_a INTEGER NOT NULL,
    version_b INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, resolved, auto_resolved
    resolution_type TEXT,
    resolved_version INTEGER,
    created_at TEXT NOT NULL,
    resolved_at TEXT,
    PRIMARY KEY (id, version_a, version_b)
);
```

---

## Three-Way Merge vs Automatic Merge

### Three-Way Merge

Three-way merge finds changes by comparing the current local state, the current remote state, and a common ancestor. Differences from the ancestor to each state are merged.

```typescript
// Three-way merge algorithm
interface State {
  data: Record<string, any>;
  version: number;
}

interface MergeResult {
  merged: Record<string, any>;
  conflicts: Conflict[];
}

function threeWayMerge(base: State, local: State, remote: State): MergeResult {
  const merged: Record<string, any> = {};
  const conflicts: Conflict[] = [];
  const allKeys = new Set([
    ...Object.keys(base.data),
    ...Object.keys(local.data),
    ...Object.keys(remote.data),
  ]);

  for (const key of allKeys) {
    const baseVal = base.data[key];
    const localVal = local.data[key];
    const remoteVal = remote.data[key];

    const localChanged = !deepEqual(localVal, baseVal);
    const remoteChanged = !deepEqual(remoteVal, baseVal);

    if (!localChanged && !remoteChanged) {
      // No changes — use any
      merged[key] = baseVal;
    } else if (localChanged && !remoteChanged) {
      // Only local changed
      merged[key] = localVal;
    } else if (!localChanged && remoteChanged) {
      // Only remote changed
      merged[key] = remoteVal;
    } else if (deepEqual(localVal, remoteVal)) {
      // Both made the same change
      merged[key] = localVal;
    } else {
      // Both changed to different values — conflict!
      conflicts.push({
        key,
        localValue: localVal,
        remoteValue: remoteVal,
        baseValue: baseVal,
      });
      // Default: use remote value
      merged[key] = remoteVal;
    }
  }

  return { merged, conflicts };
}
```

### Automatic Merge Strategies

Automatic merge applies domain-specific or heuristic strategies without user intervention.

```kotlin
// Automatic merge with strategy pattern
sealed class AutoMergeStrategy {
    object LastWriteWins : AutoMergeStrategy()
    object RemoteWins : AutoMergeStrategy()
    object LocalWins : AutoMergeStrategy()
    data class CustomMerge(val mergeFn: (Any?, Any?) -> Any?) : AutoMergeStrategy()
    data class FieldBased(val fieldStrategies: Map<String, AutoMergeStrategy>) : AutoMergeStrategy()
}

data class SyncConfig(
    val defaultStrategy: AutoMergeStrategy = AutoMergeStrategy.LastWriteWins,
    val fieldOverrides: Map<String, AutoMergeStrategy> = emptyMap()
)

class AutoMerger(private val config: SyncConfig) {
    fun <T> merge(local: T, remote: T, fields: Map<String, Pair<Any?, Any?>>): T {
        val strategy = config.defaultStrategy
        return when (strategy) {
            is AutoMergeStrategy.LastWriteWins -> if (localTimestamp > remoteTimestamp) local else remote
            is AutoMergeStrategy.RemoteWins -> remote
            is AutoMergeStrategy.LocalWins -> local
            is AutoMergeStrategy.CustomMerge -> strategy.mergeFn(local, remote) as T
            is AutoMergeStrategy.FieldBased -> mergeFields(fields, strategy)
        }
    }

    private fun <T> mergeFields(
        fields: Map<String, Pair<Any?, Any?>>,
        strategy: AutoMergeStrategy.FieldBased
    ): T { /* field-level merge */ throw NotImplementedError() }
}
```

---

## Custom Conflict Resolution

### Custom Merge Functions

Domain-specific merge logic for complex data types.

```swift
// Shopping cart merge — additive, no data loss
func mergeShoppingCarts(local: Cart, remote: Cart) -> Cart {
    var merged = Cart()

    // Combine all items (additive — union of both carts)
    let allItemIds = Set(local.items.map(\.id) + remote.items.map(\.id))

    for itemId in allItemIds {
        let localItem = local.items.first(where: { $0.id == itemId })
        let remoteItem = remote.items.first(where: { $0.id == itemId })

        switch (localItem, remoteItem) {
        case (.some(let l), .some(let r)):
            // Both have item — take the higher quantity
            merged.items.append(max(l, r) { $0.quantity < $1.quantity })
        case (.some(let l), nil):
            merged.items.append(l)
        case (nil, .some(let r)):
            merged.items.append(r)
        case (nil, nil):
            break
        }
    }

    // Recalculate totals
    merged.total = merged.items.reduce(0) { $0 + $1.price * Decimal($1.quantity) }
    return merged
}
```

```typescript
// Contact merge — field-level with preference rules
function mergeContacts(local: Contact, remote: Contact): Contact {
  return {
    name: mergeString(local.name, remote.name, { prefer: "most_recent" }),
    phone: mergePhone(local.phone, remote.phone, { prefer: "longest" }),
    email: mergeString(local.email, remote.email, { prefer: "specific_domain" }),
    address: mergeAddress(local.address, remote.address, {
      prefer: "user_verified",
    }),
    tags: mergeSet(local.tags, remote.tags), // union
    notes: mergeAppend(local.notes, remote.notes), // append with timestamp
  };
}
```

### Domain-Specific Strategies

```kotlin
// Calendar event resolution
data class CalendarEvent(
    val id: String,
    val title: String,
    val startTime: Instant,
    val endTime: Instant,
    val attendees: List<String>,
    val location: String,
    val recurrenceRule: String?
)

fun mergeEvents(local: CalendarEvent, remote: CalendarEvent): CalendarEvent {
    return CalendarEvent(
        id = local.id,
        title = mergeWithPreference(local.title, remote.title, local.title),
        startTime = minOf(local.startTime, remote.startTime), // earliest wins
        endTime = maxOf(local.endTime, remote.endTime),       // latest wins
        attendees = (local.attendees + remote.attendees).distinct(), // union
        location = remote.location, // server/remote wins for logistics
        recurrenceRule = local.recurrenceRule ?: remote.recurrenceRule
    )
}

// Financial transaction resolution — never lose money
fun mergeTransactions(local: Transaction, remote: Transaction): Transaction {
    return Transaction(
        amount = local.amount + remote.amount, // sum for reconciliation
        category = if (local.category.isVerified()) local.category else remote.category,
        notes = "${local.notes}\n${remote.notes}".trim(),
        status = TransactionStatus.PENDING_REVIEW
    )
}
```

### Host Language Merge

Leverage the host language's runtime to define merge functions for custom types.

```python
# Python: merge function registry with type-based dispatch
class MergeRegistry:
    def __init__(self):
        self._mergers = {}

    def register(self, type_name: str, merge_fn: callable):
        self._mergers[type_name] = merge_fn

    def merge(self, type_name: str, local: Any, remote: Any) -> Any:
        merger = self._mergers.get(type_name)
        if merger is None:
            return remote  # default: remote wins
        return merger(local, remote)


registry = MergeRegistry()

@registry.register("inventory_item")
def merge_inventory(local: dict, remote: dict) -> dict:
    """Inventory is additive — sum quantities, keep higher price"""
    return {
        "sku": local["sku"],
        "quantity": local.get("quantity", 0) + remote.get("quantity", 0),
        "price": max(local.get("price", 0), remote.get("price", 0)),
        "location": remote.get("location") or local.get("location"),
    }

@registry.register("user_profile")
def merge_profile(local: dict, remote: dict) -> dict:
    """Profile: newest non-null field values win"""
    merged = {}
    for key in set(list(local.keys()) + list(remote.keys())):
        lv = local.get(key)
        rv = remote.get(key)
        if lv is not None and rv is not None:
            merged[key] = rv if remote.get(f"{key}_updated_at", 0) >= local.get(f"{key}_updated_at", 0) else lv
        else:
            merged[key] = lv or rv
    return merged
```

---

## Server-Side Conflict Resolution

### Business Logic on the Server

Offload conflict resolution to the server where full context (global state, user permissions, business rules) is available.

```javascript
// Server-side conflict resolver (Node.js/Firebase Functions)
async function resolveConflict(context) {
  const { collection, docId, localData, remoteData, serverData, userId, timestamp } = context;

  // Business rule: only managers can override inventory
  const user = await getUser(userId);
  if (collection === 'inventory' && !user.isManager) {
    return serverData; // server is always right for non-managers
  }

  // Business rule: orders can only move forward in status
  if (collection === 'orders') {
    const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const localIdx = statusOrder.indexOf(localData.status);
    const remoteIdx = statusOrder.indexOf(remoteData.status);
    const serverIdx = statusOrder.indexOf(serverData.status);

    // Take the furthest-along status
    const mergedStatus = statusOrder[Math.max(localIdx, remoteIdx, serverIdx)];

    // If cancelling, require manager approval
    if (mergedStatus === 'cancelled' && !user.isManager) {
      return { ...serverData, status: serverData.status };
    }

    return { ...serverData, status: mergedStatus };
  }

  // Fallback: LWW by vector clock
  return localData.timestamp > remoteData.timestamp ? localData : remoteData;
}
```

### Conflict Resolution with Event Sourcing

Use event sourcing to store all operations, enabling replay and custom resolution.

```kotlin
// Event-sourced conflict resolution
data class SyncEvent(
    val eventId: String,
    val entityId: String,
    val replicaId: String,
    val eventType: String,       // "created", "updated", "deleted"
    val payload: Map<String, Any?>,
    val vectorClock: Map<String, Int>,
    val timestamp: Long
)

class EventSourcedResolver(
    private val eventStore: EventStore,
    private val mergeStrategies: Map<String, (List<SyncEvent>) -> Any?>
) {
    fun resolve(entityId: String, newEvents: List<SyncEvent>): Any? {
        // Load all events for this entity
        val allEvents = eventStore.getEvents(entityId) + newEvents

        // Sort by causal order using vector clocks
        val sorted = allEvents.sortedWith(compareBy { it.timestamp })

        // Group by entity type and apply strategy
        val strategy = mergeStrategies[entityId.substringBefore("-")]
        return strategy?.invoke(sorted) ?: sorted.last().payload
    }
}
```

---

## Conflict Resolution Patterns

### Manual Resolution

Users are presented with conflicting versions and asked to choose or merge.

```dart
// Conflict resolution UI model
class ConflictRecord {
  final String id;
  final String entityType;
  final Map<String, dynamic> localVersion;
  final Map<String, dynamic> remoteVersion;
  final List<String> conflictingFields;
  final DateTime occurredAt;
  ConflictStatus status; // pending, resolved, dismissed

  ConflictResolution resolve({required String choice}) {
    // choice: "local", "remote", or custom field selections
    return ConflictResolution(
      conflictId: id,
      resolvedData: choice,
      resolvedAt: DateTime.now(),
    );
  }
}
```

### Automated Resolution

Rules-based resolution without user intervention.

```yaml
auto_resolution_rules:
  priority_fields:
    last_modified:
      - "updated_at"
      - "version"
    server_authoritative:
      - "status"
      - "is_verified"
      - "permissions"
    client_authoritative:
      - "draft_content"
      - "local_preferences"
    union:
      - "tags"
      - "categories"
      - "participants"
    sum:
      - "view_count"
      - "score"

  strategies:
    list_merge: union
    counter_merge: max
    text_merge: append_chronological
```

### Custom Merge Pattern

Domain-specific merge functions registered per data type.

```typescript
// Merge strategy registry
interface MergeStrategy {
  type: string;
  merge<T>(local: T, remote: T, metadata: MergeMetadata): T;
}

class MergeEngine {
  private strategies: Map<string, MergeStrategy> = new Map();

  register(strategy: MergeStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  merge<T>(type: string, local: T, remote: T, metadata: MergeMetadata): T {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      console.warn(`No merge strategy for ${type}, using LWW`);
      return local.meta?.timestamp > remote.meta?.timestamp ? local : remote;
    }
    return strategy.merge(local, remote, metadata);
  }
}
```

### Semantic Resolution

Understand the meaning of data to resolve conflicts intelligently.

```python
# Semantic resolution for a todo list app
def semantic_merge(local_todos, remote_todos):
    """Merge by understanding the semantics of each field."""
    local_map = {t["id"]: t for t in local_todos}
    remote_map = {t["id"]: t for t in remote_todos}
    all_ids = set(local_map.keys()) | set(remote_map.keys())

    merged = []
    for tid in all_ids:
        local = local_map.get(tid)
        remote = remote_map.get(tid)

        if local is None:
            merged.append(remote)  # created remotely
        elif remote is None:
            merged.append(local)  # created locally
        else:
            # Semantic: completed + completed = completed
            # completed + pending = completed
            if local["completed"] or remote["completed"]:
                merged.append({**local, **remote, "completed": True})
            else:
                # Take the one updated more recently
                merged.append(
                    local if local.get("updated_at", 0) > remote.get("updated_at", 0) else remote
                )

    return merged
```

---

## Conflict Detection Strategies

### Version Vectors

Each replica maintains a monotonically increasing counter. Conflicts are detected when version vectors are concurrent (neither dominates the other).

```swift
struct VersionVector {
    var versions: [String: Int] = [:]

    mutating func increment(for replicaId: String) {
        versions[replicaId, default: 0] += 1
    }

    func dominates(_ other: VersionVector) -> Bool {
        // Returns true if this vector's replica entries are all >= other's
        for (replica, version) in other.versions {
            if (versions[replica] ?? 0) < version {
                return false
            }
        }
        return true
    }

    func concurrent(with other: VersionVector) -> Bool {
        return !dominates(other) && !other.dominates(self)
    }

    func merged(with other: VersionVector) -> VersionVector {
        var result = versions
        for (replica, version) in other.versions {
            result[replica] = max(result[replica] ?? 0, version)
        }
        return VersionVector(versions: result)
    }
}
```

### Hash-Based Detection

Compare content hashes (Merkle trees) to detect divergent data.

```kotlin
// Merkle Tree for conflict detection
data class MerkleNode(
    val hash: String,
    val children: Map<String, MerkleNode>? = null
)

class MerkleTree(private val data: Map<String, Any?>) {
    fun build(): MerkleNode {
        return buildNode(data, "")
    }

    private fun buildNode(node: Map<String, Any?>, prefix: String): MerkleNode {
        val childNodes = node.map { (key, value) ->
            val path = "$prefix/$key"
            key to when (value) {
                is Map<*, *> -> buildNode(value as Map<String, Any?>, path)
                else -> MerkleNode(hashOf(value.toString()))
            }
        }.toMap()

        val combinedHash = childNodes.entries
            .sortedBy { it.key }
            .joinToString("") { "${it.key}:${it.value.hash}" }
            .let { hashOf(it) }

        return MerkleNode(hash = combinedHash, children = childNodes)
    }

    fun diff(other: MerkleTree): List<String> {
        // Returns paths of differing subtrees
        return diffNodes(this.build(), other.build(), "")
    }

    private fun diffNodes(a: MerkleNode, b: MerkleNode, path: String): List<String> {
        if (a.hash == b.hash) return emptyList()

        val differences = mutableListOf<String>()
        val allKeys = (a.children?.keys ?: emptySet()) + (b.children?.keys ?: emptySet())

        for (key in allKeys) {
            val childA = a.children?.get(key)
            val childB = b.children?.get(key)
            when {
                childA == null && childB != null -> differences.add("$path/$key (added)")
                childA != null && childB == null -> differences.add("$path/$key (removed)")
                childA != null && childB != null ->
                    differences.addAll(diffNodes(childA, childB, "$path/$key"))
            }
        }

        return differences
    }
}
```

### Timestamp-Based Detection

Wall clock timestamps with safety margins for clock skew.

```typescript
// Timestamp-based conflict detection
interface SyncRecord {
  id: string;
  data: any;
  updatedAt: number; // Unix timestamp in milliseconds
  updatedBy: string;
}

function detectConflicts(
  local: SyncRecord,
  remote: SyncRecord,
  clockSkewToleranceMs: number = 5000
): SyncConflict | null {
  const timeDiff = Math.abs(local.updatedAt - remote.updatedAt);

  if (timeDiff <= clockSkewToleranceMs) {
    // Within clock skew tolerance — treat as concurrent
    return {
      recordId: local.id,
      localData: local.data,
      remoteData: remote.data,
      localTimestamp: local.updatedAt,
      remoteTimestamp: remote.updatedAt,
      detectionMethod: "concurrent_within_skew",
    };
  }

  // Clear winner based on timestamp
  return null; // no conflict
}
```

### Hybrid Detection

Combine multiple detection strategies for robust conflict identification.

```kotlin
data class HybridDetectionResult(
    val hasConflict: Boolean,
    val method: String,           // "version_vector", "hash", "timestamp", "heuristic"
    val confidence: Double,
    val localState: Any?,
    val remoteState: Any?
)

class HybridConflictDetector(
    private val strategies: List<ConflictDetectionStrategy>
) {
    fun detect(local: SyncState, remote: SyncState): HybridDetectionResult {
        for (strategy in strategies) {
            val result = strategy.detect(local, remote)
            if (result.hasConflict && result.confidence > 0.8) {
                return result
            }
        }
        // If no strategy is confident, use heuristic
        return heuristicDetect(local, remote)
    }

    private fun heuristicDetect(local: SyncState, remote: SyncState): HybridDetectionResult {
        // Heuristic: if data bytes differ and both have changed since last sync
        val localBytes = serialize(local.data)
        val remoteBytes = serialize(remote.data)
        return HybridDetectionResult(
            hasConflict = localBytes != remoteBytes && local.changed && remote.changed,
            method = "heuristic",
            confidence = 0.5,
            localState = local.data,
            remoteState = remote.data
        )
    }
}
```

---

## Offline Conflict Resolution

### Staging Changes

Queue local changes when offline for replay during sync.

```dart
// Change queue for offline mutations
class ChangeQueue {
  final Database db;
  final List<QueuedChange> _pending = [];

  Future<void> enqueue(QueuedChange change) async {
    await db.insert('sync_queue', {
      'id': change.id,
      'entity_type': change.entityType,
      'entity_id': change.entityId,
      'change_type': change.changeType.name,
      'payload': jsonEncode(change.payload),
      'created_at': DateTime.now().toIso8601String(),
      'retry_count': 0,
    });
    _pending.add(change);
  }

  Future<List<QueuedChange>> dequeueAll() async {
    final rows = await db.query('sync_queue', orderBy: 'created_at ASC');
    return rows.map((r) => QueuedChange(
      id: r['id'] as String,
      entityType: r['entity_type'] as String,
      entityId: r['entity_id'] as String,
      changeType: ChangeType.values.byName(r['change_type'] as String),
      payload: jsonDecode(r['payload'] as String),
    )).toList();
  }

  Future<void> remove(String id) async {
    await db.delete('sync_queue', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> markFailed(String id) async {
    await db.update('sync_queue', {'retry_count': db.raw('retry_count + 1')},
        where: 'id = ?', whereArgs: [id]);
  }
}

enum ChangeType { create, update, delete }
```

### Conflict Queues

Store detected conflicts for later resolution without blocking sync.

```typescript
// Conflict queue manager
class ConflictQueue {
  private conflicts: Map<string, Conflict> = new Map();

  record(conflict: Conflict): void {
    this.conflicts.set(conflict.id, {
      ...conflict,
      status: "pending",
      recordedAt: Date.now(),
    });
  }

  getConflicts(status?: ConflictStatus): Conflict[] {
    const all = Array.from(this.conflicts.values());
    return status ? all.filter(c => c.status === status) : all;
  }

  resolve(conflictId: string, resolution: ResolvedData): void {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;
    this.conflicts.set(conflictId, {
      ...conflict,
      status: "resolved",
      resolution,
      resolvedAt: Date.now(),
    });
  }

  batchResolve(strategy: AutoResolveStrategy): Conflict[] {
    const pending = this.getConflicts("pending");
    const resolved: Conflict[] = [];

    for (const conflict of pending) {
      const resolution = strategy.apply(conflict);
      if (resolution) {
        this.resolve(conflict.id, resolution);
        resolved.push({ ...conflict, status: "resolved", resolution });
      }
    }

    return resolved;
  }
}
```

### Reconciliation UIs

User interfaces for reviewing and resolving conflicts.

```dart
// Flutter reconciliation UI component
class ConflictResolutionScreen extends StatelessWidget {
  final List<Conflict> conflicts;

  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: conflicts.length,
      itemBuilder: (context, index) {
        final conflict = conflicts[index];
        return Card(
          child: Column(
            children: [
              Text('Conflict on ${conflict.entityType}'),
              ConflictDiffView(
                local: conflict.localVersion,
                remote: conflict.remoteVersion,
              ),
              Row(
                children: [
                  ElevatedButton(
                    onPressed: () => resolve(conflict.id, 'local'),
                    child: Text('Keep Local'),
                  ),
                  ElevatedButton(
                    onPressed: () => resolve(conflict.id, 'remote'),
                    child: Text('Keep Remote'),
                  ),
                  ElevatedButton(
                    onPressed: () => showMergeDialog(conflict),
                    child: Text('Custom Merge'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
```

```swift
// SwiftUI reconciliation view
struct ConflictResolutionView: View {
    let conflict: SyncConflict
    @State private var selectedOption: ResolutionOption = .local

    var body: some View {
        VStack(alignment: .leading) {
            Text("Resolve Conflict")
                .font(.headline)

            Picker("Resolution", selection: $selectedOption) {
                Text("Keep Local").tag(ResolutionOption.local)
                Text("Keep Remote").tag(ResolutionOption.remote)
                Text("Merge").tag(ResolutionOption.merge)
            }
            .pickerStyle(.segmented)

            if selectedOption == .merge {
                MergeEditor(
                    local: conflict.localValue,
                    remote: conflict.remoteValue,
                    base: conflict.baseValue
                )
            }

            HStack {
                Button("Apply") { resolveConflict() }
                Button("Skip", role: .cancel) { skipConflict() }
            }
        }
        .padding()
    }
}
```

---

## Conflict Resolution UI Patterns

### Three-Panel Merge

Shows local version, remote version, and merged result side by side.

```
┌──────────────────────────────────────────────────┐
│                  Merge Conflict                   │
├───────────────────┬───────────────────┬──────────┤
│     Local v3      │     Remote v5     │  Merged  │
├───────────────────┼───────────────────┼──────────┤
│ Name: John        │ Name: Jon         │ Name:    │
│ Phone: 555-0100   │ Phone: 555-0199   │ [______] │
│ Email: j@a.com    │ Email: j@b.com    │          │
│                   │                   │          │
│ [Use this] [Use]  │ [Use this] [Use]  │ [Apply]  │
└───────────────────┴───────────────────┴──────────┘
```

### List-Based Resolution

Show conflicts in a list with quick action buttons.

```typescript
// Conflict list component
function ConflictList({ conflicts, onResolve }: ConflictListProps) {
  return (
    <div className="conflict-list">
      <div className="conflict-stats">
        <span>{conflicts.filter(c => c.status === 'pending').length} pending</span>
        <button onClick={() => autoResolveAll()}>Auto-resolve all</button>
      </div>
      {conflicts.map(conflict => (
        <ConflictCard key={conflict.id}>
          <div className="conflict-field">{conflict.fieldName}</div>
          <div className="conflict-values">
            <div className="value-local">{conflict.localValue}</div>
            <div className="value-remote">{conflict.remoteValue}</div>
          </div>
          <div className="conflict-actions">
            <button onClick={() => onResolve(conflict.id, 'local')}>Keep local</button>
            <button onClick={() => onResolve(conflict.id, 'remote')}>Keep remote</button>
            <button onClick={() => onResolve(conflict.id, 'merge')}>Merge</button>
            <button onClick={() => setShowDiff(conflict.id)}>View diff</button>
          </div>
        </ConflictCard>
      ))}
    </div>
  );
}
```

### Auto-Merge with Review

Automatically merge changes but allow users to review and override.

```kotlin
class AutoMergeWithReview<T>(
    private val merger: AutoMerger<T>,
    private val conflictThreshold: Int = 5
) {
    fun mergeAndReview(local: T, remote: T): MergeReview<T> {
        val autoResult = merger.merge(local, remote, detectChanges(local, remote))
        return when {
            autoResult.conflicts.isEmpty() -> MergeReview(
                result = autoResult.merged,
                requiresReview = false,
                changesApplied = autoResult.mergedChanges
            )
            autoResult.conflicts.size <= conflictThreshold -> MergeReview(
                result = autoResult.merged,
                requiresReview = true,
                conflicts = autoResult.conflicts,
                changesApplied = autoResult.mergedChanges
            )
            else -> MergeReview(
                result = null,
                requiresReview = true,
                conflicts = autoResult.conflicts,
                changesApplied = emptyList()
            )
        }
    }

    data class MergeReview<T>(
        val result: T?,
        val requiresReview: Boolean,
        val conflicts: List<AutoMergeConflict> = emptyList(),
        val changesApplied: List<Change> = emptyList()
    )
}
```

---

## Conflict Avoidance Strategies

### Data Partitioning

Partition data so each device or user owns a non-overlapping subset.

```yaml
data_partitioning_strategies:
  ownership_based:
    description: "Each user owns their data exclusively"
    example: "User A owns notes, User B owns contacts"
    conflict_rate: "Near zero"
    limitation: "Cannot share mutable data"

  location_based:
    description: "Data partitioned by geographic region"
    example: "NYC sales data vs London sales data"
    conflict_rate: "Very low"
    limitation: "Cross-region queries require merge"

  temporal_partitioning:
    description: "Data partitioned by time windows"
    example: "Orders from Q1 vs Q2"
    conflict_rate: "Zero (append-only)"
    limitation: "Cross-period aggregations require union"

  shard_by_id:
    description: "Deterministic shard assignment by ID hash"
    example: "hash(id) % N → shard"
    conflict_rate: "Zero within shard (single writer)"
    limitation: "Requires fixed shard count"
```

### Ownership-Based Writes

Each device owns specific records and is the authoritative writer.

```sql
-- Ownership table for write authority
CREATE TABLE record_ownership (
    record_id TEXT PRIMARY KEY,
    owner_device_id TEXT NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'device', 'group')),
    claimed_at TEXT NOT NULL,
    expires_at TEXT,
    write_token TEXT NOT NULL
);

-- Only the owner can write
CREATE TRIGGER enforce_ownership BEFORE UPDATE ON documents
BEGIN
    SELECT CASE
        WHEN NEW.updated_by != (SELECT owner_device_id FROM record_ownership WHERE record_id = NEW.id)
        THEN RAISE(ABORT, 'Not the record owner')
    END;
END;
```

### Operational Scoping

Limit the scope of operations to reduce conflict surface area.

```typescript
// Operational scoping: fine-grained operations vs coarse
// ❌ Avoid: monolithic document sync
function syncDocument(document: FullDocument): FullDocument {
  return fullThreeWayMerge(document);
}

// ✅ Prefer: scoped field sync
function syncFields(entityId: string, fields: string[]) {
  // Each field syncs independently with its own version
  return fields.map(field => ({
    entityId,
    field,
    value: syncField(entityId, field),
    version: getFieldVersion(entityId, field),
  }));
}

// ✅ Prefer: append-only operations
function addComment(entityId: string, comment: Comment) {
  // Append to immutable list — never causes update/update conflict
  return appendToImmutableList(entityId, 'comments', comment);
}

// ✅ Prefer: idempotent operations
function setFlag(entityId: string, flag: string, value: boolean) {
  // Idempotent: setting same flag to same value is safe
  return applyIdempotentUpdate(entityId, { [flag]: value });
}
```

---

## Tools and Libraries

### CouchDB / PouchDB

Multi-master replication with MVCC and automatic conflict detection.

```javascript
// PouchDB conflict resolution
const db = new PouchDB('myapp');

// Listen for conflicts
db.changes({
  conflicts: true,
  since: 'now',
  live: true,
}).on('change', async (change) => {
  if (change.doc._conflicts) {
    for (const conflictRev of change.doc._conflicts) {
      // Fetch conflicting revision
      const conflictDoc = await db.get(change.id, { rev: conflictRev });

      // Automatically resolve (example: merge with union)
      const resolved = {
        ...change.doc,
        tags: [...new Set([...change.doc.tags, ...conflictDoc.tags])],
        _conflicts: undefined,
      };

      // Remove conflicting revisions
      await db.put(resolved);
      await db.remove(change.id, conflictRev);
    }
  }
});
```

### Firebase Firestore

Built-in conflict resolution with last-write-wins by default.

```typescript
// Firestore transactions with custom conflict handling
async function updateWithConflictHandling(docRef: DocumentReference) {
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) throw new Error('Document does not exist');

    // Firestore transactions automatically retry on conflict
    // Custom handling within the transaction
    const currentData = doc.data();
    const newData = mergeWithBusinessLogic(currentData, pendingUpdates);
    transaction.update(docRef, newData);
  });

  // Handle transaction failure (after max retries)
  // This happens when contention is too high
}
```

### AWS AppSync

GraphQL-based sync with local delta sync and conflict resolution.

```typescript
// AppSync conflict resolution configuration
const conflictHandler = {
  // Automatic conflict resolution strategies
  AUTOMATIC: 'OPTIMISTIC_CONCURRENCY',  // Version-based
  CUSTOM: 'CUSTOM',                      // Lambda-based
  NONE: 'NONE',                          // Pass conflicts through
};

// Lambda-based conflict resolver
exports.handler = async (event) => {
  const { payload, existing, incoming } = event;

  // Custom merge logic
  if (payload.fieldName === 'updateOrder') {
    const existingData = existing;
    const incomingData = incoming.arguments.input;

    // Business-specific merge
    return {
      ...existingData,
      status: incomingData.status || existingData.status,
      items: mergeOrderItems(existingData.items, incomingData.items),
      updatedAt: new Date().toISOString(),
    };
  }

  // Default: last-write-wins
  return incoming.arguments.input;
};
```

### Realm

Mobile-first database with built-in sync and conflict resolution.

```swift
// Realm conflict resolution
class Task: Object {
    @Persisted(primaryKey: true) var id: String
    @Persisted var title: String
    @Persisted var isComplete: Bool
    @Persisted var priority: Int
}

// Realm's conflict resolution is configurable:
// • Last-write-wins (default)
// • Custom resolution via Realm Object Server functions

// Client-side conflict handling
let syncConfig = SyncConfiguration.defaultConfiguration(
    user: user,
    partitionValue: "tasks",
    clientResetMode: .discardLocal(recovery: { localRealm in
        // Handle client reset (server forces state)
        // Save local changes before discarding
        let localChanges = localRealm.objects(Task.self).filter("isDirty == true")
        // Cache them for re-application
    })
)
let realm = try! Realm(configuration: syncConfig)
```

### WatermelonDB

High-performance SQLite-based sync engine for React Native.

```javascript
// WatermelonDB sync adapter
import { synchronize } from '@nozbe/watermelondb/sync';

async function mySync() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      // Fetch changes from server since lastPulledAt
      const response = await api.fetchChanges({ lastPulledAt });
      return {
        changes: response.changes,
        timestamp: response.timestamp,
      };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // Push local changes to server
      await api.pushChanges({ changes });
    },
    // Conflict resolution strategy
    migrationsEnabled: true,
    conflictResolver: (record, localChanges, remoteChanges) => {
      // Custom per-table conflict resolution
      if (record.table === 'tasks') {
        return {
          type: 'merge', // or 'local' or 'remote'
          changes: {
            ...remoteChanges,
            ...localChanges,
          },
        };
      }
      // Default: remote wins
      return { type: 'remote' };
    },
  });
}
```

### SQLite Sync Engines

Custom sync engines built on SQLite.

```kotlin
// SQLite-based sync engine
class SQLiteSyncEngine(private val db: SupportSQLiteDatabase) {
    companion object {
        private const val SYNC_TABLE = """
            CREATE TABLE IF NOT EXISTS sync_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                row_id TEXT NOT NULL,
                operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
                old_values TEXT,
                new_values TEXT,
                timestamp INTEGER NOT NULL,
                synced INTEGER NOT NULL DEFAULT 0
            )
        """
    }

    fun trackChanges(table: String, rowId: String, operation: String, oldValues: String?, newValues: String?) {
        db.execSQL(
            "INSERT INTO sync_log (table_name, row_id, operation, old_values, new_values, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            arrayOf(table, rowId, operation, oldValues, newValues, System.currentTimeMillis())
        )
    }

    fun getUnsyncedChanges(): List<SyncChange> {
        val cursor = db.rawQuery("SELECT * FROM sync_log WHERE synced = 0 ORDER BY timestamp ASC", null)
        val changes = mutableListOf<SyncChange>()
        cursor.use {
            while (it.moveToNext()) {
                changes.add(SyncChange(
                    id = it.getLong(0),
                    tableName = it.getString(1),
                    rowId = it.getString(2),
                    operation = it.getString(3),
                    oldValues = it.getString(4),
                    newValues = it.getString(5),
                    timestamp = it.getLong(6)
                ))
            }
        }
        return changes
    }

    fun markSynced(changeIds: List<Long>) {
        db.execSQL(
            "UPDATE sync_log SET synced = 1 WHERE id IN (${changeIds.joinToString(",")})"
        )
    }
}
```

---

## Testing Conflict Resolution

### Simulating Conflicts

Create controlled conflict scenarios in test environments.

```python
# Conflict simulation test suite
import pytest
from datetime import datetime, timedelta

class ConflictSimulator:
    def __init__(self, sync_engine):
        self.engine = sync_engine
        self.device_a = "device_a"
        self.device_b = "device_b"

    def simulate_update_update_conflict(self):
        """Create an update/update conflict."""
        # Both devices fetch the same base state
        base = self.engine.fetch("user_profile", "user_1")

        # Device A makes changes
        self.engine.apply_local_change(
            device=self.device_a,
            entity="user_profile",
            entity_id="user_1",
            changes={"name": "Alice"},
            base_version=base["version"],
        )

        # Device B makes different changes to the same field
        self.engine.apply_local_change(
            device=self.device_b,
            entity="user_profile",
            entity_id="user_1",
            changes={"name": "Alyssa"},
            base_version=base["version"],
        )

        # Sync — expect conflict
        result = self.engine.sync(self.device_a, self.device_b)
        assert result.has_conflicts
        assert "name" in result.conflicting_fields
        return result

    def simulate_delete_create_conflict(self):
        """Create a delete/create conflict."""
        base = self.engine.fetch("task", "task_1")

        # Device A deletes
        self.engine.apply_delete(self.device_a, "task", "task_1", base["version"])

        # Device B updates
        self.engine.apply_local_change(
            device=self.device_b,
            entity="task",
            entity_id="task_1",
            changes={"status": "completed"},
            base_version=base["version"],
        )

        result = self.engine.sync(self.device_a, self.device_b)
        return result


def test_update_update_resolution():
    sim = ConflictSimulator(SyncEngine())
    result = sim.simulate_update_update_conflict()

    # With last-write-wins, the later timestamp should win
    resolution = result.resolve(strategy="last_write_wins")
    expected_name = "Alyssa"  # Device B's change (assuming B is later)
    assert resolution.merged["name"] == expected_name


def test_custom_merge_strategy():
    sim = ConflictSimulator(SyncEngine())
    result = sim.simulate_update_update_conflict()

    # Custom: combine names
    def merge_names(local, remote):
        return {"name": f"{local['name']} & {remote['name']}"}

    resolution = result.resolve(strategy="custom", merge_fn=merge_names)
    assert resolution.merged["name"] == "Alice & Alyssa"


def test_multi_device_conflict():
    """Test conflict with 3+ devices."""
    sim = ConflictSimulator(SyncEngine())
    devices = ["device_a", "device_b", "device_c"]

    for i, device in enumerate(devices):
        sim.engine.apply_local_change(
            device=device,
            entity="score",
            entity_id="game_1",
            changes={"points": i * 100},
            base_version=0,
        )

    result = sim.engine.sync_all(devices)
    assert len(result.conflicts) >= 1
```

### Property-Based Testing

Use property-based testing to verify convergence properties.

```typescript
// Property-based testing with fast-check
import fc from 'fast-check';

// CRDT convergence property: all replicas converge to same state
describe('CRDT Convergence', () => {
  it('all replicas converge regardless of merge order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat()),
        fc.array(fc.nat()),
        fc.array(fc.nat()),
        (ops1, ops2, ops3) => {
          // Three replicas with independent operations
          const replica1 = new GCounter();
          const replica2 = new GCounter();
          const replica3 = new GCounter();

          ops1.forEach(v => replica1.increment('r1', v));
          ops2.forEach(v => replica2.increment('r2', v));
          ops3.forEach(v => replica3.increment('r3', v));

          // Merge in different orders — all should converge
          const order1 = mergeAll([replica1, replica2, replica3]);
          const order2 = mergeAll([replica3, replica1, replica2]);
          const order3 = mergeAll([replica2, replica3, replica1]);

          expect(order1.value()).toBe(order2.value());
          expect(order2.value()).toBe(order3.value());
        }
      ),
      { verbose: true }
    );
  });

  it('LWW register is idempotent', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.integer(),
        fc.integer(),
        (val1, val2, ts1, ts2) => {
          const reg = new LWWRegister('device1');
          reg.set(val1, ts1);
          reg.set(val2, ts2);

          const copy = new LWWRegister('device2');
          copy.set(val2, ts2);
          copy.set(val1, ts1);

          // Merging should be order-independent
          const merged1 = reg.merge(copy);
          const merged2 = copy.merge(reg);

          expect(merged1.get()).toBe(merged2.get());
        }
      )
    );
  });
});
```

### Chaos Testing

Test conflict resolution under network failures, latency, and partial sync.

```kotlin
// Chaos testing for sync conflicts
class SyncChaosTest {
    private val engine = SyncEngine()
    private val devices = listOf("device_a", "device_b", "device_c")

    @Test
    fun `network partition with concurrent writes`() {
        // Simulate network partition
        engine.partitionNetwork(devices, partitionA = listOf("device_a", "device_b"), partitionB = listOf("device_c"))

        // Devices in partition A exchange writes
        engine.applyLocalChanges("device_a", generateBatch(50))
        engine.applyLocalChanges("device_b", generateBatch(50))
        engine.sync("device_a", "device_b")

        // Device C works independently in partition B
        engine.applyLocalChanges("device_c", generateBatch(100))

        // Heal partition and sync all
        engine.healNetwork()
        val result = engine.syncAll(devices)
        assertThat(result.totalConflicts).isLessThan(10)
    }

    @Test
    fun `cascading conflicts under load`() {
        // Simulate rapid-fire syncs with overlapping edits
        val jobs = (1..10).map { deviceIndex ->
            async {
                val device = "device_$deviceIndex"
                repeat(100) {
                    engine.applyLocalChanges(device, listOf(randomChange()))
                    Thread.sleep(Random.nextLong(1, 20))
                }
            }
        }
        runBlocking { jobs.awaitAll() }

        val result = engine.syncAll(devices)
        assertThat(result.totalConflicts).isLessThan(150)
        assertThat(result.unresolvedConflicts).isZero()
    }
}
```

---

## Monitoring and Observability

### Sync Conflict Metrics

Track conflict rates and resolution outcomes.

```yaml
conflict_monitoring_metrics:
  conflict_rate:
    description: "Conflicts per sync operation"
    alert_threshold: "> 5% of syncs have conflicts"
    measurement: "conflicts / total_syncs"

  resolution_success_rate:
    description: "Percentage of conflicts resolved automatically"
    alert_threshold: "< 80% auto-resolved"
    action: "Review auto-merge strategies"

  pending_conflicts:
    description: "Number of unresolved conflicts"
    alert_threshold: "> 100 pending"
    action: "Investigate systemic issue"

  resolution_latency:
    description: "Time between conflict detection and resolution"
    alert_threshold: "P95 > 24 hours"
    action: "Improve automated resolution"

  conflict_by_type:
    description: "Breakdown of conflict types (update/update, delete/create, etc.)"
    action: "Target conflict avoidance strategies at dominant type"

  conflict_by_entity:
    description: "Which data types generate the most conflicts"
    action: "Review data partitioning or merge strategy for high-conflict entities"
```

### Observability Integration

```typescript
// Observability integration for sync conflicts
class SyncTelemetry {
  private metrics: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  recordConflict(conflict: Conflict): void {
    // Increment conflict counter by type
    this.getCounter('sync.conflicts.total').inc(1);
    this.getCounter(`sync.conflicts.type.${conflict.type}`).inc(1);
    this.getCounter(`sync.conflicts.entity.${conflict.entityType}`).inc(1);

    // Track conflict size (number of conflicting fields)
    this.getHistogram('sync.conflicts.field_count').observe(conflict.fields.length);

    // Log structured conflict event
    console.log(JSON.stringify({
      event: 'sync_conflict',
      type: conflict.type,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      fieldCount: conflict.fields.length,
      timestamp: conflict.detectedAt,
      deviceId: conflict.deviceId,
    }));
  }

  recordResolution(resolution: Resolution): void {
    this.getCounter(`sync.resolution.strategy.${resolution.strategy}`).inc(1);
    this.getCounter(`sync.resolution.outcome.${resolution.outcome}`).inc(1);

    this.getHistogram('sync.resolution.duration_ms').observe(
      resolution.resolvedAt - resolution.detectedAt
    );

    if (resolution.outcome === 'failure') {
      this.getCounter('sync.resolution.failure_reason').inc(1);
    }
  }

  private getCounter(name: string): Counter {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, new Counter({ name, help: name }));
    }
    return this.metrics.get(name)!;
  }

  private getHistogram(name: string): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Histogram({ name, help: name }));
    }
    return this.histograms.get(name)!;
  }
}
```

---

## Best Practices

### Conflict Resolution Best Practices

1. **Design for conflict from day one** — adding sync later is exponentially harder
2. **Choose the right strategy per data type** — not all data needs the same resolution
3. **Minimize conflict surface** — use fine-grained operations, field-level sync
4. **Prefer automated resolution** — manual resolution is a poor user experience
5. **Provide clear conflict UIs** — users should understand what happened and why
6. **Track conflict metrics** — what gets measured gets improved
7. **Test with real-world scenarios** — network partitions, prolonged offline, multi-device
8. **Document resolution semantics** — every team member should understand how conflicts resolve
9. **Use idempotent operations** — replaying sync should produce the same result
10. **Version all the things** — schema, data, sync protocol

### Anti-Patterns

```yaml
anti_patterns:
  always_last_write_wins:
    problem: "Silently loses data — users lose work without notification"
    solution: "Surface concurrent modifications to users for important data"

  ignore_conflicts:
    problem: "Conflicts pile up and corrupt data over time"
    solution: "Implement a conflict queue with forced resolution deadlines"

  single_merge_strategy:
    problem: "One size does not fit all — counters need sum, text needs append"
    solution: "Register per-entity merge strategies"

  no_tombstones:
    problem: "Deleted items reappear (zombie records)"
    solution: "Use tombstone records or soft-delete with version tracking"

  clock_based_without_skew:
    problem: "Wall clocks drift, causing incorrect LWW decisions"
    solution: "Use hybrid logical clocks or vector clocks"

  infinite_retry:
    problem: "Conflict resolution loops without convergence"
    solution: "Limit retries, escalate to manual resolution"

  monolith_sync:
    problem: "Syncing entire documents causes more conflicts than needed"
    solution: "Sync at field level with per-field version vectors"
```

### Convergence Guarantees

```typescript
// Ensure conflict resolution converges
interface ConvergentResolver<T> {
  // Merge must be:
  // • Commutative: merge(a, b) === merge(b, a)
  // • Associative: merge(a, merge(b, c)) === merge(merge(a, b), c)
  // • Idempotent: merge(a, a) === a
  merge(a: T, b: T): T;

  // Verify convergence properties in tests
  verifyConvergence(): void {
    const testCases = [
      { a: 'x', b: 'x', expected: 'x' },  // idempotent
      { a: merge('x', 'y'), b: merge('y', 'x'), expected: true },  // commutative
      {
        a: merge('x', merge('y', 'z')),
        b: merge(merge('x', 'y'), 'z'),
        expected: true,
      },  // associative
    ];
    // Assert all test cases pass
  }
}
```

---

## Platform-Specific Implementation Notes

### iOS (Core Data + CloudKit)

Core Data with NSPersistentCloudKitContainer provides automatic conflict resolution using last-write-wins with server authority by default. Custom resolution requires implementing NSPersistentContainer's conflict policy.

```swift
// Core Data merge policies
let container = NSPersistentCloudKitContainer(name: "MyApp")
container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
// Options:
// NSMergeByPropertyStoreTrumpMergePolicy — server/store wins per field
// NSMergeByPropertyObjectTrumpMergePolicy — client/object wins per field
// NSOverwriteMergePolicy — client always wins
// NSRollbackMergePolicy — server/store always wins
// NSErrorMergePolicy — report conflicts as errors
```

### Android (Room + Firebase)

Room integrates with Firebase Firestore for sync, using Firestore's built-in conflict resolution.

```kotlin
// Room + Firestore conflict handling
class FirestoreSyncDao {
    @Transaction
    suspend fun syncWithConflictResolution(localEntity: OrderEntity, remoteEntity: OrderEntity) {
        // Detect conflicts at field level
        val conflicts = detectConflicts(localEntity, remoteEntity)

        if (conflicts.isEmpty()) {
            // No conflicts — apply remote
            upsert(remoteEntity)
            return
        }

        // For each conflicting field, apply business rules
        val resolved = localEntity.copy(
            status = resolveStatusConflict(localEntity.status, remoteEntity.status),
            items = resolveItemsConflict(localEntity.items, remoteEntity.items),
            updatedAt = System.currentTimeMillis()
        )

        upsert(resolved)
    }

    private fun resolveStatusConflict(local: String, remote: String): String {
        val hierarchy = listOf("pending", "confirmed", "preparing", "shipped", "delivered", "cancelled")
        return maxOf(
            hierarchy.indexOf(local),
            hierarchy.indexOf(remote)
        ).let { hierarchy[it] }
    }
}
```

### React Native (WatermelonDB + Custom Sync)

WatermelonDB provides the sync primitives; conflict resolution is implemented in the sync adapter.

```javascript
// WatermelonDB sync with custom conflict resolution
import { synchronize } from '@nozbe/watermelondb/sync';

const syncAdapter = {
  pullChanges: async ({ lastPulledAt }) => {
    const response = await api.pull({ lastPulledAt });

    // Resolve conflicts on the pull side
    const resolvedChanges = response.changes.map(table => ({
      [table]: response.changes[table].map(record => {
        // Apply server-side merge logic
        if (record._conflict) {
          return resolveServerConflict(record);
        }
        return record;
      }),
    }));

    return {
      changes: resolvedChanges,
      timestamp: response.timestamp,
    };
  },

  pushChanges: async ({ changes, lastPulledAt }) => {
    try {
      await api.push({ changes, lastPulledAt });
    } catch (error) {
      if (error.conflicts) {
        // Resolve rejected changes
        const resolution = await resolvePushConflicts(error.conflicts);
        await api.pushResolved(resolution);
      }
    }
  },
};
```

### Flutter (Drift + Custom Sync)

Drift (SQLite ORM) combined with a custom sync layer for full control.

```dart
// Flutter drift-based sync engine with conflict resolution
class DriftSyncEngine {
  final AppDatabase database;
  final SyncApi api;

  Future<SyncResult> sync() async {
    // 1. Push local changes
    final localChanges = await _getLocalChanges();
    final pushResult = await api.pushChanges(localChanges);

    // 2. Handle push conflicts
    if (pushResult.hasConflicts) {
      await _handlePushConflicts(pushResult.conflicts);
    }

    // 3. Pull remote changes
    final lastSyncTimestamp = await _getLastSyncTimestamp();
    final pullResult = await api.pullChanges(lastSyncTimestamp);

    // 4. Handle pull conflicts
    for (final table in pullResult.changes.keys) {
      for (final change in pullResult.changes[table]!) {
        await _applyRemoteChange(table, change);
      }
    }

    // 5. Update sync metadata
    await _updateLastSyncTimestamp(pullResult.timestamp);
    return SyncResult(
      pushed: pushResult.count,
      pulled: pullResult.count,
      conflicts: pushResult.hasConflicts ? pushResult.conflicts.length : 0,
    );
  }

  Future<void> _handlePushConflicts(List<Conflict> conflicts) async {
    for (final conflict in conflicts) {
      final resolved = await database.transaction(() async {
        final current = await _getCurrentState(conflict);
        return _autoResolve(current, conflict.remoteState);
      });
      await api.resolveConflict(conflict.id, resolved);
    }
  }
}
```

---

## File Structure Example

```
project/
├── sync/
│   ├── engine/
│   │   ├── sync_engine.dart          # Main sync orchestrator
│   │   ├── change_tracker.dart       # Track local changes
│   │   └── change_applier.dart       # Apply remote changes
│   ├── conflict/
│   │   ├── conflict_detector.dart    # Detection strategies
│   │   ├── conflict_resolver.dart    # Resolution strategies
│   │   ├── merge_strategies.dart     # Merge function implementations
│   │   └── conflict_queue.dart       # Persistent conflict storage
│   ├── crdt/
│   │   ├── lww_register.dart         # Last-write-wins register
│   │   ├── mv_register.dart           # Multi-value register
│   │   ├── g_counter.dart            # Grow-only counter
│   │   ├── g_set.dart                # Grow-only set
│   │   ├── two_p_set.dart            # Two-phase set
│   │   └── rga_list.dart             # Replicated growable array
│   ├── vector_clock.dart             # Vector clock implementation
│   ├── merkle_tree.dart              # Merkle tree for hash-based detection
│   └── sync_telemetry.dart           # Monitoring integration
├── ui/
│   ├── conflict_resolution_screen.dart  # Conflict review UI
│   ├── three_panel_merge.dart           # Three-way merge editor
│   └── conflict_badge.dart              # Conflict indicator widget
└── test/
    ├── conflict_simulator.dart       # Controlled conflict generation
    ├── convergence_test.dart         # CRDT convergence property tests
    └── chaos_test.dart               # Network partition / load tests
```
