# Fallback Strategies

## Patterns

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Stale data | Return last known good data | Cached responses, read replicas |
| Degraded mode | Return partial/limited response | Feature flags, disable non-critical |
| Default value | Return static fallback | Configuration, defaults |
| Null/empty | Return null or empty array | Optional data |
| Redirect | Route to alternative service | failover, active-passive |
| Queue | Defer processing for later | Background retry |
| Throw | Throw custom degraded exception | When silent degradation is worse |

## Implementation

```java
// Java — circuit breaker with stale data fallback
String result = Decorators.ofSupplier(() -> fetchFromPrimary())
    .withCircuitBreaker(circuitBreaker)
    .withFallback(throwable -> {
        logger.warn("Primary failed, using cached data", throwable);
        return cache.get("recent-data");
    })
    .get();

// Without cache, use degraded response
String degraded = Decorators.ofSupplier(() -> fetchFromPrimary())
    .withCircuitBreaker(circuitBreaker)
    .withFallback(throwable -> {
        logger.warn("Primary failed, returning empty response", throwable);
        return "{\"status\": \"degraded\", \"message\": \"Data temporarily unavailable\"}";
    })
    .get();
```

```typescript
// TypeScript — fallback chain
async function fetchWithFallback<T>(
  primary: () => Promise<T>,
  fallbacks: Array<() => Promise<T>>,
): Promise<T> {
  for (const fetcher of [primary, ...fallbacks]) {
    try {
      return await fetcher();
    } catch (err) {
      logger.warn(`Fetcher failed, trying next`, { error: err });
    }
  }
  throw new Error('All fallbacks exhausted');
}

// Usage
const data = await fetchWithFallback(
  () => fetch('/api/users'),
  [
    () => fetch('/api/users-cached'),
    () => Promise.resolve(JSON.parse(localStorage.getItem('users') || '[]')),
  ]
);
```

## Stale Data Strategy

| TTL Category | Fresh Cache | Stale Cache | No Cache |
|-------------|------------|-------------|----------|
| Critical | Return fresh | Block, wait for fresh | Error, no fallback |
| Important | Return fresh | Return stale, refresh async | Default values |
| Background | Return fresh | Return stale | Return empty |
| Optional | Return fresh | Return stale | Return null |

## Degraded Mode

```typescript
// Feature-flag based degradation
interface DegradationConfig {
  disableRecommendations: boolean;
  disableAnalytics: boolean;
  maxItems: number;
  readOnly: boolean;
}

const degradation: DegradationConfig = {
  disableRecommendations: true,
  disableAnalytics: true,
  maxItems: 10,
  readOnly: true
};

// Response with degradation metadata
{
  "data": { ... },
  "meta": {
    "degraded": true,
    "degradedFeatures": ["recommendations", "analytics"]
  }
}
```

## Circuit Breaker Integration

| Circuit State | Fallback Behavior |
|---------------|-------------------|
| CLOSED | Normal call, no fallback |
| OPEN | Immediate fallback, no call attempted |
| HALF_OPEN | Trial call, fallback if fails |

## Logging and Monitoring

```typescript
// Log every fallback activation
function withFallbackLogging<T>(name: string, fn: () => T, fallback: () => T): T {
  try {
    return fn();
  } catch (err) {
    logger.warn(`Fallback activated for ${name}`, {
      error: err.message,
      timestamp: new Date().toISOString()
    });
    metrics.increment(`fallback.${name}`);
    return fallback();
  }
}
```

## Best Practices

- Every circuit breaker must have a fallback
- Log fallback activation for debugging
- Monitor fallback rate — rising trend indicates systemic issue
- Never fallback silently — always degrade visibly
- Stale data fallback requires cache TTL strategy
- Test fallback paths regularly (chaos engineering)
