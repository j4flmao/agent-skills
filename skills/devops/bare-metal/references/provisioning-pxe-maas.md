# PXE / iPXE / MAAS / Tinkerbell — Provisioning

## Boot Chain Anatomy

```
Power on → NIC PXE ROM
  → DHCP discover (with PXE options 60/66/67)
  → TFTP download bootloader (undionly.kpxe / ipxe.efi)
  → iPXE config (HTTP)
  → kernel + initrd
  → installer (autoinstall / kickstart / preseed)
  → reboot to OS
  → cloud-init → join cluster
```

## DHCP / DNS / TFTP Stack

```dnsmasq
# /etc/dnsmasq.conf — DHCP+TFTP+DNS in one
interface=eno1
dhcp-range=10.10.100.10,10.10.100.250,12h
dhcp-option=option:router,10.10.0.1
dhcp-option=option:dns-server,10.10.0.2
enable-tftp
tftp-root=/srv/tftp
# UEFI x86_64
dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-boot=tag:efi-x86_64,ipxe.efi
# legacy BIOS
dhcp-boot=tag:!efi-x86_64,undionly.kpxe
# iPXE chainload
dhcp-userclass=set:ipxe,iPXE
dhcp-boot=tag:ipxe,http://10.10.0.5/boot.ipxe
```

## iPXE Per-MAC Config

```ipxe
#!ipxe
chain http://10.10.0.5/boot/${net0/mac}.ipxe ||
chain http://10.10.0.5/boot/default.ipxe
```

```ipxe
# /var/www/boot/aa:bb:cc:dd:ee:ff.ipxe — node-specific
#!ipxe
set hostname db-01
set role db
kernel http://10.10.0.5/ubuntu-22.04/vmlinuz ip=dhcp ds=nocloud-net;s=http://10.10.0.5/seed/${hostname}/
initrd http://10.10.0.5/ubuntu-22.04/initrd
boot
```

## Ubuntu Autoinstall (cloud-init)

```yaml
# /var/www/seed/db-01/user-data
#cloud-config
autoinstall:
  version: 1
  identity:
    hostname: db-01
    username: provisioner
    password: $6$rounds=4096$...
  ssh:
    install-server: true
    authorized-keys:
      - ssh-ed25519 AAAA...
  storage:
    layout: {name: lvm}
  packages: [chrony, prometheus-node-exporter, qemu-guest-agent]
  late-commands:
    - curtin in-target -- systemctl enable node-exporter
    - curtin in-target -- /usr/local/bin/join-cluster.sh
```

## MAAS (Ubuntu / Canonical)

```bash
sudo snap install maas
sudo maas init region+rack --database-uri postgres://maas:pw@db/maas
# Web UI at http://maas:5240/MAAS
# Add IPMI per machine; MAAS commissions, tests, deploys
maas $PROFILE machines create \
  architecture=amd64 \
  power_type=ipmi \
  power_parameters_power_address=10.10.1.10 \
  power_parameters_power_user=admin \
  power_parameters_power_pass=$(vault kv get -field=pw secret/bmc/node01) \
  mac_addresses=aa:bb:cc:dd:ee:ff
maas $PROFILE machine commission node01    # boot ephemeral, inventory
maas $PROFILE machine deploy node01 distro_series=jammy
```

MAAS phases:
- **Commission**: boot ephemeral Ubuntu, run hwinfo + tests, push to DB
- **Test**: storage + network + CPU/RAM tests, results in UI
- **Deploy**: boot installer with target distro + cloud-init payload
- **Release**: wipe disks + power off; node returns to ready pool

## Tinkerbell (CNCF)

```yaml
# Hardware definition
apiVersion: tinkerbell.org/v1alpha1
kind: Hardware
metadata: {name: node01}
spec:
  metadata:
    facility: {facility_code: dc1, plan_slug: c3.medium}
  interfaces:
  - dhcp:
      mac: aa:bb:cc:dd:ee:ff
      ip: {address: 10.10.1.10, netmask: 255.255.255.0, gateway: 10.10.1.1}
    netboot: {allowPXE: true, allowWorkflow: true}
```

```yaml
# Workflow: provision Ubuntu
apiVersion: tinkerbell.org/v1alpha1
kind: Template
metadata: {name: ubuntu-base}
spec:
  data: |
    version: "0.1"
    name: ubuntu-base
    tasks:
    - name: os-install
      worker: {{.device_1}}
      actions:
      - name: stream-image
        image: quay.io/tinkerbell-actions/image2disk:v1.0.0
        environment:
          IMG_URL: http://images/ubuntu-22.04.raw.gz
          DEST_DISK: /dev/nvme0n1
          COMPRESSED: true
      - name: write-cloud-init
        image: quay.io/tinkerbell-actions/writefile:v1.0.0
        environment:
          DEST_PATH: /etc/cloud/cloud.cfg.d/99_custom.cfg
          CONTENTS: |
            datasource_list: [NoCloud]
            ...
      - name: reboot
        image: quay.io/tinkerbell-actions/reboot:v1.0.0
```

## Image2Disk vs Installer

```
Image2Disk    write raw image (10–60s), boot, cloud-init. Fastest. Best at scale.
Installer     boot installer, install pkgs from network (10–30min). Flexible but slow.
Container OS  Talos / FlatCar — declarative API-driven, no SSH, very fast.
```

## Cloud-Init Datasources

```
NoCloud     local file (seed iso) or HTTP — most common for bare metal
EC2 / GCE   metadata service emulation
DigitalOcean similar
ConfigDrive  attached drive for VM-like systems
None        skip
```

## Common Issues

- UEFI Secure Boot blocks PXE → sign iPXE binary or disable Secure Boot
- DHCP race when multiple servers reply → use option 60 / vendor class match
- TFTP transfer slow → switch to HTTP for kernel/initrd via iPXE
- Wrong NIC for PXE → BIOS network boot priority needs setting
- DHCP across L3 → enable IP-helper / DHCP relay on switch
- Cloud-init runs only once → use clean image, or `cloud-init clean`
