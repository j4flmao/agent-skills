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
Design and execute controlled chaos experiments to validate system resilience using Litmus, Chaos Mesh, or Gremlin — hypothesis-driven with measured steady state and automated blast radius control.

## Agent Protocol

### Trigger
Any user message referencing chaos engineering, resilience testing, fault injection, game days, Litmus, Chaos Mesh, Gremlin, or AWS FIS.

### Input Context
System to test, steady state metrics, acceptable blast radius, allowed experiment types, schedule, tool preference.

### Output Artifact
Chaos experiment definitions (Litmus/Chaos Mesh YAML, Gremlin API calls), steady state hypothesis document, post-experiment analysis report, game day plan.

### Response Format
YAML manifests for K8s-native tools. API examples for managed tools. Metric comparison tables.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Experiment completed without production impact. Steady state verified. Report generated. Remediation actions identified.

### Max Response Length
8000 tokens.

## Components

### Experiment Types (Detailed)
Pod kill: graceful or forceful termination of 1+ pods — tests deployment controller, HPA response, and application reconnection logic. Node failure: drain, cordon, or terminate node — tests pod disruption budgets, node controller, and cluster autoscaler re-provisioning. Network latency: add 100ms-5000ms delay between services — tests retry logic, timeouts, and circuit breaker thresholds. Packet loss: drop 1-50% of network packets — tests TCP retransmission and application resilience. CPU stress: consume 1-N cores for duration — tests resource limits, HPA scale-out, and CPU throttling behavior. Memory stress: fill memory to X% of limit — tests OOM killer behavior, memory limits, and pod eviction mechanics. Disk I/O saturation: high write load or disk fill — tests PVC behavior, disk pressure handling, and log rotation. DNS failure: block DNS traffic, return NXDOMAIN — tests DNS caching, fallback resolvers, and service discovery resilience. Certificate expiry: present expired or invalid TLS cert — tests certificate rotation, pinning, and validation. HTTP abuse: 500 errors, slow responses, connection resets — tests client retry, circuit breaker, and failover logic.

### Game Days (Detailed)
Scheduled resilience exercises with defined scope, participants, and success criteria. Pre-game day (1 week before): scope definition with stakeholders, communication plan to team, runbook review and update, kill switch and rollback plan confirmation, monitoring dashboard preparation. Execution: inject faults per experiment plan, observe system behavior through dashboards, practice incident response protocol (IC assignment, timeline documentation, communication cadence), scribe documents observations and deviations. Post-game day (within 1 week): publish report with findings, create remediation tickets with owners, update runbooks based on lessons, schedule follow-up experiment for unresolved issues. Frequency: quarterly for critical Tier 1 services, semi-annually for Tier 2.

## Workflow

### 1. Chaos Principles
Steady state hypothesis — measurable system behavior (p99 latency, error rate, CPU/memory) defined before each experiment. Controlled blast radius — start small (single pod), expand gradually (deployment -> node -> AZ). Automated experiments — no manual steps during execution. Production-like environment — validate in staging first before any production experiment. Hypothesis-first — predict outcome before running, compare actual vs expected. Rollback plan defined before experiment starts.

### 2. Experiment Types
Pod kill (simulate crash — k8s kills 1+ pods gracefully or forcefully). Node failure (drain/cordon node, simulate AZ outage). Network latency (add delay 100ms-5000ms between services). Packet loss (drop 1-50% of packets). CPU stress (consume N cores for duration). Memory stress (OOM pressure, fill to X% of limit). Disk I/O saturation (high write load, fill disk). DNS failure (block DNS traffic, return NXDOMAIN). Certificate expiry (simulate expired or invalid TLS certs). HTTP abuse (500 errors, slow responses, connection resets). Database failure (kill DB connection, simulate replica lag).

### 3. Tools
Litmus — K8s-native CRDs for experiments, ChaosHub for pre-built experiments, workflow orchestration for multi-step scenarios, GitOps integration with ArgoCD. Chaos Mesh — TiDB ecosystem, web UI for experiment management, fault types: pod-kill, network, stress, DNS, HTTP abuse, IO delay. Gremlin — managed SaaS with UI and API, supports K8s + VMs + AWS, team-based RBAC, scenario libraries. AWS FIS — AWS-native for EC2, ECS, EKS, RDS fault injection, integrates with CloudWatch. Chaos Toolkit — open-source, experiment-as-code in JSON/JSONnet, multi-cloud support.

### 4. Steady State Hypothesis
Define metrics before experiment: p99 latency <500ms, error rate <0.1%, CPU <80%, memory <85%, request throughput >100 req/s. Measurement period: 5 minutes of baseline before injection. Tool-specific probes: Litmus probe (HTTP/gRPC/cmd), Chaos Mesh metric endpoints, Prometheus queries. Hypothesis document includes predicted impact, acceptable degradation window, and auto-abort thresholds.

