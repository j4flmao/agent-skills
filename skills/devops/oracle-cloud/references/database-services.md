# Database Services

## Autonomous Database (ATP/ADW)

```hcl
# Autonomous Transaction Processing (ATP)
resource "oci_database_autonomous_database" "atp" {
  compartment_id       = var.compartment_ocid
  display_name         = "app-atp"
  db_name              = "APPDB"
  db_workload          = "OLTP"
  db_version           = "19c"
  is_free_tier         = false
  license_model        = "LICENSE_INCLUDED"
  cpu_core_count       = 4
  data_storage_size_in_tbs = 1
  admin_password       = var.atp_admin_password

  # Auto scaling (up to 3x base)
  is_auto_scaling_enabled = true

  # Network access
  subnet_id          = oci_core_subnet.private.id
  nsg_ids            = [oci_core_network_security_group.db.id]
  private_endpoint_label = "atp-private"

  # Backup and retention
  backup_retention_period_in_days = 60
  is_auto_backup_enabled           = true

  # Data Guard / DR
  is_data_guard_enabled            = false
  standby_whitelist_ips            = []

  # Encryption
  kms_key_id = oci_kms_key.app.id
  vault_id   = oci_kms_vault.main.id

  # Maintenance
  scheduled_operations {
    day_of_week {
      name = "SATURDAY"
    }
    scheduled_start_time {
      hours   = 3
      minutes = 0
    }
    duration = "PT3H"
  }
}

# Autonomous Data Warehouse (ADW)
resource "oci_database_autonomous_database" "adw" {
  compartment_id = var.compartment_ocid
  display_name   = "warehouse-adw"
  db_name        = "WAREHOUSE"
  db_workload    = "DW"
  cpu_core_count = 8
  data_storage_size_in_tbs = 5
}
```

## MySQL HeatWave

```hcl
resource "oci_mysql_mysql_db_system" "heatwave" {
  compartment_id        = var.compartment_ocid
  display_name          = "app-mysql"
  db_system_shape_name  = "MySQL.VM.Standard.E4.8"
  admin_username        = "admin"
  admin_password        = var.mysql_password
  data_storage_size_in_gb = 500

  subnet_id = oci_core_subnet.private.id

  backup_policy {
    is_enabled        = true
    retention_in_days = 30
    window_start_time = "02:00"
  }

  maintenance {
    window_start_time = "sun:04:00"
  }

  # HeatWave cluster for analytics
  heatwave_cluster {
    cluster_size = 3
    shape_name   = "MySQL.HeatWave.VM.Standard.E3.8"
  }

  data_storage {
    is_auto_expand_enabled = true
    max_storage_size_in_gb = 2048
  }

  configuration_id = data.oci_mysql_mysql_configurations.heatwave.configurations[0].id

  is_highly_available = true
}
```

## Exadata

```hcl
# Exadata Cloud Service (X9M/ExaCC)
resource "oci_database_exadata_infrastructure" "exa" {
  compartment_id            = var.compartment_ocid
  display_name              = "exadata-x9m"
  shape                     = "Exadata.X9M"
  compute_count             = 4
  storage_count             = 3
  cloud_control_plane_server1 = "10.0.10.10"
  cloud_control_plane_server2 = "10.0.10.11"
  netmask                   = "255.255.255.0"
  gateway                   = "10.0.10.1"
  dns_server                = ["10.0.0.53"]
  ntp_server                = ["0.pool.ntp.org"]
  time_zone                 = "UTC"
  admin_network_cidr        = "10.0.20.0/24"

  maintenance_window {
    preference = "PREFERRED"
    months {
      name = "JANUARY"
    }
    weeks_of_month = [2]
    days_of_week   = ["SATURDAY"]
    hours_of_day   = [4]
  }
}

# VM cluster on Exadata
resource "oci_database_vm_cluster" "vm" {
  compartment_id           = var.compartment_ocid
  display_name             = "exa-vm-cluster"
  exadata_infrastructure_id = oci_database_exadata_infrastructure.exa.id
  gi_version               = "19.0.0.0"
  cpu_core_count           = 8
  data_storage_size_in_tbs = 15
  ssh_public_keys          = [file("~/.ssh/id_rsa.pub")]
  license_model            = "LICENSE_INCLUDED"
  time_zone                = "UTC"
  is_local_backup_enabled  = true
  sparse_diskgroup_enabled = true
}
```

## PostgreSQL (OCI Native)

