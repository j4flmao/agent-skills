# Cost Governance Fundamentals

## Overview
Cloud cost governance ensures engineering teams spend efficiently while maintaining velocity. This covers cost allocation, budgeting, showback/chargeback, tagging strategies, and cost visibility — the foundation of any FinOps practice.

## Core Concepts

### Cost Allocation Models
| Model | Granularity | Complexity | Best For |
|-------|-------------|------------|----------|
| Tag-based | Per resource | Medium | Most organizations |
| Hierarchy-based | Per account/OU | Low | Multi-account with clear ownership |
| Blended | Mixed | High | Complex orgs with shared services |
| Proportional | Usage-based | Medium | Shared resources, data stores |
| Direct | Per resource | Low | Dedicated resources only |

Recommended: Start with tag-based for direct costs, proportional for shared costs. Move to hierarchical as the organization grows.

### Tagging Strategy
Mandatory tags for every resource: cost-center, environment, owner, project, service. Enforce tags via policy-as-code (AWS SCP, Azure Policy, GCP Organization Policy). Resources without tags cannot be allocated — unallocated bucket grows every month.

Tag design principles:
- Consistent key names across all cloud providers
- Avoid tags that change frequently (team member names, temporary project codes)
- Use tag schema registry that teams can reference
- Preventive enforcement (deny creation of untagged resources) for mandatory tags
- Detective enforcement (weekly compliance report) for informational tags

### Budget Structure
Create monthly budgets per cost center. Configure alerts at graduated thresholds: 50% (notification), 80% (warning), 90% (critical), 100% (enforcement). Implement approval gates for over-budget spend.

| Budget Type | Time Period | Best For |
|-------------|-------------|----------|
| Monthly | Standard operational | Most teams |
| Quarterly | Variable month-to-month spend | R&D, seasonal projects |
| Annual | Committed use discounts | RI/SP, stable workloads |
| Forecast | Proactive alerts | Early warning system |

### Showback vs Chargeback
Showback: Publish cost reports per team for visibility. No financial transfer. Lower friction, builds cost awareness. Start here.

Chargeback: Transfer actual costs to team budgets. Requires mature tagging, clear ownership, finance system integration, dispute resolution process. Move to chargeback after 6+ months of showback maturity.

## FinOps Maturity Model

| Level | Name | Characteristics |
|-------|------|----------------|
| 1 - Crawl | Ad Hoc | Manual cost tracking, no tagging, reactive alerts |
| 2 - Walk | Defined | Tagging enforced, cost centers mapped, showback published |
| 3 - Run | Managed | Automated allocation, anomaly detection, unit economics tracked |
| 4 - Fly | Optimized | Real-time visibility, predictive modeling, auto-remediation |

Movement through levels requires: Level 1->2: Tagging enforcement + basic dashboards. Level 2->3: Automation + anomaly detection + optimization reviews. Level 3->4: Predictive analytics + CI/CD integration + auto-remediation.

## Governance Structure

### Cloud Cost Council
Cross-functional team: Engineering (15%), Finance (15%), Product (20%), Platform/Cloud Infrastructure (40%), Exec Sponsor (10%). Meets monthly. Responsibilities: approve cloud investment decisions, review optimization progress, resolve cost allocation disputes, set policy for commitment purchases.

### Budget Owner Responsibilities
- Monitor monthly spend against budget
- Respond to budget alerts within 24 hours
- Participate in monthly optimization reviews
- Approve new resource provisioning within budget
- Escalate over-budget needs to Cloud Cost Council

## Common Pitfalls

### Tagging Without Enforcement
Tags defined but not enforced means 30-50% of resources will be untagged. Unallocated cost bucket grows every month. Enforce tags with policy-as-code from day one.

### Budget Alerts Without Action
Sending an alert when spend hits 100% gives no time to react. Alerts at 50%, 80%, 90% give progressive warning. Automated enforcement at 100% stops uncontrolled spend.

### No Unit Economics
Total cloud spend going down is good, but if users left, that is bad. Track cost per user, per transaction, per request to measure true engineering efficiency.

### Optimizing in Isolation
Reducing cost for one team may increase cost for another (e.g., compressing data saves storage but increases compute). Measure total cost impact.

## Key Points
- Tagging with enforcement is non-negotiable for cost allocation
- Budget alerts at graduated thresholds (50/80/90/100%) prevent surprises
- Showback before chargeback — build visibility and accountability before financial transfer
- Unit economics (cost per transaction, per user) measure true efficiency
- Cloud Cost Council provides cross-functional governance and decision-making
- Reserved instance and savings plan purchases require finance + engineering joint approval
- Monthly optimization reviews with action items drive continuous improvement
- Anomaly detection must cover 100% of spend with tuned thresholds to avoid alert fatigue