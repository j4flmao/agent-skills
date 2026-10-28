# Serverless Advanced: Orchestration, Failure Handling, and Concurrency Control

Advanced AWS-centric patterns for production serverless systems: Step Functions workflows, partial batch failures, destinations and DLQs, idempotency, concurrency controls, SnapStart and provisioned concurrency, and protecting downstream systems. Basics are in `serverless-fundamentals.md`; tracing and logs in `serverless-observability.md`.

## Orchestration with Step Functions

| Workflow type | Semantics | Max duration | Pricing model | Use |
|--------------|-----------|--------------|---------------|-----|
| Standard | Exactly-once workflow execution, full history | Up to 1 year | Per state transition | Long-running, auditable business processes |
| Express | At-least-once (async) / at-most-once (sync) | Up to 5 minutes | Per request + duration | High-volume, short event processing |

```json
{
  "StartAt": "ReserveInventory",
  "States": {
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "reserve-inventory", "Payload.$": "$" },
      "Retry": [{ "ErrorEquals": ["States.TaskFailed"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0, "JitterStrategy": "FULL" }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "FailOrder" }],
      "Next": "ChargePayment"
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "charge-payment", "Payload.$": "$" },
      "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "ReleaseInventory" }],
      "Next": "Done"
    },
    "ReleaseInventory": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "release-inventory", "Payload.$": "$" },
      "Next": "FailOrder"
    },
    "FailOrder": { "Type": "Fail", "Error": "OrderFailed" },
    "Done": { "Type": "Succeed" }
  }
}
```

- Implements a saga: each step has a compensating action on failure.
- Use direct service integrations (DynamoDB, SQS, EventBridge, ECS) instead of Lambda wrappers where possible.
- Step Functions supports JSONata as a query language for newer state machines, simplifying data transformation versus JSONPath.
- `.waitForTaskToken` pauses for human approval or external callbacks; `Map` (distributed mode) fans out over large datasets in S3.

## Partial Batch Failures (SQS, Kinesis, DynamoDB Streams)

Without partial failure reporting, one bad message makes the whole batch retry.

```python
def handler(event, context):
    failures = []
    for record in event["Records"]:
        try:
            process(record)
        except Exception:
            log.exception("Failed messageId=%s", record["messageId"])
            failures.append({"itemIdentifier": record["messageId"]})
    return {"batchItemFailures": failures}
```

Enable `FunctionResponseTypes: [ReportBatchItemFailures]` on the event source mapping. For streams, the item identifier is the sequence number, and processing resumes from the first failed record.

## Retries, DLQs, and Destinations

| Invocation | Retry behaviour | Failure capture |
|-----------|-----------------|-----------------|
| Synchronous (API Gateway, SDK) | Caller decides | Caller |
| Asynchronous (S3, SNS, EventBridge) | Lambda retries (default 2) with backoff; configurable max event age | On-failure destination (SQS, SNS, EventBridge, Lambda, S3) or DLQ |
| Event source mapping (SQS) | Message becomes visible again after visibility timeout until `maxReceiveCount` | SQS redrive policy to a DLQ |
| Event source mapping (Kinesis/DynamoDB) | Retries until success or record expiry unless limited | `MaximumRetryAttempts`, `BisectBatchOnFunctionError`, on-failure destination |

- Prefer destinations over DLQs for async invokes: they include context (error, request payload).
- Set SQS visibility timeout to at least six times the function timeout (AWS guidance) to avoid duplicate processing during retries.
- Build a redrive process (SQS DLQ redrive to source) and alarm on DLQ depth.

## Idempotency

```python
from aws_lambda_powertools.utilities.idempotency import (
    DynamoDBPersistenceLayer, IdempotencyConfig, idempotent)

persistence = DynamoDBPersistenceLayer(table_name="idempotency")
config = IdempotencyConfig(event_key_jmespath="body.orderId", expires_after_seconds=3600)

@idempotent(persistence_store=persistence, config=config)
def handler(event, context):
    return charge(event)
```

Powertools for AWS Lambda (Python, TypeScript, Java, .NET) stores request hashes with conditional writes and returns the stored response for duplicates.

## Concurrency Controls

| Control | Effect |
|---------|-------|
| Account concurrency quota | Regional cap shared by all functions |
| Reserved concurrency | Guarantees and caps concurrency for one function; 0 disables it (kill switch) |
| Provisioned concurrency | Pre-initialized environments; removes cold starts for that capacity; billed while allocated |
| SQS `ScalingConfig.MaximumConcurrency` | Caps concurrent invocations from one SQS event source |
| API Gateway throttling / usage plans | Protects functions and downstreams from clients |

Use reserved concurrency or SQS maximum concurrency to protect databases and third-party APIs from scale-out spikes.

## Cold Start Reduction

- **SnapStart**: snapshots the initialized environment and resumes from it; available for Java, Python, and .NET managed runtimes. Ensure uniqueness (random seeds, connections, credentials) is re-established after restore using runtime hooks.
- **Provisioned concurrency** with Application Auto Scaling schedules for predictable peaks.
- Smaller packages, lazy loading of rarely used dependencies, and arm64 (Graviton) often improve price/performance.

## Event Filtering and Routing

- Event source mapping filters (`FilterCriteria`) drop irrelevant SQS/Kinesis/DynamoDB records before invoking the function, reducing cost.
- EventBridge rules with content-based filtering route events to targets; EventBridge Pipes connect sources to targets with optional filtering and enrichment.

## Long-Running and Heavy Work

| Need | Option |
|------|--------|
| > 15 minutes | Step Functions + ECS/Fargate tasks, AWS Batch |
| Large file processing | S3 event → Step Functions distributed Map |
| Streaming HTTP responses | Lambda response streaming (Node.js managed runtime; others via custom runtimes/Web Adapter) |
| Containers with HTTP frameworks | Lambda Web Adapter or Cloud Run |

## Recursive Loop Protection

Lambda detects and stops some recursive loops between Lambda, SQS, SNS, and S3 automatically, but design guards anyway: write outputs to a different bucket/prefix than the trigger, and include a hop counter in messages.

## Multi-Account and Deployment Safety

- Deploy with CodeDeploy traffic shifting (`Canary10Percent5Minutes`, `Linear10PercentEvery1Minute`) via SAM/CDK aliases, with CloudWatch alarms for automatic rollback.
- Use function versions + aliases; never point production triggers at `$LATEST`.

## Pitfalls

- Batch retries reprocessing successful messages because partial failures are not reported.
- Visibility timeout shorter than function timeout causing duplicates.
- Unlimited concurrency overwhelming a database.
- Standard Step Functions for millions of tiny events (cost) or Express for workflows needing exactly-once.
- SnapStart restoring stale credentials or identical random state.

## Checklist

- [ ] Workflows with explicit retries, catches, and compensations
- [ ] `ReportBatchItemFailures` on queue/stream consumers
- [ ] Destinations/DLQs with alarms and redrive procedures
- [ ] Idempotency for all side-effecting handlers
- [ ] Concurrency caps protecting downstream systems
- [ ] Cold-start strategy (SnapStart/provisioned) where latency SLOs require
- [ ] Aliases with gradual traffic shifting and alarm-based rollback
