# Benchmark Design

## Foundations of Agent Benchmark Engineering

Designing benchmarks for LLM agents is fundamentally different from designing benchmarks for traditional software systems. Agent benchmarks must account for stochastic outputs, multi-step reasoning, tool-augmented behavior, and the distinction between outcome correctness and process quality.

A well-designed benchmark provides a standardized, reproducible measurement of agent capabilities across defined task categories, difficulty levels, and quality dimensions.

### Benchmark Quality Criteria

```
+-------------------------------------------------------------------+
|                BENCHMARK QUALITY DIMENSIONS                       |
+-------------------------------------------------------------------+
|                                                                   |
|  Validity                                                         |
|  ├── Content validity: tasks reflect real-world usage             |
|  ├── Construct validity: metrics measure intended capabilities    |
|  ├── Criterion validity: correlates with production performance   |
|  └── Face validity: tasks appear reasonable to experts            |
|                                                                   |
|  Reliability                                                      |
|  ├── Test-retest: consistent scores across repeated runs          |
|  ├── Inter-rater: consistent across different judges              |
|  ├── Internal consistency: task items correlate within categories  |
|  └── Parallel forms: alternative task sets produce similar ranks  |
|                                                                   |
|  Discriminability                                                 |
|  ├── Ceiling avoidance: best agents don't saturate                |
|  ├── Floor avoidance: worst agents still score above zero         |
|  ├── Difficulty gradient: smooth progression from easy to hard    |
|  └── Separability: distinguishes between agent capability levels  |
|                                                                   |
|  Practicality                                                     |
|  ├── Cost efficiency: reasonable evaluation cost per run          |
|  ├── Time efficiency: completes in reasonable wall-clock time     |
|  ├── Automation: minimal human intervention required              |
|  └── Maintainability: easy to update and extend                   |
|                                                                   |
+-------------------------------------------------------------------+
```

---

## Task-Specific Benchmark Design

### Task Taxonomy for Agent Benchmarks

```
+-------------------------------------------------------------------+
|                  AGENT TASK TAXONOMY                              |
+-------------------------------------------------------------------+
|                                                                   |
|  Information Tasks                                                |
|  ├── Factual Q&A (single-hop, multi-hop)                         |
|  ├── Research synthesis                                           |
|  ├── Document summarization                                       |
|  └── Knowledge extraction                                         |
|                                                                   |
|  Action Tasks                                                     |
|  ├── Code generation / editing                                    |
|  ├── API interaction sequences                                    |
|  ├── File system operations                                       |
|  └── Database queries                                             |
|                                                                   |
|  Reasoning Tasks                                                  |
|  ├── Mathematical problem solving                                 |
|  ├── Logical deduction chains                                     |
|  ├── Planning and scheduling                                      |
|  └── Constraint satisfaction                                      |
|                                                                   |
|  Multi-Modal Tasks                                                |
|  ├── Image-grounded Q&A                                           |
|  ├── Chart/graph interpretation                                   |
|  ├── Code + documentation alignment                               |
|  └── Multi-document synthesis                                     |
|                                                                   |
+-------------------------------------------------------------------+
```

### Benchmark Task Schema

