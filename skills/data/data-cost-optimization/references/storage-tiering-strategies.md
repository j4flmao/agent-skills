# Storage Tiering Strategies

## S3 Storage Classes
| Class | Min Storage | Retrieval | Cost/GB/mo |
|---|---|---|---|
| Standard | None | Instant | $0.023 |
| Standard-IA | 30d | Instant | $0.0125 |
| Glacier Instant Retrieval | 90d | ms-level | $0.004 |
| Glacier Flexible | 90d | 1-5 min | $0.0036 |
| Glacier Deep Archive | 180d | 12hr | $0.00099 |

## Lifecycle Policy
```yaml
LifecycleConfiguration:
  Rules:
    - Id: landing-tiering
      Status: Enabled
      Filter: {Prefix: landing/}
      Transitions:
        - Days: 7,  StorageClass: STANDARD_IA
        - Days: 30, StorageClass: GLACIER_INSTANT_RETRIEVAL
        - Days: 90, StorageClass: GLACIER
        - Days: 365, StorageClass: DEEP_ARCHIVE
      Expiration: {Days: 2555}

    - Id: logs-tiering
      Status: Enabled
      Filter: {Prefix: logs/}
      Transitions:
        - Days: 3, StorageClass: STANDARD_IA
        - Days: 14, StorageClass: GLACIER
      Expiration: {Days: 90}

    - Id: abort-incomplete-uploads
      Status: Enabled
      Filter: {Prefix: ''}
      AbortIncompleteMultipartUpload: {DaysAfterInitiation: 7}
```

## Terraform Lifecycle
```hcl
resource "aws_s3_bucket_lifecycle_configuration" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  rule {
    id = "data-tiering"
    status = "Enabled"
    filter { prefix = "data/" }
    transition { days = 30; storage_class = "STANDARD_IA" }
    transition { days = 90; storage_class = "GLACIER_INSTANT_RETRIEVAL" }
    transition { days = 365; storage_class = "DEEP_ARCHIVE" }
    expiration { days = 2555 }
  }
}
```

## S3 Intelligent-Tiering
Auto-moves data between access tiers based on usage patterns. Enables without lifecycle rules:
```bash
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket data-lake-prod --id default-tiering \
  --intelligent-tiering-configuration '{
    "Id": "default-tiering", "Status": "Enabled",
    "Tiering": [
      {"Days": 30, "AccessTier": "ARCHIVE_ACCESS"},
      {"Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS"}
    ]
  }'
```

## Retention Policy Matrix
| Data Type | Requirement | Hot | Warm | Cold | Delete |
|---|---|---|---|---|---|
| Financial (SOX) | 7 years | 0-90d: Std | 90d-7y: Deep Archive | — | After 7y |
| Customer PII | Per request | 0-30d: Std | 30d-1y: Glacier IA | — | On request |
| Audit logs (SOC2) | 1-3 years | 0-7d: Std | 7d-3y: Glacier | — | After 3y |
| Clickstream | 90d internal | 0-30d: Std | 30-90d: Std IA | — | After 90d |
| ML training | 2 years | 0-90d: Std | 90d-2y: Glacier IR | — | After 2y |

## Compression Savings
| Type | Raw | gzip | zstd |
|---|---|---|---|
| JSON logs | 100 GB | 15 GB (6.7x) | 12 GB (8.3x) |
| CSV tables | 100 GB | 25 GB (4x) | 22 GB (4.5x) |
| Parquet (encoded) | 100 GB | 45 GB | 42 GB |

## Monthly Cost Comparison (100TB)
| Scenario | Standard | Std-IA | Glacier IR | Deep Archive |
|---|---|---|---|---|
| Storage only | $2,355 | $1,280 | $410 | $101 |
| +10% retrieval | $2,355 | $1,380 | $710 | $301 |
| +50% retrieval | $2,355 | $1,780 | $1,860 | $1,101 |

## Legal Hold
```python
import boto3
s3 = boto3.client('s3')
def apply_legal_hold(bucket, key, status='ON'):
    s3.put_object_legal_hold(Bucket=bucket, Key=key,
        LegalHold={'Status': status})
```

## GCS & Azure Equivalents
| AWS | GCS | Azure |
|---|---|---|
| Standard | Standard | Hot |
| Standard-IA | Nearline | Cool |
| Glacier Instant | Coldline | Cold |
| Glacier/Deep Archive | Archive | Archive |

## Rules
- Implement S3 lifecycle transitions at 30/90/365 day thresholds
- Abort incomplete multipart uploads after 7 days
- Compress text data before transitioning to cold tiers
- Apply legal hold before archival for regulated data
- Use S3 Storage Lens to monitor tier distribution monthly
