# Implement-Verify-Fix (IVF) Cycles

## Overview

The Implement-Verify-Fix (IVF) cycle is the foundational feedback loop pattern for autonomous agents.
It provides a structured mechanism for iterative refinement where the agent produces an output,
verifies correctness against defined criteria, and applies targeted corrections until convergence
is achieved or termination conditions are met.

## 1. Core IVF Loop Architecture

### 1.1 Canonical Loop Structure

```
┌─────────────────────────────────────────────────┐
│                  IVF CONTROLLER                  │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │IMPLEMENT │──▶│  VERIFY  │──▶│   FIX    │    │
│  │  Phase   │   │  Phase   │   │  Phase   │    │
│  └──────────┘   └──────────┘   └──────────┘    │
│       ▲              │              │            │
│       │              ▼              │            │
│       │         ┌──────────┐       │            │
│       │         │  PASS?   │       │            │
│       │         └──────────┘       │            │
│       │          YES │  NO         │            │
│       │              ▼   ▼─────────┘            │
│       │         ┌──────────┐                    │
│       └─────────│  RETRY   │                    │
│                 └──────────┘                    │
│                                                  │
│  Termination: max_iterations | convergence |     │
│               timeout | manual_abort             │
└─────────────────────────────────────────────────┘
```

### 1.2 State Machine Definition

The IVF loop operates as a finite state machine with the following states:

| State | Description | Transitions |
|-------|-------------|-------------|
| `IDLE` | Awaiting task input | → `IMPLEMENTING` |
| `IMPLEMENTING` | Generating output artifact | → `VERIFYING` |
| `VERIFYING` | Validating output against criteria | → `PASSED`, `FIXING` |
| `FIXING` | Applying corrections based on errors | → `IMPLEMENTING` |
| `PASSED` | Output meets all criteria | → `IDLE` (terminal) |
| `FAILED` | Max iterations or timeout exceeded | → `IDLE` (terminal) |
| `ESCALATED` | Sent to human review | → `IDLE` (terminal) |

## 2. Implementation Patterns

### 2.1 Basic IVF Loop in Python

