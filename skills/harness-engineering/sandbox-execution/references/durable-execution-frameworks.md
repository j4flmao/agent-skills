# Durable Execution Frameworks

## Overview

Durable execution frameworks provide exactly-once execution semantics, automatic
crash recovery, and persistent workflow state for long-running agent operations.
Unlike ephemeral execution where a process crash means lost work, durable execution
records every state transition in a persistent event log, enabling automatic
replay and recovery from any failure point.

This reference covers Temporal, Restate, and custom durable execution patterns
specifically adapted for AI agent workloads—where executions may span hours,
involve non-deterministic LLM calls, and require human-in-the-loop approval gates.

## Core Concepts

### Event Sourcing for Agent Workflows

```
┌──────────────────────────────────────────────────────┐
│                 WORKFLOW EVENT LOG                     │
│                                                       │
│  Event 1: WorkflowStarted { input: "analyze data" }   │
│  Event 2: ActivityScheduled { name: "llm_call" }      │
│  Event 3: ActivityCompleted { result: "plan: ..." }    │
│  Event 4: ActivityScheduled { name: "sandbox_exec" }   │
│  Event 5: ActivityStarted { sandbox_id: "sbx-abc" }    │
│  ──── CRASH HERE ────                                  │
│  Event 5: ActivityCompleted { result: "output.csv" }   │  ← After recovery
│  Event 6: WorkflowCompleted { output: "report.pdf" }   │
└──────────────────────────────────────────────────────┘
```

The workflow replays events 1-4 deterministically, skipping already-completed
activities, then resumes execution from event 5.

### Key Properties

| Property | Description |
|----------|-------------|
| **Exactly-once semantics** | Activities execute at most once; results are cached in the event log |
| **Automatic recovery** | Worker crashes trigger automatic workflow replay on a healthy worker |
| **Durable timers** | Sleep/wait operations survive process restarts |
| **Visibility** | Full workflow history is queryable for debugging and auditing |
| **Versioning** | Workflow definitions can be versioned for backward-compatible updates |

## Temporal for Agent Systems

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    TEMPORAL CLUSTER                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │
│  │ Frontend   │  │ History    │  │ Matching Service       │  │
│  │ Service    │  │ Service    │  │ (Task Queue Routing)   │  │
│  └────────────┘  └────────────┘  └────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Persistence Layer                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │   │
│  │  │ Postgres │  │ Elastic  │  │ S3 (Archive)         │ │   │
│  │  │ (Events) │  │ (Visible)│  │                      │ │   │
│  │  └──────────┘  └──────────┘  └──────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
        ┌────────────────┐    ┌────────────────┐
        │ Agent Worker 1 │    │ Agent Worker 2 │
        │ ┌────────────┐ │    │ ┌────────────┐ │
        │ │ Workflow   │ │    │ │ Workflow   │ │
        │ │ Definitions│ │    │ │ Definitions│ │
        │ ├────────────┤ │    │ ├────────────┤ │
        │ │ Activity   │ │    │ │ Activity   │ │
        │ │ Handlers   │ │    │ │ Handlers   │ │
        │ └────────────┘ │    │ └────────────┘ │
        └────────────────┘    └────────────────┘
```

### Python SDK Integration

```python
import asyncio
from datetime import timedelta
from temporalio import workflow, activity
from temporalio.client import Client
from temporalio.worker import Worker
from dataclasses import dataclass
from typing import Any


# ─── Data Classes ───────────────────────────────────────────

@dataclass
class AgentTaskInput:
    task_description: str
    agent_id: str
    model: str = "claude-sonnet-4-20250514"
    max_reasoning_steps: int = 20
    sandbox_config: dict | None = None
    timeout_s: int = 3600


@dataclass
class AgentTaskOutput:
    result: str
    reasoning_trace: list[dict]
    resource_usage: dict
    total_cost_usd: float
    total_duration_s: float


@dataclass
class LLMCallInput:
    model: str
    messages: list[dict]
    temperature: float = 0.7
    max_tokens: int = 4096


@dataclass
class LLMCallOutput:
    content: str
    tokens_in: int
    tokens_out: int
    cost_usd: float
    latency_ms: int


@dataclass
class SandboxExecInput:
    code: str
    language: str = "python"
    timeout_s: int = 300
    sandbox_config: dict | None = None


