---
name: chaos-engineering
description: >
  Use this skill when the user says 'chaos engineering', 'chaos monkey',
  'fault injection', 'resilience testing', 'GameDay', 'failure testing',
  'chaos experiment', 'Chaos Mesh', 'Litmus', 'Gremlin', 'AWS Fault Injection
  Simulator', 'process kill', 'network latency', 'pod failure', 'stress test',
  'resilience', 'blast radius', 'steady state'.
  Covers: chaos engineering principles, experiment design, fault injection tools,
  blast radius control, steady-state hypothesis, GameDay planning,
  observability during experiments, CI/CD integration, incident response.
  Do NOT use for: performance/load testing (use monitoring skill),
  security penetration testing (use security skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, chaos-engineering, resilience, testing, phase-5]
---

# Chaos Engineering

## Purpose
Design and execute chaos engineering experiments to validate system resilience using fault injection, steady-state hypothesis testing, and controlled blast radii.

## Architecture Decision Trees

### Tool Selection: Chaos Mesh vs Litmus vs Gremlin vs AWS FIS
| Tool | Platform | Installation | Experiment Types | Cost |
|---|---|---|---|---|
| Chaos Mesh | Kubernetes | Helm, easy | Pod kill, network, stress, DNS, HTTP | Free (CNCF) |
| Litmus | Kubernetes | Operator + CLI | Pod/container kill, network, node drain, chaos charts | Free (CNCF) |
| Gremlin | Multi-platform | Agent-based | CPU, memory, IO, network, DNS, process, shutdown | Paid (freemium) |
| AWS FIS | AWS-only | AWS service | EC2 stop, RDS failover, ECS task stop, ASG | Pay-per-action |
| Toxiproxy | App-level | Sidecar/proxy | Network latency, disconnects, throttling | Free |
| Pumba | Docker | Container | Container kill, network, pause | Free |

### Experiment Types by Failure Mode
| Failure Mode | Chaos Mesh | Litmus | Gremlin | AWS FIS |
|---|---|---|---|---|
| Pod crash | PodChaos | pod-delete | Container kill | ECS task stop |
| Network latency | NetworkChaos | pod-network-latency | Network latency | — |
| Network partition | NetworkChaos | pod-network-loss | Network blackhole | — |
| CPU stress | StressChaos | — | CPU | — |
| Memory pressure | StressChaos | — | Memory | — |
| IO delay | IOChaos | — | IO | — |
| DNS failure | DNSChaos | — | DNS | — |
| Node shutdown | — | node-drain | — | EC2 stop |
| RDS failover | — | — | — | RDS failover |

### Experiment Maturity Levels
| Level | Description | Frequency | Blast Radius |
|---|---|---|---|
| L1: Observability | Monitor alerts during known failures | Monthly | Production-like (staging) |
| L2: Single-service | Inject fault in one non-critical service | Bi-weekly | Staging namespace |
| L3: Multi-service | Coordinated faults across services | Monthly | Staging + shadow prod |
| L4: Production | Experiment in production with guardrails | Quarterly | 1% traffic / select users |
| L5: GameDay | Full failure simulation | Biannual | Full production with runbook |

## Core Workflow

### Step 1: Chaos Mesh Experiment — Pod Kill
```yaml
# chaos/pod-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: payment-service-kill
  namespace: chaos-mesh
spec:
  action: pod-kill
  mode: one  # Target one pod at a time
  selector:
    namespaces: [production]
    labelSelectors:
      app: payment-service
  duration: 60s
  scheduler:
    cron: "@every 30m"
  gracePeriod: 30
```

### Step 2: Network Latency Experiment
```yaml
# chaos/network-latency.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: api-latency
  namespace: chaos-mesh
spec:
  action: delay
  mode: all
  selector:
    namespaces: [production]
    labelSelectors:
      app: payment-service
  delay:
    latency: 2000ms
    jitter: 500ms
    correlation: 50
  duration: 300s
```

### Step 3: Litmus Chaos Experiment
```yaml
# chaos/litmus-experiment.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: payment-service-chaos
  namespace: production
spec:
  engineState: active
  appInfo:
    appns: production
    applabel: app=payment-service
    appkind: deployment
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "true"
            - name: RAMP_TIME
              value: "10"
    - name: pod-network-latency
      spec:
        components:
          env:
            - name: NETWORK_LATENCY
              value: "2000"
            - name: TOTAL_CHAOS_DURATION
              value: "120"
            - name: JITTER
              value: "500"
    - name: pod-cpu-hog
      spec:
        components:
          env:
            - name: CPU_CORES
              value: "1"
            - name: TOTAL_CHAOS_DURATION
              value: "60"
```

### Step 4: Steady-State Hypothesis Verification
```python
# chaos/steady_state_check.py
"""Verify steady state before, during, and after chaos experiments."""
import requests
import time
import statistics
from dataclasses import dataclass
from typing import List

@dataclass
class SteadyStateMetrics:
    p50_latency: float
    p99_latency: float
    error_rate: float
    throughput: float

def measure_steady_state(url: str, duration_s: int = 60) -> SteadyStateMetrics:
    """Measure current system metrics from monitoring API."""
    latencies = []
    errors = 0
    total = 0
    end_time = time.time() + duration_s

    while time.time() < end_time:
        start = time.time()
        try:
            resp = requests.get(f"{url}/health", timeout=5)
            latencies.append((time.time() - start) * 1000)
            if resp.status_code >= 500:
                errors += 1
        except Exception:
            errors += 1
            latencies.append(5000)  # timeout as latency
        total += 1
        time.sleep(0.5)

    sorted_lats = sorted(latencies)
    p50 = sorted_lats[len(sorted_lats) // 2]
    p99 = sorted_lats[int(len(sorted_lats) * 0.99)]
    error_rate = errors / total * 100
    throughput = total / duration_s

    return SteadyStateMetrics(p50, p99, error_rate, throughput)

def check_hypothesis(baseline: SteadyStateMetrics, during: SteadyStateMetrics):
    """Check if experiment violates SLOs."""
    violations = []
    if during.p99_latency > baseline.p99_latency * 5:
        violations.append(f"P99 latency {during.p99_latency:.0f}ms > 5x baseline {baseline.p99_latency:.0f}ms")
    if during.error_rate > baseline.error_rate + 5:
        violations.append(f"Error rate {during.error_rate:.1f}% > {baseline.error_rate:.1f}% + 5%")
    return violations

# Usage
baseline = measure_steady_state("http://payment-service")
# Run chaos experiment...
time.sleep(30)
during = measure_steady_state("http://payment-service", 120)
violations = check_hypothesis(baseline, during)

if violations:
    print(f"Hypothesis FAILED: {violations}")
    print("Rolling back experiment and alerting...")
else:
    print("Hypothesis PASSED — system remained within SLOs")
```

