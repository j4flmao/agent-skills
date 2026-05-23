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

### Order Lifecycle
```
Cart → Pending → Confirmed → Processing → Shipped → Delivered
                    ↓                         ↓
               Payment Failed             Return Requested
                    ↓                         ↓
                Cancelled                  Returned/Refunded
```

### Discount Engine
| Discount Type | Logic | Example |
|---------------|-------|---------|
| Percentage | % off total or category | 20% off all shoes |
| Fixed amount | Flat discount | $10 off orders over $100 |
| BOGO | Buy one get one | Buy 2, get 1 free |
| Tiered | Volume-based pricing | 10% off 5+ items |
| Bundle | Fixed price for set | $50 for 3 selected items |

### Tax Calculation
| Strategy | Tool | Best For |
|----------|------|----------|
| Manual rules | Custom logic | Single jurisdiction |
| TaxJar | API integration | US multi-state |
| Avalara | API integration | Global multi-jurisdiction |
| Stripe Tax | Built-in | Stripe users |

## References
- `references/cart-architecture.md` — Cart data model and state management
- `references/discount-engine.md` — Coupon and promotion engine design
- `references/checkout-optimization.md` — Checkout flow optimization and conversion
