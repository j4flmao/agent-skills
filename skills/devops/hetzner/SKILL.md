---
name: hetzner
description: >
  Use this skill when the user says 'Hetzner', 'Hetzner Cloud', 'HCloud',
  'Hetzner Dedicated', 'Hetzner Robot', 'server auction', 'K3s', 'Rancher',
  'Storage Box', 'hcloud CLI', 'Terraform Hetzner', 'cluster-api', 'CSI
  driver', 'vSwitch', 'Cloud Firewall', 'placement group', 'rescue mode'.
  Covers: Hetzner Cloud instances, networking, dedicated servers, Kubernetes
  on Hetzner, storage/backup, Terraform provider.
  Do NOT use this for: AWS, Azure, GCP, or other cloud providers.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud, hetzner, infrastructure, phase-5]
---

# Hetzner

## Purpose
Design, deploy, and manage Hetzner infrastructure (Cloud and Dedicated) using Terraform, hcloud CLI, Robot API, and best practices for instances, networking, Kubernetes (K3s, Rancher), and storage/backup.

## Agent Protocol

### Trigger
Exact user phrases: "Hetzner", "Hetzner Cloud", "HCloud", "Hetzner Dedicated", "Hetzner Robot", "server auction", "K3s", "Rancher", "Storage Box", "hcloud CLI", "Terraform Hetzner", "cluster-api", "CSI driver", "vSwitch", "Cloud Firewall", "placement group", "rescue mode".

### Input Context
Before activating, verify:
- Hetzner project type (Cloud vs. Dedicated vs. hybrid).
- Region and data center (nbg1, fsn1, hel1, ash, hil).
- Authentication method (API token for Cloud, Robot user/pass for Dedicated).
- OS image preference (Ubuntu, Fedora, Debian, custom image).
- Budget constraints (Cloud hourly vs. Dedicated monthly).

### Output Artifact
Writes to Terraform HCL, hcloud CLI commands, K3s/Rancher config, shell scripts, SSH config.

### Response Format
HCL, YAML, or CLI commands with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
This skill is complete when:
- [ ] Cloud network, firewall, and placement groups are configured.
- [ ] Cloud instances or dedicated servers are provisioned.
- [ ] Kubernetes cluster (K3s or Rancher) is deployed with storage CSI.
- [ ] Storage Box or backup space is attached and automated.
- [ ] Monitoring and firewall rules enforce security.

## Quick Start
Project → Cloud network with firewall → 3 CX52 instances in placement group → K3s with embedded etcd → Hetzner CSI for persistent volumes → Storage Box for backups.

## Core Workflow

### Step 1: Cloud Network and Firewall
```hcl
# Terraform: network, subnet, firewall
resource "hcloud_network" "main" {
  name     = "production-net"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "app" {
  network_id   = hcloud_network.main.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

resource "hcloud_firewall" "web" {
  name = "web-firewall"

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = ["10.0.0.0/16", "203.0.113.0/24"]
  }
  rule {
    direction = "in"
    protocol  = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}
```

### Step 2: Cloud Instances
```hcl
resource "hcloud_placement_group" "app" {
  name = "app-pg"
  type = "spread"
}

resource "hcloud_ssh_key" "default" {
  name       = "terraform-key"
  public_key = file("~/.ssh/id_ed25519.pub")
}

resource "hcloud_server" "app" {
  count       = 3
  name        = "app-server-${count.index}"
  server_type = "cx52"
  image       = "ubuntu-24.04"
  location    = "nbg1"
  firewall_ids = [hcloud_firewall.web.id]
  network {
    network_id = hcloud_network.main.id
    ip         = "10.0.1.${count.index + 10}"
  }
  placement_group_id = hcloud_placement_group.app.id
  ssh_keys           = [hcloud_ssh_key.default.id]
  backups            = true

  user_data = <<-EOF
    #cloud-config
    packages:
      - docker.io
      - docker-compose
    runcmd:
      - systemctl enable docker
      - systemctl start docker
    EOF
}

resource "hcloud_volume" "data" {
  count     = 3
  name      = "data-volume-${count.index}"
  size      = 100
  server_id = hcloud_server.app[count.index].id
  automount = true
  format    = "ext4"
}
```

