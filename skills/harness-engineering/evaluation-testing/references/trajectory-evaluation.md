# Trajectory Evaluation

## Theoretical Foundations of Trajectory Analysis

Trajectory evaluation assesses LLM agent behavior at the step level rather than solely judging final outcomes. Given an agent that executes a sequence of actions $\tau = (a_1, a_2, \dots, a_T)$ to accomplish a task, trajectory evaluation scores each action $a_t$ in context, evaluates the overall path optimality, and identifies reasoning failures that may be masked by correct final outputs.

The core insight is that **outcome equivalence does not imply trajectory equivalence**. Two agents may produce identical final answers, but one may have taken a robust reasoning path while the other arrived at the answer through lucky guessing or flawed intermediate steps.

### Formal Trajectory Representation

A trajectory $\tau$ is defined as an ordered sequence of state-action pairs:

$$\tau = \{(s_0, a_1, s_1), (s_1, a_2, s_2), \dots, (s_{T-1}, a_T, s_T)\}$$

Where:
- $s_t$ is the agent's observable state at time $t$ (context window contents, tool outputs, memory state)
- $a_t$ is the action taken at step $t$ (tool call, reasoning step, output generation)
- $s_T$ is the terminal state containing the final output

```
+-------------------------------------------------------------------+
|                    TRAJECTORY STRUCTURE                             |
+-------------------------------------------------------------------+
|                                                                     |
|  s_0 ──[a_1]──► s_1 ──[a_2]──► s_2 ──[a_3]──► s_3 ──[a_4]──► s_T |
|   │              │              │              │              │     |
|  init          search         parse         validate       output   |
|  state         results        data          schema         final    |
|                                                                     |
|  Golden: s_0 → a_1* → s_1* → a_2* → s_2* → a_3* → s_T*          |
|  Actual: s_0 → a_1  → s_1  → a_2  → s_2  → a_3  → s_T           |
|                                                                     |
+-------------------------------------------------------------------+
```

---

## Trajectory Scoring Algorithms

### Step-Level Correctness Scoring

Each step $a_t$ in the trajectory is evaluated independently against the golden trajectory step $a_t^*$:

$$\text{StepScore}(a_t, a_t^*) = \alpha \cdot \text{ActionMatch}(a_t, a_t^*) + \beta \cdot \text{ArgMatch}(a_t, a_t^*) + \gamma \cdot \text{StateTransition}(s_t, s_t^*)$$

Where:
- $\text{ActionMatch}$: Binary indicator of whether the correct tool/action was selected
- $\text{ArgMatch}$: Similarity score between the arguments passed to the action
- $\text{StateTransition}$: Similarity between the resulting state and the expected state
- $\alpha + \beta + \gamma = 1$ (configurable weights, typically $\alpha=0.4, \beta=0.3, \gamma=0.3$)

### Aggregate Trajectory Score

The overall trajectory score combines step-level scores with path efficiency:

$$\text{TrajectoryScore}(\tau) = \omega_1 \cdot \frac{1}{T}\sum_{t=1}^{T} \text{StepScore}(a_t, a_t^*) + \omega_2 \cdot \text{PathEfficiency}(\tau) + \omega_3 \cdot \text{OutcomeScore}(s_T, s_T^*)$$

Where path efficiency penalizes unnecessary steps:

$$\text{PathEfficiency}(\tau) = \max\left(0, 1 - \frac{|\tau| - |\tau^*|}{|\tau^*|}\right)$$

---

## Semantic Step Matching

Exact string matching between trajectory steps is fragile due to the non-deterministic nature of LLM outputs. We use semantic step matching to align predicted steps to golden steps.

### Cosine Similarity Step Alignment

For each predicted step $a_t$ and golden step $a_j^*$, compute cosine similarity between their embedding representations:

$$\text{sim}(a_t, a_j^*) = \frac{E(a_t) \cdot E(a_j^*)}{\|E(a_t)\| \cdot \|E(a_j^*)\|}$$

