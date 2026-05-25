# Mobile Storage Patterns

## Local Database Options

### SQLite (Room / CoreData / SQLDelight)
```kotlin
// Room (Android)
@Entity
data class User(
    @PrimaryKey val id: String,
    val name: String,
    val email: String,
    val updatedAt: Long,
)

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun getUser(id: String): User?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: User)
}
```

```swift
// CoreData (iOS)
let fetchRequest = User.fetchRequest()
fetchRequest.predicate = NSPredicate(format: "id == %@", userId)
let results = try context.fetch(fetchRequest)
```

### NoSQL Options
| Database | Platform | Use Case |
|----------|----------|----------|
| Realm | Cross-platform | Real-time sync, object DB |
| Firebase Firestore | Cross-platform | Cloud sync, real-time |
| Couchbase Lite | Cross-platform | Offline-first sync |
| UnQLite | Cross-platform | Embedded document store |

## File System Storage

### Directory Structure
```
Documents/
├── database/       # SQLite/Realm files
├── images/        # User-generated images
├── cache/         # Downloaded files
└── documents/     # User documents
```

### Cache Management
```typescript
class CacheManager {
  async clearExpired(days: number = 7) {
    const cacheDir = FileSystem.cacheDirectory
    const files = await FileSystem.readDirectoryAsync(cacheDir)
    const cutoff = Date.now() - days * 86400000

    for (const file of files) {
      const info = await FileSystem.getInfoAsync(`${cacheDir}/${file}`)
      if (info.modificationTime < cutoff) {
        await FileSystem.deleteAsync(`${cacheDir}/${file}`)
      }
    }
  }

  async getCacheSize(): Promise<number> {
    const cacheDir = FileSystem.cacheDirectory
    const files = await FileSystem.readDirectoryAsync(cacheDir)
    let totalSize = 0
    for (const file of files) {
      const info = await FileSystem.getInfoAsync(`${cacheDir}/${file}`)
      if (info.exists) totalSize += info.size
    }
    return totalSize
  }
}
```

## Preferences & Settings

### SharedPreferences / UserDefaults
```typescript
// React Native AsyncStorage
await AsyncStorage.setItem('user_preferences', JSON.stringify({
  theme: 'dark',
  notifications: true,
  language: 'en',
}))

const prefs = JSON.parse(await AsyncStorage.getItem('user_preferences'))
```

## Data Serialization

### JSON vs Protobuf
| Format | Size | Speed | Schema |
|--------|------|-------|--------|
| JSON | Largest | Slowest | Dynamic |
| Protobuf | Smallest | Fastest | Required |
| MessagePack | Medium | Fast | Dynamic |
| FlatBuffers | Small | Fastest | Required |

## Migration Strategy

### Schema Migration
```kotlin
// Room migrations
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(database: SupportSQLiteDatabase) {
        database.execSQL("ALTER TABLE users ADD COLUMN avatar_url TEXT")
    }
}
```

### Data Migration
- Version-check on app launch
- Migrate incrementally (v1→v2→v3)
- Keep backup before destructive migrations
- Test migrations on existing user data
- Provide fallback for failed migrations
