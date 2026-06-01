---
name: nomad
description: >
  Use this skill when the user says 'nomad', 'hashicorp nomad',
  'nomad job', 'nomad cluster', 'nomad server', 'nomad client',
  'nomad namespace', 'nomad ACL', 'nomad autoscaler', 'nomad
  pack', 'nomad consul', 'nomad vault', 'nomad CSI', 'nomad
  batch job', 'nomad system job', 'nomad service job',
  'nomad periodic job', 'nomad parameterized job',
  'nomad scaling', 'nomad canary', 'nomad update',
  'nomad drain', 'nomad eval', 'nomad allocation',
  'nomad volume', 'nomad host volume', 'nomad secrets',
  'nomad template', 'nomad artifact', 'nomad dispatch',
  'CNI', 'nomad networking', 'nomad service discovery',
  'nomad connect', 'nomad consul connect', 'nomad envoy'.
  Covers: HashiCorp Nomad job scheduling, cluster operations,
  ACLs, secrets integration, CSI volumes, autoscaling, canary
  deployments, networking with Consul Connect.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, nomad, hashicorp, orchestrator, scheduler, phase-4]
---

# Nomad

## Purpose
Deploy and operate HashiCorp Nomad for workload scheduling, service orchestration, batch processing, and canary deployments with Consul and Vault integration.

## Agent Protocol

### Trigger
Exact user phrases: "nomad", "nomad job", "nomad cluster", "nomad server", "nomad client", "nomad ACL", "nomad autoscaler", "nomad pack", "nomad CSI", "nomad batch job", "nomad periodic job", "nomad scaling", "nomad canary", "nomad drain", "nomad template", "nomad service discovery", "nomad connect", "consul connect nomad".

### Input Context
- Nomad cluster size and topology.
- Integration with Consul and Vault.
- Job types: service, batch, system, periodic, parameterized.
- Networking: host, bridge, Consul Connect.
- Storage: host volumes or CSI.

### Output Artifact
Nomad job specification (HCL) or cluster configuration.

### Response Format
Nomad HCL job specification. No preamble.

### Completion Criteria
- [ ] Job specification written with correct type, task groups, tasks.
- [ ] Networking configured (host, bridge, or Consul Connect sidecar).
- [ ] Secrets from Vault or template stanza configured.
- [ ] Update strategy (canary, rolling, blue-green) defined.
- [ ] Scaling policy defined.
- [ ] ACL policies and namespace configuration set.
- [ ] Monitoring with Nomad autoscaler and Consul health checks.

### Max Response Length
400 lines.

## Quick Start
Write `job.hcl` → `nomad job plan job.hcl` (dry run) → `nomad job run job.hcl` → `nomad job status my-job` → `nomad alloc status <alloc-id>` → `nomad job promote my-job` for canary.

## Decision Tree: Job Types
| Job Type | Use Case | Lifecycle | Restart Policy |
|----------|----------|-----------|----------------|
| **service** | Web apps, API servers, long-running | Runs continuously | Always restart on failure |
| **batch** | Data processing, migrations | Runs to completion | Retry on failure, then fail |
| **system** | Log shippers, node-exporter, CNI | Runs on every client | Always restart, runs everywhere |
| **periodic** | Cron jobs, scheduled tasks | Batch job run on cron | Each run is a batch job instance |
| **parameterized** | CI/CD jobs, ad-hoc tasks | Dispatched with payload | Each dispatch is a batch job |

## Core Workflow

### Step 1: Nomad Cluster Configuration
```hcl
# server.hcl
server {
  enabled          = true
  bootstrap_expect = 3
  data_dir         = "/opt/nomad/data"
}

# Client configuration
client {
  enabled       = true
  node_class    = "general"
  servers       = ["10.0.1.10:4647", "10.0.1.11:4647", "10.0.1.12:4647"]
  host_volume "docker-data" {
    path      = "/data/docker"
    read_only = false
  }
  host_volume "prometheus-data" {
    path      = "/data/prometheus"
    read_only = false
  }
}

# Consul integration
consul {
  address             = "10.0.1.20:8500"
  server_service_name = "nomad"
  client_service_name = "nomad-client"
  auto_advertise      = true
}

# Vault integration
vault {
  enabled          = true
  address          = "https://vault.service.consul:8200"
  create_from_role = "nomad-cluster"
}

# ACL configuration
acl {
  enabled = true
}

# Audit logging
audit {
  enabled = true
}
```

