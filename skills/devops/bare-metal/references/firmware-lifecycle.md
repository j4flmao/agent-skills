# Firmware Lifecycle — Tracking, Cadence, Rollout

## Components With Firmware (don't forget any)

```
BIOS / UEFI
BMC (iDRAC / iLO / XCC)
NIC (Intel, Mellanox/NVIDIA, Broadcom)
HBA / RAID controller (PERC, Smart Array, MegaRAID)
SSD / NVMe (vendor + model specific)
HDD (less frequent)
PCIe expanders / risers
GPU (NVIDIA VBIOS)
PSU (rare but exists)
CPLD (board control logic)
```

## Inventory Per Node

Track in CMDB / NetBox:
```
node01:
  bios_version: 2.18.1
  bmc_version: 6.10.30.00
  nic_eno1_firmware: 22.5.4
  ssd_serial_FW: { 'S5K1NNXxx': 'EXM03B6Q' }
  perc_firmware: 25.5.9.0001
  last_updated: 2026-04-15
  baseline_compliance: drift  # ok | drift | non-compliant
```

## Update Cadence

```
Critical CVE (CVSS ≥ 9)        within 30 days, expedited rollout
High CVE (CVSS 7–8.9)          within 60 days
Medium / functional fixes      next quarterly maintenance
Stability / perf only          annual review
```

Subscribe vendor security advisories:
- Dell DSA RSS
- HPE Security Bulletins
- Supermicro security
- Intel SA, AMD security advisories
- NVIDIA bulletin board

## Staged Rollout

```
Stage          Scope                 Bake time   Rollback path
1. Dev fleet   5–10 lab boxes        7 days      revert in lab
2. Canary      1 prod node per role  14 days     vendor downgrade tool
3. 5%          1 / 20 in each rack   3 days      hold + investigate
4. 25%         spread across racks   3 days
5. Fleet       remainder, 1 per rack at a time
```

Never update >1 node per failure domain (rack / AZ) simultaneously.

## Update Methods

```
Vendor agent
  Dell:       racadm + DUP files, or OpenManage Enterprise
  HPE:        Smart Update Manager (SUM), iLO REST/RESTful Interface Tool
  Supermicro: SUM, SMCIPMITool
  Lenovo:     UpdateXpress System Pack (UXSP)

Out-of-band (preferred, no OS dependency)
  Redfish:    POST UpdateService.SimpleUpdate with image URL
  Virtual media: mount ISO via BMC, boot, run vendor updater

In-band
  fwupd (Linux)  unified abstraction, works for many components
  vendor RPM/DEB: lifecycle controller agents
```

```bash
# Redfish firmware update
curl -sku admin:$PW -X POST -H 'Content-Type: application/json' \
  -d '{"ImageURI":"http://repo/firmwares/bios-2.18.1.exe","TransferProtocol":"HTTP"}' \
  https://idrac.host/redfish/v1/UpdateService/Actions/UpdateService.SimpleUpdate
# Poll task status
curl -sku admin:$PW https://idrac.host/redfish/v1/TaskService/Tasks/{taskId}
```

```bash
# fwupd flow
fwupdmgr refresh
fwupdmgr get-devices
fwupdmgr get-updates
fwupdmgr update
```

## Pre/Post Update Validation

Pre:
```
- Backup current settings (RAID config, BIOS profile)
- Snapshot CMDB record
- Drain workloads / fence node
- Verify BMC accessible
```

Post:
```
- BMC reachable
- POST completes (no boot errors in SEL)
- All sensors green
- All drives healthy (SMART, RAID rebuild=no)
- All NICs link up
- OS boots, joins cluster
- Soak 1h before next node
```

## Rollback

Some firmware supports downgrade, some doesn't. Document per component:
```
BIOS:     usually yes (vendor downgrade lock varies by version)
BMC:      yes (always keep N-1 image cached)
NIC:      usually yes
SSD:      rarely; some lock to forward-only
GPU VBIOS: limited
```

Mitigation if no rollback path: extra-long bake on canary.

## Tracking Drift

```
Baseline (per role): bios=2.18.1, bmc=6.10.30.00, nic=22.5.4
Diff every node weekly:
  drift_count = count(nodes where any version != baseline)
Alert if drift > 10% of role population (uncontrolled change).
```

## Common Failures

- Firmware update without drain → workload data loss
- Multiple updates in same rack at once → no quorum
- Forgetting to back up RAID config → array lost after PERC update
- BMC update while OS-installed update is running → bricked NIC
- Vendor pulls firmware → image URL 404s mid-rollout
- Mixed firmware in cluster → subtle bugs (Ceph, K8s nodes)

## Audit Trail

```
Every firmware change logged to immutable store:
  who, when, target node, component, from-version → to-version, ticket id
Retain ≥ 1 year for compliance + RCA.
```
