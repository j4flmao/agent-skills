# Droplets and Networking

## Droplet Types and Sizing

| Type | Series | Use Case | Example |
|------|--------|----------|---------|
| General Purpose | s-/g-/c- | Web servers, APIs, CI/CD | s-4vcpu-8gb |
| CPU-Optimized | c- | Compute-intensive, batch | c-8-16-intel |
| Memory-Optimized | m- | In-memory caches, DBs | m-16-64-intel |
| Storage-Optimized | so- | High IOPS, databases | so-4vcpu-16gb-intel |
| Premium Intel | -intel | Consistent Intel perf | s-4vcpu-8gb-intel |
| Premium AMD | -amd | AMD EPYC processors | s-4vcpu-8gb-amd |
| ARM (Basic) | -arm | ARM64, cost-effective | s-4vcpu-8gb-arm |

## Regions

| Region | Slug | Availability |
|--------|------|-------------|
| New York 1 | nyc1 | Legacy |
| New York 3 | nyc3 | Current gen |
| San Francisco 3 | sfo3 | Current gen |
| Amsterdam 3 | ams3 | Current gen |
| Singapore 1 | sgp1 | Current gen |
| London | lon1 | Current gen |
| Frankfurt | fra1 | Current gen |
| Toronto | tor1 | Current gen |
| Bangalore | blr1 | Current gen |

## Droplet Creation

```hcl
resource "digitalocean_droplet" "web" {
  count    = 3
  name     = "web-${count.index}"
  region   = "nyc3"
  size     = "s-4vcpu-8gb-amd"
  image    = "ubuntu-24-04-x64"
  vpc_uuid = digitalocean_vpc.main.id
  ssh_keys = [data.digitalocean_ssh_key.terraform.id]

  monitoring = true
  backups    = true
  ipv6       = true
  private_networking = true

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y docker.io nginx
    systemctl enable docker
    EOF

  tags = ["production", "web"]
}

resource "digitalocean_project_resources" "web" {
  project = data.digitalocean_project.default.id
  resources = digitalocean_droplet.web[*].urn
}

# Snapshot-based image
resource "digitalocean_droplet_snapshot" "web" {
  droplet_id = digitalocean_droplet.web[0].id
  name       = "web-base-${formatdate("YYYYMMDD", timestamp())}"
}
```

## Floating IPs

```hcl
resource "digitalocean_floating_ip" "web" {
  region = "nyc3"
  droplet_id = digitalocean_droplet.web[0].id
}

# Assign floating IP to another droplet on failover
resource "digitalocean_floating_ip_assignment" "failover" {
  ip_address  = digitalocean_floating_ip.web.ip_address
  droplet_id  = digitalocean_droplet.web[1].id
}

# Floating IP with DNS
resource "digitalocean_record" "www" {
  domain = "example.com"
  type   = "A"
  name   = "www"
  value  = digitalocean_floating_ip.web.ip_address
}
```

## VPC

```hcl
resource "digitalocean_vpc" "main" {
  name     = "production-vpc"
  region   = "nyc3"
  ip_range = "10.10.0.0/16"
}

# Default VPC (if not creating custom)
data "digitalocean_vpc" "default" {
  name = "default-nyc3"
}

# VPC peering
resource "digitalocean_vpc_peering" "app_to_db" {
  name  = "app-to-db"
  vpc_id = digitalocean_vpc.main.id
  peer_vpc_id = digitalocean_vpc.database.id
}
```

## Cloud Firewall

```hcl
resource "digitalocean_firewall" "web" {
  name = "web-tier"

  droplet_ids = digitalocean_droplet.web[*].id
  tags        = ["web"]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["10.10.0.0/16"]
  }
  inbound_rule {
    protocol         = "icmp"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

resource "digitalocean_firewall" "db" {
  name = "db-tier"

  inbound_rule {
    protocol         = "tcp"
    port_range       = "5432"
    source_addresses = ["10.10.0.0/16"]
  }
  inbound_rule {
    protocol         = "tcp"
    port_range       = "3306"
    source_addresses = ["10.10.0.0/16"]
  }
  inbound_rule {
    protocol         = "tcp"
    port_range       = "6379"
    source_addresses = ["10.10.0.0/16"]
  }
}
```

