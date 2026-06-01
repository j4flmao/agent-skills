---
name: digitalocean
description: >
  Use this skill when the user says 'DigitalOcean', 'DO', 'Droplet', 'DOKS',
  'App Platform', 'Spaces', 'Managed Database', 'Floating IP', 'Cloud Firewall',
  'doctl', 'Terraform DigitalOcean', 'VPC', 'Load Balancer', 'DNS', 'Container
  Registry', 'Functions'. Covers: core DO services, Droplets, networking,
  managed databases, Kubernetes, App Platform, infrastructure tooling.
  Do NOT use this for: AWS, Azure, GCP, or other cloud providers.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, cloud, digitalocean, infrastructure, phase-5]
---

# DigitalOcean

## Purpose
Design, deploy, and manage DigitalOcean infrastructure using Terraform, doctl, and best practices for Droplets, Kubernetes, managed databases, and App Platform.

## Agent Protocol

### Trigger
Exact user phrases: "DigitalOcean", "DO", "Droplet", "DOKS", "App Platform", "Spaces", "Managed Database", "Floating IP", "Cloud Firewall", "doctl", "Terraform DigitalOcean", "VPC", "Load Balancer", "Container Registry".

### Input Context
- DO region (nyc1-3, sfo3, ams3, fra1, etc.).
- Team/project structure (team, apps, project).
- Authentication method (DO API token, doctl, Terraform provider).
- Scale requirements (droplet size, cluster node count, HA needs).

### Output Artifact
Writes to Terraform HCL, doctl CLI commands, YAML manifests, configuration files.

### Response Format
HCL, YAML, or CLI commands with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- VPC and networking (firewall, load balancer, DNS) are configured.
- Droplets or DOKS cluster are provisioned with HA.
- Managed database is deployed with backups and connection pooling.
- App Platform or Container Registry is set up.
- Monitoring and alerting are configured.

## Architecture / Decision Trees

### Compute Decision Tree
- Simple app, no container orchestration: Droplets with load balancer.
- Containerized apps, need orchestration: DOKS (DigitalOcean Kubernetes).
- Serverless / PaaS: App Platform (build from GitHub, auto-deploy).
- Batch / background jobs: Droplets or Functions.
- GPU / ML workloads: Droplets with GPU plans.

### Database Decision Tree
- Relational, need managed: Managed PostgreSQL or MySQL.
- Key-value, caching: Managed Redis.
- Document / NoSQL: Self-managed on Droplets (no managed MongoDB).
- Time-series: Self-managed TimescaleDB on Managed PostgreSQL.
- Need HA: 2-3 node database cluster with standby.

### Storage Decision Tree
- Object storage: Spaces (S3-compatible) + CDN for public assets.
- Block storage: Volume attachment to Droplets (up to 16TB).
- Container images: Container Registry.
- Backup: Spaces + automated snapshot schedules.
- Archive: Spaces with lifecycle policies.

### Networking Decision Tree
- Single region, simple: VPC with default firewall.
- Multi-tier app: VPC + Cloud Firewall + Load Balancer.
- Private database: VPC + database firewall rules.
- Global presence: Spaces CDN + multiple regions + DNS failover.
- High availability: Load Balancer + multi-droplet backend + Floating IP.

## Core Workflow

### Step 1: VPC and Networking
```hcl
resource "digitalocean_vpc" "main" {
  name     = "production-vpc"
  region   = "nyc3"
  ip_range = "10.10.0.0/16"
}

resource "digitalocean_firewall" "web" {
  name = "web-firewall"

  droplet_ids = [for d in digitalocean_droplet.app : d.id]

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
```

