# BFF Implementation Strategies

## Strategy Overview

Choose an implementation approach based on team size, scale, and operational maturity.

## 1. Monolithic BFF with Route Segregation

```
bff-service/
├── src/
│   ├── routes/
│   │   ├── web/       # Web-specific endpoints
│   │   ├── mobile/    # Mobile-specific endpoints
│   │   └── partner/   # Partner-specific endpoints
│   ├── composers/
│   │   ├── web/
│   │   ├── mobile/
│   │   └── partner/
│   └── middleware/
```

**Best for:** Early-stage startups, small teams (3-5 devs), 2-3 client types.

**Pros:**
- Single deployment, shared infrastructure
- Easier to reason about cross-client concerns
- Lower operational overhead

**Cons:**
- Scales as one unit (over-provision for all clients)
- Shared failure domain (mobile bug affects web)
- Deployment coordination required
- Codebase grows large over time

**Implementation:**
```typescript
// Route factory pattern
function createBffRouter(bffType: 'web' | 'mobile' | 'partner'): Router {
  const router = Router();

  // Common middleware (auth, tracing, rate limiting)
  router.use(createBffAuth(bffType));
  router.use(requestTracing);
  router.use(rateLimiter.for(bffType));

  // BFF-specific routes
  router.get('/checkout/:cartId', async (req, res) => {
    const checkout = await checkoutComposers[bffType].getCheckout(
      req.params.cartId,
      req.user.id,
    );
    res.json(checkout);
  });

  return router;
}

// Mount each BFF under its own prefix
app.use('/api/web', createBffRouter('web'));
app.use('/api/mobile', createBffRouter('mobile'));
app.use('/api/partner', createBffRouter('partner'));
```

## 2. Dedicated BFF Services

```
bff-web/          bff-mobile/        bff-partner/
├── src/          ├── src/           ├── src/
├── Dockerfile    ├── Dockerfile     ├── Dockerfile
├── package.json  ├── package.json   └── package.json
└── k8s.yaml      └── k8s.yaml
```

**Best for:** Mature products, dedicated frontend teams, 3+ client types.

**Pros:**
- Independent scaling (mobile BFF needs 10 replicas, web BFF needs 3)
- Independent deployment (mobile BFF deploys without web risk)
- Team ownership (web team owns web BFF)
- Failure isolation (mobile BFF outage doesn't affect web)

**Cons:**
- Higher infrastructure cost
- More services to monitor and maintain
- Duplicated cross-cutting concerns (caching, auth middleware)
- Requires service discovery for backing services

**Implementation:**
```typescript
// Shared BFF base library (published as npm package)
// @company/bff-base
export { createBffAuth } from './auth';
export { createBffCache } from './cache';
export { BffLoadShedder } from './load-shedder';
export { requestTracing } from './tracing';
export { errorHandler } from './errors';

// Each BFF service imports the base
import { createBffAuth, createBffCache, BffLoadShedder, requestTracing } from '@company/bff-base';

const app = express();
app.use(createBffAuth('mobile'));
app.use(requestTracing);
// ... mobile-specific routes
```

## 3. BFF per Feature Domain

```
checkout-bff/     search-bff/       profile-bff/
├── src/          ├── src/          ├── src/
└── ...           └── ...           └── ...
```

**Best for:** Large organizations with domain-aligned teams.

**Pros:**
- Team ownership per domain (checkout team owns checkout BFF)
- Fine-grained scaling (search BFF scales differently than checkout BFF)
- Independent technology choice per domain
- Domain-aligned API contracts

**Cons:**
- Client calls multiple BFFs for a single page
- Requires BFF orchestrator or client-side aggregation
- Higher latency (multiple network hops)
- Complex service discovery

**Implementation:**
```typescript
// Client-side aggregation (web app calls multiple BFFs)
interface DashboardData {
  orders: Order[];
  searchHistory: Search[];
  profile: Profile;
}

async function getDashboard(): Promise<DashboardData> {
  const [orders, searchHistory, profile] = await Promise.all([
    fetch('/api/checkout-bff/orders/recent'),
    fetch('/api/search-bff/history'),
    fetch('/api/profile-bff/me'),
  ]);

  return {
    orders: await orders.json(),
    searchHistory: await searchHistory.json(),
    profile: await profile.json(),
  };
}

// Or use a server-side BFF orchestrator
class BffOrchestrator {
  async getDashboard(userId: string): Promise<DashboardData> {
    const [orders, searchHistory, profile] = await Promise.all([
      this.checkoutBff.getRecentOrders(userId),
      this.searchBff.getSearchHistory(userId),
      this.profileBff.getProfile(userId),
    ]);
    return { orders, searchHistory, profile };
  }
}
```

## 4. BFF as GraphQL Wrapper

When the backend uses GraphQL but the client needs REST:
```typescript
class GraphQLBffWrapper {
  private graphqlClient: GraphQLClient;

  async getCheckout(cartId: string, userId: string): Promise<CheckoutResponse> {
    const query = `
      query GetCheckout($cartId: ID!, $userId: ID!) {
        cart(id: $cartId) { items { id name price } }
        user(id: $userId) { paymentMethods { id last4 } }
        shipping { options { id name price } }
      }
    `;

    const result = await this.graphqlClient.request(query, { cartId, userId });

    return {
      items: result.cart.items,
      paymentMethods: result.user.paymentMethods,
      shippingOptions: result.shipping.options,
    };
  }
}
```

## Technology-Specific Implementations

### Node.js / Express
```typescript
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import CircuitBreaker from 'opossum';

const app = express();

// Service clients with circuit breakers
const cartClient = new CircuitBreaker(
  (cartId: string) => fetch(`http://cart-service/carts/${cartId}`),
  { timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 30000 }
);

