---
name: backend-bff-pattern
description: >
  Use this skill when the user says 'BFF', 'Backend for Frontend', 'API gateway', 'gateway specialization', 'frontend API', 'mobile API', 'web API', 'API composition', 'aggregation service', 'frontend gateway'. This skill designs Backend for Frontend patterns with specialized API gateways for each client type. Applies to any backend stack. Do NOT use for: general-purpose API gateways (Kong, NGINX), service mesh, or GraphQL federation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, bff, api-gateway, frontend, composition]
---

# Backend BFF Pattern

## Purpose
Design specialized Backend for Frontend (BFF) services that compose and transform backend APIs for each client type (web, mobile, IoT, third-party), reducing over-fetching and client complexity.

## Agent Protocol

### Trigger
Exact user phrases: "BFF", "Backend for Frontend", "API gateway", "gateway specialization", "frontend API", "mobile API", "web API", "API composition", "aggregation service", "frontend gateway", "BFF pattern".

### Input Context
- Client types consuming the API (web, iOS, Android, third-party).
- Backend microservices architecture.
- Latency and data shape requirements per client.

### Output Artifact
BFF architecture design or implementation snippet. No file unless requested.

### Response Format
```
BFF: {client type}
Backing Services: [{service list}]
Composition: {aggregation|transformation|caching}
Security: {auth pattern}
```

### Completion Criteria
- [ ] BFF per distinct client type defined.
- [ ] API composition logic documented.
- [ ] Auth model appropriate for each BFF.
- [ ] Caching and error handling configured.
- [ ] No business logic in BFF — only orchestration.

### Max Response Length
4 lines per BFF. 20 lines for full design.

## Workflow

### Step 1: Identify Client Types
```
Web BFF      -> SPA (React, Vue)
Mobile BFF   -> iOS + Android apps
Partners BFF -> Third-party integrations
Admin BFF    -> Internal admin panel
```

### Step 2: Design BFF API per Client
Each BFF exposes APIs shaped for its client:
```typescript
// Web BFF: returns a page-shaped response
GET /api/web/checkout/{cartId}
{
  "items": [
    {"id": "prod-1", "name": "Widget", "quantity": 2, "price": 19.99, "image": "https://..."}
  ],
  "subtotal": 39.98,
  "shipping": 5.99,
  "tax": 3.20,
  "total": 49.17,
  "shippingOptions": [
    {"id": "standard", "name": "Standard", "price": 5.99, "estimate": "5-7 days"},
    {"id": "express", "name": "Express", "price": 12.99, "estimate": "2-3 days"}
  ],
  "paymentMethods": [
    {"id": "card", "name": "Credit Card", "last4": "4242", "expiry": "04/27"}
  ]
}

// Mobile BFF: returns a compact response with mobile-specific fields
GET /api/mobile/checkout/{cartId}
{
  "total": 49.17,
  "shippingOptions": ["standard", "express"],
  "defaultPayment": "card_4242"
}

// Partner BFF: returns normalized data with partner-specific metadata
GET /api/partners/checkout/{cartId}?partner=acme
{
  "orderReference": "ext-123",
  "items": [...],
  "commission": 2.46,
  "total": 49.17
}
```

