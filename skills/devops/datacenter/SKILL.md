---
name: datacenter
description: >
  Use this skill when the user says 'datacenter', 'data center', 'DC',
  'rack', 'power', 'cooling', 'PDU', 'UPS', 'Tier classification',
  'N+1 redundancy', '2N redundancy', 'cabling', 'fiber', 'copper',
  'hot aisle', 'cold aisle', 'rack density', 'kW per rack',
  'DCIM', 'data center operations', 'colocation'.
  Covers: datacenter tier classification (Tier I-IV), power and cooling design,
  rack layout, cabling standards, DCIM tools, capacity planning,
  redundancy models, environmental monitoring, colocation selection.
  Do NOT use for: cloud infrastructure (use cloud-specific skills),
  server provisioning (use bare-metal skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, datacenter, infrastructure, hardware, phase-5]
---

# Datacenter Operations

## Purpose
Design, operate, and manage physical datacenter infrastructure including tier classification, power/cooling, rack layout, cabling, DCIM, and capacity planning.

## Architecture Decision Trees

### Datacenter Tier Classification
| Tier | Availability | Redundancy | Annual Downtime | Cost Premium |
|---|---|---|---|---|
| Tier I (Basic) | 99.671% | None (N) | 28.8 hours | 1x (baseline) |
| Tier II (Redundant) | 99.741% | N+1 (power/cooling) | 22.7 hours | 1.2-1.5x |
| Tier III (Concurrently Maintainable) | 99.982% | N+1 (all components) | 1.6 hours | 1.8-2.5x |
| Tier IV (Fault Tolerant) | 99.995% | 2N (fully redundant) | 26.3 minutes | 3-5x |

### Power Redundancy Models
| Model | Description | UPS Config | Generator | Cost vs N |
|---|---|---|---|---|
| N | Single path | 1 UPS | 1 generator | 1x |
| N+1 | Redundant component | 2 UPS (N+1) | 2 generators (N+1) | 1.3x |
| 2N | Two independent paths | 2 UPS (each N) | 2 generators (each N) | 2x |
| 2N+1 | Two paths + redundant | 3 UPS (2N+1) | 3 generators | 2.3x |

### Cooling Architecture Comparison
| Type | PUE Impact | Capacity (kW/rack) | Cost | Best For |
|---|---|---|---|---|
| Room-based (CRAC) | 1.4-1.8 | <10 | Low | Legacy DCs, low density |
| Row-based (in-row) | 1.2-1.4 | 10-25 | Medium | Standard deployments |
| Rack-based (rear door) | 1.1-1.3 | 15-40 | Medium-High | High-density (GPU/HPC) |
| Liquid (direct-to-chip) | 1.05-1.1 | 40-100+ | High | HPC, AI/ML clusters |
| Immersion | 1.02-1.05 | 100+ | Very High | Extreme density |

### Colocation Selection Criteria
| Factor | Retail Colo | Wholesale Colo | Hyperscaler Edge |
|---|---|---|---|
| Space | Per rack | Per cage/suite | Per cabinet |
| Contract | 1-3 years | 3-10 years | Flexible |
| Management | Hands-on support | Self-managed | Remote hands |
| Connectivity | Shared meet-me room | Dedicated cross-connects | Provider-specific |
| Cost/rack/month | $1,000-3,000 | $500-1,500 | Varies |
| Power included | Often (up to limit) | Separate billing | Per circuit |

## Core Workflow

### Step 1: Rack Layout Design
```
Standard 42U Rack Layout (Front View)
┌──────────────────────┐
│  [1U] Patch Panel    │ U 1
│  [1U] Patch Panel    │ U 2
│──────────────────────│
│  [2U] Core Switch 1  │ U 3-4
│  [2U] Core Switch 2  │ U 5-6
│──────────────────────│
│  [1U] PDU A (3-phase)│ U 7
│  [1U] PDU B (3-phase)│ U 8
│──────────────────────│
│  [1U] Server 1       │ U 9
│  [1U] Server 2       │ U 10
│  [1U] Server 3       │ U 11
│  [1U] Server 4       │ U 12
│──────────────────────│
│  [2U] Storage Array  │ U 13-14
│──────────────────────│
│  [1U] Server 5       │ U 15
│  [1U] Server 6       │ U 16
│  [1U] Server 7       │ U 17
│  [1U] Server 8       │ U 18
│──────────────────────│
│  [2U] UPS (per rack) │ U 19-20
│──────────────────────│
│  [1U] empty          │ U 21
│  [1U] empty          │ U 22
│  ...                 │ ...
│──────────────────────│
│  [4U] GPU Server     │ U 38-41
│  [1U] BMC Switch     │ U 42
└──────────────────────┘

Power Distribution:
  Feed A: PDU A (A-phase) → Server PSU A
  Feed B: PDU B (B-phase) → Server PSU B
  Each PSU: 120V/208V/240V based on equipment

Cabling:
  Fiber: Patch panel U1 → ToR Switch
  Copper: Patch panel U2 → Server NICs
  Management: BMC ports → BMC switch (U42)
```

