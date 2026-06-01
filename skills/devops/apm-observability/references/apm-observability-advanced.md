# APM and Observability Advanced Topics

## Introduction
Advanced observability covers distributed tracing at scale, custom instrumentation, SLO-based alerting, continuous profiling, and correlating telemetry across millions of spans.

## Distributed Tracing at Scale
Sampling strategies: head-based (consistent), tail-based (latency-focused), probabilistic (percentage-based). Use tail-based sampling for high-traffic production systems. Implement trace context propagation across messaging systems (Kafka, SQS) and async boundaries. Use OTel Collector load balancing exporters for multi-instance deployments.

## Custom Instrumentation
Create custom spans for business transactions, database queries, and external API calls. Add span attributes for correlation IDs, user IDs, and business context. Use span events for logging within traces. Create metrics from trace data using span metrics connector. Implement custom metrics using OTel metric SDK.

## SLO-Based Alerting
Define SLOs (Service Level Objectives) as target reliability (99.9%, 99.99%). Calculate error budgets from SLO targets. Alert on error budget consumption rate, not threshold breaches. Use multi-window, multi-burn-rate alerts for faster detection with fewer false positives. Implement SLO monitoring with Prometheus, Grafana, or dedicated tools.

## Continuous Profiling
Use continuous profiling (Pyroscope, Google Cloud Profiler, Datadog Continuous Profiler) to identify CPU, memory, and I/O bottlenecks. On-demand profiling for targeted debugging. Flame graphs for visualizing call stack hot spots. Correlate profiles with traces and metrics.

## Log Management at Scale
Structured JSON logging with consistent field naming. Log aggregation with Loki, Elasticsearch, or SigNoz. Log-based metrics for alerting. Log retention tiers: hot (7 days), warm (30 days), cold (1 year). Log sampling for high-volume services.

## References
- apm-observability-fundamentals.md -- Fundamentals
- opentelemetry-setup.md -- OpenTelemetry Setup
- prometheus-grafana.md -- Prometheus and Grafana
- distributed-tracing.md -- Distributed Tracing
- logging-patterns.md -- Logging Patterns
