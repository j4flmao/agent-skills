---
name: mobile-storage
description: Cross-platform mobile local storage — SQLite, Room, Core Data, Hive, Isar, SharedPreferences, file system, document directory, migration strategies.
---

# Mobile Storage

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

### Max Response Length
4096 tokens

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
