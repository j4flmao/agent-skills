---
name: devops-bare-metal
description: >
  Use this skill when provisioning, operating, or scaling physical servers in a colo / on-prem datacenter:
  PXE / iPXE boot, MAAS, Tinkerbell, Cobbler, Foreman, ironic, IPMI / iDRAC / iLO out-of-band management,
  BIOS/UEFI baseline, firmware lifecycle, hardware burn-in, RAID controller config, NIC bonding, hot
  spares, RMA process, and capacity planning for physical fleet. This skill enforces: golden image
  pipeline, immutable boot media, hardware health monitoring, secure BMC, deterministic re-provision.
  Do NOT use for: cloud VM provisioning (see devops-aws / devops-gcp / devops-azure), Kubernetes node
  config (see devops-kubernetes-patterns), datacenter facility design (see devops-datacenter).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, bare-metal, physical, on-prem, infrastructure, phase-2]
---

# DevOps Bare Metal

## Purpose
Operate physical server fleets with the same reliability and reproducibility as cloud: PXE-driven
provisioning, immutable golden images, out-of-band management, firmware control, automated burn-in,
and deterministic re-provision under 1 hour per node.

## Agent Protocol

### Trigger
Exact user phrases: "bare metal", "on-prem", "physical server", "PXE", "iPXE", "MAAS", "Tinkerbell",
"Cobbler", "Foreman", "ironic", "IPMI", "iDRAC", "iLO", "BMC", "Redfish", "RAID", "burn-in", "DCIM",
"firmware update", "BIOS", "UEFI", "PXE boot", "netboot", "Kickstart", "Preseed", "Autoinstall".

### Input Context
- Server vendor + generation (Dell PowerEdge, HPE ProLiant, Supermicro, Lenovo ThinkSystem)
- Form factor (1U, 2U, blade, sled)
- BMC type (iDRAC9/10, iLO5/6, IPMI 2.0, OpenBMC)
- Network topology (NIC count, OOB mgmt network, leaf-spine layout)
- OS target (Ubuntu, Debian, RHEL, Rocky, Talos, FlatCar, ESXi)
- Storage layout (local NVMe, SAS RAID, JBOD for Ceph)
- Provisioning scale (10 / 100 / 1000+ nodes)

### Output Artifact
Bare-metal provisioning plan with golden image, PXE config, BMC baseline, RAID profile, burn-in
script, monitoring + alerting.

### Response Format
```
Provisioning system: {MAAS | Tinkerbell | Cobbler | Foreman | Ironic}
OS: {distro + version + image source}
Storage: {RAID level | JBOD, FS, encryption}
Network: {bonding mode, MTU, mgmt VLAN}
BMC: {Redfish endpoint, account, baseline}
Burn-in: {duration, tests}
Re-provision time: {target minutes}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Golden OS image built and signed
- [ ] PXE / iPXE config deployed
- [ ] BMC baseline (creds rotated, IPMI v2 disabled if Redfish available)
- [ ] RAID + filesystem profile per role
- [ ] Burn-in script for incoming hardware
- [ ] Firmware baseline + update cadence documented
- [ ] Monitoring: BMC sensors, SMART, NIC link, PSU
- [ ] Re-provision drill timed; target ≤ 60min

### Max Response Length
350 lines.

## Workflow

### Step 1: Choose Provisioning System
```
MAAS (Canonical)         Ubuntu-native, web UI, IPAM, commissioning, deploy phases
Tinkerbell (Equinix)     workflow-based, k8s-friendly, hardware-agnostic
Metal3 / Ironic          OpenStack roots, Kubernetes cluster-api integration
Foreman + Katello        RHEL ecosystem, content management, puppet/ansible
Cobbler                  classic, simple, kickstart/preseed orchestration
Razor (deprecated)       legacy
```

Pick by ecosystem: Ubuntu → MAAS, RHEL → Foreman, Kubernetes-first → Metal3/Tinkerbell.

### Step 2: PXE / iPXE Boot Chain
```
1. Node powers on → BIOS/UEFI NIC PXE
2. DHCP offers IP + next-server (TFTP) + bootfile
3. TFTP loads iPXE binary (undionly.kpxe or snponly.efi)
4. iPXE chainloads HTTP script → kernel + initrd + cmdline
5. Kernel installs from preseed/kickstart/autoinstall over HTTP
6. Post-install: cloud-init applies config + joins cluster
```

```dhcp
# isc-dhcp-server example (or use MAAS / dnsmasq)
subnet 10.10.0.0 netmask 255.255.0.0 {
  range 10.10.100.10 10.10.100.250;
  option routers 10.10.0.1;
  option domain-name-servers 10.10.0.2;
  next-server 10.10.0.5;                  # TFTP server
  if exists user-class and option user-class = "iPXE" {
    filename "http://10.10.0.5/boot.ipxe";
  } elsif option arch = 00:07 {
    filename "ipxe.efi";                  # UEFI x64
  } else {
    filename "undionly.kpxe";             # legacy BIOS
  }
}
```

```ipxe
#!ipxe
# /var/www/boot.ipxe
set base http://10.10.0.5/images/ubuntu-22.04
kernel ${base}/vmlinuz ip=dhcp url=${base}/img.iso autoinstall ds=nocloud-net;s=${base}/cloud-init/
initrd ${base}/initrd
boot
```

### Step 3: Golden Image Build
```
1. Base: distro minimal ISO
2. Apply hardening (CIS benchmark, ssh keys-only, no root login)
3. Pre-install: chrony, monitoring agent, configmgmt agent, BMC tools
4. Sign with GPG; SHA256 published
5. Versioned: ubuntu-22.04-2026-q2-v3 — never mutate, always new version
```

Use Packer for build automation; outputs OVA / raw / qcow2 / OCI.

### Step 4: BMC Baseline (Redfish / IPMI)
```
1. Set strong unique BMC password (per node, in vault)
2. Disable IPMI 1.5 / Cipher 0
3. Enable Redfish over HTTPS only (TLS 1.2+)
4. Restrict BMC mgmt to OOB VLAN (no public Internet, no prod VLAN)
5. SNMPv3 only (never v2c with default community)
6. NTP configured
7. Log forwarding to central SIEM
8. Firmware updated to vendor latest stable
```

```bash
# Redfish via curl
curl -sk -u admin:$PW -H 'Content-Type: application/json' \
  https://idrac.node01.oob/redfish/v1/Systems/System.Embedded.1 | jq
