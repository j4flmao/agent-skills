---
name: ml-model-interpretability
description: >
  Use this skill when explaining model predictions, computing feature importance, generating SHAP/LIME explanations, creating dependence plots, or building trust in ML model decisions.
  This skill enforces: global + local explanation coverage, SHAP value computation, permutation importance baseline, visualization choice (waterfall/force/dependence/summary), model-specific methods, feature interaction detection.
  Do NOT use for: model evaluation metrics (use ml-model-evaluation), hyperparameter tuning (use ml-hyperparameter-tuning), causal inference, or privacy-preserving explanations.
version: "2.0.0"
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

## Architecture/Decision Trees

### Method Selection Decision Tree
```
Need global or local explanation?
  ├── Global (which features matter overall)
  │   ├── Model-agnostic
  │   │   ├── Permutation importance (fast, unbiased, any model)
  │   │   └── Partial dependence plots (marginal effect, any model)
  │   └── Model-specific
  │       ├── Tree → TreeSHAP, impurity-based importance
  │       ├── Linear → Coefficients, odds ratios
  │       └── Neural → Integrated Gradients, Neuron Coverage
  ├── Local (why this specific prediction)
  │   ├── Model-agnostic
  │   │   ├── SHAP (game-theoretic, consistent, any model)
  │   │   ├── LIME (sparse surrogate, fast but unstable)
  │   │   └── ICE curves (per-instance feature effect)
  │   └── Model-specific
  │       ├── Tree → TreeSHAP (exact, fast)
  │       └── Image → Grad-CAM, Saliency Maps
  └── Feature Interactions
      ├── SHAP interaction values (exact for trees)
      ├── H-statistic (Friedman, range 0-1)
      └── Pairwise PDP (visual interaction patterns)
```

### Audience-Specific Output
```
Who is the explanation for?
  ├── Data scientist debugging
  │   └── SHAP summary + dependence + waterfall plots
  ├── Domain expert validation
  │   └── Top 5 features with actual values and direction
  ├── Business stakeholder
  │   └── Force plot + simplified reason codes (top 3 factors)
  └── Regulator / Compliance
      ├── Global + local explanations documented
      ├── Methodology, validation results, feature engineering
      └── Audit trail with prediction + explanation logged
```

## Agent Protocol

### Trigger
User request includes: SHAP, LIME, feature importance, model interpretability, explainability, partial dependence, PDP, ICE, SHAP values, feature contribution, global explanation, local explanation, permutation importance.

### Input Context
Before activating, verify:
- Model type (tree, linear, neural network, ensemble).
- Stakeholder audience (data scientist, domain expert, regulator, end user).
- Deployment context (batch inference, real-time serving, offline analysis).
- Regulatory requirements (GDPR right to explanation, model risk management).

### Output Artifact
Model interpretability strategy with global and local methods, visualization approach.

### Response Format
```
## Interpretability Strategy
### Model Type
{tree / linear / neural / ensemble}

### Global Methods
Method: permutation_importance | Score: {value}
Method: partial_dependence | Features: [{f1}, {f2}]
Method: shap | Ranking: [{f1}, {f2}, {f3}]

### Local Methods
Method: {shap / lime / ice} | Samples: {N}
Output: {waterfall / force / explanation_text}
```

No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
- [ ] Global explanation method selected and applied to rank feature importance.
- [ ] Local explanation method selected for individual prediction interpretation.
- [ ] Visualizations chosen based on audience.
- [ ] Feature interactions checked for non-linear models.
- [ ] Explanations validated for faithfulness.
- [ ] Model-specific method used if applicable.
- [ ] Explanation uncertainty and limitations documented.

## Workflow

### Step 1: Global Interpretability
Permutation importance: shuffle each feature, measure performance drop. Model-agnostic, unbiased. Tree feature importance: built-in but biased toward high-cardinality features. SHAP global: mean absolute SHAP values across all samples. Partial dependence: marginal effect of feature.

