# Lock Contention Analysis

## Overview
Analyze and reduce distributed lock contention: monitoring metrics, contention patterns, backoff strategies, mitigation techniques, and lock granularity optimization.

## Contention Metrics

```typescript
class LockMetricsCollector {
  private metrics: LockMetric[] = [];
  private pending: Map<string, number> = new Map();

  recordAcquisitionStart(lockName: string): void {
    this.pending.set(lockName, Date.now());
  }

  recordAcquisitionEnd(lockName: string, acquired: boolean): void {
    const start = this.pending.get(lockName);
    if (!start) return;
    this.pending.delete(lockName);

    const waitTime = Date.now() - start;
    this.metrics.push({
      lockName,
      waitTimeMs: waitTime,
      acquired,
      timestamp: new Date(),
    });

    // Report to monitoring
    metrics.timing('lock.wait_time', waitTime, [lockName]);
    metrics.increment('lock.acquisitions', { acquired }, [lockName]);
  }

  getContentionReport(timeWindowMs: number = 60000): ContentionReport {
    const window = Date.now() - timeWindowMs;
    const recent = this.metrics.filter(m => m.timestamp.getTime() > window);

    // Group by lock name
    const byLock = new Map<string, LockStat>();
    for (const m of recent) {
      if (!byLock.has(m.lockName)) {
        byLock.set(m.lockName, {
          totalAttempts: 0,
          failedAttempts: 0,
          totalWaitMs: 0,
          maxWaitMs: 0,
        });
      }
      const stat = byLock.get(m.lockName)!;
      stat.totalAttempts++;
      if (!m.acquired) stat.failedAttempts++;
      stat.totalWaitMs += m.waitTimeMs;
      stat.maxWaitMs = Math.max(stat.maxWaitMs, m.waitTimeMs);
    }

    return {
      period: `${timeWindowMs}ms`,
      totalAcquisitions: recent.length,
      failureRate: recent.filter(m => !m.acquired).length / recent.length,
      byLock: Object.fromEntries(byLock),
    };
  }
}
```

## Backoff Strategies

```typescript
interface BackoffStrategy {
  delay(attempt: number): number;
  maxAttempts: number;
}

class ExponentialBackoff implements BackoffStrategy {
  constructor(
    private baseMs: number = 100,
    private maxMs: number = 5000,
    readonly maxAttempts: number = 5
  ) {}

  delay(attempt: number): number {
    const exp = Math.min(this.baseMs * Math.pow(2, attempt), this.maxMs);
    // Add jitter: ±25%
    const jitter = exp * (0.75 + Math.random() * 0.5);
    return Math.round(jitter);
  }
}

class EqualJitterBackoff implements BackoffStrategy {
  constructor(
    private baseMs: number = 200,
    private capMs: number = 3000,
    readonly maxAttempts: number = 3
  ) {}

  delay(attempt: number): number {
    const exp = Math.min(this.baseMs * Math.pow(2, attempt), this.capMs);
    const halfJitter = exp / 2;
    return Math.round(halfJitter + Math.random() * halfJitter);
  }
}

class DecorrelatedJitterBackoff implements BackoffStrategy {
  private previousMs: number = 0;

  constructor(
    private baseMs: number = 100,
    private capMs: number = 10000,
    readonly maxAttempts: number = 10
  ) {}

  delay(attempt: number): number {
    if (attempt === 0) return 0;
    if (this.previousMs === 0) this.previousMs = this.baseMs;

    const next = Math.min(this.capMs, Math.random() * this.previousMs * 3);
    this.previousMs = next;
    return Math.round(next);
  }
}
```

## Contention Reduction Techniques

```typescript
class ContentionManager {
  async acquireWithFallback(
    lockName: string,
    ttlMs: number,
    criticalSection: () => Promise<void>
  ): Promise<void> {
    const backoff = new ExponentialBackoff(50, 2000, 3);

    for (let attempt = 0; attempt < backoff.maxAttempts; attempt++) {
      try {
        const lock = await lockProvider.acquire(lockName, ttlMs);
        try {
          await criticalSection();
        } finally {
          await lock.release().catch(() => {});
        }
        return; // Success
      } catch (error) {
        if (attempt === backoff.maxAttempts - 1) {
          // Last attempt failed — use fallback
          return this.executeFallback(lockName);
        }
        await sleep(backoff.delay(attempt));
      }
    }
  }

  private async executeFallback(lockName: string): Promise<void> {
    // Fallback strategies:
    // 1. Queue the operation for later processing
    await this.deadLetterQueue.send({
      type: 'lock_fallback',
      resource: lockName,
      timestamp: new Date(),
    });

    // 2. Use optimistic concurrency instead
    // 3. Read stale data if acceptable
    // 4. Degrade gracefully
  }
}

// Lock striping — reduce contention on hot locks
class StripedLockManager {
  private stripeCount: number;

  constructor(stripeCount: number = 16) {
    this.stripeCount = stripeCount;
  }

  getStripeLock(resourceId: string): string {
    const stripeIndex = Math.abs(this.hashCode(resourceId)) % this.stripeCount;
    return `lock-stripe:${stripeIndex}`;
  }

  async acquireStripeLock(
    resourceId: string,
    ttlMs: number
  ): Promise<Lock> {
    const stripeLock = this.getStripeLock(resourceId);
    return lockProvider.acquire(stripeLock, ttlMs);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
```

