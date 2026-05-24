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
```javascript
// Web BFF: returns a page-shaped response
GET /api/web/checkout/{cartId}
{
  "items": [...],
  "total": 49.99,
  "shippingOptions": [...],
  "paymentMethods": [...]
}

// This aggregates:
//  - Cart Service: items
//  - Pricing Service: total
//  - Shipping Service: options
//  - Payment Service: methods
```

### Step 3: Implement Composition
```javascript
async function getCheckout(cartId) {
  const [cart, pricing, shipping, payment] = await Promise.all([
    cartService.getCart(cartId),
    pricingService.calculateTotal(cartId),
    shippingService.getOptions(cartId),
    paymentService.getMethods({ userId: req.user.id }),
  ]);
  return { items: cart.items, total: pricing.total, shippingOptions: shipping, paymentMethods: payment };
}
```

### Step 4: Handle Auth per BFF
- Web BFF: session cookie, CSRF token.
- Mobile BFF: bearer token, device binding.
- Partner BFF: API key + HMAC signature.
- Admin BFF: SSO + short-lived JWT.

### Step 5: Cache Aggregated Responses
```javascript
const cached = await cache.get(`checkout:${cartId}`);
if (cached) return cached;
const result = await composeCheckout(cartId);
await cache.set(`checkout:${cartId}`, result, { ttl: 30 });
```

## Rules
- No business logic in the BFF — it is an orchestration layer only.
- Each BFF has its own codebase and deployment (or at least its own routes).
- BFFs must handle partial failures gracefully: if one backing service fails, return partial data.
- Never share a BFF between mobile and web — their data shapes differ.
- BFFs should cache aggressively since they serve client-specific views.
- Rate limits should be per BFF, not global.
- Security boundaries: BFFs must never bypass backend authorization.

## References
- `references/bff-architecture.md` — BFF architecture and design patterns
- `references/bff-auth-session.md` — Session management, token exchange, refresh token rotation, cookie security, CSRF
- `references/bff-orchestration.md` — Data aggregation, API composition, partial response, error handling, caching
- `references/bff-security.md` — BFF security best practices

## Handoff
No artifact produced unless requested.
Next skill: data-masking — protect sensitive data flowing through BFF responses.
Carry forward: client types, BFF API contracts, security patterns.
