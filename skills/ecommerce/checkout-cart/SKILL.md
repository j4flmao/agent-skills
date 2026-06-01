---
name: ecommerce-checkout-cart
description: >
  Use when the user asks about shopping cart, checkout flow, cart management, order management, discount/coupon system, tax calculation, shipping logic, or e-commerce backend patterns. Do NOT use for: payment processing (ecommerce-payment-processing), or general backend API design (backend-api-design).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ecommerce, checkout-cart, phase-3]
---

# Checkout & Cart

## Purpose
Design shopping cart and checkout systems: cart management, order lifecycle, discount/promotion engine, tax calculation, shipping integration, and checkout optimization.

## Agent Protocol

### Trigger
- "shopping cart", "checkout flow", "cart management", "order management"
- "discount engine", "coupon system", "promotion", "tax calculation"
- "checkout optimization", "cart abandonment", "order lifecycle"

### Input Context
- E-commerce platform (custom, Shopify, Magento, WooCommerce, composable)
- Cart scope (single-session, persistent, cross-device)
- Order complexity (simple goods, subscriptions, digital, B2B with approvals)
- Tax jurisdictions and shipping carriers

### Output Artifact
- Cart and checkout architecture design
- Discount engine specification
- Order state machine
- Integration patterns for payments, tax, shipping

### Completion Criteria
- [ ] Cart data model defined with all edge cases (merge, expiry, concurrent access)
- [ ] Order state machine with all transitions and validations
- [ ] Discount engine covering all promotion types required
- [ ] Tax and shipping integration points documented
- [ ] Abandoned cart recovery flow designed
- [ ] Checkout optimization recommendations provided

## Decision Trees

### Cart Persistence Strategy Decision Tree

1. Are users required to log in before adding items to cart?
   - YES -> Server-side cart only. Store in database. Simple model, no merge needed. All cart operations go through authenticated API.
   - NO -> Guest cart required. Go to 2.

2. Do you need cross-device cart persistence for guest users?
   - YES -> Server-side guest cart with anonymous session token. Store in cookies or localStorage. Cart persisted on server with session ID. Merge on login.
   - NO -> Client-side cart (localStorage). Simpler, lower server cost, but lost if browser data cleared. Best for simple stores.

3. Is cart value typically high or low?
   - High (B2B, luxury): Server-side persistence critical. Users invest time in cart. Expect to return days later. Cart recovery important.
   - Low (impulse buy under $50): Client-side acceptable. Short consideration window. Cart recovery less impactful.

4. Do you need server-side cart features (abandoned cart emails, analytics)?
   - YES -> Server-side cart required at checkout minimum. Consider full server-side for accurate analytics.
   - NO -> Client-side sufficient for browsing. Sync to server only at checkout.

### Discount Engine Type Selection Decision Tree

1. Does the discount apply to individual items or the entire order?
   - Item-level -> Apply before subtotal calculation. Examples: percentage off product, BOGO. Requires item-level price override.
   - Order-level -> Apply after subtotal, before tax/shipping. Examples: fixed amount off, percentage off total.

2. Is the discount automatic or requires a coupon code?
   - Automatic (cart rule) -> Evaluate eligibility in discount engine. Apply without user action. Examples: free shipping over $50, 10% off when buying 3+.
   - Coupon code -> User enters code. Validate code exists, is active, not expired, not over usage limit. Apply discount.

3. Can discounts be combined with other discounts?
   - Exclusive -> Only one discount per order/category. Best discount wins. Simplest logic. Lowest support volume.
   - Stackable -> Multiple discounts apply together. Configure stacking order: item discounts first, then cart discounts, then shipping. Set max N promotions per order.
   - Best-of -> Calculate total for each eligible discount. Auto-select the one giving the lowest total for customer.

