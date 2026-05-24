# Multi-Backend OTLP Export

## Overview

OpenTelemetry supports exporting telemetry data to multiple backends simultaneously. This pattern enables redundancy (primary + backup), data segregation (dev vs prod backends), and cost optimization (sampled vs unsampled traces).

## Architecture

```
                    ┌─────────────────────┐
                    │   OTel Collector    │
                    │                     │
                    │  Traces Pipeline    │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ Tail Sampler  │  │
                    │  └───────┬───────┘  │
                    │          │           │
            ┌───────┼──────────┼───────────┼───────┐
            │       │          │           │       │
       ┌────▼────┐  │  ┌──────▼──────┐    │  ┌────▼────┐
       │ Jaeger  │  │  │  Grafana   │    │  │Datadog  │
       │ (Full)  │  │  │  Tempo     │    │  │(Sampled)│
       │         │  │  │  (Sampled) │    │  │         │
       │ Error   │  │  │  All errors│    │  │ Slow    │
       │ traces  │  │  │  + 10%     │    │  │ traces  │
       └─────────┘  │  └────────────┘    │  └─────────┘
                    │                     │
               ┌────▼─────────────────────▼───┐
               │  Prometheus / Mimir         │
               │  (Metrics from all pipelines)│
               └──────────────────────────────┘
```

## OTLP Exporter Configuration

### Basic OTLP Export
```yaml
exporters:
  otlp:
    endpoint: tempo.example.com:443
    tls:
      insecure: false
    headers:
      authorization: "Bearer ${TEMP_TOKEN}"
    compression: gzip
    timeout: 10s
```

### OTLP with TLS and Auth
```yaml
exporters:
  otlp:
    endpoint: api.example.com:4317
    tls:
      insecure: false
      ca_file: /certs/ca.crt
      cert_file: /certs/client.crt
      key_file: /certs/client.key
      server_name_override: collector.example.com
    headers:
      x-api-key: ${API_KEY}
      x-tenant: production
    compression: gzip
    timeout: 30s
    sending_queue:
      queue_size: 5000
      num_consumers: 10
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
```

## Multi-Backend Export Configuration

### Export to Multiple OTLP Backends
```yaml
exporters:
  otlp/primary:
    endpoint: tempo-prod.example.com:4317
    tls:
      insecure: false
    headers:
      authorization: "Bearer ${TEMP_TOKEN}"
  
  otlp/backup:
    endpoint: tempo-backup.example.com:4317
    tls:
      insecure: false
    headers:
      authorization: "Bearer ${BACKUP_TEMP_TOKEN}"
    sending_queue:
      queue_size: 10000  # Larger queue for backup

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/primary, otlp/backup]
```

### Export to Datadog via OTLP
```yaml
exporters:
  datadog:
    api:
      key: ${DD_API_KEY}
      site: datadoghq.com
    traces:
      endpoint: https://trace.agent.datadoghq.com
      # Or use OTLP:
      # endpoint: https://trace.agent.datadoghq.com/api/v0.2/traces
    metrics:
      endpoint: https://api.datadoghq.com
    host_metadata:
      enabled: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [datadog]
```

### Export to Prometheus
```yaml
exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    namespace: otel
    resource_to_telemetry_conversion:
      enabled: true
    enable_open_metrics: true
    add_metric_suffixes: false

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, otlp]
```

## Backend-Specific Configurations

### Jaeger Exporter
```yaml
exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      insecure: true
```

### Zipkin Exporter
```yaml
exporters:
  zipkin:
    endpoint: http://zipkin:9411/api/v2/spans
    format: json
```

### Kafka Exporter
```yaml
exporters:
  kafka:
    brokers:
    - kafka-broker-0:9092
    - kafka-broker-1:9092
    topic: otel-traces
    encoding: otlp_proto
    protocol_version: 2.0.0
    compression: gzip
    metadata:
      retry_max: 3
```

### AWS X-Ray Exporter
```yaml
exporters:
  awsxray:
    region: us-east-1
    resource_arn: arn:aws:ec2:us-east-1:123456789012:instance/i-xxx
```

### Google Cloud Exporter
```yaml
exporters:
  googlecloud:
    project: my-project
    destination_project: my-other-project
    retry_on_failure:
      enabled: true
```

