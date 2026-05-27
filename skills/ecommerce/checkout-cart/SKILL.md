---
name: ecommerce-checkout-cart
description: >
  Use when the user asks about shopping cart, checkout flow, cart management, order management, discount/coupon system, tax calculation, shipping logic, or e-commerce backend patterns. Do NOT use for: payment processing (ecommerce-payment-processing), or general backend API design (backend-api-design).
version: "1.0.0"
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

## Workflow

### Cart Architecture
```
Add Item → Cart Service → Database
  └── Validate stock, price, eligibility
Update Qty → Recalculate totals
  └── Subtotal, discount, tax, shipping, total
Apply Coupon → Validate and apply discount
Checkout → Convert cart to order
  └── Lock cart, create order, clear cart
```

### Cart Architecture Patterns

#### Guest vs Registered Cart
```yaml
guest_cart:
  storage: "Local storage (client-side) or temporary server-side key"
  merge: "Merge into user cart on login — resolve conflicts by keeping newest"
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
    ttl: "30 days inactivity → abandoned"
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

### Cart Scalability Patterns
```yaml
scalability_patterns:
  high_traffic_events:
    problem: "Flash sales, drops, Black Friday spike"
    solutions:
      - "Queue cart write operations — accept writes, process asynchronously"
      - "Pre-calculate price snapshots — avoid real-time price lookups"
      - "Inventory reservation with timeout — release unconfirmed after 15min"
      - "Read-through cache for cart load — write-back cache for updates"
      
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
Cart → Pending → Confirmed → Processing → Shipped → Delivered
                    ↓                         ↓
               Payment Failed             Return Requested
                    ↓                         ↓
                Cancelled                  Returned/Refunded
```

### Order State Machine
```yaml
order_states:
  pending:
    entry: "Create order record, reserve inventory"
    exit: "Release inventory reservation"
    timeout: "30min → auto-cancel if payment not confirmed"
    
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
    allowed_before: "confirmed — auto-refund"
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
  order: "Apply in order: item discounts → cart discounts → shipping discounts → loyalty"
  exclusivity:
    exclusive: "Cannot combine with any other promotion"
    stackable: "Can combine with other stackable promotions"
    best_of: "Auto-select best applicable promotion from set"
  limits:
    usage: "Max N uses per customer"
    budget: "Total discount cap: $X"
    stack: "Max N promotions per order"
```

### Tax Calculation
| Strategy | Tool | Best For |
|----------|------|----------|
| Manual rules | Custom logic | Single jurisdiction |
| TaxJar | API integration | US multi-state |
| Avalara | API integration | Global multi-jurisdiction |
| Stripe Tax | Built-in | Stripe users |

### Checkout Optimization Checklist
```yaml
optimization_checklist:
  performance:
    - "Cart summary loads in <500ms from any action"
    - "Price calculations cached and invalidated on change"
    - "Async inventory check — don't block checkout on stock verification"
    
  ux:
    - "Guest checkout available — no forced account creation"
    - "Progress indicator showing step N of 4"
    - "Save address autocomplete (Google Places, Loqate)"
    - "Inline validation — errors shown per field on blur"
    
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

## References
  - references/cart-architecture.md — Cart Data Model
  - references/checkout-cart-advanced.md — Checkout Cart Advanced Topics
  - references/checkout-cart-fundamentals.md — Checkout Cart Fundamentals
  - references/checkout-optimization.md — Checkout Optimization
  - references/checkout-ux.md — Checkout UX Patterns
  - references/discount-engine.md — Discount Engine Design
## Handoff
Hand off to `ecommerce-payment-processing` for payment integration. Hand off to `backend-universal-order-management` for order fulfillment patterns. Hand off to `ecommerce-subscription` for recurring billing needs.
