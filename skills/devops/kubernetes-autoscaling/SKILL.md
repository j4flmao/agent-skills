---
name: devops-kubernetes-autoscaling
description: >
  Kubernetes autoscaling strategies and configurations.
  Covers: Horizontal Pod Autoscaler (HPA) with CPU/memory, custom, and external metrics,
  Vertical Pod Autoscaler (VPA) update modes and recommender, Keda with 50+ scalers,
  Cluster Autoscaler node group optimization, combined HPA+VPA+CA strategies,
  predictive scaling, and cost optimization.
  Do NOT use for: Non-Kubernetes autoscaling (AWS ASG, Azure VMSS, etc.).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, kubernetes, autoscaling, hpa, vpa, keda, phase-5]
---

# Kubernetes Autoscaling

## Purpose
Design, implement, and optimize Kubernetes autoscaling strategies using HPA, VPA, Keda, and Cluster Autoscaler to achieve cost-efficient, responsive, and reliable workloads.

## Agent Protocol

### Trigger
Exact user phrases: "HPA", "VPA", "Keda", "Cluster Autoscaler", "autoscaling", "horizontal pod autoscaler", "vertical pod autoscaler", "Keda scaler", "pod scaling", "node scaling", "predictive scaling", "autoscaling strategy".

### Input Context
Before activating, verify:
- Kubernetes version and available autoscaling APIs.
- Workload characteristics (stateless, stateful, batch, event-driven).
- Metric sources (Prometheus, custom metrics API, external metrics API).
- Node group configuration (instance types, min/max sizes, spot vs. on-demand).
- Cluster autoscaler version and configuration.

### Output Artifact
Writes to YAML manifests for HPA, VPA, ScaledObject, ScaledJob, and ClusterAutoscaler configuration.

### Response Format
YAML manifests with appropriate apiVersion and autoscaling parameters.

### Completion Criteria
This skill is complete when:
- [ ] HPA configured with appropriate metrics and behavior.
- [ ] VPA configured with correct update mode and resource recommendations.
- [ ] Keda ScaledObject created for event-driven workloads.
- [ ] Cluster Autoscaler configured for efficient node scaling.
- [ ] Combined strategy documented with mutual exclusion rules.

### Max Response Length
Direct file write. No response text.

## Quick Start
Deploy metrics-server → Create HPA with CPU target → Add custom metric → Configure VPA in "off" mode for initial recommendations → Deploy Keda for event-driven scale → Configure Cluster Autoscaler node groups → Monitor with K9s or Prometheus.

## Decision Tree: Which Scaling Mechanism?
- Stateless web service, request-based → HPA with CPU/memory or request metrics per second
- Batch job, queue depth, event-driven → Keda ScaledJob or ScaledObject with queue scaler
- Streaming/Kafka consumer → Keda with Kafka scaler (lag-based)
- Stateful workload, right-sizing resources → VPA in Auto mode (if restart-tolerant) or Off/Initial (recommend only)
- Workloads needing both replica count + resource optimization → HPA (replicas) + VPA Off (recommendations)
- Node capacity insufficient for pending pods → Cluster Autoscaler or Karpenter
- Predictive/ML-based scaling → Keda with Predictive Scaler or custom external metrics

## Core Workflow

### Step 1: Deploy Metrics Server
```yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Step 2: HPA Configuration with Behavior
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Max
```

### Step 3: Custom and External Metrics HPA
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-custom-metrics
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: 100
  - type: Object
    object:
      metric:
        name: requests_total
      describedObject:
        apiVersion: v1
        kind: Service
        name: app-service
      target:
        type: Value
        value: 10000
  - type: External
    external:
      metric:
        name: sqs_approximate_message_count
        selector:
          matchLabels:
            queue: my-queue
      target:
        type: AverageValue
        averageValue: 5
