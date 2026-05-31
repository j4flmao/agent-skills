# PWA Offline Sync

## Overview

Offline synchronization enables web apps to function without a network connection, queueing mutations locally and replaying them when connectivity returns. This reference covers IndexedDB storage, background sync, conflict resolution, sync queues, optimistic UI with offline support, and data integrity strategies.

## Offline Architecture

### Data Flow

```
User Action (offline)
    |
    v
Local Store (IndexedDB)
    |
    ├── Save to pending queue
    ├── Apply optimistic update to local cache
    └── Show confirmation to user
            |
            v (when online detected)
    Background Sync / Manual Sync
            |
    ├── Replay mutations in order
    ├── Handle conflicts (server wins / client wins)
    ├── Update local cache with server response
    └── Notify UI of sync result
```

## IndexedDB Setup

### Using idb library

```javascript
import { openDB } from 'idb'

const DB_NAME = 'offline-app'
const DB_VERSION = 1

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores
      if (!db.objectStoreNames.contains('pending')) {
        const pendingStore = db.createObjectStore('pending', {
          keyPath: 'id',
          autoIncrement: true,
        })
        pendingStore.createIndex('type', 'type', { unique: false })
        pendingStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', {
          keyPath: 'url',
        })
      }

      if (!db.objectStoreNames.contains('conflicts')) {
        db.createObjectStore('conflicts', { keyPath: 'id' })
      }
    },
  })
}
```

### Direct IndexedDB (No Library)

```javascript
function openDB(migrationFn) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      migrationFn(db)
    }

    request.onsuccess = (event) => resolve(event.target.result)
    request.onerror = (event) => reject(event.target.error)
  })
}
```

## Pending Mutation Queue

### Enqueue Mutation

```javascript
async function enqueueMutation(mutation) {
  const db = await getDB()
  const tx = db.transaction('pending', 'readwrite')

  await tx.store.add({
    type: mutation.type,       // 'create', 'update', 'delete'
    endpoint: mutation.endpoint,
    body: mutation.body,
    method: mutation.method || 'POST',
    headers: mutation.headers || {},
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    idempotencyKey: generateUUID(),
  })

  await tx.done

  // Notify SW about pending mutations
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'MUTATION_QUEUED',
    })
  }
}

function generateUUID() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
}
```

### Process Queue

```javascript
async function processQueue() {
  const db = await getDB()
  const tx = db.transaction('pending', 'readwrite')
  const pending = await tx.store.index('createdAt').getAll()

  // Sort by creation time (oldest first)
  pending.sort((a, b) => a.createdAt - b.createdAt)

  for (const item of pending) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': item.idempotencyKey,
          ...item.headers,
        },
        body: item.body ? JSON.stringify(item.body) : undefined,
      })

      if (response.ok) {
        await tx.store.delete(item.id)
        notifySyncSuccess(item)
      } else if (response.status >= 400 && response.status < 500) {
        // Client error — don't retry, move to conflicts
        await moveToConflicts(db, item, await response.json())
      } else {
        // Server error — retry later
        item.retryCount++
        await tx.store.put(item)
      }
    } catch (err) {
      // Network error — will retry when online
      item.retryCount++
      await tx.store.put(item)
    }
  }

  await tx.done
}
```

## Background Sync

### Register Sync

```javascript
async function registerBackgroundSync() {
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register('sync-pending')
    console.log('Background sync registered')
  } catch (err) {
    console.log('Background sync not supported, falling back to online listener')
    // Fallback: listen for online event
    window.addEventListener('online', processQueue)
  }
}

// Register when mutations are queued
async function onMutationQueued() {
  if (navigator.onLine) {
    await processQueue()
  } else {
    await registerBackgroundSync()
  }
}
```

### SW Sync Handler

```javascript
// sw.js
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending') {
    event.waitUntil(processQueueInSW())
  }
})

async function processQueueInSW() {
  const db = await openDBInSW(DB_NAME, DB_VERSION)
  const tx = db.transaction('pending', 'readwrite')
  const items = await tx.store.index('createdAt').getAll()

  for (const item of items) {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': item.idempotencyKey,
        },
        body: item.body ? JSON.stringify(item.body) : undefined,
      })

      if (response.ok) {
        await tx.store.delete(item.id)

        // Notify client about successful sync
        const clients = await self.clients.matchAll()
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            id: item.id,
            endpoint: item.endpoint,
          })
        })
      }
    } catch (err) {
      console.error('Sync failed for item:', item.id, err)
    }
  }

  await tx.done
}
```

