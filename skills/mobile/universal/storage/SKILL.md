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
No preamble. No postamble. No explanations.

### Max Response Length
4096 tokens

## Decision Trees

### Storage Type Selection
```
What kind of data?
├── Simple key-value (settings, preferences, feature flags)
│   ├── Secure (tokens, auth) → Keychain / EncryptedSharedPrefs / flutter_secure_storage
│   └── Non-sensitive → UserDefaults / SharedPreferences / AsyncStorage
├── Complex queryable (user records, products, orders)
│   ├── Relational with JOINs/aggregations → SQLite (Room, CoreData, sqflite, WatermelonDB)
│   └── Document/NoSQL (nested, simple queries) → Isar, Hive, Realm
├── Large files (images, video, documents)
│   ├── Cache → Temporary directory, LRU eviction
│   └── Permanent → Application documents directory
└── Real-time sync across devices → CloudKit, Firebase, custom API + local cache
```

### Migration Strategy
```
Is schema likely to change?
├── Yes, planned evolution (most apps)
│   ├── Version schema from v1
│   ├── Write incremental migrations (1→2, 2→3, never skip)
│   ├── Test migration from every previous version
│   └── Have rollback plan (destructive vs non-destructive)
├── Schema rarely changes (utilities, tools)
│   └── Single version, handle via JSON blobs for flexibility
└── Frequent changes (rapid prototyping)
    └── Consider destructive migration (delete and recreate) for non-production
```

### Sync Strategy
```
Does data sync across devices?
├── No sync needed → Local-first, local DB is source of truth
├── Online-first (network authoritative, local is cache)
│   └── Cache API responses, stale-while-revalidate
└── Offline-first (local authoritative, background sync)
    └── Local-first writes, sync queue, conflict resolution
```

## Workflow

### Step 1: Select Storage Type

### Step 2: Design Schema
Define entities/tables with proper column types, indexes for query paths, and relationships.

### Step 3: Implement CRUD Operations
Set up DAOs/repositories with insert, read, update, delete operations and query methods.

### Step 4: Plan Migrations
Version the schema from day one, write migration scripts for each version change, and test rollback paths.

## Storage Selection

| Need | iOS | Android | Flutter | RN |
|---|---|---|---|---|
| Simple K/V | UserDefaults | SharedPreferences | SharedPreferences | AsyncStorage |
| Secure K/V | Keychain | EncryptedSharedPrefs | flutter_secure_storage | react-native-keychain |
| Relational | Core Data | Room | sqflite / drift | WatermelonDB |
| Document | Realm | Realm | Isar / Hive | Realm |
| File | FileManager | Internal Storage | path_provider | react-native-fs |

## Implementation — Relational Databases

### Android — Room
```kotlin
// Entity
@Entity(
  tableName = "orders",
  indices = [Index("customer_id"), Index("status", "created_at")]
)
data class OrderEntity(
  @PrimaryKey val id: String,
  @ColumnInfo(name = "customer_id") val customerId: String,
  val status: String,
  val total: Double,
  @ColumnInfo(name = "created_at") val createdAt: Long
)

// DAO
@Dao
interface OrderDao {
  @Query("SELECT * FROM orders WHERE customer_id = :customerId ORDER BY created_at DESC")
  fun getOrders(customerId: String): Flow<List<OrderEntity>>

  @Query("SELECT COUNT(*) FROM orders WHERE status = :status")
  fun countByStatus(status: String): Flow<Int>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsertAll(orders: List<OrderEntity>)

  @Query("DELETE FROM orders WHERE id = :id")
  suspend fun deleteById(id: String)

  @Transaction
  @Query("SELECT * FROM orders o INNER JOIN customers c ON o.customer_id = c.id WHERE o.status = :status")
  fun getOrdersWithCustomer(status: String): Flow<List<OrderWithCustomer>>
}

// Database
@Database(entities = [OrderEntity::class, CustomerEntity::class], version = 2)
abstract class AppDatabase : RoomDatabase() {
  abstract fun orderDao(): OrderDao
  abstract fun customerDao(): CustomerDao

  companion object {
    @Volatile private var INSTANCE: AppDatabase? = null

    fun getInstance(context: Context): AppDatabase {
      return INSTANCE ?: synchronized(this) {
        Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
          .addMigrations(MIGRATION_1_2)
          .build()
          .also { INSTANCE = it }
      }
    }

    val MIGRATION_1_2 = object : Migration(1, 2) {
      override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE orders ADD COLUMN notes TEXT DEFAULT ''")
        db.execSQL("CREATE INDEX idx_orders_notes ON orders(notes)")
      }
    }

    val MIGRATION_2_3 = object : Migration(2, 3) {
      override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT NOT NULL)")
        db.execSQL("CREATE INDEX idx_orders_customer ON orders(customer_id)")
      }
    }
  }
}
```

