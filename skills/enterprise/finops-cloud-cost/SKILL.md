---
name: enterprise-finops-cloud-cost
description: >
  Use this skill when the user says 'cloud bill too high', 'finops', 'right-sizing', 'spot instances', 'savings plans', 'reserved instances', 'egress costs', 'unit economics cloud', 'cost allocation tags', 'showback', 'chargeback'. It applies the FinOps lifecycle (Inform, Optimize, Operate) to AWS/GCP/Azure spend: allocation, right-sizing, elasticity, commitment coverage and data-transfer architecture. Do NOT use for: Kubernetes autoscaler configuration (use devops/kubernetes-autoscaling), enterprise budget policy and approval governance (use enterprise/cost-governance), generic devops cost tooling (use devops-finops).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [enterprise, finops, cloud-cost, aws, gcp, azure, optimization]
---

# FinOps & Cloud Cost Optimization

## Purpose
Treat cloud cost as an engineering metric with an owner. Make spend visible per team/product, remove waste, buy commitments only for proven baseline load, and design architectures whose cost scales with business value (cost per order, per tenant, per request).

## Agent Protocol

### Trigger
"finops", "cloud cost", "aws bill", "right-sizing", "spot", "savings plan", "reserved instance", "committed use discount", "egress", "data transfer cost", "showback", "chargeback", "unit cost".

### Input Context
- Cloud provider(s), monthly spend, top 5 services by cost.
- Tagging/labeling coverage; account/project structure.
- Workload types: steady 24/7, business-hours, batch, interruptible.

### Output Artifact
Savings plan: ranked actions with estimated monthly savings, risk and owner.

### Response Format
```
Spend: {total}/mo  Allocated: {% tagged}
Top actions:
1. {action} | est. {savings}/mo | risk {low|med|high} | owner {team}
Commitment coverage target: {%} of steady baseline
Unit metric: {cost per X}
```

## FinOps Lifecycle

| Phase | Goal | Concrete outputs |
|-------|------|------------------|
| Inform | Everyone sees their cost | Mandatory tags (`team`, `service`, `env`, `cost-center`), cost dashboards, anomaly alerts |
| Optimize | Remove waste, lower rates | Right-sizing, schedules, spot, storage tiering, commitments |
| Operate | Keep it that way | Budgets per team, cost review in architecture/PR review, unit-cost KPIs |

## Optimization Levers (do in this order)

1. **Delete waste** — unattached volumes/disks, old snapshots, idle load balancers, unused public IPs, orphaned dev environments. Lowest risk, immediate.
2. **Schedule non-prod** — stop dev/staging outside working hours. A 12h×5d schedule runs 60 of 168 hours per week (~64% less runtime).
3. **Right-size** — use 2–4 weeks of utilization (CPU, memory, network; P95/P99 not averages). Tools: AWS Compute Optimizer, GCP Recommender, Azure Advisor. Prefer newer instance generations and ARM (Graviton/Axion/Cobalt-class) where software supports it.
4. **Elasticity** — autoscale on load; scale to zero for event-driven workloads.
5. **Spot/preemptible** — for stateless, checkpointed or retryable work (CI runners, batch, queue workers). Interruption notice: ~2 minutes on AWS, ~30 seconds on GCP and Azure. Diversify instance types and use capacity-optimized allocation.
6. **Commitments** — Savings Plans/RIs (AWS), Committed Use Discounts (GCP), Reservations/Savings Plans (Azure) for the steady baseline only, after right-sizing. Discounts depend on term, payment option and service; check the provider pricing page rather than quoting a fixed %.
7. **Storage tiering** — lifecycle policies to infrequent-access/archive classes; mind retrieval fees and minimum storage durations.

## Data Transfer (often the hidden line item)
- Internet egress is billed; ingress usually is not.
- Cross-AZ traffic is billed on AWS in both directions; chatty services and replicas across AZs add up.
- NAT gateway processing charges apply to traffic through it — use VPC gateway endpoints (S3, DynamoDB) or interface endpoints for high-volume AWS API traffic.
- Serve static assets via CDN; keep analytics/ETL in the same region as the data.
- Cross-region replication doubles storage and adds transfer — justify with RPO/RTO.

## Allocation & Accountability

```yaml
# Example tag policy (enforce via AWS Organizations tag policies / Azure Policy / GCP org policy + CI checks)
required_tags:
  team: "^[a-z-]+$"
  service: "^[a-z0-9-]+$"
  env: "^(prod|staging|dev|sandbox)$"
  cost-center: "^CC-[0-9]{4}$"
```
- Showback first (report), chargeback later (bill teams) once allocation >90% is trusted.
- Shared costs (networking, observability, platform) split by a documented key (usage, headcount or revenue).

## Unit Economics
Define one or two unit metrics tied to revenue drivers: cost per 1k requests, per active tenant, per order, per GB processed. Track trend per release; a rising unit cost with flat traffic is a regression.

## Anomaly Detection
- Enable provider anomaly detection (AWS Cost Anomaly Detection, GCP budget alerts, Azure cost alerts) per account/team.
- Budget alerts at 50/80/100% forecasted; route to the owning team channel, not finance only.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| Buying 3-year commitments before right-sizing | Right-size, then commit to the stable floor |
| Optimizing averages | Size on P95/P99 plus headroom |
| Spot for stateful single instances | Spot only for interruptible work |
| Untagged resources | Block creation via policy-as-code |
| Finance-only cost ownership | Engineering teams own their spend dashboards |

## Checklist
- [ ] Tag coverage measured and enforced
- [ ] Non-prod schedules in place
- [ ] Right-sizing reviewed monthly
- [ ] Commitment coverage/utilization tracked
- [ ] Data-transfer paths reviewed (NAT, cross-AZ, egress)
- [ ] Unit cost metric on a dashboard

## References
- `skills/enterprise/cost-governance/SKILL.md` — budget governance and approvals
- `skills/devops/finops/SKILL.md` — FinOps tooling in delivery pipelines
