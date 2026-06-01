# DigitalOcean Fundamentals

## Overview
DigitalOcean is a cloud infrastructure provider focused on simplicity and developer experience. It offers Droplets (VMs), Kubernetes (DOKS), managed databases, object storage (Spaces), App Platform (PaaS), and networking services.

## Core Concepts

### Regions and Datacenters
DigitalOcean operates in 15+ regions worldwide. Each region has multiple datacenters. Core regions: NYC (1-3), SFO (2-3), AMS (2-3), SGP (1), LON (1), FRA (1), TOR (1), BLR (1). Choose region closest to your users for lowest latency.

### Projects and Teams
Projects organize resources by application or environment. Teams enable collaboration with role-based access. Team roles: owner (full access), billing (cost management), member (resource management), viewer (read-only).

### Droplet Types
General Purpose (s-): balanced CPU/memory (web apps, APIs). CPU-Optimized (c-): high CPU (CI/CD, video encoding). Memory-Optimized (m-): high memory (databases, caching). Storage-Optimized (gd-): high local SSD (databases, analytics). Premium Intel/AMD: Intel Xeon or AMD EPYC processors. Basic: shared CPU for low-traffic applications.

### Networking
VPC: isolated private network for Droplets and DOKS. Cloud Firewall: centralized stateful firewall for all resources. Load Balancer: regional HTTP/HTTPS/TCP load balancing with health checks. Floating IP: static IP address assignable between Droplets. DNS: managed domain name resolution with simple record management.

## Core Services

### Droplets
EC2-equivalent VMs. Available in 30+ configurations (1-96 vCPU, 1-640GB RAM). Choose image: Ubuntu, Debian, CentOS, Fedora, FreeBSD, or custom. Add block storage volumes (up to 16TB each). Enable automatic backups and monitoring.

### DOKS (DigitalOcean Kubernetes)
Managed Kubernetes with automated control plane. Node pools with auto-scaling and auto-repair. Integrated with DO Container Registry and load balancers. One-click cluster creation via control panel or API.

### Managed Databases
PostgreSQL, MySQL, and Redis managed services. Automated backups with point-in-time recovery. Read-only replicas for read scaling. Connection pooling (PgBouncer for PostgreSQL). Maintenance windows for updates.

### Spaces
S3-compatible object storage. CDN integration for public content delivery. Access controls: private (API-only), public (internet accessible). Lifecycle policies for automatic object expiration. Versioning for object protection.

### App Platform
PaaS for containerized applications. Build from GitHub/GitLab directly. Automatic HTTPS, CDN, and scaling. Static sites and serverless functions. No infrastructure management.

## Basic Operations
```bash
# Install doctl
doctl auth init --access-token <token>

# Droplet operations
doctl compute droplet list
doctl compute droplet create my-droplet --region nyc3 --size s-2vcpu-4gb --image ubuntu-24-04-x64

# Kubernetes
doctl kubernetes cluster list
doctl kubernetes cluster kubeconfig save my-cluster

# Database
doctl databases list
doctl databases connection <db-id> --format Host,Port,User,Password

# Storage
doctl spaces list
```
## Best Practices
- Always place Droplets and DOKS inside a VPC.
- Use Cloud Firewall for centralized security rules.
- Enable monitoring and backups on production resources.
- Use managed databases with standby nodes for HA.
- Use connection pooling for production database workloads.
- Tag all resources with environment, project, and team.
- Use Spaces CDN for public asset delivery.
- Use Terraform for infrastructure as code.

## References
- digitalocean-advanced.md -- Advanced DigitalOcean topics
- droplets-networking.md -- Droplets and Networking
- kubernetes-doks.md -- DOKS
- managed-databases.md -- Managed Databases
- app-platform.md -- App Platform
