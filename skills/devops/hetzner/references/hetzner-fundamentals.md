# Hetzner Fundamentals: Products, Projects, CLI, API and Terraform Basics

Hetzner offers low-cost infrastructure in Europe, the US and Singapore: Hetzner Cloud (API-driven VMs and networking), dedicated (root) servers managed through Robot, and storage products. This reference covers the product landscape, account and project model, locations, the `hcloud` CLI, API tokens and a minimal Terraform setup. Product-specific deep dives are in `hetzner-cloud.md`, `dedicated-servers.md`, `network-security.md`, `storage-backup.md` and `hetzner-kubernetes.md`.

## Product Landscape

| Product | What it is | Managed via |
|---------|-----------|-------------|
| Cloud servers | VMs with shared vCPU (x86 and Arm) or dedicated vCPU | Cloud Console, `hcloud` CLI, Cloud API, Terraform |
| Cloud networking | Private networks, load balancers, firewalls, primary and floating IPs | Same as above |
| Volumes | Block storage attached to one cloud server | Same as above |
| Object Storage | S3-compatible object storage in selected EU locations | Console, S3 API |
| Dedicated servers | Bare-metal root servers (new or from the server auction) | Robot (web UI and Robot API) |
| vSwitch | Layer-2 VLAN between dedicated servers, optionally coupled to a Cloud network | Robot + Cloud |
| Storage Box | Network storage over SFTP/SCP, rsync, BorgBackup, SMB, WebDAV | Robot / Console |

There is no managed Kubernetes or managed database service from Hetzner itself; you run these yourself (k3s, Talos, kube-hetzner, operators) or use third parties.

## Locations and Network Zones

| Location code | City | Network zone |
|---------------|------|--------------|
| `fsn1` | Falkenstein, DE | `eu-central` |
| `nbg1` | Nuremberg, DE | `eu-central` |
| `hel1` | Helsinki, FI | `eu-central` |
| `ash` | Ashburn, VA, US | `us-east` |
| `hil` | Hillsboro, OR, US | `us-west` |
| `sin` | Singapore | `ap-southeast` |

- Private networks span locations within one network zone only.
- Not every server type, Object Storage or dedicated server offer exists in every location; check with `hcloud location list` and `hcloud server-type list`.
- Dedicated servers are in the German and Finnish data centers.

## Accounts, Projects and Tokens

- A Cloud **project** is the isolation boundary for resources, API tokens and member permissions. Use separate projects per environment (prod, staging, dev).
- **API tokens** are per project and either Read or Read & Write. They are shown once at creation; store them in a secret manager.
- Members are invited to projects with roles (owner, admin, member, restricted); enable two-factor authentication for every console user.
- Robot (dedicated servers) uses separate web service credentials for its API.

## hcloud CLI

```bash
# Install: brew install hcloud, or download from github.com/hetznercloud/cli releases
hcloud context create prod            # prompts for an API token, stores it in ~/.config/hcloud/cli.toml
hcloud context use prod

hcloud location list
hcloud server-type list                # current types, vCPU, RAM, disk, architecture, price
hcloud image list --type system

hcloud ssh-key create --name ops --public-key-from-file ~/.ssh/id_ed25519.pub

SERVER_TYPE=cx22                       # example only: pick a current type from `hcloud server-type list`
hcloud server create \
  --name web-1 \
  --type "$SERVER_TYPE" \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key ops \
  --user-data-from-file cloud-init.yaml

hcloud server list
hcloud server ssh web-1
hcloud server poweroff web-1           # still billed while it exists
hcloud server delete web-1
```

In CI, set `HCLOUD_TOKEN` as an environment variable instead of creating contexts. The CLI stores tokens in plain text in its config file; protect that file or use environment variables from a secret store.

## Server Type Families

| Family | CPU | Typical use |
|--------|-----|-------------|
| Shared vCPU, Intel/AMD (CX / CPX lines) | Shared | Web servers, small services, dev/test |
| Shared vCPU, Arm (CAX line, Ampere) | Shared | Cost-efficient general workloads with arm64 images |
| Dedicated vCPU (CCX line) | Dedicated | CPU-sensitive production workloads, databases |

