# Plan-and-Execute Agent Architectures

## Theoretical Foundation

Plan-and-Execute is an agent architecture pattern where the planning and execution phases are explicitly separated into distinct stages. Unlike ReAct (Reasoning + Acting) agents that interleave thinking and action at each step, Plan-and-Execute agents first generate a complete plan, then execute it step-by-step, with optional re-planning when the environment changes.

The fundamental equation governing Plan-and-Execute effectiveness is:

$$E_{total} = P(plan\_correct) \times E_{execution} + P(plan\_incorrect) \times C_{replan}$$

Where $E_{total}$ is total efficiency, $P(plan\_correct)$ is the probability of the initial plan being correct, $E_{execution}$ is execution efficiency under a correct plan, and $C_{replan}$ is the cost of re-planning.

```
+-------------------------------------------------------------------+
|                    PLAN-AND-EXECUTE ARCHITECTURE                   |
|                                                                    |
|   ┌────────────┐                        ┌──────────────┐          |
|   │   PLANNER  │──── Plan Artifact ────►│   EXECUTOR   │          |
|   │            │                        │              │          |
|   │ - Analyze  │    ┌──────────────┐    │ - Step-by-   │          |
|   │ - Decompose│◄───│  RE-PLANNER  │◄───│   step run   │          |
|   │ - Sequence │    │              │    │ - Monitor    │          |
|   └────────────┘    └──────────────┘    └──────────────┘          |
+-------------------------------------------------------------------+
```

---

## Architecture Comparison Matrix

| Feature | ReAct | Plan-and-Execute | Hierarchical PE |
| :--- | :--- | :--- | :--- |
| **Planning Phase** | Interleaved per step | Upfront, complete | Upfront, multi-level |
| **Execution Phase** | Immediate after thought | After plan finalization | Phased with checkpoints |
| **Re-Planning** | Implicit (each step) | Explicit trigger | Per-level re-planning |
| **Token Efficiency** | Lower (repeated reasoning) | Higher (plan reuse) | Highest (structured) |
| **Error Recovery** | Ad-hoc | Structured re-plan | Level-specific recovery |
| **Best For** | Simple, exploratory tasks | Medium complexity | Complex, multi-domain |

---

## Core Plan-and-Execute Pattern

### Plan Generation

The planner takes the user request and available tools as input, and produces a structured plan as output.

