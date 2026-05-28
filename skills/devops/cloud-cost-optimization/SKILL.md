---
name: devops-cloud-cost-optimization
description: >
  Use this skill when optimizing cloud costs: FinOps, cost allocation, compute cost optimization, storage cost reduction, data transfer costs, reserved instances, spot instances, savings plans, cost tagging, budget alerts, waste reduction.
  This skill enforces: cost allocation strategy, compute optimization approach, storage lifecycle management, budget alert configuration, waste identification.
  Do NOT use for: on-premise cost optimization, cloud migration planning, security compliance (use security skills).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cost, cloud, phase-11]
---

# Cloud Cost Optimization Agent

## Purpose
Reduces cloud spend through cost allocation, compute/storage optimization, budget controls, and waste elimination following FinOps best practices.

## Agent Protocol

### Trigger
User request includes: cloud cost optimization, FinOps, cost allocation, compute cost, storage cost, data transfer cost, reserved instances, spot instances, savings plans, cost tagging, budget alerts, waste reduction.

### Protocol
1. Analyze current spend by service, account, and tag.
2. Design cost allocation strategy (tags, accounts, cost centers).
3. Optimize compute (right-sizing, spot, reserved, savings plans).
4. Optimize storage (lifecycle policies, tiering, compression).
5. Reduce data transfer costs.
6. Set up budgets and anomaly detection.
7. Identify and eliminate waste.

## Output
Cloud cost optimization framework with allocation strategy, compute/storage optimization, budget alerts.

