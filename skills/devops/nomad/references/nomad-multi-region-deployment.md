# Nomad Multi-Region Deployment

## Overview

Multi-region Nomad deployment enables workload distribution across geographic regions for improved availability, disaster recovery, and latency optimization. This reference covers architecture patterns, configuration strategies, operational procedures, and trade-offs for running Nomad across multiple regions.

## Architecture Fundamentals

### Nomad Regions vs Datacenters

Nomad has two levels of geographic distribution:

- **Datacenter**: Logical grouping of nodes within a region (e.g., `us-east-1a`, `us-east-1b`). Datacenters share the same server cluster and Raft consensus group. Scheduling constraints and preferences can target specific datacenters.
- **Region**: Independent Nomad clusters with their own server groups and Raft consensus. Regions do not share state directly. Cross-region scheduling requires federation or multi-region job configuration.

### Single Region vs Multi-Region

| Aspect | Single Region | Multi-Region |
|---|---|---|
| Server cluster | One Raft group (3-7 servers) | Independent per region |
| Raft consensus | Within region | Not shared |
| Job scheduling | Across datacenters in region | Per-region coordinated |
| Service discovery | Local Consul | Consul WAN federation |
| State synchronization | Automatic | Via backup/restore or replication |
| Failure domain | AZ failure | Region failure |
| Latency | Local | Cross-region WAN |
| Complexity | Low | High |

### Multi-Region Job Specification

Nomad Enterprise supports first-class multi-region job definitions using the `multiregion` block. This allows a single job specification to be deployed across multiple regions with controlled count per region.

```hcl
job "webapp" {
  datacenters = ["dc1"]

  # Region groups define per-region configuration
  multiregion {
    region "us-east" {
      count = 3
      datacenters = ["us-east-1a", "us-east-1b"]
    }
    region "eu-west" {
      count = 2
      datacenters = ["eu-west-1a"]
    }
    region "ap-southeast" {
      count = 2
      datacenters = ["ap-southeast-1a"]
    }
  }

  group "api" {
    count = 1

    network {
      mode = "bridge"
      port "http" { to = 8080 }
    }

    service {
      name = "api-webapp"
      port = "http"
      # Region-specific tags for traffic routing
      tags = ["api", "webapp", "${nomad_region}"]
    }

    task "server" {
      driver = "docker"
      config {
        image = "org/webapp:v1.0.0"
      }
      resources {
        cpu    = 500
        memory = 256
      }
    }
  }
}
```

## Multi-Region Architecture Patterns

### Active-Passive (Primary-DR)

One region handles all production traffic. DR region runs with reduced capacity or idle infrastructure. Failover is manual or semi-automated. DR region periodically syncs state from primary via backup/restore.

```
                 User Traffic
                      |
                 [DNS/LB]
                      |
            +---------+---------+
            |                   |
      [Primary Region]    [DR Region]
      us-east (active)    us-west (standby)
            |                   |
      [Nomad: us-east]   [Nomad: us-west]
            |                   |
      [Consul: us-east]  [Consul: us-west]
            |                   |
      [S3 Backup] ------------> [Restore from backup]
```

**Pros**: Simple, predictable, lower DR cost. **Cons**: DR capacity may be idle, failover time depends on restore speed. **Best for**: Non-critical workloads with RPO of hours, RTO of hours.

### Active-Active (Multi-Region)

All regions handle production traffic simultaneously. Traffic routed via global load balancer (DNS-based or anycast). Each region operates independently. State synchronization depends on workload type (database replication, object storage, or application-level sync).

```
                 User Traffic
                      |
            [Global Load Balancer]
            /                   \
      [us-east active]      [eu-west active]
      [Nomad + Consul]      [Nomad + Consul]
      [App replicas]        [App replicas]
            |                       |
      [DB: Aurora Global]   [DB: Aurora Global]
```

**Pros**: Full capacity utilization, lower latency per region, instant failover via DNS. **Cons**: Requires stateful workload replication, operational complexity, cross-region data sync costs. **Best for**: Global workloads, customer-facing applications with low-latency requirements.

### Active-Active with Read Replicas