## Conflict Resolution

### Server Wins Strategy

```javascript
async function resolveConflict(localData, serverData) {
  // Server is authoritative — overwrite local
  await updateLocalCache(serverData)
  return serverData
}
```

### Client Wins Strategy

```javascript
async function resolveConflict(localData, serverData) {
  // Client is authoritative — force server update
  const response = await fetch(serverData.url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(localData),
  })

  if (response.ok) {
    await updateLocalCache(localData)
    return localData
  }

  // If server rejects, fall back to merge
  return mergeData(localData, await response.json())
}
```

### Last Write Wins (with Timestamps)

```javascript
async function resolveWithTimestamp(localData, serverData) {
  if (localData.updatedAt > serverData.updatedAt) {
    // Local is newer — push to server
    const response = await fetch(serverData.url, {
      method: 'PUT',
      body: JSON.stringify(localData),
    })
    return response.ok ? localData : serverData
  }

  // Server is newer — update local
  await updateLocalCache(serverData)
  return serverData
}
```

### Three-Way Merge

```javascript
async function threeWayMerge(base, local, server) {
  const merged = { ...server }

  for (const key of Object.keys(local)) {
    if (local[key] !== base[key] && server[key] === base[key]) {
      // Local changed this field, server didn't => use local
      merged[key] = local[key]
    }
    // If both changed, server wins (or could flag as conflict)
  }

  return merged
}
```

### Conflict UI

```javascript
async function handleConflict(item) {
  const conflict = {
    id: item.id,
    localData: item.body,
    serverData: await fetchLatestServerData(item.endpoint),
    timestamp: Date.now(),
    resolved: false,
  }

  const db = await getDB()
  await db.put('conflicts', conflict)

  // Notify UI to show conflict resolution dialog
  showConflictDialog(conflict)
}
```

## Offline Caching

### Cache API for Offline Data

```javascript
async function cacheForOffline(url, data) {
  const cache = await caches.open('offline-data-v1')
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
  cache.put(url, response)
}

async function getCachedOffline(url) {
  const cache = await caches.open('offline-data-v1')
  const response = await cache.match(url)

  if (response) {
    return response.json()
  }

  return null
}
```

### Network First with Offline Fallback

```javascript
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request)
    const cloned = response.clone()

    // Update cache with fresh data
    caches.open('offline-data-v1').then((cache) => {
      cache.put(request, cloned)
    })

    return response
  } catch {
    const cached = await caches.match(request)

    if (cached) {
      return cached
    }

    // Return offline fallback response
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'You are offline. Data will sync when connection returns.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// In SW fetch event
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirstWithFallback(event.request))
  }
})
```

## Online Detection and Sync

### Network Status Monitoring

```javascript
function monitorNetwork() {
  function handleOnline() {
    console.log('Back online')
    document.body.classList.remove('offline')
    processQueue()
    refreshStaleData()
  }

  function handleOffline() {
    console.log('Offline')
    document.body.classList.add('offline')
    showOfflineBanner()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Initial state
  if (!navigator.onLine) {
    handleOffline()
  }
}
```

### Periodic Sync Attempt

```javascript
function startPeriodicSync() {
  // Try to sync every 30 seconds when online
  setInterval(async () => {
    if (navigator.onLine) {
      const pending = await getPendingCount()
      if (pending > 0) {
        await processQueue()
      }
    }
  }, 30000)
}
```

### Refresh Stale Data After Sync

```javascript
async function refreshStaleData() {
  const cache = await caches.open('offline-data-v1')
  const keys = await cache.keys()

  for (const request of keys) {
    try {
      const response = await fetch(request)
      if (response.ok) {
        cache.put(request, response)
      }
    } catch {
      // Still offline for this endpoint
    }
  }
}
```

## Offline State UI

### Offline Banner

```html
<div id="offline-banner" class="offline-banner" hidden>
  <span>You are offline. Changes will sync when connection returns.</span>
  <span id="pending-count"></span>
</div>
```

```javascript
function showOfflineBanner() {
  const banner = document.getElementById('offline-banner')
  banner.hidden = false
}

function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner')
  banner.hidden = true
}

async function updatePendingCount() {
  const count = await getPendingCount()
  const el = document.getElementById('pending-count')
  if (el) el.textContent = `${count} pending changes`
}

async function getPendingCount() {
  const db = await getDB()
  return db.count('pending')
}
```

