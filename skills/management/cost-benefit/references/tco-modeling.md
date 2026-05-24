# TCO Modeling Across Scenarios

## On-Prem vs Cloud TCO

### Cost Components

| Category | On-Prem | Cloud |
|----------|---------|-------|
| **Compute** | Server hardware (3yr life) 5-year depreciation | VM/container instances per hour |
| **Storage** | SAN/NAS + backup hardware | Block/object storage per GB |
| **Networking** | Switches, routers, load balancers, cabling | VPC, load balancer, NAT gateway per GB |
| **Facilities** | Rack space, power, cooling, physical security | Included in cloud pricing |
| **Operations** | Sysadmin headcount (FTE) | DevOps/FinOps headcount (reduced) |
| **Licensing** | Per-core/per-socket licenses | Bring-your-own-license or cloud-native pricing |
| **Backup/DR** | Secondary site, replication hardware | Cross-region replication, snapshot storage |
| **Monitoring** | On-prem monitoring stack | Cloud-native monitoring, third-party SaaS |
| **Security** | Firewalls, IDS/IPS, security team | Cloud security services (WAF, DDoS, SIEM) |

### 3-Year TCO Comparison Example

```
Scenario: 50-server workload migration to cloud

On-Prem 3-Year TCO:
| Category | Year 1 | Year 2 | Year 3 | Total |
|----------|--------|--------|--------|-------|
| Hardware | $250,000 | $0 | $0 | $250,000 |
| Licensing | $80,000 | $80,000 | $80,000 | $240,000 |
| Facilities | $60,000 | $62,000 | $64,000 | $186,000 |
| Operations (2 FTEs) | $240,000 | $248,000 | $256,000 | $744,000 |
| Backup/DR | $30,000 | $31,000 | $32,000 | $93,000 |
| Monitoring/Tools | $20,000 | $21,000 | $22,000 | $63,000 |
| Total | $680,000 | $442,000 | $454,000 | $1,576,000 |

Cloud 3-Year TCO:
| Category | Year 1 | Year 2 | Year 3 | Total |
|----------|--------|--------|--------|-------|
| Compute (reserved) | $180,000 | $180,000 | $180,000 | $540,000 |
| Storage | $36,000 | $40,000 | $44,000 | $120,000 |
| Networking | $24,000 | $26,000 | $28,000 | $78,000 |
| Migration | $100,000 | $0 | $0 | $100,000 |
| Operations (1 FTE) | $130,000 | $134,000 | $138,000 | $402,000 |
| Cloud Native Tools | $15,000 | $16,000 | $17,000 | $48,000 |
| Support Plan | $30,000 | $30,000 | $30,000 | $90,000 |
| Total | $515,000 | $426,000 | $437,000 | $1,378,000 |

Delta: Cloud saves $198,000 (12.6%) over 3 years
```

## Build vs Buy TCO

### Build Costs

| Cost Element | Year 1 | Year 2 | Year 3 | Total |
|-------------|--------|--------|--------|-------|
| **Development Team** | | | | |
| 4 engineers × $150k loaded | $600,000 | $618,000 | $636,000 | $1,854,000 |
| 1 PM × $130k loaded | $130,000 | $134,000 | $138,000 | $402,000 |
| 1 QA × $120k loaded | $120,000 | $124,000 | $128,000 | $372,000 |
| **Infrastructure** | $60,000 | $66,000 | $72,000 | $198,000 |
| **Tools & Licenses** | $30,000 | $31,000 | $32,000 | $93,000 |
| **Maintenance (20% of build)** | $0 | $188,000 | $194,000 | $382,000 |
| **Training** | $20,000 | $10,000 | $10,000 | $40,000 |
| **Total Build TCO** | **$960,000** | **$1,171,000** | **$1,210,000** | **$3,341,000** |

### Buy Costs

