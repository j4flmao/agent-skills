# Cloud Cost Governance Practices

## Cost Governance Framework Overview

A cost governance framework establishes policies, processes, and tools to manage cloud spending. It covers allocation, budgeting, chargeback/showback, anomaly detection, and optimization across all cloud providers.

## Cost Allocation

### Tagging Strategy
```
Mandatory Tags (enforced via policy-as-code):
- cost-center: {engineering, marketing, data, platform}
- environment: {production, staging, development, testing}
- owner: {team-name or individual-email}
- project: {project-id or initiative-name}
- service: {service-name}
- created-by: {tool or user}

Optional Tags:
- version: {application version}
- compliance: {soc2, hipaa, pci}
- lifecycle: {permanent, ephemeral, temporary}
```

### Cost Allocation Models
```
Model | Description | Best For
------|-------------|---------
Tag-based | Resources tagged with cost center | Organizations with mature tagging
Hierarchical | Management group per cost center | Azure/AWS organizations with clear structure
Blended | Percentage-based split across teams | Shared infrastructure costs
Usage-based | Per-resource metering and billing | SaaS platforms with tenant-level tracking
```

### Cost Category for Untagged Resources
```
Create cost category rules:
- Untagged compute → "Unallocated Compute"
- Untagged storage → "Unallocated Storage"  
- Untagged network → "Unallocated Network"
Report untagged costs to owners monthly
Target: <5% of total spend untagged
```

## Budget Policies

### Budget Structure (Monthly)
```
Cost Center: Engineering
  Production: $120,000
  Staging: $15,000
  Development: $25,000
  Testing: $10,000
  Total: $170,000

Cost Center: Marketing
  Production: $45,000
  Analytics: $20,000
  Total: $65,000

Shared Services: $30,000
  DNS, monitoring, CI/CD runners
```

### Budget Alert Thresholds
```
50% — Notification: "You've used 50% of monthly budget"
80% — Warning: "Budget at 80% — review spending trends"
90% — Critical: "Budget at 90% — plan for approval gates"
100% — Enforcement: "Budget exhausted — auto-approval required"

Approval Gates:
- >90%: Team lead approval required for new resources
- >100%: Director approval required for new resources
- >110%: CFO approval + justification memo
```

### Budget Creation with IaC
```hcl
resource "aws_budgets_budget" "engineering_prod" {
  name         = "engineering-production"
  budget_type  = "COST"
  limit_amount = "120000"
  limit_unit   = "USD"
  time_period_start = "2026-01-01/00:00:00"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 80
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"
    subscriber_email_addresses = ["team-lead@example.com"]
  }
}
```

## Chargeback and Showback

### Showback Model (Visibility Without Billing)
```
Monthly cost report per cost center:
- Compute spend by instance type
- Storage spend by volume type
- Data transfer costs
- Managed service costs
- Reserved instance savings allocation

Publish within 5 business days of month end
Dashboard with real-time cost visibility
No actual cost transfer between teams
```

### Chargeback Model (Billing)
```
Rate Card:
  General purpose compute: $0.05/vCPU-hour
  Memory-optimized compute: $0.08/vCPU-hour
  Standard storage: $0.10/GB-month
  Premium storage: $0.25/GB-month
  Data transfer: $0.01/GB
  Managed DB: cost + 10% overhead

Billing cycle: Monthly
Payment: Internal ledger, not actual money transfer
Dispute process: 5 business days to challenge
```

### Rate Card Design
```
Rate Type | Factors | Example
----------|---------|--------
Blended rate | Mix of on-demand + RI across pool | $0.042/vCPU-hr (blended)
Markup rate | Cost + overhead for managed services | DB cost × 1.15
Market rate | Current public cloud pricing | $0.0464/vCPU-hr (us-east-1)
Fixed rate | Annual flat fee per service | $500/seat/month for SaaS
```

## Anomaly Detection

### Detection Methods
```
Method | Detection | Response
-------|-----------|---------
Threshold-based | Day-over-day >20% increase | Slack alert + investigation
ML-based | AWS Cost Anomaly Detection | Automated root cause analysis
Spend pattern | New service, region, or instance type | Approval gate triggered
Usage spike | Unusual data transfer or API calls | Security investigation
```

### Anomaly Response Process
```
1. Detect: Alert fires in Slack #cost-alerts
2. Triage: On-call FinOps reviews within 1 hour
3. Analyze: Identify root cause (new deployment, misconfiguration, attack)
4. Act: Scale down, terminate, or approve
5. Document: Post-mortem if >$1K unexpected spend
6. Prevent: Add guardrails, update IaC, tune alerts
```

## Optimization Review Cadence

### Monthly Review
```
Participants: Cost center owners, FinOps team, platform engineers
Duration: 1 hour
Agenda:
1. Month-over-month spend comparison (10 min)
2. RI/SP coverage analysis (10 min)
3. Resource utilization review (15 min)
4. Optimization opportunities (15 min)
5. Action items (10 min)
```

### Optimization Categories
```
Compute:
- Right-size instances (review utilization last 30 days)
- Convert on-demand to reserved instances/savings plans
- Use spot instances for fault-tolerant workloads
- Implement auto-scaling for variable loads

Storage:
- Identify and clean up unattached volumes
- Transition cold data to cheaper tiers
- Enable lifecycle policies for automatic tiering
- Remove unused snapshots older than 90 days

Network:
- Optimize data transfer between regions
- Use CDN for static content delivery
- Review NAT gateway costs
- Consolidate underutilized load balancers

Licensing:
- Review per-seat costs vs usage
- Audit unused licenses
- Negotiate enterprise agreements at renewal
```

### Savings Tracking Dashboard
```
| Initiative | Estimated Savings | Actual Savings | Status |
|------------|------------------|----------------|--------|
| RI purchase (EC2) | $12,000/mo | $11,500/mo | On track |
| Unused EBS cleanup | $3,000/mo | $3,200/mo | Complete |
| S3 lifecycle policy | $1,500/mo | $1,400/mo | Deployed |
| Spot instance migration | $5,000/mo | $4,200/mo | In progress |

Total run-rate savings: $20,300/mo
Investment: $4,500/mo (RI commitment)
Net savings: $15,800/mo
```
