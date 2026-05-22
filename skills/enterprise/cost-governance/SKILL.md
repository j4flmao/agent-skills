---
name: enterprise-cost-governance
description: >
  Use this skill when implementing cloud cost governance: cost allocation, budgets, chargeback, anomaly detection, and optimization.
  This skill enforces: tagging strategy, budget alerts, cost anomaly detection, showback/chargeback.
  Do NOT use for: FinOps tool selection, procurement, vendor negotiation, invoice reconciliation.
version: "1.0.0"
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

### Step 2: Budget Management
Create monthly budgets per cost center. Configure alerts at 50% (notification), 80% (warning), 90% (critical), 100% (enforcement). Implement approval gates: >90% spend requires team lead approval, >100% requires director approval. Automate budget creation with IaC.

### Step 3: Chargeback / Showback
Implement showback first (visibility without cost transfer). Define rate card for compute, storage, network, and managed services. Publish monthly cost reports per cost center. Transition to chargeback for mature organizations with clear accountability.

### Step 4: Cost Anomaly Detection
Deploy ML-based anomaly detection (AWS Cost Anomaly Detection, Azure Anomaly Detector). Set day-over-day spending spike alerts (>20% increase). Configure new service usage alerts. Monitor reserved instance coverage. Alert on cost anomalies via Slack and email.

### Step 5: Optimization Reviews
Schedule monthly optimization review with cost center owners. Analyze underutilized resources (idle compute, unattached storage, oversized instances). Identify reserved instance / savings plan opportunities. Track optimization savings in dashboard.

## Rules
- All resources must have mandatory tags before creation.
- Budget alerts must reach both cost center owner and finance.
- Showback reports must be published within 5 business days of month end.
- Anomaly detection must cover 100% of cloud spend.
- Reserved instances must be reviewed quarterly.
- Untagged resource costs must be allocated via cost categories.
- Optimization recommendations must include estimated savings.
- Cost governance policies must be deployed via IaC.

## References
- `references/cost-allocation.md` — Tagging strategy and cost allocation models
- `references/budget-anomaly.md` — Budget management and anomaly detection

## Handoff
For multi-tenant cost tracking, hand off to `enterprise-multi-tenant`. For compliance cost reporting, hand off to `enterprise-compliance-audit`.
