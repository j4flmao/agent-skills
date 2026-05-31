# Cost Governance Framework Reference

## Overview

This reference provides a comprehensive framework for establishing and operating cloud cost governance in an enterprise. It covers organizational structure, policy design, cost allocation models, budget management, enforcement mechanisms, and integration with financial planning.

## Organizational Structure for Cost Governance

### Cloud Cost Council

A cross-functional body responsible for cost governance strategy and oversight:

Membership:
- Head of Cloud/Infrastructure (chair)
- VP of Engineering
- CFO or delegate
- FinOps lead (dedicated role)
- Cost center managers (rotating representatives)

Responsibilities:
- Define cost governance strategy and policies
- Approve cloud budgets and allocation model
- Review monthly cost reports and anomalies
- Authorize exception requests for budget overruns
- Approve reserved instance and savings plan purchases
- Review optimization program effectiveness
- Escalate cost issues to executive leadership

Meeting cadence: Monthly (60 minutes)

### FinOps Team

Dedicated team responsible for daily cost governance operations:

Roles:
- FinOps Lead: Owns the cost governance program, runs Cloud Cost Council meetings, manages the FinOps tooling
- Cloud Cost Analyst: Analyzes cost data, identifies anomalies, prepares reports, tracks optimization opportunities
- Cost Engineer: Implements governance automation (tag enforcement, budget IaC, cost dashboards), works with engineering on optimization
- Finance Liaison: Aligns cloud cost data with financial systems, manages chargeback/showback processes

Team size: 1-3 FTE per $10M annual cloud spend

### Inline Responsibilities

Cost governance is not solely a central team responsibility. Embed cost awareness:

Engineering Managers: Review team cloud spend weekly. Approve cost-impacting architecture decisions. Ensure team resources are tagged correctly.

Developers: Right-size resources, use appropriate pricing models, clean up unused resources, tag everything.

Product Managers: Include infrastructure cost in feature cost-benefit analysis. Consider cost impact of data retention, caching, and storage decisions.

## Cost Governance Policy Framework

### Policy Hierarchy

```
Level 1 - Principles (executive-level)
  "We maximize business value per dollar of cloud spend."

Level 2 - Policies (central FinOps team)
  "All resources must have mandatory tags before creation."

Level 3 - Standards (engineering standards body)
  "EC2 instances must use the company-standard AMI with cost agent installed."

Level 4 - Guidelines (team-level recommendations)
  "Development environments should use t3.medium instances unless performance testing."
```

### Mandatory Policies

Resource Tagging:
1. All resources MUST have the following tags at creation time: cost-center, environment, service, owner
2. Resources created without mandatory tags MUST be automatically terminated or denied (preventive control)
3. Tags MUST NOT be removed without change control approval
4. Tag values MUST follow the standard tag taxonomy (no free-text creative values)
5. Tag compliance MUST be reported weekly and tracked to remediation

Budget Enforcement:
1. All cost centers MUST have a monthly budget defined in the cost management system
2. Budget alerts MUST be configured at 50%, 80%, 90%, and 100% thresholds
3. At 100% budget consumption, automated enforcement actions MUST be triggered:
   - Non-production resources scaled down or stopped
   - Autoscale max reduced for non-critical services
   - New resource creation blocked (subject to exception process)
4. Budget overruns require approval: team lead (80-90%), director (90-100%), VP (100%+)

Resource Lifecycle:
1. Unattached resources (EIPs, volumes, load balancers) MUST be identified and removed weekly
2. Development and test environments MUST be scheduled to shut down during off-hours
3. Orphaned resources from terminated projects MUST be removed within 30 days
4. Reserved instances MUST be reviewed quarterly for coverage alignment

### Policy Enforcement Mechanisms

Preventive Controls (block non-compliant actions):
- AWS SCPs: Deny resource creation without mandatory tags
- Azure Policy: Deny or audit non-compliant resources
- GCP Organization Policy: Constrain resource creation
- Terraform Sentinel/OPA: Validate IaC before apply

Detective Controls (identify non-compliance):
- AWS Config: Rules for cost-related compliance
- Azure Policy audit mode: Identify non-compliant resources
- Scheduled compliance scans: Weekly report to cost center owners
- Custom scripts: Validate specific policies (e.g., instance types allowed)

