---
name: backend-webhooks
description: >
  Use this skill when the user says 'webhook', 'webhook receiver', 'webhook delivery', 'signature verification', 'HMAC', 'event delivery', 'outgoing webhook', 'incoming webhook', 'retry webhook', 'webhook endpoint'. This skill implements receiving, verifying, retrying, and delivering webhooks securely. Applies to any backend stack. Do NOT use for: server-sent events (SSE), WebSockets, or long-polling fallbacks.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, webhooks, events, integration]
---

# Backend Webhooks

## Purpose
Securely receive, verify, retry, and deliver webhooks between services with guaranteed delivery and tamper-proof signatures. Webhooks are the standard mechanism for asynchronous service-to-service event notification.

## Agent Protocol

### Trigger
Exact user phrases: "webhook", "webhook receiver", "webhook delivery", "signature verification", "HMAC", "event delivery", "outgoing webhook", "incoming webhook", "retry webhook", "webhook endpoint".

### Input Context
- Direction: receiving incoming webhooks or sending outgoing webhooks.
- Security requirements (signing, IP allowlisting).
- Expected volume and payload size.
- Event types and schemas.

### Output Artifact
Webhook handler code or configuration. No file unless requested.

### Response Format
```
Direction: {incoming|outgoing}
Auth: {HMAC|Basic|OAuth|None}
Retry: {strategy}
Delivery Guarantee: {at-least-once|exactly-once}
```

### Completion Criteria
- [ ] Signature verification for incoming webhooks.
- [ ] Payload signing for outgoing webhooks.
- [ ] Retry with exponential backoff for failed deliveries.
- [ ] Dead-letter queue for permanently failed deliveries.
- [ ] At-least-once delivery guaranteed.
- [ ] Idempotency handling for duplicate deliveries.

### Max Response Length
4 lines per webhook. 20 lines for full implementation.

## Architecture Decision Tree

### Should I Use Webhooks or Polling?

```
Does the consumer need near-real-time notification?
  ├── Yes → Webhooks (push-based, lower latency)
  └── No → Is the consumer behind a firewall?
            ├── Yes → Polling (consumer pulls when ready)
            └── No → Does the consumer need guaranteed delivery?
                      ├── Yes → Webhooks + retry + DLQ
                      └── No → Webhooks (best-effort)
```

### Outgoing vs Incoming Webhook Design

```
Are you sending events to external systems?
  ├── Yes → Outgoing webhooks:
  │   ├── Subscription management (CRUD endpoints)
  │   ├── Payload signing (HMAC-SHA256)
  │   ├── Retry with backoff (5 attempts)
  │   ├── Dead letter queue (after max retries)
  │   ├── Rate limiting per subscription
  │   └── Consumer-managed endpoint configuration
  └── No → Incoming webhooks:
      ├── Signature verification (timing-safe)
  │   ├── Timestamp validation (tolerance window)
  │   ├── Payload validation (schema check)
  │   ├── Idempotency handling (X-Webhook-ID)
      └── Fast acknowledgment (200 before processing)
```

### Authentication Decision

```
What level of security does the integration need?
  ├── HMAC signature → Most common, simple, tamper-proof
  │   ├── Shared secret known to both parties
  │   ├── Payload + timestamp signed with SHA256
  │   └── Use timing-safe comparison for verification
  ├── OAuth2/Bearer token → Standard for API-first services
  │   ├── Provider issues access token
  │   └── Consumer validates token on each webhook
  ├── IP allowlisting → Additional layer, not standalone
  │   └── Only accept from known IP ranges
  └── Mutual TLS → Highest security, operational overhead
      └── Both parties present certificates
```

## Workflow

### Step 1: Define Event Types
```yaml
events:
  order.created:
    description: Order has been placed
    schema: OrderCreatedEvent
    version: 1
  order.fulfilled:
    description: Order has been shipped
    schema: OrderFulfilledEvent
    version: 1
  order.cancelled:
    description: Order was cancelled
    schema: OrderCancelledEvent
    version: 1
```

