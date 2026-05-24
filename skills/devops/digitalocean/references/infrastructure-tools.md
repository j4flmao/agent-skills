# Infrastructure Tooling

## Terraform Provider

```hcl
# Provider configuration
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
  # Or use DIGITALOCEAN_TOKEN env variable
}

# Common resources
resource "digitalocean_project" "production" {
  name        = "production"
  description = "Production workloads"
  purpose     = "Web application hosting"
  environment = "Production"
}

resource "digitalocean_tag" "production" {
  name = "production"
}
```

### State Management

```hcl
terraform {
  backend "s3" {
    bucket         = "my-org-terraform-state"
    key            = "digitalocean/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

### Data Sources

```hcl
data "digitalocean_ssh_key" "terraform" {
  name = "terraform-key"
}

data "digitalocean_image" "ubuntu" {
  name = "ubuntu-24-04-x64"
}

data "digitalocean_droplet_snapshot" "web" {
  name_regex  = "^web-base"
  most_recent = true
}

data "digitalocean_domain" "main" {
  name = "example.com"
}

data "digitalocean_vpc" "main" {
  name = "production-vpc"
}

data "digitalocean_project" "default" {
  name = "default"
}

data "digitalocean_kubernetes_cluster" "main" {
  name = "production-doks"
}

data "digitalocean_database_cluster" "postgres" {
  name = "production-pg"
}

data "digitalocean_registry" "main" {
  name = "my-registry"
}

data "digitalocean_account" "current" {}
```

## Pulumi

```typescript
import * as digitalocean from "@pulumi/digitalocean";
import * as pulumi from "@pulumi/pulumi";

const vpc = new digitalocean.Vpc("main", {
  name: "production-vpc",
  region: "nyc3",
  ipRange: "10.10.0.0/16",
});

const firewall = new digitalocean.Firewall("web", {
  name: "web-tier",
  dropletIds: [],
  inboundRules: [{
    protocol: "tcp",
    portRange: "80",
    sourceAddresses: ["0.0.0.0/0", "::/0"],
  }],
  outboundRules: [{
    protocol: "tcp",
    portRange: "1-65535",
    destinationAddresses: ["0.0.0.0/0", "::/0"],
  }],
});

const droplet = new digitalocean.Droplet("web", {
  name: "web-0",
  region: "nyc3",
  size: "s-4vcpu-8gb-amd",
  image: "ubuntu-24-04-x64",
  vpcUuid: vpc.id,
  monitoring: true,
  backups: true,
});

const cluster = new digitalocean.KubernetesCluster("main", {
  name: "production-doks",
  region: "nyc3",
  version: "1.30.5",
  nodePool: {
    name: "worker-pool",
    size: "s-4vcpu-8gb-amd",
    nodeCount: 3,
  },
});

const db = new digitalocean.DatabaseCluster("postgres", {
  name: "production-pg",
  engine: "pg",
  version: "16",
  size: "db-s-4vcpu-8gb",
  region: "nyc3",
  nodeCount: 3,
  vpcUuid: vpc.id,
});

export const dropletIp = droplet.ipv4Address;
export const kubeconfig = cluster.kubeConfigs[0].rawConfig;
```

## doctl CLI

### Authentication

```bash
# Create API token at https://cloud.digitalocean.com/account/api/tokens

# Authenticate
doctl auth init
# Enter your API token when prompted

# List available contexts
doctl auth list

# Use specific context
doctl auth switch --context production
```

### Common Commands

```bash
# Account and projects
doctl account get
doctl project list
doctl project create --name production --purpose "Production web app"

# Droplet operations
doctl compute droplet create web-0 \
  --region nyc3 --size s-4vcpu-8gb-amd \
  --image ubuntu-24-04-x64 --vpc-uuid <id> \
  --ssh-keys <key-id> --enable-monitoring --enable-backups

doctl compute droplet list --tag-name production
doctl compute droplet ssh web-0
doctl compute droplet-action power-cycle <id>
doctl compute droplet-action rebuild <id>

# Kubernetes
doctl kubernetes cluster list
doctl kubernetes cluster kubeconfig save production-doks
doctl kubernetes cluster upgrade production-doks --version 1.31.0