```python
import json
import hashlib
import random
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional, Callable, Set
from enum import Enum
from pathlib import Path
import statistics
import math


class DifficultyLevel(Enum):
    TRIVIAL = 1
    EASY = 2
    MEDIUM = 3
    HARD = 4
    EXPERT = 5


class TaskCategory(Enum):
    INFORMATION = "information"
    ACTION = "action"
    REASONING = "reasoning"
    MULTI_MODAL = "multi_modal"
    SAFETY = "safety"
    ROBUSTNESS = "robustness"


class EvaluationType(Enum):
    EXACT_MATCH = "exact_match"
    FUZZY_MATCH = "fuzzy_match"
    SEMANTIC_SIMILARITY = "semantic_similarity"
    CODE_EXECUTION = "code_execution"
    LLM_JUDGE = "llm_judge"
    COMPOSITE = "composite"


@dataclass
class BenchmarkTask:
    """A single benchmark task definition."""
    task_id: str
    name: str
    description: str
    category: TaskCategory
    difficulty: DifficultyLevel
    input_prompt: str
    reference_output: str
    evaluation_type: EvaluationType
    evaluation_config: Dict[str, Any] = field(default_factory=dict)
    tools_required: List[str] = field(default_factory=list)
    max_steps: int = 20
    max_tokens: int = 4096
    timeout_seconds: float = 120.0
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    alternative_outputs: List[str] = field(default_factory=list)
    grading_rubric: Dict[str, float] = field(default_factory=dict)

    def fingerprint(self) -> str:
        """Generate a content-based fingerprint for deduplication."""
        content = f"{self.input_prompt}|{self.reference_output}|{self.category.value}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]


@dataclass
class BenchmarkSuite:
    """A complete benchmark suite with metadata and tasks."""
    suite_id: str
    name: str
    version: str
    description: str
    tasks: List[BenchmarkTask]
    created_at: str = ""
    author: str = ""
    license: str = "MIT"
    total_time_budget_minutes: float = 60.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_tasks_by_category(self, category: TaskCategory) -> List[BenchmarkTask]:
        return [t for t in self.tasks if t.category == category]

    def get_tasks_by_difficulty(self, difficulty: DifficultyLevel) -> List[BenchmarkTask]:
        return [t for t in self.tasks if t.difficulty == difficulty]

    def difficulty_distribution(self) -> Dict[str, int]:
        dist = {}
        for task in self.tasks:
            key = task.difficulty.name
            dist[key] = dist.get(key, 0) + 1
        return dist

    def category_distribution(self) -> Dict[str, int]:
        dist = {}
        for task in self.tasks:
            key = task.category.value
            dist[key] = dist.get(key, 0) + 1
        return dist

    def validate(self) -> List[str]:
        """Validate suite integrity and return list of issues."""
        issues = []

        # Check for duplicate task IDs
        ids = [t.task_id for t in self.tasks]
        if len(ids) != len(set(ids)):
            issues.append("Duplicate task IDs detected")

        # Check difficulty distribution
        dist = self.difficulty_distribution()
        if len(dist) < 3:
            issues.append("Insufficient difficulty spread (need at least 3 levels)")

        # Check category coverage
        cat_dist = self.category_distribution()
        if len(cat_dist) < 2:
            issues.append("Insufficient category coverage (need at least 2)")

        # Check for empty fields
        for task in self.tasks:
            if not task.input_prompt.strip():
                issues.append(f"Task {task.task_id}: empty input prompt")
            if not task.reference_output.strip():
                issues.append(f"Task {task.task_id}: empty reference output")

        # Check content fingerprints for near-duplicates
        fingerprints = [t.fingerprint() for t in self.tasks]
        if len(fingerprints) != len(set(fingerprints)):
            issues.append("Near-duplicate tasks detected (same fingerprint)")

        return issues

    def to_json(self) -> str:
        """Serialize suite to JSON."""
        data = asdict(self)
        # Convert enums to strings
        for task in data["tasks"]:
            task["category"] = task["category"]
            task["difficulty"] = task["difficulty"]
            task["evaluation_type"] = task["evaluation_type"]
        return json.dumps(data, indent=2, default=str)
```

---

## Difficulty Scaling Methodology

### Item Response Theory (IRT) for Agent Benchmarks

IRT provides a principled framework for calibrating task difficulty based on observed agent performance patterns.

Given an agent with ability parameter $\theta$ and a task with difficulty parameter $b$, the probability of success is:

$$P(\text{success} | \theta, b) = \frac{1}{1 + e^{-a(\theta - b)}}$$

Where $a$ is the discrimination parameter (how sharply the task separates agents of different abilities).

### Difficulty Calibration

