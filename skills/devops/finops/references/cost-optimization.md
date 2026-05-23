# Cost Optimization

## Right-Sizing
```bash
aws compute-optimizer get-ec2-instance-recommendations \
  --instance-arns arn:aws:ec2:us-east-1:123456789:instance/i-xxx

az vm list --query "[?powerState=='VM running']" -o table

gcloud recommender recommendations list \
  --project=my-project --location=us-central1 \
  --recommender=google.cloudcompute.InstanceMachineTypeRecommender
```

Right-sizing decision matrix:

| Avg CPU | Avg Memory | Action |
|---------|-----------|--------|
| <20% | <40% | Downsize 1-2 tiers |
| 20-40% | 40-60% | Current tier OK |
| 40-60% | 60-80% | Consider upgrade |
| >60% | >80% | Upgrade needed |

Kubernetes VPA recommendation:
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: Auto
  resourcePolicy:
    containerPolicies:
    - containerName: '*'
      minAllowed: {cpu: 50m, memory: 64Mi}
      maxAllowed: {cpu: "4", memory: 8Gi}
```

## Reserved Instances / Savings Plans
```bash
aws savingsplains purchase-savings-plan \
  --savings-plan-offering-id <offering-id> \
  --commitment 1000 --payment-option PartialUpfront

gcloud recommender recommendations list \
  --project=my-project \
  --recommender=google.compute.commitment.CommitmentRecommender
```

Coverage strategy: RI/SP cover 60-80% of baseline (always-on workloads), spot covers 10-20% of flexible workloads, on-demand covers remaining burst. Track utilization monthly — utilization <70% means over-committed. Partial upfront offers best discount-vs-cash-flow ratio. 3yr commitments for stable databases and control planes.

## Spot / Preemptible Instances
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-worker
spec:
  template:
    spec:
      nodeSelector:
        cloud.google.com/gke-spot: "true"
      tolerations:
      - key: "spot" operator: "Exists" effect: "NoSchedule"
```
```bash
gcloud compute instances create myapp-worker --preemptible --max-run-duration 86400
```
Use pod disruption budgets for graceful handling of spot reclaim. Diversify across 3+ instance types. Karpenter handles spot diversification automatically. Spot for stateless workers, CI/CD runners, batch jobs, and non-production environments.

## Storage Lifecycle
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket myapp-logs --lifecycle-configuration '{
    "Rules": [{
      "Id": "log-lifecycle", "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ],
      "Expiration": {"Days": 365}
    }]
  }'
```
Lifecycle: hot (frequently accessed, standard) -> cool (>30d, infrequent access) -> archive (>90d, glacier/coldline) -> delete (>365d). Automatic transition policies reduce manual overhead. Noncurrent version expiration for S3 versioning buckets.

## Tagging Strategy
```json
{
  "mandatoryTags": ["environment", "cost-center", "service", "team", "owner", "application"],
  "enforcement": {"denyUntagged": true, "autoTagFromParent": true, "reportUntaggedWeekly": true},
  "values": {
    "environment": ["dev", "staging", "prod"],
    "cost-center": ["platform", "data-platform", "ml", "security"]
  }
}
```

## Data Transfer Optimization
Cross-region traffic costs 3-10x intra-region. Co-locate dependent services in same region. Use CloudFront/S3 Transfer Acceleration for uploads. Minimize NAT Gateway data processing (cost per GB processed). VPC endpoints for private connectivity without NAT. Inter-region VPC peering costs per GB transferred.

## K8s Cost Optimization (Karpenter)
Karpenter provisions nodes dynamically based on pod resource requests, diversifies across instance types for spot, consolidates nodes to eliminate waste. Complement with Kubecost for visibility. Use node selectors and taints to separate workloads by cost profile (spot vs on-demand, GPU vs general).
