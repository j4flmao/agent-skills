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

## Rules

- Version the database schema from the first release — migration from v1 is mandatory
- Key-value storage for user preferences only — never for business data
- Secure storage (Keychain, EncryptedSharedPrefs) for tokens, never SharedPreferences
- Index columns used in WHERE and JOIN clauses for query performance
- File storage for large blobs (images, documents) — not in the database
- Migration tests must verify data integrity before and after migration
- AsyncStorage (RN) and SharedPreferences (Flutter) are synchronous — avoid for large datasets

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

### Reference Files
- `references/sqlite.md` — migrations, indexes, queries, performance
- `references/preferences.md` — K/V storage patterns, type adapters
- `references/file-system.md` — directories, file encryption, cache management

### Related Skills
- `mobile/universal/networking/SKILL.md` — caching layer integration
- `mobile/universal/performance/SKILL.md` — storage performance optimization

## Handoff

Hand off to stack-specific skill for implementation.
