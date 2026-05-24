# Rack, Power, Cooling — Practical Math

## Rack Sizes

| Spec        | Common values                                    |
|-------------|--------------------------------------------------|
| Height      | 42U (most common), 45U, 48U, 52U (tall colo)     |
| Width       | 600 mm (19" standard) or 750 mm (cable mgmt side)|
| Depth       | 1000, 1070, 1200 mm                              |
| Weight cap  | 1500–3000 lbs static, less dynamic               |
| RU height   | 1U = 44.45 mm (1.75")                            |

Choose 750mm wide for high-density (more side cable management). 1200mm deep for full-depth servers
+ cable management at rear.

## Power Density Tiers

```
Low density     2–5 kW / rack    legacy DC, lots of empty U
Medium          5–10 kW / rack   typical colo                       (most common)
High            10–20 kW / rack  modern compute
Very high       20–35 kW / rack  GPU, requires rear-door HX or liquid
Liquid cooled   30–100+ kW       direct-to-chip, immersion
```

Density limit = cooling, not power. A 35kW rack in a 10kW-cooled hall will thermally throttle.

## A+B Power Path

```
Utility A ─ ATS ─ UPS-A ─ PDU(A) ─┐
                                  ├─ Server (PSU-1, PSU-2)
Utility B ─ ATS ─ UPS-B ─ PDU(B) ─┘

Generator backs both utility feeds (after grid loss + 8s transfer)
UPS holds load during the 8s transfer
```

If one feed fails, the other carries full load — therefore each feed must be sized to handle 100%
(not 50%) of the load.

## PDU Types

```
Basic       just outlets, no monitoring
Metered     total kW visible
Switched    per-outlet on/off remotely
Intelligent per-outlet kW + remote switching (Raritan PX, APC AP8941, Vertiv MPH2)
3-phase     208V Y or 415V Y, higher density, fewer cables
```

```
Sizing example: 30A 208V single-phase PDU
  Capacity = 30A × 208V × 0.8 (NEC derate) = 4,992 W = ~5 kW per PDU
  2 PDUs (A+B) per rack = 10 kW available
  Maintain ≤ 80% load on each (i.e., 4 kW each in steady state)
  Why: must handle full load when one feed fails
```

## BTU + Cooling

```
1 W heat = 3.412 BTU/hr
1 ton cooling = 12,000 BTU/hr = 3,517 W

10 kW rack = 34,120 BTU/hr = 2.84 tons of cooling required
100 kW row = 28.4 tons
1 MW hall = 284 tons
```

Add 30% overhead for cooling system inefficiency + raised-floor losses.

## CRAC vs CRAH

```
CRAC  Computer Room Air Conditioner — has its own DX compressor (older)
CRAH  Computer Room Air Handler — chilled water from central plant (modern)

CRAH preferred: better efficiency (PUE), central chillers easier to redundant (N+1 chillers).
```

## Airflow Strategy

```
Hot Aisle / Cold Aisle (HACA)
  Servers face cold aisle (fronts together)
  Hot exhaust into hot aisle
  CRAC/H pulls hot, returns cold

Containment (mandatory at ≥ 8 kW/rack)
  Hot Aisle Containment (HAC)  enclose hot aisle, exhaust to ceiling plenum
  Cold Aisle Containment (CAC) enclose cold aisle, supply via raised floor

PUE improvement: 1.8–2.0 (no containment) → 1.3–1.5 (with containment)
```

```
Per rack: blank U panels in every empty position
          brushes/grommets for cable cutouts
          NO cables blocking front intake or rear exhaust
```

## Liquid Cooling (for > 35 kW)

```
Rear-Door HX     chilled water coil at rack rear, captures hot exhaust       8–50 kW/rack
Direct-to-Chip   cold plate on CPU/GPU, hot water out                       25–100 kW/rack
Immersion        servers dunked in dielectric fluid                         50–250 kW/rack
```

Most enterprise stays with HACA + containment until forced by GPU density (>20 kW/rack).

## Weight + Floor Loading

```
Server: ~30–80 lbs each, 16 in a rack = 800–1300 lbs of gear
+ rack itself: 200–300 lbs
+ PDUs, cables: ~100 lbs
Total per rack: 1100–1700 lbs typical

Raised-floor rating: 1500 lbs/tile (most) — call out heavier
Slab floor: usually fine; coordinate with structural engineer for very dense GPU racks (>2000 lbs)
```

## Acoustics

Dense racks produce 85+ dB. Hearing protection required. Plan walk-around limits or quiet rooms.

## Common Mistakes

- Sizing PDUs to 100% of load (must be ≤ 80% NEC)
- Mixing hot/cold aisle direction (recirculates hot air)
- Forgetting cable mgmt arms eat 1–2U each
- No blank panels → cold bypass, hot recirc, throttle
- Cables blocking grill → local overheating
- Single PSU device on dual-feed rack (loses on either feed fail)
- 240V devices on 120V circuits (wrong voltage spec)
- Loading one feed > other (imbalance causes failover failure)
