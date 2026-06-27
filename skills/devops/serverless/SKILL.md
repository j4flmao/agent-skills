---
name: serverless
description: >
  Use this skill when the user says 'serverless', 'lambda', 'aws
  lambda', 'functions', 'function as a service', 'faas', 'azure
  functions', 'google cloud functions', 'knative', 'openfaas',
  'serverless framework', 'chalice', 'zappa', 'apigw', 'api
  gateway', 'event-driven', 'cold start', 'provisioned
  concurrency', 'reserved concurrency', 'lambda layers',
  'step functions', 'durable functions', 'serverless
  observability', 'serverless monitoring', 'serverless
  security', 'serverless cost', 'serverless best practices',
  'serverless framework deployment'.
  Covers: AWS Lambda, Azure Functions, Google Cloud Functions,
  serverless framework, event-driven patterns, cold start
  optimization, monitoring, security, and cost management.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, serverless, faas, lambda, event-driven, phase-5]
---

# Serverless

## Purpose
Design, deploy, and operate serverless functions (AWS Lambda, Azure Functions, GCP Cloud Functions) with event-driven patterns, cold start optimization, monitoring, security, and cost management.

## Agent Protocol

### Trigger
Exact user phrases: "serverless", "lambda", "azure functions", "cloud functions", "functions", "faas", "step functions", "serverless framework", "cold start", "provisioned concurrency", "reserved concurrency".

### Input Context
- Cloud provider (AWS, Azure, GCP).
- Runtime (Node.js, Python, Go, Java, .NET, Rust).
- Event sources (API Gateway, SQS, S3, EventBridge, Kafka, Timer).
- Deployment framework (Serverless Framework, SAM, CDK, Pulumi, Terraform).
- Existing observability and security tools.

### Output Artifact
Serverless function configuration with event source mapping, IAM, monitoring, and deployment config.

### Response Format
YAML/JSON configuration (serverless.yml, SAM template) or Terraform HCL. No preamble.

### Completion Criteria
- [ ] Function code with handler, event source, IAM permissions.
- [ ] Cold start strategy (provisioned concurrency, SnapStart, warmers).
- [ ] Monitoring: error rate, latency, invocation count, throttles.
- [ ] Cost estimate for expected invocation volume.
- [ ] Security: least-privilege IAM, VPC if needed, secrets via env/SSM.
- [ ] Deployment pipeline (CI/CD with testing and staged deployments).
- [ ] Observability: CloudWatch or equivalent, structured logging, distributed tracing.

### Max Response Length
400 lines.

## Quick Start
Define handler function → Configure event source (API Gateway HTTP API) → Set IAM role (least privilege) → Set memory/timeout → Deploy with Serverless Framework → Monitor with CloudWatch → Tune provisioned concurrency for critical functions.

## Decision Tree: Serverless Provider
| Provider | Runtime Support | Event Sources | Cold Start | Cost Model |
|----------|----------------|---------------|------------|------------|
| **AWS Lambda** | Node, Python, Go, Java, .NET, Ruby, Rust (custom) | 15+ native triggers | 1-10ms (SnapStart) | Per ms + requests |
| **Azure Functions** | C#, Node, Python, Java, PowerShell, Go (custom) | 10+ native triggers | 1-50ms (premium plan) | Per second + requests |
| **GCP Cloud Functions** | Node, Python, Go, Java, .NET, Ruby | 8+ native triggers | 100-500ms (1st gen) | Per second + invocations |
| **Cloudflare Workers** | JS/TS, WASM, Python (via Pyodide) | HTTP, KV, D1, R2, Queues | <1ms (v8 isolates) | Per request, very cheap |
| **Knative / OpenFaaS** | Any (container) | Any | 0-1000ms | Container-based |

## Core Workflow

