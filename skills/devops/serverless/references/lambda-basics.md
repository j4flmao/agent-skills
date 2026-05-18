# Lambda Basics

## Function Configuration

```yaml
# Core properties
functions:
  myFunction:
    handler: index.handler
    runtime: nodejs22.x
    architecture: arm64
    memorySize: 512
    timeout: 30
    ephemeralStorageSize: 512
    reservedConcurrency: 10
    provisionedConcurrency: 2
    tracing: Active
    snapStart:
      applyOn: PublishedVersions
    role: !GetAtt MyFunctionRole.Arn
    layers:
      - !Ref CommonLayer
    vpc:
      subnetIds:
        - subnet-abc
        - subnet-def
      securityGroupIds:
        - sg-123
```

## Runtimes

| Runtime | Identifier | Best for |
|---------|-----------|----------|
| Node.js 22 | `nodejs22.x` | Full-stack, TypeScript |
| Node.js 20 | `nodejs20.x` | LTS stability |
| Python 3.12 | `python3.12` | Data processing, ML |
| Python 3.13 | `python3.13` | Latest features |
| Java 21 | `java21` | Enterprise, SnapStart |
| Go 1.x | `provided.al2023` | Performance, compiled |
| .NET 8 | `dotnet8` | .NET ecosystem |
| Ruby 3.3 | `ruby3.3` | Ruby apps |
| Rust | `provided.al2023` | Maximum performance |
| Custom | `provided.al2023` | Container images |

## Memory and CPU

```yaml
# Memory range: 128 MB - 10240 MB
# CPU scales proportionally with memory
# 1792 MB = 1 full vCPU
# Above 1792 MB = multi-threaded CPU

memorySize: 1769  # Sweet spot: 1 vCPU, cost-effective
memorySize: 3008  # 2 vCPUs, for parallel workloads
```

## Invocation Modes

| Mode | Trigger | Retry | Concurrency |
|------|---------|-------|-------------|
| Synchronous | API Gateway, ALB, SDK invoke | Client retry | Per request |
| Asynchronous | S3, SNS, EventBridge | 3 retries | Queue-based |
| Poll-based | SQS, DynamoDB Streams, Kinesis | Per event age | Per shard |
| Event source mapping | SQS, streams | Up to maxRetryAttempts | Batch-based |

## Execution Environment

```bash
# Environment
/var/task          # Function code
/tmp               # 512 MB - 10240 MB ephemeral storage
$LAMBDA_TASK_ROOT  # /var/task
$LAMBDA_RUNTIME_DIR  # Runtime binaries
$AWS_EXECUTION_ENV  # AWS_Lambda_nodejs22.x
$_X_AMZN_TRACE_ID   # X-Ray trace ID

# /tmp is reused across invocations in the same execution context
# Always clean up temp files or use /tmp as a write cache
```

## Lifecycle

```
Cold Start (new execution environment)
  → Init: Download code, start runtime, run static init (init phase)
  → Invoke: Run handler (invoke phase)

Warm Start (reused execution environment)
  → Invoke: Run handler (init is skipped)
  → Execution context stays alive ~5-15 minutes after last invoke
```

## IAM Execution Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

## Limitations

| Resource | Limit |
|----------|-------|
| Ephemeral storage | 512 MB - 10,240 MB |
| Deployment package | 250 MB (unzipped) |
| /tmp directory | 512 MB - 10,240 MB |
| Function timeout | 15 min (900s) |
| Concurrent executions | 1000 (soft, adjustable) |
| Environment variables | 4 KB total |
| Payload size (sync) | 6 MB (request), 6 MB (response) |
| Payload size (async) | 256 KB |
| Burst concurrency | 500-3000 (per region) |
