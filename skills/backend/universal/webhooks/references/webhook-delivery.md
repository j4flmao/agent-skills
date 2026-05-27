# Webhook Delivery System

## Webhook Registration

### Webhook Schema
```typescript
interface WebhookRegistration {
  id: string;
  url: string;
  secret: string;
  events: string[];
  status: 'active' | 'paused' | 'disabled';
  retryConfig: {
    maxRetries: number;
    retryIntervalMs: number;
    backoffMultiplier: number;
  };
  rateLimit: {
    maxPerMinute: number;
    currentMinute: number;
    currentCount: number;
  };
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Registration API
```typescript
class WebhookManager {
  async registerWebhook(
    tenantId: string,
    registration: CreateWebhookRequest
  ): Promise<WebhookRegistration> {
    const webhook: WebhookRegistration = {
      id: generateId(),
      url: registration.url,
      secret: generateSecret(),
      events: registration.events,
      status: 'active',
      retryConfig: {
        maxRetries: 3,
        retryIntervalMs: 1000,
        backoffMultiplier: 2,
      },
      rateLimit: {
        maxPerMinute: 100,
        currentMinute: new Date().getMinutes(),
        currentCount: 0,
      },
      metadata: registration.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate webhook URL
    await this.validateWebhookUrl(webhook.url);

    // Store registration
    await this.store.saveWebhook(tenantId, webhook);

    // Issue verification challenge
    await this.sendVerificationChallenge(webhook);

    return webhook;
  }

  async updateWebhook(
    id: string,
    update: Partial<WebhookRegistration>
  ): Promise<WebhookRegistration> {
    const existing = await this.store.getWebhook(id);
    if (!existing) throw new NotFoundError('Webhook not found');

    const updated = { ...existing, ...update, updatedAt: new Date() };
    await this.store.saveWebhook(existing.tenantId, updated);

    return updated;
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.store.deleteWebhook(id);
  }
}
```

## Delivery Engine

### Reliable Delivery
```typescript
class WebhookDeliveryEngine {
  private deliveryQueue: Queue;

  async dispatch(tenantId: string, event: WebhookEvent): Promise<void> {
    const webhooks = await this.store.getActiveWebhooks(tenantId, event.type);

    for (const webhook of webhooks) {
      await this.enqueueDelivery(webhook, event);
    }
  }

  private async enqueueDelivery(
    webhook: WebhookRegistration,
    event: WebhookEvent
  ): Promise<void> {
    const payload = this.buildPayload(webhook, event);
    const signature = this.signPayload(payload, webhook.secret);

    await this.deliveryQueue.add({
      webhookId: webhook.id,
      url: webhook.url,
      payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-ID': event.id,
        'X-Webhook-Timestamp': event.timestamp,
        'User-Agent': 'WebhookDispatcher/1.0',
      },
      retryConfig: webhook.retryConfig,
    });
  }

  private buildPayload(webhook: WebhookRegistration, event: WebhookEvent): any {
    return {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      data: event.data,
      environment: process.env.NODE_ENV,
    };
  }

  private signPayload(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
}
```

## Verification and Security

### Webhook URL Verification
```typescript
class WebhookVerification {
  async sendVerificationChallenge(webhook: WebhookRegistration): Promise<void> {
    const challenge = {
      type: 'webhook.verify',
      challenge: generateChallenge(),
      webhookId: webhook.id,
    };

    const signature = this.signPayload(challenge, webhook.secret);

    try {
      const response = await axios.post(webhook.url, challenge, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        timeout: 5000,
      });

      if (response.data.challenge !== challenge.challenge) {
        throw new Error('Verification challenge failed');
      }

      await this.store.markWebhookVerified(webhook.id);
    } catch (error) {
      await this.store.markWebhookFailed(webhook.id, error.message);
      throw error;
    }
  }

  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }
}
```

## Key Points
- Use HMAC-SHA256 signatures for webhook payload integrity
- Implement URL verification challenges during registration
- Queue webhook deliveries with retry and exponential backoff
- Rate limit webhook deliveries per endpoint to prevent abuse
- Store delivery history with status and response codes
- Support webhook event filtering by type
- Implement idempotency for at-least-once delivery guarantees
- Monitor delivery success rates and latency
- Provide webhook health dashboards for customers
- Support replay of failed deliveries through admin APIs