### Step 2: Droplets with Load Balancer
```hcl
resource "digitalocean_droplet" "app" {
  count    = 3
  name     = "app-${count.index}"
  region   = "nyc3"
  size     = "s-4vcpu-8gb"
  image    = "ubuntu-24-04-x64"
  vpc_uuid = digitalocean_vpc.main.id
  ssh_keys = [data.digitalocean_ssh_key.terraform.id]

  monitoring = true
  backups    = true

  user_data = <<-EOF
    #!/bin/bash
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
  EOF

  tags = ["production", "web"]
}

resource "digitalocean_loadbalancer" "public" {
  name     = "public-lb"
  region   = "nyc3"
  vpc_uuid = digitalocean_vpc.main.id

  forwarding_rule {
    entry_port      = 443
    entry_protocol  = "https"
    target_port     = 80
    target_protocol = "http"
    certificate_name = digitalocean_certificate.main.name
  }

  healthcheck {
    port     = 80
    protocol = "http"
    path     = "/health"
  }

  droplet_tag = "web"
}
```

### Step 3: DOKS Cluster
```hcl
resource "digitalocean_kubernetes_cluster" "main" {
  name    = "production-doks"
  region  = "nyc3"
  version = "1.30.5"

  node_pool {
    name       = "worker-pool"
    size       = "s-4vcpu-8gb"
    node_count = 3
    auto_scale = true
    min_nodes  = 1
    max_nodes  = 5
    tags       = ["production"]
  }

  maintenance_policy {
    day        = "sunday"
    start_time = "04:00"
  }
}

resource "digitalocean_container_registry" "main" {
  name                   = "app-registry"
  subscription_tier_slug = "professional"
  region                 = "nyc3"
}
```

### Step 4: Managed Database
```hcl
resource "digitalocean_database_cluster" "postgres" {
  name       = "production-pg"
  engine     = "pg"
  version    = "16"
  size       = "db-s-4vcpu-8gb"
  region     = "nyc3"
  node_count = 3
  vpc_uuid   = digitalocean_vpc.main.id

  maintenance_window {
    day  = "sunday"
    hour = "03:00:00"
  }
  backup_restore {
    database_name = "production-pg-backup"
    backup_created_at = "2024-01-01T00:00:00Z"
  }
}

resource "digitalocean_database_db" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "appdb"
}

resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "appuser"
}

resource "digitalocean_database_connection_pool" "default" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "pool-default"
  mode       = "transaction"
  size       = 20
  db_name    = "appdb"
  user       = "appuser"
}

resource "digitalocean_database_firewall" "main" {
  cluster_id = digitalocean_database_cluster.postgres.id

  rule {
    type  = "droplet"
    value = digitalocean_droplet.app[0].id
  }
  rule {
    type  = "k8s"
    value = digitalocean_kubernetes_cluster.main.id
  }
}
```

### Step 5: App Platform
```yaml
alerts:
- rule: DEPLOYMENT_FAILED
- rule: DOMAIN_FAILED
databases:
- engine: PG
  name: appdb
  num_nodes: 3
  production: true
  version: "16"
envs:
- key: APP_ENV
  value: production
  scope: RUN_TIME
features:
- buildpack
ingress:
  rules:
  - component:
      name: api
    match:
      path:
        prefix: "/api"
name: app-tutorial
region: nyc
services:
- build_command: npm run build
  environment_slug: node-js
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/app-repo
  health_check:
    http_path: /health
  http_port: 3000
  instance_count: 3
  instance_size_slug: professional-s
  name: api
  run_command: npm start
static_sites:
- build_command: npm run build
  environment_slug: node-js
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/app-frontend
  name: web
  output_dir: [dist]
  routes:
  - path: /
```

### Step 6: DNS and Certificate
```hcl
resource "digitalocean_domain" "main" {
  name = "example.com"
}

resource "digitalocean_record" "www" {
  domain = digitalocean_domain.main.name
  type   = "A"
  name   = "www"
  value  = digitalocean_loadbalancer.public.ip
}

resource "digitalocean_certificate" "main" {
  name    = "wildcard-cert"
  type    = "lets_encrypt"
  domains = ["example.com", "*.example.com"]
}

resource "digitalocean_cdn" "spaces" {
  origin           = digitalocean_spaces_bucket.assets.bucket_domain_name
  ttl              = 3600
  certificate_name = digitalocean_certificate.main.name
  custom_domain    = "assets.example.com"
}
```

