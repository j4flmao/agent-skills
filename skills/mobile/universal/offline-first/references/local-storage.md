# Local Storage

## Database Selection Guide

| Feature | Room (Android) | SQLDelight (KMP) | CoreData (iOS) | Realm |
|---------|---------------|------------------|---------------|-------|
| Platform | Android only | Android + iOS | iOS only | Android + iOS |
| Language | Kotlin | Kotlin + SQL | Swift | Kotlin + Swift |
| Reactive | Flow | Flow (extensions) | @FetchRequest | Notifications |
| Migration | SQL migrations | SQL migrations | Lightweight + mapping | Schema version |
| Binary size | ~50KB | ~200KB | System framework | ~4MB |
| Encryption | Yes (SQLCipher) | No (platform-dependent) | No (File protection) | Yes (built-in) |
| iCloud sync | No | No | Yes (NSPersistentCloudKitContainer) | Via MongoDB Atlas |
| Offline-first | Yes | Yes | Yes | Yes (sync) |

## Room (Android) — Full Example

```kotlin
import androidx.room.*

@Entity(
    tableName = "products",
    indices = [Index("category"), Index("updated_at")],
    foreignKeys = [ForeignKey(
        entity = CategoryEntity::class,
        parentColumns = ["id"],
        childColumns = ["category_id"],
        onDelete = ForeignKey.CASCADE
    )]
)
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val price: Double,
    val description: String?,
    val imageUrl: String?,
    @ColumnInfo(name = "category_id") val categoryId: String,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
    @ColumnInfo(name = "sync_status") val syncStatus: SyncStatus = SyncStatus.SYNCED
)

enum class SyncStatus { SYNCED, PENDING_CREATE, PENDING_UPDATE, PENDING_DELETE }

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY updated_at DESC")
    fun observeAll(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getById(id: String): ProductEntity?

    @Query("SELECT * FROM products WHERE category_id = :categoryId")
    fun observeByCategory(categoryId: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE sync_status != 'SYNCED'")
    suspend fun getPendingSync(): List<ProductEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(product: ProductEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Query("UPDATE products SET sync_status = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: SyncStatus)

    @Delete
    suspend fun delete(product: ProductEntity)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM products")
    suspend fun deleteAll()
}

@Database(
    entities = [ProductEntity::class, CategoryEntity::class],
    version = 2,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
}
```

## SQLDelight (KMP) — Full Example

```sql
-- shared/src/commonMain/sqldelight/com/app/database/Product.sq

CREATE TABLE ProductEntity (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image_url TEXT,
    category_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);

-- Queries
selectAll:
SELECT * FROM ProductEntity ORDER BY updated_at DESC;

selectById:
SELECT * FROM ProductEntity WHERE id = ?;

selectByCategory:
SELECT * FROM ProductEntity WHERE category_id = ? ORDER BY updated_at DESC;

selectPendingSync:
SELECT * FROM ProductEntity WHERE sync_status != 'SYNCED';

insert:
INSERT OR REPLACE INTO ProductEntity VALUES (?, ?, ?, ?, ?, ?, ?, ?);

updateSyncStatus:
UPDATE ProductEntity SET sync_status = ? WHERE id = ?;

deleteById:
DELETE FROM ProductEntity WHERE id = ?;

deleteAll:
DELETE FROM ProductEntity;

countAll:
SELECT COUNT(*) FROM ProductEntity;
```

```kotlin
// KMP platform-specific drivers
// commonMain
expect class DatabaseDriverFactory {
    fun create(): SqlDriver
}

// androidMain
actual class DatabaseDriverFactory(private val context: Context) {
    actual fun create(): SqlDriver =
        AndroidSqliteDriver(Database.Schema, context, "app.db")
}

// iosMain
actual class DatabaseDriverFactory {
    actual fun create(): SqlDriver =
        NativeSqliteDriver(Database.Schema, "app.db")
}
```

## Repository Pattern — Cache-First

```kotlin
class ProductRepository(
    private val localDao: ProductDao,
    private val remoteApi: ProductApi,
    private val connectivityMonitor: ConnectivityMonitor,
    private val syncQueue: SyncQueue
) {
    // READ: Return local cache immediately, refresh from network in background
    fun getProducts(forceRefresh: Boolean = false): Flow<List<Product>> {
        return localDao.observeAll().map { localProducts ->
            if (localProducts.isEmpty() || forceRefresh) {
                refreshFromNetwork()
            }
            localProducts.map { it.toDomain() }
        }
    }

    // WRITE: Write to local DB first, then sync to server
    suspend fun createProduct(product: Product): Result<ProductEntity> {
        val entity = product.toEntity(syncStatus = SyncStatus.PENDING_CREATE)
        localDao.insert(entity)
        syncQueue.enqueue(SyncOperation.Create(entity))
        if (connectivityMonitor.isOnline) {
            triggerSync()
        }
        return Result.success(entity)
    }

    // UPDATE: Local-first with optimistic concurrency
    suspend fun updateProduct(product: Product): Result<ProductEntity> {
        val entity = product.toEntity(syncStatus = SyncStatus.PENDING_UPDATE)
        localDao.insert(entity)  // REPLACE on conflict
        syncQueue.enqueue(SyncOperation.Update(entity))
        if (connectivityMonitor.isOnline) {
            triggerSync()
        }
        return Result.success(entity)
    }

    // DELETE: Local deletion, queue for server sync
    suspend fun deleteProduct(id: String) {
        localDao.deleteById(id)
        syncQueue.enqueue(SyncOperation.Delete("product", id))
        if (connectivityMonitor.isOnline) {
            triggerSync()
        }
    }

    private suspend fun refreshFromNetwork() {
        try {
            val remoteProducts = remoteApi.getProducts()
            localDao.insertAll(remoteProducts.map { it.toEntity() })
        } catch (e: Exception) {
            // Network error — cached data still valid, show with staleness badge
            Log.w("Sync", "Failed to refresh products", e)
        }
    }
}
```

## Migration Strategy

```kotlin
// Room migration
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(database: SupportSQLiteDatabase) {
        database.execSQL("ALTER TABLE products ADD COLUMN category_id TEXT DEFAULT ''")
        database.execSQL("CREATE INDEX idx_products_category ON products(category_id)")
    }
}

// SQLDelight migration
-- 1.sqm (schema version 1)
CREATE TABLE ProductEntity ...

-- 2.sqm (schema version 2 — SQLDelight auto-migrates)
ALTER TABLE ProductEntity ADD COLUMN category_id TEXT NOT NULL DEFAULT '';
```

No preamble. No postamble. No explanations.
