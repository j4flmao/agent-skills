# Payment Gateway Integration Patterns

## Integration Architecture
`
Backend Service → Payment Provider SDK
    ├── Create payment intent
    ├── Confirm payment
    ├── Handle webhooks
    └── Idempotency key for retries

Webhook Handler
    ├── Verify signature
    ├── Process event (payment_intent.succeeded, charge.refunded)
    ├── Update order status
    └── Idempotency by event ID
`

## Idempotency for Payments
`	ypescript
// Always use idempotency keys for payment operations
const paymentIntent = await stripe.paymentIntents.create({
    amount: 2000,
    currency: 'usd',
}, {
    idempotencyKey: create_payment_,
});
`

## Webhook Verification
`	ypescript
const sig = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
    request.body, sig, webhookSecret
);
`

## Error Handling
| Error Type | Action |
|------------|--------|
| Card declined | Return specific message, suggest retry |
| Insufficient funds | Return clear error, suggest alternative |
| Network timeout | Retry with backoff (3 attempts) |
| Invalid CVV | Ask user to re-enter |
| Fraud block | Notify user, suggest alternative payment |