### Step 7: Spaces Object Storage
```hcl
resource "digitalocean_spaces_bucket" "assets" {
  name   = "app-assets-prod"
  region = "nyc3"
  acl    = "public-read"
  versioning {
    enabled = true
  }
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["https://example.com"]
    max_age_seconds = 3600
  }
  lifecycle_rule {
    enabled = true
    expiration {
      days = 365
    }
    noncurrent_version_expiration {
      days = 90
    }
  }
}

resource "digitalocean_spaces_bucket" "backups" {
  name   = "app-backups-prod"
  region = "nyc3"
  acl    = "private"
}
```

### Step 8: Monitoring and Alerts
```hcl
resource "digitalocean_monitor_alert" "cpu" {
  type       = "v1/insights/droplet/cpu"
  value      = 90
  window     = "5m"
  compare    = "GreaterThan"
  entities   = [for d in digitalocean_droplet.app : d.id]
  alerts {
    email = ["ops@example.com"]
    slack {
      url = "https://hooks.slack.com/services/..."
    }
  }
}

resource "digitalocean_monitor_alert" "disk" {
  type       = "v1/insights/droplet/disk"
  value      = 85
  window     = "5m"
  compare    = "GreaterThan"
  entities   = [for d in digitalocean_droplet.app : d.id]
  alerts {
    email = ["ops@example.com"]
  }
}
```

## Tool Comparison

### DO Services vs AWS/Azure/GCP

| DO Service | AWS Equivalent | Azure Equivalent | GCP Equivalent |
|---|---|---|---|
| Droplet | EC2 | VM | Compute Engine |
| DOKS | EKS | AKS | GKE |
| Spaces | S3 | Blob Storage | Cloud Storage |
| Managed PostgreSQL | RDS | Database for PostgreSQL | Cloud SQL |
| Managed Redis | ElastiCache | Cache for Redis | Memorystore |
| App Platform | Elastic Beanstalk / App Runner | App Service | Cloud Run |
| Container Registry | ECR | ACR | Artifact Registry |
| Cloud Firewall | Security Groups | NSG | VPC Firewall Rules |
| Load Balancer | ALB/NLB | Load Balancer | Cloud LB |
| VPC | VPC | VNet | VPC |
| Floating IP | Elastic IP | Public IP | Static IP |
| Functions | Lambda | Functions | Cloud Functions |
| Spaces CDN | CloudFront | CDN | Cloud CDN |
| Monitoring | CloudWatch | Monitor | Cloud Monitoring |
| DNS | Route 53 | DNS | Cloud DNS |

### Droplet Sizing Guide

| Plan | vCPU | RAM | SSD | Price/hr | Use Case |
|---|---|---|---|---|---|
| s-2vcpu-4gb | 2 | 4GB | 80GB | $0.059 | Small web apps |
| s-4vcpu-8gb | 4 | 8GB | 160GB | $0.119 | Medium apps |
| s-8vcpu-16gb | 8 | 16GB | 320GB | $0.238 | Large apps |
| c-2 | 2 | 4GB | 50GB | $0.060 | CPU-optimized |
| c-4 | 4 | 8GB | 100GB | $0.119 | CPU-optimized |
| m-6vcpu-32gb | 6 | 32GB | 200GB | $0.238 | Memory-optimized |
| g-2vcpu-8gb | 2 | 8GB | 25GB | $0.090 | GPU inference |

## Anti-Patterns

### Anti-Pattern 1: Public Droplets Without VPC
Placing Droplets outside a VPC exposes them to the public internet by default. Attackers can probe SSH, databases, and application ports. Always place Droplets and DOKS inside a VPC. Use Cloud Firewall for centralized egress/ingress rules.

### Anti-Pattern 2: Single Node Database
A single-node managed database has no failover capability. If the node goes down, the database is unavailable until recovery is complete. Always use at least 2 nodes (standby) for production databases. 3 nodes with automatic failover for HA.

### Anti-Pattern 3: No Connection Pooling
Direct database connections from application code exhaust database connection limits under load. Each Droplet or DOKS pod opens N connections to the database. Use PgBouncer (built-in connection pooling for DO Managed PostgreSQL).

