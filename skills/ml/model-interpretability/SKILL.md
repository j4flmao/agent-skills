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

## SHAP Usage Patterns — Step by Step

### Pattern 1: Global Feature Importance with TreeSHAP
```python
import shap
import xgboost as xgb
import matplotlib.pyplot as plt

# Train model
model = xgb.XGBRegressor().fit(X_train, y_train)

# TreeSHAP — exact for trees, O(T * D * 2^M) but feasible
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

# Summary plot: feature importance + direction
shap.summary_plot(shap_values, X_test, max_display=15)

# Mean absolute SHAP value as global importance
importance = np.abs(shap_values).mean(axis=0)
feature_ranking = pd.DataFrame({
    "feature": X_test.columns,
    "importance": importance,
}).sort_values("importance", ascending=False)
```

### Pattern 2: Individual Prediction Explanation
```python
# Waterfall plot for one prediction
row = X_test.iloc[0]
shap.waterfall_plot(
    shap.Explanation(
        values=shap_values[0],  # SHAP values for this row
        base_values=explainer.expected_value,
        data=row.values,
        feature_names=X_test.columns,
    ),
    max_display=10,
)

# Force plot (better for presentations)
shap.force_plot(
    explainer.expected_value,
    shap_values[0, :],
    X_test.iloc[0, :],
    matplotlib=True,
)
```

### Pattern 3: Dependence Plot with Interaction Detection
```python
# Single feature dependence
shap.dependence_plot("age", shap_values, X_test, alpha=0.5)

# Color by interaction feature
shap.dependence_plot(
    "age", shap_values, X_test,
    interaction_index="income",  # auto-pick or specify
    alpha=0.5,
)

# Interpretation:
# If the scatter shows a clear color gradient (e.g., red high, blue low)
# then there is a strong interaction between age and income
```

### Pattern 4: Feature Interaction Detection
```python
# SHAP interaction values (only available for TreeExplainer)
shap_interaction = explainer.shap_interaction_values(X_test)

# Take interaction between feature i and j for specific prediction
intensity = shap_interaction[0, i, j]

# Global interaction strength
interaction_matrix = np.abs(shap_interaction).mean(axis=0)

# Plot interaction heatmap
sns.heatmap(interaction_matrix, xticklabels=X_test.columns,
            yticklabels=X_test.columns)
```

## LIME Usage Patterns

### Pattern 1: Tabular Data Explanation
```python
import lime
import lime.lime_tabular

explainer = lime.lime_tabular.LimeTabularExplainer(
    X_train.values,
    feature_names=X_train.columns,
    class_names=["negative", "positive"],
    mode="classification",
    discretize_continuous=True,
    num_features=10,
)

# Explain one prediction
exp = explainer.explain_instance(
    X_test.iloc[0].values,
    model.predict_proba,  # must return probabilities
    num_features=8,
    num_samples=5000,  # more = stable but slower
)

exp.show_in_notebook(show_table=True)
exp.as_list()  # list of (feature, weight) tuples
```

### Pattern 2: Text Explanation
```python
from lime.lime_text import LimeTextExplainer

explainer = lime.lime_text.LimeTextExplainer(
    class_names=["negative", "positive"],
    split_expression=r"\W+",
    bow=True,  # bag of words
)

text = "This product is amazing and life-changing!"
exp = explainer.explain_instance(
    text,
    classifier.predict_proba,  # function taking list of strings -> probs
    labels=(1,),  # explain positive class
    num_features=6,
    num_samples=1000,
)

# Highlight words
exp.show_in_notebook(text=text)
```

### LIME Stability Check
```python
# LIME is unstable — run multiple times to verify
def stable_lime_explanation(instance, num_runs=5):
    results = []
    for seed in range(num_runs):
        np.random.seed(seed)
        exp = explainer.explain_instance(
            instance, model.predict_proba, num_features=5
        )
        results.append(dict(exp.as_list()))

    df = pd.DataFrame(results)
    mean_weights = df.mean()
    std_weights = df.std()
    stable = std_weights.max() < 0.1  # arbitrary threshold
    return mean_weights, std_weights, stable
```

## Visualization Guide

### Plot Selection Decision Tree
```
What do you need to understand?
├── Global feature importance
│   ├── Which features matter most? -> Summary plot (SHAP)
│   ├── How feature affects predictions overall? -> PDP / SHAP dependence
│   └── Interactions between features? -> SHAP interaction heatmap
│
├── Individual prediction explanation
│   ├── Why was this prediction made? -> Waterfall plot (SHAP)
│   ├── Present to non-technical audience? -> Force plot
│   └── Local decision boundary? -> LIME weights
│
├── Model behavior
│   ├── Linearity / monotonicity? -> PDP + ICE plots
│   ├── Decision rules learned? -> Tree visualization / feature interaction
│   └── Feature group importance? -> Permutation importance by group
│
└── Debugging / data quality
    ├── Feature distribution issues? -> SHAP dependence + violin
    ├── Outliers affecting model? -> SHAP scatter + leverage
    └── Label leakage? -> SHAP values on temporal features
```

### Visualization Templates

#### SHAP Summary Plot
```
shap.summary_plot(shap_values, X, max_display=15)
  X-axis: SHAP value (impact on model output)
  Color: Feature value (red = high, blue = low)
  Each point = one prediction
  Width = importance, Color = direction
```

#### PDP + ICE Plot
```
from sklearn.inspection import PartialDependenceDisplay

PartialDependenceDisplay.from_estimator(
    model, X, features=["age", "income"],
    kind="both",  # both = PDP line + ICE lines
    subsample=50,
    n_cols=2,
    grid_resolution=20,
)
  Blue line = PDP (average effect)
  Gray lines = ICE (individual predictions)
  Wide ICE spread = strong interaction with other features
```

## Model Interpretability Anti-Patterns

1. **Trusting LIME on one run**: LIME is highly unstable — same instance, different explanation
   Fix: Run 5+ times, report stability
2. **SHAP without feature independence note**: SHAP assumes features are independent
   Fix: Check correlations first, use SHAP interaction for highly correlated pairs
3. **Interpreting linear coefficients directly**: With correlated features, coefficients are meaningless
   Fix: Use permutation importance or SHAP instead
4. **Attention = explanation**: Attention weights show what the model "looked at," not causal importance
   Fix: Use Integrated Gradients or input x gradient for true attributions
5. **No validation of explanations**: Explaining without known ground truth
   Fix: Test on edge cases with known expected behavior

## Method Selection Guide

| Method | Model Agnostic | Speed | Local | Global | Interaction | Best For |
|--------|---------------|-------|-------|--------|-------------|----------|
| SHAP (Tree) | No (trees only) | Fast | Yes | Yes | Yes | Tree-based models |
| SHAP (Kernel) | Yes | Slow | Yes | Yes | No | Small data, any model |
| LIME | Yes | Medium | Yes | No | No | Text, tabular local |
| PDP | Yes | Medium | No | Yes | Manual | 2-3 feature analysis |
| ICE | Yes | Medium | Yes | No | Yes | Uncover heterogeneity |
| Permutation | Yes | Fast | No | Yes | No | Baseline importance |
| Integrated Gradients | No (DL only) | Medium | Yes | Yes | No | Deep learning |
| Grad-CAM | No (CNN only) | Fast | Yes | No | No | Computer vision |

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
