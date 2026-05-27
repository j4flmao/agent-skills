# Error Budget Policy Design

## Overview

Error budgets translate reliability targets into operational currency. They define how much unreliability is acceptable, when to slow down feature delivery, and how to make data-driven trade-offs between velocity and stability.

## Budget Calculation

### Monthly Window Calculation

```
Error Budget = (1 - SLO) × Total Events

Example:
  SLO = 99.9% (3-nines)
  Total requests per month = 10,000,000
  Error Budget = (1 - 0.999) × 10,000,000 = 10,000 errors/month
```

### Rolling Window Calculation

```
Error Budget = (1 - SLO) × Events in Window

Example:
  SLO = 99.9%
  Window = 28 days (rolling)
  Requests in last 28 days = 8,500,000
  Error Budget = (1 - 0.999) × 8,500,000 = 8,500 errors
  Consumed = actual errors in window = 3,200
  Remaining = 8,500 - 3,200 = 5,300 (62.4%)
```

### Window Type Comparison

| Window Type | Pros | Cons | Best For |
|-------------|------|------|----------|
| Calendar month | Simple, predictable, aligns with business cycles | Edge-of-month behavior, budget resets abruptly | Tier 3 services, internal tools |
| Rolling 28-day | Smooth, no reset cliff, consistent window | Complex to explain, varies by day | Tier 1 and 2 services, customer-facing |
| Rolling 7-day | Fast feedback, catches burn quickly | Very volatile, frequent alerts | High-traffic services, during launches |
| Hybrid (rolling + monthly floor) | Best of both: smooth tracking + monthly minimum | Complex to implement | Critical infrastructure |

### Consumption Rate

```python
# error_budget_calculator.py
from datetime import datetime, timedelta
from typing import Dict, List

class ErrorBudget:
    def __init__(self, slo: float, window_days: int = 28):
        self.slo = slo
        self.window_days = window_days
        self.total_budget = 1.0 - slo
    
    def calculate_consumption(
        self,
        events: List[Dict],
        window_end: datetime = None
    ) -> Dict:
        if window_end is None:
            window_end = datetime.utcnow()
        window_start = window_end - timedelta(days=self.window_days)
        
        total_requests = 0
        total_errors = 0
        
        for event in events:
            timestamp = event['timestamp']
            if window_start <= timestamp <= window_end:
                total_requests += event.get('total', 0)
                total_errors += event.get('errors', 0)
        
        allowed_errors = total_requests * self.total_budget
        consumed_ratio = total_errors / allowed_errors if allowed_errors > 0 else 0
        remaining_ratio = 1.0 - consumed_ratio
        
        return {
            'window_start': window_start.isoformat(),
            'window_end': window_end.isoformat(),
            'total_requests': total_requests,
            'total_errors': total_errors,
            'allowed_errors': allowed_errors,
            'consumed_ratio': consumed_ratio,
            'remaining_ratio': remaining_ratio,
            'remaining_absolute': max(0, allowed_errors - total_errors),
            'burn_rate': consumed_ratio / self.window_days,
        }
    
    def project_exhaustion(
        self,
        current_consumption: float,
        days_elapsed: int
    ) -> Dict:
        """
        Project when budget will exhaust at current burn rate.
        """
        if current_consumption <= 0:
            return {'exhaustion_date': None, 'days_remaining': self.window_days}
        
        daily_burn_rate = current_consumption / days_elapsed
        remaining_budget = self.total_budget - current_consumption
        
        if daily_burn_rate <= 0:
            return {'exhaustion_date': None, 'days_remaining': self.window_days}
        
        days_until_exhaustion = remaining_budget / daily_burn_rate
        
        return {
            'daily_burn_rate': daily_burn_rate,
            'remaining_budget': remaining_budget,
            'days_until_exhaustion': days_until_exhaustion,
            'exhaustion_date': (
                datetime.utcnow() + timedelta(days=days_until_exhaustion)
            ).isoformat(),
        }
```

## Consumption Rate Monitoring

### Burn Rate Alerting

Burn rate measures how fast the error budget is consumed relative to the SLO. A burn rate of 1 means consuming at the exact rate the SLO allows.

```
Burn Rate = Actual Error Rate / Allowed Error Rate

Example:
  SLO = 99.9%, allowed error rate = 0.1%
  Actual error rate = 0.5%
  Burn Rate = 0.5% / 0.1% = 5x
  Budget consumed 5x faster than expected
```