### Step 3: Load Balancer
```hcl
resource "hcloud_load_balancer" "public" {
  name               = "public-lb"
  load_balancer_type = "lb11"
  location           = "nbg1"
}

resource "hcloud_load_balancer_network" "lb_net" {
  load_balancer_id = hcloud_load_balancer.public.id
  network_id       = hcloud_network.main.id
  ip               = "10.0.1.100"
}

resource "hcloud_load_balancer_service" "http" {
  load_balancer_id = hcloud_load_balancer.public.id
  protocol         = "http"
  listen_port      = 80
  destination_port = 80
  proxyprotocol    = false
}

resource "hcloud_load_balancer_target" "app" {
  count            = 3
  load_balancer_id = hcloud_load_balancer.public.id
  type             = "server"
  server_id        = hcloud_server.app[count.index].id
  use_private_ip   = true
}
```

### Step 4: K3s on Hetzner
```yaml
# K3s installation via user_data (first server = embedded etcd)
# Server 0 (control-plane):
# curl -sfL https://get.k3s.io | K3S_TOKEN=mysecret sh -s - server \
#   --cluster-init \
#   --node-taint "node-role.kubernetes.io/control-plane:NoSchedule" \
#   --kubelet-arg "cloud-provider=external"

# Additional servers:
# curl -sfL https://get.k3s.io | K3S_TOKEN=mysecret sh -s - server \
#   --server https://10.0.1.10:6443 \
#   --kubelet-arg "cloud-provider=external"

# Hetzner CSI driver
resource "hcloud_volume" "k8s_data" {
  name      = "k8s-pv-data"
  size      = 50
  server_id = hcloud_server.app[0].id
  automount = true
  format    = "ext4"
}
```

```yaml
# Hetzner CSI driver installation
# kubectl apply -f https://raw.githubusercontent.com/hetznercloud/csi-driver/master/deploy/kubernetes/hcloud-csi.yml
---
# CSI storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: hcloud-volumes
provisioner: csi.hetzner.cloud
reclaimPolicy: Delete
allowVolumeExpansion: true
---
# Sample PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: hcloud-volumes
```

### Step 5: Storage Box and Backups
```bash
# Storage Box configuration via hcloud CLI
# List available Storage Boxes:
hcloud box list

# Mount a Storage Box via SSHFS:
mkdir -p /mnt/storagebox
sshfs -o allow_other,default_permissions U123456@u123456.your-storagebox.de:/backup /mnt/storagebox

# Or via Samba:
# mount -t cifs //u123456.your-storagebox.de/backup /mnt/storagebox \
#   -o username=U123456,password=YOURPASS,uid=1000,gid=1000

# Automated backup script (cron daily):
cat << 'SCRIPT' > /usr/local/bin/backup.sh
#!/bin/bash
BACKUP_DIR="/mnt/storagebox/$(hostname)/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"
tar czf "$BACKUP_DIR/volumes.tar.gz" /mnt/data
pg_dumpall -U postgres | gzip > "$BACKUP_DIR/pg_dump.sql.gz"
find /mnt/storagebox -type f -mtime +30 -delete
SCRIPT

chmod +x /usr/local/bin/backup.sh
echo "0 2 * * * /usr/local/bin/backup.sh" | crontab -
```

```hcl
# Terraform: backup snapshot management
resource "hcloud_snapshot" "app" {
  server_id = hcloud_server.app[0].id
  labels = {
    "backup" = "daily"
  }
}
```

## Rules & Constraints
- Never hardcode Hetzner API tokens — use HCLOUD_TOKEN environment variable for Cloud, Robot credentials for Dedicated
- Always use placement groups (spread) for production workloads to ensure availability
- Use Cloud Firewall over OS-level iptables for centralized network policy
- Enable automatic backups on all Cloud instances
- Use private network (VXLAN) for inter-server communication
- For Kubernetes, always use Hetzner CSI and CCM (Cloud Controller Manager)
- Dedicated servers: use vSwitch for private networking between servers
- Storage Box is not suitable for database storage — use for backups only
- Use rescue mode (Hetzner Rescue System) for server recovery and OS reinstalls
- Monitor with Hetzner Cloud API metrics or external monitoring (Prometheus, Grafana)

## References
- `references/hetzner-cloud.md` — Cloud instances, networks, firewalls, volumes, LB
- `references/dedicated-servers.md` — Server models (AX/EX/SX), auction, Robot, rescue
- `references/hetzner-kubernetes.md` — K3s, Rancher, cluster-api, CSI, CCM
- `references/storage-backup.md` — Storage Box, backup space, snapshots, automation

## Handoff
After completing this skill:
- Next skill: **kubernetes-patterns** — Advanced K8s on Hetzner with monitoring and GitOps
- Pass context: Network ID, firewall IDs, server IDs, kubeconfig, Storage Box mount