### 5. Blast Radius Controls
Namespace isolation — experiments scoped to single namespace, no cross-namespace initially. Experiment scope progression: single pod -> deployment -> node -> availability zone. Schedule outside business hours with automatic abort on SLO breach. Label selectors target only pods with specific labels. Duration limits with escalating caps (1min, 5min, 15min). Kill switch mechanisms: `litmusctl abort`, Chaos Mesh annotation pause, Gremlin halt API.

### 6. Rollback and Remediation
Auto-remediation via ArgoCD sync to previous state, HPA scale-out, or pod restart. Rollback plan defined in experiment spec — never start without knowing how to stop. Forward-fix pattern: if experiment reveals weakness, file ticket immediately, do not roll forward without fix. Post-experiment cleanup: ensure all faults removed, verify system back to steady state, confirm no lingering side effects.

### 7. Observability During Chaos
Real-time dashboards showing experiment metrics vs steady state baseline. Alert annotations on Grafana for experiment start/end. Distributed traces during chaos to identify failure propagation paths. Sidecar or dedicated metrics exporter for chaos-related telemetry. Incident channel open during production experiments for rapid response.

### 8. Game Days
Scheduled resilience exercises with defined scope, participants, and success criteria. Pre-game day: scope definition, stakeholder communication, runbook review, blast radius/rollback confirmation. Game day execution: inject faults per plan, observe system behavior, practice incident response, document findings. Post-game day: report with findings, remediation items, runbook updates, schedule follow-up experiment. Frequency: quarterly for critical services, semi-annually for supporting services.

## Advanced Practices

### Fault Injection at Different Layers
Infrastructure layer: node failure, AZ outage, disk failure, network partition — tests infrastructure resilience, cluster autoscaler, pod disruption budgets. Platform layer: container runtime failure, kubelet issues, DNS resolver failure, CNI plugin failure — tests platform dependency handling. Application layer: pod kill, deployment failure, config change — tests deployment strategy, canary analysis, traffic routing. Data layer: database connection pool exhaustion, replica lag, cache miss storm — tests data access patterns, connection management, caching strategy. Security layer: certificate expiry, unauthorized access attempts, DDoS simulation — tests auth layers, rate limiting, WAF rules.

### Observability During Chaos
Pre-experiment: verify Grafana dashboards show baseline metrics, Prometheus alert rules active, distributed tracing sampling at 100%, logs streaming to central logging, incident channel created and monitored. During experiment: real-time dashboard overlay showing experiment metrics vs steady state baseline, alert annotations on Grafana for experiment start/end, distributed traces tagged with experiment ID, incident channel open for rapid response. Post-experiment: metric comparison (before/after), trace analysis for latency propagation, log analysis for error patterns, experiment report with findings and recommendations.

### Chaos Engineering Maturity Model
Level 1 (Ad-hoc): manual experiments, no steady state hypothesis, no blast radius controls, no game day schedule. Level 2 (Repeatable): automated experiment definitions, documented hypothesis, basic blast radius (namespace), scheduled game days quarterly. Level 3 (Continuous): CI/CD integration — experiments triggered on deploy, automated rollback on failure, game days in production, SLO-based abort. Level 4 (Proactive): chaos experiments designed from system architecture review, failure modes identified before incidents occur, resilience patterns built into service design.

## Integrating with CI/CD

### Automated Chaos in Pipeline
Trigger chaos experiments on every production deployment via ArgoCD webhook or CI pipeline step. Pipeline: build -> deploy canary -> run chaos experiment (pod kill + network latency) -> verify steady state -> promote to full rollout -> rollback if experiment fails. Experiment passes if: p99 latency stays <500ms, error rate stays <0.1%, auto-recovery completes within SLO. Experiment fails: auto-rollback deployment, notify team in Slack, create incident ticket. Tool integration: Litmus ChaosEngine defined as K8s manifest in gitops repo, applied alongside application manifests.

### Blast Radius Progression in CI
Stage 1 (CI merge gate): single pod kill in non-production namespace, verify test environment handles failure. Stage 2 (staging deploy): 2 pod kill + network latency 100ms in staging, verify staging handles degradation. Stage 3 (production canary): single pod kill in production, 5% traffic, verify production handles failure. Stage 4 (production full): full experiment suite in production after canary promoted, scheduled during low-traffic window. Each stage progresses only when previous stage passes. Failed stage blocks further deployment.

