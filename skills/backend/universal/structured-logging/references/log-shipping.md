# Log Shipping

## Stdout Output
```typescript
// Pino configuration (Node.js)
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) { return { level: label }; },
    bindings() { return {}; },
  },
  redact: {
    paths: ['password', 'secret', 'token', 'ssn', 'email', 'creditCard'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});
```

## Sidecar Config (Vector/Fluentd)
```yaml
# Vector configuration
sources:
  app_logs:
    type: file
    include: ["/var/log/app/*.log"]  # stdout capture
transforms:
  parse_json:
    type: json_parser
    inputs: ["app_logs"]
    field: message
sinks:
  elasticsearch:
    type: elasticsearch
    inputs: ["parse_json"]
    endpoint: http://elasticsearch:9200
    index: "logs-%Y-%m-%d"
```

## Sampling Configuration
```yaml
sampling:
  ERROR: { rate: 1.0 }
  WARN: { rate: 1.0 }
  INFO:
    rate: 0.1
    endpoints:
      /health: 0.0
      /api/orders: 1.0
      default: 0.1
  DEBUG: { rate: 0.01 }
rate_limit:
  max_entries_per_second: 5000
  strategy: drop_oldest
```

## Aggregation Pipeline
```
App stdout
  → Sidecar (Vector/Fluentd/Logstash)
    → Buffer (Kafka/Redis)
      → Indexer (Elasticsearch/Loki)
        → Dashboard (Grafana/Kibana)
```