### Step 1: Function Configuration
```yaml
# serverless.yml (AWS Lambda)
service: user-service
frameworkVersion: '3'

provider:
  name: aws
  runtime: python3.12
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  memorySize: 512
  timeout: 30
  logRetentionInDays: 14
  tracing:
    lambda: true
    apiGateway: true
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:Query
          Resource: !Sub arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/users-${sls:stage}
        - Effect: Allow
          Action:
            - ssm:GetParameter
          Resource: !Sub arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/service/${sls:stage}/*

functions:
  createUser:
    handler: handlers/users.create
    events:
      - httpApi:
          method: POST
          path: /users
    description: Create a new user record
    memorySize: 1024
    reservedConcurrency: 10

  getUser:
    handler: handlers/users.get
    events:
      - httpApi:
          method: GET
          path: /users/{id}
    description: Get user by ID
    provisionedConcurrency: 5
```

### Step 2: Handler Implementation
```python
# handlers/users.py
import json
import os
import boto3
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.event_handler import APIGatewayRestResolver

logger = Logger(service="user-service")
tracer = Tracer(service="user-service")
metrics = Metrics(namespace="UserService", service="user-service")
app = APIGatewayRestResolver()

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

@app.post("/users")
@tracer.capture_method
def create_user():
    body = app.current_event.json_body
    user_id = body["id"]

    # Validate input
    if not body.get("email"):
        return {"error": "email required"}, 400

    table.put_item(Item={
        "pk": f"USER#{user_id}",
        "email": body["email"],
        "name": body.get("name", ""),
        "created_at": app.current_event.time
    })

    metrics.add_metric(name="UserCreated", unit=MetricUnit.Count, value=1)
    return {"id": user_id, "message": "User created"}, 201


@app.get("/users/<id>")
@tracer.capture_method
def get_user(id: str):
    result = table.get_item(Key={"pk": f"USER#{id}"})
    user = result.get("Item")
    if not user:
        return {"error": "not found"}, 404
    return {"user": user}, 200


@metrics.log_metrics
def handler(event, context):
    # Structured logging already via powertools
    logger.info("Processing request", extra={
        "path": event.get("path"),
        "method": event.get("httpMethod")
    })
    return app.resolve(event, context)
```

### Step 3: Event Source Mapping (SQS + S3 + EventBridge)
```yaml
# serverless.yml — event-driven functions
functions:
  processOrder:
    handler: handlers/orders.process
    events:
      - sqs:
          arn: !GetAtt OrdersQueue.Arn
          batchSize: 10
          maximumBatchingWindowInSeconds: 5
      - eventBridge:
          pattern:
            source:
              - "custom.order"
            detail-type:
              - "OrderCreated"
      - schedule:
          rate: rate(5 minutes)
          enabled: true
      - s3:
          bucket: !Ref UploadBucket
          event: s3:ObjectCreated:*
          rules:
            - prefix: inbound/
            - suffix: .csv
```

### Step 4: Infrastructure with Terraform
```hcl
resource "aws_lambda_function" "api" {
  function_name = "api-handler-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "main.handler"
  runtime       = "python3.12"
  filename      = "function.zip"
  source_code_hash = filebase64sha256("function.zip")
  timeout       = 30
  memory_size   = 512
  publish       = true

  environment {
    variables = {
      TABLE_NAME   = aws_dynamodb_table.users.name
      STAGE        = var.environment
      POWERTOOLS_SERVICE_NAME = "api-handler"
    }
  }

  tracing_config {
    mode = "Active"
  }

  reserved_concurrent_executions = 20
}

resource "aws_lambda_function_event_invoke_config" "api" {
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_function.api.version

  destination_config {
    on_failure {
      destination = aws_sqs_queue.dlq.arn
    }
    on_success {
      destination = aws_sns_topic.success.arn
    }
  }
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
```

### Step 5: Cold Start Optimization
```yaml
Strategies by runtime:
  Python:  1-50ms cold starts — use AWS Lambda Web Adapter for faster responses
            Enable provisioned concurrency for latency-critical endpoints
  Node:    5-100ms — compile on deploy, minimize dependencies
            Use esbuild bundler: tree-shake, reduce package size
  Java:    500-5000ms — use SnapStart (Lambda SnapStart for Java 11+)
            Prefer GraalVM native image (AWS provided, ~50ms cold start)
  Go:      1-5ms — compile to native binary, almost no cold start
            Best cold start of any interpreted/compiled runtime
  .NET:    300-3000ms — use .NET 8 (Native AOT) for cold starts under 100ms
  Rust:    1-3ms — compile to native, minimal cold start overhead

Provisioned concurrency:
  - $0.0000040827 per GB-second for provisioned (vs. $0.0000133334 for on-demand)
  - Schedule scaling: EventBridge rule to auto-scale provisioned concurrency
  - Use for: API endpoints, latency-sensitive functions, canary deployments

Warmers (anti-pattern):
  - CloudWatch scheduled event pinging functions every 5 min
  - Not reliable — Lambda scales instances independently
  - Better to use provisioned concurrency or SnapStart
```

