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
Implement FinOps practices for cloud cost visibility, allocation, optimization, and governance — covering compute, storage, Kubernetes, and organizational maturity from crawl to run.

## Agent Protocol

### Trigger
Any user message referencing cloud cost, FinOps, cost optimization, reserved instances, savings plans, tagging, budgets, chargeback, or Kubecost.

### Input Context
Cloud provider(s), current monthly spend, team structure, tagging conventions, optimization goals, compliance requirements.

### Output Artifact
Tagging strategy, budget alerts, right-sizing recommendations, RI/SP purchase plans, cost dashboards, chargeback/showback reports, K8s cost optimization config.

### Response Format
Tabular data, tagging schemas, policy definitions. CLI/API examples for cost tools.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Tagging enforced, budgets active, right-sizing recommendations implemented, cost visibility dashboards deployed, chargeback process documented, K8s cost visibility enabled.

### Max Response Length
8000 tokens.

## Components

### FinOps Lifecycle in Depth
Inform: visibility through mandatory tagging (environment, cost-center, service, team, owner, application), cost dashboards by service/team/environment, budget alerts at multiple thresholds, anomaly detection with automated notification. Unit economics: cost per transaction, per user, per API call, per deployment. Optimize: right-sizing based on 14-day utilization metrics, reserved instances and savings plans for baseline, spot/preemptible for flexible workloads, storage lifecycle automation, data transfer cost minimization. Operate: continuous improvement through weekly cost reviews, chargeback/showback processes, governance automation via IAM policies and budget enforcement, cultural cost awareness through team ownership and KPIs. Maturity: Crawl (visibility, tagging, monthly reports) -> Walk (budget alerts, team allocation, anomaly detection) -> Run (automated optimization, chargeback, unit economics KPIs).

### Cost Allocation Strategy
Tagging hierarchy: environment (dev/staging/prod) > cost-center (platform/data/ml/security) > service (myapp/auth/payments) > team (backend/frontend/infra) > owner (team lead) > application (microservice name). Tag propagation: resource group tags -> child resources. Consistent tag keys across AWS/Azure/GCP using Terraform provider conventions. Cost categories in cloud provider billing console for hierarchical grouping. Automated enforcement: CI pipeline rejects deployment of untagged resources. Weekly untagged resource report emailed to owners.

### Reserved Instance Strategy
Coverage: 60-80% of baseline (always-on database, control plane, critical services). Term: 1-year for growing/volatile workloads, 3-year for stable/known workloads. Payment: all upfront (max discount), partial upfront (balanced), no upfront (no cash outlay). Partial upfront offers 80-90% of max discount with 50% cash outlay — recommended for most orgs. Monthly utilization tracking — alert if <70%. Expiry management: create renewal 60 days before expiry with same or adjusted coverage. RI/SP distribution: allocate proportional savings to consuming teams for fair chargeback.

### Kubernetes Cost Optimization
Kubecost: namespace allocation (which namespaces cost what), deployment right-sizing (recommended CPU/memory vs actual), cluster idle cost (unused provisioned capacity), label-based cost aggregation, budget alerts per namespace, carbon footprint tracking. Karpenter: dynamic node provisioning based on pending pods, spot instance diversification across types, node consolidation to eliminate waste, right-sizing node types to fit pod resource requests. Additional: resource request optimization via VPA, HPA min/max tuning (avoid over-provisioning), eliminating orphaned resources, namespace resource quotas, node selectors/taints to separate cost profiles.

### Data Transfer Optimization
Cross-region traffic: 3-10x more expensive than intra-region. Co-locate dependent services (app + DB + cache) in same region. CloudFront/CDN: egress optimization via edge caching, reduces origin load. NAT Gateway: significant per-GB processing charges — prefer VPC endpoints for private connectivity. S3 Transfer Acceleration: faster global uploads at premium cost. Inter-region VPC peering: costs per GB transferred in both directions — use transit gateway with centralized inspection. Direct Connect/Interconnect: consistent performance but monthly port fees — cost-effective at scale (>10TB/month).
Inform: visibility through tagging, dashboards, budget alerts, anomaly detection. Optimize: right-sizing, reserved instances, spot instances, storage lifecycle, data transfer optimization. Operate: continuous improvement through weekly reviews, unit economics, governance automation, culture of cost awareness. Maturity progression: Crawl (visibility, basic tagging, monthly reports) -> Walk (budget alerts, team allocation, anomaly detection) -> Run (automated optimization, chargeback, unit economics KPIs).

