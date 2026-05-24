# Structured Cabling — Fiber + Copper, Labeling, Hygiene

## Fiber Types

| Type        | Mode     | Distance @ 10G | Distance @ 100G | Use                            |
|-------------|----------|----------------|-----------------|--------------------------------|
| OM3         | multi-mode | 300m         | 100m            | legacy / short                 |
| OM4         | multi-mode | 400m         | 150m            | typical inside row             |
| OM5         | multi-mode | 400m+ (SWDM) | 150m+           | newer, longer SWDM             |
| OS2 (SMF)   | single-mode| 10km+        | 10km+           | any longer reach + DC↔DC + LH  |

Use **OS2 (single-mode)** as default for new builds. Multi-mode is being phased out for new
high-speed runs because optics for SMF are now competitive in price.

## Connector Types

```
LC   most common, small form, 1 fiber                    (per duplex pair: 2 LC)
SC   older, larger                                       (legacy)
MPO  multi-fiber push-on, 8 / 12 / 16 / 24 fibers        (40G/100G/400G trunks)
ST   bayonet, very old                                   (legacy only)
```

## Optic Types (transceivers)

```
SFP+        10G                                     (~$30-100)
SFP28       25G                                     (~$40-150)
QSFP+       40G (4×10G)                             (~$150-400)
QSFP28      100G (4×25G or 1×100G)                  (~$400-1500)
QSFP-DD     200G/400G (8 lanes)                     (premium)
OSFP        400G/800G, newer form factor

Pair optic to fiber + distance:
  10G-SR/25G-SR     MMF up to 100m
  10G-LR/25G-LR     SMF up to 10km
  100G-SR4          MMF MPO 100m
  100G-LR4          SMF LC 10km
```

Use generic / coded optics from FS.com, AlphaOmega for non-warranty savings. Vendor-locked optics
(Cisco, Juniper) cost 3–10× for the same chip — use coded compatible.

## Copper (still useful for short / cheap / mgmt)

```
Cat5e    1G up to 100m              (legacy)
Cat6     1G + 10G short             (legacy)
Cat6a    10G up to 100m             (still common for mgmt)
Cat7/8   25G/40G short              (rare; fiber wins)
DAC      direct-attach copper       (10G/25G/100G, ≤5m, cheap)
AOC      active optical cable       (10G–400G, ≤30m, no transceivers needed)
```

For top-of-rack ↔ server: DAC up to 3m is cheapest. Above 3m: AOC or fiber+optics.

## Patch Panel Strategy

```
Server NIC → patch cable → patch panel (in cage) → trunk cable → patch panel (in MMR) → carrier

Every "consumer" connects via patch panel. Trunks are permanent. Patches are short, swappable.
```

```
Within-rack:    24-port LC duplex panels at top of rack
Inter-rack:     MPO trunks between rows
To MMR:         24- or 48-strand SMF backbone, terminated in patch panel
```

## Cable Length Rules

- Patch cables ≤ 5m (longer = use trunk + patch)
- Service loop: 50cm slack at each end (room for re-termination)
- Bend radius: minimum 10× cable outer diameter for fiber (e.g., 3mm OD → 30mm min radius)
- Pull tension: don't exceed cable spec when fishing through cable trays

## Cable Management

```
Vertical management   one between every 2 racks; routes patches up/down
Horizontal management 1U between every 4–6U of patch panels
Cable tray (overhead) wire mesh tray; preferred for new builds
Raised floor          legacy; cabling under tile — harder to maintain

Bundling:
  Velcro ties only (zip ties damage fiber/copper insulation)
  Bundle by destination, not by source
  Keep power and data physically separated (EMI on copper)
```

## Color Coding (set a standard)

```
Blue       management / OOB
Yellow     production
Red        storage
Green      DMZ / public
Black      crossover / direct
Orange     OM4 multi-mode (industry standard for OM3/OM4 fiber jackets)
Aqua       OM3 (often)
Yellow     OS2 single-mode (industry standard)
```

## Labeling

Every cable, both ends, durable label.

Scheme: `<source>-<dest>` printed, e.g., `A-R101-U34-eno1 ↔ A-R101-U41-Eth1/3`.
Use thermal-transfer label printer (Brady BMP21, Brother PT) — handwritten fades in 6 months.

## Testing

- Fiber: OTDR for backbone runs; light meter + loss budget for patch
- Copper: cable certifier (Fluke DSX) — verify per category
- After every install: continuity test, both directions
- Document test results in DCIM cable record

## MPO Polarity (gotcha)

MPO trunks have polarity types A / B / C. Wrong polarity = link won't come up.
- Type A trunk + Type A patch → fail
- Type A trunk + Type B patch → works (for typical pairings)
Verify standard with vendor; document per trunk.

## Cross-Connect Hygiene (Colo)

- One cross-connect record per circuit, billed monthly
- Tag with CCID (cross-connect ID) from colo provider
- Periodic audit: do we still need this? (Stale XCs are common waste)
- Diversify path: if both XCs in same conduit, single backhoe takes both

## Common Failures

- Mixed OM3/OM4/OS2 in same run → optics negotiate to lowest, distance limit hits
- Multi-mode optic on SMF cable (or vice versa) → won't link
- Bend radius violated at corner → intermittent CRC errors months later
- Zip ties pinch fiber → loss creeps up over time
- No service loop → can't re-terminate without pulling cable
- One huge tangled patch field → MTTR after fail = hours
- Wrong polarity MPO → mysterious link-down on new install