Write traffic goes to one region. Read traffic served from all regions with local replicas. Data replication from primary to replica regions asynchronously.

```
            [Global LB]
            /         \
      [us-east]     [eu-west]
      Write + Read   Read-only
           |             |
      [Primary DB] --> [Read Replica]
```

**Pros**: Read scaling, local read latency, simpler than full active-active. **Cons**: Write latency for non-primary users, potential read staleness. **Best for**: Read-heavy workloads, content delivery, analytics dashboards.

### Hub-and-Spoke

Central region runs shared services (databases, message queues, monitoring). Edge regions run stateless application workloads consuming central services via low-latency connections.

```
           [Central Hub: us-east]
       Shared DB, Queue, Monitoring
         /        |        \
    [Spoke]    [Spoke]    [Spoke]
    us-west    eu-west    ap-southeast
    (app)      (app)      (app)
```

**Pros**: Shared state across regions, simpler data management. **Cons**: Central dependency, hub failure affects all spokes, cross-region latency. **Best for**: Organizations with centralized data governance requirements.

## Consul WAN Federation for Multi-Region Discovery

Consul WAN federation connects Consul datacenters across regions, enabling cross-region service discovery.

### WAN Federation Setup

```hcl
# Consul server configuration (each region)
server = true

datacenter = "us-east"  # or "eu-west", "ap-southeast"

# WAN federation settings
retry_join_wan = [
  "consul-server-us-east.example.com:8302",
  "consul-server-eu-west.example.com:8302",
  "consul-server-ap-southeast.example.com:8302"
]

# Enable WAN federation
primary_datacenter = "us-east"

# Gossip encryption
encrypt = "BASE64_ENCRYPT_KEY"

# TLS settings
verify_incoming = true
verify_outgoing = true
verify_server_hostname = true
ca_file = "/etc/consul/ca.pem"
cert_file = "/etc/consul/consul.pem"
key_file = "/etc/consul/consul-key.pem"
```

### DNS for Cross-Region Queries

```bash
# Query service in specific datacenter
dig @consul-dns.service.consul api-webapp.service.us-east.consul
dig @consul-dns.service.consul api-webapp.service.eu-west.consul

# Query all instances across datacenters
dig @consul-dns.service.consul api-webapp.service.consul
```

### Service Discovery Best Practices

- Use unique service names across regions for global discovery
- Tag services with region: `tags = ["region-us-east"]`
- Configure DNS TTL appropriately for failover scenarios (30-60s)
- Use prepared queries for datacenter failover
- Monitor WAN federation health: `consul operator raft list-peers`

## Multi-Region Scheduling Strategies

### Regional Count Configuration

Fine-tune allocation count per region based on traffic patterns:

```hcl
multiregion {
  region "us-east" {
    count = 5       # Primary region, higher capacity
  }
  region "eu-west" {
    count = 3       # Secondary region
  }
  region "ap-southeast" {
    count = 2       # Smaller region
  }
}
```

### Node Constraints per Region

Each region independently schedules within its node pool. Set constraints at the job level:

```hcl
group "api" {
  constraint {
    attribute = "${node.datacenter}"
    operator  = "="
    value     = "${meta.region_dc}"
  }
}
```

### Spread and Affinity Across Regions

```hcl
group "api" {
  # Spread across datacenters within region
  spread {
    attribute = "${node.datacenter}"
    target "us-east-1a" { percent = 50 }
    target "us-east-1b" { percent = 50 }
  }

  # Prefer SSD nodes
  affinity {
    attribute = "${node.disk_type}"
    value     = "ssd"
    weight    = 50
  }
}
```

## Stateful Workloads Across Regions

### Database Replication Strategies

| Database | Multi-Region Strategy | Replication Mode | RPO |
|---|---|---|---|
| PostgreSQL | Streaming replication + Patroni | Async | < 1MB |
| MySQL | Group replication | Async/semi-sync | < 1s |
| MongoDB | Replica set with members across regions | Majority write concern | Configurable |
| Cassandra | NetworkTopologyStrategy | Async per DC | Near-zero |
| CockroachDB | Native multi-region | Synchronous via Raft | Zero |
| Spanner (GCP) | Native multi-region | Synchronous | Zero |

