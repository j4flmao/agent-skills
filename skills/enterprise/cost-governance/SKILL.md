---
name: enterprise-cost-governance
description: >
  Use this skill when implementing cloud cost governance: cost allocation, budgets, chargeback, anomaly detection, and optimization.
  This skill enforces: tagging strategy, budget alerts, cost anomaly detection, showback/chargeback.
  Do NOT use for: FinOps tool selection, procurement, vendor negotiation, invoice reconciliation.
version: "2.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, cost, phase-8]
---

# Cost Governance Agent

## Purpose
Implements cloud cost governance frameworks including allocation, budgeting, chargeback/showback, anomaly detection, and optimization.

## Framework/Methodology

### GOVERN-COST Framework
A six-pillar framework for systematic cloud cost governance:

Pillar 1 - Governance Structure: Define cost center hierarchy, assign budget owners, establish approval gates. Create a Cloud Cost Council with representatives from engineering, finance, and product.

Pillar 2 - Observability: Implement real-time cost visibility through native cloud tools and third-party platforms. Build dashboards per cost center, service, and resource type. Track unit economics (cost per transaction, per user, per API call).

Pillar 3 - Validation: Enforce tagging policy through policy-as-code. Use preventive controls (SCPs, organization policies) to block non-compliant resource creation. Implement detective controls (scheduled compliance scans).

Pillar 4 - Enforcement: Configure budget alerts at graduated thresholds. Implement automated actions (stop non-critical resources, send notifications, create tickets) when budgets are exceeded.

Pillar 5 - Remediation: Run recurring optimization workflows. Identify idle resources, right-size over-provisioned instances, purchase commitments for stable workloads. Track savings with auditable trail.

Pillar 6 - Strategic Planning: Integrate cost data into financial planning. Model cost scenarios for new products, regions, and features. Publish unit cost trends to measure engineering efficiency.

### FinOps Maturity Model

Level 1 - Crawl (Ad Hoc): Manual cost tracking, no tagging standards, reactive alerts. Basic monthly review of aggregate spend. Few or no optimization activities.

Level 2 - Walk (Defined): Tagging policy defined and enforced. Cost centers mapped. Budget alerts configured. Showback reports published monthly. Regular optimization reviews.

Level 3 - Run (Managed): Automated cost allocation. Chargeback implemented for mature teams. Anomaly detection covering 100% of spend. Optimization integrated into development workflow. Unit economics tracked.

Level 4 - Fly (Optimized): Real-time cost visibility across all dimensions. Predictive cost modeling. Automated remediation for budget overruns. Cost efficiency KPIs tied to engineering performance. Continuous optimization embedded in CI/CD.

### Cost Allocation Models Comparison

| Model            | Granularity | Complexity | Best For                          |
|------------------|-------------|------------|-----------------------------------|
| Tag-based        | Resource    | Medium     | Most organizations                 |
| Hierarchy-based  | Account/OU  | Low        | Multi-account with clear ownership |
| Blended          | Mixed       | High       | Complex org with shared services   |
| Proportional     | Usage-based | Medium     | Shared resources, data stores      |
| Direct          | Per-resource| Low        | Dedicated resources only           |

Recommended: Start with tag-based for direct costs, proportional for shared costs. Move to hierarchical as the organization grows.

## Architecture / Decision Trees

### Tagging Strategy Decision Tree
```
Is the resource shared across teams?
├── Yes → Is it a platform service (K8s, CI/CD)?
│   ├── Yes → Tag with shared-services cost-center, allocate proportionally
│   └── No → Tag with primary consumer cost-center
└── No → Tag with owning team's cost-center

Is the resource ephemeral (dev/test)?
├── Yes → Tag environment=dev, apply lower budget threshold
└── No → Tag environment=prod, apply full governance
```

### Optimization Priority Matrix
| Effort | Impact | Action | Timeline |
|--------|--------|--------|----------|
| Low | High | Delete idle resources, unattached IPs/volumes | Week 1 |
| Low | Medium | Right-size over-provisioned instances | Week 2-3 |
| Medium | High | Purchase RIs/SPs for stable workloads | Month 1 |
| Medium | Medium | Storage tiering (hot→cold→archive) | Month 2 |
| High | High | Architecture redesign (serverless, containerization) | Quarter 2+ |
| High | Medium | Data transfer optimization (CDN, compression) | Quarter 2-3 |

