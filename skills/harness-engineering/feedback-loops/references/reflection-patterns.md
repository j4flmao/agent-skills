# Reflection Patterns

## Overview

Reflection patterns enable agents to evaluate their own outputs before committing results.
By implementing structured self-critique, chain-of-verification, and confidence calibration,
agents dramatically reduce error rates and improve output quality without external feedback.

## 1. Self-Critique Prompting

### 1.1 Architecture

```
┌─────────────────────────────────────────────┐
│            SELF-CRITIQUE PIPELINE           │
│                                             │
│  ┌─────────┐   ┌───────────┐   ┌────────┐ │
│  │ GENERATE │──▶│ CRITIQUE  │──▶│ REVISE │ │
│  │  Output  │   │  Output   │   │ Output │ │
│  └─────────┘   └───────────┘   └────────┘ │
│       │              │              │       │
│       ▼              ▼              ▼       │
│  [Draft v1]    [Critique]     [Draft v2]   │
│                                             │
│  Optional: Repeat critique-revise N times   │
└─────────────────────────────────────────────┘
```

### 1.2 Self-Critique Implementation

```python
from dataclasses import dataclass, field
from typing import Any, Optional
from enum import Enum


class CritiqueAspect(Enum):
    CORRECTNESS = "correctness"
    COMPLETENESS = "completeness"
    CLARITY = "clarity"
    EFFICIENCY = "efficiency"
    SAFETY = "safety"
    CONSISTENCY = "consistency"
    RELEVANCE = "relevance"


@dataclass
class CritiquePoint:
    aspect: CritiqueAspect
    severity: str  # "critical", "major", "minor", "suggestion"
    description: str
    location: Optional[str] = None
    suggested_fix: Optional[str] = None


@dataclass
class CritiqueResult:
    points: list[CritiquePoint] = field(default_factory=list)
    overall_score: float = 0.0
    should_revise: bool = False
    summary: str = ""

    @property
    def critical_count(self) -> int:
        return sum(1 for p in self.points if p.severity == "critical")

    @property
    def major_count(self) -> int:
        return sum(1 for p in self.points if p.severity == "major")


class SelfCritiqueEngine:
    """Engine for structured self-critique of agent outputs."""

    def __init__(
        self,
        llm_client: Any,
        aspects: list[CritiqueAspect] | None = None,
        revision_threshold: float = 0.7,
        max_revisions: int = 3,
    ):
        self.llm = llm_client
        self.aspects = aspects or list(CritiqueAspect)
        self.revision_threshold = revision_threshold
        self.max_revisions = max_revisions
        self.history: list[tuple[str, CritiqueResult]] = []

    def critique(self, output: str, task_description: str) -> CritiqueResult:
        """Generate a structured critique of the output."""
        critique_prompt = self._build_critique_prompt(output, task_description)
        raw_critique = self.llm.generate(critique_prompt)
        result = self._parse_critique(raw_critique)
        self.history.append((output, result))
        return result

    def revise(
        self, output: str, critique: CritiqueResult, task_description: str
    ) -> str:
        """Revise output based on critique feedback."""
        revision_prompt = self._build_revision_prompt(
            output, critique, task_description
        )
        revised = self.llm.generate(revision_prompt)
        return revised

    def critique_and_revise(
        self, output: str, task_description: str
    ) -> tuple[str, list[CritiqueResult]]:
        """Full critique-revise loop until convergence."""
        critiques = []
        current_output = output

        for i in range(self.max_revisions):
            critique = self.critique(current_output, task_description)
            critiques.append(critique)

            if not critique.should_revise:
                break

            if critique.overall_score >= self.revision_threshold:
                break

            current_output = self.revise(current_output, critique, task_description)

        return current_output, critiques

    def _build_critique_prompt(self, output: str, task: str) -> str:
        aspects_str = "\n".join(f"- {a.value}" for a in self.aspects)
        return f"""You are a rigorous reviewer. Evaluate the following output
against these aspects:
{aspects_str}

Task Description: {task}

Output to Review:
{output}

For each issue found, provide:
1. Aspect (which quality dimension)
2. Severity (critical/major/minor/suggestion)
3. Description of the issue
4. Suggested fix

End with an overall quality score from 0.0 to 1.0.
Format: JSON array of issues plus overall_score field."""

    def _build_revision_prompt(
        self, output: str, critique: CritiqueResult, task: str
    ) -> str:
        issues = "\n".join(
            f"- [{p.severity.upper()}] {p.aspect.value}: {p.description}"
            + (f" (Fix: {p.suggested_fix})" if p.suggested_fix else "")
            for p in critique.points
        )
        return f"""Revise the following output to address these issues:

{issues}

Original Task: {task}

Current Output:
{output}

Provide only the revised output. Address all critical and major issues."""

    def _parse_critique(self, raw: str) -> CritiqueResult:
        """Parse LLM critique response into structured result."""
        import json

        try:
            data = json.loads(raw)
            points = [
                CritiquePoint(
                    aspect=CritiqueAspect(p.get("aspect", "correctness")),
                    severity=p.get("severity", "minor"),
                    description=p.get("description", ""),
                    location=p.get("location"),
                    suggested_fix=p.get("suggested_fix"),
                )
                for p in data.get("issues", [])
            ]
            score = data.get("overall_score", 0.5)
            return CritiqueResult(
                points=points,
                overall_score=score,
                should_revise=score < self.revision_threshold
                or any(p.severity == "critical" for p in points),
                summary=data.get("summary", ""),
            )
        except (json.JSONDecodeError, KeyError):
            return CritiqueResult(
                overall_score=0.5,
                should_revise=True,
                summary="Failed to parse critique response",
            )
```