Where $E(\cdot)$ is an embedding function (e.g., `text-embedding-3-small`).

### Hungarian Algorithm for Optimal Alignment

To find the optimal one-to-one mapping between predicted and golden steps, solve the assignment problem:

$$\min_{\pi} \sum_{t=1}^{T} (1 - \text{sim}(a_t, a_{\pi(t)}^*))$$

Using the Hungarian algorithm with $O(T^3)$ complexity.

```python
import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import List, Tuple, Dict, Any, Optional
import hashlib
import json

class TrajectoryEvaluator:
    """
    Evaluates agent trajectories against golden reference trajectories
    using semantic step matching and path optimality scoring.
    """
    
    def __init__(
        self,
        embedding_fn=None,
        action_weight: float = 0.4,
        arg_weight: float = 0.3,
        state_weight: float = 0.3,
        similarity_threshold: float = 0.85
    ):
        self.embedding_fn = embedding_fn or self._default_embedding
        self.action_weight = action_weight
        self.arg_weight = arg_weight
        self.state_weight = state_weight
        self.similarity_threshold = similarity_threshold
    
    def _default_embedding(self, text: str) -> np.ndarray:
        """
        Fallback embedding using character n-gram hashing.
        In production, replace with a real embedding model.
        """
        ngrams = [text[i:i+3] for i in range(len(text)-2)]
        vec = np.zeros(256)
        for ng in ngrams:
            idx = int(hashlib.md5(ng.encode()).hexdigest()[:4], 16) % 256
            vec[idx] += 1
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec
    
    def cosine_similarity(self, vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        """Computes cosine similarity between two vectors."""
        dot = np.dot(vec_a, vec_b)
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))
    
    def compute_similarity_matrix(
        self,
        predicted_steps: List[Dict[str, Any]],
        golden_steps: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Builds a similarity matrix between predicted and golden steps.
        Each step is represented as a dict with 'action', 'args', 'result' keys.
        """
        n_pred = len(predicted_steps)
        n_gold = len(golden_steps)
        sim_matrix = np.zeros((n_pred, n_gold))
        
        for i, pred in enumerate(predicted_steps):
            pred_text = self._step_to_text(pred)
            pred_emb = self.embedding_fn(pred_text)
            for j, gold in enumerate(golden_steps):
                gold_text = self._step_to_text(gold)
                gold_emb = self.embedding_fn(gold_text)
                sim_matrix[i, j] = self.cosine_similarity(pred_emb, gold_emb)
        
        return sim_matrix
    
    def _step_to_text(self, step: Dict[str, Any]) -> str:
        """Converts a step dictionary to a text representation for embedding."""
        parts = []
        if "action" in step:
            parts.append(f"action:{step['action']}")
        if "args" in step:
            parts.append(f"args:{json.dumps(step['args'], sort_keys=True)}")
        if "result" in step:
            result_str = str(step["result"])[:200]
            parts.append(f"result:{result_str}")
        return " | ".join(parts)
    
    def align_steps(
        self,
        predicted_steps: List[Dict[str, Any]],
        golden_steps: List[Dict[str, Any]]
    ) -> List[Tuple[int, int, float]]:
        """
        Finds optimal alignment between predicted and golden steps
        using the Hungarian algorithm.
        
        Returns list of (predicted_idx, golden_idx, similarity) tuples.
        """
        sim_matrix = self.compute_similarity_matrix(predicted_steps, golden_steps)
        
        # Hungarian algorithm minimizes cost, so we use 1 - similarity
        cost_matrix = 1 - sim_matrix
        
        # Handle rectangular matrices by padding
        n_pred, n_gold = cost_matrix.shape
        if n_pred != n_gold:
            max_dim = max(n_pred, n_gold)
            padded = np.ones((max_dim, max_dim))  # cost=1 for padding
            padded[:n_pred, :n_gold] = cost_matrix
            cost_matrix = padded
        
        row_indices, col_indices = linear_sum_assignment(cost_matrix)
        
        alignments = []
        for r, c in zip(row_indices, col_indices):
            if r < n_pred and c < n_gold:
                similarity = sim_matrix[r, c]
                alignments.append((r, c, similarity))
        
        return alignments
    
    def score_step(
        self,
        predicted: Dict[str, Any],
        golden: Dict[str, Any],
        semantic_sim: float
    ) -> Dict[str, float]:
        """
        Scores an individual step against its golden reference.
        """
        # Action match: exact match on action name
        action_match = 1.0 if predicted.get("action") == golden.get("action") else 0.0
        
        # Argument match: Jaccard similarity on argument keys and values
        pred_args = set(str(v) for v in (predicted.get("args") or {}).values())
        gold_args = set(str(v) for v in (golden.get("args") or {}).values())
        if pred_args or gold_args:
            arg_match = len(pred_args & gold_args) / len(pred_args | gold_args)
        else:
            arg_match = 1.0
        
        # State transition: use semantic similarity as proxy
        state_match = semantic_sim
        
        # Weighted combination
        total = (
            self.action_weight * action_match +
            self.arg_weight * arg_match +
            self.state_weight * state_match
        )
        
        return {
            "action_match": action_match,
            "arg_match": arg_match,
            "state_match": state_match,
            "total_score": total
        }
    
    def evaluate_trajectory(
        self,
        predicted_trajectory: List[Dict[str, Any]],
        golden_trajectory: List[Dict[str, Any]],
        final_output_score: float = None
    ) -> Dict[str, Any]:
        """
        Full trajectory evaluation pipeline.
        
        Args:
            predicted_trajectory: List of step dicts from the agent
            golden_trajectory: List of step dicts from the golden reference
            final_output_score: Optional pre-computed score for the final output
            
        Returns:
            Comprehensive evaluation report
        """
        # Step alignment
        alignments = self.align_steps(predicted_trajectory, golden_trajectory)
        
        # Score each aligned step
        step_scores = []
        for pred_idx, gold_idx, sim in alignments:
            score = self.score_step(
                predicted_trajectory[pred_idx],
                golden_trajectory[gold_idx],
                sim
            )
            score["predicted_idx"] = pred_idx
            score["golden_idx"] = gold_idx
            score["alignment_similarity"] = sim
            step_scores.append(score)
        
        # Aggregate step scores
        if step_scores:
            mean_step_score = np.mean([s["total_score"] for s in step_scores])
        else:
            mean_step_score = 0.0
        
        # Path efficiency
        len_pred = len(predicted_trajectory)
        len_gold = len(golden_trajectory)
        path_efficiency = max(0.0, 1.0 - abs(len_pred - len_gold) / max(len_gold, 1))
        
        # Unmatched steps (extra or missing)
        matched_pred = set(s["predicted_idx"] for s in step_scores)
        matched_gold = set(s["golden_idx"] for s in step_scores)
        extra_steps = [i for i in range(len_pred) if i not in matched_pred]
        missing_steps = [i for i in range(len_gold) if i not in matched_gold]
        
        # Overall trajectory score
        w_step = 0.5
        w_path = 0.2
        w_outcome = 0.3
        outcome = final_output_score if final_output_score is not None else mean_step_score
        
        overall = w_step * mean_step_score + w_path * path_efficiency + w_outcome * outcome
        
        return {
            "overall_score": float(overall),
            "mean_step_score": float(mean_step_score),
            "path_efficiency": float(path_efficiency),
            "outcome_score": float(outcome),
            "num_predicted_steps": len_pred,
            "num_golden_steps": len_gold,
            "num_aligned_steps": len(step_scores),
            "extra_steps": extra_steps,
            "missing_steps": missing_steps,
            "step_details": step_scores
        }


class TrajectoryComparator:
    """
    Compares multiple agent trajectories to identify behavioral patterns,
    common failure modes, and trajectory clusters.
    """
    
    def __init__(self, evaluator: TrajectoryEvaluator):
        self.evaluator = evaluator
    
    def compare_runs(
        self,
        trajectories: List[List[Dict[str, Any]]],
        golden: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare multiple trajectory runs against the same golden reference.
        Useful for measuring agent consistency.
        """
        scores = []
        for traj in trajectories:
            result = self.evaluator.evaluate_trajectory(traj, golden)
            scores.append(result["overall_score"])
        
        return {
            "mean_score": float(np.mean(scores)),
            "std_score": float(np.std(scores)),
            "min_score": float(np.min(scores)),
            "max_score": float(np.max(scores)),
            "consistency": float(1.0 - np.std(scores)),
            "n_runs": len(trajectories),
            "all_scores": scores
        }
    
    def identify_failure_steps(
        self,
        trajectories: List[List[Dict[str, Any]]],
        golden: List[Dict[str, Any]],
        failure_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Identifies steps that consistently fail across multiple trajectory runs.
        """
        step_failures = {}
        
        for traj in trajectories:
            result = self.evaluator.evaluate_trajectory(traj, golden)
            for step in result["step_details"]:
                gold_idx = step["golden_idx"]
                if gold_idx not in step_failures:
                    step_failures[gold_idx] = {"scores": [], "action": golden[gold_idx].get("action", "unknown")}
                step_failures[gold_idx]["scores"].append(step["total_score"])
        
        failures = []
        for gold_idx, data in step_failures.items():
            mean_score = np.mean(data["scores"])
            if mean_score < failure_threshold:
                failures.append({
                    "golden_step_index": gold_idx,
                    "action": data["action"],
                    "mean_score": float(mean_score),
                    "failure_rate": float(np.mean([1 if s < failure_threshold else 0 for s in data["scores"]])),
                    "n_evaluations": len(data["scores"])
                })
        
        return sorted(failures, key=lambda x: x["mean_score"])
```