@dataclass
class SandboxExecOutput:
    stdout: str
    stderr: str
    exit_code: int
    artifacts: list[str]
    resource_usage: dict


# ─── Activities ─────────────────────────────────────────────

@activity.defn
async def llm_call_activity(input: LLMCallInput) -> LLMCallOutput:
    """
    Execute an LLM call as a Temporal activity.

    This activity is idempotent when called with the same input.
    Temporal handles retries automatically on transient failures
    (network errors, rate limits).
    """
    import anthropic

    client = anthropic.AsyncAnthropic()

    activity.heartbeat("Starting LLM call")

    response = await client.messages.create(
        model=input.model,
        messages=input.messages,
        temperature=input.temperature,
        max_tokens=input.max_tokens,
    )

    activity.heartbeat("LLM call completed")

    return LLMCallOutput(
        content=response.content[0].text,
        tokens_in=response.usage.input_tokens,
        tokens_out=response.usage.output_tokens,
        cost_usd=_calculate_cost(
            input.model, response.usage.input_tokens, response.usage.output_tokens
        ),
        latency_ms=int(response._response.elapsed.total_seconds() * 1000),
    )


@activity.defn
async def sandbox_exec_activity(input: SandboxExecInput) -> SandboxExecOutput:
    """
    Execute code in a sandboxed environment as a Temporal activity.

    The sandbox is created, code is executed, and the sandbox is destroyed
    within a single activity execution. For long-running sandbox tasks,
    heartbeats are sent to prevent Temporal from timing out the activity.
    """
    from sandbox_provider import SandboxToolProvider

    provider = SandboxToolProvider.get_instance()

    # Create sandbox
    sandbox = await provider.create(input.sandbox_config or {})
    sandbox_id = sandbox["sandbox_id"]

    try:
        # Heartbeat periodically during execution
        async def heartbeat_loop():
            while True:
                activity.heartbeat(f"Executing in {sandbox_id}")
                await asyncio.sleep(10)

        heartbeat_task = asyncio.create_task(heartbeat_loop())

        # Execute code
        result = await provider.execute({
            "sandbox_id": sandbox_id,
            "code": input.code,
            "language": input.language,
            "timeout_s": input.timeout_s,
        })

        heartbeat_task.cancel()

        return SandboxExecOutput(
            stdout=result["stdout"],
            stderr=result["stderr"],
            exit_code=result["exit_code"],
            artifacts=result.get("artifacts", []),
            resource_usage=result.get("resource_usage", {}),
        )
    finally:
        await provider.destroy(sandbox_id)


@activity.defn
async def human_approval_activity(context: dict) -> bool:
    """
    Wait for human approval before proceeding.

    This activity blocks until a human approves or rejects the action
    via an external UI. Temporal's durable timer ensures the wait
    survives worker restarts.
    """
    approval_id = context["approval_id"]
    action_description = context["action_description"]

    # Send notification to approval channel
    await _send_approval_request(approval_id, action_description)

    # Poll for approval (with heartbeat to prevent timeout)
    while True:
        activity.heartbeat(f"Waiting for approval {approval_id}")
        status = await _check_approval_status(approval_id)
        if status in ("approved", "rejected"):
            return status == "approved"
        await asyncio.sleep(5)


# ─── Workflow Definition ────────────────────────────────────

