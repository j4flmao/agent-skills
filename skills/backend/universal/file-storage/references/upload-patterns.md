# Upload Patterns and CDN Delivery

## Upload Flow Architecture

```
Client                    App Server                    S3                     Worker
  │                          │                          │                       │
  │  1. Request upload URL   │                          │                       │
  │─────────────────────────►│                          │                       │
  │                          │  2. Validate & authorize  │                       │
  │                          │     (type, size, user)   │                       │
  │                          │  3. Generate presigned   │                       │
  │                          │     PUT URL (15min TTL)  │                       │
  │◄─────────────────────────│                          │                       │
  │  4. Upload direct to S3  │                          │                       │
  │────────────────────────────────────────────────────►│                       │
  │                          │                          │  5. S3 PUT event      │
  │                          │                          │     (SQS notification)│
  │                          │                          ├──────────────────────►│
  │                          │                          │                       │  6. Process file
  │                          │                          │                       │     (virus scan,
  │                          │                          │                       │      thumbnail, convert)
  │                          │                          │  7. Write processed   │
  │                          │                          │◄──────────────────────│
  │                          │  8. Confirm metadata     │                       │
  │                          │◄─────────────────────────│                       │
  │◄─────────────────────────│                          │                       │
```

## Direct Upload vs Multipart vs Streaming

| Pattern | Max File Size | Use Case | Complexity |
|---------|--------------|----------|------------|
| Direct PUT | <100MB | Images, PDFs, small docs | Low |
| Multipart upload | <5TB | Videos, large datasets | Medium |
| Presigned POST | <5GB | Browser uploads with fields | Medium |
| Streaming PUT | Unlimited | Real-time media ingestion | High |
| S3 Transfer Acceleration | <5TB | Global uploaders, high latency | Low (additional cost) |

## File Validation Rules

```typescript
interface FileValidationConfig {
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  minSizeBytes: number;
  maxDimensions?: { width: number; height: number }; // images
  virusScan: boolean;
  contentModeration: boolean;
}

const FILE_VALIDATION: Record<string, FileValidationConfig> = {
  avatar: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    minSizeBytes: 1024, // 1KB
    maxDimensions: { width: 2048, height: 2048 },
    virusScan: true,
    contentModeration: true,
  },
  document: {
    allowedMimeTypes: ['application/pdf', 'application/msword', 'text/plain'],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    minSizeBytes: 100,
    virusScan: true,
    contentModeration: false,
  },
  video: {
    allowedMimeTypes: ['video/mp4', 'video/quicktime'],
    maxSizeBytes: 2 * 1024 * 1024 * 1024, // 2GB
    minSizeBytes: 1024,
    virusScan: true,
    contentModeration: true,
  },
};
```

## Image Processing Pipeline

```typescript
// S3 event → Lambda → processed output
import { S3Event, S3Handler } from 'aws-lambda';
import sharp from 'sharp';

export const handler: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    const bucket = record.s3.bucket.name;

    // Skip if already processed
    if (key.includes('/processed/') || key.includes('/thumbnail/')) continue;

    const input = await s3.getObject({ Bucket: bucket, Key: key }).then(r => r.Body!.transformToByteArray());

    // Generate thumbnails
    const sizes = [
      { suffix: 'thumbnail_150', width: 150, height: 150 },
      { suffix: 'thumbnail_300', width: 300, height: 300 },
      { suffix: 'preview_1024', width: 1024, height: 1024 },
    ];

    for (const size of sizes) {
      const outputKey = key.replace('/uploads/', `/processed/`).replace(/\.[^.]+$/, `_${size.suffix}.webp`);
      const buffer = await sharp(input)
        .resize(size.width, size.height, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toBuffer();

      await s3.putObject({
        Bucket: bucket.replace('uploads', 'processed'),
        Key: outputKey,
        Body: buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      });
    }
  }
};
```

## CDN Cache Strategy

