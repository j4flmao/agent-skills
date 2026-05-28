---
name: devops-nomad
description: >
  Use this skill when the user says 'Nomad', 'HashiCorp Nomad', 'Nomad job', 'Nomad job spec', 'Nomad workload', 'Nomad cluster', 'Nomad autoscaling', 'Consul Nomad', 'Nomad batch job', 'Nomad service job'. This skill enforces: job specification structure with task groups and tasks, service discovery via Consul integration, volume management with CSI and host volumes, autoscaling policies with Nomad Autoscaler, batch vs service job patterns, and multi-region deployment strategies. Do NOT use for: Kubernetes workload management, Docker Compose deployments, or Terraform infrastructure provisioning (use separate HashiCorp skills for those).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, orchestration, hashicorp, phase-10]
---

# Nomad Workload Orchestration

## Purpose
Design and deploy Nomad job specifications covering task groups, service discovery, volume management, autoscaling, and multi-region operation for batch and service workloads.

## Agent Protocol

### Trigger
"Nomad", "HashiCorp Nomad", "Nomad job", "job spec", "Nomad workload", "Nomad cluster", "Nomad autoscaling", "Consul", "Nomad batch", "Nomad service", "Nomad job plan", "Nomad task group", "Nomad volume", "Nomad CSI", "Nomad canary", "Nomad update strategy".

### Input Context
- Workload type (service, batch, system, sysbatch)
- Task driver (Docker, exec, Java, QEMU, raw_exec)
- Resource requirements (CPU, memory, network, storage)
- Service discovery needs (Consul integration yes/no)
- Volume requirements (host volume, CSI, NFS)
- Scaling requirements (fixed count, horizontal autoscaling)
- Multi-region or single-region deployment

### Output Artifact
Nomad deployment plan with complete job specifications, scaling configuration, service discovery setup, and operational runbooks.

