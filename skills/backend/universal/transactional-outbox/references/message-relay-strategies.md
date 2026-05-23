# Message Relay Strategies

## Polling Relay

The simplest relay — periodically query unprocessed outbox records and publish them.

```typescript
class PollingRelay {
  constructor(private db: Database, private bus: MessageBus) {}

  async poll(): Promise<void> {
    const messages = await this.db.query(
      `SELECT * FROM outbox WHERE processed_at IS NULL
       AND retry_count < 10 ORDER BY created_at LIMIT 100`
    );

    for (const msg of messages) {
      try {
        await this.bus.publish(msg.event_type, {
          id: msg.id,
          type: msg.event_type,
          data: msg.event_data,
          metadata: msg.metadata,
        });
        await this.db.execute(
          `UPDATE outbox SET processed_at = NOW() WHERE id = $1`,
          [msg.id]
        );
      } catch (err) {
        await this.db.execute(
          `UPDATE outbox SET retry_count = retry_count + 1, last_error = $1 WHERE id = $2`,
          [err.message, msg.id]
        );
      }
    }
  }

  start(intervalMs = 1000): void {
    setInterval(() => this.poll(), intervalMs);
  }
}
```

| Pros | Cons |
|------|------|
| Simple to implement | Polling latency (up to interval) |
| Works with any database | Database load from polling |
| No extra infrastructure | Not suitable for >1000 msg/s |

## CDC Relay (Change Data Capture)

Uses database replication log to capture outbox inserts without polling.

```
PostgreSQL WAL → Debezium → Kafka → Consumer
                  (CDC connector)
```

| Pros | Cons |
|------|------|
| Near-zero latency | Requires Debezium/Kafka infra |
| No database polling overhead | Operational complexity |
| Handles high throughput | Debugging is harder |

### Debezium Outbox Configuration

```json
{
  "name": "order-outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.dbname": "orders",
    "table.include.list": "public.outbox",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.payload": "event_data"
  }
}
```

## Transaction Log Relay

For SQL Server, use the transaction log directly:

```sql
-- Enable change tracking
ALTER DATABASE orders SET CHANGE_TRACKING = ON;
ALTER TABLE outbox ENABLE CHANGE_TRACKING;

-- Query changes
SELECT * FROM CHANGETABLE(CHANGES outbox, @last_version) AS ct;
```

## Comparison

| Strategy | Latency | Throughput | Complexity | Infrastructure |
|----------|---------|------------|------------|----------------|
| Polling | 100ms-1s | <1000/s | Low | None |
| CDC | <100ms | >10000/s | High | Debezium + Kafka |
| Transaction Log | <100ms | >10000/s | High | DB-specific |
| Hybrid (poll + batch) | 500ms | <5000/s | Medium | None |

## Monitoring

- Outbox backlog: number of unprocessed messages.
- Relay processing rate: messages processed per second.
- Failure rate: percentage of messages that fail to publish.
- Dead letters: messages exceeding retry limit.
