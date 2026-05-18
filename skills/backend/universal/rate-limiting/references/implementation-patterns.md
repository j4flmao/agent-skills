# Rate Limiting Implementation Patterns

## Middleware-Based (API Gateway)

### Architecture
```
Client → API Gateway → Rate Limit Middleware → Backend Service
```

```go
func RateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        key := fmt.Sprintf("ratelimit:%s:%s", r.URL.Path, getUserID(r))
        allowed, remaining, reset := rateLimiter.Allow(key)

        w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
        w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
        w.Header().Set("X-RateLimit-Reset", strconv.Itoa(reset))

        if !allowed {
            w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
            w.WriteHeader(http.StatusTooManyRequests)
            json.NewEncoder(w).Encode(errorResponse)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

### Placement
```
Edge (API Gateway / Reverse Proxy):
  - First line of defense
  - Reject before backend sees request
  - Examples: Nginx, Kong, Envoy, AWS API Gateway

Application Middleware:
  - Second line of defense
  - Handles application-specific limits (per user, per endpoint)
  - Can bypass gateway limits for internal endpoints
```

## Per-User Rate Limiting

### Key Design
```
Key pattern: {scope}:{identifier}:{resource}

Examples:
  user:{user_id}:api              → per-user global API limit
  user:{user_id}:endpoint:{path}  → per-user per-endpoint limit
  ip:{client_ip}:api              → per-IP global limit
  apikey:{api_key}:api            → per-API-key limit
  subscription:{tier}:global      → per-tier global limit (shared across all users on that tier)
```

### Multi-Tier Limits
```
Apply multiple limits simultaneously:
  1. Global: 10000 req/min → protects infrastructure
  2. Per-user: 1000 req/min → fairness between users
  3. Per-endpoint: 100 req/min → protects specific endpoints

Allow request only if ALL limits pass. Otherwise deny with the strictest limit info.

Implementation:
  for _, limiter := range rateLimiters {
      allowed, info := limiter.Allow(key)
      if !allowed {
          return false, info  // deny with the first failed limit info
      }
  }
  return true
```

## Concurrent Request Limit

### What It Limits
```
Not request rate (req/s), but active concurrent requests.

Use case: limit how many simultaneous requests a user can have.
Example: user can have max 5 concurrent long-polling connections.
```

```go
type ConcurrencyLimiter struct {
    sem chan struct{}
}

func NewConcurrencyLimiter(max int) *ConcurrencyLimiter {
    return &ConcurrencyLimiter{sem: make(chan struct{}, max)}
}

func (cl *ConcurrencyLimiter) Acquire() bool {
    select {
    case cl.sem <- struct{}{}:
        return true
    default:
        return false  // at capacity
    }
}

func (cl *ConcurrencyLimiter) Release() {
    <-cl.sem
}
```

## Header-Based Rate Limit Propagation

### Headers
```
Request (Client → Service):
  X-RateLimit-Consumed: 1    → notify downstream of cost

Response (Service → Client):
  X-RateLimit-Limit: 100           → max allowed
  X-RateLimit-Remaining: 42        → remaining in window
  X-RateLimit-Reset: 1716000000    → window reset timestamp
  Retry-After: 5                   → seconds to wait (for 429)
```

## Graceful Degradation

### On Rate Limit Exceeded
```python
if rate_limiter.is_rate_limited(user_id):
    # Option 1: Reject
    return 429, {"error": "rate_limited", "retry_after": 5}

    # Option 2: Queue
    queue.enqueue(request, delay=5)

    # Option 3: Degrade
    return 200, {"data": cached_data, "degraded": True, "reason": "rate_limited"}
```

### On Rate Limiter Failure
```python
try:
    allowed = redis_rate_limiter.check(key)
except RedisConnectionError:
    allowed = True  # fail open (allow request)
    # Or: allowed = False  # fail closed (deny all — safer for critical systems)

# Fail open: better UX, risk of backend overload.
# Fail closed: safer for backend, risk of false denials.
```

## Testing Rate Limits

```python
def test_rate_limit():
    # Send requests up to limit
    for i in range(100):
        response = client.get("/api/v1/resource", headers=auth_header)
        assert response.status_code == 200

    # Next request should be limited
    response = client.get("/api/v1/resource", headers=auth_header)
    assert response.status_code == 429
    assert "Retry-After" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
    assert response.headers["X-RateLimit-Remaining"] == "0"

    # After retry-after period, should work again
    time.sleep(int(response.headers["Retry-After"]) + 1)
    response = client.get("/api/v1/resource", headers=auth_header)
    assert response.status_code == 200
```