| Cost Element | Year 1 | Year 2 | Year 3 | Total |
|-------------|--------|--------|--------|-------|
| **Subscription** (100 users × $100/mo) | $120,000 | $120,000 | $120,000 | $360,000 |
| **Implementation Services** | $80,000 | $0 | $0 | $80,000 |
| **Custom Integration** | $60,000 | $10,000 | $10,000 | $80,000 |
| **Training** | $15,000 | $5,000 | $5,000 | $25,000 |
| **Internal Support (0.5 FTE)** | $80,000 | $82,000 | $84,000 | $246,000 |
| **Annual Escalation (5%)** | $0 | $6,000 | $6,300 | $12,300 |
| **Total Buy TCO** | **$355,000** | **$223,000** | **$225,300** | **$803,300** |
```

### Build vs Buy Decision

| Factor | Build | Buy |
|--------|-------|-----|
| 3-Year TCO | $3,341,000 | $803,300 |
| Time to value | 6-12 months | 2-4 months |
| Customization | Full control | Vendor roadmap |
| Maintenance | Internal team | Vendor managed |
| Strategic value | Core competency | Non-differentiating |
| **Recommendation** | **Only if core to business** | **Default choice** |

## Labor Cost Modeling

### Loaded Labor Rate Calculation
```
Base Salary: $120,000
Benefits: 25% ($30,000)
Payroll Tax: 7.65% ($9,180)
Bonus: 10% ($12,000)
Equipment: $5,000
Training: $3,000
Total Loaded Cost: $179,180
Loaded Multiplier: 1.49×
```

### Labor Cost by Role
```
| Role | Base Salary | Loaded Rate (1.4×) | Hourly Rate (2080h) |
|------|------------|--------------------|--------------------|
| Junior Developer | $80,000 | $112,000 | $53.85 |
| Senior Developer | $150,000 | $210,000 | $100.96 |
| Staff Engineer | $200,000 | $280,000 | $134.62 |
| Product Manager | $130,000 | $182,000 | $87.50 |
| DevOps Engineer | $140,000 | $196,000 | $94.23 |
| QA Engineer | $100,000 | $140,000 | $67.31 |
| Designer | $120,000 | $168,000 | $80.77 |
```

### Migration Cost Estimation

### Migration Phases
```
Phase 1: Assessment & Planning (2-4 weeks)
  - Current state audit: $20,000
  - Migration plan: $15,000
  - Pilot scoping: $5,000

Phase 2: Pilot Migration (4-8 weeks)
  - 2 pilot workloads: $80,000
  - Validation & testing: $30,000
  - Lessons learned: $5,000

Phase 3: Bulk Migration (8-16 weeks)
  - Per workload migration: $10,000-50,000
  - Parallel run: $30,000/week
  - Cutover coordination: $20,000

Phase 4: Optimization (ongoing)
  - Right-sizing: $20,000
  - Auto-scaling setup: $15,000
  - Reserved instance purchasing: $10,000
```

### Migration TCO Template
```yaml
migration:
  assessment: $40,000
  pilot:
    count: 2
    cost_per_workload: $40,000
    total: $80,000
  bulk:
    workload_count: 48
    cost_per_workload: $25,000
    total: $1,200,000
  parallel_run:
    duration_weeks: 4
    weekly_cost: $35,000
    total: $140,000
  training:
    sessions: 10
    per_session: $5,000
    total: $50,000
  total_migration: $1,510,000
```

## TCO Best Practices

### Common Omissions
| Omitted Cost | Impact | How to Include |
|-------------|--------|---------------|
| Self-managed time | Understates operations cost | Include time spent on maintenance, upgrades, patching |
| Downtime cost | Understates risk | Include incident response + business impact |
| Training ramp | Understates year-1 cost | Add 2-3 months of reduced productivity per new team member |
| Decommissioning | Overstates year-1 savings | Include data migration and old system shutdown |
| Renewal escalation | Understates buy TCO | Model 5-10% annual price increase |
| Shadow IT | Understates true usage | Survey teams on actual tool usage |

### Sensitivity Variables
- **Adoption rate**: 50-100% range, ±20% from expected
- **Growth rate**: 10-50% annual growth in usage
- **Labor rates**: ±15% for market conditions
- **Cloud pricing**: 5-15% annual decrease (compute) or increase (premium services)
- **Timeline**: ±3 months for migration delays

## References
- AWS TCO Calculator — https://calculator.aws/#/addService/TCO
- Microsoft Azure TCO Calculator — https://azure.microsoft.com/en-us/pricing/tco/calculator/
- Gartner: Total Cost of Ownership for Cloud vs On-Premises
- Forrester: The Total Economic Impact (TEI) Methodology
