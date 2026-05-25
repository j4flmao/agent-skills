# Outbox Deployment

## Deployment Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  Application Pod    │     │  Relay Service Pod  │
│  (writes to outbox  │     │  (polls/CDC from    │
│   table in same Tx) │     │   outbox → broker)  │
└─────────────────────┘     └─────────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
            ┌────────▼────────┐
            │   PostgreSQL    │
            │  (business DB   │
            │  + outbox table)│
            └─────────────────┘
                     │
            ┌────────▼────────┐
            │    Message      │
            │    Broker       │
            │  (Kafka/SQS/    │
            │   RabbitMQ)     │
            └─────────────────┘
```

## Deployment Considerations

| Aspect | Polling Relay | CDC Relay (Debezium) |
|--------|--------------|---------------------|
| Separate deployment | Yes, separate service | Yes, Debezium connector |
| Infrastructure | Standalone service | Kafka Connect cluster |
| Scaling | Horizontal (partition-based) | Horizontal (partition-based) |
| Latency | Configurable (1-5s typical) | Near real-time (< 1s) |
| Complexity | Low | Medium |
| Resource usage | Low | Medium (Kafka Connect) |
| Database impact | SELECT on outbox table | WAL reading (minimal) |

## Polling Relay Deployment

```yaml
# Kubernetes deployment for polling relay
apiVersion: apps/v1
kind: Deployment
metadata:
  name: outbox-relay
spec:
  replicas: 2
  selector:
    matchLabels:
      app: outbox-relay
  template:
    metadata:
      labels:
        app: outbox-relay
    spec:
      containers:
      - name: relay
        image: myapp/outbox-relay:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: MESSAGE_BROKER_URL
          value: "kafka-cluster:9092"
        - name: POLL_INTERVAL_MS
          value: "1000"
        - name: BATCH_SIZE
          value: "100"
        - name: MAX_RETRY_COUNT
          value: "10"
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

## CDC Relay Deployment (Debezium)

```yaml
# Debezium connector configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: debezium-outbox-connector
data:
  connector.json: |
    {
      "name": "outbox-connector",
      "config": {
        "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
        "database.hostname": "postgres",
        "database.port": "5432",
        "database.user": "debezium",
        "database.password": "${DB_PASSWORD}",
        "database.dbname": "myapp",
        "database.server.name": "myapp-db",
        "plugin.name": "pgoutput",
        "table.include.list": "public.outbox_messages",
        "transforms": "outbox",
        "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
        "transforms.outbox.table.field.event.key": "aggregate_id",
        "transforms.outbox.table.field.event.type": "event_type",
        "transforms.outbox.table.field.event.payload": "event_data",
        "transforms.outbox.route.by.field": "event_type",
        "transforms.outbox.route.topic.replacement": "${routedByValue}.v1",
        "value.converter": "org.apache.kafka.connect.json.JsonConverter",
        "value.converter.schemas.enable": "false",
        "tombstones.on.delete": "false"
      }
    }
```

```yaml
# Kafka Connect deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-connect
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: connect
        image: debezium/connect:2.7
        env:
        - name: BOOTSTRAP_SERVERS
          value: "kafka-cluster:9092"
        - name: CONFIG_STORAGE_TOPIC
          value: "connect-configs"
        - name: OFFSET_STORAGE_TOPIC
          value: "connect-offsets"
        - name: STATUS_STORAGE_TOPIC
          value: "connect-status"
        - name: CONNECT_REST_PORT
          value: "8083"
```

## CI/CD Pipeline

