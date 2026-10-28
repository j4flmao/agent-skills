---
name: qa-chaos-engineering
description: >
  Use this skill when the user says 'chaos experiment', 'fault injection test', 'game day', 'steady state hypothesis', 'chaos mesh', 'litmus', 'aws fis', 'blast radius', 'resilience test', 'kill a pod and see what happens'. It designs and runs controlled fault-injection experiments as part of a test strategy: hypothesis, blast radius, abort conditions, tooling manifests and result reporting. Do NOT use for: building resilience patterns in code (use backend/universal/resilience-patterns), platform-wide chaos program and tooling ops (use devops/chaos-engineering), load/performance testing (use quality/load-testing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [quality-assurance, chaos-engineering, fault-injection, resilience, game-day]
---

# Chaos Engineering & Fault Injection

## Purpose
Gain evidence that a system tolerates real failures (instance loss, latency, dependency outage, resource exhaustion) by running controlled experiments against a measurable steady state. Chaos experiments are tests with a hypothesis, a limited blast radius and an abort switch — not random breakage.

## Agent Protocol

### Trigger
"chaos experiment", "fault injection", "game day", "steady state", "chaos mesh", "litmus", "aws fis", "azure chaos studio", "gremlin", "blast radius", "what if the database goes down".

### Input Context
- Architecture and the failure mode of concern.
- SLOs / steady-state metrics and where they are observed.
- Environment maturity (staging only vs production-ready), rollback capability.

### Output Artifact
Experiment card + tool manifest; results report after the run.

### Response Format
```
Hypothesis: When {fault} affects {target}, {steady-state metric} stays within {threshold}.
Steady state: {metric, source, baseline}
Blast radius: {env, % traffic/instances, duration}
Abort conditions: {metric breach -> stop}
Method: {tool + manifest}
Result: {confirmed|refuted} -> {follow-up actions}
```

## Principles (principlesofchaos.org)
1. Define steady state as measurable output (success rate, latency, orders/min) — not internal CPU.
2. Hypothesize it continues in control and experimental groups.
3. Introduce real-world events (instance death, latency, DNS failure, disk full, clock skew).
4. Run as close to production as is safe; automate to run continuously.
5. Minimize blast radius.

## Experiment Progression

| Stage | Where | Example |
|-------|-------|---------|
| 1 | Local/integration tests | Toxiproxy adds latency to DB connection in a test |
| 2 | Staging, single service | Kill one pod of a replicated service |
| 3 | Staging, dependencies | 500 ms latency on payment provider calls |
| 4 | Production, small scope | One AZ's instances of one service, low-traffic window, on-call aware |
| 5 | Continuous | Scheduled experiments in CI/CD or a chaos scheduler |
Do not progress while the previous stage revealed unfixed weaknesses.

## Fault Catalog

| Fault | Validates |
|-------|-----------|
| Pod/instance termination | Replicas, health checks, PodDisruptionBudgets, graceful shutdown |
| Network latency/packet loss | Timeouts, retries with backoff, circuit breakers |
| Dependency returns errors | Fallbacks, degraded mode, error budgets |
| CPU/memory stress | Autoscaling, limits, OOM behaviour |
| DNS failure | Caching, connection reuse |
| AZ/zone outage (simulated) | Multi-AZ topology, failover |

## Chaos Mesh Examples (Kubernetes)

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: checkout-pod-kill
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one                      # one random matching pod
  selector:
    namespaces: [shop]
    labelSelectors:
      app: checkout
---
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: payment-latency
  namespace: chaos-testing
spec:
  action: delay
  mode: all
  selector:
    namespaces: [shop]
    labelSelectors:
      app: payment-client
  delay:
    latency: "500ms"
    jitter: "100ms"
  duration: "5m"
```
Equivalent managed options: AWS Fault Injection Service (FIS) with CloudWatch-alarm stop conditions, Azure Chaos Studio, LitmusChaos, Gremlin.

## Abort Conditions
- Automatic stop when an SLO alarm fires (e.g., checkout success rate < 99% for 2 min); FIS supports alarm-based stop conditions natively.
- Manual kill switch known to everyone in the game day.
- Every experiment has a `duration`; never leave faults open-ended.

## Game Day Runbook
1. Announce window, scope and abort criteria to on-call and stakeholders.
2. Confirm dashboards show steady state; record baseline.
3. Inject fault; observe metrics, alerts, logs and human response.
4. Stop at duration or abort; confirm recovery to baseline.
5. Write results: hypothesis confirmed/refuted, detection time, recovery time, surprises.
6. File fixes; schedule a re-run to confirm.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| Starting in production with no staging runs | Progress stage by stage |
| No observability before the experiment | Steady-state metrics and alerts first |
| No hypothesis ("let's see what breaks") | Written hypothesis + threshold |
| Unbounded faults | Duration + stop conditions |
| Findings not fixed | Track actions; re-run |

## Checklist
- [ ] Hypothesis and steady-state metric written
- [ ] Blast radius and duration limited
- [ ] Automatic abort tied to SLO alarm
- [ ] Stakeholders/on-call informed
- [ ] Results report + action items filed

## References
- `skills/devops/chaos-engineering/SKILL.md` — program-level chaos engineering and tooling
- `skills/quality/load-testing/SKILL.md` — combine load with faults