### Storage Synchronization Options

- **Block level**: Longhorn backup/restore from S3, DR volumes with continuous sync
- **File level**: rsync, NFS replication, distributed filesystems (GlusterFS, Ceph)
- **Object level**: S3 replication, MinIO bucket replication
- **Database level**: Native replication (as above)

### Backup-Based Cross-Region Sync

For workloads without native replication, use periodic backup and restore:

1. Primary region: scheduled backup to S3
2. S3 bucket replication to DR region
3. DR region: periodic restore from S3
4. DR volume created from latest backup
5. Application points to restored volume

```yaml
# Longhorn backup in primary region
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: cross-region-backup
  namespace: longhorn-system
spec:
  cron: "0 */4 * * *"  # Every 4 hours
  task: backup
  retain: 30
  concurrency: 2
  labels:
    backup-type: cross-region
```

## Traffic Routing Across Regions

### DNS-Based Global Load Balancing

```hcl
# Route53 latency-based routing or equivalent
resource "aws_route53_record" "api" {
  zone_id = "ZONEID"
  name    = "api.example.com"
  type    = "A"

  latency_routing_policy {
    region = "us-east-1"
  }
  set_identifier = "us-east"
  alias {
    name    = aws_lb.us-east.dns_name
    zone_id = aws_lb.us-east.zone_id
  }

  latency_routing_policy {
    region = "eu-west-1"
  }
  set_identifier = "eu-west"
  alias {
    name    = aws_lb.eu-west.dns_name
    zone_id = aws_lb.eu-west.zone_id
  }
}
```

### Health-Based Routing

Configure health checks per region:

```bash
# Health check endpoint per region
curl https://api.us-east.example.com/health
curl https://api.eu-west.example.com/health

# DNS health checks remove unhealthy regions
# Load balancer health checks drain unhealthy nodes
```

### Traffic Splitting During Migration

Gradually shift traffic between regions:

1. Route 10% to new region -> monitor for errors
2. Increase to 25% -> monitor
3. Increase to 50% -> monitor
4. Increase to 75% -> monitor
5. Route 100% to new region
6. Decommission old region

## Disaster Recovery for Multi-Region

### DR Plan Components

1. **Detection**: Monitor region health (server cluster, application health, external endpoints)
2. **Decision**: Criteria for declaring region failure (e.g., 5 min of complete service degradation)
3. **Activation**: Steps to failover (DNS change, DR cluster activation, database promotion)
4. **Validation**: Verify application functionality in DR region
5. **Fallback**: Steps to fail back to primary when recovered

### Failover Process

```bash
# 1. Detect primary region failure
nomad server members  # Check server health

# 2. Activate DR region volumes
# (Longhorn: activate DR volume)
kubectl apply -f dr-volume-activation.yaml

# 3. Promote DR database to primary
# (PostgreSQL with Patroni)
patronictl failover --master dr-region

# 4. Update DNS to point to DR region
aws route53 change-resource-record-sets --change-batch dr-dns-update.json

# 5. Verify application health in DR
curl -f https://api.dr-region.example.com/health

# 6. Update monitoring to DR region
# Update alertmanager and dashboard configs
```

### Recovery Point Objective (RPO) and Recovery Time Objective (RTO)

| Strategy | RPO | RTO | Cost |
|---|---|---|---|
| Manual backup/restore | 24h | 4-8h | Low |
| Automated backup/restore | 4h | 1-4h | Low-Medium |
| DR volume (continuous) | Minutes | 15-30min | Medium |
| Active-active | Near-zero | < 1min | High |
| Synchronous replication | Zero | < 1min | Very High |

## Monitoring Multi-Region Deployments

### Key Metrics per Region

| Metric | What It Tells | Alert Threshold |
|---|---|---|
| `nomad.server.leader` | Leader exists | No leader for 30s |
| `nomad.broker.total_ready` | Eval backlog | > 100 |
| `nomad.client.allocated.cpu` | Resource utilization | > 80% |
| `nomad.client.unallocated.cpu` | Available capacity | < 20% |
| `consul.catalog.nodes_critical` | Node health | > 0 for 5min |
| `application.error_rate` | Application health | > 1% for 5min |
| `application.latency_p99` | Application performance | > 500ms for 5min |

