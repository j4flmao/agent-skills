# API Gateway Rate Limiting

## Edge Enforcement

### API Gateway Configuration
```yaml
# Kong rate limiting plugin
plugins:
  - name: rate-limiting
    config:
      second: null
      minute: 100
      hour: 5000
      day: 100000
      policy: redis
      redis_host: redis-cluster
      redis_port: 6379
      redis_timeout: 2000
      fault_tolerant: true
      hide_client_headers: false
```

### NGINX Rate Limiting
```nginx
# NGINX rate limiting configuration
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $http_x_api_key zone=apikey_limit:10m rate=1000r/s;

server {
    location /api/ {
        limit_req zone=api_limit burst=200 nodelay;
        limit_req zone=apikey_limit burst=500 nodelay;
        limit_req_status 429;
        limit_req_log_level warn;

        proxy_pass http://backend;
    }
}
```

### Cloudflare Rate Limiting
```yaml
# Cloudflare rate limiting rules
rules:
  - expression: "(http.request.uri.path contains \"/api/\")"
    characteristics:
      - ip.src
      - http.request.headers["x-api-key"]
    actions:
      - origin_error
    limits:
      - period: 60
        requests_per_period: 1000
    mitigation_timeout: 600
```

## Per-Client Tiers

### Tier Configuration
```typescript
interface RateLimitTier {
  name: string;
  requestsPerMinute: number;
  burstSize: number;
  concurrentConnections: number;
}

const tiers: Record<string, RateLimitTier> = {
  free: {
    name: 'Free',
    requestsPerMinute: 10,
    burstSize: 20,
    concurrentConnections: 5,
  },
  pro: {
    name: 'Pro',
    requestsPerMinute: 1000,
    burstSize: 2000,
    concurrentConnections: 50,
  },
  enterprise: {
    name: 'Enterprise',
    requestsPerMinute: 10000,
    burstSize: 20000,
    concurrentConnections: 500,
  },
};
```

### Tier-Based Rate Limiter
```typescript
class TieredRateLimiter {
  async allow(apiKey: string): Promise<RateLimitResult> {
    const tier = await this.getTier(apiKey);

    const key = `ratelimit:tier:${apiKey}`;
    const result = await this.tokenBucket.allow(
      key,
      tier.requestsPerMinute / 60,
      tier.burstSize
    );

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      limit: tier.requestsPerMinute,
      resetTime: result.retryAfter
        ? Date.now() + result.retryAfter * 1000
        : Date.now() + 60000,
    };
  }

  private async getTier(apiKey: string): Promise<RateLimitTier> {
    const apiKeyData = await this.apiKeyService.getKey(apiKey);
    return tiers[apiKeyData.tier] || tiers.free;
  }
}
```

## Key Points
- Enforce rate limits at the edge (gateway/load balancer) as the first line of defense
- Use NGINX, Kong, or Cloudflare for efficient edge-level rate limiting
- Implement per-client tier limits based on API keys or subscription plans
- Configure burst sizes to handle legitimate traffic spikes without false positives
- Always set rate limit headers on responses for client visibility
- Monitor and log rate-limited requests separately
- Combine global, per-user, and per-endpoint rate limits
- Use Redis-backed rate limiting for distributed gateway deployments
- Implement graceful degradation with circuit breakers for upstream services
- Review and adjust rate limits based on production traffic patterns
