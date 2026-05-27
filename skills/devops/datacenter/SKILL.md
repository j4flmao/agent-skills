---
name: devops-datacenter
description: >
  Use this skill when planning or operating datacenter facilities: rack and U planning, A+B power feeds,
  N+1 / 2N cooling, Uptime Institute tier classification (Tier I–IV), DCIM, structured cabling, fire
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
  windsurf: true
tags: [devops, datacenter, colo, on-prem, infrastructure, phase-2]
---

# DevOps Datacenter

## Purpose
Design and operate datacenter space (private cage in a colo, or owned DC) with the right tier of
power/cooling redundancy for the workload, accurate rack U/power/weight planning, structured cabling,
DCIM tracking, and remote-hands operational discipline.

## Agent Protocol

### Trigger
Exact user phrases: "datacenter", "colo", "colocation", "Equinix", "Digital Realty", "Coresite", "DCIM",
"rack U", "power budget", "PDU", "ATS", "UPS", "generator", "BTU", "CRAC", "CRAH", "hot aisle",
"cold aisle", "Uptime Institute", "Tier III", "Tier IV", "redundancy", "structured cabling", "rack
elevation", "remote hands", "physical security".

### Input Context
- Workload (compute / GPU / storage / network-heavy)
- Total kW required + projected growth
- Tier target (I, II, III, III+, IV) driven by HA tier
- Geographic constraints (latency, data residency, talent availability)
- Carrier diversity required (1 / 2 / 3+ ISPs)
- Existing physical infrastructure (owned DC, colo cage, edge POP)
- Budget model (capex DC build vs opex colo)

### Output Artifact
DC plan with rack elevations, power/cooling budget, tier compliance check, cable plan, DCIM schema,
remote-hands runbook.

### Response Format
```
Tier: {I | II | III | III+ | IV}
Capacity: {racks × kW each, total kW, total RU}
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
- [ ] Cooling capacity ≥ heat load + N+1 redundancy
- [ ] Structured cabling plan (MMR ↔ cage)
- [ ] DCIM populated (Netbox / Sunbird / Nlyte)
- [ ] Carrier diversity ≥ 2
- [ ] Physical security controls verified
- [ ] Remote-hands runbook with photos + diagrams

### Max Response Length
350 lines.

## Workflow

### Step 1: Pick Tier (Uptime Institute)
```
Tier I    99.671% (28.8h/yr)   Single path power+cooling, no redundancy, basic
Tier II   99.741% (22h/yr)     Single path with redundant components (UPS+generator)
Tier III  99.982% (1.6h/yr)    Multiple paths, ONE active; concurrently maintainable
Tier IV   99.995% (26m/yr)     Multiple ACTIVE paths, fault-tolerant, 2N+1
```

Match to app HA tier:
- App 99.9% → Tier II minimum
- App 99.99% → Tier III minimum
- App 99.999% → Tier IV or multi-DC active-active

### Step 2: Rack Planning
Standard rack: 42U or 48U, 600mm or 750mm wide × 1000mm or 1200mm deep.

```
Per-rack budget (typical Tier III colo):
  Power: 5 kW (low density), 10 kW (medium), 15-25 kW (high), 35 kW+ (HPC/GPU)
  Cooling: matches power (1W in = 1W out + 30% overhead)
  Weight: 1500-2000 lbs limit per rack (raised floor concern)
  RU usable: ~38–40 of 42 (PDUs, cable mgmt eat space)
```

Sample elevation (compute rack, 10kW):
```
U42-U40   Top-of-Rack switches (2× leaf, redundant)        ~150W ea
U39       1U cable mgmt
U38-U36   Patch panels (fiber + copper)
U35       1U cable mgmt
U34-U03   16× 2U compute servers (2 PSUs each, A+B feeds)  ~500W ea
U02-U01   Vertical PDUs (visible front, often 0U side)
```

### Step 3: Power Budget + Redundancy
```
A+B power: every server has 2 PSUs, one to A feed, one to B feed
A feed from Utility-A → ATS → UPS-A → PDU-A → server PSU-1
B feed from Utility-B → ATS → UPS-B → PDU-B → server PSU-2

Tier II:   one path, redundant components
Tier III:  two paths, one active (B is standby; switchover < 6s via STS)
Tier IV:   two paths, BOTH active continuously (2N)
```

PDU sizing:
```
Per rack: 2× 30A or 2× 60A 208V PDU (or 3-phase 415V for high density)
Diversity: NEVER load > 80% of breaker rating (NEC code)
Monitoring: per-outlet kW + amps (Raritan, Vertiv, APC) → SNMP/Modbus to DCIM
```

### Step 4: Cooling Math
```
Heat load (W) ≈ power draw (W) × 1.0
BTU/hr = watts × 3.412
Tons of cooling = BTU/hr / 12,000

