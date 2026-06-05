# OODA Loop Patterns for AI Agents

## Theoretical Foundation

The OODA (Observe-Orient-Decide-Act) loop, originally developed by military strategist John Boyd, provides a structured framework for rapid decision-making under uncertainty. When applied to AI agent systems, the OODA loop creates a disciplined cycle that ensures agents gather sufficient information, orient their understanding, make informed decisions, and execute actions with full situational awareness.

The core principle is that agents operating faster and more accurately through OODA cycles will outperform agents using unstructured reasoning. Each phase serves a distinct cognitive function:

$$\text{Effectiveness} = f(\text{Observation Quality}, \text{Orientation Accuracy}, \text{Decision Speed}, \text{Action Precision})$$

```
+-------------------------------------------------------------------+
|                        OODA LOOP CYCLE                             |
|                                                                    |
|   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐ |
|   │ OBSERVE  │────►│  ORIENT  │────►│  DECIDE  │────►│   ACT   │ |
|   │          │     │          │     │          │     │         │ |
|   │ Gather   │     │ Analyze  │     │ Select   │     │ Execute │ |
|   │ Context  │     │ Meaning  │     │ Strategy │     │ Plan    │ |
|   └──────────┘     └──────────┘     └──────────┘     └─────────┘ |
|        ▲                                                   │      |
|        └───────────────── Feedback ◄──────────────────────┘      |
+-------------------------------------------------------------------+
```

---

## Phase 1: Observe — Context Gathering Engine

The Observe phase is responsible for collecting all relevant information from the environment before any analysis begins. In agent systems, this translates to reading files, parsing user messages, querying databases, and gathering system state.

### Observation Strategy Matrix

| Observation Type | Data Source | Collection Method | Priority |
| :--- | :--- | :--- | :--- |
| **User Intent Signals** | User message, conversation history | NLP parsing, intent extraction | Critical |
| **Codebase State** | File system, git history | File reads, diff analysis | High |
| **System Environment** | OS, runtime, dependencies | Environment variable inspection | Medium |
| **Tool Availability** | Tool registry, API endpoints | Capability enumeration | Medium |
| **Historical Context** | Previous execution logs, session state | State file reads | Low |

### Observation Completeness Score

To ensure sufficient information is gathered before proceeding to the Orient phase, compute an observation completeness score:

$$O_{complete} = \frac{\sum_{i=1}^{n} w_i \cdot \mathbb{1}(d_i \text{ collected})}{\sum_{i=1}^{n} w_i}$$

Where $w_i$ is the weight of data source $i$, $d_i$ is the data element, and $\mathbb{1}$ is the indicator function. Proceed to Orient only when $O_{complete} \geq 0.8$.

### Python Implementation: Observation Engine