### Cross-Region Monitoring Architecture

```
[us-east Nomad + Consul] -> [us-east Prometheus + Grafana]
[eu-west Nomad + Consul] -> [eu-west Prometheus + Grafana]
                                     |
                           [Global Thanos / Cortex]
                           (aggregates metrics)
                                     |
                           [Global Alertmanager]
                           (deduplicates alerts)
```

### Alert Routing

```yaml
# Alertmanager configuration
route:
  receiver: "region-oncall"
  group_by: ["region", "severity"]

  routes:
    - match:
        region: us-east
      receiver: "us-east-oncall"
    - match:
        region: eu-west
      receiver: "eu-west-oncall"
    - match:
        region: ap-southeast
      receiver: "ap-southeast-oncall"

  # Cross-region critical alerts
  - match:
      severity: critical
      scope: global
    receiver: "global-oncall"
```

## Multi-Region Operations

### Region-Wide Maintenance

1. Notify all teams of scheduled maintenance window
2. Drain traffic from region via DNS (lower weight or remove)
3. Monitor health in remaining regions
4. Perform maintenance (upgrade, hardware refresh, network change)
5. Restore traffic gradually
6. Verify all services healthy

### Adding a New Region

```hcl
# 1. Deploy Nomad server cluster in new region
# 2. Deploy Consul servers and federate WAN
# 3. Join Nomad clients
# 4. Update job specifications to include new region

multiregion {
  region "us-east" { count = 3 }
  region "eu-west" { count = 2 }
  region "sa-east" { count = 1 }  # New region
}
```

### Removing a Region

1. Drain all allocations: set region count to 0
2. Verify no active allocations
3. Update DNS to remove region
4. Decommission Nomad servers and clients
5. Remove from Consul WAN federation
6. Update job specifications

## Security Considerations

### Cross-Region Network Security

- Encrypt all cross-region traffic (TLS/mTLS)
- Use VPN or Direct Connect for inter-region connectivity
- Restrict cross-region firewalls to necessary ports only
- Network segmentation: separate management, application, and storage traffic
- Authenticate Consul WAN gossip with encryption key

### Secret Management Across Regions

- Vault replication across regions (Vault Enterprise)
- Cross-region replication for secrets
- Short-lived tokens per region
- Audit Vault access across all regions

### Compliance

- Data residency requirements per region
- Cross-border data transfer regulations
- Audit logging centralized or per-region
- Compliance controls applied consistently across regions

## Cross-Region Autoscaling

### Regional Autoscaling Policies

```hcl
group "api" {
  scaling {
    enabled = true
    min     = 1
    max     = 10

    policy {
      source = "nomap"
      check "cpu_utilization" {
        strategy = "avg"
        query    = "avg_cpu:${attr.cpu.totalpercent} > 70"
      }
    }
  }
}
```

### Global Autoscaling Considerations

- Each region scales independently based on local utilization
- Consider request queuing across regions for global load balancing
- Coordinate scale-down to avoid cascading failures across regions
- Set minimum capacity per region for baseline traffic

## Cost Implications

### Cross-Region Data Transfer Costs

| Cloud Provider | Inter-Region Cost (per GB) |
|---|---|
| AWS | $0.01-$0.09 |
| Azure | $0.01-$0.08 |
| GCP | $0.01-$0.05 |

### Cost Optimization for Multi-Region

- Minimize cross-region data transfer
- Use edge caching for egress optimization
- Co-locate dependent services within region
- Right-size per-region capacity based on actual traffic
- Consider spot instances for non-critical regional workloads

## Key Points

