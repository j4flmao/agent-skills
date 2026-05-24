# Compute Cost Optimization

## Right-Sizing

| Phase | Action | Expected Savings |
|-------|--------|-----------------|
| Analyze | Collect 30 days of CPU/Memory utilization | — |
| Downsize | ≥20% underutilized → 1-2 sizes down | 20-40% |
| Rightsize | Over-provisioned by 2+ generations | 30-50% |
| Modernize | Move to newer instance families (e.g., Graviton) | 10-20% |
| Schedule | Stop non-production instances at night/weekends | 30-60% |

```bash
# AWS: Find underutilized instances with Compute Optimizer
aws compute-optimizer get-ec2-instance-recommendations

# Azure: Check right-sizing recommendations
az vm list --query "[?storageProfile.osDisk.diskSizeGb > `128`]"

# GCP: Committed use discount analysis
gcloud recommender recommendations list \
  --project=my-project \
  --location=global \
  --recommender=google.compute.instance.MachineTypeRecommender
```

## Spot Instances

| Workload | Spot Suitability | Reason |
|----------|-----------------|--------|
| Batch processing | Excellent | Interruption-tolerant |
| CI/CD runners | Excellent | Can restart jobs |
| Stateless web servers | Good | Scale-down graceful |
| Stateful databases | Poor | Interruption risk |
| ML training | Good with checkpointing | Can resume |

## Reserved Instances / Savings Plans

| Option | Commitment | Discount | Flexibility |
|--------|------------|----------|-------------|
| 1-year no upfront | 1 year | 20-30% | Low |
| 1-year partial upfront | 1 year | 25-35% | Medium |
| 1-year all upfront | 1 year | 30-40% | Medium |
| 3-year all upfront | 3 years | 40-60% | Low |
| Savings Plans | 1-3 years | 20-60% | High (instance family flexible) |
| Committed Use Discounts (GCP) | 1-3 years | 20-70% | Resource-type flexible |

## Compute Auto-Scaling

```yaml
scaling_policies:
  - name: cpu-based
    metric: CPUUtilization
    target: 60%
    scale_up_cooldown: 120s
    scale_down_cooldown: 300s
    min_capacity: 2
    max_capacity: 20

  - name: scheduled
    schedule: "0 8 * * 1-5"  # Scale up at 8am weekdays
    min_capacity: 10
    schedule: "0 20 * * 1-5"  # Scale down at 8pm weekdays
    min_capacity: 2
```

## Container Cost Optimization

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| Right-size requests/limits | Use VPA recommendations | 20-30% |
| Cluster autoscaling | Karpenter, CA, AKS autoscaler | 15-25% |
| Spot nodes | Karpenter spot diversification | 50-70% |
| Node pools optimization | Separate system vs app pools | 10-15% |
| Bin packing | Increase pod density | 20-40% |
| Graviton/ARM | AWS Graviton instances | 10-20% |
