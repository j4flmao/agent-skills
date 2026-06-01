---
name: bare-metal
description: >
  Use this skill when the user says 'bare metal', 'physical server',
  'provisioning', 'PXE boot', 'IPMI', 'BMC', 'iDRAC', 'iLO', 'RMM',
  'server lifecycle', 'burn-in testing', 'firmware update', 'RAID',
  'BIOS configuration', 'server automation', 'MAAS', 'Metal3',
  'Rack deployment', 'data center hardware', 'server imaging'.
  Covers: server provisioning (PXE, iPXE, MAAS), firmware lifecycle,
  IPMI/BMC management, RAID configuration, burn-in testing,
  server automation, hardware asset management, BIOS tuning.
  Do NOT use for: cloud infrastructure (use cloud-specific skills),
  Kubernetes on bare metal (use kubernetes-patterns).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, bare-metal, provisioning, hardware, phase-5]
---

# Bare Metal Infrastructure

## Purpose
Automate bare metal server lifecycle from provisioning and configuration to monitoring and decommissioning, using PXE boot, IPMI/BMC, MAAS, and infrastructure-as-code approaches.

## Agent Protocol

### Trigger
Exact user phrases: "bare metal", "physical server", "PXE boot", "IPMI", "BMC", "iDRAC", "iLO", "server provisioning", "burn-in testing", "firmware update", "RAID", "MAAS".

### Input Context
Before activating, verify:
- Server vendor (Dell, HP, Supermicro, Lenovo, Cisco UCS) — affects BMC access and tools.
- Provisioning tool (MAAS, Metal3, Foreman, Cobbler, custom PXE).
- Network boot setup (PXE, iPXE, HTTP boot, UEFI HTTP(S) Boot).
- BMC networking (dedicated BMC port vs shared; VLAN; IP range).
- OS/target image (Ubuntu, RHEL, CentOS, VMware ESXi, custom).
- RAID controller model (PERC, Smart Array, MegaRAID, NVMe-native).

### Output Artifact
Writes to PXE/iPXE config files, MAAS machine definitions, automation scripts (Ansible, Python, Bash), BMC configuration scripts, firmware management playbooks.

### Response Format
Configuration files, scripts, and playbooks with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Server provisioning process defined (PXE/iPXE/MAAS).
- [ ] BMC/IPMI configuration automated.
- [ ] Burn-in testing procedure documented.
- [ ] Firmware lifecycle management implemented.
- [ ] RAID configuration defined per workload type.

### Max Response Length
Direct file write. No response text.

## Architecture Decision Trees

### Provisioning Method: PXE vs iPXE vs MAAS vs Metal3 vs Foreman
| Method | Speed | Ease | Feature Set | Best For |
|---|---|---|---|---|
| Legacy PXE | Slow | Low | Minimal | Simple environments, <10 servers |
| iPXE (scriptable) | Fast | Medium | Good (HTTP boot, scripting) | Most environments |
| MAAS (Metal as a Service) | Fast | High | Excellent (DHCP, DNS, imaging, IPMI) | Ubuntu-focused shops |
| Metal3 (Kubernetes-native) | Medium | Medium | Good (K8s CRDs for bare metal) | OpenShift/K8s environments |
| Foreman + Katello | Medium | Medium | Excellent (full lifecycle mgmt) | RHEL-focused shops |
| RackN (Digital Rebar) | Fast | Medium | Excellent (multi-vendor) | Hybrid/multi-DC |

### BMC Access Methods
| Method | Security | Reliability | When to Use |
|---|---|---|---|
| Dedicated BMC port (DHCP) | Medium | High | Standard deployment |
| Dedicated BMC port (static IP) | High | High | Production, isolated mgmt network |
| Shared/LOM port | Low | Medium | Low-cost, limited cabling |
| VLAN on data port | Medium | Medium | Converged networking |
| OOB proxy (Raritan, OpenGear) | High | High | Large-scale, centralized access |