Type names and specifications change over time (Hetzner periodically introduces new generations and retires old ones); read them from `hcloud server-type list` or the API instead of hardcoding assumptions about cores and RAM. Prices are hourly with a monthly cap.

## Billing Model

- Cloud resources are billed per hour up to a monthly maximum, as long as they exist, including powered-off servers, unattached volumes, primary IPs and snapshots.
- Traffic: cloud servers include an outbound traffic allowance (differs by location); additional traffic is billed per TB. Ingress and traffic within private networks are not charged.
- Delete unused resources rather than stopping them; snapshot first if needed.

## Cloud API

The CLI and Terraform wrap the REST API (`https://api.hetzner.cloud/v1`):

```bash
curl -s -H "Authorization: Bearer $HCLOUD_TOKEN" https://api.hetzner.cloud/v1/servers | jq '.servers[].name'
```

- Responses are paginated (`page`, `per_page`); long-running operations return `action` objects to poll.
- The API is rate limited per project (response headers `RateLimit-Limit`, `RateLimit-Remaining`); back off on `429`.
- Official SDKs: `hcloud-go`, `hcloud-python`; community libraries exist for other languages.

## Terraform Basics

```hcl
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.50"     # pin to a version you have tested
    }
  }
}

provider "hcloud" {}          # reads HCLOUD_TOKEN from the environment

resource "hcloud_ssh_key" "ops" {
  name       = "ops"
  public_key = file("~/.ssh/id_ed25519.pub")
}

resource "hcloud_firewall" "web" {
  name = "web"
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = [var.admin_cidr]
  }
}

resource "hcloud_server" "web" {
  name         = "web-1"
  server_type  = var.server_type
  image        = "ubuntu-24.04"
  location     = "fsn1"
  ssh_keys     = [hcloud_ssh_key.ops.id]
  firewall_ids = [hcloud_firewall.web.id]
  user_data    = file("${path.module}/cloud-init.yaml")
  labels       = { env = "prod", role = "web" }
}
```

Store Terraform state remotely (for example an S3-compatible backend such as Hetzner Object Storage, or Terraform Cloud) with locking; state contains sensitive values.

## cloud-init Starting Point

```yaml
#cloud-config
package_update: true
package_upgrade: true
packages: [unattended-upgrades, fail2ban]
users:
  - name: deploy
    groups: [sudo]
    shell: /bin/bash
    sudo: "ALL=(ALL) NOPASSWD:ALL"
    ssh_authorized_keys:
      - ssh-ed25519 AAAA-REPLACE-WITH-YOUR-KEY deploy@example
ssh_pwauth: false
disable_root: true
runcmd:
  - systemctl enable --now unattended-upgrades
```

## Choosing Cloud vs Dedicated

| Need | Choose |
|------|--------|
| Elastic capacity, API automation, quick replacement | Cloud |
| Maximum price-performance for steady heavy load, large local NVMe, GPUs | Dedicated |
| Both | Cloud for stateless and edge, dedicated for databases or compute, connected via vSwitch coupled to a Cloud network |

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| One project for all environments | Separate projects and tokens per environment |
| Read & Write tokens in many places | Least-privilege tokens; rotate; store in a secret manager |
| Powered-off servers assumed free | Delete or snapshot and delete |
| SSH open to the internet with passwords | Firewall + keys only + `ssh_pwauth: false` |
| Hardcoded server type specs | Query the API; types change |
| Single server for production | Multiple servers, load balancer, backups (see advanced reference) |

## Checklist

- [ ] Projects per environment; 2FA for all users
- [ ] API tokens scoped (read vs read/write) and stored in a secret manager
- [ ] Infrastructure defined in Terraform with pinned provider and remote state
- [ ] Firewalls applied to every server; SSH restricted and key-only
- [ ] Labels on resources for ownership and automation
- [ ] Unused resources deleted, not just powered off
