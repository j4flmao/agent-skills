---
name: mobile-storage
description: >
  Use this skill when the user asks about mobile local storage, SQLite, Room,
  Core Data, Hive, Isar, SharedPreferences, UserDefaults, file storage, or
  database migration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, storage, phase-4, universal]
---

# Mobile Storage

## Purpose
Design mobile local storage architectures selecting the right persistence strategy — SQLite, Room, Core Data, Hive, Isar, key-value, or file storage — with migration planning.

## Agent Protocol

### Trigger
User request includes: `mobile storage`, `local database`, `sqlite mobile`, `room database`, `core data`, `hive`, `isar`, `sharedpreferences`, `userdefaults`, `file storage mobile`, `migration mobile`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Data complexity (simple K/V vs relational vs document)
- Storage library (Room, Core Data, Hive, Isar, WatermelonDB)
- Migration requirements

### Output Artifact
A markdown document containing:
- Storage layer architecture
- Schema design
- CRUD operations
- Migration plan

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

——

### Max Response Length
4096 tokens

## Workflow

### Step 1: Select Storage Type
Choose relational (Room, Core Data) for complex queries, key-value for simple settings, document (Isar, Hive) for JSON-like data.

### Step 2: Design Schema
Define entities/tables with proper column types, indexes for query paths, and relationships.

### Step 3: Implement CRUD Operations
Set up DAOs/repositories with insert, read, update, delete operations and query methods.

### Step 4: Plan Migrations
Version the schema from day one, write migration scripts for each version change, and test rollback paths.

## Storage Decision Tree

```yaml
storage_decision_tree:
  question_1_data_type:
    "Simple key-value pairs (settings, preferences, feature flags)":
      "Secure (tokens, auth data)?":
        yes: "Platform secure storage — Keychain, EncryptedSharedPrefs, flutter_secure_storage"
        no: "Platform preferences — UserDefaults, SharedPreferences, AsyncStorage"
      
    "Complex queryable data (user records, product catalog, orders)":
      "Relational with complex queries (JOINs, aggregations)?":
        yes: "SQLite via Room (Android), Core Data (iOS), sqflite/drift (Flutter), WatermelonDB (RN)"
        no: "Document/NoSQL — Realm, Isar, Hive (simple queries, nested data)"
      
    "Large files (images, documents, video)":
      "Cache or permanent?":
        cache: "Temporary directory with LRU eviction"
        permanent: "Application documents directory, platform file storage"
        large_media: "Consider cloud storage with local cache"
      
  question_2_sync_requirement:
    "Does the data need to sync across devices?":
      yes: "Cloud-first with local cache — CloudKit, Firebase, custom API + local DB"
      no: "Local-first — storage is authoritative, cloud is optional backup"
      
  question_3_offline_support:
    "Does the app need full offline capability?":
      yes: "Local DB as source of truth, background sync engine, conflict resolution"
      no: "Cache API responses, show cached data when offline, stale-while-revalidate"
```

## Synchronization Strategies

```yaml
sync_strategies:
  online_first:
    description: "Network is source of truth, local is cache"
    flow: "Read from cache → display immediately → fetch from API → update UI"
    conflict: "Server wins (cache is always overwritten)"
    best_for: "Social feeds, content browsing, reference data"
    
  offline_first:
    description: "Local DB is source of truth, background sync"
    flow: "Write to local DB → queue for sync → sync when online → resolve conflicts"
    conflict: "Last-write-wins or custom merge logic"
    best_for: "Note-taking, task management, field data collection"
    
  crdt_based:
    description: "Conflict-free Replicated Data Types — automatic merge"
    flow: "Local writes applied immediately → sync via CRDT merge → no manual conflict resolution"
    trade_off: "Higher complexity, limited query capabilities"
    best_for: "Collaborative editing, real-time multiplayer, distributed counters"
```

## Storage Performance Patterns

```yaml
storage_performance:
  indexing:
    - "Index all columns in WHERE, JOIN, ORDER BY, and GROUP BY clauses"
    - "Composite indexes for multi-column queries — column order matters (most selective first)"
    - "Avoid over-indexing — each index slows writes by 5-15%"
    
  query_optimization:
    - "Use LIMIT + OFFSET for pagination — never SELECT * without bounds"
    - "Project only needed columns — never SELECT *"
    - "Batch inserts with transactions — 100 writes in 1 transaction vs 100 individual"
    - "Use prepared statements — reuse query plan, prevent SQL injection"
    
  cache_strategy:
    - "In-memory cache (LRU) for frequently read, rarely changed data"
    - "Cache TTL: 5min for user data, 1h for reference data, never for critical state"
    - "Cache invalidation: write-through (update cache on write) for consistency"
    - "L2 cache: serialize to disk for app restart recovery"
```

## Rules

- Version the database schema from the first release — migration from v1 is mandatory
- Key-value storage for user preferences only — never for business data
- Secure storage (Keychain, EncryptedSharedPrefs) for tokens, never SharedPreferences
- Index columns used in WHERE and JOIN clauses for query performance
- File storage for large blobs (images, documents) — not in the database
- Migration tests must verify data integrity before and after migration
- AsyncStorage (RN) and SharedPreferences (Flutter) are synchronous — avoid for large datasets
- Choose storage layer based on data query patterns, not platform familiarity
- Define sync strategy before implementing offline support — different patterns have different guarantees

## Storage Selection

| Need | iOS | Android | Flutter | RN |
|------|-----|---------|---------|-----|
| Simple K/V | UserDefaults | SharedPreferences | SharedPreferences | AsyncStorage |
| Secure K/V | Keychain | EncryptedSharedPrefs | flutter_secure_storage | react-native-keychain |
| Relational | Core Data | Room | sqflite / drift | WatermelonDB |
| Document | Realm | Realm | Isar / Hive | Realm |
| File | FileManager | Internal Storage | path_provider | react-native-fs |

## SQLite (Drift/Floor)

```dart
// Flutter: Drift
@DriftDatabase(tables: [Orders])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
}

class Orders extends Table {
  TextColumn get id => text()();
  TextColumn get customerName => text()();
  RealColumn get total => real()();
  @override Set<Column> get primaryKey => {id};
}

@UseRowClass(Order)
class Orders extends Table {
  // ...
}
```

```kotlin
// Android: Room
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "customer_name") val customerName: String,
    val total: Double
)
```

```swift
// iOS: Core Data
// Order+CoreDataProperties.swift
@objc(Order)
class Order: NSManagedObject {
    @NSManaged var id: String
    @NSManaged var customerName: String
    @NSManaged var total: Double
}
```

## Key-Value Storage

```typescript
// AsyncStorage
await AsyncStorage.setItem('theme', 'dark');
const theme = await AsyncStorage.getItem('theme');
```

```dart
// SharedPreferences
await prefs.setString('token', token);
final token = prefs.getString('token');
```

## File Storage

```dart
final dir = await getApplicationDocumentsDirectory();
final file = File('${dir.path}/orders.json');
await file.writeAsString(jsonEncode(orders));
```

## Migration

```kotlin
// Room migration
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'")
    }
}
```

## References
  - references/cloud-storage.md — Cloud Storage Integration
  - references/file-system.md — Mobile File System
  - references/local-storage.md — Local Data Storage
  - references/mobile-storage-patterns.md — Mobile Storage Patterns
  - references/preferences.md — Mobile Preferences
  - references/sqlite.md — Mobile SQLite
## Handoff

Hand off to stack-specific skill for implementation.