### Response Format
```
Nomad Job: {job-name}
Type: {service/batch/system}
Region: {region}
Task Groups: {count}
--- {task-group}: {count} tasks, {count} instances
Volume Claims: {type}:{size}
Update Strategy: {rolling/canary/blue-green}
Service Discovery: {Consul/direct}
Scaling: {fixed/autoscaling} ({min}-{max})
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick.

### Completion Criteria
- [ ] Job type selected with justification (service vs batch vs system)
- [ ] Task groups defined with CPU/memory reservations and constraints
- [ ] Each task configured with driver, config, and resources
- [ ] Service discovery configured with Consul (or alternative documented)
- [ ] Volumes defined (host, CSI, or ephemeral)
- [ ] Update strategy specified (rolling update, canary, blue-green)
- [ ] Autoscaling policy defined if applicable
- [ ] Multi-region considerations documented if applicable

### Max Response Length
400 lines

## Workflow

### Step 1: Select Job Type
Service: long-running processes (API servers, web apps, databases) -- supports updates, canaries, and scaling. Batch: finite workloads (ETL jobs, data processing, backups) -- can be periodic or parameterized. System: runs on every client node (logging agents, monitoring daemons, CNI plugins). Sysbatch: batch but runs on every node once. For parameterized batch, define `parameterized` block with `payload` or `meta_required` parameters. For periodic batch, use `periodic` block with `cron` expression and `prohibit_overlap = true` to prevent concurrent runs.

### Step 2: Define Task Groups
Each task group is a set of tasks that run together on the same client. Group by co-location requirement. Set count (instances), constraints (node attributes, datacenter), affinity rules (prefer SSD, prefer specific rack), and network configuration (host, bridge, or none). Use `spread` block to distribute across failure domains. Reserve CPU and memory at the task level -- never overcommit above 80% of node capacity. For GPU workloads, set `constraint { attribute = "${attr.driver.gpu.count}", operator = ">", value = "0" }`.

```hcl
group "api" {
  count = 3
  network {
    mode = "bridge"
    port "http" { to = 8080 }
  }
  service {
    name = "api"
    port = "http"
    tags = ["api", "production"]
    check {
      type     = "http"
      path     = "/health"
      interval = "10s"
      timeout  = "2s"
    }
  }
  task "server" {
    driver = "docker"
    config {
      image = "org/api:v1.0.0"
      ports = ["http"]
    }
    resources {
      cpu    = 500
      memory = 256
    }
  }
}
```

### Step 3: Service Discovery with Consul
Integrated via `service` block inside task group. Consul automatically registers service instances with health checks. Connect to Consul via `network.mode = "bridge"` with Consul DNS or `connect` block for service mesh. Service tags enable traffic splitting and blue-green routing. For Consul Connect native integration, configure `connect { sidecar_service { ... } }` block inside the task group. Native service mesh provides mTLS, L7 routing, and intent-based authorization without sidecar overhead.

### Step 4: Volume Management
Host volumes: pre-configured on client nodes, simple bind mounts. CSI volumes: dynamic provisioning via CSI plugins (AWS EBS, GCE PD, Portworx). Ephemeral volumes: scratch space tied to allocation lifecycle. For stateful workloads, prefer CSI with backup strategy over host volumes. Define volume claim block referencing a `volume { type = "csi" ... }` or `host_volume "name"` on the client. CSI volumes support snapshots, cloning, and resize operations.

### Step 5: Update Strategy
Rolling update: `max_parallel = 1`, `health_check = "checks"`, `min_healthy_time = "10s"`. Canary: percentage-based gradual rollout with manual promotion using `canary = 1` for initial canary group. Blue-green: deploy new version alongside old, switch traffic via Consul with `canary = -1` (does not automatically promote). Auto-revert: `auto_revert = true` on `sticky = true` to rollback on job failure. `progress_deadline` sets max time for deployment progress before auto-revert triggers. Monitor deployment with `nomad job status <job>` and `nomad deployment status <id>`.

### Step 6: Autoscaling
Nomad Autoscaler: horizontal scaling based on CPU/memory utilization or custom metrics. Configure Horizontal Scaling Policy and Horizontal Scaling Check. Vertical scaling: adjust CPU/memory based on historical usage. Cooldown between scale events (minimum 5 minutes). Autoscaler runs as a Nomad job itself (`nomad-autoscaler`). Configure `scaling` block inside task group with policy source. Use `target` type for horizontal scaling with `min` and `max` count. APM strategies: `avg` for average across group, `max` for max across group.

### Step 7: Multi-Region Deployment
Nomad Enterprise supports multi-region federation. Each region has its own server cluster. Jobs can be deployed across regions with `multiregion` block. Configure `region "us-east" { count = 3 }`, `region "eu-west" { count = 2 }`. Each region maintains independent scheduling state. Cross-region service discovery uses Consul WAN federation. For DR, run active-passive with replication via Consul KV snapshots and Nomad state backups.

### Step 8: Vault Integration
Nomad integrates with HashiCorp Vault for secrets management. Configure `vault { policies = [...] }` block at task level. Vault token is automatically provisioned to the task. Use `template` block to render secrets to files within the allocation directory. Vault token TTL must exceed task's maximum runtime. For batch jobs, set `change_mode = "restart"` on template to read Vault secrets on renewal.

### Step 9: Node Pools and Affinity
Use `constraint` for hard requirements (must run on specific datacenter, OS, or architecture). Use `affinity` for soft preferences (prefer fast SSD, prefer specific rack). `spread` block distributes allocations evenly across targets. Combine spread with affinities for balanced placement with preferences. Weight is an integer from -100 to 100 on affinities. Node eligibility managed via `nomad node eligibility -self` or API.

## Architecture / Decision Trees

### Deployment Architecture Options

| Architecture | Pros | Cons | Best For |
|---|---|---|---|
| Single Region, Single DC | Simple ops, low latency | No fault tolerance | Dev/test, small teams |
| Single Region, Multi-DC | AZ fault tolerance, lower latency per AZ | Cross-AZ bandwidth costs | Production workloads |
| Multi-Region (Enterprise) | Region-level DR, global services | Complex ops, WAN latency, licensing cost | Global enterprise |
| Single Server Dev Mode | Quick evaluation | No HA, data loss risk | Local dev only |

### Decision Tree: Clustered vs Standalone Consul
Clustered Consul: required for production with service mesh, WAN federation, and KV store replication. Standalone dev Consul: acceptable for single-node dev clusters, no HA guarantees. Decision factor: if `connect` block or multi-region service discovery is needed, use clustered Consul.

### Scheduling Strategy Decisions

| Strategy | Use When |
|---|---|
| Bin Pack | Maximize utilization, reduce node count |
| Spread | Maximize availability, distribute evenly |
| Node Classes | Separate workload types (GPU vs general) |
| Resource Constraints | GPU workloads, special hardware |

### Persistent Volume Decision Tree
- Stateless app: ephemeral disk (no volume needed)
- Stateful app, <= 1TB, single-region: CSI volume
- Stateful app, multi-region: CSI with replication + backup
- Legacy app, simple mount: host volume
- Scratch space, temp data: ephemeral volume

### Update Strategy Decision Tree
- Zero downtime needed: canary with auto-promote
- Quick rollback desired: blue-green
- Simple, minimal config: rolling update
- Stateful app cautious: canary with manual promote

## Common Pitfalls

### Pitfall 1: Running Batch Jobs Without Restart Blocks
Batch jobs default to no restart on failure. Without explicit `restart` block, a failed batch allocation is permanently dead. Always define `restart { attempts = 3, interval = "30m", delay = "15s", mode = "delay" }` for batch jobs. Use `mode = "fail"` only when idempotency guarantees exist.

### Pitfall 2: Over-allocating CPU/Memory
Nomad does not enforce CPU limits by default (unlike K8s). A starving task consumes all available CPU on the node, starving other allocations. Always set explicit `resources { cpu = N, memory = M }`. Use `cpu = N/MHz` units. Monitor with `nomad alloc status -stats <alloc-id>`. Memory oversubscription must be explicitly enabled per client.

### Pitfall 3: Health Check Misconfiguration
Missing health checks on service ports lead to failed deployments with no feedback. Health check misconfiguration (wrong path, too short timeout) causes flapping. Set `check_restart { limit = 3, grace = "30s", ignore_warnings = false }` to restart unhealthy allocations. gRPC checks require `type = "grpc"` with `port` and `service` fields.

### Pitfall 4: Ignoring Network Configuration
Default network mode is `none` -- tasks cannot communicate. Tasks needing network access must set `network { mode = "bridge" | "host" }`. Bridge mode requires port mapping. Host mode shares node IP. For Consul service mesh, `mode = "bridge"` is required. Cross-task communication within the same group happens over `localhost`.

### Pitfall 5: Mismatched Nomad and Consul Versions
Nomad and Consul version compatibility matters. Nomad 1.x requires Consul 1.x minimum. Always check the compatibility matrix before upgrade. Upgrade Consul before Nomad. Consul service mesh (Connect) requires Consul 1.6+.

### Pitfall 6: Not Pinning Docker Image Versions
Using `latest` tag in Docker config causes non-deterministic deployments. Different nodes pull different versions. Always use semantic version tags or commit SHAs. Configure `image_pull_policy = "always"` vs `"if-not-present"` deliberately.

### Pitfall 7: Single Server Deployment
Running Nomad with one server offers no HA. Server failure = cluster downtime. Minimum 3 servers for production. Use odd number (3, 5, 7) for Raft consensus. Deploy servers across failure domains (AZs, racks).

### Pitfall 8: Volume Backup Without Strategy
CSI volumes and host volumes are not backed up by default. Losing the underlying node loses the data. Always configure backup targets for stateful workloads. S3-compatible backup target minimum. Test restore procedure quarterly.

### Pitfall 9: Ignoring Task Pinning
Re-using the same port across tasks in a group without `static = true` leads to port conflicts on restart. Use `port "http" { static = 8080 }` for fixed ports or omit for dynamic ports. Use `to = N` for port mapping inside container.

### Pitfall 10: GC and Garbage Collection Defaults
Nomad GC reclaims resources from dead allocations. Default GC interval (5 minutes) can accumulate large state. Set `gc_interval = "30s"` for high-churn clusters. Monitor GC pressure with `nomad system gc`. Excessive GC delay causes disk space issues on server nodes.

## Best Practices

### Job Specification
- Use HCL2 `variables` for reusable job templates with `variable "count" { type = number }` and `count = var.count`
- Separate template files: `variables.hcl`, `job.hcl`, `task-groups/`
- Pin Docker versions with SHA256 digest: `image = "org/api@sha256:abc123..."`
- Always set `restart` block for batch jobs
- Use `check_restart` for all service jobs with health checks
- Set `reschedule { attempts = 2, interval = "30m" }` for service jobs
- Keep job spec files in version control alongside application code

### Clustering
- Minimum 3 servers, 3+ clients in production
- Deploy servers on separate nodes from clients
- Use dedicated storage for server Raft logs (SSD/NVMe)
- Enable `server_join.retry_join` with list of server addresses
- Configure `encrypt` key for gossip protocol encryption
- Set `verify_https_client` and `verify_server_hostname` for mTLS

### Security
- Enable ACLs in production: `acl { enabled = true }`
- Create namespaces for multi-team isolation: `namespace "team-a" { ... }`
- Use Vault for secret injection, never env vars in job spec
- Enable mTLS between all Nomad components
- Audit all API requests with audit logging (Nomad Enterprise)
- Restrict raw_exec driver to trusted nodes only

### Observability
- Export Nomad metrics to Prometheus: `telemetry { prometheus_metrics = true }`
- Key metrics to monitor: `nomad.client.allocated.memory`, `nomad.broker.total_ready`, `nomad.raft.applyTime`
- Alert on: node down >5min, server leadership loss, eval backlog >100
- Use `nomad operator debug` for cluster diagnostics
- Enable structured logging: `log_level = "info"`, `log_json = true`

## Compared With

### Nomad vs Kubernetes
| Aspect | Nomad | Kubernetes |
|---|---|---|
| Complexity | Low -- single binary, simple config | High -- control plane, CNI, CSI, CRDs, operators |
| Scheduling | Bin-pack, spread, affinity, constraints | PodSpec, nodeSelector, affinity/anti-affinity, taints/tolerations |
| Networking | Simple bridge/host mode | Complex -- CNI plugins, service mesh, ingress controllers |
| Stateful Workloads | CSI volumes, host volumes | StatefulSets, PVC, CSI, operators |
| Autoscaling | Nomad Autoscaler (separate install) | HPA/VPA, Cluster Autoscaler, KEDA |
| Service Discovery | Consul integration (external) | Native DNS, built-in service mesh options |
| Multi-Region | Enterprise feature | Federation V2 (alpha), cluster API |
| Learning Curve | Low | High |
| Community Size | Small-Medium | Very Large |

### Nomad vs Docker Compose
Docker Compose: single-host container orchestration, no HA, no service discovery, no scaling. Nomad: multi-host, HA scheduling, service discovery, rolling updates, multi-region. Compose is appropriate for local dev only. Nomad for any multi-host deployment.

### Nomad vs AWS ECS
ECS: AWS-managed, EFS/EBS integration, no multi-cloud. Nomad: multi-cloud, multi-region, multi-datacenter. ECS simpler for AWS-only shops. Nomad better for hybrid/multi-cloud.

## Operations & Maintenance

### Server Maintenance
- Upgrades: always upgrade one minor version at a time. Never skip versions.
- Server draining: `nomad server force-leave <server>` for dead servers only
- Raft snapshot management: `nomad operator raft snapshot save` before upgrades
- Server backup: backup `data_dir` on server nodes (Raft state, job specs, ACL tokens)
- Monitor Raft leader stability: `nomad operator raft list-peers`

### Client Maintenance
- Node draining: `nomad node drain -enable -yes <node-id>` before maintenance
- Drain with deadline: `-deadline "1h"` forces stop after deadline
- Monitor drain progress: `nomad node status <node-id>`
- After maintenance: `nomad node drain -disable <node-id>`
- For persistent volumes, migrate data before draining
- Use node classes (`node_class = "gpu"`) for targeted scheduling during maintenance

### Backup and Restore
- Server state: snapshot `data_dir/server/raft/snapshots/`
- Job specs: store in version control, not just in cluster
- ACL tokens: export with `nomad acl token list` periodically
- Restore procedure: stop servers, restore data_dir, restart, verify quorum
- Test restore in isolated environment first

### Capacity Planning
- Monitor `nomad.client.allocated.cpu` and `.memory` against `nomad.client.unallocated.*`
- Plan for 30% headroom on compute resources
- Add nodes when aggregate allocation exceeds 70% of total capacity
- Use `nomad node status -self` for per-node utilization
- Batch jobs require peak capacity planning -- schedule during off-peak

### Incident Response
1. Check server cluster health: `nomad server members`
2. Check node status: `nomad node status`
3. Check eval queue: `nomad eval list`
4. Check job status: `nomad job status <job>`
5. Check allocation logs: `nomad alloc logs <alloc-id>`
6. For stuck allocations: `nomad alloc stop <alloc-id>`
7. For deployment failures: `nomad deployment fail <deployment-id>`
8. Gather debug info: `nomad operator debug`

## Rules
- Resource reservations must include CPU and memory -- no infinite/unbounded resources
- Every service port must have a health check (HTTP, TCP, gRPC, or script)
- Batch jobs must have `restart` block for failure handling
- Update strategies require `check_restart` or health check for canary validation
- Sensitive variables must use Vault integration, not environment variables in job spec
- Never run stateful workloads on host volumes without backup strategy
- Autoscaling policies must have min/max bounds to prevent runaway scaling
- Minimum 3 servers in production clusters -- odd numbers only
- Server and client nodes must run on separate infrastructure
- mTLS enabled between all Nomad components in production
- Network encryption enabled with gossip key
- Every job spec stored in version control alongside application code
- Docker images pinned with tags or digests -- no `latest` in production
- Node drain before any client maintenance -- always verify completions
- One minor version upgrade at a time -- test in non-production first
- Namespaces enabled for multi-team clusters
- Raw_exec driver disabled except on trusted, isolated nodes

## References
- references/nomad-fundamentals.md -- Nomad Fundamentals
- references/nomad-advanced.md -- Nomad Advanced Topics
- references/nomad-jobs.md -- Nomad Job Specifications
- references/nomad-integrations.md -- Nomad Integrations
- references/nomad-operations.md -- Nomad Operations
- references/nomad-production.md -- Nomad Production Operations
- references/nomad-multi-region-deployment.md -- Nomad Multi-Region Deployment
- references/nomad-security-hardening.md -- Nomad Security Hardening

## Handoff
`devops/incident-response` for Nomad cluster incident runbooks (allocation failures, node draining, cluster scale-up)
`planning/create-adr` for Nomad architecture decisions (job structure, multi-region topology, Consul mesh)
