# COS and Databases

## Cloud Object Storage (COS)

```hcl
# Provision COS instance
resource "ibm_resource_instance" "cos" {
  name              = "production-cos"
  service           = "cloud-object-storage"
  plan              = "standard"
  location          = "global"
  resource_group_id = data.ibm_resource_group.default.id
}

# Cross-region bucket
resource "ibm_cos_bucket" "backups" {
  bucket_name          = "app-backups-prod"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = "us-south"
  storage_class        = "smart"

  tags = ["production", "backup"]
}

# Regional bucket
resource "ibm_cos_bucket" "regional" {
  bucket_name          = "app-regional-data"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = "us-south"
  storage_class        = "standard"
}

# Single-site bucket (lowest cost)
resource "ibm_cos_bucket" "temp" {
  bucket_name          = "app-temp-files"
  resource_instance_id = ibm_resource_instance.cos.id
  single_site_location = "us-west"
  storage_class        = "vault"
}

# Bucket with retention
resource "ibm_cos_bucket" "compliance" {
  bucket_name          = "app-compliance-logs"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = "us-south"
  storage_class        = "standard"

  retention_enabled = true
  retention_default = 365
  retention_minimum = 90
  retention_maximum = 2555
}

# Bucket with versioning and lifecycle
resource "ibm_cos_bucket" "versioned" {
  bucket_name          = "app-versioned-data"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = "us-south"
  storage_class        = "standard"
}

resource "ibm_cos_bucket_lifecycle_configuration" "versioned" {
  bucket_crn         = ibm_cos_bucket.versioned.crn
  resource_instance_id = ibm_resource_instance.cos.id
  lifecycle_rule {
    rule_id = "expire-old-versions"
    enable  = true
    expiration {
      days = 90
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# Bucket with CORS
resource "ibm_cos_bucket_cors_configuration" "app" {
  bucket_crn           = ibm_cos_bucket.versioned.crn
  resource_instance_id = ibm_resource_instance.cos.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT"]
    allowed_origins = ["https://app.example.com"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
```

### COS CLI

```bash
# List buckets
ibmcloud cos buckets

# Create bucket
ibmcloud cos bucket-create \
  --bucket app-backups-prod \
  --region us-south

# Upload object
ibmcloud cos object-put \
  --bucket app-backups-prod \
  --key backup.tar.gz \
  --body ./backup.tar.gz

# Download object
ibmcloud cos object-get \
  --bucket app-backups-prod \
  --key backup.tar.gz \
  --outfile ./restored.tar.gz

# List objects
ibmcloud cos objects --bucket app-backups-prod

# Set lifecycle policy
ibmcloud cos bucket-lifecycle-configuration-put \
  --bucket app-backups-prod \
  --lifecycle-configuration '{
    "rules": [{
      "id": "expire-old",
      "status": "Enabled",
      "filter": {"prefix": ""},
      "expiration": {"days": 90}
    }]
  }'
```

## IBM Db2

```hcl
resource "ibm_resource_instance" "db2" {
  name              = "production-db2"
  service           = "dashdb-for-transactions"
  plan              = "standard"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.default.id

  parameters = {
    members = 4
    storage_gb_per_member = 500
  }
}

# Db2 Warehouse
resource "ibm_resource_instance" "db2_warehouse" {
  name              = "analytics-db2"
  service           = "dashdb-for-analytics"
  plan              = "performance"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.default.id
}
```

### Db2 CLI

```bash
# Create Db2 instance
ibmcloud resource service-instance-create production-db2 \
  dashdb-for-transactions standard us-south

# Get connection credentials
ibmcloud resource service-key-create db2-creds Manager \
  --instance-name production-db2

# Connect via CLI
db2 "connect to <dbname> user <user> using <password>"

# Create table
db2 "CREATE TABLE users (
  id INT GENERATED ALWAYS AS IDENTITY,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)"

# Backup
db2 "BACKUP DATABASE <dbname> TO /backup"
```

## PostgreSQL (IBM Cloud Databases)