- Multi-region Nomad requires Nomad Enterprise for native multiregion blocks
- Consul WAN federation enables cross-region service discovery
- Active-Passive is simplest; Active-Active offers best availability
- Stateful workloads need replication strategy (database, storage, or application-level)
- DNS-based routing enables traffic management across regions
- Each region independently schedules jobs within its cluster
- Backup and restore provides baseline DR for stateless and stateful workloads
- Monitor cross-region latency, data transfer costs, and service health
- RPO and RTO targets determine replication strategy and cost
- Test DR procedures regularly (minimum quarterly)
- Security: mTLS, WAN encryption, network segmentation
- Compliance: data residency, cross-border regulations
- Cost: data transfer, redundant infrastructure, operational overhead

## Multi-Region Service Discovery

### DNS-Based Service Discovery

```hcl
# Consul DNS configuration for multi-region
data "consul_dns" "multi_region" {
  # Query other regions via Consul DNS forwarding
  allow_stale = true
  max_stale   = "5s"
  # Region prefix: <service>.service.<datacenter>.<domain>
  # Example: api.service.us-east1.consul
  service {
    name      = "api"
    datacenter = "eu-west1"
    tag       = "production"
  }
}

# Nomad service stanza with multi-region upstreams
task "api" {
  service {
    name = "api"
    port = "http"
    tags = ["production", "region-${NOMAD_REGION}"]

    check {
      type     = "http"
      path     = "/health"
      interval = "10s"
      timeout  = "2s"
    }

    # Connect sidecar for mesh
    connect {
      sidecar_service {
        proxy {
          upstreams {
            destination_name = "database"
            local_bind_port  = 5432
            datacenter       = "eu-west1"
          }
        }
      }
    }
  }
}
```

### Consul Mesh Gateways

```hcl
# Mesh gateway configuration for cross-region service mesh
gateway "mesh" "mesh-gateway" {
  # Run one mesh gateway per region
  datacenter = var.datacenter
  node_name  = "mesh-gw-${var.region}"

  bind_address   = "0.0.0.0"
  bind_port      = 8443
  advertise_address = var.public_ip

  # WAN federation for cross-region
  wan_fed {
    enabled          = true
    primary_gateways = var.primary_gateway_addresses
  }
}
```

## Multi-Region Observability

### Centralized Logging Architecture

```hcl
# Loki multi-region aggregation
variable "loki_config" {
  description = "Multi-region Loki configuration"
  type = object({
    region       = string
    is_primary   = bool
    primary_addr = string
  })
}

# Write to local Loki, query across all regions via Cortex/Grafana Mimir
job "promtail" {
  datacenters = [var.region]

  group "promtail" {
    task "promtail" {
      config {
        clients {
          url = "http://loki.${var.region}.service.consul:3100/loki/api/v1/push"
        }
        scrape_config {
          job_name = "nomad"
          nomad_config {
            server = "http://localhost:4646"
          }
        }
      }
    }
  }
}
```

### Metrics Federation

```yaml
metrics_federation:
  per_region:
    - "Prometheus in each region scrapes local targets"
    - "Thanos sidecar uploads blocks to object storage"
    - "Grafana queries Thanos querier for global view"
  configuration:
    thanos_receive:
      - "Each region runs Thanos receiver"
      - "Hashring configuration prevents data duplication"
      - "Object storage as long-term backfill source"
  global_alerting:
    - "Central Alertmanager receives alerts from all regions"
    - "Deduplication prevents alert storms"
    - "Regional silences for planned maintenance"

  architecture:
    regions:
      - name: "us-east1"
        components: [Prometheus, Thanos Sidecar, Thanos Receiver]
      - name: "eu-west1"
        components: [Prometheus, Thanos Sidecar, Thanos Receiver]
      - name: "ap-southeast1"
        components: [Prometheus, Thanos Sidecar, Thanos Receiver]
    global:
      components:
        - "Thanos Querier (global view)"
        - "Thanos Compactor (downsampling, retention)"
        - "Grafana (multi-region dashboards)"
        - "Alertmanager (global, deduplicated)"
```

## Disaster Recovery Testing

### Game Day Exercises

