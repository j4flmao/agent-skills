# Model Evaluation Advanced: Robustness, Distribution Shift, Fairness, Calibration and Evaluation of Generative Models

Advanced evaluation techniques for models going into high-stakes or changing environments: temporal and out-of-distribution evaluation, robustness and stress testing, calibration analysis, fairness assessment, label noise, evaluation of LLM and generative systems, and evaluation infrastructure. Fundamentals, metric catalogs and model comparison tests are in sibling references.

## Temporal and Out-of-Distribution Evaluation

Models degrade when the data-generating process changes.

| Shift type | Description | Evaluation approach |
|------------|-------------|---------------------|
| Covariate shift | Input distribution changes, P(y given x) stable | Evaluate on recent periods and new segments; importance weighting estimates |
| Label (prior) shift | Class balance changes | Recompute precision and thresholds with new base rates |
| Concept drift | Relationship between x and y changes | Rolling-origin backtests; monitor delayed labels |
| New domain | New market, product or population | Hold out entire domains (leave-one-domain-out) |

Rolling-origin backtest:

```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=6, gap=7)   # gap: rows between train end and test start (label maturity)
for fold, (train_idx, test_idx) in enumerate(tscv.split(X_sorted_by_time)):
    model.fit(X_sorted_by_time.iloc[train_idx], y_sorted_by_time.iloc[train_idx])
    score = evaluate(model, X_sorted_by_time.iloc[test_idx], y_sorted_by_time.iloc[test_idx])
    print(fold, score)
```

Plot the metric per period: a downward trend predicts production decay and informs retraining frequency.

Detect shift between training and evaluation data with a domain classifier: train a model to distinguish training rows from recent rows; an AUC well above 0.5 indicates shift, and its feature importances show which features moved.

## Robustness and Stress Testing

| Test | Method |
|------|--------|
| Perturbation sensitivity | Add noise, typos, rounding, missing values; measure metric change |
| Invariance tests | Changes that should not alter the prediction (name swap in text, irrelevant field) |
| Directional expectation tests | Changes that should move the prediction in a known direction (higher debt, higher risk) |
| Boundary and extreme values | Min/max, unseen categories, empty inputs |
| Adversarial examples (where relevant) | Attack libraries for vision/NLP; for tabular, feasible manipulations by users gaming the system |
| Data pipeline failures | Simulate stale or null features as they occur in production |

Behavioral testing frameworks (CheckList-style for NLP, Deepchecks for tabular and vision) organize these as test suites run in CI.

## Calibration Analysis

When outputs are used as probabilities (risk scores, expected value calculations), evaluate calibration explicitly:

| Measure | Notes |
|---------|-------|
| Reliability diagram | Predicted probability bins vs observed frequency |
| Brier score | Mean squared error of probabilities; decomposes into calibration and refinement |
| Expected calibration error (ECE) | Weighted average gap per bin; sensitive to binning choice |
| Log loss | Penalizes confident errors strongly |

Check calibration per slice and over time: a model calibrated overall may be miscalibrated for subgroups or after a base-rate change.

## Fairness Assessment

For models that affect people, evaluate group-level behavior with metrics chosen with legal and domain experts:

| Criterion | Compares across groups | Notes |
|-----------|------------------------|-------|
| Demographic parity | Positive prediction rate | Ignores true outcomes |
| Equal opportunity | True positive rate | Focus on qualified individuals |
| Equalized odds | TPR and FPR | Stricter |
| Predictive parity | Precision | Relevant when positive predictions trigger actions |
| Calibration within groups | Probability reliability per group | Generally incompatible with equalized odds when base rates differ |

```python
from fairlearn.metrics import MetricFrame, false_positive_rate, true_positive_rate
from sklearn.metrics import precision_score

mf = MetricFrame(
    metrics={"tpr": true_positive_rate, "fpr": false_positive_rate, "precision": precision_score},
    y_true=y_test, y_pred=pred, sensitive_features=group_test,
)
print(mf.by_group)
print(mf.difference(method="between_groups"))
```

- Several criteria cannot all be satisfied simultaneously when base rates differ; choose explicitly and document the trade-off.
- Report sample sizes per group; small groups have wide confidence intervals.
- Regulations (for example the EU AI Act for high-risk systems, sector rules in credit and employment) impose documentation and testing obligations; coordinate with compliance.

## Label Quality

Evaluation is only as good as the labels.
- Estimate label noise by double-labeling a sample and measuring agreement (Cohen's or Fleiss' kappa).
- Use confident learning tools (cleanlab) to flag likely mislabeled examples for review.
- Keep a "gold" evaluation set with adjudicated labels, versioned and protected from training use.
- Delayed labels (chargebacks, churn) require waiting periods; evaluate only on matured labels.

## Evaluating LLM and Generative Systems

| Aspect | Methods |
|--------|---------|
| Task correctness (extraction, classification, code) | Exact match, F1 over fields, unit tests for generated code (pass@k) |
| Open-ended quality | Rubric-based human evaluation; LLM-as-judge with calibrated rubrics validated against human ratings |
| Faithfulness / grounding (RAG) | Claims supported by retrieved context; citation accuracy; retrieval recall@k and MRR evaluated separately |
| Safety | Red-team prompt sets, refusal correctness, jailbreak resistance, toxicity classifiers |
| Robustness | Paraphrased inputs, prompt injection in retrieved content, long or noisy inputs |
| Cost and latency | Tokens per task, p95 latency |

Practices:
- Build a versioned evaluation set from real (anonymized) queries plus targeted edge cases; keep a regression subset that runs on every prompt or model change.
- LLM judges have biases (position, verbosity, self-preference); randomize order, use pairwise comparisons with swapped positions, and periodically measure judge agreement with humans.
- Pin model versions and decoding parameters during evaluation; sample multiple generations when outputs are stochastic and report variance.
- Evaluate agents on end-to-end task success with bounded steps, not only per-step quality.

## Evaluation Infrastructure

- **Evaluation as code**: datasets, metrics, slices and acceptance thresholds in version control; runs reproducible from a commit.
- **Model cards / evaluation reports** generated automatically: data versions, metrics with intervals, slices, fairness, limitations.
- **CI gates**: block promotion if acceptance criteria or regression tests fail; allow explicit, recorded overrides.
- **Tracking**: log evaluation results to the experiment tracker linked to model versions.
- **Online evaluation**: shadow mode, interleaving (for ranking), A/B tests with guardrail metrics; reconcile offline and online results to improve offline proxies.

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| Evaluating once on a static split for a drifting domain | Rolling backtests and post-deployment monitoring |
| Fairness metrics without sample sizes or intervals | Report counts and uncertainty |
| LLM-as-judge without human validation | Calibrate judges against human labels |
| Benchmark contamination (test data seen in pretraining or prompt examples) | Private, fresh evaluation sets |
| Optimizing a proxy metric that diverges from user value | Pair offline metrics with online outcomes |

## Checklist

- [ ] Temporal backtests and domain hold-outs where shift is plausible
- [ ] Shift detection between training and recent data
- [ ] Robustness, invariance and directional tests in CI
- [ ] Calibration evaluated overall, by slice and over time
- [ ] Fairness criteria chosen and documented; group sizes and intervals reported
- [ ] Label quality measured; gold set protected
- [ ] Generative systems evaluated with versioned sets, validated judges and safety tests
- [ ] Evaluation as code with automated reports and promotion gates
