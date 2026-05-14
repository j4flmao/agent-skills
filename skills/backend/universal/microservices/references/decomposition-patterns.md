# Decomposition Patterns

## Business Capability Decomposition

Map each business capability to a service. A capability is a distinct business function with its own data, rules, and API.

### E-commerce Example

| Business Capability | Service Name | Owns Data | Exposes API |
|---|---|---|---|
| Product catalog | `product-service` | Products, categories, inventory | Product search, details |
| Order management | `order-service` | Orders, order items, status | Create, get, update orders |
| Payment processing | `payment-service` | Transactions, refunds | Charge, refund, reconcile |
| Shipping | `shipping-service` | Shipments, tracking, carriers | Ship, track, rate |
| Customer | `customer-service` | Customers, addresses, preferences | Register, authenticate, profile |
| Notification | `notification-service` | Templates, delivery log | Email, SMS, push |

### Decomposition Rules

1. **Autonomy**: Service owns its data exclusively. No data sharing across services.
2. **Deployability**: Service can be deployed independently of other services.
3. **Team alignment**: Service ownership maps to a single team (Conway's Law).
4. **Failure isolation**: Failure in one service should not cascade.
5. **Domain boundary**: Services map to DDD bounded contexts.

## Subdomain Decomposition (DDD)

Identify subdomains within the business domain:

- **Core domain** — competitive advantage, custom build, highest investment
- **Supporting subdomain** — necessary but not differentiating, can be bought or built
- **Generic subdomain** — commodity, buy off-the-shelf (auth, email, payments)

### Example: Insurance

| Subdomain | Type | Decision |
|---|---|---|
| Policy underwriting | Core | Custom build, dedicated team |
| Claims processing | Core | Custom build, dedicated team |
| Customer management | Supporting | Build simple CRM |
| Payment processing | Generic | Integrate Stripe |
| Document generation | Generic | Use DocuSign/SDK |
| Email notifications | Generic | Use SendGrid |

## Strangler Fig Migration

### Phase 1: Identify Seams
- Find modules that change independently (git log analysis)
- Measure coupling (if module A changes, how often does B change too?)
- Identify bounded contexts

### Phase 2: Extract Read Side
```javascript
// New read service fronts cached/computed data
// Monolith still handles writes
router.get('/api/v2/orders', async (req, res) => {
    const data = await newOrderService.getOrders(req.user.id);
    res.json(data);
});

// Write still goes to monolith
router.post('/api/v2/orders', async (req, res) => {
    // Feature flag: if new order service is ready, route there
    if (featureFlags.newOrders) {
        return await newOrderService.createOrder(req.body);
    }
    // Otherwise, monolith handles
    return await legacyHandler(req, res);
});
```

### Phase 3: Dual Writes
- Write to both old and new systems
- Compare read results for consistency
- Log discrepancies

### Phase 4: Redirect Reads
- Point all read traffic to new service
- Keep monolith write until all consumers migrated

### Phase 5: Redirect Writes
- Point write traffic to new service
- Monolith becomes read-only

### Phase 6: Decommission
- Remove monolith when no traffic remains
- Archive data

## Service Granularity Guidelines

### Too Fine-Grained (Anti-Pattern)
```
user-service          → CRUD users
address-service       → CRUD addresses
preference-service    → CRUD preferences
payment-method-service → CRUD payment methods
```
**Problem**: Create order requires 4 network calls. Pain.

### Too Coarse-Grained (Anti-Pattern)
```
order-service → handles: orders, payments, shipping, inventory, invoices
```
**Problem**: God service, team bottleneck.

### Target Granularity
- Service can be explained in one sentence
- Service fits 2-pizza team (6-8 people)
- Service has 5-15 endpoints
- Service has 5-20 database tables
- Service can be deployed and tested independently