### Burn Rate Alert Thresholds

| Alert Level | Burn Rate | Time to Exhaustion | Action |
|-------------|-----------|-------------------|--------|
| Warning | 2x | 14 days | Notify on-call, investigate |
| Critical | 5x | 5.6 days | Page SRE team, prepare rollback |
| Emergency | 10x | 2.8 days | Incident declared, auto-rollback |
| Meltdown | 20x | 1.4 days | Full incident response, escalate to VP Eng |

### Multi-Window Burn Rate Alerts

```yaml
# burn-rate-alerts.yaml
alerts:
  - name: error-budget-burn-rate-fast
    description: "High burn rate over short window - immediate attention"
    window: 1h
    burn_rate_threshold: 14
    severity: critical
    notification: pagerduty
    slo: 99.9
    condition:
      type: burn_rate
      evaluation: |
        rate(sli_errors_total[1h]) / rate(sli_total[1h])
        > (1 - 0.999) * 14
  
  - name: error-budget-burn-rate-medium
    description: "Moderate burn rate over medium window"
    window: 6h
    burn_rate_threshold: 6
    severity: warning
    notification: slack
    slo: 99.9
    condition:
      type: burn_rate
      evaluation: |
        rate(sli_errors_total[6h]) / rate(sli_total[6h])
        > (1 - 0.999) * 6

  - name: error-budget-burn-rate-slow
    description: "Slow burn rate over long window - gradual degradation"
    window: 3d
    burn_rate_threshold: 2
    severity: info
    notification: email-digest
    slo: 99.9
    condition:
      type: burn_rate
      evaluation: |
        sum(sli_errors_total[3d]) / sum(sli_total[3d])
        > (1 - 0.999) * 2

  - name: error-budget-exhaustion-warning
    description: "Error budget below 25% remaining"
    window: 28d
    remaining_threshold: 0.25
    severity: warning
    notification: slack
  
  - name: error-budget-exhausted
    description: "Error budget fully consumed"
    window: 28d
    remaining_threshold: 0.0
    severity: critical
    notification: pagerduty
```

## Budget Exhaustion Actions

### Action Matrix

| Budget Remaining | Deployment Policy | Change Velocity | Engineering Focus | Communication |
|-----------------|-------------------|-----------------|-------------------|---------------|
| > 50% | Normal deploys | Full speed | Features + reliability | No special |
| 25-50% | Rate-limited deploys | Reduced (50%) | 70% features / 30% reliability | Weekly status |
| 10-25% | Freeze feature deploys | Emergency only | 100% reliability | Daily standup |
| < 10% | Freeze all deploys | Zero changes | Incident response | Hourly updates |
| 0% (exhausted) | Rollback to last good | Only reverts | War room | Alert all eng |

### Deployment Freeze Implementation

```yaml
# deployment-freeze-policy.yaml
freeze_policy:
  triggers:
    - condition: "error_budget_remaining < 0.25"
      action: "feature_freeze"
    - condition: "error_budget_remaining < 0.10"
      action: "full_freeze"
    - condition: "burn_rate > 10 for 1h"
      action: "auto_rollback"
  
  feature_freeze:
    allowed_changes:
      - "Reverts of recent feature deploys"
      - "Bug fixes for the reliability issue"
      - "Infrastructure scaling changes"
      - "Configuration to mitigate the issue"
      - "Security patches (after security review)"
    blocked_changes:
      - "New feature deploys"
      - "Non-critical dependency upgrades"
      - "Infrastructure migrations"
      - "Database schema changes"
      - "New third-party integrations"
  
  full_freeze:
    allowed_changes:
      - "Reverts of any change in the last 48 hours"
      - "Emergency configuration changes"
      - "Scaling changes to handle load"
    blocked_changes:
      - "All other changes"
      - "Deploys to any environment"
      - "Feature flag changes"
      - "New releases"
  
  exception_process:
    requires_approval: true
    approvers:
      - vp_engineering
      - head_of_sre
    documentation_required: true
    time_limit_hours: 4
```

### Auto-Rollback Script