### Step 5: AWS FIS Experiment Template
```yaml
# chaos/aws-fis-template.yaml
description: "Payment service AZ failure simulation"
targets:
  payment-service-az1:
    resourceType: aws:ec2:instance
    resourceTags:
      tag: { key: "app", value: "payment-service" }
      tag: { key: "az", value: "us-east-1a" }
    selectionMode: ALL
actions:
  stopInstances:
    actionId: aws:ec2:stop-instances
    parameters:
      startInstancesAfterDuration: PT5M
    targets:
      Instances: payment-service-az1
stopConditions:
  - source: aws:cloudwatch:alarm
    value: "payment-high-error-rate"
roleArn: "arn:aws:iam::123456789012:role/aws-fis-role"
tags:
  experiment: payment-az-failover
```

### Step 6: GameDay Runbook Template
```yaml
# chaos/gameday-template.yaml
name: "Q1-2025 GameDay: Database Failover"
date: "2025-03-15T14:00:00Z"
duration: 180m
participants:
  facilitator: "sre-lead@company.com"
  observer: "eng-manager@company.com"
  responder: "oncall@company.com"
steady_state: "Primary DB healthy, app P99 < 500ms, error rate < 0.1%"
hypothesis: "When primary DB fails, read replicas promote within 60s with < 1% error rate"
scenario:
  - phase: "Setup"
    duration: 15m
    actions:
      - "Confirm steady state metrics"
      - "Brief all participants"
      - "Ensure runbooks accessible"
  - phase: "Injection"
    duration: 5m
    actions:
      - "Stop primary RDS instance via AWS FIS"
      - "Observe monitoring dashboard"
      - "Log all findings in shared doc"
  - phase: "Observation"
    duration: 30m
    actions:
      - "Monitor app behavior during failover"
      - "Check if auto-failover triggers"
      - "Record time to recovery"
  - phase: "Recovery"
    duration: 15m
    actions:
      - "If auto-failover fails: execute manual runbook"
      - "Restore primary from snapshot if needed"
      - "Verify data integrity"
  - phase: "Retrospective"
    duration: 30m
    actions:
      - "Document what went well"
      - "Document what went wrong"
      - "Create action items with owners"
      - "Update runbooks based on findings"
success_criteria:
  - "Database failover completes within 120s"
  - "Application error rate < 5% during failover"
  - "No data loss (zero RPO)"
  - "All team members follow runbook correctly"
rollback:
  - "If error rate > 10% for 2+ minutes: abort experiment"
  - "Restore RDS primary from latest snapshot"
  - "Fail DNS back to primary endpoint"
```

## Anti-Patterns

### Anti-Pattern 1: No Blast Radius Control
Running chaos experiments without limiting blast radius to a subset of instances or namespaces. Always start with `mode: one` (kill one pod, not all).

### Anti-Pattern 2: No Steady-State Hypothesis
Injecting faults without predefined success criteria. Without a hypothesis, you can't determine if the system behaved correctly.

### Anti-Pattern 3: Chaos in Production Without Observability
Running production experiments without real-time monitoring dashboards. You need to observe the impact in real-time — latency, error rate, throughput dashboards must be ready.

### Anti-Pattern 4: Unattended Experiments
Running chaos experiments without human supervision. Always have a facilitator who can abort the experiment if things go wrong.

### Anti-Pattern 5: No Rollback Plan
Failing to define how to stop an experiment and restore normal operation. Every experiment needs an abort condition and restoration procedure.

## Production Considerations

- Run experiments during low-traffic hours initially; progress to peak hours as confidence grows.
- Always have a human in the loop with abort authority (kill switch).
- Monitor blast radius: never exceed 10% of instances in production for first experiments.
- Record all experiments: what was injected, what happened, what was learned.
- Use feature flags to gradually roll out chaos experimentation to more services.
- Integrate with incident management: experiments that trigger real alerts train responders.

## Rules & Constraints
- Every experiment must have a defined steady-state hypothesis.
- Blast radius must be explicitly configured and limited.
- Abort conditions must be defined before experiment begins.
- Production experiments require prior approval and GameDay plan.
- All experiments must have automated rollback/stop procedure.
- Results must be documented with action items.
- No experiment should degrade user-facing SLOs without prior approval.

## References
  - references/chaos-cicd.md
  - references/chaos-engineering-advanced.md
  - references/chaos-engineering-fundamentals.md
  - references/chaos-experiments.md
  - references/chaos-practices.md
  - references/chaos-principles.md
  - references/chaos-scenarios.md
  - references/chaos-tools.md
  - references/gameday-guide.md

## Handoff
Next: **monitoring** — observability for chaos experiments. Pass: experiment types, steady-state metrics, abort conditions.