```python
import os
import json
import hashlib
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class ObservationPriority(Enum):
    CRITICAL = 4
    HIGH = 3
    MEDIUM = 2
    LOW = 1


@dataclass
class ObservationResult:
    """Represents a single observation data point."""
    source: str
    data_type: str
    content: Any
    priority: ObservationPriority
    confidence: float  # 0.0 to 1.0
    timestamp: float
    content_hash: str = ""

    def __post_init__(self):
        if not self.content_hash:
            raw = json.dumps(self.content, sort_keys=True, default=str)
            self.content_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]


@dataclass
class ObservationContext:
    """Aggregated observation context for the Orient phase."""
    observations: List[ObservationResult] = field(default_factory=list)
    completeness_score: float = 0.0
    missing_sources: List[str] = field(default_factory=list)
    collected_sources: Set[str] = field(default_factory=set)

    def add(self, observation: ObservationResult) -> None:
        self.observations.append(observation)
        self.collected_sources.add(observation.source)

    def compute_completeness(self, required_sources: Dict[str, float]) -> float:
        """
        Compute observation completeness score.
        required_sources maps source names to their weights.
        """
        total_weight = sum(required_sources.values())
        collected_weight = sum(
            weight for source, weight in required_sources.items()
            if source in self.collected_sources
        )
        self.missing_sources = [
            s for s in required_sources if s not in self.collected_sources
        ]
        self.completeness_score = collected_weight / total_weight if total_weight > 0 else 0.0
        return self.completeness_score


class OODAObserver:
    """
    Observation engine for the OODA loop.
    Collects context from multiple sources and computes completeness.
    """
    REQUIRED_SOURCES = {
        "user_intent": 4.0,
        "codebase_state": 3.0,
        "system_environment": 2.0,
        "tool_availability": 2.0,
        "historical_context": 1.0,
    }

    COMPLETENESS_THRESHOLD = 0.8

    def __init__(self):
        self.context = ObservationContext()
        self._observation_handlers: Dict[str, callable] = {
            "user_intent": self._observe_user_intent,
            "codebase_state": self._observe_codebase,
            "system_environment": self._observe_environment,
            "tool_availability": self._observe_tools,
            "historical_context": self._observe_history,
        }

    def observe_all(self, user_message: str, workspace_path: str,
                    available_tools: List[str], session_state: Optional[Dict] = None) -> ObservationContext:
        """Run all observation handlers and build complete context."""
        import time

        # Observe user intent
        self._observe_user_intent(user_message, time.time())

        # Observe codebase state
        self._observe_codebase(workspace_path, time.time())

        # Observe environment
        self._observe_environment(time.time())

        # Observe tools
        self._observe_tools(available_tools, time.time())

        # Observe history
        self._observe_history(session_state, time.time())

        # Compute completeness
        score = self.context.compute_completeness(self.REQUIRED_SOURCES)
        print(f"[OODA:Observe] Completeness score: {score:.2f}")
        print(f"[OODA:Observe] Missing sources: {self.context.missing_sources}")

        return self.context

    def is_observation_sufficient(self) -> bool:
        """Check if observation completeness meets the threshold."""
        return self.context.completeness_score >= self.COMPLETENESS_THRESHOLD

    def _observe_user_intent(self, message: str, timestamp: float) -> None:
        """Extract intent signals from user message."""
        # Keyword-based intent signal extraction
        intent_keywords = {
            "create": ["create", "new", "add", "generate", "build", "make"],
            "modify": ["change", "update", "fix", "refactor", "edit", "modify"],
            "delete": ["remove", "delete", "drop", "clean", "purge"],
            "query": ["find", "search", "show", "list", "get", "read", "explain"],
            "deploy": ["deploy", "release", "publish", "ship", "push"],
        }

        message_lower = message.lower()
        detected_intents = {}

        for intent_type, keywords in intent_keywords.items():
            matches = [kw for kw in keywords if kw in message_lower]
            if matches:
                detected_intents[intent_type] = len(matches) / len(keywords)

        self.context.add(ObservationResult(
            source="user_intent",
            data_type="intent_signals",
            content={
                "raw_message": message,
                "detected_intents": detected_intents,
                "message_length": len(message),
                "word_count": len(message.split()),
            },
            priority=ObservationPriority.CRITICAL,
            confidence=0.85 if detected_intents else 0.4,
            timestamp=timestamp,
        ))

    def _observe_codebase(self, workspace_path: str, timestamp: float) -> None:
        """Scan workspace directory structure."""
        try:
            path = Path(workspace_path)
            if not path.exists():
                return

            file_inventory = {
                "total_files": 0,
                "by_extension": {},
                "directories": [],
            }

            for item in path.rglob("*"):
                if item.is_file():
                    file_inventory["total_files"] += 1
                    ext = item.suffix or "no_extension"
                    file_inventory["by_extension"][ext] = (
                        file_inventory["by_extension"].get(ext, 0) + 1
                    )
                elif item.is_dir() and item.name not in {".git", "node_modules", "__pycache__", ".venv"}:
                    file_inventory["directories"].append(str(item.relative_to(path)))

            self.context.add(ObservationResult(
                source="codebase_state",
                data_type="file_inventory",
                content=file_inventory,
                priority=ObservationPriority.HIGH,
                confidence=0.95,
                timestamp=timestamp,
            ))
        except PermissionError:
            pass

    def _observe_environment(self, timestamp: float) -> None:
        """Collect system environment information."""
        env_data = {
            "os": os.name,
            "python_path": os.environ.get("PYTHONPATH", "not_set"),
            "cwd": os.getcwd(),
            "path_entries": len(os.environ.get("PATH", "").split(os.pathsep)),
        }

        self.context.add(ObservationResult(
            source="system_environment",
            data_type="environment_vars",
            content=env_data,
            priority=ObservationPriority.MEDIUM,
            confidence=1.0,
            timestamp=timestamp,
        ))

    def _observe_tools(self, available_tools: List[str], timestamp: float) -> None:
        """Catalog available tools and capabilities."""
        self.context.add(ObservationResult(
            source="tool_availability",
            data_type="tool_registry",
            content={
                "available_tools": available_tools,
                "tool_count": len(available_tools),
            },
            priority=ObservationPriority.MEDIUM,
            confidence=1.0,
            timestamp=timestamp,
        ))

    def _observe_history(self, session_state: Optional[Dict], timestamp: float) -> None:
        """Load historical execution context."""
        if session_state is None:
            session_state = {"previous_actions": [], "error_history": []}

        self.context.add(ObservationResult(
            source="historical_context",
            data_type="session_state",
            content=session_state,
            priority=ObservationPriority.LOW,
            confidence=0.7 if session_state.get("previous_actions") else 0.3,
            timestamp=timestamp,
        ))
```

