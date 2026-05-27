# Stripe Integration

## API Setup

### Authentication
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  maxNetworkRetries: 3,
  timeout: 30000,
  httpAgent: new https.Agent({ keepAlive: true }),
});
```

### Client Initialization
```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
```

### Configuration Best Practices
| Setting | Recommendation | Reason |
|---------|---------------|--------|
| API version | Pin to specific version | Avoid breaking changes on upgrade |
| Max retries | 2-3 | Transient network failures |
| Timeout | 30s for sync, 60s for async | Balance UX vs. reliability |
| Keep-alive | Enabled | Reuse TCP connections |
| Idempotency key | Always set on write operations | Prevent duplicate charges |
| Webhook secret | Rotate every 90 days | Security best practice |

## Payment Intents API

### Flow
```
Client → Backend: Create PaymentIntent
Backend → Stripe: POST /v1/payment_intents
Stripe → Backend: client_secret
Backend → Client: { client_secret }
Client → Stripe: Confirm (card elements)
Stripe → Client: success/failure result
Client → Backend: Verify status
```

### Create PaymentIntent
```typescript
async function createPaymentIntent(
  amount: number,
  currency: string,
  customerId?: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency: currency.toLowerCase(),
    customer: customerId,
    metadata: {
      orderId: metadata?.orderId || '',
      ...metadata,
    },
    automatic_payment_methods: {
      enabled: true,
    },
    description: `Order ${metadata?.orderId}`,
  }, {
    idempotencyKey: `pi_${metadata?.orderId}_${Date.now()}`,
  });

  return paymentIntent;
}
```

### Confirm PaymentIntent (Server-side)
```typescript
async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethodId,
  });
}
```

### Capture vs. Separate Auth and Capture
```typescript
// Automatic capture (immediate)
const immediate = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  capture_method: 'automatic',
});

// Manual capture (authorize now, capture later)
const authorized = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  capture_method: 'manual',
});

// Capture later
const captured = await stripe.paymentIntents.capture(authorized.id);
```

### Retrieve and Verify
```typescript
async function verifyPayment(paymentIntentId: string): Promise<boolean> {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (pi.status === 'succeeded') {
    return true;
  }

  if (pi.status === 'requires_payment_method') {
    throw new Error('Payment failed — try another method');
  }

  if (pi.status === 'processing') {
    throw new Error('Payment still processing — check webhook');
  }

  return false;
}
```

## Setup Intents for Saved Cards

### Flow
```
Client → Backend: Request save card
Backend → Stripe: POST /v1/setup_intents
Stripe → Backend: client_secret
Backend → Client: { client_secret }
Client → Stripe: Confirm setup (card elements)
Stripe → Client: setup succeeded
Client → Backend: payment_method ID
Backend → Stripe: Attach to customer
```

### Create SetupIntent
```typescript
async function createSetupIntent(
  customerId: string,
  metadata?: Record<string, string>
): Promise<Stripe.SetupIntent> {
  return await stripe.setupIntents.create({
    customer: customerId,
    usage: 'off_session',
    metadata,
  }, {
    idempotencyKey: `si_${customerId}_${Date.now()}`,
  });
}
```

### Attach PaymentMethod to Customer
```typescript
async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  return await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}
```

### List Saved Payment Methods
```typescript
async function listSavedCards(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return methods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    expMonth: pm.card?.exp_month,
    expYear: pm.card?.exp_year,
    isDefault: pm.id === pm.customer?.default_source,
  }));
}
```

## Webhook Handling

### Webhook Endpoint
```typescript
import express from 'express';

const webhookRouter = express.Router();

webhookRouter.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await handleWebhookEvent(event);
      res.json({ received: true });
    } catch (err) {
      console.error('Webhook handler failed:', err.message);
      res.status(500).end();
    }
  }
);
```

### Event Router
```typescript
const eventHandlers: Record<string, (event: Stripe.Event) => Promise<void>> = {
  'payment_intent.succeeded': handlePaymentSucceeded,
  'payment_intent.payment_failed': handlePaymentFailed,
  'payment_intent.requires_action': handlePaymentRequiresAction,
  'charge.refunded': handleRefund,
  'charge.dispute.created': handleDisputeCreated,
  'charge.dispute.funds_withdrawn': handleDisputeLost,
  'charge.dispute.closed': handleDisputeClosed,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'checkout.session.completed': handleCheckoutCompleted,
  'setup_intent.succeeded': handleSetupSucceeded,
  'setup_intent.setup_failed': handleSetupFailed,
};

