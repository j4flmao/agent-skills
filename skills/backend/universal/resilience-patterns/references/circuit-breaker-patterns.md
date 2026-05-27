# Circuit Breaker Patterns

## State Machine

### Circuit Breaker States
```text
CLOSED → OPEN → HALF_OPEN → CLOSED
                 ↓
               OPEN (if failure persists)
```

### State Implementation
```typescript
enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;

  constructor(
    private config: {
      failureThreshold: number;
      successThreshold: number;
      waitDurationMs: number;
      halfOpenMaxCalls: number;
    }
  ) {}

  async call<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    }
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successCount = 0;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
    this.failureCount = 0;
    this.lastFailureTime = Date.now();
    console.log(`Circuit breaker tripped after ${this.config.failureThreshold} failures`);
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    console.log('Circuit breaker reset to CLOSED');
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.waitDurationMs;
  }
}
```

## Per-Dependency Isolation

### Dependency-Specific Circuit Breakers
```typescript
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  get(name: string): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker({
          failureThreshold: 5,
          successThreshold: 3,
          waitDurationMs: 30000,
          halfOpenMaxCalls: 3,
        })
      );
    }
    return this.breakers.get(name)!;
  }

  getState(name: string): CircuitState {
    return this.breakers.get(name)?.getState() || CircuitState.CLOSED;
  }

  getAllStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {};
    for (const [name, breaker] of this.breakers) {
      states[name] = breaker.getState();
    }
    return states;
  }
}
```

## Configuration

### Dynamic Configuration
```typescript
interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  waitDurationMs: number;
  halfOpenMaxCalls: number;
  slidingWindowSize: number;
  minimumCalls: number;
  recordExceptions: string[];
  ignoreExceptions: string[];
}

const defaultConfigs: Record<string, CircuitBreakerConfig> = {
  paymentGateway: {
    name: 'paymentGateway',
    failureThreshold: 3,
    successThreshold: 2,
    waitDurationMs: 60000,
    halfOpenMaxCalls: 2,
    slidingWindowSize: 10,
    minimumCalls: 5,
    recordExceptions: ['TimeoutError', 'ConnectionError'],
    ignoreExceptions: ['ValidationError', 'NotFoundError'],
  },
  database: {
    name: 'database',
    failureThreshold: 10,
    successThreshold: 5,
    waitDurationMs: 30000,
    halfOpenMaxCalls: 5,
    slidingWindowSize: 20,
    minimumCalls: 10,
    recordExceptions: ['DatabaseTimeout', 'ConnectionPoolExhausted'],
    ignoreExceptions: ['QueryError'],
  },
};
```

## Monitoring

### Metrics Collection
```typescript
class CircuitBreakerMetrics {
  private metrics: Map<string, {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    fallbackCalls: number;
    stateTransitions: number;
  }> = new Map();

  recordCall(name: string, success: boolean): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        fallbackCalls: 0,
        stateTransitions: 0,
      });
    }

    const metric = this.metrics.get(name)!;
    metric.totalCalls++;

    if (success) {
      metric.successfulCalls++;
    } else {
      metric.failedCalls++;
    }
  }

  getMetrics(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, metric] of this.metrics) {
      stats[name] = {
        totalCalls: metric.totalCalls,
        successRate: (metric.successfulCalls / metric.totalCalls) * 100,
        failureRate: (metric.failedCalls / metric.totalCalls) * 100,
        fallbackRate: (metric.fallbackCalls / metric.totalCalls) * 100,
      };
    }
    return stats;
  }
}
```

## Key Points
- Implement circuit breakers per dependency, not per service
- Use three states: CLOSED (normal), OPEN (failing), HALF_OPEN (probing recovery)
- Configure failure thresholds based on dependency criticality
- Use sliding window for failure rate calculation instead of fixed counts
- Implement half-open probing to test if the dependency has recovered
- Log every circuit breaker state change for debugging
- Monitor circuit breaker metrics (state, call count, failure ratio)
- Expose circuit breaker health through health check endpoints
- Always provide fallback handlers for open circuits
- Configure different parameters for different dependency types
