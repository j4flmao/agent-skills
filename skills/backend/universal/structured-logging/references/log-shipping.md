# Log Shipping

## Stdout Pattern

```
Application logs to stdout (JSON lines)
  → Container runtime captures stdout
  → Sidecar agent reads from container stdout
  → Aggregator buffers and ships to storage
  → Search/visualization layer
```

Never write logs to files in containers. Files cause: disk full, log rotation complexity, lost logs on container restart, permission issues. Always log to stdout and let the infrastructure layer handle shipping.

## Log Shipping Sidecars

```yaml
# Docker Compose — Vector sidecar
services:
  app:
    image: myapp:latest
    logging:
      driver: journald
  vector:
    image: timberio/vector:latest
    volumes:
      - /var/log/journal:/var/log/journal:ro
      - ./vector.toml:/etc/vector/vector.toml:ro
    depends_on:
      - app
```

```yaml
# Kubernetes — Fluentd DaemonSet capture
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
      read_from_head true
    </source>
    <match kubernetes.var.log.containers.**app**.log>
      @type elasticsearch
      host elasticsearch
      port 9200
      logstash_format true
      logstash_prefix "app-logs"
      flush_interval 5s
    </match>
```

## Vector Configuration (Production)

```toml
# vector.toml — full log pipeline
[sources.app_logs]
type = "file"
include = ["/var/log/containers/*.log"]
ignore_older_secs = 600
glob_minimum_cooldown_ms = 1000

[transforms.parse_json]
type = "remap"
inputs = ["app_logs"]
source = '''
  . = parse_json!(.message) ?? {}
  .timestamp = now()
'''

[transforms.redact_pii]
type = "remap"
inputs = ["parse_json"]
source = '''
  # Redact known PII fields
  if exists(.email) { .email = "***@***" }
  if exists(.password) { .password = "[REDACTED]" }
  if exists(.ssn) { .ssn = "***-**-****" }
  if exists(.creditCard) { .credit_card = "****-****-****-****" }
  
  # Recursive redaction for nested objects
  for field in ["user", "customer", "account"] {
    if is_object(.[field]) {
      if exists(.[field].email) { .[field].email = "***@***" }
    }
  }
'''

[transforms.sample_info]
type = "sample"
inputs = ["redact_pii"]
rate = 0.1  # Sample 10% of INFO logs
key_field = "log.level"

[transforms.route_by_level]
type = "route"
inputs = ["sample_info"]
route.error = '.log.level == "ERROR" || .log.level == "FATAL"'
route.warn = '.log.level == "WARN"'
route.info = '.log.level == "INFO"'
route.debug = '.log.level == "DEBUG"'

[sinks.elasticsearch_errors]
type = "elasticsearch"
inputs = ["route_by_level.error"]
endpoint = "http://elasticsearch:9200"
index = "logs-error-%Y-%m-%d"
encoding.except_fields = ["password", "secret", "token"]
batch.max_events = 100
batch.timeout_secs = 5

[sinks.elasticsearch_all]
type = "elasticsearch"
inputs = ["route_by_level.warn", "route_by_level.info"]
endpoint = "http://elasticsearch:9200"
index = "logs-all-%Y-%m-%d"
batch.max_events = 500
batch.timeout_secs = 10

[sinks.cloudwatch_debug]
type = "aws_cloudwatch_logs"
inputs = ["route_by_level.debug"]
group_name = "/app/debug"
stream_name = "{{ service.name }}-{{ host }}"
encoding.codec = "json"
```

## Aggregation Pipeline Architecture

```
App (stdout JSON)
  │
  ▼
Sidecar (Vector/Fluentd/Logstash)
  │
  ▼                              ┌────────────┐
Buffer (Kafka/Redis) ──────────► │   Alert     │
  │                              │ (PagerDuty) │
  ▼                              └────────────┘
Indexer (Elasticsearch/Loki/CloudWatch Logs)
  │
  ▼
Dashboard (Grafana/Kibana/CloudWatch Logs Insights)
```

