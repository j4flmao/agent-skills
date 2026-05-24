# Storage and Network Cost Optimization

## Storage Tiers

| Tier | Access | Cost/GB | Retrieval Cost | Min Duration | Use Case |
|------|--------|---------|----------------|-------------|----------|
| Hot/Standard | Instant | $0.023 | $0 | None | Active data |
| Cool/Infrequent | Instant | $0.012 | $0.01/GB | 30 days | Monthly logs |
| Cold/Archive (30d) | 1-3 hours | $0.004 | $0.03/GB | 90 days | Quarterly data |
| Archive/Glacier | 12-48 hours | $0.001 | $0.09/GB | 180 days | Compliance/legal |

## Data Lifecycle Policy

```json
{
  "rules": [
    {
      "id": "expire-logs",
      "status": "Enabled",
      "filter": { "prefix": "logs/" },
      "transitions": [
        { "days": 30, "storage_class": "STANDARD_IA" },
        { "days": 90, "storage_class": "GLACIER" }
      ],
      "expiration": { "days": 365 }
    },
    {
      "id": "backup-tier",
      "status": "Enabled",
      "filter": { "prefix": "backups/" },
      "transitions": [
        { "days": 7, "storage_class": "DEEP_ARCHIVE" }
      ]
    }
  ]
}
```

## Data Transfer Costs

| Transfer Direction | AWS | Azure | GCP |
|-------------------|-----|-------|-----|
| Internet ingress | Free | Free | Free |
| Same region AZ | Free | Free | Free |
| Cross-AZ same region | $0.01/GB | $0.01/GB | $0.01/GB |
| Cross-region egress | $0.02-0.09/GB | $0.02-0.12/GB | $0.02-0.12/GB |
| Internet egress | $0.05-0.09/GB | $0.05-0.12/GB | $0.08-0.12/GB |
| CloudFront/Cloud CDN egress | $0.025-0.085/GB | $0.01-0.15/GB | $0.02-0.08/GB |

## CDN Cost Savings

| Strategy | Savings | Implementation |
|----------|---------|---------------|
| CDN origin shield | 20-40% | Single origin fetch, edge distribution |
| Cache optimization | 30-60% | Longer TTL, cache-control headers |
| Compression | 50-70% (bandwidth) | Enable gzip/brotli |
| Image optimization | 40-80% | WebP/AVIF, resize, quality tuning |
| Shield regions | 10-20% | Regional cache layer |

## Data Compression

| Data Type | Algorithm | Compression Ratio | CPU Cost |
|-----------|-----------|-------------------|----------|
| Text/JSON | gzip | 5-10x | Low |
| Logs | zstd | 8-15x | Medium |
| Images | WebP | 2-3x vs PNG | Medium |
| Videos | H.265 | 2x vs H.264 | High |
| Database backup | zstd | 3-5x | Medium |

## Waste Elimination

| Pattern | Detection | Savings |
|---------|-----------|---------|
| Orphaned volumes | Tag unused resources | 100% of orphaned cost |
| Zombie load balancers | No targets attached | 100% of zombie cost |
| Unattached IPs | Not associated with resource | 100% of IP cost |
| Over-provisioned storage | Monitor utilization | 30-50% |
| Old snapshots | Age > 90 days | 40-60% |
| Untagged resources | Cost allocation blind spot | 10-20% governance overhead |
