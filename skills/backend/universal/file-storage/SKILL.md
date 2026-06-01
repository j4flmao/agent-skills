---
name: backend-file-storage
description: >
  Use this skill when designing file upload, storage, CDN delivery, or file processing systems. This skill enforces: direct-to-storage uploads via presigned URLs, flat key design with no sensitive data, server-side validation, CDN caching with version hashes. Applies to S3, Azure Blob, GCS, or any S3-compatible storage. Do NOT use for: database blob storage, application server file handling, or ephemeral temporary files.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, storage, phase-6, universal]
---

# Backend File Storage

## Purpose
Design secure file storage architecture with upload flows, CDN delivery, and processing.

## Agent Protocol

### Trigger
Exact user phrases: "file upload", "file storage", "S3", "object storage", "Blob storage", "CDN", "signed URL", "file serving", "image upload", "file management", "static assets", "presigned URL", "S3 bucket", "cloud storage", "file processing".

### Input Context
Before activating, verify:
- File types accepted and maximum file sizes
- Upload frequency and expected concurrency
- Access patterns (frequently accessed, archival, private)
- CDN requirements (global distribution, cache TTL)
- Processing pipeline (thumbnails, format conversion, virus scan)

### Output Artifact
Storage architecture design as formatted text.

### Response Format
```yaml
# Bucket/key design
# Upload flow
# Processing pipeline
```
```typescript
// Presigned URL generation
// Security configuration
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Storage provider and bucket architecture selected
- [ ] Key naming scheme defined (flat, no sensitive data)
- [ ] Upload flow with presigned URLs and server-side validation
- [ ] File processing pipeline (virus scan, thumbnail, format conversion)
- [ ] Security controls (IAM, encryption, CORS, presigned URL expiry)
- [ ] CDN distribution configured with cache strategy and invalidation

### Max Response Length
250 lines of configuration and code.

## Decision Tree

### Storage Provider

```
What are your requirements?
  ├── General purpose, CDN origin → S3 (default)
  ├── Zero egress fees, high bandwidth → Cloudflare R2
  ├── On-premises / air-gapped → MinIO
  ├── Microsoft ecosystem → Azure Blob
  ├── Analytics / ML pipelines → GCS
  └── Compliance (HIPAA, PCI, FedRAMP) → verify provider certification
```

### Upload Flow

```
Who uploads the file?
  ├── End user (avatar, document, photo)
  │   └── Direct-to-storage via presigned URL (no app server in path)
  ├── Internal tool (admin upload, batch import)
  │   └── Presigned URL or direct server upload for small files (<10MB)
  ├── Server-side generation (report, export)
  │   └── Server writes directly to storage, then notifies user
  └── Large file (>100MB, video, dataset)
      └── Multipart upload / S3 Transfer Acceleration / resumable upload
```

### Processing Strategy

```
File type and processing needs?
  ├── Image (JPEG, PNG, WebP)
  │   ├── Thumbnail generation (150×150, 300×300, 1024×1024)
  │   ├── Format conversion (to WebP/AVIF)
  │   └── EXIF stripping
  ├── Video (MP4, MOV, AVI)
  │   ├── Transcoding (to HLS/DASH)
  │   ├── Thumbnail extraction
  │   └── Compression
  ├── Document (PDF, DOCX, XLSX)
  │   ├── Text extraction / OCR
  │   ├── Page preview generation
  │   └── PDF/A conversion
  └── Archive (ZIP, TAR, GZ)
      └── Extract and scan individual files (dangerous — prefer flat uploads)
```

## Workflow

### Step 1: Storage Provider Selection
| Provider | Durability | Max Object | S3-Compatible | Egress Cost | Best For |
|----------|-----------|-----------|---------------|-------------|----------|
| S3 | 99.999999999% | 5TB | Native | $0.09/GB | General purpose, CDN origin |
| GCS | 99.999999999% | 5TB | Yes | $0.12/GB | Analytics, ML pipelines |
| Azure Blob | 99.999999999% | 4.75TB | Via SDK | $0.087/GB | Microsoft ecosystem |
| MinIO | Configurable | Configurable | Full API | Varies | On-premises, air-gapped |
| Cloudflare R2 | 99.999999999% | 5TB | Full API | $0.00/GB | High-bandwidth, zero egress |

Provider criteria: regional availability, compliance certifications (SOC2, HIPAA, PCI-DSS), egress costs (significant for high-bandwidth), S3 API compatibility (vendor lock-in risk). MinIO for on-premises/air-gapped. R2 for zero egress fees. S3 is default for most applications.

### Step 2: Bucket Architecture

```yaml
bucket_architecture:
  - name: "{env}-uploads"
    purpose: "Initial upload target, triggers processing pipeline"
    versioning: false
    public_access: blocked
    lifecycle:
      - days: 1 → Standard_IA
      - days: 7 → Delete
  - name: "{env}-processed"
    purpose: "Final storage after processing, CDN origin"
    versioning: true
    public_access: blocked
    encryption: SSE-S3
    lifecycle:
      - days: 90 → Glacier
      - days: 365 → Delete
  - name: "{env}-quarantine"
    purpose: "Content that failed virus scan or moderation"
    versioning: true
    encryption: SSE-KMS
    lifecycle:
      - days: 30 → Review required
      - days: 90 → Delete
  - name: "{env}-backups"
    purpose: "Database and configuration backups"
    versioning: true
    object_lock: governance
    lifecycle:
      - days: 30 → Glacier
      - days: 365 → Delete