### Step 2: Power Capacity Planning
```python
# capacity/power_planning.py
"""Datacenter power capacity planning tool."""

RACK_POWER_MAP = {
    "standard_rack": {
        "servers": 16,          # 1U servers
        "gpu_servers": 1,       # 4U GPU servers
        "switches": 2,          # ToR switches, 2U each
        "storage": 1,           # Storage array, 2U
    },
    "high_density_rack": {
        "servers": 8,
        "gpu_servers": 4,
        "switches": 2,
        "storage": 2,
    },
}

POWER_PER_COMPONENT = {
    "1u_server": {"idle_w": 80, "max_w": 250},
    "gpu_server": {"idle_w": 500, "max_w": 2500},
    "tor_switch": {"idle_w": 150, "max_w": 400},
    "storage_array": {"idle_w": 200, "max_w": 600},
}

def calculate_rack_power(rack_type="standard_rack"):
    """Calculate total power per rack."""
    config = RACK_POWER_MAP[rack_type]
    total_idle = 0
    total_max = 0

    total_idle += config["servers"] * POWER_PER_COMPONENT["1u_server"]["idle_w"]
    total_max += config["servers"] * POWER_PER_COMPONENT["1u_server"]["max_w"]
    total_idle += config["gpu_servers"] * POWER_PER_COMPONENT["gpu_server"]["idle_w"]
    total_max += config["gpu_servers"] * POWER_PER_COMPONENT["gpu_server"]["max_w"]
    total_idle += config["switches"] * POWER_PER_COMPONENT["tor_switch"]["idle_w"]
    total_max += config["switches"] * POWER_PER_COMPONENT["tor_switch"]["max_w"]
    total_idle += config["storage"] * POWER_PER_COMPONENT["storage_array"]["idle_w"]
    total_max += config["storage"] * POWER_PER_COMPONENT["storage_array"]["max_w"]

    return {"idle_kw": total_idle / 1000, "max_kw": total_max / 1000}

def calculate_power_for_room(num_racks, rack_type="standard_rack", redundancy="N"):
    """Calculate total power infrastructure needed."""
    rack_power = calculate_rack_power(rack_type)
    total_it_load = rack_power["max_kw"] * num_racks

    # Cooling overhead
    cooling_factor = 1.3  # Typical PUE for row-cooled DC
    total_facility = total_it_load * cooling_factor

    # Redundancy factor
    redundancy_factors = {
        "N": 1.0,
        "N+1": 1.3,
        "2N": 2.0,
        "2N+1": 2.3,
    }
    total_redundant = total_facility * redundancy_factors[redundancy]

    # UPS capacity
    ups_capacity = total_redundant * 1.2  # 20% headroom

    return {
        "it_load_kw": total_it_load,
        "facility_load_kw": total_facility,
        "redundant_load_kw": total_redundant,
        "ups_capacity_kw": ups_capacity,
        "ups_runtime_min": 15,  # Typical battery runtime
        "generator_kw": total_redundant * 1.1,
    }

# Example: 20 racks, standard density, N+1 redundancy
power = calculate_power_for_room(20, "standard_rack", "N+1")
for k, v in power.items():
    if "kw" in k:
        print(f"{k}: {v:.1f} kW")
    else:
        print(f"{k}: {v}")
```

### Step 3: Cabling Standards
```yaml
# cabling/cabling-standards.yaml
structured_cabling:
  copper:
    cat6a:  # 10Gbps, 100m max
      use: "Server to ToR, management"
      max_length_m: 100
      termination: "RJ45 (T568B)"
    cat8:  # 25/40Gbps, 30m max
      use: "Switch to switch, high-speed links"
      max_length_m: 30

  fiber:
    om3_multimode:  # 10G-100G, 300m
      use: "ToR to EoR, storage networks"
      max_length_m: 300
      connector: "LC duplex"
    om4_multimode:
      use: "High-speed storage (32G FC)"
      max_length_m: 400
    os2_singlemode:  # 100G-400G+, >10km
      use: "Inter-rack, cross-connect, WAN"
      max_length_m: 40000
      connector: "LC (polished)"

  labeling:
    standard: "TIA-606-B"
    format: "RACK-PANEL-PORT"  # e.g., A01-P01-001
    labels_required:
      - "Both ends of every cable"
      - "Patch panel ports"
      - "Outlet faceplates"
      - "Breakout points"
```

