# Chaos Experiment Design

## Hypothesis Formulation
Steady state hypothesis: define normal behavior and metrics. Example: "95% of payment API requests complete under 500ms." Blast radius: limit experiment scope (namespace, region, user cohort). Duration: define how long experiment runs. Rollback criteria: metrics that trigger automatic experiment halt.

## Experiment Types
Infrastructure failure: kill pod, terminate EC2, network partition. Load injection: CPU spike, memory pressure, IO storm. Latency injection: introduce artificial delay for downstream calls. Dependency failure: DNS failure, certificate expiry, rate limiting. State corruption: corrupt database record, invalid cache entry.

## Metrics and Probes
Success criteria latency: p99, p95, p50. Error rate threshold: HTTP 5xx, 4xx ratio. Business metrics: conversion rate, checkout completion. Steady state vs experiment state comparison. Measurement window: before (5m), during (5m), after (5m).

## Blast Radius Control
Namespace-scoped experiments: test in staging only. Canary experiments: 1% of production traffic. Feature flag gating: kill switch for experiment. Experiment duration limit: max 30 minutes. Auto-halt: abort criteria based on SLO violation.

## Experiment Scheduling
Business hours: low-risk experiments during low traffic. Pre-deployment: experiment before new release. Game days: scheduled, announced chaos exercises. Random: unannounced experiments for resilience validation. Post-incident: validate fix with targeted experiment.

## Observability Integration
Metrics dashboards with experiment annotations. Log correlation using experiment ID. Trace comparison between steady and experiment state. Alert integration: suppress expected alerts during experiment. Post-experiment report: comparison charts and analysis.

## References
- chaos-engineering-fundamentals.md -- Fundamentals
- chaos-experiments.md -- Experiments
- chaos-tools.md -- Tools
- chaos-scenarios.md -- Scenarios
- chaos-cicd.md -- CI/CD Integration