### RAID Configuration by Workload
| Workload | RAID Level | Min Disks | Read Speed | Write Speed | Fault Tolerance |
|---|---|---|---|---|---|
| OS boot | RAID 1 (mirror) | 2 | Good (read from both) | Good | 1 disk failure |
| Database (OLTP) | RAID 10 (stripe+mirror) | 4 | Excellent | Good | 1 per mirror pair |
| File storage / NAS | RAID 6 (dual parity) | 4 | Good | Good (parity overhead) | 2 disk failures |
| Video / streaming | RAID 0 (stripe) | 2 | Excellent | Excellent | 0 (no redundancy) |
| Archive | RAID 5 (single parity) | 3 | Good | Moderate | 1 disk failure |
| NVMe SSD high-perf | No RAID (JBOD + filesystem) | 1 | Native NVMe speed | Native NVMe speed | Application-level |

### Firmware Update Strategy
| Approach | Risk | Automation | Coverage |
|---|---|---|---|
| Manual (vendor bootable ISO) | Low (controlled) | None | Complete |
| Vendor tools (Dell EMC OM, HP SPP) | Medium | Good | Vendor-specific |
| Redfish API (vendor-agnostic) | Low | Excellent | Hardware-agnostic |
| LVFS (fwupd/Linux Vendor Firmware Service) | Low | Excellent | Linux-supported HW |
| BMC-based (iDRAC/iLO web) | Medium | Medium | Single-server |

## Quick Start
Set up PXE/iPXE environment (DHCP + TFTP + HTTP) → Configure BMC networking (static IP on mgmt VLAN) → Define server profiles (BIOS, RAID, firmware) → Provision via MAAS/Foreman → Run burn-in tests → Deploy OS → Register in monitoring.

## Core Workflow

### Step 1: Network Boot Configuration (iPXE)
```bash
#!/bin/bash
# setup/setup-pxe.sh
# Script to set up PXE/iPXE environment on Ubuntu/Debian

set -euo pipefail

INSTALL_DIR="/opt/pxe"
TFTP_DIR="/var/lib/tftpboot"
HTTP_DIR="/var/www/html/pxe"

echo "=== Setting up PXE/iPXE Environment ==="

# Install dependencies
apt-get update
apt-get install -y isc-dhcp-server tftpd-hpa nginx ipxe

# Create directory structure
mkdir -p ${TFTP_DIR}/{ipxe,images,preseed}
mkdir -p ${HTTP_DIR}/{iso,images,kickstart}

# Copy iPXE files
cp /usr/lib/ipxe/undionly.kpxe ${TFTP_DIR}/ipxe/
cp /usr/lib/ipxe/ipxe.efi ${TFTP_DIR}/ipxe/

# iPXE boot script
cat > ${TFTP_DIR}/ipxe/boot.ipxe << 'IPXE_SCRIPT'
#!ipxe

set base-url http://${next-server}/pxe

console --x 1024 --y 768

:menu
menu PXE Boot Menu
item --gap -- ------------------------- Operating Systems -------------------------
item ubuntu-22.04    Ubuntu 22.04 LTS Server
item ubuntu-24.04    Ubuntu 24.04 LTS Server
item rhel-9         Red Hat Enterprise Linux 9
item esxi-8         VMware ESXi 8.0
item --gap -- ------------------------- Utilities -------------------------
item memtest        MemTest86+
ipxe-test           iPXE Shell
item reboot         Reboot Server
item poweroff       Power Off Server
choose --default ipxe-test --timeout 30000 target && goto ${target}

:ubuntu-22.04
initrd ${base-url}/images/ubuntu-22.04/initrd
kernel ${base-url}/images/ubuntu-22.04/vmlinuz \
  url=${base-url}/preseed/ubuntu-22.04.seed \
  auto=true priority=critical \
  net.ifnames=1 biosdevname=0 \
  keyboard-configuration/layoutcode=us \
  console-setup/ask_detect=false \
  --- quiet console=tty0 console=ttyS1,115200n8
boot

:ubuntu-24.04
initrd ${base-url}/images/ubuntu-24.04/initrd
kernel ${base-url}/images/ubuntu-24.04/vmlinuz \
  url=${base-url}/preseed/ubuntu-24.04.seed \
  auto=true priority=critical \
  net.ifnames=1 biosdevname=0 \
  --- quiet
boot

:rhel-9
kernel ${base-url}/images/rhel-9/vmlinuz \
  inst.repo=${base-url}/iso/rhel-9 \
  inst.ks=${base-url}/kickstart/rhel-9.ks \
  console=tty0 console=ttyS1,115200n8
initrd ${base-url}/images/rhel-9/initrd.img
boot

:esxi-8
kernel ${base-url}/images/esxi-8/mboot.efi
initrd ${base-url}/images/esxi-8/boot.cfg
imgstat
boot

:memtest
kernel ${base-url}/images/memtest/memtest
boot

:ipxe-test
shell

:reboot
reboot

:poweroff
poweroff
IPXE_SCRIPT

# DHCP server configuration
cat > /etc/dhcp/dhcpd.conf << 'DHCP_CONF'
option arch code 93 = unsigned integer 16;

subnet 10.0.100.0 netmask 255.255.255.0 {
    option routers 10.0.100.1;
    option subnet-mask 255.255.255.0;
    option domain-name-servers 10.0.100.10, 8.8.8.8;
    option domain-name "dc.internal";
    range 10.0.100.100 10.0.100.200;
    default-lease-time 600;
    max-lease-time 7200;

    # PXE boot configuration
    next-server 10.0.100.10;
    filename "ipxe/undionly.kpxe";

    # UEFI boot
    class "UEFI" {
        match if substring(option arch, 0, 2) = 00:07 or
                    substring(option arch, 0, 2) = 00:09;
        filename "ipxe/ipxe.efi";
    }

    # Static reservations for BMC management
    host bmc-rack01-node01 {
        hardware ethernet 00:11:22:33:44:01;
        fixed-address 10.0.200.1;
    }
}

# BMC management network (dedicated)
subnet 10.0.200.0 netmask 255.255.255.0 {
    option routers 10.0.200.1;
    range 10.0.200.100 10.0.200.200;
}

# Provisioning network (PXE)
subnet 10.0.101.0 netmask 255.255.255.0 {
    option routers 10.0.101.1;
    range 10.0.101.100 10.0.101.200;
    next-server 10.0.101.10;
    filename "ipxe/undionly.kpxe";
}
DHCP_CONF

systemctl restart isc-dhcp-server tftpd-hpa nginx
echo "=== PXE Setup Complete ==="
```

