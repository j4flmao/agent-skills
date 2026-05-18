# Function Optimization

## Cold Start Mitigation

### Strategy Comparison

| Strategy | Warmth | Cost | Complexity |
|----------|--------|------|------------|
| Provisioned Concurrency | Always warm | Medium | Low |
| SnapStart (Java) | Near-instant | Low | Low |
| Keep-warm (scheduled ping) | ~5 min interval | Very Low | Low |
| Lambda@Edge | Inherently warm | N/A | Medium |
| Reduce package size | N/A | Free | Medium |
| ARM64 architecture | Slightly faster | Cheaper | Free |

### Provisioned Concurrency
```yaml
functions:
  api:
    handler: src/api.handler
    provisionedConcurrency: 5
    reservedConcurrency: 50
    # Pools 5 pre-warmed execution environments
    # Scales based on concurrency
```

### SnapStart (Java)
```yaml
functions:
  javaFunction:
    runtime: java21
    handler: com.example.Handler::handleRequest
    snapStart:
      applyOn: PublishedVersions
    # Caches init phase in a snapshot
    # ~100ms cold starts instead of 2-10s
```

### Lambda@Edge (CloudFront)
```yaml
functions:
  edgeFunc:
    handler: src/edge.handler
    events:
      - cloudFront:
          eventType: viewer-request
    # Functions are pre-warmed at CloudFront edge locations
```

## Package Optimization

```yaml
# Minimize deployment size
package:
  patterns:
    - "!node_modules/aws-sdk/**"  # SDK is built-in
    - "!test/**"
    - "!*.ts"
    - "!*.map"
    - "!.git/**"
    - "!docs/**"

# Webpack / esbuild bundling (Serverless Framework)
plugins:
  - serverless-esbuild  # Also reduces cold start time
```

```bash
# Measure package size
du -sh .serverless/function.zip

# Tree-shake Node.js
npx esbuild src/handler.ts \
  --bundle --minify --sourcemap \
  --platform=node --target=node22 \
  --outfile=dist/handler.js
```

## Memory Sizing

```yaml
# Benchmark memory configurations
functions:
  processor:
    memorySize: 1769   # 1 vCPU, test baseline
    # Too low: CPU-bound functions are slow
    # Too high: waste money on idle memory

  # Start low, profile with CloudWatch Lambda Insights
  # Increase until cost-per-invoke is optimal
  # Console → CloudWatch → Lambda Insights → Memory utilization
```

## Connection Reuse

```typescript
// Reuse connections across invocations (global scope)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({});
// 👆 Created once per execution environment, reused

export const handler = async () => {
  // Use client here — it's already connected
  return { statusCode: 200 };
};
```

```typescript
// Database connection reuse
import { Pool } from "pg";
const pool = new Pool({ max: 5, idleTimeoutMillis: 30000 });
// 👆 Reused across warm invocations
```

## Async Init (Node.js)

```typescript
// ESM top-level await for initialization
const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

// Async init runs during init phase
const init = async () => {
  await client.config.credentials();
};

await init();

export const handler = async (event) => {
  // Handler runs after init completes
};
```

## Error Handling

```typescript
export const handler = async (event) => {
  try {
    const result = await process(event);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    console.error("Processing failed:", error);

    // SQS partial batch failure
    if (event.Records) {
      return {
        batchItemFailures: event.Records
          .filter((_, i) => failedIds.has(i))
          .map((record) => ({ itemIdentifier: record.messageId })),
      };
    }

    throw error; // Let AWS async retry
  }
};
```

## Best Practices Checklist

- [ ] Bundle with esbuild/webpack — tree-shake and minify
- [ ] Use ARM64 (Graviton) — 20% cheaper, faster cold starts
- [ ] Set memory to 1769 MB for 1 full vCPU if CPU-bound
- [ ] Reuse SDK clients and DB connections in global scope
- [ ] Prefer async init over handler-time initialization
- [ ] Use provisioned concurrency for latency-sensitive endpoints
- [ ] Configure reserved concurrency to protect downstream resources
- [ ] Enable Lambda Insights for memory profiling
- [ ] Set `prefer-destructured-role` in SAM for clean IAM
- [ ] Use `serverless-iam-roles-per-function` for granular IAM
