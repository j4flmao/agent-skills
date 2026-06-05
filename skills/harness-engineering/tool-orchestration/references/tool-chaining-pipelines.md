# Tool Chaining Pipelines

## Overview

Tool chaining pipelines enable agents to compose multiple tool calls into a coherent workflow where the output of one tool feeds into the input of the next. Without structured pipelines, agents make ad-hoc sequential calls with fragile data passing and no error recovery. This reference covers pipeline construction, data flow management, error handling, conditional branching, and parallel execution.

```
+--------+     +---------+     +----------+     +----------+     +---------+
|        |     |         |     |          |     |          |     |         |
| Input  |────►| Step 1  |────►| Step 2   |────►| Step 3   |────►| Output  |
|        |     | (read)  |     | (parse)  |     | (write)  |     |         |
+--------+     +---------+     +----------+     +----------+     +---------+
                    │               │                │
                    ▼               ▼                ▼
              [Intermediate   [Intermediate    [Intermediate
               Result 1]       Result 2]        Result 3]
                    │               │                │
                    └───────────────┴────────────────┘
                                    │
                              [Pipeline Context]
```

---

## Pipeline Construction

### Pipeline Data Model

```python
import uuid
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional
from enum import Enum


class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class PipelineStep:
    """
    A single step in a tool chaining pipeline.
    
    Each step wraps a tool call with input/output mapping,
    error handling, and optional conditions.
    """
    step_id: str
    tool_name: str
    description: str
    input_mapping: dict[str, str] = field(default_factory=dict)
    static_params: dict[str, Any] = field(default_factory=dict)
    output_key: str = ""
    condition: Optional[Callable[["PipelineContext"], bool]] = None
    on_error: str = "fail"  # "fail", "skip", "retry", "fallback"
    retry_count: int = 0
    max_retries: int = 3
    fallback_tool: Optional[str] = None
    timeout_ms: int = 30_000
    status: StepStatus = StepStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    started_at: Optional[float] = None
    completed_at: Optional[float] = None


@dataclass
class PipelineContext:
    """
    Shared context that flows through all pipeline steps.
    
    Stores intermediate results, metadata, and provides
    data resolution for input mappings.
    """
    pipeline_id: str = field(
        default_factory=lambda: f"pipe_{uuid.uuid4().hex[:12]}"
    )
    data: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    step_results: dict[str, Any] = field(default_factory=dict)
    errors: list[dict[str, Any]] = field(default_factory=list)
    started_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None

    def set(self, key: str, value: Any) -> None:
        """Store a value in the pipeline context."""
        self.data[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        """Retrieve a value from the pipeline context."""
        return self.data.get(key, default)

    def resolve_input(self, mapping: dict[str, str], static: dict[str, Any]) -> dict[str, Any]:
        """
        Resolve input parameters for a step.
        
        Mapping format:
        - "param_name": "context_key" → reads from context.data[context_key]
        - "param_name": "$step_id.field" → reads from step_results[step_id][field]
        - "param_name": "literal:value" → uses literal value
        """
        resolved = dict(static)
        for param_name, source in mapping.items():
            if source.startswith("$"):
                # Reference to a step result
                parts = source[1:].split(".", 1)
                step_id = parts[0]
                field_path = parts[1] if len(parts) > 1 else None

                step_result = self.step_results.get(step_id)
                if step_result is not None and field_path:
                    # Navigate nested fields
                    value = step_result
                    for key in field_path.split("."):
                        if isinstance(value, dict):
                            value = value.get(key)
                        else:
                            value = None
                            break
                    resolved[param_name] = value
                elif step_result is not None:
                    resolved[param_name] = step_result
            elif source.startswith("literal:"):
                resolved[param_name] = source[8:]
            else:
                resolved[param_name] = self.data.get(source)

        return resolved


@dataclass
class Pipeline:
    """
    A complete tool chaining pipeline definition.
    
    Pipelines consist of ordered steps with data flow mappings,
    conditional execution, and error handling policies.
    """
    name: str
    description: str
    steps: list[PipelineStep] = field(default_factory=list)
    pipeline_id: str = field(
        default_factory=lambda: f"pipe_{uuid.uuid4().hex[:12]}"
    )
    created_at: float = field(default_factory=time.time)
    max_total_duration_ms: int = 300_000  # 5 minutes

    def add_step(
        self,
        tool_name: str,
        description: str,
        input_mapping: Optional[dict[str, str]] = None,
        static_params: Optional[dict[str, Any]] = None,
        output_key: Optional[str] = None,
        condition: Optional[Callable[[PipelineContext], bool]] = None,
        on_error: str = "fail",
        max_retries: int = 3,
        fallback_tool: Optional[str] = None,
        timeout_ms: int = 30_000,
    ) -> "Pipeline":
        """Add a step to the pipeline. Returns self for chaining."""
        step_id = f"step_{len(self.steps)}"
        step = PipelineStep(
            step_id=step_id,
            tool_name=tool_name,
            description=description,
            input_mapping=input_mapping or {},
            static_params=static_params or {},
            output_key=output_key or step_id,
            condition=condition,
            on_error=on_error,
            max_retries=max_retries,
            fallback_tool=fallback_tool,
            timeout_ms=timeout_ms,
        )
        self.steps.append(step)
        return self

    def validate(self) -> list[str]:
        """Validate the pipeline definition for structural errors."""
        errors = []
        output_keys = set()
        step_ids = set()

        for i, step in enumerate(self.steps):
            if step.step_id in step_ids:
                errors.append(f"Duplicate step ID: {step.step_id}")
            step_ids.add(step.step_id)

            if step.output_key in output_keys:
                errors.append(
                    f"Step {step.step_id}: duplicate output key '{step.output_key}'"
                )
            output_keys.add(step.output_key)

            # Check that input mappings reference valid prior steps
            for param, source in step.input_mapping.items():
                if source.startswith("$"):
                    ref_step = source[1:].split(".")[0]
                    prior_ids = {s.step_id for s in self.steps[:i]}
                    if ref_step not in prior_ids:
                        errors.append(
                            f"Step {step.step_id}: input '{param}' references "
                            f"unknown or future step '{ref_step}'"
                        )

        return errors
```