```python
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Callable, Optional
import time
import hashlib


class IVFState(Enum):
    IDLE = auto()
    IMPLEMENTING = auto()
    VERIFYING = auto()
    FIXING = auto()
    PASSED = auto()
    FAILED = auto()
    ESCALATED = auto()


@dataclass
class VerificationResult:
    passed: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    score: float = 0.0
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class IVFConfig:
    max_iterations: int = 10
    timeout_seconds: float = 300.0
    convergence_threshold: float = 0.95
    min_improvement_rate: float = 0.01
    cycle_detection_window: int = 3
    escalation_after: int = 5
    backoff_factor: float = 1.5


@dataclass
class IterationRecord:
    iteration: int
    state: IVFState
    artifact_hash: str
    verification: VerificationResult
    fix_actions: list[str]
    duration_ms: float
    timestamp: float


class IVFLoop:
    """
    Core Implement-Verify-Fix loop controller.

    Manages the lifecycle of iterative refinement with built-in
    cycle detection, convergence analysis, and termination logic.
    """

    def __init__(
        self,
        implement_fn: Callable[[Any, list[str]], Any],
        verify_fn: Callable[[Any], VerificationResult],
        fix_fn: Callable[[Any, VerificationResult], tuple[Any, list[str]]],
        config: Optional[IVFConfig] = None,
    ):
        self.implement_fn = implement_fn
        self.verify_fn = verify_fn
        self.fix_fn = fix_fn
        self.config = config or IVFConfig()
        self.state = IVFState.IDLE
        self.history: list[IterationRecord] = []
        self._start_time: float = 0.0

    def run(self, task_input: Any) -> tuple[Any, list[IterationRecord]]:
        """Execute the IVF loop until termination."""
        self._start_time = time.time()
        self.state = IVFState.IMPLEMENTING
        artifact = None
        fix_hints: list[str] = []

        for iteration in range(1, self.config.max_iterations + 1):
            iter_start = time.time()

            # --- IMPLEMENT PHASE ---
            self.state = IVFState.IMPLEMENTING
            artifact = self.implement_fn(task_input, fix_hints)
            artifact_hash = self._hash_artifact(artifact)

            # --- VERIFY PHASE ---
            self.state = IVFState.VERIFYING
            result = self.verify_fn(artifact)

            record = IterationRecord(
                iteration=iteration,
                state=IVFState.PASSED if result.passed else IVFState.FIXING,
                artifact_hash=artifact_hash,
                verification=result,
                fix_actions=[],
                duration_ms=(time.time() - iter_start) * 1000,
                timestamp=time.time(),
            )

            # --- CHECK PASS ---
            if result.passed or result.score >= self.config.convergence_threshold:
                self.state = IVFState.PASSED
                record.state = IVFState.PASSED
                self.history.append(record)
                return artifact, self.history

            # --- CHECK TERMINATION ---
            if self._should_terminate(iteration, artifact_hash, result):
                record.state = self.state
                self.history.append(record)
                return artifact, self.history

            # --- FIX PHASE ---
            self.state = IVFState.FIXING
            artifact, fix_actions = self.fix_fn(artifact, result)
            fix_hints = result.errors
            record.fix_actions = fix_actions
            self.history.append(record)

        self.state = IVFState.FAILED
        return artifact, self.history

    def _should_terminate(
        self, iteration: int, artifact_hash: str, result: VerificationResult
    ) -> bool:
        """Evaluate all termination conditions."""
        # Timeout check
        elapsed = time.time() - self._start_time
        if elapsed >= self.config.timeout_seconds:
            self.state = IVFState.FAILED
            return True

        # Cycle detection
        if self._detect_cycle(artifact_hash):
            self.state = IVFState.ESCALATED
            return True

        # Stagnation detection
        if self._detect_stagnation():
            self.state = IVFState.ESCALATED
            return True

        # Escalation threshold
        if iteration >= self.config.escalation_after:
            self.state = IVFState.ESCALATED
            return True

        return False

    def _detect_cycle(self, current_hash: str) -> bool:
        """Detect if the agent is producing repeated outputs."""
        window = self.config.cycle_detection_window
        if len(self.history) < window:
            return False
        recent_hashes = [r.artifact_hash for r in self.history[-window:]]
        return current_hash in recent_hashes

    def _detect_stagnation(self) -> bool:
        """Detect if verification scores are no longer improving."""
        if len(self.history) < 3:
            return False
        recent_scores = [r.verification.score for r in self.history[-3:]]
        improvements = [
            recent_scores[i + 1] - recent_scores[i]
            for i in range(len(recent_scores) - 1)
        ]
        avg_improvement = sum(improvements) / len(improvements)
        return avg_improvement < self.config.min_improvement_rate

    @staticmethod
    def _hash_artifact(artifact: Any) -> str:
        """Generate a deterministic hash for cycle detection."""
        content = str(artifact).encode("utf-8")
        return hashlib.sha256(content).hexdigest()[:16]
```

### 2.2 IVF Loop in TypeScript

