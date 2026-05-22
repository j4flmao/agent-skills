# Mobile Local Database

## Repository Pattern — Cache First

```kotlin
class ProductRepository(
  private val localDao: ProductDao,
  private val remoteApi: ProductApi,
  private val connectivity: ConnectivityMonitor
) {
  fun getProducts(): Flow<List<Product>> {
    return localDao.observeAll().map { localProducts ->
      if (localProducts.isEmpty() || connectivity.forceRefresh) {
        fetchAndCache()
      }
      localDao.getAll() // return cached data
    }
  }

  suspend fun createProduct(product: Product) {
    localDao.insert(product)
    if (connectivity.isOnline) {
      syncQueue.enqueue(Operation.Create(product))
    }
  }
}
```

## Room (Android) — Schema

```kotlin
@Entity(tableName = "products")
data class ProductEntity(
  @PrimaryKey val id: String,
  val name: String,
  val price: Double,
  val updatedAt: Long,
  val syncStatus: SyncStatus = SyncStatus.SYNCED
)

@Dao
interface ProductDao {
  @Query("SELECT * FROM products ORDER BY updatedAt DESC")
  fun observeAll(): Flow<List<ProductEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insert(product: ProductEntity)

  @Query("DELETE FROM products WHERE id = :id")
  suspend fun delete(id: String)
}
```

## SQLDelight (KMP) — Schema

```sql
CREATE TABLE ProductEntity (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);

selectAll:
SELECT * FROM ProductEntity ORDER BY updated_at DESC;

insertOrReplace:
INSERT OR REPLACE INTO ProductEntity VALUES (?, ?, ?, ?, ?);

deleteById:
DELETE FROM ProductEntity WHERE id = ?;
```

## CoreData (iOS) — Model

```swift
@Model
final class ProductEntity {
  var id: String
  var name: String
  var price: Double
  var updatedAt: Date
  var syncStatus: String

  init(id: String, name: String, price: Double) {
    self.id = id
    self.name = name
    self.price = price
    self.updatedAt = Date()
    self.syncStatus = "synced"
  }
}
```

## Migration Strategy

- Version all schema changes with monotonically increasing version number.
- Use destructive migration only during development.
- For production: write migration SQL for each version transition.
- Test migration on real device with production data size.
