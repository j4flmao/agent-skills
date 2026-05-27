# Transactional Outbox Pattern

## Outbox Table Design

### Database Schema
```sql
CREATE TABLE outbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_version INTEGER NOT NULL DEFAULT 1,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    lock_expires_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_status_created
    ON outbox_messages(status, created_at)
    WHERE status = 'pending';

CREATE INDEX idx_outbox_lock
    ON outbox_messages(lock_expires_at)
    WHERE lock_expires_at IS NOT NULL;
```

## Producer Implementation

### Writing to Outbox
```typescript
class OutboxWriter {
  async write(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: any,
    headers?: Record<string, string>
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO outbox_messages
       (aggregate_type, aggregate_id, event_type, payload, headers)
       VALUES ($1, $2, $3, $4, $5)`,
      [aggregateType, aggregateId, eventType, JSON.stringify(payload), JSON.stringify(headers || {})]
    );
  }

  async writeBatch(events: OutboxEvent[]): Promise<void> {
    const client = await this.db.beginTransaction();

    try {
      for (const event of events) {
        await client.query(
          `INSERT INTO outbox_messages (...) VALUES (...)`,
          [event.aggregateType, event.aggregateId, event.eventType, event.payload]
        );
        // Also perform domain operations in the same transaction
        await client.query(
          `UPDATE ${event.aggregateType}s SET ... WHERE id = $1`,
          [event.aggregateId, event.data]
        );
      }

      await client.commit();
    } catch (error) {
      await client.rollback();
      throw error;
    }
  }
}
```

## Publisher Implementation

### Reliable Publishing
```typescript
class OutboxPublisher {
  private isRunning: boolean = false;

  constructor(
    private db: Database,
    private messageQueue: MessageQueue,
    private config: {
      batchSize: number;
      pollIntervalMs: number;
      maxRetries: number;
      lockTimeoutMs: number;
    }
  ) {}

  async start(): Promise<void> {
    this.isRunning = true;
    while (this.isRunning) {
      await this.processBatch();
      await this.sleep(this.config.pollIntervalMs);
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  private async processBatch(): Promise<void> {
    const messages = await this.lockNextBatch();

    for (const message of messages) {
      try {
        await this.publishMessage(message);
        await this.markProcessed(message.id);
      } catch (error) {
        await this.handleFailure(message, error);
      }
    }
  }

  private async lockNextBatch(): Promise<OutboxMessage[]> {
    const result = await this.db.query(
      `UPDATE outbox_messages
       SET lock_expires_at = NOW() + INTERVAL '30 seconds'
       WHERE id IN (
         SELECT id FROM outbox_messages
         WHERE status = 'pending'
         AND (lock_expires_at IS NULL OR lock_expires_at < NOW())
         AND retry_count <= $1
         ORDER BY created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [this.config.maxRetries, this.config.batchSize]
    );

    return result.rows;
  }

  private async publishMessage(message: OutboxMessage): Promise<void> {
    await this.messageQueue.publish(message.event_type, {
      id: message.id,
      aggregateType: message.aggregate_type,
      aggregateId: message.aggregate_id,
      type: message.event_type,
      version: message.event_version,
      data: message.payload,
      metadata: message.headers,
      timestamp: message.created_at,
    });
  }

  private async markProcessed(id: string): Promise<void> {
    await this.db.query(
      `UPDATE outbox_messages
       SET status = 'processed', processed_at = NOW(), lock_expires_at = NULL
       WHERE id = $1`,
      [id]
    );
  }

  private async handleFailure(message: OutboxMessage, error: Error): Promise<void> {
    await this.db.query(
      `UPDATE outbox_messages
       SET retry_count = retry_count + 1,
           error_message = $2,
           lock_expires_at = NULL
       WHERE id = $1`,
      [message.id, error.message]
    );
  }
}
```

## Key Points
- Store outbound messages in the same database transaction as domain changes
- Use SKIP LOCKED for concurrent publisher safety
- Implement row-level locking to prevent duplicate publishing
- Set max retries and route permanently failed messages to dead letter storage
- Monitor outbox queue depth and processing latency
- Ensure idempotent publishing to handle duplicate delivery
- Implement graceful shutdown to complete in-flight publishing
- Use batch processing for efficient message delivery
- Maintain ordering by processing messages in creation order
- Alert on growing outback backlog or persistent failures
