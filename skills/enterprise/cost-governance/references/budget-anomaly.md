# Budget Management and Anomaly Detection

## Budget Structure

### Monthly Budget Hierarchy
```
Organization Budget: Total cloud spend cap
│
├── Engineering Budget: $X
│   ├── Platform: $X (40% of eng)
│   ├── Backend: $X (35% of eng)
│   └── Data: $X (25% of eng)
│
├── Product Budget: $X
│   ├── Growth: $X (60% of product)
│   └── Core: $X (40% of product)
│
└── Operations Budget: $X
    ├── Security: $X (50% of ops)
    └── IT: $X (50% of ops)
```

### Alert Thresholds
```
50%  → Notify: cost center owner (info)
80%  → Warning: cost center owner + manager
90%  → Critical: cost center owner + manager + finance
100% → Enforcement: triggers approval workflow
110% → Block: new non-critical deployments blocked
```

### Approval Gates
```
90-99%: Cost center manager approval required for new resources
100%+: Director approval required for any new spend
110%+: VP approval, exception review required
```

## Budget Implementation

### AWS Budgets (IaC)
```hcl
resource "aws_budgets_budget" "cost_center" {
  name         = "budget-${var.cost_center}"
  budget_type  = "COST"
  limit_amount = var.budget_amount
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator = "GREATER_THAN"
    threshold          = 50
    threshold_type     = "PERCENTAGE"
    notification_type  = "ACTUAL"
    subscriber_email_addresses = [var.owner_email]
  }
}
```

### Azure Budgets
```hcl
resource "azurerm_consumption_budget_resource_group" "example" {
  name             = "budget-${var.cost_center}"
  resource_group_id = azurerm_resource_group.example.id
  amount           = var.budget_amount
  time_grain       = "Monthly"

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThan"
    contact_emails = [var.owner_email]
  }
}
```

## Cost Anomaly Detection

### ML-Based Detection

#### AWS Cost Anomaly Detection
```
Monitor: Individual cost center spend
Granularity: Daily
Baseline: 90-day rolling window
Alert: >20% day-over-day increase
Channel: Slack, email, webhook
```

#### Azure Anomaly Detector
```
Monitor: Subscription and resource group level
Sensitivity: Medium (balance of false positives vs misses)
Alert: Anomaly score > 0.7
Channel: Azure Monitor action groups
```

### Threshold-Based Detection

#### Absolute Spikes
```
Daily spend > 2x previous 7-day average
New service appears with >$100 daily spend
Single resource cost > 10% of total daily spend
```

#### Relative Spikes
```
Cost center spend growth > 30% MoM without budget increase
Compute cost per transaction > 2x baseline
Storage cost growing > 10% per week
```

### Response Playbook
```
Alert Received
  → Investigate (automated: pull top 5 cost drivers)
    → Identify root cause
      → Legitimate growth: adjust budget, notify stakeholders
      → Configuration issue: fix (stale resources, wrong tier)
      → Anomaly/misuse: block resources, escalate to security
```

## Optimization Review

### Monthly Review Agenda
1. Review budget vs actual per cost center
2. Identify top 5 cost drivers
3. Evaluate reserved instance / savings plan recommendations
4. Right-sizing assessment (underutilized resources)
5. Action items and owners for next month
6. Track savings from previous optimizations

### Right-Sizing Rules
```
CPU < 5% for 14 days: Reduce instance size
Memory < 10% for 14 days: Reduce instance size
Unattached volumes > 30 days: Delete or snapshot
Idle load balancers > 14 days: Review if needed
Dev/staging instances: Schedule shutdown outside business hours
```
