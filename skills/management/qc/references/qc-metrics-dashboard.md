# QC Metrics Dashboard

## Overview

A quality metrics dashboard centralizes code quality data from multiple sources into a single, visible, and actionable view. It enables teams to track quality trends, identify regressions early, and make data-driven decisions about where to invest quality improvement effort.

## Dashboard Design Principles

- **Single source of truth**: All quality metrics come from the same pipeline and tool chain
- **Trends over snapshots**: A single data point is noise; trends reveal the signal
- **Actionability**: Every metric should drive a decision or action
- **Visibility**: Display on a team-visible monitor or embedded in team communication tools
- **Context**: Compare current values against targets, historical baselines, and team averages
- **Simplicity**: Don't show everything — show the metrics that matter most
- **Automation**: Data refreshes automatically from CI and tooling APIs
- **Democratization**: Every engineer can access and understand the dashboard

## Core Metrics

### Gate Compliance Metrics

| Metric | Definition | Target | Formula |
|--------|------------|--------|---------|
| Gate Pass Rate | Percentage of PRs passing all quality gates | > 90% | PRs passed / total PRs × 100 |
| First-Pass Rate | Percentage of PRs passing on first attempt | > 70% | First-pass PRs / total PRs × 100 |
| Gate Override Rate | Percentage of PRs using gate exceptions | < 5% | Exceptions / total PRs × 100 |
| Average Gate Duration | Time from PR creation to all gates passing | < 30 min | Sum of gate durations / PR count |
| Blocking Gate Count | Number of PRs currently blocked by gates | < 5 | Count of PRs with failing gates |

### Coverage Metrics

| Metric | Definition | Target | Formula |
|--------|------------|--------|---------|
| Overall Line Coverage | Lines executed / total lines | > 80% | Executed lines / total lines × 100 |
| Overall Branch Coverage | Branches executed / total branches | > 75% | Executed branches / total branches × 100 |
| New Code Coverage | Coverage on code added/modified this period | > 90% | Executed new lines / total new lines × 100 |
| Module Coverage Min | Coverage of the lowest-covered module | > 60% | Min(module_coverage) |
| Module Coverage StdDev | Variation in coverage across modules | < 15% | StdDev of all module coverage values |
| Test to Code Ratio | Lines of test code / lines of production code | 1:1 to 1.5:1 | Test LOC / production LOC |
| Mutation Score | Percentage of mutants killed by tests | > 70% | Killed mutants / total mutants × 100 |

### Defect Metrics

| Metric | Definition | Target | Formula |
|--------|------------|--------|---------|
| Defect Density | Defects per thousand lines of code | < 2/KLOC | Total defects / KLOC |
| Critical Defect Count | Open critical severity defects | 0 | Count of critical defects |
| Defect Arrival Rate | New defects per week | < 5 | Count of new defects / week |
| Defect Fix Rate | Defects closed per week | > Arrival rate | Count of closed defects / week |
| Mean Time to Fix | Average time from report to resolution | < 7 days | Sum(fix times) / fixed defects |
| Defect Reopen Rate | Percentage of defects reopened after fix | < 5% | Reopened / total fixed × 100 |

### Technical Debt Metrics

| Metric | Definition | Target | Formula |
|--------|------------|--------|---------|
| TD Ratio | Remediation cost / development cost | < 10% | Remediation cost / dev cost × 100 |
| Remediation Cost | Estimated effort to fix all issues | Decreasing | SonarQube SQALE estimate |
| New TD Added | Remediation cost of new issues this period | < Dev cost × 3% | SQALE estimate for new issues |
| TD Items by Severity | Count of items per severity level | 0 blocker/critical | SonarQube issue count |
| TD Paydown Rate | Remediation cost resolved per sprint | > New TD added | Resolved cost / sprint |
| Time to Remediation | Average age of open TD items | < 30 days | Sum(item ages) / item count |

### Complexity Metrics

| Metric | Definition | Target | Formula |
|--------|------------|--------|---------|
| Average Cyclomatic Complexity | Mean complexity per function | < 8 | Sum of complexities / function count |
| Function Complexity > 10 | Functions exceeding complexity limit | < 5% of all functions | Count(complexity > 10) / total functions |
| File Complexity > 50 | Files exceeding file complexity limit | 0 | Count of files exceeding limit |
| Cognitive Complexity Average | Mean cognitive complexity per function | < 12 | Sum of cog complexities / function count |
| Deeply Nested Code | Functions with nesting > 4 levels | < 2% of functions | Count(nesting > 4) / total functions |
| Long Functions | Functions exceeding 50 lines | < 5% of functions | Count(lines > 50) / total functions |