## Load Balancers

```hcl
resource "digitalocean_loadbalancer" "public" {
  name     = "public-lb"
  region   = "nyc3"
  vpc_uuid = digitalocean_vpc.main.id

  forwarding_rule {
    entry_port      = 443
    entry_protocol  = "https"
    target_port     = 80
    target_protocol = "http"
    certificate_name = digitalocean_certificate.letsencrypt.name
    tls_passthrough  = false
  }

  healthcheck {
    port     = 80
    protocol = "http"
    path     = "/health"
    check_interval_seconds   = 10
    response_timeout_seconds = 5
    unhealthy_threshold      = 3
    healthy_threshold        = 5
  }

  sticky_sessions {
    type               = "cookies"
    cookie_name        = "do-lb-session"
    cookie_ttl_seconds = 3600
  }

  droplet_tag = "web"

  disable_lets_encrypt_dns_records = false

  firewall {
    deny = []
    allow = [
      "ip:1.2.3.4",
      "ip:0.0.0.0/0",
    ]
  }
}

resource "digitalocean_certificate" "letsencrypt" {
  name    = "app-cert"
  type    = "lets_encrypt"
  domains = ["app.example.com", "api.example.com"]
}
```

## DNS

```hcl
resource "digitalocean_domain" "main" {
  name = "example.com"
}

resource "digitalocean_record" "www" {
  domain = digitalocean_domain.main.id
  type   = "A"
  name   = "www"
  value  = digitalocean_loadbalancer.public.ip
}

resource "digitalocean_record" "api" {
  domain = digitalocean_domain.main.id
  type   = "CNAME"
  name   = "api"
  value  = "www.example.com."
}

resource "digitalocean_record" "mx" {
  domain       = digitalocean_domain.main.id
  type         = "MX"
  name         = "@"
  priority     = 10
  value        = "mail.example.com."
}

resource "digitalocean_record" "spf" {
  domain = digitalocean_domain.main.id
  type   = "TXT"
  name   = "@"
  value  = "v=spf1 include:_spf.google.com ~all"
}
```

## CLI Commands

```bash
# List regions
doctl compute region list

# Create droplet
doctl compute droplet create web-0 --region nyc3 \
  --size s-4vcpu-8gb-amd --image ubuntu-24-04-x64 \
  --vpc-uuid <vpc-id> --ssh-keys <key-id> \
  --enable-monitoring --enable-backups --tag-names production

# List droplets
doctl compute droplet list --tag-name production

# Create firewall
doctl compute firewall create --name web-tier \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0" \
  --outbound-rules "protocol:tcp,ports:0-65535,address:0.0.0.0/0"

# Create load balancer
doctl compute load-balancer create --name public-lb \
  --region nyc3 --forwarding-rules "entry_protocol:http,entry_port:80,target_protocol:http,target_port:80" \
  --health-check "protocol:http,port:80,path:/health" \
  --tag-name web

# Create floating IP
doctl compute floating-ip create --region nyc3
doctl compute floating-ip assign <ip> <droplet-id>

# Create domain record
doctl compute domain records create example.com \
  --record-type A --record-name www --record-data <ip>

# List VPCs
doctl vpc list

# Create VPC peering
doctl vpc peering create --name app-to-db \
  --vpc-id <vpc1> --peer-vpc-id <vpc2>
```

## Best Practices

- Use VPC for all inter-Droplet communication (not public IPs)
- Deploy across multiple regions for DR
- Use Cloud Firewall as the primary network policy layer
- Enable backups on all production Droplets
- Use monitoring (built-in) and ship metrics to external systems
- Use Floating IPs for zero-downtime failover (not DNS-based)
- Use Load Balancer health checks with custom path
- Enable sticky sessions only when needed (stateless is better)
- Use Let's Encrypt certificates via DO Load Balancer for TLS termination
- Tag all resources (environment, project, owner) for cost tracking
