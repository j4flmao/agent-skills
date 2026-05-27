# Observability Incident Response

## Overview
Incident response for LLM applications requires specialized playbooks covering: quality degradation, safety failures, cost spikes, latency regressions, and model drift. The non-deterministic nature of LLMs makes incident detection and root cause analysis more complex than traditional systems.

## Incident Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| P0 | Critical user-facing issue | < 15 min | Toxic output, data leakage, full outage |
| P1 | Major quality degradation | < 1 hour | Hallucination spike, accuracy drop >10% |
| P2 | Minor regression | < 1 day | Latency increase, cost increase |
| P3 | Proactive improvement | Next sprint | Dashboard gaps, missing metrics |

## Detection Rules

### Quality Incidents
```python
class QualityIncidentDetector:
    def __init__(self):
        self.baselines = {}
        self.thresholds = {
            "hallucination_rate": {"P0": 0.05, "P1": 0.03},
            "accuracy_drop": {"P1": 0.1, "P2": 0.05},
            "refusal_rate_change": {"P1": 0.15, "P2": 0.08},
            "toxicity_spike": {"P0": 0.01, "P1": 0.005},
        }

    def evaluate_metrics(self, metrics: dict) -> list[dict]:
        incidents = []

        for metric, value in metrics.items():
            if metric not in self.thresholds:
                continue
            baseline = self.baselines.get(metric, value)
            for severity, threshold in self.thresholds[metric].items():
                if self._is_breach(metric, value, baseline, threshold):
                    incidents.append({
                        "severity": severity,
                        "metric": metric,
                        "current": value,
                        "baseline": baseline,
                        "threshold": threshold,
                        "timestamp": datetime.utcnow().isoformat(),
                    })

        return incidents

    def _is_breach(self, metric: str, current: float, baseline: float, threshold: float) -> bool:
        increase_thresholds = ["hallucination_rate", "toxicity_spike", "refusal_rate_change"]
        decrease_thresholds = ["accuracy_drop"]

        if metric in increase_thresholds:
            return current > baseline * (1 + threshold)
        elif metric in decrease_thresholds:
            return current < baseline * (1 - threshold)
        return False

    def detect_drift(self, recent_data: list[dict], window_minutes: int = 30) -> dict:
        if len(recent_data) < 10:
            return {"drift": False, "confidence": 0}

        values = [d["value"] for d in recent_data]
        mean = statistics.mean(values)
        std = statistics.stdev(values) if len(values) > 1 else 0
        z_scores = [(v - mean) / max(std, 0.001) for v in values]

        anomalies = sum(1 for z in z_scores if abs(z) > 3)
        return {
            "drift": anomalies > len(values) * 0.1,
            "anomaly_count": anomalies,
            "total_points": len(values),
            "mean": mean,
            "std": std,
        }
```

### Cost Anomaly Detection
```python
class CostAnomalyDetector:
    def __init__(self, cost_baseline: dict):
        self.baseline = cost_baseline

    def check_cost_spike(self, current_cost: dict) -> list[dict]:
        alerts = []
        for model, cost in current_cost.get("by_model", {}).items():
            baseline_daily = self.baseline.get(model, {}).get("daily_cost", 0)
            current_daily = cost.get("daily_cost", 0)
            ratio = current_daily / max(baseline_daily, 0.01)

            if ratio > 3:
                alerts.append({
                    "severity": "P0",
                    "type": "cost_spike",
                    "model": model,
                    "current_daily": current_daily,
                    "baseline_daily": baseline_daily,
                    "ratio": ratio,
                    "estimated_monthly": current_daily * 30,
                })
            elif ratio > 1.5:
                alerts.append({
                    "severity": "P2",
                    "type": "cost_increase",
                    "model": model,
                    "current_daily": current_daily,
                    "baseline_daily": baseline_daily,
                    "ratio": ratio,
                })
        return alerts

    def detect_token_anomaly(self, token_usage: dict) -> dict:
        recent_avg = statistics.mean(token_usage["recent"])
        baseline_avg = statistics.mean(token_usage["baseline"])
        std = statistics.stdev(token_usage["baseline"]) if len(token_usage["baseline"]) > 1 else 0

        if std > 0:
            z_score = (recent_avg - baseline_avg) / std
            return {
                "anomalous": abs(z_score) > 3,
                "z_score": z_score,
                "recent_avg": recent_avg,
                "baseline_avg": baseline_avg,
            }
        return {"anomalous": recent_avg > baseline_avg * 2, "recent_avg": recent_avg, "baseline_avg": baseline_avg}
```