### Pipeline Builder (Fluent API)

```typescript
interface PipelineStepConfig {
  stepId: string;
  toolName: string;
  description: string;
  inputMapping: Record<string, string>;
  staticParams: Record<string, unknown>;
  outputKey: string;
  condition?: (ctx: PipelineContext) => boolean;
  onError: "fail" | "skip" | "retry" | "fallback";
  maxRetries: number;
  fallbackTool?: string;
  timeoutMs: number;
}

interface PipelineContext {
  pipelineId: string;
  data: Record<string, unknown>;
  stepResults: Record<string, unknown>;
  errors: Array<{ stepId: string; error: string }>;
}

class PipelineBuilder {
  private name: string;
  private description: string;
  private steps: PipelineStepConfig[] = [];
  private stepCounter = 0;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  addStep(config: {
    toolName: string;
    description: string;
    inputMapping?: Record<string, string>;
    staticParams?: Record<string, unknown>;
    outputKey?: string;
    condition?: (ctx: PipelineContext) => boolean;
    onError?: "fail" | "skip" | "retry" | "fallback";
    maxRetries?: number;
    fallbackTool?: string;
    timeoutMs?: number;
  }): PipelineBuilder {
    const stepId = `step_${this.stepCounter++}`;
    this.steps.push({
      stepId,
      toolName: config.toolName,
      description: config.description,
      inputMapping: config.inputMapping ?? {},
      staticParams: config.staticParams ?? {},
      outputKey: config.outputKey ?? stepId,
      condition: config.condition,
      onError: config.onError ?? "fail",
      maxRetries: config.maxRetries ?? 3,
      fallbackTool: config.fallbackTool,
      timeoutMs: config.timeoutMs ?? 30_000,
    });
    return this;
  }

  build(): { name: string; steps: PipelineStepConfig[] } {
    return { name: this.name, steps: [...this.steps] };
  }
}

// Usage: Build a "read → transform → write" pipeline
const pipeline = new PipelineBuilder(
  "config-migration",
  "Read config, transform format, write to new location"
)
  .addStep({
    toolName: "file_read",
    description: "Read the source configuration file",
    staticParams: { path: "/app/config.yaml" },
    outputKey: "source_content",
  })
  .addStep({
    toolName: "transform_yaml_to_json",
    description: "Convert YAML config to JSON format",
    inputMapping: { content: "$step_0.text" },
    outputKey: "transformed_content",
    onError: "fail",
  })
  .addStep({
    toolName: "file_write",
    description: "Write transformed config to destination",
    inputMapping: { content: "$step_1.result" },
    staticParams: { path: "/app/config.json", createDirectories: true },
    outputKey: "write_result",
  })
  .build();
```

