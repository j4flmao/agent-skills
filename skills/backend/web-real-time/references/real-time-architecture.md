# Real-Time Web Architecture

## Real-Time Data Flow

### Event Stream Processing
```typescript
class RealTimeEventProcessor {
  private subscriptions: Map<string, Set<Subscription>> = new Map();

  subscribe(clientId: string, channel: string, filters?: EventFilter): Subscription {
    const sub: Subscription = {
      id: generateId(),
      clientId,
      channel,
      filters,
      createdAt: new Date(),
    };

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(sub);
    return sub;
  }

  async publish(channel: string, event: RealTimeEvent): Promise<void> {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return;

    for (const sub of subscribers) {
      if (this.matchesFilters(event, sub.filters)) {
        await this.deliver(sub, event);
      }
    }
  }

  private matchesFilters(event: RealTimeEvent, filters?: EventFilter): boolean {
    if (!filters) return true;
    return Object.entries(filters).every(([key, value]) => event.data[key] === value);
  }

  private async deliver(subscription: Subscription, event: RealTimeEvent): Promise<void> {
    const message: WSMessage = {
      id: generateId(),
      type: 'event',
      payload: event,
      timestamp: new Date().toISOString(),
    };

    const delivered = this.wsManager.sendToUser(subscription.clientId, message);
    if (!delivered && event.persist) {
      await this.queueForReconnect(subscription.clientId, message);
    }
  }
}
```

## Key Points
- Choose SSE for server-to-client streaming, WebSocket for bidirectional communication
- Implement Redis pub/sub for multi-instance real-time distribution
- Use event sourcing for auditability and replay capability
- Buffer events for disconnected clients with bounded queue
- Implement backpressure to prevent slow consumers from blocking
- Monitor connection count and event throughput
- Use compression for large payloads
- Implement graceful degradation under load
- Track event delivery latency and success rates
- Design for eventual consistency in distributed real-time systems
