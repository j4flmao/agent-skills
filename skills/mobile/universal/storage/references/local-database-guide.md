# Local Database Guide

## Overview

Local databases are the foundation of mobile application data persistence. Choosing the right database, designing the schema correctly, optimizing performance, and planning for migrations are critical skills for mobile developers. This reference covers the full spectrum of local database considerations for mobile platforms.

---

## SQLite Fundamentals

### Architecture

SQLite is a self-contained, serverless, zero-configuration, transactional SQL database engine. It implements most of the SQL standard and runs in-process with the application.

```sql
-- Core architecture: Virtual Database Engine (VDBE)
-- SQL statement → tokenizer → parser → code generator → VDBE → B-tree → pager → OS interface
--                    ↓                                                         ↓
--              B-tree (index & table storage)                          VFS (file I/O)

-- Key architectural features:
-- • Single file database (usually .db or .sqlite)
-- • Page-based storage (default 4096 bytes per page)
-- • MVCC for read transactions (readers don't block writers in WAL mode)
-- • Schema stored in sqlite_master table
SELECT * FROM sqlite_master WHERE type = 'table';

-- Check SQLite version
SELECT sqlite_version();
```

### WAL Mode

Write-Ahead Logging (WAL) mode dramatically improves concurrent read/write performance by allowing readers to read from the old database file while writers append to a separate WAL file.

```sql
-- Enable WAL mode
PRAGMA journal_mode = WAL;

-- WAL mode characteristics:
-- • Readers never block writers, writers never block readers
-- • Significantly faster writes (sequential append vs random page writes)
-- • Better concurrency under load (multiple readers + one writer)
-- • Disadvantages: slightly larger file (WAL file), needs checkpointing

-- Check current journal mode
PRAGMA journal_mode;

-- Manual checkpoint (flush WAL to main database)
PRAGMA wal_checkpoint(TRUNCATE);

-- Set WAL checkpoint threshold (default 1000 pages)
PRAGMA wal_autocheckpoint = 500;

-- WAL file size monitoring
-- The WAL file grows until a checkpoint occurs
-- For mobile: schedule checkpoints during idle periods
```

```kotlin
// Android: Enable WAL mode with Room
Room.databaseBuilder(context, AppDatabase::class.java, "myapp.db")
    .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING)
    .build()

// Or via raw SQL
database.execSQL("PRAGMA journal_mode = WAL")
database.execSQL("PRAGMA wal_autocheckpoint = 500")
```

```swift
// iOS: Enable WAL mode
var db: OpaquePointer?
sqlite3_open_v2(path, &db, SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE, nil)
sqlite3_exec(db, "PRAGMA journal_mode = WAL", nil, nil, nil)
sqlite3_exec(db, "PRAGMA wal_autocheckpoint = 500", nil, nil, nil)
```

### Journal Modes Comparison

| Mode | Description | Read Perf | Write Perf | Data Safety | File Size |
|------|-------------|-----------|------------|-------------|-----------|
| DELETE | Rollback journal deleted after commit (default) | Good | Moderate | High | 2x during tx |
| TRUNCATE | Journal truncated after commit | Good | Moderate | High | Minimal |
| PERSIST | Journal kept after commit | Good | Moderate | High | 1 extra file |
| MEMORY | Journal stored in memory | Best | Best | Low (crash = data loss) | Minimal |
| WAL | Write-ahead log | Best | Best | Very high | +WAL file |
| OFF | No journal | Best | Best | None | Minimal |

### Performance Pragmas

```sql
-- Recommended performance configuration for mobile
PRAGMA journal_mode = WAL;              -- Best concurrent read/write
PRAGMA synchronous = NORMAL;            -- Balance safety and speed (FULL for critical data)
PRAGMA cache_size = -8000;              -- 8MB page cache (negative = KB)
PRAGMA busy_timeout = 5000;             -- Wait 5s before throwing busy error
PRAGMA foreign_keys = ON;               -- Enforce FK constraints
PRAGMA temp_store = MEMORY;             -- Store temp tables in memory
PRAGMA mmap_size = 268435456;           -- 256MB memory-mapped I/O
PRAGMA page_size = 4096;                -- Default, good for HDD/SSD
PRAGMA auto_vacuum = INCREMENTAL;       -- Don't vacuum on commit, do it manually

-- Safe for read-heavy workloads
PRAGMA query_only = 0;                  -- Set to 1 for read-only connections
PRAGMA threads = 4;                     -- Parallel query execution (SQLite ≥ 3.8.3)

-- Connection-specific
PRAGMA application_id = 0x41507000;     -- Magic bytes for file type identification
PRAGMA user_version = 1;                -- Schema version (used by Room, Core Data)

-- Verify configuration
PRAGMA compile_options;                 -- Shows enabled features (FTS5, JSON1, etc.)
```

```dart
// Flutter: Drift database configuration
LazyDatabase(() async {
  final file = File(join(await getDatabasesPath(), 'myapp.db'));
  return NativeDatabase.createInBackground(
    file,
    databaseConfiguration: (db) {
      db.execute("PRAGMA journal_mode = WAL");
      db.execute("PRAGMA synchronous = NORMAL");
      db.execute("PRAGMA cache_size = -8000");
      db.execute("PRAGMA busy_timeout = 5000");
      db.execute("PRAGMA foreign_keys = ON");
    },
  );
});
```

### Advanced SQLite Configuration

```typescript
// React Native: expo-sqlite advanced configuration
import * as SQLite from 'expo-sqlite';

async function configureDatabase(db: SQLite.WebSQLDatabase) {
  // Optimization pragmas
  await db.execAsync([
    { sql: 'PRAGMA journal_mode = WAL', args: [] },
    { sql: 'PRAGMA synchronous = NORMAL', args: [] },
    { sql: 'PRAGMA cache_size = -8000', args: [] },
    { sql: 'PRAGMA busy_timeout = 5000', args: [] },
    { sql: 'PRAGMA foreign_keys = ON', args: [] },
    { sql: 'PRAGMA temp_store = MEMORY', args: [] },
  ]);

  // Create performance_schema table for monitoring
  await db.execAsync([{
    sql: `
      CREATE TABLE IF NOT EXISTS perf_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT,
        duration_ms REAL,
        rows_affected INTEGER,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `,
    args: [],
  }]);
}
```

---

## SQLite Extensions

### FTS5 (Full-Text Search)

Powerful full-text search with stemming, ranking, and phrase queries.

```sql
-- Create FTS5 virtual table
CREATE VIRTUAL TABLE documents_fts USING fts5(
    title,
    body,
    content='documents',              -- Content sync table
    content_rowid='rowid',            -- Row ID column
    tokenize='porter unicode61'        -- Stemming + Unicode tokenizer
);

-- Populate FTS index
INSERT INTO documents_fts(rowid, title, body)
SELECT rowid, title, body FROM documents;

-- Advanced search queries
-- Basic search (AND by default)
SELECT * FROM documents_fts WHERE documents_fts MATCH 'database optimization';

-- Phrase search
SELECT * FROM documents_fts WHERE documents_fts MATCH '"conflict resolution"';

-- Prefix search
SELECT * FROM documents_fts WHERE documents_fts MATCH 'optim*';

-- Boolean operators
SELECT * FROM documents_fts
WHERE documents_fts MATCH 'sqlite AND (wal OR journal) NOT postgresql';

-- Ranking with bm25
SELECT *, bm25(documents_fts) AS rank
FROM documents_fts
WHERE documents_fts MATCH 'mobile performance'
ORDER BY rank;

-- Highlighting matches
SELECT snippet(documents_fts, 1, '<b>', '</b>', '...', 32)
FROM documents_fts
WHERE documents_fts MATCH 'sqlite';
```

```dart
// Flutter: FTS5 with Drift
class Documents extends Table {
  TextColumn get title => text()();
  TextColumn get body => text()();
  @override
  Set<Column> get primaryKey => {title};  // not rowid table
}

class DocumentsFts extends VirtualTable {
  @override
  TextColumn get title => text()();
  @override
  TextColumn get body => text()();

  @override
  String get virtualModule => 'fts5';

  @override
  Map<String, String> get moduleArgs => {
    'tokenize': 'porter unicode61',
    'content': 'documents',
  };
}

// Search query
Future<List<Document>> search(String query) {
  return (select(documentsFts)
        .join([innerJoin(documents, documentsFts.rowId.equalsExp(documents.id))])
      ..where(documentsFts.all('MATCH ?', [query])))
    .map((row) => row.readTable(documents))
    .get();
}
```

### JSON1

SQLite's built-in JSON functions for storing and querying JSON data.

```sql
-- JSON1 functions
-- Extract values
SELECT
    json_extract('{"name": "Alice", "age": 30}', '$.name') AS name,
    json_extract('{"name": "Alice", "age": 30}', '$.age') AS age;

-- Path-based querying
SELECT * FROM products
WHERE json_extract(metadata, '$.category') = 'electronics'
  AND json_extract(metadata, '$.inStock') = true
  AND json_extract(metadata, '$.price') > 100;

-- Array operations
SELECT json_each.key, json_each.value
FROM products, json_each(products.tags)
WHERE products.id = 'prod_123';

-- Update JSON fields
UPDATE products
SET metadata = json_set(metadata, '$.price', 29.99, '$.discount', 0.1)
WHERE id = 'prod_123';

-- Remove JSON key
UPDATE products
SET metadata = json_remove(metadata, '$.temporaryField')
WHERE id = 'prod_123';

-- Type checking
SELECT
    json_type(metadata, '$.price') AS price_type,
    json_type(metadata, '$.name') AS name_type
FROM products
LIMIT 1;

-- Create JSON array/object
SELECT json_object('name', 'Alice', 'tags', json_array('premium', 'vip'));
```