```python
import numpy as np
from typing import List, Dict, Tuple


class DifficultyCalibrator:
    """
    Calibrates task difficulty using Item Response Theory (IRT).
    Uses a 2-parameter logistic model.
    """

    def __init__(self, learning_rate: float = 0.01, max_iterations: int = 1000):
        self.learning_rate = learning_rate
        self.max_iterations = max_iterations

    def calibrate(
        self,
        response_matrix: np.ndarray,
        agent_abilities: np.ndarray = None
    ) -> Dict[str, Any]:
        """
        Calibrate task difficulty and discrimination parameters from
        a matrix of agent responses.

        Args:
            response_matrix: (n_agents x n_tasks) binary matrix
                             1 = success, 0 = failure
            agent_abilities: Optional pre-estimated agent ability parameters

        Returns:
            Dict with difficulty, discrimination, and fit statistics
        """
        n_agents, n_tasks = response_matrix.shape

        # Initialize parameters
        if agent_abilities is None:
            # Estimate abilities from raw success rates
            agent_success_rates = response_matrix.mean(axis=1)
            theta = np.log(agent_success_rates / (1 - agent_success_rates + 1e-10))
        else:
            theta = agent_abilities.copy()

        # Initialize task parameters
        task_success_rates = response_matrix.mean(axis=0)
        b = -np.log(task_success_rates / (1 - task_success_rates + 1e-10))
        a = np.ones(n_tasks)  # discrimination

        # Joint MLE via gradient ascent
        for iteration in range(self.max_iterations):
            for j in range(n_tasks):
                # Probability of success for each agent on task j
                p = 1.0 / (1.0 + np.exp(-a[j] * (theta - b[j])))
                p = np.clip(p, 1e-10, 1 - 1e-10)

                # Residuals
                residuals = response_matrix[:, j] - p

                # Gradient for difficulty
                db = -a[j] * np.sum(residuals)
                b[j] -= self.learning_rate * db

                # Gradient for discrimination
                da = np.sum(residuals * (theta - b[j]))
                a[j] += self.learning_rate * da
                a[j] = max(0.1, min(a[j], 5.0))

            # Update abilities
            for i in range(n_agents):
                p = 1.0 / (1.0 + np.exp(-a * (theta[i] - b)))
                p = np.clip(p, 1e-10, 1 - 1e-10)
                residuals = response_matrix[i, :] - p
                dtheta = np.sum(a * residuals)
                theta[i] += self.learning_rate * dtheta

        # Assign difficulty levels based on calibrated parameters
        difficulty_levels = self._assign_levels(b)

        return {
            "difficulty_parameters": b.tolist(),
            "discrimination_parameters": a.tolist(),
            "agent_abilities": theta.tolist(),
            "difficulty_levels": difficulty_levels,
            "task_success_rates": task_success_rates.tolist(),
            "model_fit": self._compute_fit(response_matrix, theta, a, b)
        }

    def _assign_levels(self, difficulties: np.ndarray) -> List[str]:
        """Assign qualitative difficulty levels based on calibrated parameters."""
        percentiles = np.percentile(difficulties, [20, 40, 60, 80])
        levels = []
        for d in difficulties:
            if d <= percentiles[0]:
                levels.append("TRIVIAL")
            elif d <= percentiles[1]:
                levels.append("EASY")
            elif d <= percentiles[2]:
                levels.append("MEDIUM")
            elif d <= percentiles[3]:
                levels.append("HARD")
            else:
                levels.append("EXPERT")
        return levels

    def _compute_fit(
        self,
        observed: np.ndarray,
        theta: np.ndarray,
        a: np.ndarray,
        b: np.ndarray
    ) -> Dict[str, float]:
        """Compute model fit statistics."""
        n_agents, n_tasks = observed.shape
        predicted = np.zeros_like(observed, dtype=float)

        for i in range(n_agents):
            for j in range(n_tasks):
                predicted[i, j] = 1.0 / (1.0 + np.exp(-a[j] * (theta[i] - b[j])))

        # Log-likelihood
        predicted_clipped = np.clip(predicted, 1e-10, 1 - 1e-10)
        log_likelihood = np.sum(
            observed * np.log(predicted_clipped) +
            (1 - observed) * np.log(1 - predicted_clipped)
        )

        # AIC and BIC
        n_params = n_tasks * 2 + n_agents  # a, b for each task + theta for each agent
        n_obs = n_agents * n_tasks
        aic = -2 * log_likelihood + 2 * n_params
        bic = -2 * log_likelihood + n_params * np.log(n_obs)

        # RMSE
        rmse = np.sqrt(np.mean((observed - predicted) ** 2))

        return {
            "log_likelihood": float(log_likelihood),
            "aic": float(aic),
            "bic": float(bic),
            "rmse": float(rmse)
        }


def generate_difficulty_scaled_tasks(
    base_task: Dict[str, Any],
    difficulty_levels: int = 5,
    scaling_dimensions: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Generate multiple difficulty variants of a base task.

    Scaling dimensions include:
    - context_length: amount of context the agent must process
    - num_steps: number of steps required
    - constraint_count: number of constraints to satisfy
    - ambiguity: level of ambiguity in instructions
    - distractor_count: number of irrelevant information pieces
    """
    if scaling_dimensions is None:
        scaling_dimensions = [
            "context_length", "num_steps", "constraint_count", "ambiguity"
        ]

    tasks = []
    for level in range(1, difficulty_levels + 1):
        task = base_task.copy()
        task["difficulty"] = level
        task["difficulty_label"] = DifficultyLevel(level).name

        # Scale each dimension
        scaling_factor = level / difficulty_levels
        task["scaling_config"] = {}

        for dim in scaling_dimensions:
            if dim == "context_length":
                task["scaling_config"]["context_tokens"] = int(500 + 3500 * scaling_factor)
            elif dim == "num_steps":
                task["scaling_config"]["required_steps"] = int(1 + 9 * scaling_factor)
            elif dim == "constraint_count":
                task["scaling_config"]["constraints"] = int(1 + 7 * scaling_factor)
            elif dim == "ambiguity":
                task["scaling_config"]["ambiguity_score"] = round(scaling_factor, 2)
            elif dim == "distractor_count":
                task["scaling_config"]["distractors"] = int(scaling_factor * 5)

        tasks.append(task)

    return tasks
```