## 2. Chain-of-Verification (CoVe)

### 2.1 CoVe Framework

Chain-of-Verification generates verification questions from the output, answers them
independently, and cross-checks against the original output to detect hallucinations
and errors.

```
┌──────────────────────────────────────────────────┐
│            CHAIN OF VERIFICATION                 │
│                                                  │
│  Step 1: Generate initial response               │
│     ▼                                            │
│  Step 2: Plan verification questions             │
│     ▼                                            │
│  Step 3: Answer questions independently          │
│     ▼                                            │
│  Step 4: Cross-check answers vs. original        │
│     ▼                                            │
│  Step 5: Generate verified final response        │
└──────────────────────────────────────────────────┘
```

### 2.2 Implementation

```python
@dataclass
class VerificationQuestion:
    question: str
    aspect: str
    expected_type: str  # "factual", "logical", "structural"


@dataclass
class VerificationAnswer:
    question: VerificationQuestion
    independent_answer: str
    original_claim: str
    is_consistent: bool
    confidence: float


class ChainOfVerification:
    """Implements the Chain-of-Verification (CoVe) pattern."""

    def __init__(self, llm_client: Any, max_questions: int = 5):
        self.llm = llm_client
        self.max_questions = max_questions

    def verify(self, response: str, context: str) -> tuple[str, list[VerificationAnswer]]:
        """Execute full CoVe pipeline."""
        # Step 2: Generate verification questions
        questions = self._plan_questions(response, context)

        # Step 3: Answer independently
        answers = []
        for q in questions[:self.max_questions]:
            answer = self._answer_independently(q, context)
            answers.append(answer)

        # Step 4: Cross-check
        inconsistencies = [a for a in answers if not a.is_consistent]

        # Step 5: Generate final verified response
        if inconsistencies:
            final = self._revise_with_corrections(response, inconsistencies, context)
        else:
            final = response

        return final, answers

    def _plan_questions(self, response: str, context: str) -> list[VerificationQuestion]:
        """Generate verification questions from the response."""
        prompt = f"""Given this response, generate verification questions
to check its accuracy. Focus on factual claims, logical reasoning,
and structural correctness.

Response: {response}
Context: {context}

Generate {self.max_questions} questions as JSON array with fields:
question, aspect, expected_type"""

        raw = self.llm.generate(prompt)
        return self._parse_questions(raw)

    def _answer_independently(
        self, question: VerificationQuestion, context: str
    ) -> VerificationAnswer:
        """Answer a verification question without seeing the original response."""
        prompt = f"""Answer this question based solely on the given context.
Do not reference any previous response.

Question: {question.question}
Context: {context}

Provide a direct, factual answer."""

        independent = self.llm.generate(prompt)

        # Compare with original claim
        consistency = self._check_consistency(
            question.question, independent, context
        )

        return VerificationAnswer(
            question=question,
            independent_answer=independent,
            original_claim="",  # extracted during cross-check
            is_consistent=consistency > 0.7,
            confidence=consistency,
        )

    def _check_consistency(
        self, question: str, answer: str, context: str
    ) -> float:
        """Check consistency between independent answer and original claim."""
        prompt = f"""Rate the factual consistency of this answer on a scale of 0.0 to 1.0.

Question: {question}
Answer: {answer}
Context: {context}

Return only a float value."""

        raw = self.llm.generate(prompt)
        try:
            return float(raw.strip())
        except ValueError:
            return 0.5

    def _revise_with_corrections(
        self,
        original: str,
        inconsistencies: list[VerificationAnswer],
        context: str,
    ) -> str:
        """Revise the response to fix inconsistencies."""
        corrections = "\n".join(
            f"- Q: {a.question.question}\n"
            f"  Correct answer: {a.independent_answer}\n"
            f"  Confidence: {a.confidence:.2f}"
            for a in inconsistencies
        )
        prompt = f"""Revise this response to correct the following inconsistencies:

{corrections}

Original Response: {original}
Context: {context}

Provide the corrected response."""

        return self.llm.generate(prompt)

    def _parse_questions(self, raw: str) -> list[VerificationQuestion]:
        import json
        try:
            data = json.loads(raw)
            return [
                VerificationQuestion(
                    question=q["question"],
                    aspect=q.get("aspect", "factual"),
                    expected_type=q.get("expected_type", "factual"),
                )
                for q in data
            ]
        except (json.JSONDecodeError, KeyError):
            return []
```