```typescript
// TypeScript: JSON1 with better-sqlite3
import Database from 'better-sqlite3';

const db = new Database('myapp.db');
db.pragma('journal_mode = WAL');

// Create table with JSON column
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}'
  )
`);

// Insert with JSON
const insert = db.prepare(
  'INSERT INTO products (id, name, metadata) VALUES (?, ?, ?)'
);
insert.run('prod_1', 'Widget', JSON.stringify({
  category: 'tools',
  price: 19.99,
  inStock: true,
  tags: ['new', 'featured'],
}));

// Query JSON paths
const results = db.prepare(`
  SELECT id, name,
    json_extract(metadata, '$.price') as price,
    json_extract(metadata, '$.category') as category
  FROM products
  WHERE json_extract(metadata, '$.inStock') = true
`).all();
```

### RTree (Spatial Indexing)

RTree extension for efficient range queries on multi-dimensional data.

```sql
-- Create RTree virtual table
CREATE VIRTUAL TABLE locations_rtree USING rtree(
    id,           -- INTEGER PRIMARY KEY
    min_lat, max_lat,   -- Latitude range
    min_lng, max_lng    -- Longitude range
);

-- Insert spatial data
INSERT INTO locations_rtree VALUES
    (1, 40.7128, 40.7128, -74.0060, -74.0060),        -- Point (NYC)
    (2, 51.5074, 51.5074, -0.1278, -0.1278),           -- Point (London)
    (3, 48.8566, 48.8566, 2.3522, 2.3522);             -- Point (Paris)

-- Range query: find locations within bounding box
SELECT * FROM locations_rtree
WHERE min_lat >= 40.0 AND max_lat <= 42.0
  AND min_lng >= -75.0 AND max_lng <= -73.0;

-- Nearest neighbor search (requires custom implementation or R*Tree)
```

### ICU (International Components for Unicode)

ICU extension provides locale-aware string comparison and collation.

```sql
-- Load ICU extension
SELECT load_extension('libsqliteicu');

-- Locale-aware sorting
SELECT name FROM users
ORDER BY name COLLATE ICU;

-- Case-insensitive ICU collation
SELECT name FROM users
WHERE name COLLATE ICU LIKE '%straße%';

-- Locale-specific ordering
SELECT name FROM products
ORDER BY name COLLATE ICU;  -- Respects locale-specific character ordering
```

### Stats Extension

Statistical aggregate functions for analytics.

```sql
-- Load stats extension
CREATE VIRTUAL TABLE stats_extension USING stats;

-- Statistical aggregates
SELECT
    COUNT(*),
    AVG(price),
    STDDEV(price),
    VARIANCE(price),
    MEDIAN(price),
    MODE(price),
    PERCENTILE(price, 25) AS q1,
    PERCENTILE(price, 75) AS q3
FROM products;
```

---

## SQLite Encryption

### SEE (SQLite Encryption Extension)

Official SQLite encryption extension (commercial license).

```c
// SEE provides 256-bit AES encryption at the page level
// Configuration at compile time
#define SQLITE_HAS_CODEC 1
#define SQLITE_TEMP_STORE 3

// At runtime
sqlite3_key(db, "encryption_key", 16);
sqlite3_rekey(db, "new_key", 16);  // Change encryption key
```

### SQLCipher

Open-source (BSD) encryption for SQLite, widely used in mobile apps.

```kotlin
// Android: SQLCipher with Room
SupportFactory factory = new SupportFactory(
    "your-passphrase".getBytes(),
    SupportFactory.PRAGMA_PAGE_SIZE_4096
);

Room.databaseBuilder(context, AppDatabase.class, "encrypted.db")
    .openHelperFactory(factory)
    .build();

// Or raw SQLCipher
SQLiteDatabase.loadLibs(context);
File dbFile = context.getDatabasePath("encrypted.db");
SQLiteDatabase db = SQLiteDatabase.openOrCreateDatabase(dbFile, "passphrase", null);
db.execSQL("CREATE TABLE IF NOT EXISTS secrets (id INTEGER PRIMARY KEY, value TEXT)");
db.execSQL("INSERT INTO secrets VALUES (1, 'encrypted-data')");
db.close();
```

```swift
// iOS: SQLCipher
import SQLCipher

var db: OpaquePointer?
let path = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true).first!
let dbPath = "\(path)/encrypted.db"

sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE, nil)
sqlite3_key(db, "passphrase", Int32("passphrase".utf8.count))

// Execute queries on encrypted database
sqlite3_exec(db, "CREATE TABLE IF NOT EXISTS secrets (id INTEGER PRIMARY KEY, value TEXT)", nil, nil, nil)

// Rekey (change passphrase)
// sqlite3_rekey(db, "new-passphrase", Int32("new-passphrase".utf8.count))
```

```dart
// Flutter: SQLCipher via sqflite_sqlcipher
import 'package:sqflite_sqlcipher/sqflite.dart';

Future<Database> openEncryptedDb() async {
  return openDatabase(
    join(await getDatabasesPath(), 'encrypted.db'),
    password: 'secure-passphrase',
    version: 1,
    onCreate: (db, version) async {
      await db.execute('''
        CREATE TABLE secrets(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          value TEXT NOT NULL
        )
      ''');
    },
  );
}
```

### SQLiteCrypt

Commercial encryption extension with per-page AES encryption.

```sql
-- SQLiteCrypt usage (compiled-in extension)
PRAGMA key = 'passphrase';
PRAGMA rekey = 'new-passphrase';

-- The encryption is transparent to queries
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password_hash TEXT  -- Encrypted at page level
);
```

---

## Local Database Options Comparison

| Feature | SQLite | Realm | WatermelonDB | Couchbase Lite | Firestore Offline | Room | GRDB |
|---------|--------|-------|-------------|----------------|-------------------|------|------|
| **Type** | Relational | Object | Relational | Document | Document | Relational | Relational |
| **Storage** | SQL file | Custom | SQLite | Couchbase | IndexedDB | SQLite | SQLite |
| **Query** | SQL | NSPredicate/Rx | SQL-like | N1QL | Limited | SQL | SQL |
| **ORM** | No (thin wrappers) | Yes | Yes | No | No | Yes | Yes |
| **Reactive** | No | Yes (Rx) | Yes (Observables) | Yes (LiveQuery) | Yes (onSnapshot) | Yes (Flow) | Yes (Combine) |
| **Encryption** | SQLCipher | Built-in | SQLCipher | Built-in | GCM-at-rest | SQLCipher | SQLCipher |
| **Sync** | Add-on | MongoDB Realm | Custom sync | Couchbase Sync | Built-in | Add-on | Add-on |
| **Size** | ~500KB | ~5MB | ~2MB (w/SQLite) | ~10MB | ~8MB | ~500KB+bridge | ~500KB |
| **Platforms** | All | iOS/Android/Node | RN | iOS/Android/Unity | iOS/Android/Web | Android | iOS |
| **Memory** | Low | Moderate | Low | Moderate | High | Low | Low |
| **Write perf** | Fast (WAL) | Moderate | Fast | Moderate | Moderate | Fast | Fast |
| **Read perf** | Fast | Fast | Fast | Fast | Cached | Fast | Fast |
| **Maturity** | 30+ years | 10+ years | 5+ years | 10+ years | 6+ years | 7+ years | 8+ years |

### Decision Framework

```yaml
choose_sqlite_if:
  - "Complex relational queries with JOINs, aggregations, subqueries"
  - "Large datasets (>100K records)"
  - "Cross-platform portability needed"
  - "Predictable, proven technology required"
  - "Minimal binary size important"
  - "Full SQL flexibility required"

choose_realm_if:
  - "Object-oriented data model preferred over relational"
  - "Built-in sync with MongoDB Realm Atlas"
  - "Live objects (auto-updating objects in memory)"
  - "Swift/Obj-C integration (Apple ecosystem)"

choose_watermelondb_if:
  - "React Native app with complex local data"
  - "SQLite-based sync with custom backend"
  - "High-performance lists (lazy loading)"
  - "Offline-first architecture"

choose_couchbase_lite_if:
  - "Document-oriented data model"
  - "P2P sync between devices"
  - "Couchbase Server already in backend"
  - "Cross-platform (incl. .NET)"

choose_firestore_offline_if:
  - "Already using Firebase ecosystem"
  - "Simple data model without complex queries"
  - "Small to medium datasets (< 50K documents)"
  - "Server-side conflict resolution acceptable"

choose_room_if:
  - "Android/Jetpack Compose app"
  - "Need compile-time query verification"
  - "Integration with Android architecture components"
  - "Coroutines/Flow for reactive patterns"

