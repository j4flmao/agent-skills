# OpenTelemetry Trace Sampling

## Overview

Trace sampling controls which traces are collected and stored. Proper sampling is essential for managing cost, storage, and performance while maintaining visibility into system behavior.

## Sampling Strategies

| Strategy | Decision Point | Pros | Cons |
|----------|---------------|------|------|
| Head-based | At trace start | Simple, consistent | May miss rare errors |
| Tail-based | After trace complete | Keep important traces | Higher memory, complexity |
| Probability | Random | Even distribution | May sample boring traces |
| Rate-limited | Per time window | Predictable volume | Bias toward low-traffic periods |

## Head-Based Sampling

### Probabilistic Sampler
```yaml
# OTel Collector
processors:
  probabilistic_sampler:
    hash_seed: 42
    sampling_percentage: 10.0  # Keep 10% of traces
```

### Parent-Based Sampler
```yaml
# Default behavior: follow parent's sampling decision
processors:
  probabilistic_sampler:
    sampling_percentage: 100.0  # Sample locally, parent may override
```

### SDK Configuration
```javascript
// Node.js SDK
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-node');

const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1),  // 10% sampling
});
```

```python
# Python SDK
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

provider = TracerProvider(
    sampler=TraceIdRatioBased(0.1)  # 10% sampling
)
```

```bash
# Environment variable (all SDKs)
export OTEL_TRACES_SAMPLER=traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1
```

### Sampler Types (Environment Variables)
```
# always_on — sample all traces (default)
OTEL_TRACES_SAMPLER=always_on

# always_off — sample no traces
OTEL_TRACES_SAMPLER=always_off

# traceidratio — probabilistic by trace ID
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# parentbased_always_on — follow parent decision
OTEL_TRACES_SAMPLER=parentbased_always_on

# parentbased_traceidratio — parent-based with ratio
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

## Tail-Based Sampling

### OTel Collector Tail Sampling
```yaml
processors:
  tail_sampling:
    decision_wait: 30s           # Wait up to 30s for trace to complete
    num_traces: 10000            # Max traces in memory
    expected_new_traces_per_sec: 100
    
    policies:
    # Policy 1: Keep all errors
    - name: keep-errors
      type: status_code
      status_code:
        status_codes:
        - ERROR
        - UNSET

    # Policy 2: Keep slow traces
    - name: keep-slow
      type: latency
      latency:
        threshold_ms: 1000

    # Policy 3: Keep traces with specific attributes
    - name: keep-high-value
      type: string_attribute
      string_attribute:
        key: order.amount
        values:
        - "gt:1000"  # High-value orders

    # Policy 4: Keep traces from specific services
    - name: keep-critical-services
      type: scope_name
      scope_name:
        name: payment-service

    # Policy 5: Keep error traces that are also slow
    - name: keep-critical-errors
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

    # Policy 6: Random sampling for everything else
    - name: probabilistic
      type: probabilistic
      probabilistic:
        sampling_percentage: 5.0
```

### Tail Sampling with Composite Policies
```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    expected_new_traces_per_sec: 500
    
    policies:
    - name: errors-and-slow
      type: composite
      composite:
        max_total_spans_per_second: 1000
        policy_order:
        - error-policy
        - slow-policy
        - priority-policy

    sub_policies:
    - name: error-policy
      type: status_code
      status_code:
        status_codes:
        - ERROR
    - name: slow-policy
      type: latency
      latency:
        threshold_ms: 2000
    - name: priority-policy
      type: probabilistic
      probabilistic:
        sampling_percentage: 10.0
```

## Consistent Probability Sampling

Ensures consistent sampling across multiple services without centralized coordination.

### TraceIdRatioBased (Consistent)
```yaml
# Consistent probability sampling
# Uses trace ID hash for deterministic decisions

processors:
  probabilistic_sampler:
    sampling_percentage: 10.0
    hash_seed: 42  # Same seed across all services
```

### Why Consistent Sampling Matters
```
Without consistency:
Service A: Trace 0xABC → sampled (hash → keep)
Service B: Trace 0xABC → NOT sampled (different hash → drop)
→ Incomplete trace

With consistency:
Service A: Trace 0xABC → sampled (trace ID hash → keep)
Service B: Trace 0xABC → sampled (same trace ID → keep)
→ Complete trace
```

## Rate-Limited Sampling

### Per-Second Rate Limit
```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 100.0  # Enable all traces
    # Combined with rate limiting in exporter
```

```yaml
exporters:
  otlp:
    sending_queue:
      queue_size: 5000
    retry_on_failure:
      enabled: true
    # Rate limiting via external proxy or load shedding
```

### Adaptive Sampling
```yaml
# Custom sampling based on traffic patterns
# Requires custom processor or function
processors:
  tail_sampling:
    policies:
    - name: adaptive
      type: probabilistic
      probabilistic:
        # Dynamically adjust based on current rate
        sampling_percentage: "${env:ADAPTIVE_SAMPLE_PERCENTAGE}"
```

## Dynamic Sampling with OTel Collector

### Head Sampling with Attribute-Based Rules
```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 5.0  # Default: 5%
    
  attributes:
    actions:
    # Override sampling for high-value services
    - key: sampling.rate
      action: upsert
      value: 100.0
      pattern: .*payment.*
    - key: sampling.rate
      action: upsert
      value: 50.0
      pattern: .*order.*
```

### Tail Sampling with Multiple Backends
```yaml
processors:
  tail_sampling:
    policies:
    - name: keep-all-errors
      type: status_code
      status_code:
        status_codes:
        - ERROR

exporters:
  # All traces (sampled + unsampled) → low-cost backend
  otlp/unsampled:
    endpoint: cheap-storage:4317
    
  # Only sampled traces → full-featured backend
  otlp/sampled:
    endpoint: production-apm:4317

service:
  pipelines:
    traces/unsampled:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/unsampled]
    
    traces/sampled:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/sampled]
```

## Sampling Decision Flow

```
Trace starts → SDK sampler (head-based)
  │
  ├── Decision: DROP → No spans sent to Collector
  │
  └── Decision: KEEP → Spans sent to Collector
         │
         Collector tail_sampling processor
         │
         ├── Policy match (error/slow) → KEEP → Export
         │
         ├── Probabilistic match → KEEP → Export
         │
         └── No match → DROP → Discard
```

## Monitoring Sampling

```bash
# Collector metrics for sampling
otelcol_sampler_traces_dropped_total
otelcol_sampler_traces_sampled_total
otelcol_tail_sampling_decision_latency
otelcol_tail_sampling_num_traces_in_buffer
```

## Best Practices

1. **Start with 100% sampling** in development, 5-10% in production.
2. **Use tail-based sampling** to keep all error + slow traces.
3. **Set consistent probability** with hash_seed across services.
4. **Configure decision_wait** appropriately — 30s for typical services, longer for batch.
5. **Monitor `num_traces`** usage — if it hits max, increase or reduce traffic.
6. **Use composite policies** to prioritize important traces.
7. **Sample at the SDK level** for head-based, at the Collector for tail-based.
8. **Export unsampled traces** to a cheap storage backend for compliance.
9. **Set `expected_new_traces_per_sec`** to size the processor buffer correctly.
10. **Test sampling policies** in a staging environment before production deployment.