```yaml
game_day_scenarios:
  region_failure:
    scenario: "Simulate complete us-east1 region outage"
    steps:
      - "Block all network traffic to us-east1"
      - "Verify failover to eu-west1"
      - "Measure RTO (target: < 5 minutes)"
      - "Measure RPO (target: < 60 seconds)"
      - "Verify no data loss in active workloads"
    validation:
      - "All critical services available in secondary region"
      - "No error rate increase in external APIs"
      - "Database state consistent after failback"

  network_partition:
    scenario: "Simulate WAN connectivity loss between regions"
    steps:
      - "Block inter-region traffic"
      - "Verify each region operates independently"
      - "Verify queue/buffer behavior during partition"
      - "Measure recovery time when connectivity restored"
    validation:
      - "Each region self-sufficient"
      - "Messages queued not lost during partition"
      - "Automatic catch-up on reconnection"

  data_corruption:
    scenario: "Simulate database data corruption in primary region"
    steps:
      - "Inject corrupted records in primary database"
      - "Verify read-repair mechanism activates"
      - "Fail over to replica with clean data"
      - "Validate post-failover data integrity"
    validation:
      - "Corruption detected within 60 seconds"
      - "Clean replica promoted without data loss"
      - "Corrupted region quarantined for investigation"
```

## Reference Architecture: Three-Region Active

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Global Load Balancer                      │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Region A      │ │   Region B      │ │   Region C      │
│   us-east1      │ │   eu-west1      │ │   ap-southeast1 │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ Nomad Servers x3│ │ Nomad Servers x3│ │ Nomad Servers x3│
│ Consul Servers  │ │ Consul Servers  │ │ Consul Servers  │
│ Mesh Gateway    │ │ Mesh Gateway    │ │ Mesh Gateway    │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ Web App (3x)    │ │ Web App (3x)    │ │ Web App (3x)    │
│ API (3x)        │ │ API (3x)        │ │ API (3x)        │
│ Cache (Redis)   │ │ Cache (Redis)   │ │ Cache (Redis)   │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ DB Primary      │ │ DB Replica      │ │ DB Replica      │
│ (CockroachDB)   │ │ (CockroachDB)   │ │ (CockroachDB)   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Global Object Storage (S3)                      │
│         Logs, Metrics, Artifacts, Backups                        │
└─────────────────────────────────────────────────────────────────┘
```

## Failback Procedure

```yaml
failback_procedure:
  phase_1_preparation:
    duration: "1 hour before planned failback"
    steps:
      - "Verify primary region health (all systems green)"
      - "Sync data from secondary to primary (catch-up replication)"
      - "Reduce application TTLs for faster DNS propagation"
      - "Notify all stakeholders of planned failback window"
      - "Verify secondary region can sustain load alone"

  phase_2_execution:
    duration: "15 minutes"
    steps:
      - "Switch global load balancer to primary region"
      - "Monitor error rates and latency in primary"
      - "Verify all services healthy in primary"
      - "Promote primary database to read-write"
      - "Re-establish replication from primary to secondary"

  phase_3_validation:
    duration: "1 hour observation period"
    steps:
      - "Monitor end-to-end request success rate (target: 99.99%)"
      - "Verify cross-region replication lag (target: < 1 second)"
      - "Check batch jobs and async processing complete"
      - "Validate user-facing functionality with synthetic tests"

  phase_4_cleanup:
    duration: "Complete within 24 hours"
    steps:
      - "Scale down secondary region over-provisioned resources"
      - "Update runbooks with lessons learned"
      - "Document any configuration changes made during failover"
      - "Schedule post-mortem within 48 hours"
      - "Run tabletop exercise for next failover improvement"
```

## Multi-Region Capacity Planning

```yaml
capacity_planning:
  per_region:
    compute_reserve: "50% over peak (N+1 per region)"
    network_bandwidth: "2x projected cross-region traffic"
    storage: "30 days local retention + object storage archive"
    database: "3x working set in memory"

  global:
    total_capacity: "2N (one full region can fail)"
    burst_capacity: "150% normal (during failover)"
    headroom: "30% spare for unexpected growth"

  scaling_triggers:
    - "CPU > 70% sustained for 5 minutes"
    - "Memory > 80% sustained"
    - "Request latency p99 > 500ms"
    - "Cross-region bandwidth > 60% capacity"
    - "Database connections > 80% of pool"
    - "Queue depth > 1000 messages"
