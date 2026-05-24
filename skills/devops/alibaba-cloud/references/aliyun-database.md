# Alibaba Cloud Databases

## ApsaraDB RDS MySQL

```hcl
# RDS MySQL instance
resource "alicloud_db_instance" "mysql" {
  engine           = "MySQL"
  engine_version   = "8.0"
  instance_type    = "mysql.x8.xlarge.2"
  instance_storage = 200
  instance_charge_type = "PostPaid"
  vswitch_id       = alicloud_vswitch.db[0].id
  security_ips     = ["10.0.0.0/8"]
  db_instance_storage_type = "cloud_essd"
  db_instance_category     = "HighAvailability"

  # Encryption
  encryption_key      = alicloud_kms_key.app.id
  tde_status          = "Enabled"

  # Backup
  backup_period    = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  backup_time      = "03:00Z-04:00Z"
  backup_retention_period = 30

  # Monitoring
  monitor_type = "ALIYUN"
  monitor_group = "production"

  tags = {
    Environment = "production"
  }
}

# Read-only instance
resource "alicloud_db_readonly_instance" "mysql_ro" {
  count              = 1
  engine_version     = alicloud_db_instance.mysql.engine_version
  instance_type      = alicloud_db_instance.mysql.instance_type
  instance_storage   = alicloud_db_instance.mysql.instance_storage
  master_db_instance_id = alicloud_db_instance.mysql.id
  instance_name      = "mysql-readonly-0"
  vswitch_id         = alicloud_vswitch.db[1].id
  zone_id            = data.alicloud_zones.default.zones[1].id

  db_instance_storage_type = "cloud_essd"
}

# Read/Write splitting
resource "alicloud_db_read_write_splitting_connection" "rw" {
  instance_id       = alicloud_db_instance.mysql.id
  connection_prefix = "app-db-rw"
  distribution_type = "Standard"
}

# RDS Backup
resource "alicloud_rds_backup" "mysql" {
  instance_id = alicloud_db_instance.mysql.id
  backup_method = "Physical"
  backup_type   = "FullBackup"
  backup_retention_period = 30
}
```

## PolarDB

```hcl
# PolarDB MySQL cluster
resource "alicloud_polardb_cluster" "mysql" {
  db_type        = "MySQL"
  db_version     = "8.0"
  pay_type       = "PostPaid"
  db_node_count  = 2
  db_node_class  = "polar.mysql.x8.xlarge"
  vswitch_id     = alicloud_vswitch.db[0].id
  db_cluster_name = "production-polardb"

  tde_status = "Enabled"
  encryption_key = alicloud_kms_key.app.id
}

# PolarDB read-only node
resource "alicloud_polardb_cluster" "mysql_ro" {
  db_type           = "MySQL"
  db_version        = "8.0"
  pay_type          = "PostPaid"
  db_node_class     = "polar.mysql.x8.xlarge"
  vswitch_id        = alicloud_vswitch.db[1].id
  db_cluster_name   = "production-polardb-ro"
  db_cluster_network_type = "VPC"

  # Create as read-only endpoint
  creation_option = "CloneFromPolarDB"
  source_db_cluster_id = alicloud_polardb_cluster.mysql.id
}

# PolarDB backup policy
resource "alicloud_polardb_backup_policy" "mysql" {
  db_cluster_id              = alicloud_polardb_cluster.mysql.id
  preferred_backup_period    = ["Monday", "Wednesday", "Friday"]
  preferred_backup_time      = "03:00Z-04:00Z"
  data_level1_backup_retention_period = 30
  data_level2_backup_retention_period = 7
}
```

## ApsaraDB RDS PostgreSQL

```hcl
resource "alicloud_db_instance" "postgres" {
  engine           = "PostgreSQL"
  engine_version   = "16.0"
  instance_type    = "pg.x8.xlarge.2"
  instance_storage = 500
  instance_charge_type = "PostPaid"
  vswitch_id       = alicloud_vswitch.db[0].id
  security_ips     = ["10.0.0.0/8"]
  db_instance_storage_type = "cloud_essd"
  db_instance_category     = "HighAvailability"

  backup_period    = ["Monday", "Wednesday", "Friday", "Sunday"]
  backup_time      = "02:00Z-03:00Z"
  backup_retention_period = 30

  # PostgreSQL-specific
  pg_hba_conf = {
    "0" = {
      type     = "host"
      database = "all"
      user     = "all"
      address  = "10.0.0.0/8"
      method   = "md5"
    }
  }
}
```

## ApsaraDB RDS SQL Server

```hcl
resource "alicloud_db_instance" "sqlserver" {
  engine           = "SQLServer"
  engine_version   = "2022"
  instance_type    = "mssql.x8.xlarge.2"
  instance_storage = 500
  instance_charge_type = "PostPaid"
  vswitch_id       = alicloud_vswitch.db[0].id
  security_ips     = ["10.0.0.0/8"]
  db_instance_storage_type = "cloud_essd"
}
```

## Redis

```hcl
# Redis instance
resource "alicloud_redis_instance" "cache" {
  engine_version    = "7.0"
  instance_type     = "Redis"
  instance_class    = "redis.master.small.default"
  vswitch_id        = alicloud_vswitch.db[0].id
  instance_name     = "production-redis"
  instance_charge_type = "PostPaid"

  # High availability
  zone_id = data.alicloud_zones.default.zones[0].id

  # Security
  security_ips = ["10.0.0.0/8"]

  # Backup
  backup_period    = ["Monday", "Thursday"]
  backup_time      = "03:00Z-04:00Z"

  tags = {
    Environment = "production"
  }
}

# Redis cluster (distributed)
resource "alicloud_redis_instance" "cluster" {
  engine_version    = "7.0"
  instance_type     = "Redis"
  instance_class    = "redis.sharding.small.default"
  vswitch_id        = alicloud_vswitch.db[0].id
  instance_name     = "cluster-redis"
  shard_count       = 4
}
```

