# Dashboard and Alerting

## Overview

Observability dashboards provide real-time visibility into LLM system health, usage patterns, and cost trends. Combined with proactive alerting, they enable rapid response to anomalies, regressions, and incidents. This reference covers dashboard design principles, key metrics, visualization patterns, alerting rules, and incident response workflows for AI systems.

## Dashboard Design Principles

### Metric Categories

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional

@dataclass
class DashboardPanel:
    title: str
    metric: str
    panel_type: str  # "time_series", "gauge", "stat", "table", "heatmap"
    unit: str
    thresholds: Dict[str, float] = field(default_factory=dict)
    refresh_interval: str = "30s"

@dataclass
class DashboardConfig:
    name: str
    refresh: str = "30s"
    time_range: str = "now-24h"
    panels: List[DashboardPanel] = field(default_factory=list)

class DashboardBuilder:
    def __init__(self):
        self.config = DashboardConfig(name="LLM Observability")

    def add_usage_panel(self):
        self.config.panels.append(DashboardPanel(
            title="Requests per Second",
            metric="llm_requests_total",
            panel_type="time_series",
            unit="req/s",
        ))
        self.config.panels.append(DashboardPanel(
            title="Active Users",
            metric="llm_active_users",
            panel_type="stat",
            unit="users",
        ))
        return self

    def add_latency_panel(self):
        self.config.panels.append(DashboardPanel(
            title="P50/P95/P99 Latency",
            metric="llm_latency_ms",
            panel_type="time_series",
            unit="ms",
            thresholds={"warning": 500, "critical": 2000},
        ))
        return self

    def add_cost_panel(self):
        self.config.panels.append(DashboardPanel(
            title="Daily Cost by Model",
            metric="llm_cost_usd",
            panel_type="time_series",
            unit="$",
        ))
        self.config.panels.append(DashboardPanel(
            title="Budget Remaining",
            metric="llm_budget_remaining",
            panel_type="gauge",
            unit="%",
            thresholds={"warning": 20, "critical": 10},
        ))
        return self

    def add_quality_panel(self):
        self.config.panels.append(DashboardPanel(
            title="Positive Feedback Rate",
            metric="llm_feedback_positive_rate",
            panel_type="time_series",
            unit="%",
            thresholds={"warning": 0.85, "critical": 0.70},
        ))
        self.config.panels.append(DashboardPanel(
            title="Guardrail Violations",
            metric="llm_guardrail_violations",
            panel_type="time_series",
            unit="count",
        ))
        return self

    def add_token_panel(self):
        self.config.panels.append(DashboardPanel(
            title="Token Usage by Model",
            metric="llm_tokens_total",
            panel_type="time_series",
            unit="tokens",
        ))
        self.config.panels.append(DashboardPanel(
            title="Tokens per Query",
            metric="llm_tokens_per_query",
            panel_type="stat",
            unit="tokens",
        ))
        return self

    def build(self) -> DashboardConfig:
        return self.config
```

## Key Metrics Reference

### Volume Metrics

```python
from prometheus_client import Counter, Gauge, Histogram
import time

# Request volume
requests_total = Counter(
    "llm_requests_total",
    "Total LLM requests",
    ["model", "endpoint", "status"]
)

# Active users (updated every minute)
active_users = Gauge(
    "llm_active_users",
    "Unique active users in window",
    ["tier"]
)

# Concurrent requests
concurrent_requests = Gauge(
    "llm_concurrent_requests",
    "Currently running requests",
    ["model"]
)

class VolumeTracker:
    def track_request(self, model: str, endpoint: str, status: str):
        requests_total.labels(model=model, endpoint=endpoint, status=status).inc()

    def set_active_users(self, count: int, tier: str = "all"):
        active_users.labels(tier=tier).set(count)

    def set_concurrent(self, count: int, model: str = "all"):
        concurrent_requests.labels(model=model).set(count)
```

### Performance Metrics

```python
# Latency histograms
latency_histogram = Histogram(
    "llm_latency_ms",
    "Request latency in milliseconds",
    ["model", "operation"],
    buckets=[50, 100, 200, 500, 1000, 2000, 5000, 10000, 30000]
)

# Time to first token
ttft_histogram = Histogram(
    "llm_ttft_ms",
    "Time to first token",
    ["model"],
    buckets=[50, 100, 200, 500, 1000, 2000, 5000]
)

# Token generation rate
token_rate = Gauge(
    "llm_token_generation_rate",
    "Tokens generated per second",
    ["model"]
)

class PerformanceTracker:
    def observe_latency(self, model: str, operation: str, ms: float):
        latency_histogram.labels(model=model, operation=operation).observe(ms)

    def observe_ttft(self, model: str, ms: float):
        ttft_histogram.labels(model=model).observe(ms)

    def set_token_rate(self, model: str, rate: float):
        token_rate.labels(model=model).set(rate)