```

### Step 4: VPA Update Modes Comparison
| Mode | Behavior | Use Case |
|------|----------|----------|
| `Off` | Only recommends, never applies | Observe recommendations before committing |
| `Initial` | Sets resources only at pod creation | StatefulSets, legacy apps |
| `Auto` | Updates on recreate (evicts pod) | Stateless deployments with restart tolerance |
| `Recreate` | Updates on recreate, similar to Auto | When pod restart triggers reallocation |

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
      controlledResources: ["cpu", "memory"]
    - containerName: sidecar
      mode: "Off"
```

### Step 5: VPA Recommendations (Read from Status)
```bash
kubectl describe vpa app-vpa
# Look for:
#   Lower Bound: 250m cpu, 256Mi memory
#   Upper Bound: 1500m cpu, 1.5Gi memory
#   Target: 500m cpu, 512Mi memory
#   Uncapped Target: 450m cpu, 480Mi memory
```

### Step 6: Keda ScaledObject — Kafka Scaler
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer
spec:
  scaleTargetRef:
    name: consumer-deployment
  pollingInterval: 10
  cooldownPeriod: 60
  minReplicaCount: 1
  maxReplicaCount: 20
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 120
  triggers:
  - type: kafka
    metadata:
      topic: events
      bootstrapServers: kafka-cluster:9092
      consumerGroup: consumer-group
      lagThreshold: "50"
      offsetResetPolicy: latest
```

### Step 7: Keda ScaledObject — Multiple Triggers (AND logic)
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: multi-trigger-worker
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 0
  maxReplicaCount: 30
  triggers:
  - type: aws-sqs-queue
    authenticationRef:
      name: keda-aws-creds
    metadata:
      queueURL: https://sqs.us-east-1.amazonaws.com/12345/my-queue
      queueLength: "5"
      awsRegion: us-east-1
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: worker_queue_depth
      query: sum(worker_queue_depth{job="worker"})
      threshold: "10"
```

### Step 8: Keda ScaledJob
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: batch-job
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: worker
          image: my-worker:latest
        restartPolicy: Never
  pollingInterval: 30
  maxReplicaCount: 20
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  triggers:
  - type: rabbitmq
    metadata:
      queueName: tasks
      queueLength: "10"
      host: amqp://rabbitmq:5672
  - type: cron
    metadata:
      timezone: UTC
      start: 30 8 * * *
      end: 30 17 * * *
      desiredReplicas: "3"
```

### Step 9: Cluster Autoscaler vs Karpenter
| Feature | Cluster Autoscaler | Karpenter |
|---------|-------------------|-----------|
| Scheduling | Node group based, respects ASG | Instance-type aware, any available capacity |
| Consolidation | Scale-down only (empty nodes) | Consolidates (replaces with cheaper) |
| Node creation | Via ASG, 3-5 min | Direct EC2 API, 60-90s |
| Instance diversity | Fixed instance types | Any compatible type |
| Config | Node group min/max per AZ | Provisioner with requirements |
| Spot handling | Via mixed instances policy | Native via `spot` capacity type |

```yaml
# Cluster Autoscaler config
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  config: |
    balance-similar-node-groups: true
    scale-down-delay-after-add: 10m
    scale-down-unneeded-time: 10m
    scale-down-utilization-threshold: 0.5
    skip-nodes-with-local-storage: false
    max-node-provision-time: 15m
```

### Step 10: Karpenter Provisioner for Data Workloads
```yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: data-worker
spec:
  template:
    spec:
      requirements:
      - key: kubernetes.io/arch
        operator: In
        values: ["amd64"]
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot", "on-demand"]
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["m5.2xlarge", "m5.4xlarge", "c5.2xlarge"]
      nodeClassRef:
        name: data-ec2
      taints:
      - key: workload-type
        value: data
        effect: NoSchedule
  limits:
    cpu: 1000
  disruption:
    consolidationPolicy: WhenUnderutilized
    expireAfter: 720h
---
apiVersion: karpenter.k8s.aws/v1beta1
kind: EC2NodeClass
metadata:
  name: data-ec2
