# CQRS Synchronization Strategies

## Overview
Synchronize read models from write models in CQRS architectures: event-driven projections, batch sync, change data capture, and cache invalidation.

## Event-Driven Projection

```typescript
class OrderProjection {
  constructor(private readDb: IReadRepository, private logger: ILogger) {}

  async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
    await this.readDb.insert('order_summaries', {
      id: event.data.orderId,
      customerId: event.data.customerId,
      customerName: event.data.customerName,
      itemCount: event.data.items.length,
      total: event.data.total,
      status: 'pending',
      createdAt: event.occurredAt,
    });

    this.logger.info('Order summary projected', {
      orderId: event.data.orderId,
      projection: 'order_summaries',
    });
  }

  async onOrderShipped(event: OrderShippedEvent): Promise<void> {
    await this.readDb.update('order_summaries', event.data.orderId, {
      status: 'shipped',
      trackingNumber: event.data.trackingNumber,
      shippedAt: event.occurredAt,
    });
  }

  async onPaymentProcessed(event: PaymentProcessedEvent): Promise<void> {
    await this.readDb.update('order_summaries', event.data.orderId, {
      status: 'paid',
      paymentMethod: event.data.paymentMethod,
      paidAt: event.occurredAt,
    });
  }

  // Full rebuild
  async rebuild(): Promise<void> {
    this.logger.info('Rebuilding order_summaries projection');
    await this.readDb.clear('order_summaries');

    const events = await this.eventStore.getEventsByTypes([
      'OrderPlaced', 'OrderShipped', 'PaymentProcessed', 'OrderCancelled',
    ]);

    for (const event of events) {
      switch (event.eventType) {
        case 'OrderPlaced': await this.onOrderPlaced(event); break;
        case 'OrderShipped': await this.onOrderShipped(event); break;
        case 'PaymentProcessed': await this.onPaymentProcessed(event); break;
        case 'OrderCancelled': await this.onOrderCancelled(event); break;
      }
    }

    this.logger.info('order_summaries projection rebuilt', {
      totalEvents: events.length,
    });
  }
}
```

## Batch Synchronization

```typescript
class BatchReadModelSync {
  private readonly BATCH_SIZE = 1000;
  private readonly SYNC_INTERVAL = 60000; // 1 minute

  startPeriodicSync(): void {
    setInterval(async () => {
      await this.syncPendingChanges();
    }, this.SYNC_INTERVAL);
  }

  async syncPendingChanges(): Promise<SyncResult> {
    const pendingChanges = await this.getLastSyncPosition();
    let processed = 0;
    let failed = 0;

    while (true) {
      const batch = await this.writeDb.query(
        `SELECT * FROM order_events
         WHERE id > $1
         ORDER BY id ASC
         LIMIT $2`,
        [pendingChanges.lastProcessedId, this.BATCH_SIZE]
      );

      if (batch.rows.length === 0) break;

      for (const row of batch.rows) {
        try {
          await this.applyChange(row);
          pendingChanges.lastProcessedId = row.id;
          processed++;
        } catch (error) {
          failed++;
          await this.logFailedSync(row, error);
        }
      }
    }

    await this.updateSyncPosition(pendingChanges.lastProcessedId);

    return {
      processed,
      failed,
      lastPosition: pendingChanges.lastProcessedId,
      syncedAt: new Date(),
    };
  }

  async backfillReadModel(from: Date, to: Date): Promise<void> {
    const changes = await this.writeDb.query(
      `SELECT * FROM orders
       WHERE updated_at BETWEEN $1 AND $2
       ORDER BY updated_at ASC`,
      [from, to]
    );

    for (const order of changes.rows) {
      await this.readDb.upsert('order_summaries', {
        id: order.id,
        customerId: order.customer_id,
        status: order.status,
        total: order.total,
        updatedAt: order.updated_at,
      });
    }
  }
}
```

## Change Data Capture (CDC)

