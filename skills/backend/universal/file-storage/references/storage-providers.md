# Storage Providers

## Provider Comparison

| Feature | AWS S3 | GCS | Azure Blob | MinIO | Cloudflare R2 |
|---------|--------|-----|------------|-------|---------------|
| Durability | 11 9's | 11 9's | 11 9's | Configurable | 11 9's |
| Consistency | Read-after-write | Strong global | Read-after-write | Strong | Strong |
| Max object size | 5TB | 5TB | 4.75TB | Configurable | 5TB |
| Multi-part upload | Yes | Yes | Yes | Yes | Yes |
| S3 API compatible | Native | Yes | Via SDK | Full | Full |
| Event notifications | SQS/SNS/Lambda | PubSub/Cloud Func | Event Grid | Bucket events | Webhooks |
| Lifecycle policies | Yes | Yes | Yes | MinIO Client | Yes |
| Object lock | Yes | Yes (holds) | Yes (legal hold) | Yes | Yes |
| Encryption (default) | SSE-S3 | Server-side | SSE | Configurable | Server-side |
| IAM integration | IAM | Cloud IAM | Azure AD | OIDC/LDAP | API tokens |
| Egress cost | $0.09/GB | $0.12/GB | $0.087/GB | Varies | $0.00 |
| Cross-region replication | Yes | Yes | Yes | Via bucket sync | Yes |
| S3 Transfer Acceleration | Yes | No | No | No | No |

## Bucket Architecture

```yaml
production:
  buckets:
    - name: "prod-uploads"
      region: us-east-1
      versioning: false
      public_access: blocked
      encryption: SSE-S3
      lifecycle:
        - days: 1
          action: transition_to_standard_IA
        - days: 7
          action: delete
    - name: "prod-processed"
      region: us-east-1
      versioning: true
      public_access: blocked
      encryption: SSE-S3
      lifecycle:
        - days: 90
          action: transition_to_Glacier
        - days: 365
          action: delete
    - name: "prod-quarantine"
      region: us-east-1
      versioning: true
      public_access: blocked
      encryption: SSE-KMS
      lifecycle:
        - days: 30
          action: review_required
        - days: 90
          action: delete
    - name: "prod-backups"
      region: us-east-1
      versioning: true
      public_access: blocked
      encryption: SSE-KMS
      object_lock: governance
      lifecycle:
        - days: 30
          action: transition_to_Glacier
        - days: 365
          action: delete
```

## Key Naming Convention

```
{env}/{tenant}/{type}/{uuid}/{filename}

prod/acme-corp/avatars/0192f3a4-b5c6-7d8e-9f01-123456789abc/profile.webp
staging/tenant-xyz/documents/123e4567-e89b-12d3-a456-426614174000/report.pdf
dev/j4flmao/images/550e8400-e29b-41d4-a716-446655440000/screenshot.png
```

Key design rules: no personally identifiable information (PII) in key, use UUIDv7 for sortable time-ordered IDs, folder prefixes enable S3 cost optimization and access control via prefix-based IAM policies, include version hash for CDN cache busting.

## Presigned URL Patterns

```typescript
// Upload URL — 15 min expiry
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1', credentials: { accessKeyId, secretAccessKey } });

async function generateUploadUrl(tenant: string, type: string, filename: string): Promise<UploadResponse> {
  const uuid = crypto.randomUUID();
  const key = `prod/${tenant}/${type}/${uuid}/${filename}`;

  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: 'prod-uploads',
    Key: key,
    ContentType: getContentType(filename),
    Metadata: { tenant, uploader: userId },
  }), { expiresIn: 900 });

  return { uploadUrl, key, expiresAt: Date.now() + 900_000 };
}

// Download URL — 1 hour expiry
async function generateDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: 'prod-processed',
    Key: key,
    ResponseContentDisposition: 'attachment',
  }), { expiresIn: 3600 });
}

// Multipart upload for files >100MB
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';

async function startMultipartUpload(key: string): Promise<string> {
  const { UploadId } = await s3.send(new CreateMultipartUploadCommand({
    Bucket: 'prod-uploads', Key: key,
  }));
  return UploadId!;
}
```

```go
// Go — GCS presigned URL
import "cloud.google.com/go/storage"

func generateV4PutURL(client *storage.Client, bucket, object string) (string, error) {
  url, err := client.Bucket(bucket).SignedURL(object, &storage.SignedURLOptions{
    Method:  "PUT",
    Expires: time.Now().Add(15 * time.Minute),
    ContentType: "image/jpeg",
  })
  return url, err
}
```

## Server-Side Encryption Options

| Option | Key Management | Key Rotation | Cost | Compliance |
|--------|---------------|-------------|------|------------|
| SSE-S3 | AWS-managed | Automatic | Free | SOC, PCI |
| SSE-KMS | Customer-managed via KMS | Configurable | $0.03/10K requests | HIPAA, FedRAMP |
| SSE-C | Customer-provided keys | Manual | Free | Full control |
| DSSE-KMS (S3) | KMS with dual-layer | Configurable | Higher | Strictest |

## IAM Policy Template

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::prod-processed/*",
      "Condition": {
        "IpAddress": { "aws:SourceIp": "10.0.0.0/8" },
        "Bool": { "aws:SecureTransport": "true" }
      }
    }
  ]
}
```

## Security Best Practices

- Block public access at account and bucket level (default: on)
- Enable S3 Block Public Access for all buckets
- Validate Content-Type matches expected file type server-side before generating presigned URL
- Set object metadata (tenant, uploader, original filename) at upload time for audit trail
- Enable S3 server access logs for all production buckets
- Use VPC endpoints for S3 access (no internet exposure)
- Enable S3 Object Lock for compliance (governance or legal hold mode)
- Configure S3 Lifecycle policies to transition cold data to cheaper storage tiers
- Enable S3 Versioning for processed and quarantine buckets
- Monitor S3 public access via IAM Access Analyzer

## Common Pitfalls

- **Public bucket**: Accidentally making bucket public exposes all objects. Always block public access by default.
- **PII in keys**: User IDs, emails, or SSNs in S3 keys are not automatically encrypted. Keys are visible in URLs, logs, and bucket listings.
- **Overly permissive presigned URL**: Presigned URL with full access or overly long TTL (days) is a security risk. Use least-privilege operations and short TTLs.
- **No lifecycle policies**: Objects accumulate indefinitely, increasing storage costs. Implement lifecycle rules from day one.
- **Single-region storage without replication**: Regional outages make data unavailable. Use cross-region replication (CRR) for critical data.