choose_grdb_if:
  - "iOS/macOS native app"
  - "Swift-native API (no Obj-C overhead)"
  - "Combine/async-await integration"
  - "Fine-grained database control needed"
```

---

## Database Schema Design

### Schema Design Principles

```sql
-- 1. Use INTEGER PRIMARY KEY for auto-increment rowid
--    (NOT NULL, UNIQUE, auto-increment by default)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Prefer TEXT for timestamps (ISO 8601) over Unix timestamps
--    More readable, timezone-aware, sortable
--    SQLite has date/time functions that work with ISO 8601

-- 3. Use strict typing (SQLite 3.37+)
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1  -- Boolean as INTEGER 0/1
) STRICT;

-- 4. Foreign keys are enforced when PRAGMA foreign_keys = ON
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Composite indexes for common query patterns
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 6. Partial indexes for sparse data
CREATE INDEX idx_active_products ON products(id)
    WHERE active = 1;
```

### Anti-Patterns

```sql
-- ❌ EAV (Entity-Attribute-Value) anti-pattern
CREATE TABLE bad_eav (
    entity_id INTEGER,
    attribute TEXT,
    value TEXT,
    PRIMARY KEY (entity_id, attribute)
);
-- Querying EAV is painful: need multiple JOINs or PIVOT

-- ✅ Normalized schema
CREATE TABLE profiles (
    id INTEGER PRIMARY KEY,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    preference_theme TEXT,
    preference_notifications INTEGER
);

-- ❌ Storing JSON as text without validation
CREATE TABLE bad_orders (
    id INTEGER PRIMARY KEY,
    raw_json TEXT  -- No schema enforcement, no query optimization
);

-- ✅ Using JSON1 for semi-structured data
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',  -- JSON array via JSON1
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- ❌ NULL-able columns without defaults
CREATE TABLE bad_config (
    key TEXT PRIMARY KEY,
    value TEXT,  -- NULL means 'not set', but could also mean 'empty'
    created_at TEXT  -- NULL timestamps are meaningless
);

-- ✅ Explicit defaults
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Migrations

```kotlin
// Room: versioned migrations
@Database(
    entities = [User::class, Order::class],
    version = 3,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun orderDao(): OrderDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE users ADD COLUMN phone TEXT")
                db.execSQL("""
                    CREATE TABLE orders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        total REAL NOT NULL DEFAULT 0.0,
                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // Complex migration: split name into first/last
                db.execSQL("ALTER TABLE users ADD COLUMN first_name TEXT")
                db.execSQL("ALTER TABLE users ADD COLUMN last_name TEXT")
                db.execSQL("""
                    UPDATE users SET
                        first_name = SUBSTR(name, 1, INSTR(name, ' ') - 1),
                        last_name = SUBSTR(name, INSTR(name, ' ') + 1)
                """)
                db.execSQL("ALTER TABLE users DROP COLUMN name")  -- SQLite 3.35.0+
            }
        }

        fun build(context: Context): AppDatabase {
            return Room.databaseBuilder(context, AppDatabase::class.java, "myapp.db")
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                .fallbackToDestructiveMigration(false)
                .build()
        }
    }
}
```

```dart
// Flutter Drift: migrations
@DriftDatabase(tables: [Users, Orders])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      beforeOpen: (details) async {
        await customStatement('PRAGMA foreign_keys = ON');
      },
      onCreate: (m) async {
        await m.createAll();
      },
      onUpgrade: (m, from, to) async {
        if (from < 2) {
          await m.addColumn(users, users.phone);
          await m.create(orders);
        }
        if (from < 3) {
          await m.addColumn(users, users.firstName);
          await m.addColumn(users, users.lastName);
          // Complex data migration
          await customStatement('''
            UPDATE users SET
              first_name = SUBSTR(name, 1, INSTR(name, ' ') - 1),
              last_name = SUBSTR(name, INSTR(name, ' ') + 1)
          ''');
        }
      },
      onDelete: (m) async {
        // Called when version is higher than database's schema version
        await m.deleteAll();
      },
    );
  }
}
```

### Versioning Strategy

```yaml
schema_versioning:
  principles:
    - "Version from day one — never ship v0 (unversioned)"
    - "Backward compatible migrations (old app with new DB still works)"
    - "Forward compatible when possible (new app with old DB still works)"
    - "Test every migration path: 1→2, 1→3, 2→3, 1→2→3"

  forward_compatibility:
    - "New columns must have DEFAULT values or be nullable"
    - "Old app ignores unknown columns (SQLite allows this)"
    - "New tables don't affect old app queries"
    - "Dropping columns requires careful thought (old app may reference them)"

  backward_compatibility:
    - "Schema version must be monotonic (never decrease)"
    - "Downgrade migrations for rollback scenarios"
    - "Keep a schema_version table for manual tracking"

  destructive_changes_warning:
    - "DROP TABLE — all data lost"
    - "ALTER TABLE DROP COLUMN — irreversible"
    - "RENAME TABLE — breaks old queries"
    - "Type changes — implicit conversion may corrupt data"
```

```kotlin
// Forward/backward compatible migration
class SafeMigration {
    fun migrate(db: SupportSQLiteDatabase, fromVersion: Int, toVersion: Int) {
        // Always verify database state before migration
        assertSchemaValid(db)

        // Apply necessary changes
        when (fromVersion) {
            1 -> migrateFrom1(db)
            2 -> migrateFrom2(db)
        }

        // Update version
        db.execSQL("PRAGMA user_version = $toVersion")
    }

    private fun migrateFrom1(db: SupportSQLiteDatabase) {
        // Check if column already exists (forward compat)
        if (!columnExists(db, "users", "phone")) {
            db.execSQL("ALTER TABLE users ADD COLUMN phone TEXT")
        }
    }

    private fun columnExists(db: SupportSQLiteDatabase, table: String, column: String): Boolean {
        val cursor = db.rawQuery("PRAGMA table_info($table)", null)
        cursor.use {
            while (it.moveToNext()) {
                if (it.getString(1) == column) return true
            }
        }
        return false
    }
}
```

---

## Performance Optimization

### Indexing Strategies

```sql
-- B-tree index basics
-- Indexes speed up: WHERE, JOIN, ORDER BY, GROUP BY
-- Indexes slow down: INSERT, UPDATE, DELETE (5-15% per index)

-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (column order matters: most selective first)
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
-- Good for: WHERE user_id = ? AND created_at > ?
-- Good for: WHERE user_id = ?
-- NOT useful for: WHERE created_at > ? (user_id must be a prefix)

-- Covering index (all columns needed by query are in the index)
CREATE INDEX idx_orders_list ON orders(user_id, created_at, total, status);
-- Query can be satisfied entirely from the index (no table lookup)

-- Partial index (index only subset of rows)
CREATE INDEX idx_active_users ON users(id, name) WHERE active = 1;

-- Descending index (SQLite 3.30+)
CREATE INDEX idx_orders_recent ON orders(created_at DESC);

-- Analyze index usage
ANALYZE;
SELECT * FROM sqlite_master WHERE type = 'index';
SELECT * FROM sqlite_stat1;  -- Index statistics after ANALYZE
```

```sql
-- EXPLAIN QUERY PLAN to verify index usage
EXPLAIN QUERY PLAN
SELECT * FROM orders
WHERE user_id = 42 AND status = 'pending'
ORDER BY created_at DESC;

-- Expected: SCAN or SEARCH using idx_orders_user_status or idx_orders_list
-- If it shows SCAN TABLE orders (full table scan), add an index

-- Common index mistakes:
-- 1. Index on low-cardinality column (e.g., gender) — not selective enough
-- 2. Index on frequently-updated column — high write overhead
-- 3. Multiple single-column indexes vs one composite index
-- 4. Indexing columns not used in WHERE/JOIN/ORDER BY
```

### Query Optimization

```sql
-- 1. Select only needed columns
-- ❌ Bad
SELECT * FROM users WHERE id = ?;
-- ✅ Good
SELECT id, name, email FROM users WHERE id = ?;

-- 2. Use LIMIT for pagination
SELECT id, name FROM users
ORDER BY name
LIMIT 20 OFFSET 40;

-- 3. Keyset pagination (more efficient than OFFSET for large datasets)
SELECT id, name FROM users
WHERE (name, id) > ('LastItem', 100)
ORDER BY name, id
LIMIT 20;

-- 4. Avoid function calls on indexed columns in WHERE
-- ❌ Bad (can't use index on created_at)
SELECT * FROM orders WHERE date(created_at) = '2024-01-01';
-- ✅ Good
SELECT * FROM orders WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02';

-- 5. Use EXISTS instead of IN for subqueries
-- ❌ Bad
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE total > 100);
-- ✅ Good
SELECT * FROM users WHERE EXISTS (
    SELECT 1 FROM orders WHERE orders.user_id = users.id AND total > 100
);

-- 6. Batch operations in transactions
BEGIN TRANSACTION;
INSERT INTO items VALUES (1, 'A'), (2, 'B'), /* ... 100 rows */;
COMMIT;

-- 7. Prepared statements (reuse query plan)
-- In code: prepare once, execute many times with different params
PREPARE stmt FROM 'INSERT INTO logs (message, level) VALUES (?, ?)';
EXECUTE stmt USING 'User logged in', 'info';
EXECUTE stmt USING 'Payment processed', 'info';
DEALLOCATE PREPARE stmt;
```

