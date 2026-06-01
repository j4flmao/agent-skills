# Chaos Engineering Advanced Topics

## Introduction
Advanced chaos engineering covers continuous experimentation pipelines, Chaos Mesh/LitmusChaos at scale, security chaos experiments, game days, and integrating chaos with observability.

## Continuous Experimentation Pipeline
Integrate chaos experiments into CI/CD pipeline. Run experiments against staging on every deploy. Automated steady-state validation before and after experiments. Gating: failed experiment blocks promotion to production. Gradual rollout: increase experiment scope with environment maturity. Alerting on experiment failures.

## Chaos Mesh at Scale
ManagedChaos for namespace-scoped experiments. Schedule chaos experiments with cron-based scheduling. Workflow-based experiments with sequential/parallel steps. Remote clusters: run experiments across multiple clusters from single control plane. Integration with ArgoCD for GitOps-driven chaos.

## Security Chaos Experiments
Simulate credential rotation failures. Certificate expiry and revocation scenarios. IAM policy misconfiguration impacts. Network segmentation breach attempts. Secret store unavailability. Security scanning tool failures.

## Game Days
Scheduled exercises where teams practice incident response. Define scenarios based on real past incidents or anticipated failure modes. Clear objectives with success criteria. No-notice or scheduled execution. Post-game review with action items. Iterate: repeat scenarios with increasing complexity.

## Integrating Chaos with Observability
Export experiment results to Prometheus/Grafana. Trace experiment impact through distributed tracing. Correlate chaos events with metrics, logs, and traces. Automated steady-state baselining. Experiment hypothesis tracking with observable signals.

## Blast Radius Management
Namespace isolation for experiments. Label-based selectors for targeted chaos. Experiment budgets: maximum allowed impact. Automated rollback on threshold breach. Approval workflows for production experiments. Gradual experiment scope: single pod -> deployment -> namespace -> cluster.

## References
- chaos-engineering-fundamentals.md -- Fundamentals
- chaos-mesh-setup.md -- Chaos Mesh Setup
- litmus-chaos.md -- LitmusChaos
- game-day-planning.md -- Game Day Planning