## Agent Protocol

### Trigger
Exact user phrases: cost governance, cloud cost, cost allocation, budget management, chargeback, showback, cost anomaly, FinOps, cloud budget, cost control.

### Input Context
- What is the cloud spend across providers (AWS, Azure, GCP)?
- How are resources currently tagged?
- What cost centers or business units exist?
- What is the monthly budget and approval workflow?
- What anomaly detection capabilities exist?

### Output Artifact
Cost governance framework with allocation model, budget structure, chargeback/showback plan, and anomaly detection configuration.

### Response Format
```
## Cost Governance Framework
### Cost Allocation
Model: {tag-based / hierarchy / blended}
Tag Schema: {mandatory tags}
Cost Centers: {list}

### Budget Structure
{period} | {amount} | {owner} | {alerts: 50/80/90/100%}

### Chargeback / Showback
Model: {chargeback/showback}
Rate Card: {compute/storage/network per-unit pricing}

### Anomaly Detection
Method: {ML-based / threshold-based}
Alert Channels: {Slack, email, PagerDuty}

### Optimization Review
Cadence: {monthly/quarterly}
Scope: {compute, storage, data transfer, licenses}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Tagging strategy defined and enforced
- [ ] Budget hierarchy created per cost center
- [ ] Alerts configured at 50/80/90/100% thresholds
- [ ] Chargeback or showback mechanism operational
- [ ] Anomaly detection deployed and tuned
- [ ] Monthly optimization review scheduled
- [ ] Approval gates implemented for budget overruns
- [ ] Dashboard with real-time cost visibility

### Max Response Length
7000 tokens

## Workflow

### Step 1: Cost Allocation
Define mandatory resource tags (cost-center, environment, owner, project, service). Enforce tags via policy-as-code (Azure Policy, AWS SCP, GCP Organization Policy). Create cost center hierarchy mapped to business units. Use cost categories for untagged resource grouping.

Tag design principles:
- Tag key names should be consistent across all cloud providers
- Include tags for: cost-center, environment, service, owner, project, terraform (or IaC tool)
- Avoid tags that change frequently (team member names, temporary project codes)
- Use a tag schema registry that teams can reference

Tag enforcement: Use preventive controls (deny creation of untagged resources) for mandatory tags. Use detective controls (weekly compliance report) for informational tags.

### Step 2: Budget Management
Create monthly budgets per cost center. Configure alerts at 50% (notification), 80% (warning), 90% (critical), 100% (enforcement). Implement approval gates: >90% spend requires team lead approval, >100% requires director approval. Automate budget creation with IaC.

Budget types:
- Monthly: standard operational budget. Reset each month.
- Quarterly: for projects with variable month-to-month spend.
- Annual: for committed use discounts and reserved instances.
- Forecast: proactive alert when forecasted spend exceeds budget.

Alert routing: 50/80% alerts by email to team lead. 90% by Slack/PagerDuty to team lead + director. 100% automated enforcement (limit scale-up, pause non-critical jobs).

### Step 3: Chargeback / Showback
Implement showback first (visibility without cost transfer). Define rate card for compute, storage, network, and managed services. Publish monthly cost reports per cost center. Transition to chargeback for mature organizations with clear accountability.

Showback implementation:
- Tag all resources with cost center
- Pull cost data daily from cloud provider APIs
- Publish dashboard per cost center showing spend by service
- Include trend (3-month) and forecast (month remaining)
- Highlight top-5 cost drivers per team

Chargeback prerequisites: mature tagging, clear ownership, finance system integration, dispute resolution process. Start with showback for 6 months before moving to chargeback.

### Step 4: Cost Anomaly Detection
Deploy ML-based anomaly detection (AWS Cost Anomaly Detection, Azure Anomaly Detector). Set day-over-day spending spike alerts (>20% increase). Configure new service usage alerts. Monitor reserved instance coverage. Alert on cost anomalies via Slack and email.

Anomaly detection rules:
- Daily spend variance > 20% from 7-day rolling average
- New resource type or service appearing in billing
- Instance family change (e.g., from t3 to c5)
- Region shift (traffic moving to more expensive region)
- Data transfer cost spike (>50% increase)
- RI/Savings Plan coverage dropping below 60%

Tune alert sensitivity: start with high threshold (50% variance), reduce over 3 months as teams build trust in the system. Use exclusion windows for known campaigns.

### Step 5: Optimization Reviews
Schedule monthly optimization review with cost center owners. Analyze underutilized resources (idle compute, unattached storage, oversized instances). Identify reserved instance / savings plan opportunities. Track optimization savings in dashboard.

Optimization categories ranked by effort-to-impact:
1. Idle resource elimination (delete unattached IPs, volumes, load balancers) - zero effort, immediate savings
2. Right-sizing over-provisioned instances (analyze CPU/memory utilization over 14 days)
3. Purchasing commitments (RI/SP for stable workloads)
4. Storage tiering (move cold data to cheaper tiers)
5. Data transfer optimization (CDN, compression, regional affinity)
6. Auto-scaling tuning (reduce over-provisioned buffer)

Track savings with methodology: baseline cost (pre-optimization) minus actual cost (post-optimization), adjusted for usage changes. Report gross savings and net savings (after RI/SP costs).

### Example: Policy-as-Code for Tag Enforcement
```hcl
# AWS SCP to deny creation of untagged resources
policy {
  statement {
    effect = "Deny"
    action = [
      "ec2:CreateInstance",
      "ec2:CreateVolume",
      "rds:CreateDBInstance",
      "s3:CreateBucket"
    ]
    resource = "*"
    condition {
      test     = "Null"
      variable = "aws:RequestTag/cost-center"
      values   = ["true"]
    }
  }
}
```

## Common Pitfalls

Pitfall 1: Tagging without enforcement. Tags defined but not enforced means 30-50% of resources will be untagged. Resources without tags cannot be allocated, creating an unallocated bucket that grows every month.

Pitfall 2: Budget alerts without action. Sending an alert when spend hits 100% gives no time to react. Alerts at 50%, 80%, 90% give progressive warning. Automated enforcement at 100% stops uncontrolled spend.

Pitfall 3: Anomaly detection too noisy. High-sensitivity alerts on every small variance create alert fatigue. Start with high thresholds, tune down. Use exclusion periods for known cost events.

Pitfall 4: Optimizing in isolation. Reducing cost for one team may increase cost for another. Example: compressing data saves storage cost but increases compute cost. Measure total cost impact.

Pitfall 5: Reserved instances for variable workloads. RI requires commitment. If workload varies more than 30% month-to-month, RI savings can turn into losses. Use Savings Plans or spot for variable workloads.

Pitfall 6: No unit economics. Total cloud spend going down is good, but if it is because users left, that is bad. Track cost per user, per transaction, per request to measure true efficiency.

Pitfall 7: Siloed cost data. Engineering sees cloud costs, finance sees invoices, product sees revenue. Without integrated data, cost optimization decisions are made with incomplete information.

## Best Practices

Practice 1: Implement cost governance from day one of a new project. Retroactive tagging and allocation is expensive and inaccurate. Automate governance into IaC templates and CI/CD pipelines.

Practice 2: Publish cost per team visibly. Teams manage what they can see. Showback dashboards with team-name budget progress are the single highest-impact action for cost control.

Practice 3: Centralize commitment purchases (RI/SP). A single team managing cloud commitments achieves higher coverage and better utilization than distributed purchasing. Finance + Engineering joint review.

Practice 4: Automate tiered storage lifecycle. Move data from hot to warm to cold to archive based on access patterns. Automate retention policy enforcement. Never let data sit on hot storage unaccessed.

Practice 5: Use container rightsizing tools. Kubernetes resource requests and limits are often set once and forgotten. Use VPA or rightsizing recommendations to right-size continuously.

Practice 6: Integrate cost checks into CI/CD. A pull request that adds an expensive resource should flag the cost impact. Review cost changes alongside code changes.

## Standards Alignment

| Practice | FinOps Foundation Mapping | Cloud Provider Alignment |
|----------|--------------------------|------------------------|
| Cost Allocation | FinOps Capability: Cloud Cost Allocation | AWS Cost Categories, Azure Cost Management |
| Budgeting | FinOps Capability: Budget Management | AWS Budgets, Azure Budgets, GCP Budgets |
| Anomaly Detection | FinOps Capability: Anomaly Management | AWS Anomaly Detection, Azure Anomaly Detector |
| Optimization | FinOps Capability: Resource Utilization | AWS Compute Optimizer, Azure Advisor |
| Unit Economics | FinOps Capability: Unit Cost | Custom dashboards, CloudZero |

## Templates & Tools

### Cost Dashboard Structure
```
# {Cost Center} - Cloud Cost Dashboard - {Month} {Year}