4. Does the discount have usage limits?
   - Per-customer limit -> Track usage in customer profile. Check before applying. Use Redis counter with TTL for rate limiting.
   - Total budget cap -> Track total discount amount disbursed. Stop applying when budget exhausted. Reset per budget period.
   - First N customers -> Pre-generate codes or set first-N flag. Race condition: handle with atomic counter (Redis INCR).

### Checkout Flow Optimization Decision Tree

1. Is this a returning customer?
   - YES -> Pre-fill saved addresses and payment method. One-click checkout option if express payment method stored. Skip address entry step.
   - NO -> Guest checkout available. No forced account creation. Offer account creation after purchase.

2. Is the cart value below free shipping threshold?
   - YES -> Show shipping cost early in checkout. Offer progress bar toward free shipping. Consider suggesting items to reach threshold.
   - NO -> Free shipping indicator. No shipping cost surprise at end.

3. Are there regulatory requirements for checkout?
   - YES -> Include mandatory fields (tax ID for B2B, age verification for restricted goods, customs info for cross-border). Validate before order submission.
   - NO -> Standard checkout flow. Minimum required fields. Remove friction.

4. Is this a high-risk order (new customer, high value, unusual shipping)?
   - YES -> Additional verification step (CVV re-entry, OTP). Fraud review before fulfillment. May require manual approval.
   - NO -> Standard checkout. No additional friction.

## Workflow

### Cart Architecture
```
Add Item -> Cart Service -> Database
  +-- Validate stock, price, eligibility
Update Qty -> Recalculate totals
  +-- Subtotal, discount, tax, shipping, total
Apply Coupon -> Validate and apply discount
Checkout -> Convert cart to order
  +-- Lock cart, create order, clear cart
```

### Cart Data Model
```yaml
cart:
  id: UUID (primary key)
  user_id: UUID (nullable for guest)
  session_token: string (for guest carts)
  status: active | abandoned | converting | checkout_complete
  created_at: timestamp
  updated_at: timestamp
  expires_at: timestamp
  items:
    - id: UUID
      product_id: UUID
      variant_id: UUID (nullable)
      sku: string
      name: string
      quantity: integer
      unit_price: decimal (price at time of add)
      discount_amount: decimal
      discount_percentage: decimal
      applied_promotions: [promotion_id]
      image_url: string
      is_gift: boolean
  totals:
    subtotal: decimal (sum of item prices x quantities)
    discount_total: decimal (sum of all discounts)
    shipping_total: decimal (calculated by shipping service)
    tax_total: decimal (calculated by tax service)
    grand_total: decimal (subtotal - discount + shipping + tax)
  currency: string (ISO 4217)
  coupon_code: string (nullable)
  coupon_id: UUID (nullable)
  applied_promotions: [promotion_id]
  shipping_address_id: UUID (nullable)
  billing_address_id: UUID (nullable)
  shipping_method: string (nullable)
  notes: string (nullable)
  metadata: map (extensible, store any additional data)
```

### Cart Architecture Patterns

#### Guest vs Registered Cart
```yaml
guest_cart:
  storage: "Local storage (client-side) or temporary server-side key"
  merge: "Merge into user cart on login -- resolve conflicts by keeping newest"
  expiry: "30 days since last activity"
  limitation: "Cannot save for later, limited to 50 items"

registered_cart:
  storage: "Server-side persistent storage"
  merge_strategy:
    - "If guest cart has items before login: merge into server cart"
    - "Conflict resolution: newest quantity wins"
    - "Keep guest cart items that don't exist in server cart"
  persistence: "Unlimited duration, cross-device sync"
  features: ["Save for later", "Wishlist conversion", "Multi-device sync"]
```

#### Cart State Machine
```yaml
cart_states:
  active:
    description: "User is actively adding/removing items"
    ttl: "30 days inactivity -> abandoned"
    allowed_transitions: ["abandoned", "converting"]
    
  abandoned:
    description: "Cart expired or user left without checkout"
    actions: ["Send recovery email", "Save items for 7 days"]
    allowed_transitions: ["active", "converting"]
    
  converting:
    description: "User entered checkout flow"
    actions: ["Lock cart quantities", "Reserve inventory", "Calculate final totals"]
    allowed_transitions: ["active", "checkout_complete", "expired"]
    
  checkout_complete:
    description: "Cart successfully converted to order"
    actions: ["Clear cart", "Create order record", "Send confirmation"]
    final: true
```

