# OpenTelemetry Collector Pipeline

## Overview

The OpenTelemetry Collector is a vendor-agnostic agent for receiving, processing, and exporting telemetry data. Its pipeline architecture consists of receivers, processors, and exporters connected in a configurable chain.

## Pipeline Architecture

```
                      ┌──────────────────────┐
                      │     Receivers        │
                      │                      │
                      │  OTLP │ Jaeger │     │
                      │  Prometheus │ Zipkin │
                      └──────────┬───────────┘
                                 │
                      ┌──────────▼───────────┐
                      │     Processors       │
                      │                      │
                      │  batch │ memory_lim  │
                      │  attributes │ filter │
                      │  tail_sampling │     │
                      │  transform │ k8s_    │
                      └──────────┬───────────┘
                                 │
                      ┌──────────▼───────────┐
                      │     Exporters        │
                      │                      │
                      │  OTLP │ Prometheus   │
                      │  Datadog │ logging   │
                      └──────────────────────┘
```

## Installation

### Docker
```bash
docker run -v $(pwd)/config.yaml:/etc/otelcol/config.yaml otel/opentelemetry-collector-contrib:0.100.0
```

### Kubernetes
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
    processors:
      batch:
        timeout: 1s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 1s
        limit_mib: 512
    exporters:
      otlp:
        endpoint: tempo:4317
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.100.0
        args: ["--config=/etc/otelcol/config.yaml"]
        env:
        - name: MY_API_KEY
          valueFrom:
            secretKeyRef:
              name: otel-secrets
              key: api-key
        ports:
        - containerPort: 4317
        - containerPort: 4318
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        volumeMounts:
        - name: config
          mountPath: /etc/otelcol
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

## Receivers

### OTLP Receiver
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 4
        max_concurrent_streams: 100
        tls:
          cert_file: /certs/server.crt
          key_file: /certs/server.key
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
          - http://localhost:3000
          - https://app.example.com
          allowed_headers:
          - content-type
          - traceparent
```

### Jaeger Receiver
```yaml
receivers:
  jaeger:
    protocols:
      grpc:
        endpoint: 0.0.0.0:14250
      thrift_binary:
        endpoint: 0.0.0.0:6832
      thrift_compact:
        endpoint: 0.0.0.0:6831
      thrift_http:
        endpoint: 0.0.0.0:14268
```

### Prometheus Receiver
```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
      - job_name: 'otel-collector'
        scrape_interval: 15s
        static_configs:
        - targets: ['0.0.0.0:8888']
```

### File Log Receiver
```yaml
receivers:
  filelog:
    include:
    - /var/log/app/*.log
    include_file_name: false
    operators:
    - type: json_parser
      parse_to: body
```

### Kafka Receiver
```yaml
receivers:
  kafka:
    brokers:
    - kafka-broker:9092
    topic: otlp-spans
    encoding: otlp_proto
    protocol_version: 2.0.0
```

### Host Metrics Receiver
```yaml
receivers:
  hostmetrics:
    collection_interval: 10s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      network: {}
      load: {}
```

## Processors

### Batch Processor
```yaml
processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
    send_batch_max_size: 2048
```

### Memory Limiter
```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128
    # When memory > 512MB, start dropping data
```

### Attributes Processor
```yaml
processors:
  attributes:
    actions:
    - key: environment
      value: production
      action: upsert
    - key: data_center
      value: us-east-1
      action: upsert
    - key: service.version
      from_attribute: deployment.version
      action: upsert
    - key: db.statement
      action: delete  # Remove SQL for security
```

### Filter Processor
```yaml
processors:
  filter:
    error_mode: ignore
    traces:
      span:
      - attributes["http.method"] == "OPTIONS"
      - attributes["http.path"] == "/health"
      # Drop health check and OPTIONS spans
    metrics:
      metric:
      - name == "http.server.duration"
        has_attr_on_data_point("http.route", "/health")
```

### Transform Processor
```yaml
processors:
  transform:
    trace_statements:
    - context: span
      statements:
      - set(attributes["service.name"], attributes["service.name"] + "-v2")
      - delete_matching(attributes, "internal.*")
      - set(status.code, STATUS_CODE_ERROR) where attributes["http.status_code"] >= 500
```

### Resource Detection Processor
```yaml
processors:
  resourcedetection:
    detectors:
    - env
    - system
    - ec2
    - gcp
    - kubernetes
    timeout: 2s
    override: false
```

### Kubernetes Processor
```yaml
processors:
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
      - k8s.pod.name
      - k8s.namespace.name
      - k8s.deployment.name
      - k8s.node.name
      annotations:
      - tag_name: app.version
        key: app.kubernetes.io/version
        from: pod
    pod_association:
    - sources:
      - from: resource_attribute
        name: k8s.pod.ip
```

### Probabilistic Sampler
```yaml
processors:
  probabilistic_sampler:
    hash_seed: 42
    sampling_percentage: 10.0
```

### Tail Sampling
```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 10000
    expected_new_traces_per_sec: 100
    policies:
    - name: error-policy
      type: status_code
      status_code:
        status_codes:
        - ERROR
        - UNSET
    - name: slow-policy
      type: latency
      latency:
        threshold_ms: 1000
    - name: priority-policy
      type: and
      and_sub_policy:
      - name: error
        type: status_code
        status_code:
          status_codes:
          - ERROR
      - name: slow
        type: latency
        latency:
          threshold_ms: 500
```

## Exporters

### OTLP Exporter
```yaml
exporters:
  otlp:
    endpoint: tempo.example.com:443
    tls:
      insecure: false
      cert_file: /certs/client.crt
      key_file: /certs/client.key
    headers:
      x-api-key: ${API_KEY}
    compression: gzip
    timeout: 10s
    sending_queue:
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
```

### Logging Exporter
```yaml
exporters:
  logging:
    verbosity: detailed  # normal, detailed
    sampling_initial: 5
    sampling_thereafter: 100
```

### Prometheus Exporter
```yaml
exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    namespace: otel
    resource_to_telemetry_conversion:
      enabled: true
    enable_open_metrics: true
```

## Pipelines

```yaml
service:
  pipelines:
    # Traces pipeline
    traces:
      receivers: [otlp, jaeger]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp, logging]

    # Metrics pipeline
    metrics:
      receivers: [otlp, prometheus, hostmetrics]
      processors: [memory_limiter, batch]
      exporters: [prometheus, otlp]

    # Logs pipeline
    logs:
      receivers: [otlp, filelog]
      processors: [memory_limiter, attributes, batch]
      exporters: [otlp, logging]
```

## Extensions

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  pprof:
    endpoint: 0.0.0.0:1777
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [health_check, pprof, zpages]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Best Practices

1. **Always use batch processor** — never export individual spans/metrics/logs.
2. **Configure memory limiter** before batch processor to prevent OOM.
3. **Use resource detection** for automatic Kubernetes/AWS/GCP metadata enrichment.
4. **Set `send_batch_max_size`** to prevent oversized batches causing export failures.
5. **Use multiple pipelines** to separate concerns (traces vs metrics vs logs).
6. **Enable health check extension** for Kubernetes liveness/readiness probes.
7. **Configure retry and queuing** on exporters for resilience.
8. **Use logging exporter in debug mode** only during development.
9. **Apply attributes processor** to enrich data before export.
10. **Monitor collector metrics** (exporter errors, queue sizes, dropped spans).