---

## TypeScript Trajectory Evaluation

```typescript
interface TrajectoryStep {
  action: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

interface StepScore {
  actionMatch: number;
  argMatch: number;
  stateMatch: number;
  totalScore: number;
  predictedIdx: number;
  goldenIdx: number;
}

interface TrajectoryReport {
  overallScore: number;
  meanStepScore: number;
  pathEfficiency: number;
  outcomeScore: number;
  numPredictedSteps: number;
  numGoldenSteps: number;
  extraSteps: number[];
  missingSteps: number[];
  stepDetails: StepScore[];
}

class TrajectoryEvaluator {
  private actionWeight: number;
  private argWeight: number;
  private stateWeight: number;

  constructor(
    actionWeight = 0.4,
    argWeight = 0.3,
    stateWeight = 0.3
  ) {
    this.actionWeight = actionWeight;
    this.argWeight = argWeight;
    this.stateWeight = stateWeight;
  }

  /**
   * Scores an individual step against its golden reference.
   */
  scoreStep(
    predicted: TrajectoryStep,
    golden: TrajectoryStep,
    semanticSim: number
  ): Omit<StepScore, "predictedIdx" | "goldenIdx"> {
    // Action match
    const actionMatch = predicted.action === golden.action ? 1.0 : 0.0;

    // Argument similarity via Jaccard
    const predArgValues = new Set(
      Object.values(predicted.args || {}).map(String)
    );
    const goldArgValues = new Set(
      Object.values(golden.args || {}).map(String)
    );
    const intersection = new Set(
      [...predArgValues].filter((x) => goldArgValues.has(x))
    );
    const union = new Set([...predArgValues, ...goldArgValues]);
    const argMatch = union.size > 0 ? intersection.size / union.size : 1.0;

    // State match via semantic similarity
    const stateMatch = semanticSim;

    const totalScore =
      this.actionWeight * actionMatch +
      this.argWeight * argMatch +
      this.stateWeight * stateMatch;

    return { actionMatch, argMatch, stateMatch, totalScore };
  }

  /**
   * Greedy alignment of predicted steps to golden steps.
   * For production use, replace with Hungarian algorithm implementation.
   */
  alignSteps(
    predicted: TrajectoryStep[],
    golden: TrajectoryStep[]
  ): Array<{ predIdx: number; goldIdx: number; similarity: number }> {
    const alignments: Array<{
      predIdx: number;
      goldIdx: number;
      similarity: number;
    }> = [];

    const usedGolden = new Set<number>();

    for (let i = 0; i < predicted.length; i++) {
      let bestIdx = -1;
      let bestSim = -1;

      for (let j = 0; j < golden.length; j++) {
        if (usedGolden.has(j)) continue;

        const sim = this.computeStepSimilarity(predicted[i], golden[j]);
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = j;
        }
      }

      if (bestIdx >= 0 && bestSim > 0.3) {
        alignments.push({ predIdx: i, goldIdx: bestIdx, similarity: bestSim });
        usedGolden.add(bestIdx);
      }
    }

    return alignments;
  }

  /**
   * Computes similarity between two steps using action and argument overlap.
   */
  private computeStepSimilarity(
    a: TrajectoryStep,
    b: TrajectoryStep
  ): number {
    let score = 0;
    if (a.action === b.action) score += 0.5;

    const aArgs = JSON.stringify(a.args || {});
    const bArgs = JSON.stringify(b.args || {});
    const maxLen = Math.max(aArgs.length, bArgs.length);

    if (maxLen > 0) {
      let matches = 0;
      const minLen = Math.min(aArgs.length, bArgs.length);
      for (let i = 0; i < minLen; i++) {
        if (aArgs[i] === bArgs[i]) matches++;
      }
      score += 0.5 * (matches / maxLen);
    }

    return score;
  }

  /**
   * Full trajectory evaluation.
   */
  evaluate(
    predicted: TrajectoryStep[],
    golden: TrajectoryStep[],
    finalOutputScore?: number
  ): TrajectoryReport {
    const alignments = this.alignSteps(predicted, golden);

    const stepDetails: StepScore[] = alignments.map((a) => {
      const score = this.scoreStep(
        predicted[a.predIdx],
        golden[a.goldIdx],
        a.similarity
      );
      return {
        ...score,
        predictedIdx: a.predIdx,
        goldenIdx: a.goldIdx,
      };
    });

    const meanStepScore =
      stepDetails.length > 0
        ? stepDetails.reduce((sum, s) => sum + s.totalScore, 0) /
          stepDetails.length
        : 0;

    const pathEfficiency = Math.max(
      0,
      1 - Math.abs(predicted.length - golden.length) / Math.max(golden.length, 1)
    );

    const outcomeScore = finalOutputScore ?? meanStepScore;

    const matchedPred = new Set(stepDetails.map((s) => s.predictedIdx));
    const matchedGold = new Set(stepDetails.map((s) => s.goldenIdx));

    return {
      overallScore: 0.5 * meanStepScore + 0.2 * pathEfficiency + 0.3 * outcomeScore,
      meanStepScore,
      pathEfficiency,
      outcomeScore,
      numPredictedSteps: predicted.length,
      numGoldenSteps: golden.length,
      extraSteps: predicted
        .map((_, i) => i)
        .filter((i) => !matchedPred.has(i)),
      missingSteps: golden
        .map((_, i) => i)
        .filter((i) => !matchedGold.has(i)),
      stepDetails,
    };
  }
}

// --- Usage Example ---
const evaluator = new TrajectoryEvaluator();

const goldenTrajectory: TrajectoryStep[] = [
  { action: "search_web", args: { query: "weather NYC" }, result: { temp: 72 } },
  { action: "parse_data", args: { format: "json" }, result: { parsed: true } },
  { action: "generate_response", args: { template: "weather_report" }, result: "It's 72°F in NYC" },
];

const predictedTrajectory: TrajectoryStep[] = [
  { action: "search_web", args: { query: "NYC weather today" }, result: { temp: 72 } },
  { action: "parse_data", args: { format: "json" }, result: { parsed: true } },
  { action: "format_output", args: { style: "natural" }, result: "The temperature in NYC is 72°F" },
];

const report = evaluator.evaluate(predictedTrajectory, goldenTrajectory, 0.9);
console.log(JSON.stringify(report, null, 2));
```