Automated Remediation:
- AWS Config auto-remediation: Apply corrective action
- Lambda functions: Tag untagged resources, stop non-compliant instances
- Scheduled jobs: Identify and clean up unused resources weekly

### Policy Exception Process

When a policy exception is needed:
1. Submitter documents: what policy, why exception, duration, cost impact
2. Cost center manager reviews and approves
3. FinOps team logs exception in exception register
4. Automated enforcement is disabled for the specific resource/scope
5. Exception is time-limited (max 90 days, renewable once)
6. Expiration triggers review and automatic re-enforcement

Exception categories:
- Technical: Resource type does not support tagging (rare)
- Migration: Resources being migrated from legacy (30-day grace)
- Emergency: Hotfix requiring non-standard deployment (temporary)
- Experiment: Short-lived resources for testing (strict auto-cleanup)

## Cost Allocation Models

### Tag-Based Allocation

Direct cost allocation using resource tags:

| Tag | Example Values | Purpose |
|-----|---------------|---------|
| cost-center | eng-platform, data-analytics, prod-ml | Maps to financial cost center |
| environment | production, staging, development, testing | Separates by lifecycle stage |
| service | api-gateway, user-auth, payment-processing | Identifies business service |
| owner | team-identity, team-billing | Team accountable for cost |
| project | q4-migration, platform-upgrade | Tracks project-based spend |
| terraform | true|false | Identifies IaC-managed resources |

Cost allocation query (simplified):
```sql
SELECT
  tags.cost_center,
  tags.service,
  tags.environment,
  SUM(line_item_unblended_cost) as total_cost
FROM cost_and_usage_report
WHERE billing_period = '2025-01'
GROUP BY tags.cost_center, tags.service, tags.environment
```

### Shared Cost Allocation

Proportional allocation for shared resources (databases, load balancers, clusters):

Method 1 - Proportional by Usage:
```
Team A Share = Team A Usage / Total Usage * Shared Cost
Team B Share = Team B Usage / Total Usage * Shared Cost
```

Method 2 - Proportional by Headcount:
```
Team A Share = Team A Users / Total Users * Shared Cost
```

Method 3 - Equal Split:
```
Team A Share = Shared Cost / Number of Teams
```

Method 4 - Tiered Allocation:
```
Team A Share = Base Fee + (Team A Usage * Per-Unit Rate)
```

Recommendation: use Method 1 (usage-based) for most shared costs. Use Method 4 for managed services with fixed overhead.

### Hierarchical Allocation

Organizational hierarchy-based cost allocation:

```
Company (total cloud spend)
  +-- Engineering ($60M)
  |   +-- Platform ($40M)
  |   |   +-- Infrastructure ($25M)
  |   |   +-- Developer Tools ($10M)
  |   |   +-- CI/CD ($5M)
  |   +-- Product ($20M)
  |       +-- Identity ($8M)
  |       +-- Payments ($7M)
  |       +-- Search ($5M)
  +-- Data Science ($20M)
  |   +-- ML Training ($12M)
  |   +-- Data Warehouse ($8M)
  +-- Corporate ($5M)
      +-- IT ($3M)
      +-- Security ($2M)
```

Each node aggregates costs from its children. Leaves map to tagged resources. Create hierarchy in cloud provider cost management tools (AWS Organization, Azure Management Groups, GCP Resource Hierarchy).

### Blended Allocation

For organizations with complex shared infrastructure:

1. Identify direct costs: resources tagged to a single cost center (typically 60-80% of total)
2. Identify shared costs: resources used by multiple cost centers (typically 15-30%)
3. Identify overhead costs: management, security, networking (typically 5-10%)

Allocation:
- Direct costs: Allocate 100% to tagged cost center
- Shared costs: Allocate proportionally by usage metrics
- Overhead costs: Allocate proportionally by total spend or headcount

## Budget Management

### Budget Structure

Multi-level budget hierarchy:

```yaml
annual_cloud_budget: $100M
  quarterly_budgets:
    Q1: $23M
    Q2: $24M
    Q3: $25M
    Q4: $28M
  cost_center_budgets:
    eng-platform:
      monthly_budget: $3.5M
      annual_budget: $42M
      alerts: [50%, 80%, 90%, 100%]
    data-analytics:
      monthly_budget: $1.8M
      annual_budget: $21.6M
      alerts: [50%, 80%, 90%, 100%]
    ...
  growth_buffer: $5M (unallocated, for new initiatives)
```

