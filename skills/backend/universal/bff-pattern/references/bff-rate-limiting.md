# BFF Rate Limiting and Load Shedding

## Why Per-BFF Rate Limiting

Each BFF type has different traffic patterns and backend capacity requirements:

| BFF Type | Traffic Pattern | Backend Impact | Rate Limit Strategy |
|----------|----------------|----------------|---------------------|
| Web BFF | Bursty (page loads, form submits) | High concurrency | Per-user, per-IP, per-session |
| Mobile BFF | Steady (polls, background refresh) | Sustained load | Per-device, per-user, global |
| Partner BFF | Unpredictable (3rd party integrations) | Variable | Per-API-key, quota-based |
| Admin BFF | Low volume, high privilege | Sensitive backend | Per-user, per-IP strict |

## Rate Limiting Implementation

### Per-BFF Rate Limit Configuration
```typescript
interface BffRateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator: (req: Request) => string;
  handler: (req: Request, res: Response) => void;
  skipFailedRequests?: boolean;
  draftPollRateLimit?: number; // mobile BFF special: limit poll frequency
}

const BFF_RATE_LIMITS: Record<string, BffRateLimitConfig> = {
  web: {
    windowMs: 60 * 1000,      // 1 minute
    max: 100,                  // 100 requests per minute
    keyGenerator: (req) => `${req.ip}:${req.user?.id || 'anon'}`,
    handler: (req, res) => {
      res.status(429).json({ error: 'Too many requests. Slow down.' });
    },
  },
  mobile: {
    windowMs: 60 * 1000,
    max: 200,                  // Mobile apps poll frequently
    keyGenerator: (req) => `${req.headers['x-device-id']}:${req.user?.id}`,
    handler: (req, res) => {
      // Mobile clients get a retry-after header for backoff
      res.set('Retry-After', '30');
      res.status(429).json({ error: 'Rate limited', retryAfter: 30 });
    },
    draftPollRateLimit: 10,    // Max 10 polls per minute per user
  },
  partner: {
    windowMs: 60 * 1000,
    max: 30,                   // Partners are quota-limited
    keyGenerator: (req) => req.headers['x-api-key'] as string,
    handler: (req, res) => {
      res.set('X-RateLimit-Reset', String(Date.now() + 60000));
      res.status(429).json({
        error: 'API rate limit exceeded',
        quota: { limit: 30, remaining: 0, reset: Date.now() + 60000 },
      });
    },
  },
  admin: {
    windowMs: 60 * 1000,
    max: 50,
    keyGenerator: (req) => `${req.ip}:${req.user?.id}`,
    handler: (req, res) => {
      // Log admin rate limit hits (potential brute force)
      logger.warn('Admin rate limit hit', { userId: req.user?.id, ip: req.ip });
      res.status(429).json({ error: 'Too many requests' });
    },
  },
};
```

### Distributed Rate Limiting with Redis
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiters: Record<string, RateLimiterRedis> = {};

function getRateLimiter(bffType: string): RateLimiterRedis {
  if (!rateLimiters[bffType]) {
    rateLimiters[bffType] = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: `ratelimit:${bffType}`,
      points: BFF_RATE_LIMITS[bffType].max,
      duration: BFF_RATE_LIMITS[bffType].windowMs / 1000,
      blockDuration: BFF_RATE_LIMITS[bffType].windowMs / 1000,
    });
  }
  return rateLimiters[bffType];
}

// Rate limiting middleware
async function bffRateLimiter(req: Request, res: Response, next: NextFunction) {
  const bffType = req.bffType; // set by earlier middleware
  const config = BFF_RATE_LIMITS[bffType];
  const key = config.keyGenerator(req);

  try {
    const result = await getRateLimiter(bffType).consume(key);
    res.set('X-RateLimit-Limit', String(config.max));
    res.set('X-RateLimit-Remaining', String(result.remainingPoints));
    res.set('X-RateLimit-Reset', String(result.msBeforeNext));
    next();
  } catch (err) {
    config.handler(req, res);
  }
}
```

## Quota Management for Partner BFF

### Tiered Quotas
```typescript
const PARTNER_TIERS = {
  free: { rpm: 10, rpd: 100, concurrent: 2 },
  pro: { rpm: 60, rpd: 10000, concurrent: 10 },
  enterprise: { rpm: 300, rpd: 100000, concurrent: 50 },
};

