# Temporal Workflows

## Architecture

### Core Components
- **Temporal Server**: stateful backend (PostgreSQL + Elasticsearch) managing workflow state and history
- **Worker**: application process executing workflow and activity code
- **Client**: SDK used to start workflows, send signals, query state
- **History**: append-only event log recording every step of a workflow execution

### Execution Model
```
Client → StartWorkflow → Temporal Server
    ↓                        ↓
Worker ← Poll Workflow ← History Store (Postgres)
    ↓
Worker → Execute Activities → Temporal Server (records events)
    ↓
Worker ← Complete ← History Store
```

## Workflow and Activity Patterns

### Basic Workflow
```python
from temporalio import workflow, activity
from temporalio.client import Client
from temporalio.worker import Worker
import asyncio

@activity.defn
async def process_order(order_id: str) -> str:
    # Idempotent activity — may be retried
    return f"Processed: {order_id}"

@workflow.defn
class OrderWorkflow:
    @workflow.run
    async def run(self, order_id: str) -> str:
        # Workflow code is durable and fault-tolerant
        result = await workflow.execute_activity(
            process_order,
            order_id,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(seconds=100),
                maximum_attempts=10,
                backoff_coefficient=2.0,
            ),
        )
        return result
```

### Signal and Query
```python
@workflow.defn
class ApprovalWorkflow:
    def __init__(self):
        self.approved = False
        self.status = "pending"

    @workflow.run
    async def run(self, pipeline_id: str) -> str:
        await workflow.wait_condition(lambda: self.approved)
        self.status = "approved"
        return f"Pipeline {pipeline_id} approved"

    @workflow.signal
    async def approve(self):
        self.approved = True

    @workflow.query
    def get_status(self) -> str:
        return self.status

# Client: start and signal
client = await Client.connect("localhost:7233")
handle = await client.start_workflow(
    ApprovalWorkflow.run,
    "pipeline-123",
    id="pipeline-approval-123",
    task_queue="data-pipeline-tasks",
)
await handle.signal(ApprovalWorkflow.approve)
status = await handle.query(ApprovalWorkflow.get_status)
```

## Data Pipeline Patterns

### Fan-Out/Fan-In
```python
@workflow.defn
class ParallelETLWorkflow:
    @workflow.run
    async def run(self, sources: list[str]) -> dict:
        # Fan-out: run activities in parallel
        results = await asyncio.gather(*[
            workflow.execute_activity(
                process_source, s,
                start_to_close_timeout=timedelta(hours=1),
            )
            for s in sources
        ])
        # Fan-in: aggregate
        final = await workflow.execute_activity(
            aggregate_results, results,
            start_to_close_timeout=timedelta(minutes=10),
        )
        return final
```

### Human-in-the-Loop (Approval Gate)
```python
@workflow.defn
class DataDeployWorkflow:
    @workflow.run
    async def run(self, environment: str, deploy_id: str):
        # Stage 1: deploy to staging automatically
        staging_result = await workflow.execute_activity(
            deploy_to_staging, deploy_id,
            start_to_close_timeout=timedelta(minutes=30),
        )
        # Stage 2: wait for human approval (indefinite timeout)
        approved = False
        workflow.logger.info(f"Waiting for approval for {deploy_id}")

        @workflow.signal
        def approve():
            nonlocal approved
            approved = True

        await workflow.wait_condition(lambda: approved, timeout=timedelta(hours=24))
        # Stage 3: deploy to production
        prod_result = await workflow.execute_activity(
            deploy_to_production, deploy_id,
            start_to_close_timeout=timedelta(minutes=30),
        )
        return {"staging": staging_result, "prod": prod_result}
```

## Retry and Error Handling

| Pattern | Temporal Mechanism |
|---------|-------------------|
| Transient errors | Activity retry policy (exponential backoff, max attempts) |
| Business logic failure | Activity raises `ApplicationError` — workflow decides retry vs abandon |
| Timeout | `start_to_close_timeout` (activity runtime) + `schedule_to_close_timeout` (total) |
| Saga rollback | Workflow calls compensating activities on failure (explicit in workflow code) |

## Observability
- **tctl** (CLI): `tctl workflow describe --wid <id>`, `tctl workflow list`
- **Web UI** (built-in): visual workflow history, event timeline, stack traces
- **Metrics**: task queue backlog, workflow execution latency, poll success rate, sticky cache hits