### Step 6: Serverless Security
```yaml
IAM least privilege:
  - Never use LambdaFullAccess — scope per function
  - Use condition keys: sourceVpce, sourceIp, resourceArn, aws:SourceAccount
  - Prefer execution role per function over shared role
  - Rotate function URLs and API keys regularly

Secrets management:
  - AWS: SSM Parameter Store (SecureString) or Secrets Manager
  - Azure: Key Vault references in App Settings
  - GCP: Secret Manager
  - Never hardcode secrets in function code or env vars
  - Use SDK to fetch at initialization (outside handler)

VPC considerations:
  - Lambda in VPC: needs VPC endpoints for S3, DynamoDB, etc.
  - No public internet by default — use NAT Gateway or VPC endpoints
  - Adds 5-10ms cold start latency (ENI creation)
  - Best practice: keep Lambda outside VPC unless accessing RDS/ElastiCache

Function URLs:
  - Direct HTTPS endpoint for Lambda without API Gateway
  - Support IAM auth or AWS_IAM auth
  - Simple, no additional cost, but no custom domains natively

Code signing:
  - AWS Signer for Lambda — sign and verify function code
  - Enforce signing policies: require code signing profile
  - Prevents tampered code from being deployed
```

### Step 7: Serverless Observability
```yaml
Structured logging:
  - JSON format with correlation ID (API Gateway request ID or Lambda context)
  - Fields: level, timestamp, service, message, request_id, duration_ms, error
  - Use Lambda Powertools (Python, TypeScript, Java, .NET)

Distributed tracing:
  - AWS: X-Ray with segments, subsegments, and annotations
  - Azure: Application Insights
  - GCP: Cloud Trace
  - OpenTelemetry: collector as Lambda layer + OTLP exporter

Metrics:
  - Invocations: count, errors, throttles, duration, concurrent executions
  - Async: age of oldest message, dead-letter queue depth
  - Business metrics: custom metrics via embedded metric format (EMF)
  - Alert thresholds:
    - Error rate > 1% for > 5 min
    - Duration P99 > timeout * 0.8
    - Throttles > 0 for > 1 min
    - Dead-letter queue depth > 10
```

### Step 8: Cost Management
```yaml
Cost factors:
  - Requests: $0.20 per 1M requests (AWS)
  - Duration: $0.0000166667 per GB-second
  - Provisioned concurrency: additional charge per GB-second
  - Data transfer: Lambda → internet/$0.09 per GB, Lambda → same-region services is free

Optimization strategies:
  - Right-size memory: more memory = proportionally more CPU (and cost)
  - 1024 MB is the sweet spot for most Python/Node workloads
  - Minimize runtime by optimizing code, reducing dependencies
  - Batch SQS messages: batchSize > 1 reduces invocations
  - Use Lambda function URLs for simple HTTP APIs (no API Gateway cost)
  - Set reserved concurrency to prevent runaway cost from traffic spikes
  - Use ephemeral storage /tmp for scratch files (512 MB - 10 GB)
  - Monitor with cost allocation tags (Environment, Service, Team)

Estimated cost per 10M invocations (Python, 512 MB, 500 ms):
  - Requests: $2.00
  - Duration: ~$69.44
  - Total: ~$71.44/month
```

