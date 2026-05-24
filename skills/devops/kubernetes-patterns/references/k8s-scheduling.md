# Kubernetes Scheduling

## Node Affinity

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - us-east-1a
            - us-east-1b
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: instance-type
            operator: In
            values:
            - c5.2xlarge
```

| Field | Semantics |
|-------|-----------|
| `requiredDuringSchedulingIgnoredDuringExecution` | Hard constraint — pod won't schedule without match |
| `preferredDuringSchedulingIgnoredDuringExecution` | Soft constraint — scheduler tries but may not satisfy |
| `IgnoredDuringExecution` | Node label changes after scheduling don't evict pod |

## Taints and Tolerations

```yaml
# Taint a node
kubectl taint nodes node1 dedicated=gpu:NoSchedule

# Pod toleration
spec:
  tolerations:
  - key: dedicated
    operator: Equal
    value: gpu
    effect: NoSchedule
```

| Effect | Behavior |
|--------|----------|
| `NoSchedule` | Pod won't schedule on tainted node unless tolerated |
| `PreferNoSchedule` | Scheduler avoids if possible |
| `NoExecute` | Evicts existing pods without toleration |

## Topology Spread Constraints

```yaml
spec:
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: myapp
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: ScheduleAnyway
```

| Parameter | Purpose |
|-----------|---------|
| `maxSkew` | Maximum difference in pod count between topology domains |
| `topologyKey` | Node label key defining domains (zone, hostname, region) |
| `whenUnsatisfiable` | `DoNotSchedule` (block) or `ScheduleAnyway` (best effort) |

## Pod Topology Constraints

| Constraint | Anti-Pattern | Best Practice |
|-----------|-------------|---------------|
| PodAntiAffinity with `required` | Can block scheduling if no nodes meet criteria | Use `preferred` unless critical |
| NodeAffinity with specific instance type | Fragile, cloud provider may not have capacity | Use labels for broader matching |
| Taints for everything | Too many taints = un-schedulable pods | Only for dedicated workloads (GPU, PCI, legacy) |

## Descheduler

| Strategy | Behavior |
|----------|----------|
| `LowNodeUtilization` | Evicts pods from under/over-utilized nodes |
| `HighNodeUtilization` | Consolidates pods on fewer nodes |
| `RemoveDuplicates` | Spreads replicas across nodes |
| `RemovePodsViolatingTopologySpread` | Enforces topology spread constraints |
| `RemovePodsHavingTooManyRestarts` | Evicts crash-loop pods |
| `PodLifeTime` | Evicts pods older than threshold |

```yaml
apiVersion: descheduler/v1alpha2
kind: DeschedulerPolicy
profiles:
- name: Dev
  strategies:
    LowNodeUtilization:
      enabled: true
      params:
        nodeResourceUtilizationThresholds:
          thresholds:
            cpu: 20
            memory: 20
          targetThresholds:
            cpu: 50
            memory: 50
```