```typescript
interface VerificationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  details: Record<string, unknown>;
}

interface IVFConfig {
  maxIterations: number;
  timeoutMs: number;
  convergenceThreshold: number;
  minImprovementRate: number;
  cycleDetectionWindow: number;
  escalationAfter: number;
}

interface IterationRecord {
  iteration: number;
  artifactHash: string;
  verification: VerificationResult;
  fixActions: string[];
  durationMs: number;
  timestamp: number;
}

const DEFAULT_CONFIG: IVFConfig = {
  maxIterations: 10,
  timeoutMs: 300_000,
  convergenceThreshold: 0.95,
  minImprovementRate: 0.01,
  cycleDetectionWindow: 3,
  escalationAfter: 5,
};

type ImplementFn<T> = (input: unknown, hints: string[]) => Promise<T>;
type VerifyFn<T> = (artifact: T) => Promise<VerificationResult>;
type FixFn<T> = (artifact: T, result: VerificationResult) => Promise<[T, string[]]>;

class IVFLoop<T> {
  private config: IVFConfig;
  private history: IterationRecord[] = [];
  private startTime = 0;

  constructor(
    private implementFn: ImplementFn<T>,
    private verifyFn: VerifyFn<T>,
    private fixFn: FixFn<T>,
    config?: Partial<IVFConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async run(taskInput: unknown): Promise<{ artifact: T; history: IterationRecord[] }> {
    this.startTime = Date.now();
    let artifact: T | null = null;
    let fixHints: string[] = [];

    for (let i = 1; i <= this.config.maxIterations; i++) {
      const iterStart = Date.now();

      // IMPLEMENT
      artifact = await this.implementFn(taskInput, fixHints);
      const hash = this.hashArtifact(artifact);

      // VERIFY
      const result = await this.verifyFn(artifact);

      const record: IterationRecord = {
        iteration: i,
        artifactHash: hash,
        verification: result,
        fixActions: [],
        durationMs: Date.now() - iterStart,
        timestamp: Date.now(),
      };

      if (result.passed || result.score >= this.config.convergenceThreshold) {
        this.history.push(record);
        return { artifact, history: this.history };
      }

      if (this.shouldTerminate(i, hash, result)) {
        this.history.push(record);
        return { artifact, history: this.history };
      }

      // FIX
      const [fixed, actions] = await this.fixFn(artifact, result);
      artifact = fixed;
      fixHints = result.errors;
      record.fixActions = actions;
      this.history.push(record);
    }

    return { artifact: artifact!, history: this.history };
  }

  private shouldTerminate(
    iteration: number,
    hash: string,
    _result: VerificationResult
  ): boolean {
    if (Date.now() - this.startTime >= this.config.timeoutMs) return true;
    if (this.detectCycle(hash)) return true;
    if (this.detectStagnation()) return true;
    if (iteration >= this.config.escalationAfter) return true;
    return false;
  }

  private detectCycle(currentHash: string): boolean {
    const window = this.config.cycleDetectionWindow;
    if (this.history.length < window) return false;
    const recentHashes = this.history.slice(-window).map((r) => r.artifactHash);
    return recentHashes.includes(currentHash);
  }

  private detectStagnation(): boolean {
    if (this.history.length < 3) return false;
    const scores = this.history.slice(-3).map((r) => r.verification.score);
    const improvements = scores.slice(1).map((s, i) => s - scores[i]);
    const avg = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    return avg < this.config.minImprovementRate;
  }

  private hashArtifact(artifact: T): string {
    const content = JSON.stringify(artifact);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
}
```

## 3. Cycle Detection Algorithms

### 3.1 Hash-Based Cycle Detection

The simplest approach compares artifact hashes within a sliding window:

```python
class CycleDetector:
    """Detects repeating patterns in agent output sequences."""

    def __init__(self, window_size: int = 5, similarity_threshold: float = 0.95):
        self.window_size = window_size
        self.similarity_threshold = similarity_threshold
        self.hash_history: list[str] = []
        self.score_history: list[float] = []

    def record(self, artifact_hash: str, score: float) -> None:
        self.hash_history.append(artifact_hash)
        self.score_history.append(score)

    def has_exact_cycle(self) -> bool:
        """Check for exact repetition of output artifacts."""
        if len(self.hash_history) < 2:
            return False
        window = self.hash_history[-self.window_size:]
        return len(set(window)) < len(window)

    def has_oscillation(self) -> bool:
        """Detect A-B-A-B oscillation patterns."""
        if len(self.hash_history) < 4:
            return False
        recent = self.hash_history[-4:]
        return recent[0] == recent[2] and recent[1] == recent[3]

    def has_score_plateau(self, min_delta: float = 0.001) -> bool:
        """Detect when scores stop improving."""
        if len(self.score_history) < 3:
            return False
        recent = self.score_history[-3:]
        deltas = [abs(recent[i + 1] - recent[i]) for i in range(len(recent) - 1)]
        return all(d < min_delta for d in deltas)

    def get_cycle_type(self) -> str | None:
        """Return the type of cycle detected, if any."""
        if self.has_oscillation():
            return "oscillation"
        if self.has_exact_cycle():
            return "exact_repeat"
        if self.has_score_plateau():
            return "plateau"
        return None
```

### 3.2 Floyd's Cycle Detection (Tortoise and Hare)

For longer sequences where memory-efficient detection is needed:

