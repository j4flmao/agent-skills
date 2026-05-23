# Event Store Patterns

## Storage Strategies

### PostgreSQL Event Store

```sql
CREATE TABLE events (
  id BIGSERIAL,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  version INTEGER NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (aggregate_type, aggregate_id, version)
);

-- Append event
INSERT INTO events (aggregate_type, aggregate_id, version, event_type, event_data, metadata)
VALUES ($1, $2, (SELECT COALESCE(MAX(version), 0) + 1 FROM events WHERE aggregate_type = $1 AND aggregate_id = $2), $3, $4, $5);

-- Read all events for aggregate (in order)
SELECT * FROM events WHERE aggregate_type = $1 AND aggregate_id = $2 ORDER BY version;
```

### DynamoDB Event Store

```
Table: Events
  PK: aggregate_type#aggregate_id
  SK: version (numeric)
  Attributes: event_type, event_data, metadata, created_at
  Conditional write: SK must not exist (prevents version conflicts)
```

### EventStoreDB

Use EventStoreDB for dedicated event sourcing infrastructure:
- Native append-only store optimized for events.
- Built-in projections.
- Subscription model for consumers.
- Automatic indexing by event type and aggregate.

## Querying Events

- **By aggregate**: `SELECT * FROM events WHERE aggregate_id = $1 ORDER BY version`
- **By event type**: `SELECT * FROM events WHERE event_type = $1 ORDER BY id`
- **By time range**: `SELECT * FROM events WHERE created_at BETWEEN $1 AND $2 ORDER BY id`
- **By correlation ID**: `SELECT * FROM events WHERE metadata->>'correlationId' = $1`

## Performance Considerations

- Index on `(aggregate_type, aggregate_id, version)` for aggregate reads.
- Index on `event_type` for projection rebuilds.
- Archive events older than 90 days to cold storage.
- Use snapshots for aggregates with >100 events to speed up rebuild.
- Partition by aggregate_type for large-scale systems.

## Snapshot Storage

```sql
CREATE TABLE snapshots (
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (aggregate_type, aggregate_id, version)
);
```

Snapshots are taken every N events (N = 50-100 depending on aggregate complexity).
