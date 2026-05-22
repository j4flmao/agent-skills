# Local Interpretability

## SHAP Values (Local)
```
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_val)

# Waterfall plot — single prediction explanation
idx = 0
shap.waterfall_plot(shap.Explanation(
    values=shap_values[idx],
    base_values=explainer.expected_value,
    data=X_val[idx],
    feature_names=features,
))
```

Waterfall: starts at base value (average prediction). Features push prediction up (red, positive SHAP) or down (blue, negative SHAP). Ends at model output. Base value = expected output over background data.

### Force Plot
```
shap.force_plot(explainer.expected_value, shap_values[idx], X_val[idx],
                feature_names=features, matplotlib=True)
```

Visualizes prediction as forces pushing from base value. Interactive HTML format — good for business stakeholder presentations.

### Dependence Plot
```
shap.dependence_plot("feature_name", shap_values, X_val,
                     interaction_index="other_feature")
```

SHAP value vs feature value, colored by interaction feature. Shows: main effect (slope), interaction (color spread), heterogeneity (vertical spread at same x).

## LIME
```
import lime.lime_tabular

explainer = lime.lime_tabular.LimeTabularExplainer(
    X_train, feature_names=features, class_names=["neg","pos"],
    mode="classification", kernel_width=0.5, random_state=42)

exp = explainer.explain_instance(X_val[idx], model.predict_proba,
                                 num_features=5, num_samples=5000)
exp.as_list()
```

LIME fits sparse linear model locally. Perturbation: sample synthetic points around instance. Weight: exponential kernel by distance. Fit: Lasso regression. Run 5-10 times to verify consistency — LIME is unstable across seeds.

## ICE (Individual Conditional Expectation)
```
from sklearn.inspection import PartialDependenceDisplay
PartialDependenceDisplay.from_estimator(model, X_val, features=["feature_name"],
    kind="individual", subsample=50, grid_resolution=50)
```

ICE: one line per instance showing prediction as feature varies. PDP = average of ICE. Centered ICE: start all lines at zero — better for detecting heterogeneity. Parallel ICE curves = no interactions.

## Counterfactual Explanations
```
import dice_ml
d = dice_ml.Data(dataframe=X_train, outcome_name="target")
m = dice_ml.Model(model=model, backend="sklearn")
exp_gen = dice_ml.Dice(d, m)
cf = exp_gen.generate_counterfactuals(query_instance, total_CFs=3,
    desired_class="opposite", features_to_vary=["feature_a"])
```

"What would need to be different for the prediction to change?" Requirements: proximity (minimal changes), sparsity (few features), plausibility (realistic values).

## Practical Example
```
import shap, numpy as np
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(n_estimators=100, random_state=42).fit(X_train, y_train)
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_val)

for idx in [0, 5, 42]:
    vals = shap_values[1][idx] if len(shap_values) > 1 else shap_values[idx]
    top_idx = np.argsort(np.abs(vals))[-3:][::-1]
    direction = ["+" if v > 0 else "-" for v in vals[top_idx]]
    print(f"Sample {idx}: {[f'{features[i]}: {vals[i]:+.4f}' for i in top_idx]}")
```

## Best Practices
- Use SHAP for tree and linear models — exact and consistent.
- KernelSHAP as fallback for black-box models (slower).
- LIME faster than SHAP for text/image but less stable.
- Prefer SHAP waterfall over LIME for tabular data.
- For deep learning: Integrated Gradients, DeepLIFT, or GradientSHAP.
- Validate: remove top feature, prediction should change.
- For classification, explain probability of predicted class, not logit.