async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const handler = eventHandlers[event.type];
  if (!handler) {
    console.warn(`Unhandled event type: ${event.type}`);
    return;
  }

  const idempotencyKey = `webhook_${event.id}`;
  const processed = await checkIdempotency(idempotencyKey);
  if (processed) {
    console.log(`Skipping already processed event: ${event.id}`);
    return;
  }

  await handler(event);
  await markIdempotent(idempotencyKey);
}
```

### Idempotency Strategy
```typescript
// Database-backed idempotency store
async function checkIdempotency(key: string): Promise<boolean> {
  const result = await db.query(
    'SELECT 1 FROM webhook_events WHERE idempotency_key = $1',
    [key]
  );
  return result.rows.length > 0;
}

async function markIdempotent(key: string): Promise<void> {
  await db.query(
    'INSERT INTO webhook_events (idempotency_key, processed_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING',
    [key]
  );
}

// Redis-based idempotency (lower latency)
async function checkIdempotencyRedis(key: string): Promise<boolean> {
  const exists = await redis.get(`webhook:${key}`);
  if (exists) return true;
  await redis.set(`webhook:${key}`, '1', 'EX', 86400); // 24h TTL
  return false;
}
```

### Webhook Retry Logic
```typescript
async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const handler = eventHandlers[event.type];
      if (handler) await handler(event);
      return;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      await sleep(Math.pow(2, attempt) * 1000); // exponential backoff
    }
  }
}
```

## Stripe Connect for Marketplaces

### Account Types
| Type | Use Case | Requirements |
|------|----------|--------------|
| Standard | Most platforms | Express onboarding, Stripe manages KYC |
| Express | Faster onboarding | Stripe-hosted UI, reduced KYC |
| Custom | Full control | Custom UI, platform manages KYC |

### Create Connected Account
```typescript
async function createConnectedAccount(
  email: string,
  type: 'standard' | 'express' | 'custom' = 'express'
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type,
    country: 'US',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
  });

  return account;
}
```

### Create Account Link for Onboarding
```typescript
async function createOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return link.url;
}
```

### Platform Fee and Transfer
```typescript
async function createMarketplacePayment(
  amount: number,
  currency: string,
  destinationAccountId: string,
  platformFee: number,
  orderId: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    application_fee_amount: Math.round(platformFee * 100),
    transfer_data: {
      destination: destinationAccountId,
    },
    metadata: {
      orderId,
      ...metadata,
    },
  }, {
    idempotencyKey: `mp_pi_${orderId}`,
  });

  return paymentIntent;
}
```

### Direct Charges vs. Destination Charges
```typescript
// Direct charge: Platform creates charge, funds go to connected account
// Requires `on_behalf_of` parameter
const directCharge = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  on_behalf_of: connectedAccountId,
  transfer_data: {
    destination: connectedAccountId,
  },
});