---

## Data Flow Between Tools

### Data Flow Patterns

```
Pattern 1: Linear Chain
  Step A ──[output]──► Step B ──[output]──► Step C

Pattern 2: Fan-Out (one output feeds multiple steps)
                          ┌──► Step B
  Step A ──[output]───────┤
                          └──► Step C

Pattern 3: Fan-In (multiple outputs feed one step)
  Step A ──[output_a]──┐
                       ├──► Step C
  Step B ──[output_b]──┘

Pattern 4: Diamond (fan-out + fan-in)
                          ┌──► Step B ──┐
  Step A ──[output]───────┤             ├──► Step D
                          └──► Step C ──┘
```

### Data Flow Resolver

```python
import copy
from typing import Any, Optional


class DataFlowResolver:
    """
    Resolves data dependencies between pipeline steps.
    
    Supports:
    - Direct output references ($step_id.field)
    - Context variable references (context_key)
    - Literal values (literal:value)
    - JSONPath-like nested access ($step_id.field.nested.path)
    - Default values with fallback ($step_id.field|default_value)
    """

    def __init__(self, context: PipelineContext):
        self.context = context

    def resolve(
        self,
        mapping: dict[str, str],
        static_params: dict[str, Any],
    ) -> dict[str, Any]:
        """Resolve all input parameters for a pipeline step."""
        resolved = dict(static_params)

        for param_name, source_expr in mapping.items():
            resolved[param_name] = self._resolve_expression(source_expr)

        return resolved

    def _resolve_expression(self, expr: str) -> Any:
        """Resolve a single data flow expression."""
        # Literal value
        if expr.startswith("literal:"):
            return expr[8:]

        # Check for default value
        default = None
        if "|" in expr and expr.startswith("$"):
            expr, default = expr.rsplit("|", 1)

        # Step result reference
        if expr.startswith("$"):
            value = self._resolve_step_ref(expr[1:])
            return value if value is not None else default

        # Context data reference
        value = self.context.data.get(expr)
        return value if value is not None else default

    def _resolve_step_ref(self, ref: str) -> Any:
        """Resolve a step result reference like 'step_0.content.text'."""
        parts = ref.split(".")
        step_id = parts[0]

        value = self.context.step_results.get(step_id)
        if value is None:
            return None

        # Navigate nested path
        for key in parts[1:]:
            if isinstance(value, dict):
                value = value.get(key)
            elif isinstance(value, list):
                try:
                    idx = int(key)
                    value = value[idx]
                except (ValueError, IndexError):
                    return None
            else:
                return None

        return copy.deepcopy(value)  # Prevent mutation of stored results

    def validate_dependencies(
        self,
        step: PipelineStep,
        completed_steps: set[str],
    ) -> list[str]:
        """Check that all input dependencies are satisfied."""
        errors = []
        for param, source in step.input_mapping.items():
            if source.startswith("$"):
                ref_step = source[1:].split(".")[0]
                if ref_step not in completed_steps:
                    errors.append(
                        f"Step '{step.step_id}' depends on '{ref_step}' "
                        f"which has not completed"
                    )
        return errors
```

---

## Pipeline Executor