### Step 2: Sign Outgoing Payloads
```javascript
function signPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadString}`)
    .digest('hex');
  return { signature, timestamp };
}

async function deliverWebhook(subscription, event) {
  const { signature, timestamp } = signPayload(event, subscription.secret);
  const headers = {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': `sha256=${signature}`,
    'X-Webhook-Timestamp': timestamp,
    'X-Webhook-ID': event.id,
    'X-Webhook-Event': event.type,
  };
  return fetch(subscription.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(event),
  });
}
```

### Step 3: Verify Incoming Signatures
```javascript
function verifyWebhook(payload, headers, secret, toleranceMs = 300000) {
  const signature = headers['x-webhook-signature'];
  const timestamp = parseInt(headers['x-webhook-timestamp'], 10);
  const eventId = headers['x-webhook-id'];

  // 1. Validate timestamp is within tolerance window
  const age = Date.now() - timestamp * 1000;
  if (Math.abs(age) > toleranceMs) {
    throw new Error(`Webhook timestamp expired: age=${age}ms > tolerance=${toleranceMs}ms`);
  }

  // 2. Verify signature using timing-safe comparison
  const payloadString = JSON.stringify(payload);
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadString}`)
    .digest('hex');

  // Extract scheme from signature header
  const [scheme, actualSig] = signature.split('=');
  if (scheme !== 'sha256') throw new Error(`Unknown signature scheme: ${scheme}`);

  // Timing-safe comparison
  const actualBuf = Buffer.from(actualSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    throw new Error('Webhook signature invalid');
  }

  // 3. Return event metadata
  return { eventId, timestamp, verified: true };
}
```

### Step 4: Implement Delivery with Retry
```typescript
interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempt: number;
}

class WebhookDeliveryService {
  private maxRetries = 5;
  private baseDelay = 1000;

  async deliver(subscription: Subscription, event: WebhookEvent): Promise<DeliveryResult> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.send(subscription, event, attempt);
        if (response.ok) {
          await this.recordSuccess(subscription, event, attempt);
          return { success: true, statusCode: response.status, attempt };
        }
        // Non-2xx — retry if retryable
        if (response.status >= 400 && response.status < 500) {
          // Client error — don't retry
          await this.recordFailure(subscription, event, response.status, 'Client error');
          return { success: false, statusCode: response.status, attempt };
        }
        lastError = `HTTP ${response.status}`;
      } catch (error) {
        lastError = error.message;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        60000 // Max 60s
      );
      await sleep(delay);
    }

    // All retries exhausted — send to DLQ
    await this.deadLetter(subscription, event, lastError);
    await this.alertOncall(subscription, event, lastError);
    return { success: false, error: lastError, attempt: this.maxRetries };
  }
}
```

### Step 5: Handle Duplicates (Idempotency)
```javascript
// Consumers should deduplicate by X-Webhook-ID
async function handleIncomingWebhook(req, res) {
  const webhookId = req.headers['x-webhook-id'];

  // Check if already processed
  const processed = await idempotencyStore.get(webhookId);
  if (processed) {
    return res.status(200).json({ status: 'duplicate' });
  }

  // Process webhook
  await processEvent(req.body);

  // Mark as processed
  await idempotencyStore.set(webhookId, { processed: true }, { ttl: 86400 });

  res.status(200).json({ status: 'ok' });
}
```

