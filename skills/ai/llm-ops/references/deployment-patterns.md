# LLM Deployment Patterns

## Deployment Strategies

| Strategy | Risk | Complexity | Rollback Time | Traffic Impact |
|----------|------|------------|---------------|----------------|
| Recreate | High | Low | Minutes | Full downtime |
| Rolling | Medium | Medium | Seconds | Gradual shift |
| Blue/Green | Low | Medium | Instant | Instant switch |
| Canary | Very Low | High | Seconds | Gradual shift |
| Shadow | None | High | N/A | No user impact |

## Canary Deployment

### Pipeline
```
1. Deploy candidate to canary (5% traffic)
2. Monitor latency, quality, error rate for 15 min
3. Increase to 25% traffic, monitor 30 min
4. Increase to 50%, monitor 1 hour
5. Full rollout (100%)
6. Archive previous version
```

### Auto-Rollback Conditions
```yaml
auto_rollback:
  error_rate_increase: 1.5x  # vs baseline
  latency_p95_increase: 2x
  faithfulness_drop: 0.03    # absolute
  cost_per_query_increase: 1.5x
  duration: "5m"             # sustained for 5 minutes
```

## Blue/Green Deployment

### Infrastructure
```
Blue (current): Production traffic
Green (candidate): Staged, no traffic

Switch: Update load balancer target from Blue → Green
Rollback: Switch back to Blue
```

### Validation Gate
- Run full eval suite on Green before switch
- Run smoke tests on live Green endpoint
- Warm up Green with synthetic traffic (cache population)
- Verify monitoring data flowing from Green

## Multi-Model Routing

### Model Router
```python
class ModelRouter:
    def __init__(self):
        self.routes = {
            "simple": {"model": "gpt-4o-mini", "threshold": 0.8},
            "complex": {"model": "gpt-4o", "threshold": 0.6},
            "fallback": {"model": "claude-3-sonnet"},
        }

    def route(self, query, classification):
        route = self.routes.get(classification, self.routes["fallback"])
        return route["model"]
```

### Query Classification
```
Simple: factual Q&A, short queries (<100 tokens)
Medium: multi-step, requires context (>100 tokens)
Complex: reasoning, code, analysis, creative
Specialized: domain-specific (legal, medical, code)
```

## Auto-Scaling

### Metrics-Based Scaling
```yaml
scaling:
  min_replicas: 2
  max_replicas: 20
  metrics:
    - type: requests_per_second
      target: 50  # per replica
    - type: gpu_utilization
      target: 70  # percent
    - type: queue_depth
      target: 10  # waiting requests
```

### GPU Sizing
```yaml
models:
  llama-8b:
    min_gpu_memory: 24 GB
    recommended_gpu: "1x A10G"
    max_batch: 64
  llama-70b:
    min_gpu_memory: 80 GB
    recommended_gpu: "1x A100-80GB"
    max_batch: 32
  gpt-4o:
    provider: openai
    rate_limit: 10000 RPM
```

## Caching Layer

### Response Cache
```python
class ResponseCache:
    def __init__(self, ttl_seconds=3600):
        self.cache = {}
        self.ttl = ttl_seconds

    def get(self, prompt_hash, context_hash):
        key = f"{prompt_hash}:{context_hash}"
        entry = self.cache.get(key)
        if entry and time.time() - entry["timestamp"] < self.ttl:
            return entry["response"]
        return None
```

### Cache Hit Rate Targets
| Query Type | Expected Hit Rate | TTL |
|------------|------------------|-----|
| Static FAQ | 80-95% | 24h |
| Product info | 60-80% | 1h |
| Dynamic queries | 10-30% | 5min |
| User-specific | 0% | N/A |

## Monitoring & Alerting

### Health Checks
```
Liveness: Model responds to simple ping
Readiness: Model loaded, accepting requests
Quality: Periodic eval on golden dataset
Latency: P50/P95/P99 vs SLA
Error Rate: 5xx responses
GPU Health: Memory, utilization, temperature
```

### Production Dashboard
```
Row 1: Request volume, error rate, avg latency (real-time)
Row 2: Model-wise cost breakdown (daily)
Row 3: Quality metrics (faithfulness, relevance) vs baseline
Row 4: GPU utilization, queue depth, cache hit rate
```

## Deployment Checklist

- [ ] Canary deployed to 5% with monitoring
- [ ] Auto-rollback conditions configured
- [ ] Eval suite passes on candidate (no regression)
- [ ] Latency within SLA for P50/P95/P99
- [ ] Cost per query within budget
- [ ] Error rate <0.1% on warm endpoint
- [ ] Cache warming complete before full rollout
- [ ] Monitoring dashboards verified
- [ ] Rollback procedure documented and tested
- [ ] Stakeholders notified of deployment window