---

## Phase 2: Orient — Analysis & Situational Awareness

The Orient phase transforms raw observations into actionable understanding. This is the most intellectually demanding phase, where the agent must synthesize disparate data points into a coherent mental model of the situation.

### Orientation Heuristics

```
Raw Observations
       │
       ├──► Language Detection ──► Identify primary programming language & framework
       │
       ├──► Complexity Assessment ──► Score task complexity on [1-10] scale
       │
       ├──► Risk Profiling ──► Classify risk level (low/medium/high/critical)
       │
       ├──► Constraint Discovery ──► Extract implicit & explicit constraints
       │
       └──► Pattern Matching ──► Match against known task templates
```

### Orientation Data Model

```python
@dataclass
class OrientationResult:
    """Result of the Orient phase analysis."""
    primary_language: str
    framework: Optional[str]
    task_complexity: int  # 1-10 scale
    risk_level: str  # low, medium, high, critical
    detected_constraints: List[Dict[str, Any]]
    matched_patterns: List[str]
    confidence: float
    mental_model: Dict[str, Any]  # Synthesized understanding


class OODAOrienter:
    """
    Orientation engine that synthesizes observations into
    actionable situational awareness.
    """
    COMPLEXITY_FACTORS = {
        "multi_file": 2,
        "cross_language": 3,
        "database_changes": 3,
        "api_changes": 2,
        "security_sensitive": 4,
        "deployment": 3,
        "single_file_edit": 1,
        "documentation": 1,
    }

    RISK_THRESHOLDS = {
        "low": (0, 3),
        "medium": (3, 5),
        "high": (5, 8),
        "critical": (8, 11),
    }

    def orient(self, observation_context: ObservationContext) -> OrientationResult:
        """Synthesize observations into situational awareness."""
        # Extract intent observation
        intent_obs = self._find_observation(observation_context, "user_intent")
        codebase_obs = self._find_observation(observation_context, "codebase_state")

        # Detect primary language
        primary_language = self._detect_language(codebase_obs)

        # Assess complexity
        complexity = self._assess_complexity(intent_obs, codebase_obs)

        # Profile risk
        risk_level = self._profile_risk(complexity, intent_obs)

        # Discover constraints
        constraints = self._discover_constraints(observation_context)

        # Match patterns
        patterns = self._match_patterns(intent_obs)

        # Build mental model
        mental_model = {
            "situation_summary": self._summarize_situation(intent_obs, codebase_obs),
            "key_entities": self._extract_entities(intent_obs),
            "action_domains": self._identify_domains(intent_obs, codebase_obs),
        }

        return OrientationResult(
            primary_language=primary_language,
            framework=self._detect_framework(codebase_obs),
            task_complexity=complexity,
            risk_level=risk_level,
            detected_constraints=constraints,
            matched_patterns=patterns,
            confidence=self._compute_orientation_confidence(observation_context),
            mental_model=mental_model,
        )

    def _find_observation(self, ctx: ObservationContext, source: str) -> Optional[ObservationResult]:
        for obs in ctx.observations:
            if obs.source == source:
                return obs
        return None

    def _detect_language(self, codebase_obs: Optional[ObservationResult]) -> str:
        if not codebase_obs:
            return "unknown"
        extensions = codebase_obs.content.get("by_extension", {})
        language_map = {
            ".py": "python", ".ts": "typescript", ".js": "javascript",
            ".go": "go", ".rs": "rust", ".java": "java", ".rb": "ruby",
        }
        best_ext = max(extensions, key=extensions.get) if extensions else ""
        return language_map.get(best_ext, "unknown")

    def _assess_complexity(self, intent_obs: Optional[ObservationResult],
                           codebase_obs: Optional[ObservationResult]) -> int:
        score = 1
        if intent_obs:
            intents = intent_obs.content.get("detected_intents", {})
            score += len(intents)  # Multiple intent types increase complexity
            word_count = intent_obs.content.get("word_count", 0)
            if word_count > 50:
                score += 2
            if word_count > 100:
                score += 2
        if codebase_obs:
            total_files = codebase_obs.content.get("total_files", 0)
            if total_files > 100:
                score += 1
            if total_files > 500:
                score += 2
        return min(score, 10)

    def _profile_risk(self, complexity: int, intent_obs: Optional[ObservationResult]) -> str:
        risk_score = complexity
        if intent_obs:
            intents = intent_obs.content.get("detected_intents", {})
            if "delete" in intents:
                risk_score += 3
            if "deploy" in intents:
                risk_score += 2
        for level, (low, high) in self.RISK_THRESHOLDS.items():
            if low <= risk_score < high:
                return level
        return "critical"

    def _discover_constraints(self, ctx: ObservationContext) -> List[Dict[str, Any]]:
        constraints = []
        env_obs = self._find_observation(ctx, "system_environment")
        if env_obs:
            constraints.append({
                "type": "environment",
                "constraint": f"Operating system: {env_obs.content.get('os', 'unknown')}",
                "hard": True,
            })
        tool_obs = self._find_observation(ctx, "tool_availability")
        if tool_obs:
            constraints.append({
                "type": "tooling",
                "constraint": f"Available tools: {tool_obs.content.get('tool_count', 0)}",
                "hard": True,
            })
        return constraints

    def _match_patterns(self, intent_obs: Optional[ObservationResult]) -> List[str]:
        if not intent_obs:
            return []
        intents = intent_obs.content.get("detected_intents", {})
        patterns = []
        if "create" in intents:
            patterns.append("file_creation_pattern")
        if "modify" in intents:
            patterns.append("code_modification_pattern")
        if "query" in intents:
            patterns.append("information_retrieval_pattern")
        return patterns

    def _detect_framework(self, codebase_obs: Optional[ObservationResult]) -> Optional[str]:
        return None  # Extended by project-specific config parsing

    def _summarize_situation(self, intent_obs, codebase_obs) -> str:
        parts = []
        if intent_obs:
            parts.append(f"User request with {intent_obs.content.get('word_count', 0)} words")
        if codebase_obs:
            parts.append(f"Workspace has {codebase_obs.content.get('total_files', 0)} files")
        return "; ".join(parts) if parts else "Insufficient data"

    def _extract_entities(self, intent_obs) -> List[str]:
        if not intent_obs:
            return []
        # Simple entity extraction from message words
        message = intent_obs.content.get("raw_message", "")
        words = message.split()
        # Heuristic: capitalized words and file-like patterns as entities
        entities = [w for w in words if w[0].isupper() or "." in w or "/" in w]
        return entities[:10]

    def _identify_domains(self, intent_obs, codebase_obs) -> List[str]:
        domains = []
        if codebase_obs:
            exts = codebase_obs.content.get("by_extension", {})
            if ".py" in exts:
                domains.append("python_development")
            if ".ts" in exts or ".js" in exts:
                domains.append("javascript_development")
        return domains

    def _compute_orientation_confidence(self, ctx: ObservationContext) -> float:
        return min(ctx.completeness_score * 1.1, 1.0)
```

