---
name: ml-model-evaluation
description: >
  Use this skill when evaluating model performance, selecting metrics, designing cross-validation strategies, diagnosing bias-variance tradeoffs, or performing statistical significance testing.
  This skill enforces: metric selection by task type, cross-validation strategy by data structure, bias-variance diagnosis, learning curve analysis, statistical significance protocol.
  Do NOT use for: hyperparameter tuning (use ml-hyperparameter-tuning), experiment tracking (use ml-experiment-tracking), model explainability (use ml-model-interpretability).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, evaluation, metrics, phase-11]
---

# ML Model Evaluation

## Purpose
Design comprehensive model evaluation frameworks with appropriate metrics, cross-validation strategies, bias-variance diagnosis, and statistical significance testing.

## Agent Protocol

### Trigger
User request includes: model evaluation, cross-validation, metrics, confusion matrix, ROC AUC, precision, recall, F1, RMSE, MAE, R-squared, bias-variance, overfitting, underfitting, learning curve, validation curve, statistical significance, holdout set, test set.

### Input Context
Before activating, verify:
- Task type (classification, regression, ranking, forecasting, recommendation).
- Dataset size and structure (iid, grouped, time-series, imbalanced).
- Business objective and which errors are most costly (FP vs FN).
- Available compute for cross-validation.
- Whether hyperparameter tuning has been done (nested CV needed).

### Output Artifact
Model evaluation framework with metric selection, CV strategy, significance testing protocol.

