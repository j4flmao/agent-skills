# BFF Advanced

## Multi-Region BFF Deployment

For global applications, deploy BFFs close to users:

```
Region: us-east-1          Region: eu-west-1          Region: ap-southeast-1
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ Web BFF          │       │ Web BFF          │       │ Web BFF          │
│ Mobile BFF       │       │ Mobile BFF       │       │ Mobile BFF       │
│ ┌──────────────┐ │       │ ┌──────────────┐ │       │ ┌──────────────┐ │
│ │ Local Cache   │ │       │ │ Local Cache   │ │       │ │ Local Cache   │ │
│ └──────────────┘ │       │ └──────────────┘ │       │ └──────────────┘ │
│ BFF → Global LB  │       │ BFF → Global LB  │       │ BFF → Global LB  │
└────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │ Global Redis Cache │
                         │ (read replicas)    │
                         └─────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │ Backing Services   │
                         │ (active-passive)   │
                         └───────────────────┘
```

### Region-Specific Logic
```typescript
class RegionalBff {
  constructor(private region: 'us' | 'eu' | 'ap') {}

  async getRegionalConfig(): Promise<BffConfig> {
    const configs = {
      us: { currency: 'USD', dateFormat: 'MM/DD/YYYY', cacheTTL: 30 },
      eu: { currency: 'EUR', dateFormat: 'DD/MM/YYYY', cacheTTL: 60 },
      ap: { currency: 'SGD', dateFormat: 'YYYY/MM/DD', cacheTTL: 120 },
    };
    return configs[this.region];
  }
}
```

## BFF with Streaming

For real-time data (dashboards, feeds), BFF can stream composed data:

```typescript
// Server-Sent Events via BFF
class StreamComposer {
  async streamUserFeed(userId: string, res: Response): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Subscribe to multiple backing services
    const activitySub = await this.activityService.subscribe(userId);
    const notificationSub = await this.notificationService.subscribe(userId);
    const presenceSub = await this.presenceService.subscribe(userId);

    const merged = merge(activitySub, notificationSub, presenceSub);

    for await (const event of merged) {
      const composed = await this.composeEvent(event, userId);
      res.write(`data: ${JSON.stringify(composed)}\n\n`);
    }
  }
}
```

## Feature Flags in BFF

BFF is the ideal place for feature flags that affect client behavior:
```typescript
class FeatureFlaggedComposer {
  constructor(private flags: FeatureFlagService) {}

  async getCheckout(cartId: string, userId: string): Promise<CheckoutResponse> {
    const [cart, pricing, shipping, payment, flags] = await Promise.all([
      this.cartService.getCart(cartId),
      this.pricingService.calculateTotal(cartId),
      this.shippingService.getOptions(cartId),
      this.paymentService.getMethods({ userId }),
      this.flags.getUserFlags(userId, ['new_checkout_flow', 'buy_now_pay_later']),
    ]);

    const response = await this.buildCheckout(cart, pricing, shipping, payment);

    // Feature flag: new checkout flow
    if (flags.new_checkout_flow) {
      response.checkoutFlow = 'v2';
      response.expressCheckout = true;
    }

    // Feature flag: buy now pay later
    if (flags.buy_now_pay_later) {
      response.paymentMethods.push({
        id: 'bnpl',
        name: 'Pay in 4',
        type: 'bnpl',
      });
    }

    return response;
  }
}
```

## Blue-Green BFF Deployments

```yaml
# Docker Compose for BFF blue-green
services:
  bff-web-blue:
    image: bff-web:v2.0.0
    environment:
      - BFF_COLOR=blue
      - BACKEND_URL=http://backend-stable

  bff-web-green:
    image: bff-web:v2.0.0
    environment:
      - BFF_COLOR=green
      - BACKEND_URL=http://backend-canary

  router:
    image: haproxy
    # Route 90% traffic to blue, 10% to green
    # Switch to 100% green after validation
```