### Sync Status Indicator

```javascript
function createSyncIndicator() {
  const indicator = document.createElement('div')
  indicator.id = 'sync-indicator'
  indicator.className = 'sync-indicator'
  document.body.appendChild(indicator)
}

function updateSyncStatus(status) {
  const indicator = document.getElementById('sync-indicator')
  if (!indicator) return

  indicator.className = `sync-indicator sync-${status}`
  const statusTexts = {
    syncing: 'Syncing...',
    success: 'All changes saved',
    error: 'Sync failed',
    offline: 'Offline — changes queued',
  }
  indicator.textContent = statusTexts[status] || ''
}
```

## Data Integrity

### Idempotency Keys

```javascript
// Client generates unique key per mutation
function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// SW checks for duplicate
async function handleMutation(request, idempotencyKey) {
  const cache = await caches.open('processed-mutations')

  if (await cache.match(idempotencyKey)) {
    // Already processed — skip
    return new Response(JSON.stringify({
      status: 'duplicate',
      message: 'This mutation has already been processed',
    }))
  }

  // Process the mutation
  const response = await fetch(request)

  if (response.ok) {
    // Mark as processed
    cache.put(idempotencyKey, new Response('processed'))
  }

  return response
}
```

### Mutation Ordering

```javascript
async function processQueueInOrder() {
  const db = await getDB()
  const tx = db.transaction('pending', 'readwrite')
  const items = await tx.store.index('createdAt').getAll()

  for (const item of items) {
    // Wait for each mutation to complete before starting next
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        body: JSON.stringify(item.body),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': item.idempotencyKey,
        },
      })

      if (response.ok) {
        await tx.store.delete(item.id)
      } else {
        // Non-retryable error — move to conflicts
        throw new Error(`Mutation failed: ${response.status}`)
      }
    } catch (err) {
      item.retryCount++
      if (item.retryCount >= item.maxRetries) {
        await moveToConflicts(db, item, err.message)
      } else {
        await tx.store.put(item)
      }
    }
  }

  await tx.done
}
```

## Storage Quota Management

```javascript
async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    const percentUsed = (estimate.usage / estimate.quota) * 100
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed,
      isCritical: percentUsed > 80,
    }
  }
  return null
}

async function cleanupOldData() {
  const db = await getDB()
  const tx = db.transaction('pending', 'readwrite')
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
  const index = tx.store.index('createdAt')
  let cursor = await index.openCursor()

  while (cursor) {
    if (cursor.value.createdAt < cutoff) {
      cursor.delete()
    }
    cursor = await cursor.continue()
  }

  await tx.done
}
```

## Testing Offline Sync

### In Browser

```javascript
// Chrome DevTools > Network > Offline
// Or programmatically:
navigator.serviceWorker.controller.postMessage({ type: 'GO_OFFLINE' })

// Simulate delayed online
function simulateOffline(durationMs) {
  window.dispatchEvent(new Event('offline'))
  setTimeout(() => window.dispatchEvent(new Event('online')), durationMs)
}
```

### Automated Tests

```javascript
import { openDB, deleteDB } from 'idb'

describe('Offline Sync', () => {
  beforeEach(async () => {
    await deleteDB(DB_NAME)
  })

  it('queues mutation when offline', async () => {
    // Simulate offline
    window.dispatchEvent(new Event('offline'))

    await enqueueMutation({
      type: 'create',
      endpoint: '/api/todos',
      body: { title: 'Test Todo' },
    })

    const db = await getDB()
    const count = await db.count('pending')
    expect(count).toBe(1)
  })

  it('processes queue when online', async () => {
    const db = await getDB()
    await db.add('pending', {
      type: 'create',
      endpoint: '/api/todos',
      body: { title: 'Test' },
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 5,
      idempotencyKey: 'test-key',
    })

    await processQueue()

    const remaining = await db.count('pending')
    expect(remaining).toBe(0)
  })
})
```

## Security Considerations

1. Idempotency keys prevent duplicate charges or double-creation.
2. Validate all synced data on the server — never trust queued mutations.
3. Encrypt sensitive data before storing in IndexedDB.
4. Clear pending queue on logout or session change.
5. Set reasonable maxRetries to prevent infinite retry loops.
6. Use Content Security Policy headers to restrict SW capabilities.
7. Never store auth tokens in IndexedDB without encryption.
