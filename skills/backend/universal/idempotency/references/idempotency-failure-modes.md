# Idempotency Failure Modes

## Overview
Handle idempotency failure scenarios: storage failures, race conditions, partial failures, network partitions, and recovery strategies.

## Storage Failure Handling

```typescript
class ResilientIdempotencyStore {
  private primaryStore: IdempotencyStore;
  private fallbackStore: IdempotencyStore;

  async get(key: string): Promise<IdempotencyRecord | null> {
    try {
      return await this.primaryStore.get(key);
    } catch (error) {
      logger.warn('Primary idempotency store failed, trying fallback', { error });
      try {
        return await this.fallbackStore.get(key);
      } catch {
        // Both stores failed — allow through to avoid blocking all traffic
        return null;
      }
    }
  }

  async set(key: string, record: IdempotencyRecord): Promise<void> {
    const errors: Error[] = [];

    // Write to primary
    try {
      await this.primaryStore.set(key, record);
    } catch (error) {
      errors.push(error as Error);
    }

    // Write to fallback (async, fire-and-forget)
    this.fallbackStore.set(key, record).catch(error => {
      logger.error('Fallback idempotency store write failed', { error });
    });

    if (errors.length > 0) {
      // Primary failed — we might have a cache miss on retry
      // But we avoid double-processing by checking business-level idempotency
      logger.warn('Primary store write failed, relying on fallback', { key });
    }
  }
}
```

## Race Condition Recovery

```typescript
class RaceConditionHandler {
  private readonly locks = new Map<string, Promise<void>>();

  async executeWithKey<T>(
    key: string,
    operation: () => Promise<T>,
    timeoutMs = 5000
  ): Promise<T> {
    // Wait if another operation with same key is in progress
    while (this.locks.has(key)) {
      try {
        await Promise.race([
          this.locks.get(key)!,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Lock wait timeout')), timeoutMs)),
        ]);
      } catch {
        // Lock timed out — break and try to acquire
        break;
      }
    }

    // Acquire local lock
    const operationPromise = operation().finally(() => {
      this.locks.delete(key);
    });
    this.locks.set(key, operationPromise);

    try {
      return await operationPromise;
    } catch (error) {
      this.locks.delete(key);
      throw error;
    }
  }
}
```

## Partial Failure Recovery

```typescript
class PartialFailureRecovery {
  async processIdempotentOperation(key: string, operation: Operation): Promise<Result> {
    const record = await this.store.get(key);

    if (record) {
      if (record.status === 'completed') {
        return { data: record.response, idempotent: true };
      }

      if (record.status === 'failed') {
        // Previous attempt failed — retry the operation
        return this.executeWithRecovery(key, operation);
      }

      if (record.status === 'pending') {
        // Previous attempt might still be in progress
        // Wait and check again
        await this.waitForCompletion(key, 5000);
        const updatedRecord = await this.store.get(key);
        if (updatedRecord?.status === 'completed') {
          return { data: updatedRecord.response, idempotent: true };
        }
        // Assume it failed and retry
      }
    }

    return this.executeWithRecovery(key, operation);
  }

  private async executeWithRecovery(
    key: string,
    operation: Operation
  ): Promise<Result> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Mark as pending before execution
        await this.store.set(key, { status: 'pending' });

        const result = await operation.execute();

        // Mark as completed with response
        await this.store.set(key, {
          status: 'completed',
          response: result,
        });

        return { data: result, idempotent: false };
      } catch (error) {
        lastError = error as Error;

        // Mark as failed
        await this.store.set(key, {
          status: 'failed',
          error: (error as Error).message,
          attempt,
        });

        // Don't retry validation errors
        if (this.isValidationError(error)) throw error;

        // Exponential backoff
        await sleep(Math.pow(2, attempt) * 100);
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }
}
```

## Network Partition Scenarios

```typescript
class NetworkPartitionHandler {
  // Scenario: Client sends request, server processes it, but response is lost
  // Client retries with same idempotency key
  async handleLostResponse(
    key: string,
    request: Request
  ): Promise<Response> {
    const existing = await this.store.get(key);

    if (existing) {
      // Server already processed this key
      if (existing.status === 'completed') {
        // Return cached response
        return { status: existing.responseStatus, body: existing.responseBody, idempotent: true };
      }
      if (existing.status === 'pending') {
        // Operation might be in progress — wait
        const completed = await this.waitForCompletion(key, 10000);
        if (completed) {
          return { status: existing.responseStatus, body: existing.responseBody, idempotent: true };
        }
        // Pending but no completion — might be stale lock
        // Proceed with caution
      }
    }

    // No existing record or expired — process as new
    return this.executeWithRecovery(key, request);
  }
}
```

## Monitoring Failure Modes

```typescript
class IdempotencyFailureMonitor {
  async trackFailure(mode: FailureMode, key: string, error: Error): Promise<void> {
    metrics.increment('idempotency.failure', 1, {
      mode,
      errorType: error.constructor.name,
    });

    if (this.isSevere(mode)) {
      await AlertService.alert({
        severity: 'HIGH',
        title: `Idempotency failure: ${mode}`,
        message: `Key: ${key}, Error: ${error.message}`,
        metadata: { mode, key, error: error.message },
      });
    }
  }

  async analyzeFailureRate(windowMs = 3600000): Promise<FailureAnalysis> {
    const failures = await this.getRecentFailures(windowMs);
    const totalRequests = await this.getTotalRequests(windowMs);

    return {
      failureRate: totalRequests > 0 ? failures.length / totalRequests : 0,
      totalFailures: failures.length,
      totalRequests,
      byMode: this.groupBy(failures, 'mode'),
      windowMs,
    };
  }
}
```

## Key Points
- Implement fallback store when primary idempotency storage fails
- Use local locking to prevent in-process race conditions for same key
- Handle partial failures: retry failed operations with backoff
- Handle lost responses: server caches response, returns on retry
- Handle stale pending states with timeout and cautious retry
- Track failure modes: storage failure, race condition, partial failure, network partition
- Alert on severe failures (storage unavailability, frequent race conditions)
- Analyze failure rate trends to detect systemic issues