### Dependency Metrics

| Metric | Definition | Target | Formula |
|--------|------------|--------|---------|
| Critical Vulnerabilities | Unresolved critical severity | 0 | Count of critical vulns |
| High Vulnerabilities | Unresolved high severity | < 3 | Count of high vulns |
| Total Vulnerabilities | All unresolved vulnerabilities | < 20 | Count of all vulns |
| Outdated Dependencies | Dependencies behind latest major/minor | < 10% | Outdated / total dependencies × 100 |
| Dependency Count | Total direct + transitive dependencies | Tracked | Count all dependencies |
| License Violations | Dependencies with incompatible licenses | 0 | Count of license issues |

### Test Health Metrics

| Metric | Definition | Target | Formula |
|--------|------------|--------|---------|
| Test Pass Rate | Percentage of tests passing | 100% | Passed / total × 100 |
| Test Count | Number of automated tests | Increasing | Count all tests |
| Flaky Test Rate | Tests that pass/fail inconsistently | < 1% | Flaky / total tests × 100 |
| Average Test Duration | Mean time per test | < 100ms | Total test time / test count |
| Slowest Test Duration | Duration of slowest test | < 10s | Max(test durations) |
| Suite Duration | Total time for full test suite | < 30 min | Sum of all test times |

## Dashboard Layouts

### Executive Dashboard (1-Page Overview)

```
┌────────────────────────────────────────────────────────────┐
│ Quality Dashboard — Q2 2026         Score: 84/100 (+3)    │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Coverage │ TD Ratio │ Gate     │ Defect   │ Build          │
│ 82%      │ 8%       │ 94%      │ 1.2/KLOC │ 12m 30s        │
│ +2%      │ -1%      │ +3%      │ -0.3     │ -1m            │
├──────────┴──────────┴──────────┴──────────┴────────────────┤
│ Trends (8 weeks)                                           │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [Line chart: coverage, td_ratio, gate_pass_rate]     │   │
│ └──────────────────────────────────────────────────────┘   │
├──────────────────┬─────────────────────────────────────────┤
│ Open TD Items    │ Gate Failures (Last 24h)                │
│ Critical: 0      │ 1. payment-service coverage dip         │
│ High: 12         │ 2. search-api complexity violation      │
│ Medium: 34       │                                         │
│ Low: 89          │                                         │
├──────────────────┴─────────────────────────────────────────┤
│ Module Breakdown                                            │
│ Module        │ Coverage │ Complexity │ Defects │ TD Ratio │
│ payment-svc   │ 88%      │ 7.2        │ 0.8/K   │ 5%       │
│ search-api    │ 72%      │ 11.4       │ 2.1/K   │ 14%      │
│ user-service  │ 91%      │ 5.3        │ 0.4/K   │ 3%       │
│ notification  │ 78%      │ 8.9        │ 1.5/K   │ 9%       │
└────────────────────────────────────────────────────────────┘
```

### Engineering Team Dashboard (Detailed)

