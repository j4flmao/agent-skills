# Event Sourcing Projections

## Projection Types

| Projection | Rebuild Strategy | Consistency | Use Case |
|-----------|-----------------|-------------|----------|
| Inline | Same transaction as event store | Strong | Current state of aggregate |
| Async | Background consumer | Eventual | Read models, search indexes |
| Snapshot | Periodic from event stream | Stale | Performance optimization |
| Temporal | From events at specific time | Point-in-time | Auditing, time travel |

## Projection Architecture

```
Event Store ──► Projection Subscriber ──► Projector ──► Read Database
                    │                          │
                    │                    ┌──────┴──────┐
                    │              ┌────▼────┐  ┌────▼────┐
                    │              │  Order  │  │  User   │
                    │              │  Summary│  │  Stats  │
                    │              │ Projection│  │Projection│
                    │              └─────────┘  └─────────┘
                    │
               ┌────▼────┐
               │Projection│
               │Rebuild   │
               │Manager   │
               └─────────┘
```

## Inline Projection (Strong Consistency)

```typescript
class OrderAggregate {
  private state: OrderState = OrderState.initial();

  // Inline projection — state is derived as events are applied
  applyEvent(event: DomainEvent): void {
    if (event instanceof OrderPlaced) {
      this.state = {
        ...this.state,
        id: event.data.orderId,
        customerId: event.data.customerId,
        status: 'placed',
        items: event.data.items,
        total: event.data.total,
        createdAt: event.metadata.timestamp,
        version: event.metadata.version,
      };
    } else if (event instanceof OrderShipped) {
      this.state = {
        ...this.state,
        status: 'shipped',
        trackingNumber: event.data.trackingNumber,
        updatedAt: event.metadata.timestamp,
        version: event.metadata.version,
      };
    }
  }

  getState(): OrderState {
    return this.state;
  }

  static loadFromHistory(events: DomainEvent[]): OrderAggregate {
    const aggregate = new OrderAggregate();
    for (const event of events) {
      aggregate.applyEvent(event);
    }
    return aggregate;
  }
}
```

## Async Projection

```typescript
interface Projector {
  project(event: DomainEvent): Promise<void>;
  rebuild(): Promise<void>;
  getName(): string;
}

class OrderSummaryProjection implements Projector {
  constructor(private readDb: OrderReadRepository) {}

  getName(): string { return 'order_summary'; }

  async project(event: DomainEvent): Promise<void> {
    if (event instanceof OrderPlaced) {
      await this.readDb.insert('order_summaries', {
        id: event.data.orderId,
        customerId: event.data.customerId,
        customerName: event.data.customerName,
        itemCount: event.data.items.length,
        total: event.data.total,
        status: 'placed',
        createdAt: event.metadata.timestamp,
      });
    } else if (event instanceof OrderShipped) {
      await this.readDb.update('order_summaries', event.data.orderId, {
        status: 'shipped',
        trackingNumber: event.data.trackingNumber,
        carrier: event.data.carrier,
      });
    } else if (event instanceof OrderCancelled) {
      await this.readDb.update('order_summaries', event.data.orderId, {
        status: 'cancelled',
        cancelledAt: event.metadata.timestamp,
      });
    }
  }

  async rebuild(): Promise<void> {
    await this.readDb.clear('order_summaries');
    // Manager will replay all events into this projector
  }
}
```

## Projection Rebuild Manager

```typescript
class ProjectionRebuildManager {
  constructor(
    private eventStore: EventStore,
    private projectors: Projector[],
  ) {}

  async rebuildSingle(projectorName: string): Promise<void> {
    const projector = this.projectors.find(p => p.getName() === projectorName);
    if (!projector) throw new Error(`Unknown projector: ${projectorName}`);

    console.log(`Rebuilding projection: ${projectorName}`);
    const startTime = Date.now();

    // Clear existing projection
    await projector.rebuild();

    // Replay all relevant events
    let offset = 0;
    const batchSize = 1000;
    let totalEvents = 0;

    while (true) {
      const events = await this.eventStore.getEvents({
        offset,
        limit: batchSize,
        eventTypes: this.getEventTypesForProjector(projector),
      });

      if (events.length === 0) break;

      for (const event of events) {
        await projector.project(event);
      }

      offset += events.length;
      totalEvents += events.length;
      console.log(`Rebuilt ${totalEvents} events for ${projectorName}`);
    }

    console.log(`Completed rebuild of ${projectorName}: ${totalEvents} events in ${Date.now() - startTime}ms`);
  }

  async rebuildAll(): Promise<void> {
    for (const projector of this.projectors) {
      await this.rebuildSingle(projector.getName());
    }
  }

  private getEventTypesForProjector(projector: Projector): string[] {
    // Could be metadata-driven or explicit
    return [];
  }
}
```

