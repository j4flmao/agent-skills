# Cache Testing

## Overview
Test caching layers for correctness, invalidation, edge cases (TTL, stampedes), and fallback behavior when cache is unavailable.

## Unit Testing Cache Strategies

```typescript
describe('CacheAside Pattern', () => {
  let cache: CacheAside;
  let mockStore: jest.Mocked<DataStore>;
  let mockCache: jest.Mocked<CacheProvider>;

  beforeEach(() => {
    mockStore = { get: jest.fn(), set: jest.fn() };
    mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    cache = new CacheAside(mockStore, mockCache, { ttl: 60 });
  });

  it('returns cached data on cache hit', async () => {
    mockCache.get.mockResolvedValue(JSON.stringify({ id: '1', name: 'cached' }));

    const result = await cache.get('key1');

    expect(result).toEqual({ id: '1', name: 'cached' });
    expect(mockStore.get).not.toHaveBeenCalled();
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it('fetches from store on cache miss and caches result', async () => {
    mockCache.get.mockResolvedValue(null);
    mockStore.get.mockResolvedValue({ id: '1', name: 'from-store' });

    const result = await cache.get('key1');

    expect(result).toEqual({ id: '1', name: 'from-store' });
    expect(mockStore.get).toHaveBeenCalledWith('key1');
    expect(mockCache.set).toHaveBeenCalledWith('key1', JSON.stringify({ id: '1', name: 'from-store' }), 60);
  });

  it('caches null results with short TTL', async () => {
    mockCache.get.mockResolvedValue(null);
    mockStore.get.mockResolvedValue(null);

    const result = await cache.get('nonexistent');

    expect(result).toBeNull();
    expect(mockCache.set).toHaveBeenCalledWith('key1', JSON.stringify(null), 10); // Short TTL for null
  });
});
```

## Testing Cache Invalidation

```typescript
describe('Cache Invalidation', () => {
  it('invalidates specific key on update', async () => {
    const cache = new WriteThroughCache(mockStore, mockCache);

    await cache.update('user:123', { name: 'Updated' });

    expect(mockCache.del).toHaveBeenCalledWith('user:123');
    expect(mockStore.set).toHaveBeenCalledWith('user:123', { name: 'Updated' });
  });

  it('invalidates by pattern on related data change', async () => {
    const cache = new WriteThroughCache(mockStore, mockCache);
    mockCache.keys.mockResolvedValue(['user:123:orders', 'user:123:cart']);

    await cache.invalidateByPattern('user:123:*');

    expect(mockCache.keys).toHaveBeenCalledWith('user:123:*');
    expect(mockCache.del).toHaveBeenCalledWith('user:123:orders', 'user:123:cart');
  });

  it('does not invalidate unrelated keys', async () => {
    const cache = new WriteThroughCache(mockStore, mockCache);
    mockCache.keys.mockResolvedValue(['user:123:orders']);

    await cache.invalidateByPattern('user:other:*');

    expect(mockCache.del).not.toHaveBeenCalledWith('user:123:orders');
  });
});
```

## Testing TTL Behavior

```typescript
describe('TTL Behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('expires cache entry after TTL', async () => {
    mockCache.get.mockResolvedValue(JSON.stringify({ data: 'fresh' }));

    // First call — cache hit
    const result1 = await cache.get('key1');
    expect(result1).toEqual({ data: 'fresh' });

    // Advance time past TTL
    jest.advanceTimersByTime(61000);

    // Cache should be expired now
    mockCache.get.mockResolvedValue(null);
    mockStore.get.mockResolvedValue({ data: 'fresh-from-store' });

    const result2 = await cache.get('key1');
    expect(result2).toEqual({ data: 'fresh-from-store' });
    expect(mockStore.get).toHaveBeenCalledTimes(1); // Only fetched once after expiry
  });

  it('supports different TTLs per data type', () => {
    const configs = {
      user: { ttl: 300 },   // 5 min
      product: { ttl: 600 }, // 10 min
      session: { ttl: 60 },  // 1 min
      config: { ttl: 3600 }, // 1 hour
    };

    for (const [type, expected] of Object.entries(configs)) {
      expect(configs[type].ttl).toBe(expected.ttl);
    }
  });
});
```

## Testing Stampede Prevention

```typescript
describe('Stampede Prevention', () => {
  it('prevents concurrent recomputation of same key', async () => {
    mockCache.get.mockResolvedValue(null); // Cache miss
    mockStore.get.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 100));
      return { data: 'computed' };
    });

    // Simulate 5 concurrent requests for the same key
    const requests = Array(5).fill(null).map(() => cache.get('key1'));
    const results = await Promise.all(requests);

    expect(results.every(r => r?.data === 'computed')).toBe(true);
    expect(mockStore.get).toHaveBeenCalledTimes(1); // Only one computation
  });

  it('uses stale data during recomputation to serve fast', async () => {
    mockCache.get
      .mockResolvedValueOnce(JSON.stringify({ data: 'stale' })) // First call — stale data exists
      .mockResolvedValueOnce(null); // Lock acquisition

    mockStore.get.mockResolvedValue({ data: 'fresh' });

    const result = await cache.getWithStale('key1');

    // Should return stale data immediately while recomputing in background
    expect(result).toEqual({ data: 'stale' });

    // After recomputation, cache should have fresh data
    await new Promise(r => setTimeout(r, 50));
    expect(mockCache.set).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({ data: 'fresh' }),
      expect.any(Number)
    );
  });
});
```

## Testing Cache Fallback

```typescript
describe('Cache Unavailability', () => {
  it('degrades gracefully when cache is down', async () => {
    mockCache.get.mockRejectedValue(new Error('Redis connection refused'));

    const result = await cache.get('key1');

    // Should fall back to store directly
    expect(mockStore.get).toHaveBeenCalledWith('key1');
    expect(result).toBeDefined();
    expect(result).not.toBeInstanceOf(Error); // Should not propagate cache error
  });

  it('falls back to stale cache when store is down', async () => {
    mockCache.get.mockResolvedValue(JSON.stringify({ data: 'stale-cache' }));
    mockStore.get.mockRejectedValue(new Error('Database connection refused'));

    const result = await cache.getFallback('key1');

    expect(result).toEqual({ data: 'stale-cache' });
  });

  it('writes through cache even when cache set fails', async () => {
    mockCache.set.mockRejectedValue(new Error('Cache write failed'));
    mockStore.set.mockResolvedValue(undefined);

    await expect(cache.set('key1', { data: 'value' })).resolves.not.toThrow();
    expect(mockStore.set).toHaveBeenCalledWith('key1', { data: 'value' });
  });
});
```

## Key Points
- Test cache hit/miss behavior: correct data returned from each path
- Verify invalidation clears the right keys without affecting unrelated data
- Test TTL expiry and different TTLs per data type
- Validate stampede prevention: concurrent requests produce a single computation
- Test graceful degradation when cache or store is unavailable