---

## Golden Dataset Design

### Golden Dataset Requirements

A golden dataset is a curated, expert-verified collection of input-output pairs that serves as the ground truth for evaluation. For agent benchmarks, golden datasets must capture not just final outputs but expected intermediate behaviors.

```
+-------------------------------------------------------------------+
|               GOLDEN DATASET PIPELINE                            |
+-------------------------------------------------------------------+
|                                                                   |
|  ┌──────────┐     ┌──────────┐     ┌──────────┐                  |
|  │  Task    │────►│  Expert  │────►│  Review  │                  |
|  │  Design  │     │  Solve   │     │  Panel   │                  |
|  └──────────┘     └──────────┘     └──────────┘                  |
|                                         │                         |
|                                         ▼                         |
|                                    ┌──────────┐                   |
|                                    │  Quality │                   |
|                                    │  Checks  │                   |
|                                    └────┬─────┘                   |
|                                         │                         |
|                                    ┌────┴─────┐                   |
|                                    │  Version │                   |
|                                    │  & Store │                   |
|                                    └──────────┘                   |
|                                                                   |
+-------------------------------------------------------------------+
```

### Golden Dataset Schema

```yaml
golden_dataset:
  dataset_id: "gd-agent-bench-v3"
  version: "3.1.0"
  description: "Comprehensive golden dataset for multi-tool agent evaluation"
  created_by: "eval-team"
  review_status: "approved"
  review_date: "2025-01-15"
  reviewers: ["alice@company.com", "bob@company.com"]

  statistics:
    total_tasks: 500
    category_distribution:
      information: 150
      action: 180
      reasoning: 120
      safety: 50
    difficulty_distribution:
      trivial: 50
      easy: 100
      medium: 150
      hard: 150
      expert: 50
    avg_reference_output_tokens: 256
    avg_steps_in_golden_trajectory: 4.2

  quality_checks:
    inter_annotator_agreement: 0.89
    expert_review_pass_rate: 0.95
    solvability_verified: true
    difficulty_calibrated: true
    bias_audit_date: "2025-01-10"

  entries:
    - task_id: "gd-001"
      input: "Find the population of Tokyo and compare it to New York City"
      reference_output: "Tokyo has approximately 13.96 million residents (city proper), while New York City has approximately 8.34 million residents. Tokyo's population is about 67% larger than NYC's."
      golden_trajectory:
        - action: "search_web"
          args: { query: "Tokyo population 2024" }
          expected_key_info: "13.96 million"
        - action: "search_web"
          args: { query: "New York City population 2024" }
          expected_key_info: "8.34 million"
        - action: "calculate"
          args: { expression: "13.96 / 8.34" }
          expected_result: "1.67"
        - action: "generate_response"
          args: {}
      acceptable_outputs:
        - pattern: "Tokyo.*\\d+.*million.*New York.*\\d+.*million"
          type: "regex"
        - threshold: 0.85
          type: "semantic_similarity"
      evaluation_criteria:
        factual_accuracy: 0.4
        comparison_included: 0.3
        numerical_precision: 0.2
        natural_language: 0.1
```

