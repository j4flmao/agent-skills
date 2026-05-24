# Managed Databases

## Database Cluster

```hcl
# PostgreSQL database cluster
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

  # Block public access
  private_network_uuid = digitalocean_vpc.main.id
}

# MySQL database cluster
resource "digitalocean_database_cluster" "mysql" {
  name       = "production-mysql"
  engine     = "mysql"
  version    = "8"
  size       = "db-s-4vcpu-8gb"
  region     = "nyc3"
  node_count = 2
  vpc_uuid   = digitalocean_vpc.main.id

  maintenance_window {
    day  = "sunday"
    hour = "04:00:00"
  }
}

# Redis database cluster
resource "digitalocean_database_cluster" "redis" {
  name       = "production-redis"
  engine     = "redis"
  version    = "7"
  size       = "db-s-4vcpu-8gb"
  region     = "nyc3"
  node_count = 2
  vpc_uuid   = digitalocean_vpc.main.id
}

# Kafka database cluster
resource "digitalocean_database_cluster" "kafka" {
  name       = "production-kafka"
  engine     = "kafka"
  version    = "3.6"
  size       = "db-s-8vcpu-16gb"
  region     = "nyc3"
  node_count = 3
  vpc_uuid   = digitalocean_vpc.main.id
}
```

## Database and User Management

```hcl
# PostgreSQL database and user
resource "digitalocean_database_db" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "appdb"
}

resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "appuser"
}

# MySQL database and user
resource "digitalocean_database_db" "wordpress" {
  cluster_id = digitalocean_database_cluster.mysql.id
  name       = "wordpress"
}

resource "digitalocean_database_user" "wordpress" {
  cluster_id = digitalocean_database_cluster.mysql.id
  name       = "wpuser"
}
```

## HA Configuration

```yaml
# High Availability modes:
# - 1 node: Standalone, no failover (dev/test)
# - 2 nodes: Primary + standby in same region (standard HA)
# - 3 nodes: Primary + 2 standbys (maximum HA)

# Failover is automatic with no data loss (synchronous replication)
# RPO: 0 (zero data loss)
# RTO: < 30 seconds per node recovery

# For Kafka: 3 nodes minimum, uses Rack Awareness
```

## Backups

```hcl
# Backup restore and fork
resource "digitalocean_database_replica" "read_only" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "read-replica"
  region     = "nyc3"
  size       = "db-s-2vcpu-4gb"
  tags       = ["read-replica"]
}

# Restore from backup
# resource "digitalocean_database_cluster" "restored" {
#   name       = "pg-restored"
#   engine     = "pg"
#   version    = "16"
#   size       = "db-s-4vcpu-8gb"
#   region     = "nyc3"
#   node_count = 2
#
#   restore {
#     database_name = digitalocean_database_cluster.postgres.name
#     # Uses latest backup by default
#   }
# }
```

## Connection Pooling

```hcl
# Transaction mode pool (PgBouncer)
resource "digitalocean_database_connection_pool" "transaction" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "trans-pool"
  mode       = "transaction"
  size       = 20
  db_name    = "appdb"
  user       = "appuser"
}

# Session mode pool
resource "digitalocean_database_connection_pool" "session" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "session-pool"
  mode       = "session"
  size       = 10
  db_name    = "appdb"
  user       = "appuser"
}

# Statement mode pool (fastest, but no prepared statements across queries)
resource "digitalocean_database_connection_pool" "statement" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "stmt-pool"
  mode       = "statement"
  size       = 50
  db_name    = "appdb"
  user       = "appuser"
}
```

## Private Networking

```hcl
# Firewall rules to restrict database access
resource "digitalocean_database_firewall" "conf" {
  cluster_id = digitalocean_database_cluster.postgres.id

  rule {
    type  = "droplet"
    value = digitalocean_droplet.web.id
  }

  rule {
    type  = "k8s"
    value = digitalocean_kubernetes_cluster.main.id
  }

  rule {
    type  = "vpc"
    value = digitalocean_vpc.main.id
  }

  rule {
    type  = "ip_addr"
    value = "10.10.0.100"
  }
}

# Get private connection string
output "pg_private_uri" {
  value     = digitalocean_database_cluster.postgres.private_uri
  sensitive = true
}

output "pg_pool_private_uri" {
  value     = digitalocean_database_connection_pool.transaction.private_uri
  sensitive = true
}
```

## Eviction Policy (Redis)

```hcl
# Redis advanced config
resource "digitalocean_database_cluster" "redis_config" {
  name       = "production-redis"
  engine     = "redis"
  version    = "7"
  size       = "db-s-4vcpu-8gb"
  region     = "nyc3"
  node_count = 2

  eviction_policy = "allkeys-lru"  # or noeviction, allkeys-lfu, volatile-lru, etc.
}
```

## CLI Commands

```bash
# Create PostgreSQL cluster
doctl databases create production-pg \
  --engine pg --version 16 \
  --region nyc3 --size db-s-4vcpu-8gb --num-nodes 3

# List databases
doctl databases list

# Get connection details
doctl databases connection <cluster-id>

# Create database
doctl databases db create <cluster-id> appdb

# Create user
doctl databases user create <cluster-id> appuser

# Create connection pool
doctl databases pool create <cluster-id> trans-pool \
  --mode transaction --size 20 --db appdb --user appuser

# Create read replica
doctl databases replica create <cluster-id> read-replica --region nyc3

# List backups
doctl databases backup list <cluster-id>

# Restore from backup
doctl databases restore <cluster-id> --restore-name pg-restored

# Add firewall rule
doctl databases firewalls append <cluster-id> --type droplet --value <droplet-id>

# Configure eviction policy (Redis)
doctl databases update <cluster-id> --eviction-policy allkeys-lru

# Create Kafka topic
doctl databases kafka topic create <cluster-id> events --partitions 3 --replication-factor 2
```

## Connection Strings

| Engine | Connection URI |
|--------|---------------|
| PostgreSQL | `postgres://user:pass@host:25060/db?sslmode=require` |
| MySQL | `mysql://user:pass@host:25060/db?ssl-mode=REQUIRED` |
| Redis | `rediss://user:pass@host:25061` |
| Kafka | `host:25067` (TLS-enabled) |

## Best Practices

- Use 3-node clusters for maximum HA (zero RPO)
- Always use private networking (VPC) for database connections
- Use connection pooling for production workloads (transaction mode recommended)
- Configure database firewall to allow only specific Droplets, K8s clusters, or IPs
- Enable automated backups and test restore procedures
- Use read replicas for query offloading, not as a backup mechanism
- For Kafka: use 3+ nodes with replication factor 2+
- Monitor connection counts and right-size the database node
- Use SSL/TLS connections for all database traffic
- Never use public endpoints in production
- Use eviction policy appropriate for your Redis use case (allkeys-lru for cache, noeviction for queue)
