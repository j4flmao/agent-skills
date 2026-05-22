---
name: ml-model-interpretability
description: >
  Use this skill when explaining model predictions, computing feature importance, generating SHAP/LIME explanations, creating dependence plots, or building trust in ML model decisions.
  This skill enforces: global + local explanation coverage, SHAP value computation, permutation importance baseline, visualization choice (waterfall/force/dependence/summary), model-specific methods, feature interaction detection.
  Do NOT use for: model evaluation metrics (use ml-model-evaluation), hyperparameter tuning (use ml-hyperparameter-tuning), causal inference, or privacy-preserving explanations.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, interpretability, explainability, phase-11]
---

# ML Model Interpretability

## Quick Start
```python
import shap
model = load_model()
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X)
shap.summary_plot(shap_values, X)
```

## Purpose
Design interpretability strategies combining global explanations (which features matter overall) and local explanations (why this specific prediction) with appropriate visualizations.

## Agent Protocol

### Trigger
User request includes: SHAP, LIME, feature importance, model interpretability, explainability, partial dependence, PDP, ICE, SHAP values, feature contribution, global explanation, local explanation, permutation importance, breakdown plot, reason code.

### Input Context
Before activating, verify:
- Model type (tree, linear, neural network, ensemble).
- Stakeholder audience (data scientist debugging, domain expert validation, regulator compliance, end user trust).
- Deployment context (batch inference requiring speed, real-time serving, offline analysis).
- Regulatory requirements (GDPR right to explanation, model risk management).

### Output Artifact
Model interpretability strategy with global and local methods, visualization approach.