### iOS — Core Data
```swift
import CoreData

class CoreDataStack {
  static let shared = CoreDataStack()
  let container: NSPersistentContainer

  private init() {
    container = NSPersistentContainer(name: "AppModel")
    container.loadPersistentStores { _, error in
      if let error = error { fatalError("Core Data failed: \(error)") }
    }
    container.viewContext.automaticallyMergesChangesFromParent = true
  }

  var context: NSManagedObjectContext { container.viewContext }

  func save() {
    if context.hasChanges {
      try? context.save()
    }
  }

  // Migration
  // Configure in AppModel.xcdatamodeld:
  // - Add model version (Editor > Add Model Version)
  // - Set current version in File Inspector
  // - Core Data handles lightweight migration automatically for:
  //   - Adding/removing optional attributes
  //   - Renaming with renamingID
  //   - Adding/removing relationships
  // For heavy migration: NSMigrationManager with custom mapping model
}

// Fetch request with predicate and sort
extension OrderEntity {
  static func fetchByStatus(_ status: String, in context: NSManagedObjectContext) -> [OrderEntity] {
    let request = OrderEntity.fetchRequest()
    request.predicate = NSPredicate(format: "status == %@", status)
    request.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: false)]
    return (try? context.fetch(request)) ?? []
  }

  // NSFetchedResultsController for reactive updates
  static func fetchedResultsController(status: String) -> NSFetchedResultsController<OrderEntity> {
    let request = OrderEntity.fetchRequest()
    request.predicate = NSPredicate(format: "status == %@", status)
    request.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: false)]

    return NSFetchedResultsController(
      fetchRequest: request,
      managedObjectContext: CoreDataStack.shared.context,
      sectionNameKeyPath: nil,
      cacheName: nil
    )
  }
}
```

### Flutter — Drift (SQLite)
```dart
import 'package:drift/drift.dart';
import 'package:drift/native.dart';

// Table definition
class Orders extends Table {
  TextColumn get id => text()();
  TextColumn get customerId => text()();
  TextColumn get status => text()();
  RealColumn get total => real()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [{customerId, status}];  // Composite index
}

// Database
@DriftDatabase(tables: [Orders, Customers])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (m) async {
        await m.createAll();
      },
      onUpgrade: (m, from, to) async {
        if (from == 1) {
          await m.addColumn(orders, orders.notes);
        }
      },
    );
  }

  // Reactive queries — return Stream
  Stream<List<Order>> watchOrders(String customerId) {
    return (select(orders)
        ..where((o) => o.customerId.equals(customerId))
        ..orderBy([(o) => OrderingTerm(expression: o.createdAt, mode: OrderingMode.desc)])
    ).watch();
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final file = File(await getDatabasesPath() + '/app.db');
    return NativeDatabase(file);
  });
}
```

### React Native — WatermelonDB
```typescript
// Schema
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'customer_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'total', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'customers',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', isIndexed: true },
      ],
    }),
  ],
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({ table: 'orders', columns: [{ name: 'notes', type: 'string' }] }),
      ],
    },
  ],
});

// Model
import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export class Order extends Model {
  static table = 'orders';
  static associations = { customers: { type: 'belongs_to', key: 'customer_id' } };

  @field('customer_id') customerId: string;
  @field('status') status: string;
  @field('total') total: number;
  @date('created_at') createdAt: Date;
  @relation('customers', 'customer_id') customer;
}

// Repository
class OrderRepository {
  async getByStatus(status: string): Promise<Order[]> {
    return database.get<Order>('orders')
      .query(Q.where('status', status), Q.sortBy('created_at', 'desc'))
      .fetch();
  }

  async create(order: Partial<Order>): Promise<Order> {
    return database.write(async () => {
      return database.get<Order>('orders').create(order);
    });
  }

  observeByCustomer(customerId: string) {
    return database.get<Order>('orders')
      .query(Q.where('customer_id', customerId), Q.sortBy('created_at', 'desc'))
      .observe();  // Reactive
  }
}
```

## Implementation — Document/NoSQL

### Flutter — Isar
```dart
import 'package:isar/isar.dart';

// Collection
@collection
class Order {
  Id id = Isar.autoIncrement;  // Auto-increment
  late String remoteId;
  late String customerName;
  late double total;
  late DateTime createdAt;
  String? notes;
  late List<String> tags;    // List supported natively
  late Address? address;     // Embedded object

  @Index()
  late String status;        // Indexed
}

@embedded
class Address {
  late String street;
  late String city;
  late String zip;
}

// Usage
class OrderRepository {
  final Isar db;

  Stream<List<Order>> watchByStatus(String status) {
    return db.orders
      .where()
      .statusEqualTo(status)
      .watch(fireImmediately: true);
  }

  Future<void> saveOrder(Order order) async {
    await db.writeTxn(() => db.orders.put(order));
  }

  Future<List<Order>> search(String query) async {
    return db.orders
      .where()
      .customerNameContains(query, caseSensitive: false)
      .findAll();
  }
}
```

