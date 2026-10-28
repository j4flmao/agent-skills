# Advanced Checkout and Cart Engineering

Hard problems in production checkout systems: consistency across cart, inventory, payment and order services (sagas), quote locking and price consistency, high-traffic launches and flash sales, multi-currency and cross-border, fraud and abuse controls, headless/composable architectures, and observability. Builds on `checkout-cart-fundamentals.md`.

## Distributed Checkout as a Saga

In service-oriented commerce, placing an order spans services that cannot share one database transaction.

```
Orchestrator (checkout service)
 1. Validate & lock quote (pricing)          compensate: release quote
 2. Reserve inventory (inventory service)     compensate: release reservation
 3. Authorize payment (payment service/PSP)   compensate: void authorization
 4. Create order (order service)              compensate: cancel order
 5. Confirm reservation, emit OrderPlaced
```
| Rule | Why |
|---|---|
| Each step idempotent with a step key (`checkout_id:step`) | Safe retries after timeouts |
| Persist saga state after each step | Resume after crash; durable workflow engines (Temporal, AWS Step Functions) help |
| Compensations idempotent too | Can be retried |
| Authorize, then capture after order creation/fulfillment | Void is cheaper and faster than refund |
| Timeouts per step with a final "unknown" state check | PSP calls can succeed after a client timeout; query status before compensating |

Orchestration (central coordinator) is usually clearer than choreography for checkout because the flow is linear and needs a single view of state.

## Quote Locking and Price Consistency
- Generate a **quote** (priced snapshot of lines, discounts, shipping, tax) with an ID, hash and expiry when the customer reaches the review step.
- Place order against the quote ID; if the quote expired or inputs changed (price list, promotion end, address), reprice and ask the customer to confirm.
- Promotions with usage limits: reserve a redemption at order placement (atomic counter or unique constraint per customer) and release on cancellation.

```sql
-- Single-use coupon per customer, enforced by the database
CREATE TABLE coupon_redemption (
  coupon_id   BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  order_id    BIGINT NOT NULL,
  PRIMARY KEY (coupon_id, customer_id)
);
-- Global usage cap
UPDATE coupon SET used = used + 1 WHERE id = :id AND used < max_uses;
```

## Inventory at Scale
| Technique | Use |
|---|---|
| Reservation records with TTL | Holds per checkout; background job or TTL index expires them |
| Sharded/bucketed counters for hot SKUs | Split stock of one SKU into N buckets to reduce row contention |
| Redis atomic decrement (Lua script) as a front gate, DB as source of truth | Flash sales; reconcile asynchronously |
| Available-to-promise across locations | Ship-from-store, split shipments |
| Oversell policy | Allow small backorder vs. strict; decided per product |

```lua
-- Redis: atomically reserve qty if available; KEYS[1]=stock key, ARGV[1]=qty
local available = tonumber(redis.call('GET', KEYS[1]) or '0')
local qty = tonumber(ARGV[1])
if available >= qty then
  redis.call('DECRBY', KEYS[1], qty)
  return 1
end
return 0
```
Pair with a durable reservation write and periodic reconciliation, since Redis is not the system of record.

## Flash Sales and Launches
- **Virtual waiting room / queue** (e.g. Cloudflare Waiting Room, Queue-it, custom token queue) admitting users at a sustainable rate.
- Pre-scale stateless services; warm caches for product and price data; static product pages from CDN.
- Per-customer purchase limits and bot defenses (rate limiting, device fingerprinting, managed bot protection, CAPTCHA only as a last resort for users).
- Degrade gracefully: disable expensive features (recommendations, real-time shipping quotes) under load via feature flags.
- Load-test the full checkout path, including the PSP sandbox limits, before the event.

## Multi-Currency and Cross-Border

| Concern | Practice |
|---|---|
| Presentment vs. settlement currency | Show local currency; settle per PSP configuration; store both amounts and the FX rate used |
| Price lists per market | Prefer explicit local prices (psychological pricing) over live FX conversion |
| Taxes and duties | VAT/GST inclusive pricing; DDP vs. DAP for duties; landed-cost calculation |
| Payment methods | Local methods (iDEAL, Pix, UPI, BLIK, Klarna/BNPL) via PSP |
| Address formats | Country-specific fields and validation |
| Legal | Consumer law, invoice requirements, e-invoicing mandates in some countries |

## Fraud and Abuse Controls
| Threat | Control |
|---|---|
| Card testing (many small auths) | Rate limits per IP/device/card BIN, PSP radar/risk scoring, require login for repeated attempts |
| Account takeover | MFA, new-device alerts, step-up before changing address at checkout |
| Promo abuse | Per-customer limits, device/email normalization, velocity rules |
| Reseller bots | Queue + purchase limits + bot management |
| Friendly fraud/chargebacks | 3-D Secure (SCA) for liability shift, clear descriptors, delivery proof |

Score orders asynchronously after authorization where possible and hold high-risk orders for review before capture/fulfillment.

## Composable / Headless Architecture

```
Frontends (web, app, POS) -> BFF / API gateway -> commerce services or platform APIs
     (Shopify Storefront/Checkout, commercetools, BigCommerce, Adobe Commerce, Medusa, Saleor)
                                   -> PSP, tax, search, CMS, OMS (fulfillment)
```
- Keep checkout on the platform's hosted or extensible checkout when possible (PCI scope, wallets, conversion features); customize via extensions rather than rebuilding.
- If building custom checkout, use PSP-hosted fields/elements to keep card data out of your systems (PCI DSS SAQ A or A-EP rather than D).

## Observability for Checkout
| Signal | Use |
|---|---|
| Funnel metrics per step, device, market, payment method | Detect conversion drops |
| Payment authorization rate and decline codes per PSP/method | PSP or issuer issues |
| Latency per step (p95) | Slow tax/shipping providers |
| Saga failures and compensations | Integration health |
| Inventory reservation conflicts | Hot SKU contention |
| Synthetic checkout tests (test cards) every few minutes | End-to-end alerting |

Alert on conversion anomalies (sudden drop in a payment method or country), not only on errors: many checkout failures are silent (a broken button, a declined method).

## Testing
- Contract tests for PSP, tax and shipping adapters.
- Property-based tests for money allocation and rounding.
- Concurrency tests for coupon caps and inventory reservations.
- Chaos tests: PSP timeouts, webhook delays/duplicates, tax service unavailability (fallback: block checkout vs. estimated tax, per legal guidance).

## Checklist
- [ ] Saga with idempotent steps and compensations; unknown-state reconciliation
- [ ] Quotes with expiry; reprice and confirm on change
- [ ] Database-enforced coupon and inventory limits; hot SKU strategy
- [ ] Waiting room, purchase limits and bot defenses for launches
- [ ] FX rate and presentment/settlement amounts stored
- [ ] Fraud controls including card-testing defenses and SCA
- [ ] Funnel and authorization-rate anomaly alerts plus synthetic checkouts
