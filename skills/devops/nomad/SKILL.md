---
name: devops-nomad
description: >
  Use this skill when the user says 'Nomad', 'HashiCorp Nomad', 'Nomad job', 'Nomad job spec', 'Nomad workload', 'Nomad cluster', 'Nomad autoscaling', 'Consul Nomad', 'Nomad batch job', 'Nomad service job'. This skill enforces: job specification structure with task groups and tasks, service discovery via Consul integration, volume management with CSI and host volumes, autoscaling policies with Nomad Autoscaler, batch vs service job patterns, and multi-region deployment strategies. Do NOT use for: Kubernetes workload management, Docker Compose deployments, or Terraform infrastructure provisioning (use separate HashiCorp skills for those).
version: "1.0.0"
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
└── {task-group}: {count} tasks, {count} instances
Volume Claims: {type}:{size}
Update Strategy: {rolling/canary/blue-green}
Service Discovery: {Consul/direct}
Scaling: {fixed/autoscaling} ({min}-{max})
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

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
Service: long-running processes (API servers, web apps, databases) — supports updates, canaries, and scaling. Batch: finite workloads (ETL jobs, data processing, backups) — can be periodic or parameterized. System: runs on every client node (logging agents, monitoring daemons, CNI plugins). Sysbatch: batch but runs on every node once.

### Step 2: Define Task Groups
Each task group is a set of tasks that run together on the same client. Group by co-location requirement. Set count (instances), constraints (node attributes, datacenter), affinity rules (prefer SSD, prefer specific rack), and network configuration (host, bridge, or none).

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
Integrated via `service` block inside task group. Consul automatically registers service instances with health checks. Connect to Consul via `network.mode = "bridge"` with Consul DNS or `connect` block for service mesh. Service tags enable traffic splitting and blue-green routing.

### Step 4: Volume Management
Host volumes: pre-configured on client nodes, simple bind mounts. CSI volumes: dynamic provisioning via CSI plugins (AWS EBS, GCE PD, Portworx). Ephemeral volumes: scratch space tied to allocation lifecycle. For stateful workloads, prefer CSI with backup strategy over host volumes.

### Step 5: Update Strategy
Rolling update: `max_parallel = 1`, `health_check = "checks"`, `min_healthy_time = "10s"`. Canary: percentage-based gradual rollout with manual promotion. Blue-green: deploy new version alongside old, switch traffic via Consul. Auto-revert: `auto_revert = true` on `sticky = true` to rollback on job failure.

### Step 6: Autoscaling
Nomad Autoscaler: horizontal scaling based on CPU/memory utilization or custom metrics. Configure Horizontal Scaling Policy and Horizontal Scaling Check. Vertical scaling: adjust CPU/memory based on historical usage. Cooldown between scale events (minimum 5 minutes).

## Rules
- Resource reservations must include CPU and memory — no infinite/unbounded resources
- Every service port must have a health check
- Batch jobs must have `restart` block for failure handling
- Update strategies require `check_restart` or health check for canary validation
- Sensitive variables must use Vault integration, not environment variables in job spec
- Never run stateful workloads on host volumes without backup strategy
- Autoscaling policies must have min/max bounds to prevent runaway scaling

## References
  - references/nomad-advanced.md — Nomad Advanced Topics
  - references/nomad-fundamentals.md — Nomad Fundamentals
  - references/nomad-integrations.md — Nomad Integrations
  - references/nomad-jobs.md — Nomad Job Specifications
  - references/nomad-operations.md — Nomad Operations
  - references/nomad-production.md — Nomad Production Operations
## Handoff
`devops/incident-response` for Nomad cluster incident runbooks (allocation failures, node draining, cluster scale-up)
`planning/create-adr` for Nomad architecture decisions (job structure, multi-region topology, Consul mesh)