#### Cart Scalability Patterns
```yaml
scalability_patterns:
  high_traffic_events:
    problem: "Flash sales, drops, Black Friday spike"
    solutions:
      - "Queue cart write operations -- accept writes, process asynchronously"
      - "Pre-calculate price snapshots -- avoid real-time price lookups"
      - "Inventory reservation with timeout -- release unconfirmed after 15min"
      - "Read-through cache for cart load -- write-back cache for updates"
      
  multi_tenant_cart:
    b2b:
      features: ["Quote-based pricing", "Approval workflows", "Budgets", "Multiple shipping addresses"]
      data_model: "Cart belongs to organization, items priced per negotiated contract"
    marketplace:
      features: ["Multi-vendor cart", "Split shipments", "Seller-specific promotions"]
      data_model: "Cart items grouped by vendor, each vendor calculates their own totals"
```

### Order Lifecycle
```
Cart -> Pending -> Confirmed -> Processing -> Shipped -> Delivered
                    +                         +
               Payment Failed             Return Requested
                    +                         +
                Cancelled                  Returned/Refunded
```

### Order State Machine
```yaml
order_states:
  pending:
    entry: "Create order record, reserve inventory"
    exit: "Release inventory reservation"
    timeout: "30min -> auto-cancel if payment not confirmed"
    
  confirmed:
    entry: "Capture payment, send confirmation email"
    actions: ["Fulfillment queue assignment", "Tax recording", "Accounting entry"]
    
  processing:
    entry: "Picking/packing handoff"
    sub_states: ["awaiting_pickup", "picked", "packed", "label_created"]
    
  shipped:
    entry: "Tracking number registered, notification sent"
    data: ["Carrier", "Tracking number", "Estimated delivery date"]
    
  delivered:
    entry: "Delivery confirmation, review request"
    follow_up: ["Return window tracking", "Review NPS survey"]
    
  cancelled:
    allowed_before: "confirmed -- auto-refund"
    after_confirmed: "Manual refund processing required"
    
  returned:
    states: ["return_requested", "return_approved", "item_received", "refund_issued"]
    sla: "Approve within 48h, refund within 5 business days of receipt"
```

### Discount Engine
| Discount Type | Logic | Example |
|---------------|-------|---------|
| Percentage | % off total or category | 20% off all shoes |
| Fixed amount | Flat discount | $10 off orders over $100 |
| BOGO | Buy one get one | Buy 2, get 1 free |
| Tiered | Volume-based pricing | 10% off 5+ items |
| Bundle | Fixed price for set | $50 for 3 selected items |

### Promotion Stacking Rules
```yaml
stacking_rules:
  order: "Apply in order: item discounts -> cart discounts -> shipping discounts -> loyalty"
  exclusivity:
    exclusive: "Cannot combine with any other promotion"
    stackable: "Can combine with other stackable promotions"
    best_of: "Auto-select best applicable promotion from set"
  limits:
    usage: "Max N uses per customer"
    budget: "Total discount cap: $X"
    stack: "Max N promotions per order"
```

### Discount Validation Pipeline
```yaml
validation_pipeline:
  step_1_syntax: "Is the coupon code format valid? Alphanumeric, correct length."
  step_2_existence: "Does the coupon code exist in the database and is it active?"
  step_3_ timeframe: "Is the current date within the valid_from and valid_until range?"
  step_4_usage_limits: "Has the coupon exceeded max uses (total or per customer)?"
  step_5_eligibility: "Does the cart meet minimum purchase amount, specific items, or category requirements?"
  step_6_exclusivity: "Is the coupon compatible with already-applied promotions?"
  step_7_apply: "Calculate discount amount, update cart totals, record promotion usage."
```