### Flutter — Hive
```dart
import 'package:hive_flutter/hive_flutter.dart';

@HiveType(typeId: 0)
class Order extends HiveObject {
  @HiveField(0)
  late String id;

  @HiveField(1)
  late String customerName;

  @HiveField(2)
  late double total;

  @HiveField(3)
  late String status;
}

// Usage
class OrderBox {
  static const boxName = 'orders';

  static Future<void> open() async {
    await Hive.openBox<Order>(boxName);
  }

  static Box<Order> get box => Hive.box<Order>(boxName);

  static void save(Order order) => box.put(order.id, order);
  static Order? get(String id) => box.get(id);
  static List<Order> getAll() => box.values.toList();
  static Stream<BoxEvent> watch() => box.watch();  // Reactive
}
```

## Key-Value Storage

### Secure Storage
```dart
// Flutter — flutter_secure_storage
final storage = FlutterSecureStorage();
await storage.write(key: 'auth_token', value: token);
final token = await storage.read(key: 'auth_token');
```

```typescript
// RN — react-native-keychain
await Keychain.setGenericPassword('token', token, { service: 'auth' });
const credentials = await Keychain.getGenericPassword({ service: 'auth' });
```

### Preferences
```kotlin
// Android — SharedPreferences (non-sensitive only)
val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
prefs.edit().putString("theme", "dark").apply()
val theme = prefs.getString("theme", "light")
```

```swift
// iOS — UserDefaults
UserDefaults.standard.set("dark", forKey: "theme")
let theme = UserDefaults.standard.string(forKey: "theme")
```

```typescript
// RN — AsyncStorage
await AsyncStorage.setItem('theme', 'dark');
const theme = await AsyncStorage.getItem('theme');
```

## File Storage

### Flutter — path_provider
```dart
import 'package:path_provider/path_provider.dart';

Future<String> get cacheDir async {
  final dir = await getTemporaryDirectory();
  return dir.path;
}

Future<String> get documentsDir async {
  final dir = await getApplicationDocumentsDirectory();
  return dir.path;
}

Future<void> cacheImage(String url, Uint8List bytes) async {
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/${url.hashCode}.jpg');
  await file.writeAsBytes(bytes);
}
```

### iOS — FileManager
```swift
let fileManager = FileManager.default
let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
let cacheURL = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
let tempURL = fileManager.temporaryDirectory

// Exclude documents from backup
var resourceValues = URLResourceValues()
resourceValues.isExcludedFromBackup = true
try documentsURL.setResourceValues(resourceValues)

// Write
let data = try JSONEncoder().encode(orders)
try data.write(to: documentsURL.appendingPathComponent("orders.json"))
```

### Android — Context Files
```kotlin
// Internal storage (private to app)
val file = File(context.filesDir, "orders.json")
file.writeText(json)

// Cache
val cacheFile = File(context.cacheDir, "image_cache")
cacheFile.writeBytes(bytes)

// External storage (requires permission)
val externalDir = context.getExternalFilesDir(null)
```

## Migration Patterns

### Destructive Migration
```kotlin
// Room — fallback when migration not possible
Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
  .fallbackToDestructiveMigration()
  .build()
// Caution: destroys all existing data
```

### Migration Testing
```kotlin
// Android — MigrationTestHelper
@Test
fun migrateFrom1To2_keepsData() {
  helper.createDatabase(TEST_DB_NAME, 1).apply {
    execSQL("INSERT INTO orders (id, customer_id, status, total) VALUES ('1', 'c1', 'pending', 50.0)")
  }
  val db = helper.runMigrationsAndValidate(
    TEST_DB_NAME, 2, true, MIGRATION_1_2
  )
  val cursor = db.query("SELECT * FROM orders WHERE id = '1'")
  assertThat(cursor.count).isEqualTo(1)  // Data preserved
  assertThat(cursor.getColumnIndex("notes")).isNotEqualTo(-1)  // New column exists
}
```

### Non-Destructive Schema Changes
```sql
-- Safe changes (no data loss)
ALTER TABLE orders ADD COLUMN notes TEXT DEFAULT '';
CREATE INDEX idx_orders_status ON orders(status);

-- Destructive changes require migration logic
-- Bad: ALTER TABLE orders DROP COLUMN old_field;
-- Good: Create new table, copy data with transformation, drop old table
```

## Reactive Queries

