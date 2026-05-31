# Capacity Planning Automation and Tooling

## Overview

This reference covers automation strategies, tooling, and implementation patterns for operationalizing capacity planning. It includes pipeline architecture, metric collection systems, autoscaling configuration, IaC integration, dashboard design, and alerting frameworks.

## Capacity Planning Pipeline Architecture

A mature capacity planning pipeline has five stages:

### Stage 1: Metric Collection

Continuous collection of infrastructure and application metrics at appropriate granularity:

- Infrastructure-level: CPU, memory, disk, network (1-5 minute intervals)
- Container-level: per-container resource usage with Kubernetes metrics (15-60 second intervals)
- Application-level: request rate, latency, error rate, queue depths (1-60 second intervals)
- Business-level: user signups, transactions, revenue (hourly/daily)

Collection tools:
- Prometheus + node_exporter for infrastructure metrics
- cAdvisor / kube-state-metrics for container metrics
- StatsD / Telegraf for application metrics
- Cloud provider APIs (CloudWatch, Azure Monitor, GCP Monitoring) for managed services

Collection best practices:
- Label all metrics with service name, tier, region, and environment
- Use consistent metric naming conventions across all teams
- Store raw metrics (not just aggregates) for re-analysis
- Tag metrics with business context (cost center, project)

### Stage 2: Aggregation and Storage

Aggregate raw metrics into time-series suitable for analysis:

- Downsample: 15-second raw -> 5-minute aggregate -> 1-hour aggregate -> 1-day aggregate
- Compute percentiles: p50, p95, p99, p99.9 at each aggregation level
- Store in tiered storage: hot (7 days raw), warm (90 days 5-min), cold (2+ years hourly)

Storage technologies:
- Prometheus / VictoriaMetrics / Thanos for time-series metrics
- BigQuery / Snowflake / ClickHouse for analytical queries
- S3 / GCS / Azure Blob for long-term raw metric archives

Retention policies:
- Raw data: 30 days (for model re-fitting)
- 5-minute aggregates: 12 months (for quarterly capacity planning)
- Hourly/daily aggregates: indefinite (for yearly trend analysis)

### Stage 3: Analysis and Forecasting

Run forecasting models on aggregated data:

- Scheduled batch jobs (nightly/weekly) compute forecasts for all services
- On-demand analysis for what-if scenarios and ad-hoc requests
- Model re-fitting: quarterly on full history, or triggered by accuracy degradation

Analysis tools:
- Python (pandas, scikit-learn, Prophet, statsmodels)
- R (forecast package, fable)
- Custom ML pipelines with MLflow/Kubeflow
- Cloud-native: AWS Forecast, Azure Time Series Insights

Output: forecast tables and probability distributions for each resource, service, and tier.

### Stage 4: Decision Support

Compare forecast against current capacity and generate recommendations:

- Heat map: resources where forecast > 70% of capacity in next quarter
- Procurement triggers: items where forecast crosses order threshold
- Autoscale boundary recommendations: new min/max replicas
- Exception list: items requiring manual review

Decision tools:
- Custom dashboards with approval workflows
- Jira/ServiceNow integration for procurement ticket creation
- Slack/Teams notifications for forecast crossing thresholds

### Stage 5: Feedback and Verification

Continuous verification loop:

- Monthly: compare forecast vs actual for each resource
- Quarterly: re-fit models, produce new forecasts
- Trigger: if forecast error > 20% for 2 consecutive months, trigger model review
- Scorecard: track forecast accuracy by service and model type

## Metric Collection Implementation

### Prometheus Configuration

```yaml
# prometheus.yml - scrape configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/capacity.yml"

scrape_configs:
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - source_labels: [__meta_kubernetes_node_label_kubernetes_io_hostname]
        target_label: hostname

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: service
```

### Recording Rules for Capacity Metrics

```yaml
# rules/capacity.yml
groups:
  - name: capacity_metrics
    interval: 5m
    rules:
      # Per-service CPU utilization percent (average over 5min)
      - record: capacity:service:cpu_utilization_pct
        expr: |
          sum(rate(container_cpu_usage_seconds_total[5m])) by (service, environment)
          / sum(kube_pod_container_resource_requests_cpu_cores) by (service, environment)
          * 100

      # Per-service memory utilization percent
      - record: capacity:service:memory_utilization_pct
        expr: |
          sum(container_memory_working_set_bytes) by (service, environment)
          / sum(kube_pod_container_resource_requests_memory_bytes) by (service, environment)
          * 100

      # Per-service p95 CPU over 7-day window
      - record: capacity:service:cpu_p95_7d
        expr: |
          histogram_quantile(0.95,
            sum(rate(container_cpu_usage_seconds_total[5m])) by (service, environment, le)
          )

      # Requests per second per service
      - record: capacity:service:requests_per_second
        expr: |
          sum(rate(http_requests_total[5m])) by (service, environment)
```

