# Kubernetes Cost Allocation with OpenCost

Cloud bills show nodes, not namespaces. To charge Kubernetes spend back to teams you need to split node, storage and network cost across workloads. This reference covers the allocation model, OpenCost (CNCF project, the open-source core of Kubecost) installation and API, and handling of idle and shared costs.

## Allocation Model

Each pod is charged for the larger of what it requested and what it used, per resource:

```text
pod_cpu_cost    = max(cpu_request, cpu_usage)    x hours x node_cpu_hourly_price
pod_ram_cost    = max(ram_request, ram_usage)    x hours x node_ram_hourly_price
pod_gpu_cost    = gpu_request                    x hours x node_gpu_hourly_price
pv_cost         = pvc_size_GB x hours x storage_hourly_price_per_GB
```

Node price is split into CPU, RAM and GPU components using the provider's pricing (OpenCost reads public price lists or custom pricing; with cloud billing integration it reconciles to actual billed cost, including discounts).

| Cost bucket | What it is | How to allocate |
|-------------|------------|-----------------|
| Workload cost | Requests/usage of pods | Directly to namespace/label owner |
| Idle cost | Node capacity no pod requested | Spread proportionally, or report separately as platform efficiency |
| Shared/system | kube-system, monitoring, ingress controllers | Spread by share of workload cost, or charge to platform |
| Out-of-cluster | Managed DBs, buckets, load balancers | Tag-based, joined by team label |

Reporting idle cost separately gives the platform team an efficiency target and keeps team bills stable.

## Installing OpenCost

OpenCost needs Prometheus (or a compatible endpoint) for usage metrics.

```bash
helm repo add opencost https://opencost.github.io/opencost-helm-chart
helm repo update
helm install opencost opencost/opencost \
  --namespace opencost --create-namespace \
  --set opencost.prometheus.internal.namespaceName=monitoring \
  --set opencost.prometheus.internal.serviceName=prometheus-server \
  --set opencost.prometheus.internal.port=80
```

```bash
kubectl -n opencost port-forward svc/opencost 9003:9003 9090:9090
# UI on :9090, API on :9003
```

For accurate prices on AWS, Azure or GCP, configure the cloud integration (billing export credentials) in the chart values; without it OpenCost uses list prices and will not reflect Savings Plans, RIs or CUDs.

## Allocation API

```bash
# Cost by namespace for the last 7 days, one row per namespace
curl -G http://localhost:9003/allocation/compute \
  --data-urlencode "window=7d" \
  --data-urlencode "aggregate=namespace" \
  --data-urlencode "accumulate=true"

# By team label, daily steps, idle shared proportionally
curl -G http://localhost:9003/allocation/compute \
  --data-urlencode "window=30d" \
  --data-urlencode "aggregate=label:team" \
  --data-urlencode "step=1d" \
  --data-urlencode "shareIdle=true"
```

Response entries include `cpuCost`, `ramCost`, `gpuCost`, `pvCost`, `networkCost`, `totalCost`, plus efficiency fields (`cpuEfficiency`, `ramEfficiency`). The `kubectl cost` plugin offers the same queries from the CLI.

## Labels for Ownership

Allocation is only as good as metadata. Enforce owner labels on namespaces and workloads.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    team: payments
    cost-center: cc-4120
    environment: prod
```

Kyverno policy to require the label on Deployments:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-team-label
spec:
  validationFailureAction: Enforce
  rules:
    - name: team-label
      match:
        any:
          - resources:
              kinds: [Deployment, StatefulSet, Job, CronJob]
      validate:
        message: "label 'team' is required for cost allocation"
        pattern:
          metadata:
            labels:
              team: "?*"
```

## Requests Drive Cost

Because allocation charges `max(request, usage)`, inflated requests are billed to the team even when unused. Show teams their efficiency:

```text
cpu_efficiency = cpu_usage / cpu_request
```

Low efficiency over a full business cycle signals over-requesting; VPA recommendations or Goldilocks provide target values. Pods with no requests are charged only on usage and also break scheduling assumptions; require requests via policy (LimitRange defaults or admission policies).

## Shared Cluster Showback Report

| Column | Source |
|--------|--------|
| Team | Namespace or `team` label |
| Workload cost | OpenCost allocation (requests/usage) |
| Share of idle | Proportional to workload cost, or excluded |
| Share of system | Proportional, or charged to platform |
| Out-of-cluster | Billing export joined on `team` tag |
| Efficiency | CPU and RAM efficiency |
| Trend | Month over month |

Publish monthly; review top movers with owners.

## GPU Clusters

- GPU nodes are expensive per hour; idle GPU time dominates waste. Track GPU allocation and utilization (NVIDIA DCGM exporter) per namespace.
- Use node taints so only GPU workloads land on GPU nodes; otherwise CPU pods hold them up from scaling down.
- Time-slicing or MIG partitions change the unit of allocation; label them so cost maps to the partition requested.

## Managed Alternatives

| Option | Notes |
|--------|-------|
| AWS split cost allocation data for EKS | Adds pod-level cost to CUR using requests/usage |
| GKE cost allocation | Namespace and label breakdown in the billing export |
| AKS cost analysis add-on | Namespace-level view in Azure Cost Management |
| Kubecost (commercial) | OpenCost plus multi-cluster, savings insights, governance |

Managed options reconcile with billed cost natively; OpenCost adds portability and real-time views.

## Checklist

- [ ] Prometheus retention covers the reporting window
- [ ] Cloud billing integration configured for discounted prices
- [ ] `team` and `cost-center` labels enforced by admission policy
- [ ] Idle and system costs reported separately, with a documented split rule
- [ ] Efficiency shown to teams with rightsizing recommendations
- [ ] Monthly showback reconciled against the cloud invoice
