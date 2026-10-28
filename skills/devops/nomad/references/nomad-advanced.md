# Nomad Advanced: Placement Control, Dispatch Jobs, Variables, and Workload Identity

Advanced Nomad job and cluster features: constraints, affinities, spread, priorities and preemption, parameterized (dispatch) jobs, Nomad Variables with templates, workload identity for Vault/Consul/cloud access, and Nomad Pack. Basic job structure and update stanzas are in `nomad-jobs.md`.

## Placement Control

| Stanza | Hard/soft | Use |
|--------|-----------|-----|
| `constraint` | Hard | Must run on nodes matching attributes (OS, kernel, node class, metadata) |
| `affinity` | Soft (weighted) | Prefer nodes (e.g. with GPUs or SSDs) |
| `spread` | Soft | Distribute allocations across a dimension (datacenter, rack, AZ) |
| `node_pool` | Hard | Target a pool of clients (e.g. `gpu`, `batch`) |

```hcl
job "api" {
  node_pool = "general"

  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"
  }

  spread {
    attribute = "${node.datacenter}"
    weight    = 100
  }

  group "api" {
    count = 6

    affinity {
      attribute = "${meta.storage}"
      value     = "nvme"
      weight    = 50
    }

    constraint {
      operator  = "distinct_hosts"
      value     = "true"
    }
  }
}
```

Node metadata comes from client config (`meta { storage = "nvme" }`) or `nomad node meta apply`.

## Priority and Preemption

- Job `priority` ranges 1–100 (default 50). Higher-priority evaluations are processed first.
- Preemption lets higher-priority jobs evict lower-priority allocations when the cluster is full. It is enabled by default for `system` jobs; enable it for `service`/`batch` in the scheduler configuration:

```bash
nomad operator scheduler set-config -preempt-service-scheduler=true -preempt-batch-scheduler=true
```

- Reserve high priorities for critical services; use quotas (Enterprise) or namespace conventions to prevent priority inflation.

## Parameterized (Dispatch) Jobs

A parameterized job is a template; each `dispatch` creates a child batch job with its own payload and metadata.

```hcl
job "video-transcode" {
  type = "batch"

  parameterized {
    payload       = "required"
    meta_required = ["output_bucket"]
    meta_optional = ["preset"]
  }

  group "work" {
    task "transcode" {
      driver = "docker"
      config {
        image = "ghcr.io/acme/transcoder:3.0.0"
        args  = ["--input", "${NOMAD_TASK_DIR}/input.json",
                 "--bucket", "${NOMAD_META_output_bucket}"]
      }
      dispatch_payload {
        file = "input.json"
      }
      resources { cpu = 2000, memory = 2048 }
    }
  }
}
```

```bash
nomad job dispatch -meta output_bucket=s3://acme-out -meta preset=1080p video-transcode request.json
```

Use for queue-like workloads triggered by events (an API call or a small dispatcher service). Add `-idempotency-token` to avoid duplicate dispatches on retries.

## Periodic Jobs

```hcl
periodic {
  crons            = ["0 3 * * *"]
  time_zone        = "Europe/Berlin"
  prohibit_overlap = true
}
```

`prohibit_overlap` prevents a new run while the previous one is still running.

## Nomad Variables and Templates

Nomad Variables (1.4+) store encrypted key-value data in Nomad itself, readable by tasks via workload identity, without needing Vault for simple secrets/config.

```bash
nomad var put nomad/jobs/api/app db_user=api db_password=@password.txt
```

```hcl
task "app" {
  template {
    destination = "secrets/app.env"
    env         = true
    change_mode = "restart"
    data        = <<EOT
{{ with nomadVar "nomad/jobs/api/app" }}
DB_USER={{ .db_user }}
DB_PASSWORD={{ .db_password }}
{{ end }}
EOT
  }
}
```

- Tasks automatically have access to variables under `nomad/jobs/<job>[/<group>/<task>]`; broader access requires ACL policies.
- `template` also renders Consul KV, Consul service addresses, and Vault secrets; `change_mode` (`restart`, `signal`, `script`, `noop`) controls what happens when data changes.
- Write secrets into the `secrets/` directory, which is in-memory (tmpfs) on supported platforms and not accessible via `alloc fs`.

## Workload Identity

Since Nomad 1.7, tasks receive signed JWT workload identities. Vault and Consul integrations use them instead of long-lived tokens stored in Nomad server config.

```hcl
task "app" {
  vault {
    role = "api"                 # Vault JWT auth role bound to job/namespace claims
  }

  identity {
    name = "aws"
    aud  = ["sts.amazonaws.com"]
    file = true                  # writes the JWT into the task's secrets dir
    ttl  = "1h"
  }
}
```

- Configure Vault's JWT auth method with Nomad's JWKS URL, and bind roles to claims such as `nomad_namespace` and `nomad_job_id`.
- Cloud providers can trust Nomad's OIDC discovery endpoint for federated access (e.g. AWS `AssumeRoleWithWebIdentity`), eliminating static cloud keys.
- The legacy token-based Vault integration was deprecated in favour of workload identity; migrate before upgrading to versions that remove it.

## Canary Deployments with Auto-Promotion

```hcl
update {
  max_parallel      = 2
  canary            = 2
  min_healthy_time  = "30s"
  healthy_deadline  = "5m"
  progress_deadline = "10m"
  auto_revert       = true
  auto_promote      = false
}
```

- With `auto_promote = false`, verify canaries (metrics, smoke tests) then `nomad deployment promote <id>`.
- `auto_revert` reverts to the last stable version when the deployment fails.

## Nomad Pack and Templating

Nomad Pack renders parameterized job templates (similar to Helm charts):

```bash
nomad-pack registry add community github.com/hashicorp/nomad-pack-community-registry
nomad-pack render traefik --var job_name=edge
nomad-pack run traefik --var job_name=edge
```

Alternatively generate HCL from Terraform (`nomad_job` resource) or Levant-style variable files; HCL2 supports `variable` blocks and `-var-file` natively with `nomad job run`.

## Autoscaling

Nomad Autoscaler supports horizontal application scaling (`scaling` stanza with policies over Prometheus/Datadog metrics) and cluster scaling (cloud instance groups). See `nomad-operations.md` for operations.

## Pitfalls

- Hard `constraint` where an `affinity` was intended, leaving jobs unplaceable.
- Preemption enabled without priority discipline, causing evictions of important work.
- Dispatching without idempotency tokens from retrying clients.
- Templates rendering secrets into `local/` (visible) instead of `secrets/`.
- Long-lived Vault tokens in server config instead of workload identity.

## Checklist

- [ ] Constraints only for hard requirements; affinities/spread for preferences
- [ ] Priority policy documented; preemption enabled deliberately
- [ ] Parameterized jobs with idempotent dispatch
- [ ] Secrets via Variables/Vault templates into `secrets/`
- [ ] Workload identity for Vault, Consul, and cloud access
- [ ] Canary + auto-revert for critical services