## BFF Performance Optimization Patterns

### Response Compression
```typescript
// Brotli-level compression for web BFF responses
import { compress } from 'brotli';

app.get('/api/web/checkout/:cartId', async (req, res) => {
  const response = await composer.getCheckout(req.params.cartId);
  const compressed = await compress(JSON.stringify(response), {
    quality: 8, // 0-11, higher = smaller but slower
  });
  res.set('Content-Encoding', 'br');
  res.set('Content-Type', 'application/json');
  res.send(compressed);
});
```

### Client-Specific Serialization
```typescript
// Mobile BFF: strip null fields, shorten keys
function serializeForMobile(data: Record<string, any>): string {
  const compact = JSON.stringify(data, (key, value) => {
    if (value === null || value === undefined) return undefined; // strip nulls
    if (key === 'displayName') return value; // keep as-is
    return value;
  });
  return compact;
}

// Web BFF: full serialization with pretty-print in dev
function serializeForWeb(data: Record<string, any>): string {
  return JSON.stringify(data, null, process.env.NODE_ENV === 'development' ? 2 : 0);
}
```

### BFF-to-BFF Communication
When a page spans multiple BFF domains:
```typescript
// BFF orchestrator — coordinates multiple BFFs for a single page
class BffOrchestrator {
  constructor(
    private checkoutBff: CheckoutBffClient,
    private searchBff: SearchBffClient,
    private profileBff: ProfileBffClient,
  ) {}

  async getDashboard(userId: string): Promise<DashboardResponse> {
    const [checkoutData, searchHistory, profile] = await Promise.all([
      this.checkoutBff.getRecentOrders(userId),
      this.searchBff.getRecentSearches(userId),
      this.profileBff.getProfile(userId),
    ]);

    return {
      orders: checkoutData.orders,
      recentSearches: searchHistory.searches,
      profile: {
        name: profile.name,
        avatar: profile.avatarUrl,
      },
    };
  }
}
```

## BFF Migration Strategy

### Step 1: Extract from monolith
```
Before: Monolith serves both /web/* and /mobile/* routes
After: Mobile routes extracted into standalone BFF service
```

### Step 2: Gradual feature migration
```
Phase 1: New BFF serves read-only endpoints (GET)
Phase 2: BFF adds write endpoints (POST/PUT)
Phase 3: Old monolith routes deprecated, traffic fully on BFF
```

### Step 3: Route traffic
```nginx
# NGINX: route mobile traffic to BFF, web traffic to monolith initially
location /api/web/ {
    proxy_pass http://monolith:3000;
}
location /api/mobile/ {
    proxy_pass http://bff-mobile:4000;
}

# After full migration:
location /api/ {
    proxy_pass http://bff-web:3000;
}
```

## Testing BFFs

### Contract Tests
```typescript
// Verify BFF response contracts match client expectations
describe('Web BFF checkout contract', () => {
  it('returns all required fields', async () => {
    const response = await webBff.getCheckout('cart-123', 'user-456');
    expect(response).toMatchObject({
      items: expect.any(Array),
      subtotal: expect.any(Number),
      shipping: expect.any(Number),
      tax: expect.any(Number),
      total: expect.any(Number),
      shippingOptions: expect.any(Array),
      paymentMethods: expect.any(Array),
    });
    expect(Object.keys(response)).toHaveLength(7); // No extra fields
  });
});
```

### Resilience Tests
```typescript
describe('BFF partial failure handling', () => {
  it('returns partial data when shipping service fails', async () => {
    mockShippingService.reject('timeout');
    const response = await webBff.getCheckout('cart-123', 'user-456');

    expect(response.items).toBeDefined();
    expect(response.total).toBeDefined();
    expect(response.shippingOptions).toBeUndefined(); // Graceful degradation
    expect(response._warnings).toContain('Shipping data temporarily unavailable');
  });
});
```
