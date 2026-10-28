# Checkout and Cart Fundamentals

The domain model and core mechanics behind a shopping cart and checkout: entities, money handling, the pricing pipeline (items, discounts, shipping, tax), inventory checks, the checkout state machine, and turning a checkout into an order exactly once. UX, discount engines, payment integration and fulfillment have dedicated sibling references.

## Core Entities

| Entity | Key fields | Notes |
|---|---|---|
| Cart | id, customer_id or anonymous token, currency, status, updated_at, expires_at | Mutable, short-lived |
| Cart line | cart_id, sku/variant_id, quantity, unit_price snapshot, attributes | Unique per (cart, variant, attributes) |
| Checkout | cart reference, email, addresses, shipping method, payment intent ref, totals snapshot | Collects data needed to place the order |
| Order | number, lines (immutable copies), totals, tax lines, payment status, fulfillment status | Immutable financial record after placement |
| Price | variant_id, currency, amount, price list/market, validity | Source of truth; carts reprice from it |
| Inventory | variant_id, location, on_hand, reserved | Availability = on_hand - reserved |

Separate cart (intent, mutable) from order (commitment, immutable). Copy names, prices and tax data into order lines so later catalog changes do not alter historical orders.

## Money Handling
- Store amounts as integers in minor units (cents) or fixed-point decimals with an explicit currency; never binary floating point.
- Currency exponent differs (JPY has 0 decimals, BHD has 3); use ISO 4217 metadata.
- Define rounding rules (per line vs. per total, half-up vs. banker's rounding) and apply them consistently, matching your tax engine.
- Allocate order-level discounts across lines proportionally and assign rounding remainders deterministically (needed for refunds and tax).

```ts
// Allocate an order-level discount (in minor units) across lines by line subtotal
function allocate(totalDiscount: number, lineSubtotals: number[]): number[] {
  const sum = lineSubtotals.reduce((a, b) => a + b, 0);
  if (sum === 0) return lineSubtotals.map(() => 0);
  const raw = lineSubtotals.map((s) => (totalDiscount * s) / sum);
  const floored = raw.map(Math.floor);
  let remainder = totalDiscount - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) { if (remainder-- <= 0) break; floored[i] += 1; }
  return floored;
}
```

## Pricing Pipeline

Compute totals server-side, in a fixed order, every time the cart changes:
```
1. Line base price      = current price for variant, market, customer group
2. Line-level discounts = item promotions (e.g. 20% off category)
3. Order-level discounts= coupons, thresholds ("$10 off $100") allocated to lines
4. Shipping             = rate for address + method (+ shipping discounts)
5. Tax                  = per line and shipping, by jurisdiction and product tax code
6. Grand total          = sum(lines) - discounts + shipping + tax (+ duties/fees)
```
- Never trust prices or totals sent by the client.
- Tax-inclusive (VAT markets) vs. tax-exclusive (US sales tax) display changes how totals are presented, not what you store.
- Use a tax service (Avalara, Vertex, Stripe Tax, TaxJar) or a well-maintained rules table; tax depends on ship-to address, product category and nexus/registration.

## Cart Operations

| Operation | Rules |
|---|---|
| Add item | Validate variant exists, is sellable in the market, quantity limits; merge with existing line |
| Update quantity | 0 removes the line; enforce max per order |
| Apply coupon | Validate eligibility server-side; store code; reprice |
| Set address | Recalculate shipping options and tax |
| Merge carts | On login, merge anonymous cart into customer cart (sum or prefer latest per variant) |
| Expire | Abandoned carts expire (e.g. 30 days anonymous); keep for recovery campaigns if consented |

Use optimistic concurrency (version column or ETag) so two tabs updating the cart do not overwrite each other.

## Inventory Checks
| Strategy | When reserved | Trade-off |
|---|---|---|
| Check at add-to-cart only | Never | Oversell risk |
| Reserve at checkout start with TTL | Checkout begins | Holds stock for abandoners; needs expiry |
| Reserve at payment authorization | Payment step | Minimal holding; may fail at the last step |
| Decrement at order placement | Order created | Simple; oversell window for high-demand items |

Most stores validate availability at each step and reserve at order placement or payment, using an atomic conditional update:
```sql
UPDATE inventory
SET reserved = reserved + :qty
WHERE variant_id = :variant AND location_id = :loc AND on_hand - reserved >= :qty;
-- 0 rows updated -> insufficient stock
```

## Checkout State Machine

```
CART -> CHECKOUT_STARTED -> CONTACT_PROVIDED -> SHIPPING_SELECTED -> PAYMENT_PENDING
     -> PAYMENT_AUTHORIZED -> ORDER_PLACED
          \-> PAYMENT_FAILED (retry) ; any state -> EXPIRED / ABANDONED
```
- Each transition validates required data and re-checks price and stock.
- Show the customer exactly the totals that will be charged; if anything changed (price, stock, tax), require confirmation.

## Placing the Order Exactly Once
- Client sends an idempotency key with "place order"; the server stores it with the resulting order ID.
- Create the order and inventory reservation in one database transaction; record a payment intent reference.
- Payment confirmation may arrive via redirect or webhook in any order; both paths call the same idempotent "finalize" operation.
- Publish `OrderPlaced` through a transactional outbox for email, fulfillment and analytics.

```sql
CREATE TABLE checkout_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  checkout_id     BIGINT NOT NULL,
  order_id        BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Guest vs. Account Checkout
- Offer guest checkout; account creation optional after purchase.
- Identify guests by email; allow order lookup with email + order number.
- Respect privacy: collect only data needed to fulfill the order.

## Key Metrics
Cart abandonment rate, checkout conversion per step, payment authorization rate, average order value, time to complete checkout, out-of-stock-at-checkout rate.

## Checklist
- [ ] Integer/decimal money with currency and documented rounding
- [ ] Server-side repricing in a fixed pipeline order
- [ ] Order lines copy price, tax and product data
- [ ] Stock validated at each step; atomic reservation
- [ ] Idempotent order placement and payment finalization
- [ ] Cart concurrency control and login merge rules
- [ ] Outbox events for downstream systems