### Step 6: Subscription Management
```typescript
interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  events: string[];          // Event types to receive
  status: 'active' | 'disabled' | 'suspended';
  rateLimit: number;         // Max requests per minute
  retryConfig: {
    maxRetries: number;
    backoffBaseMs: number;
  };
  createdAt: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  consecutiveFailures: number;
}

// CRUD API for managing subscriptions
// POST   /api/webhooks/subscriptions    — Create subscription
// GET    /api/webhooks/subscriptions    — List subscriptions
// PUT    /api/webhooks/subscriptions/:id — Update subscription
// DELETE /api/webhooks/subscriptions/:id — Delete subscription
// POST   /api/webhooks/subscriptions/:id/rotate — Rotate secret

class SubscriptionManager {
  async createSubscription(input: CreateSubscriptionInput): Promise<WebhookSubscription> {
    // Validate URL is reachable
    await this.validateEndpoint(input.url);

    // Generate unique secret
    const secret = crypto.randomBytes(32).toString('hex');

    // Send test webhook
    await this.sendTestWebhook(input.url, secret);

    const subscription: WebhookSubscription = {
      id: crypto.randomUUID(),
      ...input,
      secret,
      status: 'active',
      rateLimit: input.rateLimit || 100,
      retryConfig: { maxRetries: 5, backoffBaseMs: 1000 },
      consecutiveFailures: 0,
      createdAt: new Date(),
    };

    await this.store.save(subscription);
    return subscription;
  }

  private async sendTestWebhook(url: string, secret: string): Promise<void> {
    const testPayload = { type: 'ping', data: { message: 'Webhook subscription test' } };
    const { signature, timestamp } = signPayload(testPayload, secret);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Timestamp': String(timestamp),
        'X-Webhook-ID': crypto.randomUUID(),
        'X-Webhook-Event': 'ping',
      },
      body: JSON.stringify(testPayload),
    });
    if (!response.ok) throw new Error(`Test webhook failed: HTTP ${response.status}`);
  }
}
```

## Implementation Patterns

### Webhook Server (Express)
```typescript
import express from 'express';

const app = express();

// Raw body for signature verification
app.use(express.json({
  verify: (req, _, buf) => { req.rawBody = buf.toString(); },
}));

// Incoming webhook handler
app.post('/webhooks/:provider', async (req, res) => {
  // Acknowledge immediately
  res.status(202).json({ received: true });

  // Process asynchronously
  const provider = req.params.provider;
  const secret = getProviderSecret(provider);

  try {
    verifyWebhook(JSON.parse(req.rawBody), req.headers, secret);
    await processWebhookAsync(req.body);
  } catch (error) {
    logger.error('Webhook processing failed', { provider, error });
  }
});
```

### Dead Letter Queue
```typescript
class WebhookDeadLetterQueue {
  async sendToDLQ(subscription: Subscription, event: WebhookEvent, error: string): Promise<void> {
    await this.store.save({
      id: crypto.randomUUID(),
      subscriptionId: subscription.id,
      url: subscription.url,
      event,
      error,
      failedAt: new Date(),
      retryCount: 0,
    });
  }

  async retryDeadLetter(limit = 100): Promise<void> {
    const failed = await this.store.findUnprocessed(limit);
    for (const item of failed) {
      try {
        const subscription = await this.subscriptionManager.get(item.subscriptionId);
        await this.deliveryService.deliver(subscription, item.event);
        await this.store.markProcessed(item.id);
      } catch (error) {
        logger.error('DLQ retry failed', { id: item.id, error });
      }
    }
  }
}
```

### Rate Limiting Outgoing Webhooks
```typescript
class WebhookRateLimiter {
  private attempts = new Map<string, number[]>();

  async canDeliver(subscriptionId: string): Promise<boolean> {
    const now = Date.now();
    const window = 60000; // 1 minute
    const attempts = this.attempts.get(subscriptionId) || [];
    const recent = attempts.filter(t => now - t < window);

    const subscription = await this.subscriptionManager.get(subscriptionId);
    if (recent.length >= subscription.rateLimit) {
      logger.warn('Webhook rate limit exceeded', { subscriptionId });
      return false;
    }

    recent.push(now);
    this.attempts.set(subscriptionId, recent);
    return true;
  }
}
```

## Production Considerations

### Retry Strategy
| Attempt | Delay | Cumulative |
|---------|-------|------------|
| 1 | 1s | 1s |
| 2 | 2s | 3s |
| 3 | 4s | 7s |
| 4 | 8s | 15s |
| 5 | 16s | 31s |

