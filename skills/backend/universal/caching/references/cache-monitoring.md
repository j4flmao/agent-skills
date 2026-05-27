# Cache Monitoring

## Overview
Monitor cache performance: hit ratio, latency, memory usage, eviction rates, and stampede events. Set up alerts for cache degradation.

## Cache Metrics Collection

```typescript
class CacheMetrics {
  private readonly metrics: Map<string, CacheMetricData> = new Map();

  recordHit(cacheName: string, latencyMs: number): void {
    const metric = this.getMetric(cacheName);
    metric.hits++;
    metric.totalLatency += latencyMs;
    metric.hitCount++;
  }

  recordMiss(cacheName: string, latencyMs: number): void {
    const metric = this.getMetric(cacheName);
    metric.misses++;
    metric.totalLatency += latencyMs;
  }

  recordStampede(cacheName: string): void {
    const metric = this.getMetric(cacheName);
    metric.stampedeCount++;
  }

  getHitRatio(cacheName: string): number {
    const metric = this.metrics.get(cacheName);
    if (!metric) return 0;
    const total = metric.hits + metric.misses;
    return total > 0 ? metric.hits / total : 0;
  }

  getAverageLatency(cacheName: string): number {
    const metric = this.metrics.get(cacheName);
    if (!metric) return 0;
    const total = metric.hits + metric.misses;
    return total > 0 ? metric.totalLatency / total : 0;
  }

  reset(): void {
    this.metrics.clear();
  }

  private getMetric(name: string): CacheMetricData {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { hits: 0, misses: 0, totalLatency: 0, stampedeCount: 0 });
    }
    return this.metrics.get(name)!;
  }
}

interface CacheMetricData {
  hits: number;
  misses: number;
  totalLatency: number;
  stampedeCount: number;
}
```

## Redis Monitoring

```typescript
// Redis INFO command parsing
class RedisMonitor {
  async getMemoryUsage(): Promise<RedisMemoryInfo> {
    const info = await redis.info('memory');
    return {
      usedMemory: this.parseBytes(info, 'used_memory'),
      peakMemory: this.parseBytes(info, 'used_memory_peak'),
      fragmentationRatio: parseFloat(this.parseValue(info, 'mem_fragmentation_ratio')),
      allocatedMemory: this.parseBytes(info, 'used_memory_rss'),
      datasetSize: this.parseBytes(info, 'used_memory_dataset'),
      overhead: this.parseBytes(info, 'used_memory_overhead'),
    };
  }

  async getKeyspaceStats(): Promise<KeyspaceStats> {
    const info = await redis.info('keyspace');
    const stats: KeyspaceStats = {};
    const dbRegex = /db(\d+):keys=(\d+),expires=(\d+),avg_ttl=(\d+)/g;
    let match;
    while ((match = dbRegex.exec(info)) !== null) {
      stats[`db${match[1]}`] = {
        keys: parseInt(match[2]),
        expires: parseInt(match[3]),
        avgTtl: parseInt(match[4]),
      };
    }
    return stats;
  }

  async getEvictionRate(): Promise<number> {
    const before = await redis.get('evicted_keys');
    await new Promise(r => setTimeout(r, 5000));
    const after = await redis.get('evicted_keys');
    return parseInt(after) - parseInt(before);
  }
}
```

## Cache Stampede Prevention

```typescript
class StampedePrevention {
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl: number,
    lockTtl = 1000
  ): Promise<T> {
    // Try cache first
    let value = await this.redis.get(key);
    if (value) {
      // Check if approaching expiry (probabilistic early expiration)
      const remainingTtl = await this.redis.ttl(key);
      if (remainingTtl > ttl * 0.2) {
        return JSON.parse(value);
      }
    }

    // Acquire lock for recomputation
    const lockKey = `lock:${key}`;
    const lock = await this.redis.set(lockKey, '1', 'NX', 'PX', lockTtl);

    if (lock) {
      // We are the recomputation thread
      try {
        value = await compute();
        await this.redis.setex(key, ttl, JSON.stringify(value));
        return value;
      } finally {
        await this.redis.del(lockKey);
      }
    }

    // Another thread is recomputing, wait for it
    if (!value) {
      // Use exponential backoff to wait for first result
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 50 * Math.pow(2, i)));
        value = await this.redis.get(key);
        if (value) return JSON.parse(value);
      }
      // Timeout — compute anyway
      value = await compute();
      await this.redis.setex(key, ttl, JSON.stringify(value));
    }

    return typeof value === 'string' ? JSON.parse(value) : value;
  }
}
```