### Step 2: Service Job with Canary
```hcl
# webapp.hcl
job "webapp" {
  datacenters = ["dc1"]
  namespace   = "production"
  type        = "service"

  group "web" {
    count = 3

    network {
      mode = "bridge"
      port "http" {
        to = 8080
      }
    }

    service {
      name = "webapp"
      port = "http"
      provider = "consul"
      tags = ["production", "web"]

      check {
        type     = "http"
        path     = "/healthz"
        interval = "10s"
        timeout  = "2s"
      }

      check_restart {
        limit           = 3
        grace           = "30s"
        ignore_warnings = false
      }
    }

    task "web" {
      driver = "docker"

      config {
        image = "myorg/webapp:${NOMAD_ALLOC_INDEX}"
        ports = ["http"]
        volumes = [
          "local/config.yaml:/etc/webapp/config.yaml",
        ]
      }

      template {
        data        = <<EOH
server:
  port: {{ env "NOMAD_PORT_http" }}
  environment: {{ key "environments/production/name" }}
database:
  url: {{ with secret "secret/data/webapp" }}{{ .Data.data.database_url }}{{ end }}
EOH
        destination = "local/config.yaml"
      }

      resources {
        cpu    = 500
        memory = 256
      }

      env {
        LOG_LEVEL = "info"
        NODE_NAME = "${node.unique.name}"
      }
    }

    update {
      max_parallel     = 1
      canary           = 1
      min_healthy_time = "30s"
      healthy_deadline = "5m"
      progress_deadline = "10m"
      auto_revert       = true
      auto_promote      = false
      stagger           = "30s"
    }

    restart {
      attempts = 3
      delay    = "15s"
      interval = "30m"
      mode     = "fail"
    }

    reschedule {
      attempts      = 10
      interval      = "168h"
      delay         = "30s"
      delay_function = "exponential"
      max_delay     = "1h"
    }
  }
}
```

### Step 3: Batch Job (Data Processing)
```hcl
job "data-pipeline" {
  datacenters = ["dc1"]
  type        = "batch"

  group "process" {
    count = 1

    task "etl" {
      driver = "docker"

      config {
        image = "myorg/etl:latest"
        args  = ["--input", "${NOMARDATA_DIR}/input", "--output", "${NOMARDATA_DIR}/output"]
      }

      artifact {
        source      = "https://data.example.com/input/${NOMAD_JOB_NAME}.csv"
        destination = "local/input"
        options {
          checksum = "md5:c2713d50..."
        }
      }

      resources {
        cpu    = 2000
        memory = 4096
      }

      logs {
        max_files     = 3
        max_file_size = 10
      }
    }
  }
}
```

### Step 4: System Job (Node-Level)
```hcl
job "node-exporter" {
  datacenters = ["dc1"]
  type        = "system"

  group "exporter" {
    network {
      mode = "host"
      port "metrics" {
        static = 9100
      }
    }

    service {
      name     = "prometheus-node-exporter"
      port     = "metrics"
      provider = "consul"
    }

    task "exporter" {
      driver = "docker"

      config {
        image = "prom/node-exporter:latest"
        args  = [
          "--path.rootfs=/host",
          "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)",
        ]
        volumes = ["/:/host:ro,rslave"]
      }

      resources {
        cpu    = 100
        memory = 64
      }
    }
  }
}
```

### Step 5: Periodic Job (Scheduled)
```hcl
job "db-backup" {
  datacenters = ["dc1"]
  type        = "batch"

  periodic {
    cron               = "0 2 * * *"
    time_zone          = "UTC"
    prohibit_overlap   = true
  }

  group "backup" {
    task "pg_dump" {
      driver = "docker"

      config {
        image = "myorg/pg-backup:latest"
        args  = [
          "--host", "postgres.service.consul",
          "--db", "production",
          "--bucket", "s3://backups/db/"
        ]
      }

      template {
        data = <<EOH
PGPASSWORD={{ with secret "secret/data/postgres" }}{{ .Data.data.password }}{{ end }}
AWS_ACCESS_KEY_ID={{ with secret "secret/data/aws" }}{{ .Data.data.access_key }}{{ end }}
AWS_SECRET_ACCESS_KEY={{ with secret "secret/data/aws" }}{{ .Data.data.secret_key }}{{ end }}
EOH
        destination = "secrets/env"
        env         = true
      }

      resources {
        cpu    = 500
        memory = 512
      }
    }
  }
}
```

