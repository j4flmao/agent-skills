# Cluster Autoscaler

## Overview

Cluster Autoscaler automatically adjusts the size of a Kubernetes cluster by adding or removing nodes based on pod resource requests. It works with major cloud providers (AWS, Azure, GCP) and on-premises deployments.

## Architecture

```
                ┌──────────────────────────────┐
                │     Cluster Autoscaler       │
                │                              │
                │  ┌────────────────────────┐  │
                │  │   Scale-Up Logic       │  │
                │  │                        │  │
                │  │  Pending pods → find   │  │
                │  │  suitable node group   │  │
                │  │  → expand by 1         │  │
                │  └────────────────────────┘  │
                │                              │
                │  ┌────────────────────────┐  │
                │  │   Scale-Down Logic     │  │
                │  │                        │  │
                │  │  Underutilized nodes   │  │
                │  │  → drain → terminate   │  │
                │  └────────────────────────┘  │
                └──────────────┬───────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │     Cloud Provider API    │
                 │                           │
                 │  AWS ASG / Azure VMSS    │
                 │  / GCP MIG               │
                 └───────────────────────────┘
```

## AWS Cluster Autoscaler

### IAM Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeTags",
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup",
        "ec2:DescribeLaunchTemplateVersions",
        "ec2:DescribeInstanceTypes"
      ],
      "Resource": "*"
    }
  ]
}
```

### ASG Tagging
```bash
# Required ASG tags for Cluster Autoscaler
aws autoscaling create-or-update-tags \
  --tags \
    ResourceId=my-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true \
    ResourceId=my-asg,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true
```

### Multiple Node Groups
```yaml
# Cluster Autoscaler deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.29.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --balance-similar-node-groups=true
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m
        - --scale-down-delay-after-delete=0s
        - --scale-down-delay-after-failure=3m
        - --scale-down-unneeded-time=10m
        - --scale-down-utilization-threshold=0.5
        - --max-node-provision-time=15m
        - --max-nodes-total=100
        - --cores-total=0:500
        - --memory-total=0:2000000
        env:
        - name: AWS_REGION
          value: us-east-1
```

## Node Group Configuration

### AWS ASG Node Groups
```yaml
# eksctl node group configuration
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: my-cluster
  region: us-east-1

managedNodeGroups:
- name: spot-workers
  instanceTypes: ["c5.large", "c5a.large", "c5d.large"]
  spot: true
  minSize: 0
  maxSize: 50
  desiredCapacity: 0
  labels:
    lifecycle: spot
    type: worker
  tags:
    k8s.io/cluster-autoscaler/enabled: "true"
    k8s.io/cluster-autoscaler/my-cluster: "owned"

- name: on-demand-gpu
  instanceType: p3.2xlarge
  minSize: 0
  maxSize: 10
  labels:
    lifecycle: on-demand
    type: gpu-worker
  tags:
    k8s.io/cluster-autoscaler/enabled: "true"
    k8s.io/cluster-autoscaler/my-cluster: "owned"
```

### Auto-Discovery with ASG Tags
```yaml
# Cluster Autoscaler auto-discovers ASGs by tag
command:
- ./cluster-autoscaler
- --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled
- --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/my-cluster
```

## Expansion Options

### `--expander` Strategies

| Expander | Description |
|----------|-------------|
| `random` | Random node group selection |
| `most-pods` | Pick group that fits most pods |
| `least-waste` | Pick group with least CPU/memory waste |
| `priority` | Use configured priority list |
| `least-waste` (default) | Balanced approach |

### Priority Expander
```yaml
# priority-expander-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-priority-expander
  namespace: kube-system
data:
  priorities: |-
    10:
      - .*spot.*
    5:
      - .*on-demand.*
    1:
      - .*gpu.*
```

```yaml
command:
- ./cluster-autoscaler
- --expander=priority
- --expander-priority-config=cluster-autoscaler-priority-expander
```

## Scaling Down

### Scale-Down Configuration
```yaml
command:
- ./cluster-autoscaler
- --scale-down-enabled=true
- --scale-down-delay-after-add=10m       # Wait 10min after scale-up
- --scale-down-delay-after-delete=0s     # No delay after deletion
- --scale-down-delay-after-failure=3m    # Wait 3min after failure
- --scale-down-unneeded-time=10m         # Node must be unneeded for 10min
- --scale-down-utilization-threshold=0.5 # Scale-down if utilization < 50%
```

### Skip Nodes
```yaml
command:
- ./cluster-autoscaler
- --skip-nodes-with-system-pods=true     # Don't drain system pods
- --skip-nodes-with-local-storage=false  # Consider nodes with local storage
- --max-empty-bulk-delete=10             # Max empty nodes to remove at once
- --max-graceful-termination-sec=600     # Pod termination grace period
```

## Multi-AZ Configuration

### Spread Across AZs
```yaml
# Create ASG in each AZ
nodeGroups:
- name: workers-us-east-1a
  availabilityZones: ["us-east-1a"]
  minSize: 0
  maxSize: 20
- name: workers-us-east-1b
  availabilityZones: ["us-east-1b"]
  minSize: 0
  maxSize: 20
- name: workers-us-east-1c
  availabilityZones: ["us-east-1c"]
  minSize: 0
  maxSize: 20
```

### Topology Spread Constraints
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
```

## Monitoring

### Prometheus Metrics
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: cluster-autoscaler
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
```

### Key Metrics
```
# Scale events
cluster_autoscaler_scale_up_count{node_group="workers"}
cluster_autoscaler_scale_down_count{node_group="workers"}

# Unschedulable pods
cluster_autoscaler_unschedulable_pods_count

# Node group sizes
cluster_autoscaler_node_group_min_size
cluster_autoscaler_node_group_max_size
cluster_autoscaler_node_group_target_size

# Errors
cluster_autoscaler_errors_total
cluster_autoscaler_failed_scale_ups_total
```

## Troubleshooting

```bash
# Check Cluster Autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler

# View unschedulable pods
kubectl get pods --all-namespaces --field-selector status.phase=Pending

# Check node conditions
kubectl describe node ip-10-0-1-123.ec2.internal

# Simulate scale-up
kubectl scale deployment my-app --replicas=100

# Check events
kubectl get events --all-namespaces --field-selector reason=TriggeredScaleUp
kubectl get events --all-namespaces --field-selector reason=ScaleDown

# List ASGs
aws autoscaling describe-auto-scaling-groups --query "AutoScalingGroups[*].{Name:AutoScalingGroupName,Size:Instances[*]}" --output table
```

## Best Practices

1. **Use multiple node groups** with different instance types for flexibility.
2. **Set `minSize: 0`** for spot node groups to completely scale down when idle.
3. **Configure `--balance-similar-node-groups`** to distribute pods across AZs.
4. **Use `--expander=least-waste`** for cost optimization with multiple instance types.
5. **Set realistic `maxSize`** limits (50-100) to control cost exposure.
6. **Monitor `cluster_autoscaler_unschedulable_pods_count`** for scaling issues.
7. **Use nodeSelectors and taints** to direct workloads to appropriate node groups.
8. **Configure `--scale-down-utilization-threshold`** based on workload patterns.
9. **Test CA behavior** with `Cluster Autoscaler` simulation mode.
10. **Set `--scale-down-delay-after-add=10m`** to prevent rapid scale-down after autoscaling.
