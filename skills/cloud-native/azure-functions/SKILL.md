---
name: cloud-native-azure-functions
description: >
  Use this skill when the user says 'azure functions', 'durable functions', 'orchestrator function', 'activity function', 'durable entities', 'event grid trigger', 'flex consumption', 'azure functions hosting plan', 'fan-out fan-in azure'. Designs Azure Functions apps and Durable Functions workflows with correct replay-safe orchestrator code, hosting-plan choice, and Event Grid delivery semantics. Do NOT use for: AWS Lambda (cloud-native-aws-serverless), AWS Step Functions (cloud-native-serverless-orchestration), generic multi-cloud serverless strategy (devops-serverless).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [cloud-native, azure, azure-functions, durable-functions, event-grid, serverless]
---

# Azure Functions and Durable Functions

## Purpose
Build event-driven Azure Functions and stateful Durable Functions workflows correctly. The key mechanics are the Durable Task Framework's event-sourced replay (which dictates strict orchestrator coding rules) and Event Grid's push delivery with retries (which dictates idempotent handlers).

## Agent Protocol

### Trigger
"azure functions", "durable functions", "orchestrator function", "activity function", "durable entities", "event grid trigger", "flex consumption", "hosting plan", "fan-out fan-in".

### Input Context
- Language/worker model (.NET isolated worker, Node.js v4 model, Python v2 model, Java, PowerShell).
- Trigger sources (HTTP, Queue, Service Bus, Event Grid, Event Hubs, Timer, Blob).
- Execution length, VNet needs, cold-start tolerance, expected scale.

### Output Artifact
Function code and host/plan configuration. No file unless requested.

### Response Format
```
Hosting plan: {Flex Consumption|Premium|Dedicated|Container Apps} (why)
Pattern: {function chaining|fan-out/fan-in|async HTTP API|monitor|human interaction|aggregator}
Durable backend: {Azure Storage|Netherite|MSSQL|Durable Task Scheduler}
Idempotency: {how duplicates are handled}
```

### Completion Criteria
- [ ] Orchestrator code is deterministic (no I/O, no `DateTime.Now`, no random, no direct HTTP).
- [ ] Hosting plan matches duration, networking, and cold-start needs.
- [ ] Event handlers idempotent; dead-lettering configured for Event Grid subscriptions.

## Durable Functions Mechanics

- **Event sourcing + replay.** Every orchestration action (activity scheduled, completed, timer fired, external event received) is appended to a history. When the orchestrator awaits something, it unloads. When the result arrives, the orchestrator function **re-executes from the top**, and completed awaits return immediately from history.
- **Default backend (Azure Storage):** history and instance state in Azure Table Storage, work items via Azure Storage queues, large payloads in blobs. Alternative backends: Netherite, Microsoft SQL Server, and the managed Durable Task Scheduler.
- **Function types:** client (starts/queries instances), orchestrator (workflow logic), activity (the real work, may do I/O), entity (small durable state objects addressed by ID).

### Orchestrator Rules (replay safety)
| Do not | Use instead |
|---|---|
| `DateTime.UtcNow`, `new Date()` | `context.CurrentUtcDateTime` / `context.df.currentUtcDateTime` |
| `Guid.NewGuid()`, random numbers | `context.NewGuid()` or generate inside an activity |
| HTTP calls, DB queries, file I/O | Activity functions (or `CallHttpAsync` durable HTTP) |
| `Thread.Sleep`, `Task.Delay`, `setTimeout` | `context.CreateTimer(...)` |
| Unbounded loops creating huge history | `ContinueAsNew` to restart with fresh history |
| Logging without guard | `context.CreateReplaySafeLogger(...)` / check `IsReplaying` |

### Fan-out / Fan-in (.NET isolated worker)

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.DurableTask.Client;

public static class ResizeImages
{
    [Function(nameof(ResizeOrchestrator))]
    public static async Task<int> ResizeOrchestrator(
        [OrchestrationTrigger] TaskOrchestrationContext context)
    {
        string[] blobs = await context.CallActivityAsync<string[]>(nameof(ListBlobs), "incoming");

        var retry = TaskOptions.FromRetryPolicy(new RetryPolicy(
            maxNumberOfAttempts: 3, firstRetryInterval: TimeSpan.FromSeconds(5)));

        var tasks = blobs.Select(b => context.CallActivityAsync<long>(nameof(Resize), b, retry));
        long[] sizes = await Task.WhenAll(tasks);          // fan-in
        return sizes.Length;
    }

    [Function(nameof(ListBlobs))]
    public static string[] ListBlobs([ActivityTrigger] string container) =>
        BlobLister.List(container);                       // I/O allowed in activities

    [Function(nameof(Resize))]
    public static long Resize([ActivityTrigger] string blobName) =>
        ImageResizer.Resize(blobName);

    [Function("ResizeStart")]
    public static async Task<HttpResponseData> Start(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req,
        [DurableClient] DurableTaskClient client)
    {
        string id = await client.ScheduleNewOrchestrationInstanceAsync(nameof(ResizeOrchestrator));
        return await client.CreateCheckStatusResponseAsync(req, id); // 202 + status URLs
    }
}
```
`BlobLister` and `ImageResizer` are your own services; the orchestrator never touches storage directly.

## Event Grid Delivery Semantics
- Push model over HTTPS (or to Azure Functions, queues, Event Hubs, Service Bus).
- At-least-once delivery; default retry policy: up to 30 delivery attempts within a 1,440-minute (24 h) event time-to-live, with exponential backoff.
- Configure a dead-letter destination (storage blob container) on the subscription; without it, events that exhaust retries are dropped.
- Use the CloudEvents 1.0 schema for new topics; filter with subject prefix/suffix and advanced filters to avoid waking functions needlessly.

## Hosting Plan Decision
| Plan | Scale to zero | VNet integration | Notes |
|---|---|---|---|
| Flex Consumption | Yes | Yes | Recommended serverless plan for new Linux apps; per-function scaling, always-ready instances optional |
| Consumption (Windows/legacy Linux) | Yes | No | Linux Consumption is legacy—prefer Flex Consumption for new work |
| Premium (Elastic Premium) | No (min 1 warm) | Yes | Pre-warmed instances, longer executions |
| Dedicated (App Service plan) | No | Yes | Predictable cost when you already run App Service |
| Azure Container Apps | Yes | Yes | Functions in containers alongside other microservices |

Durable Functions orchestrations can run for days; individual activity executions are still bound by the plan's function timeout.

## Anti-Patterns
- Calling activities in an un-awaited loop and then awaiting nothing → work never scheduled reliably.
- Passing multi-MB payloads between activities → history bloat; pass blob references.
- Using in-process .NET model for new apps → its support ends 10 November 2026; use the isolated worker model.
- One giant orchestration with thousands of sequential steps → use sub-orchestrations or `ContinueAsNew`.

## Checklist
- [ ] Orchestrator passes the determinism table above.
- [ ] Activity retries configured with `RetryPolicy`; activities idempotent.
- [ ] Event Grid subscription has dead-letter + filters.
- [ ] Application Insights enabled; Durable Functions monitor / Durable Task Scheduler dashboard used for instance inspection.
- [ ] Task hub name unique per app/slot sharing the same storage account.

## References
- Related skills: `skills/cloud-native/serverless-cold-starts/SKILL.md`, `skills/devops/serverless/SKILL.md`, `skills/devops/azure/SKILL.md`.
