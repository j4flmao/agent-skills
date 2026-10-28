# Kubernetes Design Patterns: Fundamentals

The foundational, structural, and behavioral patterns for designing workloads on Kubernetes (following the pattern language popularized by "Kubernetes Patterns", Ibryam and Huß). Each pattern lists the problem, the Kubernetes primitives that implement it, and common mistakes. Scheduling, stateful workloads, operators, and sidecar injection have their own references in this skill.

## Foundational Patterns

### Health Probe

Problem: the platform must know whether a container is alive, ready for traffic, and finished starting.

| Probe | Question | Failure action |
|-------|----------|----------------|
| `startupProbe` | Has the app finished starting? | Keeps liveness/readiness disabled until it succeeds |
| `readinessProbe` | Can it serve traffic now? | Removed from Service endpoints |
| `livenessProbe` | Is it deadlocked/broken? | Container restarted |

Mistake: liveness probes that call databases or downstream services, turning a dependency blip into a restart storm.

### Predictable Demands

Problem: the scheduler needs to know resource needs and dependencies.

- Set CPU/memory `requests` from observed usage (VPA in recommendation mode helps); set memory limits.
- QoS classes follow from requests/limits: `Guaranteed` (requests = limits for all containers), `Burstable`, `BestEffort`. Under node pressure, BestEffort pods are evicted first.
- Declare storage (PVCs), ports, and config dependencies explicitly.

### Declarative Deployment

Problem: update applications without downtime.

| Strategy | Primitive |
|----------|-----------|
| Rolling update | Deployment `RollingUpdate` with `maxSurge`/`maxUnavailable` |
| Recreate | `strategy.type: Recreate` (for apps that cannot run two versions at once) |
| Blue-green / canary | Two Deployments + Service/Gateway traffic switching, or Argo Rollouts / Flagger |

### Managed Lifecycle

Problem: apps must react to platform lifecycle events.

- Handle `SIGTERM`: stop accepting new work, finish in-flight requests, exit before `terminationGracePeriodSeconds`.
- `preStop` hook (or a short sleep) lets endpoint removal propagate before shutdown.
- `postStart` runs asynchronously with the entrypoint; do not rely on it for ordering.

### Automated Placement

Problem: control where pods run. Implemented with node selectors, affinity/anti-affinity, taints/tolerations, and topology spread constraints (see `scheduling-placement.md`).

## Structural Patterns

### Init Container

Separate initialization from the main container: run to completion, in order, before app containers start.

```yaml
initContainers:
  - name: wait-for-migrations
    image: ghcr.io/org/migrator:1.4.0
    command: ["/migrate", "--check-only"]
```

Use for schema checks, fetching config, or setting permissions. Keep them idempotent: they rerun when the pod restarts.

### Sidecar

A helper container that extends the main container (log shipping, proxies, config reloaders). Since Kubernetes 1.29 (GA in 1.33) native sidecars are declared as init containers with `restartPolicy: Always`: they start before app containers, keep running, and stop after them.

```yaml
initContainers:
  - name: log-shipper
    image: fluent/fluent-bit:3.2
    restartPolicy: Always
    volumeMounts: [{ name: logs, mountPath: /var/log/app }]
```

Native sidecars fix the classic problems of Jobs that never complete because a sidecar keeps running, and of proxies starting after the app.

### Adapter

A sidecar that converts the main container's output into a standard interface, e.g. a Prometheus exporter translating an app's custom status endpoint into metrics, or a log reformatter.

### Ambassador

A sidecar that proxies outbound access to external services, hiding complexity (connection pooling, sharding, auth, TLS). Example: a local proxy for a sharded cache or a cloud SQL connector container.

## Behavioral Patterns

### Batch Job

```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: reindex-2026-10-27 }
spec:
  completions: 10
  parallelism: 3
  completionMode: Indexed            # each pod gets JOB_COMPLETION_INDEX
  backoffLimit: 4
  activeDeadlineSeconds: 3600
  ttlSecondsAfterFinished: 86400
  podFailurePolicy:
    rules:
      - action: FailJob
        onExitCodes: { containerName: worker, operator: In, values: [42] }   # non-retriable error
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: worker
          image: ghcr.io/org/reindexer:2.0.1
```

- `Indexed` mode partitions work deterministically.
- `podFailurePolicy` distinguishes retriable failures from fatal ones.
- `ttlSecondsAfterFinished` cleans up finished Jobs.

### Periodic Job

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: nightly-report }
spec:
  schedule: "0 2 * * *"
  timeZone: "Europe/Berlin"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 600
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers: [{ name: report, image: ghcr.io/org/report:3.1.0 }]
```

`concurrencyPolicy: Forbid` prevents overlapping runs; jobs must still be idempotent, because a CronJob can occasionally create two Jobs or none.

### Daemon Service

DaemonSets run one pod per (selected) node for node agents: log collectors, CNI, CSI node plugins, monitoring exporters. Use tolerations to include tainted nodes and `updateStrategy.rollingUpdate.maxUnavailable` to control rollout speed.

### Singleton Service

Only one active instance:
- Out-of-application: `replicas: 1` with `Recreate` strategy (accepts downtime during updates), or a StatefulSet of size 1.
- In-application: leader election with a `coordination.k8s.io/v1` Lease (client-go `leaderelection`, controller-runtime managers) — survives node failure faster and allows warm standbys.

### Stateful Service

StatefulSets give stable identities, ordered rollout, and per-pod volumes. Details in `k8s-stateful-workloads.md`.

### Service Discovery

| Need | Mechanism |
|------|-----------|
| In-cluster, load balanced | ClusterIP Service + DNS (`svc.ns.svc.cluster.local`) |
| Per-pod addresses | Headless Service |
| External service via cluster DNS | `ExternalName` Service or Service without selector + EndpointSlice |
| North-south traffic | Gateway API / Ingress / LoadBalancer Service |

## Configuration Patterns

| Pattern | Implementation |
|---------|---------------|
| EnvVar configuration | `env` / `envFrom` from ConfigMaps and Secrets |
| Configuration resource | ConfigMap/Secret mounted as files; supports live reload |
| Immutable configuration | `immutable: true` ConfigMaps or config baked into versioned images |
| Configuration template | Init container or Helm/Kustomize rendering environment-specific config |

## Common Mistakes

- One giant pod with many unrelated containers; containers in a pod should share lifecycle and need co-location.
- Using `latest` tags, defeating declarative rollbacks.
- CronJobs without `concurrencyPolicy` or idempotency.
- Sidecars in Jobs implemented as regular containers (Job never completes) on clusters that support native sidecars.

## Checklist

- [ ] Probes, requests/limits, and graceful shutdown on every workload
- [ ] Init containers idempotent; sidecars declared natively where supported
- [ ] Jobs with deadlines, TTL, and failure policies
- [ ] CronJobs with time zone, concurrency policy, and idempotent work
- [ ] Singletons via leader election when downtime is unacceptable
- [ ] Configuration externalized and rollout-triggering on change