## 3. Reflexion Framework

### 3.1 Reflexion Architecture

Reflexion extends the basic critique pattern by maintaining a persistent memory of
past failures and reflections, allowing the agent to learn from mistakes across
multiple task attempts.

```
┌──────────────────────────────────────────────────┐
│               REFLEXION LOOP                     │
│                                                  │
│  ┌────────┐   ┌────────┐   ┌──────────┐        │
│  │  ACT   │──▶│EVALUATE│──▶│ REFLECT  │        │
│  │        │   │        │   │          │        │
│  └────────┘   └────────┘   └──────────┘        │
│       ▲                         │               │
│       │    ┌──────────────┐     │               │
│       └────│   MEMORY     │◀────┘               │
│            │  (Reflections │                     │
│            │   + Lessons)  │                     │
│            └──────────────┘                     │
└──────────────────────────────────────────────────┘
```

### 3.2 Implementation

```python
from datetime import datetime


@dataclass
class Reflection:
    timestamp: str
    task_summary: str
    outcome: str  # "success", "partial", "failure"
    what_went_wrong: str
    what_to_do_differently: str
    key_lessons: list[str]
    relevance_tags: list[str]


@dataclass
class ReflexionMemory:
    reflections: list[Reflection] = field(default_factory=list)
    max_reflections: int = 50

    def add(self, reflection: Reflection) -> None:
        self.reflections.append(reflection)
        if len(self.reflections) > self.max_reflections:
            self.reflections = self.reflections[-self.max_reflections:]

    def get_relevant(self, task_tags: list[str], limit: int = 5) -> list[Reflection]:
        """Retrieve reflections relevant to the current task."""
        scored = []
        for r in self.reflections:
            overlap = len(set(r.relevance_tags) & set(task_tags))
            if overlap > 0:
                scored.append((overlap, r))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [r for _, r in scored[:limit]]

    def get_failure_patterns(self) -> dict[str, int]:
        """Extract recurring failure patterns."""
        patterns: dict[str, int] = {}
        for r in self.reflections:
            if r.outcome == "failure":
                for lesson in r.key_lessons:
                    patterns[lesson] = patterns.get(lesson, 0) + 1
        return dict(sorted(patterns.items(), key=lambda x: x[1], reverse=True))


class ReflexionAgent:
    """Agent that uses reflexion for self-improvement."""

    def __init__(self, llm_client: Any, memory: ReflexionMemory | None = None):
        self.llm = llm_client
        self.memory = memory or ReflexionMemory()
        self.max_trials = 3

    def solve(self, task: str, tags: list[str]) -> tuple[str, bool]:
        """Solve a task with reflexion-guided retry."""
        relevant_reflections = self.memory.get_relevant(tags)

        for trial in range(self.max_trials):
            # ACT: Generate solution with reflection context
            context = self._format_reflections(relevant_reflections)
            solution = self._act(task, context, trial)

            # EVALUATE: Check solution quality
            evaluation = self._evaluate(task, solution)

            if evaluation["success"]:
                # Store successful reflection
                self._reflect(task, solution, evaluation, "success", tags)
                return solution, True

            # REFLECT: Generate reflection on failure
            reflection = self._reflect(
                task, solution, evaluation, "failure", tags
            )
            relevant_reflections.append(reflection)

        return solution, False

    def _act(self, task: str, reflection_context: str, trial: int) -> str:
        prompt = f"""Solve the following task.
{"This is retry #" + str(trial + 1) + ". " if trial > 0 else ""}

{f"Previous reflections to guide you:{chr(10)}{reflection_context}" if reflection_context else ""}

Task: {task}

Provide your solution:"""
        return self.llm.generate(prompt)

    def _evaluate(self, task: str, solution: str) -> dict:
        prompt = f"""Evaluate this solution strictly.

Task: {task}
Solution: {solution}

Return JSON with:
- success: boolean
- score: float (0-1)
- errors: list of specific errors
- feedback: detailed feedback string"""

        raw = self.llm.generate(prompt)
        import json
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"success": False, "score": 0.0, "errors": ["Parse error"], "feedback": raw}

    def _reflect(
        self,
        task: str,
        solution: str,
        evaluation: dict,
        outcome: str,
        tags: list[str],
    ) -> Reflection:
        prompt = f"""Reflect on this attempt to learn from it.

Task: {task}
Solution Attempted: {solution[:500]}
Evaluation: {evaluation.get('feedback', '')}
Outcome: {outcome}

Provide reflection as JSON with fields:
- what_went_wrong: string
- what_to_do_differently: string
- key_lessons: list of strings"""

        raw = self.llm.generate(prompt)
        import json
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {
                "what_went_wrong": "Unable to parse reflection",
                "what_to_do_differently": "Improve output format",
                "key_lessons": ["Ensure JSON parseable output"],
            }

        reflection = Reflection(
            timestamp=datetime.now().isoformat(),
            task_summary=task[:200],
            outcome=outcome,
            what_went_wrong=data.get("what_went_wrong", ""),
            what_to_do_differently=data.get("what_to_do_differently", ""),
            key_lessons=data.get("key_lessons", []),
            relevance_tags=tags,
        )
        self.memory.add(reflection)
        return reflection

    def _format_reflections(self, reflections: list[Reflection]) -> str:
        if not reflections:
            return ""
        lines = []
        for i, r in enumerate(reflections, 1):
            lines.append(f"Reflection #{i} ({r.outcome}):")
            lines.append(f"  Issue: {r.what_went_wrong}")
            lines.append(f"  Better approach: {r.what_to_do_differently}")
            lines.append(f"  Lessons: {', '.join(r.key_lessons)}")
        return "\n".join(lines)
```

