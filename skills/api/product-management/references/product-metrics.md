# API Product Metrics

## Adoption Tracking

| Metric | Definition | Healthy Range |
|--------|------------|---------------|
| Active consumers | Unique API keys used in last 30d | Growing MoM |
| Request volume | Total requests per time period | > 10% MoM growth |
| Consumer growth | New API key registrations | > 5% MoM |
| Activation rate | Keys with first call within 7d | > 60% |
| Retention rate | Consumers active in month N who return in N+1 | > 80% |

## Developer Experience Metrics

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Time to first call | Time from key creation to first successful request | < 5 min |
| API completeness | % of endpoints documented with examples | > 95% |
| Error clarity | % of errors with actionable messages | > 90% |
| SDK coverage | % of users using official SDK | > 70% |
| Documentation satisfaction | Post-doc survey (1-5) | > 4.0 |

## Business Metrics

```python
class ApiProductMetrics:
    def __init__(self):
        self.metrics = defaultdict(list)

    def record_request(self, consumer_id, endpoint, status, latency, tier):
        entry = {
            "consumer_id": consumer_id,
            "endpoint": endpoint,
            "status": status,
            "latency_ms": latency,
            "tier": tier,
            "timestamp": time.time()
        }
        self.metrics["requests"].append(entry)

    def monthly_active_consumers(self):
        cutoff = time.time() - 30 * 86400
        active = set()
        for req in self.metrics["requests"]:
            if req["timestamp"] > cutoff:
                active.add(req["consumer_id"])
        return len(active)
```

| Tier | Monthly Active Users | Request Volume | Revenue Contribution |
|------|---------------------|----------------|---------------------|
| Free | 500 | 100K | 0% |
| Pro | 100 | 1M | 30% |
| Enterprise | 10 | 10M | 70% |

## API Quality Gates

| Gate | Criteria | Action |
|------|----------|--------|
| Availability | > 99.9% uptime over 30d | Investigate if below |
| Latency | P95 < 200ms, P99 < 500ms | Optimize or scale |
| Error rate | < 1% 5xx over 5min | Auto-rollback |
| Documentation | 100% of new endpoints documented | Block release |
| Deprecation notice | 6 month notice before removal | Track affected consumers |

## Developer Portal Analytics
- Page views per doc section (identify confusing areas)
- Search queries within docs (what devs can't find)
- SDK download rates (measure adoption per language)
- API key creation rate (measure top-of-funnel)
- Support ticket volume per endpoint (measure DX issues)

## API Product Scorecard

| Dimension | Weight | Metric | Target |
|-----------|--------|--------|--------|
| Adoption | 25% | Active consumer growth | > 10% MoM |
| Developer experience | 25% | Time to first call | < 5 min |
| Reliability | 25% | Uptime | > 99.9% |
| Business value | 15% | Revenue per consumer | Growing |
| Documentation | 10% | Doc completeness | > 95% |

### Health Dashboard
```python
class ApiProductDashboard:
    def compute_health_score(self, metrics):
        weights = {"adoption": 0.25, "dx": 0.25, "reliability": 0.25, "business": 0.15, "docs": 0.10}
        scores = {
            "adoption": self.adoption_score(metrics),
            "dx": self.dx_score(metrics),
            "reliability": self.reliability_score(metrics),
            "business": self.business_score(metrics),
            "docs": self.docs_score(metrics),
        }
        total = sum(scores[k] * weights[k] for k in scores)
        return {"total": total, "breakdown": scores}
```

## Churn Analysis
| Churn Reason | % of Churned | Prevention Strategy |
|-------------|-------------|-------------------|
| Poor documentation | 35% | Improve docs, add examples |
| Reliability issues | 25% | SLOs, error budget alerts |
| Missing features | 20% | Feature request portal |
| Pricing | 15% | Tier review, usage limits |
| Competition | 5% | Differentiation strategy |
