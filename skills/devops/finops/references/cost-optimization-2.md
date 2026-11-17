# Cloud Cost Optimization Techniques

## Compute Optimization

### Right-Sizing

| Current Size | Utilization | Recommended Size | Savings |
|-------------|-------------|-----------------|---------|
| c5.4xlarge (16 vCPU) | CPU 15%, Mem 25% | c5.xlarge (4 vCPU) | 75% |
| r5.2xlarge (8 vCPU) | CPU 30%, Mem 40% | r5.xlarge (4 vCPU) | 50% |
| m5.8xlarge (32 vCPU) | CPU 10%, Mem 20% | m5.2xlarge (8 vCPU) | 75% |

Rule: if CPU < 40% and memory < 50% over 14 days, downsize. Use AWS Compute Optimizer or custom metrics.

### Spot Instances

| Workload Type | Spot Suitable | Max Spot % |
|--------------|---------------|-----------|
| Spark executors | Yes | 100% |
| Airflow workers | Yes | 100% |
| ML training | Yes (with checkpoint) | 80% |
| Kafka brokers | No | 0% |
| Production APIs | No | 0% |
| CI/CD runners | Yes | 100% |

Best practices: diversify instance types, use mixed instances policy, set interrupt budget (5-10%).

### Reserved Instances / Savings Plans

| Commitment | Discount | Best For |
|-----------|----------|----------|
| 1-year, no upfront | 20-30% | Flexibility |
| 1-year, partial upfront | 30-40% | Balance |
| 1-year, all upfront | 35-45% | Best savings |
| 3-year, all upfront | 50-60% | Stable workloads |

Coverage target: 65% of steady-state compute with RIs/SPs. Remaining 35%: spot + on-demand.

## Storage Optimization

### S3 Lifecycle Policy

```json
{
  "rules": [
    {
      "id": "standard-to-ia",
      "filter": {"prefix": "logs/"},
      "transitions": [
        {"days": 30, "storage_class": "STANDARD_IA"},
        {"days": 90, "storage_class": "GLACIER"},
        {"days": 365, "storage_class": "DEEP_ARCHIVE"}
      ],
      "expiration": {"days": 1825}  // 5 years
    }
  ]
}
```

### EBS Optimization
- Use gp3 instead of gp2 (20% cheaper baseline)
- Delete unattached volumes (scheduled weekly)
- Use snapshots for backup, not volume copies
- Right-size: match volume to actual usage (not over-provisioned)

### Compression
Enable compression on data stored in S3 (Parquet ZSTD, GZIP for text). Side effect: reduced compute cost during loading. Compress before upload.

## Data Transfer Cost

### Inter-Region Traffic
- $0.01-0.09/GB between regions
- Minimize: consolidate workloads in same region
- Use VPC peering or Transit Gateway for cross-region
- Cache egress with CloudFront ($0.085/GB vs $0.09/GB direct)

### NAT Gateway
- $0.045/hour + $0.045/GB processed
- Replace with VPC endpoints for AWS services
- Use egress-only Internet Gateway for IPv6
- Consolidate multiple NATs

### Direct Connect
- 1Gbps: $0.30/hour + $0.02/GB egress
- 10Gbps: $2.25/hour + $0.02/GB egress
- Break-even: ~5TB/month egress vs Internet

## Waste Elimination

### Weekly Waste Report

| Resource Type | Detection Method | Estimated Monthly Waste |
|--------------|-----------------|----------------------|
| Idle Load Balancers | No active targets | $20-100 each |
| Unattached EBS | Volume not mounted | $10-50 each |
| Orphaned Snapshots | No parent volume | $5-20 each |
| Elastic IPs not in use | Not associated | $3.60 each |
| Underutilized RDS | CPU < 10% for 7 days | $50-500 each |
| Stopped instances | Running count = 0 for 7 days | Varies |

### Automated Remediation

```yaml
remediation_rules:
  - resource: unattached_ebs
    action: delete
    grace_period: 7d
    notification: owner
    schedule: weekly

  - resource: idle_lb
    action: delete
    grace_period: 14d
    notification: owner
    schedule: monthly

  - resource: underutilized_instance
    action: resize (recommended)
    grace_period: 14d
    notification: owner
    schedule: monthly
```

## Cost-Saving Architecture Patterns

1. **Spot + on-demand mix**: 80% spot, 20% on-demand for Spark/ML workloads
2. **Auto-scaling**: Scale to zero for non-production in off-hours
3. **Serverless**: Lambda for event-driven, ephemeral workloads
4. **Caching**: Redis/Memcached reduces database read load
5. **Data lifecycle**: Automate tiering and deletion
6. **CDN**: CloudFront for frequently accessed static content