### Budget Creation Automation

Define budgets as code:

```hcl
# budgets.tf
resource "aws_budgets_budget" "cost_center" {
  for_each = var.cost_centers

  name         = "budget-${each.key}"
  budget_type  = "COST"
  limit_amount = each.value.monthly_budget
  limit_unit   = "USD"
  time_period_start = "2025-01-01_00:00"
  time_unit    = "MONTHLY"

  cost_filters = {
    "TagKeyValue" = "cost-center$${each.key}"
  }

  notification {
    comparison_operator = "GREATER_THAN"
    threshold          = 50
    threshold_type     = "PERCENTAGE"
    notification_type  = "ACTUAL"
    subscriber_email_addresses = [each.value.owner_email]
  }

  notification {
    comparison_operator = "GREATER_THAN"
    threshold          = 100
    threshold_type     = "PERCENTAGE"
    notification_type  = "FORECASTED"
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }
}
```

### Budget Alert Routing

| Threshold | Alert To | Action |
|-----------|----------|--------|
| 50% | Cost center owner | Informational: "Your team is at 50% of monthly budget" |
| 80% | Cost center owner + director | Warning: "Your team is at 80%. Review spend trends." |
| 90% | Cost center owner, director, FinOps | Critical: "Your team will exceed budget at current rate. Approve additional spend or reduce." |
| 100% | Cost center owner, director, VP, FinOps | Enforcement: Automated actions triggered |
| Forecast 100% | Same as 100% | Proactive alert: "At current run rate, you will exceed budget by month end." |

### Approval Gates

Integration with approval workflow system:

```yaml
budget_exceedance_approval:
  80-90%:
    approver: team_lead
    required_justification: true
    auto_approve: false
    valid_duration: remaining_month

  90-100%:
    approver: director
    required_justification: true
    required_business_case: true
    valid_duration: one_time

  >100%:
    approver: vp_engineering + finops_lead
    required_justification: true
    required_business_case: true
    required_finance_review: true
    valid_duration: one_time + remediation_plan
```

## Cost Reporting and Analytics

### Reporting Cadence

Daily:
- Automated anomaly detection scan
- Top-5 cost changes (day-over-day)
- Budget burn rate by cost center

Weekly:
- Cost dashboard update with trend analysis
- Unused resource report
- RI/SP coverage report
- Tag compliance report

Monthly:
- Cost center performance vs budget
- Optimization progress and savings realized
- Anomaly investigation close-out
- Cloud Cost Council meeting

Quarterly:
- Comprehensive cost review
- RI/SP purchase recommendations
- Unit economics trends
- Budget planning for next quarter

### Dashboard Framework

Real-time cost visibility across all dimensions:

Widget 1 - Cost by Cost Center (bar chart)
- Current month spend per cost center
- Color: green (under budget), yellow (80-90%), red (90%+)
- Click-through to cost center detail

Widget 2 - Budget Health (gauges)
- Each cost center: % budget consumed
- Forecast: projected end-of-month vs budget
- Trend: daily spend rate (last 7 days average)

Widget 3 - Top Cost Drivers (heat map)
- Services ranked by month-over-month growth
- Dimension: service x environment
- Color intensity: growth rate

Widget 4 - Unit Economics (line chart)
- Cost per transaction
- Cost per active user
- Cost per API call
- 12-month trend with forecast

Widget 5 - Optimization Opportunities (table)
- Resource type | Current cost | Optimized cost | Savings | Effort
- Sorted by savings potential

Widget 6 - Anomalies (table)
- Date | Resource | Cost | % Change from baseline | Status
- Sorted by severity

### Unit Economics Calculation

Cost per Transaction (CPT):
```
CPT = Total Cloud Cost / Number of Business Transactions
```

Cost per Active User (CPU):
```
CPU = (Compute + Storage + Network + Managed Services) / MAU
```

Cost per API Call (CPAC):
```
CPAC = Total API Infrastructure Cost / Total API Calls
```

Cost per GB Stored (CPGS):
```
CPGS = Storage Cost / Total GB Stored
```

