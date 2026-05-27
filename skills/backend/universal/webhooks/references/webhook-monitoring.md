# Webhook Monitoring and Reliability

## Delivery Tracking

### Delivery Log
```typescript
interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  url: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  requestHeaders: Record<string, string>;
  requestBody: any;
  responseStatusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  durationMs?: number;
  attemptNumber: number;
  error?: string;
  deliveredAt?: Date;
  createdAt: Date;
}
```

### Delivery Monitor
```typescript
class DeliveryMonitor {
  async trackDelivery(
    deliveryId: string,
    response: axios.AxiosResponse | Error
  ): Promise<void> {
    if (response instanceof Error) {
      await this.recordFailure(deliveryId, response);
    } else {
      await this.recordSuccess(deliveryId, response);
    }
  }

  private async recordSuccess(
    deliveryId: string,
    response: axios.AxiosResponse
  ): Promise<void> {
    const delivery = await this.store.getDelivery(deliveryId);

    if (response.status >= 200 && response.status < 300) {
      await this.store.updateDelivery(deliveryId, {
        status: 'delivered',
        responseStatusCode: response.status,
        responseHeaders: response.headers,
        responseBody: response.data,
        durationMs: response.duration,
        deliveredAt: new Date(),
      });
    } else if (response.status === 410) {
      // Webhook endpoint removed, disable
      await this.store.disableWebhook(delivery.webhookId);
    } else {
      await this.handleRetryableFailure(delivery, response.status);
    }
  }

  private async handleRetryableFailure(
    delivery: WebhookDelivery,
    statusCode: number
  ): Promise<void> {
    const webhook = await this.store.getWebhook(delivery.webhookId);
    const nextAttempt = delivery.attemptNumber + 1;

    if (nextAttempt <= webhook.retryConfig.maxRetries) {
      const delay = webhook.retryConfig.retryIntervalMs *
        Math.pow(webhook.retryConfig.backoffMultiplier, delivery.attemptNumber);

      await this.scheduleRetry(delivery.id, delay);
    } else {
      await this.store.updateDelivery(delivery.id, { status: 'failed' });
      await this.alertService.sendAlert({
        severity: 'warning',
        title: 'Webhook delivery failed after all retries',
        description: `Webhook ${delivery.webhookId} failed to deliver to ${delivery.url}`,
      });
    }
  }
}
```

## Reliability Patterns

### Circuit Breaker for Webhook Endpoints
```typescript
class WebhookCircuitBreaker {
  private failures: Map<string, number> = new Map();

  async deliver(webhook: WebhookRegistration, event: WebhookEvent): Promise<void> {
    const failureCount = this.failures.get(webhook.url) || 0;

    if (failureCount >= 10) {
      console.warn(`Webhook circuit breaker open for ${webhook.url}`);
      await this.store.pauseWebhook(webhook.id);
      return;
    }

    try {
      await this.deliveryEngine.deliver(webhook, event);
      this.failures.set(webhook.url, 0);
    } catch (error) {
      this.failures.set(webhook.url, failureCount + 1);
      throw error;
    }
  }
}
```

## Key Points
- Track every delivery attempt with full request/response logging
- Implement automatic retry with exponential backoff for failed deliveries
- Disable webhooks that return 410 Gone or consistently fail
- Use circuit breakers to pause delivery to failing endpoints
- Monitor delivery latency and success rates per webhook
- Alert on delivery failures that exceed retry limits
- Provide webhook delivery logs for customer visibility
- Support manual webhook retriggering for failed events
- Implement webhook health checks with periodic ping events
- Rate limit delivery to prevent overwhelming slow endpoints
