---
name: hetzner-cloud
description: >
  Use this skill when the user says 'hetzner', 'hetzner cloud',
  'hcloud', 'hetzner dedicated', 'hetzner robot', 'hetzner
  auction', 'hetzner server', 'hetzner kubernetes', 'hcloud
  terraform', 'hcloud packer', 'hcloud cli', 'CX', 'CCX',
  'CAX', 'Hetzner Storage Box', 'Hetzner vSwitch', 'Hetzner
  Firewall', 'Hetzner Load Balancer', 'Hetzner Floating IP',
  'Hetzner Placement Group', 'Hetzner ISO'.
  Covers: Hetzner Cloud resources (servers, networks, firewalls,
  load balancers, volumes), Hetzner Dedicated (Robot servers),
  Hetzner Storage Boxes, Kubernetes on Hetzner, cost
  optimization.
  Do NOT use for: other cloud providers (AWS, Azure, GCP,
  Oracle, IBM).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, hetzner, cloud-provider, cost-optimization, phase-4]
---

# Hetzner Cloud & Dedicated

## Purpose
Manage Hetzner Cloud and Dedicated infrastructure: servers, networking, volumes, firewalls, load balancers, Storage Boxes, and Kubernetes clusters. Optimize for cost efficiency while maintaining reliability.

## Agent Protocol

### Trigger
Exact user phrases: "hetzner", "hcloud", "hetzner cloud", "hetzner dedicated", "hetzner robot", "CX", "CCX", "CAX", "hetzner kubernetes", "hcloud terraform", "hcloud packer".

### Input Context
- Product: Hetzner Cloud (API-based) or Hetzner Dedicated (Robot).
- Server type and location (Falkenstein, Nuremberg, Helsinki).
- Network topology (private network, vSwitch).
- Storage needs (volumes, Storage Boxes).
- Operating system images.

### Output Artifact
HCL, CLI commands, or configuration files.

### Response Format
Terraform HCL or hcloud CLI commands. No preamble.

### Completion Criteria
- [ ] Network created (private network or vSwitch).
- [ ] Server(s) provisioned with cloud-init.
- [ ] Firewall rules applied (Hetzner Cloud Firewall or iptables).
- [ ] Volume attached and formatted.
- [ ] DNS configured (Hetzner DNS or external).
- [ ] Monitoring set up (Hetzner Monitoring or external).
- [ ] Cost optimization applied (server type, reserved, BI-directional traffic).
- [ ] K8s cluster running (k3s, Rancher, or Talos).

### Max Response Length
400 lines.

## Quick Start
Create project → Generate API token → Configure private network → Provision CX52 server with cloud-init → Attach volume → Apply firewall → Set up monitoring. For dedicated: order server via Robot → Configure vSwitch → Install OS via Rescue → Provision.

## Decision Tree: Hetzner Product Types
| Product | Access | Management | Use Case |
|---------|--------|------------|----------|
| **Cloud (CX/CCX/CAX)** | API (hcloud CLI/Terraform) | Full API, self-service | Dynamic workloads, K8s, CI/CD |
| **Dedicated (Robot)** | Web UI / API (limited) | Manual OS install via Rescue | Stable workloads, large memory, GPU |
| **Storage Box** | SFTP/WebDAV/CIFS | Manual or scripted | Backups, file shares, Nextcloud |
| **Auction** | Robot | Same as Dedicated | Deep discounts on older gen HW |
| **vSwitch** | Robot + Cloud | Layer 2 bridge | Connect Dedicated + Cloud networks |

## Core Workflow

### Step 1: Terraform Provider Setup
```hcl
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.47"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

variable "hcloud_token" {
  type      = string
  sensitive = true
}
```

### Step 2: Private Network
```hcl
resource "hcloud_network" "net" {
  name     = "private-net"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "subnet" {
  network_id   = hcloud_network.net.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}
```

### Step 3: SSH Key and Firewall
```hcl
resource "hcloud_ssh_key" "default" {
  name       = "default"
  public_key = file("~/.ssh/id_ed25519.pub")
}

resource "hcloud_firewall" "web" {
  name = "web-firewall"

  rule {
    direction  = "in"
    protocol   = "tcp"
    source_ips = ["0.0.0.0/0", "::/0"]
    port       = "80"
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    source_ips = ["0.0.0.0/0", "::/0"]
    port       = "443"
  }
  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    source_ips = ["10.0.0.0/8"]
    port       = "22"
  }
  rule {
    direction  = "out"
    protocol   = "tcp"
    destination_ips = ["0.0.0.0/0", "::/0"]
    port       = "443"
  }
  rule {
    direction  = "out"
    protocol   = "udp"
    destination_ips = ["0.0.0.0/0", "::/0"]
    port       = "53"
  }
}
```

