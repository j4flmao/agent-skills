# Global Explanation Methods

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

Shuffle each feature and measure performance drop. Model-agnostic, unbiased by cardinality. Run 5-10+ repeats for stable estimates.

## SHAP Global Summary

```
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_val)

shap.summary_plot(shap_values, X_val, feature_names=features)
mean_shap = np.abs(shap_values).mean(axis=0)
```

Beeswarm plot: each point = one sample's SHAP value. Color = feature value (red high, blue low). X-axis = impact on prediction. Shows importance ranking, effect direction, and heterogeneity.

## Partial Dependence (PDP)

```
from sklearn.inspection import PartialDependenceDisplay

PartialDependenceDisplay.from_estimator(
    model, X_train, features=["age", "income"],
    kind="average", grid_resolution=50,
    subsample=1000,
)
```

Marginal effect: E[Y | X_j = x]. Assumes feature independence — breaks with correlated features. Use `kind="both"` to overlay ICE plots.

## Feature Interaction Detection

| Method | Type | Scalability | Notes |
|--------|------|-------------|-------|
| H-statistic (Friedman) | Model-agnostic | O(N * grid^2) | Range [0,1], expensive |
| SHAP interaction | Tree-only | Fast | Returns (N, F, F) matrix |
| PDP pairwise | Visual | Medium | Subset of feature pairs |
| Tree splits | Tree-only | Instant | Count of interaction splits |

```
shap_interaction = explainer.shap_interaction_values(X_val)
# shap_interaction[i, j, k] = interaction between feature j and k for sample i
```

## Global Surrogate Models

```
from sklearn.tree import DecisionTreeRegressor

surrogate = DecisionTreeRegressor(max_depth=3)
surrogate.fit(X_val, model.predict(X_val))

from sklearn.tree import export_text
print(export_text(surrogate, feature_names=features))
```

Train interpretable model (shallow tree, linear model) to approximate black-box predictions. Trade-off: fidelity vs interpretability. Check R^2 of surrogate to assess how well it approximates the original model.

## Global Explanation Checklist

| Step | Method | Output |
|------|--------|--------|
| 1 | Permutation importance | Feature ranking with std error |
| 2 | SHAP summary | Importance + direction + heterogeneity |
| 3 | PDP top-4 features | Marginal effect curves |
| 4 | Interaction detection | Top-3 interacting feature pairs |
| 5 | Surrogate model | Decision tree rules or linear coefficients |
