# FinOps Fundamentals

## Overview
FinOps is an operational framework and cultural practice that maximizes the business value of cloud by bringing together technology, finance, and business teams to make data-driven spending decisions.

## Core Concepts

### The FinOps Lifecycle
Inform: visibility through tagging, cost dashboards, budget alerts, and anomaly detection. Understand what is spent, by whom, and on what services.

Optimize: right-sizing, reserved instances, savings plans, spot instances, storage lifecycle, and data transfer optimization. Reduce waste and improve efficiency.

Operate: continuous improvement through governance automation, team ownership, cost reviews, and cultural change. Mature from crawl to walk to run.

### Crawl-Walk-Run Maturity
Crawl: basic tagging, monthly cost reports, manual optimization. Walk: budget alerts, team allocation, anomaly detection, RI/SP management. Run: automated optimization, chargeback, unit economics KPIs, continuous governance.

### Cost Allocation
Tagging hierarchy: Environment > CostCenter > Service > Team > Owner > Application. Consistent tag keys across all cloud providers. Propagation from resource group to child resources. Enforcement: CI pipeline rejects untagged resources.

## Key Practices

### Right-Sizing
Analyze CPU/memory utilization over 14 days. Downsize instances with average CPU <20% and memory <40%. Upgrade instances with CPU >60% or memory >80%. Review quarterly.

### Reserved Capacity
Cover 60-80% of baseline usage. 1-year for volatile workloads, 3-year for stable baseline. Monitor RI/SP utilization monthly. Alert if utilization drops below 70%.

### Budget Alerts
Set thresholds at 50%, 80%, 100%, 150%. Route alerts to cost center owners. Automate remediation for over-budget resources. Use anomaly detection for unexpected spikes.

### Resource Cleanup
Automate detection of unattached volumes, orphaned snapshots, idle load balancers, unused IPs. Schedule weekly sweeps with auto-delete after grace period. Tag resources with creator for ownership identification.

## Best Practices
- Tag everything with cost allocation metadata.
- Right-size before buying reserved capacity.
- Use spot/preemptible for fault-tolerant workloads.
- Set budget alerts before deploying resources.
- Review costs weekly with engineering teams.
- Track unit economics (cost per request/user).
- Implement showback before chargeback.
- Automate waste remediation.

## References
- finops-advanced.md -- Advanced FinOps topics
- cost-optimization.md -- Cost Optimization
- finops-governance.md -- FinOps Governance
- finops-automation.md -- FinOps Automation
- finops-maturity-model.md -- FinOps Maturity Model
