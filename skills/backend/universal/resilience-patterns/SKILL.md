---
name: backend-resilience-patterns
description: >
  Use this skill when the user says 'resilience', 'circuit breaker', 'retry', 'bulkhead', 'timeout', 'fallback', 'resilience4j', 'fault tolerance', 'rate limiter', 'backoff', 'retry strategy', 'bulkhead pattern'. This skill applies production fault-tolerance patterns: circuit breaker, retry with backoff, bulkhead isolation, timeouts, and fallback handlers. Applies to any backend stack. Do NOT use for: infrastructure-level resiliency (K8s liveness probes), database replication, or frontend error handling.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, resilience, fault-tolerance, circuit-breaker]
---

# Backend Resilience Patterns

## Purpose
Protect backend services from cascading failures by applying circuit breakers, retries with backoff, bulkheads, timeouts, and fallbacks. Resilience is not optional — every external call must be wrapped in fault-tolerance patterns.

## Agent Protocol

### Trigger
Exact user phrases: "resilience", "circuit breaker", "retry", "bulkhead", "timeout", "fallback", "resilience4j", "fault tolerance", "retry strategy", "backoff", "rate limiter".

### Input Context
- Type of external calls (HTTP, database, message queue).
- Existing retry or timeout configuration.
- SLAs and latency requirements.

### Output Artifact
Configuration snippets or code. No file unless requested.

### Response Format
```
Pattern: {circuit-breaker|retry|bulkhead|timeout|fallback}
Config: {key parameters and values}
```

### Completion Criteria
- [ ] At least timeout configured for every external call.
- [ ] Retry with exponential backoff and jitter configured.
- [ ] Circuit breaker defined per dependency (not one for all).
- [ ] Fallback handler defined for every circuit breaker.
- [ ] Bulkhead isolation applied to thread pools where needed.

### Max Response Length
4 lines per pattern. 20 lines for full configuration.

## Architecture Decision Tree

### Which Resilience Pattern?

```
What type of failure are you protecting against?
  ├── Slow responses (server busy, GC pause, overloaded)
  │   └── Timeout + Circuit Breaker
  ├── Transient failures (network blip, connection reset, DNS failure)
  │   └── Retry with backoff + Circuit Breaker
  ├── Resource exhaustion (thread pool, connection pool, memory)
  │   └── Bulkhead + Circuit Breaker
  ├── Downstream service completely down
  │   └── Circuit Breaker + Fallback
  └── Client sending too many requests
      └── Rate Limiter + Bulkhead
```

### Pattern Composition Order

```
How should patterns be composed?
  ┌─────────────────────────────────┐
  │ 1. Timeout (outermost)          │  ← Fail fast
  │ 2. Bulkhead (semaphore limit)   │  ← Isolate resources
  │ 3. Circuit Breaker              │  ← Stop cascading failures
  │ 4. Retry (innermost)            │  ← Retry transient failures
  │ 5. Fallback (catch-all)         │  ← Degrade gracefully
  └─────────────────────────────────┘
```

### Timeout Strategy Decision

```
What is the nature of the downstream call?
  ├── Internal service (same datacenter) → 2-5s
  ├── External API (third-party) → 5-10s
  ├── Database query → 5-30s (depending on query)
  ├── Batch/analytics query → 30-60s
  └── Must be LOWER than the caller's timeout of YOU
```

## Workflow

### Step 1: Configure Timeouts
Every external call needs a timeout. No exceptions.

```yaml
timeouts:
  http_internal: { connect: 2s, read: 5s, write: 5s }
  http_external: { connect: 5s, read: 10s, write: 10s }
  database: { query: 10s, transaction: 30s }
  message_queue: { publish: 5s, consume: 30s }
```

### Step 2: Configure Retries
```yaml
retry:
  max_attempts: 3
  backoff: exponential
  initial_delay: 100ms
  multiplier: 2
  jitter: 50ms
  max_delay: 10s
  retry_on:
    - 5xx (except 500 if idempotent)
    - network_error
    - timeout
  do_not_retry:
    - 4xx (client errors)
    - 400 (bad request — will always fail)
    - 401/403 (auth — will always fail)
    - 404 (not found — will always fail)
    - 409 (conflict — needs human resolution)
```

```javascript
async function retryWithBackoff(fn, options = {}) {
  const { maxAttempts = 3, initialDelay = 100, maxDelay = 10000 } = options;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      if (!isRetryable(error)) throw error;
      const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = delay * 0.5 * Math.random();
      await sleep(delay + jitter);
    }
  }
}
```