### Step 4: Server with Cloud-Init
```hcl
resource "hcloud_server" "app" {
  name        = "app-1"
  server_type = "cax21"     # ARM, 4 vCPU, 8 GB RAM
  image       = "ubuntu-24.04"
  location    = "fsn1"      # Falkenstein
  ssh_keys    = [hcloud_ssh_key.default.id]
  firewall_ids = [hcloud_firewall.web.id]
  network {
    network_id = hcloud_network.net.id
    ip         = "10.0.1.10"
  }
  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  # Cloud-init for initial setup
  user_data = <<-EOF
  #cloud-config
  package_upgrade: true
  packages:
    - docker.io
    - docker-compose-v2
    - prometheus-node-exporter
  runcmd:
    - systemctl enable --now docker
    - systemctl enable --now prometheus-node-exporter
    - ufw allow 9100/tcp
  EOF
}
```

### Step 5: Volume Attachment
```hcl
resource "hcloud_volume" "data" {
  name      = "app-data"
  size      = 100  # GB
  server_id = hcloud_server.app.id
  automount = true
  format    = "xfs"
  location  = hcloud_server.app.location
  delete_protection = true
}

# Format and mount via cloud-init or provisioner:
# mkfs.xfs /dev/disk/by-id/scsi-0HC_Volume_<id>
# mkdir -p /data && mount /dev/disk/by-id/scsi-0HC_Volume_<id> /data
# echo '/dev/disk/by-id/scsi-0HC_Volume_<id> /data xfs defaults,nofail 0 0' >> /etc/fstab
```

### Step 6: Load Balancer
```hcl
resource "hcloud_load_balancer" "web" {
  name               = "web-lb"
  load_balancer_type = "lb11"      # 1.2 TB traffic, 11 connections/sec
  location           = "fsn1"
  network_zone       = "eu-central"
}

resource "hcloud_load_balancer_target" "web_app" {
  load_balancer_id = hcloud_load_balancer.web.id
  type             = "server"
  server_id        = hcloud_server.app.id
  use_private_ip   = true
}

resource "hcloud_load_balancer_service" "http" {
  load_balancer_id = hcloud_load_balancer.web.id
  protocol         = "http"
  listen_port      = 80
  destination_port = 80
  proxyprotocol    = false

  health_check {
    protocol = "http"
    port     = 80
    interval = 15
    timeout  = 10
    retries  = 3
    http {
      path = "/healthz"
    }
  }
}
```

### Step 7: Floating IP (High Availability)
```hcl
resource "hcloud_floating_ip" "vip" {
  type      = "ipv4"
  home_location = "fsn1"
  server_id = hcloud_server.app.id
  name      = "app-vip"
  # Failover script handles IP reassignment on server down
}

# Manual failover command:
# hcloud floating-ip assign app-vip app-2

# Automate with keepalived:
# vrrp_instance VIP {
#   interface eth0
#   virtual_router_id 51
#   priority 100
#   virtual_ipaddress { <floating_ip_address>/32 }
# }
```

### Step 8: Placement Group (Anti-Affinity)
```hcl
resource "hcloud_placement_group" "spread" {
  name = "spread-group"
  type = "spread"
}

resource "hcloud_server" "node" {
  count              = 3
  name               = "node-${count.index + 1}"
  server_type        = "cax21"
  image              = "ubuntu-24.04"
  location           = "fsn1"
  ssh_keys           = [hcloud_ssh_key.default.id]
  placement_group_id = hcloud_placement_group.spread.id
}
```

### Step 9: Kubernetes on Hetzner
```bash
# Option A: k3s with Hetzner Cloud Controller Manager
# 1. Provision 3+ servers (CX52 or CAX31) with private network
# 2. Install k3s on master
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable servicelb --disable traefik" sh -
# 3. Install Hetzner Cloud Controller Manager
kubectl apply -f https://github.com/hetznercloud/hcloud-cloud-controller-manager/releases/latest/download/ccm-networks.yaml
# 4. Install Hetzner CSI Driver for volumes
kubectl apply -f https://raw.githubusercontent.com/hetznercloud/csi-driver/v2.5.0/deploy/kubernetes/hcloud-csi.yml
# 5. Install MetalLB for LoadBalancer IPs (use Floating IP pool)
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml

# Option B: Talos Linux on Hetzner (immutable K8s)
# 1. Download talosctl
# 2. Generate config
talosctl gen config k8s-prod https://<control-plane-ip>:6443
# 3. Apply via Talos to each node
# 4. Hetzner Cloud integration via Talos CCM

# Option C: Rancher/RKE2
# 1. Provision servers
# 2. Install RKE2 on control plane nodes
# 3. Join worker nodes
# 4. Deploy Hetzner CCM + CSI
```