### Golden Dataset Manager

```python
class GoldenDatasetManager:
    """
    Manages golden datasets with versioning, quality checks, and split management.
    """

    def __init__(self, storage_dir: Path):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def create_dataset(
        self,
        dataset_id: str,
        tasks: List[BenchmarkTask],
        version: str = "1.0.0",
        author: str = ""
    ) -> Dict[str, Any]:
        """Create a new versioned golden dataset."""
        # Validate tasks
        issues = self._validate_tasks(tasks)
        if issues:
            return {"status": "error", "issues": issues}

        # Generate content hash for integrity verification
        content_hash = hashlib.sha256(
            json.dumps([asdict(t) for t in tasks], sort_keys=True, default=str).encode()
        ).hexdigest()

        dataset = {
            "dataset_id": dataset_id,
            "version": version,
            "author": author,
            "content_hash": content_hash,
            "task_count": len(tasks),
            "category_distribution": self._count_categories(tasks),
            "difficulty_distribution": self._count_difficulties(tasks),
            "tasks": [asdict(t) for t in tasks]
        }

        # Store versioned dataset
        path = self.storage_dir / f"{dataset_id}-v{version}.json"
        path.write_text(json.dumps(dataset, indent=2, default=str))

        return {"status": "created", "path": str(path), "content_hash": content_hash}

    def create_splits(
        self,
        tasks: List[BenchmarkTask],
        train_ratio: float = 0.0,
        dev_ratio: float = 0.2,
        test_ratio: float = 0.8,
        stratify_by: str = "difficulty",
        seed: int = 42
    ) -> Dict[str, List[BenchmarkTask]]:
        """
        Create stratified train/dev/test splits.

        For benchmarks, we typically only need dev and test splits.
        Train split is included for few-shot prompt engineering.
        """
        random.seed(seed)

        # Group tasks by stratification key
        groups: Dict[str, List[BenchmarkTask]] = {}
        for task in tasks:
            if stratify_by == "difficulty":
                key = task.difficulty.name
            elif stratify_by == "category":
                key = task.category.value
            else:
                key = "all"
            groups.setdefault(key, []).append(task)

        train, dev, test = [], [], []

        for group_tasks in groups.values():
            random.shuffle(group_tasks)
            n = len(group_tasks)
            n_train = int(n * train_ratio)
            n_dev = int(n * dev_ratio)

            train.extend(group_tasks[:n_train])
            dev.extend(group_tasks[n_train:n_train + n_dev])
            test.extend(group_tasks[n_train + n_dev:])

        return {"train": train, "dev": dev, "test": test}

    def _validate_tasks(self, tasks: List[BenchmarkTask]) -> List[str]:
        """Validate task quality."""
        issues = []
        ids = set()
        fingerprints = set()

        for task in tasks:
            if task.task_id in ids:
                issues.append(f"Duplicate task ID: {task.task_id}")
            ids.add(task.task_id)

            fp = task.fingerprint()
            if fp in fingerprints:
                issues.append(f"Content duplicate detected: {task.task_id}")
            fingerprints.add(fp)

            if len(task.input_prompt) < 10:
                issues.append(f"Task {task.task_id}: input too short")
            if len(task.reference_output) < 5:
                issues.append(f"Task {task.task_id}: reference output too short")

        return issues

    def _count_categories(self, tasks: List[BenchmarkTask]) -> Dict[str, int]:
        counts = {}
        for t in tasks:
            k = t.category.value
            counts[k] = counts.get(k, 0) + 1
        return counts

    def _count_difficulties(self, tasks: List[BenchmarkTask]) -> Dict[str, int]:
        counts = {}
        for t in tasks:
            k = t.difficulty.name
            counts[k] = counts.get(k, 0) + 1
        return counts
```

---

## Leaderboard Metrics

### Composite Scoring

Agent leaderboards should use a composite score that weights multiple dimensions of performance. The composite score $S$ is:

$$S = \sum_{i=1}^{n} w_i \cdot \text{normalize}(m_i)$$

Where $w_i$ are dimension weights and $\text{normalize}(m_i)$ scales metric $m_i$ to $[0, 1]$.

