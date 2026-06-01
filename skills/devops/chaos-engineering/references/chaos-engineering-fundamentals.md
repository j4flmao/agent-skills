# Chaos Engineering Fundamentals

## Overview
Chaos engineering is the discipline of experimenting on a system to build confidence in its capability to withstand turbulent conditions in production. It identifies weaknesses before they cause customer-impacting outages.

## Core Concepts

### Principles of Chaos
Build a hypothesis around steady state: define normal system behavior with measurable outputs (latency, error rate, throughput). Vary real-world events: introduce failures (server crash, network delay, resource exhaustion). Run experiments in production: test the actual system under real conditions. Automate experiments to run continuously: integrate into CI/CD pipeline. Minimize blast radius: start small, contain impact.

### The Chaos Experiment Lifecycle
1. Define steady state (baseline metrics). 2. Form hypothesis (system will tolerate failure X). 3. Introduce failure (simulate real-world event). 4. Compare to steady state (measure impact). 5. Fix or improve (address weakness). 6. Automate (turn into continuous experiment).

### Types of Experiments
Infrastructure: kill instances, network partitions, DNS failures. Platform: scale events, resource exhaustion, dependency failures. Application: request spikes, latency injection, data corruption. Security: credential rotation failures, certificate expiry. Database: connection pool exhaustion, replication lag.

## Key Tools

### Chaos Mesh
Kubernetes-native chaos platform. Supports pod kill, network delay, disk failure, HTTP fault injection, DNS chaos. Defined as Kubernetes CRDs. Integrates with ArgoCD/GitOps workflows.

### LitmusChaos
Cloud-native chaos engineering framework. Hub for predefined chaos experiments. Workflow-based experiment orchestration. Probes for steady state validation. GitOps-friendly with Kubernetes CRDs.

### Gremlin
SaaS chaos engineering platform. Supports infrastructure, network, state, and resource attacks. Safe mode halts experiments if CPU or error rate spikes. Integration with incident management tools.

## Basic Experiment

### Chaos Mesh Network Delay
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: web-delay
spec:
  action: delay
  mode: one
  selector:
    namespaces: ["production"]
    labelSelectors:
      app: web
  delay:
    latency: "1000ms"
    duration: "30s"
  duration: "5m"
```

### LitmusChaos Pod Delete
```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: engine-nginx
spec:
  appinfo:
    appns: production
    applabel: app=nginx
    appkind: deployment
  chaosServiceAccount: litmus
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "30"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "true"
```

## Best Practices
- Start with small blast radius experiments in non-production.
- Always define steady-state metrics before running experiments.
- Automate experiments to run on schedule or in CI/CD pipeline.
- Integrate with observability tools to capture experiment impact.
- Run game days to practice incident response alongside experiments.
- Document experiment results and learnings.
- Never run experiments without rollback and abort procedures.
- Gradually increase experiment complexity and blast radius.

## References
- chaos-engineering-advanced.md -- Advanced Chaos Engineering topics
- chaos-mesh-setup.md -- Chaos Mesh Setup
- litmus-chaos.md -- LitmusChaos
- game-day-planning.md -- Game Day Planning