@workflow.defn
class AgentTaskWorkflow:
    """
    Durable workflow for executing an agent task with automatic recovery.

    This workflow orchestrates the agent's reasoning loop as a series of
    Temporal activities. Each LLM call, tool invocation, and sandbox
    execution is recorded in the workflow's event history, enabling
    automatic recovery from any failure point.
    """

    def __init__(self):
        self._reasoning_trace: list[dict] = []
        self._total_cost: float = 0.0
        self._step_count: int = 0

    @workflow.run
    async def run(self, input: AgentTaskInput) -> AgentTaskOutput:
        """Execute the agent task with durable execution guarantees."""
        start_time = workflow.now()

        # Phase 1: Plan the task
        plan = await workflow.execute_activity(
            llm_call_activity,
            LLMCallInput(
                model=input.model,
                messages=[
                    {"role": "system", "content": "You are a planning agent."},
                    {"role": "user", "content": f"Plan this task: {input.task_description}"},
                ],
            ),
            start_to_close_timeout=timedelta(seconds=120),
            retry_policy=_default_retry_policy(),
        )
        self._record_step("thought", f"Plan: {plan.content}", plan.cost_usd)

        # Phase 2: Execute plan steps
        steps = self._parse_plan(plan.content)
        for step in steps:
            if self._step_count >= input.max_reasoning_steps:
                break

            if step["type"] == "code_execution":
                # Execute code in a sandbox
                exec_result = await workflow.execute_activity(
                    sandbox_exec_activity,
                    SandboxExecInput(
                        code=step["code"],
                        language=step.get("language", "python"),
                        sandbox_config=input.sandbox_config,
                    ),
                    start_to_close_timeout=timedelta(seconds=600),
                    heartbeat_timeout=timedelta(seconds=30),
                    retry_policy=_default_retry_policy(),
                )
                self._record_step(
                    "action",
                    f"Code execution: exit={exec_result.exit_code}",
                    0.0,
                )

            elif step["type"] == "llm_analysis":
                # Call LLM for analysis
                analysis = await workflow.execute_activity(
                    llm_call_activity,
                    LLMCallInput(
                        model=input.model,
                        messages=step["messages"],
                    ),
                    start_to_close_timeout=timedelta(seconds=120),
                    retry_policy=_default_retry_policy(),
                )
                self._record_step("thought", analysis.content, analysis.cost_usd)

            elif step["type"] == "human_approval":
                # Wait for human approval (survives worker restarts)
                approved = await workflow.execute_activity(
                    human_approval_activity,
                    {
                        "approval_id": f"approval-{workflow.info().workflow_id}-{self._step_count}",
                        "action_description": step["description"],
                    },
                    start_to_close_timeout=timedelta(hours=24),
                    heartbeat_timeout=timedelta(seconds=30),
                )
                if not approved:
                    self._record_step("result", "Task rejected by human reviewer", 0.0)
                    break

        # Phase 3: Generate final result
        final_result = await workflow.execute_activity(
            llm_call_activity,
            LLMCallInput(
                model=input.model,
                messages=[
                    {"role": "system", "content": "Summarize the completed task."},
                    {"role": "user", "content": str(self._reasoning_trace)},
                ],
            ),
            start_to_close_timeout=timedelta(seconds=120),
            retry_policy=_default_retry_policy(),
        )
        self._record_step("result", final_result.content, final_result.cost_usd)

        elapsed = (workflow.now() - start_time).total_seconds()

        return AgentTaskOutput(
            result=final_result.content,
            reasoning_trace=self._reasoning_trace,
            resource_usage={},
            total_cost_usd=self._total_cost,
            total_duration_s=elapsed,
        )

    @workflow.query
    def get_reasoning_trace(self) -> list[dict]:
        """Query the current reasoning trace (for live debugging)."""
        return self._reasoning_trace

    @workflow.query
    def get_cost(self) -> float:
        """Query the current accumulated cost."""
        return self._total_cost

    @workflow.signal
    async def cancel_task(self) -> None:
        """Signal the workflow to cancel gracefully."""
        self._record_step("result", "Task cancelled by signal", 0.0)

    def _record_step(self, step_type: str, content: str, cost: float) -> None:
        self._step_count += 1
        self._total_cost += cost
        self._reasoning_trace.append({
            "step_id": self._step_count,
            "type": step_type,
            "content": content,
            "cost_usd": cost,
            "timestamp": workflow.now().isoformat(),
        })

    def _parse_plan(self, plan_content: str) -> list[dict]:
        """Parse LLM plan output into executable steps."""
        # Implementation parses structured plan into step list
        return []


def _default_retry_policy():
    from temporalio.common import RetryPolicy
    return RetryPolicy(
        initial_interval=timedelta(seconds=1),
        backoff_coefficient=2.0,
        maximum_interval=timedelta(seconds=60),
        maximum_attempts=3,
        non_retryable_error_types=["ValueError", "PolicyViolationError"],
    )


