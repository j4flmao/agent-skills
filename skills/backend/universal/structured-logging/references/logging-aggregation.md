# Logging Aggregation

## Log Shippers

| Shipper | Language | Inputs | Outputs | Resource Usage | Best For |
|---------|----------|--------|---------|----------------|----------|
| Vector | Rust | file, journald, kafka, syslog | elasticsearch, loki, s3, kafka | Low (5-10 MB RSS) | Modern infrastructure, low resource |
| Fluentd | Ruby/C | file, syslog, tcp, kafka | elasticsearch, s3, mongo, kafka | Medium (50-100 MB) | Plugin ecosystem, legacy systems |
| Logstash | Java/JRuby | file, kafka, tcp, beats | elasticsearch, s3, kafka, statsd | High (200-500 MB) | Elasticsearch ecosystem |
| Filebeat | Go | file, container logs | elasticsearch, logstash, kafka | Very low (5-15 MB) | File-based log shipping to ES |
| Promtail | Go | file, journald | loki | Very low (5-15 MB) | Loki log shipping |

## Vector Configuration

```yaml
# vector.toml — high-performance log shipper
[sources.app_logs]
type = "file"
include = ["/var/log/app/*.log"]
read_from = "beginning"

[sources.container_logs]
type = "docker_logs"

[transforms.parse_json]
type = "remap"
inputs = ["app_logs"]
source = '''
  . = parse_json!(.message) ?? {}
  .@timestamp = now()
'''

[transforms.redact_pii]
type = "remap"
inputs = ["parse_json"]
source = '''
  # Redact sensitive fields
  if exists(.email) { .email = "***" }
  if exists(.phone) { .phone = "***" }
  if exists(.ssn) { .ssn = "***" }
  if exists(.password) { .password = "[REDACTED]" }
  if exists(.token) { .token = "[REDACTED]" }
'''

[transforms.add_metadata]
type = "remap"
inputs = ["redact_pii"]
source = '''
  .host = get_hostname!()
  .agent = "vector/0.38"
'''

[sinks.elasticsearch]
type = "elasticsearch"
inputs = ["add_metadata"]
endpoints = ["http://elasticsearch:9200"]
index = "logs-%Y-%m-%d"
encoding.except_fields = ["_metadata"]
buffer.type = "kafka"
buffer.when_full = "block"

[sinks.s3_archive]
type = "aws_s3"
inputs = ["add_metadata"]
bucket = "logs-archive"
key_prefix = "year=%Y/month=%m/day=%d/%H-%M-%S-%N"
compression = "gzip"
batch.max_bytes = 10485760
```

## Fluentd Configuration

```yaml
# fluentd.conf
<source>
  @type tail
  path /var/log/app/*.log
  pos_file /var/log/fluentd/app.pos
  tag app.*
  format json
</source>

<source>
  @type forward
  port 24224
</source>

<filter app.**>
  @type record_transformer
  <record>
    hostname ${hostname}
    service.name app
  </record>
</filter>

<filter app.**>
  @type grep
  <exclude>
    key $.password
    pattern .+
  </exclude>
</filter>

<match app.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix app-logs
  <buffer>
    @type file
    path /var/log/fluentd/buffer
    flush_interval 5s
  </buffer>
</match>
```

## Storage Backend Comparison

| Backend | Query Language | Retention | Scaling | Cost | Best For |
|---------|---------------|-----------|---------|------|----------|
| Elasticsearch | Query DSL, EQL | Configurable per index | Horizontal sharding | Medium (compute + storage) | Full-text search, complex queries |
| Loki | LogQL | Configurable | Horizontal (object storage) | Low (index-free) | Kubernetes-native, cost-effective |
| CloudWatch | CloudWatch Insights | Configurable | Automatic | Pay-per-ingest | AWS-native, minimal ops |
| Datadog | Log Pipelines | Configurable | Automatic | Per-GB ingested | SaaS, built-in correlation |
| S3 + Athena | SQL (Presto) | Unlimited | Serverless | Low (storage + query) | Archive, compliance, cost-sensitive |

## Elasticsearch Index Management

```json
{
  "index_lifecycle": {
    "policy_id": "logs-policy",
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": { "max_size": "50GB", "max_age": "1d" },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "readonly": {},
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "readonly": {},
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Log Query Patterns

### LogQL (Loki)

```logql
# Error rate by service
sum by (service_name) (
  rate({log_level="error"}[5m])
)

# P99 latency from logs
quantile over_time(0.99,
  {service_name="order-service"} | json | unwrap event_duration [5m]
)

# Trace all logs for a specific transaction
{trace_id="abc123"} |= ""

# Count of errors by error code
sum by (error_code) (
  count_over_time({log_level="error", service_name="payment"}[1h])
)
```

### Elasticsearch Query DSL

```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "log.level": "ERROR" } },
        { "term": { "service.name": "order-service" } },
        { "range": { "@timestamp": { "gte": "now-15m" } } }
      ]
    }
  },
  "aggs": {
    "error_by_message": {
      "terms": { "field": "message.keyword", "size": 10 }
    },
    "error_over_time": {
      "date_histogram": { "field": "@timestamp", "interval": "1m" }
    }
  }
}
```

## Log Retention and Archival

```yaml
retention_policy:
  hot:
    duration: 7 days
    storage: Elasticsearch (SSD)
    queryable: Instant
  warm:
    duration: 30 days
    storage: Elasticsearch (HDD)
    queryable: Seconds
  cold:
    duration: 90 days
    storage: Frozen Elasticsearch
    queryable: Minutes
  archive:
    duration: 7 years
    storage: S3 Glacier (compressed JSON)
    queryable: Hours (restore required)
```

## Monitoring the Log Pipeline

```yaml
pipeline_monitoring:
  metrics:
    - "log_shipper_events_in_total"
    - "log_shipper_events_out_total"
    - "log_shipper_errors_total"
    - "log_shipper_buffer_size"
    - "log_indexing_rate"
    - "log_indexing_errors"

  alerts:
    - condition: "log_shipper_errors > 0"
      severity: warning
      action: "Check log shipper health, restart if needed"
    - condition: "log_indexing_lag > 60s"
      severity: warning
      action: "Indexer falling behind, increase resources"
    - condition: "log_dropped_events > 100"
      severity: critical
      action: "Logs being dropped, investigate pipeline saturation"
```