### Step 3: Implement Composition
```typescript
// Web BFF composition logic
class WebCheckoutComposer {
  constructor(
    private cartService: CartServiceClient,
    private pricingService: PricingServiceClient,
    private shippingService: ShippingServiceClient,
    private paymentService: PaymentServiceClient,
    private cache: CacheService,
  ) {}

  async getCheckout(cartId: string, userId: string): Promise<CheckoutResponse> {
    const cacheKey = `checkout:web:${cartId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const [cart, pricing, shipping, payment] = await Promise.all([
        this.cartService.getCart(cartId),
        this.pricingService.calculateTotal(cartId),
        this.shippingService.getOptions(cartId, { zipCode: cart.zipCode }),
        this.paymentService.getMethods({ userId }),
      ]);

      const response = {
        items: cart.items.map(item => ({
          id: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice,
          image: item.imageUrl,
        })),
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax: pricing.tax,
        total: pricing.total,
        shippingOptions: shipping.options.map(opt => ({
          id: opt.id,
          name: opt.displayName,
          price: opt.price,
          estimate: opt.deliveryEstimate,
        })),
        paymentMethods: payment.methods.map(m => ({
          id: m.id,
          name: m.displayName,
          last4: m.lastFourDigits,
          expiry: m.expiryDate,
        })),
      };

      await this.cache.set(cacheKey, JSON.stringify(response), { ttl: 30 });
      return response;
    } catch (error) {
      throw new BffError('Failed to compose checkout', {
        cartId,
        cause: error,
        partial: await this.buildPartialResponse(cartId),
      });
    }
  }

  private async buildPartialResponse(cartId: string): Promise<Partial<CheckoutResponse>> {
    try {
      const cart = await this.cartService.getCart(cartId);
      return { items: cart.items, subtotal: cart.totalAmount };
    } catch {
      return {};
    }
  }
}
```

### Step 4: Handle Auth per BFF

| BFF Type | Auth Mechanism | Token Storage | CSRF |
|---|---|---|---|
| Web BFF | Session cookie | httpOnly cookie | SameSite=Strict + CSRF token |
| Mobile BFF | Bearer JWT | Device keystore | Not needed |
| Partner BFF | API Key + HMAC | Server-side | Request signing |
| Admin BFF | SSO + JWT | httpOnly cookie | CSRF token |

```typescript
// BFF auth middleware factory
function createBffAuth(bffType: 'web' | 'mobile' | 'partner' | 'admin') {
  switch (bffType) {
    case 'web':
      return sessionAuth({
        store: new RedisStore({ client: redis }),
        secret: process.env.SESSION_SECRET,
        cookie: { httpOnly: true, secure: true, sameSite: 'strict' },
      });
    case 'mobile':
      return jwtAuth({
        secret: process.env.MOBILE_JWT_SECRET,
        audience: 'mobile-app',
        maxAge: '15m',
      });
    case 'partner':
      return apiKeyAuth({
        header: 'X-API-Key',
        validator: async (key) => partnerService.validateApiKey(key),
      });
    case 'admin':
      return ssoAuth({
        issuer: process.env.SSO_ISSUER,
        audience: 'admin-panel',
      });
  }
}
```

### Step 5: Cache Aggregated Responses
```typescript
// Caching strategy per BFF
const BFF_CACHE_CONFIG = {
  web: {
    ttl: 30, // seconds — web pages change frequently
    invalidationTags: ['checkout', 'cart'],
    staleWhileRevalidate: 300,
  },
  mobile: {
    ttl: 60, // seconds — mobile tolerates slightly stale data
    invalidationTags: ['checkout'],
    staleWhileRevalidate: 600,
  },
  partner: {
    ttl: 10, // seconds — partners expect fresh data
    invalidationTags: ['checkout'],
    staleWhileRevalidate: 30,
  },
};

// Cache-aware data fetching
async function getCheckoutCached(cartId: string, bffType: string): Promise<CheckoutResponse> {
  const cacheConfig = BFF_CACHE_CONFIG[bffType];
  const cached = await cache.get(`checkout:${bffType}:${cartId}`);

  if (cached && !isStale(cached.timestamp, cacheConfig.ttl)) {
    return cached.data;
  }

  if (cached && cacheConfig.staleWhileRevalidate) {
    // Return stale data, refresh in background
    refreshCache(cartId, bffType);
    return cached.data;
  }

  const fresh = await composeCheckout(cartId, bffType);
  await cache.set(`checkout:${bffType}:${cartId}`, {
    data: fresh,
    timestamp: Date.now(),
  }, { ttl: cacheConfig.staleWhileRevalidate || cacheConfig.ttl });
  return fresh;
}
```

### Step 6: Error Handling and Partial Responses
```typescript
// BFF error handling: partial success, not total failure
class BffService {
  async composeWithFallback(serviceCalls: Promise<any>[], fallbacks: any[]): Promise<any> {
    const results = await Promise.allSettled(serviceCalls);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      logger.warn('Service call failed, using fallback', { index, error: result.reason });
      return fallbacks[index];
    });
  }

  async getProductPage(productId: string): Promise<ProductPageResponse> {
    const [product, inventory, reviews, recommendations] = await this.composeWithFallback(
      [
        this.productService.getProduct(productId),
        this.inventoryService.getStock(productId),
        this.reviewService.getReviews(productId),
        this.recommendationService.getRelated(productId),
      ],
      [
        null,  // product: no fallback, page shows error
        { inStock: true, quantity: 0 },  // inventory: optimistic fallback
        [],    // reviews: empty fallback
        [],    // recommendations: empty fallback
      ]
    );

    if (!product) throw new NotFoundError('Product not found');

    return {
      product,
      inventory: { inStock: inventory.inStock, quantity: inventory.quantity },
      reviews,
      recommendations,
      _warnings: results.some(r => r.status === 'rejected')
        ? ['Some data temporarily unavailable']
        : undefined,
    };
  }
}
```

## Architecture Decision Trees

### BFF Count
```
Number of distinct client types?
├── 1-2 → Single BFF with route segregation (/api/web, /api/mobile)
└── 3+ → Dedicated BFF service per client type, separate deployment