### Response Format
```
## Cloud Cost Optimization Framework
### Cost Allocation
Tagging Schema: {key:value pairs}
Cost Centers: [{name, owners, accounts}]
Chargeback Method: {showback / chargeback / no chargeback}
Reporting Cadence: {weekly / monthly}

### Compute Optimization
Right-sizing: {review cadence} | Tool: {AWS Compute Optimizer / Azure Advisor}
Spot Usage: {N% of eligible workloads}
Reserved Coverage: {N% of steady-state}
Savings Plans: {N-year, partial upfront}

### Storage Optimization
Lifecycle: {standard -> IA -> glacier -> delete after N days}
Compression: {enabled/disabled} | Savings: {N%}
Unused Volumes: {detection cadence}

### Budget & Alerts
Monthly Budget: ${N}
Alert Thresholds: [{50%, 80%, 90%, 100%}]
Anomaly Detection: {tool} | Sensitivity: {medium/high}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick.

### Completion Criteria
- [ ] Cost allocation strategy defined with tagging schema.
- [ ] Compute optimization plan: right-sizing cadence, spot/reserved targets.
- [ ] Storage lifecycle policies configured for each service.
- [ ] Data transfer audit completed.
- [ ] Budget alerts set for all accounts.
- [ ] Waste identification process automated with scheduled reports.
- [ ] FinOps review cadence established.

## Workflow

### Step 1: Cost Allocation
Define mandatory tags: `cost-center`, `environment`, `owner`, `project`. Use AWS Organizations / Azure Management Groups for account structure. Map accounts to cost centers. Implement showback or chargeback reporting. Tag propagation: ensure resource groups propagate tags to child resources. Use AWS Cost Categories or Azure Cost Management rules for hierarchical grouping. Automated enforcement: CI pipeline rejects untagged resources. Weekly untagged resource report emailed to owners.

### Step 2: Compute Optimization
- **Right-sizing**: Review instance families and sizes monthly. Use utilization metrics (CPU < 40%, memory < 50% -> downsize). Use AWS Compute Optimizer, Azure Advisor, or GCP Recommender for recommendations.
- **Spot**: Target 80%+ spot coverage for fault-tolerant workloads. Use mixed instances policy with 3+ instance types and 2+ AZs. Implement graceful shutdown handling for spot interruptions.
- **Reserved**: 1-year for predictable, 3-year for stable, partial upfront for balance. Cover 60-80% of stable baseline usage.
- **Savings Plans**: Compute Savings Plans for EC2+Fargate+Lambda. EC2 Savings Plans for specific families. Evaluate RI vs SP tradeoffs per service.

### Step 3: Storage Optimization
S3 lifecycle: Standard (30d) -> Infrequent Access (90d) -> Glacier (365d) -> Deep Archive (delete after). EBS: gp3 for most, io2 for high-performance. Delete unattached volumes. Use S3 Intelligent-Tiering for unpredictable access patterns. Enable compression for log and text data. Review and delete orphaned snapshots weekly. Set up lifecycle policies on all buckets.

### Step 4: Data Transfer Cost
Minimize inter-region and inter-AZ traffic. Use CloudFront for egress optimization. Use Direct Connect / Transit Gateway for internal traffic. Review NAT Gateway data processing charges monthly -- prefer VPC endpoints. S3 Transfer Acceleration for global uploads only if latency-sensitive. Inter-region VPC peering costs per GB both directions.

### Step 5: Budget & Alerts
Set monthly budget per account and cost center. Alert at 50%, 80%, 90%, 100%. Use anomaly detection (AWS Cost Anomaly Detection, Azure Cost Management). Automate response with webhooks. Set service-level budgets to prevent one service's overspend masking others. Weekly reviews with cost center owners.

### Step 6: Waste Identification
Identify: idle load balancers, unattached EBS volumes, underutilized RDS instances, orphaned snapshots, elastic IPs not in use, oversized instances, idle NAT gateways, unused reserved instances. Schedule weekly waste report. Auto-delete unattached volumes after 14-day grace period. Elastic IP remediation: release unassociated IPs.

### Step 7: FinOps Culture
Establish FinOps team (Central + Biz + Eng). Weekly cost review meetings. Tag compliance enforced in CI/CD. Cost factored into architecture decisions. Regular training on cost awareness. Unit economics: cost per transaction, per user, per API call. Chargeback/showback processes drive team accountability.

## Architecture / Decision Trees

### Cost Optimization Architecture Options

| Model | Description | Best For |
|---|---|---|
| Centralized FinOps | Single team manages all cost optimization | Small orgs, shared accountability |
| Federated FinOps | Each team manages own costs with central tooling | Large orgs, team ownership |
| Hub-and-Spoke | Central platform with delegated spend authority | Enterprises with shared platform |

### Reserved Instance vs Savings Plan Decision Tree
- Stable, specific instance family: EC2 Reserved Instance (higher discount, less flexible)
- Mix of EC2, Fargate, Lambda: Compute Savings Plans (flexible, good discount)
- Short-term commitment preferred: 1-year (less discount, more flexibility)
- Maximum discount needed: 3-year all upfront (highest discount, least flexibility)
- Low confidence in baseline: On-demand + spot (no commitment)

### Discount Vehicle Comparison

| Vehicle | Discount | Flexibility | Term | Best For |
|---|---|---|---|---|
| On-Demand | 0% | Full | None | Variable, short-lived |
| Spot | 60-90% | Full (with interruption) | None | Fault-tolerant, stateless |
| Reserved Instance | 40-72% | Low (specific family/region) | 1-3yr | Stable baseline |
| Compute Savings Plan | 30-66% | High (EC2+Fargate+Lambda) | 1-3yr | Diverse compute |
| EC2 Savings Plan | 30-66% | Medium (specific family) | 1-3yr | EC2-only baseline |

### Storage Tier Decision Tree
- Accessed daily: Standard (S3 Standard, EBS gp3)
- Accessed weekly: Infrequent Access (S3 IA, EBS sc1)
- Accessed monthly/yearly: Glacier / Archive
- Compliance hold, never accessed: Deep Archive / Coldline
- Unpredictable access: Intelligent-Tiering (auto-move)

### Waste Detection Priority
1. Unattached EBS volumes (immediate savings, no risk)
2. Orphaned snapshots (direct cost, no value)
3. Idle load balancers (monthly fixed cost)
4. Over-provisioned RDS (non-trivial savings)
5. Unassociated elastic IPs (small but cumulative)
6. Underutilized EC2 (requires analysis)
7. Orphaned NAT gateways (expensive per hour)

## Common Pitfalls

### Pitfall 1: Tagging Without Enforcement
Creating a tagging standard is not enough. Without enforcement in CI/CD, tags drift and become useless. Block deployments of untagged resources. Automatically tag resources based on creator metadata. Send weekly untagged resource reports. Track tag compliance as a KPI.

### Pitfall 2: Reserved Instance Over-Purchase
Buying RIs without right-sizing first locks in waste. If you RI a m5.xlarge and then right-size to m5.large, you pay for unused capacity. Always right-size first, then reserve. Use RI utilization reports to validate. Exchange or sell unused RIs on the marketplace.

### Pitfall 3: Ignoring Data Egress Costs
Teams focus on compute and storage but miss egress costs. Cross-region data transfer can exceed compute costs. Co-locate dependent services. Review data transfer costs monthly. Use CloudFront/CDN for internet-facing egress. Monitor NAT Gateway data processing charges.

### Pitfall 4: Over-Provisioning for Peak
Building for peak load without auto-scaling wastes 50-70% of capacity. Use auto-scaling groups, target tracking policies, and scheduled scaling. Test scaling policies with load testing. Right-size for average, scale for peak.

### Pitfall 5: Manual Waste Remediation
Finding waste is wasted effort if remediation is manual. Automate deletion of unattached volumes, orphaned snapshots, and idle resources. Use Instance Scheduler for non-production instances. Tag resources with `auto-stop` and `auto-delete` metadata.

### Pitfall 6: Free Tier Overages
Teams assume free tier covers everything. Free tier limits are per-account and per-service. Monitor free tier usage against limits. Set budgets at zero for accounts on free tier. Enable usage alerts for approaching free tier limits.

### Pitfall 7: Premium Tier Overuse
Defaulting to provisioned IOPS (io1/io2) when gp3 suffices. gp3 offers baseline performance included in price. Only use io2 for workloads requiring >160,000 IOPS or >1,000 MB/s per volume. Similarly, defaulting to premium support tiers.

### Pitfall 8: Storage Over-Retention
Keeping all versions, snapshots, and logs indefinitely. Set lifecycle policies. Delete old snapshot versions. Compress logs. Use object lock for compliance, not as default retention. S3 versioning cleanup: delete noncurrent versions after N days.

## Best Practices

### Tagging Strategy
- Mandatory tags: `cost-center`, `environment`, `owner`, `project`, `terraform`, `application`
- Automatically apply inherited tags from resource group to child resources
- Use `terraform default_tags` for consistent tagging across IaC
- Tag compliance target > 95% -- missing tags block deployment
- Tag history: maintain tag lineage through infrastructure state
- Use cost categories (AWS) / cost rules (Azure) for multi-dimensional allocation

### Rightsizing Process
- Review CPU/memory utilization over 14-day trailing window
- Downsize instances with avg CPU < 20% AND memory < 40%
- Consider upgrade for CPU > 60% OR memory > 80%
- Use cloud provider recommender engines
- Quarterly re-evaluation cycle
- For K8s: VPA recommendations, Kubecost right-sizing reports

### Budget Governance
- Budget per cost-center, per environment, per service
- Alert thresholds: 50% (inform), 80% (warn), 90% (critical), 100% (escalation)
- Automate response: tag resources, pause non-critical deployments
- Monthly budget review with cost center owners
- Quarterly budget adjustments based on new workloads
- Budget overrides require documented business justification

### Anomaly Detection
- Daily check: spend > 20% above trailing 7-day average
- Weekly check: spend > 30% above previous week
- Service-level per-service check against budget/30
- New resource type alert: any new instance type or service
- Notification to #finops-alerts, escalation after 4h

## Compared With

### Cloud Cost Optimization vs FinOps
Cloud cost optimization is the technical practice of reducing spend (right-sizing, reservations, lifecycle policies). FinOps is the broader cultural and operational framework (allocation, accountability, continuous improvement). Cost optimization is a tactic within FinOps. Use this skill for the practical execution; FinOps skill for the organizational maturity model.

### AWS vs Azure vs GCP Cost Management
| Feature | AWS | Azure | GCP |
|---|---|---|---|
| Cost Explorer | AWS Cost Explorer | Azure Cost Management | GCP Cost Management |
| Recommendations | Compute Optimizer | Azure Advisor | Recommender |
| Budgets | AWS Budgets | Azure Budgets | GCP Budgets |
| Anomaly Detection | Cost Anomaly Detection | Azure Cost Anomaly | GCP Anomaly Detection |
| Reserved/Committed | RIs + Savings Plans | Reserved + Azure Hybrid Benefit | Committed Use Discounts |
| Spot/Preemptible | EC2 Spot | Azure Spot VMs | Preemptible VMs |
| RI/SP Marketplace | Yes | Yes | No (CUD can be sold) |

### Reserved Instance vs Compute Savings Plan
RIs: 40-72% discount, specific instance family/region, low flexibility. Compute SP: 30-66%, broad EC2+Fargate+Lambda, high flexibility. For organizations with diverse compute usage, SPs are safer. For stable, known instance families, RIs provide max discount.

## Operations & Maintenance

### Monthly Cost Review Agenda
1. Executive summary: total spend vs budget, month-over-month trend, YTD savings
2. Top 10 cost increases: service, team, environment breakdown
3. Anomaly report: anomalies detected, investigated, resolved
4. RI/SP report: coverage %, utilization %, expiring reservations
5. Right-sizing report: downsized instances, savings realized
6. Storage optimization: lifecycle transition savings, orphaned cleanup
7. Kubernetes cost: namespace spend, idle cluster, Kubecost recommendations
8. Unit economics trends: cost per request/user/transaction
9. Optimization roadmap: planned changes with expected savings
10. Governance review: tagging compliance, budget compliance

### Cost Governance Automation
1. Budget creation: automated per cost-center using IaC
2. Cost anomaly detection: daily automated scan and notify
3. Untagged resource detection: hourly scan, auto-tag with creator
4. Idle resource sweep: weekly automated deletion
5. RI/SP utilization report: daily refresh, alert on low utilization
6. Right-sizing report: monthly automated recommendations
7. Budget enforcement: alert at 100%, restrict at 150%

### Waste Remediation Automation
- Unattached volumes: auto-delete after 14-day grace period
- Orphaned snapshots: delete after 30 days of no parent volume
- Idle load balancers: notify owner, delete after 7 days
- Unassociated elastic IPs: release after 24h
- Underutilized RDS: notify, schedule resize window
- Orphaned NAT gateways: notify, delete after 48h
- Old EBS snapshots ( > 365d): archive to S3 glacier

## Rules
- Every resource must have mandatory tags -- enforce in IaC
- Spot instances must have fallback to on-demand
- Reserved instances cover a minimum of 65% steady-state compute
- Storage lifecycle policies are mandatory for all buckets
- Budget alerts must cover 100% of accounts -- no exceptions
- Waste reports must be automated and sent to cost center owners
- Never over-provision for peak -- use auto-scaling
- Right-size before buying reserved capacity
- Unit economics tracked and trended monthly
- Tagging compliance target > 95%
- Budget overrides require documented approval
- Cross-region data transfer costs tracked monthly
- K8s cost visibility via Kubecost -- namespace and label-level allocation
- Weekly cost reviews with engineering teams

## References
- references/cloud-cost-optimization-fundamentals.md -- Cloud Cost Optimization Fundamentals
- references/cloud-cost-optimization-advanced.md -- Cloud Cost Optimization Advanced Topics
- references/cost-allocation.md -- Cloud Cost Allocation
- references/compute-optimization.md -- Compute Cost Optimization
- references/storage-network-optimization.md -- Storage and Network Cost Optimization
- references/cost-optimization.md -- Cloud Cost Optimization Techniques
- references/cloud-cost-optimization-finops.md -- FinOps Integration and Maturity
- references/cloud-cost-visibility-allocation.md -- Cost Visibility and Allocation

## Handoff
For Kubernetes cost optimization, hand off to `devops-kubernetes-for-data`. For general infrastructure DevOps, hand off to `docker-patterns`.