```python
def floyd_cycle_detection(sequence: list[str]) -> tuple[bool, int, int]:
    """
    Detect cycles using Floyd's algorithm.

    Returns:
        (has_cycle, cycle_start_index, cycle_length)
    """
    if len(sequence) < 2:
        return False, -1, 0

    # Phase 1: Find meeting point
    tortoise = 1
    hare = 2
    while hare < len(sequence) and tortoise < len(sequence):
        if sequence[tortoise] == sequence[hare]:
            break
        tortoise += 1
        hare += 2

    if hare >= len(sequence) or tortoise >= len(sequence):
        return False, -1, 0

    # Phase 2: Find cycle start
    tortoise = 0
    while sequence[tortoise] != sequence[hare]:
        tortoise += 1
        hare += 1
        if hare >= len(sequence):
            return False, -1, 0

    cycle_start = tortoise

    # Phase 3: Find cycle length
    cycle_length = 1
    hare = tortoise + 1
    while hare < len(sequence) and sequence[hare] != sequence[tortoise]:
        cycle_length += 1
        hare += 1

    return True, cycle_start, cycle_length
```

## 4. Convergence Criteria

### 4.1 Convergence Evaluator

```python
from dataclasses import dataclass
import math


@dataclass
class ConvergenceCriteria:
    min_score: float = 0.90
    max_error_count: int = 0
    max_warning_count: int = 5
    required_consecutive_passes: int = 1
    score_improvement_window: int = 3
    min_improvement_per_iteration: float = 0.005


class ConvergenceEvaluator:
    """Evaluates whether the IVF loop has converged."""

    def __init__(self, criteria: ConvergenceCriteria):
        self.criteria = criteria
        self.score_history: list[float] = []
        self.pass_streak: int = 0

    def evaluate(self, result: VerificationResult) -> bool:
        """Check if the current result meets convergence criteria."""
        self.score_history.append(result.score)

        # Hard pass check
        if result.passed:
            self.pass_streak += 1
        else:
            self.pass_streak = 0

        # Consecutive pass requirement
        if self.pass_streak >= self.criteria.required_consecutive_passes:
            return True

        # Score threshold
        if result.score < self.criteria.min_score:
            return False

        # Error count
        if len(result.errors) > self.criteria.max_error_count:
            return False

        # Warning count
        if len(result.warnings) > self.criteria.max_warning_count:
            return False

        return True

    def get_convergence_rate(self) -> float:
        """Calculate the rate of convergence (higher is better)."""
        if len(self.score_history) < 2:
            return 0.0
        deltas = [
            self.score_history[i + 1] - self.score_history[i]
            for i in range(len(self.score_history) - 1)
        ]
        return sum(deltas) / len(deltas)

    def estimate_iterations_remaining(self, target_score: float = 1.0) -> int:
        """Estimate remaining iterations to reach target score."""
        rate = self.get_convergence_rate()
        if rate <= 0:
            return -1  # Not converging
        current = self.score_history[-1] if self.score_history else 0.0
        remaining = target_score - current
        return math.ceil(remaining / rate)
```

## 5. Diff-Based Verification

### 5.1 Structural Diff Verifier

```python
import difflib
from typing import NamedTuple


class DiffChunk(NamedTuple):
    operation: str  # 'add', 'remove', 'modify'
    line_start: int
    line_end: int
    old_content: str
    new_content: str


class DiffVerifier:
    """Verify changes between iterations using diff analysis."""

    def __init__(self, max_change_ratio: float = 0.5):
        self.max_change_ratio = max_change_ratio
        self.previous_artifact: str | None = None

    def verify_diff(self, current_artifact: str) -> VerificationResult:
        """Verify that changes between iterations are reasonable."""
        if self.previous_artifact is None:
            self.previous_artifact = current_artifact
            return VerificationResult(passed=True, score=1.0)

        prev_lines = self.previous_artifact.splitlines()
        curr_lines = current_artifact.splitlines()

        differ = difflib.unified_diff(prev_lines, curr_lines, lineterm="")
        diff_lines = list(differ)

        # Calculate change ratio
        additions = sum(1 for l in diff_lines if l.startswith("+") and not l.startswith("+++"))
        deletions = sum(1 for l in diff_lines if l.startswith("-") and not l.startswith("---"))
        total_changes = additions + deletions
        total_lines = max(len(prev_lines), len(curr_lines), 1)
        change_ratio = total_changes / total_lines

        errors = []
        warnings = []

        # Check for excessive changes (possible regression)
        if change_ratio > self.max_change_ratio:
            errors.append(
                f"Change ratio {change_ratio:.2%} exceeds maximum {self.max_change_ratio:.2%}"
            )

        # Check for empty output
        if len(curr_lines) == 0:
            errors.append("Output is empty after fix attempt")

        # Check for significant size reduction
        size_ratio = len(curr_lines) / max(len(prev_lines), 1)
        if size_ratio < 0.5:
            warnings.append(
                f"Output reduced to {size_ratio:.0%} of previous size"
            )

        self.previous_artifact = current_artifact

        return VerificationResult(
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            score=max(0.0, 1.0 - change_ratio),
            details={
                "additions": additions,
                "deletions": deletions,
                "change_ratio": change_ratio,
                "size_ratio": size_ratio,
            },
        )

    def get_chunks(self, old: str, new: str) -> list[DiffChunk]:
        """Extract structured diff chunks for targeted fixes."""
        matcher = difflib.SequenceMatcher(None, old.splitlines(), new.splitlines())
        chunks = []
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                continue
            old_content = "\n".join(old.splitlines()[i1:i2])
            new_content = "\n".join(new.splitlines()[j1:j2])
            chunks.append(DiffChunk(
                operation=tag,
                line_start=i1,
                line_end=i2,
                old_content=old_content,
                new_content=new_content,
            ))
        return chunks
```