Client types differ significantly in:
├── Data shape (page vs compact) → Separate BFFs
├── Auth mechanism (cookie vs token vs API key) → Separate BFFs
├── Performance requirements (latency sensitive?) → Separate BFFs
└── Similar across clients → Single BFF with routes
```

### BFF vs API Gateway vs GraphQL
```
What does the client need?
├── Raw proxy with auth/rate-limiting → API Gateway (Kong, NGINX, Envoy)
├── Client-defined queries → GraphQL federation
└── Server-shaped responses per client → BFF Pattern

If BFF:
├── Simple aggregation (1-2 services) → Lightweight BFF (single file, simple compose)
├── Complex composition (3+ services) → Full BFF service with circuit breakers, caching
└── Event-driven composition → Async BFF with message queue + SSE/WebSocket push

If API Gateway works but clients need different data:
├── Can gateway transform responses? → Yes → API Gateway with response transformation
└── No → BFF behind the gateway

If GraphQL but clients are diverse:
├── Clients are internal → Single GraphQL gateway is fine
└── Clients are external (3rd party) → BFF wrapping GraphQL (limits query complexity)
```

### Caching Strategy
```
Data changes infrequently?
├── Yes → Long TTL (minutes). Cache-aside pattern.
└── No → Short TTL + stale-while-revalidate. Background refresh.

BFF cache location:
├── In-memory (fast, lost on restart) → Best for single-instance, ephemeral data
├── Redis (distributed, consistent) → Best for multi-instance, shared cache
└── CDN (edge caching) → Best for public, static-like data

Cache invalidation method:
├── TTL-based → Simple, but stale window exists
├── Tag-based (purge by category) → Precise, requires event system
└── Webhook (backend notifies BFF) → Real-time, requires backend integration
```

### BFF Deployment Strategy
```
Deployment model:
├── Monolith with route segregation
│   ├── Pros: Simple, single deploy, shared infra
│   └── Cons: Scales together, one failure domain
│   Best for: Early stage, < 3 clients, small team
├── Per-client BFF service
│   ├── Pros: Independent scaling, deploy, failure isolation
│   └── Cons: More infra, inter-service comms, duplicated caches
│   Best for: Mature product, 3+ clients, dedicated frontend teams
└── BFF per feature domain
    ├── Pros: Team-aligned (checkout BFF, search BFF), fine-grained scaling
    └── Cons: Many services, client calls multiple BFFs, higher complexity
    Best for: Large org with domain-aligned teams