```

### Step 3: Key Design
Flat key structure with no sensitive data: `{env}/{tenant}/{type}/{uuid}/{filename}`. Example: `prod/acme-corp/avatars/0192f3a4-b5c6-7d8e-9f01-123456789abc/profile.webp`. No user IDs, email addresses, or PII in keys. Folder prefixes enable S3 cost optimization and IAM prefix-based policies. Use UUIDv7 for sortable, time-ordered identifiers.

### Step 4: Upload Flow
Client requests presigned URL from application server. Server validates file type (against MIME allowlist), file size (max per type), and user authorization. Server returns presigned PUT URL with 15-minute TTL. Client uploads directly to S3 (never through app server). Server receives S3 event notification (SQS/SNS) after upload. Server confirms metadata in database. Error flow: expired URL returns 403, client retries with new request.

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' });

async function getUploadUrl(params: { tenant: string; type: string; filename: string; contentType: string }) {
  const uuid = crypto.randomUUID();
  const key = `prod/${params.tenant}/${params.type}/${uuid}/${params.filename}`;
  const command = new PutObjectCommand({
    Bucket: 'prod-uploads',
    Key: key,
    ContentType: params.contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
  return { uploadUrl, key, expiresAt: Date.now() + 900_000 };
}
```

Server-side validation:
```typescript
async function requestUploadUrl(params: { type: string; filename: string; size: number; contentType: string }, user: User) {
  const rules: Record<string, { maxSize: number; mimeTypes: string[] }> = {
    avatar: { maxSize: 5 * 1024 * 1024, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
    document: { maxSize: 50 * 1024 * 1024, mimeTypes: ['application/pdf'] },
    video: { maxSize: 2 * 1024 * 1024 * 1024, mimeTypes: ['video/mp4', 'video/quicktime'] },
  };

  const rule = rules[params.type];
  if (!rule) throw new Error('Invalid file type');
  if (!rule.mimeTypes.includes(params.contentType)) throw new Error('Invalid MIME type');
  if (params.size > rule.maxSize) throw new Error('File too large');
  if (params.size < 100) throw new Error('File too small');

  return getUploadUrl(params);
}
```

### Step 5: File Processing Pipeline
Trigger: S3 PUT event → SQS queue → worker (Lambda or container). Process: virus scan (ClamAV), thumbnail generation (150x150, 300x300, 1024x1024), format conversion (WebP/AVIF for images, HLS for video), content moderation (NSFW detection, OCR text extraction). Processing result stored as metadata on the object. Failed processing moves to quarantine bucket for manual review.

```typescript
// Image processing Lambda
import sharp from 'sharp';
export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    if (key.includes('/processed/')) continue;
    const input = await s3.getObject({ Bucket: record.s3.bucket.name, Key: key }).then(r => r.Body!.transformToByteArray());
    for (const [suffix, w, h] of [['thumb_150', 150, 150], ['thumb_300', 300, 300], ['preview_1024', 1024, 1024]]) {
      const buffer = await sharp(input).resize(w, h, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
      const outKey = key.replace('/uploads/', '/processed/').replace(/\.[^.]+$/, `_${suffix}.webp`);
      await s3.putObject({ Bucket: 'prod-processed', Key: outKey, Body: buffer, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' });
    }
  }
};
```

### Step 6: CDN and Caching
CloudFront: S3 origin with OAC (Origin Access Control). Cache strategy: versioned files (immutable) → TTL 1 year with `CacheControl: immutable`, non-versioned files → TTL 5 minutes. Cache invalidation: avoid with version hash in filename; use invalidation only for emergency content takedown. Signed cookies for private content delivery (authorization at edge, no origin traffic for unauthorized requests).

### Step 7: Security Controls
Block public access at account/bucket level. IAM roles for applications (never IAM users). Presigned URL expiry: 5-15 minutes for uploads, 1 hour for viewing, 24 hours for downloads. CORS: restrict to application domain origins. Encryption: SSE-S3 for standard, SSE-KMS for compliance (HIPAA, PCI). Object Lock for WORM compliance. VPC endpoints for S3 (no internet exposure).

### Step 8: Multipart Upload for Large Files
For files >100MB, use multipart upload for resilience and parallelism.