```hcl
resource "ibm_resource_instance" "pg" {
  name              = "production-postgres"
  service           = "databases-for-postgresql"
  plan              = "standard"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.default.id

  parameters = {
    members         = 3
    member_host_flavor = "multitenant"
    member_memory_mb  = 4096
    member_disk_mb    = 10240
    member_cpu_count  = 4
  }

  service_endpoints = "private"
}

# Get connection string
data "ibm_database_connection" "pg" {
  deployment_id = ibm_resource_instance.pg.guid
  user_id       = "admin"
  endpoint_type = "private"
}

# Create database
resource "ibm_database" "pg_db" {
  deployment_id = ibm_resource_instance.pg.guid
  name          = "appdb"
}

# Create user
resource "ibm_database_user" "app" {
  deployment_id = ibm_resource_instance.pg.guid
  username      = "appuser"
  password      = random_password.pg.result
}

# Create allowlist
resource "ibm_database_allowlist" "vpc" {
  deployment_id = ibm_resource_instance.pg.guid
  ip_address    = "10.0.0.0/8"
  note          = "VPC IP range"
}

# Point-in-time recovery configuration
resource "ibm_resource_instance" "pg_pitr" {
  name              = "pg-clone"
  service           = "databases-for-postgresql"
  plan              = "standard"
  location          = "us-south"

  parameters = {
    deployment_id = ibm_resource_instance.pg.guid
    point_in_time_recovery = {
      recovery_time = "2026-01-15T03:00:00Z"
    }
  }
}
```

## Compose Databases

```hcl
resource "ibm_resource_instance" "compose_redis" {
  name              = "cache-redis"
  service           = "compose-for-redis"
  plan              = "standard"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.default.id
}

resource "ibm_resource_instance" "compose_elastic" {
  name              = "logs-elasticsearch"
  service           = "compose-for-elasticsearch"
  plan              = "standard"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.default.id
}

resource "ibm_resource_instance" "compose_etcd" {
  name              = "kv-store"
  service           = "compose-for-etcd"
  plan              = "standard"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.default.id
}
```

## Backup and DR

### COS Cross-Region Replication

```hcl
# Cross-region bucket (built-in replication)
resource "ibm_cos_bucket" "cross_region" {
  bucket_name          = "app-dr-data"
  resource_instance_id = ibm_resource_instance.cos.id
  cross_region_location = "us"  # us, eu, ap
  storage_class        = "standard"
}

# or replicate between buckets using rules
resource "ibm_cos_bucket_replication_rule" "dr" {
  bucket_crn         = ibm_cos_bucket.backups.crn
  resource_instance_id = ibm_resource_instance.cos.id
  rule_name          = "cross-region-replication"
  enable             = true
  priority           = 1
  destination_bucket_crn = ibm_cos_bucket.dr_target.crn
}
```

### Database Backup

```bash
# Create PostgreSQL backup
ibmcloud cdb deployment-backups-list <deployment-id>
ibmcloud cdb deployment-backup-create <deployment-id> --type on_demand

# Restore from backup
ibmcloud resource service-instance-create pg-restored \
  databases-for-postgresql standard us-south \
  -p '{"deployment_id":"<orig-id>","point_in_time_recovery":{"recovery_time":"2026-01-15T03:00:00Z"}}'

# COS backup using CLI
ibmcloud cos object-copy \
  --bucket app-backups-prod \
  --key db-backup.sql.gz \
  --copy-source app-backups-dr \
  --copy-source-key db-backup.sql.gz
```

### Automated Backup Strategy

```bash
#!/bin/bash
# Automated database backup to COS

DB_NAME="appdb"
DB_USER="admin"
BACKUP_BUCKET="app-backups-prod"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${DB_NAME}-${TIMESTAMP}.sql.gz"

# Dump database
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /tmp/$BACKUP_FILE

# Upload to COS
ibmcloud cos object-put \
  --bucket $BACKUP_BUCKET \
  --key "daily/${BACKUP_FILE}" \
  --body /tmp/$BACKUP_FILE

# Cleanup local
rm /tmp/$BACKUP_FILE

# Retention: remove backups older than 30 days
ibmcloud cos objects --bucket $BACKUP_BUCKET --prefix daily/ | \
  grep -E "^daily/" | while read obj; do
    date_obj=$(echo $obj | sed 's/.*-\([0-9]\{8\}\)-.*/\1/')
    if [[ $date_obj < $(date -d '30 days ago' +%Y%m%d) ]]; then
      ibmcloud cos object-delete --bucket $BACKUP_BUCKET --key "$obj"
    fi
  done
```

## Best Practices

- Use cross-region COS buckets for DR across geographic areas
- Enable object versioning and lifecycle policies on all COS buckets
- Use private service endpoints for database connections (never public)
- Set retention policies on compliance-related COS buckets
- Use point-in-time recovery for PostgreSQL to recover to any point within retention window
- Enable automated daily backups for all production databases
- Test restore procedures quarterly
- Use multi-zone region deployments for database HA (3 members)
- Encrypt all data at rest with KMS customer-managed keys
- Restrict database access with allowlists to VPC CIDR ranges only
- Use COS Cross-Region Replication or CRR for automated data replication
- Tag all COS buckets and database instances with environment and cost center