def _calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost based on model pricing."""
    pricing = {
        "claude-sonnet-4-20250514": {"input": 3.0 / 1_000_000, "output": 15.0 / 1_000_000},
        "claude-haiku-35": {"input": 0.25 / 1_000_000, "output": 1.25 / 1_000_000},
        "gpt-4o": {"input": 2.5 / 1_000_000, "output": 10.0 / 1_000_000},
    }
    prices = pricing.get(model, {"input": 0, "output": 0})
    return input_tokens * prices["input"] + output_tokens * prices["output"]
```

### Worker Setup and Configuration

```python
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker


async def run_agent_worker():
    """Start a Temporal worker that processes agent task workflows."""

    # Connect to Temporal cluster
    client = await Client.connect(
        "localhost:7233",
        namespace="agent-production",
    )

    # Create and start worker
    worker = Worker(
        client,
        task_queue="agent-tasks",
        workflows=[AgentTaskWorkflow],
        activities=[
            llm_call_activity,
            sandbox_exec_activity,
            human_approval_activity,
        ],
        max_concurrent_activities=10,
        max_concurrent_workflow_tasks=5,
    )

    print("Agent worker started, listening on task queue: agent-tasks")
    await worker.run()


async def start_agent_task(
    client: Client,
    task_description: str,
    agent_id: str,
) -> str:
    """Start an agent task workflow and return the workflow ID."""
    import uuid

    workflow_id = f"agent-task-{uuid.uuid4().hex[:8]}"

    handle = await client.start_workflow(
        AgentTaskWorkflow.run,
        AgentTaskInput(
            task_description=task_description,
            agent_id=agent_id,
        ),
        id=workflow_id,
        task_queue="agent-tasks",
        execution_timeout=timedelta(hours=4),
    )

    return workflow_id


async def query_agent_progress(client: Client, workflow_id: str) -> dict:
    """Query the current progress of an agent task."""
    handle = client.get_workflow_handle(workflow_id)

    trace = await handle.query(AgentTaskWorkflow.get_reasoning_trace)
    cost = await handle.query(AgentTaskWorkflow.get_cost)

    return {
        "workflow_id": workflow_id,
        "steps_completed": len(trace),
        "current_cost_usd": cost,
        "last_step": trace[-1] if trace else None,
    }
```

## Restate Integration

Restate is a newer durable execution framework with a simpler programming model:

```typescript
import * as restate from "@restatedev/restate-sdk";

// Define the agent service
const agentService = restate.service({
  name: "agent-service",
  handlers: {
    executeTask: async (
      ctx: restate.Context,
      input: { taskDescription: string; agentId: string; model: string }
    ): Promise<AgentTaskOutput> => {
      const reasoningTrace: ReasoningStep[] = [];
      let totalCost = 0;

      // Phase 1: Planning (durable - survives crashes)
      const plan = await ctx.run("llm-plan", async () => {
        const response = await callLLM({
          model: input.model,
          messages: [
            { role: "system", content: "You are a planning agent." },
            {
              role: "user",
              content: `Plan this task: ${input.taskDescription}`,
            },
          ],
        });
        return response;
      });

      reasoningTrace.push({
        stepId: 1,
        type: "thought",
        content: plan.content,
        costUsd: plan.costUsd,
      });
      totalCost += plan.costUsd;

      // Phase 2: Execute plan steps
      const steps = parsePlan(plan.content);
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        if (step.type === "code_execution") {
          // Durable sandbox execution
          const execResult = await ctx.run(
            `sandbox-exec-${i}`,
            async () => {
              return await executeSandbox({
                code: step.code,
                language: step.language || "python",
                timeoutS: 300,
              });
            }
          );

          reasoningTrace.push({
            stepId: i + 2,
            type: "action",
            content: `Code execution: exit=${execResult.exitCode}`,
            costUsd: 0,
          });
        } else if (step.type === "llm_analysis") {
          // Durable LLM call
          const analysis = await ctx.run(
            `llm-analysis-${i}`,
            async () => {
              return await callLLM({
                model: input.model,
                messages: step.messages,
              });
            }
          );

          reasoningTrace.push({
            stepId: i + 2,
            type: "thought",
            content: analysis.content,
            costUsd: analysis.costUsd,
          });
          totalCost += analysis.costUsd;
        } else if (step.type === "human_approval") {
          // Durable awakeable - wait for external signal
          const { id: awakeableId, promise } = ctx.awakeable<boolean>();

          // Send approval request (side effect)
          await ctx.run("send-approval-request", async () => {
            await sendApprovalRequest(awakeableId, step.description);
          });

          // Wait for approval (survives restarts)
          const approved = await promise;
          if (!approved) {
            break;
          }
        }

        // Durable sleep between steps (survives restarts)
        await ctx.sleep(100); // 100ms between steps
      }

      return {
        result: reasoningTrace[reasoningTrace.length - 1]?.content || "",
        reasoningTrace,
        totalCostUsd: totalCost,
      };
    },

    // Handle approval callbacks
    approveTask: async (
      ctx: restate.Context,
      input: { awakeableId: string; approved: boolean }
    ) => {
      ctx.resolveAwakeable(input.awakeableId, input.approved);
    },
  },
});

// Start the Restate server
restate
  .endpoint()
  .bind(agentService)
  .listen(9080);
```

## Determinism Requirements

Durable execution replay requires deterministic workflow code. This creates
challenges for agent systems:

### Non-Deterministic Operations (Must Be Activities)

```python
# These operations MUST be wrapped in activities because they are non-deterministic:

# 1. LLM calls (non-deterministic by nature)
# WRONG: Calling LLM directly in workflow code
@workflow.defn
class BadWorkflow:
    @workflow.run
    async def run(self, input):
        # This will fail on replay because LLM responses are non-deterministic
        response = await anthropic.messages.create(...)  # WRONG!

# CORRECT: LLM calls wrapped in activities
@activity.defn
async def llm_call(input: LLMCallInput) -> LLMCallOutput:
    response = await anthropic.messages.create(...)
    return LLMCallOutput(content=response.content[0].text, ...)

@workflow.defn
class GoodWorkflow:
    @workflow.run
    async def run(self, input):
        result = await workflow.execute_activity(llm_call, ...)  # CORRECT!

# 2. Current time (use workflow.now() instead of datetime.now())
# 3. Random numbers (use workflow-seeded RNG)
# 4. File I/O, network calls, database queries
# 5. UUID generation (use deterministic ID generation)
```

### Workflow Versioning

When updating workflow logic for deployed workflows:

```python
@workflow.defn
class VersionedAgentWorkflow:
    @workflow.run
    async def run(self, input: AgentTaskInput) -> AgentTaskOutput:
        # Use patching for backward-compatible changes
        if workflow.patched("v2-improved-planning"):
            # New planning logic
            plan = await workflow.execute_activity(
                improved_planning_activity, input,
                start_to_close_timeout=timedelta(seconds=180),
            )
        else:
            # Original planning logic (for replaying old workflows)
            plan = await workflow.execute_activity(
                llm_call_activity, LLMCallInput(...),
                start_to_close_timeout=timedelta(seconds=120),
            )

        # Common execution continues...
        return await self._execute_plan(plan)
```

## Deployment Configuration

### Temporal Server Configuration

```yaml
# temporal-server-config.yaml
persistence:
  defaultStore: postgres
  visibilityStore: elasticsearch
  datastores:
    postgres:
      sql:
        pluginName: postgres
        databaseName: temporal
        connectAddr: "postgres:5432"
        user: temporal
        password: "${TEMPORAL_DB_PASSWORD}"
        maxConns: 20
        maxIdleConns: 5
    elasticsearch:
      elasticsearch:
        version: v7
        url:
          scheme: https
          host: "elasticsearch:9200"
        indices:
          visibility: temporal_visibility_v1

global:
  membership:
    maxJoinDuration: 30s
  pprof:
    port: 7936

services:
  frontend:
    rpc:
      grpcPort: 7233
      membershipPort: 6933
      bindOnLocalHost: false
    metrics:
      prometheus:
        timerType: histogram
        listenAddress: "0.0.0.0:9090"

  history:
    rpc:
      grpcPort: 7234
      membershipPort: 6934
    metrics:
      prometheus:
        timerType: histogram
        listenAddress: "0.0.0.0:9091"

  matching:
    rpc:
      grpcPort: 7235
      membershipPort: 6935

  worker:
    rpc:
      grpcPort: 7239
      membershipPort: 6939
```

### Worker Deployment (Kubernetes)

```yaml
# agent-worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-temporal-worker
  namespace: agent-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-temporal-worker
  template:
    metadata:
      labels:
        app: agent-temporal-worker
    spec:
      containers:
        - name: worker
          image: agent-system/temporal-worker:latest
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          env:
            - name: TEMPORAL_HOST
              value: "temporal-frontend.temporal.svc.cluster.local:7233"
            - name: TEMPORAL_NAMESPACE
              value: "agent-production"
            - name: TEMPORAL_TASK_QUEUE
              value: "agent-tasks"
            - name: MAX_CONCURRENT_ACTIVITIES
              value: "10"
            - name: MAX_CONCURRENT_WORKFLOWS
              value: "5"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

## Error Handling Patterns

### Retry Policies for Agent Activities

```python
from temporalio.common import RetryPolicy
from datetime import timedelta

# LLM calls: retry on transient errors, not on content policy violations
llm_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(seconds=30),
    maximum_attempts=5,
    non_retryable_error_types=[
        "ContentPolicyViolation",
        "InvalidRequestError",
        "AuthenticationError",
    ],
)

# Sandbox execution: retry on infrastructure errors, not on code errors
sandbox_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(seconds=60),
    maximum_attempts=3,
    non_retryable_error_types=[
        "CodeExecutionError",     # Agent's code failed, retrying won't help
        "PolicyViolationError",   # Security policy violation
    ],
)

# Human approval: no retries (just wait)
approval_retry_policy = RetryPolicy(
    maximum_attempts=1,
)
```

### Saga Pattern for Multi-Sandbox Workflows

```python
@workflow.defn
class MultiSandboxSagaWorkflow:
    """
    Implements the Saga pattern for workflows that create multiple
    sandboxes. If any step fails, compensating actions clean up
    all previously created sandboxes.
    """

    @workflow.run
    async def run(self, input: MultiSandboxInput) -> dict:
        created_sandboxes: list[str] = []
        compensations: list[tuple] = []

        try:
            # Step 1: Create data processing sandbox
            data_sandbox = await workflow.execute_activity(
                create_sandbox_activity,
                {"type": "data-processing", "cpu": 4, "memory_mb": 8192},
                start_to_close_timeout=timedelta(seconds=60),
            )
            created_sandboxes.append(data_sandbox["sandbox_id"])
            compensations.append(("destroy_sandbox", data_sandbox["sandbox_id"]))

            # Step 2: Create analysis sandbox
            analysis_sandbox = await workflow.execute_activity(
                create_sandbox_activity,
                {"type": "analysis", "cpu": 2, "memory_mb": 4096},
                start_to_close_timeout=timedelta(seconds=60),
            )
            created_sandboxes.append(analysis_sandbox["sandbox_id"])
            compensations.append(("destroy_sandbox", analysis_sandbox["sandbox_id"]))

            # Step 3: Execute pipeline
            result = await workflow.execute_activity(
                execute_pipeline_activity,
                {
                    "data_sandbox_id": data_sandbox["sandbox_id"],
                    "analysis_sandbox_id": analysis_sandbox["sandbox_id"],
                    "pipeline": input.pipeline_definition,
                },
                start_to_close_timeout=timedelta(seconds=1800),
                heartbeat_timeout=timedelta(seconds=30),
            )

            return result

        except Exception as e:
            # Compensate: destroy all created sandboxes in reverse order
            for comp_action, sandbox_id in reversed(compensations):
                try:
                    await workflow.execute_activity(
                        destroy_sandbox_activity,
                        {"sandbox_id": sandbox_id},
                        start_to_close_timeout=timedelta(seconds=30),
                    )
                except Exception:
                    # Log but don't fail compensation
                    workflow.logger.error(
                        f"Failed to compensate sandbox {sandbox_id}"
                    )
            raise
```

## Best Practices

1. **Keep workflow code lightweight**: Workflows should only orchestrate activities,
   not perform heavy computation. All I/O and computation goes in activities.

2. **Use heartbeats for long-running activities**: Activities that run longer than
   30 seconds should send periodic heartbeats to prevent timeout.

3. **Design activities for idempotency**: Activities may be retried; ensure each
   activity produces the same result when called with the same input.

4. **Set appropriate timeouts**: Use `start_to_close_timeout` for maximum activity
   duration and `schedule_to_close_timeout` for total time including queue wait.

5. **Version workflow changes**: Use `workflow.patched()` for backward-compatible
   changes to workflow logic that has in-flight executions.

6. **Monitor workflow lag**: Track the time between activity scheduling and execution
   to detect worker capacity issues.

<!-- REFERENCE: durable-execution-frameworks | sandbox-execution | v2.0.0 -->
