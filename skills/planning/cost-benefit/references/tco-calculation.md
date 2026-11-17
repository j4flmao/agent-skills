# TCO Calculation

## Cost Categories

| Category | One-Time | Annual Recurring | Examples |
|----------|----------|-----------------|----------|
| Licensing | Perpetual license | Subscription, per-seat | OS, DB, middleware, dev tools |
| Infrastructure | Hardware, setup | Hosting, bandwidth | Servers, cloud, networking |
| Engineering | Migration, integration | Maintenance, support | Dev hours, consulting |
| Operations | Deployment | Monitoring, run cost | CI/CD, observability |
| Training | Initial training | Ongoing education | Certifications, workshops |
| Support | Migration support | Vendor support contract | SLAs, incident response |
| Decommissioning | Data migration | — | Old system shutdown |

## TCO Calculation Formula

```
TCO = Σ(One-time costs) + Σ(Annual recurring costs × Years)
```

### Detailed Model
```
Total Cost = 
  Initial Investment
  + (Annual Operating Cost × N years)
  + (Maintenance Cost × N years)
  + (Training Cost)
  + (Decommissioning Cost at end)
```

## TCO Template

```yaml
# TCO Model: {Project Name}
# Time Horizon: 3 years

one_time_costs:
  licensing:
    - item: "Database license"
      amount: 50000
  infrastructure:
    - item: "Initial cloud setup"
      amount: 15000
  engineering:
    - item: "Integration development"
      hours: 800
      rate: 150
      total: 120000
  training:
    - item: "Team certification"
      amount: 25000

annual_costs:
  year_1:
    hosting: 36000
    support_contract: 24000
    maintenance_hours: 200
    maintenance_rate: 150
    maintenance_total: 30000
    total: 90000
  year_2:
    hosting: 40000
    support: 24000
    maintenance: 30000
    total: 94000
  year_3:
    hosting: 44000
    support: 24000
    maintenance: 30000
    total: 98000

tco_summary:
  initial_investment: 210000
  total_operating: 282000
  grand_total_3yr: 492000
```

## Comparison Template

| Cost Item | Option A (Current) | Option B (New) | Delta |
|-----------|-------------------|---------------|-------|
| Licensing | $50,000/yr | $0 (open source) | -$50,000 |
| Infrastructure | $40,000/yr | $60,000/yr (cloud) | +$20,000 |
| Engineering | $30,000/yr | $120,000/yr (migration) | +$90,000 |
| Training | $0 | $25,000 | +$25,000 |
| **3-Year TCO** | **$360,000** | **$395,000** | **+$35,000** |

## Cloud vs On-Prem TCO Factors

| Factor | Cloud | On-Prem |
|--------|-------|---------|
| Capital expense | Low (op-ex) | High (cap-ex) |
| Scaling cost | Linear | Step function |
| Team overhead | Low | High (ops team) |
| Performance predictability | Variable | Consistent |
| Upgrade cost | Included | Significant |
| Compliance control | Shared responsibility | Full control |

## TCO Best Practices

- Always include unallocated costs (facilities, power, cooling for on-prem)
- Include team overhead for managing the solution (not just the solution cost)
- Model 3-5 year horizon — shorter horizons favor cloud, longer favors on-prem
- Include migration and decommissioning costs — these are often forgotten
- Account for learning curve — new tech costs more in year 1
- Add 15-25% buffer for unforeseen costs in all scenarios
- Revisit TCO annually as actual costs diverge from projections