```typescript
// Debezium-style CDC with PostgreSQL logical replication
class CdcConsumer {
  async handleChange(payload: CdcPayload): Promise<void> {
    const { op, after, source } = payload;

    if (source.table === 'orders') {
      switch (op) {
        case 'c': // Create
          await this.readDb.insert('order_summaries', {
            id: after.id,
            customerId: after.customer_id,
            status: after.status,
            total: after.total,
            itemCount: after.item_count,
            createdAt: after.created_at,
          });
          break;

        case 'u': // Update
          await this.readDb.update('order_summaries', after.id, {
            status: after.status,
            total: after.total,
            updatedAt: after.updated_at,
          });
          break;

        case 'd': // Delete
          await this.readDb.softDelete('order_summaries', source.id);
          break;
      }
    }

    if (source.table === 'order_items') {
      // Update item count in order summary
      const count = await this.writeDb.query(
        'SELECT COUNT(*) FROM order_items WHERE order_id = $1',
        [after.order_id]
      );
      await this.readDb.update('order_summaries', after.order_id, {
        itemCount: count.rows[0].count,
      });
    }
  }
}
```

## Cache Invalidation Strategy

```typescript
class CqrsCacheManager {
  constructor(private cache: CacheProvider) {}

  async invalidateOnCommand(commandType: string, aggregateId: string): Promise<void> {
    const patterns = this.getInvalidationPatterns(commandType);

    for (const pattern of patterns) {
      const key = pattern.replace('{id}', aggregateId);
      await this.cache.del(key);
    }
  }

  private getInvalidationPatterns(commandType: string): string[] {
    const patterns: Record<string, string[]> = {
      'PlaceOrder': [
        'order:{id}',
        'customer:{id}:orders',
        'dashboard:recent-orders',
      ],
      'ShipOrder': [
        'order:{id}',
        'customer:{id}:orders',
        'dashboard:shipping-queue',
      ],
      'CancelOrder': [
        'order:{id}',
        'customer:{id}:orders',
      ],
    };

    return patterns[commandType] || [`aggregate:{id}`];
  }
}
```

## Consistency Verification

```typescript
class ConsistencyChecker {
  async verifyConsistency(entityType: string, id: string): Promise<ConsistencyResult> {
    const [writeData, readData] = await Promise.all([
      this.writeRepo.findById(id),
      this.readRepo.findById(id),
    ]);

    const differences: string[] = [];

    if (!writeData && !readData) {
      return { consistent: true, entityType, id };
    }

    if (!writeData !== !readData) {
      return {
        consistent: false,
        entityType,
        id,
        differences: ['Entity exists in one store but not the other'],
        writeOnly: !!writeData,
        readOnly: !!readData,
      };
    }

    for (const field of this.compareFields) {
      if (JSON.stringify(writeData[field]) !== JSON.stringify(readData[field])) {
        differences.push(`${field}: write=${JSON.stringify(writeData[field])}, read=${JSON.stringify(readData[field])}`);
      }
    }

    return {
      consistent: differences.length === 0,
      entityType,
      id,
      differences,
      stalenessMs: readData?.updatedAt
        ? new Date().getTime() - new Date(readData.updatedAt).getTime()
        : undefined,
    };
  }

  async runFullConsistencyCheck(entityType: string): Promise<ConsistencyReport> {
    const allIds = await this.writeRepo.getAllIds();
    let consistent = 0;
    let inconsistent = 0;

    for (const id of allIds) {
      const result = await this.verifyConsistency(entityType, id);
      if (result.consistent) {
        consistent++;
      } else {
        inconsistent++;
        this.logger.warn('Consistency mismatch', result);
      }
    }

    return {
      entityType,
      total: allIds.length,
      consistent,
      inconsistent,
      consistencyRate: allIds.length > 0 ? (consistent / allIds.length) * 100 : 100,
      checkedAt: new Date(),
    };
  }
}
```

## Key Points
- Event-driven projections react to domain events for near-real-time sync
- Batch sync processes pending changes periodically for eventual consistency
- CDC captures database changes at the storage level without application changes
- Cache invalidation on commands ensures stale data is not served
- Regular consistency verification detects and reports drift between models