```dart
// Flutter Drift: query optimization
// 1. Use watch() for reactive queries (only when needed)
Stream<List<Order>> watchRecentOrders() {
  return (select(orders)
        ..where((o) => o.createdAt.isBiggerThan(DateTime.now().subtract(Duration(days: 7))))
        ..orderBy([(o) => OrderingTerm(expression: o.createdAt, mode: OrderingMode.desc)])
        ..limit(20))
      .watch();
}

// 2. Use get() for one-shot queries (no stream overhead)
Future<List<Order>> getRecentOrders() {
  return (select(orders)
        ..where((o) => o.createdAt.isBiggerThan(DateTime.now().subtract(Duration(days: 7))))
        ..orderBy([(o) => OrderingTerm(expression: o.createdAt, mode: OrderingMode.desc)])
        ..limit(20))
      .get();
}

// 3. Batch insert for performance
Future<void> batchInsertOrders(List<Order> orders) async {
  await batch((batch) {
    batch.insertAllOnConflictUpdate(orders);
  });
}
```

### Connection Pooling

```kotlin
// Android: SQLite connection pool configuration
class DatabasePool(
    private val context: Context,
    private val dbName: String = "myapp.db"
) {
    // Room handles connection pooling automatically
    // Default pool size: 4 connections

    private val database: AppDatabase = Room.databaseBuilder(
        context,
        AppDatabase::class.java,
        dbName
    )
        .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING)
        // Increase pool for concurrent access
        .openHelperFactory(SupportFactory(
            SupportFactory.PRAGMA_PAGE_SIZE_4096
        ))
        .build()

    // Access from multiple threads safely
    fun readOnly(): SupportSQLiteDatabase {
        return database.openHelper.readableDatabase
    }

    fun readWrite(): SupportSQLiteDatabase {
        return database.openHelper.writableDatabase
    }
}
```

```swift
// iOS: GRDB connection pooling
import GRDB

final class DatabaseManager {
    static let shared = DatabaseManager()
    private let dbWriter: DatabaseWriter

    private init() {
        let path = NSSearchPathForDirectoriesInDomains(
            .documentDirectory, .userDomainMask, true
        ).first!.appending("/myapp.db")

        // DatabasePool provides concurrent read access with WAL
        dbWriter = try! DatabasePool(path: path)

        // Configure
        try! dbWriter.write { db in
            try db.execute(sql: "PRAGMA journal_mode = WAL")
            try db.execute(sql: "PRAGMA synchronous = NORMAL")
            try db.execute(sql: "PRAGMA foreign_keys = ON")
        }
    }

    func read<T>(_ block: (Database) throws -> T) throws -> T {
        try dbWriter.read(block)
    }

    func write(_ block: (Database) throws -> Void) throws {
        try dbWriter.write(block)
    }

    // Observation
    func observeOrders(completion: @escaping ([Order]) -> Void) -> AnyCancellable {
        let request = Order.all().order(Column("createdAt").desc)
        return ValueObservation
            .tracking { db in try request.fetchAll(db) }
            .publisher(in: dbWriter)
            .sink(receiveCompletion: { _ in }, receiveValue: completion)
    }
}
```

### Caching Strategies

```dart
// In-memory cache layer with LRU eviction
class DatabaseCache<K, V> {
  final LinkedHashMap<K, V> _cache;
  final int maxSize;

  DatabaseCache(this.maxSize) : _cache = LinkedHashMap<K, V>();

  V? get(K key) {
    if (_cache.containsKey(key)) {
      // Move to most recent (LRU implementation)
      final value = _cache.remove(key);
      _cache[key] = value as V;
      return value;
    }
    return null;
  }

  void set(K key, V value) {
    if (_cache.containsKey(key)) {
      _cache.remove(key);
    } else if (_cache.length >= maxSize) {
      // Evict least recently used
      _cache.remove(_cache.keys.first);
    }
    _cache[key] = value;
  }

  void invalidate(K key) => _cache.remove(key);
  void invalidateAll() => _cache.clear();
}

// Usage:
final userCache = DatabaseCache<int, User>(100);

Future<User> getUser(int id) async {
  final cached = userCache.get(id);
  if (cached != null) return cached;

  final user = await database.userDao().getUser(id);
  userCache.set(id, user);
  return user;
}
```

---

## Database Size Management

### Vacuuming

```sql
-- VACUUM rebuilds the database file, reclaiming unused space
-- Drops to 1/4 of original size after heavy deletes/updates

-- Full vacuum (requires exclusive lock, doubles file size temporarily)
VACUUM;

-- Incremental vacuum (SQLite 3.27+)
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA incremental_vacuum(100);  -- Reclaim 100 pages

-- Auto-vacuum settings
PRAGMA auto_vacuum = 0;  -- None (default)
PRAGMA auto_vacuum = 1;  -- Full (vacuum on each commit)
PRAGMA auto_vacuum = 2;  -- Incremental (manual)

-- Check database fragmentation
SELECT
    page_count AS total_pages,
    freelist_count AS free_pages,
    ROUND(CAST(freelist_count AS REAL) / page_count * 100, 2) AS free_pct
FROM pragma_page_count, pragma_freelist_count;
```

```dart
// Flutter: Scheduled vacuum
class DatabaseMaintenance {
  final AppDatabase database;

  Future<void> performMaintenance() async {
    await database.customStatement('PRAGMA incremental_vacuum(500)');
    await database.customStatement('PRAGMA wal_checkpoint(TRUNCATE)');
    await database.customStatement('ANALYZE');
  }

  Future<SizeInfo> getSizeInfo() async {
    final dbSize = await File(database.path).length();
    final walFile = File('${database.path}-wal');
    final walSize = await walFile.exists() ? await walFile.length() : 0;
    final shmFile = File('${database.path}-shm');
    final shmSize = await shmFile.exists() ? await shmFile.length() : 0;

    return SizeInfo(
      databaseBytes: dbSize,
      walBytes: walSize,
      shmBytes: shmSize,
      totalBytes: dbSize + walSize + shmSize,
    );
  }

  Future<void> vacuumIfNeeded() async {
    final info = await getSizeInfo();
    final result = await database.customStatement('''
      SELECT CAST(freelist_count AS REAL) / page_count * 100 AS free_pct
      FROM pragma_page_count, pragma_freelist_count
    ''');

    if (result.isNotEmpty && result.first['free_pct'] > 25) {
      // More than 25% free space — vacuum
      await database.customStatement('VACUUM');
    }
  }
}
```

### Archiving and Cleanup

```sql
-- Archiving strategy: move old data to archive table
-- 1. Create archive table (same schema)
CREATE TABLE orders_archive AS SELECT * FROM orders WHERE 0;

-- 2. Move old records
INSERT INTO orders_archive
SELECT * FROM orders
WHERE created_at < datetime('now', '-90 days');

-- 3. Delete from main table
DELETE FROM orders
WHERE created_at < datetime('now', '-90 days');

-- 4. Incremental vacuum after cleanup
PRAGMA incremental_vacuum(500);

-- Time-based cleanup policies
-- • Logs: delete after 30 days
-- • Temp data: delete after 7 days
-- • Cache: delete when size > 50MB or age > 24h
-- • User data: never delete without explicit action

-- Retention policy implementation
CREATE TRIGGER cleanup_old_logs AFTER INSERT ON logs
BEGIN
    DELETE FROM logs
    WHERE created_at < datetime('now', '-30 days');
END;
```

---

## Read/Write Transactions

### Isolation Levels

```sql
-- SQLite supports three transaction types:
-- DEFERRED (default): starts read transaction, upgrades to write when needed
-- IMMEDIATE: starts write transaction immediately, reserves write lock
-- EXCLUSIVE: starts write transaction, exclusive access

-- DEFERRED — best for reads, MAY fail on write with SQLITE_BUSY
BEGIN DEFERRED;
SELECT * FROM users WHERE id = 1;
UPDATE users SET name = 'Alice' WHERE id = 1;  -- May get SQLITE_BUSY
COMMIT;

-- IMMEDIATE — reserves write lock immediately, never gets SQLITE_BUSY
BEGIN IMMEDIATE;
UPDATE users SET name = 'Alice' WHERE id = 1;
COMMIT;

-- EXCLUSIVE — full exclusive access, no other readers or writers
BEGIN EXCLUSIVE;
VACUUM;  -- VACUUM requires EXCLUSIVE
COMMIT;

-- Best practices:
-- • READ-ONLY queries: BEGIN DEFERRED (or just use SELECT — auto-transaction)
-- • SINGLE write: BEGIN IMMEDIATE (prevents retry logic)
-- • MULTIPLE writes: BEGIN IMMEDIATE (failure-safe for multi-step operations)
-- • Maintenance: BEGIN EXCLUSIVE (VACUUM, schema changes)
```

