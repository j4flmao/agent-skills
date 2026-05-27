# Timeout and Retry Patterns

## Timeout Configuration

### Per-Dependency Timeouts
```typescript
interface TimeoutConfig {
  connectTimeoutMs: number;
  readTimeoutMs: number;
  writeTimeoutMs: number;
  totalTimeoutMs: number;
}

const timeoutConfigs: Record<string, TimeoutConfig> = {
  internalHttp: {
    connectTimeoutMs: 2000,
    readTimeoutMs: 5000,
    writeTimeoutMs: 3000,
    totalTimeoutMs: 8000,
  },
  externalHttp: {
    connectTimeoutMs: 5000,
    readTimeoutMs: 10000,
    writeTimeoutMs: 5000,
    totalTimeoutMs: 15000,
  },
  database: {
    connectTimeoutMs: 5000,
    readTimeoutMs: 30000,
    writeTimeoutMs: 10000,
    totalTimeoutMs: 35000,
  },
  cache: {
    connectTimeoutMs: 1000,
    readTimeoutMs: 2000,
    writeTimeoutMs: 1000,
    totalTimeoutMs: 3000,
  },
};
```

### HTTP Client Timeout
```typescript
import axios from 'axios';

function createClient(config: TimeoutConfig) {
  return axios.create({
    timeout: config.totalTimeoutMs,
    timeoutErrorMessage: 'Request timed out',
    transitional: {
      clarifyTimeoutError: true,
    },
    transformResponse: [
      (data) => {
        // Ensure timeout exceeded errors are handled
        return data;
      },
    ],
  });
}

async function callWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}
```

## Exponential Backoff

### Backoff Strategies
```typescript
interface BackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  jitter: boolean;
  jitterFactor: number;
}

const backoffStrategies: Record<string, BackoffConfig> = {
  exponential: {
    initialDelayMs: 100,
    maxDelayMs: 10000,
    multiplier: 2,
    jitter: true,
    jitterFactor: 0.1,
  },
  linear: {
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    multiplier: 1,
    jitter: true,
    jitterFactor: 0.2,
  },
  immediate: {
    initialDelayMs: 0,
    maxDelayMs: 0,
    multiplier: 1,
    jitter: false,
    jitterFactor: 0,
  },
};

function calculateBackoff(attempt: number, config: BackoffConfig): number {
  let delay = config.initialDelayMs * Math.pow(config.multiplier, attempt);
  delay = Math.min(delay, config.maxDelayMs);

  if (config.jitter) {
    const jitter = delay * config.jitterFactor * (Math.random() * 2 - 1);
    delay += jitter;
  }

  return Math.max(0, delay);
}
```

### Retry Implementation
```typescript
class RetryHandler {
  constructor(
    private config: BackoffConfig,
    private options: {
      maxRetries: number;
      retryableErrors: Array<new (...args: any[]) => Error>;
      onRetry?: (attempt: number, error: Error, delay: number) => void;
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error)) {
          throw error;
        }

        if (attempt === this.options.maxRetries) {
          throw new MaxRetriesExceededError(
            `Failed after ${this.options.maxRetries} retries`,
            { cause: error }
          );
        }

        const delay = calculateBackoff(attempt, this.config);
        this.options.onRetry?.(attempt, error, delay);

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryable(error: Error): boolean {
    return this.options.retryableErrors.some(
      (errorType) => error instanceof errorType
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Retry with Circuit Breaker
```typescript
class ResilientClient {
  constructor(
    private circuitBreaker: CircuitBreaker,
    private retryHandler: RetryHandler
  ) {}

  async call<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.call(
      () => this.retryHandler.execute(fn),
      fallback
    );
  }
}
```

## Deadline Propagation

### Context-Based Deadlines
```typescript
interface DeadlineContext {
  deadline: number;
  remaining: number;
}

class DeadlineManager {
  private storage = new AsyncLocalStorage<DeadlineContext>();

  withDeadline<T>(timeoutMs: number, fn: () => Promise<T>): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    return this.storage.run({ deadline, remaining: timeoutMs }, fn);
  }

  getRemainingTime(): number {
    const context = this.storage.getStore();
    if (!context) return Infinity;
    return Math.max(0, context.deadline - Date.now());
  }

  checkDeadline(): void {
    if (this.getRemainingTime() <= 0) {
      throw new DeadlineExceededError('Deadline exceeded');
    }
  }
}

// Usage in nested calls
async function handleRequest(req: Request, res: Response) {
  await deadlineManager.withDeadline(5000, async () => {
    const user = await userService.getUser(req.params.id);
    deadlineManager.checkDeadline();

    const orders = await orderService.getOrders(user.id);
    deadlineManager.checkDeadline();

    res.json({ user, orders });
  });
}
```

## Retry Budget

```typescript
class RetryBudget {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number,
    private refillInterval: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  allowRetry(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refillTokens = Math.floor(elapsed / this.refillInterval) * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + refillTokens);
    this.lastRefill = now;
  }
}
```

## Key Points
- Configure per-dependency timeouts with separate connect/read/write values
- Always set a total timeout that is lower than the upstream service timeout
- Use exponential backoff with jitter to prevent thundering herd problems
- Classify errors as retryable (5xx, network, timeout) and non-retryable (4xx)
- Implement retry budgets to limit retry volume during fault storms
- Propagate deadlines through the call chain to enforce end-to-end timeouts
- Combine retries with circuit breakers to fail fast when services are degraded
- Monitor retry counts and success rates to detect chronic failures
- Log each retry attempt with attempt number, delay, and error context
- Implement idempotency-safe retries by using idempotency keys