### Response Format
```
## Evaluation Framework
### Task Type
{classification / regression / ranking / forecasting / recommendation}

### Metrics
Primary: {name} | Target: {> value} | Threshold: {value}
Secondary: {name} | Target: {> value}
Secondary: {name} | Target: {< value}

### Cross-Validation
Strategy: {k-fold / stratified / grouped / time-series / leave-one-out}
N Folds: {N} | Repeats: {N} | Shuffle: {true/false}
Split: {train:N / val:N / test:N}

### Bias-Variance
Train Score: {value} | Val Score: {value}
Diagnosis: {high bias / high variance / good fit}

### Statistical Significance
Test: {t-test / McNemar / Wilcoxon / Bayesian}
Alpha: {0.05} | Correction: {Bonferroni / FDR}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Primary metric selected based on task type and business goal.
- [ ] Cross-validation strategy appropriate for data dependence structure.
- [ ] Learning curves generated to diagnose bias-variance.
- [ ] Statistical significance test performed between candidate models.
- [ ] Minimum performance thresholds defined for production.
- [ ] Evaluation splits defined with stratification where applicable.
- [ ] Confidence intervals reported alongside point estimates.

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Metric Selection
Classification — balanced accuracy, precision, recall, F1 for imbalanced. ROC AUC for ranking quality. PR AUC when positives are rare (<10%). Log loss for probabilistic calibration. Brier score for calibration assessment. For multi-class: macro F1 (each class equal weight), weighted F1 (weight by class support), micro F1 (global, equivalent to accuracy with balanced classes). Regression — RMSE for same-scale interpretability with outlier sensitivity. MAE for robust to outliers (median prediction). R-squared for variance explained (be careful: always increases with more features). MAPE for relative error interpretation (undefined when actual=0, asymmetric penalty). MASE for scale-independent comparison across datasets. Ranking — NDCG for graded relevance with position discount. MAP for binary relevance. MRR for first relevant result position. Precision/Recall at k for top-k recommendation quality. Forecasting — MASE (scale-independent, compares to naive forecast). sMAPE (symmetric relative error, bounded). Pinball loss (quantile forecast evaluation). CRPS (distributional forecast quality).

### Step 2: Cross-Validation Strategy
Random iid data: k-fold with 5-10 folds. Use 5 for large datasets (>100k), 10 for medium. Repeated k-fold: repeat with different shuffles to reduce variance. Imbalanced classification: stratified k-fold preserving class proportions. Use when minority class <20%. Grouped data: group k-fold ensuring all samples from same group stay together. Medical data per patient, user data per user, sensor data per device. Time-series: forward chaining or expanding window — never shuffle time-ordered data. Introduce gap between train and test to prevent autocorrelation leakage. Leave-one-out: for small datasets (<100 samples). High variance of estimate but maximizes training data. Nested CV: outer CV for unbiased evaluation, inner CV for hyperparameter tuning. Standard 5+2 or 5+3 split.

### Step 3: Bias-Variance Diagnosis
High bias (underfitting): train error high, val error similar to train. Model too simple — fix by increasing capacity (more layers/trees/depth), adding features, reducing regularization. Learning curves plateau at poor performance with convergence of train and val scores. High variance (overfitting): train error low, val error much higher. Model memorizing noise — fix by adding training data, reducing complexity, increasing regularization, earlier stopping, dropout. Learning curves show large gap between train and val scores that does not close with more data. Good fit: train and val converge at similar performance. Ideal scenario. Learning curves: plot train/val error vs training set size at 5-10 different sizes. If convergence gap shrinks with more data — more data helps. If gap persists — high bias, more data wont help.

### Step 4: Confidence Intervals
Report mean and standard deviation across CV folds: 0.87 +- 0.02. Compute 95% confidence interval: mean +- 1.96 * std / sqrt(n_folds). Bootstrap confidence interval: sample with replacement from CV scores, compute percentiles. Bayesian credible interval: assume scores follow normal distribution, compute posterior. For model comparison: confidence interval of difference between models. If 95% CI of difference excludes 0, significant at alpha=0.05.

### Step 5: Statistical Significance
Compare two models across multiple CV folds or independent runs. Paired t-test on per-fold scores: test if mean difference is significant. Assumes normal distribution of differences — use with >5 folds. McNemar test for classification: 2x2 contingency table of correct/incorrect predictions. More appropriate for classification than t-test. Wilcoxon signed-rank: non-parametric alternative to paired t-test. No normality assumption. Bayesian estimation: compute probability that model A beats model B from posterior distribution. P(A > B | data). Report effect size and uncertainty. Multiple comparison correction: Bonferroni (alpha / N_comparisons) when comparing >2 models. FDR (Benjamini-Hochberg) for less conservative control. Always correct pairwise comparisons.

### Integration with Experiment Tracking
Log all evaluation results to MLflow or Weights and Biases for full traceability across model versions.
Record: dataset version, CV split indices, per-fold metrics, aggregated metrics with confidence intervals.
Compare models using parallel coordinates or radar charts for multi-metric evaluation.
Export evaluation report as JSON for CI/CD pipeline consumption.
Automate evaluation on every model training run as a gating step.
Generate model cards documenting evaluation methodology, metrics, thresholds, and intended use cases.
Link evaluation results to training run, dataset version, and code commit hash for full reproducibility.

### Step 6: Threshold Setting
For probabilistic classifiers, optimize threshold via precision-recall curve or ROC curve. Choose threshold that maximizes F1 when precision and recall equally important. Cost-sensitive threshold: maximize profit = TP * value(TP) — FP * cost(FP). F-beta score: choose beta to weight recall (beta > 1) or precision (beta < 1). Youden's J statistic: sensitivity + specificity — 1, for equal-weight optimization. For imbalanced: adjust threshold to favor minority class recall if FN cost is high. Expected value calibration: calibrate probabilities before thresholding (Platt scaling, isotonic regression).

### Step 7: Production Thresholds
Define minimum acceptable performance: primary metric must exceed N on held-out test set. Define degradation threshold: drop of >N% from baseline triggers investigation. Define monitoring metrics for data drift (feature distribution shift), concept drift (label distribution shift), prediction drift (score distribution change). Set up data quality checks: missing rate, feature range violations, label integrity. Create manual review pipeline for predictions below confidence threshold. Automate retraining triggers when monitored metrics degrade below threshold.

### Common Pitfalls
Using accuracy on imbalanced data — always prefer balanced accuracy, F1, or PR AUC.
Evaluating on a single train/test split without cross-validation — too high variance.
Shuffling time-series data before cross-validation — leaks future information.
Tuning hyperparameters on the test set — optimistic bias, loss of generalization estimate.
Reporting only mean metric without confidence intervals — hides performance variability.
Using ROC AUC when positives are <10% — over-optimistic, PR AUC is more appropriate.
Comparing multiple models without statistical significance correction — inflated false discovery rate.
Ignoring data leakage in feature engineering — CV splits must occur before feature computation.

## Rules
- ROC AUC is misleading on highly imbalanced data — prefer PR AUC.
- Never use accuracy on imbalanced datasets — use balanced accuracy, F1, or precision-recall.
- Cross-validation must respect data dependencies — grouped data requires group k-fold.
- Time-series data must use temporal cross-validation — never shuffle time order.
- Statistical significance requires multiple evaluations — single train/test split is insufficient.
- Report confidence intervals with all metrics, not just point estimates.
- Learning curves require at least 5 training set sizes to diagnose bias-variance.
- McNemar test requires paired predictions — same test set, same random seed.
- Always set random seed for train/test splits for reproducibility.
- Separate tuning, validation, and test sets — never tune on the test set even indirectly.
- A model is ready for production only when evaluated on a held-out test set untouched during development.
- Metric selection should be done before seeing any model results to avoid cherry-picking.
- For business stakeholders, translate metrics into business impact (cost savings, revenue lift).
- Document all evaluation decisions: train/test split method, metric choice, threshold selection.

### Production Monitoring
Track primary metric over time on held-out test set — alert on degradation of >5% from baseline.
Monitor data drift using feature distribution statistics (PSI, KS test, population stability index).
Track prediction distribution shift — if score distribution changes, retrain or recalibrate.
Monitor per-class metrics separately — overall accuracy may hide class-specific degradation.
Log all evaluation results with dataset version, model version, and code commit hash.
Compare each new model against the production baseline using statistical significance tests.
Report evaluation metrics to a dashboard for team visibility and model governance.
Set up automated evaluation gates in CI/CD — block deployment if metrics fall below thresholds.

### Troubleshooting Guide
Low train and val accuracy (high bias) → increase model capacity, add features, reduce regularization.
High train accuracy but low val accuracy (high variance) → add data, reduce complexity, increase regularization.
Learning curves not converging → more data is unlikely to help; address model capacity or feature quality instead.
Conflicting metrics (high AUC but low F1) → AUC measures ranking, F1 measures threshold-specific performance.
Significant test not detecting difference → increase number of CV folds or trials; difference may be too small.
Cross-validation scores have high variance → use repeated k-fold or stratified sampling to reduce variance.
Metrics improving on validation but not on held-out test → validation set may have leakage or be too small.
Bootstrap confidence intervals too wide → increase bootstrap samples or use more data for evaluation.

### Deployment Checklist
Define minimum performance threshold for each metric before production deployment.
Document the evaluation methodology: CV strategy, metric selection rationale, threshold tuning approach.
Store evaluation results in experiment tracking system linked to model version.
Set up automated evaluation pipeline that runs on every model training run.
Define guardrail metrics for production monitoring in addition to primary metrics.
Establish retraining triggers based on monitored metric degradation.
Create a model card documenting intended use, evaluation results, and known limitations.
Validate evaluation on representative out-of-distribution samples before production release.
Pin random seed for all splits to enable exact reproduction of evaluation results.
Version the test set — document when it was created, its size, and any leakage considerations.

## References
- references/metrics-guide.md — Classification metrics with thresholds, regression metrics, probability metrics, multi-class metrics
- references/evaluation-strategies.md — Cross-validation methods, learning curves, bias-variance analysis, statistical significance, backtesting

### Edge Cases and Special Data Types
Hierarchical classification (multiple levels): evaluate per-level and aggregated metrics separately.
Multi-output regression: use multi-output R-squared, mean column-wise RMSE, average correlation.
Sparse high-dimensional data (text, genomics): evaluate on non-zero predictions only, use ranking metrics.
Imbalanced regression: use weighted RMSE, stratified sampling in CV, SMOGN for synthetic oversampling.
Survival analysis: use concordance index (C-index), Brier score at specified time points.
Sequential data (user sessions): evaluate per-session, per-step metrics, cumulative accuracy.
Paired/matched data: use paired evaluation, McNemar test, account for within-pair correlation.

### Cross-Framework Support
Scikit-learn: cross_val_score, cross_validate, learning_curve, validation_curve, permutation_test_score.
XGBoost/LightGBM: built-in eval_set with early_stopping_rounds, cv function with custom feval.
PyTorch: custom evaluation loop with torch.no_grad(), sklearn metrics via sklearn.metrics.
TensorFlow/Keras: model.evaluate() with custom metrics, callbacks for early stopping and checkpointing.
HuggingFace: Trainer with compute_metrics callback, built-in eval on every epoch.
Libraries: scikit-learn for general metrics, scipy for statistical tests, mlxtend for paired tests.

### Advanced Evaluation Tips
Use Bootstrap resampling for confidence intervals on any metric without normality assumptions.
For imbalanced datasets, use stratified sampling in train/test split and CV.
Set random_state in all splitters for exact reproducibility across evaluation runs.
Use scipy.stats.bootstrap for computing confidence intervals of metric differences between models.
For multi-label classification, use hamming loss, subset accuracy, and per-label F1 separately.
Evaluate subgroup performance when fairness is a concern: ensure consistent metrics across groups.
Use lift charts and cumulative gain charts to communicate model value to business stakeholders.
Compute feature importance on evaluation folds to assess feature stability across data splits.

## Handoff
Hand off to ml-experiment-tracking for logging evaluation results. Hand off to ml-hyperparameter-tuning if model needs optimization based on eval results.