```python
# auto_rollback.py
import subprocess
import json
import requests
from datetime import datetime

class AutoRollback:
    def __init__(self, config: dict):
        self.config = config
        self.deployment_api = config['deployment_api']
        self.rollback_threshold = config['rollback_threshold']
    
    def check_and_rollback(self, service: str, deployment_id: str):
        burn_rate = self.get_current_burn_rate(service)
        
        if burn_rate > self.rollback_threshold:
            print(f"CRITICAL: Burn rate {burn_rate:.1f}x exceeds threshold {self.rollback_threshold}x")
            
            # Find previous stable deployment
            previous = self.get_previous_stable_deployment(service)
            
            if previous:
                print(f"Auto-rolling back {service} from {deployment_id} to {previous['id']}")
                self.execute_rollback(service, previous['id'])
                self.notify_team(service, deployment_id, previous['id'])
            else:
                print("ERROR: No stable previous deployment found")
                self.escalate_to_human(service, deployment_id)
    
    def get_current_burn_rate(self, service: str) -> float:
        response = requests.get(
            f"{self.config['metrics_api']}/burn-rate/{service}",
            timeout=5
        )
        return response.json()['burn_rate']
    
    def get_previous_stable_deployment(self, service: str) -> dict | None:
        response = requests.get(
            f"{self.config['deployment_api']}/services/{service}/deployments",
            params={'status': 'stable', 'limit': 1},
            timeout=5
        )
        deployments = response.json()
        return deployments[0] if deployments else None
    
    def execute_rollback(self, service: str, target_deployment_id: str):
        result = subprocess.run([
            'deployctl', 'rollback', service,
            '--to', target_deployment_id,
            '--reason', 'auto-rollback: error budget exhausted'
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"Rollback failed: {result.stderr}")
    
    def notify_team(self, service: str, from_id: str, to_id: str):
        message = {
            'channel': '#sre-alerts',
            'text': (
                f"🚨 Auto-rollback triggered for {service}\n"
                f"From: {from_id}\n"
                f"To: {to_id}\n"
                f"Time: {datetime.utcnow().isoformat()}"
            )
        }
        requests.post(self.config['slack_webhook'], json=message)
    
    def escalate_to_human(self, service: str, deployment_id: str):
        message = {
            'channel': '#sre-oncall',
            'text': (
                f"🚨 CRITICAL: Auto-rollback failed for {service}\n"
                f"Deployment: {deployment_id}\n"
                f"Reason: No stable previous deployment found\n"
                f"Manual intervention required immediately!"
            )
        }
        requests.post(self.config['pagerduty_api'], json={
            'service': service,
            'deployment': deployment_id,
            'severity': 'critical',
            'action': 'manual_rollback_required'
        })
```

## Multi-Service Budgeting

### Composite Budget Model

```yaml
# composite-budget.yaml
composite_error_budget:
  name: "user-facing-platform"
  services:
    - name: "api-gateway"
      slo: 99.99
      weight: 0.4
      criticality: tier1
    - name: "user-service"
      slo: 99.95
      weight: 0.3
      criticality: tier1
    - name: "payment-service"
      slo: 99.99
      weight: 0.2
      criticality: tier1
    - name: "notification-service"
      slo: 99.9
      weight: 0.1
      criticality: tier2
  
  calculation: weighted_average
  alerting:
    composite_threshold: 0.25
    individual_alert: true
    min_service_threshold: 0.10
```

### Shared Budget Pool

```yaml
# shared-budget-pool.yaml
budget_pool:
  name: "internal-tools-pool"
  total_budget: 0.01  # 1% shared across all tools
  services:
    - name: "admin-dashboard"
      slo: 99.0
      allocation: 0.4
    - name: "reporting-tool"
      slo: 99.0
      allocation: 0.3
    - name: "deployment-manager"
      slo: 99.5
      allocation: 0.3
  
  policy:
    excess_usage: "borrow_from_pool"
    pool_exhaustion: "all_services_frozen"
    replenish_rate: "0.1% per week"
```

## Policy Exceptions

### Exception Categories

```yaml
# error-budget-exceptions.yaml
exception_policy:
  categories:
    - name: "known_issue"
      description: "Known reliability issue being tracked with fix in progress"
      max_duration_days: 30
      approval: "team_lead"
      auto_revoke: true
      require_slo_recovery_plan: true
    
    - name: "business_decision"
      description: "Deliberate decision to accept risk for business reason"
      max_duration_days: 90
      approval: "vp_engineering"
      auto_revoke: true
      require_business_justification: true
    
    - name: "infrastructure_migration"
      description: "Temporary degradation during planned migration"
      max_duration_days: 60
      approval: "sre_lead"
      auto_revoke: true
      require_migration_plan: true
    
    - name: "third_party_outage"
      description: "Budget consumption caused by external dependency failure"
      max_duration_days: 7
      approval: "oncall_lead"
      auto_revoke: true
      require_incident_number: true

  exceptions:
    - id: "ERRB-2025-001"
      service: "data-pipeline"
      category: "known_issue"
      reason: "Known memory leak in v3.2.1, fix scheduled for v3.3.0"
      budget_impact: 0.15
      start_date: "2025-01-10"
      expiry_date: "2025-02-10"
      approved_by: "team-lead-alpha"
      status: "active"
```

