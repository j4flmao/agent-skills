# Object Storage Patterns

## Key Naming Convention
```
{env}/{tenant}/{type}/{uuid}/{filename}
prod/acme-corp/avatars/a1b2c3d4/portrait.jpg
staging/tenant-xyz/documents/12345678/report.pdf
```

## Bucket Architecture
- `{env}-uploads` — temporary bucket for initial uploads, triggers processing
- `{env}-processed` — final storage after processing, CDN origin
- `{env}-quarantine` — failed virus scan or content moderation
- `{env}-backups` — database and configuration backups

## Lifecycle Policies
- Uploads bucket: transition to IA after 1 day, delete after 7 days
- Processed bucket: transition to Glacier after 90 days, delete after 365 days
- Backups bucket: transition to Glacier after 30 days, delete after 1 year

## Presigned URL Generation
```typescript
// Upload URL — 15 min expiry
const uploadUrl = s3.getSignedUrl('putObject', {
  Bucket: 'prod-uploads',
  Key: `prod/acme/avatars/${uuid}/photo.jpg`,
  Expires: 900,
  ContentType: 'image/jpeg',
});

// Download URL — 1 hour expiry
const downloadUrl = s3.getSignedUrl('getObject', {
  Bucket: 'prod-processed',
  Key: key,
  Expires: 3600,
});
```

## Security
- Block public access at account and bucket level
- SSE-S3 for default encryption
- SSE-KMS with customer-managed key for compliance
- IAM conditions: source IP, VPC endpoint, MFA
- Object lock: governance/legal hold for compliance
