---
name: devops-datacenter
description: >
  Use this skill when planning or operating datacenter facilities: rack and U planning, A+B power feeds,
  N+1 / 2N cooling, Uptime Institute tier classification (Tier I-IV), DCIM, structured cabling, fire
  suppression, environmental monitoring, and physical security. Applies to building a private cage in
  a colo (Equinix, Digital Realty, Coresite) or operating an owned facility. This skill enforces: power
  budget per rack, BTU + airflow math, redundancy by tier, cable hygiene, and remote-hands runbook.
  Do NOT use for: server provisioning (see devops-bare-metal), network switch config (see
  devops-network-infrastructure), or cloud region selection (see devops-cloud-architecture).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [devops, datacenter, colo, on-prem, infrastructure, phase-2]
---

# DevOps Datacenter

## Purpose
Design and operate datacenter space (private cage in a colo, or owned DC) with the right tier of
power/cooling redundancy for the workload, accurate rack U/power/weight planning, structured cabling,
DCIM tracking, and remote-hands operational discipline.

## Framework and Methodology

### Datacenter Architecture
Every datacenter decision follows a layered model:

```
Layer 1: Site Selection
  - Geographic location, latency, natural disaster risk.
  - Carrier diversity, power grid reliability.
  - Tax incentives, talent availability.

Layer 2: Facility Design
  - Tier classification (I-IV) determines redundancy.
  - Power distribution: utility -> UPS -> PDU -> rack.
  - Cooling: CRAC/CRAH, containment, in-row.

Layer 3: Rack Layout
  - Rack type, U capacity, weight limits.
  - Power budget per rack, A+B distribution.
  - Cable management: overhead, underfloor, structured.

Layer 4: Infrastructure Management
  - DCIM for asset tracking.
  - Environmental monitoring: temp, humidity, power.
  - Remote hands operations.
```

### Uptime Institute Tier Classification

```
Tier I (Basic): 99.671% uptime (28.8 hr/yr downtime).
  Single path for power and cooling.
  No redundancy -- any planned or unplanned event causes downtime.
  Best for: dev/test, non-critical workloads.

Tier II (Redundant Components): 99.741% uptime (22 hr/yr).
  Single path with redundant critical components (N+1 UPS, generator).
  Planned maintenance causes downtime.
  Best for: internal tools, low-priority production.

Tier III (Concurrently Maintainable): 99.982% uptime (1.6 hr/yr).
  Multiple power/cooling paths, one active.
  Any component can be taken offline without downtime.
  Best for: production workloads, most enterprise apps.

Tier IV (Fault Tolerant): 99.995% uptime (26 min/yr).
  Multiple active paths, 2N+1 redundancy.
  Any single failure (including UPS or generator) does not cause downtime.
  Best for: mission-critical, financial trading, life safety.
```

### Power and Cooling Math

```
Power basics:
  Watts = Volts x Amps (DC)
  VA = Volts x Amps (AC, apparent power)
  Power Factor = Watts / VA (typical: 0.9-0.95)

  Single phase: Watts = V x A x PF
  Three phase: Watts = V x A x PF x 1.732

Cooling conversions:
  BTU/hr = Watts x 3.412
  Tons = BTU/hr / 12,000
  kW to tons: kW / 3.517

Example: 100 racks x 10 kW = 1 MW
  1 MW = 3,412,000 BTU/hr = 284 tons cooling
  At N+1: need 5 x 70-ton CRAC units (4 active + 1 spare)
```

## Agent Protocol

### Trigger
Exact user phrases: "datacenter", "colo", "colocation", "Equinix", "Digital Realty",
"Coresite", "DCIM", "rack U", "power budget", "PDU", "ATS", "UPS", "generator",
"BTU", "CRAC", "CRAH", "hot aisle", "cold aisle", "Uptime Institute", "Tier III",
"Tier IV", "redundancy", "structured cabling", "rack elevation", "remote hands",
"physical security".

