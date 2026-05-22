---
name: devops-chaos-engineering
description: |
  Trigger: "chaos engineering", "chaos testing", "resilience testing",
  "Chaos Monkey", "Litmus", "Gremlin", "fault injection", "chaos experiment",
  "chaos mesh", "resilience", "failure testing", "game day"
  Exclusion: Not for standard load/performance testing — use monitoring.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, chaos, resilience, phase-7]
---

# devops-chaos-engineering

## Purpose

Design and execute controlled chaos experiments to validate system resilience
using Litmus, Chaos Mesh, or Gremlin — hypothesis-driven with measured
steady state and automated blast radius control.

## Agent Protocol

### Trigger

Any user message referencing chaos engineering, resilience testing, fault
injection, game days, Litmus, Chaos Mesh, Gremlin, or AWS FIS.

### Input Context

System to test, steady state metrics, acceptable blast radius, allowed
experiment types, schedule, tool preference.

### Output Artifact

Chaos experiment definitions (Litmus/Chaos Mesh YAML, Gremlin API calls),
steady state hypothesis document, post-experiment analysis report.

### Response Format

YAML manifests for K8s-native tools. API examples for managed tools.
Metric comparison tables.

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria

Experiment completed without production impact. Steady state verified.
Report generated. Remediation actions identified.

### Max Response Length

8000 tokens.

## Workflow

### 1. Chaos Principles

Steady state hypothesis — measurable system behavior (p99 latency, error
rate, CPU/memory) defined before each experiment. Controlled blast radius —
start small, expand gradually. Automated experiments — no manual steps
during execution. Production-like environment — never test on prod without
staging validation first. Hypothesis-first — predict outcome before running.

### 2. Experiment Types

Pod kill (simulate crash), node failure (drain/cordon), network latency
(add delay), packet loss (drop % of packets), CPU stress (consume cores),
memory stress (OOM pressure), disk I/O saturation (high write load), DNS
failure (block DNS traffic), certificate expiry (simulate expired certs).

### 3. Tools

Litmus — K8s-native, CRDs for experiment definitions, ChaosHub for
pre-built experiments, workflow orchestration. Chaos Mesh — TiDB ecosystem,
fault types: pod-kill, network, stress, DNS, HTTP abuse, IO delay. Gremlin
— managed SaaS, UI-driven, supports K8s + VMs + AWS. AWS FIS — AWS-native
for EC2, ECS, EKS, RDS fault injection.

### 4. Experiment Lifecycle

Hypothesis → experiment definition (tool-specific YAML/API) → steady state
validation (pre-experiment metrics) → blast radius config → execution →
analysis (metrics before/after comparison) → remediate (auto or manual).

### 5. Blast Radius Control

Namespace isolation — experiments scoped to single namespace. Experiment
scope: single pod → deployment → node → availability zone (gradual ramp).
Schedule outside business hours with automatic abort on SLO breach. Kill
switch — emergency stop via `litmusctl abort`, Gremlin halt, or Chaos Mesh
pause.

### 6. Analysis & Remediation

Compare metrics before/after experiment. Steady state SLOs: p99 latency
<500ms, error rate <0.1%, CPU <80%, memory <85%. Auto-remediation via
rollback (ArgoCD sync to previous), horizontal scaling (HPA), or restart.
Post-experiment report generated with findings and recommendations.

## Rules

1. Chaos experiments run in production-like staging first — never prod-first.
2. Always define steady state hypothesis before starting experiment.
3. Blast radius starts at single pod — expand only after validation.
4. Automated abort on SLO breach — never let experiment run wild.
5. Post-experiment report always generated and reviewed.
6. Production experiments scheduled during documented low-traffic windows.
7. No experiment without approved game day plan for production runs.
8. Teams practice read-only chaos (network, config) before destructive.

## References

- [Chaos Principles](./references/chaos-principles.md) — principles,
  hypothesis design, blast radius, experiment lifecycle
- [Chaos Tools](./references/chaos-tools.md) — Litmus, Chaos Mesh, Gremlin,
  AWS FIS — setup and experiment definitions per tool

## Handoff

Hand off to chaos-engineering when designing resilience experiments.
Hand off to monitoring for steady state metric collection and dashboards.
Hand off to argo-cd for auto-remediation rollback. Hand off to finops
to understand cost of running chaos experiments in prod-like envs.
