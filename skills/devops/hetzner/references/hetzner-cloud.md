# Hetzner Cloud

## Cloud Instances

```hcl
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.48"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
  # Or use HCLOUD_TOKEN env variable
}

# Basic instance
resource "hcloud_server" "web" {
  name        = "web-0"
  server_type = "cx52"
  image       = "ubuntu-24.04"
  location    = "nbg1"

  # SSH keys
  ssh_keys = [hcloud_ssh_key.default.id]

  # Firewall
  firewall_ids = [hcloud_firewall.web.id]

  # Private network
  network {
    network_id = hcloud_network.main.id
    ip         = "10.0.1.10"
  }

  # Automatic backups
  backups = true

  # Labels for organization
  labels = {
    environment = "production"
    role        = "web"
    managed-by  = "terraform"
  }

  # Cloud-init user_data
  user_data = <<-EOF
    #cloud-config
    packages:
      - docker.io
      - docker-compose
      - htop
    runcmd:
      - systemctl enable docker
      - systemctl start docker
      - ufw allow 22/tcp
      - ufw allow 80/tcp
      - ufw allow 443/tcp
      - ufw --force enable
  EOF
}
```

## Server Types and Pricing

| Type | vCPUs | RAM | Disk | Traffic | Use Case |
|------|-------|-----|------|---------|----------|
| CX22 | 2 | 4 GB | 40 GB | 20 TB | Entry-level |
| CX32 | 2 | 8 GB | 80 GB | 20 TB | Web servers |
| CX42 | 4 | 16 GB | 160 GB | 20 TB | Application servers |
| CX52 | 4 | 32 GB | 240 GB | 20 TB | General purpose |
| CX62 | 8 | 64 GB | 480 GB | 20 TB | Heavy workloads |
| CCX13 | 2 | 8 GB | 80 GB | 20 TB | Dedicated vCPU |
| CCX23 | 4 | 16 GB | 160 GB | 20 TB | Dedicated vCPU |
| CCX33 | 8 | 32 GB | 240 GB | 20 TB | Dedicated vCPU |
| CCX43 | 16 | 64 GB | 480 GB | 20 TB | Dedicated vCPU |
| CAX11 | 2 | 4 GB | 40 GB | 20 TB | ARM64, cost-efficient |
| CAX21 | 4 | 8 GB | 80 GB | 20 TB | ARM64, balanced |
| CAX31 | 8 | 16 GB | 160 GB | 20 TB | ARM64, compute |

## Locations

| Location | Code | Features |
|----------|------|----------|
| Nuremberg | nbg1 | Core DC, lowest latency for Central Europe |
| Falkenstein | fsn1 | Largest DC, wide variety |
| Helsinki | hel1 | Nordic region |
| Ashburn, VA | ash | US East Coast |
| Hillsboro, OR | hil | US West Coast |

## Networks

```hcl
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

resource "hcloud_network_subnet" "db" {
  network_id   = hcloud_network.main.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.2.0/24"
}
```

## Firewalls

```hcl
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

  rule {
    direction = "out"
    protocol  = "tcp"
    port      = "1-65535"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction = "out"
    protocol  = "udp"
    port      = "1-65535"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }

  labels = {
    environment = "production"
  }
}

resource "hcloud_firewall" "db" {
  name = "db-firewall"

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "5432"
    source_ips = ["10.0.1.0/24"]
  }

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "3306"
    source_ips = ["10.0.1.0/24"]
  }
}
```

## Volumes

```hcl
resource "hcloud_volume" "data" {
  name      = "app-data"
  size      = 200
  server_id = hcloud_server.web.id
  automount = true
  format    = "ext4"
  delete_protection = true

  labels = {
    environment = "production"
    role        = "data"
  }
}

# Volume snapshot
resource "hcloud_snapshot" "data_snapshot" {
  server_id = hcloud_server.web.id
  labels = {
    backup = "daily"
  }
}
```

## Load Balancers

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

  health_check {
    protocol = "http"
    port     = 80
    interval = 10
    timeout  = 5
    retries  = 3
    http {
      path = "/health"
      status_codes = ["200-399"]
    }
  }
}

resource "hcloud_load_balancer_target" "web" {
  count            = 3
  load_balancer_id = hcloud_load_balancer.public.id
  type             = "server"
  server_id        = hcloud_server.web[count.index].id
  use_private_ip   = true
}