### 2. Cost Allocation
Tagging strategy with mandatory tags: environment, cost-center, service, team, owner, application, terraform. Automated detection of untagged resources with weekly report to owners. Tag propagation from higher-level resources (resource group -> resources). Consistent tag keys across all cloud providers. Cost categories in cloud provider billing for hierarchical grouping. Resource-level labels propagate to hourly cost exports.

### 3. Resource Right-Sizing
Analyze CPU/memory utilization over 14-day window. Downsize instances with average CPU <20% and memory <40%. Consider upgrade for CPU >60% or memory >80%. Use cloud provider recommender engines (AWS Compute Optimizer, Azure Advisor, GCP Recommender). Schedule re-evaluation quarterly. For K8s: VPA recommendations for container resource requests, right-size node pools based on aggregate utilization.

### 4. Reserved Instances and Savings Plans
Cover 60-80% of baseline usage with reserved capacity — always-on workloads only. 1-year commitment for volatile workloads, 3-year for stable baseline. Analyze RI/SP utilization monthly — low utilization means over-provisioned commitment. Partial upfront for best balance of discount vs cash flow. Convert expiring reservations proactively 60 days before expiry. Combine with spot for variable workloads and on-demand for burst.

### 5. Spot and Preemptible Instances
Use for fault-tolerant, stateless, batch, and worker workloads. Node pool with spot + on-demand mix for K8s — Karpenter diversifies across instance types. Pod disruption budgets to handle spot reclaim notifications. Graceful shutdown handling with preemption handlers. Spot instance diversification across 3+ instance types and 2+ AZs.

### 6. Storage Lifecycle
Hot (frequently accessed, standard tier) -> Cool (>30 days, infrequent access) -> Archive (>90 days, glacier/coldline) -> Delete (>365 days unless compliance requires). Object versioning cleanup: delete noncurrent versions after N days. Snapshot management: delete orphaned snapshots, age-based retention. Unattached volume detection and automatic deletion after 7-day grace period.

### 7. Data Transfer Costs
Minimize cross-region and cross-AZ traffic — co-locate dependent services in same region and AZ where possible. Use CloudFront/CDN for egress optimization. NAT Gateway data processing charges significant — prefer private link / VPC endpoints. S3 Transfer Acceleration for global uploads. Inter-region peering costs can exceed compute — use transit gateway with careful routing.

### 8. Kubernetes Cost Optimization (Kubecost, Karpenter)
Kubecost: namespace-level cost allocation, deployment-level right-sizing recommendations, cluster idle cost identification, chargeback to teams by label/namespace. Karpenter: dynamic node provisioning with spot diversification, right-sizing node types to fit pods, bin packing optimization, node consolidation to eliminate waste. Also: resource request optimization via VPA, HPA min/max tuning, eliminating orphaned resources, namespace resource quotas.

### 9. Budget Alerts and Anomaly Detection
Budget alerts at 50%, 80%, 100%, 150% thresholds. Anomaly detection: daily spend >20% above trailing 7-day average, weekly spend >30% above previous week. Auto-remediation: tag owner assignment on anomaly, slack notification to #finops-alerts, escalation after 4h. Service-level budgets prevent one service's overspend from masking others.

### 10. Chargeback and Showback
Chargeback: bill team/unit based on measured usage (real dollars). Showback: report usage without charging (visibility only). Cost per unit metrics: cost per request, per user, per transaction, per deployment. Weekly cost review meeting with engineering leads. Efficiency KPIs tracked monthly.

## Automation and Tooling

### Budget Automation Workflow
1. Create budget per cost-center with monthly amount aligned to forecast
2. Configure alert thresholds at 50% (inform), 80% (warning), 100% (critical), 150% (escalation)
3. Set up Pub/Sub notification for each threshold (AWS SNS, Azure Monitor, GCP Pub/Sub)
4. Cloud function triggered on 100% threshold: send Slack alert, tag resources, adjust auto-scaling, pause non-critical deployments
5. Cloud function triggered on 150% threshold: restrict new resource creation via IAM policy, page engineering manager
6. Weekly review of budget forecasting vs actual spend
7. Adjust budgets quarterly based on new workload onboarding and optimization savings