## 4. Inner Monologue Evaluation

### 4.1 Think-Verify-Speak Pattern

```python
@dataclass
class InnerThought:
    reasoning: str
    confidence: float
    uncertainties: list[str]
    verification_needed: bool


class InnerMonologue:
    """Implements think-verify-speak pattern for agent reasoning."""

    def __init__(self, llm_client: Any, confidence_threshold: float = 0.8):
        self.llm = llm_client
        self.confidence_threshold = confidence_threshold
        self.thought_log: list[InnerThought] = []

    def think(self, task: str, context: str) -> InnerThought:
        """Generate internal reasoning before producing output."""
        prompt = f"""Think through this task step by step internally.
Identify what you know, what you're uncertain about, and rate your confidence.

Task: {task}
Context: {context}

Respond as JSON:
- reasoning: your step-by-step thinking
- confidence: float 0-1
- uncertainties: list of things you're unsure about
- verification_needed: boolean"""

        raw = self.llm.generate(prompt)
        thought = self._parse_thought(raw)
        self.thought_log.append(thought)
        return thought

    def verify_thought(self, thought: InnerThought, context: str) -> InnerThought:
        """Self-verify internal reasoning before acting."""
        if not thought.verification_needed and thought.confidence >= self.confidence_threshold:
            return thought

        prompt = f"""Verify your reasoning. Check for logical errors,
unsupported assumptions, and missing considerations.

Your Reasoning: {thought.reasoning}
Uncertainties: {', '.join(thought.uncertainties)}
Context: {context}

Respond with corrected reasoning as JSON (same format)."""

        raw = self.llm.generate(prompt)
        verified = self._parse_thought(raw)
        self.thought_log.append(verified)
        return verified

    def speak(self, thought: InnerThought, task: str) -> str:
        """Generate final output based on verified reasoning."""
        prompt = f"""Based on your verified reasoning, provide the final response.

Your Reasoning: {thought.reasoning}
Confidence: {thought.confidence}
Task: {task}

Provide only the final response:"""

        return self.llm.generate(prompt)

    def think_verify_speak(self, task: str, context: str) -> tuple[str, InnerThought]:
        """Full think-verify-speak pipeline."""
        thought = self.think(task, context)
        verified = self.verify_thought(thought, context)
        output = self.speak(verified, task)
        return output, verified

    def _parse_thought(self, raw: str) -> InnerThought:
        import json
        try:
            data = json.loads(raw)
            return InnerThought(
                reasoning=data.get("reasoning", ""),
                confidence=float(data.get("confidence", 0.5)),
                uncertainties=data.get("uncertainties", []),
                verification_needed=data.get("verification_needed", True),
            )
        except (json.JSONDecodeError, ValueError):
            return InnerThought(
                reasoning=raw,
                confidence=0.3,
                uncertainties=["Failed to parse structured thought"],
                verification_needed=True,
            )
```