---

## Trajectory Evaluation Strategies

### Strategy 1: Exact Trajectory Matching

The simplest approach. Steps must match exactly in order, action name, and arguments.

| Pros | Cons |
| :--- | :--- |
| Deterministic and fast | Extremely brittle |
| Easy to implement | Fails on valid alternative paths |
| Clear pass/fail semantics | Cannot handle LLM non-determinism |

### Strategy 2: Semantic Trajectory Matching

Uses embedding similarity and optimal alignment (as implemented above).

| Pros | Cons |
| :--- | :--- |
| Handles paraphrased actions | Requires embedding model |
| Tolerates reordering | Alignment can be ambiguous |
| Robust to non-determinism | Higher computational cost |

### Strategy 3: Outcome-Gated Trajectory Scoring

Only evaluates the trajectory if the final outcome is correct. This focuses trajectory analysis on understanding *how* the agent succeeded.

| Pros | Cons |
| :--- | :--- |
| Avoids penalizing creative solutions | Misses "lucky" correct answers |
| Reduces false negatives | Requires separate outcome evaluator |
| Good for exploratory agents | Can miss systematic reasoning flaws |

### Strategy 4: Trajectory Diffing

Produces a structured diff between predicted and golden trajectories, similar to code diffing.

```
  Step 1: search_web(query="weather NYC")          [MATCH ✓]
  Step 2: parse_data(format="json")                 [MATCH ✓]
- Step 3: generate_response(template="weather_report")  [GOLDEN]
+ Step 3: format_output(style="natural")            [PREDICTED - MISMATCH]
+ Step 4: validate_output(schema="weather")         [EXTRA - NOT IN GOLDEN]
```