## 6. Automated Fix Strategies

### 6.1 Fix Strategy Registry

```python
from abc import ABC, abstractmethod


class FixStrategy(ABC):
    """Base class for automated fix strategies."""

    @abstractmethod
    def can_handle(self, error: str) -> bool:
        """Check if this strategy can handle the given error."""
        ...

    @abstractmethod
    def apply(self, artifact: str, error: str) -> tuple[str, str]:
        """Apply the fix. Returns (fixed_artifact, description)."""
        ...


class SyntaxFixStrategy(FixStrategy):
    """Fix common syntax errors in generated code."""

    BRACKET_PAIRS = {"(": ")", "[": "]", "{": "}"}

    def can_handle(self, error: str) -> bool:
        keywords = ["syntax", "unexpected token", "bracket", "parenthesis", "brace"]
        return any(k in error.lower() for k in keywords)

    def apply(self, artifact: str, error: str) -> tuple[str, str]:
        # Balance brackets
        fixed = self._balance_brackets(artifact)
        return fixed, "Balanced mismatched brackets"

    def _balance_brackets(self, code: str) -> str:
        stack = []
        for char in code:
            if char in self.BRACKET_PAIRS:
                stack.append(self.BRACKET_PAIRS[char])
            elif char in self.BRACKET_PAIRS.values():
                if stack and stack[-1] == char:
                    stack.pop()
        # Append missing closing brackets
        return code + "".join(reversed(stack))


class ImportFixStrategy(FixStrategy):
    """Fix missing import statements."""

    COMMON_IMPORTS = {
        "os": "import os",
        "sys": "import sys",
        "json": "import json",
        "Path": "from pathlib import Path",
        "dataclass": "from dataclasses import dataclass",
        "Optional": "from typing import Optional",
        "List": "from typing import List",
        "Dict": "from typing import Dict",
    }

    def can_handle(self, error: str) -> bool:
        return "undefined" in error.lower() or "not defined" in error.lower()

    def apply(self, artifact: str, error: str) -> tuple[str, str]:
        added_imports = []
        for name, import_stmt in self.COMMON_IMPORTS.items():
            if name in error and import_stmt not in artifact:
                artifact = import_stmt + "\n" + artifact
                added_imports.append(import_stmt)
        description = f"Added imports: {', '.join(added_imports)}" if added_imports else "No imports added"
        return artifact, description


class FixStrategyRegistry:
    """Registry that selects the best fix strategy for a given error."""

    def __init__(self):
        self.strategies: list[FixStrategy] = []

    def register(self, strategy: FixStrategy) -> None:
        self.strategies.append(strategy)

    def find_strategy(self, error: str) -> FixStrategy | None:
        for strategy in self.strategies:
            if strategy.can_handle(error):
                return strategy
        return None

    def apply_fixes(
        self, artifact: str, errors: list[str]
    ) -> tuple[str, list[str]]:
        actions = []
        for error in errors:
            strategy = self.find_strategy(error)
            if strategy:
                artifact, description = strategy.apply(artifact, error)
                actions.append(description)
        return artifact, actions


# Usage
registry = FixStrategyRegistry()
registry.register(SyntaxFixStrategy())
registry.register(ImportFixStrategy())
```

## 7. Loop Termination Conditions

### 7.1 Comprehensive Termination Policy

