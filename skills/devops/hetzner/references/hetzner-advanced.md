# Hetzner Advanced: High Availability, Hybrid Networking, Automation at Scale and Operations

Production patterns on Hetzner: designing for failure without managed HA services, failover with floating IPs, placement groups, hybrid cloud plus dedicated networking, private-only servers with NAT, image pipelines, Terraform structure for many environments, observability and DDoS considerations. Basics are in `hetzner-fundamentals.md`.

## Designing for Failure

Hetzner provides building blocks rather than managed HA services, so availability is your design responsibility.

| Failure | Mitigation |
|---------|------------|
| Single VM host failure | Multiple servers behind a load balancer; spread placement groups |
| Location outage | Replicas in a second location of the same network zone (for example `fsn1` + `nbg1` + `hel1`) |
| Database server failure | Replication (PostgreSQL streaming replication with Patroni, MySQL Group Replication), automated failover, backups off-host |
| Public IP pinned to dead server | Floating IP reassigned by keepalived or an automation, or load balancer health checks |
| Accidental deletion | Delete protection (`hcloud server enable-protection`), backups, snapshots, IaC |

### Placement groups

```hcl
resource "hcloud_placement_group" "web" {
  name = "web-spread"
  type = "spread"            # servers placed on different physical hosts
}

resource "hcloud_server" "web" {
  count              = 3
  name               = "web-${count.index + 1}"
  server_type        = var.server_type
  image              = var.image_id
  location           = "fsn1"
  placement_group_id = hcloud_placement_group.web.id
}
```

A spread placement group has a maximum number of servers (currently 10); check the documented limit.

## Load Balancers

```hcl
resource "hcloud_load_balancer" "web" {
  name               = "web-lb"
  load_balancer_type = "lb11"          # check available types and limits
  location           = "fsn1"
}

resource "hcloud_load_balancer_network" "web" {
  load_balancer_id = hcloud_load_balancer.web.id
  network_id       = hcloud_network.main.id
}

resource "hcloud_load_balancer_target" "web" {
  type             = "label_selector"
  load_balancer_id = hcloud_load_balancer.web.id
  label_selector   = "role=web"
  use_private_ip   = true
  depends_on       = [hcloud_load_balancer_network.web]
}

resource "hcloud_load_balancer_service" "https" {
  load_balancer_id = hcloud_load_balancer.web.id
  protocol         = "https"
  listen_port      = 443
  destination_port = 8080
  http {
    certificates  = [hcloud_managed_certificate.web.id]
    redirect_http = true
  }
  health_check {
    protocol = "http"
    port     = 8080
    interval = 10
    timeout  = 5
    retries  = 3
    http { path = "/healthz" }
  }
}
```

