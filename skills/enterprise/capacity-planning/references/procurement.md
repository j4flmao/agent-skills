# Procurement — Lead Times, Vendor Matrix, Contract Patterns

## Lead Time Matrix

| Resource                        | Lead time          | Notes                                    |
|---------------------------------|--------------------|------------------------------------------|
| Cloud autoscale (in-account)    | seconds–minutes    | quota permitting                         |
| Cloud quota increase            | hours–days         | request via support ticket               |
| Cloud reserved capacity         | days–weeks         | provider commitment                      |
| Cloud capacity reservation      | minutes (place) → on-demand cost | physical guarantee     |
| GPU reservation (H100/A100)     | weeks–months       | severe constraint 2024–2026              |
| Colo rack + power               | 4–8 weeks          | depends on provider availability         |
| Cross-connect inside colo       | 1–2 weeks          | order via colo provider                  |
| Transit / IP connectivity       | 6–12 weeks         | depends on POP availability              |
| Dedicated dark fiber            | 12+ weeks          | only large enterprises                   |
| Submarine cable IRU             | 18+ months         | telco-scale                              |
| Bare-metal server (commodity)   | 4–8 weeks          | Supermicro, Dell, HPE off-the-shelf      |
| Bare-metal custom (HPC, AI)     | 12–24 weeks        | NVIDIA, configured build                 |
| Used / refurb server            | 2–4 weeks          | secondary market (Bargain Hardware, ITAD)|
| Storage array (enterprise SAN)  | 8–16 weeks         | NetApp, Pure Storage                     |
| Network switch (datacenter)     | 8–20 weeks         | Cisco, Arista, Juniper                   |

## When to Order vs Autoscale

```
Forecast crosses cloud quota?      Raise quota now (free, days lead)
Forecast crosses Reserved cost?    Buy RIs/Savings Plan when sustained
Forecast crosses single-zone cap?  Expand to new AZ (days)
Forecast crosses region cap?       Add region (weeks–months)
On-prem capacity threshold?        Order with full lead-time buffer
```

Rule: **order date = forecast-crossing-date − lead-time − 4 week buffer**.

## Cloud Procurement Patterns

```
On-demand           pay-as-you-go, fully flexible, most expensive
Spot / Preemptible  60–90% discount, can be reclaimed (stateless / batch)
Reserved Instances  1y/3y commit, 40–60% discount, region-locked
Savings Plans       1y/3y commit, flexible region/family, 30–50%
Capacity Reservation no discount, guarantees physical capacity (critical events)
Enterprise Agreement multi-year, custom discount, $1M+ commit
```

```
Optimal mix (rule of thumb):
  60–70% on RI / Savings Plan (steady baseline)
  20–30% on-demand (variable peak)
  10% spot (batch / fault-tolerant)
```

## Bare-Metal Procurement Patterns

```
Step 1: spec the SKU (CPU, RAM, disk, NIC, power)
Step 2: get 3 quotes (Dell, HPE, Supermicro / integrator)
Step 3: capex approval + PO
Step 4: lead time wait (4–16 weeks)
Step 5: receive at colo → rack/stack
Step 6: provision (PXE/MAAS) → ready in days
Total: 8–20 weeks from decision to production-ready
```

## Contract Patterns

- **Volume tiers**: negotiate price breaks at $1M, $5M, $10M annual spend
- **Burst clauses**: temporarily exceed commit without renegotiation
- **Exit clauses**: data export + termination notice + final invoice cap
- **SLA credits**: monthly credit for SLA breach (not just refund — operational impact)
- **Right to audit**: SOC 2 reports, pen test summaries, financial health
- **Price protection**: cap on increases (CPI + N% max) over multi-year contract

## Vendor Diversification

```
Single vendor:     simpler ops, max discount, max risk (vendor lock)
Two vendors:       active fallback, 1.5× ops cost, ~10% less discount
Three+ vendors:    full diversification, 2–3× ops cost, weakest discount
```
Rule: V1 (Tier-1 critical) vendor must have ≥ 1 alternative pre-integrated.

## Procurement Roles + RACI

| Step              | Eng | Finance | Legal | Vendor mgmt | Exec |
|-------------------|-----|---------|-------|-------------|------|
| Demand signal     | R   | I       | —     | I           | I    |
| RFP / quotes      | C   | C       | I     | R           | I    |
| Contract review   | C   | C       | R     | A           | I    |
| PO + commit       | C   | R       | I     | A           | A (>threshold) |
| Receive + verify  | R   | I       | —     | C           | —    |
| Renewal           | C   | R       | C     | A           | C    |

## Common Failures

- "Just-in-time" ordering on items with 8w lead → outage at scale-up
- Single-source critical hardware → manufacturing delay = your delay
- No capacity reservation for known event (Black Friday) → spot reclaimed mid-peak
- Forgetting cross-connect lead time when expanding colo
- Quota assumed unlimited until rejected at autoscale
- Not modeling network egress in cloud budget (often 30%+ of total)
