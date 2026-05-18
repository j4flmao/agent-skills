# Rate Limiting Algorithms

## Token Bucket

### How It Works
```
Bucket capacity: 10 tokens
Refill rate:     1 token per second

On each request:
  - If tokens available → consume 1 token → allow
  - If no tokens → deny

Tokens refill at fixed rate up to capacity (burst).
```

### State
```
tokens: current token count (float — allows partial refills over time)
last_refill: timestamp of last refill
capacity: max tokens (burst size)
refill_rate: tokens per second
```

### Behavior
```
Burst: up to `capacity` requests allowed instantly (bucket starts full).
Steady-state: `refill_rate` requests per second sustained.

Example: capacity=10, refill_rate=1
  Burst: 10 requests immediately
  Sustained: 1 req/s after burst consumed
```

### Advantages
- Allows bursts up to capacity.
- Simple, well-understood.
- No edge-case spikes at window boundaries.
- Easy to implement in Redis (Lua script).

### Disadvantages
- Burst can overwhelm downstream if capacity too large.
- Two buckets with same refill rate but different capacities behave differently on burst.

### Use Case
- APIs with bursty but generally predictable traffic.
- General-purpose rate limiting.

## Leaky Bucket

### How It Works
```
Leak rate: 1 request per second
Queue depth: 10 requests

On each request:
  - If queue is full → deny
  - Else → add to queue
  - Process at fixed rate (leak rate)
```

### State
```
queue: buffer of pending requests
leak_rate: processing rate (items per second)
queue_limit: max buffer size
```

### Behavior
```
Burst: requests beyond queue capacity are denied immediately.
Steady-state: `leak_rate` requests per second, no bursts.

Example: leak_rate=1, queue_limit=10
  Burst: 10 requests queued, processed over 10 seconds
  11th request: denied immediately
```

### Advantages
- Smooth outgoing traffic — predictable load on downstream.
- Protects downstream systems that can't handle bursts.

### Disadvantages
- Increased latency (requests wait in queue).
- Need to handle queue overflow (drop or reject).

### Use Case
- Protecting a database or downstream API that can't handle spikes.
- Queue-based processing systems.

## Fixed Window

### How It Works
```
Window: 1 minute
Limit: 100 requests
Counter key: user:{id}:minute:{timestamp_rounded_to_minute}

On each request:
  - Get counter for current window
  - If counter < limit → increment → allow
  - Else → deny
```

### State
```
counter: request count for current window
window_start: start of current time window
```

### Behavior
```
Spike at boundary:
  Window 1 (10:00:00 - 10:00:59): 100 requests at 10:00:58
  Window 2 (10:01:00 - 10:01:59): 100 requests at 10:01:02
  200 requests in 4 seconds, all allowed.

Example: limit=100/min
  Allowed in last 2 seconds of window + first 2 seconds of next = 200 in ~4s
```

### Advantages
- Extremely simple to implement.
- Minimal storage (one counter per window).
- Low CPU overhead.

### Disadvantages
- Boundary spikes: double throughput at window edges.
- Unfair: all requests can cluster at start of window.

### Use Case
- Simple rate limits where spikes are acceptable.
- UI dashboards ("1000 requests per hour").
- Staged as first iteration before moving to sliding window.

## Sliding Window Log

### How It Works
```
Window: 60 seconds
Limit: 100 requests

For each request:
  timestamp = now
  ZREMRANGEBYSCORE key 0 now-60
  count = ZCARD key
  if count < limit:
    ZADD key timestamp timestamp
    ALLOW
  else:
    DENY
```

### State
```
sorted set: timestamps of requests within window (one entry per request)
```

### Behavior
```
Precise rolling window: no boundary spikes.
Each window is truly the last N seconds.

Example: limit=100/min
  At 10:00:30: 30 requests in last 60 seconds → allowed
  At 10:00:31: 31 requests → based on actual count, not bucket reset
```

### Advantages
- Most accurate algorithm (truly rolling window).
- No boundary spikes.

### Disadvantages
- Memory grows with request rate (one entry per request).
- Slower than counter-based approaches.
- Needs periodic cleanup (ZREMRANGEBYSCORE).

### Use Case
- High-precision rate limiting where fairness matters.
- Production API gateways.

## Sliding Window Counter

### How It Works
```
Window: 60 seconds. Granularity: 1 second sub-windows.

Maintain counts per sub-window:
  {key}:{current_second}: count

On each request:
  sum all sub-window counts in last 60 seconds
  if sum < limit → allow
  else → deny
```

### State
```
counters[sub_window] = request_count
```

### Approximation
```
Sliding window counter approximates sliding window log.
  - Lower memory than sliding window log
  - Slightly less accurate (off by at most 1 sub-window)
```

### Advantages
- Good accuracy (close to true sliding window).
- Lower memory than sliding window log (aggregated per second).

### Disadvantages
- Slightly less accurate than sliding window log.

### Use Case
- Good balance of accuracy and memory.
- Production use where sliding window log is too memory-heavy.

## Algorithm Selection

| Algorithm | Burst | Accuracy | Memory | CPU | Use Case |
|-----------|-------|----------|--------|-----|----------|
| Token Bucket | Yes | Good | Low | Low | General API, bursty traffic |
| Leaky Bucket | No | Good | Low | Low | Protect fragile downstream |
| Fixed Window | Yes | Poor | Low | Low | Simple quotas, dashboards |
| Sliding Window Log | Yes | Best | High | Medium | High-precision, fairness-critical |
| Sliding Window Counter | Yes | Good | Medium | Medium | Good balance |

**Recommendation**: Start with Token Bucket for most cases. Use Sliding Window Log for precision-critical APIs. Use Leaky Bucket when protecting fragile downstream systems.
