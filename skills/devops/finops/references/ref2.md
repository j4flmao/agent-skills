# Commitment Discounts: Savings Plans, Reservations and CUDs

Commitment-based discounts trade flexibility for a lower rate on steady usage. They are the largest single lever for predictable workloads and the riskiest, because a commitment cannot be cancelled. This reference compares the instruments, explains coverage and utilization math, and gives a purchase and monitoring process.

## Instruments Compared

| Provider | Instrument | Commit to | Flexibility | Term |
|----------|-----------|-----------|-------------|------|
| AWS | Compute Savings Plans | USD/hour of compute spend | Any EC2 family/size/region/OS/tenancy, Fargate, Lambda | 1 or 3 yr |
| AWS | EC2 Instance Savings Plans | USD/hour for one family in one region | Any size/OS within the family and region | 1 or 3 yr |
| AWS | Standard Reserved Instances | Specific instance attributes | Size flexibility within family (Linux, regional); can be listed on RI Marketplace | 1 or 3 yr |
| AWS | Convertible RIs | Instance attributes | Exchangeable for equal or greater value | 1 or 3 yr |
| AWS | RDS / ElastiCache / OpenSearch / Redshift reserved nodes; Database Savings Plans where available | Engine-specific capacity | Varies by service | 1 or 3 yr |
| Azure | Reservations | Specific VM series/region, or service capacity (SQL, Cosmos DB, etc.) | Instance size flexibility within a group; exchanges allowed per current policy | 1 or 3 yr |
| Azure | Savings plan for compute | Hourly spend | Across VM series, regions, App Service, Container Apps, Functions Premium | 1 or 3 yr |
| GCP | Resource-based CUDs | vCPU and memory in a region (per machine series) | Within the region and series family rules | 1 or 3 yr |
| GCP | Spend-based (flexible) CUDs | Hourly spend | Across eligible services and machine series per current program | 1 or 3 yr |

Exact discount percentages depend on instrument, term, payment option and service; read them from the provider's current pricing pages or recommendation APIs rather than using rules of thumb.

## Payment Options (AWS)

| Option | Discount | Cash impact |
|--------|----------|-------------|
| All Upfront | Highest | Full term paid at purchase |
| Partial Upfront | Middle | Part now, reduced hourly rate |
| No Upfront | Lowest | Hourly only; no capital outlay |

Choose based on cost of capital, not only the headline discount.

## Coverage and Utilization

```text
coverage    = commitment_covered_spend / total_eligible_on_demand_equivalent_spend
utilization = commitment_used / commitment_purchased
savings     = on_demand_equivalent_cost - (commitment_cost + uncovered_on_demand_cost)
```

- **Low utilization** means you bought more than you use: you pay for unused commitment.
- **Low coverage** means you leave discount on the table.
- Optimize for net savings: higher coverage increases the risk of under-utilization when usage drops.

### Sizing from the usage floor

```text
hourly eligible spend (on-demand equivalent), last 60 days
        ^
  $140  |      /\        /\
  $110  |  /\_/  \__/\__/  \_
   $90  |_/__________________\___   <- floor (min or p10)
        +-----------------------> hours
```

Commit near the floor (after rightsizing and waste removal); let peaks run on on-demand or spot. Recompute monthly and ladder additional purchases as the floor rises.

## Laddering

Instead of one large 3-year purchase:

- Buy a slice each month or quarter.
- Commitments expire on a rolling basis, so a migration (new architecture, cloud exit, ARM move) is never blocked by one large commitment.
- Each purchase uses the newest usage data.

## Recommendation APIs

```bash
# AWS
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT --lookback-period-in-days SIXTY_DAYS
aws ce get-reservation-purchase-recommendation --service "Amazon Relational Database Service"
aws ce get-savings-plans-utilization --time-period Start=2026-09-01,End=2026-10-01
aws ce get-savings-plans-coverage --time-period Start=2026-09-01,End=2026-10-01

# Azure
az consumption reservation recommendation list --scope "Single" --resource-type "VirtualMachines" \
  --look-back-period "Last30Days" --subscription "$SUB_ID"

# GCP
gcloud recommender recommendations list --project=$PROJECT --location=us-central1 \
  --recommender=google.compute.commitment.UsageCommitmentRecommender
```

Recommendations assume past usage continues; adjust for known changes (migrations, decommissions, seasonal peaks).

## Scope and Sharing

- AWS: Savings Plans and RIs apply across accounts in an Organization when discount sharing is enabled. Restrict sharing per account if business units must keep their own benefits.
- Azure: reservation and savings plan scope can be shared (billing account), management group, subscription, or resource group.
- GCP: CUDs can be shared across projects under the same billing account when discount sharing is enabled.

Shared scope maximizes utilization; single scope simplifies chargeback. Use amortized cost in showback so the team that consumes the discount pays for it.

## Risk Management

| Risk | Mitigation |
|------|------------|
| Usage falls (migration, decommission, efficiency work) | Commit to the floor; ladder; prefer flexible instruments |
| Architecture change (x86 to ARM, VMs to containers/serverless) | AWS Compute SP and Azure savings plan follow the spend across many compute types |
| Region change | Regional RIs/CUDs do not move; flexible spend-based instruments do |
| Price reductions by the provider | Shorter terms and laddering pick up new prices sooner |
| Purchases outside FinOps | Restrict purchase permissions (see `compliance_matrix.md`) |

## Monitoring Cadence

| Frequency | Check |
|-----------|-------|
| Weekly | Utilization below target (for example below 95%) triggers investigation |
| Monthly | Coverage trend, expiring commitments in next 90 days, new purchase slice |
| Quarterly | Strategy review with engineering roadmap (migrations, new regions) |

## Checklist

- [ ] Waste removal and rightsizing completed first
- [ ] Commitment sized to the post-optimization floor
- [ ] Flexible instruments preferred unless the workload is very stable
- [ ] Purchases laddered and approved through a FinOps role
- [ ] Utilization and coverage alerts in place
- [ ] Expirations tracked 90 days ahead
- [ ] Amortized cost used for showback