### Step 4: DCIM Integration Script
```python
# dcim/rack_monitor.py
"""Monitor rack-level power, temperature, and humidity via DCIM API."""

import requests
import time
import json
from datetime import datetime

class DCIMClient:
    def __init__(self, base_url, api_token):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({'Authorization': f'Bearer {api_token}'})

    def get_rack_sensors(self, rack_id):
        resp = self.session.get(f"{self.base_url}/api/racks/{rack_id}/sensors")
        resp.raise_for_status()
        return resp.json()

    def get_pdu_load(self, pdu_id):
        resp = self.session.get(f"{self.base_url}/api/pdus/{pdu_id}/load")
        resp.raise_for_status()
        resp_data = resp.json()
        return {
            "total_load_w": resp_data["totalPower"],
            "load_percent": resp_data["loadPercent"],
            "phase_loads": resp_data.get("phases", []),
        }

    def check_environmental_limits(self, rack_id):
        sensors = self.get_rack_sensors(rack_id)
        alarms = []
        for sensor in sensors:
            if sensor["type"] == "temperature":
                if sensor["value"] > 27:  # ASHRAE max recommended
                    alarms.append(f"High temp: {sensor['value']}°C at {sensor['location']}")
            elif sensor["type"] == "humidity":
                if sensor["value"] > 80:
                    alarms.append(f"High humidity: {sensor['value']}% at {sensor['location']}")
                elif sensor["value"] < 20:
                    alarms.append(f"Low humidity: {sensor['value']}% at {sensor['location']}")
        return alarms

    def monitor_all_racks(self, rack_ids, interval_s=60):
        """Continuous monitoring loop."""
        while True:
            for rack_id in rack_ids:
                alarms = self.check_environmental_limits(rack_id)
                for alarm in alarms:
                    print(f"[{datetime.utcnow().isoformat()}] ALERT: {alarm}")
            time.sleep(interval_s)
```

### Step 5: Environmental Monitoring Configuration
```yaml
# monitoring/datacenter-monitoring.yaml
sensor_thresholds:
  temperature:
    warning_c: 27    # ASHRAE recommended max inlet temp
    critical_c: 32   # ASHRAE allowable max inlet temp
    min_c: 18        # Prevent condensation
  humidity:
    warning_percent: 60
    critical_percent: 80
    min_percent: 20
  airflow:
    min_cfm_per_kw: 160
  differential_pressure:
    min_pa: 5        # Underfloor positive pressure

alert_escalation:
  temp_warning:
    - notify: "Datacenter Team (Slack)"
    - wait: 5m
    - notify: "Facilities Manager (PagerDuty)"
  temp_critical:
    - notify: "Datacenter Team (PagerDuty)"
    - notify: "Facilities Manager (Phone)"
    - action: "Initiate emergency cooling procedures"
  power_anomaly:
    - notify: "Electrical Team (PagerDuty)"
    - action: "Check UPS status, initiate generator test"
```

## Anti-Patterns

### Anti-Pattern 1: Hot/Cold Aisle Mismanagement
Blocking hot aisle containment or mixing hot and cold air. Proper containment can reduce cooling costs by 20-40%.

### Anti-Pattern 2: Over-Subscribing Power Circuits
Plugging more equipment into a PDU than its rated capacity (e.g., 24A on a 20A circuit). Always leave 20% headroom.

### Anti-Pattern 3: Ignoring Rack Weight Limits
Filling racks with heavy UPS/gpu servers without checking floor load rating. Server racks can weigh > 1000kg fully loaded.

### Anti-Pattern 4: Poor Cable Management
Running cables haphazardly without horizontal/vertical management. Blocks airflow, makes troubleshooting impossible, increases cooling costs.

### Anti-Pattern 5: No DCIM
Managing datacenter capacity without DCIM tools. Leads to stranded capacity and inefficiencies.

## Rules & Constraints
- Maintain hot aisle / cold aisle configuration at all times.
- Leave 20% headroom on all power circuits.
- All cabling must be labeled per TIA-606-B.
- Environmental monitoring (temp/humidity/power) on every rack.
- PUE should be < 1.6 for air-cooled DCs.
- Test generator and UPS monthly under load.
- Maintain cable management to preserve airflow.

## References
  - references/cabling.md
  - references/datacenter-advanced.md
  - references/datacenter-capacity-planning.md
  - references/datacenter-fundamentals.md
  - references/datacenter-networking-storage.md
  - references/dcim.md
  - references/rack-power-cooling.md
  - references/tier-classification.md
  - references/ashrae-guidelines.md

## Handoff
Next: **network-infrastructure** — datacenter network architecture.