### Step 3: Configure Circuit Breaker
```yaml
circuit_breaker:
  per_dependency: true                    # One CB per downstream service
  sliding_window_size: 10                 # Number of calls to evaluate
  minimum_calls: 5                        # Minimum before evaluating
  failure_rate_threshold: 50              # % failures to open circuit
  wait_duration_open: 30s                 # Time before half-open
  half_open_max_calls: 3                  # Probe requests in half-open
  record_slow_calls: true                 # Treat slow calls as failures
  slow_call_duration_threshold: 5s        # What counts as "slow"
```

```typescript
// Node.js implementation using opossum
import CircuitBreaker from 'opossum';

const circuitBreaker = new CircuitBreaker(callExternalService, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 5,
});

circuitBreaker.fallback(() => {
  return { status: 'degraded', cachedData: getStaleData() };
});

circuitBreaker.on('open', () => logger.warn('Circuit breaker opened for payment-service'));
circuitBreaker.on('halfOpen', () => logger.info('Circuit breaker half-open for payment-service'));
circuitBreaker.on('close', () => logger.info('Circuit breaker closed for payment-service'));
```

### Step 4: Configure Bulkhead
```yaml
bulkhead:
  type: semaphore                      # semaphore (lightweight) or thread_pool
  http_calls:                          # All external HTTP calls share this pool
    max_concurrent: 20
    max_wait_duration: 500ms
  database_calls:                      # All database calls share this pool
    max_concurrent: 10
    max_wait_duration: 1s
```

```java
// Java (Resilience4j) — Bulkhead with thread pool
ThreadPoolBulkheadConfig bulkheadConfig = ThreadPoolBulkheadConfig.custom()
    .maxThreadPoolSize(10)
    .coreThreadPoolSize(5)
    .queueCapacity(20)
    .build();

ThreadPoolBulkhead bulkhead = ThreadPoolBulkhead.of("payment-service", bulkheadConfig);

// Decorate supplier
Supplier<Payment> decorated = Decorators.ofSupplier(() -> paymentService.charge(orderId))
    .withThreadPoolBulkhead(bulkhead)
    .withCircuitBreaker(circuitBreaker)
    .decorate();
```

### Step 5: Define Fallbacks
```typescript
interface FallbackStrategy<T> {
  // Degraded response
  static: () => T;
  // Stale/cached data
  cached: (key: string) => Promise<T | null>;
  // Default value
  default: T;
  // Graceful degradation
  graceful: (partial: Partial<T>) => T;
}

// Example: fallback from cache
async function getUserWithFallback(userId: string): Promise<User> {
  try {
    return await userService.getUser(userId);
  } catch {
    logger.warn('User service unavailable, serving cached data', { userId });
    const cached = await cache.get(`user:${userId}`);
    if (cached) return cached;
    return { id: userId, name: 'Unknown', status: 'degraded' };
  }
}
```

## Implementation Patterns

### Resilience4j (Java/Kotlin)
```java
// Decorated chain
CircuitBreaker cb = CircuitBreaker.ofDefaults("paymentService");
Retry retry = Retry.ofDefaults("paymentService");
Bulkhead bh = Bulkhead.ofDefaults("paymentService");
TimeLimiter tl = TimeLimiter.of(Duration.ofSeconds(5));

Supplier<Payment> supplier = () -> client.charge(orderId);
Supplier<Payment> decorated = Decorators.ofSupplier(supplier)
    .withCircuitBreaker(cb)
    .withRetry(retry)
    .withBulkhead(bh)
    .withTimeLimiter(tl)
    .withFallback(asList(cb, retry, bh, tl), e -> Payment.degraded())
    .decorate();

CompletableFuture<Payment> future = CompletableFuture.supplyAsync(decorated);
```

### Polly (.NET)
```csharp
var pipeline = new ResiliencePipelineBuilder<Payment>()
    .AddRetry(new RetryStrategyOptions<Payment> {
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential,
        Delay = TimeSpan.FromMilliseconds(100),
    })
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions<Payment> {
        FailureRatio = 0.5,
        SamplingDuration = TimeSpan.FromSeconds(30),
        BreakDuration = TimeSpan.FromSeconds(30),
    })
    .AddTimeout(TimeSpan.FromSeconds(5))
    .Build();

var payment = await pipeline.ExecuteAsync(ct => client.charge(orderId, ct));
```

### Python Pattern
```python
import backoff
import circuitbreaker

@backoff.on_exception(backoff.expo, requests.exceptions.RequestException, max_tries=3)
@circuitbreaker.circuit(failure_threshold=5, recovery_timeout=30)
def charge_payment(order_id: str, amount: float) -> Payment:
    response = requests.post(f"{PAYMENT_API}/charge", json={"order_id": order_id, "amount": amount})
    response.raise_for_status()
    return Payment(**response.json())
```

