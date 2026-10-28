# Spot and Preemptible Capacity: Interruption-Tolerant Design

Spot capacity (AWS Spot Instances, Azure Spot VMs, GCP Spot VMs) is spare capacity sold at a deep discount that the provider can reclaim. Used correctly it is the cheapest compute available; used carelessly it causes outages. This reference covers interruption mechanics, workload fit, diversification, and Kubernetes and batch integration.

## Interruption Mechanics

| Provider | Notice | How you learn | Price model |
|----------|--------|---------------|-------------|
| AWS Spot | 2 minutes (plus optional rebalance recommendation earlier) | Instance metadata `spot/instance-action`, EventBridge `EC2 Spot Instance Interruption Warning` | Market price that changes gradually; no bidding required |
| Azure Spot VM | 30 seconds | Scheduled Events endpoint (`Preempt` event) | Variable price; optional max price (`-1` = never evict on price) |
| GCP Spot VM | 30 seconds | ACPI soft-off, metadata `instance/preempted`, shutdown script | Variable price; no maximum runtime (legacy preemptible VMs had a 24h limit) |

Design for the shortest notice in your fleet. Graceful shutdown must complete within it.

## Workload Fit

| Good fit | Poor fit |
|----------|----------|
| Stateless web/API replicas behind a load balancer (with on-demand base) | Single-instance databases, leaders without failover |
| Queue workers with idempotent processing | Long jobs without checkpoints |
| CI/CD runners, build farms | Workloads with strict latency SLOs and no headroom |
| Batch ETL, rendering, simulations | Licensed software tied to a host |
| ML training with periodic checkpoints | Stateful sets with local-only data |

## Diversification

Interruptions cluster by capacity pool (instance type x AZ). Spread across many pools.

```hcl
# AWS Auto Scaling group: on-demand base + diversified spot
resource "aws_autoscaling_group" "workers" {
  name                = "workers"
  min_size            = 2
  max_size            = 40
  vpc_zone_identifier = var.private_subnet_ids   # several AZs
  capacity_rebalance  = true

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "price-capacity-optimized"
    }
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.workers.id
        version            = "$Latest"
      }
      override {
        instance_requirements {
          vcpu_count {
            min = 4
            max = 8
          }
          memory_mib {
            min = 16384
            max = 32768
          }
          cpu_manufacturers = ["amazon-web-services", "intel", "amd"]
        }
      }
    }
  }
}
```

- `price-capacity-optimized` picks pools with the lowest interruption likelihood and good price; prefer it over `lowest-price`.
- Attribute-based instance selection (`instance_requirements`) lets the group use any matching type, maximizing pools. Multi-arch images are required if ARM types are included.
- `capacity_rebalance` launches a replacement when AWS signals elevated risk, before the 2-minute notice.

## Graceful Shutdown

1. Stop accepting new work (deregister from the load balancer, stop polling the queue).
2. Finish or checkpoint in-flight work within the notice window.
3. Return unfinished messages to the queue (visibility timeout expiry handles crashes).

```python
import requests, time

IMDS = "http://169.254.169.254/latest"

def imds_token() -> str:
    return requests.put(f"{IMDS}/api/token",
                        headers={"X-aws-ec2-metadata-token-ttl-seconds": "300"}, timeout=2).text

def interruption_pending() -> bool:
    r = requests.get(f"{IMDS}/meta-data/spot/instance-action",
                     headers={"X-aws-ec2-metadata-token": imds_token()}, timeout=2)
    return r.status_code == 200   # 404 when no interruption is scheduled

while True:
    if interruption_pending():
        drain_and_checkpoint()   # application-specific
        break
    time.sleep(5)
```

In Kubernetes, the node handler does this for you (below); applications only need correct SIGTERM handling and `terminationGracePeriodSeconds` shorter than the notice.

## Kubernetes Integration

| Platform | Mechanism |
|----------|-----------|
| EKS + Karpenter | NodePool with `karpenter.sh/capacity-type: [spot, on-demand]`; Karpenter consumes interruption events from an SQS queue and cordons/drains |
| EKS managed node groups / ASG | AWS Node Termination Handler (queue mode) or managed node group built-in handling |
| AKS | Spot node pool (`--priority Spot`), taint `kubernetes.azure.com/scalesetpriority=spot:NoSchedule` |
| GKE | Spot node pools or `cloud.google.com/gke-spot: "true"` node selector (Autopilot supports Spot Pods) |

```yaml
# Karpenter NodePool allowing spot with on-demand fallback
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: general
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64", "arm64"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
  limits:
    cpu: "1000"
```

Protect availability during interruptions:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: {name: api}
spec:
  minAvailable: 70%
  selector: {matchLabels: {app: api}}
---
# Spread replicas across zones and capacity types
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
    labelSelector: {matchLabels: {app: api}}
```

Keep a minimum on-demand share for critical services so a mass interruption cannot take all replicas.

## Batch and ML Training

- Checkpoint to object storage at an interval shorter than the expected time between interruptions; resume from the last checkpoint on restart.
- AWS Batch, Azure Batch and GCP Batch support spot compute environments with automatic retries; set retry attempts and a spot-to-on-demand fallback for deadline-bound jobs.
- Distributed training: use elastic frameworks (PyTorch `torchrun` with elastic restarts) so losing one worker does not lose the whole job.

## Measuring Success

| Metric | Why |
|--------|-----|
| Spot share of eligible compute hours | Adoption |
| Effective discount vs on-demand | Savings realized |
| Interruptions per 1,000 instance-hours by pool | Pool selection quality |
| Work lost or retried due to interruption | Hidden cost of interruptions |
| SLO impact during interruption events | User-facing risk |

## Checklist

- [ ] Workload classified as interruption tolerant, with graceful shutdown tested
- [ ] Many instance types and AZs allowed; capacity-optimized allocation
- [ ] Interruption handler in place (Karpenter, NTH, scheduled events)
- [ ] PDBs, zone spread, and an on-demand base for critical services
- [ ] Batch jobs checkpoint and retry; deadline jobs fall back to on-demand
- [ ] Interruption and savings metrics reviewed monthly