spec:
  amiFamily: Bottlerocket
  subnetSelector:
    karpenter.sh/discovery: my-cluster
  securityGroupSelector:
    karpenter.sh/discovery: my-cluster
  role: KarpenterNodeRole
  tags:
    Environment: production
```

### Step 11: HPA + VPA Combined Strategy (Sidecar Pattern)
- VPA in "Off" mode provides resource recommendations
- Apply recommendations to Deployment resource requests manually
- HPA scales replicas based on load
- Or: VPA in "Auto" mode for sidecars, HPA for main container
- Or: VPA manages resources for stateful workloads, HPA for stateless

### Step 12: Predictive Scaling with Keda
```yaml
triggers:
- type: kubernetes-workload
  metadata:
    podSelector: "app=worker"
    value: "10"
- type: cron
  metadata:
    timezone: UTC
    start: 0 9 * * 1-5    # Scale up before business hours
    end: 30 18 * * 1-5     # Scale down after
    desiredReplicas: "20"
```

### Step 13: Keda with Prometheus Scaler (Custom Application Metrics)
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaled
spec:
  scaleTargetRef:
    name: api-server
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: http_request_duration_seconds_99
      query: |
        histogram_quantile(0.99,
          sum(rate(http_request_duration_seconds_bucket[2m])) by (le)
        )
      threshold: "1.5"
      activationThreshold: "0.5"
```

## Rules & Constraints
- VPA and HPA on same metric (CPU/memory) cause conflicts — use VPA in "Off" mode or separate metrics.
- Always set min/max replicas on HPA to prevent runaway scaling.
- Set stabilizationWindows for metrics that fluctuate rapidly.
- Never scale below 2 replicas for production workloads (HA requirements).
- Cluster Autoscaler requires proper IAM permissions for node group management.
- Keda ScaledObject requires ClusterRole for HPA management.
- VPA cannot run with HPA on CPU/memory simultaneously in Auto mode.
- Always set memory limits in VPA min/max bounds to prevent over-allocation.
- Keda cooldownPeriod prevents scale-to-zero thrashing.
- Cluster Autoscaler needs `--balance-similar-node-groups` for multi-AZ.
- Karpenter expiration prevents stale nodes with old AMIs.

## Production Considerations
- Use HPA behavior block to control scale-up/down rates — avoid thrashing on burst traffic.
- Monitor HPA status: `kubectl get hpa -w` to watch target utilization.
- Keda ScaledObject creates an HPA internally — inspect it for scaling issues.
- Set different stabilizationWindowSeconds for scale-up (short) vs scale-down (long).
- Use `kubectl top pods` to validate metrics-server is returning data.
- Add cluster-autoscaler.kubernetes.io/safe-to-evict annotation to pods that can be evicted.
- For stateful workloads with VPA Auto, ensure PDB allows the disruption budget.
- Pin VPA minAllowed to prevent overly aggressive down-scaling.
- Use podAntiAffinity when scaling to spread replicas across nodes.
- Monitor for scale-to-zero patterns — ensure services can cold-start acceptably.
- Karpenter consolidation may interrupt short-lived jobs — use ttlSecondsUntilExpired.

## Anti-Patterns
- Running VPA and HPA on CPU/memory simultaneously on the same target — causes thrashing.
- No stabilization window — rapid scale-down after traffic bursts.
- Unlimited maxReplicas — can exhaust cluster resources or budget.
- Scaling to 1 replica — violates HA for production.
- Over-relying on Cluster Autoscaler to handle pod scaling — always prefer HPA first.
- Ignoring VPA recommendations — missed cost savings of 30-50%.
- Mixing Keda with separate HPAs on same target — Keda's HPA conflicts.
- Using `averageUtilization: 50` as default without workload analysis.
- Forgetting to exclude sidecars from VPA — VPA may scale up unnecessary resources.
- No pod disruption budget with VPA Auto — all pods can be evicted simultaneously.
- Keda pollingInterval too fast (< 5s) — API server pressure.

