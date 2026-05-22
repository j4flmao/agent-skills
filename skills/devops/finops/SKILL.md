---
name: devops-finops
description: |
  Trigger: "FinOps", "cloud cost", "cost optimization", "cloud spend",
  "cost allocation", "reserved instance", "savings plan", "cost tagging",
  "cloud budget", "cost governance", "FinOps framework", "cloud economics"
  Exclusion: Not for infra provisioning — use cloud-specific skills.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, finops, cost, phase-7]
---

# devops-finops

## Purpose

Implement FinOps practices for cloud cost visibility, allocation,
optimization, and governance — covering compute, storage, and
organizational maturity.

## Agent Protocol

### Trigger

Any user message referencing cloud cost, FinOps, cost optimization,
reserved instances, savings plans, tagging, budgets, or chargeback.

### Input Context

Cloud provider(s), current monthly spend, team structure, tagging
conventions, optimization goals, compliance requirements.

### Output Artifact

Tagging strategy, budget alerts, right-sizing recommendations, RI/SP
purchase plans, cost dashboards, chargeback/showback reports.

### Response Format

Tabular data, tagging schemas, policy definitions. CLI/API examples
for cost tools.

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria

Tagging enforced, budgets active, right-sizing recommendations implemented,
cost visibility dashboards deployed, chargeback process documented.

### Max Response Length

8000 tokens.

## Workflow

### 1. Cost Allocation

Tagging strategy with mandatory tags: environment, cost-center, service,
team, owner, application. Automated detection of untagged resources with
weekly report to owners. Tag propagation from higher-level resources (e.g.
resource group → resources). Consistent tag keys across all cloud providers.

### 2. Visibility & Reporting

Daily cost dashboards by service, team, environment. Unit economics —
cost per transaction, per user, per API call, per deployment. Anomaly
detection alerts for spend spikes >20% compared to trailing 7-day average.
Budget forecasting based on historical trends with seasonal adjustment.

### 3. Compute Optimization

Right-sizing based on CPU/memory utilization metrics over 14 days.
Spot/preemptible instances for fault-tolerant, stateless workloads (60-90%
discount). Reserved instances / savings plans for baseline capacity (1yr or
3yr commitment). Auto-scaling for variable load — HPA for K8s, scale sets
for VMs.

### 4. Storage Optimization

Lifecycle policies: hot (frequently accessed) → cool (>30d) → archive (>90d)
→ delete (>365d). Object versioning cleanup — delete old versions after N
days. Snapshot management — delete orphaned snapshots, age-based retention.
Unattached volume detection and automatic deletion after grace period.

### 5. Governance

Budget alerts at 50%, 80%, 100% of allocated spend. IAM policies preventing
deployment of expensive instance types (e.g. GPU instances require approval).
Cost quotas per project/namespace enforced by cloud provider quotas.
Approval gates for any deployment exceeding cost threshold.

### 6. FinOps Practice

Weekly cost review meeting with engineers. Chargeback — bill team/unit
based on usage. Showback — report usage without charging. Efficiency metrics
(cost per request, per user) tracked monthly. Cost optimization goal as KPI
(e.g. reduce unit cost 10% YoY). Maturity progression from crawl (visibility)
→ walk (allocation) → run (optimization).

## Rules

1. Every resource has mandatory cost allocation tags — missing tags = auto-remediate.
2. Budget alerts configured before any resource deployment.
3. Right-size before buying reserved capacity — never guess baseline.
4. Spot/preemptible instances for non-critical, fault-tolerant workloads.
5. Delete unused resources weekly — unattached volumes, old snapshots, orphaned IPs.
6. Unit economics tracked and trended monthly — cost per request/user.
7. Reserved instances / savings plans only for stable baseline >60% utilization.
8. Cross-team chargeback to drive accountability and ownership.

## References

- [Cost Optimization](./references/cost-optimization.md) — right-sizing,
  reserved instances, spot, storage lifecycle, tagging
- [FinOps Governance](./references/finops-governance.md) — budgets, anomaly
  detection, chargeback, reporting, practice maturity

## Handoff

Hand off to finops for cost visibility and optimization.
Hand off to cloud-specific skills (aws/azure/gcp) for resource
provisioning at optimized price. Hand off to monitoring for
utilization metrics used in right-sizing.