// Destination charge: Funds go to platform, platform transfers to connected account
const destinationCharge = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  transfer_data: {
    destination: connectedAccountId,
    amount: 1800, // after platform fee
  },
});
```

## Stripe Billing for Subscriptions

### Create Product and Price
```typescript
async function createSubscriptionProduct(
  name: string,
  amount: number,
  interval: 'month' | 'year' | 'week',
  currency: string = 'usd'
): Promise<{ product: Stripe.Product; price: Stripe.Price }> {
  const product = await stripe.products.create({
    name,
    metadata: { internal_id: name.toLowerCase().replace(/\s+/g, '_') },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    recurring: { interval },
  });

  return { product, price };
}
```

### Create Subscription
```typescript
async function createSubscription(
  customerId: string,
  priceId: string,
  trialDays: number = 0,
  metadata?: Record<string, string>
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    metadata,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  }, {
    idempotencyKey: `sub_${customerId}_${priceId}_${Date.now()}`,
  });

  return subscription;
}
```

### Handle Failed Invoices (Dunning)
```typescript
async function handleInvoicePaymentFailed(
  event: Stripe.Event
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  await db.query(
    `INSERT INTO payment_failures (subscription_id, customer_id, invoice_id, amount_due, failure_code, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [
      invoice.subscription,
      invoice.customer,
      invoice.id,
      invoice.amount_due,
      invoice.last_finalization_error?.code,
    ]
  );

  const retryCount = await getRetryCount(invoice.subscription as string);
  if (retryCount >= 3) {
    await stripe.subscriptions.cancel(invoice.subscription as string);
    await notifyCustomer(invoice.customer as string, 'subscription_cancelled');
  } else {
    await notifyCustomer(invoice.customer as string, 'payment_failed', {
      retryCount,
      maxRetries: 3,
    });
  }
}
```

### Upgrade/Downgrade with Proration
```typescript
async function changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentItem = subscription.items.data[0];

  return await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: currentItem.id,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations',
    proration_date: Math.floor(Date.now() / 1000),
  });
}
```

## Radar for Fraud

### Radar Rules
```typescript
// Server-side Radar checks
async function evaluateFraudRisk(paymentIntent: Stripe.PaymentIntent): Promise<string> {
  const outcomes = paymentIntent.radar_options;

  if (outcomes?.risk_level === 'elevated') {
    await notifyFraudTeam(paymentIntent);
    return 'review';
  }

  if (outcomes?.risk_level === 'highest') {
    return 'block';
  }

  return 'accept';
}
```

### Custom Radar Rules
| Rule Type | Example | Action |
|-----------|---------|--------|
| Velocity | > 5 attempts on same card in 1 hour | Block |
| Country mismatch | Card country != IP country | Review |
| BIN check | Prepaid/gift card BIN | Block |
| Amount threshold | > $5000 in single transaction | Review |
| Card fingerprint dup | Same fingerprint, different user | Block |

## Testing with Stripe CLI

### Stripe CLI Setup
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/webhooks/stripe

# Get webhook signing secret
stripe listen --print-secret
```

### Test Card Numbers
| Card | Description |
|------|-------------|
| 4242424242424242 | Success |
| 4000000000003220 | 3DS 2 authentication required |
| 4000002500003155 | 3DS 2 authentication required (chargeable) |
| 4000000000000002 | Card declined |
| 4000000000009995 | Card declined (insufficient funds) |
| 4000000000009987 | Card declined (lost card) |
| 4000000000009979 | Card declined (stolen card) |
| 4000000000000069 | Card declined (expired card) |
| 4000000000000127 | Card declined (incorrect CVC) |
| 4000000000000119 | Card declined (processing error) |
| 4000000000003055 | Card declined (requires 3DS 2) |

### Test CLI Commands
```bash
# Trigger test payment
stripe trigger payment_intent.succeeded

# Trigger specific webhook events
stripe trigger charge.dispute.created
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger invoice.payment_failed

# Create a test PaymentIntent
stripe payment_intents create \
  --amount=2000 \
  --currency=usd \
  --payment-method-types=card

# List recent events
stripe events list --limit=5
```

## Error Handling Patterns

### Error Types
```typescript
async function handleStripeError(
  err: Stripe.StripeError,
  orderId: string
): Promise<{ status: number; message: string; code: string }> {
  switch (err.type) {
    case 'StripeCardError':
      return handleCardError(err, orderId);

    case 'StripeRateLimitError':
      await sleep(Math.pow(2, err.requestId?.length || 1) * 1000);
      return {
        status: 429,
        message: 'Too many requests — please retry',
        code: 'rate_limit',
      };

    case 'StripeInvalidRequestError':
      return {
        status: 400,
        message: `Invalid request: ${err.message}`,
        code: 'invalid_request',
      };

    case 'StripeAuthenticationError':
      return {
        status: 500,
        message: 'Payment service configuration error',
        code: 'auth_error',
      };

    case 'StripeAPIError':
      return {
        status: 502,
        message: 'Payment service temporarily unavailable',
        code: 'api_error',
      };

    case 'StripeConnectionError':
      return {
        status: 503,
        message: 'Could not reach payment service',
        code: 'connection_error',
      };

    default:
      return {
        status: 500,
        message: 'Unexpected payment error',
        code: 'unknown_error',
      };
  }
}
```

### Card Error Handling
```typescript
function handleCardError(
  err: Stripe.StripeCardError,
  orderId: string
): { status: number; message: string; code: string } {
  const declineCode = err.decline_code;
  const paymentIntentId = err.payment_intent?.id;

  logCardDecline({
    declineCode,
    paymentIntentId,
    orderId,
    message: err.message,
  });

  switch (declineCode) {
    case 'card_declined':
      return {
        status: 402,
        message: 'Your card was declined — try a different payment method',
        code: 'card_declined',
      };

    case 'insufficient_funds':
      return {
        status: 402,
        message: 'Your card has insufficient funds',
        code: 'insufficient_funds',
      };

    case 'lost_card':
    case 'stolen_card':
      return {
        status: 402,
        message: 'This card has been reported as lost or stolen',
        code: 'card_lost_stolen',
      };

    case 'expired_card':
      return {
        status: 402,
        message: 'Your card has expired',
        code: 'expired_card',
      };

    case 'incorrect_cvc':
      return {
        status: 402,
        message: 'Incorrect security code — please try again',
        code: 'incorrect_cvc',
      };

    case 'processing_error':
      return {
        status: 402,
        message: 'Payment processing error — please retry',
        code: 'processing_error',
      };

    case 'incorrect_number':
      return {
        status: 402,
        message: 'Incorrect card number',
        code: 'incorrect_number',
      };

    case 'pickup_card':
      return {
        status: 402,
        message: 'Please contact your bank to release this card',
        code: 'pickup_card',
      };

    case 'transaction_not_allowed':
      return {
        status: 402,
        message: 'This transaction is not allowed for this card',
        code: 'transaction_not_allowed',
      };

    case 'do_not_honor':
      return {
        status: 402,
        message: 'Your bank declined this transaction',
        code: 'do_not_honor',
      };

    default:
      return {
        status: 402,
        message: 'Your card was declined',
        code: 'generic_decline',
      };
  }
}
```

## Idempotency Key Strategy

### Key Generation
```typescript
function generateIdempotencyKey(prefix: string, uniqueId: string): string {
  return `${prefix}_${uniqueId}`;
}

// Prefix conventions
const keys = {
  paymentIntent: (orderId: string) => `pi_${orderId}`,
  setupIntent: (customerId: string, timestamp: number) => `si_${customerId}_${timestamp}`,
  subscription: (customerId: string, priceId: string) => `sub_${customerId}_${priceId}`,
  refund: (paymentIntentId: string) => `ref_${paymentIntentId}_${Date.now()}`,
  webhook: (eventId: string) => `wh_${eventId}`,
};
```

### Idempotency Middleware
```typescript
import { createHash } from 'crypto';

function idempotencyMiddleware() {
  const store = new Map<string, { status: number; body: any }>();

  return (req: any, res: any, next: any) => {
    if (req.method !== 'POST' && req.method !== 'PATCH') {
      return next();
    }

    const key = req.headers['idempotency-key'];
    if (!key) {
      return res.status(400).json({
        error: 'Idempotency-Key header is required for write operations',
      });
    }

    const existing = store.get(key);
    if (existing) {
      return res.status(existing.status).json(existing.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      store.set(key, { status: res.statusCode, body });
      return originalJson(body);
    };

    next();
  };
}
```

## Async Payment Methods

### Payment Method Types
| Method | Confirmation | Use Case |
|--------|-------------|----------|
| card | Synchronous | Instant payment |
| bancontact | Async | European bank redirect |
| ideal | Async | Dutch bank redirect |
| giropay | Async | German bank redirect |
| sofort | Async | European bank redirect |
| sepa_debit | Async | Direct debit (2-5 day settlement) |
| eps | Async | Austrian bank redirect |
| p24 | Async | Polish bank redirect |
| wechat_pay | Async | Chinese mobile payment |
| alipay | Async | Chinese mobile payment |

### Async Payment Handler
```typescript
async function handleAsyncPaymentMethod(
  paymentIntentId: string,
  paymentMethodType: string,
  returnUrl: string
): Promise<{ status: string; nextAction?: any }> {
  const paymentIntent = await stripe.paymentIntents.confirm(
    paymentIntentId,
    {
      payment_method_types: [paymentMethodType],
      return_url: returnUrl,
    }
  );

  if (paymentIntent.status === 'requires_action' && paymentIntent.next_action) {
    return {
      status: 'requires_action',
      nextAction: {
        type: paymentIntent.next_action.type,
        redirectUrl: paymentIntent.next_action.redirect_to_url?.url,
      },
    };
  }

  if (paymentIntent.status === 'processing') {
    return {
      status: 'processing',
      message: 'Payment confirmed — awaiting settlement',
    };
  }

  return { status: paymentIntent.status };
}
```

## Key Points
- Pin API versions and enable retries with keep-alive for production reliability
- Always use idempotency keys on write operations and webhook processing
- Handle each card decline code with a specific, user-friendly message
- Use Setup Intents for saved cards and Payment Intents for one-time payments
- Stripe Connect requires separate account creation and onboarding flow
- Test all scenarios using Stripe CLI and test card numbers before going live
- Async payment methods require redirect handling and settlement monitoring
- Radar rules should complement but not replace your own fraud detection
- Webhook handlers must be idempotent and verify signatures on every request
