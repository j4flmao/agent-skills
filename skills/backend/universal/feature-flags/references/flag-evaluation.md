# Flag Evaluation Strategies Reference

## Server-Side vs Client-Side Evaluation

### Server-Side
Flags evaluated on the backend before returning responses.

```typescript
// Server-side: synchronous, low-latency
async function getCheckoutData(userId: string) {
  const isV2Enabled = await flagClient.boolVariation('checkout-v2', { key: userId }, false);

  if (isV2Enabled) {
    return checkoutV2Service.getData(userId);
  }
  return checkoutV1Service.getData(userId);
}
```

| Aspect | Server-Side | Client-Side |
|--------|-------------|-------------|
| Latency | 1-5ms (cached) | 0ms (local) |
| Flag exposure | Hidden from client | Visible in bundle |
| Security | Flag logic is server-only | Flags can be inspected |
| Consistency | Single source of truth | May drift before sync |
| Offline support | No | Yes (last cached state) |
| Best for | Ops toggles, backend logic | User-facing features, UI |

### Client-Side
Flags evaluated in the browser or mobile app.

```javascript
// Client-side LaunchDarkly
const client = LDClient.initialize(envClientKey, { key: user.id });
await client.waitForInitialization();

// Real-time flag change listener
client.on('change:new-checkout-flow', (current, previous) => {
  if (current) {
    showCheckoutV2UI();
  } else {
    showCheckoutV1UI();
  }
});
```

## Caching Strategies

### In-Memory Cache (Server-Side)
```typescript
class FlagCache {
  private cache = new Map<string, { value: boolean; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly client: LDClient;

  constructor(client: LDClient, ttlMs = 30_000) {
    this.client = client;
    this.ttlMs = ttlMs;
  }

  evaluate(flagKey: string, user: LDUser): boolean {
    const cacheKey = `${flagKey}:${user.key}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const value = this.client.boolVariation(flagKey, user, false);
    this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  invalidate(flagKey: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(flagKey)) this.cache.delete(key);
    }
  }
}
```

### Cache TTL Recommendations

| Flag Type | TTL | Rationale |
|-----------|-----|-----------|
| Ops (kill switch) | 1-5s | Rapid propagation needed |
| Release toggle | 30-60s | Fast enough for gradual rollout |
| Experiment toggle | 60-120s | Statistical stability preferred |
| Permission toggle | 120-300s | Infrequent changes |
| Client-side | 300-600s | Offline resilience |

## SDK Bootstrapping

Pre-load flag values to avoid initial latency hit.

```javascript
// Server generates bootstrap data
async function getBootstrapData(user: User): Promise<string> {
  const state = await flagClient.allFlagsState({ key: user.id });
  return JSON.stringify(state.toJSON());
}

// Inject into HTML
res.send(`
  <html>
  <script>
    window.LD_BOOTSTRAP = ${bootstrapData};
  </script>
  </html>
`);

// Client SDK uses bootstrap (zero-latency initialization)
const client = LDClient.initialize(clientKey, user, {
  bootstrap: window.LD_BOOTSTRAP
});
// Flags are immediately available — no wait for network
```

## Async Loading Patterns

```javascript
// Lazy initialization with fallback
class FlagService {
  private ready = false;
  private queue: Array<() => void> = [];

  async init() {
    await flagClient.waitForInitialization();
    this.ready = true;
    this.queue.forEach(fn => fn());
    this.queue = [];
  }

  evaluate(key: string, fallback = false): boolean {
    if (!this.ready) return fallback;
    return flagClient.boolVariation(key, { key: 'default' }, fallback);
  }

  onReady(callback: () => void) {
    if (this.ready) return callback();
    this.queue.push(callback);
  }
}
```

## Streaming Updates

```typescript
// LaunchDarkly streaming via SSE
const client = LDClient.initialize(sdkKey, user);
client.on('connected', () => console.log('SSE connection established'));
client.on('error', (err) => console.error('Streaming error', err));

// Reconnection with exponential backoff
client.on('error', () => {
  // SDK handles reconnection automatically
  // Default: 1s, 2s, 4s, 8s, ... up to 60s max
});
```

## Flag Consistency

### Deterministic Evaluation via Hashing
```typescript
function evaluatePercentage(userId: string, flagKey: string, percentage: number): boolean {
  const hash = murmur3_32(`${userId}:${flagKey}`);
  return (hash % 100) < percentage;
}

// Consistent across all services — same user always gets same result
const isEnabled = evaluatePercentage('user-123', 'new-checkout-flow', 25);
```

### Race Conditions
| Problem | Solution |
|---------|----------|
| Flag toggled mid-request | Evaluate once at request start |
| Cache inconsistency | Short TTL for ops flags |
| Partial rollout drift | Consistent hashing per user |
| Client/server disagreement | Bootstrap + streaming sync |