## Cache Cleaning and Eviction

```typescript
class CacheMaintenance {
  async cleanExpiredKeys(pattern: string, batchSize = 1000): Promise<number> {
    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor, 'MATCH', pattern, 'COUNT', batchSize
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const key of keys) {
          // Check TTL and delete if expired
          const ttl = await this.redis.ttl(key);
          if (ttl === -2 || ttl === -1) {
            pipeline.del(key);
          }
        }
        const results = await pipeline.exec();
        totalDeleted += results.filter(r => r[1] > 0).length;
      }
    } while (cursor !== '0');

    return totalDeleted;
  }

  async getCacheSizes(pattern: string): Promise<CacheSizeReport> {
    let cursor = '0';
    let totalKeys = 0;
    let totalSize = 0;
    let largestKey = { key: '', size: 0 };

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern);
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const key of keys) {
          pipeline.memory('USAGE', key);
          pipeline.ttl(key);
        }
        const results = await pipeline.exec();
        for (let i = 0; i < keys.length; i++) {
          const size = results[i * 2][1] || 0;
          totalSize += size;
          totalKeys++;
          if (size > largestKey.size) {
            largestKey = { key: keys[i], size };
          }
        }
      }
    } while (cursor !== '0');

    return { totalKeys, totalSizeBytes: totalSize, largestKey };
  }
}
```

## Alerting

```typescript
class CacheAlertService {
  private readonly thresholds = {
    hitRatio: 0.8,          // Below 80% is warning
    latencyMs: 50,           // Above 50ms is warning
    evictionRate: 100,       // More than 100 evictions/5min is warning
    stampedeCount: 5,        // More than 5 stampedes/5min is critical
    memoryUsagePercent: 80,  // Above 80% is warning, 90% is critical
  };

  async evaluateCacheHealth(cacheName: string): Promise<HealthStatus> {
    const hitRatio = cacheMetrics.getHitRatio(cacheName);
    const latency = cacheMetrics.getAverageLatency(cacheName);
    const redisMonitor = new RedisMonitor();

    const issues: string[] = [];
    let severity: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (hitRatio < this.thresholds.hitRatio) {
      issues.push(`Hit ratio ${(hitRatio * 100).toFixed(1)}% below threshold ${this.thresholds.hitRatio * 100}%`);
      severity = 'warning';
    }

    if (latency > this.thresholds.latencyMs) {
      issues.push(`Average latency ${latency.toFixed(0)}ms above threshold ${this.thresholds.latencyMs}ms`);
      severity = 'warning';
    }

    const evictionRate = await redisMonitor.getEvictionRate();
    if (evictionRate > this.thresholds.evictionRate) {
      issues.push(`Eviction rate ${evictionRate}/5min above threshold`);
      severity = evictionRate > this.thresholds.evictionRate * 2 ? 'critical' : 'warning';
    }

    const memoryInfo = await redisMonitor.getMemoryUsage();
    const memPercent = (memoryInfo.usedMemory / memoryInfo.allocatedMemory) * 100;
    if (memPercent > 90) {
      issues.push(`Memory usage ${memPercent.toFixed(0)}% is critical`);
      severity = 'critical';
    } else if (memPercent > 80) {
      issues.push(`Memory usage ${memPercent.toFixed(0)}% is high`);
      if (severity === 'healthy') severity = 'warning';
    }

    return { cacheName, severity, issues, timestamp: new Date() };
  }
}
```

## Key Points
- Track hit ratio (<80% is problematic), latency, memory usage
- Monitor eviction rates and stampede events
- Implement probabilistic early expiration to prevent stampedes
- Use Redis INFO commands for memory and keyspace stats
- Alert on cache degradation: low hit ratio, high latency, memory pressure