## Lock Granularity Optimization

```typescript
// Fine-grained locking
class FineGrainedInventoryLock {
  async updateStock(productId: string, quantity: number): Promise<void> {
    // Lock only this specific product
    const lock = await lockProvider.acquire(
      `inventory:product:${productId}`,
      2000
    );
    try {
      const current = await db.query(
        'SELECT quantity FROM inventory WHERE product_id = $1',
        [productId]
      );
      await db.query(
        'UPDATE inventory SET quantity = $1 WHERE product_id = $2',
        [current.rows[0].quantity + quantity, productId]
      );
    } finally {
      await lock.release();
    }
  }
}

// Coarse-grained locking (when operations span multiple resources)
class CoarseGrainedBatchLock {
  async bulkUpdateStock(
    updates: Array<{ productId: string; quantity: number }>
  ): Promise<void> {
    // One lock for the entire batch
    const batchHash = this.hashBatch(updates);
    const lock = await lockProvider.acquire(
      `inventory:batch:${batchHash}`,
      5000
    );
    try {
      for (const update of updates) {
        await this.updateSingleProduct(update.productId, update.quantity);
      }
    } finally {
      await lock.release();
    }
  }
}

// Read-write lock pattern
class ReadWriteLock {
  private readersActive = 0;
  private writerActive = false;
  private writeQueue: Array<() => void> = [];

  async acquireRead(): Promise<ReleaseFn> {
    while (this.writerActive || this.writeQueue.length > 0) {
      await sleep(10);
    }
    this.readersActive++;
    return () => { this.readersActive--; };
  }

  async acquireWrite(): Promise<ReleaseFn> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (!this.writerActive && this.readersActive === 0) {
          this.writerActive = true;
          resolve(() => { this.writerActive = false; });
        }
      };
      this.writeQueue.push(tryAcquire);
      tryAcquire();
    });
  }
}
```

## Contention Alerting

```typescript
class ContentionAlertManager {
  private readonly WARN_THRESHOLD_MS = 500;
  private readonly CRITICAL_THRESHOLD_MS = 2000;
  private readonly FAILURE_RATE_THRESHOLD = 0.1; // 10%

  async evaluate(lockName: string, report: ContentionReport): Promise<void> {
    const stat = report.byLock[lockName];
    if (!stat) return;

    const avgWait = stat.totalWaitMs / stat.totalAttempts;
    const failureRate = stat.failedAttempts / stat.totalAttempts;

    if (avgWait > this.CRITICAL_THRESHOLD_MS) {
      await AlertService.alert({
        severity: 'CRITICAL',
        title: `High lock contention: ${lockName}`,
        message: `Average wait time ${avgWait}ms (threshold: ${this.CRITICAL_THRESHOLD_MS}ms)`,
        metrics: stat,
      });
    } else if (avgWait > this.WARN_THRESHOLD_MS) {
      await AlertService.alert({
        severity: 'WARNING',
        title: `Elevated lock contention: ${lockName}`,
        message: `Average wait time ${avgWait}ms`,
        metrics: stat,
      });
    }

    if (failureRate > this.FAILURE_RATE_THRESHOLD) {
      await AlertService.alert({
        severity: 'HIGH',
        title: `High lock failure rate: ${lockName}`,
        message: `Failure rate ${(failureRate * 100).toFixed(1)}%`,
        metrics: stat,
      });
    }
  }
}
```

## Key Points
- Track lock wait time, failure rate, and contention per lock name
- Use exponential backoff with jitter to reduce thundering herd
- Apply lock striping to distribute hot lock contention across stripes
- Choose appropriate granularity: fine-grained per resource, coarse-grained per batch
- Implement read-write locks when reads vastly outnumber writes
- Set contention thresholds and alert when exceeded
- Fall back to dead letter queues or optimistic concurrency on persistent contention