```kotlin
// Room: Transaction handling
@Dao
interface OrderDao {
    @Transaction
    suspend fun createOrderWithItems(order: OrderEntity, items: List<ItemEntity>) {
        // Room automatically wraps in a transaction
        insertOrder(order)
        items.forEach { insertItem(it) }
    }

    @Transaction
    suspend fun transferStock(fromProductId: String, toProductId: String, quantity: Int) {
        // BEGIN IMMEDIATE is used by Room for transactions
        @RawQuery
        fun updateStock(productId: String, delta: Int)

        updateStock(fromProductId, -quantity)
        updateStock(toProductId, quantity)
    }
}
```

### Deadlock Avoidance

```kotlin
// Deadlock scenarios and prevention
// SQLite has limited deadlock potential (single writer in WAL mode)
// But application-level deadlocks can occur with:

// ❌ Deadlock pattern: Thread A locks Table1, Thread B locks Table2
// Thread A: BEGIN; UPDATE table1 ...; UPDATE table2 ...; (waits for Table2)
// Thread B: BEGIN; UPDATE table2 ...; UPDATE table1 ...; (waits for Table1)

// ✅ Prevention: consistent lock ordering
// Always acquire locks in the same order across all transactions

// ❌ Deadlock pattern: Nested transactions from different threads
// Thread A: BEGIN; call method that also starts transaction

// ✅ Prevention: use @Transaction or explicit single-transaction boundaries
class SafeOrderProcessor(private val orderDao: OrderDao, private val productDao: ProductDao) {
    @Transaction
    suspend fun processOrder(order: Order) {
        orderDao.insert(order)
        productDao.decrementStock(order.productId, order.quantity)
        // Single transaction, consistent order of operations
    }
}

// ✅ Prevention: timeout-based retry
fun <T> withTransactionTimeout(
    db: SupportSQLiteDatabase,
    timeoutMs: Long = 5000,
    block: () -> T
): T {
    val startTime = System.currentTimeMillis()
    while (true) {
        try {
            db.beginTransaction()
            val result = block()
            db.setTransactionSuccessful()
            return result
        } catch (e: Exception) {
            if (System.currentTimeMillis() - startTime > timeoutMs) {
                throw DatabaseException("Transaction timeout", e)
            }
            Thread.sleep(50)
        } finally {
            db.endTransaction()
        }
    }
}
```

---

## Thread Safety

### Connection Pooling with WAL

```swift
// GRDB: Thread-safe database access
class ThreadSafeDatabase {
    private let dbPool: DatabasePool

    init(path: String) throws {
        dbPool = try DatabasePool(path: path)

        // Multiple readers + single writer
        try dbPool.write { db in
            try db.execute(sql: "PRAGMA journal_mode = WAL")
        }
    }

    // ✅ Read from any thread concurrently
    func fetchUsers() throws -> [User] {
        try dbPool.read { db in
            try User.fetchAll(db)
        }
    }

    // ✅ Write from any thread (serialized)
    func saveUser(_ user: User) throws {
        try dbPool.write { db in
            try user.save(db)
        }
    }

    // ✅ Safe concurrent read + write
    func transferPoints(from: Int, to: Int, amount: Int) throws {
        try dbPool.write { db in
            try db.execute(sql: "UPDATE users SET points = points - ? WHERE id = ?", arguments: [amount, from])
            try db.execute(sql: "UPDATE users SET points = points + ? WHERE id = ?", arguments: [amount, to])
        }
    }
}
```

### Serialization Strategies

```dart
// Flutter: Isolate-based serialization
class IsolateDatabase {
  final AppDatabase database;
  final Mutex _writeMutex = Mutex();

  IsolateDatabase(this.database);

  // Serialize writes through a mutex (prevents concurrent WAL access issues)
  Future<T> write<T>(Future<T> Function() block) async {
    return _writeMutex.protect(block);
  }

  // Reads can be concurrent
  Future<List<User>> getUsers() {
    return database.userDao.getAll();
  }

  Future<void> saveUsers(List<User> users) async {
    await write(() async {
      await database.userDao.insertAll(users);
    });
  }

  // Computed in background isolate
  Future<ReportResult> generateReport() async {
    return compute(_generateReportImpl, database.path);
  }

  static Future<ReportResult> _generateReportImpl(String dbPath) async {
    final db = await openDatabase(dbPath);
    try {
      final totalUsers = await db.rawQuery('SELECT COUNT(*) FROM users');
      final totalOrders = await db.rawQuery('SELECT COUNT(*) FROM orders');
      return ReportResult(
        userCount: Sqflite.firstIntValue(totalUsers) ?? 0,
        orderCount: Sqflite.firstIntValue(totalOrders) ?? 0,
      );
    } finally {
      await db.close();
    }
  }
}
```

---

## Data Synchronization Patterns

### Incremental Sync

Sync only changed data since last sync, using timestamps or version vectors.

```kotlin
// Incremental sync with timestamp tracking
class IncrementalSyncEngine(
    private val localDb: AppDatabase,
    private val api: SyncApi
) {
    suspend fun sync() {
        val lastSyncTimestamp = localDb.syncMetadataDao().getLastSyncTimestamp()

        // 1. Push local changes since last sync
        val localChanges = localDb.changeLogDao().getChangesSince(lastSyncTimestamp)
        if (localChanges.isNotEmpty()) {
            api.pushChanges(localChanges)
            localDb.changeLogDao().markAsSynced(localChanges.map { it.id })
        }

        // 2. Pull remote changes since last sync
        val remoteChanges = api.pullChanges(lastSyncTimestamp)

        // 3. Apply remote changes
        for (change in remoteChanges) {
            applyRemoteChange(change)
        }

        // 4. Update sync timestamp
        localDb.syncMetadataDao().setLastSyncTimestamp(System.currentTimeMillis())
    }

    private suspend fun applyRemoteChange(change: RemoteChange) {
        when (change.operation) {
            "insert" -> localDb.dao(change.table).insert(change.data)
            "update" -> localDb.dao(change.table).update(change.data)
            "delete" -> localDb.dao(change.table).delete(change.entityId)
        }
    }
}
```

### Delta Sync

Sync only the differences between states using CRDT deltas or binary patches.

```typescript
// Delta sync using JSON patches (RFC 6902)
import { applyPatch, compare } from 'fast-json-patch';

class DeltaSyncService {
  async syncDocument(docId: string): Promise<Document> {
    const localDoc = await localDb.getDocument(docId);
    const remoteSnapshot = await api.getDocumentSnapshot(docId);

    // Compute delta from local to remote
    const delta = compare(localDoc, remoteSnapshot);

    if (delta.length === 0) return localDoc;  // No changes

    if (this.isSimpleSync(delta)) {
      // Apply delta directly
      const merged = applyPatch(localDoc, delta).newDocument;
      await localDb.saveDocument(merged);
      return merged;
    }

    // Complex changes — use three-way merge
    const base = await api.getDocumentBase(docId);
    return this.threeWayMerge(base, localDoc, remoteSnapshot);
  }

  private isSimpleSync(patches: any[]): boolean {
    // Patches on non-conflicting paths are safe to auto-apply
    return patches.every(p =>
      p.op === 'add' ||
      (p.op === 'replace' && !p.path.startsWith('/lockedFields'))
    );
  }
}
```

### Full Sync

Complete state synchronization (useful for initial sync or recovery).

```kotlin
// Full state sync
class FullSyncEngine(private val localDb: AppDatabase, private val api: SyncApi) {
    suspend fun fullSync() {
        val syncId = UUID.randomUUID().toString()

        // 1. Upload local state
        val localState = localDb.exportAll()
        val uploadToken = api.beginUpload(syncId, localState)

        // 2. Download remote state
        val remoteState = api.downloadFullState(syncId)

        // 3. Compare and merge
        val mergedState = mergeFullStates(localState, remoteState)

        // 4. Apply merged state locally
        localDb.clearAll()
        localDb.importAll(mergedState)

        // 5. Confirm completion
        api.confirmSync(syncId)
    }

    private suspend fun mergeFullStates(
        local: FullState,
        remote: FullState
    ): FullState {
        // For each table, merge records
        return FullState(
            users = mergeRecords(local.users, remote.users),
            orders = mergeRecords(local.orders, remote.orders),
            products = mergeRecords(local.products, remote.products),
        )
    }

    private fun <T : HasId> mergeRecords(local: List<T>, remote: List<T>): List<T> {
        val merged = mutableMapOf<String, T>()
        for (record in local + remote) {
            val existing = merged[record.id]
            merged[record.id] = when {
                existing == null -> record
                record.updatedAt > existing.updatedAt -> record
                else -> existing
            }
        }
        return merged.values.toList()
    }
}
```

### Bidirectional Sync

Two-way synchronization where both sides can modify data.