```

### Quality Metrics

```python
# Feedback scores
feedback_score = Gauge(
    "llm_feedback_score",
    "Average user feedback score (0-1)",
    ["model", "category"]
)

# Hallucination rate (from automated eval)
hallucination_rate = Gauge(
    "llm_hallucination_rate",
    "Fraction of responses with hallucination",
    ["model"]
)

# Guardrail violations
guardrail_violations = Counter(
    "llm_guardrail_violations_total",
    "Guardrail violation count",
    ["guardrail_type", "severity"]
)

class QualityTracker:
    def set_feedback_score(self, model: str, score: float, category: str = "overall"):
        feedback_score.labels(model=model, category=category).set(score)

    def set_hallucination_rate(self, model: str, rate: float):
        hallucination_rate.labels(model=model).set(rate)

    def record_guardrail_violation(self, guardrail_type: str, severity: str = "medium"):
        guardrail_violations.labels(guardrail_type=guardrail_type, severity=severity).inc()
```

### Cost Metrics

```python
# Daily cost
daily_cost = Counter(
    "llm_daily_cost_usd",
    "Daily cost in USD",
    ["model", "provider"]
)

# Cost per query
cost_per_query = Gauge(
    "llm_cost_per_query",
    "Average cost per query in USD",
    ["model"]
)

# Budget remaining
budget_remaining = Gauge(
    "llm_budget_remaining_pct",
    "Percentage of budget remaining",
    ["model", "period"]
)

class CostTracker:
    def record_cost(self, model: str, provider: str, cost_usd: float):
        daily_cost.labels(model=model, provider=provider).inc(cost_usd)

    def set_cost_per_query(self, model: str, cost: float):
        cost_per_query.labels(model=model).set(cost)

    def set_budget_remaining(self, model: str, period: str, pct: float):
        budget_remaining.labels(model=model, period=period).set(pct)
```

## Alerting Rules

### Prometheus Alert Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: llm_alerts
    rules:
      - alert: HighLatencyP95
        expr: histogram_quantile(0.95, rate(llm_latency_ms_bucket[5m])) > 2000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "P95 latency above 2s for {{ $labels.model }}"

      - alert: HighErrorRate
        expr: rate(llm_requests_total{status="error"}[5m]) / rate(llm_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 5% for {{ $labels.model }}"

      - alert: BudgetExceeded
        expr: llm_budget_remaining_pct{period="daily"} < 10
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Daily budget almost exhausted for {{ $labels.model }}"

      - alert: CostSpike
        expr: rate(llm_daily_cost_usd[1h]) > rate(llm_daily_cost_usd[24h]) * 2
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Cost rate doubled in last hour for {{ $labels.model }}"

      - alert: QualityDrop
        expr: llm_feedback_score < 0.7
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Feedback score dropped below 0.7 for {{ $labels.model }}"

      - alert: GuardrailViolationSpike
        expr: rate(llm_guardrail_violations_total[5m]) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Guardrail violations spiking ({{ $value }}/s)"

      - alert: HallucinationRateHigh
        expr: llm_hallucination_rate > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Hallucination rate above 10% for {{ $labels.model }}"

      - alert: NoTraffic
        expr: rate(llm_requests_total[5m]) == 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "No LLM requests detected"

      - alert: TokenUsageSurge
        expr: rate(llm_tokens_total[5m]) > rate(llm_tokens_total[30m]) * 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Token usage surged 3x for {{ $labels.model }}"

      - alert: SlowTokens
        expr: rate(llm_token_generation_rate) < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Token generation rate below 10/s for {{ $labels.model }}"
```

### Alert Manager Configuration

```python
from typing import List, Dict, Callable
from enum import Enum

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class AlertRule:
    def __init__(self, name: str, condition: Callable, severity: AlertSeverity, cooldown_seconds: int = 300):
        self.name = name
        self.condition = condition
        self.severity = severity
        self.cooldown = cooldown_seconds
        self.last_fired: float = 0

class AlertManager:
    def __init__(self):
        self.rules: List[AlertRule] = []

    def add_rule(self, rule: AlertRule):
        self.rules.append(rule)

    def check_all(self, state: Dict) -> List[Dict]:
        now = __import__("time").time()
        alerts = []
        for rule in self.rules:
            if now - rule.last_fired < rule.cooldown:
                continue
            try:
                if rule.condition(state):
                    alerts.append({
                        "name": rule.name,
                        "severity": rule.severity.value,
                        "timestamp": now,
                    })
                    rule.last_fired = now
            except Exception as e:
                alerts.append({
                    "name": f"{rule.name}_error",
                    "severity": AlertSeverity.WARNING.value,
                    "message": str(e),
                })
        return alerts
```

## Incident Response

### Incident Classification

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List

