# Bare Metal Fundamentals

## Overview
Bare metal refers to physical servers provisioned for single-tenant use without a hypervisor. Bare metal provides maximum performance, direct hardware access, and predictable resource allocation compared to virtualized environments.

## Core Concepts

### Bare Metal vs Virtualization
Bare metal: direct access to CPU, memory, storage, and PCIe devices. No hypervisor overhead. Best for performance-critical workloads. Virtualization: hypervisor abstracts hardware, enables multi-tenancy, live migration, and resource overcommitment. Best for density and flexibility.

### Provisioning Methods
Manual: physical server setup with PXE boot, IPMI, or BMC. Takes hours. Automated: infrastructure-as-code tools (Tinkerbell, MAAS, Razor, Cobbler) provision OS, networking, and storage in minutes.

### Lifecycle Management
Discovery: identify new hardware, collect inventory. Provisioning: install OS, configure network, apply firmware. Monitoring: track health metrics (temp, disk, power). Maintenance: firmware updates, hardware replacement. Decommission: wipe data, reclaim assets.

## Key Components

### Server Hardware
CPU: Intel Xeon or AMD EPYC, core count and frequency. Memory: DDR4/DDR5 ECC RDIMM, capacity and channels. Storage: NVMe SSD, SATA SSD, HDD, RAID controller. Networking: 10/25/100 GbE NIC, RDMA (RoCE, InfiniBand). GPU: NVIDIA A100/H100 for ML workloads.

### Remote Management
BMC (Baseboard Management Controller): dedicated management processor. IPMI: standard interface for remote management (power, console, sensors). Redfish: modern REST API for hardware management. iDRAC (Dell), iLO (HP), XClarity (Lenovo): vendor-specific BMC interfaces.

### Operating System Provisioning
PXE (Preboot Execution Environment): network boot via DHCP and TFTP. iPXE: extended PXE with HTTP boot and scripting. Kickstart (RHEL), Preseed (Debian), AutoYaST (SUSE): automated OS installation configs. Cloud-init: cross-platform instance initialization.

## Basic Provisioning

### PXE Configuration
```nginx
# DHCP server pointing to PXE
option arch code 93 = unsigned integer 16;
class "pxeclients" {
  match if substring (option vendor-class-identifier, 0, 9) = "PXEClient";
  filename "pxelinux.0";
  next-server 192.168.1.10;
}
```

### Cloud-init Configuration
```yaml
#cloud-config
hostname: web-server-01
users:
  - name: deploy
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAA...
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: sudo
package_upgrade: true
packages:
  - docker.io
  - htop
runcmd:
  - systemctl enable docker
  - systemctl start docker
```

## Best Practices
- Use automated provisioning (MAAS, Tinkerbell) to reduce deployment time.
- Implement hardware monitoring via IPMI/Redfish + Prometheus.
- Use RAID 10 for OS, JBOD with software RAID for data.
- Plan for hardware failures: maintain spare inventory.
- Implement firmware update automation with vendor tools.
- Use immutable infrastructure: reimage servers rather than patch.
- Separate management network from data network.
- Document hardware specifications and cabling diagrams.

## References
- bare-metal-advanced.md -- Advanced Bare Metal topics
- provisioning-automation.md -- Provisioning Automation
- hardware-monitoring.md -- Hardware Monitoring
- network-boot.md -- Network Boot Configuration
- firmware-management.md -- Firmware Management