### Anomaly Detection Automation
1. Daily spend check: compare today's spend to trailing 7-day average, alert if >20% above
2. Weekly spend check: compare current week to previous week, alert if >30% above
3. Service-level check: compare per-service daily spend to (budget/30*2), alert if exceeded
4. New resource type alert: any new instance type or service launch triggers manual review
5. Untagged resource detection: scan hourly, alert on new untagged resources, auto-tag with owner from creator
6. Anomaly response: investigate within 4 hours, identify root cause, apply remediation, document in postmortem

### Monthly Cost Review Agenda
1. Executive summary: total spend vs budget, month-over-month trend, YTD savings
2. Top 10 cost increases: service, team, environment breakdown with % change
3. Anomaly report: anomalies detected, investigated, resolved during month
4. RI/SP report: coverage %, utilization %, expiring reservations, recommended purchases
5. Right-sizing report: downsized instances, recommended changes, savings realized
6. Storage optimization: lifecycle transition savings, orphaned volume cleanup, snapshot audit
7. Kubernetes cost: namespace spend, idle cluster cost, right-sizing recommendations from Kubecost
8. Unit economics trends: cost per request/user/transaction/deployment with month-over-month comparison
9. Optimization roadmap: planned changes with expected savings, owner, timeline
10. Governance review: tagging compliance %, budget compliance %, open cost-related tickets

## Rules
1. Every resource has mandatory cost allocation tags — missing tags = auto-remediate.
2. Budget alerts configured before any resource deployment.
3. Right-size before buying reserved capacity — never guess baseline.
4. Spot/preemptible instances for non-critical, fault-tolerant workloads.
5. Delete unused resources weekly — unattached volumes, old snapshots, orphaned IPs.
6. Unit economics tracked and trended monthly — cost per request/user.
7. Reserved instances / savings plans only for stable baseline >60% utilization.
8. Cross-team chargeback to drive accountability and ownership.
9. K8s cost visibility via Kubecost — namespace and label-level allocation.
10. Data transfer costs tracked and minimized — cross-region traffic is expensive.
11. Anomaly alerts actionable within 24 hours — silence means acceptance.
12. Weekly cost reviews with engineering — ownership at team level.
13. Tagging compliance target >95% — untagged resources block deployment in CI.
14. Budget overrides require C-level approval with documented business justification.

## Cost Scenarios and Responses

### Scenario: Unexpected Spend Spike
Detection: daily anomaly alert shows 35% increase in compute spend for team-platform. Investigation: drill into BigQuery billing export by service, region, and label. Root cause: new deployment deployed without spot flag, instances running on-demand. Response: tag resources with correct spot configuration, schedule spot conversion at next deploy, add CI validation to block non-spot deployments for worker pools. Automation: add deployment-time validation that checks instance type and spot flag match workload profile.

### Scenario: Idle Resources
Detection: weekly idle resource report shows 3 unattached volumes, 2 orphaned load balancers, 1 idle NAT gateway. Investigation: identify owners via creator tag or audit log. Response: delete unattached volumes (save $120/month), delete orphaned LBs (save $80/month), delete idle NAT gateway (save $150/month). Automation: set auto-deletion policy — unattached volumes deleted after 14 days, orphaned LBs after 7 days, idle NAT after 30 days.

### Scenario: Reserved Instance Coverage Gap
Detection: monthly RI/SP report shows coverage dropped from 65% to 45%. Investigation: new workload deployed without RI/SP coverage, team used different instance family. Response: purchase additional RI/SP for new instance family, adjust workload to use covered instance family where possible. Automation: alert when RI/SP coverage drops below 50%, block deployment of instance families without RI/SP coverage, automate RI/SP purchase recommendation.

## References
- [Cost Optimization](./references/cost-optimization.md) — right-sizing, reserved instances, spot, storage lifecycle, tagging
- [FinOps Governance](./references/finops-governance.md) — budgets, anomaly detection, chargeback, reporting, practice maturity
- [FinOps Practices](./references/finops-practices.md) — FinOps lifecycle (inform → optimize → operate), unit economics, forecasting, budget models, maturity model
- [FinOps Automation](./references/finops-automation.md) — Automated cost remediation, scheduling, tag enforcement, budget alerts, discount automation

## Handoff
Hand off to finops for cost visibility and optimization. Hand off to cloud-specific skills (aws/azure/gcp) for resource provisioning at optimized price. Hand off to monitoring for utilization metrics used in right-sizing.