### Tax Calculation
| Strategy | Tool | Best For |
|----------|------|----------|
| Manual rules | Custom logic | Single jurisdiction |
| TaxJar | API integration | US multi-state |
| Avalara | API integration | Global multi-jurisdiction |
| Stripe Tax | Built-in | Stripe users |

### Tax Calculation Flow
1. Determine tax jurisdiction based on shipping address (origin for origin-based, destination for destination-based).
2. Classify each line item by tax category (standard, reduced, zero-rated, exempt).
3. Calculate taxable amount per item (subtotal minus item-level discounts).
4. Apply tax rate per jurisdiction per item category.
5. Sum item-level tax amounts for order total.
6. Account for shipping taxability (varies by jurisdiction).
7. Record tax breakdown per jurisdiction for reporting.

### Shipping Integration Patterns
| Carrier | Integration Method | Key Feature |
|---------|-------------------|-------------|
| FedEx | REST API | Rate quotes, tracking, labels |
| UPS | SOAP/REST API | Rate quotes, time-in-transit |
| USPS | Web Tools API | Domestic rates, tracking |
| DHL | REST API | International shipping, customs |
| ShipEngine | Unified API | Multi-carrier, label generation |

### Shipping Calculation Flow
1. Collect items (weight, dimensions, quantity) from cart.
2. Determine origin address (warehouse location, potentially multi-warehouse).
3. Get destination address from customer (validate address via API).
4. Select available shipping methods from carrier(s) based on package specs.
5. Calculate rate for each method: base rate + surcharges (fuel, residential delivery, Saturday delivery).
6. Apply shipping discounts (free shipping over threshold, membership free shipping).
7. Present options to customer with estimated delivery dates.
8. On selection, record chosen method and rate in order.

### Abandoned Cart Recovery
```yaml
recovery_flow:
  trigger: "Cart abandoned for 1 hour (status: active -> abandoned)"
  step_1_immediate: "Send email: 'You left something behind' with cart summary and CTA"
  step_2_24h: "Send email: 'Your cart is still waiting' with product recommendations"
  step_3_72h: "Send email: 'Last chance' with limited-time discount offer (if margin allows)"
  step_4_7d: "Send email: 'We saved your cart' with note that cart will expire"
  step_5_30d: "Mark cart as expired, release any inventory reservations"
  
  optimization:
    timing: "Send first email within 1 hour for best conversion"
    personalization: "Include images of abandoned items, similar products"
    incentives: "Free shipping or 10% discount on abandoned cart items"
    exit_intent: "Capture email before abandonment (exit-intent popup)"
```

### Checkout Optimization Checklist
```yaml
optimization_checklist:
  performance:
    - "Cart summary loads in <500ms from any action"
    - "Price calculations cached and invalidated on change"
    - "Async inventory check -- don't block checkout on stock verification"
    
  ux:
    - "Guest checkout available -- no forced account creation"
    - "Progress indicator showing step N of 4"
    - "Save address autocomplete (Google Places, Loqate)"
    - "Inline validation -- errors shown per field on blur"
    
  conversion:
    - "Abandoned cart email within 1 hour"
    - "Cart persistence across sessions (logged-in users)"
    - "Multiple payment methods displayed upfront"
    - "Estimated total shown before checkout entry"
    
  trust:
    - "Security badges (SSL, PCI compliant) visible"
    - "Clear return policy link near checkout button"
    - "Shipping cost shown before payment entry"
    - "Stock availability indicator per item"
```

## Governance Framework

### Cart and Checkout Governance

#### Pricing Accuracy Review
- Daily: Automated price verification between cart service and product catalog. Flag discrepancies.
- Weekly: Manual audit of discount application for N sampled orders. Verify correct discount logic.
- Monthly: Tax calculation audit. Verify correct rates applied per jurisdiction. Update rate changes.
- Quarterly: Full pricing and promotion audit. Validate all active promotions apply correctly.