## 5. Confidence Calibration

### 5.1 Calibration Framework

```python
import math
from collections import defaultdict


@dataclass
class CalibrationBucket:
    predicted_confidence: float
    actual_accuracy: float
    count: int


class ConfidenceCalibrator:
    """Calibrate agent confidence scores to match actual accuracy."""

    def __init__(self, num_buckets: int = 10):
        self.num_buckets = num_buckets
        self.predictions: list[tuple[float, bool]] = []
        self.calibration_map: dict[int, CalibrationBucket] = {}

    def record(self, confidence: float, was_correct: bool) -> None:
        """Record a prediction outcome for calibration."""
        self.predictions.append((confidence, was_correct))

    def calibrate(self) -> list[CalibrationBucket]:
        """Compute calibration curve."""
        buckets: dict[int, list[tuple[float, bool]]] = defaultdict(list)

        for conf, correct in self.predictions:
            bucket_idx = min(
                int(conf * self.num_buckets), self.num_buckets - 1
            )
            buckets[bucket_idx].append((conf, correct))

        result = []
        for idx in range(self.num_buckets):
            items = buckets.get(idx, [])
            if items:
                avg_conf = sum(c for c, _ in items) / len(items)
                accuracy = sum(1 for _, c in items if c) / len(items)
                bucket = CalibrationBucket(
                    predicted_confidence=avg_conf,
                    actual_accuracy=accuracy,
                    count=len(items),
                )
                self.calibration_map[idx] = bucket
                result.append(bucket)

        return result

    def adjust_confidence(self, raw_confidence: float) -> float:
        """Adjust a raw confidence score using calibration data."""
        if not self.calibration_map:
            return raw_confidence

        bucket_idx = min(
            int(raw_confidence * self.num_buckets), self.num_buckets - 1
        )
        if bucket_idx in self.calibration_map:
            return self.calibration_map[bucket_idx].actual_accuracy
        return raw_confidence

    def expected_calibration_error(self) -> float:
        """Compute ECE (Expected Calibration Error)."""
        if not self.calibration_map:
            return 1.0

        total = sum(b.count for b in self.calibration_map.values())
        ece = 0.0
        for bucket in self.calibration_map.values():
            weight = bucket.count / total
            gap = abs(bucket.predicted_confidence - bucket.actual_accuracy)
            ece += weight * gap
        return ece

    def brier_score(self) -> float:
        """Compute Brier score (lower is better)."""
        if not self.predictions:
            return 1.0
        return sum(
            (conf - (1.0 if correct else 0.0)) ** 2
            for conf, correct in self.predictions
        ) / len(self.predictions)
```