### Response Format
```
## Interpretability Strategy
### Model Type
{tree / linear / neural / ensemble}
Complexity: {low / medium / high}

### Global Methods
Method: permutation_importance | Score: {value}
Method: partial_dependence | Features: [{f1}, {f2}]
Method: {shap / feature_importance} | Ranking: [{f1}, {f2}, {f3}]

### Local Methods
Method: {shap / lime / ice} | Samples: {N}
Output: {waterfall / force / explanation_text}

### Feature Interactions
Interactions: [{f1} x {f2}, {f1} x {f3}]
Strength: {value}

### Validation
Metric: {consistency / faithfulness / stability}
Score: {value}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Global explanation method selected and applied to rank feature importance.
- [ ] Local explanation method selected for individual prediction interpretation.
- [ ] Visualizations chosen based on audience: data science vs business vs regulator.
- [ ] Feature interactions checked for non-linear models.
- [ ] Explanations validated for faithfulness to the model.
- [ ] Model-specific method used if applicable (TreeSHAP, coefficients).
- [ ] Explanation uncertainty and limitations documented.

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Global Interpretability
Permutation importance: shuffle each feature, measure performance drop. Model-agnostic, computationally efficient, not biased by feature cardinality. Run 5-10 repetitions for stable estimates. Feature importance from tree models: built-in impurity-based importance, but biased toward high-cardinality features and continuous variables. Prefer permutation or SHAP importance over impurity. SHAP global: mean absolute SHAP values across all samples. Shows average impact magnitude. Produces ranking with direction (positive/negative association). Partial dependence plots: marginal effect of feature on predictions. Y-axis = predicted outcome, X-axis = feature value. Assumes feature independence — beware of correlated features. Feature interaction: H-statistic (Friedman, range 0-1), SHAP interaction values (exact for trees), or pairwise PDP visualization. Report top-10 feature importance with direction and magnitude.

### Step 2: Local Interpretability
SHAP values: Shapley values from cooperative game theory. Each feature gets a contribution that sums to difference from baseline. Locally accurate, consistent, and unique (only method satisfying all Shapley properties). TreeSHAP for tree models (exact O(TL2^M), fast in practice). KernelSHAP for any model (slower, uses weighted linear regression). LIME: fit sparse local surrogate model around prediction point. Perturb input, weight by proximity, fit Lasso/ridge. Faster than KernelSHAP for high dimensions but unstable — results vary across runs. Run 5 times with different seeds to verify consistency. ICE curves: individual conditional expectation — how changing one feature changes this specific prediction. PDP is average of ICE curves. Centered ICE (C-ICE) starts all curves at zero at reference point — better for heterogeneity detection.

### Step 3: Model-Specific Methods
Tree models: TreeSHAP is exact and fast. Feature importance from node impurity. Partial dependence for visualizing split thresholds. Linear models: coefficients are natural explanations if features are standardized on same scale and independent. For logistic regression: odds ratios = exp(coef). For correlated features: use SHAP or permutation importance instead. Neural networks: Integrated Gradients (satisfies sensitivity and implementation invariance). Grad-CAM for convolutional layers in image models. Attention weights for transformers — interpret with caution (attention is not explanation). Layer-wise relevance propagation (LRP) for deep networks. SmoothGrad for reducing gradient noise by averaging over perturbed inputs.

### Step 4: Visualization Selection
Summary plot (beeswarm): one dot per sample per feature, colored by feature value. Best for global overview — shows importance ranking, effect direction, and heterogeneity. Waterfall plot: one prediction, cumulative feature contributions from base value. Best for single prediction explanation to business stakeholders. Force plot: interactive waterfall in HTML format, good for presentations and regulatory documentation. Dependence plot: SHAP value vs feature value, colored by interaction feature. Shows main effect, interaction strength, and heterogeneity. Bar plot: mean SHAP or mean absolute SHAP per feature. Simplest global view for non-technical audience. Decision plot: cumulative feature contributions as line chart. Good for comparing multiple predictions.

### Step 5: Explanation Validation
Consistency: similar inputs should have similar explanations (compactness). Sample near neighbor, compare explanation similarity. Faithfulness: removing top contributing features should change prediction. Remove top-k features (set to baseline), if prediction does not change, explanation is unfaithful. Monotonicity: confidence of feature effect direction should be consistent across feature range for monotonic relationships. Local accuracy: explanation model must approximate original model near the prediction point (SHAP satisfies this, LIME approximately). Stability: small input perturbations should not drastically change explanations. Add Gaussian noise, measure explanation similarity. Reproducibility: same input + same model = same explanation. Set random seeds for LIME, check deterministic SHAP implementations.

### Integration with Model Evaluation
Combine interpretability with evaluation: use SHAP to understand which features drive errors.
For misclassified samples, compute SHAP values to identify which features pushed prediction wrong.
Track feature importance stability across CV folds — high variance means unreliable feature.
Export explanations alongside predictions for audit trail and regulatory compliance.
Automate explanation generation for every production prediction using batch SHAP pipelines.
Use permutation importance as a gating metric — if feature is not important, consider removing it.
Generate interpretability report with summary plot, dependence plots, and feature interaction analysis.

### Step 6: Reporting
For data scientists: full SHAP analysis with summary, dependence, and interaction plots. For domain experts: top-5 features per prediction with actual values and direction. For regulators: legal basis, methodology description, validation results, feature engineering documentation. For end users: simple reason codes (e.g., your loan was denied because of [top 3 factors]) with recourse (what would need to change). Template for prediction explanation: Prediction: {value}. Key drivers: {feature1} ({actual_value}, {direction}+{magnitude}), {feature2}, {feature3}. Compared to average: {baseline}. For compliance: generate explanation on every prediction and log for audit trail.

### Common Pitfalls
Trusting tree-based feature importance blindly — permutation importance is unbiased, tree importance is not.
Interpreting SHAP values without knowing the baseline — always report base value context.
Using LIME without running multiple times to check stability — single run can be misleading.
Showing partial dependence plots without checking for feature correlations — correlated features distort PDPs.
Over-interpreting attention weights as explanations — attention is correlation, not causation.
Forgetting to document feature engineering when explaining — transformations change interpretation.
Generating explanations for every prediction without sampling — computational cost can be prohibitive.

## Rules
- Always compute global permutation importance as a baseline — model-agnostic and unbiased.
- TreeSHAP is preferred over KernelSHAP for tree-based models — faster and exact.
- LIME explanations can be unstable — run multiple times with different seeds to verify.
- SHAP assumes feature independence in the interventional formulation — note this limitation.
- Partial dependence plots assume feature independence — check for correlations before interpreting.
- Never interpret linear model coefficients directly if features are correlated or unstandardized.
- For deep learning, use Integrated Gradients or SmoothGrad over vanilla gradients.
- Validate explanations on known edge cases (missing values, outliers) before trusting.
- Report explanation uncertainty where possible (confidence intervals for SHAP values).
- Document feature engineering: transformations, interactions, encoding affect interpretability.
- SHAP waterfall plots are the gold standard for individual prediction explanations.
- Summary plot + dependence plot covers 80% of interpretability needs.
- Attention weights alone are not explanations for transformer models — use integrated gradients or SHAP.
- For regulatory compliance (GDPR, ECOA), both global and local explanations are required.

### Production Monitoring
Track top-5 feature importance stability over time — large changes indicate data distribution shift.
Monitor SHAP value distribution per feature — if distribution shifts, model behavior may be unreliable.
Check explanation consistency: similar inputs should produce similar explanations in production.
Log explanations for a random sample of production predictions for audit trail and debugging.
Trigger retraining investigation if feature importance ranking changes significantly.
Monitor the base value (expected prediction) — shifts indicate changes in the underlying population.
Set up alerts for unexpected explanation patterns (e.g., feature with opposite direction than expected).

### Troubleshooting Guide
SHAP values take too long on large datasets → use TreeSHAP for tree models, subsample background data for KernelSHAP.
LIME giving different results each run → increase the number of samples, fix the random seed, check kernel width.
Feature importance inconsistent across CV folds → feature may be unstable, check for multicollinearity.
Partial dependence plot looks unreliable → check for correlated features that violate the independence assumption.
SHAP dependence showing unexpected patterns → check for missing interaction features in the dependence plot.
Linear model coefficients not matching SHAP direction → check for multicollinearity or unscaled features.
Explanation blames the wrong feature → validate by removing the top feature and checking if prediction changes.
Force plot too cluttered for high-dimensional models → show only top-5 features, group the rest as others.

### Deployment Checklist
Generate explanations for every production prediction that requires regulatory compliance.
Cache SHAP values for frequent prediction patterns to reduce serving cost.
Version the background/reference dataset used for SHAP computation.
Document which explanation methods are used and why for model governance.
Set up automated explanation validation: faithfulness, consistency, stability checks per batch.
Log explanations alongside predictions for post-hoc analysis and debugging.
Establish explanation generation SLAs based on latency requirements (batch vs real-time).
Record explanation metadata: model version, explainer type, computation time, background dataset hash.

## References
- references/global-interpretability.md — Permutation importance, partial dependence, SHAP global, feature interaction, inherent methods
- references/local-interpretability.md — SHAP values, LIME, ICE, waterfall/force/summary plots, counterfactuals

### Edge Cases and Special Data Types
High-dimensional sparse data: use permutation importance with caching, SHAP with feature grouping, avoid KernelSHAP (slow).
Image data: use Grad-CAM, Integrated Gradients, perturbation-based methods (occlusion sensitivity).
Text data: use attention visualization, LIME text, Integrated Gradients for token-level attributions.
Time series data: use feature importance on lag features, temporal SHAP, window-based attribution methods.
Tabular data with mixed types: use SHAP for both numerical and categorical (one-hot) features consistently.
Graph data: use GNNExplainer, integrated gradients for edges and nodes, attention weights for GAT.
Multiple models (ensemble): use SHAP for each model and average, or use model-specific explanations combined.

### Framework Integration
SHAP: TreeExplainer for XGBoost/LightGBM/RF, LinearExplainer for linear models, KernelExplainer for black-box.
LIME: LimeTabularExplainer for tabular, LimeTextExplainer for NLP, LimeImageExplainer for vision.
InterpretML: glassbox models (EBM, LogisticRegression, DecisionTree) and blackbox explainers.
Eli5: permutation importance, text explanation, sklearn and XGBoost support.
Alibi: anchor explanations, counterfactual explanations, integrated gradients.
Captum: integrated gradients, DeepLIFT, feature ablation for PyTorch models.
DALEX: model-agnostic explainers for R and Python with consistent API.

### Advanced Interpretability Techniques
Use SHAP interaction values to discover feature synergies: shap_interaction_values returns (n_samples, n_features, n_features) matrix.
For tree models, SHAP.TreeExplainer supports feature perturbation and interventional feature importance.
Compute global feature importance as mean absolute SHAP across background dataset.
For deep learning, use IntegratedGradients from captum library which satisfies sensitivity and implementation invariance axioms.
Apply SmoothGrad to reduce noise in gradient-based explanations by averaging over N noisy samples.
For NLP models, use attention rollout or attention flow for transformer interpretability.
For computer vision, use Grad-CAM to generate class activation maps showing which image regions drive predictions.
For model comparison, SHAP can compute feature importance difference between two models.

## Handoff
Hand off findings to ml-model-evaluation if interpretability reveals data quality issues. For feature engineering improvements, hand off to ml-feature-engineering.
