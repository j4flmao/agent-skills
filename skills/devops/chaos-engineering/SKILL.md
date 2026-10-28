---
name: devops-chaos-engineering
description: >
  Use this skill when the user says 'chaos engineering', 'chaos experiment', 'gameday', 'chaos mesh', 'litmus', 'aws fault injection service', 'resilience testing', 'chaos in ci', 'steady state hypothesis', 'start a chaos program'. Plans and runs chaos engineering: steady-state hypotheses, experiment design, tool selection (Chaos Mesh, LitmusChaos, AWS FIS, Azure Chaos Studio, Gremlin), GameDays, and automated resilience checks in CI/CD. Do NOT use for: kernel/network fault-injection mechanics (sre-chaos-engineering), load testing (quality load-testing), DR failover drills of backups (backup-dr).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [devops, chaos-engineering, resilience, chaos-mesh, litmus, aws-fis, gameday]
---

# Chaos Engineering

## Purpose
Build confidence that the system withstands turbulent conditions by running controlled experiments: state a steady-state hypothesis, inject a realistic fault with a bounded blast radius, observe, and fix the weaknesses found. The goal is learning and hardening, not breaking things for show.

## Agent Protocol

### Trigger
"chaos engineering", "chaos experiment", "gameday", "chaos mesh", "litmus", "AWS FIS", "resilience testing", "chaos in CI", "steady state", "chaos program".

### Input Context
- Architecture and known failure modes (dependencies, AZs, queues, caches).
- SLIs/SLOs and dashboards available; maturity (never done chaos vs routine).
- Platform (Kubernetes, AWS/Azure/GCP VMs, serverless).

### Output Artifact
Experiment plan(s), tool manifests, GameDay runbook. No file unless requested.

### Response Format
```
Hypothesis: When {fault}, {SLI} stays within {threshold}
Fault + tool: {e.g. pod-kill via Chaos Mesh PodChaos}
Blast radius: {env, % targets, duration}
Abort: {SLI condition / alarm}
Observations to record: {metrics, alerts fired, recovery time}
Follow-up: {tickets}
```

### Completion Criteria
- [ ] Hypothesis expressed in terms of user-facing SLIs.
- [ ] Blast radius, duration, abort conditions, and rollback defined before running.
- [ ] Stakeholders/on-call informed; results recorded with action items.

## Principles (principlesofchaos.org)
1. Define steady state as measurable output (orders/min, error ratio, p99), not internals.
2. Hypothesize steady state continues in control and experiment groups.
3. Inject real-world events (instance loss, latency, dependency errors, AZ outage, clock skew, full disks).
4. Run in production when mature — staging first; minimize blast radius.
5. Automate experiments to run continuously.

## Maturity Path
| Stage | Activities |
|---|---|
| 1. Start | Tabletop exercises; manual pod/instance kills in staging during a GameDay |
| 2. Repeatable | Experiment catalog in Git; scheduled runs in staging; abort automation |
| 3. Production | Small-blast-radius prod experiments (one AZ, 1–5% of pods) with on-call aware |
| 4. Continuous | Experiments in CI/CD gates and scheduled prod runs; results feed SLO reviews |

## Tool Selection
| Tool | Scope | Notes |
|---|---|---|
| Chaos Mesh (CNCF) | Kubernetes | CRDs: PodChaos, NetworkChaos, IOChaos, StressChaos, TimeChaos, DNSChaos, HTTPChaos; Workflows and Schedules |
| LitmusChaos (CNCF) | Kubernetes (+ some cloud faults) | ChaosHub experiment catalog; probes for steady-state checks |
| AWS Fault Injection Service | AWS resources (EC2, ECS, EKS, RDS, network, AZ power interruption scenarios) | Stop conditions via CloudWatch alarms; IAM-scoped |
| Azure Chaos Studio | Azure resources + agent-based VM faults | |
| Gremlin | Commercial, multi-platform | Hosted UI, safety controls |
| Toxiproxy | TCP proxy for tests | Great for integration tests in CI |

## Experiment Example (Chaos Mesh)
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: checkout-pod-kill
  namespace: shop
spec:
  action: pod-kill
  mode: fixed-percent
  value: "20"
  selector:
    namespaces: [shop]
    labelSelectors:
      app: checkout
---
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: payments-latency
  namespace: shop
spec:
  action: delay
  mode: one
  selector:
    namespaces: [shop]
    labelSelectors:
      app: payments
  delay:
    latency: "500ms"
    correlation: "100"
    jitter: "50ms"
  duration: "5m"
```
Hypothesis for these: "With 20% of checkout pods killed and 500 ms extra latency on one payments pod, checkout success ratio stays ≥ 99.5% and p99 < 1.5 s." Typical findings: missing PDBs, retries without timeouts, single-replica dependencies, slow readiness.

## AWS FIS Example (stop condition)
```json
{
  "description": "Terminate 30% of checkout ECS tasks",
  "targets": {
    "tasks": {
      "resourceType": "aws:ecs:task",
      "resourceTags": { "service": "checkout" },
      "selectionMode": "PERCENT(30)"
    }
  },
  "actions": {
    "stopTasks": { "actionId": "aws:ecs:stop-task", "targets": { "Tasks": "tasks" } }
  },
  "stopConditions": [
    { "source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:eu-west-1:123456789012:alarm:checkout-5xx-high" }
  ],
  "roleArn": "arn:aws:iam::123456789012:role/fis-experiments"
}
```

## Chaos in CI/CD
```bash
#!/usr/bin/env bash
set -euo pipefail
kubectl apply -f chaos/payments-latency.yaml
trap 'kubectl delete -f chaos/payments-latency.yaml --ignore-not-found' EXIT

# Run a short load test and assert on SLIs instead of curl loops
k6 run --quiet tests/checkout-smoke.js   # thresholds in the script fail the job on SLO breach
```
Gate releases on resilience regressions in staging; keep prod experiments scheduled and announced.

## GameDay Runbook
1. Scope + hypothesis + abort criteria agreed; on-call and support notified; change freeze checked.
2. Roles: facilitator, operator (injects), observers (dashboards), scribe.
3. Baseline steady state for 10–15 minutes.
4. Inject; observe alerts, dashboards, runbooks, human response.
5. Abort if criteria met; otherwise end at planned time; verify recovery.
6. Debrief within 48 h: what surprised us, detection gaps, action items with owners.

## Anti-Patterns
- Chaos without observability (you can't tell if the hypothesis held).
- First experiment in production with full blast radius.
- No automatic rollback/duration; relying on someone to delete the CR.
- Treating a passed experiment as permanent proof — re-run after changes.
- Running experiments during incidents or peak business events.

## Checklist
- [ ] SLIs and dashboards exist for the target service.
- [ ] Experiment catalog in Git with hypothesis, blast radius, abort, owner.
- [ ] Tool RBAC restricts who can run chaos and where.
- [ ] GameDay cadence (e.g. quarterly) and CI experiments for critical paths.
- [ ] Findings tracked to completion.

## References
- `references/chaos-principles.md`
- `references/chaos-engineering-fundamentals.md`
- `references/chaos-engineering-advanced.md`
- `references/experiment-design.md`
- `references/chaos-experiments.md`
- `references/chaos-scenarios.md`
- `references/chaos-tools.md`
- `references/chaos-practices.md`
- `references/chaos-cicd.md`
