# Cache Stampede Prevention

## What Is a Cache Stampede

When a cached key expires and many concurrent requests all miss the cache simultaneously, all hitting the database at once. This can overwhelm the database and cascade into a system-wide outage.

```
Time: T    T+1    T+2    T+3    T+4
Req A ──> Cache miss ──> DB query (~50ms)
Req B ──> Cache miss ──> DB query (~50ms)
Req C ──> Cache miss ──> DB query (~50ms)
Req D ──> Cache miss ──> DB query (~50ms)

DB gets 4x load instead of 1x
At scale (1000 req/s): DB sees 1000 req/s instead of 1
```

## Prevention Strategies

| Strategy | Complexity | Effectiveness | Best For |
|----------|-----------|---------------|----------|
| Mutex / Locking | Medium | High | Write-once, read-often |
| Probabilistic (XFetch) | Medium | High | Predictable TTL |
| Stale-While-Revalidate | Low | Very High | Any stale-data-tolerant workload |
| Background Refresh | Low-Medium | High | Known refresh intervals |
| Cache Warmth Before Deploy | Low | Prevents first-hit stampede | Deploy-time |
| Read Replicas | Low | Mitigates impact, doesn't prevent | High-scale systems |

## 1. Mutex / Lock

Single request populates cache, others wait:

```typescript
async function getWithMutex<T>(key: string, fetch: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached);

  const lockKey = `mutex:${key}`;
  const lockTTL = 5000; // Max lock hold time

  const acquired = await redis.set(lockKey, process.pid.toString(), 'NX', 'PX', lockTTL);
  if (acquired) {
    try {
      // Double-check cache (another process may have populated it)
      const recheck = await redis.get(key);
      if (recheck !== null) return JSON.parse(recheck);

      const value = await fetch();
      await redis.set(key, JSON.stringify(value), 'EX', ttl);

      // Store soft-TTL for XFetch downstream
      await redis.set(`meta:${key}`, JSON.stringify({ createdAt: Date.now() }), 'EX', ttl);
      return value;
    } finally {
      await redis.del(lockKey);
    }
  }

  // Backoff and retry
  await sleep(10 + Math.random() * 20);
  return getWithMutex(key, fetch, ttl);
}
```

### Lock Contention
- Set lock TTL generously (enough for slowest fetch + 50% buffer)
- Lock key should include key-specific info for debugging
- Never use blocking locks (should be try-lock with immediate fail)

## 2. Probabilistic Early Expiration (XFetch)

From the Facebook paper: Instead of waiting for expiry, probabilistically refresh early:

```typescript
interface CacheEntry<T> {
  value: T;
  createdAt: number; // Unix ms
  ttl: number; // Original TTL
}

function shouldProbabilisticRefresh(entry: CacheEntry<any>, beta: number = 1.0): boolean {
  const age = (Date.now() - entry.createdAt) / 1000; // Age in seconds
  const remaining = entry.ttl - age;

  if (remaining <= 0) return true; // Actually expired

  // Random decision weighted by how close to expiry
  const probability = Math.exp(-beta * (remaining / entry.ttl));
  return Math.random() < probability;
}

async function getWithXFetch<T>(key: string, fetch: () => Promise<T>, ttl: number): Promise<T> {
  const raw = await redis.get(key);
  if (!raw) {
    const value = await fetch();
    const entry: CacheEntry<T> = { value, createdAt: Date.now(), ttl };
    await redis.set(key, JSON.stringify(entry), 'EX', Math.ceil(ttl * 1.1));
    return value;
  }

  const entry: CacheEntry<T> = JSON.parse(raw);

  if (shouldProbabilisticRefresh(entry)) {
    // Async background refresh — don't block the response
    refreshInBackground(key, fetch, ttl);
  }

  return entry.value;
}
```

### XFetch Tuning
- beta > 1: Fewer early refreshes, higher stampede risk
- beta < 1: More early refreshes, less stampede risk, more backend load
- Default beta = 1.0 for most workloads
- For fast-changing data: beta = 0.5 (more aggressive refresh)
- For slow-changing data: beta = 2.0 (less aggressive)

## 3. Stale-While-Revalidate (SWR)

Serve stale data while refreshing in background:

```typescript
class StaleWhileRevalidateCache {
  async get<T>(key: string, fetch: () => Promise<T>, options: {
    ttl: number;      // Fresh period
    swr: number;      // Stale window (total = ttl + swr)
  }): Promise<{ value: T; stale: boolean }> {
    const raw = await redis.get(key);
    if (!raw) {
      const value = await fetch();
      await redis.set(key, JSON.stringify({
        value,
        refreshedAt: Date.now(),
        stale: false,
      }), 'EX', options.ttl + options.swr);
      return { value, stale: false };
    }

    const entry = JSON.parse(raw);
    const age = (Date.now() - entry.refreshedAt) / 1000;

    if (age < options.ttl) {
      // Fresh
      return { value: entry.value, stale: false };
    }

    // Stale — trigger background refresh
    refreshInBackground(key, fetch, options.ttl + options.swr);
    return { value: entry.value, stale: true };
  }
}
```

### SWR Flow
```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Fresh     │───>│ Stale    │───>│ Expired  │
│ (0 to TTL)│    │ (TTL to  │    │ (TTL+SWR)│
│           │    │  TTL+SWR)│    │          │
└──────────┘    └──────────┘    └──────────┘
                   │
                   └── Background refresh (SWR)
                   Client gets stale data instantly
```

## 4. Background Refresh

Proactively refresh before expiry using scheduled jobs:

```typescript
class BackgroundRefresher {
  private timers = new Map<string, NodeJS.Timeout>();

  scheduleRefresh(key: string, fetch: () => Promise<any>, ttl: number): void {
    const refreshBeforeExpiry = (ttl - 10) * 1000; // Refresh 10s before TTL

    const timer = setTimeout(async () => {
      try {
        const value = await fetch();
        await redis.set(key, JSON.stringify(value), 'EX', ttl);
        // Re-schedule for next cycle
        this.scheduleRefresh(key, fetch, ttl);
      } catch (err) {
        logger.error('Background refresh failed', { key, error: err });
        // Retry sooner on failure
        setTimeout(() => this.scheduleRefresh(key, fetch, ttl), 5000);
      }
    }, refreshBeforeExpiry);

    this.timers.set(key, timer);
  }

  cancelRefresh(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}
```

## 5. Cache Warmth on Deploy

New instances start with empty cache — prime it before accepting traffic:

```yaml
# Kubernetes — preStop hook to warm cache
lifecycle:
  preStop:
    exec:
      command:
        - /bin/sh
        - -c
        - "curl -XPOST http://localhost:3000/__warmup && sleep 5"
```

```typescript
// Warm-up endpoint
app.post('/__warmup', async (req, res) => {
  await Promise.all([
    cacheWarmer.warmPopularProducts(),
    cacheWarmer.warmConfigCache(),
    cacheWarmer.warmStaticPages(),
  ]);
  res.sendStatus(200);
});
```

## Monitoring Stampede Risk

| Metric | Warning | Critical |
|--------|---------|----------|
| Cache miss rate (1min spike) | > 20% | > 50% |
| DB query rate (1min spike) | > 2x baseline | > 5x baseline |
| Key-level miss rate | Single key > 10/s | Single key > 100/s |
| Redis command latency | > 5ms P99 | > 20ms P99 |
