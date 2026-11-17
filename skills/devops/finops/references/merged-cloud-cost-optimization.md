# Cloud Cost Optimization

> Reference for `devops/finops` — the entry point is [`../SKILL.md`](../SKILL.md). This file keeps only material the SKILL.md does not cover: an engineering checklist of savings levers, ordered by effort and risk.

## Order of Work
1. **Visibility first**: cost and usage data (AWS CUR 2.0 / Data Exports, Azure Cost Management exports, GCP billing export to BigQuery, or FOCUS-format exports) joined with tags/labels. Without allocation, savings cannot be attributed or sustained.
2. **Remove waste** (no commitment, low risk): idle and orphaned resources.
3. **Rightsize** (medium risk): match instance, disk and database sizes to measured utilization.
4. **Change the pricing model** (financial risk): Savings Plans / reservations / committed-use discounts for the stable baseline only, spot for interruptible work.
5. **Re-architect** (highest effort): storage tiering, data-transfer paths, managed vs self-run services.

## Waste Checklist
| Item | How to find it | Action |
|------|----------------|--------|
| Unattached block volumes (EBS, managed disks, PD) | Status `available` / no attachment | Snapshot if needed, then delete |
| Old snapshots and AMIs/images | Age + no reference from launch templates | Lifecycle policy (AWS DLM, Azure Backup policy) |
| Idle load balancers, NAT gateways, elastic/public IPs | Zero or near-zero traffic metrics | Delete; idle public IPv4 addresses are billed on AWS |
| Non-prod running 24/7 | Tag `env != prod` with 168 h/week uptime | Schedule off-hours stop (Instance Scheduler, Azure Automation, Cloud Scheduler) |
| Over-retained logs | Log groups with no retention set | Set retention; route verbose logs to cheaper storage |
| Previous-generation instance and volume types | Inventory by family (e.g. gp2 vs gp3) | Migrate; gp3 is usually cheaper than gp2 at equal baseline performance |

## Rightsizing Rules
- Use at least 14 days of p95/p99 CPU **and** memory data (memory needs an agent such as the CloudWatch agent on EC2).
- Downsize one step at a time and watch latency SLOs; do not rightsize from averages alone.
- Use provider recommenders (AWS Compute Optimizer, Azure Advisor, GCP Recommender) as input, not as automatic changes.
- In Kubernetes, rightsizing means requests: set requests from VPA recommendations or observed usage, then let node autoscaling (Cluster Autoscaler, Karpenter) pack nodes.

## Commitments and Spot
- Commit only to the **floor** of usage over the last several months; cover the variable part on demand or spot.
- Prefer flexible commitments (Compute Savings Plans, Azure savings plan for compute, GCP flexible CUDs) unless the workload is stable on one instance family/region.
- Spot/preemptible capacity can be reclaimed with short notice (about 2 minutes on AWS, 30 seconds on Azure and GCP): use it for stateless, checkpointed or batch work, diversify instance types, and handle the interruption signal.

## Storage and Data Transfer
- Object storage lifecycle rules: move cold data to infrequent-access/archive tiers; consider S3 Intelligent-Tiering when access patterns are unknown. Check minimum storage durations and retrieval fees before archiving.
- Data transfer is often the hidden line item: cross-AZ traffic, NAT gateway processing, and internet egress. Use VPC/private endpoints for cloud-service traffic, keep chatty services in one AZ where availability allows, and serve public content through a CDN.

## Guardrails
- Budgets and anomaly detection per account/subscription/project with alerts to the owning team.
- Tag policies or Azure Policy / GCP organization policies requiring `owner`, `cost-center`, `env`.
- Cost estimation in pull requests for IaC changes (for example Infracost) so cost is reviewed before deploy.

## Anti-Patterns
- Buying 3-year commitments before rightsizing.
- Optimizing the largest bill line without allocation data to show who owns it.
- "Multi-cloud arbitrage" as a cost strategy: egress and operational overhead usually outweigh price differences.