## Response Playbooks

### Playbook: Toxic Output
```python
class ToxicOutputPlaybook:
    def respond(self, incident: dict):
        self.steps = [
            self.quarantine_affected_users,
            self.block_output_model,
            self.analyze_cause,
            self.apply_fix,
            self.verify_fix,
            self.unblock_model,
            self.post_mortem,
        ]
        for step in self.steps:
            result = step(incident)
            if not result["success"]:
                self.escalate(step.__name__, result)

    def quarantine_affected_users(self, incident: dict) -> dict:
        affected_traces = self.find_traces(incident["start_time"], incident["end_time"])
        for trace in affected_traces:
            self.log_quarantine(trace.user_id)
        return {"success": True, "affected_users": len(affected_traces)}

    def block_output_model(self, incident: dict) -> dict:
        routing_rules = self.load_routing_rules()
        routing_rules.block_model(incident["model"])
        routing_rules.fallback_model = incident.get("fallback", "gpt-4o-mini")
        routing_rules.save()
        return {"success": True, "blocked_model": incident["model"]}

    def analyze_cause(self, incident: dict) -> dict:
        traces = self.query_traces(model=incident["model"], time_range=incident["window"])
        common_patterns = self.find_common_patterns(traces)
        prompt_versions = {t.prompt_version for t in traces if hasattr(t, "prompt_version")}

        return {
            "success": True,
            "root_cause": self.classify_cause(common_patterns, prompt_versions),
            "affected_prompts": list(prompt_versions),
        }

    def apply_fix(self, incident: dict) -> dict:
        if incident.get("cause") == "prompt_injection":
            self.update_guardrails(["injection_detection_strict"])
        elif incident.get("cause") == "model_drift":
            self.rollback_model(incident["model"])
        elif incident.get("cause") == "prompt_error":
            self.rollback_prompt(incident["prompt_version"])
        return {"success": True, "fix_applied": incident.get("cause")}
```

## Alerting Configuration

### Prometheus Alert Rules
```yaml
groups:
  - name: llm_incidents
    rules:
      - alert: HighToxicityRate
        expr: rate(llm_toxicity_score[5m]) > 0.01
        for: 2m
        labels:
          severity: P0
        annotations:
          summary: "Toxicity rate {{ $value }} exceeded P0 threshold"

      - alert: AccuracyRegression
        expr: avg_over_time(llm_accuracy[30m]) < 0.8
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "Accuracy dropped to {{ $value }}"

      - alert: CostSpike
        expr: sum(rate(llm_cost_per_minute[1h])) > 10
        for: 5m
        labels:
          severity: P1
        annotations:
          summary: "Cost spike: ${{ $value }}/minute"

      - alert: LatencyRegression
        expr: histogram_quantile(0.99, rate(llm_latency_seconds[5m])) > 5
        for: 3m
        labels:
          severity: P2
        annotations:
          summary: "P99 latency {{ $value }}s exceeded threshold"
```

## Post-Mortem Template

```python
class IncidentPostMortem:
    def generate(self, incident: dict) -> str:
        timeline = self.build_timeline(incident["events"])
        return f"""
# Post-Mortem: {incident['title']}

## Incident Summary
- **Date**: {incident['start_time'].isoformat()}
- **Duration**: {(incident['end_time'] - incident['start_time']).total_seconds() / 60:.0f} minutes
- **Severity**: {incident['severity']}
- **Impact**: {incident.get('impact', 'Unknown')}

## Timeline
{self.format_timeline(timeline)}

## Root Cause
{incident.get('root_cause', 'Under investigation')}

## Detection
- **Detected by**: {incident.get('detection_method', 'Manual report')}
- **Time to detect**: {incident.get('ttd', 'Unknown')}
- **Time to mitigate**: {incident.get('ttm', 'Unknown')}

## Resolution
{incident.get('resolution', '')}

## Action Items
{self.format_action_items(incident.get('actions', []))}

## Lessons Learned
{incident.get('lessons', '')}
"""
```

## Key Points
- Define severity levels (P0-P3) with specific thresholds and response SLAs
- Detect quality incidents via metric threshold breaches and statistical anomalies
- Automate cost spike detection with model-level baselines
- Maintain playbooks for common incident types (toxicity, drift, cost, latency)
- Block affected models immediately on P0 safety incidents
- Analyze root cause by correlating traces, prompt versions, and model deployments
- Conduct post-mortem for every P0/P1 incident
- Track time-to-detect and time-to-mitigate as key metrics
- Update baselines and thresholds based on incident learnings
- Regularly test incident response with tabletop exercises