```yaml
# Deploy outbox relay with application
deploy:
  stages:
    - name: "Run migrations"
      command: "npx prisma migrate deploy"
      rollback: "npx prisma migrate resolve --rolled-back"

    - name: "Deploy application"
      command: "kubectl apply -f k8s/application.yaml"
      health_check: "kubectl rollout status deployment/myapp"

    - name: "Deploy outbox relay"
      command: "kubectl apply -f k8s/outbox-relay.yaml"
      health_check: "kubectl rollout status deployment/outbox-relay"

    - name: "Verify outbox relay"
      command: |
        curl -f http://outbox-relay:8080/health &&
        curl -f http://outbox-relay:8080/metrics | grep outbox_messages_published

  smoke_tests:
    - name: "Create order and verify event"
      script: |
        curl -X POST http://myapp/api/orders \
          -H "Content-Type: application/json" \
          -d '{"customerId": "test", "items": [{"productId": "p1"}]}'
        # Verify event was published
        kafka-console-consumer --bootstrap-server kafka:9092 \
          --topic OrderPlaced.v1 \
          --from-beginning --max-messages 1 --timeout-ms 10000
```

## Operational Monitoring

```yaml
# Prometheus metrics for outbox relay
metrics:
  outbox_messages_pending:
    type: gauge
    description: "Number of unprocessed outbox messages"
  outbox_messages_published:
    type: counter
    labels: [event_type]
    description: "Total published messages"
  outbox_messages_failed:
    type: counter
    labels: [event_type, error_type]
    description: "Failed publication attempts"
  outbox_messages_retry_count:
    type: histogram
    labels: [event_type]
    description: "Retry count before success"
  outbox_relay_lag_seconds:
    type: gauge
    description: "Time since oldest unprocessed message"

alerts:
  - condition: "outbox_messages_pending > 1000"
    severity: warning
    summary: "Outbox backlog growing"
  - condition: "outbox_messages_pending > 10000"
    severity: critical
    summary: "Outbox backlog critical"
  - condition: "outbox_relay_lag_seconds > 300"
    severity: warning
    summary: "Outbox relay lag > 5 minutes"
  - condition: "rate(outbox_messages_failed[5m]) > 10"
    severity: critical
    summary: "High outbox failure rate"
```

## Database Schema Migration

```sql
-- Migration: Create outbox table
-- Version: 20260525_001
-- This table is created in the application database, not a separate one

CREATE TABLE outbox_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type  VARCHAR(100) NOT NULL,
  aggregate_id    VARCHAR(100) NOT NULL,
  event_type      VARCHAR(200) NOT NULL,
  event_data      JSONB NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT
);

CREATE INDEX idx_outbox_unprocessed ON outbox_messages(created_at)
  WHERE processed_at IS NULL;

CREATE INDEX idx_outbox_processed ON outbox_messages(processed_at)
  WHERE processed_at IS NOT NULL;

-- Retention cleanup
CREATE INDEX idx_outbox_cleanup ON outbox_messages(created_at)
  WHERE processed_at IS NOT NULL;
```

## Migration Safety

```yaml
migration_safety:
  backward_compatible: true
  rollback: "DROP TABLE IF EXISTS outbox_messages"
  zero_downtime: true
  notes: |
    Adding an outbox table is fully backward compatible.
    The existing application continues to work without the relay.
    The relay can be deployed separately once the migration completes.
  validation:
    - "Table exists before relay deployment"
    - "Application writes outbox entries within business transactions"
    - "Relay processes entries and marks as processed"
```

## Health Check Endpoints

```typescript
// Outbox relay health endpoints
class OutboxRelayServer {
  constructor(private relay: OutboxRelay) {}

  setup(app: Express): void {
    // Liveness — is the process alive?
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', uptime: process.uptime() });
    });

    // Readiness — is the relay able to process?
    app.get('/ready', async (req, res) => {
      try {
        await this.relay.checkConnection();
        const pending = await this.relay.getPendingCount();
        res.json({
          status: 'ready',
          pendingMessages: pending,
          connected: true,
        });
      } catch (err) {
        res.status(503).json({ status: 'not ready', error: err.message });
      }
    });

    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      const metrics = await this.relay.getMetrics();
      res.set('Content-Type', 'text/plain');
      res.write(`# HELP outbox_messages_pending Pending messages\n`);
      res.write(`# TYPE outbox_messages_pending gauge\n`);
      res.write(`outbox_messages_pending ${metrics.pending}\n`);
      res.end();
    });
  }
}
```