# Certificate for HTTPS termination
resource "hcloud_certificate" "letsencrypt" {
  name    = "app-cert"
  domain  = "app.example.com"
  type    = "managed"
  labels = {
    environment = "production"
  }
}

resource "hcloud_load_balancer_service" "https" {
  load_balancer_id = hcloud_load_balancer.public.id
  protocol         = "https"
  listen_port      = 443
  destination_port = 80
  certificate_ids  = [hcloud_certificate.letsencrypt.id]

  health_check {
    protocol = "http"
    port     = 80
    interval = 10
    timeout  = 5
    retries  = 3
    http {
      path = "/health"
      status_codes = ["200-399"]
    }
  }
}
```

## Placement Groups

```hcl
# Spread placement group (maximum HA)
resource "hcloud_placement_group" "web" {
  name = "web-pg"
  type = "spread"
  labels = {
    environment = "production"
  }
}

# Pack placement group (lowest latency)
resource "hcloud_placement_group" "cache" {
  name = "cache-pg"
  type = "pack"
}
```

## CLI Commands (hcloud CLI)

```bash
# Authentication
hcloud context create production
# Enter API token

# List contexts
hcloud context list

# Server operations
hcloud server list
hcloud server create --name web-0 --type cx52 --image ubuntu-24.04 --location nbg1
hcloud server describe web-0
hcloud server delete web-0
hcloud server ssh web-0
hcloud server poweroff web-0
hcloud server poweron web-0
hcloud server reboot web-0
hcloud server reset web-0

# Rescue mode
hcloud server enable-rescue web-0 --type linux64

# Rebuild from image
hcloud server rebuild web-0 --image ubuntu-24.04

# Create snapshot
hcloud server create-image web-0 --type snapshot --description "pre-patch-backup"

# Network
hcloud network create --name production-net --ip-range 10.0.0.0/16
hcloud network add-subnet production-net --type cloud --network-zone eu-central --ip-range 10.0.1.0/24
hcloud network list

# Firewall
hcloud firewall create --name web-firewall
hcloud firewall add-rule web-firewall --direction in --protocol tcp --port 80 --source-ips 0.0.0.0/0
hcloud firewall apply-to-server web-firewall --server web-0

# Volume
hcloud volume create --name app-data --size 200 --server web-0 --automount --format ext4
hcloud volume list

# Load balancer
hcloud load-balancer create --name public-lb --type lb11 --location nbg1
hcloud load-balancer add-service public-lb --protocol http --listen-port 80 --destination-port 80
hcloud load-balancer add-target public-lb --server web-0 --use-private-ip

# Certificate
hcloud certificate create --name app-cert --domain app.example.com --type managed

# Placement group
hcloud placement-group create --name web-pg --type spread

# SSH key
hcloud ssh-key create --name default --public-key-from-file ~/.ssh/id_ed25519.pub

# Image
hcloud image list
hcloud image describe ubuntu-24.04
```

## Cloud-Init Examples

```yaml
# #cloud-config for web server
#cloud-config
package_upgrade: true
packages:
  - nginx
  - docker.io
  - docker-compose
  - fail2ban
  - prometheus-node-exporter
write_files:
  - path: /etc/nginx/sites-available/default
    content: |
      server {
        listen 80;
        server_name _;
        location / {
          proxy_pass http://localhost:3000;
        }
        location /health {
          return 200 "OK";
        }
      }
runcmd:
  - systemctl enable nginx
  - systemctl start nginx
  - systemctl enable docker
  - systemctl start docker
  - systemctl enable fail2ban
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw --force enable
```

## Best Practices

- Use placement groups (spread) for production workloads to prevent same-host colocation
- Always use private networks (VXLAN) for inter-server communication
- Use Cloud Firewall as the primary network policy layer
- Enable automatic backups on all production instances
- Use CX ARM (CAX) series for cost-efficient workloads
- Use CCX dedicated vCPU series for latency-sensitive applications
- Apply labels (tags) to all resources for organization and cost tracking
- Use cloud-init for bootstrapping instead of post-deployment SSH
- Store API tokens in environment variables, never in code
- Use rescue mode for system recovery and OS reinstalls
- Monitor instance metrics with Prometheus Node Exporter
- Use Load Balancer health checks with custom paths
- Automate volume snapshots for data backup