## Error Budget Dashboard

### Dashboard Configuration

```yaml
# error-budget-dashboard.yaml
dashboard:
  title: "Error Budget Overview"
  refresh_interval: 60
  
  widgets:
    - title: "Budget Remaining (All Services)"
      type: "gauge_grid"
      services:
        - name: "api-gateway"
          slo: 99.99
        - name: "user-service"
          slo: 99.95
        - name: "payment-service"
          slo: 99.99
      color_thresholds:
        - range: [0.5, 1.0]
          color: "green"
        - range: [0.25, 0.5]
          color: "yellow"
        - range: [0.0, 0.25]
          color: "red"
    
    - title: "Burn Rate (Last 7 Days)"
      type: "timeseries"
      metrics: ["burn_rate"]
      alert_threshold: 2.0
      critical_threshold: 5.0
    
    - title: "Budget Consumption by Service"
      type: "bar_chart"
      aggregation: "stacked"
      breakdown_by: "error_type"
    
    - title: "Deployments vs Budget"
      type: "scatter_plot"
      x_axis: "deployment_count"
      y_axis: "budget_consumed"
      tooltip: "service_name"
    
    - title: "SLO Attainment (30d Rolling)"
      type: "heatmap"
      aggregation: "daily"
      services:
        - "api-gateway"
        - "user-service"
        - "payment-service"
    
    - title: "Exception Tracker"
      type: "table"
      columns:
        - "id"
        - "service"
        - "category"
        - "expiry"
        - "status"
```

### Alert Integration

```python
# error_budget_alerts.py
import json
import requests
from typing import Dict

class BudgetAlertManager:
    def __init__(self, config: Dict):
        self.slack_webhook = config['slack_webhook']
        self.pagerduty_key = config['pagerduty_key']
    
    def evaluate_and_alert(self, budget_data: Dict):
        remaining = budget_data['remaining_ratio']
        service = budget_data['service']
        burn_rate = budget_data['burn_rate']
        
        if remaining <= 0:
            self.send_pagerduty(
                severity='critical',
                title=f"Error Budget Exhausted: {service}",
                details=budget_data
            )
        elif remaining < 0.10:
            self.send_pagerduty(
                severity='warning',
                title=f"Error Budget Critical: {service}",
                details=budget_data
            )
        elif remaining < 0.25:
            self.send_slack(
                channel='#sre-alerts',
                text=f"⚠️ {service} error budget at {remaining:.1%} - burn rate {burn_rate:.1f}x"
            )
        elif burn_rate > 5:
            self.send_slack(
                channel='#sre-alerts',
                text=f"🔥 {service} burn rate {burn_rate:.1f}x - investigate immediately"
            )
    
    def send_slack(self, channel: str, text: str):
        requests.post(self.slack_webhook, json={
            'channel': channel,
            'text': text
        })
    
    def send_pagerduty(self, severity: str, title: str, details: Dict):
        requests.post(
            'https://events.pagerduty.com/v2/enqueue',
            json={
                'routing_key': self.pagerduty_key,
                'event_action': 'trigger',
                'payload': {
                    'summary': title,
                    'severity': severity,
                    'source': 'error-budget-monitor',
                    'custom_details': details
                }
            }
        )
```

## Key Points

- Error budgets = (1 - SLO) × total events; use rolling 28-day windows for Tier 1 services
- Burn rate alerts with multi-window detection (1h, 6h, 3d) catch both fast and slow budget consumption
- Exhaustion actions follow a graduated response: feature freeze → full freeze → auto-rollback
- Multi-service budgeting uses weighted composites to prevent one service exhausting shared capacity
- Policy exceptions require structured approval, time limits, and auto-revocation
- Dashboard visibility with color-coded gauges keeps the entire engineering org informed
- Auto-rollback mechanisms provide a safety net when budget exhausts after a deploy
- Regular budget reviews (post-incident, quarterly) drive SLO refinement and reliability investment