```typescript
// Bidirectional sync adapter (WatermelonDB style)
interface SyncAdapter {
  pull(pullParams: {
    lastPulledAt: number;
    schemaVersion: number;
    migration: Migration | null;
  }): Promise<{
    changes: SyncChanges;
    timestamp: number;
  }>;

  push(pushParams: {
    changes: SyncChanges;
    lastPulledAt: number;
  }): Promise<void>;
}

async function bidirectionalSync(adapter: SyncAdapter, db: Database) {
  const lastPulledAt = await db.getLastSyncTimestamp();
  const syncStartTime = Date.now();

  // Step 1: Push local changes to server
  const localChanges = await db.getChangesSince(lastPulledAt);
  if (hasChanges(localChanges)) {
    await adapter.push({
      changes: localChanges,
      lastPulledAt,
    });
  }

  // Step 2: Pull remote changes
  const { changes, timestamp } = await adapter.pull({
    lastPulledAt,
    schemaVersion: 1,
    migration: null,
  });

  // Step 3: Apply remote changes to local DB
  if (hasChanges(changes)) {
    await db.batch(() => {
      for (const [table, records] of Object.entries(changes)) {
        for (const record of records) {
          if (record._deleted) {
            db.get(table).markAsDeleted(record.id);
          } else {
            db.get(table).upsert(record);
          }
        }
      }
    });
  }

  // Step 4: Update last sync timestamp
  await db.setLastSyncTimestamp(syncStartTime);
}
```

---

## Error Handling and Recovery

### Corruption Detection

```sql
-- SQLite integrity checks
-- Quick check (fast, verifies everything is readable)
PRAGMA integrity_check;

-- Full check (slow, verifies all data structures)
PRAGMA quick_check;

-- Foreign key integrity check
PRAGMA foreign_key_check;

-- Schema integrity
PRAGMA schema_version;
PRAGMA user_version;

-- Application-level integrity verification
CREATE TABLE IF NOT EXISTS integrity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_type TEXT NOT NULL,
    result TEXT NOT NULL,
    details TEXT,
    checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Periodic integrity check function
INSERT INTO integrity_log (check_type, result, details)
SELECT 'full_integrity',
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
       group_conjust(error_info, '; ')
FROM pragma_integrity_check;
```

```swift
// GRDB: Corruption recovery
class DatabaseRecovery {
    static func recoverIfNeeded(dbPath: String) throws {
        let dbQueue = try DatabaseQueue(path: dbPath)

        // Check integrity
        let isCorrupted = try dbQueue.read { db in
            let results = try Row.fetchAll(db, sql: "PRAGMA integrity_check")
            return results.contains { $0[0] as? String != "ok" }
        }

        if isCorrupted {
            try recoverDatabase(dbPath: dbPath)
        }
    }

    static func recoverDatabase(dbPath: String) throws {
        let backupPath = dbPath + ".corrupted.\(Date().timeIntervalSince1970)"
        let fileManager = FileManager.default

        // 1. Backup corrupted database
        try fileManager.copyItem(atPath: dbPath, toPath: backupPath)

        // 2. Try SQLite recovery via .dump
        var recoveredSQL = ""
        // Attempt: .dump from corrupted, re-import to new DB
        let dumpProcess = Process()
        dumpProcess.executableURL = URL(fileURLWithPath: "/usr/bin/sqlite3")
        dumpProcess.arguments = [backupPath, ".dump"]

        let outputPipe = Pipe()
        dumpProcess.standardOutput = outputPipe
        try dumpProcess.run()
        dumpProcess.waitUntilExit()

        let outputData = outputPipe.fileHandleForReading.readDataToEndOfFile()
        recoveredSQL = String(data: outputData, encoding: .utf8) ?? ""

        // 3. Create new database from recovered SQL
        try fileManager.removeItem(atPath: dbPath)
        let recoveryQueue = try DatabaseQueue(path: dbPath)
        try recoveryQueue.write { db in
            for statement in recoveredSQL.components(separatedBy: ";") {
                let trimmed = statement.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {
                    try? db.execute(sql: trimmed)
                }
            }
        }

        // 4. Log recovery
        print("Recovered database from \(backupPath)")
    }
}
```

### Backup Strategies

```dart
// Automatic database backup
class DatabaseBackup {
  final String dbPath;

  Future<void> backup({String? label}) async {
    final backupDir = Directory('${await getDatabasesPath()}/backups');
    if (!await backupDir.exists()) {
      await backupDir.create(recursive: true);
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final backupPath = '${backupDir.path}/backup_${label ?? ''}_$timestamp.db';

    // Use SQLite backup API (available via sqlite3)
    await _backupDatabase(dbPath, backupPath);

    // Keep only last 5 backups
    await _cleanupOldBackups(backupDir.path, keep: 5);
  }

  Future<void> restore(String backupPath) async {
    // Close current database
    await database.close();

    // Restore from backup
    await File(backupPath).copy(dbPath);

    // Reopen database
    await database.open();
  }

  Future<void> _cleanupOldBackups(String dir, {int keep = 5}) async {
    final dir = Directory(dir);
    final files = await dir.list().toList();
    files.sort((a, b) => b.statSync().modified.compareTo(a.statSync().modified));

    if (files.length > keep) {
      for (final file in files.skip(keep)) {
        await file.delete();
      }
    }
  }
}
```

---

## Testing

### In-Memory Databases

```kotlin
// Room: In-memory database for tests
class DatabaseTest {
    private lateinit var database: AppDatabase
    private lateinit var userDao: UserDao

    @Before
    fun setup() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).build()
        userDao = database.userDao()
    }

    @After
    fun teardown() {
        database.close()
    }

    @Test
    fun `insert and retrieve user`() = runTest {
        val user = UserEntity(id = 1, name = "Alice", email = "alice@test.com")
        userDao.insert(user)

        val retrieved = userDao.getUser(1)
        assertEquals("Alice", retrieved.name)
        assertEquals("alice@test.com", retrieved.email)
    }

    @Test
    fun `insert duplicate email throws`() {
        val user1 = UserEntity(id = 1, name = "Alice", email = "same@test.com")
        val user2 = UserEntity(id = 2, name = "Bob", email = "same@test.com")

        userDao.insert(user1)
        assertThrows<SQLiteConstraintException> {
            runTest { userDao.insert(user2) }
        }
    }
}
```

```swift
// GRDB: In-memory database for tests
import GRDB
import XCTest

final class DatabaseTests: XCTestCase {
    var dbQueue: DatabaseQueue!

    override func setUp() {
        super.setUp()
        dbQueue = try! DatabaseQueue()
        try! dbQueue.write { db in
            try db.create(table: "users") { t in
                t.autoIncrementedPrimaryKey("id")
                t.column("name", .text).notNull()
                t.column("email", .text).notNull().unique()
            }
        }
    }

    func testInsertAndRetrieveUser() throws {
        try dbQueue.write { db in
            try db.execute(sql: "INSERT INTO users (name, email) VALUES (?, ?)",
                          arguments: ["Alice", "alice@test.com"])
        }

        let user = try dbQueue.read { db in
            try Row.fetchOne(db, sql: "SELECT * FROM users WHERE name = ?", arguments: ["Alice"])
        }

        XCTAssertEqual(user?["name"], "Alice")
        XCTAssertEqual(user?["email"], "alice@test.com")
    }
}
```

### Migration Testing

```dart
// Drift: Migration test
void main() {
  late AppDatabase database;

  setUp(() async {
    database = AppDatabase();
    await database.open();
  });

  tearDown(() async {
    await database.close();
  });

  test('migration from v1 to v2 adds phone column', () async {
    // Create v1 schema manually
    await database.customStatement('''
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      )
    ''');
    await database.customStatement('PRAGMA user_version = 1');

    // Insert v1 data
    await database.customStatement(
      "INSERT INTO users (name, email) VALUES ('Alice', 'alice@test.com')"
    );

    // Upgrade database to v2
    await database.migration.upgrade(2);

    // Verify migration preserved data and added column
    final users = await database.userDao.getAll();
    expect(users.length, equals(1));
    expect(users.first.name, equals('Alice'));
    expect(users.first.phone, isNull);

    // Verify v2 data still works
    await database.userDao.insert(User(name: 'Bob', email: 'bob@test.com', phone: '555-0100'));
    final bob = await database.userDao.getByName('Bob');
    expect(bob?.phone, equals('555-0100'));
  });

  test('migration v2 to v3 splits name column', () async {
    // Create v2 schema
    await database.customStatement('''
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT
      )
    ''');
    await database.customStatement('PRAGMA user_version = 2');

    // Insert v2 data with full names
    await database.customStatement(
      "INSERT INTO users (name, email) VALUES ('Alice Smith', 'alice@test.com')"
    );

    // Upgrade to v3
    await database.migration.upgrade(3);

    // Verify data was correctly split
    final users = await database.userDao.getAll();
    expect(users.first.firstName, equals('Alice'));
    expect(users.first.lastName, equals('Smith'));
  });
}
```

### Performance Profiling