## Autoscaling Automation

### Kubernetes HPA with Capacity-Aware Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 10
  maxReplicas: 100
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

### Cluster Autoscaler Configuration

```yaml
# cluster-autoscaler configuration
# --max-nodes-total: absolute maximum nodes across all node groups
# --cores-total: min:max for total CPU cores
# --memory-total: min:max for total memory in MiB
# --scale-down-delay-after-add: wait 10min after scale-up before allowing scale-down
# --scale-down-unneeded-time: how long a node must be underutilized before removal
# --max-node-provision-time: maximum time to wait for node creation

# Node group configuration (AWS example)
nodeGroups:
  - name: capacity-ondemand
    minSize: 5
    maxSize: 50
    instanceType: m6i.4xlarge
    labels:
      capacity-tier: ondemand
    taints: []
  - name: capacity-spot
    minSize: 0
    maxSize: 100
    instanceType: m6i.4xlarge
    spot: true
    labels:
      capacity-tier: spot
    taints: ["Spot:PreferNoSchedule"]
```

### Predictive Autoscaling

For systems with predictable daily/weekly patterns, use predictive scaling:

```yaml
# Predictive HPA using custom metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: predictive-hpa
spec:
  # ... standard HPA spec
  metrics:
    - type: Pods
      pods:
        metric:
          name: predicted_requests_per_second
        target:
          type: AverageValue
          averageValue: 100
```

Implementation: a sidecar or external metrics provider that:
1. Reads predicted traffic from a forecasting model
2. Converts to target replica count
3. Exposes as custom metric
4. HPA scales based on prediction + actual traffic (whichever is higher)

### Autoscale Boundary Computation

```python
def compute_autoscale_bounds(service, forecast_peak, per_pod_capacity, headroom_pct, min_base_load):
    """
    Compute HPA min/max replicas from capacity forecast.
    """
    required_capacity = forecast_peak * (1 + headroom_pct / 100)
    max_replicas = ceil(required_capacity / per_pod_capacity)

    # Min replicas should handle base load with some buffer
    min_replicas = max(
        ceil(min_base_load / per_pod_capacity * 1.5),  # 50% buffer over base
        2  # minimum for redundancy
    )

    return {
        "minReplicas": min_replicas,
        "maxReplicas": max_replicas,
        "targetUtilization": 65,
        "forecastPeak": forecast_peak,
        "headroomUnits": required_capacity - forecast_peak,
    }
```

## IaC Integration for Capacity Management

### Terraform Provider for Capacity Configuration

```hcl
# capacity-config.tf - defines capacity configuration as code
resource "capacity_plan" "api_service" {
  service    = "api-service"
  tier       = "Tier-1"
  headroom   = 1.0  # 100% headroom

  baseline = {
    median_rps   = 5000
    p95_rps      = 12000
    p99_rps      = 15000
    peak_rps     = 18000
  }

  forecast = {
    model_type    = "seasonal"
    q1_rps        = 22000
    q2_rps        = 30000
    q3_rps        = 40000
    q4_rps        = 50000
  }

  autoscale = {
    min_replicas     = 8
    max_replicas     = 60
    target_cpu_pct   = 65
    target_mem_pct   = 70
  }
}
```

### Kubernetes Resource Requests Automation

```yaml
# Vertical Pod Autoscaler config for right-sizing recommendations
apiVersion: "autoscaling.k8s.io/v1"
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: api-service
  updatePolicy:
    updateMode: "Off"  # Only recommend, don't auto-update
  resourcePolicy:
    containerPolicies:
      - containerName: '*'
        minAllowed:
          cpu: 200m
          memory: 256Mi
        maxAllowed:
          cpu: 8
          memory: 8Gi
        controlledResources: ["cpu", "memory"]
```

## Dashboard Design for Capacity Visualization

### Capacity Overview Dashboard (Grafana)

Panel 1 - Headroom Summary: Heatmap showing headroom % by service and resource type. Green ( > 75% ), Yellow (50-75%), Orange (25-50%), Red ( < 25% ).

Panel 2 - Forecast vs Actual: Time-series showing forecast (line with confidence band) overlaid on actual usage. Show current period + next 2 quarters.

Panel 3 - Top-Growing Services: Bar chart of month-over-month growth rate for top-10 services by usage increase.

Panel 4 - Cost-Per-Unit: Line chart of cost per request, cost per user, cost per GB stored over trailing 12 months.

Panel 5 - Procurement Pipeline: Table of open procurement items with status, expected delivery, and days until needed.

Panel 6 - Forecast Accuracy Scorecard: Table of MAPE by service and model type. Highlight models with >20% error.

### Capacity Alert Rules

