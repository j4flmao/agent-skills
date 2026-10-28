---
name: cloud-native-serverless-orchestration
description: >
  Use this skill when the user says 'step functions', 'state machine', 'amazon states language', 'asl', 'orchestrate lambdas', 'express workflow', 'distributed map', 'saga with step functions', 'workflow retries catch'. Designs AWS Step Functions state machines with correct ASL syntax, Retry/Catch error handling, Standard vs Express choice, and service integrations that avoid needless Lambdas. Do NOT use for: Azure Durable Functions (cloud-native-azure-functions), Lambda internals (cloud-native-aws-serverless), data-pipeline orchestrators like Airflow (data workflow-orchestration).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, aws, step-functions, orchestration, saga, serverless]
---

# Serverless Orchestration with AWS Step Functions

## Purpose
Move workflow state, retries, branching, and compensation out of Lambda code into a declarative state machine. Functions stay small and stateless; Step Functions records every transition, so failures are visible and recoverable.

## Agent Protocol

### Trigger
"step functions", "state machine", "amazon states language", "ASL", "orchestrate lambdas", "express workflow", "distributed map", "saga", "retry catch workflow".

### Input Context
- Steps, their side effects, and which are idempotent.
- Duration and volume (executions/s), need for exactly-once vs at-least-once.
- Human approval or external callbacks.

### Output Artifact
ASL definition (JSON) plus IaC wiring. No file unless requested.

### Response Format
```
Workflow type: {Standard|Express (sync|async)} (why)
States: {list}
Error handling: {Retry policies, Catch targets, compensation}
Integrations: {optimized service integrations / Lambda tasks}
```

### Completion Criteria
- [ ] Every Task has Retry for transient errors and Catch for terminal ones.
- [ ] Workflow type chosen from duration/volume/semantics table.
- [ ] Compensating steps defined for any multi-step side effect (saga).

## Standard vs Express
| | Standard | Express |
|---|---|---|
| Max duration | 1 year | 5 minutes |
| Execution semantics | Exactly-once per state transition | At-least-once (async) / at-most-once (sync) |
| Pricing | Per state transition | Per request + duration/memory |
| History | Visual execution history, 90 days | CloudWatch Logs only |
| Callback (`.waitForTaskToken`) and `.sync` job patterns | Supported | Not supported |
| Fit | Business processes, human approval, long jobs | High-volume event processing, IoT, streaming transforms |

## State Types
`Task`, `Choice`, `Parallel`, `Map` (inline or Distributed mode for up to 10,000 parallel child executions over S3 data), `Wait`, `Pass`, `Succeed`, `Fail`.
Since late 2024, state machines can set `"QueryLanguage": "JSONata"` and use `Arguments`/`Output` with JSONata expressions instead of JSONPath (`InputPath`, `Parameters`, `ResultSelector`, `ResultPath`, `OutputPath`). Pick one per state machine for readability.

## Order Saga Example (JSONPath)

```json
{
  "Comment": "Order saga with compensation",
  "StartAt": "ReserveInventory",
  "States": {
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "${ReserveFn}", "Payload.$": "$" },
      "ResultSelector": { "reservationId.$": "$.Payload.reservationId" },
      "ResultPath": "$.inventory",
      "Retry": [{
        "ErrorEquals": ["Lambda.ServiceException", "Lambda.TooManyRequestsException", "States.Timeout"],
        "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0, "JitterStrategy": "FULL"
      }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "OrderFailed" }],
      "Next": "ChargePayment"
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "${ChargeFn}", "Payload.$": "$" },
      "ResultPath": "$.payment",
      "Retry": [{ "ErrorEquals": ["Lambda.TooManyRequestsException"], "MaxAttempts": 3, "BackoffRate": 2.0 }],
      "Catch": [{ "ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "ReleaseInventory" }],
      "Next": "RecordOrder"
    },
    "RecordOrder": {
      "Type": "Task",
      "Resource": "arn:aws:states:::dynamodb:putItem",
      "Parameters": {
        "TableName": "${OrdersTable}",
        "Item": { "pk": { "S.$": "$.orderId" }, "status": { "S": "CONFIRMED" } }
      },
      "ResultPath": null,
      "End": true
    },
    "ReleaseInventory": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "${ReleaseFn}", "Payload.$": "$" },
      "ResultPath": null,
      "Retry": [{ "ErrorEquals": ["States.ALL"], "MaxAttempts": 5, "BackoffRate": 2.0 }],
      "Next": "OrderFailed"
    },
    "OrderFailed": { "Type": "Fail", "Error": "OrderFailed", "Cause": "See execution history" }
  }
}
```
Notes:
- `RecordOrder` calls DynamoDB directly (optimized integration) — no Lambda needed for simple service calls.
- `ResultPath: null` discards a task's result and keeps the input.
- Retry `IntervalSeconds` default 1, `MaxAttempts` default 3, `BackoffRate` default 2.0; `MaxDelaySeconds` caps backoff.
- There is no built-in dead-letter queue: route failures with `Catch` to a state that sends to SQS/SNS, and alarm on `ExecutionsFailed`.

## Integration Patterns
| Suffix | Behaviour | Example |
|---|---|---|
| (none) Request-Response | Call API, continue immediately | `arn:aws:states:::sns:publish` |
| `.sync` | Start job and wait for completion | `arn:aws:states:::ecs:runTask.sync`, `glue:startJobRun.sync` |
| `.waitForTaskToken` | Pause until `SendTaskSuccess/Failure` with the token | Human approval email, third-party callback |

Set `HeartbeatSeconds`/`TimeoutSeconds` on callback tasks so stuck executions fail.

## Decision Rules
- Logic is a simple linear chain of 2 steps with no retries → an event (EventBridge/SQS) may be enough.
- Payload > 256 KB between states → store in S3 and pass a key (state input/output limit is 256 KB).
- Large-scale batch over S3 objects → Distributed Map with `MaxConcurrency` and `ToleratedFailurePercentage`.
- Execution start rate high and short duration → Express; long or needs exactly-once → Standard.

## Anti-Patterns
- A Lambda that only forwards to another AWS API → use the SDK service integration (`arn:aws:states:::aws-sdk:<service>:<action>`).
- `Catch` with `States.ALL` and no compensation → silent partial side effects.
- Polling loops with `Wait` + Lambda for jobs that support `.sync`.
- Huge inline Map over thousands of items → history-event limit (25,000 events per Standard execution); use Distributed Map or child executions.

## Checklist
- [ ] Retries with jitter on transient errors; Catch on every Task.
- [ ] Compensation states idempotent and retried.
- [ ] Logging to CloudWatch (level ERROR or ALL for Express) and X-Ray tracing enabled.
- [ ] IAM role of the state machine scoped to exact resources.
- [ ] Definition validated (`aws stepfunctions validate-state-machine-definition`) in CI.

## References
- Related skills: `skills/cloud-native/aws-serverless/SKILL.md`, `skills/backend/universal/saga-patterns/SKILL.md`.
