---
name: devops-cloud-cost-optimization
description: >
  Use this skill when optimizing cloud costs: FinOps, cost allocation, compute cost optimization, storage cost reduction, data transfer costs, reserved instances, spot instances, savings plans, cost tagging, budget alerts, waste reduction.
  This skill enforces: cost allocation strategy, compute optimization approach, storage lifecycle management, budget alert configuration, waste identification.
  Do NOT use for: on-premise cost optimization, cloud migration planning, security compliance (use security skills).
version: "1.0.0"
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
Lifecycle: {standard → IA → glacier → delete after N days}
Compression: {enabled/disabled} | Savings: {N%}
Unused Volumes: {detection cadence}

### Budget & Alerts
Monthly Budget: ${N}
Alert Thresholds: [{50%, 80%, 90%, 100%}]
Anomaly Detection: {tool} | Sensitivity: {medium/high}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

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
Define mandatory tags: `cost-center`, `environment`, `owner`, `project`. Use AWS Organizations / Azure Management Groups for account structure. Map accounts to cost centers. Implement showback or chargeback reporting.

### Step 2: Compute Optimization
- **Right-sizing**: Review instance families and sizes monthly. Use utilization metrics (CPU < 40%, memory < 50% → downsize).
- **Spot**: Target 80%+ spot coverage for fault-tolerant workloads. Use mixed instances policy.
- **Reserved**: 1-year for predictable, 3-year for stable, partial upfront for balance.
- **Savings Plans**: Compute Savings Plans for EC2+Fargate+Lambda. EC2 Savings Plans for specific families.

### Step 3: Storage Optimization
S3 lifecycle: Standard (30d) → Infrequent Access (90d) → Glacier (365d) → Deep Archive (delete after). EBS: gp3 for most, io2 for high-performance. Delete unattached volumes. Use S3 Intelligent-Tiering for unpredictable access.

### Step 4: Data Transfer Cost
Minimize inter-region and inter-AZ traffic. Use CloudFront for egress. Use Direct Connect / Transit Gateway for internal traffic. Review NAT Gateway and data transfer costs monthly.

### Step 5: Budget & Alerts
Set monthly budget per account and cost center. Alert at 50%, 80%, 90%, 100%. Use anomaly detection (AWS Cost Anomaly Detection, Azure Cost Management). Automate response with webhooks.

### Step 6: Waste Identification
Identify: idle load balancers, unattached EBS volumes, underutilized RDS instances, orphaned snapshots, elastic IPs not in use, oversized instances. Schedule weekly waste report.

### Step 7: FinOps Culture
Establish FinOps team (Central + Biz + Eng). Weekly cost review meetings. Tag compliance enforced in CI/CD. Cost factored into architecture decisions. Regular training on cost awareness.

## Rules
- Every resource must have mandatory tags — enforce in IaC.
- Spot instances must have fallback to on-demand.
- Reserved instances cover a minimum of 65% steady-state compute.
- Storage lifecycle policies are mandatory for all buckets.
- Budget alerts must cover 100% of accounts — no exceptions.
- Waste reports must be automated and sent to cost center owners.
- Never over-provision for peak — use auto-scaling.

## References
- `references/cost-allocation.md` — Tagging strategy, cost centers, multi-account, chargeback/showback, budget alerts, anomaly detection
- `references/cost-optimization.md` — Compute right-sizing, spot/reserved/savings plans, storage lifecycle/tiers/compression, data transfer, waste elimination

## Handoff
For Kubernetes cost optimization, hand off to `devops-kubernetes-for-data`. For general infrastructure DevOps, hand off to `docker-patterns`.