```python
from enum import Enum


class TerminationReason(Enum):
    CONVERGED = "converged"
    MAX_ITERATIONS = "max_iterations"
    TIMEOUT = "timeout"
    CYCLE_DETECTED = "cycle_detected"
    STAGNATION = "stagnation"
    ESCALATED = "escalated_to_human"
    BUDGET_EXCEEDED = "budget_exceeded"
    QUALITY_REGRESSION = "quality_regression"
    MANUAL_ABORT = "manual_abort"


@dataclass
class TerminationPolicy:
    max_iterations: int = 10
    timeout_seconds: float = 300.0
    max_cost_usd: float = 1.0
    min_improvement_rate: float = 0.005
    regression_tolerance: float = 0.05
    max_consecutive_failures: int = 3


class TerminationEvaluator:
    """Evaluate whether the IVF loop should terminate."""

    def __init__(self, policy: TerminationPolicy):
        self.policy = policy
        self.iteration_count = 0
        self.start_time = time.time()
        self.cost_accumulated = 0.0
        self.score_history: list[float] = []
        self.consecutive_failures = 0

    def should_terminate(
        self, result: VerificationResult, cost_delta: float = 0.0
    ) -> tuple[bool, TerminationReason | None]:
        """Check all termination conditions."""
        self.iteration_count += 1
        self.cost_accumulated += cost_delta
        self.score_history.append(result.score)

        if result.passed:
            self.consecutive_failures = 0
        else:
            self.consecutive_failures += 1

        # 1. Convergence
        if result.passed:
            return True, TerminationReason.CONVERGED

        # 2. Max iterations
        if self.iteration_count >= self.policy.max_iterations:
            return True, TerminationReason.MAX_ITERATIONS

        # 3. Timeout
        elapsed = time.time() - self.start_time
        if elapsed >= self.policy.timeout_seconds:
            return True, TerminationReason.TIMEOUT

        # 4. Budget
        if self.cost_accumulated >= self.policy.max_cost_usd:
            return True, TerminationReason.BUDGET_EXCEEDED

        # 5. Stagnation
        if len(self.score_history) >= 3:
            recent = self.score_history[-3:]
            avg_delta = sum(
                recent[i + 1] - recent[i] for i in range(len(recent) - 1)
            ) / (len(recent) - 1)
            if avg_delta < self.policy.min_improvement_rate:
                return True, TerminationReason.STAGNATION

        # 6. Quality regression
        if len(self.score_history) >= 2:
            regression = self.score_history[-2] - self.score_history[-1]
            if regression > self.policy.regression_tolerance:
                return True, TerminationReason.QUALITY_REGRESSION

        # 7. Consecutive failures
        if self.consecutive_failures >= self.policy.max_consecutive_failures:
            return True, TerminationReason.ESCALATED

        return False, None
```

## 8. Advanced Patterns

### 8.1 Multi-Phase IVF with Progressive Verification

```python
@dataclass
class Phase:
    name: str
    verifiers: list[Callable[[Any], VerificationResult]]
    max_iterations: int = 5
    required_score: float = 0.9


class MultiPhaseIVF:
    """IVF loop with progressive verification phases.

    Phase 1: Syntax and structure validation
    Phase 2: Semantic correctness checking
    Phase 3: Integration and compatibility testing
    """

    def __init__(self, phases: list[Phase], implement_fn, fix_fn):
        self.phases = phases
        self.implement_fn = implement_fn
        self.fix_fn = fix_fn

    def run(self, task_input: Any) -> dict:
        artifact = None
        results = {"phases": [], "total_iterations": 0}

        for phase in self.phases:
            phase_result = {"name": phase.name, "iterations": 0, "passed": False}

            for iteration in range(phase.max_iterations):
                artifact = self.implement_fn(task_input, [])
                phase_result["iterations"] += 1
                results["total_iterations"] += 1

                all_passed = True
                for verifier in phase.verifiers:
                    vr = verifier(artifact)
                    if not vr.passed and vr.score < phase.required_score:
                        all_passed = False
                        artifact, _ = self.fix_fn(artifact, vr)
                        break

                if all_passed:
                    phase_result["passed"] = True
                    break

            results["phases"].append(phase_result)
            if not phase_result["passed"]:
                break

        return results
```

### 8.2 Parallel Verification Pipeline

