# Datacenter Capacity Planning

## Purpose
Provide comprehensive guidance for planning datacenter capacity across power, cooling, space, network, and storage dimensions. Covers capacity modeling, forecasting methods, utilization monitoring, and capacity optimization strategies.

## Table of Contents
1. [Capacity Planning Framework](#capacity-planning-framework)
2. [Power Capacity Planning](#power-capacity-planning)
3. [Cooling Capacity Planning](#cooling-capacity-planning)
4. [Space and Rack Capacity](#space-and-rack-capacity)
5. [Network Capacity](#network-capacity)
6. [Storage Capacity](#storage-capacity)
7. [Capacity Forecasting](#capacity-forecasting)
8. [Utilization Monitoring](#utilization-monitoring)
9. [Optimization Strategies](#optimization-strategies)
10. [Reporting and Governance](#reporting-and-governance)

---

## Capacity Planning Framework

### The Four Pillars

```
1. Power: kW per rack, total facility capacity, UPS runtime.
2. Cooling: tons, airflow, efficiency (PUE).
3. Space: racks, RU, floor tiles, weight capacity.
4. Connectivity: switch ports, fiber, cross-connects, IP addresses.
```

### Planning Horizons

```
Strategic (3-5 years):
  - New datacenter build or major expansion.
  - Power utility upgrades.
  - Technology generation changes (new GPU, new density).
  - Budget allocation for major capex.

Tactical (6-18 months):
  - Rack additions or reconfigurations.
  - Power distribution upgrades.
  - Network capacity increments.
  - Storage array additions.

Operational (1-3 months):
  - Server deployment planning.
  - Rack space allocation.
  - Power circuit provisioning.
  - Cross-connect ordering.
```

### Capacity Constraints

```
Constraints are hierarchical:
  1. Facility power: hardest to change, longest lead time.
  2. Cooling capacity: tied to power (heat load = power x 1.0).
  3. Floor space: can be optimized, but limited by power density.
  4. Network ports: easiest to expand (add line cards or switches).
  5. Storage capacity: modular expansion.

Constraint identification:
  - Monitor all five dimensions.
  - Identify the binding constraint (the one that limits growth).
  - Re-evaluate after each constraint is resolved.
```

---

## Power Capacity Planning

### Facility-Level Power

```
Total facility power capacity:
  - Utility feed capacity (e.g., 2 x 5 MVA transformers).
  - Generator capacity (e.g., 4 x 2 MW generators).
  - UPS capacity (e.g., 4 x 1.5 MW UPS modules).
  - PDU and STS distribution capacity.

Usable capacity derating:
  - UPS at 80% load (NEC continuous load limit).
  - Generator at 70% load (safety margin).
  - PDU at 80% load (breaker derating).
  - 2N redundancy reduces usable capacity to 50% of installed.

Example:
  5 MVA utility feed, 0.95 PF = 4.75 MW.
  4.75 MW x 0.80 (derating) = 3.8 MW usable.
  With 2N UPS: 3.8 MW / 2 = 1.9 MW IT load capacity.
```

### Per-Rack Power Budget

```
Rack power density classifications:
  Low density: 3-5 kW/rack.
  Medium density: 6-10 kW/rack.
  High density: 11-20 kW/rack.
  Extreme density: 25-50+ kW/rack (GPU clusters).

Power budget calculation:
  Available circuit: 2 x 30A 208V = 12.48 kVA per feed.
  At 80% derating: 10 kVA per feed.
  Total per rack: 20 kVA.
  At 0.95 PF: 19 kW IT load capacity.

Typical allocations:
  Compute rack: 10-12 kW.
  Storage rack: 8-10 kW.
  GPU rack: 30-40 kW.
  Network rack: 3-5 kW.

Power budget checklist:
  [ ] PDU breaker size: 30A, 60A, or 100A.
  [ ] Voltage: 208V single-phase or 415V three-phase.
  [ ] Number of circuits: 2 (A+B) per rack.
  [ ] Connector type: L6-30, CS8365, IEC 60309.
  [ ] Metered vs switched PDU.
  [ ] Phase balancing across three-phase.
```

### Power Capacity Metrics

```
Key metrics:
  Total facility IT load (kW): sum of all rack PDU loads.
  Facility capacity (kW): total UPS output capacity.
  Utilization: IT load / facility capacity x 100.
  PDU load per rack: current load vs circuit rating.
  Phase balance: load distribution across phases.

Thresholds:
  Facility-wide: warning at 70%, critical at 80%.
  Per PDU: warning at 65%, critical at 75%.
  Per circuit: warning at 60%, critical at 75%.
  Phase imbalance: warning at > 10% difference.
  Generator fuel: warning at 50% tank level.

Trend monitoring:
  Daily peak load (kW).
  Week-over-week growth rate.
  Month-over-month growth rate.
  Seasonal patterns (summer AC load increases).
```

### Power Chain Documentation

```
Document the power chain for every device:

Utility A -> Transformer A -> Generator A
  -> ATS A -> UPS A -> PDU A-01 -> Rack A circuit
  -> PDU A-02 -> Rack A circuit
  -> PDU A-03 -> Rack B circuit

Utility B -> Transformer B -> Generator B
  -> ATS B -> UPS B -> PDU B-01 -> Rack A circuit
  -> PDU B-02 -> Rack A circuit

This allows:
  - Predicting impact of UPS maintenance.
  - Isolating power failures.
  - Ensuring diversity (A and B from different sources).
  - Capacity planning per PDU.
```

---

## Cooling Capacity Planning

### Cooling Load Calculation

```
Heat load = IT equipment power + lighting + people + building envelope.

Simplified:
  IT heat load (kW) = IT power draw (kW) x 1.0
  Total cooling load = IT load / 0.85 (accounting for inefficiencies)

Cooling capacity:
  CRAC/CRAH unit capacity (tons or kW).
  Sensible cooling capacity (removing heat without condensation).
  Airflow (CFM) vs heat load.

Example:
  IT load: 500 kW.
  Total cooling load: 500 / 0.85 = 588 kW.
  Required airflow: at 20F delta-T, ~170 CFM/kW = 100,000 CFM.
  CRAC units: 6 x 100 kW (N) + 1 spare (N+1) = 7 units.
```

### Airflow Management

```
Hot aisle / cold aisle:
  Alternating rows of racks face each other.
  Cold aisle: perforated tiles, supply air.
  Hot aisle: return air to CRAC.
  Containment: doors, panels, ceiling.

Airflow optimization:
  Blanking panels in all unused U positions.
  Sealed cable cutouts under floor.
  Proper tile placement (perforated in cold aisle only).
  Manage cable under floor (don't block airflow).
  Return air temperature monitoring.

CFM requirements:
  Server airflow: ~150 CFM/kW.
  Total row airflow = sum of rack airflows.
  CRAC supply vs demand: balanced by active dampers.
```

### Cooling Capacity Metrics

```
Key metrics:
  Supply air temperature: 68-72F (20-22C).
  Return air temperature: 80-90F (27-32C).
  Delta-T: 12-20F (7-11C).
  Relative humidity: 35-60%.
  PUE: total energy / IT energy.

Thresholds:
  Supply temp deviation: > 2F from setpoint.
  Return temp exceeds 95F: potential hotspot.
  Humidity < 30%: static risk.
  Humidity > 70%: condensation risk.
  PUE > 1.6: efficiency needs improvement.

Cooling redundancy:
  N+1: one spare CRAC unit.
  2N: full duplicate cooling system.
  N+1 ensures cooling with one unit down for maintenance.
  Run 85% cooling capacity in normal operations.
```

---

## Space and Rack Capacity

### Floor Space Planning

```
Raised floor grid:
  Standard 24" x 24" (600mm x 600mm) tiles.
  Recommended: 18" (450mm) minimum raised floor height.
  Weight capacity: typically 150-250 lbs/sq ft (raised floor).

Row layout:
  Cold aisle width: 4 ft (1.2m) minimum.
  Hot aisle width: 3 ft (0.9m) minimum.
  Row length: 10-14 racks (limited by airflow and cable distance).
  Main aisle (cabinet delivery): 8 ft (2.4m) minimum.

Cage layout:
  Cages separated by wire mesh or solid partitions.
  Minimum 3 ft clearance around cage perimeter.
  Cabling pathways overhead or underfloor.
  Security separation: locked cage doors, separate access.
```

### Rack Capacity Tracking

```
RU (Rack Unit) tracking:
  Total RU per rack: 42 or 48.
  Reserved for cable management: 2-3 RU.
  Reserved for PDUs: 1-2 RU (or 0U side-mount).
  Reserved for ToR switches: 2 RU.
  Usable for servers/storage: 35-38 RU.

Weight tracking:
  Max per rack: 1500-2000 lbs (raised floor limit).
  Max per U: based on device weight.
  Distribution: heaviest devices at bottom.
  Never exceed rack static load rating.

Rack placement:
  Match power density to cooling zone.
  Group high-density racks in same row.
  Distribute high-Density evenly across cooling zones.
  Label racks with: row, number, power capacity, owner.
```

### Capacity Optimization

```
Space optimization techniques:
  Right-size equipment: choose optimal form factor.
  Blade servers: higher density per RU (but power challenges).
  Dense storage: JBOD with high disk count.
  Proper cable management: minimize RU lost to cabling.

Consolidation strategies:
  Virtualization: 10:1 VM to host ratio.
  Containerization: higher density than VMs.
  Decommission zombie servers: unused for 90+ days.
  Standardize configurations: reduces spare part variety.

Density planning:
  Average: 5-8 kW/rack.
  Target: 10-15 kW/rack for optimal space utilization.
  Maximum: based on cooling and UPS capacity.
  Plan for growth: leave 20% space in each row.
```

---

## Network Capacity

### Port Capacity Planning

```
Switch port utilization:
  Leaf switch: 48 x 25G downlinks, 8 x 100G uplinks.
  ToR switch: 48 x 25G downlinks, 4 x 100G uplinks.
  Spine switch: 32 x 100G or 16 x 400G uplinks.

Port utilization thresholds:
  Warning: 70% utilization.
  Critical: 85% utilization.
  Over-subscription ratio: calculate and maintain target.

Capacity expansion:
  Add leaf switches: 48 ports per switch.
  Add spine switches: N x 32 ports per new spine.
  Add line cards: N x 48 ports per card (modular chassis).
  Upgrade speed: 25G -> 50G -> 100G per port.
```

### Bandwidth Capacity

```
Link utilization:
  Server: 25 Gbps today, 50/100 Gbps next gen.
  Leaf-to-spine: 100 Gbps today, 400 Gbps next gen.
  Spine-to-spine (DCI): 400 Gbps today.

Bandwidth planning:
  Average utilization: 30-40% of link capacity.
  Peak utilization: 60-70% of link capacity.
  Growth rate: 30-50% year-over-year for bandwidth.
  Oversubscription ratio: target 3:1 to 6:1.

Capacity triggers:
  Peak utilization > 70%: plan upgrade.
  Average utilization > 50%: investigate.
  Queue drops > 0.1%: congestion present.
  Growth projected to exceed capacity in 6 months: order now.
```

### Fiber and Cross-Connect Capacity

```
Fiber pair planning:
  Each cross-connect consumes 1 fiber pair.
  Typical cage: 24-48 fiber strands (12-24 pairs).
  Dark fiber between DCs: 12-48 strands.

Cross-connect usage:
  Monthly billing per cross-connect.
  Order in bundles (12x or 24x) for better pricing.
  Keep a spare pair for each active pair (maintenance).
  Document every cross-connect in DCIM.

Fiber capacity:
  OM4 (multimode): limited to 100-150m.
  OS2 (singlemode): unlimited in DC context.
  MPO/MTP: 8 or 12 fibers per connector for 40G/100G.
  Wavelength: 4-8 wavelengths per fiber pair for DCI.
```

---

## Storage Capacity

### Raw vs Usable Capacity

```
Storage efficiency factors:
  RAID overhead:
    RAID 5 (3+1): 75% usable.
    RAID 6 (8+2): 80% usable.
    RAID 10 (4+4): 50% usable.

  Replication:
    Replica 2x: 50% usable.
    Replica 3x: 33% usable.
    Erasure coding (8+3): 73% usable.

  Snapshot overhead: 10-20% additional.
  Filesystem metadata: 3-5% overhead.
  Garbage collection (SSD): 5-10% overhead.

Example:
  100 TB raw SSD, RAID 10 (50% efficient).
  Replica 2x (50% of RAID usable).
  Net usable = 100 x 0.5 x 0.5 = 25 TB.
  With snapshots (20%): 20 TB usable for data.
```

### Storage Growth Forecasting

```
Growth modeling:
  Historical growth rate: 30-50% year-over-year for primary storage.
  New application capacity: estimate from application team.
  Archive growth: 10-20% year-over-year.
  Data retention: growth driven by compliance requirements.

Forecasting formula:
  Storage needed = Current + (Current x growth_rate x months / 12)
  + new_applications + compliance_buffer

Example:
  Current: 50 TB, growth rate: 40%/year, projection: 18 months.
  New apps: 10 TB.
  Compliance: 5 TB.
  Storage needed = 50 + (50 x 0.4 x 18/12) + 10 + 5 = 50 + 30 + 10 + 5 = 95 TB.
```

### Storage Capacity Metrics

```
Key metrics:
  Raw capacity: total physical disk capacity.
  Usable capacity: after RAID and replication overhead.
  Allocated capacity: assigned to volumes/LUNs.
  Used capacity: data actually stored.
  Thin provision ratio: allocated / used (target < 3:1).

Thresholds:
  Usable capacity: warning at 75%, critical at 85%.
  Allocated capacity: warning at 80%, critical at 90%.
  Thin provision ratio > 3:1: risk of capacity emergency.
  Snapshot usage: warning at 75% of snapshot reserve.

Performance capacity:
  Max IOPS per array: depends on model and configuration.
  Max throughput per array: depends on model and configuration.
  IOPS per TB: depends on workload profile.
  Queue depth per controller: warning at 80%.
```

### Storage Tier Capacity

```
Each tier needs independent capacity planning:

Tier 0 (NVMe):
  Growth: 50%/year (fastest growing).
  Typical use: databases, real-time analytics.
  Capacity: smallest but highest IOPS.

Tier 1 (SSD):
  Growth: 40%/year.
  Typical use: VMs, business apps.
  Capacity: largest active tier.

Tier 2 (HDD):
  Growth: 20%/year.
  Typical use: file servers, archives.
  Capacity: declining as SSD replaces.

Tier 3 (Object):
  Growth: 50-100%/year (cloud-like growth).
  Typical use: backups, data lakes.
  Capacity: largest growth.

Auto-tiering:
  Move data between tiers based on access frequency.
  Hot data on NVMe, warm on SSD, cold on HDD/object.
  Policy: move after 7/30/90 days of no access.
```

---

## Capacity Forecasting

### Forecasting Methods

```
Trend extrapolation:
  Collect 12+ months of historical data.
  Fit linear or exponential trend.
  Extend forward 12-24 months.
  Adjust for planned changes.

Driver-based forecasting:
  Identify business drivers (users, transactions, data sources).
  Correlate driver growth to capacity consumption.
  Forecast drivers using business plan.

Bottom-up planning:
  New projects estimate capacity needs.
  Aggregate across all known projects.
  Add buffer for unknown/unplanned.

Top-down planning:
  Business growth target (e.g., 2x revenue in 3 years).
  Assume proportional infrastructure growth.
  More accurate for strategic planning.
```

### Capacity Forecasting Model

```
Model inputs:
  Current usage: {metric}, {value}, {date}
  Historical growth rate: {X}% per {time period}
  Planned additions: {items}, {date}, {impact}
  Planned decommissions: {items}, {date}, {impact}
  Business growth factor: {X}% per year
  Safety margin: {X}% (typically 20%)

Model output:
  Forecasted usage at {date}: {value}
  Capacity at {date}: {value}
  Capacity deficit date: {date}
  Recommended action: {add capacity by date}

Example:
  Current power usage: 800 kW
  Growth rate: 15%/year
  Planned additions: 50 kW (Q2), 50 kW (Q4)
  Decommissions: 20 kW (Q3)
  Forecast (12 months): 800 + 120 + 50 - 20 = 950 kW
  Capacity: 1,000 kW
  Deficit: July next year.
  Action: Order additional UPS capacity by January.
```

### Scenario Planning

```
Best case: conservative (low growth, no major additions).
  Useful for minimum investment planning.

Expected case: most likely scenario.
  Primary planning scenario.

Worst case: aggressive growth, many additions.
  Used for risk assessment and pre-planning.

Response plan per scenario:
  Best case: just-in-time capacity addition.
  Expected case: 6-month lead time capacity.
  Worst case: 12-month pre-provisioning.

Contingency:
  Identify which levers to pull if growth exceeds worst case.
  Document timeline and cost for emergency capacity addition.
```

---

## Utilization Monitoring

### Monitoring Frequency

```
Metric                  Collection     Review
Facility power          Real-time      Weekly
PDU load                Every 5 min    Weekly
Cooling capacity        Real-time      Monthly
Rack RU usage           Daily          Monthly
Switch port usage       Every 5 min    Monthly
Storage capacity        Hourly         Weekly
IP address pool         Daily          Monthly
Cross-connect usage     Weekly         Quarterly
```

### Dashboard Design

```
Power dashboard:
  Total facility load vs capacity (gauge).
  Per-row power density (heat map).
  Top 10 racks by load (table).
  PUE trend line (weekly average).
  Generator fuel level.

Cooling dashboard:
  Supply temp per CRAC unit.
  Return temp per row.
  Humidity per zone.
  Cooling load vs capacity.
  PUE breakdown (cooling % of total).

Space dashboard:
  Rack utilization by row (%).
  RU available (total DC).
  Rack count by density tier.
  Cage footprint utilization.
  Lease expiry calendar.

Storage dashboard:
  Capacity by tier (raw vs usable vs used).
  Thin provision ratio.
  Growth rate by tier.
  Performance (IOPS, latency).
  Data protection status.
```

### Alerting

```
Alert rules per dimension:

Power:
  - PDU load > 75% -> P2 warning.
  - UPS load > 80% -> P1 critical.
  - Generator running > 1 hour -> P2.
  - Phase imbalance > 10% -> P3 info.

Cooling:
  - Hot aisle temp > 95F -> P1.
  - CRAC unit failure -> P1.
  - Humidity out of range -> P2.
  - PUE > 1.8 -> P3.

Space:
  - Row RU > 85% -> P2.
  - Rack weight > 90% limit -> P1.
  - Cage floor area > 80% -> P3.

Storage:
  - Volume capacity > 85% -> P2.
  - Array capacity > 80% -> P2.
  - Thin pool risk -> P1 (emergency).
  - Predicted full within 30 days -> P2.
```

---

## Optimization Strategies

### Power Optimization

```
Reduce IT load:
  - Decommission zombie servers (no production traffic for 90 days).
  - Consolidate VMs (increase host density).
  - Right-size power supplies (replace oversized units).
  - Power cap non-critical workloads at night/weekends.

Improve efficiency:
  - Raise supply air temperature (ASHRAE allows up to 80F).
  - Implement hot aisle containment (improves cooling efficiency 15-30%).
  - Variable-speed drives on CRAC fans.
  - LED lighting in DC.
  - High-efficiency UPS (double conversion -> eco mode).

Targets:
  PUE: < 1.3 for modern DC (goal: < 1.2).
  Cooling: < 30% of total DC energy.
  UPS efficiency: > 96% in eco mode.
```

### Space Optimization

```
Rack utilization:
  Fill low-density racks before opening new ones.
  Use vertical cable management (saves horizontal space).
  Standardize server form factor (reduce variation).
  Remove unused cabling (stranded cables waste space).

Consolidation:
  VM-to-host ratio target: 10:1 minimum.
  Container density: 2-5x VMs per host.
  Decommission older servers (less efficient, more space).
  Standardize on high-density storage.

Targets:
  Average RU utilization: > 70%.
  Average kW/rack: > 5 kW.
  Empty rack count: < 10% of total.
```

### Cooling Optimization

```
Temperature management:
  Raise cold aisle temp to 75-80F (ASHRAE recommendation).
  Use containment to separate hot and cold air.
  Variable speed fans (reduce speed when load is low).
  In-row cooling for high-density racks.

Airflow management:
  Blank all unused rack space.
  Seal all cable cutouts.
  Remove underfloor obstructions.
  Maintain proper tile placement.

Targets:
  Delta-T: 18-25F.
  Supply temp: 75F (24C).
  Humidity: 45-55%.
  Cooling PUE component: < 0.3.
```

### Storage Optimization

```
Capacity efficiency:
  Deduplication: 2:1 to 5:1 reduction (varies by data type).
  Compression: 1.5:1 to 3:1 reduction.
  Thin provisioning: avoid over-allocation.
  Auto-tiering: move cold data to lower-cost tiers.

Data lifecycle:
  Active (Tier 0-1): 30 days.
  Warm (Tier 2): 90 days.
  Cold (Tier 3/Object): 1+ year.
  Archive: after compliance period expired.

Cleanup:
  Delete unused volumes (check last access date).
  Remove orphaned snapshots.
  Archive old backup sets.
  Reclaim from over-provisioned volumes.

Targets:
  Effective capacity ratio (raw vs logical): 3:1 minimum.
  Thin provision ratio: < 2.5:1.
  Snapshot reserve utilization: < 70%.
  Unused volume count: < 5% of total.
```

---

## Reporting and Governance

### Capacity Report Structure

```
Executive summary (1 page):
  - Overall capacity health (traffic light).
  - Binding constraint currently.
  - Next capacity addition needed.

By dimension (1 page each):
  - Current utilization vs capacity.
  - Trend (last 12 months).
  - Forecast (next 12-24 months).
  - Top 5 risks.
  - Planned additions.

Action items:
  - What: {capacity type}.
  - Trigger: {utilization level}.
  - Lead time: {time to order + install}.
  - Owner: {responsible team}.
  - Status: {on track / at risk / overdue}.
```

### Governance Process

```
Weekly:
  - Capacity monitoring dashboards.
  - Alert review (any capacity breach).
  - Resource request triage.

Monthly:
  - Capacity review meeting.
  - Trend analysis.
  - Forecast vs actual comparison.
  - Resource request pipeline review.

Quarterly:
  - Full capacity review.
  - Budget planning for next 6-12 months.
  - Technology refresh planning.
  - Risk assessment update.

Annually:
  - Strategic capacity planning.
  - 3-5 year forecast.
  - Technology roadmap alignment.
  - Budget for major expansions.
```

### Request and Approval

```
Resource request process:
  1. Submit request: capacity, timeline, justification.
  2. Validate: check capacity availability, cost estimate.
  3. Approve: based on priority and budget.
  4. Provision: allocate resources from available pool.
  5. Document: update DCIM and capacity model.

Triage priority:
  Critical: production outage avoidance (same day).
  High: growth within 30 days (1 week lead time).
  Medium: growth within 90 days (1 month lead time).
  Low: non-production / planning (3+ months lead time).

Emergency capacity:
  Pre-approved buffer for critical needs.
  Typically 5-10% of total capacity.
  Requires VP-level approval.
  Replenish buffer within 30 days.
```

## Handoff
`datacenter-networking-storage.md` for networking and storage architecture.
`../../SKILL.md` for the parent datacenter skill.