---

## Golden Trajectory Management

### Schema for Golden Trajectories

```yaml
golden_trajectory:
  id: "gt-weather-001"
  version: "1.2.0"
  task_description: "Get current weather for NYC and format as natural language"
  difficulty: "easy"
  tags: ["weather", "api-call", "formatting"]
  
  steps:
    - index: 0
      action: "search_web"
      args:
        query: "weather NYC"
      expected_result_type: "object"
      required_fields: ["temp"]
      
    - index: 1
      action: "parse_data"
      args:
        format: "json"
      expected_result_type: "object"
      required_fields: ["parsed"]
      
    - index: 2
      action: "generate_response"
      args:
        template: "weather_report"
      expected_result_type: "string"
      
  acceptable_alternatives:
    - description: "Direct formatting without template"
      steps_override:
        2:
          action: "format_output"
          args:
            style: "natural"
  
  evaluation_config:
    allow_extra_steps: true
    max_extra_steps: 2
    allow_reordering: false
    minimum_step_score: 0.6
    minimum_trajectory_score: 0.7
```

---

## Advanced Trajectory Metrics

### Action Precision and Recall

- **Action Precision**: Fraction of predicted actions that align to golden actions
  $$P_{action} = \frac{|\text{matched predicted}|}{|\text{predicted steps}|}$$