---

## Phase 3: Decide — Strategy Selection

The Decide phase uses the orientation results to select the best execution strategy. This involves choosing between alternative approaches, allocating resources, and constructing the action plan.

### Decision Framework

```
Orientation Results
       │
       ├── Complexity ≤ 3
       │   └── Direct Execution Strategy
       │       → Single-step plan, minimal validation
       │
       ├── Complexity 4-6
       │   └── Structured Plan Strategy
       │       → Multi-step plan with dependency ordering
       │       → Pre-flight validation required
       │
       ├── Complexity 7-9
       │   └── Hierarchical Decomposition Strategy
       │       → Goal tree decomposition
       │       → Constraint propagation
       │       → Resource pre-allocation
       │
       └── Complexity 10
           └── Collaborative Strategy
               → HITL review of plan
               → Phased execution with checkpoints
               → Full constraint analysis
```

### Decision Engine Implementation

```python
from typing import Tuple


@dataclass
class ExecutionStrategy:
    """Selected execution strategy from the Decide phase."""
    strategy_type: str  # direct, structured, hierarchical, collaborative
    plan_steps: List[Dict[str, Any]]
    resource_allocation: Dict[str, Any]
    validation_level: str  # minimal, standard, comprehensive
    requires_hitl: bool
    estimated_cost: Dict[str, float]
    confidence: float


class OODADecider:
    """
    Decision engine that selects the optimal execution strategy
    based on orientation results.
    """
    STRATEGY_MAP = {
        (1, 3): "direct",
        (4, 6): "structured",
        (7, 9): "hierarchical",
        (10, 10): "collaborative",
    }

    def decide(self, orientation: OrientationResult,
               observation: ObservationContext) -> ExecutionStrategy:
        """Select the best execution strategy."""
        # Select strategy type based on complexity
        strategy_type = self._select_strategy_type(orientation.task_complexity)

        # Build plan steps
        plan_steps = self._build_plan(strategy_type, orientation)

        # Allocate resources
        resources = self._allocate_resources(plan_steps, observation)

        # Determine validation level
        validation = self._determine_validation_level(
            orientation.risk_level, strategy_type
        )

        # Check if HITL is required
        requires_hitl = (
            orientation.risk_level in ("high", "critical")
            or strategy_type == "collaborative"
        )

        # Estimate cost
        cost = self._estimate_cost(plan_steps)

        return ExecutionStrategy(
            strategy_type=strategy_type,
            plan_steps=plan_steps,
            resource_allocation=resources,
            validation_level=validation,
            requires_hitl=requires_hitl,
            estimated_cost=cost,
            confidence=orientation.confidence * 0.9,
        )

    def _select_strategy_type(self, complexity: int) -> str:
        for (low, high), strategy in self.STRATEGY_MAP.items():
            if low <= complexity <= high:
                return strategy
        return "hierarchical"

    def _build_plan(self, strategy_type: str,
                    orientation: OrientationResult) -> List[Dict[str, Any]]:
        """Build ordered plan steps based on strategy type."""
        if strategy_type == "direct":
            return self._build_direct_plan(orientation)
        elif strategy_type == "structured":
            return self._build_structured_plan(orientation)
        elif strategy_type == "hierarchical":
            return self._build_hierarchical_plan(orientation)
        else:
            return self._build_collaborative_plan(orientation)

    def _build_direct_plan(self, orientation: OrientationResult) -> List[Dict]:
        patterns = orientation.matched_patterns
        steps = []
        if "code_modification_pattern" in patterns:
            steps.append({"action": "read_target", "description": "Read target file"})
            steps.append({"action": "apply_change", "description": "Apply modification"})
        elif "file_creation_pattern" in patterns:
            steps.append({"action": "create_file", "description": "Create new file"})
        else:
            steps.append({"action": "analyze", "description": "Analyze request"})
            steps.append({"action": "respond", "description": "Generate response"})
        return steps

    def _build_structured_plan(self, orientation: OrientationResult) -> List[Dict]:
        steps = [
            {"action": "analyze_scope", "description": "Analyze change scope", "phase": "planning"},
            {"action": "identify_targets", "description": "Identify target files", "phase": "planning"},
            {"action": "validate_approach", "description": "Validate approach feasibility", "phase": "validation"},
        ]
        if "code_modification_pattern" in orientation.matched_patterns:
            steps.extend([
                {"action": "read_files", "description": "Read all target files", "phase": "execution"},
                {"action": "apply_changes", "description": "Apply code changes", "phase": "execution"},
                {"action": "verify_syntax", "description": "Verify syntax correctness", "phase": "verification"},
            ])
        return steps

    def _build_hierarchical_plan(self, orientation: OrientationResult) -> List[Dict]:
        return [
            {"action": "decompose_goals", "description": "Decompose into sub-goals", "phase": "decomposition"},
            {"action": "build_dependency_graph", "description": "Build task DAG", "phase": "decomposition"},
            {"action": "propagate_constraints", "description": "Propagate constraints", "phase": "constraint_analysis"},
            {"action": "allocate_resources", "description": "Pre-allocate resources", "phase": "resource_planning"},
            {"action": "validate_plan", "description": "Validate full plan", "phase": "validation"},
            {"action": "execute_phase_1", "description": "Execute first phase", "phase": "execution"},
            {"action": "checkpoint", "description": "Save checkpoint", "phase": "execution"},
            {"action": "execute_remaining", "description": "Execute remaining phases", "phase": "execution"},
        ]

    def _build_collaborative_plan(self, orientation: OrientationResult) -> List[Dict]:
        plan = self._build_hierarchical_plan(orientation)
        plan.insert(3, {"action": "hitl_plan_review", "description": "Submit plan for human review", "phase": "hitl"})
        plan.append({"action": "hitl_final_review", "description": "Submit output for human review", "phase": "hitl"})
        return plan

    def _allocate_resources(self, plan_steps: List[Dict],
                            observation: ObservationContext) -> Dict[str, Any]:
        base_tokens_per_step = 500
        return {
            "total_token_budget": len(plan_steps) * base_tokens_per_step,
            "per_step_budget": base_tokens_per_step,
            "api_calls_estimated": len(plan_steps),
            "parallel_capable": False,
        }

    def _determine_validation_level(self, risk_level: str,
                                    strategy_type: str) -> str:
        if risk_level in ("high", "critical") or strategy_type == "collaborative":
            return "comprehensive"
        elif risk_level == "medium" or strategy_type == "structured":
            return "standard"
        return "minimal"

    def _estimate_cost(self, plan_steps: List[Dict]) -> Dict[str, float]:
        return {
            "tokens": len(plan_steps) * 500.0,
            "api_calls": float(len(plan_steps)),
            "estimated_seconds": len(plan_steps) * 2.0,
        }
```

