# DCIM — Datacenter Infrastructure Management

## Why DCIM
Single source of truth for physical inventory: who/what/where/when in the racks. Without it, you
lose track of which port goes where, what's plugged into what circuit, and how much power is free.
Spreadsheet shadow inventories ALWAYS rot.

## Tool Choices

| Tool         | Strengths                              | Notes                         |
|--------------|----------------------------------------|-------------------------------|
| NetBox       | open source, API-first, IPAM included  | most adopted, GitHub          |
| Sunbird DCIM | enterprise, deep power monitoring      | commercial                    |
| Nlyte        | enterprise, mature workflows           | commercial                    |
| Device42     | discovery-heavy auto-population        | commercial                    |
| OpenDCIM     | open source basic                      | aging                         |
| RackTables   | open source, classic                   | aging                         |

For most teams: **NetBox**.

## Core Schema

```
Site            physical location (DC name + address)
Tenant          owner / customer / team
Location        floor / row / cage
Rack            position in cage, height, weight
RackReservation hold U for planned install
Device          physical thing in a rack (server, switch, PDU, KVM, patch panel)
DeviceRole      compute / network / storage / pdu / etc.
DeviceType      model + manufacturer + U height + power draw
Interface       NIC / switch port / console / management
Cable           physical link between two interfaces; type + length + label
PowerPort       device's PSU; cable to outlet
PowerOutlet     PDU outlet
PowerPanel      upstream panel (per-rack PDU or RPP)
PowerFeed       PowerPanel ↔ utility/UPS
IPAddress       allocated IP + DNS
Prefix / VLAN   IPAM
Circuit         WAN / cross-connect / carrier link
```

## NetBox Quick Start

```bash
# Docker compose: github.com/netbox-community/netbox-docker
git clone https://github.com/netbox-community/netbox-docker
cd netbox-docker
docker compose up -d
# Web UI :8000, login admin/admin (change immediately)
```

## API-First Workflow

Manual UI = inconsistent. Drive everything from API.

```bash
# Create rack via API
curl -sk -H "Authorization: Token $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"R-101","site":1,"u_height":42,"width":600}' \
  https://netbox/api/dcim/racks/

# Create device
curl -sk -H "Authorization: Token $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"db-01","device_type":5,"device_role":2,"site":1,"rack":7,"position":34,"face":"front"}' \
  https://netbox/api/dcim/devices/
```

```python
# pynetbox — pythonic client
import pynetbox
nb = pynetbox.api('https://netbox', token='...')
device = nb.dcim.devices.create(
  name='db-02', device_type=5, device_role=2,
  site=1, rack=7, position=32, face='front')
```

## Auto-Discovery + Sync

- Ironic / MAAS push commissioned hardware metadata into DCIM
- Nornir / Netmiko walk switches, populate interfaces + cables (LLDP)
- IPAM sync: assign IPs from prefix pool, push to DNS via webhook
- BMC sync: serial, asset tag from Redfish

## DCIM ↔ Other Systems

```
NetBox  ←source of truth→  Ansible inventory
                       →   Terraform provider (for cloud parts)
                       →   Prometheus file_sd / service discovery
                       →   DNS automation (octoDNS, PowerDNS)
                       →   IPAM (built in)
                       →   change management (webhooks to ticketing)
```

## Modeling Patterns

```
Per-rack hierarchy:
  Rack R-101
    PDU A (rack PDU, 24 outlets, 30A 208V)
      Outlets 1–24
    PDU B (same)
    Patch Panel PP-101A (24-port LC)
    Patch Panel PP-101B
    Devices...

Cable representation:
  device db-01 / port eno1 ──cable A-101-007──> switch leaf-101 / Ethernet1/3
  type: copper Cat6a, length 3m, color blue, label A-101-007
```

## Label Scheme (must be deterministic)

```
Cable label:    <ABCcage>-<rack>-<seq>           e.g., A-101-007
Power label:    <feed>-<PDU>-<outlet>            e.g., A-PDU1-15
Patch panel:    <pp-id>-<port>                   e.g., PP-101A-12
Rack label:     <cage>-<row>-<rack>              e.g., A-01-05
Device label:   FQDN + asset tag                 e.g., db-01.dc.example.com / AT12345
```

Print to durable labels (Brother PT, Brady). Both ends of every cable. Faded label = no label.

## Reports You Need

- Free U per rack
- Free power per rack + per feed
- Cooling utilization vs capacity
- IP availability per prefix
- Cable count / type distribution
- Devices out of warranty
- Devices with no documented power chain
- Capacity forecast: months until rack X full

## Common Failures

- Inventory rots → enforce: no install/decommission without DCIM update (CI hook)
- Cables physically there but not in DCIM → schedule periodic audit walk
- Multi-source truth (DCIM + spreadsheet + Confluence) → kill the others
- IPAM divorced from DCIM → reuse conflicts, ghost allocations
- No API automation → manual entry stale within months