# Power on
curl -sk -u admin:$PW -X POST -H 'Content-Type: application/json' \
  -d '{"ResetType":"On"}' \
  https://idrac.node01.oob/redfish/v1/Systems/System.Embedded.1/Actions/ComputerSystem.Reset
# Mount virtual media for OS install
curl -sk -u admin:$PW -X POST -H 'Content-Type: application/json' \
  -d '{"Image":"http://10.10.0.5/installer.iso","Inserted":true,"WriteProtected":true}' \
  https://idrac.node01.oob/redfish/v1/Managers/iDRAC.Embedded.1/VirtualMedia/CD/Actions/VirtualMedia.InsertMedia
```

### Step 5: RAID / Storage Profile
```
Role                   Layout                         Notes
DB primary             RAID-10 NVMe (4-8 drives)      max IOPS + redundancy
DB replica             RAID-10 SSD                    cost-down vs primary
App / K8s worker       RAID-1 boot + RAID-0 ephemeral local-storage class
Ceph OSD               JBOD (HBA mode, no RAID)       Ceph handles redundancy
Object storage         RAID-6 (large arrays)          cost per TB
Cache / scratch        RAID-0 NVMe                    speed only, expect loss
```

### Step 6: NIC / Network Config
```
Bonding: LACP 802.3ad to leaf pair (active-active)
MTU: 9000 (jumbo) for storage VLANs; 1500 for default
VLAN trunking: mgmt / prod / storage / OOB separate
SR-IOV: enable for high-PPS workloads (VFs to VMs/containers)
```

### Step 7: Burn-In (every incoming node)
```
1. memtest86+ — 24h pass minimum
2. CPU stress (stress-ng, mprime) — 24h
3. Disk: badblocks -wsv on each drive, or fio random R/W 24h
4. NIC: iperf3 across both ports at line rate 4h
5. Sensors: read every 60s, alert on out-of-spec temp/voltage
6. Power cycle test: 10 cycles via BMC, expect clean boot each
7. Mark PASS only if zero errors in 24h soak
```

### Step 8: Firmware Lifecycle
```
- Track firmware version per node in CMDB
- Vendor security advisory subscription (Dell DSA, HPE bulletins)
- Cadence: quarterly review, critical CVE within 30 days
- Stage: dev fleet → canary 5% → 25% → full
- Rolling: 1 node at a time per failure domain (rack)
- Validate post-update: full hardware health check
```

```bash
# Dell Update Manager
racadm update -f firmware.exe -l cifs://share/ -u user -p pw
# HPE iLO RESTful API + SUM
ilorest --url=https://ilo.host -u admin -p pw firmwareupdate http://share/fw.bin
```

### Step 9: Re-Provision SLO
```
Target: ≤ 60 min from "kill node" to "rejoined cluster"
  T+0:   decommission signal
  T+1m:  drain workloads (cordon + delete pods / migrate VMs)
  T+5m:  power off via BMC
  T+10m: wipe disks (block-level zero or crypto-shred LUKS key)
  T+15m: trigger PXE reinstall
  T+45m: cloud-init joins cluster
  T+60m: production-ready (passed health check + soak)
```

### Step 10: Monitoring
```
BMC sensors (per node): temp, fan, PSU, voltage, intrusion → ipmi-exporter / redfish-exporter
SMART disk health: smartmontools → smartctl-exporter
NIC: link, errors, throughput → node-exporter
Kernel: dmesg edge cases (MCEs, ECC) → rsyslog → SIEM
Inventory: serial, asset tag, location → CMDB (NetBox)
```

## Rules
- BMC on isolated OOB network, never reachable from prod or Internet.
- BMC passwords unique per node, rotated quarterly, sealed in vault.
- Disable IPMI v1.5 and Cipher 0; Redfish-only if hardware supports.
- Golden image versioned, signed, never mutated in place.
- Re-provision drill quarterly minimum.
- Firmware update follows stage→canary→fleet with rollback path.
- Burn-in mandatory for every incoming node (vendor DOA rate non-zero).
- Replace failed hot-swap parts ≤ 24h for Tier-1 nodes.
- ECC RAM mandatory for any persistent-state workload.

## References
- `references/provisioning-pxe-maas.md` — PXE/iPXE chain, MAAS/Tinkerbell setup, cloud-init
- `references/ipmi-bmc.md` — IPMI/Redfish ops, BMC hardening, OOB network
- `references/firmware-lifecycle.md` — Tracking, cadence, rollout, rollback
- `references/burn-in.md` — Hardware acceptance testing, soak protocols

## Handoff
- `devops-datacenter` for rack / power / cooling design.
- `devops-network-infrastructure` for leaf-spine, BGP, switch config.
- `devops-storage-infrastructure` for Ceph/ZFS on bare metal.
- `devops-kubernetes-patterns` for k8s on bare metal (kubeadm, Talos, k3s, RKE2).
- `enterprise-capacity-planning` for fleet sizing and procurement.
- `security-*` for BMC hardening and supply-chain integrity.