- **Action Recall**: Fraction of golden actions that are covered by predicted actions
  $$R_{action} = \frac{|\text{matched golden}|}{|\text{golden steps}|}$$

- **Action F1**: Harmonic mean of precision and recall
  $$F1_{action} = 2 \cdot \frac{P_{action} \cdot R_{action}}{P_{action} + R_{action}}$$

### Tool Usage Efficiency

Measures whether the agent uses the minimum necessary set of tools:

$$\text{ToolEfficiency} = 1 - \frac{\text{unique tools used} - \text{unique tools needed}}{\text{unique tools needed}}$$

### Reasoning Chain Coherence

Evaluates whether each step logically follows from the previous step using an LLM-as-judge:

$$\text{Coherence}(\tau) = \frac{1}{T-1}\sum_{t=1}^{T-1} \text{Judge}(a_t, a_{t+1}, \text{context}_t)$$

---

## Integration with Eval Pipelines

### JSONL Trajectory Format for Pipeline Ingestion

```json
{"eval_id": "eval-001", "task_id": "weather-001", "trajectory": [{"action": "search_web", "args": {"query": "weather NYC"}, "result": {"temp": 72}, "latency_ms": 230}], "golden_trajectory_id": "gt-weather-001", "final_output": "It's 72°F in NYC", "model_version": "agent-v2.3.1"}
{"eval_id": "eval-002", "task_id": "code-gen-015", "trajectory": [{"action": "read_file", "args": {"path": "main.py"}, "result": "...", "latency_ms": 50}, {"action": "edit_file", "args": {"path": "main.py", "changes": "..."}, "result": "success", "latency_ms": 120}], "golden_trajectory_id": "gt-code-015", "final_output": "def fibonacci(n):\n    ...", "model_version": "agent-v2.3.1"}
```

