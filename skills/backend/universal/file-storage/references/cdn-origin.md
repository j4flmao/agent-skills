# CDN and Origin Storage Reference

## CDN Architecture Overview

A CDN (Content Delivery Network) caches content at edge locations close to users, reducing latency and origin load.

```yaml
request_flow:
  - user: Requests https://cdn.example.com/images/abc.webp
  - edge: CDN checks edge cache
  - hit: Returns cached response (fastest path)
  - miss: CDN fetches from origin (S3, custom server)
  - origin: Returns content, CDN caches and serves
  - response: User receives content from edge
```

## CloudFront + S3

### Origin Access Control (OAC)
```yaml
cloudfront_distribution:
  origins:
    - domain: prod-processed.s3.amazonaws.com
      oac: true  # Replaces legacy OAI
      s3_access: true
  behaviors:
    - path: "/assets/*"
      ttl: 31536000
      compress: true
      viewer_protocol: redirect-to-https
      allowed_methods: [GET, HEAD]
    - path: "/private/*"
      ttl: 0
      trusted_signers: true  # Signed URLs
```

### Signed URLs and Cookies
```typescript
import { getSignUrl } from '@aws-sdk/cloudfront-signer';

// Signed URL (per-file access)
const signedUrl = getSignUrl({
  url: 'https://cdn.example.com/private/document.pdf',
  keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
  privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
  dateLessThan: new Date(Date.now() + 3600 * 1000).toISOString(),  // 1 hour
});

// Signed cookies (bulk access to a path)
const policy = JSON.stringify({
  Statement: [{
    Resource: 'https://cdn.example.com/private/*',
    Condition: { DateLessThan: { 'AWS:EpochTime': Math.floor(Date.now() / 1000) + 3600 } }
  }]
});
```

## Cloudflare R2

```yaml
cloudflare_r2:
  features:
    - s3_compatible_api: true
    - zero_egress_fees: true
    - global_network: Cloudflare edge
  public_bucket:
    - custom_domain: true
    - cache_ttl: browser_default
    - cors: restricted origins
  signed_urls:
    - duration: 15min upload, 1hr download

// R2 public URL via custom domain
const publicUrl = `https://assets.example.com/${bucketName}/${key}`;

// R2 signed URL (S3-compatible)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey }
});
```

## Fastly

```yaml
fastly:
  features:
    - vcl_customization: true
    - instant_purge: true      # Sub-second invalidation
    - shield_nodes: true       # Origin shield
    - wasm_edge_compute: true
  configuration:
    shielding: "us-east-1"     # Shield location
    caching:
      ttl: 3600                # Default TTL
      stale_while_revalidate: 86400
      stale_if_error: 604800
```

## Cache Invalidation

### Strategies (best to worst)

| Strategy | Mechanism | Efficiency | Recommended |
|----------|-----------|------------|-------------|
| Version hash | `style.a1b2c3.css` | Perfect | Always preferred |
| Path prefix | `/v2/assets/...` | Good | Second best |
| Purge by tag | Cache tag headers | Good | CDN-dependent |
| Purge by path | `/assets/*` | Moderate | Emergency use |
| Purge all | `/*` | Worst | Only in emergencies |

```typescript
// Version hash in filename
const hash = crypto.createHash('md5').update(fileContent).digest('hex').slice(0, 8);
const versionedFilename = `styles.${hash}.css`;
// Cache-Control: public, max-age=31536000, immutable

// Invalidation (CloudFront)
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

async function invalidatePaths(paths: string[]) {
  const client = new CloudFrontClient({ region: 'us-east-1' });
  await client.send(new CreateInvalidationCommand({
    DistributionId: process.env.CLOUDFRONT_DIST_ID,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: { Quantity: paths.length, Items: paths }
    }
  }));
}
```

## Origin Shield

Origin shield adds an intermediate cache layer before the origin server.

```yaml
origin_shield:
  purpose: "Reduces origin load by consolidating cache misses"
  placement: "Regional (one shield per region)"
  benefits:
    - ~99% cache hit ratio improvement for regional traffic
    - Lower origin load (1 request to origin per region, not per edge)
    - Protection against traffic spikes
  configuration:
    enabled: true
    region: "us-east-1"
    ttl_multiplier: 1.5  # Longer TTL at shield
```

## Multi-Region Replication

```yaml
storage_replication:
  s3_crr:
    source: "us-east-1"
    destinations: ["eu-west-1", "ap-southeast-1", "sa-east-1"]
    replication_rules:
      - prefix: "processed/"
        storage_class: STANDARD
        delete_marker: false  # Don't propagate deletes
    metrics:
      replication_lag: "< 15 minutes typical"
  
  cdn_multi_origin:
    - region: "us-east-1"
      domain: "origin-us.example.com"
    - region: "eu-west-1"
      domain: "origin-eu.example.com"
    failover: true
    geolocation_routing: true
```