```python
import json
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum


class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class PlanStep:
    """A single step in an execution plan."""
    step_id: str
    description: str
    tool: str
    tool_input: Dict[str, Any]
    dependencies: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    estimated_tokens: int = 500
    retry_count: int = 0
    max_retries: int = 2

    def is_ready(self, completed_steps: set) -> bool:
        """Check if all dependencies are satisfied."""
        return all(dep in completed_steps for dep in self.dependencies)


@dataclass
class ExecutionPlan:
    """A complete execution plan with metadata."""
    plan_id: str
    goal: str
    steps: List[PlanStep]
    total_estimated_tokens: int = 0
    version: int = 1
    replanning_count: int = 0
    max_replanning: int = 3

    def __post_init__(self):
        self.total_estimated_tokens = sum(s.estimated_tokens for s in self.steps)

    def get_ready_steps(self, completed: set) -> List[PlanStep]:
        """Get all steps whose dependencies are satisfied."""
        return [
            step for step in self.steps
            if step.status == TaskStatus.PENDING and step.is_ready(completed)
        ]

    def get_execution_order(self) -> List[List[PlanStep]]:
        """Compute topological execution order (parallelizable groups)."""
        completed = set()
        order = []
        remaining = set(s.step_id for s in self.steps)

        while remaining:
            ready = [
                s for s in self.steps
                if s.step_id in remaining and s.is_ready(completed)
            ]
            if not ready:
                raise ValueError(f"Circular dependency detected. Remaining: {remaining}")
            order.append(ready)
            for step in ready:
                completed.add(step.step_id)
                remaining.discard(step.step_id)

        return order


class PlanGenerator:
    """
    Generates structured execution plans from user goals.
    In production, this delegates to an LLM for plan generation.
    """

    # Common task templates for fast plan generation
    TASK_TEMPLATES = {
        "file_modification": [
            {"action": "read_file", "description": "Read the target file"},
            {"action": "analyze_content", "description": "Analyze current content"},
            {"action": "generate_changes", "description": "Generate modifications"},
            {"action": "apply_changes", "description": "Apply modifications to file"},
            {"action": "verify_result", "description": "Verify changes are correct"},
        ],
        "multi_file_refactor": [
            {"action": "scan_workspace", "description": "Scan workspace structure"},
            {"action": "identify_targets", "description": "Identify all files to modify"},
            {"action": "analyze_dependencies", "description": "Map file dependencies"},
            {"action": "plan_changes", "description": "Plan coordinated changes"},
            {"action": "apply_changes_ordered", "description": "Apply changes in dependency order"},
            {"action": "run_tests", "description": "Run test suite"},
            {"action": "verify_integration", "description": "Verify integration integrity"},
        ],
        "information_retrieval": [
            {"action": "parse_query", "description": "Parse the information request"},
            {"action": "search_codebase", "description": "Search relevant files"},
            {"action": "extract_information", "description": "Extract requested information"},
            {"action": "format_response", "description": "Format response"},
        ],
    }

    def generate_plan(self, goal: str, task_type: str,
                      available_tools: List[str]) -> ExecutionPlan:
        """Generate an execution plan for the given goal."""
        template = self.TASK_TEMPLATES.get(task_type, self.TASK_TEMPLATES["information_retrieval"])

        steps = []
        for i, step_template in enumerate(template):
            step_id = f"step_{i+1}"
            dependencies = [f"step_{i}"] if i > 0 else []

            steps.append(PlanStep(
                step_id=step_id,
                description=step_template["description"],
                tool=self._select_tool(step_template["action"], available_tools),
                tool_input={"action": step_template["action"]},
                dependencies=dependencies,
                estimated_tokens=self._estimate_tokens(step_template["action"]),
            ))

        plan = ExecutionPlan(
            plan_id=f"plan_{hash(goal) % 10000}",
            goal=goal,
            steps=steps,
        )

        print(f"[Planner] Generated plan '{plan.plan_id}' with {len(steps)} steps")
        print(f"[Planner] Estimated total tokens: {plan.total_estimated_tokens}")
        return plan

    def _select_tool(self, action: str, available_tools: List[str]) -> str:
        """Select the best tool for a given action."""
        tool_mapping = {
            "read_file": "view_file",
            "scan_workspace": "list_dir",
            "search_codebase": "grep_search",
            "analyze_content": "view_file",
            "generate_changes": "llm_generate",
            "apply_changes": "replace_file_content",
            "verify_result": "run_command",
            "run_tests": "run_command",
            "apply_changes_ordered": "multi_replace_file_content",
            "identify_targets": "find_by_name",
            "analyze_dependencies": "grep_search",
            "plan_changes": "llm_generate",
            "verify_integration": "run_command",
            "parse_query": "llm_generate",
            "extract_information": "view_file",
            "format_response": "llm_generate",
        }
        preferred = tool_mapping.get(action, "llm_generate")
        if preferred in available_tools:
            return preferred
        return available_tools[0] if available_tools else "llm_generate"

    def _estimate_tokens(self, action: str) -> int:
        """Estimate token cost for an action."""
        cost_map = {
            "read_file": 200,
            "scan_workspace": 300,
            "search_codebase": 400,
            "analyze_content": 600,
            "generate_changes": 1000,
            "apply_changes": 300,
            "verify_result": 400,
            "run_tests": 500,
        }
        return cost_map.get(action, 500)
```

---

## Plan Executor with Re-Planning

The executor runs plan steps in topological order and triggers re-planning when steps fail.

