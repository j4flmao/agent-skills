# Serverless Backend Development

> Reference for `devops/serverless` — the entry point is [`../SKILL.md`](../SKILL.md). This file keeps only material the SKILL.md does not cover.

## Purpose
Write function code that behaves correctly under the FaaS execution model: short-lived, horizontally scaled environments, at-least-once event delivery, cold starts, and hard limits. The focus is application code and runtime configuration choices, not infrastructure pipelines.

## Execution Model Facts (AWS Lambda)
- One execution environment handles one request at a time; concurrency = number of environments.
- Lifecycle: INIT (runtime + your module-level code) -> INVOKE (handler) repeated -> SHUTDOWN. Environments are reused, so module-scope state persists between invocations on the same environment but must never be relied on.
- Limits to design around: max timeout 15 minutes; memory 128 MB to 10,240 MB with CPU allocated proportionally; `/tmp` configurable 512 MB to 10,240 MB; synchronous request/response payload 6 MB.
- Since August 2025 the INIT phase is billed for on-demand functions, so heavy initialization now costs money as well as latency.

## Handler Structure

Initialize clients once at module scope; keep the handler thin and delegate to testable functions.

```python
# app.py  (Python 3.12+, SQS trigger with ReportBatchItemFailures enabled)
import json
import logging
import os

import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

# Created during INIT, reused across invocations on this environment.
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["ORDERS_TABLE"])


def process_order(order: dict) -> None:
    # Conditional write makes redelivery harmless (idempotent by order_id).
    try:
        table.put_item(
            Item={"pk": order["order_id"], "status": "RECEIVED", "total": order["total"]},
            ConditionExpression="attribute_not_exists(pk)",
        )
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        logger.info("duplicate order %s ignored", order["order_id"])


def handler(event, context):
    failures = []
    for record in event["Records"]:
        try:
            process_order(json.loads(record["body"]))
        except Exception:
            logger.exception("failed message %s", record["messageId"])
            failures.append({"itemIdentifier": record["messageId"]})
    # Only failed messages return to the queue; successful ones are deleted.
    return {"batchItemFailures": failures}
```

Without `ReportBatchItemFailures` on the event source mapping, one bad message makes the whole batch retry, reprocessing successful messages.

HTTP handler (TypeScript, API Gateway HTTP API / Function URL payload v2):

```ts
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({})); // INIT once

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id required' }) };

  const { Item } = await ddb.send(new GetCommand({ TableName: process.env.TABLE!, Key: { pk: id } }));
  if (!Item) return { statusCode: 404, body: JSON.stringify({ error: 'not found' }) };
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(Item) };
};
```

## Event-Source Semantics

| Source | Invocation | Retries | Failure handling |
|---|---|---|---|
| API Gateway / Function URL / ALB | Synchronous | None by Lambda; client decides | Return proper status codes |
| SNS, EventBridge, S3 | Asynchronous (internal queue) | Up to 2 retries by default (configurable 0-2), max event age configurable | On-failure destination or DLQ |
| SQS | Poll-based batches | Message reappears after visibility timeout | `batchItemFailures`, redrive policy to DLQ; set visibility timeout to at least 6x the function timeout (AWS guidance) |
| Kinesis / DynamoDB Streams | Poll-based, ordered per shard | Retries block the shard until success or expiry | Bisect batch on error, max retry attempts, on-failure destination |

All asynchronous and poll-based sources are at-least-once: every handler with side effects must be idempotent (conditional writes, idempotency table, or Powertools Idempotency utility).

## Cold Starts

| Technique | Effect | Cost |
|---|---|---|
| Smaller bundle (tree-shaken esbuild bundle, no unused SDKs) | Faster INIT | Build tooling |
| Lazy-import rarely used modules | Shorter INIT on common paths | Code complexity |
| arm64 (Graviton) | Lower price per GB-second; similar or better performance for most workloads | Native deps must be built for arm64 |
| More memory | More CPU, faster INIT and execution | Higher per-ms price (often cheaper overall for CPU-bound code) |
| SnapStart (Java, Python, .NET) | Restores from a snapshot of initialized environment | Uniqueness/secrets captured at snapshot must be refreshed in restore hooks |
| Provisioned concurrency | Pre-initialized environments, no cold start up to the configured level | Pay for idle capacity |

Measure first: `Init Duration` appears in the `REPORT` log line only on cold starts.

## Connections to Relational Databases
Each environment opens its own connections, so a traffic spike can exhaust database connection limits.
- Use RDS Proxy (pooling and failover), or an HTTP-based API (Aurora Data API) where available.
- Create the connection at module scope, keep pool size 1 per environment, and validate on reuse.
- Cap concurrency with reserved concurrency on the function to protect the database.

## Observability
- Structured JSON logs with request ID (`context.aws_request_id`) and correlation IDs from the event.
- Powertools for AWS Lambda (Python, TypeScript, Java, .NET) provides Logger, Tracer, Metrics (EMF) and Idempotency utilities.
- Alarm on `Errors`, `Throttles`, `IteratorAge` (streams), `ApproximateAgeOfOldestMessage` (SQS), DLQ depth, and p99 `Duration` vs timeout.

## Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Creating SDK/DB clients inside the handler | Module-scope initialization |
| Function calling function synchronously in chains | Step Functions or events |
| Long polling/waiting inside a function (paying to wait) | Step Functions wait states, callbacks, EventBridge Scheduler |
| Monolithic "lambdalith" with huge dependencies for every route | Split by cold-start-sensitive paths, or accept and measure |
| Writing state to `/tmp` or globals as if durable | External store (S3, DynamoDB) |
| Function timeout greater than upstream timeout (API Gateway integration limit) | Align timeouts; return 202 and process async |
| Unbounded concurrency hitting a fixed-capacity DB | Reserved concurrency, RDS Proxy, SQS buffering |

## Checklist
- [ ] Clients initialized at module scope; bundle size measured.
- [ ] Memory tuned by measurement (e.g. AWS Lambda Power Tuning); arm64 considered.
- [ ] Timeout below upstream timeouts and SQS visibility timeout >= 6x function timeout.
- [ ] Idempotent handlers for every async/poll-based trigger.
- [ ] Partial batch failure reporting enabled for SQS/streams; DLQ or on-failure destination with alarms.
- [ ] Reserved concurrency protecting downstream systems.
- [ ] Structured logs, traces and metrics wired via Powertools or OpenTelemetry.

## References
- Related skills: `skills/devops/serverless/SKILL.md` (infrastructure, IaC and deployment), `skills/backend/universal/idempotency/SKILL.md`, `skills/backend/universal/background-jobs/SKILL.md`.