```python
import asyncio


class ParallelVerifier:
    """Run multiple verification checks concurrently."""

    def __init__(self, verifiers: list[Callable[[Any], VerificationResult]]):
        self.verifiers = verifiers

    async def verify_all(self, artifact: Any) -> VerificationResult:
        """Execute all verifiers in parallel and merge results."""
        tasks = [
            asyncio.to_thread(verifier, artifact) for verifier in self.verifiers
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        merged = VerificationResult(passed=True, score=0.0)
        valid_count = 0

        for result in results:
            if isinstance(result, Exception):
                merged.errors.append(f"Verifier exception: {result}")
                merged.passed = False
                continue

            valid_count += 1
            merged.score += result.score
            merged.errors.extend(result.errors)
            merged.warnings.extend(result.warnings)

            if not result.passed:
                merged.passed = False

        if valid_count > 0:
            merged.score /= valid_count

        return merged
```

## 9. Metrics and Observability

### 9.1 IVF Metrics Collector

```python
@dataclass
class IVFMetrics:
    total_iterations: int = 0
    total_duration_ms: float = 0.0
    convergence_rate: float = 0.0
    avg_score_improvement: float = 0.0
    termination_reason: str = ""
    fix_success_rate: float = 0.0
    cycle_detections: int = 0
    final_score: float = 0.0

    def to_dict(self) -> dict:
        return {
            "total_iterations": self.total_iterations,
            "total_duration_ms": round(self.total_duration_ms, 2),
            "convergence_rate": round(self.convergence_rate, 4),
            "avg_score_improvement": round(self.avg_score_improvement, 4),
            "termination_reason": self.termination_reason,
            "fix_success_rate": round(self.fix_success_rate, 4),
            "cycle_detections": self.cycle_detections,
            "final_score": round(self.final_score, 4),
        }


def compute_metrics(history: list[IterationRecord]) -> IVFMetrics:
    """Compute summary metrics from IVF history."""
    if not history:
        return IVFMetrics()

    scores = [r.verification.score for r in history]
    improvements = [scores[i + 1] - scores[i] for i in range(len(scores) - 1)]

    return IVFMetrics(
        total_iterations=len(history),
        total_duration_ms=sum(r.duration_ms for r in history),
        convergence_rate=scores[-1] if scores else 0.0,
        avg_score_improvement=(
            sum(improvements) / len(improvements) if improvements else 0.0
        ),
        termination_reason=history[-1].state.name,
        fix_success_rate=(
            sum(1 for i in improvements if i > 0) / max(len(improvements), 1)
        ),
        final_score=scores[-1] if scores else 0.0,
    )
```

## 10. Best Practices

1. **Set conservative iteration limits**: Start with 5-10 max iterations; most tasks converge in 3-5.
2. **Always implement cycle detection**: Without it, agents can loop indefinitely producing the same output.
3. **Use progressive verification**: Start with cheap checks (syntax), escalate to expensive ones (integration tests).
4. **Track cost per iteration**: LLM calls are expensive; budget-aware termination prevents waste.
5. **Log every iteration**: Complete history enables debugging and pattern analysis.
6. **Implement backoff strategies**: Increase thinking time or change approach after repeated failures.
7. **Define clear convergence criteria**: Ambiguous criteria lead to premature termination or infinite loops.
8. **Separate verification concerns**: Each verifier should check one aspect independently.

## 11. Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| Unlimited iterations | Resource exhaustion, infinite loops | Always set `max_iterations` |
| Single monolithic verifier | Hard to diagnose failures | Decompose into layered verifiers |
| No cycle detection | Agent oscillates between two states | Hash-based or Floyd's detection |
| Ignoring warnings | Warnings accumulate into errors | Promote warnings after threshold |
| Fixed fix strategy | Same fix applied to different errors | Strategy registry with pattern matching |
| No cost tracking | Budget overruns | Accumulate and check cost per iteration |
| Resetting context each iteration | Agent loses learned corrections | Carry forward fix hints and history |
| No escalation path | Agent stuck with no human fallback | Escalate after N failed iterations |

## Related References

- `reflection-patterns.md` — Self-evaluation techniques that complement IVF verification
- `output-verification-layers.md` — Detailed verification layer implementations
- `correction-trigger-mechanisms.md` — When and how to trigger the fix phase
- `quality-gate-frameworks.md` — Gate criteria for IVF convergence decisions