Auth pattern:
├── API Gateway handles auth → BFF receives validated user context
├── BFF handles auth directly → Dedicated auth per client type (preferred for security)
└── Backend service handles auth → BFF is passthrough (simplest, least secure)
```

## Security Considerations

### BFF-Specific Threats
| Threat | Impact | Mitigation |
|--------|--------|------------|
| BFF as attack vector | Compromised BFF exposes all backend | Least privilege, network isolation |
| Token forwarding | BFF leaks user token to wrong service | Scoped tokens, per-service API keys |
| Cache poisoning | Stale/malicious data served to clients | Signed cache, input validation |
| DoS via composition | One slow service blocks all BFF requests | Per-service timeouts, circuit breakers |
| Data leakage across BFFs | Mobile BFF returns web-only data | Strict type contracts per BFF |

### Network Security
- BFFs in private subnet, only accessible via API Gateway or internal LB
- No direct internet access to BFFs
- mTLS between BFF and backing services
- Rate limiting per BFF, per client IP, per user
- Request size limits per BFF type (mobile: 1MB, web: 5MB)

## Performance Deep Dive

### Composition Latency Model
```
Total BFF latency = max(service1, service2, ..., serviceN) + serialization
Serialization cost: JSON ~0.1ms/KB, Protobuf ~0.01ms/KB
```

For blocking composition (sequential):
```
Total = service1 + service2 + ... + serviceN → Death by N * P50
```
For parallel composition (Promise.all):
```
Total = max(service1, service2, ..., serviceN) → Only as slow as slowest
```

### Connection Management
```typescript
// Per-service connection pool with keep-alive
import http from 'http';

const SERVICE_POOLS = {
  cart: new http.Agent({ keepAlive: true, maxSockets: 50, timeout: 5000 }),
  pricing: new http.Agent({ keepAlive: true, maxSockets: 25, timeout: 10000 }),
  shipping: new http.Agent({ keepAlive: true, maxSockets: 25, timeout: 3000 }),
};

async function callService(name: string, url: string): Promise<any> {
  const agent = SERVICE_POOLS[name];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), agent.timeout);
  try {
    const response = await fetch(url, { agent, signal: controller.signal });
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
```

### Load Shedding
```typescript
// BFF load shedding — reject early when under pressure
class BffLoadShedder {
  private activeRequests = 0;
  private maxConcurrent: number;
  private queue: Array<{ resolve: Function; reject: Function }> = [];

  constructor(maxConcurrent: number = 100) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeRequests >= this.maxConcurrent) {
      // Shed load — return 503 immediately
      throw new BffOverloadedError('Too many requests');
    }
    this.activeRequests++;
    try {
      return await fn();
    } finally {
      this.activeRequests--;
    }
  }
}

// Usage in BFF route
app.get('/api/web/checkout/:cartId', async (req, res) => {
  try {
    const result = await loadShedder.acquire(() => composer.getCheckout(req.params.cartId, req.user.id));
    res.json(result);
  } catch (err) {
    if (err instanceof BffOverloadedError) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
    } else {
      throw err;
    }
  }
});
```

## Production Considerations

### Observability
```typescript
// Structured BFF logging with request tracing
interface BffLogContext {
  traceId: string;
  bffType: string;
  clientIp: string;
  userId: string;
  duration: number;
  services: Array<{ name: string; status: string; duration: number }>;
}

