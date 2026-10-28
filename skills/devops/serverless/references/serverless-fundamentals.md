# Serverless Fundamentals: Models, Trade-offs, and Design Rules

Platform-neutral fundamentals of serverless computing: what "serverless" covers, execution models across providers, when it fits, and the design rules every function must follow. AWS Lambda specifics are in `lambda-basics.md`; triggers in `event-sources.md`; tuning in `function-optimization.md`.

## What Counts as Serverless

| Category | Examples | Unit of deployment |
|----------|----------|--------------------|
| Functions (FaaS) | AWS Lambda, Azure Functions, Google Cloud Run functions | Function handler |
| Serverless containers | Google Cloud Run, AWS Fargate (with ECS), Azure Container Apps | Container image |
| Edge functions | Cloudflare Workers, Fastly Compute, Lambda@Edge / CloudFront Functions | Script/Wasm at edge locations |
| Managed backends | DynamoDB, Aurora Serverless v2, S3, SQS, Pub/Sub, EventBridge, Step Functions | Configuration |

Common properties: no server management, scale with demand (often to zero), pay per use, and the provider owns availability of the runtime.

## Execution Model (FaaS)

```
Event ─► Router/trigger ─► Execution environment (sandbox)
                               ├─ Init phase: runtime start, your global/static init (cold start)
                               ├─ Invoke phase: handler(event, context)  ← reused for later invocations (warm)
                               └─ Shutdown: environment frozen/reclaimed at provider's discretion
```

- **Cold start**: first invocation in a new environment pays init time; warm invocations reuse the environment and global state (connections, caches).
- **Concurrency**: on Lambda, one environment handles one request at a time; scaling adds environments. Cloud Run and Azure Functions (depending on plan) can handle multiple concurrent requests per instance.
- **Statelessness**: local memory and disk may persist between warm invocations but can vanish at any time; never rely on it for correctness.

## When Serverless Fits

| Good fit | Poor fit |
|----------|----------|
| Spiky or unpredictable traffic | Steady high utilization 24/7 (often cheaper on containers/VMs) |
| Event-driven glue (queues, files, webhooks, schedules) | Long-running jobs beyond platform timeouts |
| Small teams wanting minimal ops | Workloads needing GPUs, special kernels, or persistent connections at scale (varies by platform) |
| APIs with moderate latency requirements | Ultra-low, consistent latency where cold starts are unacceptable without provisioned capacity |

Model cost with expected request volume, duration, and memory before committing; per-request pricing that is cheap at low volume can exceed container costs at sustained high volume.

## Provider Comparison (Conceptual)

| Aspect | AWS Lambda | Azure Functions | Cloud Run (incl. functions) | Cloudflare Workers |
|--------|-----------|-----------------|-----------------------------|--------------------|
| Packaging | Zip or container image | Code or container (plan-dependent) | Container image (functions built from source) | JS/TS/Wasm scripts |
| Concurrency per instance | 1 | Multiple (plan/runtime-dependent) | Configurable, default many | Isolates, many per process |
| Scale to zero | Yes | Yes (Consumption / Flex Consumption) | Yes | Yes |
| Max duration | 15 minutes | Plan-dependent | Request timeout up to 60 minutes for services; jobs for longer work | CPU-time limits per request |
| Warm capacity | Provisioned concurrency, SnapStart | Always-ready instances (Flex/Premium) | Minimum instances | No cold starts in the traditional sense (isolates) |

Limits change; confirm current quotas in provider documentation before designing around them.

## Design Rules

1. **Idempotent handlers**: triggers deliver at least once (queues, streams, async invokes, retries). Deduplicate with an idempotency key stored atomically (conditional write).
2. **Stateless compute, state in managed services**: databases, object storage, caches.
3. **Initialize once**: create SDK clients and connection pools outside the handler.
4. **Bounded work per invocation**: fit within timeouts with margin; split large work into steps (queues, workflow engines).
5. **Explicit timeouts on every outbound call**, shorter than the function timeout.
6. **Least-privilege identity per function**.
7. **Structured logs with correlation IDs**; tracing across async hops.

```python
import os, boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE"])   # init once per environment

def handler(event, context):
    for record in event["Records"]:
        process(record)        # must tolerate duplicates
```

## Connection Management

- Relational databases have limited connections; thousands of concurrent function instances can exhaust them. Use a proxy (RDS Proxy, PgBouncer), HTTP-based data APIs, or serverless-native databases.
- Reuse HTTP clients with keep-alive across invocations.

## Event-Driven Architecture Basics

| Pattern | Services |
|---------|---------|
| Queue-based load leveling | SQS / Service Bus / Pub/Sub between API and workers |
| Fan-out | SNS / EventBridge / Pub/Sub topics to multiple consumers |
| Event routing | EventBridge rules, Event Grid |
| Orchestration | Step Functions, Durable Functions, Workflows |
| Stream processing | Kinesis / Kafka / Event Hubs with batch triggers |

Prefer asynchronous boundaries between services so spikes are absorbed by queues rather than synchronous chains of functions (which multiply latency, cost, and failure modes).

## Security Basics

- One role per function, scoped to exact resources.
- Secrets from a secret manager or parameter store, cached in memory with TTL, not in plaintext environment variables in source control.
- Validate all event input; events from public sources (API, S3 uploads) are untrusted.
- Keep dependencies minimal and scanned; pin runtimes to supported versions and upgrade before deprecation dates.

## Local Development and Testing

- Unit test handlers as plain functions with fake events (provider sample events).
- Integration test against real cloud resources in an ephemeral stage; emulators (SAM CLI, Functions Core Tools, LocalStack) help but differ from real services.
- Infrastructure as code (SAM, CDK, Serverless Framework, Terraform) for every resource.

## Anti-Patterns

- Function calling function synchronously in long chains.
- Monolithic "lambdalith" routers can be fine for APIs, but huge packages hurt cold starts; measure.
- Recursive triggers (function writes to the bucket that triggers it) without guards.
- Ignoring concurrency limits and starving downstream systems.

## Checklist

- [ ] Workload profile and cost model justify serverless
- [ ] Handlers idempotent; duplicates tested
- [ ] Clients initialized outside handlers; DB connections pooled or proxied
- [ ] Timeouts on outbound calls below function timeout
- [ ] Least-privilege role and secret manager per function
- [ ] Async boundaries (queues/events) between services
- [ ] IaC and ephemeral test stages