## Production Considerations

### Circuit Breaker Metrics
| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Circuit breaker state | open/closed/half-open | State=OPEN > 5 min |
| Call count | Total calls in window | N/A (baseline) |
| Failure rate | % of failed calls | > 30% |
| Slow call rate | % of slow calls | > 20% |
| Rejection count | Calls rejected due to open CB | > 0 (investigate) |

### Retry Budget
- Set a maximum retry budget per request: 3 retries max
- Set a maximum retry budget per time window: 1000 retries/min/service
- Monitor retry ratio: retries / total calls. High ratio = systematic failure

### Timeout Hierarchy
```
Client timeout (browser/mobile): 30s
  → API Gateway timeout: 25s
    → Service A timeout: 20s
      → Service A → Service B call: 10s
        → Service B internal timeout: 8s
          → Service B → Database call: 5s
```
Each layer must timeout before the layer above it. Otherwise, useless waiting occurs.

## Anti-Patterns

1. **Retrying non-idempotent operations**: Retrying a POST without idempotency creates duplicates. Always pair retries with idempotency keys.
2. **Infinite retries**: Always set a maximum retry count. Infinite retries during an outage worsen the situation.
3. **No jitter**: Without jitter, all retries happen at the same time, creating thundering herd. Always add ±50% jitter.
4. **Global circuit breaker**: One CB for all downstream calls means one failing service takes down all external communication. Use per-dependency CBs.
5. **No fallback**: A circuit breaker without a fallback is just a fancy failure. Always define what happens when the circuit is open.
6. **Retrying 4xx errors**: A 400 Bad Request will never succeed on retry. Only retry 5xx and network errors.
7. **Bulkhead without queuing**: Rejecting calls immediately when the bulkhead is full causes client-side retry storms. Use a small queue with bounded wait.
8. **Timeouts longer than upstream timeouts**: If your timeout is 30s and the upstream is 10s, the upstream already timed out and your 30s wait is wasted.

## Performance

### Pattern Overhead
| Pattern | Latency Impact | Memory Impact |
|---------|---------------|---------------|
| Timeout | None (unless triggered) | Minimal |
| Retry | Adds delay between attempts | Minimal |
| Circuit Breaker | <0.1ms per call (state check) | Per-circuit state |
| Bulkhead (semaphore) | <0.01ms | Minimal |
| Bulkhead (thread pool) | ~0.1ms queue | Per-pool threads |
| Fallback | None (unless triggered) | Per-fallback data |

### Recommended Defaults
| Pattern | Default | Notes |
|---------|---------|-------|
| Timeout | 5s | Adjust per dependency |
| Retry | 3 attempts, 100ms base | Exponential, +jitter |
| Circuit Breaker | 50% threshold, 30s open | 10-slot window |
| Bulkhead | 20 concurrent | Per dependency group |
| Fallback | Degraded response | Never crash |

## Security

- Circuit breaker state changes should be logged as security events
- Fallback responses should not leak internal state
- Retry backoff should not create timing side channels
- Timeout values should be consistent across deployments to avoid timing attacks

## Rules
- Timeout is mandatory. Always lower than the upstream timeout.
- Retries must be idempotent-safe. Never retry non-idempotent operations without idempotency keys.
- Circuit breaker per dependency, not per service.
- Bulkhead shared thread pools only within the same dependency class (e.g. all DB calls, all HTTP calls).
- Fallbacks must degrade gracefully, never crash.
- Log every circuit breaker state change.
- Monitor circuit breaker metrics (state, call count, failure ratio).
- Always add jitter to retry delays — never retry without jitter.
- Set per-retry timeout in addition to overall timeout.

## References
  - references/bulkhead-patterns.md — Bulkhead Patterns
  - references/circuit-breaker-patterns.md — Circuit Breaker Patterns
  - references/fallback-strategies.md — Fallback Strategies
  - references/resilience-cache.md — Caching as a Resilience Pattern
  - references/resilience-testing.md — Resilience Testing
  - references/resilience4j-guide.md — Resilience4j Implementation Guide
  - references/retry-backoff-strategies.md — Retry and Backoff Strategies
  - references/timeout-retry-patterns.md — Timeout and Retry Patterns
## Handoff
No artifact produced unless requested.
Next skill: openapi-documentation — document the resilient API endpoints.
Carry forward: timeout values, retry configuration, circuit breaker thresholds.