# Database
doctl databases list
doctl databases connection <id>
doctl databases backup list <id>
doctl databases db create <id> appdb

# App Platform
doctl apps list
doctl apps create --spec .do/app.yaml
doctl apps logs <app-id> <deployment-id>
doctl apps create-deployment <app-id>

# Container Registry
doctl registry login
doctl registry repository list
doctl registry garbage-collection start

# Networking
doctl vpc list
doctl vpc create --name production-vpc --region nyc3 --ip-range 10.10.0.0/16
doctl compute firewall list
doctl compute load-balancer list
doctl compute floating-ip list

# Monitoring
doctl monitoring alert list
doctl monitoring alert create \
  --type v1/insights/droplet/cpu \
  --value 80 --compare GreaterThan \
  --window 5m --emails ops@example.com

# Snapshots
doctl compute snapshot list
doctl compute droplet snapshot web-0 --snapshot-name web-backup
```

## Monitoring and Alerting

```hcl
# Terraform: monitoring alerts
resource "digitalocean_monitor_alert" "cpu" {
  type       = "v1/insights/droplet/cpu"
  value      = 80
  compare    = "GreaterThan"
  window     = "5m"
  enabled    = true
  alerts {
    email = ["ops@example.com"]
    slack {
      url     = "https://hooks.slack.com/services/T00/B00/XXXX"
      channel = "#ops-alerts"
    }
  }
}

resource "digitalocean_monitor_alert" "memory" {
  type       = "v1/insights/droplet/memory_utilization_percent"
  value      = 85
  compare    = "GreaterThan"
  window     = "5m"
  enabled    = true
  alerts {
    email = ["ops@example.com"]
  }
}

resource "digitalocean_monitor_alert" "disk" {
  type       = "v1/insights/droplet/disk_utilization_percent"
  value      = 85
  compare    = "GreaterThan"
  window     = "10m"
  enabled    = true
  alerts {
    email = ["ops@example.com"]
  }
}
```

## Spaces (S3-Compatible Object Storage)

```hcl
resource "digitalocean_spaces_bucket" "assets" {
  name   = "app-assets"
  region = "nyc3"
  acl    = "private"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["https://app.example.com"]
    max_age_seconds = 3600
  }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "expire-old"
    enabled = true
    expiration {
      days = 365
    }
  }
}

# CDN for Spaces bucket
resource "digitalocean_spaces_bucket" "public_assets" {
  name   = "app-public-assets"
  region = "nyc3"
  acl    = "public-read"
}

resource "digitalocean_cdn" "assets" {
  origin_name = digitalocean_spaces_bucket.public_assets.name
  origin_region = digitalocean_spaces_bucket.public_assets.region
  ttl          = 3600
  custom_domain = "cdn.example.com"
  certificate_name = digitalocean_certificate.cdn.name
}

# Spaces access keys
resource "digitalocean_spaces_key" "app" {
  name   = "app-spaces-key"
  region = "nyc3"
}
```

## CLI: Spaces

```bash
# Create bucket
doctl spaces list
doctl spaces create app-assets --region nyc3

# Upload file
doctl spaces upload app-assets ./file.jpg file.jpg

# Download file
doctl spaces get app-assets file.jpg ./file.jpg

# Set ACL
doctl spaces set-acl app-assets --acl private

# Enable CDN
doctl spaces cdn add --origin app-assets.nyc3.digitaloceanspaces.com --ttl 3600

# List Space keys
doctl spaces keys list
```

## Best Practices

- Store Terraform state remotely with locking (S3 + DynamoDB)
- Use Pulumi or Terraform for infrastructure-as-code — avoid click-ops
- Tag all resources with project, environment, and owner tags
- Use doctl with CI/CD pipelines (GitHub Actions, GitLab CI)
- Enable monitoring alerts for CPU, memory, disk, and network
- Use Spaces with CDN for static asset delivery
- Enable Space versioning for data protection
- Use Spaces lifecycle policies to manage storage costs
- Rotate API tokens regularly and audit access
- Use the DigitalOcean API directly for complex automation
- Avoid storing secrets in Terraform state — use SPACES_SECRET_KEY env vars
