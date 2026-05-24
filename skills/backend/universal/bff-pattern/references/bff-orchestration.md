# BFF Orchestration Reference

## Data Aggregation

The BFF aggregates data from multiple backend services into a single client-friendly response.

### Fan-Out Pattern
```typescript
// Web BFF: Compose dashboard data from multiple services
async function getDashboard(userId: string): Promise<DashboardResponse> {
  const startTime = Date.now();

  const [profile, orders, notifications, recommendations] = await Promise.all([
    userService.getProfile(userId),
    orderService.getRecentOrders(userId, { limit: 5 }),
    notificationService.getUnread(userId),
    recommendationService.getForUser(userId, { limit: 3 }),
  ]);

  metrics.record('dashboard.composition_time', Date.now() - startTime);

  return {
    profile: { name: profile.name, avatar: profile.avatarUrl, membershipTier: profile.tier },
    recentOrders: orders.map(o => ({
      id: o.id,
      status: o.status,
      total: o.total,
      date: o.createdAt,
      itemCount: o.items.length,
    })),
    unreadNotifications: notifications.length,
    recommendations: recommendations.map(r => ({
      id: r.id,
      title: r.title,
      imageUrl: r.thumbnail,
      price: r.price,
    })),
  };
}
```

### Error Handling in Aggregation

```typescript
// Partial failure: degrade gracefully
async function getDashboardResilient(userId: string): Promise<DashboardResponse> {
  const results = await Promise.allSettled([
    safeCall(() => userService.getProfile(userId), null),
    safeCall(() => orderService.getRecentOrders(userId, { limit: 5 }), []),
    safeCall(() => notificationService.getUnread(userId), 0),
    safeCall(() => recommendationService.getForUser(userId, { limit: 3 }), []),
  ]);

  const [profile, orders, notifications, recommendations] = results.map(r =>
    r.status === 'fulfilled' ? r.value : getDefault(r)
  );

  // Log failures for monitoring
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      logger.warn(`Dashboard composition: service ${i} failed`, { error: r.reason });
    }
  });

  return { profile, recentOrders: orders, unreadNotifications: notifications, recommendations };
}

function safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch(err => {
    logger.error('Service call failed', { error: err });
    return fallback;
  });
}
```

## API Composition

### Serial vs Parallel Composition

```typescript
// Serial: each call depends on previous
async function getOrderDetails(orderId: string) {
  const order = await orderService.getOrder(orderId);       // Required first
  const user = await userService.getUser(order.userId);     // Depends on order.userId
  const payments = await paymentService.getByOrder(orderId); // Independent of user
  const shipping = await shippingService.getStatus(orderId); // Independent

  return { order, user, payments, shipping };
}

// Parallel: all calls independent
async function getProductPage(productId: string) {
  const [product, reviews, related, stock] = await Promise.all([
    catalogService.getProduct(productId),
    reviewService.getReviews(productId, { limit: 5 }),
    catalogService.getRelated(productId, { limit: 4 }),
    inventoryService.getStock(productId),
  ]);

  return { product, reviews, related, stock };
}
```

### Batch Composition
```typescript
// BFF can batch multiple client requests
class BatchComposer {
  private pending = new Map<string, Promise<any>>();

  async batchRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Deduplicate concurrent requests for same data
    if (this.pending.has(key)) return this.pending.get(key)!;

    const promise = fetcher().finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }
}

// Usage: multiple components request same user
const composer = new BatchComposer();
const [profile, settings, permissions] = await Promise.all([
  composer.batchRequest(`user:${userId}`, () => userService.getProfile(userId)),
  composer.batchRequest(`user:${userId}`, () => userService.getSettings(userId)),
  composer.batchRequest(`user:${userId}`, () => userService.getPermissions(userId)),
]);
// Only ONE call to userService for all three
```

## Partial Response

Allow clients to request only the fields they need.

```typescript
type Fields = string[];

function pick<T extends Record<string, any>>(obj: T, fields: Fields): Partial<T> {
  if (!fields || fields.length === 0) return obj;
  return fields.reduce((acc, field) => {
    if (field in obj) acc[field] = obj[field];
    return acc;
  }, {} as Partial<T>);
}

// Usage
app.get('/api/web/users/:id', async (req, res) => {
  const user = await userService.getUser(req.params.id);
  const fields = (req.query.fields as string)?.split(',');
  res.json(pick(user, fields));
});
```

## Caching Strategies

```typescript
class BFFCache {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  async getOrFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.data as T;

    const data = await fetcher();
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) this.cache.delete(key);
    }
  }
}

// TTL by data type
const cacheTTLs = {
  'user.profile': 300_000,      // 5 min
  'catalog.products': 60_000,   // 1 min
  'orders.recent': 30_000,      // 30 sec
  'notifications': 10_000,      // 10 sec
};
```

## Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold = 5,
    private readonly resetTimeoutMs = 30_000
  ) {}

  async call<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        return fallback; // Fast-fail
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') this.state = 'CLOSED';
      this.failures = 0;
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= this.threshold) this.state = 'OPEN';
      return fallback;
    }
  }
}
```

## BFF Orchestration Best Practices

- **No business logic**: BFF shapes data, doesn't implement rules
- **Timeouts on every call**: Never let a backend service hang the BFF indefinitely
- **Graceful degradation**: Show partial data rather than crashing
- **Cache strategically**: Cache aggressively for read-heavy pages, invalidate on mutations
- **Request collapsing**: Deduplicate concurrent requests for the same resource
- **Monitor composition**: Track aggregation time, partial failures, and cache hit rates
