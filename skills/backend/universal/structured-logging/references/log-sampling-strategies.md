# Log Sampling Strategies

Log sampling reduces storage costs and noise while preserving signal.

## Head-Based Sampling

Decide whether to sample at the start of a request:

```typescript
class HeadBasedSampler {
  private rate: number;

  constructor(rate: number = 0.1) {
    this.rate = rate; // 10% sample rate
  }

  shouldSample(traceId: string): boolean {
    // Consistent hashing: same trace always gets same decision
    const hash = this.hash(traceId);
    return hash < this.rate * Number.MAX_SAFE_INTEGER;
  }

  private hash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

## Tail-Based Sampling

Record everything but decide what to keep after the request completes:

```typescript
class TailBasedSampler {
  private buffer = new Map<string, LogEntry[]>();
  private maxBufferSize = 10000;

  // Buffer all logs for a request
  record(entry: LogEntry): void {
    const key = entry['trace.id'];
    if (!this.buffer.has(key)) {
      this.buffer.set(key, []);
    }
    const entries = this.buffer.get(key)!;
    entries.push(entry);

    // Evict oldest if buffer exceeds limit
    if (this.buffer.size > this.maxBufferSize) {
      const oldest = this.buffer.keys().next().value!;
      this.buffer.delete(oldest);
    }
  }

  // Decide what to keep when request completes
  async flush(traceId: string): Promise<void> {
    const entries = this.buffer.get(traceId);
    if (!entries) return;

    const hasError = entries.some(e => e['log.level'] === 'ERROR' || e['log.level'] === 'FATAL');
    const isSlow = entries.some(e => (e['event.duration'] ?? 0) > 1000);
    const isSample = Math.random() < 0.1;

    if (hasError || isSlow || isSample) {
      // Write to long-term storage
      await this.storage.write(entries);
    }

    this.buffer.delete(traceId);
  }
}
```

## Dynamic Sampling

Adjust sample rate based on traffic patterns:

```typescript
class DynamicSampler {
  private baseRate = 0.1;
  private errorRate = 0;
  private requestRate = 0;

  getSampleRate(): number {
    // Increase sampling when error rate is high
    if (this.errorRate > 0.05) {
      return Math.min(1.0, this.baseRate * 10);
    }

    // Decrease sampling during traffic spikes
    if (this.requestRate > 10000) {
      return this.baseRate * 0.5;
    }

    return this.baseRate;
  }

  recordMetrics(requestCount: number, errorCount: number): void {
    this.requestRate = requestCount;
    this.errorRate = requestCount > 0 ? errorCount / requestCount : 0;
  }
}
```

## Per-Level Sampling

Sample different log levels at different rates:

```typescript
const LEVEL_SAMPLING = {
  FATAL: { rate: 1.0, always: true },
  ERROR: { rate: 1.0, always: true },
  WARN:  { rate: 0.5, always: false },
  INFO:  { rate: 0.1, always: false },
  DEBUG: { rate: 0.01, always: false },
  TRACE: { rate: 0.001, always: false },
};

class LevelAwareSampler {
  shouldLog(level: string, traceId: string): boolean {
    const config = LEVEL_SAMPLING[level];
    if (!config || config.always) return true;

    const hash = this.hash(traceId);
    return hash < config.rate * Number.MAX_SAFE_INTEGER;
  }

  private hash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

## Header-Activated Debug Logging

Enable debug logging for specific requests on-demand:

```typescript
function debugLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.headers['x-debug-log']) {
    // Enable full logging for this request
    asyncLocalStorage.run({ debugMode: true, traceId: req.headers['x-trace-id'] }, () => {
      next();
    });
  } else {
    next();
  }
}

// Usage in logger
function shouldDebug(): boolean {
  const ctx = asyncLocalStorage.getStore();
  if (ctx?.debugMode) return true;

  // Random sampling
  return Math.random() < 0.01;
}
```

## Key Points
- Head-based sampling: decide at request start, consistent by trace ID
- Tail-based sampling: buffer all logs, keep based on result (error/slow/sample)
- Dynamic sampling: adjust rates based on error rate and traffic volume
- Per-level sampling: log all errors, sample info/debug progressively
- Header-activated debug: enable full logging for specific requests
- Use consistent hashing so the same trace always gets the same sampling decision
- Always sample 100% of errors and warnings regardless of sampling rate
- Combine strategies: head-based for control, tail-based for completeness