### Step 2: BMC/IPMI Configuration Automation
```python
#!/usr/bin/env python3
# bmc/bmc_config.py
"""Automate BMC (iDRAC/iLO/iBMC) configuration across server fleet."""

import os
import sys
import json
import yaml
import ipmi
import time
import logging
import argparse
import ipaddress
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

class BMCConfigurator:
    """Configure BMC settings across multiple servers."""

    def __init__(self, config_file):
        with open(config_file) as f:
            self.config = yaml.safe_load(f)
        self.max_workers = self.config.get('max_workers', 10)

    def configure_bmc(self, server):
        """Configure a single BMC."""
        hostname = server['hostname']
        bmc_ip = server.get('bmc_ip')
        vendor = server.get('vendor', 'dell').lower()

        logger.info(f"Configuring BMC on {hostname} ({bmc_ip})")

        # Step 1: Verify BMC reachability
        result = subprocess.run(
            ['ping', '-c', '2', '-W', '5', bmc_ip],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            logger.error(f"BMC {bmc_ip} not reachable")
            return False

        # Step 2: Set BMC network configuration
        self._set_bmc_network(server)

        # Step 3: Configure BMC users and authentication
        self._configure_bmc_users(server)

        # Step 4: Set BMC alerting (SNMP/Email)
        self._configure_bmc_alerts(server)

        # Step 5: Enable serial console redirection
        self._enable_serial_console(server)

        # Step 6: Set power policies
        self._configure_power_policy(server)

        # Step 7: Update firmware baseline
        self._check_firmware_baseline(server)

        logger.info(f"BMC configuration complete for {hostname}")
        return True

    def _set_bmc_network(self, server):
        """Configure BMC network settings via ipmitool."""
        bmc_ip = server['bmc_ip']
        bmc_mask = server.get('bmc_netmask', '255.255.255.0')
        bmc_gw = server.get('bmc_gateway', '10.0.200.1')
        vlan_id = server.get('bmc_vlan')

        cmd = [
            'ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'lan', 'set', '1', 'ipsrc', 'static'
        ]
        subprocess.run(cmd, capture_output=True)
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'lan', 'set', '1', 'ipaddr', bmc_ip], capture_output=True)
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'lan', 'set', '1', 'netmask', bmc_mask], capture_output=True)
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'lan', 'set', '1', 'defgw', 'ipaddr', bmc_gw], capture_output=True)

        if vlan_id:
            subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
                '-P', self.config['bmc_admin_password'],
                'lan', 'set', '1', 'vlan', 'id', str(vlan_id)], capture_output=True)
            logger.info(f"Set VLAN {vlan_id} for {bmc_ip}")

    def _configure_bmc_users(self, server):
        """Create BMC users with appropriate privileges."""
        bmc_ip = server['bmc_ip']
        for user in self.config['bmc_users']:
            uid = user['id']
            username = user['username']
            password = user['password']
            privilege = user.get('privilege', '4')  # 4=admin

            # Create user
            subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
                '-P', self.config['bmc_admin_password'],
                'user', 'set', 'name', str(uid), username], capture_output=True)

            # Set password
            subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
                '-P', self.config['bmc_admin_password'],
                'user', 'set', 'password', str(uid), password], capture_output=True)

            # Set privilege level
            subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
                '-P', self.config['bmc_admin_password'],
                'user', 'priv', str(uid), privilege], capture_output=True)

            # Enable user
            subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
                '-P', self.config['bmc_admin_password'],
                'user', 'enable', str(uid)], capture_output=True)

            logger.info(f"Created BMC user {username} (ID {uid}) on {bmc_ip}")

    def _configure_bmc_alerts(self, server):
        """Configure SNMP trap destinations and email alerts."""
        bmc_ip = server['bmc_ip']
        # Configure SNMP community
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'raw', '0x0a', '0x47', '0x03'], capture_output=True)  # Enable SNMP
        logger.info(f"Configured alerts for {bmc_ip}")

    def _enable_serial_console(self, server):
        """Enable serial over LAN (SOL) for out-of-band console."""
        bmc_ip = server['bmc_ip']
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'sol', 'set', 'enabled', 'true'], capture_output=True)
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'sol', 'set', 'escape-char', '0x1e'], capture_output=True)
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'sol', 'set', 'baud', '115200'], capture_output=True)
        logger.info(f"Serial console enabled for {bmc_ip}")

    def _configure_power_policy(self, server):
        """Set power restore policy and power cap."""
        bmc_ip = server['bmc_ip']
        power_policy = server.get('power_policy', 'always_on')
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'chassis', 'policy', 'list'], capture_output=True)
        subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'chassis', 'power', 'set', power_policy], capture_output=True)
        logger.info(f"Power policy set to {power_policy} for {bmc_ip}")

    def _check_firmware_baseline(self, server):
        """Check current firmware versions against baseline."""
        bmc_ip = server['bmc_ip']
        result = subprocess.run(['ipmitool', '-H', bmc_ip, '-U', self.config['bmc_admin_user'],
            '-P', self.config['bmc_admin_password'],
            'mc', 'info'], capture_output=True, text=True)
        logger.info(f"Firmware info for {bmc_ip}: {result.stdout[:200]}")

    def configure_all(self, servers):
        """Configure all servers in parallel."""
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.configure_bmc, s): s for s in servers}
            results = {}
            for future in as_completed(futures):
                server = futures[future]
                try:
                    success = future.result()
                    results[server['hostname']] = success
                except Exception as e:
                    logger.error(f"Failed {server['hostname']}: {e}")
                    results[server['hostname']] = False
        return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BMC Configuration Automation")
    parser.add_argument('--config', required=True, help="BMC config YAML")
    args = parser.parse_args()

    configurator = BMCConfigurator(args.config)
    results = configurator.configure_all()
    failures = [h for h, s in results.items() if not s]
    if failures:
        logger.error(f"Failed servers: {failures}")
        sys.exit(1)
    logger.info("All BMC configurations completed successfully")
```

