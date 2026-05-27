# File Storage Security

## Overview
Harden file storage security: access control, encryption at rest and in transit, presigned URL security, malware detection, data isolation, and compliance.

## Access Control

```typescript
import { S3Client, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

class StorageAccessControl {
  async configureBucketPolicy(bucket: string, allowedRoles: string[]): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:*',
          Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
          Condition: {
            Bool: { 'aws:SecureTransport': 'false' },
          },
        },
        // Enforce encryption
        {
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:PutObject',
          Resource: `arn:aws:s3:::${bucket}/*`,
          Condition: {
            StringNotEquals: {
              's3:x-amz-server-side-encryption': 'AES256',
            },
          },
        },
      ],
    };

    await s3.send(new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    }));
  }

  async configureIAMRolePermissions(roleArn: string, bucket: string, prefix: string): Promise<void> {
    // Grant least-privilege access
    return {
      Effect: 'Allow',
      Action: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
      ],
      Resource: `arn:aws:s3:::${bucket}/${prefix}/*`,
      Condition: {
        StringEquals: {
          's3:x-amz-server-side-encryption': 'AES256',
        },
      },
    };
  }
}
```

## Encryption Configuration

```typescript
class FileEncryption {
  // Server-side encryption with S3-managed keys (SSE-S3)
  async uploadWithSSES3(bucket: string, key: string, body: Buffer): Promise<void> {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ServerSideEncryption: 'AES256',
    }));
  }

  // Server-side encryption with KMS (SSE-KMS) for compliance
  async uploadWithSSEKMS(bucket: string, key: string, body: Buffer, kmsKeyId: string): Promise<void> {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: kmsKeyId,
    }));
  }

  // Client-side encryption for sensitive content
  async uploadWithClientEncryption(bucket: string, key: string, body: Buffer, encryptionKey: Buffer): Promise<void> {
    const encrypted = await this.clientEncrypt(body, encryptionKey);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: encrypted,
    }));
  }
}
```

## Presigned URL Security

```typescript
class SecurePresignedUrl {
  private readonly MAX_UPLOAD_TTL = 900; // 15 minutes
  private readonly MAX_DOWNLOAD_TTL = 3600; // 1 hour
  private readonly MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

  async generateUploadUrl(
    userId: string,
    fileType: string,
    fileSize: number
  ): Promise<PresignedUrlResult> {
    // Validate file type and size
    if (!this.isAllowedType(fileType)) {
      throw new Error('File type not allowed');
    }
    if (fileSize > this.MAX_SIZE_BYTES) {
      throw new Error('File size exceeds limit');
    }

    // Rate limit per user
    await this.rateLimiter.check(`upload:${userId}`, 10, 3600); // 10 uploads/hour

    const key = this.generateKey(userId, fileType);
    const command = new PutObjectCommand({
      Bucket: process.env.UPLOAD_BUCKET!,
      Key: key,
      ContentType: fileType,
    });

    // Sign with strict TTL
    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: this.MAX_UPLOAD_TTL,
      signableHeaders: new Set(['content-type', 'content-length']),
    });

    // Log the URL generation
    await this.auditLog.log({
      action: 'PRESIGNED_URL_GENERATED',
      userId,
      key,
      ttl: this.MAX_UPLOAD_TTL,
      timestamp: new Date(),
    });

    return { uploadUrl, key };
  }
}
```

## Malware Detection

```typescript
class MalwareDetectionService {
  async scanFile(bucket: string, key: string): Promise<ScanResult> {
    const file = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    // Stream to ClamAV (or cloud-native scanning)
    const scanResult = await clamav.scanStream(file.Body as Readable);

    if (scanResult.infected) {
      // Move to quarantine
      await s3.send(new CopyObjectCommand({
        Bucket: process.env.QUARANTINE_BUCKET!,
        CopySource: `${bucket}/${key}`,
        Key: key,
        Metadata: {
          'scan-result': 'infected',
          'scan-timestamp': new Date().toISOString(),
          'original-bucket': bucket,
          'virus-name': scanResult.virusName,
        },
      }));

      // Delete from original bucket
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

      await AlertService.alert({
        severity: 'CRITICAL',
        title: 'Malware detected in file upload',
        message: `File ${key} infected with ${scanResult.virusName}`,
      });

      return { infected: true, virusName: scanResult.virusName };
    }

    // Tag as clean
    await s3.send(new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: key,
      Tagging: { TagSet: [{ Key: 'scan-result', Value: 'clean' }] },
    }));

    return { infected: false };
  }
}
```

## Data Isolation (Multi-Tenant)

```typescript
class TenantDataIsolation {
  async enforceTenantIsolation(tenantId: string): Promise<void> {
    // Option 1: Separate bucket per tenant
    const tenantBucket = `${process.env.ENV}-storage-${tenantId}`;

    // Option 2: Prefix-based isolation within shared bucket
    const tenantPrefix = `tenant/${tenantId}/`;

    // IAM policy enforcing prefix isolation
    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject'],
        Resource: [
          `arn:aws:s3:::${process.env.SHARED_BUCKET}/${tenantPrefix}*`,
        ],
        Condition: {
          StringEquals: {
            's3:x-amz-server-side-encryption': 'AES256',
          },
        },
      }],
    };
  }

  async verifyIsolation(userId: string, tenantId: string, requestedKey: string): Promise<boolean> {
    const userTenant = await this.getUserTenant(userId);
    if (userTenant !== tenantId) return false;

    const expectedPrefix = `tenant/${tenantId}/`;
    return requestedKey.startsWith(expectedPrefix);
  }
}
```

## Compliance Validations

```typescript
class StorageComplianceValidator {
  async validatePCICompliance(bucket: string): Promise<ComplianceResult> {
    const issues: ComplianceIssue[] = [];

    // Check encryption
    const encryption = await this.getBucketEncryption(bucket);
    if (!encryption || encryption === 'none') {
      issues.push({
        framework: 'PCI DSS',
        requirement: '3.4',
        message: 'Bucket must have encryption enabled',
        severity: 'CRITICAL',
      });
    }

    // Check public access
    const publicAccess = await this.getPublicAccessBlock(bucket);
    if (!publicAccess?.blockPublicAcls || !publicAccess?.blockPublicPolicy) {
      issues.push({
        framework: 'PCI DSS',
        requirement: '7.1',
        message: 'Public access must be blocked',
        severity: 'CRITICAL',
      });
    }

    // Check access logging
    const logging = await this.getBucketLogging(bucket);
    if (!logging) {
      issues.push({
        framework: 'PCI DSS',
        requirement: '10.1',
        message: 'Access logging must be enabled',
        severity: 'HIGH',
      });
    }

    return { compliant: issues.length === 0, issues, bucket };
  }
}
```

## Key Points
- Block public access at account and bucket level by default
- Enforce encryption in transit (HTTPS) and at rest (SSE-S3/KMS)
- Use short TTL presigned URLs: 15min upload, 1hr download
- Scan all uploads for malware before processing
- Implement tenant-level data isolation (separate bucket or prefix)
- Validate compliance with PCI DSS, HIPAA, and SOC2
- Audit all presigned URL generation with user and resource details
- Rate limit uploads per user to prevent abuse
