# Observability Cost Control: Logs, Metrics and Traces

Telemetry is frequently one of the fastest-growing lines on a cloud bill, because it scales with traffic, services and verbosity at the same time. Most platforms bill on ingest volume (GB), retention, metric series (cardinality) and queries. This reference covers where telemetry cost comes from and how to reduce it without losing the signals needed for incident response.

## Cost Drivers

| Signal | Billed on | Typical blow-up cause |
|--------|-----------|-----------------------|
| Logs | GB ingested, GB-month retained, GB scanned by queries | Debug logging in prod, full payload logging, chatty health checks |
| Metrics | Active time series, samples, custom metrics count | High-cardinality labels (user ID, request ID, full URL path) |
| Traces | Spans ingested / indexed | 100% sampling at high RPS |
| Profiles, RUM, synthetic checks | Per session / check run | Frequency set too high |

Check each provider's pricing for exact units: for example CloudWatch Logs bills ingestion and storage separately, Azure Log Analytics has table plans (Analytics, Basic, Auxiliary) with different ingest and query prices, and Google Cloud Logging bills ingestion above a free allotment plus retention beyond the default.

## Measure First

```bash
# AWS: largest log groups by stored bytes
aws logs describe-log-groups \
  --query 'reverse(sort_by(logGroups,&storedBytes))[:20].[logGroupName,storedBytes,retentionInDays]' \
  --output table
```

```kusto
// Azure Log Analytics: billable ingest by table, last 30 days
Usage
| where TimeGenerated > ago(30d) and IsBillable == true
| summarize GB = sum(Quantity) / 1024 by DataType
| order by GB desc
```

```promql
# Prometheus: metrics with the most series
topk(20, count by (__name__) ({__name__=~".+"}))
```

Attribute telemetry volume to services (log group naming, `service.name` resource attribute) so teams see their share.

## Logs

### Reduce at the source

- Default production log level `INFO`; enable `DEBUG` dynamically per service for a limited time.
- Do not log full request/response bodies; log IDs, sizes and status.
- Drop or sample access logs for health checks and static assets.
- Use structured logs (JSON) so fields can be filtered and dropped in the pipeline instead of parsed with regex.

### Filter in the pipeline

```yaml
# OpenTelemetry Collector: drop debug logs and health-check spans before export
processors:
  filter/drop-noise:
    error_mode: ignore
    logs:
      log_record:
        - 'severity_number < SEVERITY_NUMBER_INFO'
        - 'attributes["http.route"] == "/healthz"'
    traces:
      span:
        - 'attributes["http.route"] == "/healthz"'
  batch: {}
service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [filter/drop-noise, batch]
      exporters: [otlphttp]
```

Fluent Bit (`grep` filter) and Vector (`filter` transform) do the same for agent-based pipelines.

### Tier retention

| Data | Hot retention | Archive |
|------|---------------|---------|
| Application logs | 7 to 30 days searchable | Object storage (S3/GCS/Blob) in compressed form, queried with Athena/BigQuery when needed |
| Audit / security logs | As required by policy | Immutable archive for the compliance period |
| Debug traces | Days | None |

```bash
aws logs put-retention-policy --log-group-name /app/api --retention-in-days 14
```

Set retention on every log group; the CloudWatch default is "never expire". Azure: move verbose tables to Basic or Auxiliary plans when they are rarely queried.

## Metrics

Cardinality is the cost driver: each unique label combination is a series.

```text
series = product of distinct values of each label
http_requests_total{service, route, method, status}  -> 20 x 50 x 4 x 6 = 24,000
adding user_id with 100,000 values                    -> 2.4 billion (do not do this)
```

Rules:
- Never use unbounded values as labels (user ID, email, request ID, raw URL, timestamps). Put them in logs or trace attributes.
- Use route templates (`/orders/{id}`), not raw paths.
- Drop unused metrics at scrape time.

```yaml
# Prometheus scrape config: drop an unused, high-cardinality metric family
metric_relabel_configs:
  - source_labels: [__name__]
    regex: "apiserver_request_duration_seconds_bucket"
    action: drop
```

- Use recording rules or aggregation (Prometheus/Mimir, Grafana Adaptive Metrics) to keep aggregated series and drop raw ones.
- In CloudWatch, prefer Embedded Metric Format in logs only for metrics you query; each unique dimension combination is a custom metric.

## Traces

Sample, but keep what matters:

| Strategy | Where | Keeps |
|----------|-------|-------|
| Head sampling (`parentbased_traceidratio`) | SDK | A fixed percentage; cheap, blind to errors |
| Tail sampling | Collector | Errors, slow traces, and a percentage of the rest |

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: slow
        type: latency
        latency: {threshold_ms: 1000}
      - name: baseline
        type: probabilistic
        probabilistic: {sampling_percentage: 5}
```

Tail sampling requires all spans of a trace to reach the same collector instance (use the `loadbalancing` exporter keyed on trace ID in front of a sampling tier).

## Vendor Contracts and Architecture

- Route telemetry through an OpenTelemetry Collector so you can filter, sample, and switch or split backends without re-instrumenting.
- Send high-volume, low-value data to cheap storage (object storage, self-hosted Loki/Mimir/Tempo) and only curated data to premium SaaS.
- Watch per-host or per-container pricing models in SaaS tools: autoscaling and short-lived containers can multiply billable hosts.

## Guardrails

- Budget alert on the observability service lines specifically.
- Daily ingest caps or quotas where supported (Log Analytics daily cap) for non-production; avoid caps in production where they would drop incident data.
- Alert on sudden ingest growth per service (a new debug flag in a hot path is a common cause).

## Checklist

- [ ] Ingest volume and series counts attributed per service
- [ ] Retention set on every log store; archive tier for long retention
- [ ] Health checks and debug logs filtered in the pipeline
- [ ] No unbounded metric labels; unused metrics dropped
- [ ] Tail sampling keeps errors and slow traces
- [ ] Telemetry routed through a collector for vendor flexibility
- [ ] Observability spend has its own budget and anomaly alert