### Step 10: Dedicated Server (Robot) Setup
```bash
# 1. Order server via Hetzner Robot web UI or auction
# 2. Reboot into Rescue mode
# 3. Install OS with custom config via installimage
installimage -a -c /tmp/install.conf
# install.conf example:
# DRIVE1 /dev/nvme0n1
# DRIVE2 /dev/nvme1n1
# SWRAID 1
# SWRAIDLEVEL 1
# BOOTLOADER grub
# HOSTNAME server1.example.com
# PART /boot ext3 512M
# PART lvm vg0 1G
# LV vg0 swap swap swap 32G
# LV vg0 root / ext4 512G
# IMAGE /root/images/Ubuntu-2404-noble-amd64-base.tar.gz
# 4. Configure vSwitch to bridge with Cloud network
# 5. Install and configure services
```

### Step 11: Hetzner Storage Box for Backups
```bash
# Mount Storage Box via CIFS
sudo mount -t cifs //<username>.your-storagebox.de/backup /mnt/backup \
  -o username=<username>,password=<password>,uid=1000,gid=1000,vers=3.0

# Automated backup script (daily cron)
#!/bin/bash
BACKUP_DIR="/mnt/backup/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"
tar czf "$BACKUP_DIR/volumes.tgz" /var/lib/docker/volumes
find /mnt/backup -type d -mtime +30 -exec rm -rf {} +

# Borg backup to Storage Box (encrypted, deduplicated)
borg init --encryption=repokey-blake2 ssh://<username>@<username>.your-storagebox.de:23/./backups
borg create --stats --compression lz4 \
  ssh://<username>@<username>.your-storagebox.de:23/./backups::$(date +%Y-%m-%d) \
  /var/lib/docker/volumes /etc /home
borg prune --keep-daily 7 --keep-weekly 4 --keep-monthly 6 \
  ssh://<username>@<username>.your-storagebox.de:23/./backups
```

### Step 12: Monitoring Setup
```yaml
# Prometheus + Node Exporter (Hetzer-optimized)
Prometheus config:
  - Hetzner servers export metrics via node_exporter
  - Hetzner API exporter for server status and costs
  - Blackbox_exporter for external endpoint monitoring

Alert rules:
  - server_down: up == 0 for 2m
  - high_cpu: node_load1 > (cpu_count * 0.8) for 5m
  - disk_space: node_filesystem_avail < 10%
  - traffic_quota: 80% of monthly included traffic used
  - volume_backup_stale: last backup timestamp > 24h

Cost tracking:
  - Track bandwidth usage per server (hcloud server describe)
  - Budget alerts via script querying hcloud API
  - Reserved instances for steady-state workloads
```

## Rules
- Always use ARM (CAX) series for cost-effective compute — up to 30-40% cheaper than x86.
- Use Private Networks for inter-server traffic — free and higher bandwidth than public IP.
- Enable automatic backups on all production servers via Hetzner Backup or external.
- Always set delete protection on volumes with critical data.
- Use Placement Groups with `spread` to prevent single-rack failure for HA workloads.
- Monitor monthly included traffic per server — overage is expensive.
- Prefer Floating IPs over Elastic IPs for HA failover patterns.
- Use cloud-init for server bootstrap — never SSH into a fresh server to configure.
- All servers should have both IPv4 and IPv6 — IPv6 traffic is often unmetered.
- Deploy Hetzner CCM and CSI for Kubernetes to natively use Cloud resources.

## Production Considerations
- CX22 (2 vCPU, 4 GB) is minimum for production workloads — CX11/CX12 are too small.
- CAX (ARM) servers have excellent price-performance but verify software compatibility.
- Dedicated servers offer ECC RAM for reliability-critical workloads.
- vSwitch adds complexity — prefer Cloud Private Networks where possible.
- Hetzner Load Balancer is Layer 4 only — use HAProxy or Nginx for Layer 7 features.
- Auction servers may have older CPUs (Haswell/Broadwell era) — benchmark first.
- Storage Box throughput is limited (~100 MB/s) — not suitable for high-performance DB.
- Hetzner Backup Space (included with servers) is a simple FTP backup — use Borg or Restic.
- Traffic over Private Networks is free (no bandwidth counted).
- Dedicated servers: installimage supports many distros; custom images can be imported.
- Rescue system is based on Debian — use for hardware diagnostics and OS reinstall.