```python
from typing import Callable, Awaitable
import time


@dataclass
class ExecutionResult:
    """Result of plan execution."""
    plan_id: str
    success: bool
    completed_steps: List[str]
    failed_steps: List[str]
    skipped_steps: List[str]
    total_tokens_used: int
    replanning_events: int
    execution_time_seconds: float
    step_results: Dict[str, Any]


class PlanExecutor:
    """
    Executes a plan step-by-step with monitoring, retry logic,
    and re-planning capabilities.
    """

    def __init__(self, planner: PlanGenerator,
                 tool_executor: Optional[Callable] = None):
        self.planner = planner
        self.tool_executor = tool_executor or self._default_executor
        self.completed_steps: set = set()
        self.step_results: Dict[str, Any] = {}
        self.total_tokens_used: int = 0

    def execute_plan(self, plan: ExecutionPlan) -> ExecutionResult:
        """Execute a plan with monitoring and re-planning."""
        start_time = time.time()
        failed_steps = []
        skipped_steps = []

        print(f"[Executor] Starting plan '{plan.plan_id}': {plan.goal}")

        # Get execution order (topological sort)
        try:
            execution_order = plan.get_execution_order()
        except ValueError as e:
            print(f"[Executor] Plan validation failed: {e}")
            return ExecutionResult(
                plan_id=plan.plan_id,
                success=False,
                completed_steps=[],
                failed_steps=[s.step_id for s in plan.steps],
                skipped_steps=[],
                total_tokens_used=0,
                replanning_events=0,
                execution_time_seconds=time.time() - start_time,
                step_results={},
            )

        for group in execution_order:
            for step in group:
                print(f"[Executor] Running step '{step.step_id}': {step.description}")
                step.status = TaskStatus.IN_PROGRESS

                success = self._execute_step_with_retry(step)

                if success:
                    step.status = TaskStatus.COMPLETED
                    self.completed_steps.add(step.step_id)
                    self.step_results[step.step_id] = step.result
                    print(f"[Executor] Step '{step.step_id}' completed successfully")
                else:
                    step.status = TaskStatus.FAILED
                    failed_steps.append(step.step_id)
                    print(f"[Executor] Step '{step.step_id}' failed: {step.error}")

                    # Attempt re-planning
                    if plan.replanning_count < plan.max_replanning:
                        print(f"[Executor] Triggering re-plan (attempt {plan.replanning_count + 1})")
                        replan_success = self._replan(plan, step)
                        plan.replanning_count += 1

                        if replan_success:
                            print("[Executor] Re-plan succeeded, continuing execution")
                            # Re-compute execution order with remaining steps
                            break
                        else:
                            print("[Executor] Re-plan failed, skipping dependent steps")
                            skipped = self._skip_dependents(plan, step.step_id)
                            skipped_steps.extend(skipped)
                    else:
                        print("[Executor] Max re-planning attempts reached")
                        skipped = self._skip_dependents(plan, step.step_id)
                        skipped_steps.extend(skipped)

        overall_success = len(failed_steps) == 0 and len(skipped_steps) == 0

        return ExecutionResult(
            plan_id=plan.plan_id,
            success=overall_success,
            completed_steps=list(self.completed_steps),
            failed_steps=failed_steps,
            skipped_steps=skipped_steps,
            total_tokens_used=self.total_tokens_used,
            replanning_events=plan.replanning_count,
            execution_time_seconds=time.time() - start_time,
            step_results=self.step_results,
        )

    def _execute_step_with_retry(self, step: PlanStep) -> bool:
        """Execute a step with retry logic."""
        for attempt in range(step.max_retries + 1):
            try:
                result = self.tool_executor(step.tool, step.tool_input)
                step.result = result
                self.total_tokens_used += step.estimated_tokens
                return True
            except Exception as e:
                step.retry_count += 1
                step.error = str(e)
                print(f"[Executor] Step '{step.step_id}' attempt {attempt + 1} failed: {e}")
        return False

    def _replan(self, plan: ExecutionPlan, failed_step: PlanStep) -> bool:
        """Generate a new sub-plan to work around the failed step."""
        remaining = [
            s for s in plan.steps
            if s.status == TaskStatus.PENDING
        ]
        if not remaining:
            return False

        # Simple re-planning: try an alternative approach for the failed step
        alternative_step = PlanStep(
            step_id=f"{failed_step.step_id}_alt",
            description=f"Alternative approach for: {failed_step.description}",
            tool=failed_step.tool,
            tool_input={**failed_step.tool_input, "alternative": True},
            dependencies=failed_step.dependencies,
            estimated_tokens=failed_step.estimated_tokens,
        )

        # Replace the failed step in the plan
        plan.steps = [
            alternative_step if s.step_id == failed_step.step_id else s
            for s in plan.steps
        ]

        # Update dependencies pointing to the failed step
        for s in plan.steps:
            s.dependencies = [
                f"{failed_step.step_id}_alt" if d == failed_step.step_id else d
                for d in s.dependencies
            ]

        plan.version += 1
        return True

    def _skip_dependents(self, plan: ExecutionPlan, failed_id: str) -> List[str]:
        """Skip all steps that depend on a failed step."""
        skipped = []
        to_skip = {failed_id}

        changed = True
        while changed:
            changed = False
            for step in plan.steps:
                if step.step_id not in to_skip and any(d in to_skip for d in step.dependencies):
                    to_skip.add(step.step_id)
                    step.status = TaskStatus.SKIPPED
                    skipped.append(step.step_id)
                    changed = True

        return skipped

    def _default_executor(self, tool: str, tool_input: Dict) -> Any:
        """Default tool executor (placeholder)."""
        print(f"[Tool] Executing {tool} with input: {json.dumps(tool_input, indent=2)}")
        return {"status": "success", "tool": tool}
```

