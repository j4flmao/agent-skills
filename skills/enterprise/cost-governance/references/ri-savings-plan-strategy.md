# Reserved Instance and Savings Plan Strategy

## Overview
Commitment-based discounts (RIs, Savings Plans) offer 30-60% savings on compute costs but require careful planning to avoid over-commitment. This reference covers analysis, purchasing, and management of cloud commitments.

## Commitment Types by Cloud Provider

### AWS
| Type | Scope | Discount | Flexibility | Best For |
|------|-------|----------|-------------|----------|
| EC2 Instance Savings Plan | Instance family in region | Up to 72% | Instance size within family | Stable EC2, any OS/tenancy |
| Compute Savings Plan | Any compute in region | Up to 66% | Instance family, region, OS, tenancy | Mixed compute workloads |
| Convertible RI | Specific instance | Up to 62% | Convert to different family | Known workloads, may change |
| Standard RI | Specific instance | Up to 72% | None (locked to spec) | Fully predictable workloads |

### Azure
| Type | Scope | Discount | Flexibility |
|------|-------|----------|-------------|
| Reserved VM Instance | VM series in region | Up to 72% | Instance size within series |
| Azure Savings Plan | Any compute globally | Up to 65% | Service, region, SKU |
| Reserved Capacity (Cosmos DB, SQL DB) | Specific service | Up to 55% | Region, service tier |

### GCP
| Type | Scope | Discount | Flexibility |
|------|-------|----------|-------------|
| Committed Use Discount (CUD) | Resource type in region | Up to 57% (1yr), 70% (3yr) | Resource type, region |
| CUD (Flexible) | vCPU + memory in region | Up to 55% (1yr) | Modify machine type monthly |

## Analysis Before Purchase

### Workload Eligibility Assessment
| Workload Characteristic | RI/SP Suitability |
|------------------------|-------------------|
| Runs 24/7, stable utilization | Excellent |
| Runs business hours only | Good (if 8+ hours daily) |
| Variable > 30% month-to-month | Poor (use spot or on-demand) |
| Short-lived (< 1 month) | Do not purchase |
| Development/test, batch jobs | Poor (use spot) |

### Utilization Analysis Process
1. Extract 90-day resource utilization data from cloud cost API
2. For each instance family: calculate average and peak utilization
3. Identify instances with > 60% average utilization and < 30% monthly variance
4. Calculate recommended coverage: stable workload hours / total hours
5. Validate with teams before purchase

### Sizing for RI Purchase
Purchase RIs at the instance-family level (e.g., m5.xlarge) rather than individual instance IDs. The RI applies to any running instance matching the family/size in the region. Over-purchasing at the family level is still usable as long as any instances of that family are running.

## Management and Optimization

### Coverage Monitoring
Monitor RI/SP coverage weekly. Target: 60-80% coverage. Below 60%: purchase additional commitments. Above 80%: risk of unused capacity — review workload changes before purchasing more.

### Expiration Management
Set calendar reminders 60 days before RI/SP expiration. Start evaluation 60 days out: is the workload still running? Will it continue for another 1-3 years? Has utilization changed? Purchase new commitment before expiration to avoid coverage gap.

### Modifying and Exchanging
- AWS Convertible RIs: Exchange for different instance family. Limited to 3 modifications per year.
- AWS Savings Plans: Cannot be modified but flexible by design.
- Azure RIs: Exchange for same-size different VM series. Cancel with penalty and partial refund.
- GCP CUDs: Cannot be canceled. Flexible CUD allows monthly machine type changes.

## Financial Planning

### Budgeting for Commitments
Commitments are upfront or monthly payments. Account for in cloud budget as committed spend, separate from variable spend. Monthly amortized cost: commitment fees + on-demand usage beyond commitment.

| Approach | Cash Flow | Savings | Best For |
|----------|-----------|---------|----------|
| All upfront | Large initial cost, lowest ongoing | Highest | Cash-rich, stable workloads |
| Partial upfront | Medium initial, moderate ongoing | Medium | Most organizations |
| No upfront | No initial, higher monthly | Lowest | Cash-constrained |

### Organizational Policy
- Centralized purchasing: One team (Cloud Infrastructure or Finance) manages all commitments
- Joint approval: Engineering recommends, Finance approves
- Quarterly review: Reassess commitment portfolio
- Chargeback allocation: Distribute savings back to teams based on usage
- Savings tracking: Compare blended rate before vs after commitment

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-purchasing | Pay for unused capacity | Purchase at 70% of peak, not 100% |
| Under-purchasing | Missed savings opportunity | Weekly coverage monitoring |
| Workload migration | Existing RIs in old region are wasted | Prefer Savings Plans over RIs |
| Service retirement | Inability to use commitment | Choose flexible commitment types |
| Vendor lock-in | Harder to switch providers | Limit commitments to 1-year terms for multi-cloud strategy |

## Key Points
- Target 60-80% coverage: under-purchasing loses savings, over-purchasing wastes money
- Prefer Savings Plans over RIs for flexibility — 66% discount vs 72% but much more adaptable
- Analyze 90-day utilization before any purchase — never buy without data
- 1-year terms for new workloads, 3-year terms for mature, stable workloads
- Centralize purchasing decisions but distribute savings visibility to teams
- Monitor coverage weekly, review portfolio quarterly, set expiration reminders 60 days ahead
- Flexible commitment types (Savings Plans, Azure Savings Plan) reduce over-commitment risk