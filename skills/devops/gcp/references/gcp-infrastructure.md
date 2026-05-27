# Google Cloud Infrastructure

## GKE Cluster Setup

```hcl
resource "google_container_cluster" "primary" {
  name     = "gke-${var.environment}"
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "10.0.0.0/28"
  }

  cluster_autoscaling {
    enabled = true
    resource_limits {
      resource_type = "cpu"
      minimum       = 2
      maximum       = 100
    }
    resource_limits {
      resource_type = "memory"
      minimum       = 4
      maximum       = 400
    }
  }

  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "primary-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.node_count

  autoscaling {
    min_node_count = var.autoscaling_min
    max_node_count = var.autoscaling_max
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.node_machine_type
    disk_size_gb = var.node_disk_size
    disk_type    = "pd-standard"
    image_type   = "COS_CONTAINERD"

    service_account = google_service_account.gke.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    labels = {
      environment = var.environment
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }
}
```

## Cloud SQL Setup

```hcl
resource "google_sql_database_instance" "postgres" {
  name             = "pg-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.db_tier
    disk_size         = var.db_disk_size
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    disk_autoresize_limit = 500

    availability_type = "REGIONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }

    maintenance_window {
      day          = 1
      hour         = 3
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 4500
      record_application_tags = true
      record_client_address   = true
    }
  }

  deletion_protection = var.environment == "production"
}
```

## Cloud Storage

```hcl
resource "google_storage_bucket" "assets" {
  name                        = "assets-${var.environment}-${var.project_id}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  retention_policy {
    retention_period = 86400
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.bucket.self_link
  }
}
```

## Key Points

- Use Google Cloud Provider with Terraform for GCP management
- Enable VPC-native clusters for GKE networking
- Use private clusters with authorized networks
- Configure cluster autoscaling and node auto-repair
- Use regional Cloud SQL for high availability
- Enable point-in-time recovery for databases
- Use Cloud Storage with lifecycle policies
- Enable uniform bucket-level access
- Use Cloud NAT for private cluster egress
- Implement Cloud Armor for WAF protection
- Use Cloud Monitoring for observability
- Enable audit logging with Cloud Audit Logs