### Step 3: Burn-In Testing Playbook
```yaml
# ansible/burn-in-test.yml
---
- name: Server Burn-In Testing
  hosts: new_servers
  gather_facts: false
  vars:
    test_duration_minutes: 240  # 4 hour burn-in
    stress_tools:
      - stress-ng
      - fio
      - memtester
      - sysbench
      - htop
    acceptable_temp_celsius: 85

  tasks:
    - name: Record test start
      ansible.builtin.set_fact:
        test_start_time: "{{ ansible_date_time.iso8601 }}"

    - name: Install stress testing tools
      ansible.builtin.package:
        name: "{{ stress_tools }}"
        state: present

    - name: Record baseline hardware info
      ansible.builtin.shell:
        cmd: |
          echo "=== CPU ===" && cat /proc/cpuinfo | grep "model name" | head -1
          echo "=== Memory ===" && free -h
          echo "=== Disks ===" && lsblk -d -o NAME,SIZE,ROTA,MODEL
          echo "=== Network ===" && ip addr show | grep "inet "
          echo "=== Temperature ===" && sensors 2>/dev/null || echo "No sensors"
      register: hardware_info
    - ansible.builtin.debug:
        var: hardware_info.stdout

    - name: CPU stress test (all cores, 30 min)
      ansible.builtin.command:
        cmd: stress-ng --cpu 0 --cpu-method matrixprod --timeout 1800s --metrics-brief
      async: 2000
      poll: 30
      register: cpu_stress

    - name: Memory stress test (80% RAM, 30 min)
      ansible.builtin.command:
        cmd: stress-ng --vm 4 --vm-bytes 80% --timeout 1800s --metrics-brief
      async: 2000
      poll: 30
      register: mem_stress

    - name: Disk stress test (fio random read/write)
      ansible.builtin.command:
        cmd: >
          fio --name=burnin --ioengine=libaio --iodepth=32
          --rw=randrw --rwmixread=70 --bs=4k --direct=1
          --size=10G --numjobs=4 --runtime=600 --group_reporting
      async: 700
      poll: 30
      register: disk_stress
      when: ansible_devices | length > 0

    - name: Check temperatures during test
      ansible.builtin.command:
        cmd: sensors -u 2>/dev/null | grep -E "_input|_crit" || echo "temperature_ok"
      register: temps
      changed_when: false

    - name: Fail if CPU temperature exceeds threshold
      ansible.builtin.fail:
        msg: "CPU temperature exceeds {{ acceptable_temp_celsius }}°C threshold!"
      when: temps.stdout | int > acceptable_temp_celsius

    - name: Collect SMART health data
      ansible.builtin.shell:
        cmd: for disk in $(lsblk -dno NAME | grep -E '^(sd|nvme|vd)'); do
               smartctl -H /dev/$disk 2>/dev/null | grep "SMART overall-health"
             done
      register: smart_health

    - name: Network stress test
      ansible.builtin.command:
        cmd: iperf3 -c {{ iperf_server }} -t 30 -P 4
      when: iperf_server is defined
      register: network_test

    - name: Check for hardware errors in dmesg
      ansible.builtin.shell:
        cmd: |
          dmesg --level=err,warn | grep -iE "error|fail|critical|temperature|hardware" \
            | tail -20
      register: dmesg_errors

    - name: Fail on critical hardware errors
      ansible.builtin.fail:
        msg: "Critical hardware errors detected: {{ dmesg_errors.stdout }}"
      when: dmesg_errors.stdout | length > 0

    - name: Generate burn-in report
      ansible.builtin.template:
        src: burnin_report.j2
        dest: /tmp/burnin-report-{{ inventory_hostname }}.txt
      vars:
        test_end_time: "{{ ansible_date_time.iso8601 }}"
        all_passed: "{{ cpu_stress is success and mem_stress is success }}"

    - name: Final result
      ansible.builtin.debug:
        msg: >
          Server {{ inventory_hostname }} burn-in test
          {% if all_passed %}PASSED{% else %}FAILED{% endif %}
```