---

## Phase 4: Act — Validated Execution

The Act phase executes the decided plan with monitoring hooks attached. Each action step includes pre-flight validation and post-execution verification hooks.

### Action Execution Protocol

```
For each step in plan:
    1. Pre-flight check: Verify preconditions are met
    2. Execute: Run the action
    3. Post-check: Verify postconditions
    4. Log: Record execution result
    5. Evaluate: Feed result back to Observe for next cycle
```

### TypeScript Implementation: OODA Action Executor

```typescript
interface ActionStep {
  id: string;
  action: string;
  description: string;
  preconditions: string[];
  postconditions: string[];
  phase: string;
}

interface ActionResult {
  stepId: string;
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
  feedbackSignal: Record<string, unknown>;
}

interface OODACycleResult {
  cycleId: string;
  strategy: string;
  steps: ActionResult[];
  overallSuccess: boolean;
  totalDurationMs: number;
  feedbackForNextCycle: Record<string, unknown>;
}

class OODAActionExecutor {
  private maxRetries: number = 2;
  private executionLog: ActionResult[] = [];

  async executeStep(step: ActionStep): Promise<ActionResult> {
    const startTime = Date.now();

    // Pre-flight validation
    const preflightPassed = await this.validatePreconditions(step.preconditions);
    if (!preflightPassed) {
      return {
        stepId: step.id,
        success: false,
        output: null,
        error: `Precondition check failed for step: ${step.description}`,
        durationMs: Date.now() - startTime,
        feedbackSignal: { preflightFailed: true, step: step.id },
      };
    }

    // Execute with retry logic
    let lastError: string | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const output = await this.runAction(step);
        const postconditionsMet = await this.validatePostconditions(
          step.postconditions,
          output
        );

        if (postconditionsMet) {
          const result: ActionResult = {
            stepId: step.id,
            success: true,
            output,
            durationMs: Date.now() - startTime,
            feedbackSignal: { completed: true, attempt: attempt + 1 },
          };
          this.executionLog.push(result);
          return result;
        }
        lastError = "Postcondition validation failed";
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    const failResult: ActionResult = {
      stepId: step.id,
      success: false,
      output: null,
      error: lastError,
      durationMs: Date.now() - startTime,
      feedbackSignal: { failed: true, retriesExhausted: true },
    };
    this.executionLog.push(failResult);
    return failResult;
  }

  async executePlan(steps: ActionStep[]): Promise<OODACycleResult> {
    const cycleStart = Date.now();
    const results: ActionResult[] = [];
    let overallSuccess = true;

    for (const step of steps) {
      console.log(`[OODA:Act] Executing: ${step.description}`);
      const result = await this.executeStep(step);
      results.push(result);

      if (!result.success) {
        console.error(`[OODA:Act] Step failed: ${step.id} - ${result.error}`);
        overallSuccess = false;
        // Decide whether to continue or abort
        if (step.phase === "execution") {
          console.error("[OODA:Act] Critical execution step failed. Aborting plan.");
          break;
        }
      }
    }

    return {
      cycleId: `cycle_${Date.now()}`,
      strategy: "ooda_execution",
      steps: results,
      overallSuccess,
      totalDurationMs: Date.now() - cycleStart,
      feedbackForNextCycle: this.generateFeedback(results),
    };
  }

  private async validatePreconditions(preconditions: string[]): Promise<boolean> {
    // In production, each precondition maps to a specific check
    for (const condition of preconditions) {
      console.log(`[OODA:Act] Checking precondition: ${condition}`);
    }
    return true; // Simplified - real implementation checks each condition
  }

  private async validatePostconditions(
    postconditions: string[],
    output: unknown
  ): Promise<boolean> {
    for (const condition of postconditions) {
      console.log(`[OODA:Act] Verifying postcondition: ${condition}`);
    }
    return true; // Simplified
  }

  private async runAction(step: ActionStep): Promise<unknown> {
    // Dispatch to appropriate action handler
    console.log(`[OODA:Act] Running action: ${step.action}`);
    return { status: "completed", action: step.action };
  }

  private generateFeedback(results: ActionResult[]): Record<string, unknown> {
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    return {
      successRate: successCount / results.length,
      failedSteps: results.filter((r) => !r.success).map((r) => r.stepId),
      totalSteps: results.length,
      averageDurationMs:
        results.reduce((sum, r) => sum + r.durationMs, 0) / results.length,
    };
  }
}
```

