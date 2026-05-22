# Cost Allocation Models

## Tagging Strategy

### Mandatory Tags
```
cost-center     → Budget owner (e.g., eng-platform, data-science)
environment     → dev, staging, prod, sandbox
owner           → Team or individual responsible
project         → Project or application name
service         → Service name for granular tracking
provisioner     → IaC tool used (terraform, cloudformation)
created-by      → User or automation that created resource
```

### Optional Tags
```
tier            → free, pro, enterprise
compliance      → hipaa, soc2, pci
data-class      → public, internal, confidential
schedule        → business-hours, always-on
backup          → daily, weekly, none
```

### Tag Enforcement
```
AWS: SCP to deny creation of untagged resources
Azure: Azure Policy to audit and enforce tags
GCP: Organization Policy to require labels
Kubernetes: OPA/Gatekeeper to enforce namespace labels
```

### Cost Categories
```
Untagged resources → mapped to shared-services cost center
Common services → split by usage (networking, monitoring)
Burstable resources → weighted allocation by usage
```

## Cost Center Hierarchy

### Business Unit Structure
```
Company
├── Engineering (cost-center: eng)
│   ├── Platform (cost-center: eng-platform)
│   ├── Backend (cost-center: eng-backend)
│   └── Data (cost-center: eng-data)
├── Product (cost-center: product)
│   ├── Growth (cost-center: product-growth)
│   └── Core (cost-center: product-core)
└── Operations (cost-center: ops)
    ├── Security (cost-center: ops-security)
    └── IT (cost-center: ops-it)
```

### Shared Cost Allocation
```
Cloud Provider Fees → Proportional by usage ratio
Networking → Split by data transfer volume per cost center
Security Tooling → Equal split across all cost centers
Management Overhead → Fixed percentage (5%) added to each
```

## Allocation Models

### Direct Allocation
Resources directly tagged to the consuming cost center.
- Best for dedicated resources
- Cleanest cost attribution
- Requires discipline on tagging

### Proportional Allocation
Shared resources split by usage metrics.
```
Compute: Split by vCPU hours
Storage: Split by GB-months
Data Transfer: Split by egress GB
API Calls: Split by request count
```

### Hierarchical Allocation
Costs roll up from team → department → organization level.
- Budget at each level
- Aggregated reporting
- Breakdown by child cost center

## Reporting

### Monthly Report Structure
```
Executive Summary: Total spend, MoM change, top 5 cost centers
Cost Center Detail: Budget vs actual per cost center
Resource Breakdown: Top resources by cost
Savings Opportunities: RI utilization, right-sizing
```

### Dashboard Metrics
```
Cost by Service per cost center
Month-over-month trend with forecast
Budget consumption percentage
Anomaly events in current month
Savings plan coverage percentage
```