## Hetzner Cost Optimization
```yaml
Server type cost comparison (monthly, fsn1):
  CX22 (2 vCPU, 4 GB):        ~€4.49
  CX32 (4 vCPU, 8 GB):        ~€7.49
  CX52 (8 vCPU, 16 GB):       ~€14.99
  CCX13 (2 vCPU, 8 GB, AMD):  ~€10.49
  CCX23 (4 vCPU, 16 GB, AMD): ~€19.49
  CAX11 (2 vCPU, 4 GB, ARM):  ~€3.49
  CAX21 (4 vCPU, 8 GB, ARM):  ~€5.99
  CAX31 (8 vCPU, 16 GB, ARM): ~€11.99

Cost-saving strategies:
  1. Use CAX (ARM) for most workloads — 30%+ cheaper than equivalent CX
  2. Dedicated auction for large-memory needs (512 GB+ RAM)
  3. Use included traffic wisely — package vs. individual traffic
  4. Single large server vs. multiple small ones — compare total cost
  5. Schedule non-production servers to turn off overnight (hcloud server shutdown)
  6. Use Storage Boxes for backups vs. dedicated backup servers
  7. Volume pricing: 0.06 €/GB/month for block storage
  8. Floating IPs: ~€0.50/month each (for HA)
```

## Anti-Patterns
- Using default public network without firewall — all ports exposed by default.
- No private network for inter-server traffic — incurs bandwidth costs.
- Running production on CX11 (2 GB RAM) — OOM under load.
- Manual SSH configuration — no repeatability, no audit trail.
- Not setting up backups — Hetzner doesn't auto-backup your data.
- Over-provisioning with dedicated servers when Cloud would be sufficient.
- Ignoring IPv6 — dual-stack is free and reduces IPv4 address scarcity.
- No HA strategy for single-point-of-failure servers.
- Using Hetzner Load Balancer for HTTPS termination — no TLS support.
- Not monitoring included traffic — unexpected overage charges.

## References
  - references/hetzner-cloud-advanced.md — Hetzner Cloud Advanced Topics
  - references/hetzner-cloud-fundamentals.md — Hetzner Cloud Fundamentals
  - references/hetzner-dedicated.md — Hetzner Dedicated Server Setup
  - references/hetzner-kubernetes.md — Kubernetes on Hetzner (k3s, Talos, Rancher)
  - references/hetzner-cost-optimization.md — Hetzner Cost Optimization
## Handoff
- `devops-kubernetes` for deploying workloads on Hetzner K8s.
- `devops-terraform` for Terraform state and module patterns.
- `devops-backup-dr` for backup strategies using Storage Boxes.
- `devops-monitoring` for Prometheus-based monitoring.
- `devops-hybrid-cloud` for connecting Hetzner with other providers.
- `devops-datacenter` for physical hardware considerations.

## Architecture Decision Trees

### Dedicated Server vs Cloud Instance

| Decision | Dedicated Server (Hetzner) | Cloud Instance (Hetzner Cloud) |
|---|---|---|
| Performance | Full bare-metal (no neighbors) | Virtualized (shared hypervisor) |
| Flexibility | OS from ISO, full control | Pre-installed images, API-driven |
| Provisioning | Hours (manual setup) | Seconds (API, Terraform) |
| Cost | Lower at high utilization | Higher per-hour, pay-as-you-go |
| Autoscaling | Not supported | Supported via API/Terraform |
| Network | Single server, BGP possible | Private network, floating IPs |
| Best for | Workloads needing raw throughput | Variable workloads, ephemeral |

### Storage Box vs Volume Storage

| Aspect | Storage Box (Borg) | Volume Storage (Block) |
|---|---|---|
| Protocol | SFTP, SMB, WebDAV | iSCSI, attached via SCSI |
| Performance | Sequential OK, slow IOPS | Fast IOPS, low latency |
| Capacity | Up to 20 TB | Up to 10 TB per volume |
| Use case | Backups, file shares | Database disks, app data |
| Mountability | Network mount | Direct block device |
| Redundancy | RAID on datacenter side | Replicated across hosts |

## Implementation Patterns

### Terraform: Hetzner Cloud K3s Cluster

