# File Storage Cost Optimization

## Overview
Optimize file storage costs: storage tier selection, lifecycle policies, intelligent tiering, compression, deduplication, CDN cost management, and monitoring.

## Storage Tiers

```typescript
enum StorageTier {
  STANDARD = 'STANDARD',           // Frequently accessed
  STANDARD_IA = 'STANDARD_IA',     // Infrequent access, 30+ days
  ONEZONE_IA = 'ONEZONE_IA',      // Re-creatable, infrequent
  GLACIER = 'GLACIER',             // Archive, 90+ days
  GLACIER_DEEP = 'GLACIER_DEEP',   // Long-term archive, 180+ days
  INTELLIGENT = 'INTELLIGENT',     // Auto-tiering
}

interface TierCost {
  storagePerGB: number;  // $/GB/month
  retrievalPerGB: number; // $/GB
  retrievalTime: string;
  minStorageDays: number;
}

const TIER_COSTS: Record<StorageTier, TierCost> = {
  STANDARD: { storagePerGB: 0.023, retrievalPerGB: 0, retrievalTime: 'instant', minStorageDays: 0 },
  STANDARD_IA: { storagePerGB: 0.0125, retrievalPerGB: 0.01, retrievalTime: 'instant', minStorageDays: 30 },
  ONEZONE_IA: { storagePerGB: 0.01, retrievalPerGB: 0.01, retrievalTime: 'instant', minStorageDays: 30 },
  GLACIER: { storagePerGB: 0.0036, retrievalPerGB: 0.01, retrievalTime: '1-5 min', minStorageDays: 90 },
  GLACIER_DEEP: { storagePerGB: 0.00099, retrievalPerGB: 0.02, retrievalTime: '12 hours', minStorageDays: 180 },
  INTELLIGENT: { storagePerGB: 0.023, retrievalPerGB: 0, retrievalTime: 'auto', minStorageDays: 0 },
};
```

## Lifecycle Policies

```typescript
class LifecyclePolicyManager {
  async configureLifecycle(bucket: string): Promise<void> {
    await s3.send(new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            Id: 'uploads-cleanup',
            Status: 'Enabled',
            Prefix: 'uploads/',
            Expiration: { Days: 7 },
            AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
          },
          {
            Id: 'standard-to-ia',
            Status: 'Enabled',
            Transitions: [
              {
                Days: 30,
                StorageClass: 'STANDARD_IA',
              },
              {
                Days: 90,
                StorageClass: 'GLACIER',
              },
              {
                Days: 365,
                StorageClass: 'DEEP_ARCHIVE',
              },
            ],
            Expiration: { Days: 730 },
          },
          {
            Id: 'thumbnails-short-temp',
            Status: 'Enabled',
            Prefix: 'processed/thumbnails/',
            Expiration: { Days: 90 },
          },
        ],
      },
    }));
  }
}
```

## Intelligent Tiering

```typescript
class CostAnalyzer {
  async analyzeTierEfficiency(bucket: string): Promise<TierAnalysis> {
    const objects = await this.listAllObjects(bucket);
    const accessLogs = await this.getAccessLogs(bucket, 30); // 30 days

    const misconfigured: MisconfiguredObject[] = [];

    for (const obj of objects) {
      const accessCount = accessLogs.filter(l => l.key === obj.key).length;
      const ageDays = (Date.now() - obj.lastModified.getTime()) / 86400000;

      const recommendedTier = this.recommendTier(accessCount, ageDays, obj.size);
      if (recommendedTier !== this.tierFromStorageClass(obj.storageClass)) {
        const savings = this.calculateSavings(obj.size, obj.storageClass, recommendedTier);
        misconfigured.push({
          key: obj.key,
          currentTier: obj.storageClass,
          recommendedTier,
          accessCount,
          ageDays,
          sizeBytes: obj.size,
          potentialSavingsMonthly: savings,
        });
      }
    }

    return {
      totalObjects: objects.length,
      totalStorageGB: objects.reduce((s, o) => s + o.size, 0) / 1073741824,
      estimatedMonthlyCost: this.calculateTotalCost(objects),
      potentialSavings: misconfigured.reduce((s, m) => s + m.potentialSavingsMonthly, 0),
      misconfigured,
    };
  }

  private recommendTier(accessCount: number, ageDays: number, sizeBytes: number): string {
    if (ageDays > 365) return 'DEEP_ARCHIVE';
    if (ageDays > 90) return 'GLACIER';
    if (accessCount === 0 && ageDays > 30) return 'STANDARD_IA';
    return 'STANDARD';
  }
}
```