```
┌──────────────────────────────────────────────────────────────────┐
│ Team Alpha — Quality Dashboard                     Sprint 24    │
├──────────────────────────────────────────────────────────────────┤
│ Quality Score: 86 (+2 from Sprint 23)       Target: 80          │
├──────────────┬───────┬────────┬────────┬────────────────────────┤
│ Metric       │ Value │ Target │ Trend  │ Sparkline              │
├──────────────┼───────┼────────┼────────┼────────────────────────┤
│ Gate Pass %  │ 96%   │ > 90%  │ UP     │ ████▇▇███████▇████     │
│ Coverage %   │ 84%   │ > 80%  │ UP     │ ▇▇▇████▇▇███████▇█     │
│ TD Ratio %   │ 7%    │ < 10%  │ DOWN   │ ███████▇▇▇▇███▇▇▇      │
│ Defects/KLOC │ 1.0   │ < 2.0  │ DOWN   │ ███▇▇▇██▇▇▇▇▇▇▇▇       │
│ Complexity   │ 6.8   │ < 8    │ DOWN   │ █████▇▇███▇▇▇▇█▇       │
│ Build Time   │ 8m    │ < 15m  │ STABLE │ ██████████████████      │
├──────────────┴───────┴────────┴────────┴────────────────────────┤
│ Alerts                                                          │
│ ⚠ notification-svc coverage dropped 73% → 68% (2 weeks)        │
│ ⚠ search-api 4 functions exceed complexity limit                │
│ ✅ payment-svc TD ratio reduced from 8% to 5%                   │
├──────────────────────────────────────────────────────────────────┤
│ Technical Debt Backlog (Top 5)                                   │
│ ┌──┬─────────────┬──────────────┬──────┬──────┬──────────┐      │
│ │# │ Module      │ Issue        │ Sev  │ Eff  │ Owner    │      │
│ ├──┼─────────────┼──────────────┼──────┼──────┼──────────┤      │
│ │ 1│ search-api  │ No retry     │ Crit │ 2d   │ Alice    │      │
│ │ 2│ search-api  │ High complex │ High │ 3d   │ Alice    │      │
│ │ 3│ payment-svc │ Dead code    │ Med  │ 1d   │ Bob      │      │
│ │ 4│ notif-svc   │ Low coverage │ High │ 4d   │ Carol    │      │
│ │ 5│ user-svc    │ Dep vulns    │ High │ 0.5d │ Dave     │      │
│ └──┴─────────────┴──────────────┴──────┴──────┴──────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

## Implementation Patterns

### Data Collection Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│ CI Pipeline  │───▶│ Data          │───▶│ Metrics Database │
│ (GitHub      │    │ Collector     │    │ (InfluxDB/      │
│  Actions)    │    │ (Custom/     │    │  TimescaleDB)   │
└─────────────┘    │  API pulls)   │    └────────┬────────┘
                   └──────────────┘             │
┌─────────────┐                                 │
│ SonarQube   │─────────────────────────────────┤
└─────────────┘                                 │
                                                ▼
┌─────────────┐                          ┌─────────────────┐
│ Code Host   │─────────────────────────▶│ Dashboard UI    │
│ (GitHub/    │                          │ (Grafana/       │
│  GitLab)    │                          │  Custom Web)    │
└─────────────┘                          └─────────────────┘
```

### Data Collection Script Example

```python
import requests
import json
from datetime import datetime, timedelta

class QualityMetricsCollector:
    def __init__(self, sonarqube_url, github_token, sonarqube_token):
        self.sonarqube = sonarqube_url
        self.github_token = github_token
        self.sonarqube_token = sonarqube_token
        self.metrics = {}

    def collect_coverage(self, project_key):
        url = f"{self.sonarqube}/api/measures/component"
        params = {
            "component": project_key,
            "metricKeys": "coverage,branch_coverage,line_coverage,new_coverage"
        }
        headers = {"Authorization": f"Bearer {self.sonarqube_token}"}
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            measures = response.json().get("component", {}).get("measures", [])
            for measure in measures:
                self.metrics[measure["metric"]] = float(measure["value"])
        return self.metrics

    def collect_complexity(self, project_key):
        url = f"{self.sonarqube}/api/measures/component"
        params = {
            "component": project_key,
            "metricKeys": "complexity,cognitive_complexity,function_complexity"
        }
        headers = {"Authorization": f"Bearer {self.sonarqube_token}"}
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            measures = response.json().get("component", {}).get("measures", [])
            for measure in measures:
                self.metrics[measure["metric"]] = float(measure["value"])
        return self.metrics

    def collect_gate_status(self, project_key):
        url = f"{self.sonarqube}/api/qualitygates/project_status"
        params = {"projectKey": project_key}
        headers = {"Authorization": f"Bearer {self.sonarqube_token}"}
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            status = response.json().get("projectStatus", {}).get("status", "")
            self.metrics["gate_status"] = 1 if status == "OK" else 0
        return self.metrics

    def collect_pr_metrics(self, repo, days=7):
        url = f"https://api.github.com/repos/{repo}/pulls"
        headers = {
            "Authorization": f"Bearer {self.github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        since = (datetime.now() - timedelta(days=days)).isoformat()
        params = {"state": "all", "since": since, "per_page": 100}
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            pulls = response.json()
            total = len(pulls)
            passed = sum(1 for p in pulls if p.get("merged_at"))
            self.metrics["pr_total"] = total
            self.metrics["pr_passed"] = passed
            self.metrics["pr_pass_rate"] = round(passed / total * 100, 1) if total > 0 else 0
        return self.metrics

    def collect_dependency_vulns(self, project_key):
        url = f"{self.sonarqube}/api/measures/component"
        params = {
            "component": project_key,
            "metricKeys": "vulnerabilities,security_rating,security_hotspots"
        }
        headers = {"Authorization": f"Bearer {self.sonarqube_token}"}
        response = requests.get(url, params=params, headers=headers)
        if response.status_code == 200:
            measures = response.json().get("component", {}).get("measures", [])
            for measure in measures:
                self.metrics[measure["metric"]] = float(measure.get("value", 0))
        return self.metrics

    def export_metrics(self):
        return {
            "timestamp": datetime.now().isoformat(),
            "metrics": self.metrics
        }
```