```typescript
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';

async function multipartUpload(params: { bucket: string; key: string; filePath: string; partSize?: number }) {
  const partSize = params.partSize || 10 * 1024 * 1024;  // 10MB parts
  const create = await s3.send(new CreateMultipartUploadCommand({
    Bucket: params.bucket, Key: params.key,
  }));
  const uploadId = create.UploadId!;
  const parts: { PartNumber: number; ETag: string }[] = [];
  const fileSize = fs.statSync(params.filePath).size;
  let partNumber = 1;

  for (let start = 0; start < fileSize; start += partSize) {
    const end = Math.min(start + partSize, fileSize);
    const body = fs.createReadStream(params.filePath, { start, end });
    const upload = await s3.send(new UploadPartCommand({
      Bucket: params.bucket, Key: params.key, UploadId: uploadId,
      PartNumber: partNumber, Body: body,
    }));
    parts.push({ PartNumber: partNumber, ETag: upload.ETag! });
    partNumber++;
  }

  await s3.send(new CompleteMultipartUploadCommand({
    Bucket: params.bucket, Key: params.key, UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  }));
}
```

## Configuration Reference

```yaml
file_validation:
  avatar: { mimeTypes: [image/jpeg, image/png, image/webp], maxSize: 5MB, minSize: 1KB }
  document: { mimeTypes: [application/pdf], maxSize: 50MB, virusScan: true }
  video: { mimeTypes: [video/mp4, video/quicktime], maxSize: 2GB, multipart: true }
cdn:
  distributions:
    public: { ttl: 31536000, compression: true, price_class: PriceClass_100 }
    private: { ttl: 300, signed_cookies: true, origin: s3://prod-processed }
processing:
  thumbnails: [[150, 150], [300, 300], [1024, 1024]]
  formats: [webp, avif]
  virus_scan: true
  moderation: true
```

## Production Considerations

| Concern | Practice |
|---------|----------|
| Upload rate at scale | Presigned URL generation is cheap (no I/O). Processing scales with queue workers |
| File size limits | Enforce server-side (client-side can be bypassed). Use multipart for large files |
| Storage costs | Lifecycle policies: hot → IA → Glacier → delete. Monitor bucket size per prefix |
| Thundering herd | Thumbnail generation after popular upload (e.g., viral image) → use SQS for buffering |
| Data residency | Choose bucket region based on compliance. Use bucket policies to restrict to region |
| Disaster recovery | Cross-region replication for critical buckets. Versioning protects against accidental deletion |

## Security

| Risk | Mitigation |
|------|-----------|
| Unauthorized uploads | Presigned URLs with IAM auth, short TTL (15 min) |
| Malicious file upload | Server-side MIME validation + virus scan (ClamAV) |
| Path traversal in key | Sanitize filename: remove `../`, null bytes, semicolons |
| Exposed bucket data | Block public access at account + bucket level. OAC for CDN |
| Exfiltration via upload | S3 bucket policy restricts PutObject to presigned URLs only |
| CORS abuse | Restrict to known origins. Never use wildcard for credentialed requests |
| Large file DoS | Enforce max size server-side. Multipart for large reduces memory per request |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Uploading through app server | Wastes server CPU/memory/bandwidth, single point of failure | Direct-to-storage via presigned URL |
| Sensitive data in file keys | PII leak in S3 logs, URLs, CDN caches | Use UUIDs, not emails, in keys |
| Serving files from app server | Slow, expensive, not scalable | CDN with S3 origin |
| No lifecycle policies | Ever-growing storage costs | Define lifecycle: hot → IA → Glacier → delete |
| Client-side validation only | Easily bypassed via curl/Postman | Always validate server-side |
| Long-lived presigned URLs | Security risk if URL is leaked | 5-15 min for upload, 1h max for download |
| Processing in upload handler | Increases latency, couples upload to processing | Async processing via SQS queue |

## Rules
- Never accept files on application server — direct-to-storage from client
- Every upload validated server-side (type, size, virus scan)
- Presigned URL TTL matches upload window (5-15 min)
- File keys are opaque — no user IDs or sensitive data in path
- CDN cache bust via version hash in filename
- Replication for production data across regions
- Block public access by default at account and bucket level
- Never trust Content-Type from client — verify via file signature (magic bytes)
- Always use async processing pipelines — never process files in the upload request
- Set lifecycle policies from day one — retroactive cleanup is expensive

## References
  - references/cdn-origin.md — CDN and Origin Storage Reference
  - references/file-processing.md — File Processing Patterns Reference
  - references/file-storage-cost-optimization.md — File Storage Cost Optimization
  - references/file-storage-security.md — File Storage Security
  - references/storage-providers.md — Storage Providers
  - references/upload-patterns.md — Upload Patterns and CDN Delivery
## Handoff
`backend-caching` for CDN cache strategy and edge caching patterns