### Room Flow
```kotlin
// Room returns Flow — automatically re-emits on table changes
@Dao
interface OrderDao {
  @Query("SELECT * FROM orders WHERE customer_id = :id ORDER BY created_at DESC")
  fun observeByCustomer(id: String): Flow<List<OrderEntity>>

  @Query("SELECT SUM(total) FROM orders WHERE status = :status")
  fun observeTotalByStatus(status: String): Flow<Double>
}
```

### Core Data NSFetchedResultsController
```swift
// Automatic UI updates via NSFetchedResultsControllerDelegate
class OrdersViewController: UIViewController, NSFetchedResultsControllerDelegate {
  private lazy var frc = OrderEntity.fetchedResultsController(status: "pending")

  override func viewDidLoad() {
    frc.delegate = self
    try? frc.performFetch()
  }

  func controllerWillChangeContent(_ controller: NSFetchedResultsController<NSFetchRequestResult>) {
    tableView.beginUpdates()
  }
  func controllerDidChangeContent(_ controller: NSFetchedResultsController<NSFetchRequestResult>) {
    tableView.endUpdates()
  }
}
```

### Drift Stream
```dart
// Drift queries return Stream — watch for real-time updates
final stream = db.watchOrders(customerId);
stream.listen((orders) {
  setState(() => this.orders = orders);
});
```

## Batch Operations
```kotlin
// Room — batch insert in transaction
@Transaction
suspend fun insertBatch(orders: List<OrderEntity>) {
  orderDao.upsertAll(orders)  // Single transaction internally
}

// Manual transaction
@Transaction
suspend fun complexBatch() {
  orderDao.deleteByStatus("cancelled")
  orderDao.upsertAll(newOrders)
  customerDao.updateStats(totalOrders)
}
```

## Anti-Patterns
- **Storing tokens in UserDefaults/SharedPreferences**: Plaintext on disk. Always use Keychain/EncryptedSharedPrefs
- **No migration from v1**: Impossible to update schema without data loss. Version from day one
- **SELECT * without LIMIT**: Loads entire table into memory. Always paginate
- **Storing files in database**: BLOBs in SQLite kill performance. Store file path, keep file on disk
- **Synchronous DB access on main thread**: ANR/frozen UI. Always async with coroutines/async-await
- **No indexes on query columns**: Full table scans on every query. Index WHERE, JOIN, and ORDER BY columns
- **One storage solution for everything**: Settings (K/V) + business data (SQLite) + files (FileManager) need different strategies
- **Not closing database connections**: Leaks file handles. Use dependency injection with scoped lifecycle
- **No reactive queries**: Manually re-fetching data creates stale UI. Use Flow/Combine/Stream/watch for automatic updates
- **Over-indexing**: Every index slows writes 5-15%. Index only what you query on
- **Mutable state outside DB**: In-memory list diverges from persisted state. DB is source of truth
- **Not handling concurrent access**: Multiple threads writing simultaneously causes corruption. Use transactions
- **Ignore foreign keys**: SQLite doesn't enforce by default. Execute `PRAGMA foreign_keys = ON` after connection

## Performance Considerations
- Batch writes into transactions: 100 single inserts = 100x slower than 1 batch of 100
- Index columns used in WHERE, JOIN, ORDER BY, GROUP BY
- Composite indexes for multi-column queries — column order matters (most selective first)
- Project only needed columns — never `SELECT *`
- Use prepared statements — reuse query plan, prevent SQL injection
- In-memory cache (LRU) for frequently read, rarely changed data
- Cache TTL: 5min for user data, 1h for reference data, never for critical state
- L2 cache: serialize to disk for app restart recovery
- WatermelonDB/Isar lazy-load only visible records — ideal for large datasets
- SQLite WAL mode for concurrent read/write performance
- `PRAGMA mmap_size` for large databases on modern devices
- Monitor DB size growth — set up alerts for unexpected growth

## References
- `references/cloud-storage.md` — Cloud Storage Integration
- `references/file-system.md` — Mobile File System
- `references/local-storage.md` — Local Data Storage
- `references/mobile-storage-patterns.md` — Mobile Storage Patterns
- `references/preferences.md` — Mobile Preferences
- `references/sqlite.md` — Mobile SQLite

## Handoff
After storage setup, hand off to:
- `mobile/universal/offline-first` — Sync engine, conflict resolution
- `mobile/universal/security` — Database encryption, secure file storage
- `mobile/universal/performance` — Query optimization, cache strategy
- `mobile/universal/testing` — Migration testing, data integrity tests
- `mobile/universal/networking` — API response caching layer
- `mobile/android` — Room specifics, SharedPreferences
- `mobile/ios` — CoreData, Keychain
- `mobile/flutter` — Drift, Isar, Hive
- `mobile/react-native` — WatermelonDB, AsyncStorage