```python
import time
import traceback
from typing import Any, Callable, Optional


class PipelineExecutor:
    """
    Executes a tool chaining pipeline with full lifecycle management.
    
    Features:
    - Sequential and conditional step execution
    - Intermediate result storage in pipeline context
    - Configurable error handling per step (fail/skip/retry/fallback)
    - Execution timing and metrics
    - Pipeline-level timeout enforcement
    """

    def __init__(
        self,
        tool_caller: Callable[[str, dict[str, Any]], Any],
    ):
        """
        Args:
            tool_caller: Function that executes a tool call.
                         Signature: (tool_name, params) -> result
        """
        self._tool_caller = tool_caller

    def execute(
        self,
        pipeline: Pipeline,
        initial_context: Optional[dict[str, Any]] = None,
    ) -> PipelineContext:
        """
        Execute the full pipeline.
        
        Returns the pipeline context with all intermediate results.
        """
        context = PipelineContext()
        if initial_context:
            context.data.update(initial_context)

        resolver = DataFlowResolver(context)
        pipeline_start = time.monotonic()

        print(f"[Pipeline] Starting '{pipeline.name}' ({pipeline.pipeline_id})")
        print(f"[Pipeline] Steps: {len(pipeline.steps)}")

        for step in pipeline.steps:
            # Check pipeline-level timeout
            elapsed_ms = (time.monotonic() - pipeline_start) * 1000
            if elapsed_ms > pipeline.max_total_duration_ms:
                step.status = StepStatus.FAILED
                step.error = "Pipeline timeout exceeded"
                context.errors.append({
                    "step_id": step.step_id,
                    "error": step.error,
                    "type": "timeout",
                })
                break

            # Evaluate step condition
            if step.condition and not step.condition(context):
                step.status = StepStatus.SKIPPED
                print(f"[Pipeline] Step '{step.step_id}' SKIPPED (condition not met)")
                continue

            # Execute the step
            self._execute_step(step, context, resolver)

            # Handle step failure
            if step.status == StepStatus.FAILED:
                if step.on_error == "fail":
                    print(f"[Pipeline] ABORTED at step '{step.step_id}': {step.error}")
                    break
                elif step.on_error == "skip":
                    print(f"[Pipeline] Step '{step.step_id}' failed, skipping")
                    continue

        context.completed_at = time.time()
        total_ms = (time.monotonic() - pipeline_start) * 1000
        completed = sum(1 for s in pipeline.steps if s.status == StepStatus.COMPLETED)
        failed = sum(1 for s in pipeline.steps if s.status == StepStatus.FAILED)
        skipped = sum(1 for s in pipeline.steps if s.status == StepStatus.SKIPPED)

        print(f"[Pipeline] Completed in {total_ms:.1f}ms")
        print(f"[Pipeline] Results: {completed} completed, {failed} failed, {skipped} skipped")

        return context

    def _execute_step(
        self,
        step: PipelineStep,
        context: PipelineContext,
        resolver: DataFlowResolver,
    ) -> None:
        """Execute a single pipeline step with retry logic."""
        step.status = StepStatus.RUNNING
        step.started_at = time.time()

        # Resolve input parameters
        try:
            params = resolver.resolve(step.input_mapping, step.static_params)
        except Exception as e:
            step.status = StepStatus.FAILED
            step.error = f"Input resolution failed: {e}"
            context.errors.append({
                "step_id": step.step_id,
                "error": step.error,
                "type": "input_resolution",
            })
            return

        # Execute with retries
        last_error = None
        for attempt in range(step.max_retries + 1):
            try:
                start = time.monotonic()
                result = self._tool_caller(step.tool_name, params)
                duration = (time.monotonic() - start) * 1000

                step.status = StepStatus.COMPLETED
                step.result = result
                step.duration_ms = duration
                step.completed_at = time.time()
                step.retry_count = attempt

                # Store result in context
                context.step_results[step.step_id] = result
                if step.output_key:
                    context.data[step.output_key] = result

                print(
                    f"[Pipeline] Step '{step.step_id}' ({step.tool_name}) "
                    f"COMPLETED in {duration:.1f}ms"
                    f"{f' (attempt {attempt + 1})' if attempt > 0 else ''}"
                )
                return

            except Exception as e:
                last_error = str(e)
                if attempt < step.max_retries and step.on_error == "retry":
                    wait = min(2 ** attempt * 100, 5000) / 1000
                    print(
                        f"[Pipeline] Step '{step.step_id}' attempt {attempt + 1} "
                        f"failed: {last_error}. Retrying in {wait:.1f}s..."
                    )
                    time.sleep(wait)

        # All retries exhausted — try fallback
        if step.fallback_tool and step.on_error == "fallback":
            print(
                f"[Pipeline] Step '{step.step_id}' falling back to "
                f"'{step.fallback_tool}'"
            )
            try:
                start = time.monotonic()
                result = self._tool_caller(step.fallback_tool, params)
                duration = (time.monotonic() - start) * 1000

                step.status = StepStatus.COMPLETED
                step.result = result
                step.duration_ms = duration
                step.completed_at = time.time()

                context.step_results[step.step_id] = result
                if step.output_key:
                    context.data[step.output_key] = result
                return
            except Exception as e:
                last_error = f"Fallback also failed: {e}"

        # Step failed
        step.status = StepStatus.FAILED
        step.error = last_error
        step.completed_at = time.time()
        context.errors.append({
            "step_id": step.step_id,
            "error": last_error,
            "type": "execution",
            "retries": step.retry_count,
        })
```

