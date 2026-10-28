# Monitoring Fundamentals

Core concepts for monitoring production systems: the signal types, what to measure (golden signals, RED, USE), SLIs and SLOs, metric types and cardinality, collection models, and alerting principles. Tool-specific setup (Prometheus, Grafana, Loki, ELK, alerting/on-call) is in sibling references.

## Monitoring vs. Observability
- **Monitoring**: collecting predefined signals and alerting when known conditions occur ("is the error rate above 1%?").
- **Observability**: the ability to ask new questions about system behavior from its telemetry (high-cardinality events, traces) without shipping new code.
Both are needed: monitoring detects, observability explains.

## Telemetry Signals

| Signal | What it is | Strength | Cost driver |
|---|---|---|---|
| Metrics | Numeric time series with labels | Cheap aggregation, alerting, long retention | Number of unique series (cardinality) |
| Logs | Timestamped records (prefer structured JSON) | Detail and context | Volume (bytes ingested/retained) |
| Traces | Spans across services for one request | Latency breakdown, dependencies | Span volume; use sampling |
| Profiles | Continuous CPU/memory profiling | Code-level hotspots | Sampling rate |
| Events | Deploys, config changes, incidents | Correlate changes with symptoms | Low |

OpenTelemetry is the vendor-neutral standard for generating and exporting metrics, logs and traces.

## What to Measure

### Four golden signals (user-facing services)
| Signal | Example metric |
|---|---|
| Latency | p50/p95/p99 request duration, separately for success and errors |
| Traffic | Requests per second |
| Errors | Rate of failed requests (5xx, failed business outcomes) |
| Saturation | How full the service is: CPU, memory, queue depth, connection pool usage |

### RED (request-driven services)
Rate, Errors, Duration per endpoint.

### USE (resources: CPU, disks, network, pools)
Utilization, Saturation, Errors per resource.

### Business and pipeline signals
Orders per minute, sign-ups, payment success rate; for batch jobs: last success time, duration, records processed; for queues: lag and age of oldest message.

## SLIs, SLOs and Error Budgets

| Term | Definition | Example |
|---|---|---|
| SLI | Measured ratio of good events to valid events | Successful requests under 300 ms / all requests |
| SLO | Target for an SLI over a window | 99.9% over 30 days |
| Error budget | 1 - SLO | 0.1% of requests (about 43 minutes of full outage per 30 days) |
| SLA | Contractual commitment with penalties | Usually looser than the internal SLO |

```promql
# Availability SLI over 30 days
sum(rate(http_requests_total{job="checkout",code!~"5.."}[30d]))
/
sum(rate(http_requests_total{job="checkout"}[30d]))
```
Alert on error-budget burn rate rather than raw thresholds (see the advanced reference).

## Metric Types (Prometheus/OpenTelemetry)

| Type | Use | Query pattern |
|---|---|---|
| Counter | Monotonic totals: requests, errors, bytes | `rate(x_total[5m])` |
| Gauge | Current value: memory, queue depth, temperature | Raw value, `avg_over_time` |
| Histogram | Distributions: latency, sizes | `histogram_quantile(0.95, sum by (le) (rate(x_bucket[5m])))` |
| Summary | Client-side quantiles | Cannot be aggregated across instances; prefer histograms |

Native histograms (Prometheus) / exponential histograms (OpenTelemetry) give better resolution with fewer series.

### Naming and units
- Prometheus style: `http_server_request_duration_seconds`, base units (seconds, bytes), `_total` suffix for counters.
- OpenTelemetry semantic conventions define standard names (`http.server.request.duration`) and attributes.

## Labels and Cardinality
Each unique combination of label values is a separate time series.
- Good labels: `service`, `method`, `route` (templated `/users/{id}`), `status_code` class, `region`.
- Never use unbounded values as labels: user IDs, emails, full URLs, request IDs, timestamps. Put those in logs or trace attributes.
- Estimate series: product of distinct values per label for each metric.

## Collection Models

| Model | How | Examples |
|---|---|---|
| Pull (scrape) | Server scrapes `/metrics` endpoints | Prometheus, VictoriaMetrics agent |
| Push | Agents/SDKs send to a collector | OTLP to OpenTelemetry Collector, StatsD |
| Agent-based logs | Tail files/journal, ship | Grafana Alloy, Fluent Bit, Vector, Filebeat |
| Synthetic | Probes from outside | Blackbox exporter, uptime services |
| Real user monitoring | Browser/mobile SDKs | Web vitals (LCP, INP, CLS), crash/error rates |

Use both white-box (internal metrics) and black-box (external probes) monitoring: the latter catches DNS, TLS, CDN and network failures that internal metrics miss.

## Alerting Principles
- Page only on **symptoms users feel** (SLO burn, unavailable endpoints), not on every cause (CPU 90%).
- Every page must be actionable, urgent and linked to a runbook.
- Use tickets/notifications for slow-burning issues (disk at 80% in a week).
- Group and deduplicate alerts; route by ownership labels.
- Review alert noise regularly; delete alerts nobody acts on.

## Dashboards
- Top-level service dashboard: golden signals and SLO status, deploy annotations.
- Drill-down dashboards per dependency/resource.
- Consistent layout across services; template variables for environment and instance.

## Retention and Cost
| Data | Typical retention |
|---|---|
| High-resolution metrics | Days to weeks |
| Downsampled metrics | Months to years (long-term storage) |
| Logs | Days to weeks hot; archive to object storage for compliance |
| Traces | Days; sampled |

## Checklist
- [ ] Golden signals/RED for every service, USE for key resources
- [ ] SLIs and SLOs defined with owners
- [ ] Histograms for latency; counters for totals
- [ ] No unbounded label values
- [ ] Black-box probes for public endpoints
- [ ] Pages are symptom-based with runbooks
- [ ] Retention set per signal by value and cost