### Batch Trajectory Evaluation Runner

```python
import json
from pathlib import Path
from typing import List

def run_batch_trajectory_eval(
    eval_file: Path,
    golden_registry: Dict[str, List[Dict[str, Any]]],
    evaluator: TrajectoryEvaluator
) -> List[Dict[str, Any]]:
    """
    Runs trajectory evaluation over a batch of JSONL eval records.
    """
    results = []
    
    with open(eval_file, "r") as f:
        for line in f:
            record = json.loads(line.strip())
            golden_id = record["golden_trajectory_id"]
            golden = golden_registry.get(golden_id)
            
            if golden is None:
                results.append({
                    "eval_id": record["eval_id"],
                    "error": f"Golden trajectory {golden_id} not found"
                })
                continue
            
            report = evaluator.evaluate_trajectory(
                predicted_trajectory=record["trajectory"],
                golden_trajectory=golden
            )
            report["eval_id"] = record["eval_id"]
            report["task_id"] = record["task_id"]
            report["model_version"] = record["model_version"]
            results.append(report)
    
    return results
```

---

## Best Practices and Anti-Patterns

### Best Practices

1. **Version golden trajectories independently**: Golden trajectories should have their own version lifecycle, not tied to agent versions.
2. **Allow acceptable alternatives**: Most tasks have multiple valid solution paths. Define alternative trajectories explicitly.
3. **Weight steps by importance**: Not all steps are equally critical. Assign higher weights to steps that have irreversible consequences.
4. **Use trajectory evaluation for debugging, not just scoring**: The step-level breakdown is most valuable for identifying exactly where an agent's reasoning diverges.
5. **Combine with outcome evaluation**: Trajectory evaluation alone can be overly strict. Use it alongside outcome-based metrics.

### Anti-Patterns

1. **Exact step matching only**: This will produce excessive false negatives due to LLM non-determinism.
2. **Ignoring step order**: While some reordering is acceptable, completely ignoring order misses logical dependency violations.
3. **Evaluating trajectories without context**: A step that seems wrong in isolation may be correct given the agent's observed state at that point.
4. **Using trajectory scores as the sole deployment gate**: Trajectory metrics should inform but not solely determine deployment decisions.

---

## Handoff & Related References
- LLM-as-Judge Patterns: [llm-as-judge-patterns.md](llm-as-judge-patterns.md)
- Benchmark Design: [benchmark-design.md](benchmark-design.md)
- Regression Detection: [regression-detection.md](regression-detection.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive trajectory evaluation algorithms & code preserved)
Strict compliance with evaluation frameworks and statistical methods.
-->