### Anti-Pattern 4: Ignoring Backups
Without automated backups, data loss from accidental deletion, corruption, or failed migration is permanent. Enable backups on all Droplets, databases, and Spaces. Test backup restoration quarterly.

### Anti-Pattern 5: Overprovisioning Without Monitoring
Choosing oversized Droplets without monitoring leads to wasted spend. Start with s-2vcpu-4gb, monitor CPU/memory/disk, right-size based on 14-day utilization. Enable DO monitoring for all resources.

### Anti-Pattern 6: No Tags on Resources
Without tags (environment, project, team), cost allocation and resource management become manual and error-prone. Tag all resources. Use tags in monitoring and cost reports.

## Production Considerations

### High Availability Architecture
- Multi-droplet backend (3+) behind load balancer.
- DOKS cluster with 3+ nodes across different workers.
- Managed database with 2-3 nodes and automatic failover.
- Spaces with CDN for static assets.
- DNS failover with health checks.
- Floating IP for manual failover scenarios.

### Security
- Always use Cloud Firewall -- never rely on Droplet-level iptables alone.
- Restrict SSH access to VPC IP range or bastion host.
- Enable DO monitoring for security event detection.
- Use Container Registry with limited access scopes.
- Rotate DO API tokens regularly.
- Enable automatic security updates on Droplets.
- Use SSH keys, never passwords.
- Database firewall restricts to VPC resources only.

### Cost Optimization
- Use CPU-optimized (c-) Droplets for compute-heavy workloads.
- Use memory-optimized (m-) Droplets for in-memory workloads.
- Right-size based on 14-day DO monitoring data.
- Use Reserved Droplets for baseline capacity (up to 30% discount).
- Enable backups only on critical Droplets.
- Clean up unattached volumes and unused Floating IPs.

## Troubleshooting

### Droplet Issues
1. Check Droplet console in DO control panel.
2. Verify SSH key and IP whitelist.
3. Check Cloud Firewall rules (order matters, first match wins).
4. Verify VPC membership.
5. Check resource usage: htop, df -h, free -m.

### DOKS Issues
1. Get kubeconfig: doctl kubernetes cluster kubeconfig save <name>.
2. Check node status: kubectl get nodes.
3. Check pod issues: kubectl describe pod <name>.
4. Check load balancer health: verify health check path.
5. Check Container Registry access: doctl registry login.

### Database Issues
1. Check DO control panel for database status.
2. Verify database firewall allows application IP/VPC.
3. Check connection pool saturation.
4. Review database logs.
5. Verify backup and restore process.

## Rules
- Never hardcode DO API tokens -- use DIGITALOCEAN_TOKEN env var or doctl auth.
- Always place Droplets and DOKS inside a VPC for private networking.
- Use Cloud Firewall over individual Droplet firewalls for centralized management.
- Enable monitoring and backups on all production Droplets.
- All managed databases must have at least 2 nodes for production HA.
- Use connection pooling for production database workloads.
- Enable Container Registry with appropriate subscription tier.
- Use Spaces with CDN for public object storage.
- Tag all resources with environment, project, and team metadata.
- Use Terraform for all infrastructure -- never manual control panel changes.
- Test backup restoration at least quarterly.
- Set budget alerts for all projects.
- Use Floating IP for zero-downtime manual failover scenarios.

## References
- references/app-platform.md -- App Platform
- references/digitalocean-advanced.md -- Digitalocean Advanced Topics
- references/digitalocean-fundamentals.md -- Digitalocean Fundamentals
- references/droplets-networking.md -- Droplets and Networking
- references/infrastructure-tools.md -- Infrastructure Tooling
- references/kubernetes-doks.md -- DOKS (DigitalOcean Kubernetes)
- references/managed-databases.md -- Managed Databases

## Handoff
After completing this skill:
- Next skill: app-platform -- expand App Platform with functions and static sites
- Pass context: VPC ID, DOKS kubeconfig, database connection string, Spaces keys