### Azure Monitor Exporter
```yaml
exporters:
  azuremonitor:
    connection_string: "${APPINSIGHTS_CONNECTION_STRING}"
    max_batch_size: 100
```

## Route-Based Export

### Sampled vs. Unsampled Pipelines
```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 10000
    policies:
    - name: keep-errors
      type: status_code
      status_code:
        status_codes:
        - ERROR

exporters:
  # Cheap storage for all traces
  otlp/cheap-storage:
    endpoint: cheap-storage:4317
    sending_queue:
      queue_size: 50000

  # Full-featured APM for sampled + error traces
  otlp/full-apm:
    endpoint: production-apm:4317
    headers:
      authorization: "Bearer ${APM_TOKEN}"

service:
  pipelines:
    # Pipeline 1: All traces to cheap storage
    traces/all:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/cheap-storage]

    # Pipeline 2: Sampled traces to full APM
    traces/sampled:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/full-apm]
```

### Environment-Specific Export
```yaml
# Development: full visibility
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [logging, otlp/dev-jaeger]

# Production: sampled + errors only
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/prod-tempo, otlp/prod-datadog]
```

## Load Balancing and Failover

### Exporter Load Balancing
```yaml
exporters:
  otlp/load-balanced:
    endpoint: "dns:///collector-headless:4317"  # gRPC DNS load balancing
    balancing: round_robin
    tls:
      insecure: true
```

### Failover with Retry
```yaml
exporters:
  otlp/primary:
    endpoint: primary-collector:4317
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    
  otlp/secondary:
    endpoint: secondary-collector:4317
    retry_on_failure:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary, otlp/secondary]
```

## Compression and Performance

```yaml
exporters:
  otlp:
    endpoint: collector:4317
    compression: gzip  # gzip, zstd, none
    # gzip reduces bandwidth ~10x but increases CPU
    # zstd reduces bandwidth ~8x with less CPU than gzip
    
    # Queue configuration
    sending_queue:
      queue_size: 5000
      num_consumers: 10
    
    # Timeout
    timeout: 10s
```

## Securing Export

### TLS Configuration
```yaml
exporters:
  otlp:
    endpoint: secure-collector:4317
    tls:
      insecure: false
      ca_file: /etc/certs/ca.pem
      cert_file: /etc/certs/client.pem
      key_file: /etc/certs/client-key.pem
      server_name_override: collector.internal.example.com
      min_version: "1.2"  # TLS 1.2 minimum
```

### Headers-Based Auth
```yaml
exporters:
  otlp:
    endpoint: collector:4317
    headers:
      authorization: "Bearer ${TOKEN}"
      x-tenant-id: "production"
      x-service-name: "${SERVICE_NAME}"
```

### mTLS Authentication
```yaml
exporters:
  otlp:
    endpoint: mTLS-collector:4317
    tls:
      insecure: false
      cert_file: /certs/client.crt
      key_file: /certs/client.key
      ca_file: /certs/ca.crt
      # Server will verify client cert
```

## Monitoring Export

```yaml
# Collector internal metrics for export monitoring
exporters:
  prometheus:
    endpoint: 0.0.0.0:8888

service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

### Key Export Metrics
```
# Per-exporter metrics
otelcol_exporter_sent_spans_total{exporter="otlp/primary"}
otelcol_exporter_send_failed_spans_total{exporter="otlp/primary"}
otelcol_exporter_queue_size{exporter="otlp/primary"}
otelcol_exporter_enqueue_failed_spans_total{exporter="otlp/primary"}

# Endpoint health
otelcol_exporter_sent_duration{exporter="otlp/primary"}
```

## Best Practices

1. **Export to at least 2 backends** for resilience — primary + backup.
2. **Use different pipelines** for sampled vs. unsampled data to control costs.
3. **Enable compression** (`gzip` or `zstd`) for all remote exports.
4. **Configure `sending_queue`** with adequate size for traffic bursts.
5. **Set `retry_on_failure`** with exponential backoff for transient errors.
6. **Use TLS** for all production exports — never send unencrypted telemetry.
7. **Monitor exporter metrics** — set alerts on `enqueue_failed` and `send_failed`.
8. **Use DNS load balancing** for exporter endpoints in Kubernetes.
9. **Separate dev and prod backends** — never mix telemetry data.
10. **Test backend connectivity** during deployment — failed export = lost data.