### Input Context
- Workload (compute / GPU / storage / network-heavy)
- Total kW required + projected growth
- Tier target (I, II, III, III+, IV) driven by HA tier
- Geographic constraints (latency, data residency, talent availability)
- Carrier diversity required (1 / 2 / 3+ ISPs)
- Existing physical infrastructure (owned DC, colo cage, edge POP)
- Budget model (capex DC build vs opex colo)

### Output Artifact
DC plan with rack elevations, power/cooling budget, tier compliance check,
cable plan, DCIM schema, remote-hands runbook.

### Response Format
```
Tier: {I | II | III | III+ | IV}
Capacity: {racks x kW each, total kW, total RU}
Power: {A+B feeds, PDU model, UPS runtime, generator runtime}
Cooling: {N+1 CRAC/CRAH, hot/cold aisle, containment}
Network: {2+ carriers, cross-connect plan, MMR}
Cabling: {fiber types, patch panels, label scheme}
Security: {man-trap, badge, biometric, camera retention}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Tier selected matching workload HA tier
- [ ] Rack elevation with U + weight + amp + airflow per device
- [ ] Power budget per rack with A+B feed allocation
- [ ] Cooling capacity >= heat load + N+1 redundancy
- [ ] Structured cabling plan (MMR to cage)
- [ ] DCIM populated (Netbox / Sunbird / Nlyte)
- [ ] Carrier diversity >= 2
- [ ] Physical security controls verified
- [ ] Remote-hands runbook with photos + diagrams

### Max Response Length
350 lines

## Workflow

### Step 1: Pick Tier (Uptime Institute)
Match workload HA to facility tier. Tier >= workload requirement.

### Step 2: Rack Planning
Standard 42U/48U rack. Budget power per rack based on density.
Leave room for PDUs and cable management (38-40 usable U).

### Step 3: Power Budget + Redundancy
A+B feeds to every rack. PSU1 on A, PSU2 on B.
PDU sizing: 2x per rack, never load > 80% of breaker.

### Step 4: Cooling Math
Heat load = power draw in watts (1:1 ratio).
Convert to BTU/hr, size CRAC/CRAH units for N+1.
Hot/cold aisle containment above 8 kW/rack.

### Step 5: Structured Cabling
OM4 for short-reach intra-row, OS2 for inter-row and long distance.
Label both ends, color code by purpose. No zip ties on fiber.

### Step 6: DCIM
Netbox (open source) or Sunbird (enterprise).
Track: site -> rack -> device -> interface -> cable.

### Step 7: Physical Security
Perimeter to cage: fence, mantrap, badge + biometric, audit log.

### Step 8: Remote Hands
Document common tasks, pricing, and ticket template.
Include photos and diagrams.

## Common Pitfalls

1. **Underestimating power density**: 5 kW/rack becomes 15 kW/rack over 3 years. Plan for growth.
2. **Skipping blanking panels**: Missing blanks create hot spots, reduce cooling efficiency 15-30%.
3. **No cable management**: Rats nest makes troubleshooting impossible and restricts airflow.
4. **Single carrier**: One fiber cut takes entire DC offline. Minimum 2 carriers from different MMRs.
5. **PDU overloaded**: Loading PDU > 80% trips breaker. NEC code limits continuous load to 80%.
6. **Weight distribution**: Heavy devices at bottom, light at top. Overloaded raised floor can collapse.
7. **Forgotten UPS runtime**: 5-minute UPS runtime is insufficient for generator startup. Minimum 15 minutes.
8. **No environmental monitoring**: Temperature spike kills equipment silently. Monitor every row.
9. **Cheating on cable bend radius**: Tight bends in fiber cause attenuation and signal loss.
10. **Spreadsheet DCIM**: Excel is not a source of truth. Use proper DCIM tool.

## Best Practices

- Label everything: cables, ports, devices. Use barcode labels for asset tracking.
- Color code cables: blue = management, yellow = production, red = storage.
- Plan for 30% power headroom per rack from day one.
- Test generator under load quarterly (not just no-load start).
- Document everything in DCIM -- no paper records.
- Keep remote-hands runbook with photos, updated after every change.
- Perform power path analysis: trace from utility to device PSU.
- Use in-row cooling for high-density racks (> 15 kW).
- Implement liquid detection under raised floor.
- Conduct annual fire suppression system test.

## Compared With

| Approach | Strengths | Weaknesses |
|---|---|---|
| Colocation (this skill) | Shared facility cost, carrier diversity | Limited customization |
| Owned datacenter | Full control, amortized over time | High CAPEX, operational complexity |
| Edge datacenter | Low latency, distributed | Scaling complexity |
| Cloud only | Elastic, no facility management | Variable cost, data sovereignty |
| Hybrid colo+cloud | Flexibility, burst capacity | Network complexity |
| Modular/Prefab DC | Faster deployment, scalable | Less proven, integration risk |

## Templates and Tools

### Rack Elevation Template
```
U42: ToR Switch 1  | 150W | 10 lb | airflow: front-to-back
U41: ToR Switch 2  | 150W | 10 lb |
U40: Patch Panel   | 0W   | 5 lb  |
U39: Cable Mgmt 1U | 0W   | 2 lb  |
U38-U35: Servers (4x 1U) | 400W ea | 25 lb ea |
U34-U03: Servers (32x 1U) | 400W ea | 25 lb ea |
U02: PDU A | 0W | 10 lb |
U01: PDU B | 0W | 10 lb |
Total: 38 devices, 14.1 kW, 912 lb
```

### Power Budget Template
```
Rack: R-042
A Feed: PDU-A, Breaker 30A 208V, Load 22A (73%)
B Feed: PDU-B, Breaker 30A 208V, Load 20A (67%)
Total: 42A -> 8.7 kW
Headroom: 27%
```

## Rules
- Tier of facility >= Tier required by highest-HA workload it hosts.
- Every rack on A+B feeds; dual-PSU devices each on different feed.
- No PDU loaded > 80% of breaker rating (NEC code + safety margin).
- Cooling capacity >= peak power x 1.0 + N+1 redundant unit.
- Hot/cold aisle containment for >= 8 kW/rack density.
- All cables labeled both ends, color-coded by purpose.
- DCIM single-source-of-truth; no spreadsheet shadow inventory.
- 2+ carriers for any Tier-1 workload; cross-connects from different MMR rooms.
- Remote-hands tickets reference cage/rack/U position with photo.
- Generator tested under load at least quarterly.
- UPS runtime >= 15 minutes at full load.
- Environmental monitoring probes at top, middle, bottom of each row.
- Blanking panels in all unused U positions.
- Weight distribution: heaviest devices at bottom 1/3 of rack.
- All copper cabling Cat6a minimum; single-mode fiber for new runs.
- Physical access audited monthly with badge log review.
- Remote-hands runbook reviewed and tested annually.
- Fire suppression pre-action system for computer room.

## References
  - references/cabling.md -- Structured Cabling
  - references/datacenter-advanced.md -- Datacenter Advanced Topics
  - references/datacenter-fundamentals.md -- Datacenter Fundamentals
  - references/dcim.md -- DCIM Reference
  - references/rack-power-cooling.md -- Rack, Power, Cooling
  - references/tier-classification.md -- Uptime Institute Tiers
  - references/datacenter-networking-storage.md -- Networking and Storage
  - references/datacenter-capacity-planning.md -- Capacity Planning

## Handoff
- `devops-bare-metal` for what goes in the racks.
- `devops-network-infrastructure` for switching/routing inside the DC.
- `devops-storage-infrastructure` for storage cluster topology.
- `enterprise-business-continuity` for facility loss scenario planning.
- `enterprise-capacity-planning` for forecasted DC space + power growth.