---

## Conditional Branching

Conditional branching allows pipelines to execute different steps based on intermediate results.

```
                    ┌─── condition A ───► Step B1 ───┐
Step A ─[result]───┤                                 ├──► Step C
                    └─── condition B ───► Step B2 ───┘
```

### Branch Evaluator

```python
from typing import Callable, Optional


@dataclass
class ConditionalBranch:
    """A conditional branch in a pipeline."""
    branch_id: str
    condition: Callable[[PipelineContext], bool]
    steps: list[PipelineStep]
    description: str = ""


class BranchingPipelineExecutor(PipelineExecutor):
    """
    Extended pipeline executor with conditional branching support.
    
    Supports:
    - If/else branching based on intermediate results
    - Switch-case style multi-branch evaluation
    - Default fallback branches
    """

    def execute_with_branches(
        self,
        pipeline: Pipeline,
        branches: dict[str, list[ConditionalBranch]],
        initial_context: Optional[dict[str, Any]] = None,
    ) -> PipelineContext:
        """
        Execute a pipeline with conditional branches.
        
        Args:
            pipeline: Base pipeline definition
            branches: Map of step_id → list of conditional branches
                     evaluated after that step completes
            initial_context: Initial context data
        """
        context = PipelineContext()
        if initial_context:
            context.data.update(initial_context)

        resolver = DataFlowResolver(context)

        for step in pipeline.steps:
            # Execute the step
            self._execute_step(step, context, resolver)

            if step.status == StepStatus.FAILED and step.on_error == "fail":
                break

            # Check for branches after this step
            if step.step_id in branches:
                branch_steps = self._evaluate_branches(
                    branches[step.step_id], context
                )
                for branch_step in branch_steps:
                    self._execute_step(branch_step, context, resolver)
                    if (
                        branch_step.status == StepStatus.FAILED
                        and branch_step.on_error == "fail"
                    ):
                        break

        context.completed_at = time.time()
        return context

    def _evaluate_branches(
        self,
        branches: list[ConditionalBranch],
        context: PipelineContext,
    ) -> list[PipelineStep]:
        """Evaluate branches and return steps from the first matching branch."""
        for branch in branches:
            try:
                if branch.condition(context):
                    print(
                        f"[Pipeline] Branch '{branch.branch_id}' "
                        f"condition met: {branch.description}"
                    )
                    return branch.steps
            except Exception as e:
                print(
                    f"[Pipeline] Branch '{branch.branch_id}' "
                    f"condition error: {e}"
                )
                continue

        print("[Pipeline] No branch conditions matched, continuing")
        return []


# Usage: Branch based on file type detection
def is_yaml(ctx: PipelineContext) -> bool:
    content = ctx.get("source_content", "")
    return isinstance(content, str) and (
        content.strip().startswith("---") or ": " in content.split("\n")[0]
    )

def is_json(ctx: PipelineContext) -> bool:
    content = ctx.get("source_content", "")
    return isinstance(content, str) and content.strip().startswith("{")

branches = {
    "step_0": [
        ConditionalBranch(
            branch_id="yaml_path",
            condition=is_yaml,
            description="Source is YAML format",
            steps=[
                PipelineStep(
                    step_id="parse_yaml",
                    tool_name="parse_yaml",
                    description="Parse YAML content",
                    input_mapping={"content": "$step_0.text"},
                    output_key="parsed_data",
                ),
            ],
        ),
        ConditionalBranch(
            branch_id="json_path",
            condition=is_json,
            description="Source is JSON format",
            steps=[
                PipelineStep(
                    step_id="parse_json",
                    tool_name="parse_json",
                    description="Parse JSON content",
                    input_mapping={"content": "$step_0.text"},
                    output_key="parsed_data",
                ),
            ],
        ),
    ],
}
```