#### Order Audit Trail
- Every order state transition logged with timestamp, actor, and reason
- Cart modifications logged: item adds, quantity changes, price overrides, coupon applications
- Price recalculations logged: original vs. recalculated values, trigger reason
- Tax and shipping calculations recorded in order history for audit and dispute resolution

#### Abandoned Cart Compliance
- GDPR: Cart data retained for max 30 days after abandonment. User can request cart data deletion.
- CAN-SPAM: Abandoned cart emails include opt-out link. Honor opt-out within 10 business days.
- Data retention: Anonymous cart data deleted after 30 days. Identified user cart data retained per user data policy.

## Common Pitfalls

Pitfall 1: Cart not persisted across sessions for logged-in users. Users return to find empty cart. Frustration and lost sales. Mitigation: server-side cart persistence for authenticated users. Sync across devices.

Pitfall 2: Price changes between cart creation and checkout. Product price increases after item added. Customer sees higher price at checkout. Mitigation: snapshot price when item added to cart. Honor snapshot price for N hours.

Pitfall 3: Discount stacking causing negative totals. Multiple promotions combined result in order total below zero. Mitigation: cap discount at subtotal amount. Minimum cart value for promotion eligibility.

Pitfall 4: Inventory overallocation during high-traffic events. More inventory reserved than available because of race conditions. Mitigation: atomic inventory operations (Redis DECR, database row lock). Short reservation timeout (15 minutes).

Pitfall 5: Tax calculation incorrect for multi-jurisdiction orders. Items shipping to different locations with different tax rates. Mitigation: line-item level tax calculation. Determine tax jurisdiction per shipping destination per line item.

Pitfall 6: Order state machine missing failure transitions. Payment fails, inventory release not triggered. Mitigation: all failure states mapped to inventory release. Timeout transitions on payment pending status.

Pitfall 7: Guest cart merge conflicts. User adds items as guest, logs in, items from server cart are lost. Mitigation: merge strategy preserves both sets of items. Conflict resolution: newest quantity wins.

## Best Practices

Practice 1: Always snapshot prices at cart-add time. Product prices change. Cart should honor the price shown to the customer when they added the item. Price snapshot stored in cart item record.

Practice 2: Implement cart-level idempotency keys. Prevent duplicate item additions from retry logic. Deduplicate on product_id + variant_id + user_id within same session.

Practice 3: Reserve inventory at checkout entry, not cart add. Early reservation blocks inventory unnecessarily. Reserve when user enters checkout (converting state). Release after timeout or payment completion.

Practice 4: Use event-driven architecture for order processing. Order created event triggers: payment capture, inventory decrement, fulfillment assignment, notification sending. Decoupled services handle each concern.

Practice 5: Log all price changes with before/after values. Audit trail for price discrepancy investigation. Critical for tax audits and chargeback disputes.

Practice 6: Pre-calculate shipping and tax estimates. Show estimated total before checkout entry. Avoid surprise costs at final step. Recalculate after address change.

Practice 7: Support split payments, partial payments, and multi-currency. Not all customers pay with a single method. Cart system should support partial payments (gift card + credit card).

Practice 8: Implement cart expiry and cleanup. Abandoned carts consume storage. Schedule cleanup job for expired carts. Follow data retention policy for abandoned cart data.

## References
  - references/cart-architecture.md -- Cart Data Model
  - references/checkout-cart-advanced.md -- Checkout Cart Advanced Topics
  - references/checkout-cart-fundamentals.md -- Checkout Cart Fundamentals
  - references/checkout-optimization.md -- Checkout Optimization
  - references/checkout-ux.md -- Checkout UX Patterns
  - references/discount-engine.md -- Discount Engine Design
## Handoff
Hand off to `ecommerce-payment-processing` for payment integration. Hand off to `backend-universal-order-management` for order fulfillment patterns. Hand off to `ecommerce-subscription` for recurring billing needs.