---

## Multi-Cycle OODA Orchestration

In complex tasks, multiple OODA cycles execute sequentially, with each cycle's Act output feeding back into the next cycle's Observe phase.

```
Cycle 1: [Observe] → [Orient] → [Decide] → [Act] ──► Result 1
              ▲                                            │
              │                                            ▼
Cycle 2: [Observe] ← ─ ─ ─ Feedback ─ ─ ─ ─ ─ ─ ─  [Orient] → [Decide] → [Act] ──► Result 2
              ▲                                                                          │
              │                                                                          ▼
Cycle 3: [Observe] ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Feedback ─ ─ ─ ─ ─ ─  Final Result
```

### Cycle Termination Conditions

| Condition | Action |
| :--- | :--- |
| All plan steps succeeded | Terminate with success |
| Max cycles ($N_{max} = 5$) reached | Terminate, escalate to HITL |
| No progress between cycles | Terminate, report deadlock |
| User cancellation signal | Terminate immediately |
| Resource budget exhausted | Terminate, report partial results |

---

## OODA Timing & Performance

### Cycle Time Budget Allocation

| Phase | Typical Budget | Hard Limit |
| :--- | :--- | :--- |
| Observe | 10-15% of cycle | 20% |
| Orient | 15-25% of cycle | 30% |
| Decide | 10-20% of cycle | 25% |
| Act | 40-60% of cycle | 70% |

### Anti-Patterns to Avoid

1. **Observe Overload**: Gathering too much context delays action. Set observation timeouts.
2. **Orient Paralysis**: Over-analyzing observations without reaching a decision. Limit orientation to 3 key insights.
3. **Decide Dithering**: Evaluating too many alternatives. Use beam search with width $k = 3$.
4. **Act Without Observe**: Skipping observation leads to actions based on stale information. Never cache across cycles.
5. **Loop Without Progress**: Repeating the same cycle without new information. Track progress metrics between cycles.

---

## Handoff & Related References
- Plan-Execute Architectures: [plan-execute-architectures.md](plan-execute-architectures.md)
- Task Decomposition Strategies: [task-decomposition-strategies.md](task-decomposition-strategies.md)
- Intent Classification: [intent-classification.md](intent-classification.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive OODA implementation details preserved)
-->
