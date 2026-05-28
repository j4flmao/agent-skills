---
name: devops-finops
description: |
  Trigger: "FinOps", "cloud cost", "cost optimization", "cloud spend",
  "cost allocation", "reserved instance", "savings plan", "cost tagging",
  "cloud budget", "cost governance", "FinOps framework", "cloud economics"
  Exclusion: Not for infra provisioning -- use cloud-specific skills.
version: 1.1.0
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
Implement FinOps practices for cloud cost visibility, allocation, optimization, and governance -- covering compute, storage, Kubernetes, and organizational maturity from crawl to run.

## Agent Protocol

### Trigger
Any user message referencing cloud cost, FinOps, cost optimization, reserved instances, savings plans, tagging, budgets, chargeback, or Kubecost.

### Input Context
Cloud provider(s), current monthly spend, team structure, tagging conventions, optimization goals, compliance requirements.

### Output Artifact
Tagging strategy, budget alerts, right-sizing recommendations, RI/SP purchase plans, cost dashboards, chargeback/showback reports, K8s cost optimization config.

### Response Format
Tabular data, tagging schemas, policy definitions. CLI/API examples for cost tools.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick.

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
Coverage: 60-80% of baseline (always-on database, control plane, critical services). Term: 1-year for growing/volatile workloads, 3-year for stable/known workloads. Payment: all upfront (max discount), partial upfront (balanced), no upfront (no cash outlay). Partial upfront offers 80-90% of max discount with 50% cash outlay -- recommended for most orgs. Monthly utilization tracking -- alert if <70%. Expiry management: create renewal 60 days before expiry with same or adjusted coverage. RI/SP distribution: allocate proportional savings to consuming teams for fair chargeback.

### Kubernetes Cost Optimization
Kubecost: namespace allocation (which namespaces cost what), deployment right-sizing (recommended CPU/memory vs actual), cluster idle cost (unused provisioned capacity), label-based cost aggregation, budget alerts per namespace, carbon footprint tracking. Karpenter: dynamic node provisioning based on pending pods, spot instance diversification across types, node consolidation to eliminate waste, right-sizing node types to fit pod resource requests. Additional: resource request optimization via VPA, HPA min/max tuning (avoid over-provisioning), eliminating orphaned resources, namespace resource quotas, node selectors/taints to separate cost profiles.

### Data Transfer Optimization
Cross-region traffic: 3-10x more expensive than intra-region. Co-locate dependent services (app + DB + cache) in same region. CloudFront/CDN: egress optimization via edge caching, reduces origin load. NAT Gateway: significant per-GB processing charges -- prefer VPC endpoints for private connectivity. S3 Transfer Acceleration: faster global uploads at premium cost. Inter-region VPC peering: costs per GB transferred in both directions -- use transit gateway with centralized inspection. Direct Connect/Interconnect: consistent performance but monthly port fees -- cost-effective at scale (>10TB/month).

### 2. Cost Allocation
Tagging strategy with mandatory tags: environment, cost-center, service, team, owner, application, terraform. Automated detection of untagged resources with weekly report to owners. Tag propagation from higher-level resources (resource group -> resources). Consistent tag keys across all cloud providers. Cost categories in cloud provider billing for hierarchical grouping. Resource-level labels propagate to hourly cost exports.

### 3. Resource Right-Sizing
Analyze CPU/memory utilization over 14-day window. Downsize instances with average CPU <20% and memory <40%. Consider upgrade for CPU >60% or memory >80%. Use cloud provider recommender engines (AWS Compute Optimizer, Azure Advisor, GCP Recommender). Schedule re-evaluation quarterly.

### 4. Reserved Instances and Savings Plans
Cover 60-80% of baseline usage with reserved capacity -- always-on workloads only. 1-year commitment for volatile workloads, 3-year for stable baseline. Analyze RI/SP utilization monthly -- low utilization means over-provisioned commitment. Partial upfront for best balance of discount vs cash flow. Convert expiring reservations proactively 60 days before expiry.

### 5. Spot and Preemptible Instances
Use for fault-tolerant, stateless, batch, and worker workloads. Node pool with spot + on-demand mix for K8s -- Karpenter diversifies across instance types. Pod disruption budgets to handle spot reclaim notifications. Graceful shutdown handling with preemption handlers. Spot instance diversification across 3+ instance types and 2+ AZs.

### 6. Storage Lifecycle
Hot (frequently accessed, standard tier) -> Cool (>30 days, infrequent access) -> Archive (>90 days, glacier/coldline) -> Delete (>365 days unless compliance requires). Object versioning cleanup: delete noncurrent versions after N days. Snapshot management: delete orphaned snapshots, age-based retention. Unattached volume detection and automatic deletion after 7-day grace period.

### 7. Data Transfer Costs
Minimize cross-region and cross-AZ traffic -- co-locate dependent services. Use CloudFront/CDN for egress. NAT Gateway charges significant -- prefer private link / VPC endpoints. Review data transfer costs monthly.

