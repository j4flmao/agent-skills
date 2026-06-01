---
name: devops-gcp
description: |
  Trigger: "GCP", "Google Cloud", "Google Kubernetes Engine", "GKE",
  "Cloud Run", "Cloud Functions", "Cloud Storage", "Cloud SQL",
  "Terraform GCP", "gcloud CLI", "Cloud Build"
  Exclusion: Not for AWS or Azure -- use those specific skills.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, cloud, gcp, phase-7]
---

# devops-gcp

## Purpose
Provision and operate Google Cloud infrastructure using GKE, Cloud Run, Cloud Functions, Terraform, and GCP-native networking with cost optimization, IAM security, and observability.

## Agent Protocol

### Trigger
Any user message referencing GCP services, GKE, Cloud Run, Cloud Functions, gcloud CLI, Cloud Build, or Terraform with GCP provider.

### Input Context
GCP service required, region/zone, organization/folder/project hierarchy, compliance requirements, and budget constraints.

### Output Artifact
Terraform/Deployment Manager configs, gcloud CLI commands, GKE cluster config, Cloud Run service definitions, networking architecture, IAM policies, monitoring setup.

### Response Format
Terraform/gcloud CLI commands with explanations. YAML configs for GKE and Cloud Run.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
GKE cluster running, Cloud Run service deployed, networking secured, CI/CD pipeline passing, monitoring configured, IAM least-privilege enforced, cost budgets active.

## Architecture / Decision Trees

### Compute Pattern Selection

| Workload Type | Recommended Service | Reason |
|---|---|---|
| Stateless HTTP | Cloud Run | Scale-to-zero, pay-per-request, simplest |
| Stateful / complex | GKE (Standard) | Custom node pools, GPUs, StatefulSets |
| Simple event-driven | Cloud Functions (2nd gen) | Eventarc, Pub/Sub, Storage triggers |
| Batch / background | Cloud Run Jobs | Containerized batch, retries, timeout |
| Data warehouse | BigQuery | Serverless, slot commitments, BI Engine |
| ML training | GKE with GPUs | Custom hardware, distributed training |
| Web hosting | Cloud Storage + LB | Static sites, CDN, global LB |

### GKE Cluster Mode Decision Tree
- Small team, no node management: Autopilot (serverless, PSA enforced, pay-per-pod).
- Full control, custom hardware: Standard with node pools, taints, GPUs.
- Multi-region HA: Regional cluster in 3 zones.
- Cost-sensitive: Preemptible/Spot node pools for batch.
- Compliance-heavy: Private cluster with VPC Service Controls.

### Networking Pattern Decision Tree
- Single project: VPC with subnets per environment.
- Multi-project: Shared VPC (host project, service projects).
- On-prem connectivity: Cloud VPN (low cost) or Dedicated Interconnect (high throughput).
- Internet-facing: Cloud LB + Cloud Armor WAF.
- Private services: Private Google Access + VPC SC perimeters.

### Database Selection

| Requirement | Service | Best For |
|---|---|---|
| Relational, managed | Cloud SQL | MySQL, PostgreSQL, SQL Server |
| NoSQL, high throughput | Firestore / Bigtable | Real-time, IoT, large-scale |
| Data warehouse | BigQuery | Analytics, reporting, ML |
| In-memory, cache | Memorystore | Redis, Memcached |
| Spanner | Cloud Spanner | Global, strong consistency, horizontal scale |

## Core Workflow

### Step 1: Project and Organization Setup
```hcl
# Resource hierarchy: Organization > Folder > Project > Resources
resource "google_folder" "engineering" {
  display_name = "Engineering"
  parent       = "organizations/123456789"
}

resource "google_project" "production" {
  name       = "Production Project"
  project_id = "prod-${var.service_name}"
  folder_id  = google_folder.engineering.id
  billing_account = "012345-ABCDEF-012345"
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "cloudrun.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudbuild.googleapis.com",
  ])
  project = google_project.production.project_id
  service = each.key
}
```

### Step 2: VPC and Networking
```hcl
resource "google_compute_network" "main" {
  name                    = "main-vpc"
  project                 = google_project.production.project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "app" {
  name          = "app-subnet"
  project       = google_project.production.project_id
  network       = google_compute_network.main.name
  region        = "us-central1"
  ip_cidr_range = "10.0.1.0/24"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }

  private_ip_google_access = true
}

resource "google_compute_router" "nat" {
  name    = "nat-router"
  region  = "us-central1"
  network = google_compute_network.main.name
}

resource "google_compute_router_nat" "main" {
  name                               = "nat-config"
  router                             = google_compute_router.nat.name
  region                             = "us-central1"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

### Step 3: GKE Cluster (Standard)
```hcl
resource "google_service_account" "gke_sa" {
  project      = google_project.production.project_id
  account_id   = "gke-sa"
  display_name = "GKE Service Account"
}