### 5.2 TypeScript Confidence Calibrator

```typescript
interface CalibrationRecord {
  confidence: number;
  wasCorrect: boolean;
  timestamp: number;
}

interface CalibrationBucket {
  predictedConfidence: number;
  actualAccuracy: number;
  count: number;
}

class ConfidenceCalibrator {
  private records: CalibrationRecord[] = [];
  private numBuckets: number;

  constructor(numBuckets = 10) {
    this.numBuckets = numBuckets;
  }

  record(confidence: number, wasCorrect: boolean): void {
    this.records.push({
      confidence,
      wasCorrect,
      timestamp: Date.now(),
    });
  }

  calibrate(): CalibrationBucket[] {
    const buckets = new Map<number, CalibrationRecord[]>();

    for (const record of this.records) {
      const idx = Math.min(
        Math.floor(record.confidence * this.numBuckets),
        this.numBuckets - 1
      );
      if (!buckets.has(idx)) buckets.set(idx, []);
      buckets.get(idx)!.push(record);
    }

    const result: CalibrationBucket[] = [];
    for (const [_, items] of buckets) {
      const avgConf = items.reduce((s, r) => s + r.confidence, 0) / items.length;
      const accuracy = items.filter((r) => r.wasCorrect).length / items.length;
      result.push({
        predictedConfidence: avgConf,
        actualAccuracy: accuracy,
        count: items.length,
      });
    }

    return result.sort((a, b) => a.predictedConfidence - b.predictedConfidence);
  }

  adjustConfidence(raw: number): number {
    const buckets = this.calibrate();
    if (buckets.length === 0) return raw;

    // Find closest bucket
    let closest = buckets[0];
    let minDist = Math.abs(raw - closest.predictedConfidence);

    for (const b of buckets) {
      const dist = Math.abs(raw - b.predictedConfidence);
      if (dist < minDist) {
        minDist = dist;
        closest = b;
      }
    }

    return closest.actualAccuracy;
  }
}
```

## 6. Output Scoring Rubrics

### 6.1 Multi-Dimensional Rubric Engine