Trend these quarterly. If CPT increases, investigate: is it cost growth (bad) or transaction volume decrease (worse)? Target: unit costs decrease 5-10% annually (Moore's law + optimization).

## Integration with Financial Planning

### Cloud Cost Forecasting for Budgeting

Use historical trends plus business growth projections:

```
Forecasted Spend = Baseline + Growth Component + Seasonality + New Initiatives

Baseline: Current run-rate, normalized for one-time costs
Growth: Expected volume increase * cost per unit
Seasonality: Historical seasonal patterns (Q4 spikes)
New Initiatives: Planned launches, migrations, expansions
```

### Budget Variance Analysis

Monthly variance explanation:

| Cost Center | Budget | Actual | Variance | Explanation |
|-------------|--------|--------|----------|-------------|
| eng-platform | $3.5M | $3.8M | +$300K (8.6%) | New customer onboarding spike |
| data-analytics | $1.8M | $1.6M | -$200K (-11.1%) | ML training optimized, spot usage increased |

### Showback Invoice Format

Monthly showback communication to cost center owners:

```
To: Engineering - Platform Team
From: Cloud FinOps
Subject: Cloud Cost Showback - January 2025

Summary:
  Total Cloud Spend: $3,820,450
  Budget: $3,500,000
  Variance: +$320,450 (+9.2%)
  Forecast EOM: $3,780,000 (optimized, savings realized mid-month)

Cost Breakdown:
  Compute (EC2/EKS): $1,845,200 (48.3%)
  Storage (EBS/S3): $485,300 (12.7%)
  Database (RDS/DynamoDB): $623,400 (16.3%)
  Network (Data Transfer/CDN): $281,550 (7.4%)
  Managed Services: $585,000 (15.3%)

Top 5 Cost Changes:
  1. api-service (+$120K, 22%): Customer growth-driven scale-up
  2. cache-cluster (+$45K, 35%): Migrated to larger instance type
  3. data-pipeline (+$38K, 18%): New real-time processing job
  4. dev-environments (-$22K, -15%): Off-hours shutdown enabled
  5. legacy-migrated (-$15K, -10%): Decommissioned old DB instances

Optimization Savings (month): $42,000
YTD Optimization Savings: $185,000

Recommendations:
  1. Purchase RI for api-service (stable base load): save $85K/year
  2. Right-size 3 over-provisioned RDS instances: save $24K/year
  3. Enable S3 lifecycle on logs bucket: save $12K/year
```

## Maturity Model for Cost Governance

### Maturity Assessment

| Dimension | Level 1 (Crawl) | Level 2 (Walk) | Level 3 (Run) | Level 4 (Fly) |
|-----------|-----------------|----------------|---------------|---------------|
| Tagging | No standards | Defined, not enforced | Enforced, >90% compliance | Automated remediation |
| Budgeting | No budgets | Monthly budgets per team | Automated alerts + approval gates | Predictive budgeting |
| Allocation | Manual spreadsheets | Tag-based cost center allocation | Automated allocation + shared costs | Real-time allocation |
| Anomaly Detection | None | Threshold-based alerts | ML-based detection | Predictive anomaly prevention |
| Optimization | Occasional manual review | Monthly review, tracking savings | Automated recommendations | Integrated in CI/CD |
| Reporting | Aggregate invoice | Monthly showback | Real-time dashboards | Unit economics tracked |
| Accountability | No ownership | Cost center owners defined | Owner reviewed monthly | Cost KPIs in performance review |

### Level Advancement Plan

Level 1 to Level 2 (3-6 months):
1. Define tagging standard and enforce with SCPs
2. Set up monthly budgets per cost center
3. Implement basic cost dashboard
4. Publish first showback report
5. Schedule monthly optimization review

Level 2 to Level 3 (6-12 months):
1. Automate tag enforcement (preventive controls)
2. Implement ML-based anomaly detection
3. Deploy real-time cost dashboards
4. Automate budget creation with IaC
5. Implement approval gates for overruns
6. Track unit economics for top services
7. Establish Cloud Cost Council

Level 3 to Level 4 (12-18 months):
1. Integrate cost checks into CI/CD pipelines
2. Implement predictive cost forecasting
3. Automate remediation for common issues
4. Integrate cost data with financial planning systems
5. Make cost KPIs part of engineering performance
6. Implement chargeback for mature teams
7. Continuous optimization embedded in development workflow