### Step 9: Advanced Patterns
```yaml
Step Functions workflows:
  - Express Workflows: high-volume, <5 min, $1 per 1000 state transitions
  - Standard Workflows: long-running, up to 1 year, $0.025 per 1000 transitions
  - Patterns: fan-out, parallel, wait for callback, saga (compensating transactions)

Lambda + DynamoDB Streams:
  - Capture change data capture (CDC) events
  - Fan out to SQS, SNS, EventBridge
  - Handle duplicate events (idempotency via dynamodb-toolbox or idempotency key)

Lambda + WebSockets:
  - API Gateway WebSocket API → Lambda integration
  - $connect, $disconnect, $default routes
  - Maintain connection IDs in DynamoDB

Lambda + EFS:
  - Mount EFS for shared filesystem across concurrent invocations
  - Cold start: ~1-2 seconds additional (mount time)
  - Use for ML model inference, large reference data

Lambda response streaming:
  - Stream responses up to 20 MB
  - Pay-as-you-go response streaming (no API Gateway buffering)
  - Good for large JSON, CSV generation, AI streaming
```

## Rules
- Every function must have a dead-letter queue (DLQ) for async invocations.
- Set reserved concurrency for every production function to prevent runaway costs.
- Enable X-Ray (or equivalent tracing) on all functions.
- Use structured JSON logging with a correlation ID for traceability.
- Never store secrets in environment variables — use SSM/Secrets Manager.
- Align function memory with timeout: more memory = faster = less cost per invocation.
- Deploy with immutable versioning (publish = true)—never use $LATEST in production.
- Use Lambda versions and aliases for canary deployments (5% new, 95% old).
- Test cold start behavior with your runtime before production — measure and tune.
- Use Powertools (or equivalent) for logging, tracing, and metrics standardization.

## Production Considerations
- Lambda function URLs need resource-based policy or IAM authentication — don't leave open.
- SQS batch processing: handle partial failures with `reportBatchItemFailures`.
- Lambda in VPC: create a VPC endpoint for SSM and CloudWatch Logs.
- SnapStart: requires Java 11+ and idempotent initialization code.
- Recursive loops: Lambda writing to S3 → S3 event → Lambda (infinite loop protection needed).
- `aws:SourceAccount` condition on Lambda resource policies to prevent confused deputy.
- Lambda + RDS: use RDS Proxy to avoid connection pool exhaustion.
- Lambda ephemeral storage default 512 MB — can increase to 10 GB for data processing.
- Function URL CORS: configure allowed origins, methods, and headers.
- Set `function_response_type=RequestResponse` for synchronous invocations.
- CloudFront + Lambda@Edge: 5 sec viewer-request/response, 30 sec origin-request/response.

## Anti-Patterns
- No reserved concurrency — one buggy function consumes all account concurrency.
- Maximum memory allocation without testing — linear cost increase with minimal perf benefit.
- Synchronous calls between functions — use event-driven (SQS, SNS, EventBridge).
- Monolithic function — violates single responsibility, cold start suffers.
- Long timeouts (5+ min) — Lambda is for short-lived compute; use ECS/Step Functions.
- No error handling in async handlers — failures are silently retried then discarded.
- VPC for every function — unnecessary latency for functions that don't need it.
- Using Lambda for persistent connections (WebSocket) without proper cleanup.
- No idempotency handling — duplicates cause data corruption.
- Not testing Lambda@Edge cold start latency — adds latency to every request.

## References
  - references/serverless-advanced.md — Serverless Advanced Topics
  - references/serverless-fundamentals.md — Serverless Fundamentals
  - references/aws-lambda.md — AWS Lambda Deep Dive
  - references/azure-functions.md — Azure Functions Configuration
  - references/gcp-cloud-functions.md — GCP Cloud Functions
  - references/serverless-framework.md — Serverless Framework Deployment
  - references/step-functions.md — AWS Step Functions Workflows
  - references/lambda-monitoring.md — Lambda Monitoring and Observability
  - references/lambda-security.md — Lambda Security Best Practices
## Handoff
- `devops-aws` for API Gateway, DynamoDB, SQS, EventBridge integration.
- `devops-observability` for AWS X-Ray and CloudWatch configuration.
- `devops-cicd-pipeline` for CI/CD pipelines with Lambda deployment.
- `devops-security` for IAM and secrets management.
- `devops-monitoring` for Lambda-specific monitoring dashboards.

## Architecture Decision Trees

### Lambda vs Fargate vs ECS