## Comparison Table: Scaling Mechanisms
| Dimension | HPA | VPA | Keda | Cluster Autoscaler | Karpenter |
|-----------|-----|-----|------|-------------------|-----------|
| Scale target | Replicas | Resource requests | Replicas | Nodes | Nodes |
| Metric types | CPU, memory, custom, external | CPU, memory (actual usage) | 50+ event sources | Pending pod count | Pending pod count |
| Response time | 15-60s | Depends on eviction | 10-30s | 3-15 min | 60-90s |
| Stateful support | No (replicas change) | Yes (Auto mode) | Via VPA integration | Yes | Yes |
| Cost optimization | Indirect | Direct (right-sizing) | Scale-to-zero | Node consolidation | Node consolidation + right-sizing |
| Learning curve | Low | Low-Medium | Medium | Medium | Medium |
| Production readiness | GA | GA (beta stable) | GA | GA | GA |

## Troubleshooting
- HPA not scaling: check `kubectl describe hpa`, verify metrics-server pod is running, check custom metrics API availability.
- VPA not recommending: verify VPA admission webhook is running, check VPA recommender logs.
- Keda ScaledObject not scaling: `kubectl describe scaledobject`, check Keda operator logs, verify authentication with scaler.
- Cluster Autoscaler not scaling: `kubectl logs -n kube-system cluster-autoscaler`, check IAM permissions, verify ASG max size.
- Karpenter not provisioning: `kubectl logs -n karpenter karpenter`, check EC2NodeClass subnet/security group selectors.

## References
  - references/autoscaling-strategies.md — Combined Autoscaling Strategy
  - references/cluster-autoscaler.md — Cluster Autoscaler
  - references/hpa-patterns.md — Horizontal Pod Autoscaler (HPA)
  - references/keda-scalers.md — Keda Scalers
  - references/kubernetes-autoscaling-advanced.md — Kubernetes Autoscaling Advanced Topics
  - references/kubernetes-autoscaling-fundamentals.md — Kubernetes Autoscaling Fundamentals
  - references/vpa-config.md — Vertical Pod Autoscaler (VPA)
## Handoff
After completing this skill:
- Next skill: **devops-apm-observability** — Observability to monitor and inform autoscaling
- Pass context: HPA metric names, VPA recommendations, Keda scaler configuration, node group names

## Architecture Decision Trees

### HPA vs VPA vs KEDA

| Decision | HPA (Horizontal) | VPA (Vertical) | KEDA (Event-driven) |
|---|---|---|---|
| Scaling dimension | Replica count | CPU/Memory requests | Replica count |
| Metric source | CPU, memory, custom metrics | CPU, memory | 50+ event sources (Kafka, Prometheus, SQS) |
| Response time | ~30-60s | ~60-180s (restart required) | ~5-15s |
| Use case | Web apps, stateless | Stateful, batch | Queue-based, event-driven |
| Coordination | Works with CA | Conflicts with HPA | Works with CA + HPA |
| Recommendation | Default for most workloads | Long-lived pods with variable needs | Serverless-style, async workloads |

### Cluster Autoscaler vs Karpenter

| Aspect | Cluster Autoscaler | Karpenter |
|---|---|---|
| Provisioning | Node group → ASG → instance | Direct instance from cloud API |
| Scale-up speed | Minutes (ASG warm-up) | Seconds (direct launch) |
| Scheduling | Pending pod → node group match | Pending pod → optimal instance type |
| Consolidation | Slow (scale-down cooldown) | Aggressive (continuous consolidation) |
| Instance diversity | Limited to ASG config | Wide (any instance family/size) |

## Implementation Patterns

### YAML: HPA with Custom Prometheus Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: requests_per_second
        target:
          type: AverageValue
          averageValue: 500
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 20
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
        - type: Pods
          value: 4
          periodSeconds: 30
      selectPolicy: Max
