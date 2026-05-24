---
name: devops-apm-observability
description: >
  Application Performance Monitoring and observability platforms.
  Covers: Datadog (agent, integrations, APM, logs, dashboards, monitors, SLOs),
  New Relic (One, APM agent, distributed tracing, NRQL, alerts),
  Grafana Cloud (Loki, Tempo, Mimir, k6, synthetic monitoring, on-call),
  OpenTelemetry instrumentation patterns, synthetic monitoring (browser/API checks).
  Do NOT use for: Self-managed monitoring stacks or non-APM platforms.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, apm, observability, monitoring, datadog, newrelic, grafana, phase-5]
---

# APM & Observability

## Purpose
Design, deploy, and manage Application Performance Monitoring across Datadog, New Relic, and Grafana Cloud platforms, including agent configuration, instrumentation, dashboards, alerts, and synthetic monitoring.

## Agent Protocol

### Trigger
Exact user phrases: "Datadog", "New Relic", "Grafana Cloud", "APM", "observability", "distributed tracing", "synthetic monitoring", "NRQL", "Loki", "Tempo", "Mimir", "k6", "monitor", "SLO", "OpenTelemetry exporter".

### Input Context
Before activating, verify:
- APM platform in use (Datadog, New Relic, Grafana Cloud, or multi).
- Cloud provider and integration method (agent, Lambda extension, operator).
- Programming language and framework for instrumentation.
- Existing monitoring stack and migration requirements.
- Compliance requirements (data retention, PII scrubbing).

### Output Artifact
Writes to configuration files: `datadog.yaml`, `newrelic.yml`, Grafana dashboards JSON, Terraform monitor definitions, and agent configuration.

### Response Format
Configuration files with monitoring definitions, no extraneous explanation.

### Completion Criteria
This skill is complete when:
- [ ] Agents installed and reporting metrics.
- [ ] APM traces flowing with proper service naming.
- [ ] Dashboards created for key business and operational metrics.
- [ ] Monitors and SLOs configured for critical services.
- [ ] Synthetic checks created for user-facing endpoints.

### Max Response Length
Direct file write. No response text.

## Quick Start
Install agent (DD/NR/Grafana) → Configure APM instrumentation → Create dashboards → Set up monitors → Define SLOs → Configure synthetic checks → Enable log collection.

## When to Use This Skill
- Setting up APM for a new service or platform
- Migrating between APM providers
- Creating standardized dashboards and monitors
- Implementing synthetic monitoring for critical user journeys
- Configuring distributed tracing across microservices

## Core Workflow

### Step 1: Agent Installation
```bash
# Datadog
DD_API_KEY=<key> DD_SITE=datadoghq.com bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install.sh)"

# New Relic
curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash && \
  NEW_RELIC_API_KEY=<key> NEW_RELIC_ACCOUNT_ID=<id> newrelic install

# Grafana
curl -fsSL https://raw.githubusercontent.com/grafana/agent/main/install.sh | sh
```

### Step 2: APM Configuration
```yaml
# datadog.yaml
apm_config:
  enabled: true
  env: production
  apm_non_local_traffic: true
  log_enabled: true
  max_traces_per_second: 10
  analyzed_spans:
    web: 1.0
    custom: 0.5
```

### Step 3: Terraform Monitor
```hcl
resource "datadog_monitor" "high_latency" {
  name    = "API Latency > 500ms"
  type    = "metric alert"
  message = "API latency elevated. @pagerduty"
  query   = "avg(last_5m):avg:trace.api.request.duration{env:production} > 500"

  monitor_thresholds {
    critical = 500
    warning  = 300
  }

  notify_no_data    = false
  renotify_interval = 60
}
```

## Rules & Constraints
- Never expose API keys in code — use secrets management.
- Always set sampling rates for high-throughput services.
- Configure PII scrubbing for logs and traces.
- Set retention periods aligned with compliance requirements.
- Never send production data to non-production environments.

## References
- `references/datadog-setup.md` — Agent, integrations, APM, logs, dashboards
- `references/new-relic-setup.md` — New Relic One, APM, NRQL, alerts
- `references/grafana-cloud.md` — Loki, Tempo, Mimir, k6, on-call
- `references/apm-instrumentation.md` — OpenTelemetry, agent config, sampling
- `references/synthetic-monitoring.md` — Browser/API checks, locations

## Handoff
After completing this skill:
- Next skill: **devops-opentelemetry** — OpenTelemetry as the instrumentation layer
- Pass context: Service names, sampling rates, agent versions, dashboard IDs
