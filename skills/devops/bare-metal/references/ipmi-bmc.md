# IPMI / BMC / Redfish — Out-of-Band Management

## Why OOB Matters
The BMC (Baseboard Management Controller) runs even when the OS is dead. Power cycle, console, mount
virtual media, read sensors — all without the OS. If the OS panics at 3 a.m., OOB is the only path
that does not require a human in the colo.

## BMC Vendor Map

| Vendor      | BMC name      | API                  |
|-------------|---------------|----------------------|
| Dell        | iDRAC 8/9/10  | Redfish + IPMI       |
| HPE         | iLO 4/5/6     | Redfish + IPMI       |
| Lenovo      | XCC           | Redfish + IPMI       |
| Supermicro  | IPMI / X-12   | Redfish + IPMI       |
| OCP / open  | OpenBMC       | Redfish (modern)     |

Prefer Redfish over raw IPMI: HTTPS, JSON, structured, replaces nearly all IPMI 2.0 ops.

## Network Architecture

```
Production VLAN     ← app traffic, no BMC reachable
Storage VLAN        ← Ceph/SAN traffic, no BMC reachable
Management VLAN     ← orchestrator → hosts (SSH, K8s, etc.)
Out-of-Band VLAN    ← BMC only, isolated, never routed to Internet
                      reachable only from jump host with MFA
```

```
BMC NIC physical port:
  Dedicated port (best)        BMC has its own RJ45, no OS interference
  Shared LOM (common)          BMC shares motherboard NIC port 1; lose OS NIC = lose BMC if misconfigured
  Use dedicated port if at all possible.
```

## Hardening Checklist

```
[ ] Default credentials changed (root/calvin, admin/admin)
[ ] Unique strong password per BMC, stored in vault
[ ] LDAP / AD integration with MFA (for human access)
[ ] Disable IPMI v1.5 + Cipher 0 (CVE-prone)
[ ] HTTPS-only web UI, TLS 1.2 minimum, current CA cert
[ ] SSH-CA or keypair for serial-over-LAN
[ ] SNMPv3 only (never v2c default community)
[ ] NTP configured (else logs are useless)
[ ] Syslog forwarded to SIEM
[ ] Restrict BMC to OOB VLAN at switch port (storm-control + DHCP snooping)
[ ] Firmware updated to vendor latest stable
[ ] Audit logs retained 90+ days
```

## IPMI / ipmitool Basics

```bash
# Power state
ipmitool -I lanplus -H idrac.host -U admin -P $PW chassis power status
ipmitool -I lanplus -H idrac.host -U admin -P $PW chassis power on|off|cycle|reset

# Sensors (temp, fan, voltage)
ipmitool -I lanplus -H idrac.host -U admin -P $PW sensor list
ipmitool -I lanplus -H idrac.host -U admin -P $PW sdr type Temperature

# Boot device for next boot
ipmitool -I lanplus -H idrac.host -U admin -P $PW chassis bootdev pxe options=efiboot

# Serial over LAN (console access)
ipmitool -I lanplus -H idrac.host -U admin -P $PW sol activate
# exit: type ~.

# System Event Log
ipmitool -I lanplus -H idrac.host -U admin -P $PW sel list
ipmitool -I lanplus -H idrac.host -U admin -P $PW sel clear

# User mgmt
ipmitool -I lanplus -H idrac.host -U admin -P $PW user list 1
ipmitool -I lanplus -H idrac.host -U admin -P $PW user set password 2 'newpass'
```

## Redfish — Modern API

```bash
# Discover root
curl -sku admin:$PW https://idrac.host/redfish/v1/ | jq

# System inventory
curl -sku admin:$PW https://idrac.host/redfish/v1/Systems/System.Embedded.1 | jq '.MemorySummary, .ProcessorSummary'

# Power on
curl -sku admin:$PW -X POST -H 'Content-Type: application/json' \
  -d '{"ResetType":"On"}' \
  https://idrac.host/redfish/v1/Systems/System.Embedded.1/Actions/ComputerSystem.Reset

# One-shot PXE boot
curl -sku admin:$PW -X PATCH -H 'Content-Type: application/json' \
  -d '{"Boot":{"BootSourceOverrideEnabled":"Once","BootSourceOverrideTarget":"Pxe"}}' \
  https://idrac.host/redfish/v1/Systems/System.Embedded.1

# Mount virtual media (ISO over HTTP)
curl -sku admin:$PW -X POST -H 'Content-Type: application/json' \
  -d '{"Image":"http://repo/install.iso","Inserted":true,"WriteProtected":true}' \
  https://idrac.host/redfish/v1/Managers/iDRAC.Embedded.1/VirtualMedia/CD/Actions/VirtualMedia.InsertMedia

# Sensors
curl -sku admin:$PW https://idrac.host/redfish/v1/Chassis/System.Embedded.1/Thermal | jq '.Temperatures[]'
```

## Prometheus Exporter

```yaml
# redfish_exporter / ipmi_exporter scrape per BMC
- job_name: 'redfish'
  metrics_path: /redfish
  params: {target: ['idrac.node01']}
  static_configs:
  - targets: [idrac.node01, idrac.node02, ...]
  relabel_configs:
  - source_labels: [__address__]
    target_label: __param_target
  - target_label: __address__
    replacement: redfish-exporter:9610
```

Alerts: temp > threshold, fan RPM low, PSU not redundant, ECC corrected count rising.

## Console Access via Jump Host

```
admin --SSH MFA--> jumpbox (audit-logged) --OOB VLAN--> BMC
                                                          ├─ Power
                                                          ├─ Sensors
                                                          └─ Serial-over-LAN console
```

Never expose BMC to Internet. Shodan finds tens of thousands of exposed iDRACs daily;
unauthenticated remote code execution CVEs are common.

## Asset Tag + Inventory

```bash
# Pull asset tag, serial, BIOS version
ipmitool -I lanplus -H idrac.host -U admin -P $PW fru print
ipmitool -I lanplus -H idrac.host -U admin -P $PW mc info

# Or Redfish
curl -sku admin:$PW https://idrac.host/redfish/v1/Systems/System.Embedded.1 | \
  jq '{Manufacturer, Model, SerialNumber, SKU, AssetTag, BiosVersion}'
```

Sync into CMDB (NetBox) on commission + on regular schedule.

## Known Bad Defaults to Fix

```
Dell:        root / calvin
HPE:         Administrator / random-on-label (still rotate)
Supermicro:  ADMIN / ADMIN
IBM/Lenovo:  USERID / PASSW0RD
Tyan:        admin / admin
```
