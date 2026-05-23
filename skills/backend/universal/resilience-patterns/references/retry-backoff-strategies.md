# Retry and Backoff Strategies

## When to Retry
Retry only when the failure is transient and the operation is idempotent (or uses idempotency keys).

**Retryable failures:**
- Network timeouts and connection resets.
- 503 Service Unavailable, 502 Bad Gateway, 504 Gateway Timeout.
- Database deadlocks and transient connection failures.
- Message queue publish failures.

**Never retry:**
- 400 Bad Request (client error, will fail again).
- 401 Unauthorized, 403 Forbidden (auth will not change).
- 404 Not Found (resource does not exist).
- 409 Conflict (state conflict needs human intervention).
- 422 Unprocessable Entity (validation failure).
- Non-idempotent operations without idempotency keys.

## Backoff Strategies

### 1. Fixed Backoff
```
Wait 1s → Retry → Wait 1s → Retry → Wait 1s → Retry
```
Simple but causes thundering herd. Do not use in production.

### 2. Exponential Backoff
```
Wait 100ms → Retry → Wait 200ms → Retry → Wait 400ms → Retry → Wait 800ms
delay = initialDelay * (multiplier ^ attempt)
```
Reduces load on the downstream system. Standard for production.

### 3. Exponential Backoff with Jitter
```
Wait 142ms → Retry → Wait 67ms → Retry → Wait 523ms → Retry → Wait 388ms
delay = (initialDelay * (multiplier ^ attempt)) * random(0.5, 1.5)
```
Jitter spreads retries across time, preventing thundering herd. Always use jitter.

### 4. Full Jitter
```
delay = random(0, cap)
```
Used for extremely high concurrency scenarios. Clients pick a random delay up to a max cap. Maximizes success rate under contention.

### 5. Decorrelated Jitter
```
delay = min(cap, random(baseDelay, delay * 3))
```
Combines exponential backoff with randomness. Recommended by AWS.

### 6. Immediate + Backoff
```
Attempt 1: retry immediately (0ms)
Attempt 2: 100ms
Attempt 3: 200ms
Attempt 4: 400ms
Attempt 5: 800ms
```
Good for transient blips where the first retry often succeeds.

## Common Configurations

### Standard (3 retries, API calls)
```
maxAttempts: 3
initialDelay: 200ms
multiplier: 2
jitter: true
maxDelay: 5s
```

### Conservative (5 retries, critical infrastructure)
```
maxAttempts: 5
initialDelay: 1s
multiplier: 2
jitter: true
maxDelay: 30s
```

### Aggressive (1 retry, low latency)
```
maxAttempts: 2
initialDelay: 50ms
multiplier: 1
jitter: false
```

### Streaming/Batch (max throughput)
```
maxAttempts: 10
initialDelay: 100ms
multiplier: 1.5
jitter: full
maxDelay: 10s
```

## Implementation (JavaScript)
```javascript
async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 200,
    multiplier = 2,
    jitter = true,
    maxDelay = 5000,
  } = options;

  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1) break;
      // Do not retry non-retryable errors
      if (err.status && err.status >= 400 && err.status < 500) break;
      let delay = initialDelay * Math.pow(multiplier, attempt);
      if (jitter) delay = delay * (0.5 + Math.random() * 0.5);
      delay = Math.min(delay, maxDelay);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
```

## Circuit Breaker Integration
Retries and circuit breakers must work together:
```
Attempt 1 → fail     ┐
Attempt 2 → fail     ├─ circuit breaker counts failures
Attempt 3 → fail     ┘
Circuit breaker: OPEN (no more attempts for 30s)
↓ Service recovers ↓
Circuit breaker: HALF-OPEN → test request → success → CLOSED
```

The retry count should increment the circuit breaker's failure count once per attempt (not once per original call).

## Best Practices
- Always cap max delay to avoid absurdly long waits.
- Always use jitter in production systems.
- Log retry attempts with attempt number and delay.
- Monitor retry rate — an increasing rate means a persistent problem.
- Use exponential backoff for most cases, full jitter for extremely high throughput.
- Align retry budget with SLO: if p99 latency is 500ms, do not spend 30s on retries.
