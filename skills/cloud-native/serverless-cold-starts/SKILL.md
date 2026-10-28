---
name: cloud-native-serverless-cold-starts
description: >
  Use this skill when the user says 'lambda cold start', 'cold start latency', 'provisioned concurrency', 'snapstart', 'optimize serverless startup', 'init duration', 'graalvm native lambda', 'azure functions cold start', 'cloud run cold start', 'min instances'. Diagnoses and reduces serverless cold-start latency and cost: measuring Init Duration, slimming init code, runtime/packaging choices, SnapStart, provisioned concurrency / minimum instances. Do NOT use for: Lambda concurrency and event-source design (cloud-native-aws-serverless), edge isolate runtimes (cloud-native-cloudflare-workers).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, serverless, lambda, cold-start, snapstart, provisioned-concurrency]
---

# Serverless Cold Starts

## Purpose
A cold start happens when a request needs a new execution environment. Its cost is environment creation + runtime start + your init code. Measure which part dominates, then apply the cheapest fix: smaller init, faster runtime packaging, snapshotting, or paying for pre-warmed capacity.

## Agent Protocol

### Trigger
"cold start", "init duration", "provisioned concurrency", "SnapStart", "optimize serverless startup", "GraalVM native", "min instances", "Azure Functions cold start", "Cloud Run cold start".

### Input Context
- Platform/runtime, package size, memory setting, VPC attachment.
- Latency SLO (p99) and traffic pattern (steady vs spiky vs idle for long periods).
- Current `Init Duration` distribution and cold-start rate.

### Output Artifact
Diagnosis + prioritized changes (code/IaC). No file unless requested.

### Response Format
```
Cold-start rate: {%} | p99 Init Duration: {ms}
Dominant cost: {runtime boot|dependency loading|network setup|package size}
Fixes (ordered by cost/impact): 1) ... 2) ...
Pre-warmed capacity: {none|SnapStart|provisioned N|min instances N} (cost note)
```

### Completion Criteria
- [ ] Measured before and after (Init Duration from REPORT logs / X-Ray / OTel).
- [ ] Code-level fixes attempted before paying for provisioned capacity.

## Anatomy (AWS Lambda)
1. **Environment creation** — Firecracker microVM, code download (ZIP from S3 or container image chunks lazily loaded and cached).
2. **Runtime init** — start Node.js/Python/JVM/.NET; extensions start.
3. **Function init** — module-level code: imports, SDK clients, config fetch, DB connections.
4. **Invoke** — handler.
CloudWatch `REPORT` lines show `Init Duration` only on cold starts. Since 1 August 2025, INIT is billed for all on-demand configurations (previously free for ZIP managed runtimes), so slow init now costs money too.

Find cold starts with Logs Insights:
```
filter @type = "REPORT"
| stats count(*) as invocations, count(@initDuration) as coldStarts,
        pct(@initDuration, 99) as p99Init, avg(@initDuration) as avgInit by bin(1h)
```

## Fixes in Order of Cost

### 1. Shrink init work (free)
- Import only what you use (AWS SDK v3 per-client packages in Node.js: `@aws-sdk/client-dynamodb`, not the whole SDK).
- Bundle and tree-shake (esbuild) for Node.js; exclude dev dependencies.
- Lazy-load rarely used heavy modules inside the code path that needs them.
- Create SDK clients/connection pools at module scope so warm invocations reuse them; don't open DB connections you might not need.
- Fetch config/secrets once and cache with TTL (Parameters and Secrets Lambda Extension or Powertools parameters).

```javascript
// Node.js 22, ESM
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({})); // init once

export const handler = async (event) => {
  if (event.rawPath === "/report") {
    const { renderPdf } = await import("./pdf.js");   // heavy, rarely used: lazy
    return renderPdf(event);
  }
  const { Item } = await ddb.send(new GetCommand({ TableName: process.env.TABLE, Key: { pk: event.pathParameters.id } }));
  return { statusCode: Item ? 200 : 404, body: JSON.stringify(Item ?? {}) };
};
```

### 2. Right-size memory and architecture
CPU scales with memory; init-heavy functions often get faster *and* cheaper at higher memory. Test with AWS Lambda Power Tuning. arm64 (Graviton) is usually cheaper per GB-second.

### 3. Runtime and packaging
| Runtime | Typical cold start profile | Lever |
|---|---|---|
| Go/Rust (`provided.al2023`) | Lowest | Already compiled |
| Node.js / Python | Low–medium, grows with dependencies | Bundle, trim imports |
| Java | Highest without help (class loading, JIT) | **SnapStart**, tiered compilation (`-XX:TieredStopAtLevel=1`), or GraalVM native image |
| .NET | Medium–high | Native AOT, SnapStart (supported for .NET 8+) |

### 4. Snapshotting — Lambda SnapStart
Lambda initializes once when you publish a version, snapshots the microVM memory/disk (Firecracker snapshot), and restores from the cache on cold start. Supported for Java 11+, Python 3.12+, and .NET 8+ managed runtimes.
- Works on published versions/aliases only; not with provisioned concurrency, EFS, or ephemeral storage > 512 MB.
- **Uniqueness:** anything generated during init (random seeds, UUIDs, unique IDs, credentials with expiry) is shared across restored environments — regenerate in a runtime hook (`afterRestore` via CRaC `Resource` in Java, `@register_after_restore` in Python).
- Re-establish network connections after restore.

### 5. Pay for warm capacity
| Platform | Feature | Note |
|---|---|---|
| AWS Lambda | Provisioned concurrency (per alias/version), scheduled or target-tracking via Application Auto Scaling | Billed hourly while configured; spillover beyond it cold-starts |
| Azure Functions | Flex Consumption always-ready instances; Premium pre-warmed instances | |
| Google Cloud Run | `--min-instances`, startup CPU boost | Billed for idle min instances |

```hcl
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version   # requires publish = true
}

resource "aws_lambda_provisioned_concurrency_config" "live" {
  function_name                     = aws_lambda_function.api.function_name
  qualifier                         = aws_lambda_alias.live.name
  provisioned_concurrent_executions = 20
}
```

## VPC and Networking
Since 2019 Lambda VPC networking uses shared Hyperplane ENIs created when the function is configured, not per cold start, so VPC no longer adds the multi-second cold-start penalty. Remaining concerns: subnet IP capacity for Hyperplane ENIs, NAT gateway for internet egress, and DNS/TLS setup time to dependencies (reuse connections, enable keep-alive — default in AWS SDK v3 for Node.js).

## Anti-Patterns
- "Warmer" pings every few minutes: keeps one environment warm, does nothing for concurrent bursts; use provisioned concurrency if you need guarantees.
- Fat deployment packages with test data or unused binaries.
- Fetching secrets from Secrets Manager on every invoke.
- Choosing Java + Spring without SnapStart/AOT for a latency-critical sync API.

## Checklist
- [ ] Baseline cold-start rate and p99 Init Duration recorded.
- [ ] Imports trimmed, bundling enabled, clients at module scope.
- [ ] Memory tuned with Power Tuning.
- [ ] SnapStart evaluated for Java/Python/.NET (uniqueness hooks added).
- [ ] Provisioned concurrency only where SLO requires it, with auto scaling schedule.

## References
- `references/firecracker-microvm.md`
- `references/provisioned-concurrency.md`
- `references/runtime-optimizations.md`