## MongoDB

```hcl
resource "alicloud_mongodb_instance" "mongo" {
  engine_version       = "7.0"
  db_instance_class    = "dds.mongo.standard"
  db_instance_storage  = 100
  vswitch_id           = alicloud_vswitch.db[0].id
  name                 = "production-mongo"
  instance_charge_type = "PostPaid"

  # Replica set
  replication_factor = 3

  # Security
  security_ip_list = ["10.0.0.0/8"]

  backup_period = "Monday"
  backup_time   = "03:00Z-04:00Z"

  tags = {
    Environment = "production"
  }
}
```

## Table Store (NoSQL)

```hcl
resource "alicloud_ots_instance" "nosql" {
  name        = "app-tablestore"
  description = "Production TableStore instance"
  accessed_by = "VPC"
  instance_type = "HighPerformance"
  network = "VPC"
  resource_group_id = alicloud_resource_manager_resource_group.default.id
}

resource "alicloud_ots_table" "sessions" {
  instance_name = alicloud_ots_instance.nosql.name
  table_name    = "user_sessions"
  primary_key {
    name = "user_id"
    type = "String"
  }
  primary_key {
    name = "session_id"
    type = "String"
  }
  time_to_live  = -1
  max_version   = 1
  deviation_cell_version_in_sec = 86400
}
```

## DRDS (Distributed Relational Database Service)

```hcl
resource "alicloud_drds_instance" "drds" {
  description       = "production-drds"
  instance_series   = "drds.solo"
  instance_charge_type = "PostPaid"
  vswitch_id        = alicloud_vswitch.db[0].id
  mysql_version     = 8
  resource_group_id = alicloud_resource_manager_resource_group.default.id
}

# DRDS database
resource "alicloud_drds_database" "sharded" {
  drds_instance_id = alicloud_drds_instance.drds.id
  db_name          = "sharded_app"
}
```

## CLI Commands

```bash
# Create RDS MySQL instance
aliyun rds CreateDBInstance \
  --Engine MySQL --EngineVersion 8.0 \
  --DBInstanceClass mysql.x8.xlarge.2 \
  --DBInstanceStorage 200 \
  --VSwitchId <vswitch-id> \
  --SecurityIPList 10.0.0.0/8

# Create read-only replica
aliyun rds CreateReadOnlyDBInstance \
  --DBInstanceId <master-id> \
  --DBInstanceClass mysql.x8.xlarge.2 \
  --DBInstanceStorage 200 \
  --VSwitchId <vswitch-id>

# Create backup
aliyun rds CreateBackup \
  --DBInstanceId <rds-id> \
  --BackupMethod Physical \
  --BackupType FullBackup

# Create Redis
aliyun redis CreateInstance \
  --EngineVersion 7.0 \
  --InstanceClass redis.master.small.default \
  --InstanceName production-redis \
  --VSwitchId <vswitch-id>

# Create MongoDB
aliyun dds CreateDBInstance \
  --EngineVersion 7.0 \
  --DBInstanceClass dds.mongo.standard \
  --DBInstanceStorage 100 \
  --VSwitchId <vswitch-id>

# Create PolarDB
aliyun polardb CreateDBCluster \
  --DBType MySQL --DBVersion 8.0 \
  --DBNodeClass polar.mysql.x8.xlarge \
  --DBNodeCount 2 \
  --VSwitchId <vswitch-id>

# List RDS instances
aliyun rds DescribeDBInstances

# List backups
aliyun rds DescribeBackups --DBInstanceId <rds-id>

# Restore from backup
aliyun rds RestoreDBInstance \
  --DBInstanceId <rds-id> \
  --BackupId <backup-id>
```

## Database Selection Guide

| Need | Service | Best For |
|------|---------|----------|
| OLTP MySQL | ApsaraDB RDS MySQL | Standard web apps |
| High-performance MySQL | PolarDB MySQL | Heavy traffic, low latency |
| PostgreSQL | ApsaraDB RDS PG | Advanced relational, GIS, JSONB |
| SQL Server | ApsaraDB RDS SQL Server | Windows/.NET workloads |
| Key-value cache | Redis | Caching, sessions, queues |
| Document DB | MongoDB | Unstructured/flexible schemas |
| NoSQL wide-column | Table Store | IoT, time-series, logs |
| Distributed SQL | DRDS | Sharded databases > 10 TB |
| Columnar analytics | AnalyticDB | Real-time analytics, BI |
| Graph DB | GDB | Recommendation, fraud detection |

## Best Practices

- Use HighAvailability (HA) db_instance_category for production RDS
- Enable TDE (Transparent Data Encryption) with KMS for data at rest
- Deploy read replicas in different zones for HA
- Set backup retention to at least 30 days
- Use read/write splitting for query-heavy workloads
- For Redis, use cluster mode for workloads > 64 GB
- Use PolarDB for MySQL when you need higher performance than standard RDS
- Enable security IPs with VPC CIDR only (never 0.0.0.0/0)
- Use SSL connections for all database traffic
- Enable auto-renewal for subscription DB instances
- Monitor database connections and slow queries with CloudMonitor
- Use DRDS for tables exceeding 10 TB that need manual sharding
