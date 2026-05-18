# Backpressure

## What Is Backpressure
Backpressure is the mechanism by which a system signals upstream that it cannot handle more load. It propagates the pressure backward through the call chain, preventing overload and allowing graceful degradation.

```
Backpressure flow:

Consumer overloaded → signals upstream → upstream slows or stops → propagates to client
```

## Backpressure Signals

### HTTP 429 Too Many Requests
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{"error": "rate_limited", "retry_after": 30}
```

### gRPC RESOURCE_EXHAUSTED
```go
return nil, status.Error(codes.ResourceExhausted, "too many requests")
```

### TCP Backpressure
```
Full TCP receive buffer → kernel signals sender to slow down.
  - No application code needed for in-process connections.
  - For inter-service: TCP window size limits flow naturally.
```

### Message Queue Backpressure
```
Consumer:
  - Stop acknowledging messages (QoS = 0).
  - Queue fills → broker can't accept more → producer blocked.

Kafka:
  - Consumer lag increases → producer still writes (no direct backpressure).
  - Mitigation: monitor lag, alert, scale consumers.
```

## Levels of Backpressure

### Level 1: Reject (Fail Fast)
```
Simplest form. When overloaded, return error immediately.

  if (load > threshold) {
      return 429;
  }

  Pros: immediate feedback, minimal overhead.
  Cons: client must retry, can cause retry storms.
```

### Level 2: Queue
```
Buffer excess requests. Process when capacity available.

  request → queue → worker pool → process
  Queue full → reject (429)

  Pros: absorbs bursts, no dropped requests within queue capacity.
  Cons: adds latency, queue grows → memory pressure.
```

### Level 3: Load Shed
```
Drop low-priority requests when overloaded.

  if (load > critical) {
      if (request.priority < HIGH) {
          drop(); // 503 Service Unavailable
      } else {
          process(); // high priority still served
      }
  }

  Pros: protects critical paths during overload.
  Cons: needs priority classification, non-critical users get worse experience.
```

### Level 4: Adaptive Throttling
```
Dynamically adjust request rate based on system health.

  if (error_rate > threshold || latency_p99 > target) {
      max_concurrent *= 0.9;  // reduce
  } else {
      max_concurrent *= 1.01; // slowly increase
  }

  Pros: self-tuning, handles traffic patterns automatically.
  Cons: more complex, needs careful tuning of adaptation parameters.
```

## Circuit Breaker Pattern

### States
```
Closed:     Normal operation. Requests pass through.
Open:       Failures above threshold. Requests fail fast.
Half-Open:  Testing if service recovered. Allow limited requests.

           ┌──────────┐
           │  Closed  │
           └────┬─────┘
                │ failures > threshold
                ▼
           ┌──────────┐
           │   Open   │
           └────┬─────┘
                │ timeout expires
                ▼
           ┌───────────┐
           │ Half-Open │ (success → Closed, failure → Open)
           └───────────┘
```

### Implementation
```python
class CircuitBreaker:
    def __init__(self, threshold=5, timeout=30):
        self.threshold = threshold      # failures before open
        self.timeout = timeout          # seconds before half-open
        self.failures = 0
        self.state = "closed"
        self.last_failure_time = 0

    def call(self, func, *args, **kwargs):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "half-open"
            else:
                raise CircuitBreakerOpenError()

        try:
            result = func(*args, **kwargs)
            if self.state == "half-open":
                self.state = "closed"
                self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.threshold:
                self.state = "open"
            raise e
```

## Client-Side Backpressure

### Detect Overload
```python
# Track latency and errors per downstream service
class ServiceHealth:
    def __init__(self, window_seconds=60):
        self.latencies = []   # rolling window of latencies
        self.errors = 0
        self.total = 0

    def record(self, latency, is_error):
        self.latencies.append((time.time(), latency))
        if is_error:
            self.errors += 1
        self.total += 1
        self._expire()

    def is_healthy(self):
        """Heuristic: if recent error rate > 10% or p99 > 2s, not healthy"""
        if self.total == 0:
            return True
        error_rate = self.errors / self.total
        p99 = self._compute_p99()
        return error_rate < 0.1 and p99 < 2000

    def throttle_factor(self):
        """Return 0.0 (stop) to 1.0 (full speed)"""
        if not self.is_healthy():
            return 0.5  # slow down
        return 1.0
```

### Adaptive Client
```python
async def call_downstream(service):
    health = health_registry[service]

    if not health.is_healthy():
        await asyncio.sleep(0.1 * (1 / health.throttle_factor()))

    start = time.time()
    try:
        result = await http_client.get(service.url)
        health.record(time.time() - start, False)
        return result
    except Exception as e:
        health.record(time.time() - start, True)
        raise
```

## Monitoring Backpressure
```
Track:
  - 429 / 503 response rate
  - Circuit breaker state changes (open / half-open / closed)
  - Queue depth (if using queued backpressure)
  - Downstream latency p50, p95, p99
  - Downstream error rate
  - Client-side throttle factor (1.0 = full, 0.0 = stopped)

Alert on:
  - Circuit breaker open for > 5 minutes
  - Queue depth > 80% of capacity
  - Downstream p99 latency > 2x baseline
  - 429/503 rate > 5% of total requests
```