```yaml
# Prometheus alert rules for capacity
groups:
  - name: capacity_alerts
    interval: 5m
    rules:
      - alert: HighUtilization
        expr: |
          capacity:service:cpu_utilization_pct > 80
          and on(service) (capacity:tier == 1)
        for: 15m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "{{ $labels.service }} CPU utilization > 80%"
          description: "Service {{ $labels.service }} is at {{ $value }}% CPU utilization. Threshold is 80%."
          runbook: "https://runbooks/capacity/high-utilization.md"

      - alert: CriticalUtilization
        expr: |
          capacity:service:cpu_utilization_pct > 90
          and on(service) (capacity:tier == 1)
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "{{ $labels.service }} CPU utilization > 90% (CRITICAL)"
          description: "Service {{ $labels.service }} is at {{ $value }}% CPU utilization. Immediate investigation required."

      - alert: ForecastThresholdCrossed
        expr: |
          capacity:service:forecast_utilization_90day > 70
        for: 0m
        labels:
          severity: warning
          team: capacity-planning
        annotations:
          summary: "{{ $labels.service }} forecast exceeds 70% threshold"
          description: "Service {{ $labels.service }} projected to reach {{ $value }}% utilization within 90 days."

      - alert: ForecastAccuracyDegraded
        expr: |
          capacity:service:forecast_mape > 20
        for: 7d
        labels:
          severity: warning
          team: capacity-planning
        annotations:
          summary: "{{ $labels.service }} forecast accuracy degraded"
          description: "MAPE for {{ $labels.service }} is {{ $value }}% (target < 20%). Model re-fit recommended."
```

## Procurement Automation

### Procurement Trigger Rules

```python
def evaluate_procurement_triggers(service_name, current_usage, forecast):
    """
    Evaluates procurement triggers and generates orders.
    """
    triggers = []

    # Cloud autoscale: raise max when current/limit > 60%
    if current_usage.autoscale_max and current_usage.current / current_usage.autoscale_max > 0.6:
        new_max = forecast.peak_q1 * 1.5
        triggers.append({
            "action": "RAISE_AUTOSCALE_MAX",
            "resource": f"{service_name}/autoscale",
            "new_max": new_max,
            "urgency": "IMMEDIATE",
            "reason": f"Current/limit ratio {current_usage.ratio:.0%} exceeds 60%"
        })

    # Reserved capacity: order when 6 month forecast crosses limit
    if forecast.peak_q2 > current_usage.reserved_capacity * 0.9:
        recommended = forecast.peak_q3 * 1.25
        triggers.append({
            "action": "ORDER_RESERVED_CAPACITY",
            "resource": f"{service_name}/reserved",
            "recommended": recommended,
            "urgency": "THIS_QUARTER",
            "reason": f"Q2 forecast ({forecast.peak_q2}) approaching current reserve ({current_usage.reserved_capacity})"
        })

    # Bare-metal: order when 9 month forecast crosses limit
    if forecast.peak_q3 > current_usage.total_capacity * 0.8:
        triggers.append({
            "action": "ORDER_BARE_METAL",
            "resource": f"{service_name}/bare-metal",
            "specs": compute_hardware_specs(forecast.peak_q4),
            "urgency": "NEXT_QUARTER",
            "reason": f"Q3 forecast ({forecast.peak_q3}) at {forecast.peak_q3/current_usage.total_capacity:.0%} of current capacity"
        })

    return triggers
```

### Jira Integration for Procurement

```python
def create_procurement_ticket(trigger):
    """
    Creates a Jira ticket for procurement approval.
    """
    jira_payload = {
        "project": "PROC",
        "summary": f"Capacity procurement: {trigger['resource']}",
        "description": f"""
        h2. Procurement Request

        *Service:* {trigger['resource']}
        *Urgency:* {trigger['urgency']}
        *Reason:* {trigger['reason']}

        h3. Recommendation
        {json.dumps(trigger, indent=2)}

        h3. Required Approvals
        - [ ] Engineering review
        - [ ] Finance approval
        - [ ] Procurement execution
        """,
        "issuetype": "Task",
        "priority": "Critical" if trigger['urgency'] == 'IMMEDIATE' else "Major",
        "customfield_10100": trigger['urgency'],  # custom field for urgency
    }

    response = requests.post(JIRA_API_URL, json=jira_payload, auth=JIRA_AUTH)
    return response.json()["key"]
```

## Reporting Automation

### Monthly Capacity Report Generation

