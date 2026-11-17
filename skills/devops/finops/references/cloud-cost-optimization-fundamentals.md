# Cloud Cost Optimization Fundamentals

## Overview
Cloud cost optimization reduces cloud spending by eliminating waste, choosing optimal pricing models, right-sizing resources, and implementing governance. It is a core practice within the FinOps framework.

## Core Concepts

### Cloud Pricing Models
On-Demand: pay per hour/second, no commitment, highest cost. Best for variable or short-lived workloads. Reserved Instances: 1 or 3 year commitment, 20-60% discount. Best for stable baseline workloads. Savings Plans: flexible commitment across instance families, similar discount to RI. Best for diverse compute needs. Spot/Preemptible: spare capacity, 60-90% discount, can be reclaimed. Best for fault-tolerant, stateless workloads.

### Cost Allocation
Tagging: assign metadata (Environment, Team, Project, CostCenter) to resources. Cost categories: group resources by business dimensions. Chargeback: bill teams based on measured usage. Showback: report usage without billing. Unit economics: cost per transaction, user, or deployment.

### Waste Categories
Orphaned resources: unattached volumes, unused IPs, idle load balancers. Over-provisioning: instances larger than needed. Over-allocated storage: provisioned but unused capacity. Unused reserved capacity: RI/SP with low utilization. Data transfer: cross-region and internet egress costs.

## Optimization Strategies

### Compute Optimization
Right-size based on 14-day CPU/memory utilization metrics. Use auto-scaling to match capacity with demand. Use spot instances for batch, stateless, and fault-tolerant workloads. Implement scheduled shutdown for non-production instances. Choose appropriate instance family (general, compute, memory, GPU).

### Storage Optimization
Use lifecycle policies to transition infrequently accessed data to cheaper tiers. Delete orphaned volumes and old snapshots. Choose appropriate storage class based on access patterns. Enable object versioning only when needed. Monitor and right-size provisioned IOPS.

### Network Optimization
Minimize cross-region and cross-AZ traffic. Use CDN for static content delivery. Use private endpoints instead of NAT Gateways for AWS/GCP services. Compress data before transfer. Monitor data transfer costs monthly.

### Governance
Set budget alerts at multiple thresholds. Implement tagging enforcement in CI/CD. Create cost visibility dashboards per team/service. Establish approval workflows for large resource requests. Conduct weekly cost reviews.

## Basic Cost Optimization

### Budget Alert
```hcl
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 80
    threshold_type      = "PERCENTAGE"
    notification_type   = "FORECASTED"
    subscriber_email_addresses = ["team@example.com"]
  }
}
```

## Best Practices
- Tag all resources with cost allocation metadata.
- Set budget alerts at 50%, 80%, 100%, and 150% thresholds.
- Right-size before purchasing reserved capacity.
- Monitor and report cost trends weekly.
- Automate detection and remediation of idle resources.
- Use spot instances for non-critical workloads.
- Review data transfer costs monthly.
- Implement cost-aware architecture decisions.

## References
- cloud-cost-optimization-advanced.md -- Advanced cloud cost optimization topics
- finops-practices.md -- FinOps Practices
- right-sizing.md -- Right-Sizing
- reserved-instances.md -- Reserved Instances and Savings Plans
- spot-instances.md -- Spot and Preemptible Instances