```python
@dataclass
class RubricDimension:
    name: str
    description: str
    weight: float
    levels: dict[int, str]  # score -> description
    max_score: int = 5


@dataclass
class RubricScore:
    dimension: str
    score: int
    max_score: int
    justification: str
    weighted_score: float


@dataclass
class RubricEvaluation:
    scores: list[RubricScore]
    total_weighted: float
    max_weighted: float
    percentage: float
    pass_threshold: float
    passed: bool
    summary: str


class RubricEngine:
    """Score agent outputs against multi-dimensional rubrics."""

    DEFAULT_RUBRIC = [
        RubricDimension(
            name="Correctness",
            description="Output is factually and logically correct",
            weight=0.30,
            levels={
                1: "Contains critical errors",
                2: "Contains major errors",
                3: "Contains minor errors",
                4: "Mostly correct with trivial issues",
                5: "Fully correct",
            },
        ),
        RubricDimension(
            name="Completeness",
            description="Output addresses all aspects of the task",
            weight=0.25,
            levels={
                1: "Missing most required elements",
                2: "Missing several required elements",
                3: "Missing some elements",
                4: "Nearly complete",
                5: "Fully complete",
            },
        ),
        RubricDimension(
            name="Clarity",
            description="Output is clear, well-structured, and readable",
            weight=0.15,
            levels={
                1: "Incomprehensible",
                2: "Hard to follow",
                3: "Understandable but could be clearer",
                4: "Clear and well-organized",
                5: "Exceptionally clear and well-structured",
            },
        ),
        RubricDimension(
            name="Efficiency",
            description="Solution uses appropriate approaches and resources",
            weight=0.15,
            levels={
                1: "Extremely inefficient or wasteful",
                2: "Significant inefficiencies",
                3: "Acceptable efficiency",
                4: "Good efficiency",
                5: "Optimal approach",
            },
        ),
        RubricDimension(
            name="Safety",
            description="Output avoids harmful, unsafe, or risky patterns",
            weight=0.15,
            levels={
                1: "Contains dangerous patterns",
                2: "Contains risky patterns",
                3: "Generally safe with concerns",
                4: "Safe with minor caveats",
                5: "Fully safe and follows best practices",
            },
        ),
    ]

    def __init__(
        self,
        llm_client: Any,
        dimensions: list[RubricDimension] | None = None,
        pass_threshold: float = 0.70,
    ):
        self.llm = llm_client
        self.dimensions = dimensions or self.DEFAULT_RUBRIC
        self.pass_threshold = pass_threshold

    def evaluate(self, output: str, task: str) -> RubricEvaluation:
        """Score output against all rubric dimensions."""
        scores = []
        total_weighted = 0.0
        max_weighted = 0.0

        for dim in self.dimensions:
            score = self._score_dimension(output, task, dim)
            scores.append(score)
            total_weighted += score.weighted_score
            max_weighted += dim.weight * dim.max_score

        percentage = total_weighted / max_weighted if max_weighted > 0 else 0.0

        return RubricEvaluation(
            scores=scores,
            total_weighted=total_weighted,
            max_weighted=max_weighted,
            percentage=percentage,
            pass_threshold=self.pass_threshold,
            passed=percentage >= self.pass_threshold,
            summary=self._generate_summary(scores, percentage),
        )

    def _score_dimension(
        self, output: str, task: str, dim: RubricDimension
    ) -> RubricScore:
        """Score a single rubric dimension."""
        levels_str = "\n".join(f"  {k}: {v}" for k, v in dim.levels.items())
        prompt = f"""Score this output on "{dim.name}": {dim.description}

Scoring Levels:
{levels_str}

Task: {task}
Output: {output[:2000]}

Return JSON: {{"score": <int 1-{dim.max_score}>, "justification": "<reason>"}}"""

        raw = self.llm.generate(prompt)
        import json
        try:
            data = json.loads(raw)
            score_val = max(1, min(dim.max_score, int(data["score"])))
            justification = data.get("justification", "")
        except (json.JSONDecodeError, KeyError, ValueError):
            score_val = 3
            justification = "Default score due to parse error"

        return RubricScore(
            dimension=dim.name,
            score=score_val,
            max_score=dim.max_score,
            justification=justification,
            weighted_score=dim.weight * score_val,
        )

    def _generate_summary(self, scores: list[RubricScore], percentage: float) -> str:
        lines = [f"Overall: {percentage:.0%}"]
        for s in scores:
            lines.append(f"  {s.dimension}: {s.score}/{s.max_score} - {s.justification}")
        return "\n".join(lines)
```