### Step 6: Parameterized Job (CI/CD Dispatch)
```hcl
job "ci-build" {
  datacenters = ["dc1"]
  type        = "batch"

  parameterized {
    payload       = "required"
    payload_opts  = ["repository", "branch", "commit_sha"]
  }

  group "build" {
    task "build" {
      driver = "docker"

      config {
        image = "myorg/ci-runner:latest"
        args  = [
          "build",
          "--repo", "${NOMAD_META_repository}",
          "--branch", "${NOMAD_META_branch}",
          "--sha", "${NOMAD_META_commit_sha}",
        ]
        payload = "local/payload.tar.gz"
      }

      resources {
        cpu    = 2000
        memory = 4096
      }
    }
  }
}
```

```bash
# Dispatch a parameterized job
nomad job dispatch -meta repository=myorg/app \
  -meta branch=main \
  -meta commit_sha=abc123 \
  ci-build

# Check status of specific dispatch
nomad job status ci-build/dispatch-abc123
```

### Step 7: Consul Connect (Service Mesh)
```hcl
job "api" {
  datacenters = ["dc1"]
  type        = "service"

  group "api" {
    count = 3

    network {
      mode = "bridge"
    }

    service {
      name = "api"
      port = "http"
      provider = "nomad"
      connect {
        sidecar_service {
          proxy {
            upstreams {
              destination_name = "postgres"
              local_bind_port  = 5432
            }
            upstreams {
              destination_name = "redis"
              local_bind_port  = 6379
            }
          }
        }
      }
    }

    task "api" {
      driver = "docker"
      config {
        image = "myorg/api:latest"
      }
      env {
        DATABASE_URL = "postgres://user:pass@${NOMAD_UPSTREAM_ADDR_postgres}/db"
        REDIS_URL    = "redis://${NOMAD_UPSTREAM_ADDR_redis}/0"
      }
      resources {
        cpu    = 500
        memory = 256
      }
    }
  }
}
```

### Step 8: CSI Volume (PostgreSQL on Nomad)
```hcl
# Register volume first:
# nomad volume create volume.hcl

# volume.hcl
type = "csi"
id   = "postgres-data"
name = "postgres-data"
capability {
  access_mode     = "single-node-writer"
  attachment_mode = "file-system"
}
plugin_id = "org.democratic-csi.nfs"
secrets {
  server    = "nfs.example.com"
  share     = "/exports/postgres"
}

# Job using CSI volume
job "postgres" {
  datacenters = ["dc1"]
  type        = "service"

  group "db" {
    volume "data" {
      type      = "csi"
      source    = "postgres-data"
      access_mode = "single-node-writer"
      attachment_mode = "file-system"
    }

    network {
      mode = "bridge"
      port "postgres" {
        to = 5432
      }
    }

    service {
      name     = "postgres"
      port     = "postgres"
      provider = "consul"
      check {
        type     = "tcp"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "postgres" {
      driver = "docker"
      config {
        image = "postgres:16"
      }
      volume_mount {
        volume      = "data"
        destination = "/var/lib/postgresql/data"
      }
      env {
        POSTGRES_PASSWORD = "{{ with secret \"secret/data/postgres\" }}{{ .Data.data.password }}{{ end }}"
        POSTGRES_DB       = "app"
      }
      resources {
        cpu    = 1000
        memory = 1024
      }
    }
  }
}
```

### Step 9: Autoscaling
```hcl
# autoscaler.hcl (Nomad Autoscaler configuration)
apm "prometheus" {
  driver = "prometheus"
  config {
    address = "http://prometheus.service.consul:9090"
  }
}

target "nomad" {
  driver = "nomad"
  config {
    address = "http://localhost:4646"
  }
}

strategy "target-value" {
  driver = "target-value"
}

# Scaling policy in job spec
job "webapp" {
  group "web" {
    scaling {
      enabled = true
      min     = 3
      max     = 20

      policy {
        cooldown            = "5m"
        evaluation_interval = "1m"
        check "cpu_util" {
          source = "prometheus"
          query  = "avg(cpu_usage_active{job=~\"${NOMAD_JOB_NAME}\"})"
          strategy "target-value" {
            target = 60
          }
        }
      }
    }
  }
}
```

