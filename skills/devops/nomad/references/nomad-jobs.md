# Nomad Job Specifications

## Overview
Nomad jobs define the workload lifecycle: what to run, where to run it, how to update it, and how to recover from failure. Jobs contain task groups, which contain tasks that share the same client node.

## Job Structure
```
job "example" {
  datacenters = ["dc1"]
  type = "service"          # service | batch | system | sysbatch
  # ... top-level options
  group "cache" {
    count = 3
    # ... per-group options
    task "redis" {
      driver = "docker"
      # ... per-task options
    }
  }
}
```

## Task Group Configuration

| Parameter | Purpose | Common Values |
|---|---|---|
| `count` | Number of instances | 1-100+ |
| `constraint` | Node selection filter | `${attr.kernel.name} = linux` |
| `affinity` | Soft preference (weighted) | `${node.datacenter} = us-east-1`, weight 50 |
| `network` | Network mode and ports | `mode = "bridge"`, `port "http" {}` |
| `service` | Consul service registration | Service name, port, health check |
| `restart` | Failure recovery | `attempts = 3`, `interval = "30m"` |
| `reschedule` | Re-run on another node | `attempts = 5`, `interval = "1h"` |
| `ephemeral_disk` | Scratch disk size | `size = 300`, `sticky = true` |

## Job Types

### Service Jobs
Long-running processes with update support. Supports rolling updates, canary deployments, blue-green. Health checks required. Example: web servers, API backends, databases.

### Batch Jobs
Finite workloads that run to completion. Supports periodic scheduling (`periodic { cron = "..." }`) and parameterization (`parameterized { payload = "required" }`). Example: ETL jobs, backup tasks, one-time migrations.

### System Jobs
Runs one instance per client node. No scaling or updates in traditional sense — update by submitting new version. Example: log shippers, monitoring agents, CNI plugins.

## Volumes

| Type | Use Case | Persistence |
|---|---|---|
| Host volume | Pre-configured dir on client | Manual backup |
| CSI volume | Dynamic provisioning (EBS, GCE PD) | Snapshot/backup via CSI |
| Ephemeral | Scratch space | Lost with allocation |

## Update Strategies
- **Rolling update**: `max_parallel = 1`, `min_healthy_time = "10s"`, `progress_deadline = "10m"`
- **Canary**: `canary = 1`, manual `nomad job promote` after verification
- **Blue-green**: Submit new job version alongside old, switch Consul tags
- **Auto-rollback**: `auto_revert = true` on `sticky = true`

## Key Points
- Always set resource limits — no-constraint jobs can overload clients
- Health checks mandatory for service jobs
- Batch jobs need restart policy — failures happen in finite workloads
- Parameterized batch jobs enable ad-hoc execution with different inputs
