---
name: stripe-payments
description: >
  Use this skill when the user says 'stripe subscription', 'stripe webhook', 'subscription lifecycle', 'stripe billing', 'invoice.paid', 'past_due', 'dunning', 'stripe idempotency key', 'constructEvent'. It designs Stripe Billing subscription flows and production-grade webhook handling (signature verification, deduplication, out-of-order events, async processing). Do NOT use for: gateway-agnostic payment architecture or PCI scope (use ecommerce-payment-processing), cart/checkout UX (use ecommerce-checkout-cart or checkout-optimization).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ecommerce, payments, stripe, subscriptions, webhooks, billing]
---

# Stripe Payments & Subscriptions

## Purpose
Implement Stripe Billing subscriptions whose local state stays correct under retries, duplicate deliveries and out-of-order webhooks. Stripe is the source of truth for billing state; your database is a projection updated from verified webhook events and API reads.

## Agent Protocol

### Trigger
"stripe subscription", "stripe webhook", "subscription lifecycle", "stripe billing", "invoice.paid", "payment_failed", "past_due", "dunning", "idempotency key stripe", "customer portal".

### Input Context
- Framework/runtime of the webhook endpoint (Express, Next.js route handler, serverless).
- Pricing model (flat, per-seat, metered, trials).
- Where entitlements are stored and how access is gated.

### Output Artifact
Webhook handler + event-to-state mapping. Files only if requested.

### Response Format
```
Flow: {Checkout Session | Payment Element + Subscriptions API}
Events handled: {list}
State mapping: {stripe status -> local entitlement}
Idempotency: {event.id dedupe store + idempotencyKey on writes}
Failure path: {dunning / past_due handling}
```

## Decision Rules

| Need | Use |
|------|-----|
| Fastest correct subscription signup | Stripe Checkout (`mode: 'subscription'`) — hosted, handles SCA/3DS, tax, coupons |
| Fully custom UI | Payment Element + Subscriptions API (`payment_behavior: 'default_incomplete'`) |
| Self-service plan changes / card updates / cancellation | Customer Portal (configured in Dashboard) |
| Usage-based pricing | Meters + metered prices; report usage via meter events |

## Subscription Statuses → Entitlement

| Stripe `status` | Meaning | Grant access? |
|-----------------|---------|---------------|
| `trialing` | In trial | Yes |
| `active` | Paid and current | Yes |
| `incomplete` | First payment needs action/failed (23h window) | No |
| `incomplete_expired` | First payment never completed | No |
| `past_due` | Renewal payment failed, retries ongoing | Grace period (product decision) |
| `unpaid` | Retries exhausted, invoices left open | No |
| `canceled` | Ended | No |
| `paused` | Trial ended without payment method (pause behavior) | No |

Derive access from `status` + `current_period_end`/item periods, never from "a payment succeeded once".

## Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Link `customer`/`subscription` IDs to your user (use `client_reference_id` or `metadata`) |
| `customer.subscription.created` / `.updated` / `.deleted` | Re-sync subscription state |
| `invoice.paid` | Extend access for the period; record invoice |
| `invoice.payment_failed` | Notify user, show "update payment method" banner |
| `invoice.payment_action_required` | Send user to complete 3DS (hosted invoice page) |
| `customer.subscription.trial_will_end` | Remind user 3 days before trial ends |

## Webhook Handler (Next.js App Router)

```typescript
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { queue } from '@/lib/queue';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // SDK pins its own API version
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const payload = await req.text();                      // raw body required for signature check
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err) {
    console.error(`Stripe signature verification failed: ${(err as Error).message}`);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  // Dedupe: Stripe delivers at-least-once. Unique constraint on event_id.
  const inserted = await db.stripeEvent.createMany({
    data: [{ eventId: event.id, type: event.type, payload: event as unknown as object }],
    skipDuplicates: true,
  });
  if (inserted.count === 1) await queue.add('stripe-event', { eventId: event.id });

  return NextResponse.json({ received: true });          // 2xx fast; work happens in the worker
}
```

Worker (re-fetch to defeat out-of-order delivery):

```typescript
export async function processStripeEvent(eventId: string) {
  const { payload } = await db.stripeEvent.findUniqueOrThrow({ where: { eventId } });
  const event = payload as Stripe.Event;
  if (event.type.startsWith('customer.subscription.')) {
    const subId = (event.data.object as Stripe.Subscription).id;
    const sub = await stripe.subscriptions.retrieve(subId); // latest truth, not the event snapshot
    await db.subscription.upsert({
      where: { stripeSubscriptionId: sub.id },
      create: { stripeSubscriptionId: sub.id, stripeCustomerId: sub.customer as string, status: sub.status },
      update: { status: sub.status },
    });
  }
}
```

Express: mount `express.raw({ type: 'application/json' })` on the webhook route only — a global `express.json()` destroys the raw body and every signature check fails.

## Idempotent Writes to Stripe

```typescript
const customer = await stripe.customers.create(
  { email: user.email, metadata: { userId: user.id } },
  { idempotencyKey: `customer-create-${user.id}` },
);
```
Keys are scoped to your account; Stripe may prune them after 24 hours, so also guard with your own unique constraint (e.g., `users.stripe_customer_id`).

## Operational Facts
- Stripe retries failed live-mode deliveries with exponential backoff for up to 3 days; endpoints returning non-2xx for long periods get disabled with email warnings.
- Event ordering is not guaranteed — never apply an older `updated` over newer state; re-fetch or compare `event.created`.
- Test locally with `stripe listen --forward-to localhost:3000/api/stripe/webhook` and `stripe trigger invoice.payment_failed`.
- Use restricted keys for services that only need read access; keep `sk_live_` out of client code and logs.
- Configure Smart Retries and dunning emails in Billing settings before writing custom retry logic.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| Granting access on the success redirect URL | Grant on webhook/API state; redirect can be skipped or forged |
| Parsing JSON before `constructEvent` | Verify against raw bytes |
| Long processing before returning 200 | Persist + enqueue, return 2xx |
| No event dedupe | Unique `event.id` table |
| Trusting event payload ordering | Re-retrieve object or compare timestamps |
| Storing card data | Use PaymentMethods/Elements; stay in SAQ A/A-EP scope |

## Checklist
- [ ] Raw-body signature verification with per-endpoint secret
- [ ] `event.id` dedupe + async worker
- [ ] Status → entitlement mapping covers all 8 statuses
- [ ] `invoice.payment_failed` user notification + portal link
- [ ] Idempotency keys on all creates
- [ ] Separate test/live webhook secrets and keys

## References
- `skills/ecommerce/payment-processing/references/stripe-integration.md`
- `skills/ecommerce/payment-processing/references/subscription-billing.md`
- `skills/ecommerce/payment-processing/references/payment-security.md`