## Monthly Spend
- Current Month: ${amount}
- Previous Month: ${amount} (change: +/-%)
- Budget: ${amount} (% used)

## Top Cost Drivers
| Service | Spend | % of Total | Trend |
|---------|-------|------------|-------|
| EC2     | ${x}  | 40%        | +5%   |
| RDS     | ${y}  | 20%        | -2%   |
| S3      | ${z}  | 10%        | +1%   |

## Optimization Opportunities
| Resource Type | Monthly Savings | Effort | Status |
|---------------|----------------|--------|--------|
| Right-size    | ${amount}       | Low    | Open   |
| RI Purchase   | ${amount}       | Medium | Planned|

## Unit Economics
- Cost per Transaction: ${amount} (trend: +/-%)
- Cost per Active User: ${amount} (trend: +/-%)
```

### Cost Optimization Automation Scripts
```python
# Automated idle resource detection
import boto3
from datetime import datetime, timedelta

class IdleResourceScanner:
    def __init__(self, session):
        self.ec2 = session.client("ec2")
        self.ebs = session.client("ec2")
        self.elb = session.client("elbv2")
        self.rds = session.client("rds")

    def find_idle_instances(self, cpu_threshold=5.0, days=14):
        cloudwatch = boto3.client("cloudwatch")
        idle = []
        instances = self.ec2.describe_instances(Filters=[{"Name": "instance-state-name", "Values": ["running"]}])
        for reservation in instances["Reservations"]:
            for instance in reservation["Instances"]:
                stats = cloudwatch.get_metric_statistics(
                    Namespace="AWS/EC2",
                    MetricName="CPUUtilization",
                    Dimensions=[{"Name": "InstanceId", "Value": instance["InstanceId"]}],
                    StartTime=datetime.utcnow() - timedelta(days=days),
                    EndTime=datetime.utcnow(),
                    Period=3600,
                    Statistics=["Average"]
                )
                if stats["Datapoints"]:
                    avg_cpu = sum(p["Average"] for p in stats["Datapoints"]) / len(stats["Datapoints"])
                    if avg_cpu < cpu_threshold:
                        idle.append({"instance_id": instance["InstanceId"],
                                     "instance_type": instance["InstanceType"],
                                     "avg_cpu": avg_cpu,
                                     "monthly_cost": self._estimate_cost(instance["InstanceType"])})
        return sorted(idle, key=lambda x: x["monthly_cost"], reverse=True)

    def find_unattached_volumes(self):
        volumes = self.ebs.describe_volumes(Filters=[{"Name": "status", "Values": ["available"]}])
        return [{"volume_id": v["VolumeId"], "size_gb": v["Size"],
                 "monthly_cost": v["Size"] * 0.08} for v in volumes["Volumes"]]

    def _estimate_cost(self, instance_type):
        costs = {"t3.micro": 8, "t3.small": 16, "t3.medium": 32,
                 "t3.large": 64, "m5.large": 84, "m5.xlarge": 168,
                 "c5.xlarge": 152, "c5.2xlarge": 304, "r5.xlarge": 196}
        return costs.get(instance_type, 100)