### Step 10: Nomad ACLs
```hcl
# policy.hcl
namespace "production" {
  policy = "write"
  capabilities = ["list-jobs", "read-job", "submit-job", "dispatch-job", "read-logs", "read-exec", "sentinel-override"]
}

namespace "staging" {
  policy = "write"
  capabilities = ["list-jobs", "read-job", "submit-job", "dispatch-job"]
}

namespace "*" {
  policy = "deny"
}

agent {
  policy = "read"
}

operator {
  policy = "read"
}

# Apply policy
# nomad acl policy apply webapp-deploy webapp.hcl

# Create token
# nomad acl token create -name="webapp-ci" -policy=webapp-deploy
```

### Step 11: Monitoring and Observability
```yaml
Nomad metrics (Prometheus endpoint: :4646/v1/metrics):
  - nomad.client.allocated.cpu / memory / disk
  - nomad.client.unallocated.cpu / memory / disk
  - nomad.nomad.job.summary.running / pending / dead
  - nomad.client.allocation.memory.usage
  - nomad.client.allocation.cpu.percent

Audit logging:
  - Enable audit log on servers
  - Log to file or syslog
  - Ship to Loki / Elasticsearch for centralized access

Consul health checks:
  - Service checks for every Nomad job
  - Combine with Nomad check_restart for automatic rescheduling

Key metrics to alert on:
  - eval.blocked > 0 for > 5 min (cluster can't schedule)
  - nomad.job.pending > 0 for > 2 min
  - node down > 1 server (cluster degradation)
  - Alloc failures per job
```

## Rules
- Always run `nomad job plan` before `nomad job run` for diff review.
- Use `auto_revert = true` for all service jobs to rollback failed deployments.
- Use `canary = 1` for production deployments — promote after verification.
- Always template secrets from Vault — never embed in job HCL.
- Use `bridge` networking mode for multi-port + Consul Connect jobs.
- Set resource limits (CPU/memory) on every task — no unlimited jobs.
- Use `check_restart` with 3 limit for production service jobs.
- Set `progress_deadline` to prevent stuck deployments.
- Use `max_parallel` = 1 for gradual rolling updates.
- All system jobs must fit in 128 MB memory for minimal overhead.

## Production Considerations
- Nomad servers: 3 or 5 minimum for HA, always an odd number.
- Consul ACL tokens should be scoped per job (`template` stanza with Vault).
- Vault token role `nomad-cluster` must allow token creation for Nomad workloads.
- CSI volumes need the Nomad CSI plugin installed and running as a system job.
- Nomad Autoscaler requires Prometheus for metric queries.
- Use `NOMAD_UPSTREAM_ADDR_<service>` env vars for Consul Connect upstream discovery.
- Audit log to a separate volume — log volume can spike during attacks.
- Set `address_mode = "driver"` in service definitions for bridge network support.
- Use `host_volume` for persistent data; prefer CSI for production.
- Parameterized jobs support `payload` as a tar.gz for build artifacts.
- Periodic jobs use the same cron syntax as Unix — test with `nomad job plan`.

## Anti-Patterns
- No resource limits — one job can starve the cluster.
- Using `type = "batch"` for long-running services — use `service` type.
- No `auto_revert` on deployments — manual rollback takes too long.
- Embedding secrets in job HCL — visible in API and logs.
- Using `host` networking when bridge is available — less portable.
- Overprovisioning CPU request — Nomad uses CPU shares, not limits.
- Not setting `check_restart` — unhealthy containers keep running.
- Using `canary` without `auto_promote = false` — manual gate needed.
- CSI volumes without proper plugin setup — volume registration fails silently.
- No audit logging — compliance violations go undetected.

## References
  - references/nomad-advanced.md — Nomad Advanced Topics
  - references/nomad-fundamentals.md — Nomad Fundamentals
  - references/nomad-cluster-setup.md — Nomad Cluster Configuration
  - references/nomad-job-spec.md — Nomad Job Specification Reference
  - references/nomad-consul-connect.md — Consul Connect with Nomad
  - references/nomad-csi.md — CSI Volume Integration
  - references/nomad-autoscaling.md — Nomad Autoscaler
  - references/nomad-security.md — ACLs and Vault Integration
## Handoff
- `devops-consul` for Consul service discovery and Connect mesh.
- `devops-vault` for Vault secrets management integration.
- `devops-terraform` for Nomad cluster Terraform provisioning.
- `devops-monitoring` for Prometheus/Grafana monitoring of Nomad.
- `devops-kubernetes` for comparison when deciding between Nomad and K8s.