## Rules
1. Chaos experiments run in production-like staging first — never prod-first.
2. Always define steady state hypothesis before starting experiment.
3. Blast radius starts at single pod — expand only after validation.
4. Automated abort on SLO breach — never let experiment run wild.
5. Post-experiment report always generated and reviewed.
6. Production experiments scheduled during documented low-traffic windows.
7. No experiment without approved game day plan for production runs.
8. Teams practice read-only chaos (network, config) before destructive.
9. Every experiment has a defined rollback plan executed at experiment end.
10. Observability tooling verified before experiment starts, not during.
11. Game days include non-engineering participants (product, support) for holistic learning.
12. Experiment results feed into team roadmap as resilience improvements.
13. Chaos experiments integrated into deployment pipeline — not just standalone events.
14. Blast radius progresses gradually through CI stages: unit -> staging -> canary -> full production.
15. No production experiments on Fridays or before holidays.
16. Each experiment run has documented pass/fail criteria determined before execution begins.
17. Steady state hypothesis must be measurable — vague hypotheses produce vague results.
18. Post-experiment cleanup removes all fault injections and verifies steady state return.
19. Game day retrospective documents what went well, what went wrong, and action items.
20. Chaos experiments validate existing runbooks — update runbook when experiment reveals gaps.
21. Experiment results shared in team demos and engineering all-hands for organizational learning.
22. Fault injection diversity: rotate through different fault types to avoid hardening against known failures.
23. Read-only chaos (network, config, DNS) practiced before destructive chaos (pod kill, CPU stress, disk fill).
24. Experiments targeting stateful workloads require additional blast radius controls and approval.
25. Game day scenarios rotate across system components to ensure full coverage over time.
26. Post-game day report shared with all engineering teams for cross-team learning.
27. Chaos experiment schedule published on team calendar so stakeholders can plan accordingly.
28. Every service has at least one chaos experiment defined in its runbook for each failure mode.
29. Full experiment lifecycle including cleanup is automated — no manual steps after execution.

## Scenario Templates

### Pod Failure Scenario
Hypothesis: "When 2 out of 5 replicas of myapp-worker are killed simultaneously, the system maintains p99 latency <500ms and error rate <0.1%." Experiment: kill 2 pods in deployment myapp-worker using Litmus pod-delete or Chaos Mesh PodChaos. Steady state check: p99 latency, error rate, request throughput. Expected behavior: HPA scales up replicas, requests route to remaining healthy pods, circuit breakers prevent cascading failures. Failure mode: if latency exceeds 1000ms, retry/timeout configuration may be insufficient. Remediation: increase HPA min replicas, adjust retry budget, tune circuit breaker thresholds.

### Network Degradation Scenario
Hypothesis: "When 200ms latency is introduced between myapp-api and myapp-db, queries complete within 500ms and error rate stays below 0.5%." Experiment: inject 200ms network delay on traffic between myapp-api and myapp-db pods using Chaos Mesh NetworkChaos or Gremlin network attack. Steady state check: API p99 latency, DB query latency, connection pool utilization. Expected behavior: API retries succeed, connection pool handles longer-held connections, timeouts prevent cascading. Failure mode: connection pool exhaustion under sustained high latency. Remediation: tune connection pool max size, reduce query timeout, add read-through cache for frequent queries.

### Resource Exhaustion Scenario
Hypothesis: "When CPU stress consumes 80% of allocated CPU on myapp-api pods, HPA scales out within 2 minutes and error rate stays below 1%." Experiment: inject CPU stress using StressChaos (Chaos Mesh) or CPU attack (Gremlin) on myapp-api pods. Steady state check: CPU utilization, HPA target metric, request latency. Expected behavior: HPA detects CPU >80%, scales from 3 to 5+ replicas, latency returns to baseline. Failure mode: HPA misconfigured, resource requests/limits mismatch, cluster autoscaler slow to add nodes. Remediation: verify HPA configuration, ensure cluster autoscaler is enabled with sufficient headroom.

### Database Failure Scenario
Hypothesis: "When primary database connection is lost, application fails over to read replica within 30 seconds with <5% error rate." Experiment: block database port or kill database connection using Chaos Mesh NetworkChaos or custom fault injection. Steady state check: write success rate, read success rate, application error rate. Expected behavior: application detects connection failure, retries with exponential backoff, reads served from replica, writes queued or fail gracefully. Failure mode: no read replica configured, application crashes on DB connection failure, retry logic loops infinitely. Remediation: configure read replicas for failover, implement circuit breaker on DB client, set query timeout, handle DB errors gracefully with degraded mode.

## References
  - references/chaos-cicd.md — Chaos Engineering CI/CD Integration
  - references/chaos-engineering-advanced.md — Chaos Engineering Advanced Topics
  - references/chaos-engineering-fundamentals.md — Chaos Engineering Fundamentals
  - references/chaos-experiments.md — Chaos Engineering Experiments
  - references/chaos-practices.md — Chaos Engineering Practices
  - references/chaos-principles.md — Chaos Principles
  - references/chaos-scenarios.md — Chaos Engineering Scenarios
  - references/chaos-tools.md — Chaos Tools
## Handoff
Hand off to chaos-engineering when designing resilience experiments. Hand off to monitoring for steady state metric collection and dashboards. Hand off to argo-cd for auto-remediation rollback. Hand off to finops to understand cost of running chaos experiments in prod-like envs. Hand off to incident-response when game day reveals incident response gaps. Hand off to service-mesh when testing mesh resilience features (mTLS, circuit breakers, traffic routing).