---

## Parallel Tool Execution

When pipeline steps have no data dependencies, they can execute in parallel to reduce total latency.

```
Sequential:     Step A ──► Step B ──► Step C ──► Step D
                [100ms]    [200ms]    [150ms]    [50ms]
                Total: 500ms

Parallel:       Step A ──► ┌── Step B ──┐ ──► Step D
                           └── Step C ──┘
                [100ms]     [200ms max]    [50ms]
                Total: 350ms
```

### Parallel Executor

```python
import concurrent.futures
from typing import Any, Callable


class ParallelStepGroup:
    """A group of pipeline steps that can execute in parallel."""

    def __init__(
        self,
        group_id: str,
        steps: list[PipelineStep],
        max_workers: int = 4,
    ):
        self.group_id = group_id
        self.steps = steps
        self.max_workers = min(max_workers, len(steps))


class ParallelPipelineExecutor:
    """
    Pipeline executor with parallel step execution support.
    
    Steps within a ParallelStepGroup execute concurrently using
    a thread pool. Results are collected and merged into the
    pipeline context before proceeding to the next step.
    """

    def __init__(
        self,
        tool_caller: Callable[[str, dict[str, Any]], Any],
    ):
        self._tool_caller = tool_caller

    def execute_parallel_group(
        self,
        group: ParallelStepGroup,
        context: PipelineContext,
    ) -> dict[str, Any]:
        """
        Execute a group of steps in parallel.
        
        Returns a dict mapping step_id to result (or error).
        """
        resolver = DataFlowResolver(context)
        results: dict[str, Any] = {}

        def execute_step(step: PipelineStep) -> tuple[str, Any, Optional[str]]:
            """Execute a single step, returning (step_id, result, error)."""
            try:
                params = resolver.resolve(step.input_mapping, step.static_params)
                start = time.monotonic()
                result = self._tool_caller(step.tool_name, params)
                duration = (time.monotonic() - start) * 1000

                step.status = StepStatus.COMPLETED
                step.result = result
                step.duration_ms = duration
                return step.step_id, result, None
            except Exception as e:
                step.status = StepStatus.FAILED
                step.error = str(e)
                return step.step_id, None, str(e)

        print(
            f"[Pipeline] Executing parallel group '{group.group_id}' "
            f"({len(group.steps)} steps, {group.max_workers} workers)"
        )

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=group.max_workers
        ) as executor:
            futures = {
                executor.submit(execute_step, step): step
                for step in group.steps
            }

            for future in concurrent.futures.as_completed(futures):
                step = futures[future]
                try:
                    step_id, result, error = future.result()
                    if error:
                        context.errors.append({
                            "step_id": step_id,
                            "error": error,
                            "type": "parallel_execution",
                        })
                    else:
                        context.step_results[step_id] = result
                        if step.output_key:
                            context.data[step.output_key] = result
                        results[step_id] = result
                except Exception as e:
                    context.errors.append({
                        "step_id": step.step_id,
                        "error": str(e),
                        "type": "parallel_future",
                    })

        completed = sum(
            1 for s in group.steps if s.status == StepStatus.COMPLETED
        )
        print(
            f"[Pipeline] Parallel group '{group.group_id}': "
            f"{completed}/{len(group.steps)} completed"
        )

        return results
```

