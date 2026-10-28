# Payment Processing Fundamentals

How card and alternative payments move, the lifecycle states an integration must model, and the engineering basics every payment integration needs: money representation, idempotency, webhooks, and failure handling. Provider specifics are in `stripe-integration.md`; compliance in `pci-dss-guide.md`.

## Parties in a Card Payment

| Party | Role |
|-------|------|
| Cardholder | Pays |
| Merchant | Sells; holds an account with an acquirer (directly or via a PSP) |
| PSP / payment gateway | API the merchant integrates (Stripe, Adyen, Braintree, Checkout.com ...); often also the acquirer |
| Acquirer | Merchant's bank in the card network |
| Card network | Visa, Mastercard, Amex, ...; routes authorizations and settlement |
| Issuer | Cardholder's bank; approves or declines |

## Lifecycle

```text
created ─► (customer action: 3DS / redirect) ─► authorized ─► captured ─► settled ─► paid out
              │                                     │             │
              └─► failed / canceled                 └─► voided    ├─► refunded (full/partial)
                                                                  └─► disputed ─► won / lost
```

| Step | Meaning | Money moves? |
|------|---------|--------------|
| Authorization | Issuer approves and places a hold on funds | Hold only |
| Capture | Merchant claims the authorized amount (immediately or later) | Yes, enters clearing |
| Void / cancel | Release an authorization before capture | Hold released |
| Settlement | Networks and acquirer move funds | Yes |
| Payout | PSP transfers balance to the merchant bank account | Yes |
| Refund | Return captured funds | Yes (reverse) |
| Dispute (chargeback) | Cardholder contests via issuer; funds pulled back pending evidence | Yes (reverse, plus fee) |

Authorizations expire (commonly around 7 days for card-not-present, varying by network and card type). Capture before expiry or re-authorize. Separate auth and capture when fulfilment happens later (ship-then-charge); capture immediately for digital goods.

## Payment Methods Beyond Cards

| Method | Characteristic |
|--------|----------------|
| Wallets (Apple Pay, Google Pay) | Tokenized cards with device authentication; good conversion on mobile |
| Bank debits (SEPA Direct Debit, ACH) | Low fees, delayed confirmation (days), returns possible after "success" |
| Bank transfers / real-time payments (Pix, UPI, FedNow-based) | Push payments, often instant, customer initiates |
| Buy now pay later | Provider takes credit risk; redirect flows |
| Local methods (iDEAL, Bancontact, BLIK, ...) | Redirect/app-to-app; essential in some markets |

Asynchronous methods mean "submitted" is not "paid": fulfil only after the confirmation event.

## Money Representation

```ts
// integer minor units + ISO 4217 currency
type Money = { amountMinor: bigint; currency: 'EUR' | 'USD' | 'JPY' | string }

const MINOR_UNITS: Record<string, number> = { EUR: 2, USD: 2, JPY: 0, KWD: 3 }

export function toMinor(decimal: string, currency: string): bigint {
  const digits = MINOR_UNITS[currency]
  if (digits === undefined) throw new Error(`Unknown currency exponent for ${currency}`)
  const [whole, frac = ''] = decimal.split('.')
  if (frac.length > digits) throw new Error(`Too many decimals for ${currency}: ${decimal}`)
  return BigInt(whole + frac.padEnd(digits, '0'))
}
```

- Never use binary floating point for money.
- Currency exponents vary (JPY 0, KWD 3); PSP APIs usually take minor units.
- Store currency with every amount; never add amounts of different currencies.

## Idempotency

Network failures make retries inevitable; a retried "charge" must not charge twice.

```ts
const intent = await stripe.paymentIntents.create(
  { amount: 4999, currency: 'eur', customer: customerId, metadata: { orderId } },
  { idempotencyKey: `order-${orderId}-attempt-${attempt}` },
)
```

- Generate the key once per logical operation (e.g. per order payment attempt) and store it before calling the PSP.
- Make your own endpoints idempotent too: clients retry checkout submissions.
- Enforce one active payment per order with a database unique constraint.

## Webhooks

The PSP reports asynchronous outcomes (succeeded, failed, refunded, disputed) through webhooks. Treat them as the source of truth for final state.

```ts
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, req.header('stripe-signature')!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    logger.warn({ err }, 'stripe webhook signature verification failed')
    return res.status(400).send('invalid signature')
  }

  const inserted = await db.processedEvents.insertIfAbsent(event.id)   // dedupe
  if (!inserted) return res.sendStatus(200)

  await queue.enqueue('payment-event', { id: event.id, type: event.type })  // process async
  res.sendStatus(200)
})
```

Rules:
- Verify signatures on the raw body; reject unsigned events.
- Deduplicate by event ID; delivery is at-least-once.
- Acknowledge quickly (2xx) and process asynchronously.
- Do not assume ordering; fetch the current object from the PSP API when order matters.

## Order and Payment State

Keep payment state separate from order state, linked by IDs:

```sql
CREATE TABLE payments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES orders(id),
  psp           TEXT NOT NULL,
  psp_reference TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('requires_action','authorized','captured','failed','canceled','refunded','partially_refunded','disputed')),
  amount_minor  BIGINT NOT NULL CHECK (amount_minor > 0),
  currency      CHAR(3) NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (psp, psp_reference)
);
CREATE INDEX payments_order_id_idx ON payments (order_id);
```

## Declines and Errors

| Category | Example | Action |
|----------|---------|--------|
| Soft decline | Insufficient funds, issuer unavailable | Let customer retry or use another method |
| Hard decline | Stolen card, invalid account | Do not retry the same card |
| Authentication required | SCA/3DS challenge | Complete the customer action flow |
| Integration error | Invalid parameters | Fix code; alert |
| Network/timeout | Unknown outcome | Retry with the same idempotency key, or query status |

Show generic decline messages to customers; detailed decline codes can help fraudsters test cards.

## Compliance Basics

- Use PSP-hosted fields/elements or redirects so card data never touches your servers; this keeps you in the smallest PCI DSS scope (typically SAQ A for fully hosted fields/redirect).
- Never log PANs, CVCs or full track data; CVC must never be stored after authorization.
- Strong Customer Authentication applies to many European payments (PSD2); use the PSP's 3DS2 flow.

## Checklist

- [ ] Amounts in integer minor units with currency
- [ ] Idempotency keys on every PSP mutation and on your own endpoints
- [ ] Webhooks verified, deduplicated, processed asynchronously
- [ ] Fulfilment triggered by confirmed payment events, not client redirects
- [ ] Auth/capture timing chosen deliberately
- [ ] Card data handled only by PSP-hosted components
