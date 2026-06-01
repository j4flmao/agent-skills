# Cost Governance Advanced Topics

## Introduction
Advanced cost governance covers commitment purchase optimization, container cost allocation, data transfer optimization, multi-cloud FinOps, automated cost remediation, and integrating cost efficiency into engineering culture.

## Reserved Instances and Savings Plans

### RI/SP Strategy
Analyze 90-day utilization at instance-family level. Purchase RIs for stable, predictable workloads (databases, stateful services, production environments). Use Compute Savings Plans for broader coverage of variable workloads. Use EC2 Instance Savings Plans for instance-family-specific optimization.

### Coverage Optimization
Target coverage: 60-80% of compute spend on commitments. Below 60% misses savings opportunities. Above 80% risks paying for unused capacity.

Coverage measurement: (Commitment spend / Total compute spend) x 100. Monitor monthly. Adjust purchases as workloads change.

### RI/SP Management
- 1-year vs 3-year terms: 3-year offers higher discount but requires more confidence in workload stability
- Partial upfront vs all upfront: All upfront maximizes savings but requires capital
- Convertible RIs: Allow instance family change mid-term. Slightly lower discount than standard.
- Regional vs zonal: Regional covers AZ failover flexibility. Zonal offers higher discount.

## Container Cost Allocation

### Kubernetes Cost Challenges
Pods share nodes, making per-team cost allocation difficult. Pod resource requests vs actual usage often misalign. Namespace-level aggregation requires consistent labeling.

### Allocation Strategies
| Strategy | Granularity | Complexity | Accuracy |
|----------|-------------|------------|----------|
| Request-based | Namespace | Low | Low (over-provisioned) |
| Usage-based | Namespace | Medium | Medium |
| Request + usage blend | Namespace/pod | High | High |
| Node-level | Node | Low | Low |

### Tools
- Kubecost for real-time Kubernetes cost allocation
- Karpenter for cost-optimized node provisioning
- Vertical Pod Autoscaler (VPA) for rightsizing requests/limits
- Cluster Autoscaler/Karpenter for node right-sizing

## Data Transfer Cost Optimization

### Data Transfer Cost Sources
- Cross-region transfers (most expensive)
- Internet egress (second most expensive)
- Cross-AZ transfers (moderate)
- CDN origin fetches (moderate)
- NAT gateway data processing (per-GB)

### Optimization Strategies
| Strategy | Savings | Effort | Implementation |
|----------|---------|--------|----------------|
| CDN for static content | 40-60% on egress | Low | CloudFront/Fastly in front |
| Compression | 30-50% on transfer | Low | Gzip/brotli at edge |
| Regional affinity routing | 20-40% on cross-region | Medium | Route53 latency routing |
| Multi-AZ within region | 50-70% vs cross-region | Medium | Architecture change |
| Private connectivity | 30-50% on egress | High | Direct Connect/ExpressRoute |

## Multi-Cloud FinOps

### Unified Cost View
Aggregate cost data from all providers into a single platform (CloudHealth, Vantage, CloudZero). Normalize service categories across providers. Apply consistent tagging schema across clouds. Track unit economics universally.

### Cross-Cloud Optimization
Compare compute prices across clouds for equivalent workloads. Use spot/preemptible instances across all providers for fault-tolerant workloads. Negotiate unified discounts (AWS EDP, Azure MCA, GCP CUD).

## Automated Cost Remediation

### Auto-Stop Rules
Stop non-production resources during off-hours (weekends, nights). Save 40-60% on dev/test compute. Rules: tag environment=dev, schedule stop at 7pm, start at 7am. Exclude production and known always-on resources.

### Auto-Scale Down
Reduce over-provisioned resources automatically. Use cloud provider rightsizing recommendations. Implement with approval for production, auto for non-production.

### Budget Enforcement Automation
| Threshold | Action | Channel |
|-----------|--------|---------|
| 80% | Warning notification | Email + Slack |
| 90% | Critical alert + create ticket | PagerDuty + Jira |
| 95% | Limit auto-scaling max | Automation |
| 100% | Stop non-critical resources | Automation (with exceptions) |
| 110% | Notify director + finance | Phone + email |

## Cost Culture

### Engineering Incentives
Align cost efficiency with engineering goals. Include cost-per-transaction in team dashboards. Celebrate cost optimization wins (savings leaderboard). Avoid punishing teams for growth-driven cost increases (unit economics, not absolute spend, is the metric).

### CI/CD Cost Gates
Analyze cost impact of infrastructure changes in pull requests. Flag expensive resource additions before merge. Cost diff displayed alongside code diff. Approve over-budget changes through cost council.

### Cost Review Cadence
| Cadence | Activity | Participants |
|---------|----------|-------------|
| Daily | Cost anomaly monitoring | Platform team |
| Weekly | Budget alert review | Cost center owners |
| Monthly | Optimization review + savings tracking | Cloud Cost Council |
| Quarterly | Commitment purchase review | Finance + Engineering |
| Annual | Rate negotiation + budget planning | Cloud Cost Council + Finance |

## Key Points
- RI/SP coverage 60-80% maximizes savings without over-committing
- Container cost allocation requires namespace-level labeling and proper tooling
- Data transfer costs are often overlooked — optimize CDN, compression, and regional affinity
- Multi-cloud FinOps requires unified cost aggregation and consistent tagging
- Automated cost remediation (auto-stop, auto-scale) delivers immediate savings
- Cost culture means measuring unit economics, not absolute spend
- CI/CD cost gates prevent expensive resources from being deployed without review
- Monthly optimization reviews with tracked savings are the key governance mechanism