```python
from sklearn.inspection import permutation_importance
import pandas as pd
import numpy as np

def permutation_importance_analysis(model, X_val, y_val, n_repeats=10):
    result = permutation_importance(
        model, X_val, y_val,
        n_repeats=n_repeats, random_state=42, n_jobs=-1,
    )
    importance_df = pd.DataFrame({
        "feature": X_val.columns,
        "importance": result.importances_mean,
        "std": result.importances_std,
    }).sort_values("importance", ascending=False)
    return importance_df

def global_shap_analysis(model, X, sample_size=1000):
    if sample_size < len(X):
        X_sample = X.sample(sample_size, random_state=42)
    else:
        X_sample = X

    # Use appropriate explainer
    if str(type(model)).find("xgboost") > -1 or str(type(model)).find("RandomForest") > -1:
        explainer = shap.TreeExplainer(model)
    elif str(type(model)).find("linear") > -1 or str(type(model)).find("LogisticRegression") > -1:
        explainer = shap.LinearExplainer(model, X_sample)
    else:
        explainer = shap.KernelExplainer(model.predict_proba, X_sample, link="logit")

    shap_values = explainer.shap_values(X_sample)

    # Mean absolute SHAP for global importance
    mean_shap = np.abs(shap_values).mean(axis=0)
    importance_df = pd.DataFrame({
        "feature": X_sample.columns,
        "mean_abs_shap": mean_shap,
    }).sort_values("mean_abs_shap", ascending=False)

    return importance_df, shap_values, explainer
```

### Step 2: Local Interpretability
SHAP values: Shapley values from cooperative game theory. Locally accurate, consistent, unique. TreeSHAP for trees (exact, fast). KernelSHAP for any model (slower). LIME: fit sparse local surrogate. Faster but less stable.

```python
def local_shap_explanation(model, X_instance, X_background, feature_names):
    """Explain a single prediction with SHAP."""
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_instance)

    # If classification, get positive class
    if isinstance(shap_values, list):
        shap_values = shap_values[1]

    # Create explanation dataframe
    explanation = pd.DataFrame({
        "feature": feature_names,
        "value": X_instance.flatten(),
        "shap_value": shap_values.flatten(),
        "contribution": np.abs(shap_values.flatten()),
    }).sort_values("contribution", ascending=False)

    return explanation

def lime_explanation(model, X_instance, feature_names, n_features=5):
    """LIME explanation (run multiple times for stability)."""
    import lime
    import lime.lime_tabular

    explainer = lime.lime_tabular.LimeTabularExplainer(
        X_train, feature_names=feature_names,
        class_names=["negative", "positive"],
        mode="classification",
        random_state=42,
    )
    exp = explainer.explain_instance(
        X_instance, model.predict_proba,
        num_features=n_features,
    )
    return exp.as_list()
```

### Step 3: Model-Specific Methods
```python
# Linear model coefficients
def linear_model_explanation(model, feature_names):
    coef_df = pd.DataFrame({
        "feature": feature_names,
        "coefficient": model.coef_.flatten(),
        "abs_coefficient": np.abs(model.coef_).flatten(),
    }).sort_values("abs_coefficient", ascending=False)
    return coef_df

# Grad-CAM for CNNs
def grad_cam(model, image, layer_name, class_idx=None):
    import tensorflow as tf
    grad_model = tf.keras.models.Model(
        [model.inputs],
        [model.get_layer(layer_name).output, model.output],
    )
    with tf.GradientTape() as tape:
        conv_output, predictions = grad_model(image)
        if class_idx is None:
            class_idx = tf.argmax(predictions[0])
        loss = predictions[:, class_idx]
    grads = tape.gradient(loss, conv_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    heatmap = tf.reduce_mean(tf.multiply(pooled_grads, conv_output), axis=-1)[0]
    heatmap = np.maximum(heatmap, 0) / np.max(heatmap)
    return heatmap
```

### Step 4: Visualization Selection
Summary plot (beeswarm): best for global overview. Waterfall: single prediction explanation. Force plot: interactive, good for presentations. Dependence plot: main effect + interaction. Bar plot: simplest global view.

