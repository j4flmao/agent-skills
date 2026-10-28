# Nomad Fundamentals: Architecture and Scheduling Lifecycle

Core concepts of HashiCorp Nomad: cluster architecture, how a job becomes running allocations, schedulers, task drivers, and the everyday CLI. Job specification details are in `nomad-jobs.md`; integrations (Consul, Vault, CSI) in `nomad-integrations.md`; production hardening in `nomad-security-hardening.md`.

## Architecture

| Component | Role |
|-----------|------|
| Server | Holds cluster state, runs schedulers, elects a leader via Raft; 3 or 5 per region |
| Client | Runs on every worker node, fingerprints resources, executes tasks via drivers |
| Region | Independent set of servers with its own state; regions federate for cross-region jobs |
| Datacenter | Label grouping clients within a region (often an AZ) |
| Node pool | Grouping of clients that jobs can target (introduced in 1.6) |
| Namespace | Multi-tenancy boundary for jobs, ACLs, quotas |

```
          ┌─────────── Region: eu ───────────┐
          │ servers (Raft quorum: 3 or 5)     │
          │   leader ── followers             │
          └──────▲───────────────▲───────────┘
                 │ RPC (4647)    │
   clients (dc1) ┘               └ clients (dc2)
   drivers: docker, exec, java, raw_exec, podman (plugin)
```

Quorum: a 3-server cluster tolerates 1 failure; 5 tolerates 2. Do not run an even number of servers.

## Ports

| Port | Purpose |
|------|---------|
| 4646 | HTTP API and UI |
| 4647 | RPC (server–server, client–server) |
| 4648 | Serf gossip (servers; TCP/UDP) |

## From Job to Running Tasks

```
nomad job run ─► Job registered ─► Evaluation created ─► Scheduler (on a server) plans placements
   ─► Plan applied by leader (optimistic concurrency) ─► Allocations assigned to clients
   ─► Clients pull artifacts/images and start tasks ─► Deployment tracks health (service jobs)
```

| Object | Meaning |
|--------|---------|
| Job | Declarative desired state (HCL2 or JSON) |
| Task group | Set of tasks always placed together on one client (like a pod) |
| Task | A single process/container run by a driver |
| Evaluation | A request to reconcile desired vs actual state (triggered by job changes, node failures, etc.) |
| Allocation | A task group instance placed on a specific client |
| Deployment | Rolling/canary update tracking for service jobs |

## Scheduler Types

| Type | Behaviour | Example |
|------|-----------|---------|
| `service` | Long-running, rescheduled on failure, supports deployments | APIs, web apps |
| `batch` | Run to completion; retried per restart/reschedule policy | ETL, reports |
| `system` | One allocation on every eligible client | Log shippers, monitoring agents |
| `sysbatch` | Run-to-completion on every eligible client | Node maintenance scripts |

Placement uses bin packing by default (`spread` algorithm configurable at the scheduler level) plus constraints, affinities, and spreads defined in the job.

## Task Drivers

| Driver | Isolation | Notes |
|--------|-----------|-------|
| `docker` | Containers | Most common |
| `podman` | Containers (plugin) | Rootless options |
| `exec` / `exec2` | Chroot/cgroups on Linux | Run binaries without containers |
| `raw_exec` | None | Disabled by default; avoid in shared clusters |
| `java` | JVM with cgroups | Runs JARs |
| `qemu` | VMs | Legacy/VM workloads |

## Minimal Service Job

```hcl
job "web" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 3

    network {
      port "http" { to = 8080 }
    }

    service {
      name     = "web"
      port     = "http"
      provider = "nomad"            # built-in service discovery; or "consul"
      check {
        type     = "http"
        path     = "/healthz"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "app" {
      driver = "docker"
      config {
        image = "ghcr.io/acme/web:1.4.2"
        ports = ["http"]
      }
      resources {
        cpu    = 500     # MHz
        memory = 256     # MB
      }
    }
  }
}
```

Nomad has built-in service discovery (`provider = "nomad"`) for simple setups; Consul adds service mesh and richer health/DNS.

## Everyday CLI

```bash
nomad job plan web.nomad.hcl          # dry run; prints the index for check-and-set
nomad job run -check-index 42 web.nomad.hcl
nomad job status web
nomad alloc status <alloc-id>
nomad alloc logs -f <alloc-id> app
nomad alloc exec -task app <alloc-id> /bin/sh
nomad deployment status <deployment-id>
nomad job revert web <version>
nomad node status
nomad node drain -enable -deadline 30m <node-id>
nomad server members
nomad operator raft list-peers
```

`job plan` + `-check-index` prevents applying a job if someone else changed it after you planned.

## Restart vs Reschedule

| Policy | Scope | Purpose |
|--------|-------|---------|
| `restart` | Same client, same allocation | Transient crashes |
| `reschedule` | New allocation, possibly another client | Persistent failures or node loss |

Tune both to avoid hot loops: exponential delay in `reschedule`, limited `attempts` in `restart`.

## Resources

- `cpu` is in MHz shares (or `cores` for exclusive cores); `memory` is a hard limit, with optional `memory_max` for oversubscription when enabled.
- Clients fingerprint available CPU/memory; `reserved` in client config protects capacity for the OS and agents.

## Licensing Note

Nomad (like other HashiCorp products) moved from MPL 2.0 to the Business Source License in 2023, and HashiCorp is now part of IBM. Review license terms for your use case, especially if offering Nomad as part of a competing hosted service.

## Pitfalls

- Even number of servers or servers co-located with heavy workloads.
- No health checks, so deployments mark broken versions healthy.
- `raw_exec` enabled on shared clients.
- Forgetting `reserved` resources, starving the Nomad client and OS.

## Checklist

- [ ] 3 or 5 servers per region across failure domains
- [ ] Jobs use health checks and appropriate scheduler type
- [ ] `job plan` + check-index in CI deployments
- [ ] Restart and reschedule policies tuned
- [ ] Client resources reserved for system processes
- [ ] Insecure drivers disabled