### TypeScript Parallel Execution

```typescript
interface ParallelResult {
  stepId: string;
  result?: unknown;
  error?: string;
  durationMs: number;
}

async function executeParallelSteps(
  steps: PipelineStepConfig[],
  context: PipelineContext,
  toolCaller: (toolName: string, params: Record<string, unknown>) => Promise<unknown>
): Promise<ParallelResult[]> {
  const promises = steps.map(async (step): Promise<ParallelResult> => {
    const start = Date.now();
    try {
      const params = resolveInputs(step.inputMapping, step.staticParams, context);
      const result = await toolCaller(step.toolName, params);
      return {
        stepId: step.stepId,
        result,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        stepId: step.stepId,
        error: (error as Error).message,
        durationMs: Date.now() - start,
      };
    }
  });

  const results = await Promise.allSettled(promises);
  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { stepId: "unknown", error: String(r.reason), durationMs: 0 }
  );
}

function resolveInputs(
  mapping: Record<string, string>,
  staticParams: Record<string, unknown>,
  context: PipelineContext
): Record<string, unknown> {
  const resolved: Record<string, unknown> = { ...staticParams };

  for (const [param, source] of Object.entries(mapping)) {
    if (source.startsWith("$")) {
      const [stepId, ...fieldPath] = source.slice(1).split(".");
      let value: unknown = context.stepResults[stepId];
      for (const key of fieldPath) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[key];
        }
      }
      resolved[param] = value;
    } else if (source.startsWith("literal:")) {
      resolved[param] = source.slice(8);
    } else {
      resolved[param] = context.data[source];
    }
  }

  return resolved;
}
```

---

## Pipeline Visualization

### ASCII Pipeline Renderer

```python
from typing import Optional


class PipelineVisualizer:
    """Renders pipeline structure and execution status as ASCII art."""

    @staticmethod
    def render_pipeline(pipeline: Pipeline) -> str:
        """Render pipeline structure as an ASCII diagram."""
        lines = [
            f"Pipeline: {pipeline.name}",
            f"ID: {pipeline.pipeline_id}",
            f"Steps: {len(pipeline.steps)}",
            "=" * 60,
        ]

        for i, step in enumerate(pipeline.steps):
            status_icon = {
                StepStatus.PENDING: "○",
                StepStatus.RUNNING: "◐",
                StepStatus.COMPLETED: "●",
                StepStatus.FAILED: "✗",
                StepStatus.SKIPPED: "◌",
            }.get(step.status, "?")

            connector = "  │" if i < len(pipeline.steps) - 1 else "   "
            arrow = "  ▼" if i < len(pipeline.steps) - 1 else ""

            lines.append(f"  {status_icon} {step.step_id}: {step.tool_name}")
            lines.append(f"  │  Description: {step.description}")

            if step.input_mapping:
                inputs = ", ".join(
                    f"{k}←{v}" for k, v in step.input_mapping.items()
                )
                lines.append(f"  │  Inputs: {inputs}")

            if step.static_params:
                params = ", ".join(
                    f"{k}={repr(v)}" for k, v in step.static_params.items()
                )
                lines.append(f"  │  Params: {params}")

            lines.append(f"  │  Output: → {step.output_key}")

            if step.duration_ms > 0:
                lines.append(f"  │  Duration: {step.duration_ms:.1f}ms")

            if step.error:
                lines.append(f"  │  Error: {step.error}")

            lines.append(f"  │  Error Policy: {step.on_error}")

            if arrow:
                lines.append(arrow)

        lines.append("=" * 60)
        return "\n".join(lines)

    @staticmethod
    def render_execution_summary(
        pipeline: Pipeline,
        context: PipelineContext,
    ) -> str:
        """Render a post-execution summary."""
        total_duration = sum(s.duration_ms for s in pipeline.steps)
        completed = sum(1 for s in pipeline.steps if s.status == StepStatus.COMPLETED)
        failed = sum(1 for s in pipeline.steps if s.status == StepStatus.FAILED)
        skipped = sum(1 for s in pipeline.steps if s.status == StepStatus.SKIPPED)

        lines = [
            "Execution Summary",
            "─" * 40,
            f"  Total Steps:     {len(pipeline.steps)}",
            f"  Completed:       {completed}",
            f"  Failed:          {failed}",
            f"  Skipped:         {skipped}",
            f"  Total Duration:  {total_duration:.1f}ms",
            "",
            "Step Breakdown:",
        ]

        for step in pipeline.steps:
            status = step.status.value.upper()
            duration = f"{step.duration_ms:.1f}ms" if step.duration_ms > 0 else "N/A"
            lines.append(f"  [{status:>9}] {step.step_id}: {step.tool_name} ({duration})")

        if context.errors:
            lines.append("")
            lines.append("Errors:")
            for err in context.errors:
                lines.append(f"  - {err['step_id']}: {err['error']}")

        return "\n".join(lines)
```