@dataclass
class Incident:
    id: str
    title: str
    severity: str  # SEV1, SEV2, SEV3
    metric: str
    value: float
    threshold: float
    model: str
    detected_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    root_cause: Optional[str] = None
    actions: List[str] = field(default_factory=list)

class IncidentResponder:
    def __init__(self, alert_manager: AlertManager, notifier: Callable):
        self.alert_manager = alert_manager
        self.notifier = notifier
        self.incidents: List[Incident] = []
        self._incident_counter = 0

    def process_alert(self, alert: Dict) -> Optional[Incident]:
        severity = alert.get("severity", "warning")
        if severity == "critical":
            incident = Incident(
                id=f"INC-{self._incident_counter}",
                title=alert["name"],
                severity="SEV1" if severity == "critical" else "SEV2",
                metric=alert.get("metric", "unknown"),
                value=alert.get("value", 0),
                threshold=alert.get("threshold", 0),
                model=alert.get("model", "unknown"),
                detected_at=datetime.now(),
            )
            self._incident_counter += 1
            self.incidents.append(incident)
            self.notifier(f"[{incident.severity}] {incident.title} on {incident.model}")
            return incident
        elif severity == "warning":
            self.notifier(f"[WARN] {alert['name']}")
        return None

    def acknowledge(self, incident_id: str, responder: str):
        for inc in self.incidents:
            if inc.id == incident_id:
                inc.acknowledged_at = datetime.now()
                break

    def resolve(self, incident_id: str, root_cause: str, actions: List[str]):
        for inc in self.incidents:
            if inc.id == incident_id:
                inc.resolved_at = datetime.now()
                inc.root_cause = root_cause
                inc.actions = actions
                break

    def incident_report(self, incident_id: str) -> str:
        for inc in self.incidents:
            if inc.id == incident_id:
                lines = [
                    f"Incident Report: {inc.id}",
                    f"Title: {inc.title}",
                    f"Severity: {inc.severity}",
                    f"Detected: {inc.detected_at}",
                    f"Acknowledged: {inc.acknowledged_at or 'N/A'}",
                    f"Resolved: {inc.resolved_at or 'N/A'}",
                    f"Root Cause: {inc.root_cause or 'Under investigation'}",
                    "Actions Taken:",
                ]
                for a in inc.actions:
                    lines.append(f"  - {a}")
                return "\n".join(lines)
        return f"Incident {incident_id} not found"
```

## Dashboard Layout Templates

### Grafana Dashboard JSON

```python
def generate_grafana_dashboard(title: str = "LLM Observability") -> dict:
    return {
        "title": title,
        "time": {"from": "now-24h", "to": "now"},
        "refresh": "30s",
        "panels": [
            {
                "id": 1,
                "title": "Request Volume",
                "type": "timeseries",
                "targets": [{
                    "expr": "rate(llm_requests_total[5m])",
                    "legendFormat": "{{model}} - {{endpoint}}"
                }]
            },
            {
                "id": 2,
                "title": "Latency P95",
                "type": "timeseries",
                "targets": [{
                    "expr": "histogram_quantile(0.95, rate(llm_latency_ms_bucket[5m]))",
                    "legendFormat": "{{model}}"
                }],
                "thresholds": [
                    {"value": 500, "color": "yellow"},
                    {"value": 2000, "color": "red"}
                ]
            },
            {
                "id": 3,
                "title": "Daily Cost",
                "type": "timeseries",
                "targets": [{
                    "expr": "rate(llm_daily_cost_usd[1h])",
                    "legendFormat": "{{model}}"
                }]
            },
            {
                "id": 4,
                "title": "Feedback Score",
                "type": "gauge",
                "targets": [{
                    "expr": "llm_feedback_score",
                    "legendFormat": "{{model}}"
                }],
                "thresholds": [
                    {"value": 0.7, "color": "red"},
                    {"value": 0.85, "color": "yellow"},
                    {"value": 1.0, "color": "green"}
                ]
            }
        ]
    }
```

## Key Points

- Design dashboards around four pillars: volume, performance, quality, and cost.
- Use Prometheus histograms for latency metrics to calculate accurate P50/P95/P99 values.
- Set alert thresholds with hysteresis (for duration) to avoid alert fatigue from transients.
- Alert on rate-based metrics (errors/second) rather than raw counts.
- Always include model, endpoint, and status labels on request metrics for filtering.
- Use gauge metrics for budget remaining, feedback scores, and concurrent requests.
- Use counter metrics for total requests, tokens, cost, and errors.
- Implement cooldown periods to prevent alert storms.
- Classify incidents by severity (SEV1-3) with clear response SLAs.
- Document incident root causes and actions for post-mortem analysis.
- Include feedback scores and guardrail violations on the main dashboard.
- Track token generation rate as a leading indicator of performance issues.
- Alert on absence of traffic as well as anomalies in existing traffic.
- Export dashboard configurations as code for version control and reproducibility.
- Review alert rules monthly to adjust thresholds based on evolving baselines.
