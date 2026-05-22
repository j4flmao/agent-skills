---
name: backend-file-storage
description: >
  Use this skill when designing file upload, storage, CDN delivery, or file processing systems. This skill enforces: direct-to-storage uploads via presigned URLs, flat key design with no sensitive data, server-side validation, CDN caching with version hashes. Applies to S3, Azure Blob, GCS, or any S3-compatible storage. Do NOT use for: database blob storage, application server file handling, or ephemeral temporary files.
version: "1.0.0"
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

## Workflow

### Step 1: Storage Provider Selection
S3 for general object storage with lifecycle policies and cross-region replication. CloudFront for global CDN with edge caching. Signed URLs for private file access with time-limited expiry. Multi-part upload for files >100MB. Provider criteria: regional availability, compliance certifications, egress costs, integration with existing infrastructure.

### Step 2: Bucket and Key Design
Flat key structure: `{env}/{tenant}/{type}/{uuid}/{filename}` — e.g., `prod/acme-corp/avatars/a1b2c3d4/portrait.jpg`. No sensitive information in keys: no user IDs, email addresses, or PII. Folder prefix for logical partitioning and S3 cost optimization (list operations scoped to prefix). Use UUIDv7 for sortable, time-ordered identifiers.

### Step 3: Upload Flow
Client requests presigned URL from application server. Server validates: file type against allowlist, file size limit, user authorization. Server returns presigned PUT URL with 15-minute TTL. Client uploads directly to S3. Server receives S3 event notification (SQS/SNS) after upload. Server confirms metadata in database. Error flow: expired presigned URL returns 403, client retries with new request.

### Step 4: File Processing Pipeline
Trigger: S3 PUT event → SQS queue → worker/Lambda. Process: virus scan (ClamAV or commercial scanner), thumbnail generation (preset sizes: 150x150, 300x300, 1024x1024), format conversion (WebP for images, HLS for video), content moderation (NSFW detection, OCR). Processing result stored as metadata on the object. Failed processing moves to quarantine bucket.

### Step 5: Security
Bucket policies: deny public access by default (block public access setting), IAM roles for applications, cross-account access via bucket policies. Presigned URL expiry: 5 minutes for uploads, 1 hour for viewing, 24 hours for downloads. CORS: restrict to application domain origins. Encryption: SSE-S3 for standard, SSE-KMS for compliance. Object lock for write-once-read-many (WORM) compliance.

### Step 6: CDN and Caching
CloudFront distribution: S3 origin with OAI (Origin Access Identity), OAC (Origin Access Control) for S3. Cache strategy: versioned files (immutable) → long cache TTL (1 year), non-versioned files → short TTL (5 minutes). Cache invalidation: use version hash in filename instead of invalidation calls. Signed cookies for private content delivery with authorization at edge.

## Rules
- Never accept files on application server — direct-to-storage from client
- Every upload validated server-side (type, size, virus scan)
- Presigned URL TTL matches upload window (5-15 min)
- File keys are opaque — no user IDs or sensitive data in path
- CDN cache bust via version hash in filename
- Replication for production data across regions

## References
- `references/object-storage-patterns.md` — S3/Azure Blob/GCS patterns, security, presigned URLs
- `references/cdn-caching.md` — CloudFront/Akamai distributions, cache strategies, invalidation

## Handoff
`backend-caching` for CDN cache strategy and edge caching patterns
