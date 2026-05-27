# Advanced Outbox Scenarios

Complex scenarios requiring multiple events, ordering guarantees, or batch processing.

## Multi-Aggregate Outbox

Publish events for multiple aggregates in a single transaction:

```typescript
async function fulfillOrder(orderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Update order
    await tx.orders.update(orderId, { status: 'fulfilled' });
    await tx.outbox.insert({
      aggregateType: 'order',
      aggregateId: orderId,
      eventType: 'OrderFulfilled',
      eventData: { orderId, fulfilledAt: new Date() },
    });

    // Update inventory
    for (const item of order.items) {
      await tx.inventory.decrement(item.productId, item.quantity);
      await tx.outbox.insert({
        aggregateType: 'inventory',
        aggregateId: item.productId,
        eventType: 'InventoryDecremented',
        eventData: { productId: item.productId, quantity: item.quantity },
      });
    }

    // Create shipment
    const shipmentId = await tx.shipments.insert({ orderId });
    await tx.outbox.insert({
      aggregateType: 'shipment',
      aggregateId: shipmentId,
      eventType: 'ShipmentCreated',
      eventData: { shipmentId, orderId },
    });
  });
}
```

## Ordering Guarantees

Ensure events for the same aggregate are processed in order:

```typescript
class OrderedOutboxRelay {
  async poll(): Promise<void> {
    // Use SKIP LOCKED to avoid contention
    const messages = await this.db.query(`
      SELECT * FROM outbox_messages
      WHERE processed_at IS NULL
      ORDER BY aggregate_type, aggregate_id, created_at ASC
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    `);

    // Group by aggregate for ordered processing
    const groups = this.groupByAggregate(messages);

    for (const [aggregate, events] of groups) {
      for (const event of events) {
        try {
          await this.messageBus.publish(event.eventType, event.eventData);
          await this.db.query('UPDATE outbox_messages SET processed_at = NOW() WHERE id = $1', [event.id]);
        } catch (err) {
          // Stop processing this aggregate on failure — preserve ordering
          logger.error({ aggregateId: aggregate, eventId: event.id }, 'Failed to publish');
          break;
        }
      }
    }
  }

  private groupByAggregate(messages: OutboxMessage[]): Map<string, OutboxMessage[]> {
    const groups = new Map<string, OutboxMessage[]>();
    for (const msg of messages) {
      const key = `${msg.aggregateType}:${msg.aggregateId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(msg);
    }
    return groups;
  }
}
```

## Batch Publishing

Publish multiple events in a single broker call:

```typescript
class BatchOutboxRelay {
  private batchSize = 50;
  private maxBatchDelay = 1000; // 1 second

  async run(): Promise<void> {
    while (true) {
      const batch = await this.collectBatch();
      if (batch.length === 0) {
        await sleep(this.maxBatchDelay);
        continue;
      }

      await this.publishBatch(batch);
    }
  }

  private async collectBatch(): Promise<OutboxMessage[]> {
    const messages = await this.db.query(`
      SELECT * FROM outbox_messages
      WHERE processed_at IS NULL
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `, [this.batchSize]);

    return messages;
  }

  private async publishBatch(messages: OutboxMessage[]): Promise<void> {
    const topicGroups = new Map<string, OutboxMessage[]>();

    for (const msg of messages) {
      const topic = this.eventTypeToTopic(msg.eventType);
      if (!topicGroups.has(topic)) topicGroups.set(topic, []);
      topicGroups.get(topic)!.push(msg);
    }

    // Publish each topic batch atomically
    for (const [topic, msgs] of topicGroups) {
      try {
        await this.messageBus.publishBatch(topic, msgs.map(m => ({
          key: m.aggregateId,
          value: m.eventData,
          headers: { eventType: m.eventType, eventId: m.id },
        })));

        await this.db.query(`
          UPDATE outbox_messages SET processed_at = NOW()
          WHERE id = ANY($1::uuid[])
        `, [msgs.map(m => m.id)]);
      } catch (err) {
        logger.error({ topic, count: msgs.length }, 'Batch publish failed');
      }
    }
  }
}
```

## Dead Letter Escalation

Handle messages that repeatedly fail:

```typescript
class OutboxDeadLetterHandler {
  async processDeadLetters(): Promise<void> {
    const deadLetters = await this.db.query(`
      SELECT * FROM outbox_messages
      WHERE retry_count >= 10
        AND last_error IS NOT NULL
        AND dead_lettered_at IS NULL
    `);

    for (const msg of deadLetters) {
      await this.escalateToOncall(msg);
      await this.db.query(`
        UPDATE outbox_messages
        SET dead_lettered_at = NOW()
        WHERE id = $1
      `, [msg.id]);
    }
  }

  private async escalateToOncall(msg: OutboxMessage): Promise<void> {
    await alertOncall({
      type: 'outbox_dead_letter',
      eventId: msg.id,
      eventType: msg.eventType,
      aggregateId: msg.aggregateId,
      retryCount: msg.retry_count,
      lastError: msg.last_error,
      severity: 'critical',
    });
  }
}
```

## Key Points
- Group events by aggregate to preserve ordering guarantees
- Use SKIP LOCKED for efficient concurrent relay processing
- Batch events by topic for efficient publishing
- Stop processing an aggregate on failure to maintain ordering
- Track retry counts and escalate to dead letter after threshold
- Log batch publish failures for monitoring and retry
- Consider partitioning by aggregate ID for parallel processing without ordering loss