```kotlin
// Room: Performance profiling
class DatabaseProfilingTest {
    private lateinit var database: AppDatabase

    @Before
    fun setup() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).build()
    }

    @Test
    fun `batch insert performance`() {
        val users = (1..1000).map { i ->
            UserEntity(id = i, name = "User $i", email = "user$i@test.com")
        }

        // Warm-up
        database.userDao().insertAll(users.take(10))

        // Measure individual inserts
        val individualTime = measureTimeMillis {
            users.take(100).forEach { database.userDao().insert(it) }
        }

        // Measure batch insert
        val batchTime = measureTimeMillis {
            database.userDao().insertAll(users)
        }

        println("Individual (100): ${individualTime}ms")
        println("Batch (1000): ${batchTime}ms")
        assertTrue(batchTime < individualTime * 20) // Batch should be faster
    }

    @Test
    fun `query with index vs without`() {
        // Insert test data
        val users = (1..10000).map { i ->
            UserEntity(id = i, name = "User $i", email = "user$i@test.com")
        }
        database.userDao().insertAll(users)

        // Measure query without index
        val withoutIndex = measureTimeMillis {
            database.userDao().searchByName("User 5000")
        }

        // Create index
        database.userDao().createNameIndex()

        // Measure query with index
        val withIndex = measureTimeMillis {
            database.userDao().searchByName("User 5000")
        }

        println("Without index: ${withoutIndex}ms")
        println("With index: ${withIndex}ms")
        assertTrue(withIndex <= withoutIndex)
    }

    private inline fun measureTimeMillis(block: () -> Unit): Long {
        val start = System.currentTimeMillis()
        block()
        return System.currentTimeMillis() - start
    }
}
```

```typescript
// Jest: Database performance tests
describe('SQLite performance', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        price REAL,
        stock INTEGER
      )
    `);
  });

  it('bulk insert performance', () => {
    const insert = db.prepare('INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)');

    const insertMany = db.transaction((items: any[]) => {
      for (const item of items) {
        insert.run(item.name, item.category, item.price, item.stock);
      }
    });

    const items = Array.from({ length: 10000 }, (_, i) => ({
      name: `Product ${i}`,
      category: i % 2 === 0 ? 'A' : 'B',
      price: Math.random() * 100,
      stock: Math.floor(Math.random() * 1000),
    }));

    const duration = measureSync(() => insertMany(items));
    expect(duration).toBeLessThan(500); // Should insert 10K in <500ms
  });

  it('indexed query vs full scan', () => {
    // Insert 50K rows
    const insert = db.prepare('INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((items: any[]) => {
      for (const item of items) {
        insert.run(item.name, item.category, item.price, item.stock);
      }
    });
    insertMany(Array.from({ length: 50000 }, (_, i) => ({
      name: `Product ${i}`,
      category: String.fromCharCode(65 + (i % 26)),
      price: Math.random() * 1000,
      stock: Math.floor(Math.random() * 500),
    })));

    // Without index
    const scan = db.prepare('SELECT COUNT(*) FROM products WHERE category = ? AND price > ?');
    const scanTime = measureSync(() => scan.get('A', 50));

    // Create index
    db.exec('CREATE INDEX idx_category_price ON products(category, price)');

    // With index
    const indexTime = measureSync(() => scan.get('A', 50));

    console.log(`Full scan: ${scanTime}ms, Indexed: ${indexTime}ms`);
    expect(indexTime).toBeLessThan(scanTime);
  });
});

function measureSync(fn: () => any): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}
```

---

## Best Practices

### Schema Design

```yaml
schema_design_best_practices:
  naming:
    - "Use snake_case for table and column names (sqlite convention)"
    - "Table names are plural: users, orders, products"
    - "Primary key is always 'id'"
    - "Foreign keys are 'singular_table_name_id': user_id, order_id"

  data_types:
    - "INTEGER for ids, counts, booleans (0/1)"
    - "REAL for floating point (prices, coordinates)"
    - "TEXT for everything else (names, descriptions, JSON, timestamps)"
    - "BLOB for binary data (images, files — but prefer file storage)"
    - "Avoid NUMERIC — TEXT and INTEGER cover most needs"

  constraints:
    - "NOT NULL on all columns that must have values"
    - "UNIQUE on columns that require uniqueness (emails, usernames)"
    - "DEFAULT values for all non-NULL columns"
    - "CHECK constraints for data validation (SQLite 3.25+)"
    - "FOREIGN KEY with ON DELETE CASCADE where appropriate"

  timestamps:
    - "Use ISO 8601 TEXT format: '2024-01-15T10:30:00.000Z'"
    - "created_at: set once on insert, never modified"
    - "updated_at: update on every modification"
    - "Consider triggers for automatic updated_at management"
```

### Indexing Best Practices

```yaml
indexing_best_practices:
  do_index:
    - "Columns in WHERE clauses (especially high-selectivity columns)"
    - "Foreign key columns (used in JOINs)"
    - "Columns in ORDER BY and GROUP BY"
    - "Composite indexes for multi-column queries"
    - "Partial indexes for sparse data subsets"

  dont_index:
    - "Low-cardinality columns (gender, status with few values)"
    - "Frequently updated columns (write-heavy tables)"
    - "Tiny tables (< 100 rows)"
    - "BLOB columns"
    - "More than 5-10 indexes per table"

  maintenance:
    - "Run ANALYZE after bulk operations"
    - "Review index usage with EXPLAIN QUERY PLAN"
    - "Remove unused indexes (measure with sqlite_stat1)"
    - "Consider index compression on large datasets"
```

### Migration Best Practices

```yaml
migration_best_practices:
  planning:
    - "Version from v1 in the first release"
    - "Plan for both upgrade and downgrade paths"
    - "Keep migration scripts in version control"
    - "Test migrations on realistic data volumes"

  execution:
    - "Wrap each migration step in a transaction"
    - "Add columns with ALTER TABLE (safe, backward compatible)"
    - "Create new tables instead of renaming (rename can break old app)"
    - "For complex migrations: create new table, copy data, swap names"
    - "Never remove a column without verifying no queries reference it"

  safety:
    - "Validate database state before and after migration"
    - "Use PRAGMA user_version for schema tracking"
    - "Check if column/table exists before creating (idempotent migrations)"
    - "Have fallback plan for failed migrations"
    - "Consider keeping a migration log table"

  testing:
    - "Test: fresh install (onCreate)"
    - "Test: upgrade from every previous version"
    - "Test: downgrade path (if applicable)"
    - "Test: migration with data (not just empty DB)"
    - "Test: migration while app is in background"
```

### Performance Best Practices

```yaml
performance_best_practices:
  queries:
    - "SELECT specific columns, never SELECT *"
    - "Use prepared statements and reuse them"
    - "Pagination with LIMIT/OFFSET or keyset pagination"
    - "Batch writes in transactions (10-100 at a time)"
    - "Use EXISTS for existence checks instead of COUNT(*)"
    - "Avoid SQL functions on indexed columns in WHERE"

  configuration:
    - "WAL mode for read-heavy workloads"
    - "synchronous = NORMAL for performance (FULL for critical data)"
    - "cache_size = -8000 (8MB) minimum"
    - "busy_timeout = 5000ms"
    - "mmap_size = 256MB for larger databases"

  maintenance:
    - "VACUUM when free space exceeds 25%"
    - "WAL checkpoint during app backgrounding"
    - "ANALYZE after bulk imports"
    - "Index defragmentation via REINDEX"
    - "Monitor database file size and growth rate"

  anti_patterns:
    - "Reading entire tables into memory"
    - "N+1 queries in loops"
    - "Object mapping overhead for simple lookups"
    - "Opening/closing database connection per operation"
    - "Long-running transactions blocking reads (use WAL + IMMEDIATE)"
```

---

## Platform-Specific Guidance

### iOS (Core Data / GRDB)

```swift
// Core Data stack with SQLite
import CoreData

class CoreDataStack {
    static let shared = CoreDataStack()
    let container: NSPersistentContainer

    private init() {
        container = NSPersistentContainer(name: "MyApp")

        // Configure SQLite options
        let storeDescription = container.persistentStoreDescriptions.first!
        storeDescription.setOption(true as NSNumber,
            forKey: NSPersistentHistoryTrackingKey)
        storeDescription.setOption(true as NSNumber,
            forKey: NSPersistentRemoteChangeNotificationPostOptionKey)

        // SQLite pragmas via options
        storeDescription.setOption(["WAL": "journal_mode"] as [String: String],
            forKey: NSSQLitePragmasOption)

        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Failed to load store: \(error)")
            }
        }

        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    // Background context for writes
    func backgroundContext() -> NSManagedObjectContext {
        let context = container.newBackgroundContext()
        context.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        return context
    }

    // Save with error handling
    func save(context: NSManagedObjectContext) {
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                // Handle save error (conflict, validation, etc.)
                print("Save failed: \(error)")
                context.rollback()
            }
        }
    }
}

// Migration
let options = [
    NSMigratePersistentStoresAutomaticallyOption: true,
    NSInferMappingModelAutomaticallyOption: true,
]
storeDescription.setOption(options, forKey: NSPersistentStoreConnectionPoolMaxSizeKey)
```

```swift
// GRDB iOS setup
import GRDB

class GRDBManager {
    static let shared = GRDBManager()
    private(set) var dbWriter: DatabaseWriter!

    func initialize() throws {
        let path = NSSearchPathForDirectoriesInDomains(
            .documentDirectory, .userDomainMask, true
        ).first!.appending("/myapp.db")

        dbWriter = try DatabasePool(path: path)

        // Run migrations
        var migrator = DatabaseMigrator()
        migrator.registerMigration("v1_create_users") { db in
            try db.create(table: "users") { t in
                t.autoIncrementedPrimaryKey("id")
                t.column("name", .text).notNull()
                t.column("email", .text).notNull().unique()
                t.column("createdAt", .datetime).notNull()
            }
        }
        migrator.registerMigration("v2_add_phone") { db in
            try db.alter(table: "users") { t in
                t.add(column: "phone", .text)
            }
        }

        try migrator.migrate(dbWriter)
    }