```

### YAML: KEDA ScaledObject for RabbitMQ Queue

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaler
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
    - type: rabbitmq
      metadata:
        protocol: amqp
        queueName: tasks
        mode: QueueLength
        value: "10"
        activationValue: "1"
      authenticationRef:
        name: rabbitmq-auth
  fallback:
    failureThreshold: 5
    replicas: 5
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 60
```

### Bash: Cluster Autoscaler Simulation

```bash
#!/usr/bin/env bash
simulate_scale_up() {
  local deployment=$1
  local replicas=$2

  kubectl scale deployment "$deployment" --replicas="$replicas"

  # Watch pending pods
  while true; do
    PENDING=$(kubectl get pods -l app="$deployment" --field-selector status.phase=Pending -o json | jq '.items | length')
    RUNNING=$(kubectl get pods -l app="$deployment" --field-selector status.phase=Running -o json | jq '.items | length')
    echo "Pending: $PENDING, Running: $RUNNING"

    if [ "$PENDING" -eq 0 ] && [ "$RUNNING" -ge "$replicas" ]; then
      echo "Scale-up complete"
      break
    fi
    sleep 5
  done
}
```

## Production Considerations

- Set **PodDisruptionBudget** (PDB) on every workload when using cluster autoscaler — prevents full eviction
- Configure **cluster-autoscaler** `--scale-down-unneeded-time` to 10m for prod, 5m for dev
- Use **topology spread constraints** to distribute pods across zones when using node autoscaler
- Set **resource requests = limits** for burstable workloads to avoid VPA conflicts with HPA
- Enable **cluster-proportional-autoscaler** for DNS and addon components
- Monitor **HPA readiness** — an unhealthy pod under HPA doesn't count toward metrics
- Use **predictive autoscaling** (Kubernetes Event-driven Autoscaling with forecasting) for slow-moving metrics

## Anti-Patterns

- Setting **HPA minReplicas = 1** for production — always run at least 2 for availability
- Using **VPA in Auto mode** with HPA on the same deployment — they conflict and cause thrashing
- Ignoring **disruption budgets** — cluster autoscaler scale-down evicts pods without PDB
- Scaling on **stale metrics** — HPA uses averaged values; short spikes are smoothed out
- Setting **identical behavior** for scale-up and scale-down — scale-up should be fast, scale-down slow
- Over-scaling **with too-sensitive thresholds** — frequent scaling causes API server and pod churn
- Forgetting to **pre-warm node pools** — predictable traffic spikes should pre-scale nodes before pods arrive

## Performance Optimization

- Use **Karpenter** over Cluster Autoscaler for faster instance provisioning and consolidation
- Enable **spot instances** for workloads with PDB, using Karpenter's `spot-to-price` diversity
- Set **HPA sync period** (`--horizontal-pod-autoscaler-sync-period`) to 10s for faster reaction
- Use **Cron-based HPA** for predictable load patterns (lunch rush, batch processing windows)
- Optimize **container start time** — small images, init containers in parallel, no blocking probes
- Pre-pull **sidecar images** with `kubernetes-image-puller` to speed up scale-up
- Tune **kubelet `--kube-reserved`** and `--system-reserved` to give autoscaler accurate capacity info

## Security Considerations

- Restrict **Cluster Autoscaler** IAM permissions to only modify node groups in the same account
- Enable **Pod Identity / IRSA** for KEDA scalers so they authenticate to queues without long-lived creds
- Audit **scaling events** with Kubernetes audit logs — who or what triggered a scale action
- Set **PodSecurity admission** on scaled workloads to prevent privileged pods in autoscaled namespaces
- Use **Secrets Store CSI** for KEDA authentication instead of plaintext K8s secrets
- Limit **HPA resource metrics** to prevent information leak — don't expose internal metrics to unauthenticated sources
- Pin **KEDA and Cluster Autoscaler** versions and scan container images for vulnerabilities
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.