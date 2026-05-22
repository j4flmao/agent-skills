# Global Interpretability

## Permutation Importance

```
from sklearn.inspection import permutation_importance

result = permutation_importance(
    model, X_val, y_val,
    n_repeats=10,
    random_state=42,
    scoring="f1",
)

for i in result.importances_mean.argsort()[::-1]:
    print(f"{features[i]}: {result.importances_mean[i]:.3f} +- {result.importances_std[i]:.3f}")
```

Measures: how much does performance drop when feature is shuffled? Model-agnostic. Not biased by feature cardinality (unlike tree impurity). Handles non-linear interactions naturally. Limitations: correlated features get importance split between them. GPU-accelerated implementations available for neural networks.

## Partial Dependence Plots

```
from sklearn.inspection import PartialDependenceDisplay

PartialDependenceDisplay.from_estimator(
    model, X_train, features=["age", "income"],
    kind="average",  # or "individual" for ICE
    grid_resolution=50,
    subsample=1000,
    random_state=42,
)
```

Shows marginal effect of feature on predictions. E[Y | X_j = x]. Assumes feature independence — breaks down with strong correlations. Grid resolution: 50 points for continuous, all categories for discrete. Subsample large datasets to 1000 for plotting speed. Use `kind="both"` to overlay ICE on PDP for heterogeneity check.

## SHAP Global (Summary)

```
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_val)

# Summary plot — feature importance + effect direction
shap.summary_plot(shap_values, X_val, feature_names=features)

# Mean absolute SHAP — global feature importance
mean_shap = np.abs(shap_values).mean(axis=0)
```

Summary plot: beeswarm of all SHAP values. Color = feature value (red high, blue low). X-axis = SHAP value (impact on prediction). Features sorted by importance. Shows: which features matter most, direction of effect, heterogeneity, outliers.

## Feature Interaction

### H-Statistic (Friedman)

```
from sklearn.inspection import partial_dependence
import numpy as np

def h_statistic(model, X, feat_i, feat_j):
    """Compute interaction strength between two features."""
    pd_i = partial_dependence(model, X, [feat_i])["average"][0]
    pd_j = partial_dependence(model, X, [feat_j])["average"][0]
    pd_ij = partial_dependence(model, X, [feat_i, feat_j])["average"][0]
    pdp_sum = pd_i[:, np.newaxis] + pd_j[np.newaxis, :]
    numerator = np.sum((pd_ij - pdp_sum) ** 2)
    denominator = np.sum(pd_ij ** 2)
    return np.sqrt(numerator / denominator) if denominator > 0 else 0
```

Range [0, 1], 0 = no interaction, 1 = full interaction. Expensive for large grids (O(N * grid_i * grid_j)). Use SHAP interaction values as faster alternative for tree models.

### SHAP Interaction Values

```
shap_interaction = explainer.shap_interaction_values(X_val)
# Shape: (n_samples, n_features, n_features)
# shap_interaction[i, j, k] = interaction between feature j and k for sample i
```

### Inherent Methods

```
# Tree feature importance (biased toward high-cardinality)
importances = model.feature_importances_

# Linear model coefficients (standardized features required)
coefs = model.coef_

# L1 regularization selects features automatically
from sklearn.linear_model import LogisticRegression
model = LogisticRegression(penalty="l1", C=0.1, solver="liblinear")
model.fit(X, y)
selected = X.columns[model.coef_[0] != 0]
```

Tree importance: impurity reduction weighted by samples. Biased toward continuous features and high-cardinality categories. Alternative: permutation importance which is unbiased. Linear coefficients: interpretable if features are independent and on same scale. Standardize or use odds ratios for logistic regression.

## Practical Example

```
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import (
    permutation_importance,
    PartialDependenceDisplay,
)
import shap

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 1. Permutation importance (unbiased, model-agnostic)
perm_imp = permutation_importance(model, X_val, y_val, n_repeats=10, random_state=42)

# 2. SHAP (tree-specific, fast, exact)
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_val)

# 3. Partial dependence for top 4 features
PartialDependenceDisplay.from_estimator(
    model, X_val, features=[0, 1, 2, 3],
    kind="both", grid_resolution=50,
)

# 4. Report
importance_df = pd.DataFrame({
    "feature": features,
    "permutation_importance": perm_imp.importances_mean,
    "shap_importance": np.abs(shap_values).mean(axis=0),
}).sort_values("permutation_importance", ascending=False)
print(importance_df)
```

## Best Practices

- Compute permutation importance with multiple repeats for stable estimates.
- Always compare permutation importance to SHAP global — divergence indicates issues.
- Check feature correlations before interpreting PDP — correlated features produce misleading plots.
- Use SHAP interaction values to discover synergies between features.
- Report the direction of relationship (positive/negative) for top features.
- For grouped features (one-hot encoded), aggregate importance across group.
