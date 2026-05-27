# Flag SDK Integration

## Overview
Integrate feature flag SDKs across languages and frameworks: initialization patterns, evaluation caching, streaming updates, bootstrapping, and error handling.

## SDK Initialization Patterns

```typescript
// Node.js — Singleton client with graceful initialization
import { init } from '@launchdarkly/node-server-sdk';

class FlagClient {
  private static instance: FlagClient;
  private client: LDClient;
  private initialized = false;

  private constructor() {
    this.client = init(process.env.LAUNCHDARKLY_SDK_KEY!);
    this.client.on('ready', () => { this.initialized = true; });
    this.client.on('failed', () => { console.error('Flag SDK initialization failed'); });
  }

  static getInstance(): FlagClient {
    if (!FlagClient.instance) {
      FlagClient.instance = new FlagClient();
    }
    return FlagClient.instance;
  }

  async waitForInit(timeoutMs = 5000): Promise<void> {
    if (this.initialized) return;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Flag SDK init timed out')), timeoutMs);
      this.client.on('ready', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async evaluate(flagKey: string, user: LDUser, defaultValue = false): Promise<boolean> {
    if (!this.initialized) return defaultValue;
    try {
      return await this.client.boolVariation(flagKey, user, defaultValue);
    } catch {
      return defaultValue;
    }
  }
}
```

## Streaming Updates

```typescript
class StreamingFlagService {
  private cache: Map<string, boolean> = new Map();
  private subscribers: Map<string, Set<(value: boolean) => void>> = new Map();

  constructor() {
    this.initStreaming();
  }

  private initStreaming(): void {
    const client = FlagClient.getInstance();
    client.on('change', (settings: Record<string, { current: boolean }>) => {
      for (const [flagKey, { current }] of Object.entries(settings)) {
        this.cache.set(flagKey, current);
        this.notifySubscribers(flagKey, current);
      }
    });
  }

  subscribe(flagKey: string, callback: (value: boolean) => void): () => void {
    if (!this.subscribers.has(flagKey)) {
      this.subscribers.set(flagKey, new Set());
    }
    this.subscribers.get(flagKey)!.add(callback);
    return () => this.subscribers.get(flagKey)?.delete(callback);
  }
}
```

## Client-Side Bootstrapping

```typescript
// Server-side: bootstrap flags into HTML
class FlagBootstrapper {
  async bootstrapFlags(userId: string): Promise<string> {
    const client = FlagClient.getInstance();
    const state = await client.allFlagsState({ key: userId, anonymous: false });

    // Inline flag state for instant client-side evaluation
    return `<script>
      window.__FLAGS__ = ${JSON.stringify(state.toJSON())};
    </script>`;
  }
}
```

```typescript
// Client-side: use bootstrapped flags
import { initialize } from '@launchdarkly/react-native-client-sdk';

const client = initialize(ENV.MOBILE_KEY, {
  bootstrap: 'localStorage', // Use server-bootstrapped flags
});

// Instant evaluation — no network wait
const isEnabled = client.variation('new-checkout', false);
```

## Evaluation Caching

```typescript
class CachedFlagEvaluator {
  private cache: Map<string, { value: boolean; expiresAt: number }> = new Map();
  private readonly TTL_MS = {
    release: 30000,   // 30s for release toggles
    ops: 5000,        // 5s for kill switches
    experiment: 60000, // 60s for experiment flags
  };

  evaluate(flagKey: string, user: FlagUser, type: FlagType = 'release'): boolean {
    const cacheKey = `${flagKey}:${user.key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    // Real evaluation
    const value = this.evaluateFromProvider(flagKey, user, false);
    this.cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.TTL_MS[type],
    });
    return value;
  }

  invalidate(flagKey: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(flagKey)) {
        this.cache.delete(key);
      }
    }
  }
}
```

## Error Handling

```typescript
class ResilientFlagClient {
  private client: LDClient;
  private circuitOpen = false;
  private failureCount = 0;
  private readonly THRESHOLD = 5;
  private lastFailureTime = 0;
  private readonly RESET_TIMEOUT = 30000;

  async evaluate(flagKey: string, user: LDUser, defaultValue = false): Promise<boolean> {
    if (this.circuitOpen) {
      if (Date.now() - this.lastFailureTime > this.RESET_TIMEOUT) {
        this.circuitOpen = false;
        this.failureCount = 0;
      } else {
        return defaultValue; // Use default while circuit is open
      }
    }

    try {
      const value = await this.client.boolVariation(flagKey, user, defaultValue);
      this.failureCount = 0;
      return value;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.THRESHOLD) {
        this.circuitOpen = true;
      }
      return defaultValue;
    }
  }
}
```

## Multi-Language Integration

```python
# Python SDK integration
import launchdarkly_server_sdk as ld

class FastAPIFlagMiddleware:
    def __init__(self):
        self.client = ld.LDClient(env.LAUNCHDARKLY_SDK_KEY)

    async def flag_middleware(self, request, call_next):
        request.state.flags = FlagContext(self.client, request.user)
        response = await call_next(request)
        return response

class FlagContext:
    def is_enabled(self, key: str, default: bool = False) -> bool:
        return self.client.variation(key, self._build_user(), default)

    def _build_user(self) -> ld.Context:
        return ld.Context.builder(self.user.id).kind("user").build()
```

```java
// Spring Boot — Conditional on flag
@Component
public class FlaggedFeature {
  @Value("${launchdarkly.sdk.key}")
  private String sdkKey;

  private LDClient client;

  @PostConstruct
  public void init() {
    this.client = new LDClient(sdkKey);
  }

  @Bean
  @ConditionalOnFlag("new-checkout-flow")
  public CheckoutService newCheckoutService() {
    return new NewCheckoutService();
  }
}
```

## Key Points
- Initialize SDK once as singleton with timeout fallback
- Use streaming updates for near-instant flag propagation
- Bootstrap flags client-side for instant evaluation without network wait
- Cache evaluations with per-flag-type TTL (5s for ops, 30s for release, 60s for experiment)
- Implement circuit breaker pattern to degrade gracefully when flag service is down
- Support evaluation in multiple languages with consistent patterns
- Always fall back to default value on any error