### Metric Normalization Strategies

```python
class LeaderboardMetrics:
    """
    Computes composite leaderboard scores from multi-dimensional
    agent evaluation results.
    """

    @staticmethod
    def min_max_normalize(
        value: float,
        min_val: float,
        max_val: float
    ) -> float:
        """Normalize to [0, 1] using min-max scaling."""
        if max_val == min_val:
            return 0.5
        return (value - min_val) / (max_val - min_val)

    @staticmethod
    def z_score_normalize(
        value: float,
        mean: float,
        std: float
    ) -> float:
        """Normalize using z-score (standard score)."""
        if std == 0:
            return 0.0
        return (value - mean) / std

    @staticmethod
    def percentile_rank(
        value: float,
        all_values: List[float]
    ) -> float:
        """Compute percentile rank of a value within a distribution."""
        sorted_vals = sorted(all_values)
        n = len(sorted_vals)
        count_below = sum(1 for v in sorted_vals if v < value)
        count_equal = sum(1 for v in sorted_vals if v == value)
        return (count_below + 0.5 * count_equal) / n

    def compute_composite_score(
        self,
        metrics: Dict[str, float],
        weights: Dict[str, float],
        all_submissions: List[Dict[str, float]],
        higher_is_better: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Compute composite leaderboard score.

        Args:
            metrics: This submission's metrics
            weights: Weight for each metric (should sum to 1)
            all_submissions: All submissions' metrics for normalization
            higher_is_better: Whether higher values are better for each metric

        Returns:
            Composite score with per-metric breakdown
        """
        # Collect all values per metric for normalization
        metric_distributions = {}
        for sub in all_submissions:
            for name, value in sub.items():
                metric_distributions.setdefault(name, []).append(value)

        breakdown = {}
        composite = 0.0

        for metric_name, weight in weights.items():
            if metric_name not in metrics:
                continue

            raw_value = metrics[metric_name]
            all_vals = metric_distributions.get(metric_name, [raw_value])

            # Normalize
            normalized = self.min_max_normalize(
                raw_value, min(all_vals), max(all_vals)
            )

            # Flip if lower is better
            if not higher_is_better.get(metric_name, True):
                normalized = 1.0 - normalized

            # Percentile rank
            pct_rank = self.percentile_rank(raw_value, all_vals)
            if not higher_is_better.get(metric_name, True):
                pct_rank = 1.0 - pct_rank

            weighted_contribution = weight * normalized
            composite += weighted_contribution

            breakdown[metric_name] = {
                "raw_value": raw_value,
                "normalized": normalized,
                "percentile_rank": pct_rank,
                "weight": weight,
                "weighted_contribution": weighted_contribution
            }

        return {
            "composite_score": composite,
            "breakdown": breakdown,
            "rank_method": "min_max_normalized_weighted_sum"
        }

    def compute_elo_ratings(
        self,
        match_results: List[Tuple[str, str, str]],
        k_factor: float = 32.0,
        initial_rating: float = 1500.0
    ) -> Dict[str, float]:
        """
        Compute Elo ratings from pairwise agent comparison results.

        Args:
            match_results: List of (agent_a, agent_b, winner) tuples.
                           winner is agent_a, agent_b, or "draw"
            k_factor: Elo K-factor for rating updates
            initial_rating: Starting Elo rating

        Returns:
            Dict mapping agent IDs to their Elo ratings
        """
        ratings: Dict[str, float] = {}

        for agent_a, agent_b, winner in match_results:
            if agent_a not in ratings:
                ratings[agent_a] = initial_rating
            if agent_b not in ratings:
                ratings[agent_b] = initial_rating

            ra = ratings[agent_a]
            rb = ratings[agent_b]

            # Expected scores
            ea = 1.0 / (1.0 + 10 ** ((rb - ra) / 400))
            eb = 1.0 / (1.0 + 10 ** ((ra - rb) / 400))

            # Actual scores
            if winner == agent_a:
                sa, sb = 1.0, 0.0
            elif winner == agent_b:
                sa, sb = 0.0, 1.0
            else:  # draw
                sa, sb = 0.5, 0.5

            # Update ratings
            ratings[agent_a] = ra + k_factor * (sa - ea)
            ratings[agent_b] = rb + k_factor * (sb - eb)

        return ratings
```