- Label selector targets pick up new servers automatically.
- Managed certificates (Let's Encrypt) require DNS for the domain in Hetzner DNS; otherwise upload certificates or terminate TLS on the targets with `tcp` services and proxy protocol.
- A load balancer lives in one location; for multi-location HA, put DNS-level failover or an external global load balancer in front.

## Floating IP Failover

For stateful pairs (database primary, VPN gateway, HAProxy pair):

```text
server A (MASTER) <-> keepalived VRRP over private network <-> server B (BACKUP)
on state change to MASTER: notify script calls Cloud API to assign floating IP to self
```

```bash
#!/usr/bin/env bash
# /etc/keepalived/assign-fip.sh  (token with minimal scope, stored root-only)
set -euo pipefail
SERVER_ID=$(curl -s http://169.254.169.254/hetzner/v1/metadata/instance-id)
curl -sf -X POST \
  -H "Authorization: Bearer ${HCLOUD_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"server\": ${SERVER_ID}}" \
  "https://api.hetzner.cloud/v1/floating_ips/${FLOATING_IP_ID}/actions/assign"
```

- The floating IP must also be configured on the server's network interface (netplan alias) to receive traffic.
- Use a fencing strategy so two nodes never believe they are primary (quorum via a third node, or Patroni with etcd for databases).
- VRRP multicast does not work on Hetzner networks; configure keepalived with unicast peers.

## Private Networks and NAT

Servers without public IPv4 reduce attack surface and cost:

```hcl
resource "hcloud_network" "main" {
  name     = "main"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "cloud" {
  network_id   = hcloud_network.main.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

resource "hcloud_network_route" "default_via_nat" {
  network_id  = hcloud_network.main.id
  destination = "0.0.0.0/0"
  gateway     = "10.0.1.2"          # private IP of the NAT gateway server
}

resource "hcloud_server" "app" {
  name        = "app-1"
  server_type = var.server_type
  image       = var.image_id
  location    = "fsn1"
  public_net {
    ipv4_enabled = false
    ipv6_enabled = false
  }
  network {
    network_id = hcloud_network.main.id
    ip         = "10.0.1.10"
  }
}
```

The NAT gateway is a small server with IP forwarding and masquerading enabled (`net.ipv4.ip_forward=1`, nftables masquerade). Private servers need their default route pointing at the network gateway (`10.0.0.1`), which forwards to the configured route. The NAT server is a single point of failure: run two with a failover mechanism for production.

## Hybrid: Cloud Network Coupled to Dedicated Servers

```hcl
resource "hcloud_network_subnet" "dedicated" {
  network_id   = hcloud_network.main.id
  type         = "vswitch"
  network_zone = "eu-central"
  ip_range     = "10.0.2.0/24"
  vswitch_id   = var.robot_vswitch_id     # created in Robot
}
```

- Dedicated servers join the vSwitch with a VLAN interface (VLAN ID from Robot, MTU 1400) and route the cloud subnet via the vSwitch gateway.
- Typical split: databases and heavy compute on dedicated servers, stateless frontends and load balancers in Cloud.
- Expose cloud routes to the dedicated side (enable "expose routes to vSwitch" on the network) when cloud servers must be reached from dedicated hosts.

## Image Pipelines

Build golden images with Packer to make servers immutable and fast to replace:

```hcl
source "hcloud" "base" {
  image         = "ubuntu-24.04"
  location      = "fsn1"
  server_type   = var.build_server_type
  ssh_username  = "root"
  snapshot_name = "base-{{timestamp}}"
  snapshot_labels = { role = "base", os = "ubuntu-24.04" }
}

build {
  sources = ["source.hcloud.base"]
  provisioner "shell" {
    inline = ["apt-get update", "apt-get -y upgrade", "apt-get -y install unattended-upgrades"]
  }
}
```

Reference the newest snapshot by label in Terraform (`data "hcloud_image"` with `with_selector` and `most_recent = true`). Snapshots are billed per GB; prune old ones.

## Terraform at Scale

- One state per environment and component (network, compute, DNS) to limit blast radius.
- Modules for repeated patterns (web tier, database pair, NAT gateway).
- Separate API tokens per project/environment; CI injects the right token.
- `prevent_destroy` lifecycle rules and Hetzner delete/rebuild protection for critical servers and volumes.
- Drift detection: scheduled `terraform plan` in CI.

## Kubernetes Integration Points

- **hcloud-cloud-controller-manager**: node metadata, load balancers from `Service type=LoadBalancer`, routes for private networking.
- **hcloud CSI driver**: Volumes as PersistentVolumes (ReadWriteOnce, same location as node).
- **Cluster Autoscaler** has a Hetzner provider.
Details are in `hetzner-kubernetes.md`.

## Observability and Operations

- Cloud metrics (CPU, disk, network) are available via API and console; for alerting deploy node exporter + Prometheus or an agent-based service.
- Collect logs centrally (Loki, OpenSearch, or a SaaS) because servers are replaceable.
- Watch Hetzner status page and subscribe to maintenance notifications; dedicated server hardware issues are handled via Robot support requests.
- Track resource limits per project (servers, IPs, volumes); request increases ahead of growth.

## DDoS and Abuse

- Hetzner includes network-level DDoS mitigation for its infrastructure. Application-layer attacks still reach your servers: rate limit at the load balancer or reverse proxy, and use a CDN/WAF for public sites.
- Abuse reports (for example from compromised servers sending spam) arrive by email and require timely response; unanswered reports can lead to IP blocking. Keep contact addresses monitored.
- Outbound SMTP (port 25/465) is blocked on new cloud accounts by default; request unblocking or use an email delivery service.

## Backup Strategy

| Data | Approach |
|------|----------|
| Server disks | Hetzner backups (daily, rotating, billed as a percentage of server price) for convenience; not a substitute for application-consistent backups |
| Databases | Logical and physical backups (pgBackRest, WAL-G) to Object Storage or a Storage Box in another location |
| Volumes | Snapshots via API before risky changes; application-level backups for consistency |
| Configuration | IaC in Git; secrets in a secret manager |

Test restores regularly.

## Checklist

- [ ] At least two servers per tier with spread placement; load balancer health checks
- [ ] Cross-location replicas for critical data
- [ ] Floating IP failover with fencing for stateful pairs
- [ ] Private-only servers behind redundant NAT where possible
- [ ] Golden images built by Packer; servers replaceable
- [ ] Terraform state split per environment and component; protection on critical resources
- [ ] Monitoring, central logs, abuse contact monitored
- [ ] Off-site, tested backups