---

## LangChain-Style Plan-and-Execute

The LangChain framework popularized a specific implementation of Plan-and-Execute. Here is the core pattern:

```python
class LangChainStylePlanner:
    """
    Implements the LangChain Plan-and-Execute pattern where:
    1. A planner LLM generates a list of steps
    2. An executor LLM runs each step using tools
    3. A re-planner adjusts the plan based on results
    """

    PLANNER_PROMPT = """You are a task planner. Given the objective below,
create a numbered list of steps to accomplish it. Each step should be
a single, atomic action.

Objective: {objective}
Available Tools: {tools}

Output your plan as a JSON array of step descriptions."""

    EXECUTOR_PROMPT = """Execute the following step:
Step: {step_description}

Previous results:
{previous_results}

Use the available tools to complete this step."""

    REPLANNER_PROMPT = """Review the execution progress and adjust the plan.

Original objective: {objective}
Completed steps: {completed}
Failed steps: {failed}
Remaining steps: {remaining}

Generate an updated plan as a JSON array."""

    def __init__(self, llm_call: Callable):
        self.llm_call = llm_call

    def plan(self, objective: str, tools: List[str]) -> List[str]:
        """Generate initial plan using planner LLM."""
        prompt = self.PLANNER_PROMPT.format(
            objective=objective,
            tools=", ".join(tools),
        )
        response = self.llm_call(prompt)
        return json.loads(response)

    def execute_step(self, step: str, previous_results: List[Dict]) -> Dict:
        """Execute a single plan step using executor LLM."""
        prompt = self.EXECUTOR_PROMPT.format(
            step_description=step,
            previous_results=json.dumps(previous_results, indent=2),
        )
        response = self.llm_call(prompt)
        return json.loads(response)

    def replan(self, objective: str, completed: List[str],
               failed: List[str], remaining: List[str]) -> List[str]:
        """Re-plan based on execution results."""
        prompt = self.REPLANNER_PROMPT.format(
            objective=objective,
            completed=json.dumps(completed),
            failed=json.dumps(failed),
            remaining=json.dumps(remaining),
        )
        response = self.llm_call(prompt)
        return json.loads(response)

    def run(self, objective: str, tools: List[str],
            max_replans: int = 3) -> Dict[str, Any]:
        """Full plan-and-execute loop with re-planning."""
        plan = self.plan(objective, tools)
        completed = []
        failed = []
        results = []
        replan_count = 0

        i = 0
        while i < len(plan):
            step = plan[i]
            print(f"[PE] Executing step {i+1}/{len(plan)}: {step}")

            try:
                result = self.execute_step(step, results)
                results.append(result)
                completed.append(step)
                i += 1
            except Exception as e:
                failed.append(step)
                print(f"[PE] Step failed: {e}")

                if replan_count < max_replans:
                    remaining = plan[i+1:]
                    plan = self.replan(objective, completed, failed, remaining)
                    replan_count += 1
                    i = 0  # Restart from beginning of new plan
                    print(f"[PE] Re-planned (attempt {replan_count}): {len(plan)} steps")
                else:
                    print("[PE] Max re-plans reached, aborting")
                    break

        return {
            "objective": objective,
            "completed": completed,
            "failed": failed,
            "results": results,
            "replans": replan_count,
            "success": len(failed) == 0,
        }
```

