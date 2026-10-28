# Evaluating and Testing ToT Heuristics

The state evaluator (heuristic) decides which branches survive, so its quality bounds the quality of the whole search. This file covers designing evaluators, calibrating them on labeled partial states, and testing a ToT system end to end against baselines.

## Evaluator Types

| Type | Output | Pros | Cons |
|---|---|---|---|
| Programmatic | exact pass/fail or score | free, deterministic | needs a formal check |
| LLM value (categorical) | sure / likely / impossible | simple, robust to scale drift | coarse |
| LLM value (numeric 1–10) | ordinal score | finer ranking | poorly calibrated, clusters at 7–8 |
| LLM vote | index of best candidate | comparisons easier than absolute judgments | O(n) context, position bias |
| Hybrid | programmatic filter + LLM ranking | cheap pruning, better ranking | more components to test |

## Value Prompt Template

```
You judge whether a partial solution can still reach a correct final answer.
Problem: {problem}
Partial solution:
{steps}
Answer with JSON {"rating": "sure" | "likely" | "impossible", "reason": "<one sentence>"}.
"sure" only if you can verify the remaining steps; "impossible" only if a constraint is already violated.
```

Sample the evaluator several times (e.g. 3) at moderate temperature and average mapped scores when single calls are noisy.

## Building a Labeled Set of Partial States

1. Run the search with generous budget on N problems with known answers.
2. Log every evaluated partial state.
3. Label each state: does any completion reach a correct answer? Obtain labels by programmatic completion search where possible, otherwise by expert review on a sample.
4. Keep a held-out split for regression testing.

## Calibration Metrics

```python
from __future__ import annotations

from sklearn.metrics import roc_auc_score


def evaluator_report(scores: list[float], labels: list[int], prune_threshold: float) -> dict[str, float]:
    """labels: 1 = state can still reach a correct answer."""
    pruned_good = sum(1 for s, y in zip(scores, labels) if s < prune_threshold and y == 1)
    kept_bad = sum(1 for s, y in zip(scores, labels) if s >= prune_threshold and y == 0)
    positives = sum(labels) or 1
    negatives = (len(labels) - sum(labels)) or 1
    return {
        "auc": roc_auc_score(labels, scores),
        "false_prune_rate": pruned_good / positives,   # good branches killed: hurts accuracy
        "keep_bad_rate": kept_bad / negatives,         # bad branches kept: hurts cost
    }
```

What matters most:
- False prune rate: if the evaluator kills viable branches, no amount of search recovers them.
- Ranking quality (AUC): beam/best-first depend on ordering more than absolute values.
- Choose the threshold on validation data, trading false prunes against cost.

## Bias Checks

| Bias | Test | Mitigation |
|---|---|---|
| Position bias (batched/vote) | Shuffle candidate order; compare scores | Randomize order; average over permutations |
| Length bias | Correlate score with step length | Instruct to ignore length; normalize |
| Self-preference | Same model generates and evaluates | Different model or programmatic checks |
| Verbosity of reasoning | Score changes with explanation quality, not correctness | Ask for rating before reason, or rating only |

## End-to-End Evaluation

Compare on a fixed task set:

| System | Metric |
|---|---|
| Direct / CoT (1 call) | accuracy, tokens, latency |
| Self-consistency (n samples, majority) | same |
| ToT (configured b, k, T) | same, plus calls per problem |
| Reasoning model with larger thinking budget | same |

Report accuracy with confidence intervals (bootstrap over problems) and cost per solved problem. Adopt ToT only if it wins at acceptable cost.

```python
import random


def bootstrap_ci(correct: list[int], iters: int = 2000, alpha: float = 0.05) -> tuple[float, float]:
    means = []
    for _ in range(iters):
        sample = [random.choice(correct) for _ in correct]
        means.append(sum(sample) / len(sample))
    means.sort()
    return means[int(alpha / 2 * iters)], means[int((1 - alpha / 2) * iters) - 1]
```

## Unit Tests for Search Code (no LLM)

Mock generator and evaluator with deterministic functions to test the search logic:

```python
def test_beam_returns_solution_when_reachable():
    # Arrange
    def expand(steps):          # toy space: append digits, solution is "1-2-3"
        return [steps + [d] for d in "123"]
    def value(steps):
        target = ["1", "2", "3"]
        return 1.0 if steps == target[: len(steps)] else 0.1
    # Act
    result = beam_search([], expand, value, is_solution=lambda s: s == ["1", "2", "3"], depth=3, breadth=2)
    # Assert
    assert result == ["1", "2", "3"]


def test_beam_respects_call_budget():
    # Arrange
    calls = {"n": 0}
    def expand(steps):
        calls["n"] += 1
        return [steps + ["x"]]
    # Act / Assert
    with pytest.raises(BudgetExceeded):
        beam_search([], expand, lambda s: 0.5, is_solution=lambda s: False, depth=50, breadth=1, max_calls=10)
```

(`beam_search` and `BudgetExceeded` refer to your implementation; see SKILL.md.)

Also test: empty generator output, evaluator returning all zeros, malformed evaluator output, duplicate proposals.

## Regression Testing

- Freeze the labeled partial-state set and task set; rerun when prompts, models or parameters change.
- Pin model versions for evaluation runs; record them with results.
- Track per-run: accuracy, mean calls, p95 latency, false prune rate.

## Pitfalls
- Tuning thresholds on the test set.
- Judging the evaluator only by final accuracy; it hides false prunes compensated by large budgets.
- Using numeric 1–10 scores as if calibrated probabilities.
- Comparing ToT against a weak single-shot baseline instead of self-consistency at equal cost.

## Checklist
- [ ] Programmatic checks used wherever possible
- [ ] Labeled partial-state set with held-out split
- [ ] False prune rate and AUC measured; threshold chosen on validation data
- [ ] Position/length/self-preference biases tested
- [ ] ToT compared with CoT, self-consistency and reasoning models at equal cost
- [ ] Search logic unit-tested with deterministic mocks