app.get('/api/web/checkout/:cartId', async (req, res) => {
  try {
    const [cart, pricing] = await Promise.all([
      cartClient.fire(req.params.cartId),
      pricingClient.fire(req.params.cartId),
    ]);
    res.json({ items: cart.items, total: pricing.total });
  } catch (err) {
    if (cartClient.opened) {
      res.status(503).json({ error: 'Checkout service unavailable' });
    }
  }
});
```

### Python / FastAPI
```python
from fastapi import FastAPI, HTTPException
from httpx import AsyncClient, Limits, Timeout
import asyncio

app = FastAPI()

# Connection pooling
http_client = AsyncClient(
    limits=Limits(max_connections=50, max_keepalive_connections=20),
    timeout=Timeout(5.0)
)

class CheckoutComposer:
    async def get_checkout(self, cart_id: str, user_id: str):
        async def fetch_cart():
            resp = await http_client.get(f"http://cart-service/carts/{cart_id}")
            resp.raise_for_status()
            return resp.json()

        async def fetch_pricing():
            resp = await http_client.get(f"http://pricing-service/calculate/{cart_id}")
            resp.raise_for_status()
            return resp.json()

        cart, pricing = await asyncio.gather(
            fetch_cart(), fetch_pricing(), return_exceptions=True
        )

        if isinstance(cart, Exception):
            raise HTTPException(status_code=503, detail="Cart service unavailable")

        return {
            "items": cart["items"],
            "total": pricing["total"] if not isinstance(pricing, Exception) else 0
        }
```

### Go
```go
package bff

import (
    "encoding/json"
    "net/http"
    "time"
)

type CheckoutComposer struct {
    cartClient     *http.Client
    pricingClient  *http.Client
}

func NewCheckoutComposer() *CheckoutComposer {
    return &CheckoutComposer{
        cartClient: &http.Client{
            Timeout: 3 * time.Second,
            Transport: &http.Transport{
                MaxIdleConns: 50,
                IdleConnTimeout: 30 * time.Second,
            },
        },
        pricingClient: &http.Client{Timeout: 5 * time.Second},
    }
}

func (c *CheckoutComposer) GetCheckout(cartID, userID string) (map[string]interface{}, error) {
    type result struct {
        data map[string]interface{}
        err  error
    }

    ch := make(chan result, 2)

    go func() {
        resp, err := c.cartClient.Get("http://cart-service/carts/" + cartID)
        if err != nil {
            ch <- result{err: err}
            return
        }
        defer resp.Body.Close()
        var data map[string]interface{}
        json.NewDecoder(resp.Body).Decode(&data)
        ch <- result{data: data}
    }()

    // ... similar for pricing

    return map[string]interface{}{
        "items": cartData["items"],
        "total": pricingData["total"],
    }, nil
}
```