```python
import matplotlib.pyplot as plt

def visualize_explanations(shap_values, X, feature_names):
    """Generate standard interpretability visualizations."""
    # Summary plot (beeswarm)
    shap.summary_plot(shap_values, X, feature_names=feature_names, show=False)
    plt.savefig("shap_summary.png", bbox_inches="tight", dpi=150)
    plt.close()

    # Dependence plot for top 2 features
    shap.dependence_plot(feature_names[0], shap_values, X,
                         feature_names=feature_names, show=False)
    plt.savefig("shap_dependence.png", bbox_inches="tight", dpi=150)
    plt.close()

    # Waterfall for first prediction
    shap.plots.waterfall(shap.Explanation(
        values=shap_values[0],
        base_values=shap_values.base_values[0] if hasattr(shap_values, 'base_values') else 0,
        data=X.iloc[0].values,
        feature_names=feature_names,
    ), show=False)
    plt.savefig("shap_waterfall.png", bbox_inches="tight", dpi=150)
    plt.close()
```

### Step 5: Explanation Validation
```python
def validate_explanation(model, X, explanation_fn, top_k=5):
    """Validate explanation by removing top-k features."""
    base_pred = model.predict_proba(X.mean().to_frame().T)[0][1]

    top_features = explanation_fn(X)[:top_k]["feature"].values
    X_modified = X.copy()
    for f in top_features:
        X_modified[f] = X_modified[f].mean()  # set to baseline

    modified_pred = model.predict_proba(X_modified)[0][1]
    change = abs(base_pred - modified_pred)

    return {
        "base_prediction": base_pred,
        "modified_prediction": modified_pred,
        "change": change,
        "faithful": change > 0.05,
    }
```

## Anti-Patterns

- **Trusting tree-based feature importance blindly**: Use permutation or SHAP instead.
- **Interpreting SHAP without baseline**: Always report base value context.
- **LIME without multiple runs**: Single run can be misleading.
- **PDP without checking feature correlations**: Correlated features distort PDPs.
- **Attention weights as explanations**: Attention is correlation, not causation.
- **Forgetting feature engineering documentation**: Transforms change interpretation.
- **Explaining every prediction without sampling**: Computational cost prohibitive.

## Production Considerations

### Monitoring
- Track top-5 feature importance stability over time.
- Monitor SHAP value distribution per feature.
- Check explanation consistency for similar inputs.
- Log explanations for random sample of predictions.
- Trigger retraining investigation if importance ranking changes significantly.

### Deployment
- Generate explanations for every production prediction requiring compliance.
- Cache SHAP values for frequent patterns.
- Version the background dataset for SHAP computation.
- Document explanation methods for model governance.
- Log explanations alongside predictions for audit trail.

## Rules
- Always compute global permutation importance as baseline.
- TreeSHAP preferred over KernelSHAP for trees.
- LIME: run multiple times to verify stability.
- SHAP assumes feature independence — note limitation.
- PDP assumes feature independence — check correlations first.
- Never interpret linear coefficients directly with correlated features.
- Use Integrated Gradients for deep learning, not vanilla gradients.
- Validate explanations on known edge cases first.
- Report explanation uncertainty where possible.
- SHAP waterfall = gold standard for individual explanations.
- Summary + dependence = covers 80% of needs.
- Attention weights alone are NOT explanations.

## References
  - references/fairml-auditing.md — Fairness & Model Auditing
  - references/global-explanations.md — Global Explanation Methods
  - references/global-interpretability.md — Global Interpretability
  - references/interpretability-visualization.md — Model Interpretability Visualization
  - references/local-interpretability.md — Local Interpretability
  - references/model-interpretability-advanced.md — Model Interpretability Advanced Topics
  - references/model-interpretability-fundamentals.md — Model Interpretability Fundamentals
  - references/shap-lime-pdp.md — Model Interpretability Methods
## Handoff
Hand off findings to ml-model-evaluation if interpretability reveals data quality issues. For feature engineering improvements, hand off to ml-feature-engineering.