### Step 4: RAID Configuration Script
```bash
#!/bin/bash
# raid/configure-raid.sh
# Configure RAID on Dell PERC / HP Smart Array controllers

set -euo pipefail

CONTROLLER_TYPE=""
LOG_FILE="/var/log/raid-config-$(hostname).log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

detect_controller() {
    if command -v perccli &>/dev/null; then
        CONTROLLER_TYPE="dell_perc"
        log "Detected Dell PERC controller (perccli)"
    elif command -v storcli64 &>/dev/null; then
        CONTROLLER_TYPE="dell_perc_storcli"
        log "Detected Dell PERC controller (storcli64)"
    elif command -v hpssacli &>/dev/null; then
        CONTROLLER_TYPE="hp_smartarray"
        log "Detected HP Smart Array controller (hpssacli)"
    elif command -v ssacli &>/dev/null; then
        CONTROLLER_TYPE="hp_smartarray_ssacli"
        log "Detected HP Smart Array controller (ssacli)"
    else
        log "ERROR: No supported RAID controller detected"
        exit 1
    fi
}

configure_raid_dell() {
    local raid_level="$1"
    local disks="$2"
    local vd_name="$3"

    case "$raid_level" in
        raid1)
            perccli /c0 add vd type=raid1 drives="$disks" WT RA Direct NoCachedBadBBU
            ;;
        raid5)
            perccli /c0 add vd type=raid5 drives="$disks" WT RA Direct NoCachedBadBBU
            ;;
        raid6)
            perccli /c0 add vd type=raid6 drives="$disks" WT RA Direct NoCachedBadBBU
            ;;
        raid10)
            perccli /c0 add vd type=raid10 drives="$disks" WT RA Direct NoCachedBadBBU
            ;;
        *)
            log "ERROR: Unknown RAID level $raid_level"
            exit 1
            ;;
    esac

    local vd_id=$(perccli /c0/vall show | grep "Virtual Drive" | tail -1 | awk '{print $3}')
    perccli /c0/v"$vd_id" set rlqc=off  # Disable read lookup cache
    perccli /c0/v"$vd_id" set name="$vd_name"
    log "Created RAID $raid_level ($vd_name) with disks $disks"
}

configure_raid_hp() {
    local raid_level="$1"
    local disks="$2"
    local vd_name="$3"

    local slot=$(hpssacli ctrl all show status | grep -E "^.*Slot" | head -1 | awk '{print $4}' | tr -d ')')

    # Convert RAID level name to HP format
    local hp_level=""
    case "$raid_level" in
        raid1) hp_level="1" ;;
        raid5) hp_level="5" ;;
        raid6) hp_level="6" ;;
        raid10) hp_level="1+0" ;;
    esac

    # Create logical drive
    hpssacli ctrl slot="$slot" create type=ld drives="$disks" raid="$hp_level"
    local ld_id=$(hpssacli ctrl slot="$slot" ld all show | grep "logicaldrive" | tail -1 | awk '{print $2}')
    hpssacli ctrl slot="$slot" ld "$ld_id" modify name="$vd_name"
    log "Created RAID $raid_level ($vd_name) on slot $slot"
}

configure_raid() {
    local profile="$1"

    case "$profile" in
        os)
            log "Configuring RAID 1 for OS (2x SSD)"
            [ "$CONTROLLER_TYPE" = "dell_perc" ] && configure_raid_dell raid1 "32:0-32:1" "OS_BOOT"
            [ "$CONTROLLER_TYPE" = "hp_smartarray" ] && configure_raid_hp raid1 "1I:1:1,1I:1:2" "OS_BOOT"
            ;;
        database)
            log "Configuring RAID 10 for database (4x NVMe)"
            [ "$CONTROLLER_TYPE" = "dell_perc" ] && configure_raid_dell raid10 "32:2-32:5" "DB_DATA"
            [ "$CONTROLLER_TYPE" = "hp_smartarray" ] && configure_raid_hp raid10 "1I:1:3-1I:1:6" "DB_DATA"
            ;;
        storage)
            log "Configuring RAID 6 for storage (8x HDD)"
            [ "$CONTROLLER_TYPE" = "dell_perc" ] && configure_raid_dell raid6 "32:6-32:13" "BULK_STORAGE"
            [ "$CONTROLLER_TYPE" = "hp_smartarray" ] && configure_raid_hp raid6 "1I:1:7-2I:1:2" "BULK_STORAGE"
            ;;
        compute)
            log "Configuring RAID 0 for scratch (2x NVMe)"
            [ "$CONTROLLER_TYPE" = "dell_perc" ] && configure_raid_dell raid0 "32:2-32:3" "SCRATCH"
            [ "$CONTROLLER_TYPE" = "hp_smartarray" ] && configure_raid_hp raid0 "1I:2:1,1I:2:2" "SCRATCH"
            ;;
        *)
            log "ERROR: Unknown profile $profile"
            exit 1
            ;;
    esac
}

main() {
    detect_controller

    case "${1:-help}" in
        os|database|storage|compute)
            configure_raid "$1"
            log "RAID configuration completed for profile: $1"
            ;;
        status)
            log "Current RAID status:"
            case "$CONTROLLER_TYPE" in
                dell_perc*) perccli /c0/vall show ;;
                hp*) hpssacli ctrl all show config ;;
            esac
            ;;
        *)
            echo "Usage: $0 {os|database|storage|compute|status}"
            echo "  os        - RAID 1 for OS (2x SSD)"
            echo "  database  - RAID 10 for database (4x NVMe)"
            echo "  storage   - RAID 6 for bulk storage (8x HDD)"
            echo "  compute   - RAID 0 for scratch (2x NVMe)"
            echo "  status    - Show current RAID configuration"
            exit 1
            ;;
    esac
}

main "$@"
```