---

## Reproducibility Framework

### Ensuring Benchmark Reproducibility

Reproducibility in agent benchmarks requires controlling several sources of variation:

1. **Model version**: Pin exact model versions (e.g., `gpt-4o-2024-08-06`)
2. **Temperature and sampling**: Fix temperature, top_p, and seed
3. **Tool implementations**: Version-lock tool APIs
4. **Evaluation code**: Pin evaluator versions
5. **Dataset version**: Use content-hashed datasets

### Reproducibility Manifest

```yaml
reproducibility:
  manifest_version: "1.0.0"
  benchmark_run_id: "br-20250115-001"

  environment:
    python_version: "3.11.7"
    os: "Ubuntu 22.04"
    hardware: "4x A100 80GB"
    random_seed: 42

  model:
    provider: "openai"
    model_id: "gpt-4o-2024-08-06"
    temperature: 0.0
    top_p: 1.0
    max_tokens: 4096
    seed: 42

  dataset:
    dataset_id: "gd-agent-bench-v3"
    version: "3.1.0"
    content_hash: "a1b2c3d4e5f67890"
    split: "test"
    task_count: 400

  tools:
    - name: "search_web"
      version: "2.1.0"
      mock_mode: true
      mock_data_hash: "f0e1d2c3b4a59687"
    - name: "code_executor"
      version: "1.5.0"
      sandbox: "docker"
      image: "python:3.11-slim"

  evaluator:
    type: "composite"
    version: "1.3.0"
    config_hash: "1234567890abcdef"
    judge_model: "gpt-4o-mini-2024-07-18"
    judge_temperature: 0.0

  dependencies:
    requirements_hash: "abc123def456"
    lockfile_hash: "789ghi012jkl"
```

### Reproducibility Checker

```python
class ReproducibilityChecker:
    """
    Validates that a benchmark run is reproducible by verifying
    all configuration components match the manifest.
    """

    def __init__(self, manifest: Dict[str, Any]):
        self.manifest = manifest
        self.checks: List[Dict[str, Any]] = []

    def verify_dataset(self, dataset_path: Path) -> bool:
        """Verify dataset integrity against manifest hash."""
        content = dataset_path.read_text()
        actual_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        expected_hash = self.manifest["dataset"]["content_hash"]

        passed = actual_hash == expected_hash
        self.checks.append({
            "check": "dataset_integrity",
            "passed": passed,
            "expected": expected_hash,
            "actual": actual_hash
        })
        return passed

    def verify_model_config(self, config: Dict[str, Any]) -> bool:
        """Verify model configuration matches manifest."""
        expected = self.manifest["model"]
        mismatches = []

        for key in ["model_id", "temperature", "top_p", "seed"]:
            if config.get(key) != expected.get(key):
                mismatches.append({
                    "field": key,
                    "expected": expected.get(key),
                    "actual": config.get(key)
                })

        passed = len(mismatches) == 0
        self.checks.append({
            "check": "model_config",
            "passed": passed,
            "mismatches": mismatches
        })
        return passed

    def generate_report(self) -> Dict[str, Any]:
        """Generate reproducibility verification report."""
        all_passed = all(c["passed"] for c in self.checks)
        return {
            "reproducible": all_passed,
            "checks_passed": sum(1 for c in self.checks if c["passed"]),
            "checks_failed": sum(1 for c in self.checks if not c["passed"]),
            "details": self.checks
        }
```

---

## TypeScript Benchmark Runner

