# Log Aggregation

Centralized log aggregation enables search, correlation, and analysis across distributed services.

## Log Shipping

### Fluent Bit (Recommended)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        flush           1
        log_level       info
        parsers_file    parsers.conf

    [INPUT]
        name            tail
        path            /var/log/containers/*.log
        multiline.parser docker, cri
        tag             kube.*
        mem_buf_limit    50MB

    [FILTER]
        name            kubernetes
        match           kube.*
        merge_log       on
        keep_log        false
        k8s-logging.parser on
        k8s-logging.exclude on

    [OUTPUT]
        name            loki
        match           *
        host            loki.logging
        port            3100
        labels          job=fluentbit,namespace=$kubernetes['namespace_name']
        auto_kubernetes_labels on
```

### Fluentd

```yaml
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
      read_from_head true
      <parse>
        @type json
        time_key time
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter kubernetes.**>
      @type kubernetes_metadata
    </filter>

    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.logging
      port 9200
      logstash_format true
      logstash_prefix k8s
      <buffer>
        flush_interval 5s
      </buffer>
    </match>
```

### Vector

```toml
[sources.kubernetes_logs]
type = "kubernetes_logs"
auto_partial_merge = true

[transforms.parse_json]
type = "remap"
inputs = ["kubernetes_logs"]
source = '''
  . = parse_json!(string!(.message))
  .timestamp = now()
  .service = .kubernetes.pod_name
'''

[sinks.elasticsearch]
type = "elasticsearch"
inputs = ["parse_json"]
endpoint = "http://elasticsearch:9200"
index = "logs-%Y-%m-%d"
```

## Loki

### Simple Scalable Deployment

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
data:
  config.yaml: |
    auth_enabled: false

    server:
      http_listen_port: 3100

    common:
      ring:
        instance_addr: 127.0.0.1
        kvstore:
          store: inmemory
      replication_factor: 1
      path_prefix: /loki

    schema_config:
      configs:
        - from: 2024-01-01
          store: tsdb
          object_store: filesystem
          schema: v13
          index:
            prefix: index_
            period: 24h

    storage_config:
      filesystem:
        directory: /loki/chunks

    compactor:
      working_directory: /loki/compactor
```

### LogQL Query Patterns

```logql
# Error rate per service
sum by (service) (
  rate({job="myapp"} |= "error" [5m])
)

# Trace a specific request
{job="myapp"} |= "traceId=abc123"

# Find slow requests
{job="myapp"} | json | duration_ms > 1000

# Error by namespace
count by (namespace) (
  {namespace=~"prod.*"} |= "exception"
)

# Log volume by level
sum by (level) (
  count_over_time({job="myapp"}[1h])
)
```

## Elasticsearch

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: elasticsearch
          image: elasticsearch:8.12
          env:
            - name: ES_JAVA_OPTS
              value: "-Xms2g -Xmx2g"
            - name: discovery.type
              value: zen
          volumeMounts:
            - mountPath: /usr/share/elasticsearch/data
              name: data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        storageClassName: standard
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 200Gi
```

### Index Lifecycle Policy

```json
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "readonly": {},
          "shrink": {
            "number_of_shards": 1
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## CloudWatch Logs

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-logging
data:
  output.conf: |
    [OUTPUT]
        Name cloudwatch_logs
        Match *
        log_group_name /aws/containerinsights/cluster-name/application
        log_stream_prefix myapp-
        auto_create_group true
        region us-east-1
        log_retention_days 90
```

## Retention Strategies

| Platform | Hot Storage | Warm Storage | Cold Storage | Deletion |
|----------|-------------|--------------|--------------|----------|
| Loki | 7 days (object store) | 30 days | 1 year (S3/GCS) | 1 year+ |
| Elasticsearch | 3 days (hot nodes) | 14 days (warm) | 30 days (frozen) | 30 days |
| CloudWatch | 1 day | 15 days | Custom | Custom |

## Structured Log Format

```json
{
  "level": "error",
  "message": "Payment processing failed",
  "service": "order-service",
  "version": "2.3.1",
  "environment": "production",
  "traceId": "abc123def456",
  "spanId": "span789",
  "userId": "user-456",
  "orderId": "order-789",
  "error": {
    "type": "PaymentTimeoutError",
    "message": "Gateway timeout after 30s",
    "stack": "at PaymentService.process..."
  },
  "duration_ms": 30042,
  "timestamp": "2026-05-24T10:30:00.123Z",
  "host": "pod-xyz-123",
  "region": "us-east-1"
}
```

Choose your log aggregation platform based on scale, query patterns, retention requirements, and operational complexity.