After 5 retries: send to DLQ and alert.

### Monitoring
| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| Delivery failure rate | > 5% over 5 min | Investigate subscriber health |
| DLQ depth | > 100 | Process DLQ or alert |
| Average delivery latency | > 30s | Check network/retry config |
| Subscription failure | > 10 consecutive | Auto-disable subscription |

### Scale Considerations
| Volume | Architecture | Notes |
|--------|-------------|-------|
| < 1000 webhooks/hour | Single process, async worker | Simple queue |
| 1000-100000/hour | Dedicated worker pool | Separate process from API |
| > 100000/hour | Distributed queue + fan-out | Kafka/Redis + multiple workers |

## Anti-Patterns

1. **Unsigned payloads**: Without HMAC, any attacker can forge webhooks. Always sign every payload.
2. **No replay protection**: Without timestamp validation, an attacker can replay a captured webhook. Always enforce a tolerance window.
3. **Blocking on webhook processing**: Receiving a webhook should return 200 immediately and process async. Blocking during processing causes timeouts and retries.
4. **Non-atomic secret rotation**: Updating the secret while a webhook is in flight causes verification failures. Support dual secrets during rotation.
5. **No dead letter queue**: Failed deliveries are lost forever. Always have a DLQ for retry-exhausted webhooks.
6. **Ignoring idempotency**: Webhook systems deliver at-least-once. Without idempotency handling, duplicates cause data corruption.
7. **No consumer health monitoring**: A continuously failing consumer should be auto-disabled to prevent resource waste.

## Security

### IP Allowlisting
```javascript
const ALLOWED_IPS = [
  '54.123.45.0/24',
  '54.67.89.0/24',
];

function isAllowedIP(ip: string): boolean {
  return ALLOWED_IPS.some(cidr => ipInCIDR(ip, cidr));
}
```

### Secret Rotation
```javascript
async function rotateSecret(subscriptionId: string): Promise<void> {
  const newSecret = crypto.randomBytes(32).toString('hex');
  const subscription = await subscriptionStore.get(subscriptionId);

  // Dual-write period: accept both old and new signatures
  subscription.pendingSecret = newSecret;
  subscription.pendingSecretActivatedAt = Date.now() + 600000; // 10 min overlap
  await subscriptionStore.save(subscription);

  // After overlap period, remove old secret
  setTimeout(async () => {
    const updated = await subscriptionStore.get(subscriptionId);
    if (updated.pendingSecret === newSecret) {
      updated.secret = newSecret;
      updated.pendingSecret = null;
      updated.pendingSecretActivatedAt = null;
      await subscriptionStore.save(updated);
    }
  }, 600000);
}
```

## Rules
- Always sign webhook payloads with HMAC-SHA256 — never send unsigned payloads.
- Include a timestamp in the signature and enforce a tolerance window (5 minutes max).
- Use timing-safe comparison for signature verification.
- Retry at least 5 times with exponential backoff before dead-lettering.
- Log all delivery attempts (success and failure) with timestamps.
- Rotate webhook secrets regularly.
- Allow consumers to unsubscribe — respect opt-out.
- Acknowledge incoming webhooks immediately (202), process asynchronously.
- Auto-disable consumers with > 10 consecutive failures.

## References
  - references/webhook-delivery.md — Webhook Delivery System
  - references/webhook-monitoring.md — Webhook Monitoring and Reliability
  - references/webhook-rate-limiting.md — Webhook Rate Limiting
  - references/webhook-scaling.md — Webhook Scaling
  - references/webhook-security.md — Webhook Security
  - references/webhook-setup.md — Webhook Setup
  - references/webhooks-architecture.md — Webhooks Architecture
  - references/webhooks-delivery.md — Webhook Security
## Handoff
No artifact produced unless requested.
Next skill: api-versioning — manage version transitions for the webhook API.
Carry forward: event types, webhook URL structure, signature format.
