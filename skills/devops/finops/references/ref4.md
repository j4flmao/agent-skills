# Idle and Orphaned Resource Cleanup and Non-Production Scheduling

Waste is spend with no business value: resources nobody uses or that run when nobody needs them. It is the safest saving because removing it does not change production behavior. This reference covers finding waste with queries, safe deletion procedures, and off-hours scheduling.

## Common Waste Sources

| Resource | Signal of waste | Billed while idle? |
|----------|-----------------|--------------------|
| Unattached block volumes (EBS, managed disks, persistent disks) | State `available` / `Unattached` | Yes, per GB-month |
| Old snapshots and AMIs/images | Source volume gone, older than retention | Yes |
| Unassociated public IPv4 addresses | Not attached to a running resource | Yes (AWS charges for all public IPv4, attached or not) |
| Idle load balancers | No healthy targets or near-zero requests | Yes, hourly |
| NAT gateways in unused VPCs | Near-zero bytes processed | Yes, hourly |
| Stopped VMs with attached disks | Instance stopped for weeks | Disks yes, compute no (Azure: only if deallocated) |
| Idle databases | Zero connections for weeks | Yes |
| Old container images and build artifacts | Untagged, not pulled | Yes, storage |
| Forgotten dev/test environments | No deploys or traffic | Yes |
| Log groups with infinite retention | Never queried | Yes, storage |

## Finding Waste

### AWS CLI

```bash
# Unattached EBS volumes
aws ec2 describe-volumes --filters Name=status,Values=available \
  --query 'Volumes[].{id:VolumeId,gb:Size,type:VolumeType,created:CreateTime}' --output table

# Elastic IPs not associated
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].[PublicIp,AllocationId]' --output table

# Snapshots owned by this account older than a date
aws ec2 describe-snapshots --owner-ids self \
  --query "Snapshots[?StartTime<'2026-01-01'].[SnapshotId,VolumeSize,StartTime]" --output table

# Log groups with no retention set
aws logs describe-log-groups --query 'logGroups[?retentionInDays==null].logGroupName'
```

AWS Trusted Advisor, Compute Optimizer (idle recommendations) and Cost Optimization Hub aggregate many of these checks.

### Azure Resource Graph

```kusto
// Unattached managed disks
Resources
| where type =~ 'microsoft.compute/disks'
| where properties.diskState =~ 'Unattached'
| project name, resourceGroup, sku = sku.name, sizeGB = properties.diskSizeGB, location

// Public IPs not associated
Resources
| where type =~ 'microsoft.network/publicipaddresses'
| where isnull(properties.ipConfiguration) and isnull(properties.natGateway)
| project name, resourceGroup, location

// VMs stopped but not deallocated (still billed for compute)
Resources
| where type =~ 'microsoft.compute/virtualmachines'
| extend state = tostring(properties.extended.instanceView.powerState.code)
| where state =~ 'PowerState/stopped'
```

```bash
az graph query -q "<query>" --first 1000
```

### GCP

```bash
# Unattached persistent disks (no users)
gcloud compute disks list --filter="-users:*" --format="table(name,zone,sizeGb,type)"

# Reserved static external IPs not in use
gcloud compute addresses list --filter="status=RESERVED" --format="table(name,region,address)"

# Idle resource recommendations
gcloud recommender recommendations list --project=$PROJECT --location=us-central1-a \
  --recommender=google.compute.disk.IdleResourceRecommender
```

## Safe Deletion Procedure

Deletion is irreversible; follow a staged process:

1. **Identify** candidates with queries above; exclude resources tagged `retain=true`.
2. **Attribute** to an owner via tags, creator (CloudTrail / Activity Log / Audit Logs), or account owner.
3. **Notify** owners with a deadline (for example 14 days).
4. **Quarantine**: tag `cleanup-scheduled=<date>`; for volumes, take a final snapshot; for VMs, stop/deallocate first.
5. **Delete** after the deadline if no objection.
6. **Expire the safety net**: delete the final snapshot after a further retention period.
7. **Log** what was deleted and the monthly savings.

Never automate deletion of production resources without an owner sign-off. Automated deletion is acceptable for sandbox accounts with a documented TTL policy.

## TTL Tags for Ephemeral Environments

```yaml
# Tag convention
expires-on: "2026-11-15"     # ISO date
owner: "alice@example.com"
```

A scheduled job lists resources where `expires-on` is in the past, notifies the owner, then stops and later deletes them. Preview environments created by CI should be destroyed by the pipeline on PR close, with the TTL job as a backstop.

## Off-Hours Scheduling

Running non-production 50 hours per week instead of 168 cuts its compute hours by roughly 70%.

| Tool | Scope |
|------|-------|
| Instance Scheduler on AWS | EC2, RDS, Auto Scaling groups by tag and schedule |
| EventBridge Scheduler universal targets | Direct API calls (stop/start) on a cron |
| Azure VM auto-shutdown, Azure Automation, `az aks stop/start` | VMs, AKS clusters |
| GCP instance schedules (resource policies) | Compute Engine VMs |
| Kubernetes: scale Deployments to zero (kube-downscaler or KEDA cron scaler) + cluster autoscaler | Namespaces in shared clusters |

```bash
# GCP instance schedule
gcloud compute resource-policies create instance-schedule office-hours \
  --region=europe-west1 --timezone=Europe/Berlin \
  --vm-start-schedule="0 7 * * MON-FRI" --vm-stop-schedule="0 20 * * MON-FRI"
gcloud compute instances add-resource-policies dev-vm-1 \
  --zone=europe-west1-b --resource-policies=office-hours
```

```yaml
# KEDA cron scaler: replicas only during working hours
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: {name: api-dev, namespace: dev}
spec:
  scaleTargetRef: {name: api}
  minReplicaCount: 0
  triggers:
    - type: cron
      metadata:
        timezone: Europe/Berlin
        start: 0 7 * * 1-5
        end: 0 20 * * 1-5
        desiredReplicas: "2"
```

Notes:
- Stopped instances still pay for attached storage and Elastic IPs.
- RDS instances stopped manually restart automatically after 7 days; use a schedule, not a one-time stop.
- Provide a self-service "keep running tonight" override (tag or chat command) to avoid teams opting out entirely.

## Measuring Waste

| KPI | Definition |
|-----|------------|
| Waste ratio | Identified waste / total spend |
| Schedule coverage | Non-prod compute hours under a schedule / total non-prod compute hours |
| Time to remediate | Days from detection to deletion |
| Untagged spend | Spend without owner tag (waste you cannot attribute) |

## Checklist

- [ ] Weekly waste queries for each cloud, results routed to owners
- [ ] Staged deletion with final snapshots and owner notification
- [ ] TTL tags on ephemeral and sandbox resources
- [ ] Non-prod schedules with an override mechanism
- [ ] Log retention set on every log group
- [ ] Waste ratio and remediation time tracked
