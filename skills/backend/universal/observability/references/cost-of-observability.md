# Cost of Observability Reference

## Data Retention Tiering

Not all observability data needs long retention. Tier storage by value.

### Retention Tiers

```yaml
retention_tiers:
  hot:
    duration: "7 days"
    storage: "SSD / high-performance"
    data: "All traces, full-resolution metrics, raw logs"
    cost_factor: "10x cold storage"
    purpose: "Active debugging, incident response"

  warm:
    duration: "30 days"
    storage: "Standard HDD"
    data: "Sampled traces, 1-minute resolution metrics, error logs only"
    cost_factor: "3x cold storage"
    purpose: "Recent trend analysis, post-incident review"

  cold:
    duration: "12 months"
    storage: "Object storage (S3, GCS)"
    data: "Aggregated metrics (1h resolution), error summary logs"
    cost_factor: "1x (baseline)"
    purpose: "Compliance, long-term trend, capacity planning"

  archive:
    duration: "7 years (or compliance requirement)"
    storage: "Glacier / Archive tier"
    data: "Monthly aggregates, compliance reports"
    cost_factor: "0.2x cold storage"
    purpose: "Audit, regulatory compliance"
```

## Metric Cardinality

Cardinality is the biggest cost driver in metrics systems.

### Cardinality Cost Impact

| Cardinality | Example | Storage Cost | Query Speed |
|-------------|---------|--------------|-------------|
| Low (<100) | `http.status_code` (50 values) | 1x | Fast |
| Medium (100-10K) | `customer.tier` x `region` (20 values) | 3x | Moderate |
| High (10K-1M) | `user_id` in labels | 100x | Slow |
| Exploding (>1M) | `request_id`, `session_token` | Unusable | Will break the system |

### Cardinality Budgeting

```yaml
cardinality_budget:
  per_metric: 100          # Max unique label combinations per metric
  per_service: 10_000      # Total cardinality per service
  per_cluster: 1_000_000   # Total cardinality across all services

  enforcement:
    - metric_level: "label validation in SDK (reject high-cardinality labels)"
    - service_level: "quota per service, alert at 80%"
    - cluster_level: "aggregation before storage"
```

### Strategies to Reduce Cardinality
```javascript
// BAD: high cardinality (request-scoped values)
counter.add(1, { user_id: userId });         // Millions of values

// GOOD: bucketed values
counter.add(1, { user_tier: user.tier });    // 3-5 values
counter.add(1, { amount_bucket: bucket(amount) }); // 5-10 buckets

// Bucketing function
function bucket(amount: number): string {
  if (amount < 10) return '0-10';
  if (amount < 50) return '10-50';
  if (amount < 100) return '50-100';
  return '100+';
}
```

## Trace Sampling Cost

### Sampling Cost Comparison

| Strategy | Storage Savings | Trace Completeness | Best For |
|----------|----------------|-------------------|----------|
| Head-based (1/1000) | 99.9% reduction | 0.1% complete | High-volume APIs |
| Head-based (1/100) | 99% reduction | 1% complete | Standard services |
| Tail-based (errors + 1/1000) | 99% reduction | 100% errors | Critical services |
| Dynamic sampling | Adaptive | Variable | Variable traffic |

### Cost Calculation Example
```yaml
trace_cost_model:
  daily_traces: 10_000_000  # 10M requests/day
  avg_trace_size: 1.5KB     # With 15 spans per trace
  
  unsampled:
    daily_ingestion: 15GB   # 10M * 1.5KB
    monthly_storage: 450GB  # 30 days retention
    estimated_cost: "$4,500/mo"  # At $10/GB for managed observability
  
  head_sampled_0.1%:
    daily_ingestion: 15MB   # 15GB * 0.001
    monthly_storage: 450MB
    estimated_cost: "$45/mo"
  
  tail_sampled_errors_only:
    error_rate: 1%
    daily_ingestion: 150MB  # 1% errors (full) + 0.1% of rest
    monthly_storage: 4.5GB
    estimated_cost: "$180/mo"
  
  best_practice_hybrid:
    strategy: "100% errors + 1% sampling of non-errors + 10% slow traces"
    daily_ingestion: ~200MB
    monthly_storage: ~6GB
    estimated_cost: "$240/mo"
```

## Log Volume Optimization

### Log Level Strategy
```yaml
log_volume:
  debug: "0.001% of requests (feature-flag enabled only)"
  info: "100% of requests (with structured context)"
  warn: "100% (condition-based alerts)"
  error: "100% (with full stack traces)"

  daily_volume_control:
    debug: "Filtered at source — never sent to collection unless debugging"
    info: "Remove redundant logs (every health check = noise)"
    warn: "Group duplicate warnings in 1-minute windows"
    error: "Deduplicate by error signature"
```

### Log Reduction Techniques

```javascript
// BAD: verbose logging (every request)
logger.info('Request processed', { requestId, path, duration, userId, status });

// GOOD: sampled logging
if (Math.random() < 0.01 || status >= 400) {
  logger.info('Request processed', { requestId, path, duration, userId, status });
}

// BAD: repeated error logging in loops
for (const item of items) {
  try { process(item); }
  catch (e) { logger.error('Failed to process item', { itemId: item.id, error: e.message }); }
}

// GOOD: aggregated error reporting
const errors: string[] = [];
for (const item of items) {
  try { process(item); }
  catch (e) { errors.push(e.message); }
}
if (errors.length > 0) {
  logger.error(`Failed to process ${errors.length}/${items.length} items`, { errors });
}
```

## Observability Budget

Define a cost budget for observability, just like CPU/memory budgets.

```yaml
observability_budget:
  monthly_cost_limit: "$2,000"
  allocation:
    traces: 40%    # $800
    metrics: 25%   # $500
    logs: 25%      # $500
    dashboards: 10% # $200
  
  per_service_limits:
    traces_per_second: 100
    custom_metrics: 20
    log_lines_per_second: 500
    span_attributes_per_span: 10
  
  optimization_triggers:
    - "if per-service cost > $200/mo, review sampling rate"
    - "if metric cardinality > 10K, apply bucketing"
    - "if log volume > 50GB/mo, review log levels"
    - "if trace volume > 100M spans/day, reduce head sampling"
```

### Cost Tracking Dashboard
```
Metrics to track:
- Observability cost as % of infrastructure spend
- Cost per service (traces + metrics + logs)
- Storage growth rate (month-over-month)
- Data retention compliance (actual vs budget)
- Sampling rate effectiveness (% of useful traces retained)
```