# scanner = IdleResourceScanner(boto3.Session())
# idle = scanner.find_idle_instances()
# print(f"Found {len(idle)} idle instances, potential savings: ${sum(i['monthly_cost'] for i in idle):.0f}/month")
```

```hcl
# Terraform: Tag compliance enforcement
resource "aws_organizations_policy" "require_cost_tags" {
  name        = "require-cost-tags"
  description = "Requires cost-center, environment, and owner tags on all resources"
  content     = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Action = ["ec2:CreateInstance", "ec2:CreateVolume", "rds:CreateDBInstance",
                  "s3:CreateBucket", "sqs:CreateQueue", "sns:CreateTopic"]
        Resource = "*"
        Condition = {
          Null = {
            "aws:RequestTag/cost-center" = "true"
          }
        }
      },
      {
        Effect = "Deny"
        Action = ["ec2:CreateInstance", "ec2:CreateVolume"]
        Resource = "*"
        Condition = {
          Null = {
            "aws:RequestTag/environment" = "true"
          }
        }
      }
    ]
  })
}
```

### Unit Economics Tracking Template
```python
class UnitEconomics:
    def __init__(self, service_name):
        self.service = service_name
        self.metrics = {}

    def track(self, metric_name, total_cost, total_units):
        if total_units > 0:
            self.metrics[metric_name] = {
                "cost_per_unit": total_cost / total_units,
                "total_cost": total_cost,
                "total_units": total_units
            }
        return self

    def report(self):
        lines = [f"# Unit Economics: {self.service}", ""]
        for name, data in self.metrics.items():
            lines.append(f"| {name} | ${data['cost_per_unit']:.4f} | ${data['total_cost']:,.0f} | {data['total_units']:,.0f} |")
        return "\n".join(lines)