### Grafana Dashboard JSON Model

```json
{
  "dashboard": {
    "title": "Code Quality Dashboard",
    "tags": ["quality", "engineering"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Quality Score",
        "type": "gauge",
        "gridPos": {"h": 4, "w": 4, "x": 0, "y": 0},
        "targets": [{"expr": "quality_score", "legendFormat": "Score"}],
        "options": {
          "min": 0,
          "max": 100,
          "thresholds": [
            {"color": "red", "value": 60},
            {"color": "yellow", "value": 80},
            {"color": "green", "value": 90}
          ]
        }
      },
      {
        "id": 2,
        "title": "Gate Pass Rate (7d)",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 4, "y": 0},
        "targets": [{"expr": "gate_pass_rate", "legendFormat": "Pass Rate"}],
        "options": {
          "colorMode": "background",
          "thresholds": [
            {"color": "red", "value": 80},
            {"color": "yellow", "value": 90},
            {"color": "green", "value": null}
          ]
        }
      },
      {
        "id": 3,
        "title": "Coverage Trend",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
        "targets": [
          {"expr": "avg_over_time(coverage_percent[7d])", "legendFormat": "Coverage"},
          {"expr": "avg_over_time(target_coverage[7d])", "legendFormat": "Target"}
        ],
        "options": {
          "legend": {"displayMode": "table", "placement": "bottom"}
        }
      },
      {
        "id": 4,
        "title": "Technical Debt Ratio",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
        "targets": [{"expr": "td_ratio_percent", "legendFormat": "TD Ratio"}],
        "options": {
          "thresholds": [
            {"color": "green", "value": 10},
            {"color": "yellow", "value": 20},
            {"color": "red", "value": null}
          ]
        }
      },
      {
        "id": 5,
        "title": "Module Coverage Breakdown",
        "type": "bargauge",
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 12},
        "targets": [{"expr": "module_coverage", "legendFormat": "{{module}}"}],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient",
          "showUnfilled": true
        }
      },
      {
        "id": 6,
        "title": "Top Technical Debt Items",
        "type": "table",
        "gridPos": {"h": 8, "w": 16, "x": 8, "y": 12},
        "targets": [{"expr": "td_items", "legendFormat": "TD Items"}],
        "options": {
          "sortBy": [{"displayName": "Severity", "desc": true}]
        }
      },
      {
        "id": 7,
        "title": "Build Duration (7d)",
        "type": "timeseries",
        "gridPos": {"h": 6, "w": 12, "x": 0, "y": 20},
        "targets": [{"expr": "build_duration_seconds", "legendFormat": "Duration"}],
        "options": {}
      },
      {
        "id": 8,
        "title": "Defect Density by Module",
        "type": "heatmap",
        "gridPos": {"h": 6, "w": 12, "x": 12, "y": 20},
        "targets": [{"expr": "defect_density", "legendFormat": "{{module}}"}]
      }
    ],
    "refresh": "5m",
    "time": {"from": "now-30d", "to": "now"}
  }
}
```

## Metric Collection and Storage

### Prometheus Metric Exporter

