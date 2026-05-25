# Webhooks Architecture

## System Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Producer   │     │   Webhook    │     │  Consumer    │
│   Service    │────►│   Service    │────►│  Service     │
│   (events)   │     │  (delivery)  │     │  (webhook    │
│              │     │              │     │   endpoint)  │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                    ┌───────▼───────┐
                    │  Webhook DB   │
                    │  (subscriptions│
                    │   + delivery) │
                    └───────────────┘
```

## Webhook Service Components

```
Webhook Service
├── Subscription Manager  — CRUD for webhook subscriptions
├── Event Router          — Match events to subscriptions
├── Delivery Worker       — HTTP delivery with retry logic
├── Signature Service     — Sign outgoing payloads, verify incoming
├── Dead Letter Queue     — Failed delivery storage
└── Monitoring Dashboard  — Delivery metrics and logs
```

## Subscription Management

```typescript
interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];           // Event types to subscribe to
  secret: string;             // HMAC signing secret
  headers?: Record<string, string>; // Custom headers
  retryConfig: {
    maxAttempts: number;
    backoffRate: number;      // Exponential backoff multiplier
    initialDelayMs: number;
  };
  filter?: {                  // Optional event filtering
    fields: Record<string, string | string[]>;  // e.g., { "source": "order-service" }
  };
  status: 'active' | 'paused' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

// Subscription CRUD
class SubscriptionManager {
  async createSubscription(sub: CreateWebhookSubscription): Promise<WebhookSubscription> {
    const secret = crypto.randomBytes(32).toString('hex');

    // Verify webhook endpoint responds
    await this.verifyEndpoint(sub.url);

    return this.db.subscriptions.insert({
      ...sub,
      secret: await this.encryptSecret(secret),
      retryConfig: sub.retryConfig || {
        maxAttempts: 5,
        backoffRate: 2,
        initialDelayMs: 1000,
      },
      status: 'active',
    });
  }

  async rotateSecret(subscriptionId: string): Promise<string> {
    const newSecret = crypto.randomBytes(32).toString('hex');
    await this.db.subscriptions.update(subscriptionId, {
      secret: await this.encryptSecret(newSecret),
    });
    return newSecret;
  }

  async pauseSubscription(subscriptionId: string): Promise<void> {
    await this.db.subscriptions.update(subscriptionId, { status: 'paused' });
  }
}
```

## Event Routing

```typescript
class EventRouter {
  constructor(private subscriptionRepo: SubscriptionRepository) {}

  async routeEvent(event: Event): Promise<void> {
    const subscriptions = await this.subscriptionRepo.findByEvent(event.type);

    const matched: WebhookSubscription[] = subscriptions.filter(sub => {
      if (sub.status !== 'active') return false;
      if (sub.filter) return this.matchesFilter(event, sub.filter);
      return true;
    });

    for (const sub of matched) {
      await this.enqueueDelivery(sub, event);
    }
  }

  private matchesFilter(event: Event, filter: Record<string, any>): boolean {
    for (const [field, value] of Object.entries(filter)) {
      const eventValue = getNested(event.data, field);
      if (Array.isArray(value)) {
        if (!value.includes(eventValue)) return false;
      } else if (eventValue !== value) {
        return false;
      }
    }
    return true;
  }
}
```

## Delivery Worker

```typescript
class DeliveryWorker {
  constructor(
    private deliveryStore: DeliveryStore,
    private signatureService: SignatureService,
  ) {}

  async processDelivery(subscription: WebhookSubscription, event: Event): Promise<void> {
    const payload = {
      id: event.id,
      type: event.type,
      created: event.createdAt,
      data: event.data,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-ID': event.id,
      'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString(),
      'X-Webhook-Signature': this.signatureService.sign(subscription.secret, payload),
      'X-Webhook-Attempt': '1',
      ...subscription.headers,
    };

    for (let attempt = 1; attempt <= subscription.retryConfig.maxAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const response = await fetch(subscription.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000),
        });

        await this.deliveryStore.record({
          subscriptionId: subscription.id,
          eventId: event.id,
          attempt,
          status: response.ok ? 'delivered' : 'failed',
          statusCode: response.status,
          responseBody: await response.text().catch(() => null),
          duration: Date.now() - startTime,
          timestamp: new Date(),
        });

        if (response.ok) return;

        // Non-retryable status codes
        if ([400, 401, 403, 410].includes(response.status)) {
          await this.disableSubscription(subscription.id);
          return;
        }
      } catch (err) {
        await this.deliveryStore.record({
          subscriptionId: subscription.id,
          eventId: event.id,
          attempt,
          status: 'failed',
          error: err.message,
          timestamp: new Date(),
        });
      }

      // Exponential backoff before retry
      const delay = subscription.retryConfig.initialDelayMs *
        Math.pow(subscription.retryConfig.backoffRate, attempt - 1);
      await sleep(delay);
    }

    // All retries exhausted — move to DLQ
    await this.sendToDeadLetter(subscription, event);
  }
}
```

## Incoming Webhook Receiver

```typescript
class WebhookReceiver {
  constructor(
    private signatureService: SignatureService,
    private eventBus: EventBus,
  ) {}

  async receiveWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = parseInt(req.headers['x-webhook-timestamp'] as string);
    const webhookId = req.headers['x-webhook-id'] as string;

    // Reject old messages (tolerance window: 5 minutes)
    const age = Date.now() - timestamp * 1000;
    if (age > 300000) {
      return res.status(400).json({ error: 'Webhook timestamp expired' });
    }

    // Verify signature
    const secret = await this.getPartnerSecret(req.params.partnerId);
    if (!this.signatureService.verify(secret, req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Deduplicate by webhook ID
    const processed = await this.dedupStore.exists(webhookId);
    if (processed) {
      return res.status(200).json({ status: 'duplicate' });
    }

    // Process the event
    await this.eventBus.publish({
      id: webhookId,
      type: req.body.type,
      source: req.params.partnerId,
      data: req.body.data,
      receivedAt: new Date(),
    });

    await this.dedupStore.markProcessed(webhookId, 86400);
    return res.status(200).json({ status: 'received' });
  }
}
```

## Data Model

```sql
CREATE TABLE webhook_subscriptions (
  id              UUID PRIMARY KEY,
  url             VARCHAR(2048) NOT NULL,
  events          TEXT[] NOT NULL,
  secret_encrypted TEXT NOT NULL,
  custom_headers  JSONB,
  retry_config    JSONB NOT NULL,
  filter_config   JSONB,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id                UUID PRIMARY KEY,
  subscription_id   UUID NOT NULL REFERENCES webhook_subscriptions(id),
  event_id          VARCHAR(200) NOT NULL,
  attempt           INTEGER NOT NULL,
  status            VARCHAR(20) NOT NULL,
  status_code       INTEGER,
  response_body     TEXT,
  error_message     TEXT,
  duration_ms       INTEGER,
  delivered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_sub ON webhook_deliveries(subscription_id, delivered_at);
CREATE INDEX idx_deliveries_status ON webhook_deliveries(status) WHERE status = 'failed';
```