ue = UnitEconomics("Checkout Service")
ue.track("Cost per Transaction", 45000, 15000000)\
  .track("Cost per Active User", 45000, 500000)\
  .track("Cost per API Call", 45000, 75000000)
print(ue.report())
```

### Tools Reference
- AWS Cost Explorer / AWS Budgets for native cost management
- Azure Cost Management + Billing for Azure environments
- GCP Cost Management tools
- CloudHealth / Vantage / CloudZero for multi-cloud cost platforms
- Terraform + Sentinel / OPA for policy-as-code enforcement
- PagerDuty / OpsGenie for budget alert routing
- Tableau / Power BI for cost reporting and analytics

### Cost Review Meeting Agenda (Monthly)
1. Previous month cost vs budget by cost center (10 min)
2. Anomaly review and root cause analysis (10 min)
3. Optimization progress and savings tracked (15 min)
4. New optimization opportunities prioritized (10 min)
5. Commitment purchase recommendations (10 min)
6. Budget adjustments for upcoming months (5 min)
7. Action items and owners (5 min)

## Code Examples

### Policy-as-Code: Tag Enforcement (Open Policy Agent/Rego)
```rego
package terraform.cost_tags

# Deny resources missing required cost tags
deny[msg] {
    resource := input.resource
    resource_type := resource.type
    required_tags := {"cost-center", "environment", "owner", "project"}
    missing := required_tags - {tag | resource.config.tags[tag]}
    count(missing) > 0
    msg = sprintf("%v %v missing required tags: %v", [resource_type, resource.address, missing])
}
```

### Cost Anomaly Detection (Python)
```python
import statistics
from datetime import datetime, timedelta

class CostAnomalyDetector:
    def __init__(self, threshold_ratio=0.2):
        self.threshold_ratio = threshold_ratio
        self.daily_costs = []

    def add_daily_cost(self, date, cost, service="total"):
        self.daily_costs.append({"date": date, "cost": cost, "service": service})

    def detect_anomaly(self, current_cost):
        if len(self.daily_costs) < 7:
            return False, 0.0

        recent = [d["cost"] for d in self.daily_costs[-7:]]
        avg = statistics.mean(recent)
        stdev = statistics.stdev(recent) if len(recent) > 1 else avg * 0.1

        z_score = (current_cost - avg) / stdev if stdev > 0 else 0
        is_anomaly = abs(z_score) > 2.0 or (current_cost / avg) > (1 + self.threshold_ratio)

        return is_anomaly, z_score

    def detect_new_service(self, current_services, known_services):
        new_services = set(current_services) - set(known_services)
        if new_services:
            return {"anomaly": True, "type": "new_service", "services": list(new_services)}
        return {"anomaly": False}

    def check_ri_coverage(self, on_demand_cost, total_cost):
        coverage = 1 - (on_demand_cost / total_cost) if total_cost > 0 else 0
        if coverage < 0.6:
            return {"alert": "low_coverage", "coverage": coverage, "recommendation": "Purchase additional RIs/SPs"}
        return {"alert": "ok", "coverage": coverage}

detector = CostAnomalyDetector(threshold_ratio=0.2)
for i in range(10):
    detector.add_daily_cost(datetime.now() - timedelta(days=i), 5000 + (i * 100))
