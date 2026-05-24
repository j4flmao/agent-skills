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
Before activating, verify:
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
This skill is complete when:
- [ ] VPC and networking (firewall, load balancer, DNS) are configured.
- [ ] Droplets or DOKS cluster are provisioned with HA.
- [ ] Managed database is deployed with backups and connection pooling.
- [ ] App Platform or Container Registry is set up.
- [ ] Monitoring and alerting are configured.

## Quick Start
Project → VPC with default firewall → DOKS cluster with 3 node pool → Managed PostgreSQL with HA → Spaces for assets → App Platform from GitHub.

## Core Workflow

### Step 1: VPC and Networking
```hcl
# Terraform: VPC, firewall, and load balancer
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
    entry_port     = 80
    entry_protocol = "http"
    target_port    = 80
    target_protocol = "http"
  }
  forwarding_rule {
    entry_port     = 443
    entry_protocol = "https"
    target_port    = 443
    target_protocol = "https"
  }

  healthcheck {
    port     = 80
    protocol = "http"
    path     = "/health"
  }

  droplet_tag = "web"

  depends_on = [digitalocean_droplet.app]
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
    auto_scale = false
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

# Firewall for the database (allow only VPC and app Droplets)
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
# .do/app.yaml
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
features:
- buildpack
- mariadb
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
  source_dir: /
static_sites:
- build_command: npm run build
  environment_slug: node-js
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/app-frontend
  name: web
  output_dir:
    - dist
  routes:
  - path: /
```

## Rules & Constraints
- Never hardcode DO API tokens — use environment variables (DIGITALOCEAN_TOKEN) or doctl auth
- Always place Droplets and DOKS inside a VPC for private networking
- Use Cloud Firewall over individual Droplet firewalls for centralized management
- Enable backups and monitoring on all Droplets
- All managed databases must have at least 2 nodes for production HA
- Use connection pooling for production database workloads
- Enable Container Registry with subscription tier appropriate for pull volume
- Use Spaces (S3-compatible) for object storage with CDN for public assets
- Tag all resources with environment, project, and team metadata

## References
- `references/droplets-networking.md` — Droplets, VPC, Firewall, LB, DNS
- `references/kubernetes-doks.md` — DOKS, node pools, autoscaling, App Platform
- `references/managed-databases.md` — PostgreSQL, MySQL, Redis, Kafka, HA
- `references/app-platform.md` — App Platform, serverless, auto-deploy, functions
- `references/infrastructure-tools.md` — Terraform, Pulumi, doctl, Spaces

## Handoff
After completing this skill:
- Next skill: **app-platform** — expand App Platform with functions and static sites
- Pass context: VPC ID, DOKS kubeconfig, database connection string, Spaces keys