```python
from prometheus_client import start_http_server, Gauge
import time
import requests

class QualityExporter:
    def __init__(self, port=8000):
        self.port = port
        self.gauges = {}

    def create_gauge(self, name, description, labels=None):
        if labels:
            self.gauges[name] = Gauge(name, description, labels)
        else:
            self.gauges[name] = Gauge(name, description)

    def collect_and_export(self):
        sonarqube_data = self.fetch_sonarqube_metrics()
        github_data = self.fetch_github_metrics()
        test_data = self.fetch_test_metrics()

        for key, value in sonarqube_data.items():
            if key in self.gauges:
                self.gauges[key].set(value)

        for key, value in github_data.items():
            if key in self.gauges:
                self.gauges[key].set(value)

        for key, value in test_data.items():
            if key in self.gauges:
                self.gauges[key].set(value)

    def fetch_sonarqube_metrics(self):
        url = "https://sonarcloud.io/api/measures/component"
        params = {
            "component": "org:project",
            "metricKeys": "coverage,complexity,duplicated_lines_density,violations,code_smells,bugs,vulnerabilities,security_hotspots_reviewed,quality_gate_status"
        }
        response = requests.get(url, params=params, headers={"Authorization": "Bearer TOKEN"})
        if response.status_code != 200:
            return {}
        measures = response.json().get("component", {}).get("measures", [])
        return {m["metric"]: float(m.get("value", 0)) for m in measures}

    def fetch_github_metrics(self):
        url = "https://api.github.com/repos/org/repo/stats/code_frequency"
        response = requests.get(url, headers={"Authorization": "Bearer TOKEN"})
        if response.status_code != 200:
            return {}
        data = response.json()
        additions = sum(week[1] for week in data)
        deletions = sum(week[2] for week in data)
        return {"additions": additions, "deletions": abs(deletions)}

    def fetch_test_metrics(self):
        # Mock implementation — in production, read from CI pipeline artifacts
        return {"test_pass_rate": 99.5, "test_count": 1240, "test_duration_seconds": 480}

    def run(self):
        start_http_server(self.port)
        while True:
            self.collect_and_export()
            time.sleep(300)  # Collect every 5 minutes
```

### Custom Metrics API

```yaml
metrics_api:
  endpoints:
    - path: /api/v1/quality/score
      response:
        score: 84
        components:
          coverage: 82
          gate_pass: 94
          td_ratio: 8
          defect_density: 1.2
          complexity: 6.8
          dependency: 95
        trend: +3
        trend_period: 30d
    - path: /api/v1/quality/gates
      response:
        gates:
          - name: coverage
            status: PASS
            value: 82
            threshold: 80
          - name: lint
            status: PASS
            value: 0
            threshold: 0
          - name: complexity
            status: PASS
            value: 6.8
            threshold: 10
          - name: dependencies
            status: FAIL
            value: 2
            threshold: 0
            details: ["cve-2024-1234 in lodash@4.17.20", "cve-2024-5678 in axios@0.21.1"]
    - path: /api/v1/quality/td-items
      response:
        items:
          - id: TD-001
            module: search-api
            description: Missing input validation on search endpoint
            severity: critical
            effort: 2d
            owner: alice
            created: 2026-04-15
            status: in_progress
          - id: TD-002
            module: payment-svc
            description: Dead code in legacy payment processing
            severity: medium
            effort: 1d
            owner: bob
            created: 2026-05-01
            status: backlog
```

## Dashboard Templates

### Team Quality Dashboard (Grafana)

```json
{
  "dashboard": {
    "title": "Team Quality Dashboard",
    "panels": [
      {
        "title": "Quality Score Over Time",
        "type": "timeseries",
        "datasource": "Prometheus",
        "targets": [{"expr": "quality_score", "legendFormat": "score"}]
      },
      {
        "title": "Coverage by Module",
        "type": "bargauge",
        "targets": [{"expr": "module_coverage_percent", "legendFormat": "{{module}}"}]
      },
      {
        "title": "Open Technical Debt",
        "type": "stat",
        "targets": [{"expr": "td_items_count{status=\"open\"}", "legendFormat": "open"}]
      },
      {
        "title": "Build Health",
        "type": "stat",
        "targets": [{"expr": "build_success_rate", "legendFormat": "success"}]
      }
    ]
  }
}
```

### Quality Scorecard (Static Report)