```yaml
cdn:
  origin: s3://prod-processed
  distribution:
    behaviors:
      - path: "/assets/*"
        ttl: 31536000  # 1 year — versioned assets
        compression: true
        viewer_protocol: redirect-to-https
        allowed_methods: [GET, HEAD]
      - path: "/content/*"
        ttl: 300  # 5 minutes — user content
        compression: true
        viewer_protocol: redirect-to-https
      - path: "/api/*"
        ttl: 0  # dynamic — not cached at edge
        viewer_protocol: redirect-to-https
    price_class: PriceClass_100  # US + Europe
    ssl: custom_certificate
    waf:
      rate_limiting: true
      geo_restriction: allowlist
    origin_shield: enabled
    real_time_logs: s3://cdn-logs/athena/
```

## Signed URL and Cookie Access Control

```typescript
// CloudFront signed URL for private content
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

function getPrivateFileUrl(distributionDomain: string, key: string): string {
  const url = `https://${distributionDomain}/${key}`;
  const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  return getSignedUrl({
    url,
    keyPairId: 'K12345EXAMPLE',
    privateKey: process.env.CLOUDFRONT_PRIVATE_KEY!,
    dateLessThan: new Date(expires * 1000).toISOString(),
  });
}

// CloudFront signed cookies for multiple files
function getSignedCookies(distributionDomain: string, resourcePath: string, expiresInSeconds: number) {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const policy = JSON.stringify({
    Statement: [{
      Resource: `https://${distributionDomain}/${resourcePath}*`,
      Condition: { DateLessThan: { 'AWS:EpochTime': expires } },
    }],
  });

  return getSignedCookies({
    keyPairId: 'K12345EXAMPLE',
    privateKey: process.env.CLOUDFRONT_PRIVATE_KEY!,
    policy: Buffer.from(policy).toString('base64'),
  });
}
```

## File Processing Pipeline Configuration

```yaml
processing:
  virus_scan:
    engine: ClamAV
    mode: streaming  # scan as file is uploaded
    quarantine_bucket: "${env}-quarantine"
    alert_on: ["Trojan", "Worm", "Ransomware"]
  image_optimization:
    formats:
      - webp: { quality: 85, lossless: false }
      - avif: { quality: 70, lossless: false }
    thumbnails:
      - [150, 150]  # small thumbnail
      - [300, 300]  # medium thumbnail
      - [1024, 1024]  # preview
  video_processing:
    codec: h264
    resolutions: [[720, 480], [1280, 720], [1920, 1080]]
    format: hls  # HTTP Live Streaming for adaptive bitrate
  content_moderation:
    nsfw_detection: true
    ocr_extraction: false
    face_detection: true
```

## CDN Cache Invalidation

```typescript
// Avoid invalidation — use version hash in filename
function generateVersionedFilename(original: string): string {
  const hash = crypto.createHash('md5').update(original + Date.now()).digest('hex').slice(0, 8);
  const ext = path.extname(original);
  const base = path.basename(original, ext);
  return `${base}.${hash}${ext}`;
}

// When invalidation is unavoidable
async function invalidateCDNPaths(paths: string[]): Promise<void> {
  const cloudfront = new CloudFrontClient({ region: 'us-east-1' });
  // Max 1000 paths per invalidation request
  for (let i = 0; i < paths.length; i += 1000) {
    await cloudfront.send(new CreateInvalidationCommand({
      DistributionId: process.env.CLOUDFRONT_DIST_ID!,
      InvalidationBatch: {
        Paths: { Quantity: Math.min(1000, paths.length - i), Items: paths.slice(i, i + 1000) },
        CallerReference: `inval-${Date.now()}-${i}`,
      },
    }));
  }
}
```

## Common Pitfalls

- **Serving files through application server**: Streaming files through your app server instead of direct S3/CloudFront URLs wastes bandwidth and increases latency. Always serve directly from storage/CDN.
- **Oversized presigned URL TTL**: Hours-long or days-long presigned URLs are a security risk. Use 5-15 minutes for uploads, 1 hour max for viewing.
- **No virus scanning**: Malicious file uploads can compromise users. Always scan uploaded files (ClamAV is free, commercial scanners offer faster detection).
- **Cache invalidation overuse**: Calling cache invalidation for every deployment is expensive and slow. Use version hashes in filenames for cache busting.
- **Mixed content (HTTP/HTTPS)**: CDN must redirect HTTP to HTTPS. Use `viewer_protocol: redirect-to-https` on all CloudFront behaviors.
- **Single-region origin with global CDN**: Origin in us-east-1 serving global traffic adds latency. Use origin shield (CloudFront) or multi-region origins for global performance.