Example: 100 racks × 10 kW = 1 MW = 3.4M BTU/hr = 283 tons of cooling
```

Redundancy:
```
N+1   one spare CRAC unit can fail without impact
2N    full duplicate (two cooling systems)
```

Containment:
```
Hot aisle / cold aisle alternation
Hot aisle containment (HAC) or cold aisle containment (CAC) = +15–30% efficiency
Blank panels in unused U slots (prevent bypass airflow)
Sealed cable cutouts (brushes / grommets)
```

### Step 5: Structured Cabling
```
Fiber types:
  OM4 multi-mode  short-reach 10/25/40/100/400G inside row
  OS2 single-mode any distance, future-proof; default for inter-row + DC↔DC
  MPO trunks      40G/100G/400G aggregated 8–24 fibers
Copper:
  Cat6a           10G up to 100m (avoid for new builds; use fiber)

Patch policy:
  No patch > 5m
  Bend radius respected (10× cable OD for fiber)
  Velcro ties only (zip ties damage fiber)
  Labels at BOTH ends, scheme: <source-port>-<dest-port> printed
  Color codes: e.g., blue=mgmt, yellow=prod, red=storage
```

MMR (Meet-Me Room): where carriers terminate. Cross-connects from MMR to your cage; lease per
cross-connect (~$200–500/month) — keep them few and aggregated.

### Step 6: DCIM (Datacenter Infrastructure Management)
```
Tools:
  NetBox     open source, source-of-truth IPAM + DCIM
  Sunbird    enterprise, deep integrations
  Nlyte      enterprise
  Device42   discovery-heavy

Schema essentials:
  Site → Rack → Unit position → Device → Interface → Cable → Far-end
  Power chain: Site PDU → Cabinet PDU → Outlet → Device → PSU
  IP allocations linked to device + interface
  Asset tags, serials, purchase orders, warranty dates
```

### Step 7: Physical Security
```
Perimeter:    fence, 24×7 guard, camera ring
Building:     mantrap with badge + biometric
Floor:        2-factor (badge + PIN)
Cage:         locked door with audit log per entry
Camera:       cage interior, 90 day retention minimum, sub-1s shutter
Background checks on every approved visitor
```

### Step 8: Remote Hands Runbook
For when a human is needed but you cannot drive in.
```
Common tasks (price varies by colo):
  Visual check ($25-50)        confirm light, listen for noise
  Reseat cable ($50-100)       reseat indicated port/PSU
  Swap drive ($75-150)         hot-swap drive, follow chassis diagram
  Power cycle physically ($75) hold power button, only if BMC unresponsive
  Rack new gear ($150-500)     mount, cable, label per ticket

Ticket template:
  - Cage / rack / U position with photo
  - Asset tag / serial of device
  - Exact action requested
  - Diagram or photo with annotation
  - Contact for confirmation
  - Approval / signoff person
```

## Rules
- Tier of facility ≥ Tier required by highest-HA workload it hosts.
- Every rack on A+B feeds; dual-PSU devices each on different feed.
- No PDU loaded > 80% of breaker rating (NEC code + safety margin).
- Cooling capacity ≥ peak power × 1.0 + N+1 redundant unit.
- Hot/cold aisle containment for ≥ 8 kW/rack density.
- All cables labeled both ends, color-coded by purpose.
- DCIM single-source-of-truth; no spreadsheet shadow inventory.
- 2+ carriers for any Tier-1 workload; cross-connects from different MMR rooms.
- Remote-hands tickets reference cage/rack/U position with photo.

## References
  - references/cabling.md — Structured Cabling — Fiber + Copper, Labeling, Hygiene
  - references/datacenter-advanced.md — Datacenter Advanced Topics
  - references/datacenter-fundamentals.md — Datacenter Fundamentals
  - references/dcim.md — DCIM — Datacenter Infrastructure Management
  - references/rack-power-cooling.md — Rack, Power, Cooling — Practical Math
  - references/tier-classification.md — Uptime Institute Tier Classification
## Handoff
- `devops-bare-metal` for what goes in the racks.
- `devops-network-infrastructure` for switching/routing inside the DC.
- `devops-storage-infrastructure` for storage cluster topology.
- `enterprise-business-continuity` for facility loss scenario planning.
- `enterprise-capacity-planning` for forecasted DC space + power growth.