## Compression

```typescript
class CompressionOptimizer {
  // Compress before upload
  async compressAndUpload(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    const compressed = await this.compress(body, contentType);
    const originalSize = body.length;
    const compressedSize = compressed.length;

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: compressed,
      ContentType: contentType,
      ContentEncoding: 'gzip',
      Metadata: {
        'original-size': String(originalSize),
        'compression-ratio': ((compressedSize / originalSize) * 100).toFixed(1),
      },
    }));

    metrics.record('storage.compression.ratio', compressedSize / originalSize, {
      contentType,
    });
  }

  private async compress(body: Buffer, contentType: string): Promise<Buffer> {
    if (contentType.startsWith('image/')) {
      return this.optimizeImage(body, contentType);
    }
    if (contentType === 'application/json' || contentType.startsWith('text/')) {
      return gzipSync(body);
    }
    return body; // Already compressed formats (video, audio, etc.)
  }
}
```

## CDN Cost Management

```typescript
class CDNCostOptimizer {
  async analyzeCDNUsage(): Promise<CDNCostReport> {
    const distribution = await this.getDistributionMetrics();

    return {
      totalRequests: distribution.requestCount,
      totalDataTransferGB: distribution.dataTransferBytes / 1073741824,
      cacheHitRate: distribution.cacheHitRatio,
      estimatedCost: this.calculateCDNCost(distribution),
      optimizationSuggestions: this.generateSuggestions(distribution),
    };
  }

  private generateSuggestions(dist: DistributionMetrics): string[] {
    const suggestions: string[] = [];

    // Low cache hit rate
    if (dist.cacheHitRatio < 0.8) {
      suggestions.push(
        `Cache hit rate is ${(dist.cacheHitRatio * 100).toFixed(0)}%. Consider increasing TTL or adding version hashes to filenames for immutability.`
      );
    }

    // High data transfer
    if (dist.dataTransferBytes > 10737418240) { // 10GB
      suggestions.push('High data transfer detected. Consider image optimization (WebP/AVIF) and compression.');
    }

    // Cost class optimization
    if (dist.regionalDistribution > 0.5) {
      suggestions.push('High regional distribution cost. Consider using PriceClass_100 for non-critical content.');
    }

    return suggestions;
  }
}
```

## Cost Monitoring Dashboard

```typescript
const STORAGE_COST_DASHBOARD = {
  metrics: [
    {
      name: 'Total Monthly Storage Cost',
      metric: 'storage.cost.total',
      aggregation: 'sum',
      window: '30d',
    },
    {
      name: 'Storage by Tier',
      metric: 'storage.size.by_tier',
      aggregation: 'sum',
      groupBy: ['storageClass'],
      window: '1d',
    },
    {
      name: 'Data Transfer Cost',
      metric: 'storage.egress.bytes',
      aggregation: 'sum',
      window: '30d',
    },
    {
      name: 'Lifecycle Transition Savings',
      metric: 'storage.savings.lifecycle',
      aggregation: 'sum',
      window: '30d',
    },
    {
      name: 'Compression Ratio',
      metric: 'storage.compression.ratio',
      aggregation: 'avg',
      groupBy: ['contentType'],
      window: '7d',
    },
    {
      name: 'Unused Objects (>90 days, no access)',
      metric: 'storage.objects.stale',
      aggregation: 'count',
      window: '90d',
    },
  ],
  alerts: [
    {
      name: 'Cost anomaly',
      condition: 'monthly_cost > prev_month * 1.2',
      severity: 'WARNING',
    },
    {
      name: 'Stale objects accumulating',
      condition: 'stale_objects > 10000',
      severity: 'INFO',
    },
  ],
};
```

## Key Points
- Use lifecycle policies to transition objects: 30d → STANDARD_IA, 90d → GLACIER, 365d → DEEP_ARCHIVE
- Enable intelligent tiering for unpredictable access patterns
- Compress text/JSON before upload (gzip reduces size 5-10x)
- Optimize images (WebP/AVIF) to reduce both storage and CDN costs
- Monitor CDN cache hit rate (target >80%) and optimize TTLs
- Track potential savings from misconfigured storage tiers
- Alert on >20% monthly cost increase anomalies
- Delete or transition objects with no access in 90+ days
