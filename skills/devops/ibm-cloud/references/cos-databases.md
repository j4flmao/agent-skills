# IBM Cloud Object Storage and Managed Databases

Provisioning and operating IBM Cloud Object Storage (COS) buckets and IBM Cloud Databases (ICD) with Terraform and the CLI: bucket locations and classes, versioning, retention, lifecycle, replication, encryption, database deployments, users, allow-lists, backups and point-in-time recovery.

## Cloud Object Storage

### Instance and bucket locations

```hcl
resource "ibm_resource_instance" "cos" {
  name              = "prod-cos"
  service           = "cloud-object-storage"
  plan              = "standard"
  location          = "global"
  resource_group_id = data.ibm_resource_group.prod.id
}
```

Each bucket sets exactly one location argument:

| Argument | Values (examples) | Resiliency |
|----------|-------------------|------------|
| `cross_region_location` | `us`, `eu`, `ap` | Data spread across regions in a geography |
| `region_location` | `us-south`, `us-east`, `eu-de`, `eu-gb`, `jp-tok`, `au-syd`, `ca-tor`, `jp-osa`, `br-sao` | Across zones in one region |
| `single_site_location` | `ams03`, `che01`, `mil01`, `sjc04`, `tor01`, ... | One data center |

Storage classes: `standard`, `vault`, `cold`, `smart` (Smart Tier prices by access pattern). The One Rate plan uses `onerate_active`. Values are lowercase.

### Production bucket

```hcl
resource "ibm_cos_bucket" "app_data" {
  bucket_name          = "acme-app-data-prod"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = "us-south"
  storage_class        = "smart"
  endpoint_type        = "private"               # Terraform talks to COS over the private endpoint
  kms_key_crn          = ibm_kms_key.cos_root.crn # customer-managed key (Key Protect / HPCS)

  object_versioning {
    enable = true
  }

  activity_tracking {
    read_data_events   = true
    write_data_events  = true
    management_events  = true
  }

  metrics_monitoring {
    usage_metrics_enabled   = true
    request_metrics_enabled = true
  }
}
```

- Versioning can be suspended but not disabled once enabled.
- Using a KMS key requires an IAM authorization from COS to Key Protect/HPCS (`ibm_iam_authorization_policy` with source `cloud-object-storage`, target `kms`, role `Reader`).

### Lifecycle

Lifecycle rules can be set inline on `ibm_cos_bucket` or with the separate `ibm_cos_bucket_lifecycle_configuration` resource, which the provider recommends for new code. Use one approach per bucket; mixing them causes drift. Inline form:

```hcl
resource "ibm_cos_bucket" "logs" {
  bucket_name          = "acme-logs-prod"
  resource_instance_id = ibm_resource_instance.cos.id
  region_location      = "us-south"
  storage_class        = "standard"

  object_versioning {
    enable = true
  }

  expire_rule {
    rule_id = "expire-tmp"
    enable  = true
    days    = 7
    prefix  = "tmp/"
  }

  noncurrent_version_expiration {
    rule_id         = "expire-noncurrent"
    enable          = true
    noncurrent_days = 30
  }

  abort_incomplete_multipart_upload_days {
    rule_id               = "abort-mpu"
    enable                = true
    days_after_initiation = 3
  }
}
```

`archive_rule { days, enable, type }` moves objects to archive (`type` `Glacier` or `Accelerated`); archived objects must be restored before reading.

### Immutability

| Feature | Use | Notes |
|---------|-----|-------|
| Retention policy (`retention_rule { default, minimum, maximum, permanent }`) | WORM retention for compliance | Cannot combine with versioning; `permanent = true` is irreversible |
| Object Lock (`object_lock = true` + `ibm_cos_bucket_object_lock_configuration`) | S3-compatible lock per object/default retention | Requires versioning |

Pick one model per bucket, and test retention settings on a non-production bucket first: they cannot be loosened.

### Replication

```hcl
resource "ibm_cos_bucket_replication_rule" "dr" {
  depends_on      = [ibm_iam_authorization_policy.cos_replication]
  bucket_crn      = ibm_cos_bucket.app_data.crn
  bucket_location = ibm_cos_bucket.app_data.region_location

  replication_rule {
    rule_id                         = "to-dr"
    enable                          = true
    prefix                          = ""
    priority                        = 1
    deletemarker_replication_status = false
    destination_bucket_crn          = ibm_cos_bucket.app_data_dr.crn
  }
}
```

Both buckets need versioning enabled, and COS needs an IAM authorization (`Writer` on the target bucket) to replicate. Cross-region buckets already store data across regions; replication adds an independent copy (different account, key or geography).

### CLI