```hcl
resource "hcloud_server" "k3s_control" {
  name        = "k3s-control-01"
  server_type = "cax31"
  image       = "ubuntu-24.04"
  location    = "fsn1"
  ssh_keys    = [hcloud_ssh_key.default.id]
  network {
    network_id = hcloud_network.main.id
  }

  user_data = templatefile("${path.module}/cloud-init/control-plane.yaml", {
    k3s_token  = random_password.k3s_token.result
    cluster_cidr = "10.42.0.0/16"
    service_cidr = "10.43.0.0/16"
  })
}

resource "hcloud_server" "k3s_worker" {
  count       = 3
  name        = "k3s-worker-${count.index + 1}"
  server_type = "cax21"
  image       = "ubuntu-24.04"
  location    = "fsn1"
  ssh_keys    = [hcloud_ssh_key.default.id]
  network {
    network_id = hcloud_network.main.id
  }

  user_data = templatefile("${path.module}/cloud-init/worker.yaml", {
    k3s_url    = "https://${hcloud_server.k3s_control.ipv4_address}:6443"
    k3s_token  = random_password.k3s_token.result
  })
}

resource "hcloud_network" "main" {
  name     = "k3s-network"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "main" {
  network_id   = hcloud_network.main.id
  type         = "server"
  network_zone = "eu-central"
  ip_range     = "10.0.0.0/16"
}
```

### Bash: Hetzner API Server Management

```bash
#!/usr/bin/env bash
HCLOUD_TOKEN="${HCLOUD_TOKEN:?required}"

create_server() {
  local name=$1
  local type=${2:-cax21}
  local location=${3:-fsn1}

  curl -sf -X POST "https://api.hetzner.cloud/v1/servers" \
    -H "Authorization: Bearer $HCLOUD_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$name\",
      \"server_type\": \"$type\",
      \"location\": \"$location\",
      \"image\": \"ubuntu-24.04\",
      \"automount\": false,
      \"networks\": [$(hcloud network list -o noheader -o columns=id | head -1)]
    }" | jq '.server'
}

delete_old_snapshots() {
  hcloud image list --type snapshot --output json \
    | jq -r ".[] | select(.created | fromdate < $(date -d '-30 days' +%s)) | .id" \
    | xargs -I {} hcloud image delete {}
}
```

## Production Considerations

- Use **Hetzner's vSwitch** for dedicated server connectivity to Cloud instances when running hybrid
- Configure **DDoS protection** via Hetzner's default filtering; request additional DDoS rules if needed
- Enable **Backup Space** (Storage Box) for all critical server data with 7-day retention minimum
- Set up **robot-wg-tools** for WireGuard VPN between dedicated servers in different datacenters
- Use **Hetzner Cloud Firewall** with least-privilege rules — default deny inbound
- Monitor **Hetzner Robot** for hardware health alerts (ECC errors, disk SMART, temperature)
- Use **Hetzner API tokens** with restricted scopes per server group (read-only for monitoring)

## Anti-Patterns

- Ignoring **traffic limits** on dedicated servers — exceeding included traffic incurs significant overage
- Using **default VLAN** for all servers — segment by function (web, db, storage) with separate networks
- Provisioning **servers without monitoring** — Hetzner doesn't provide built-in server monitoring
- Skipping **rescue mode testing** — know how to boot into rescue mode for recovery scenarios
- Relying on **single datacenter** for production — FSN1/HEL1/NBG1 inter-DC latency is low but non-zero
- Underestimating **Storage Box IOPS limits** — not suitable for database workloads directly
- Forgetting to **detach volumes** before deleting servers — volumes survive but must be cleaned up

## Performance Optimization

- Choose **CCX instances** for compute-heavy workloads (better price-performance than non-dedicated CX)
- Enable **Hardware RAID** on dedicated servers with NVMe SSDs for storage-heavy applications
- Use **HCloud API** to set `automount: false` and mount volumes directly in fstab with noatime
- Configure **network optimization** — enable `tcp_congestion_control=bbr` on all servers
- Use **Hcloud Placement Groups** (`spread`) for K8s worker anti-affinity across hypervisors
- Enable **CPU governor** `performance` on dedicated servers for latency-sensitive workloads
- Set up **local NVMe cache** on Storage Box mounts using `cachefilesd` or similar caching layer

## Security Considerations

- Enable **Hetzner Firewall** on every Cloud instance — default deny rules, only expose necessary ports
- Use **SSH key-only auth** — disable password authentication on all servers via cloud-init
- Enable **Automatic Backups** on Hetzner Cloud and test restoration quarterly
- Restrict **HCloud API tokens** to IP allowlist (office IPs, CI runner IPs only)
- Set up **fail2ban** on dedicated servers to protect against brute force SSH attempts
- Use **Storage Box snapshots** via Borg backup — snapshots are immutable and encrypt at rest
- Audit **team member access** to Hetzner project — remove keys and tokens on offboarding