### Step 5: MAAS Integration for Automated Provisioning
```python
#!/usr/bin/env python3
# provisioning/maas_integration.py
"""MAAS API integration for automated bare-metal provisioning."""

import os
import sys
import yaml
import json
import time
import logging
import requests
import argparse
from urllib.parse import urljoin

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

class MAASClient:
    """Client for MAAS (Metal as a Service) REST API."""

    def __init__(self, maas_url, api_key):
        self.base_url = maas_url.rstrip('/') + '/api/2.0/'
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        })

    def list_machines(self, status=None):
        """List machines, optionally filtered by status."""
        params = {}
        if status:
            params['status'] = status
        resp = self.session.get(urljoin(self.base_url, 'machines/'), params=params)
        resp.raise_for_status()
        return resp.json()

    def deploy_machine(self, system_id, distro='ubuntu/jammy', hwe_kernel='ga'):
        """Deploy OS to a machine."""
        data = {
            'distro_series': distro,
            'hwe_kernel': hwe_kernel,
        }
        resp = self.session.post(
            urljoin(self.base_url, f'machines/{system_id}/deploy/'),
            data=data
        )
        resp.raise_for_status()
        return resp.json()

    def commission_machine(self, system_id, testing=False):
        """Commission a machine for provisioning."""
        params = {'enable_ssh': True, 'skip_bmc_config': False}
        if testing:
            params['testing_scripts'] = 'smartctl-validate,memtest86+'
        resp = self.session.post(
            urljoin(self.base_url, f'machines/{system_id}/commission/'),
            params=params
        )
        resp.raise_for_status()
        return resp.json()

    def tag_machine(self, system_id, tags):
        """Apply tags to a machine."""
        resp = self.session.post(
            urljoin(self.base_url, f'machines/{system_id}/'),
            data={'tags': ','.join(tags)}
        )
        resp.raise_for_status()
        return resp.json()

    def wait_for_status(self, system_id, target_status, timeout=600):
        """Wait for machine to reach target status."""
        start = time.time()
        while time.time() - start < timeout:
            machine = self.get_machine(system_id)
            if machine.get('status_name') == target_status:
                logger.info(f"Machine {system_id} reached {target_status}")
                return True
            time.sleep(10)
        raise TimeoutError(f"Machine {system_id} did not reach {target_status}")

    def get_machine(self, system_id):
        """Get machine details."""
        resp = self.session.get(urljoin(self.base_url, f'machines/{system_id}/'))
        resp.raise_for_status()
        return resp.json()

    def provision_workload(self, config_file):
        """Provision machines based on workload config."""
        with open(config_file) as f:
            config = yaml.safe_load(f)

        machines = self.list_machines(status='Ready')
        logger.info(f"Found {len(machines)} ready machines")

        for workload in config['workloads']:
            count = workload.get('count', 1)
            distro = workload.get('distro', 'ubuntu/jammy')
            tags = workload.get('tags', [])

            for i in range(min(count, len(machines))):
                machine = machines[i]
                sys_id = machine['system_id']

                # Tag machine
                if tags:
                    self.tag_machine(sys_id, tags)

                # Deploy
                logger.info(f"Deploying {sys_id} with {distro}")
                self.deploy_machine(sys_id, distro=distro)
                machines.remove(machine)

        logger.info("Provisioning complete")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MAAS Provisioning Client")
    parser.add_argument('--url', required=True, help="MAAS API URL")
    parser.add_argument('--key', required=True, help="MAAS API Key")
    parser.add_argument('--action', choices=['list', 'provision', 'commission', 'deploy'])
    parser.add_argument('--config', help="Workload config YAML")
    parser.add_argument('--system-id', help="Specific system ID")
    args = parser.parse_args()

    client = MAASClient(args.url, args.key)

    if args.action == 'list':
        machines = client.list_machines()
        for m in machines:
            print(f"{m['system_id']:20} {m['hostname']:30} {m.get('status_name', 'Unknown')}")
    elif args.action == 'provision':
        client.provision_workload(args.config)
    elif args.action == 'commission':
        client.commission_machine(args.system_id)
        client.wait_for_status(args.system_id, 'Ready')
```