---

## TypeScript Plan-and-Execute Implementation

```typescript
interface PlanStep {
  id: string;
  description: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  dependsOn: string[];
}

interface Plan {
  id: string;
  objective: string;
  steps: PlanStep[];
  version: number;
  createdAt: Date;
}

interface StepResult {
  stepId: string;
  success: boolean;
  output: unknown;
  error?: string;
  tokensUsed: number;
}

type ToolExecutor = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<unknown>;

class PlanAndExecuteAgent {
  private toolExecutor: ToolExecutor;
  private maxReplans: number;
  private results: Map<string, StepResult> = new Map();

  constructor(toolExecutor: ToolExecutor, maxReplans: number = 3) {
    this.toolExecutor = toolExecutor;
    this.maxReplans = maxReplans;
  }

  async run(objective: string, tools: string[]): Promise<{
    success: boolean;
    results: StepResult[];
    replans: number;
  }> {
    let plan = await this.generatePlan(objective, tools);
    let replanCount = 0;
    const allResults: StepResult[] = [];

    for (const step of plan.steps) {
      // Check dependencies
      const depsReady = step.dependsOn.every((dep) => {
        const depResult = this.results.get(dep);
        return depResult?.success === true;
      });

      if (!depsReady) {
        console.log(`[PE] Skipping step ${step.id}: dependencies not met`);
        allResults.push({
          stepId: step.id,
          success: false,
          output: null,
          error: "Dependencies not satisfied",
          tokensUsed: 0,
        });
        continue;
      }

      console.log(`[PE] Executing: ${step.description}`);
      const result = await this.executeStep(step);
      allResults.push(result);
      this.results.set(step.id, result);

      if (!result.success && replanCount < this.maxReplans) {
        console.log(`[PE] Step failed, triggering re-plan`);
        plan = await this.replan(plan, step.id, allResults);
        replanCount++;
      }
    }

    return {
      success: allResults.every((r) => r.success),
      results: allResults,
      replans: replanCount,
    };
  }

  private async generatePlan(
    objective: string,
    tools: string[]
  ): Promise<Plan> {
    // In production, this calls an LLM to generate the plan
    return {
      id: `plan_${Date.now()}`,
      objective,
      steps: [],
      version: 1,
      createdAt: new Date(),
    };
  }

  private async executeStep(step: PlanStep): Promise<StepResult> {
    const startTokens = 0;
    try {
      const output = await this.toolExecutor(step.toolName, step.toolArgs);
      return {
        stepId: step.id,
        success: true,
        output,
        tokensUsed: 500, // Estimated
      };
    } catch (err) {
      return {
        stepId: step.id,
        success: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        tokensUsed: 200,
      };
    }
  }

  private async replan(
    currentPlan: Plan,
    failedStepId: string,
    results: StepResult[]
  ): Promise<Plan> {
    // Generate new plan considering failures
    return {
      ...currentPlan,
      version: currentPlan.version + 1,
    };
  }
}
```

---

## Plan Validation Checklist

Before executing any plan, validate against this checklist:

| Check | Description | Severity |
| :--- | :--- | :--- |
| **DAG Validity** | Plan steps form a valid directed acyclic graph | Critical |
| **Tool Availability** | All referenced tools are available and accessible | Critical |
| **Dependency Completeness** | Every dependency reference maps to an existing step | Critical |
| **Token Budget** | Total estimated tokens fit within context window | High |
| **Step Atomicity** | Each step represents a single, reversible action | High |
| **Precondition Coverage** | Every step's preconditions can be verified | Medium |
| **Postcondition Testability** | Every step's postconditions are measurable | Medium |
| **Replan Feasibility** | Alternative approaches exist for critical steps | Low |

---

## Handoff & Related References
- OODA Loop Patterns: [ooda-loop-patterns.md](ooda-loop-patterns.md)
- Task Decomposition Strategies: [task-decomposition-strategies.md](task-decomposition-strategies.md)
- Pre-flight Validation: [preflight-validation.md](preflight-validation.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive Plan-and-Execute architecture details preserved)
-->