    // Reactive observation
    func observeUsers() -> AnyPublisher<[User], Error> {
        let request = User.all()
        return ValueObservation
            .tracking { db in try request.fetchAll(db) }
            .publisher(in: dbWriter)
            .eraseToAnyPublisher()
    }
}
```

### Android (Room)

```kotlin
// Room full configuration
@Database(
    entities = [User::class, Order::class, Product::class],
    version = 5,
    exportSchema = true,
    autoMigrations = [
        AutoMigration(from = 1, to = 2),
        AutoMigration(from = 2, to = 3)
    ]
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun orderDao(): OrderDao
    abstract fun productDao(): ProductDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: buildDatabase(context).also { INSTANCE = it }
            }
        }

        private fun buildDatabase(context: Context): AppDatabase {
            return Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                "myapp.db"
            )
                .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING)
                .enableMultiInstanceInvalidation()
                .fallbackToDestructiveMigration(false)
                .addCallback(object : Callback() {
                    override fun onCreate(db: SupportSQLiteDatabase) {
                        super.onCreate(db)
                        // Database created for the first time
                    }

                    override fun onOpen(db: SupportSQLiteDatabase) {
                        super.onOpen(db)
                        // Configure pragmas
                        db.execSQL("PRAGMA synchronous = NORMAL")
                        db.execSQL("PRAGMA cache_size = -8000")
                        db.execSQL("PRAGMA busy_timeout = 5000")
                    }
                })
                .addMigrations(MIGRATION_3_4, MIGRATION_4_5)
                .build()
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE users ADD COLUMN avatar_url TEXT")
            }
        }

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        token TEXT NOT NULL UNIQUE,
                        expires_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
            }
        }
    }
}
```

### React Native (WatermelonDB)

```javascript
// WatermelonDB setup
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

// Schema definition
export const schema = appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'total', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});

// Adapter
const adapter = new SQLiteAdapter({
  dbName: 'myapp',
  schema,
  jsi: true, // Use JSI for better performance
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
    // Handle migration failure
  },
  migrations: [
    // Migration definitions
  ],
});

// Database instance
const database = new Database({
  adapter,
  modelClasses: [User, Order],
});

// Model
class User extends Model {
  static table = 'users';
  static associations = {
    orders: { type: 'has_many', foreignKey: 'user_id' },
  };

  @field('name') name;
  @field('email') email;
  @field('phone') phone;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;

  @children('orders') orders;
}

// Query
const users = await database
  .get('users')
  .query(Q.where('email', 'alice@test.com'))
  .fetch();

// Batch write
await database.write(async writer => {
  const user = await writer.create('users', record => {
    record._raw.name = 'Alice';
    record._raw.email = 'alice@test.com';
  });
});
```

### Flutter (Drift)

```dart
// Drift database setup with all features
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

// Table definitions
class Users extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().withLength(min: 1, max: 255)();
  TextColumn get email => text().withLength(min: 5, max: 255)();
  TextColumn get phone => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<TableIndex> get indexes => [
    TableIndex(name: 'idx_users_email', columns: {email}, unique: true),
    TableIndex(name: 'idx_users_name', columns: {name}),
  ];
}

class Orders extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get userId => integer().references(Users, #id)();
  RealColumn get total => real().withDefault(const Constant(0.0))();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<TableIndex> get indexes => [
    TableIndex(name: 'idx_orders_user', columns: {userId}),
    TableIndex(name: 'idx_orders_status', columns: {status}),
  ];
}

// Database class
@DriftDatabase(tables: [Users, Orders])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    beforeOpen: (details) async {
      await customStatement('PRAGMA journal_mode = WAL');
      await customStatement('PRAGMA synchronous = NORMAL');
      await customStatement('PRAGMA foreign_keys = ON');
      await customStatement('PRAGMA busy_timeout = 5000');
    },
    onCreate: (m) async {
      await m.createAll();
    },
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.addColumn(users, users.phone);
      }
      if (from < 3) {
        await m.create(orders);
      }
    },
  );

  // DAO methods
  Future<User> getUser(int id) {
    return (select(users)..where((u) => u.id.equals(id))).getSingle();
  }

  Future<List<User>> getAllUsers() => select(users).get();

  Stream<List<User>> watchUsers() => select(users).watch();

  Future<int> insertUser(Insertable<User> user) {
    return into(users).insert(user);
  }

  Future<bool> updateUser(Insertable<User> user) {
    return update(users).replace(user);
  }

  Future<int> deleteUser(int id) {
    return (delete(users)..where((u) => u.id.equals(id))).go();
  }

  // Complex queries
  Future<List<Order>> getOrdersForUser(int userId) {
    return (select(orders)..where((o) => o.userId.equals(userId))).get();
  }

  Future<double> getUserTotalSpent(int userId) {
    return customSelect(
      'SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = ?',
      variables: [Variable.withInt(userId)],
      readFrom: (row) => row.read<double>(0),
    ).getSingle();
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'myapp.db'));
    return NativeDatabase(file);
  });
}
```

---

## Advanced Query Examples

### Recursive CTEs

```sql
-- Recursive CTE for hierarchical data (categories, org charts)
WITH RECURSIVE category_tree AS (
    -- Base case: root categories
    SELECT id, name, parent_id, 0 AS depth, name AS path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: children
    SELECT c.id, c.name, c.parent_id, ct.depth + 1,
           ct.path || ' > ' || c.name
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY path;

-- CTE for reporting with running totals
WITH monthly_totals AS (
    SELECT
        strftime('%Y-%m', created_at) AS month,
        SUM(total) AS revenue
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY month
)
SELECT
    month,
    revenue,
    SUM(revenue) OVER (ORDER BY month) AS running_total,
    ROUND(AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3m
FROM monthly_totals
ORDER BY month;
```

### Full-Text Search with Ranking

```sql
-- FTS5 with custom ranking for product search
CREATE VIRTUAL TABLE products_fts USING fts5(
    name, description, category,
    content='products',
    content_rowid='id',
    tokenize='porter unicode61 remove_diacritics 2'
);

-- Trigger-based FTS sync
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
    INSERT INTO products_fts(rowid, name, description, category)
    VALUES (new.id, new.name, new.description, new.category);
END;

CREATE TRIGGER products_ad AFTER DELETE ON products BEGIN
    INSERT INTO products_fts(products_fts, rowid, name, description, category)
    VALUES ('delete', old.id, old.name, old.description, old.category);
END;

CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
    INSERT INTO products_fts(products_fts, rowid, name, description, category)
    VALUES ('delete', old.id, old.name, old.description, old.category);
    INSERT INTO products_fts(rowid, name, description, category)
    VALUES (new.id, new.name, new.description, new.category);
END;

-- Custom ranking: boost name matches, then category, then description
SELECT
    p.*,
    bm25(products_fts, 10.0, 5.0, 1.0) AS rank
FROM products_fts
JOIN products p ON p.id = products_fts.rowid
WHERE products_fts MATCH 'wireless headphones'
ORDER BY rank;
```

### JSON Queries with JSON1

```sql
-- JSON queries for semi-structured data
-- Find products matching dynamic filters
SELECT
    id,
    name,
    json_extract(attributes, '$.color') AS color,
    json_extract(attributes, '$.size') AS size,
    json_extract(attributes, '$.weight_kg') AS weight
FROM products
WHERE json_extract(attributes, '$.color') IN ('red', 'blue')
  AND json_extract(attributes, '$.in_stock') = 1
  AND CAST(json_extract(attributes, '$.price_usd') AS REAL) BETWEEN 10 AND 50;

-- Aggregate over JSON arrays
SELECT
    id,
    name,
    (
        SELECT SUM(json_extract(value, '$.price') * json_extract(value, '$.quantity'))
        FROM json_each(order_items)
    ) AS total_price
FROM orders;
```

---

## File Structure Example

```
project/
├── database/
│   ├── schema/
│   │   ├── migrations/
│   │   │   ├── 001_create_users.sql
│   │   │   ├── 002_add_phone_to_users.sql
│   │   │   └── 003_create_orders.sql
│   │   └── schema_version.sql
│   ├── dao/
│   │   ├── UserDao.kt              # CRUD + queries
│   │   ├── OrderDao.kt
│   │   └── ProductDao.kt
│   ├── entity/
│   │   ├── UserEntity.kt
│   │   └── OrderEntity.kt
│   ├── converter/
│   │   ├── Converters.kt           # Type converters
│   │   └── DateConverters.kt
│   ├── sync/
│   │   ├── SyncEngine.kt
│   │   ├── ChangeTracker.kt
│   │   └── ConflictResolver.kt
│   ├── AppDatabase.kt              # Database class + migration config
│   └── DatabaseProvider.kt         # DI provider / singleton
├── test/
│   ├── database/
│   │   ├── UserDaoTest.kt          # CRUD tests
│   │   ├── MigrationTest.kt        # Migration path tests
│   │   └── PerformanceTest.kt      # Index + query perf tests
│   └── fixtures/
│       ├── test_data.json
│       └── migration_test_data.sql
└── docs/
    └── database-design.md
```