## Anti-Patterns

### Anti-Pattern 1: Manual Server Configuration
Configuring BIOS, RAID, BMC settings manually via vendor UEFI menus. This is error-prone, non-repeatable, and doesn't scale beyond a few servers. Always automate.

### Anti-Pattern 2: Shared BMC Password
Using the same default BMC password on all servers. An attacker who compromises one BMC has access to all.

### Anti-Pattern 3: No Burn-In Testing
Deploying servers into production without burn-in testing. Early-life hardware failures (DOA, infant mortality) will be caught during burn-in rather than in production.

### Anti-Pattern 4: Mixing OS and Data Disks on Same RAID Array
Putting OS, database, and logs on one RAID volume. OS writes (logs, updates) compete with database I/O. Separate by workload characteristic.

### Anti-Pattern 5: Public BMC Exposure
Exposing BMC/iDRAC/iLO to the internet or production network. BMCs must be on a dedicated, isolated management network with strict ACLs.

### Anti-Pattern 6: Neglecting Firmware Updates
Running servers with OEM firmware for years. Critical security fixes and stability improvements are missed. Schedule firmware updates quarterly.

## Production Considerations

### Security
- BMC on dedicated management VLAN with no internet access.
- Change default BMC credentials immediately on all servers.
- Disable unused BMC protocols (IPMI v1.0, HTTP, Telnet).
- Enable BMC audit logging and forward to SIEM.
- Use SSH keys (not passwords) for server access.

