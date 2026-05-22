# Cost Optimization

## Right-Sizing

```bash
# AWS: Get EC2 right-sizing recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --instance-arns arn:aws:ec2:us-east-1:123456789:instance/i-xxx

# Azure: Get VM right-sizing
az vm list --query "[?powerState=='VM running']" -o table
# Use Azure Advisor for right-sizing recommendations

# GCP: Get machine type recommendations
gcloud recommender recommendations list \
  --project=my-project \
  --location=us-central1 \
  --recommender=google.cloudcompute.InstanceMachineTypeRecommender \
  --format=json
```

Right-sizing decision matrix:

| Avg CPU | Avg Memory | Action |
|---------|-----------|--------|
| <20% | <40% | Downsize 1-2 tiers |
| 20-40%  | 40-60% | Current tier OK |
| 40-60%  | 60-80% | Consider upgrade |
| >60%    | >80% | Upgrade needed |

## Reserved Instances / Savings Plans

```bash
# AWS: Purchase savings plan
aws savingsplans purchase-savings-plan \
  --savings-plan-offering-id <offering-id> \
  --commitment 1000 \
  --payment-option PartialUpfront \
  --purchase-time 2026-06-01T00:00:00Z

# Azure: Get RI recommendations
az reservations catalog show \
  --reserved-resource-type VirtualMachines \
  --location eastus

# GCP: Get committed use discounts (CUD) recommendations
gcloud recommender recommendations list \
  --project=my-project \
  --recommender=google.compute.commitment.CommitmentRecommender
```

Coverage strategy:
- RI/SP cover 60-80% of baseline usage (always-on workloads)
- Spot covers 10-20% of flexible workloads
- On-demand covers the remaining burst

## Spot / Preemptible Instances

```yaml
# K8s: Spot node pool via node selector
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
      - key: "spot"
        operator: "Exists"
        effect: "NoSchedule"
```

```bash
# GCP: Preemptible VMs
gcloud compute instances create myapp-worker \
  --preemptible \
  --max-run-duration 86400

# AWS: Spot fleet
aws ec2 request-spot-fleet \
  --spot-fleet-request-config file://spot-config.json
```

## Storage Lifecycle

```bash
# AWS S3 lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket myapp-logs \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "log-lifecycle",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ],
      "Expiration": {"Days": 365}
    }]
  }'

# Azure Blob lifecycle
az storage account management-policy create \
  --account-name myappstorage \
  --policy @lifecycle-policy.json
```

## Tagging Strategy

```json
{
  "mandatoryTags": [
    "environment", "cost-center", "service",
    "team", "owner", "application"
  ],
  "enforcement": {
    "denyUntagged": true,
    "autoTagFromParent": true,
    "reportUntaggedWeekly": true
  },
  "values": {
    "environment": ["dev", "staging", "prod"],
    "cost-center": ["platform", "data-platform", "ml", "security"]
  }
}
```