is_anom, z = detector.detect_anomaly(8500)
print(f"Anomaly: {is_anom}, Z-score: {z:.2f}")
```

### Budget Alert Terraform Configuration
```hcl
resource "aws_budgets_budget" "team_compute" {
  name         = "team-compute-monthly"
  budget_type  = "COST"
  limit_amount = "50000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filters = {
    TagKeyValue = "cost-center$team-compute"
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = ["team-lead@example.com"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }

  auto_adjust_data {
    auto_adjust_type = "HISTORICAL"
    historical_options {
      budget_adjustment_period = 3
    }
  }
}
```

## Anti-Patterns

### Anti-Pattern 1: Tagging Without Enforcement
Creating a tagging standard but not enforcing it. Teams forget, untagged resources grow, and the unallocated cost bucket balloons to 30-50% of total spend. Cost allocation becomes guesswork. Tag enforcement via SCPs/Organization Policies is non-negotiable.

### Anti-Pattern 2: Optimizing for Cost, Not Value
Cutting costs without understanding business impact. A team's compute bill goes down because they stopped running analytics jobs — but those jobs drove revenue optimization worth 10x their cost. Always measure unit economics (cost per transaction, per user).

### Anti-Pattern 3: Alert Fatigue from Overly Sensitive Anomaly Detection
Setting anomaly alerts at 5% variance causes hundreds of false positives per week. Teams ignore alerts. Real anomalies are missed. Start at 50% threshold and tune down over months as trust builds.

### Anti-Pattern 4: RI Purchases Without Usage Analysis
Buying reserved instances based on aggregate spend rather than actual usage patterns. Variable workloads with RI commitments lose money. Always analyze 90-day utilization at instance-family level before purchasing commitments.

### Anti-Pattern 5: Showback Without Accountability
Publishing cost reports that no one reads or acts on. Showback is step 1 — the real impact comes when teams can optimize their own spend and see the savings reflected in their budget. Pair visibility with autonomy.

## Case Studies

### Case Study 1: Enterprise Tagging Transformation
A 5000-employee enterprise with $50M annual cloud spend had 60% untagged resources. Implementing enforced tagging through SCPs and Terraform validators took 6 months. The unallocated cost bucket shrank from 60% to 5%. Cost center owners could finally see their teams spend. Within 3 months of visibility, teams identified $4M in annualized savings.

### Case Study 2: Startup Anomaly Detection
A Series B SaaS company deployed ML-based anomaly detection after a $50K unexpected GPU compute spike from a misconfigured CI/CD pipeline. The anomaly detection caught the next incident within 2 hours of the job starting, limiting damage to $3K. Payback period on the anomaly detection investment: 2 weeks.

### Case Study 3: FinOps Transformation Journey
A mid-market company moved from FinOps maturity Level 1 (Crawl) to Level 3 (Run) over 18 months. Starting with tagging enforcement and showback dashboards, they added anomaly detection at month 6, monthly optimization reviews at month 9, and chargeback at month 15. Annual cloud spend grew 40% (business growth) but cost-per-transaction dropped 25%. Total savings identified and realized: $1.2M/year.

## Rules
- All resources must have mandatory tags before creation.
- Budget alerts must reach both cost center owner and finance.
- Showback reports must be published within 5 business days of month end.
- Anomaly detection must cover 100% of cloud spend.
- Reserved instances must be reviewed quarterly.
- Untagged resource costs must be allocated via cost categories.
- Optimization recommendations must include estimated savings.
- Cost governance policies must be deployed via IaC.
- Budget enforcement (100% alert) must trigger automated action within 1 hour.
- Cost data retention minimum 13 months for trend analysis.
- Unit cost metrics defined and tracked for top-10 services.
- Optimization savings tracked with auditable methodology.
- Cost anomaly detection tuned to <5 false positives per month per team.
- Cross-team shared costs allocated via transparent proportional model.
- Monthly optimization review must include action items with owners and target dates.
- Commitment purchases (RI/SP) require finance + engineering joint approval.

## References
  - references/budget-anomaly.md -- Budget Management and Anomaly Detection
  - references/budget-policies.md -- Budget Policies
  - references/cost-allocation.md -- Cost Allocation Models
  - references/cost-governance-advanced.md -- Cost Governance Advanced Topics
  - references/cost-governance-framework.md -- Cost Governance Framework Reference
  - references/cost-governance-cloud-finops.md -- Cloud FinOps and Cost Optimization
  - references/cost-governance-fundamentals.md -- Cost Governance Fundamentals
  - references/cost-governance-practices.md -- Cloud Cost Governance Practices
  - references/ri-savings-plan-strategy.md -- Reserved Instance and Savings Plan Strategy
## Handoff
For multi-tenant cost tracking, hand off to `enterprise-multi-tenant`. For compliance cost reporting, hand off to `enterprise-compliance-audit`.