```bash
ibmcloud plugin install cloud-object-storage
ibmcloud cos config crn --crn "$COS_CRN"
ibmcloud cos config region --region us-south

ibmcloud cos buckets
ibmcloud cos object-put --bucket acme-app-data-prod --key reports/2026-10.csv --body ./2026-10.csv
ibmcloud cos object-get --bucket acme-app-data-prod --key reports/2026-10.csv ./2026-10.csv
ibmcloud cos objects --bucket acme-app-data-prod --prefix reports/
```

COS is S3-compatible: AWS SDKs and tools work with the regional endpoint (e.g. `s3.us-south.cloud-object-storage.appdomain.cloud`, private `s3.private.us-south...`) using HMAC credentials (`{"HMAC": true}` on the service key) or IAM tokens.

## IBM Cloud Databases (ICD)

Managed services: `databases-for-postgresql`, `databases-for-mysql`, `databases-for-mongodb`, `databases-for-redis`, `databases-for-valkey`, `databases-for-elasticsearch`, `databases-for-etcd`, `databases-for-enterprisedb`, `messages-for-rabbitmq`.

IBM Compose (`compose-for-*`) services are retired; use ICD instead.

### Deployment

```hcl
resource "ibm_database" "pg" {
  name              = "orders-pg-prod"
  service           = "databases-for-postgresql"
  plan              = "standard"
  location          = "us-south"
  resource_group_id = data.ibm_resource_group.prod.id
  version           = "16"
  service_endpoints = "private"
  key_protect_key   = ibm_kms_key.db_root.crn
  adminpassword     = var.pg_admin_password      # from a secret store, never committed

  group {
    group_id = "member"
    memory { allocation_mb = 8192 }
    disk   { allocation_mb = 102400 }
    cpu    { allocation_count = 4 }
    host_flavor { id = "multitenant" }
  }

  users {
    name     = "orders_app"
    password = var.pg_app_password
    type     = "database"
  }

  allowlist {
    address     = "10.240.0.0/18"
    description = "prod VPC subnets"
  }

  timeouts {
    create = "120m"
    update = "120m"
  }
}

data "ibm_database_connection" "pg" {
  deployment_id = ibm_database.pg.id
  user_type     = "database"
  user_id       = "orders_app"
  endpoint_type = "private"
}
```

- Gen2 plans (`standard-gen2`, ...) use dedicated host flavors and reject some Classic arguments (memory/cpu allocations, backup key, PITR fields); check the provider docs for the plan you use.
- `service_endpoints = "private"` keeps traffic on the IBM private network; reach it from VPC via Virtual Private Endpoints.
- `version` upgrades in place on Classic; plan for a maintenance window and test on a restored copy.

### Connecting

```bash
ibmcloud plugin install cloud-databases
ibmcloud cdb deployment-connections orders-pg-prod -u orders_app --endpoint-type private
ibmcloud cdb deployment-cacert orders-pg-prod > ca.pem
psql "host=$PG_HOST port=$PG_PORT dbname=ibmclouddb user=orders_app sslmode=verify-full sslrootcert=ca.pem"
```

Always connect with TLS verification against the deployment CA.

### Backups and PITR

- ICD takes automatic daily backups (retention per service; see the service docs). On-demand backups are available from the console/CLI.
- PostgreSQL and other services that support it can restore to a point in time within the retention window, into a new deployment.

```hcl
resource "ibm_database" "pg_restore" {
  name                                 = "orders-pg-restore-test"
  service                              = "databases-for-postgresql"
  plan                                 = "standard"
  location                             = "us-south"
  point_in_time_recovery_deployment_id = ibm_database.pg.id
  point_in_time_recovery_time          = "2026-10-20T03:00:00Z"
}
```

```bash
ibmcloud cdb deployment-backups-list orders-pg-prod
```

Restores always create a new deployment; cut over by updating connection configuration. Test restores regularly and measure the time it takes (your real RTO).

Logical exports (`pg_dump`) to COS add an independent copy for long retention or cross-account recovery; encrypt them and give the uploading identity write-only access to the backup bucket.

## Security Baseline

- Private endpoints for COS and ICD; public endpoints disabled where possible.
- Customer-managed keys (Key Protect or Hyper Protect Crypto Services) with authorization policies.
- Context-based restrictions to limit COS/ICD access to specific networks (VPCs, IP ranges).
- Least-privilege IAM: service IDs with bucket-scoped `Object Writer`/`Object Reader` roles for apps.
- Activity tracking events enabled on buckets; route events with Activity Tracker Event Routing.

## Checklist

- [ ] Bucket location/class chosen per resiliency and cost
- [ ] Versioning or retention/Object Lock deliberately chosen; one lifecycle mechanism per bucket
- [ ] Replication with IAM authorization for DR copies
- [ ] ICD on private endpoints with allow-lists and customer-managed keys
- [ ] Secrets from a secret store; TLS verify-full connections
- [ ] PITR restore tested on a schedule