## Categorized Projections

```typescript
// Search index projection
class SearchIndexProjection implements Projector {
  constructor(private searchClient: ElasticsearchClient) {}

  getName(): string { return 'search_index'; }

  async project(event: DomainEvent): Promise<void> {
    if (event instanceof ProductAdded) {
      await this.searchClient.index({
        index: 'products',
        id: event.data.productId,
        body: {
          name: event.data.name,
          description: event.data.description,
          price: event.data.price,
          category: event.data.category,
          createdAt: event.metadata.timestamp,
        },
      });
    } else if (event instanceof ProductPriceChanged) {
      await this.searchClient.update({
        index: 'products',
        id: event.data.productId,
        body: { doc: { price: event.data.newPrice } },
      });
    } else if (event instanceof ProductRemoved) {
      await this.searchClient.delete({
        index: 'products',
        id: event.data.productId,
      });
    }
  }

  async rebuild(): Promise<void> {
    await this.searchClient.deleteByQuery({
      index: 'products',
      body: { query: { match_all: {} } },
    });
  }
}

// Analytics projection
class OrderAnalyticsProjection implements Projector {
  constructor(private analyticsDb: AnalyticsRepository) {}

  getName(): string { return 'order_analytics'; }

  async project(event: DomainEvent): Promise<void> {
    if (event instanceof OrderPlaced) {
      await this.analyticsDb.increment('total_orders');
      await this.analyticsDb.add('daily_revenue', event.data.total);
      await this.analyticsDb.incrementBy(
        `category:${event.data.category}`,
        event.data.items.length,
      );
    }
  }

  async rebuild(): Promise<void> {
    await this.analyticsDb.resetAll();
  }
}
```

## Projection Health Monitoring

```yaml
projections:
  order_summary:
    status: "running"
    last_event_id: 45000
    lag: 5
    processed_count: 45000
    last_error: null

  search_index:
    status: "rebuilding"
    last_event_id: 44950
    lag: 55
    processed_count: 44950
    last_error: null

  analytics:
    status: "error"
    last_event_id: 44800
    lag: 205
    processed_count: 44800
    last_error: "Connection timeout to analytics DB"
```

```typescript
class ProjectionMonitor {
  constructor(private eventStore: EventStore) {}

  async getHealth(projector: Projector, lastProcessedId: number): Promise<ProjectionHealth> {
    const latestEventId = await this.eventStore.getLatestEventId();
    const lag = latestEventId - lastProcessedId;

    return {
      name: projector.getName(),
      lastProcessedId,
      latestEventId,
      lag,
      status: lag > 100 ? 'degraded' : lag > 1000 ? 'critical' : 'healthy',
      checkedAt: new Date(),
    };
  }
}
```

## Projection Testing

```typescript
describe('OrderSummaryProjection', () => {
  let projection: OrderSummaryProjection;
  let readDb: InMemoryOrderReadRepository;

  beforeEach(() => {
    readDb = new InMemoryOrderReadRepository();
    projection = new OrderSummaryProjection(readDb);
  });

  it('creates summary on OrderPlaced', async () => {
    const event = new OrderPlacedEvent({
      orderId: 'ord-1', customerId: 'c1', customerName: 'Alice',
      items: [{ productId: 'p1', quantity: 2, price: 10 }], total: 20,
    });

    await projection.project(event);

    const summary = await readDb.findById('ord-1');
    expect(summary.customerName).toBe('Alice');
    expect(summary.total).toBe(20);
  });

  it('updates summary on OrderShipped', async () => {
    await projection.project(new OrderPlacedEvent({ orderId: 'ord-1', /* ... */ }));
    await projection.project(new OrderShippedEvent({
      orderId: 'ord-1', trackingNumber: 'TRK1', carrier: 'UPS',
    }));

    const summary = await readDb.findById('ord-1');
    expect(summary.status).toBe('shipped');
    expect(summary.trackingNumber).toBe('TRK1');
  });

  it('rebuilds from scratch', async () => {
    const events = [
      new OrderPlacedEvent({ orderId: 'ord-1', /* ... */ }),
      new OrderPlacedEvent({ orderId: 'ord-2', /* ... */ }),
    ];

    for (const event of events) await projection.project(event);
    expect(await readDb.count()).toBe(2);

    await projection.rebuild();
    expect(await readDb.count()).toBe(0);
  });
});
```
