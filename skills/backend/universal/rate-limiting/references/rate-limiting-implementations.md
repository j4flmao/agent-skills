# Rate Limiting Implementation Patterns

## Token Bucket Implementation

### In-Memory Token Bucket
```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number,
    private refillInterval: number = 1000
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryConsume(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.refillInterval) {
      const refillTokens = Math.floor(elapsed / this.refillInterval) * this.refillRate;
      this.tokens = Math.min(this.capacity, this.tokens + refillTokens);
      this.lastRefill = now;
    }
  }

  get remainingTokens(): number {
    this.refill();
    return this.tokens;
  }
}
```

### Redis Token Bucket (Lua)
```lua
-- token_bucket.lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local capacity = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

local info = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(info[1]) or capacity
local last_refill = tonumber(info[2]) or now

local elapsed = math.max(0, now - last_refill)
tokens = math.min(capacity, tokens + elapsed * rate)

if tokens >= cost then
  tokens = tokens - cost
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, math.ceil(capacity / rate) * 2)
  return {1, tokens, capacity}
else
  local retry_after = math.ceil((cost - tokens) / rate)
  return {0, tokens, capacity, retry_after}
end
```

### TypeScript Redis Wrapper
```typescript
import Redis from 'ioredis';

class RedisTokenBucket {
  private script: string;

  constructor(private redis: Redis) {
    this.script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local rate = tonumber(ARGV[2])
      local capacity = tonumber(ARGV[3])
      local cost = tonumber(ARGV[4])

      local info = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(info[1]) or capacity
      local last_refill = tonumber(info[2]) or now

      local elapsed = math.max(0, now - last_refill)
      tokens = math.min(capacity, tokens + elapsed * rate)

      if tokens >= cost then
        tokens = tokens - cost
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, math.ceil(capacity / rate) * 2)
        return {1, tokens, capacity}
      else
        local retry_after = math.ceil((cost - tokens) / rate)
        return {0, tokens, capacity, retry_after}
      end
    `;
  }

  async allow(key: string, rate: number, capacity: number, cost: number = 1): Promise<{
    allowed: boolean;
    remaining: number;
    capacity: number;
    retryAfter?: number;
  }> {
    const result = await this.redis.eval(
      this.script,
      1,
      key,
      Date.now(),
      rate,
      capacity,
      cost
    );

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      capacity: result[2],
      retryAfter: result[3],
    };
  }
}
```

## Sliding Window Log

### Redis Sorted Set Implementation
```typescript
class SlidingWindowLog {
  constructor(private redis: Redis) {}

  async allow(key: string, limit: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const multi = this.redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zcard(key);
    multi.zadd(key, now, `${now}:${Math.random()}`);
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec();
    const currentCount = results[1][1] as number;

    if (currentCount <= limit) {
      return {
        allowed: true,
        remaining: limit - currentCount,
        resetTime: now + windowMs,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: now + windowMs,
    };
  }
}
```

## Middleware Implementation

### Express Rate Limiter
```typescript
import { Request, Response, NextFunction } from 'express';

function rateLimiter(config: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}) {
  const store = new SlidingWindowLog(redis);

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : `${req.ip}:${req.path}`;

    const result = await store.allow(key, config.max, config.windowMs);

    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
}
```

## Key Points
- Choose algorithm based on traffic patterns: token bucket for bursts, sliding window for fairness
- Use Redis Lua scripts for atomic rate limit operations in distributed systems
- Implement key design with scope prefixing: `user:{id}:endpoint:{path}`
- Set burst capacity to at least 2x steady-state rate
- Always return rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- Include Retry-After header on 429 responses
- Apply rate limiting at edge (API gateway) and application layers
- Monitor rate limit hit rates and adjust thresholds based on traffic patterns
- Implement per-user, per-IP, and global limit tiers
- Use circuit breakers alongside rate limits for comprehensive traffic control