```markdown
# Monthly Quality Scorecard — June 2026

## Executive Summary
- Overall Quality Score: 84/100 (+2 vs last month)
- Gate Compliance: 94% (+1%)
- Production Incidents Prevented by Gates: 3

## Metric Summary

| Category | Metric | Current | Last Month | Target | Status |
|----------|--------|---------|------------|--------|--------|
| Coverage | Overall | 82% | 80% | > 80% | PASS |
| Coverage | New Code | 91% | 88% | > 90% | PASS |
| Defects | Density | 1.2/KLOC | 1.5/KLOC | < 2.0 | PASS |
| Defects | Critical | 0 | 0 | 0 | PASS |
| TD | Ratio | 8% | 9% | < 10% | PASS |
| TD | Remediation Cost | 120h | 135h | < 150h | PASS |
| Complexity | Average | 6.8 | 7.1 | < 8 | PASS |
| Complexity | > 10 functions | 3.2% | 3.8% | < 5% | PASS |
| Dependencies | Critical Vulns | 0 | 1 | 0 | PASS |
| Dependencies | High Vulns | 2 | 4 | < 3 | PASS |
| Gate | Pass Rate | 94% | 93% | > 90% | PASS |
| Gate | Override Rate | 4% | 6% | < 5% | PASS |

## Module Breakdown

| Module | Coverage | Complexity | Defect Density | TD Ratio | Score |
|--------|----------|------------|----------------|----------|-------|
| payment-svc | 88% | 7.2 | 0.8/KLOC | 5% | 91 |
| user-service | 91% | 5.3 | 0.4/KLOC | 3% | 95 |
| search-api | 72% | 11.4 | 2.1/KLOC | 14% | 62 |
| notification | 78% | 8.9 | 1.5/KLOC | 9% | 75 |
| api-gateway | 85% | 6.1 | 0.9/KLOC | 6% | 88 |
| auth-service | 90% | 4.2 | 0.3/KLOC | 2% | 97 |

## Action Items

1. Search API quality improvement sprint (Sprint 25):
   - Reduce complexity of 4 functions exceeding limit
   - Increase coverage from 72% to 80%
   - Resolve 2 high-severity TD items
2. Notification service coverage improvement (Sprint 25-26):
   - Add integration tests for SMS and email channels
3. Dependency review:
   - Address 2 remaining high-severity vulnerabilities
   - Audit outdated dependencies for potential updates
```

## Automated Quality Metrics Pipeline

### CI Job for Metrics Collection

```yaml
name: Quality Metrics Collection
on:
  schedule:
    - cron: "0 6 * * *"  # Daily at 06:00
  workflow_dispatch: {}

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: pip install requests prometheus-client
      - name: Collect quality metrics
        run: python scripts/quality_collector.py
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Export to monitoring
        run: python scripts/export_metrics.py
      - name: Update dashboard
        run: python scripts/update_dashboard.py
      - name: Notify on regression
        run: python scripts/check_regression.py
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
```

## Advanced Dashboard Features

### Predictive Quality Alerts

```python
import numpy as np
from datetime import datetime, timedelta

class QualityPredictor:
    def __init__(self, history):
        self.history = history  # List of {timestamp, metric, value}

    def predict_trend(self, metric, days_ahead=14):
        values = [h["value"] for h in self.history if h["metric"] == metric]
        if len(values) < 7:
            return {"trend": "insufficient_data", "prediction": None}

        x = np.arange(len(values))
        y = np.array(values)
        coeffs = np.polyfit(x, y, 1)
        trend = coeffs[0]

        last_date = max(h["timestamp"] for h in self.history if h["metric"] == metric)
        predicted = values[-1] + trend * days_ahead

        return {
            "trend": "improving" if trend > 0.01 else ("declining" if trend < -0.01 else "stable"),
            "slope": round(trend, 4),
            "predicted_value": round(predicted, 1),
            "prediction_date": (last_date + timedelta(days=days_ahead)).isoformat()
        }

    def detect_regression(self, metric, window_days=14):
        recent = [h for h in self.history if h["metric"] == metric
                  and h["timestamp"] > (datetime.now() - timedelta(days=window_days))]
        if len(recent) < 2:
            return {"regression": False}

        first_half = recent[:len(recent)//2]
        second_half = recent[len(recent)//2:]
        avg_first = np.mean([h["value"] for h in first_half])
        avg_second = np.mean([h["value"] for h in second_half])

        threshold = 0.05
        change = (avg_second - avg_first) / max(avg_first, 0.01)

        return {
            "regression": change < -threshold,
            "improvement": change > threshold,
            "change_percent": round(change * 100, 1)
        }
```

### Regression Detection Rules

