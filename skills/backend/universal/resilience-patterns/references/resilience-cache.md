# Caching as a Resilience Pattern

Caching prevents cascading failures by shielding downstream services from excessive load.

## Stale-While-Revalidate

Serve stale cache immediately while refreshing in background:

```typescript
class StaleWhileRevalidateCache<T> {
  private cache = new Map<string, { value: T; staleAt: number; expiresAt: number }>();

  async get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry || now > entry.expiresAt) {
      // Cache miss or fully expired — fetch synchronously
      const value = await fetcher();
      this.set(key, value);
      return value;
    }

    if (now > entry.staleAt) {
      // Stale but not expired — revalidate in background
      fetcher().then(value => this.set(key, value)).catch(() => {}); // ignore background errors
    }

    return entry.value;
  }

  private set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      staleAt: Date.now() + 5000,    // stale after 5s
      expiresAt: Date.now() + 60000,  // expire after 60s
    });
  }
}
```

## Circuit Breaker with Cache Fallback

When circuit breaker is open, serve cached data:

```typescript
class CacheBackedCircuitBreaker {
  async call<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.circuitBreaker.isOpen()) {
      const cached = await this.cache.get(key);
      if (cached) {
        logger.warn({ key }, 'Circuit breaker open — serving stale cache');
        return cached;
      }
      throw new Error('Circuit breaker open and no cached data');
    }

    try {
      const result = await fn();
      await this.cache.set(key, result);
      this.circuitBreaker.onSuccess();
      return result;
    } catch (err) {
      this.circuitBreaker.onFailure();
      const cached = await this.cache.get(key);
      if (cached) {
        logger.warn({ key }, 'Service failed — serving stale cache fallback');
        return cached;
      }
      throw err;
    }
  }
}
```

## Bulkhead with Cache Integration

Each bulkhead has its own cache to reduce dependency calls:

```typescript
class BulkheadWithCache {
  private bulkheads = new Map<string, { semaphore: Semaphore; cache: MemoryCache }>();

  async call<T>(dependency: string, fn: () => Promise<T>): Promise<T> {
    const bulkhead = this.bulkheads.get(dependency)!;

    // Try cache first
    const cached = await bulkhead.cache.get<T>(dependency);
    if (cached) return cached;

    // Acquire semaphore
    await bulkhead.semaphore.acquire();
    try {
      const result = await fn();
      await bulkhead.cache.set(dependency, result);
      return result;
    } finally {
      bulkhead.semaphore.release();
    }
  }
}
```

## Timeout with Cached Default

When timeout occurs, return cached value instead of error:

```typescript
async function fetchWithTimeoutAndCache<T>(
  key: string,
  fn: () => Promise<T>,
  cache: Cache,
  timeoutMs: number
): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    await cache.set(key, result);
    return result;
  } catch (err) {
    const cached = await cache.get<T>(key);
    if (cached) {
      logger.warn({ key, error: err.message }, 'Timeout — serving cached fallback');
      return cached;
    }
    throw err;
  }
}
```

## Cache Healing

After a failure, gradually restore cache freshness:

```typescript
class HealingCache {
  private degradedKeys = new Set<string>();

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached && this.degradedKeys.has(key)) {
      // In healing mode — attempt refresh but tolerate failure
      try {
        const fresh = await fetcher();
        this.cache.set(key, fresh);
        this.degradedKeys.delete(key);
        return fresh;
      } catch {
        return cached; // still degraded
      }
    }
    // Normal flow
    return cached ?? await fetcher();
  }

  markDegraded(key: string): void {
    this.degradedKeys.add(key);
  }
}
```

## Key Points
- Serve stale cache while revalidating in background
- Use cached data as fallback when circuit breaker is open
- Each bulkhead should have its own cache to reduce dependency calls
- Return cached values on timeout rather than errors
- Use cache healing to gradually restore freshness after failures
- Monitor cache hit rates as a resilience health metric
- Set appropriate TTLs: short for fast-changing data, longer for stable data