// Export metrics per BFF
// - bff_request_duration_seconds{type="web", route="checkout"}
// - bff_composition_services_count{type="mobile"}
// - bff_cache_hit_ratio{type="partner"}
// - bff_partial_failure_count{type="admin"}
// - bff_downstream_error_count{service="cart", type="web"}
```

### Backend Service Contract Evolution
- BFF acts as an anti-corruption layer between backend and frontend
- When backend services change, update the BFF composition — front ends stay unchanged
- BFF version is independent of backend service version
- Deprecate old BFF endpoints, never break mobile clients in production

## Common Pitfalls

1. **Shared monolithic BFF**: One BFF serving web and mobile. Over-fetching for mobile, under-fetching for web. Always separate.

2. **Business logic in BFF**: BFF should only compose and transform. Business rules in backend services.

3. **Synchronous dependency chain**: BFF calls A, A calls B, B calls C. Latency multiplies. Compose in parallel.

4. **No circuit breaker**: Backend service failure cascades. Use circuit breaker pattern with fallback responses.

5. **Caching without invalidation**: Stale data served indefinitely. Use tag-based invalidation.

6. **Ignoring partial failures**: Single failing service causes entire request failure. Return partial data with warnings.

7. **Auth bypass in BFF**: BFF must validate auth before forwarding requests. Never trust the client.

8. **Missing timeout configuration**: BFF waits indefinitely for backing service. Set timeouts per service call.

9. **Data transformation in client**: BFF should shape data for the client. Client should not transform.

10. **BFF as API gateway**: BFF is not Kong, NGINX, or Envoy. It is a service with composition logic.

## Best Practices

1. **No business logic in BFF** — orchestration layer only.
2. **Each BFF has its own codebase and deployment** (or at least its own routes).
3. **BFFs handle partial failures gracefully**: if one backing service fails, return partial data.
4. **Never share a BFF between mobile and web** — their data shapes differ.
5. **BFFs cache aggressively** since they serve client-specific views.
6. **Rate limits per BFF, not global**.
7. **Security boundaries: BFFs never bypass backend authorization**.
8. **Client-specific error responses** — verbose for web, concise for mobile.
9. **Request tracing headers** propagated to backing services.
10. **Versioned BFF APIs** independent from backend service versions.

## Compared With

| Feature | BFF Pattern | GraphQL Federation | API Gateway (Kong) |
|---|---|---|---|
| Data shaping | Server-defined | Client-defined | Proxy only |
| Client specificity | Per-client BFFs | Unified graph | Single API |
| Caching | Application-level | Per-resolver | Edge caching |
| Over-fetching | None (shaped) | Client controlled | High |
| Complexity | Moderate | High | Low |
| Learning curve | Low | High | Moderate |
| Performance | High | Moderate | High |
| Backend coupling | Low (BFF adapts) | High (schema) | Low |

## Performance

- BFF composition with parallel requests: total latency = max individual service latency.
- Caching at BFF reduces backend load by 60-80% for page-shaped endpoints.
- Connection pooling: Keep persistent connections to each backing service.
- Response compression: Gzip/Brotli at BFF level reduces payload size by 70%.
- Timeout per service call: 2 seconds default, 5 seconds for slow operations.
- Circuit breaker: Open after 50% failure rate over 10-second window.

## Tooling

| Tool | Purpose |
|---|---|
| **Node.js (Express/Fastify)** | BFF runtime |
| **Redis** | Distributed caching, session store |
| **Axios / node-fetch** | HTTP client for backing services |
| **opossum** | Circuit breaker |
| **pino** | Structured logging with request tracing |
| **Docker** | Per-BFF containerization |
| **Kubernetes** | BFF deployment and scaling |
| **Prometheus** | BFF metrics (latency, error rate) |
| **Grafana** | BFF monitoring dashboards |
| **jaeger/zipkin** | Distributed tracing |

## Rules

- No business logic in the BFF — it is an orchestration layer only.
- Each BFF has its own codebase and deployment (or at least its own routes).
- BFFs must handle partial failures gracefully: if one backing service fails, return partial data.
- Never share a BFF between mobile and web — their data shapes differ.
- BFFs should cache aggressively since they serve client-specific views.
- Rate limits should be per BFF, not global.
- Security boundaries: BFFs must never bypass backend authorization.
- All service calls have explicit timeouts — no indefinite waits.
- Request tracing headers propagated to all downstream services.
- BFF APIs are versioned independently from backend service versions.
- Circuit breaker pattern for all downstream service calls.
- Cache invalidation via event-driven mechanisms (pub/sub, webhook).

## References
  - references/bff-fundamentals.md — BFF Fundamentals
  - references/bff-advanced.md — BFF Advanced
  - references/bff-architecture.md — BFF Architecture
  - references/bff-auth-session.md — BFF Auth and Session Reference
  - references/bff-orchestration.md — BFF Orchestration Reference
  - references/bff-performance.md — BFF Performance
  - references/bff-security.md — BFF Security
  - references/bff-testing.md — BFF Testing
  - references/bff-implementation-strategies.md — BFF Implementation Strategies
  - references/bff-rate-limiting.md — BFF Rate Limiting and Load Shedding

## Handoff
No artifact produced unless requested.
Next skill: data-masking — protect sensitive data flowing through BFF responses.
Carry forward: client types, BFF API contracts, security patterns.
