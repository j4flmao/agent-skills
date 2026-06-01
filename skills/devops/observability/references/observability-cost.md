# Observability Cost Management

## Data Volume Control
Log filtering: drop debug logs in production, sample high-frequency logs. Log sampling: 10% of INFO, 100% of ERROR/WARN. Adaptive sampling: lower sampling rate during high traffic. Log structure: structured JSON for efficient querying. Drop noisy logs: health checks, keep-alives, polling endpoints.

## Metrics Cardinality
Cardinality explosion: high-cardinality labels (user_id, request_id, session_id). Limit label values: use bounded labels instead of unbounded. Aggregation metrics: use recording rules for high-cardinality queries. Label policy: enforce label naming conventions and restrictions. Prometheus tsdb: memory scales with series count, not sample count.

## Trace Sampling
Head-based sampling: decide at request start, simple but may miss rare events. Tail-based sampling: sample after full trace collected, captures rare errors. Probability sampling: 1% of all traces, statistically representative. Rate limiting: max traces per second per service. Error sampling: 100% error traces, 1% success traces.

## Storage Optimization
Retention tiers: hot (7d), warm (30d), cold (1y). Downsampling: reduce resolution for historical data. Compression: columnar storage for logs (parquet). Object storage: S3/GCS for long-term log archive. Data lifecycle: automated transition between tiers.

## Cost Allocation
Per-team costs: tag telemetry with team/service label. Per-environment: dev/staging vs production cost split. Showback: charge teams for observability usage. Budget alerts: notify when observability spend exceeds threshold. Cost dashboard: per-service observability cost breakdown.

## Vendor Selection
Self-hosted vs SaaS: self-hosted (lower cost, higher ops burden), SaaS (higher cost, lower ops). Open-source alternatives: Prometheus + Loki + Tempo vs Datadog/Grafana Cloud. Hybrid: self-hosted Prometheus, SaaS for long-term retention. Negotiation: commit to annual spend for volume discounts.

## References
- observability-fundamentals.md -- Fundamentals
- observability-maturity.md -- Maturity
- otel-guide.md -- OpenTelemetry
- log-aggregation.md -- Log Aggregation
- custom-metrics.md -- Custom Metrics
