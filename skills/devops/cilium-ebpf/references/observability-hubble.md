# Hubble Observability

## Overview

Hubble is the observability layer for Cilium, providing real-time visibility into network traffic, service dependencies, and security policies. It captures flow data at the eBPF level with minimal overhead.

## Architecture

```
                    ┌─────────────────────┐
                    │ Hubble CLI/UI       │
                    └──────────┬──────────┘
                               │ gRPC
                    ┌──────────▼──────────┐
                    │   Hubble Relay      │
                    │                     │
                    │ - Aggregates flows  │
                    │ from all nodes      │
                    │ - Server selection  │
                    │ - Flow filtering    │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
   ┌──────▼──────┐    ┌───────▼───────┐    ┌────────▼──────┐
   │ Node 1      │    │ Node 2        │    │ Node 3        │
   │ Hubble CLI  │    │ Hubble CLI    │    │ Hubble CLI    │
   │ gRPC server │    │ gRPC server   │    │ gRPC server   │
   │             │    │               │    │               │
   │ eBPF flows  │    │ eBPF flows    │    │ eBPF flows    │
   └─────────────┘    └───────────────┘    └───────────────┘
```

## Installation

### Enable with Helm
```yaml
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
  metrics:
    enabled:
    - dns
    - drop
    - tcp
    - flow
    - port-distribution
    - icmp
    - http
```

### Port Forward UI
```bash
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
# Open http://localhost:12000
```

## Hubble CLI

### Flow Observation

```bash
# Observe all flows
hubble observe

# Observe flows for a specific pod
hubble observe --pod my-pod

# Observe flows in a namespace
hubble observe --namespace production

# Observe only dropped packets
hubble observe --verdict DROPPED

# Observe HTTP flows
hubble observe --protocol http

# Observe DNS flows
hubble observe --protocol dns

# Observe flows with latency > 100ms
hubble observe --since 1h --max-latency 100ms

# Follow flows in real time
hubble observe --follow
```

### Advanced Filtering

```bash
# Filter by labels
hubble observe --label "app=api-server"

# Filter by IP
hubble observe --not --ip 10.0.1.0/24

# Filter by port
hubble observe --port 443

# Filter by HTTP method
hubble observe --http-method POST

# Filter by HTTP path
hubble observe --http-path /api/orders

# Filter by verdict and service
hubble observe --verdict DROPPED --service api-server
```

### JSON Output
```bash
hubble observe --output json
hubble observe --output jsonpb
```

## Hubble UI

### Service Map
The Hubble UI provides a service dependency graph showing:
- Which services communicate with each other
- Protocol and port used
- Flow rates and latency
- Dropped packet locations
- Policy enforcement points

### Flow Table
Detailed view of individual flows with columns:
```
TIMESTAMP       SOURCE              DESTINATION         TYPE    VERDICT   LATENCY
12:34:56.789    pod/frontend-abc    pod/api-xyz:8080    HTTP    FORWARDED 12ms
12:34:57.001    pod/api-xyz         pod/db-def:5432     TCP     FORWARDED 3ms
12:34:57.100    pod/api-xyz         pod/frontend-abc    HTTP    DROPPED   -
```

## Hubble Metrics

### Prometheus Metrics
```yaml
# Hubble metrics exposed via Cilium agent
cilium_hubble_flows_processed_total
cilium_hubble_drop_total
cilium_hubble_tcp_flags_total
cilium_hubble_http_requests_total
cilium_hubble_dns_queries_total
```

### Metric Configuration
```yaml
hubble:
  metrics:
    enabled:
    - dns:sourceContext=app|namespace;destinationContext=app|namespace
    - drop:sourceContext=app|namespace;destinationContext=app|namespace
    - tcp:sourceContext=app|namespace;destinationContext=app|namespace
    - flow:sourceContext=app|namespace;destinationContext=app|namespace
    - port-distribution:sourceContext=app|namespace;destinationContext=app|namespace
    - http:sourceContext=app|namespace;destinationContext=app|namespace
```

### Grafana Dashboard
```json
{
  "panels": [
    {
      "title": "Total Flows by Verdict",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(cilium_hubble_flows_processed_total[5m])) by (verdict)"
      }]
    },
    {
      "title": "Dropped Packet Rate",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(cilium_hubble_drop_total[5m])) by (reason)"
      }]
    },
    {
      "title": "HTTP Request Rate by Service",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(cilium_hubble_http_requests_total[5m])) by (source, destination)"
      }]
    }
  ]
}
```

## Service Map

### Generating Service Map
```bash
# Get service dependency graph
hubble observe --servicemap

# Output in JSON for programmatic use
hubble observe --servicemap --output json
```

### Service Map Metrics
```
# Service dependencies
cilium_hubble_service_map_edges_total

# Top communicating services
cilium_hubble_service_map_bytes_total

# Service health
cilium_hubble_service_map_tcp_handshake_failures
```

## OpenTelemetry Integration

### Export Hubble Flows to OTel
```yaml
# Cilium agent with OTel exporter
hubble:
  export:
    # File export for debugging
    file: "/var/log/hubble.log"
    fileMaxSizeMB: 10
    fileMaxBackups: 3

    # OpenTelemetry export
    dynamic:
      enabled: true
      config:
        type: otlp
        addresses:
        - otel-collector:4317
```

## Flow Monitoring Configuration

### Flow Aggregation
```yaml
# Cilium agent configuration
monitor-aggregation: medium         # none, low, medium, max
monitor-aggregation-interval: 5s
monitor-aggregation-flags: all
```

### Flow Export
```yaml
# Export flows to external system
hubble:
  export:
    dynamic:
      enabled: true
      config:
        type: kafka
        addresses:
        - kafka-cluster:9092
        topic: hubble-flows
        tls:
          enabled: true
```

## Troubleshooting

```bash
# Check Hubble status
hubble status

# Check Hubble relay
kubectl logs -n kube-system -l k8s-app=hubble-relay

# Verify flow collection
hubble observe --since 1m --limit 5

# Reset Hubble metrics
cilium-dbg metrics clear

# Debug flow drops
hubble observe --verdict DROPPED --since 1h
```

## Best Practices

1. **Enable Hubble from day one** — you can't debug what you didn't capture.
2. **Set appropriate aggregation** — `medium` for production, `none` for debugging.
3. **Export metrics to Prometheus** for long-term flow analysis and alerting.
4. **Use the service map** to discover undocumented dependencies.
5. **Monitor dropped packets** to identify overly restrictive policies.
6. **Set up Hubble alerts** — dropped packets > threshold should trigger review.
7. **Use JSON output** for programmatic flow analysis.
8. **Enable HTTP metrics** for API-level observability.
9. **Integrate with OpenTelemetry** for end-to-end trace correlation.
10. **Limit flow retention** — set `hubble.export.fileMaxSizeMB` to manage disk.