| Metric | Window | Change Threshold | Alert Severity |
|--------|--------|-----------------|----------------|
| Coverage | 14 days | -3% | Warning |
| Coverage | 30 days | -5% | Critical |
| TD Ratio | 30 days | +2% | Warning |
| TD Ratio | 60 days | +5% | Critical |
| Gate Pass Rate | 7 days | -5% | Warning |
| Gate Pass Rate | 14 days | -10% | Critical |
| Defect Density | 30 days | +20% | Warning |
| Defect Density | 60 days | +50% | Critical |
| Complexity | 30 days | +10% | Warning |
| Build Duration | 7 days | +50% | Warning |

## Integration with Communication Tools

### Slack Notification Templates

```python
def format_quality_alert(metric, current, target, trend):
    emoji = "green_heart" if trend == "improving" else ("warning" if trend == "declining" else "large_blue_circle")
    return {
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"Quality Alert: {metric}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Current:* {current}"},
                    {"type": "mrkdwn", "text": f"*Target:* {target}"},
                    {"type": "mrkdwn", "text": f"*Trend:* {trend}"}
                ]
            },
            {
                "type": "actions",
                "elements": [
                    {"type": "button", "text": {"type": "plain_text", "text": "View Dashboard"}, "url": "https://grafana.example.com/quality"},
                    {"type": "button", "text": {"type": "plain_text", "text": "Action Items"}, "url": "https://jira.example.com/issues"}
                ]
            }
        ]
    }

def format_weekly_digest(metrics):
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "Weekly Quality Digest"}
        },
        {"type": "divider"}
    ]
    for metric in metrics:
        blocks.append({
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*{metric['name']}*"},
                {"type": "mrkdwn", "text": f"{metric['current']} (target: {metric['target']}) {metric['trend_emoji']}"}
            ]
        })
    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [{"type": "mrkdwn", "text": "Quality dashboard updates every 5 minutes"}]
    })
    return {"blocks": blocks}
```