### 8. Kubernetes Cost Optimization (Kubecost, Karpenter)
Kubecost: namespace-level cost allocation, deployment-level right-sizing, cluster idle cost. Karpenter: dynamic node provisioning, spot diversification, bin packing, node consolidation. VPA recommendations, HPA tuning, orphaned resource elimination, namespace quotas.

### 9. Budget Alerts and Anomaly Detection
Budget alerts at 50%, 80%, 100%, 150% thresholds. Anomaly detection: daily spend >20% above trailing 7-day average, weekly >30% above previous week. Auto-remediation: tag owner, slack notification, escalation after 4h.

### 10. Chargeback and Showback
Chargeback: bill team based on measured usage. Showback: report without charging. Cost per unit metrics: per request, per user, per transaction. Weekly cost review meeting. Efficiency KPIs tracked monthly.

## Architecture / Decision Trees

### FinOps Maturity Model

| Stage | Capabilities | Metrics | Automation Level |
|---|---|---|---|
| Crawl | Tagging, basic budgets, monthly reports | Total spend, top services | Manual |
| Walk | Anomaly detection, RI/SP management, team allocation | Unit economics, coverage % | Semi-automated |
| Run | Automated optimization, chargeback, continuous governance | Efficiency KPIs, forecasting | Fully automated |

### Discount Vehicle Decision Tree
- Stable, known baseline: Reserved Instance (3-year all upfront if cash available)
- Diverse, growing compute: Compute Savings Plan
- Stateless, fault-tolerant: Spot (up to 90% discount)
- Variable, unpredictable: On-demand + auto-scaling
- Hybrid EC2/Fargate/Lambda: Compute SP > EC2 SP

### Organization Structure Options

| Model | Structure | Best For |
|---|---|---|
| Centralized | Single FinOps team manages all | Small orgs (<100 people) |
| Federated | Each team manages own costs | Large orgs (>500 people) |
| Hub-and-Spoke | Central team + decentralized executors | Mid-size orgs |

## Common Pitfalls

### Pitfall 1: Skipping Maturity Foundation
Jumping to automated optimization without establishing tagging, visibility, and allocation leads to chaos. Without cost allocation, optimization savings cannot be attributed to teams. Follow the crawl-walk-run maturity model. Do not automate before you can measure.

### Pitfall 2: RI/SP Overcommitment
Buying RIs for unstable workloads or before right-sizing wastes money. Always right-size for 14 days first. Only commit to RIs for stable baseline < 60% utilization. Use partial upfront over all upfront for cash flow flexibility.

### Pitfall 3: Chargeback Without Culture
Implementing finance-grade chargeback without team buy-in creates friction. Start with showback (visibility only). Transition to chargeback when teams understand their costs. Provide training and cost visibility tools before enforcing chargeback.

### Pitfall 4: Alert Fatigue
Too many budget alerts lead to ignored alerts. Set meaningful thresholds: 50% (info), 80% (warn), 100% (critical), 150% (escalation). Use anomaly detection to reduce noise. Route alerts to cost center owners, not everyone.

### Pitfall 5: Ignoring Orphaned and Idle Resources
Unattached volumes, idle load balancers, and orphaned snapshots accumulate silently. A single unattached gp3 volume costs $8/month, but 100 of them cost $800/month with zero value. Automate detection and remediation. Schedule weekly sweeps.

### Pitfall 6: Overlooking SaaS and Third-Party Costs
FinOps focuses on cloud infrastructure but SaaS tools, API costs, and data transfer to third parties add up. Include SaaS costs in cost visibility dashboards. Review SaaS subscription utilization quarterly. Cancel unused subscriptions.

### Pitfall 7: Neglecting Data Transfer Costs
Teams optimize compute and storage but ignore egress. A data-heavy app can spend more on data transfer than on compute. Use CDN for egress. Keep data in-region. Monitor NAT Gateway data processing charges. Review data transfer costs in every monthly review.

## Best Practices

### Cost Visibility
- Dashboards per team, per service, per environment
- Daily cost notifications to team leads
- Weekly cost review with actionable insights
- Monthly executive summary with trends
- Unit economics KPIs tracked and trended

### Governance Automation
- IaC templates with mandatory tagging enforcement
- Budget auto-creation for new projects
- Cost anomaly detection with auto-remediation
- Automated waste remediation (delete unattached volumes, orphaned snapshots)
- Quarterly cost optimization roadmap

### RI/SP Management
- Monthly utilization review -- alert if < 70%
- Fresh purchase recommendation report
- Expiring reservation renewal 60 days before expiry
- Allocation of savings to consuming teams
- Regular right-sizing before RI purchase

## Compared With

### FinOps vs ITFM
FinOps: cloud-specific cost management with team accountability, unit economics, and continuous optimization. ITFM (IT Financial Management): broader discipline covering all IT costs (hardware, software, personnel, facilities). FinOps is a subset of ITFM for cloud costs. FinOps emphasizes DevOps culture and engineering ownership; ITFM is finance-led.

