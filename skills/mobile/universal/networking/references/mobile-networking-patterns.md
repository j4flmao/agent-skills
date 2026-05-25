# Mobile Networking Patterns

## API Client Architecture

### Service Layer
```typescript
class ApiClient {
  private baseUrl: string
  private tokenProvider: TokenProvider
  private retryConfig: RetryConfig

  async request<T>(config: RequestConfig): Promise<T> {
    const token = await this.tokenProvider.getValidToken()
    const response = await fetch(`${this.baseUrl}${config.path}`, {
      method: config.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
    })
    return this.handleResponse<T>(response)
  }
}
```

### Repository Pattern
```typescript
class UserRepository {
  constructor(private api: ApiClient, private cache: CacheStore) {}

  async getUser(id: string): Promise<User> {
    const cached = await this.cache.get(`user:${id}`)
    if (cached) return cached

    const user = await this.api.get<User>(`/users/${id}`)
    await this.cache.set(`user:${id}`, user, { ttl: 300 })
    return user
  }
}
```

## Offline-First Networking

### Connectivity Monitoring
```typescript
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncPendingQueue()
  }
})
```

### Request Queue
```typescript
class RequestQueue {
  private queue: PendingRequest[] = []

  async enqueue(request: PendingRequest) {
    this.queue.push(request)
    await persistQueue(this.queue)
  }

  async process() {
    while (this.queue.length > 0) {
      const request = this.queue[0]
      try {
        await this.apiClient.request(request)
        this.queue.shift()
      } catch {
        break // Stop processing on failure
      }
    }
  }
}
```

## Caching Strategies

| Strategy | TTL | Use Case |
|----------|-----|----------|
| Network-only | None | Real-time data |
| Cache-first | 5 min | User profiles |
| Stale-while-revalidate | 10 min | Feed content |
| Cache-only | N/A | Static config |

## Pagination

### Cursor-Based
```typescript
interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}
```

### Offset-Based
```typescript
interface OffsetResponse<T> {
  data: T[]
  page: number
  totalPages: number
  totalItems: number
}
```

## Error Handling

### Retry with Backoff
```typescript
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url)
    } catch (error) {
      if (i === retries - 1) throw error
      await delay(Math.pow(2, i) * 1000) // Exponential backoff
    }
  }
}
```

### Timeout Handling
- Set request timeouts (default 10s for reads, 30s for writes)
- Cancel stale requests when new ones supersede
- Show loading states for slow connections
- Debounce search and autocomplete requests