async function getPartnerQuota(apiKey: string): Promise<PartnerQuota> {
  const partner = await partnerService.findByApiKey(apiKey);
  return PARTNER_TIERS[partner.tier];
}

// Concurrent request limiter for partner BFF
class ConcurrentRequestLimiter {
  private activeRequests = new Map<string, number>();

  async acquire(apiKey: string): Promise<boolean> {
    const current = this.activeRequests.get(apiKey) || 0;
    const quota = await getPartnerQuota(apiKey);

    if (current >= quota.concurrent) {
      return false; // Concurrent limit exceeded
    }

    this.activeRequests.set(apiKey, current + 1);
    return true;
  }

  release(apiKey: string): void {
    const current = this.activeRequests.get(apiKey) || 0;
    if (current <= 1) {
      this.activeRequests.delete(apiKey);
    } else {
      this.activeRequests.set(apiKey, current - 1);
    }
  }
}
```

## Load Shedding

### When to Shed
```
Load shedding triggers:
├── Active requests > max_concurrent (90% of capacity)
├── Downstream service latency > 2x p99
├── Redis/DB connection pool exhausted
├── Error rate from backing services > 10%
└── CPU/memory above 80%
```

### BFF Load Shedding Implementation
```typescript
class BffLoadShedder {
  private activeRequests = 0;
  private maxConcurrent: number;
  private recentErrors: number[] = [];
  private readonly errorWindowMs = 10000;
  private readonly errorThreshold = 0.1;

  constructor(maxConcurrent: number = 100) {
    this.maxConcurrent = maxConcurrent;
  }

  get isUnderPressure(): boolean {
    // Check active requests
    if (this.activeRequests >= this.maxConcurrent * 0.9) return true;

    // Check error rate
    if (this.recentErrors.length > 0) {
      const windowStart = Date.now() - this.errorWindowMs;
      const recent = this.recentErrors.filter(t => t > windowStart);
      const errorRate = recent.length / (this.errorWindowMs / 1000);
      if (errorRate > this.errorThreshold) return true;
    }

    return false;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isUnderPressure) {
      throw new BffOverloadedError('Service under pressure. Try again later.');
    }

    this.activeRequests++;
    try {
      const result = await fn();
      return result;
    } catch (err) {
      this.recentErrors.push(Date.now());
      throw err;
    } finally {
      this.activeRequests--;
      // Prune old error timestamps
      this.recentErrors = this.recentErrors.filter(
        t => t > Date.now() - this.errorWindowMs
      );
    }
  }
}
```

## Client Backoff Strategies

### HTTP Retry-After Headers
```typescript
// When returning 429, include:
res.set('Retry-After', '30');              // seconds
// or
res.set('Retry-After', new Date(Date.now() + 30000).toUTCString()); // HTTP-date

// Rate limit headers (standard format)
res.set('RateLimit-Limit', '100');
res.set('RateLimit-Remaining', '0');
res.set('RateLimit-Reset', '1700000000');  // Unix timestamp
```

### Mobile Client Retry Logic (Client-Side)
```typescript
// Exponential backoff with jitter for mobile clients
function getBackoff(attempt: number): number {
  const base = 1000; // 1 second
  const cap = 60000; // 1 minute max
  const exponential = Math.min(cap, base * Math.pow(2, attempt));
  const jitter = Math.random() * 1000;
  return Math.floor(exponential + jitter);
}
```

## Monitoring Rate Limiting Effectiveness

### Key Metrics
```
bff_rate_limit_hits_total{type="web"}          → Are web users hitting limits?
bff_rate_limit_hits_total{type="partner"}       → Is partner quota sufficient?
bff_concurrent_requests{type="mobile"}          → Are we close to max concurrent?
bff_load_shed_events_total{type="admin"}        → Is admin BFF under-provisioned?
bff_downstream_error_rate{service="cart"}       → Is cart service the bottleneck?
```

### Dashboard Alerts
- Rate limit hit rate > 5% → Investigate client behavior
- Load shedding active > 1 min → Scale BFF or reduce concurrency
- Partner quota exhausted → Contact partner about upgrade
- Concurrent requests > 80% of max → Scale BFF replicas