resource "google_container_cluster" "primary" {
  name     = "primary-cluster"
  location = "us-central1"
  project  = google_project.production.project_id

  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.app.name

  remove_default_node_pool = true
  initial_node_count       = 1

  # VPC-native (alias IP)
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${google_project.production.project_id}.svc.id.goog"
  }

  # Private cluster
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Security
  enable_shielded_nodes = true
  enable_intranode_visibility = true

  # Maintenance
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Monitoring
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
  }

  datapath_provider = "ADVANCED_DATAPATH"
  networking_mode   = "VPC_NATIVE"
}

resource "google_container_node_pool" "primary_nodes" {
  name     = "primary-pool"
  location = "us-central1"
  cluster  = google_container_cluster.primary.name
  project  = google_project.production.project_id

  initial_node_count = 3
  autoscaling {
    min_node_count = 1
    max_node_count = 5
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-standard"
    service_account = google_service_account.gke_sa.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    labels = {
      environment = "production"
      pool        = "primary"
    }
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}
```

### Step 4: Cloud Run Service
```hcl
resource "google_cloud_run_v2_service" "api" {
  name     = "api-service"
  location = "us-central1"
  project  = google_project.production.project_id

  template {
    revision = "api-v1"

    containers {
      image = "us-central1-docker.pkg.dev/${google_project.production.project_id}/app-repo/api:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "DATABASE_URL"
        value = "postgres://user:pass@cloudsql-instance:5432/appdb"
      }
      env {
        name = "GOOGLE_CLOUD_PROJECT"
        value = google_project.production.project_id
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        http_get {
          path = "/health/ready"
        }
        initial_delay_seconds = 0
        timeout_seconds       = 240
        period_seconds        = 240
        failure_threshold     = 1
      }

      liveness_probe {
        http_get {
          path = "/health/live"
        }
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    service_account = google_service_account.cloud_run_sa.email

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "ALL_TRAFFIC"
    }
  }

  depends_on = [
    google_project_service.apis
  ]
}

# Allow unauthenticated invocations (if public API)
resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.api.location
  project  = google_cloud_run_v2_service.api.project
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

### Step 5: Cloud SQL
```hcl
resource "google_sql_database_instance" "postgres" {
  name             = "app-db"
  database_version = "POSTGRES_16"
  region           = "us-central1"
  project          = google_project.production.project_id

  settings {
    tier              = "db-custom-2-7680"
    disk_size         = 100
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    disk_autoresize_limit = 500
    availability_type = "REGIONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
      require_ssl     = true
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day  = 7  # Sunday
      hour = 3  # 3am
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    deny_maintenance_period {
      end_date   = "2024-12-31"
      start_date = "2024-01-01"
      time       = "05:00"
    }
  }
  deletion_protection = true
}
```

### Step 6: Cloud Build CI/CD
```yaml
steps:
  - name: "gcr.io/cloud-builders/docker"
    args:
      - build
      - -t
      - "us-central1-docker.pkg.dev/$PROJECT_ID/app-repo/api:$SHORT_SHA"
      - .
  - name: "gcr.io/cloud-builders/docker"
    args:
      - push
      - "us-central1-docker.pkg.dev/$PROJECT_ID/app-repo/api:$SHORT_SHA"
  - name: "gcr.io/google.com/cloudsdktool/google-cloud-cli:stable"
    entrypoint: gcloud
    args:
      - run
      - deploy
      - api-service
      - --image=us-central1-docker.pkg.dev/$PROJECT_ID/app-repo/api:$SHORT_SHA
      - --region=us-central1
      - --platform=managed
images:
  - "us-central1-docker.pkg.dev/$PROJECT_ID/app-repo/api:$SHORT_SHA"
```

### Step 7: IAM and Security
```hcl
# Custom IAM role with least privilege
resource "google_project_iam_custom_role" "app_deployer" {
  project     = google_project.production.project_id
  role_id     = "appDeployer"
  title       = "Application Deployer"
  description = "Permissions for deploying applications"
  permissions = [
    "run.services.update",
    "run.services.get",
    "cloudbuild.builds.create",
    "cloudbuild.builds.get",
    "artifactregistry.repositories.downloadArtifacts",
    "artifactregistry.repositories.uploadArtifacts",
  ]
}

# Service account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  project      = google_project.production.project_id
  account_id   = "cloud-run-sa"
  display_name = "Cloud Run Service Account"
}

# Workload Identity binding
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.gke_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${google_project.production.project_id}.svc.id.goog[default/default]"
}

# IAM condition: restrict to specific IP range
data "google_iam_policy" "restricted" {
  binding {
    role = "roles/storage.objectViewer"
    members = ["user:dev@example.com"]
    condition {
      title       = "office_ip"
      description = "Only allow access from office IP"
      expression  = "request.ip.matches('203.0.113.0/24')"
    }
  }
}
```

## Anti-Patterns

### Anti-Pattern 1: Service Account Keys in Pods
Storing GCP service account keys as Kubernetes secrets creates credential management burden and rotation complexity. Use Workload Identity: annotate K8s SA with IAM SA email -- no keys needed.

### Anti-Pattern 2: Public IP on GKE Nodes
Assigning public IPs to GKE node pools exposes attack surface. Use Cloud NAT for egress, private nodes for workloads. All node-to-node traffic stays within VPC.

### Anti-Pattern 3: Default Service Account
Using the Compute Engine default service account on GKE nodes grants excessive permissions. Create least-privilege service accounts per workload. Use separate SAs per environment.

### Anti-Pattern 4: No VPC Service Controls
Without VPC SC perimeters, data in Cloud Storage and BigQuery is accessible from any network. Create perimeters around sensitive data to prevent exfiltration.

### Anti-Pattern 5: Ignoring Budget Alerts
Deploying production workloads without budget alerts risks unexpected bills. Always configure budget alerts at 50%, 80%, 100%, and 150% before any deployment.

### Anti-Pattern 6: Using Default VPC
Default VPCs have wide-open firewall rules and auto-created subnets. Create custom VPCs with private networking, specific CIDR ranges, and least-privilege firewall rules.

### Anti-Pattern 7: Overprovisioning Cloud Run
Setting max-instances too high risks cost spikes under load. Setting min-instances too high wastes money on idle. Start with min=0, max=10. Tune based on traffic patterns.

## Production Considerations

### Security
- Workload Identity over service account keys for GKE to GCP auth.
- Cloud Armor WAF policies for all internet-facing LBs.
- VPC Service Controls for sensitive data perimeters.
- Binary Authorization for container deployment attestation.
- Secret Manager for secrets -- never in ConfigMaps or env vars.
- IAM Conditions for time-bound, IP-restricted access.
- Cloud Audit Logs enabled for all services.

### Cost Optimization
- Preemptible/Spot for stateless batch and worker workloads.
- Committed Use Discounts for stable baseline capacity.
- Cloud Run scale-to-zero for non-critical services.
- BigQuery slot commitments for predictable analytics costs.
- Label all resources for cost allocation.

### Observability
- Managed Prometheus for GKE monitoring.
- Cloud Logging with log-based metrics.
- Cloud Trace for distributed tracing.
- Cloud Profiler for continuous performance profiling.
- Uptime checks for external endpoint monitoring.
- Error Reporting for automatic exception grouping.

## Rules
- Workload Identity over service account keys for GKE auth.
- Cloud Run for stateless services, GKE for stateful workloads.
- Cloud Armor WAF for internet-facing LBs.
- VPC Service Controls for sensitive data perimeters.
- Cloud Build + Cloud Deploy for CI/CD with Skaffold.
- Artifact Registry over Container Registry (new standard).
- Resource labels for cost allocation and organization.
- Cloud Audit Logs enabled for all services.
- IAM least privilege -- custom roles over predefined.
- Budget alerts before any production deployment.
- Shared VPC over peering for multi-project networking.
- Preemptible/Spot for stateless batch workloads.
- Cloud NAT for private cluster egress.
- Managed Prometheus for GKE monitoring.
- VPC-native clusters for pod IP addressability.
- Regional clusters over zonal for workload HA.
- Secret Manager for secrets.

## References
- references/gcp-advanced.md -- Gcp Advanced Topics
- references/gcp-compute.md -- GCP Compute
- references/gcp-data-ai.md -- GCP Data and AI
- references/gcp-devops.md -- Google Cloud DevOps
- references/gcp-fundamentals.md -- Gcp Fundamentals
- references/gcp-gke.md -- GCP GKE
- references/gcp-infrastructure.md -- Google Cloud Infrastructure
- references/gcp-serverless.md -- GCP Serverless

## Handoff
Hand off to GCP for Google Cloud-specific provisioning or CI/CD. Hand off to terraform for multi-cloud IaC. Hand off to kubernetes-patterns for workload manifests on GKE.