### FinOps vs Cloud Cost Optimization
FinOps includes cost optimization as one pillar (the Optimize phase), but also covers Inform (visibility, allocation, benchmarking) and Operate (governance, culture, maturity). Cost optimization is technical; FinOps is organizational and technical.

### FinOps vs Traditional IT Chargeback
Traditional IT chargeback is annual, static, and opaque. FinOps chargeback is continuous, granular (per resource/namespace), and transparent. FinOps provides unit economics, showback before chargeback, and team-level ownership.

## Operations & Maintenance

### Weekly Cost Review Meeting
1. Review top spenders by service and team
2. Discuss anomalies and waste
3. RI/SP utilization check
4. Action items from previous week
5. New optimization opportunities
6. Tagging compliance report

### Monthly Cost Review Agenda
1. Executive summary: total vs budget, month-over-month, YTD savings
2. Top 10 cost increases with % change and breakdown
3. Anomaly report: detected, investigated, resolved
4. RI/SP report: coverage, utilization, expiring reservations
5. Right-sizing report: recommendations and savings
6. Storage optimization: lifecycle savings, orphaned cleanup
7. Kubernetes: namespace spend, idle cluster, Kubecost recs
8. Unit economics: cost per user/request/transaction
9. Optimization roadmap: planned changes, owners
10. Governance review: tagging compliance, budget compliance

### Cost Governance Automation
1. Budget creation: automated per cost-center via IaC
2. Anomaly detection: daily scan, alert, auto-tag
3. Untagged resource scan: hourly, notify owner
4. Idle resource sweep: weekly automated deletion
5. RI/SP utilization: daily refresh, alert on low utilization
6. Right-sizing report: monthly automated recommendations
7. Waste ticket auto-creation for fixable issues

### Quarterly Optimization Cycle
1. Audit all RI/SP coverage and utilization
2. Review service-level cost allocation
3. Update unit economics KPIs
4. Benchmark against industry peers
5. Plan optimization roadmap for next quarter
6. Review and update tagging standards
7. Update budget forecasts

## Rules
1. Every resource has mandatory cost allocation tags -- missing tags = auto-remediate
2. Budget alerts configured before any resource deployment
3. Right-size before buying reserved capacity -- never guess baseline
4. Spot/preemptible instances for non-critical, fault-tolerant workloads
5. Delete unused resources weekly -- unattached volumes, old snapshots, orphaned IPs
6. Unit economics tracked and trended monthly -- cost per request/user
7. Reserved instances / savings plans only for stable baseline > 60% utilization
8. Cross-team chargeback to drive accountability and ownership
9. K8s cost visibility via Kubecost -- namespace and label-level allocation
10. Data transfer costs tracked and minimized -- cross-region traffic is expensive
11. Anomaly alerts actionable within 24 hours -- silence means acceptance
12. Weekly cost reviews with engineering -- ownership at team level
13. Tagging compliance target > 95% -- untagged resources block deployment in CI
14. Budget overrides require C-level approval with documented business justification
15. RI/SP utilization must be > 70% -- underutilized reservations reviewed monthly
16. Showback before chargeback -- teams must understand costs before being billed
17. Cost optimization decisions documented in ADRs

## Cost Scenarios and Responses

### Scenario: Unexpected Spend Spike
Detection: daily anomaly alert shows 35% increase in compute spend. Investigation: drill into billing export by service, region, label. Root cause: new deployment without spot flag. Response: tag with spot config, add CI validation. Automation: deployment-time validation for spot flag.

### Scenario: Idle Resources
Detection: weekly idle resource report. Investigation: identify owners via creator tag. Response: delete unattached volumes, orphaned LBs, idle NAT. Automation: auto-delete after grace period.

### Scenario: Reserved Instance Coverage Gap
Detection: monthly RI/SP report shows coverage dropped from 65% to 45%. Investigation: new workload without RI coverage. Response: purchase additional RI, adjust workload. Automation: alert when coverage < 50%.

### Scenario: Tagging Drift
Detection: tagging compliance drops below 90%. Investigation: new team deployed without tag enforcement. Response: enforce in CI, backfill tags, block new untagged resources. Automation: CI gate that requires tags.

## References
- references/finops-fundamentals.md -- Finops Fundamentals
- references/finops-advanced.md -- Finops Advanced Topics
- references/finops-automation.md -- FinOps Automation
- references/finops-governance.md -- FinOps Governance
- references/finops-practices.md -- FinOps Practices
- references/cost-optimization.md -- Cost Optimization
- references/finops-maturity-model.md -- FinOps Maturity Model
- references/finops-cost-optimization-levers.md -- Cost Optimization Levers

## Handoff
Hand off to finops for cost visibility and optimization. Hand off to cloud-specific skills (aws/azure/gcp) for resource provisioning at optimized price. Hand off to monitoring for utilization metrics used in right-sizing.