```python
def generate_monthly_capacity_report():
    """
    Generates a comprehensive monthly capacity report.
    """
    report = {
        "generated_at": datetime.now().isoformat(),
        "reporting_period": get_previous_month_range(),
    }

    # Section 1: Executive Summary
    services = get_all_services()
    report["executive_summary"] = {
        "services_tracked": len(services),
        "services_in_green": sum(1 for s in services if s.headroom > 75),
        "services_in_yellow": sum(1 for s in services if 50 < s.headroom <= 75),
        "services_in_orange": sum(1 for s in services if 25 < s.headroom <= 50),
        "services_in_red": sum(1 for s in services if s.headroom <= 25),
        "total_recommended_investment": compute_total_investment(services),
    }

    # Section 2: Forecast Accuracy
    report["forecast_accuracy"] = {
        s.service_name: {
            "mape": s.forecast_mape,
            "model_type": s.forecast_model,
            "is_degraded": s.forecast_mape > 20,
        }
        for s in services
    }

    # Section 3: Procurement Pipeline
    report["procurement_pipeline"] = get_active_procurement_items()

    # Section 4: Top Actions
    report["top_actions"] = get_priority_actions(services)

    # Publish to dashboard and distribute
    publish_report(report)
    send_notification(report)
```

## Tool Integration Patterns

### Prometheus + Thanos + Grafana Stack

```
Metrics Pipeline:
Endpoints -> Prometheus (30d retention) -> Thanos Sidecar -> Object Store
                                                              |
                                                    Thanos Query (global view)
                                                              |
                                                         Grafana
```

### Python Analysis Pipeline

```python
# capacity_analysis.py
import pandas as pd
import numpy as np
from prophet import Prophet
from sqlalchemy import create_engine

def analyze_service_capacity(service_name, months_history=12, forecast_months=6):
    """
    Full capacity analysis pipeline for a single service.
    """
    # 1. Load historical metrics
    metrics = load_metrics_from_db(service_name, months_history)

    # 2. Compute baseline statistics
    baseline = {
        "median": metrics["value"].median(),
        "p95": metrics["value"].quantile(0.95),
        "p99": metrics["value"].quantile(0.99),
        "peak": metrics["value"].max(),
        "peak_to_avg": metrics["value"].max() / metrics["value"].mean(),
    }

    # 3. Fit forecasting model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
    )

    prophet_data = metrics.rename(columns={"timestamp": "ds", "value": "y"})
    model.fit(prophet_data)

    # 4. Generate forecast
    future = model.make_future_dataframe(periods=forecast_months * 30)
    forecast = model.predict(future)

    # 5. Compute prediction intervals
    capacity_forecast = forecast[forecast["ds"] > metrics["timestamp"].max()]
    return {
        "service": service_name,
        "baseline": baseline,
        "forecast": {
            "p50": capacity_forecast["yhat"].values,
            "p10": capacity_forecast["yhat_lower"].values,
            "p90": capacity_forecast["yhat_upper"].values,
            "dates": capacity_forecast["ds"].values,
        },
        "model": model,
    }
```

### Prometheus API Integration

```python
import requests
from datetime import datetime, timedelta

class PrometheusClient:
    def __init__(self, base_url):
        self.base_url = base_url

    def query_range(self, query, start, end, step):
        params = {
            "query": query,
            "start": start.timestamp(),
            "end": end.timestamp(),
            "step": step,
        }
        response = requests.get(f"{self.base_url}/api/v1/query_range", params=params)
        return response.json()

    def get_service_utilization(self, service, hours=72):
        query = f'capacity:service:cpu_utilization_pct{{service="{service}"}}'
        end = datetime.now()
        start = end - timedelta(hours=hours)
        return self.query_range(query, start, end, "300")
```

## Operational Playbooks

### Playbook: Weekly Capacity Review

Purpose: Monitor for emerging capacity constraints before they become critical.

Steps:
1. Check capacity dashboard for any services in Red or Orange headroom
2. Review top-10 fastest-growing services for the week
3. Check any forecast accuracy degradation alerts
4. Verify procurement orders are on track
5. Update Jira capacity tickets with latest data
6. Escalate if any service has less than 2 weeks of headroom remaining

### Playbook: Post-Incident Capacity Review

Purpose: After any capacity-related incident, determine root cause and prevent recurrence.

Steps:
1. Collect incident timeline with utilization metrics
2. Determine if incident was caused by: unexpected traffic spike (prediction failure), delayed procurement (process failure), configuration error (human error), or vendor outage (dependency failure)
3. Review forecast accuracy for affected service
4. Identify what failed in the prediction or execution chain
5. Implement corrective actions: model improvement, threshold adjustment, procurement process change
6. Update runbooks with incident-specific procedures

### Playbook: Quarterly Planning Cycle

Purpose: Systematic quarterly review and re-forecast.

Timeline:
- Week -4: Pull all metrics, clean data, identify anomalies
- Week -3: Run forecasting models, review with team
- Week -2: Service owner review meetings (30 min each)
- Week -1: Finalize forecast, compute procurement needs
- Week 0: Present to leadership, get approvals
- Week +1: Place all procurement orders
- Week +2: Update autoscale boundaries for next quarter

Output: Quarterly capacity plan document, updated forecast models, procurement requests, budget impact analysis.
