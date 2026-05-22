# Nomad Production Operations

## Overview
Running Nomad in production requires Consul integration, autoscaling, ACL security, monitoring, and multi-region planning.

## Consul Integration
Nomad uses Consul for service discovery, health checking, and cluster coordination. Register each Nomad client with Consul client. Use `consul { address = "..." }` in Nomad config. Service jobs with `service` block auto-register in Consul.

```hcl
# Client configuration
client {
  enabled = true
  servers = ["nomad-server:4647"]
  meta {
    consul = "consul-client:8500"
  }
}
```

## Autoscaling
Nomad Autoscaler is a separate binary connecting to Nomad + (optionally) Prometheus. Horizontal scaling executes `nomad job scale` based on policies.

### Horizontal Scaling Policy
```hcl
check "cpu_usage" {
  strategy "target-value" {
    target = 80
  }
  query = "avg(avg(nomad_client_allocs_cpu_total_percent{...}) by (job))"
}
```

### Configuration
- Cooldown: minimum 5 minutes between scale events
- Capacity: reserve headroom — max scale should not exceed cluster capacity
- Metrics source: Prometheus recommended (CPU, memory, custom business metrics)

## ACL Security
Enable ACLs in Nomad config: `acl { enabled = true }`. Bootstrap initial token, create policies per team/function (read-only for developers, write for operators, submit for CI/CD). Use Vault integration for secret management: `vault { enabled = true, address = "..." }`.

## Monitoring
- Nomad exposes `/v1/metrics` (Prometheus format) on client and server
- Key metrics: `nomad_client_allocs_{running,pending}`, `nomad_client_unallocated_cpu`, `nomad_server_leader`
- Monitor allocation events, eval queue depth, node status changes
- Set alerts: alloc failures >5%, node drain stuck >10m, eval queue backlog >100

## Multi-Region Deployment
Each region has its own Nomad cluster with local servers. Cross-region job replication is not automatic — use CI/CD per region. Service discovery is per-region (Consul datacenter). For cross-region failover, use Consul prepared queries connecting multiple datacenters.

## Key Points
- Consul is required for production — Nomad without Consul has no service discovery
- Autoscaler needs capacity headroom — don't target 100% cluster utilization
- ACLs prevent accidental job submission and data exposure
- Monitor Nomad server raft state — 3 or 5 servers per region, odd count only