## 7. Composite Reflection Pipeline

### 7.1 Combining All Patterns

```python
class CompositeReflectionPipeline:
    """Combines self-critique, CoVe, inner monologue, and rubric evaluation."""

    def __init__(
        self,
        llm_client: Any,
        calibrator: ConfidenceCalibrator | None = None,
    ):
        self.critique_engine = SelfCritiqueEngine(llm_client)
        self.cove = ChainOfVerification(llm_client)
        self.monologue = InnerMonologue(llm_client)
        self.rubric = RubricEngine(llm_client)
        self.calibrator = calibrator or ConfidenceCalibrator()

    def process(self, task: str, context: str) -> dict:
        """Run complete reflection pipeline."""
        # Step 1: Think internally
        output, thought = self.monologue.think_verify_speak(task, context)

        # Step 2: Self-critique
        revised, critiques = self.critique_engine.critique_and_revise(output, task)

        # Step 3: Chain-of-Verification
        verified, cove_answers = self.cove.verify(revised, context)

        # Step 4: Rubric evaluation
        evaluation = self.rubric.evaluate(verified, task)

        # Step 5: Calibrate confidence
        raw_confidence = thought.confidence
        calibrated = self.calibrator.adjust_confidence(raw_confidence)

        return {
            "output": verified,
            "confidence": calibrated,
            "raw_confidence": raw_confidence,
            "rubric_score": evaluation.percentage,
            "passed": evaluation.passed,
            "critique_rounds": len(critiques),
            "cove_inconsistencies": sum(
                1 for a in cove_answers if not a.is_consistent
            ),
            "evaluation": evaluation,
        }
```

## 8. Best Practices

1. **Layer reflection depth by task criticality**: Simple tasks need light self-critique; complex tasks need full CoVe.
2. **Persist reflexion memories across sessions**: Failure patterns recur; cross-session memory prevents repeats.
3. **Calibrate confidence continuously**: Agent confidence drifts over time; regular calibration keeps it honest.
4. **Set revision limits**: Infinite self-critique loops degrade quality; 2-3 rounds is optimal.
5. **Use rubrics for consistent evaluation**: Ad-hoc evaluation is noisy; rubrics provide reproducible scores.
6. **Separate critic and generator roles**: Use different temperature/system prompts for generation vs. critique.
7. **Track calibration metrics**: ECE and Brier scores reveal when recalibration is needed.
8. **Avoid over-reflection on simple tasks**: Not every output needs chain-of-verification; match depth to risk.

## 9. Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| Self-confirming critique | Agent always approves its own output | Use separate system prompt for critic role |
| Infinite revision loop | Critique always finds something to fix | Set max revision count and convergence threshold |
| Confidence anchoring | Agent anchors to initial confidence regardless of evidence | Force independent re-estimation per iteration |
| Ignoring uncertainty | Agent proceeds despite low confidence | Gate actions on calibrated confidence thresholds |
| Monolithic evaluation | Single score masks dimensional weaknesses | Use multi-dimensional rubrics |
| Memory bloat | Too many reflections dilute relevance | Prune old reflections, keep only high-value ones |

## Related References

- `implement-verify-fix-cycles.md` — IVF loops that consume reflection outputs
- `output-verification-layers.md` — Verification layers used by CoVe
- `quality-gate-frameworks.md` — Quality gates informed by rubric scores
- `continuous-improvement-loops.md` — Long-term learning from reflections