```typescript
interface BenchmarkTask {
  taskId: string;
  name: string;
  category: string;
  difficulty: number;
  inputPrompt: string;
  referenceOutput: string;
  evaluationType: string;
  maxSteps: number;
  timeoutSeconds: number;
  tags: string[];
}

interface TaskResult {
  taskId: string;
  passed: boolean;
  score: number;
  latencyMs: number;
  stepsUsed: number;
  tokensUsed: number;
  agentOutput: string;
  error?: string;
}

interface BenchmarkReport {
  suiteId: string;
  agentVersion: string;
  timestamp: string;
  overallScore: number;
  passRate: number;
  categoryScores: Record<string, number>;
  difficultyScores: Record<string, number>;
  results: TaskResult[];
}

class BenchmarkRunner {
  private tasks: BenchmarkTask[];
  private evaluators: Map<string, (task: BenchmarkTask, output: string) => number>;

  constructor(tasks: BenchmarkTask[]) {
    this.tasks = tasks;
    this.evaluators = new Map();
  }

  registerEvaluator(
    type: string,
    fn: (task: BenchmarkTask, output: string) => number
  ): void {
    this.evaluators.set(type, fn);
  }

  async runBenchmark(
    agentFn: (input: string) => Promise<{ output: string; steps: number; tokens: number }>,
    agentVersion: string
  ): Promise<BenchmarkReport> {
    const results: TaskResult[] = [];

    for (const task of this.tasks) {
      const result = await this.runTask(agentFn, task);
      results.push(result);
    }

    return this.generateReport(results, agentVersion);
  }

  private async runTask(
    agentFn: (input: string) => Promise<{ output: string; steps: number; tokens: number }>,
    task: BenchmarkTask
  ): Promise<TaskResult> {
    const start = performance.now();

    try {
      const response = await Promise.race([
        agentFn(task.inputPrompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), task.timeoutSeconds * 1000)
        ),
      ]);

      const latency = performance.now() - start;

      const evaluator = this.evaluators.get(task.evaluationType);
      const score = evaluator ? evaluator(task, response.output) : 0;

      return {
        taskId: task.taskId,
        passed: score >= 0.7,
        score,
        latencyMs: latency,
        stepsUsed: response.steps,
        tokensUsed: response.tokens,
        agentOutput: response.output,
      };
    } catch (error) {
      return {
        taskId: task.taskId,
        passed: false,
        score: 0,
        latencyMs: performance.now() - start,
        stepsUsed: 0,
        tokensUsed: 0,
        agentOutput: "",
        error: String(error),
      };
    }
  }

  private generateReport(
    results: TaskResult[],
    agentVersion: string
  ): BenchmarkReport {
    const taskMap = new Map(this.tasks.map((t) => [t.taskId, t]));

    // Category scores
    const categoryScores: Record<string, number[]> = {};
    const difficultyScores: Record<string, number[]> = {};

    for (const result of results) {
      const task = taskMap.get(result.taskId);
      if (!task) continue;

      if (!categoryScores[task.category]) categoryScores[task.category] = [];
      categoryScores[task.category].push(result.score);

      const diffKey = `level_${task.difficulty}`;
      if (!difficultyScores[diffKey]) difficultyScores[diffKey] = [];
      difficultyScores[diffKey].push(result.score);
    }

    const avgScores = (scores: Record<string, number[]>) =>
      Object.fromEntries(
        Object.entries(scores).map(([k, v]) => [
          k,
          v.reduce((a, b) => a + b, 0) / v.length,
        ])
      );

    const overallScore =
      results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const passRate =
      results.filter((r) => r.passed).length / results.length;

    return {
      suiteId: "benchmark-suite",
      agentVersion,
      timestamp: new Date().toISOString(),
      overallScore,
      passRate,
      categoryScores: avgScores(categoryScores),
      difficultyScores: avgScores(difficultyScores),
      results,
    };
  }
}
```

---

## Best Practices and Anti-Patterns

### Best Practices

1. **Calibrate difficulty empirically**: Use IRT or similar methods rather than subjective difficulty labels.
2. **Include negative examples**: Tasks where the correct answer is "I cannot do this" or "This information is not available."
3. **Version everything**: Dataset, evaluator code, model versions, and configuration should all be pinned and hashed.
4. **Use stratified sampling**: Ensure balanced representation across categories and difficulty levels.
5. **Report confidence intervals**: Never report point estimates without uncertainty quantification.
6. **Audit for contamination**: Check that benchmark tasks are not in model training data.
7. **Design for longevity**: Create tasks that won't become trivially solvable as models improve.

### Anti-Patterns

1. **Saturation blindness**: If all agents score >95%, the benchmark is too easy and cannot distinguish capability differences.
2. **Metric gaming**: Over-reliance on a single metric invites optimization that doesn't reflect real capability.
3. **Static benchmarks**: Never updating a benchmark means it becomes increasingly stale.
4. **Ignoring cost**: A benchmark should consider tokens used and latency, not just accuracy.
5. **Cherry-picking tasks**: Selecting tasks that favor a particular agent architecture invalidates the benchmark.