### Email Report Template

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, sans-serif; }
        .metric { display: inline-block; padding: 20px; margin: 10px; border-radius: 8px; }
        .pass { background: #e6ffe6; border: 1px solid #00cc00; }
        .fail { background: #ffe6e6; border: 1px solid #cc0000; }
        .warning { background: #fffbe6; border: 1px solid #cccc00; }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <h1>Weekly Quality Scorecard</h1>
    <p>Period: {start_date} — {end_date}</p>

    <h2>Overall Score: {score}/100</h2>

    <div class="metric {cover_status}">
        <h3>Coverage</h3>
        <p>{coverage}% (target: {cover_target}%)</p>
    </div>
    <div class="metric {td_status}">
        <h3>TD Ratio</h3>
        <p>{td_ratio}% (target: {td_target}%)</p>
    </div>
    <div class="metric {gate_status}">
        <h3>Gate Pass Rate</h3>
        <p>{gate_rate}% (target: {gate_target}%)</p>
    </div>

    <h2>Detailed Metrics</h2>
    <table>
        <tr>
            <th>Module</th>
            <th>Coverage</th>
            <th>Complexity</th>
            <th>Defects/KLOC</th>
            <th>TD Ratio</th>
            <th>Status</th>
        </tr>
        {module_rows}
    </table>

    <h2>Action Items</h2>
    <ul>
        {action_items}
    </ul>

    <p>Dashboard: <a href="{dashboard_url}">{dashboard_url}</a></p>
</body>
</html>
```

## Dashboard Adoption and Culture

### Metrics That Drive Action

| Metric Type | Example | Action When Negative |
|-------------|---------|---------------------|
| Leading | New code coverage | Stop PRs with uncovered code |
| Lagging | Production defect density | Root cause analysis + process fix |
| Process | Gate pass rate | Review gate thresholds and tooling |
| Outcome | Customer satisfaction | Correlate with quality score |
| Efficiency | Build duration | Optimize CI pipeline |
| Health | TD ratio trend | Allocate more sprint capacity to TD |

### Gamification and Motivation

- **Quality Score Leaderboard**: Display team scores ranked weekly
- **Most Improved**: Recognize the team with the largest quality score increase
- **Zero Bug Club**: Teams that ship a release with zero escape defects
- **TD Paydown Champion**: Individual who resolves the most TD items
- **Gate Guardian**: Team member who catches the most issues in code review

### Dashboard Adoption Checklist

- Dashboard is displayed on a team-visible monitor
- Dashboard link is pinned in the team communication channel
- Quality score is mentioned in daily standup (30 seconds)
- Sprint review includes quality score delta
- New team members are shown the dashboard during onboarding
- Dashboard is used during sprint retro to evaluate quality initiatives
- Engineering managers review team dashboards in 1:1s
- Quarterly quality review uses dashboard data as the primary input
- Threshold changes are discussed and approved by the team
- Dashboard accuracy is verified against source tools monthly

## Operations and Troubleshooting

### Common Dashboard Issues

| Issue | Symptom | Cause | Resolution |
|-------|---------|-------|------------|
| Stale data | Metrics not updating | Collector service down | Restart collector, check API keys |
| Missing metrics | Gaps in dashboard panels | Source tool API changed | Update collector for new API |
| Incorrect values | Metrics don't match source | Data transformation bug | Verify in source tool, fix transform |
| Slow dashboard | Long load times | Too many queries | Reduce query range, add caching |
| Alert fatigue | Too many notifications | Thresholds too sensitive | Adjust thresholds, add cooldown |
| Low engagement | Team ignores dashboard | Metrics not relevant | Survey team, realign metrics |

### Dashboard Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Verify data accuracy | Weekly | Quality engineer |
| Review alert thresholds | Monthly | Team leads |
| Survey team satisfaction | Quarterly | Quality champion |
| Update dashboard layout | Quarterly | DevOps team |
| Add/remove metrics | Quarterly | Engineering team |
| Full dashboard audit | Bi-annual | Quality engineer |
| Tool integration review | Bi-annual | DevOps team |

## Appendix: Metric Calculation Reference

### Rate and Ratio Formulas

```
Gate Pass Rate = Number of PRs passing all gates / Total PRs in period × 100
First-Pass Rate = Number of PRs passing on first attempt / Total PRs in period × 100
Override Rate = Number of PRs with exceptions / Total PRs in period × 100
Defect Density = Total confirmed defects / Total KLOC
TD Ratio = Remediation cost (person-hours) / Development cost (person-hours) × 100
New TD Added = Sum of SQALE remediation cost for new issues in period
New Code Coverage = Covered new lines / Total new lines × 100
Mutation Score = Killed mutants / Total mutants (excluding equivalent) × 100
Flaky Rate = Flaky tests / Total test executions × 100
Defect Reopen Rate = Reopened defects / Total resolved defects × 100
```

### Trend Calculation

```
Slope = linear regression coefficient over N data points
  1. Collect N most recent data points: (x1,y1), (x2,y2), ..., (xN,yN)
  2. Calculate means: x_bar = sum(x)/N, y_bar = sum(y)/N
  3. slope = sum((xi - x_bar)(yi - y_bar)) / sum((xi - x_bar)^2)

Trend Direction:
  slope > 0.01: Improving
  slope < -0.01: Declining
  else: Stable

Change = (current_value - previous_value) / previous_value × 100
```

### Composite Quality Score

```
Raw Score (0-100) = weighted sum of normalized metric scores:

Coverage Score = coverage_percent / target_coverage × 100 (capped at 100)
Gate Score = gate_pass_rate (0-100)
TD Score = max(0, 100 - td_ratio × 10)
Defect Score = max(0, 100 - defect_density × 50)
Complexity Score = max(0, min(100, (15 - avg_complexity) × 10))
Dependency Score = max(0, 100 - critical_vulns × 25 - high_vulns × 5)

Quality Score = 0.25 × Coverage + 0.20 × Gate + 0.20 × TD + 0.15 × Defect
                + 0.10 × Complexity + 0.10 × Dependency
```

Target weights can be adjusted based on organizational priorities. For a new codebase, weight coverage and complexity higher. For a mature codebase, weight defect density and TD ratio higher.

## References

- Google's Testing Blog: "Code Coverage Best Practices"
- SonarQube Documentation: "Metric Definitions"
- DORA State of DevOps Report: "Metrics for Software Delivery Performance"
- Prometheus Documentation: "Best Practices for Metric Naming"
- Grafana Documentation: "Dashboard Design Best Practices"
- Martin Fowler: "Metrics Are Not Targets (but they can be useful)"
- Accelerate: The Science of Lean Software and DevOps — Forsgren et al.
- ISO 25010:2011 — Quality model for software product measurement