---

## Complete Pipeline Example

```python
# Build a multi-step code review pipeline
review_pipeline = Pipeline(
    name="code-review-pipeline",
    description="Automated code review: read → analyze → comment",
)

review_pipeline.add_step(
    tool_name="file_read",
    description="Read the source file for review",
    static_params={"path": "/workspace/src/main.py"},
    output_key="source_code",
)

review_pipeline.add_step(
    tool_name="grep_search",
    description="Find TODO/FIXME comments",
    static_params={"pattern": "TODO|FIXME|HACK", "path": "/workspace/src/"},
    output_key="todo_findings",
    on_error="skip",
)

review_pipeline.add_step(
    tool_name="lint_check",
    description="Run linter on the source file",
    input_mapping={"content": "$step_0.text"},
    output_key="lint_results",
    on_error="retry",
    max_retries=2,
)

review_pipeline.add_step(
    tool_name="file_write",
    description="Write review report",
    input_mapping={
        "lint_data": "$step_2.issues",
        "todos": "$step_1.matches",
    },
    static_params={
        "path": "/workspace/reviews/main_review.md",
        "createDirectories": True,
    },
    output_key="review_report",
    condition=lambda ctx: ctx.get("lint_results") is not None,
)

# Validate
errors = review_pipeline.validate()
if errors:
    print(f"Validation errors: {errors}")
else:
    print("Pipeline is valid")

# Visualize
print(PipelineVisualizer.render_pipeline(review_pipeline))
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Correct Approach |
| :--- | :--- | :--- |
| Hardcoded data passing between steps | Fragile coupling, breaks if step order changes | Use input_mapping with named references ($step_id.field) |
| No error handling on pipeline steps | Single failure crashes entire pipeline | Configure on_error per step (skip, retry, fallback) |
| Sequentializing independent steps | Unnecessary latency from serial execution | Use ParallelStepGroup for steps with no data dependencies |
| Unbounded pipeline execution time | Runaway pipelines consume resources indefinitely | Set max_total_duration_ms on the pipeline |
| Mutating intermediate results in-place | Later steps see corrupted data | Deep-copy results in DataFlowResolver |
| No pipeline validation before execution | Runtime errors from broken references | Call pipeline.validate() before execute() |

---

## Handoff & Related References
- Tool Error Handling: [tool-error-handling.md](tool-error-handling.md)
- Idempotency Patterns: [idempotency-patterns.md](idempotency-patterns.md)
- Tool Schema Definitions: [tool-schema-definitions.md](tool-schema-definitions.md)
- Tool Discovery & Routing: [tool-discovery-routing.md](tool-discovery-routing.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Complete pipeline construction, data flow resolution, conditional branching, parallel execution, and visualization implementations preserved)
Strict compliance with structured tool chaining and pipeline orchestration patterns.
-->