```hcl
resource "oci_psql_db_system" "pg" {
  compartment_id    = var.compartment_ocid
  display_name      = "app-postgres"
  db_version        = "15.4"
  shape             = "VM.Standard.E4.Flex"
  instance_count    = 3
  instance_ocpu_count = 4
  instance_memory_size_in_gbs = 64
  storage_in_gbs    = 500

  network_details {
    subnet_id = oci_core_subnet.private.id
    nsg_id    = oci_core_network_security_group.db.id
  }

  credentials {
    password_details {
      password_type = "PLAIN_TEXT"
      password      = var.pg_password
    }
    username = "dbadmin"
  }

  backup_policy {
    backup_retention_period_in_days = 30
    backup_start_time               = "02:00"
  }

  maintenance_window {
    days = ["SATURDAY"]
    start_hour = 4
    start_minute = 0
  }
}
```

## NoSQL Database

```hcl
resource "oci_nosql_table" "sessions" {
  compartment_id = var.compartment_ocid
  name           = "user_sessions"
  ddl_statement  = <<-EOF
    CREATE TABLE user_sessions (
      user_id STRING,
      session_id STRING,
      created_at TIMESTAMP,
      expires_at TIMESTAMP,
      metadata JSON,
      PRIMARY KEY (user_id, session_id)
    )
  EOF

  table_limits {
    max_read_units  = 50
    max_write_units = 50
    max_storage_in_gbs = 10
  }
}
```

## Data Guard and Disaster Recovery

```hcl
# Cross-region Autonomous Data Guard
resource "oci_database_autonomous_database" "standby" {
  compartment_id  = var.dr_compartment_ocid
  display_name    = "app-atp-standby"
  db_name         = "APPDBSTBY"
  db_workload     = "OLTP"
  is_free_tier    = false
  cpu_core_count  = 2
  data_storage_size_in_tbs = 1

  # DR configuration
  is_data_guard_enabled = true
  source_id          = oci_database_autonomous_database.atp.id
  source_label       = "atp-prod"

  # Cross-region remote peer
  remote_disaster_recovery_type     = "CROSS_REGION"
  remote_region                     = "us-phoenix-1"
  remote_compartment_id             = var.dr_compartment_ocid
}
```

## CLI Commands

```bash
# Create ATP database
oci db autonomous-database create \
  --compartment-id ocid1.compartment.oc1..example \
  --db-name APPDB --display-name app-atp \
  --db-workload OLTP --cpu-core-count 4 \
  --data-storage-size-in-tbs 1 \
  --admin-password "MyStr0ngP@ss"

# Create MySQL HeatWave
oci mysql db-system create \
  --compartment-id ocid1.compartment.oc1..example \
  --display-name app-mysql \
  --db-system-shape-name MySQL.VM.Standard.E4.8 \
  --admin-username admin --admin-password "MyStr0ngP@ss" \
  --subnet-id ocid1.subnet.oc1..example

# Create backup
oci db autonomous-database create-autonomous-database-backup \
  --autonomous-database-id ocid1.autonomousdatabase.oc1..example \
  --display-name pre-upgrade-backup

# List backups
oci db autonomous-database list-autonomous-database-backups \
  --autonomous-database-id ocid1.autonomousdatabase.oc1..example

# Create Data Guard association
oci db autonomous-database create-cross-region-data-guard \
  --autonomous-database-id ocid1.autonomousdatabase.oc1..example \
  --peer-region us-phoenix-1 \
  --peer-compartment-id ocid1.compartment.oc1..dr

# Create NoSQL table
oci nosql table create \
  --compartment-id ocid1.compartment.oc1..example \
  --name user_sessions \
  --ddl-statement "CREATE TABLE user_sessions (...) PRIMARY KEY (user_id)"
```

## Database Architecture Patterns

| Pattern | Service | Use Case |
|---------|---------|----------|
| Transaction processing | ATP (OLTP) | Web apps, APIs, microservices |
| Data warehousing | ADW (DW) | Analytics, BI, reporting |
| HTAP (hybrid) | MySQL HeatWave | Real-time analytics on MySQL |
| Mission-critical OLTP | Exadata | Large-scale, low-latency |
| Document/graph | NoSQL | JSON, IoT, real-time apps |
| Geo-distributed | Data Guard + GGS | Cross-region DR |

## Best Practices

- Enable auto-backup on all Autonomous Databases with 30+ day retention
- Use private endpoints for database access (never public)
- Enable auto-scaling on ATP/ADW for workload spikes
- Use Data Guard for cross-region DR with RPO < 1 second
- Rotate admin passwords regularly using OCI Vault
- Use NSGs (not security lists) for database network isolation
- Enable audit logging (OCI Audit + Database Audit)
- Right-size OCPU using auto-scaling rather than over-provisioning
- Use TDE (Transparent Data Encryption) with OCI Vault keys
- Enable maintenance windows for patching during off-peak hours