| Decision | Lambda (FaaS) | Fargate (Serverless Container) | ECS (Container Orchestration) |
|---|---|---|---|
| Execution model | Event-driven, short-lived | Long-running container | Long-running container |
| Max duration | 15 minutes | Unlimited | Unlimited |
| Cold start | Yes (<1s provisioned concurrency) | No (always warm) | No (always warm) |
| Scaling | Instant (per-event) | Auto-scaling (minutes) | Auto-scaling (minutes) |
| Cost model | Per-invocation + duration | Per-hour (vCPU + memory) | Per-hour (EC2 instances) |
| State | Stateless (externalize to SQS/DynamoDB) | Stateful possible | Stateful possible |
| Best for | Event-driven, bursty, variable | Steady API workloads | Batch, ML, GPU workloads |

### API Gateway REST vs HTTP vs WebSocket

| Aspect | REST API | HTTP API | WebSocket API |
|---|---|---|---|
| Latency | ~50ms | ~10ms | ~50ms |
| Features | WAF, usage plans, API keys | JWT, CORS, cheaper | Real-time, bidirectional |
| Cost | Most expensive | Cheapest (~70% less) | Connection + message |
| Integration | Lambda, HTTP, Step Functions | Lambda, HTTP, Service Discovery | Lambda, DynamoDB |
| Use case | Public APIs with throttling | Microservices APIs | Chat, real-time updates |

## Implementation Patterns

### Terraform: Event-driven Lambda with SQS and DynamoDB

```hcl
resource "aws_lambda_function" "order_processor" {
  function_name = "order-processor-${var.environment}"
  runtime       = "nodejs22.x"
  handler       = "index.handler"
  filename      = "${path.module}/function.zip"
  source_code_hash = filebase64sha256("${path.module}/function.zip")

  memory_size = 512
  timeout     = 30
  reserved_concurrent_executions = 50

  environment {
    variables = {
      TABLE_NAME    = aws_dynamodb_table.orders.name
      DLQ_QUEUE_URL = aws_sqs_queue.dlq.url
    }
  }

  tracing_config {
    mode = "Active"
  }
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.order_events.arn
  function_name    = aws_lambda_function.order_processor.arn
  batch_size       = 10
  maximum_batching_window_in_seconds = 5
  scaling_config {
    maximum_concurrency = 10
  }
}

resource "aws_dynamodb_table" "orders" {
  name         = "orders-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

resource "aws_sqs_queue" "dlq" {
  name                       = "order-processor-dlq-${var.environment}"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 30
}
```

### Bash: Lambda Deployment Script

```bash
#!/usr/bin/env bash
deploy_lambda() {
  local function_name=$1
  local source_dir=$2

  # Install production dependencies
  cd "$source_dir"
  npm ci --production --ignore-scripts

  # Package with esbuild for minimal bundle
  npx esbuild index.js --bundle --minify --platform=node \
    --outfile=dist/index.js --external:aws-sdk

  # Create deployment package
  cd dist
  zip -r9 "../${function_name}.zip" .

  # Deploy to Lambda
  aws lambda update-function-code \
    --function-name "$function_name" \
    --zip-file "fileb://../${function_name}.zip"

  # Publish version
  aws lambda publish-version \
    --function-name "$function_name"

  # Update alias to point to new version
  aws lambda update-alias \
    --function-name "$function_name" \
    --name production \
    --function-version "$(aws lambda list-versions-by-function \
      --function-name "$function_name" --query 'Versions[-1].Version' --output text)"
}
```

## Production Considerations (Serverless-specific)

- Enable **provisioned concurrency** for latency-sensitive functions to eliminate cold starts
- Configure **Lambda Powertools** (TypeScript/Python/Java) for structured logging and tracing
- Set **function timeouts** realistically — 30s for APIs, 5m for batch processors, never max unless needed
- Implement **idempotency** in all event-driven functions (store processed event IDs in DynamoDB)
- Use **Lambda Extensions** for secrets caching, APM agents, and sidecar processes
- Enable **CloudWatch Lambda Insights** for memory profiling and cold start analysis
- Set **reserved concurrency** per critical function to prevent noise from other functions starving it

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.