### Monitoring
- Monitor BMC health (temperature, voltage, fan speed, PSU status).
- Monitor disk SMART status proactively (predictive failure analysis).
- Track firmware versions in asset management system.
- Monitor PSU redundancy and UPS status.
- Set up SNMP traps for hardware alerts → PagerDuty/Opsgenie.

### Lifecycle Management
- Automate firmware updates with vendor tools (Dell OM, HP SPP, Redfish).
- Use Redfish API for vendor-agnostic hardware management.
- Track hardware EOL/EOSL dates and plan refresh cycles.
- Maintain spare parts inventory for critical components.
- Document server profiles (BIOS settings, RAID config, firmware baseline).

## Troubleshooting Guide

| Issue | Likely Cause | Solution |
|---|---|---|
| Server won't PXE boot | DHCP not assigning IP or TFTP unreachable | Check DHCP scope; TFTP service; network path |
| BMC unreachable | Power loss to BMC or network issue | Check BMC power LED; verify management network |
| RAID degraded | Disk failure | Replace failed disk; rebuild array |
| High CPU temp | Fan failure or airflow blockage | Check fan status; verify intake/exhaust temps |
| Burn-in test fails | Hardware defect | RMA defective component; replace server |
| PXE boot to wrong image | DHCP next-server config mismatch | Verify DHCP config; check per-subnet settings |

## Rules & Constraints
- All servers must have a dedicated BMC with management network access.
- BMC credentials must be unique per server, stored in a vault.
- Burn-in testing is mandatory before production deployment (minimum 4 hours).
- Firmware updates must be tested on one server before fleet-wide rollout.
- RAID configuration must follow workload profile (OS: RAID 1, DB: RAID 10, etc.).
- Provisioning must be automated (PXE/iPXE/MAAS) — no manual USB installs.
- All servers must have remote console access (serial over LAN).
- Hardware monitoring must be configured before production traffic.
- Asset management database must be updated within 24h of new server deployment.

## Output Format
PXE/iPXE configuration, BMC automation scripts (Python/Bash), Ansible burn-in playbooks, MAAS API scripts, RAID configuration scripts.

## References
  - references/bare-metal-advanced.md
  - references/bare-metal-fundamentals.md
  - references/burn-in.md
  - references/firmware-lifecycle.md
  - references/ipmi-bmc.md
  - references/provisioning-pxe-maas.md
  - references/redfish-automation-guide.md

## Handoff
After completing this skill:
- Next skill: **datacenter** — rack layout, power, cooling for bare metal
- Pass context: server inventory, BMC IPs network, firmware baseline, provisioning method
