# Local Storage and Cache Strategies

## Cache Storage API

```typescript
interface CacheConfig {
  name: string
  version: number
  maxEntries: number
  maxAge: number
}

class BrowserCacheManager {
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
  }

  async open(): Promise<Cache> {
    const cacheName = `${this.config.name}-v${this.config.version}`
    return caches.open(cacheName)
  }

  async put(request: Request, response: Response): Promise<void> {
    const cache = await this.open()
    await cache.put(request, response)
    await this.evictIfNeeded()
  }

  async match(request: Request): Promise<Response | undefined> {
    const cache = await this.open()
    const cached = await cache.match(request)
    if (!cached) return undefined

    const age = Date.now() - new Date(cached.headers.get('date') || 0).getTime()
    if (age > this.config.maxAge) {
      await cache.delete(request)
      return undefined
    }

    return cached
  }

  private async evictIfNeeded(): Promise<void> {
    const cache = await this.open()
    const keys = await cache.keys()
    if (keys.length > this.config.maxEntries) {
      const oldest = keys.slice(0, keys.length - this.config.maxEntries)
      await Promise.all(oldest.map(key => cache.delete(key)))
    }
  }
}
```

## IndexedDB for Structured Data

```typescript
interface IndexedDBConfig {
  dbName: string
  version: number
  stores: {
    name: string
    keyPath: string
    indexes?: { name: string; keyPath: string }[]
  }[]
}

class IndexedDBManager {
  private db: IDBDatabase | null = null
  private config: IndexedDBConfig

  constructor(config: IndexedDBConfig) {
    this.config = config
  }

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        for (const store of this.config.stores) {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
            })
            for (const index of store.indexes || []) {
              objectStore.createIndex(index.name, index.keyPath)
            }
          }
        }
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.connect()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.connect()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(value)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}
```

## Storage Quota Management

```typescript
interface StorageEstimate {
  usage: number
  quota: number
}

async function checkStorageQuota(): Promise<StorageEstimate> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0 }
  }
  const estimate = await navigator.storage.estimate()
  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
  }
}

async function isStoragePressure(): Promise<boolean> {
  const { usage, quota } = await checkStorageQuota()
  return usage / quota > 0.8
}
```

## Key Points

- Use Cache API for network request caching with TTL
- Store structured data in IndexedDB for offline scenarios
- Monitor storage quota and handle pressure gracefully
- Implement LRU eviction for cache size management
- Use localStorage for small, non-sensitive configuration data
- Never store tokens or secrets in localStorage
- Compress data before storing to reduce space usage
- Handle QuotaExceededError with user notification
- Provide cache invalidation strategies for stale data
- Use versioned cache names for easy migration
- Clear caches on logout or data reset
- Test storage behavior in private browsing modes