## Log Sampling Strategies

| Strategy | Mechanism | Use Case |
|----------|-----------|----------|
| Rate-based | Max N entries/sec, drop oldest | Bound total log volume |
| Level-based | 100% ERROR, 10% INFO, 1% DEBUG | Normal production |
| Endpoint-based | 0% for /health, 100% for /api/orders | Ignore noise, keep important |
| Dynamic | Increase sample rate when error rate spikes | Detect issues without volume |
| User-based | 100% for specific users (internal staff) | Debugging specific issues |
| Header-based | Debug logging enabled via `X-Debug-Log: true` | Request-level debugging |

```typescript
// Dynamic sampling — increase rate when errors spike
class AdaptiveSampler {
  private errorRate = 0;
  private sampleRate = 0.1;
  private windowSize = 60_000; // 1 minute window
  private errorCount = 0;
  private totalCount = 0;
  private lastReset = Date.now();

  shouldSample(level: string): boolean {
    if (level === 'ERROR') return true; // Always log errors
    this.resetIfNeeded();
    const adjustedRate = Math.max(this.sampleRate, Math.min(1.0, this.errorRate * 10));
    return Math.random() < adjustedRate;
  }

  recordLog(level: string): void {
    this.totalCount++;
    if (level === 'ERROR') this.errorCount++;
  }

  private resetIfNeeded(): void {
    if (Date.now() - this.lastReset > this.windowSize) {
      this.errorRate = this.totalCount > 0 ? this.errorCount / this.totalCount : 0;
      this.errorCount = 0;
      this.totalCount = 0;
      this.lastReset = Date.now();
    }
  }
}
```

## Log Retention Policy

```yaml
retention:
  ERROR:
    storage: elasticsearch_hot
    retention: 90 days
    index: logs-error-%Y-%m-%d
    shard_count: 3
  WARN:
    storage: elasticsearch_hot
    retention: 30 days
    index: logs-warn-%Y-%m-%d
    shard_count: 2
  INFO:
    storage: elasticsearch_warm
    retention: 14 days
    index: logs-info-%Y-%m-%d
    shard_count: 2
  DEBUG:
    storage: elasticsearch_cold
    retention: 7 days
    index: logs-debug-%Y-%m-%d
    shard_count: 1
  audit:
    storage: s3_archive
    retention: 7 years
    format: parquet
    partition: year/month/day
```

## Log Shipper Comparison

| Feature | Vector | Fluentd | Logstash | Fluent Bit |
|---------|--------|---------|----------|------------|
| Language | Rust | Ruby | JRuby | C |
| Memory | ~10MB | ~150MB | ~500MB | ~1MB |
| Throughput | 100K+ events/s | 50K events/s | 30K events/s | 100K+ events/s |
| Plugins | 50+ | 1000+ | 200+ | 70+ |
| Configuration | TOML | Ruby DSL | JSON/YAML | INI/YAML |
| Kubernetes CRD | Yes | Yes | No | Yes |
| WASM transform | Yes | No | No | No |
| VRL (Vector Remap) | Yes | No | No | No |

## Common Pitfalls

- **File appenders in containers**: Writing logs to files inside containers causes disk full, logs lost on restart, and rotation issues. Always stdout.
- **No buffering**: Direct synchronous HTTP shipping fails when aggregator is down. Buffer to local disk (Vector) or Kafka for durability.
- **Unbounded log volume**: No sampling at high throughput generates terabytes/day. Always configure sampling and rate limiting.
- **PII in shipped logs**: Redaction must happen before logs leave the application. Client-side redaction (in logger config) plus server-side redaction (in Vector).
- **Missing structured parsing**: Log shipper expects JSON but gets plain text = indexing fails. Validate log format before deployment with a log fixture test.
- **Single point of aggregation failure**: One Logstash instance = loss of all logs during failure. Deploy log shipper as sidecar per pod (Kubernetes) or multi-instance with load balancer.
