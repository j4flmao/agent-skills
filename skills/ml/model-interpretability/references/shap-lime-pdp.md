# Model Interpretability Methods

## SHAP Analysis

```python
import shap
import numpy as np
import pandas as pd
from typing import List, Any

def explain_with_shap(model: Any, X: pd.DataFrame, sample_size: int = 100):
    """
    Explain model predictions using SHAP values.
    """
    X_sample = X.sample(min(sample_size, len(X)), random_state=42)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)

    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': np.abs(shap_values).mean(axis=0),
    }).sort_values('importance', ascending=False)

    shap.summary_plot(shap_values, X_sample, show=False)

    shap.force_plot(
        explainer.expected_value,
        shap_values[0],
        X_sample.iloc[0],
        matplotlib=True,
        show=False,
    )

    return {
        'shap_values': shap_values,
        'expected_value': explainer.expected_value,
        'feature_importance': feature_importance.to_dict('records'),
        'base_value': float(explainer.expected_value),
    }

def shap_interaction_analysis(model: Any, X: pd.DataFrame):
    """
    Analyze feature interactions using SHAP interaction values.
    """
    explainer = shap.TreeExplainer(model)
    X_sample = X.sample(min(50, len(X)), random_state=42)

    shap_interaction_values = explainer.shap_interaction_values(X_sample)

    return shap_interaction_values
```

## LIME Explanations

```python
from lime import lime_tabular
import numpy as np

def explain_with_lime(model, X_train, X_instance, feature_names, class_names=None):
    """
    Explain a single prediction using LIME.
    """
    explainer = lime_tabular.LimeTabularExplainer(
        X_train.values if hasattr(X_train, 'values') else X_train,
        feature_names=feature_names,
        class_names=class_names or ['class_0', 'class_1'],
        mode='classification',
        random_state=42,
    )

    instance = X_instance.values if hasattr(X_instance, 'values') else X_instance
    exp = explainer.explain_instance(
        instance,
        model.predict_proba,
        num_features=10,
        num_samples=5000,
    )

    explanation = {
        'feature_importances': exp.as_list(),
        'prediction': exp.predict_proba,
        'local_exp': {
            str(k): float(v) for k, v in exp.as_map().get(1, [])
        },
    }

    return explanation
```

## Partial Dependence Plots

```python
from sklearn.inspection import partial_dependence, PartialDependenceDisplay
import matplotlib.pyplot as plt

def compute_partial_dependence(model, X, features, grid_resolution=20):
    """
    Compute partial dependence for specified features.
    """
    pdp_results = {}

    for feature in features:
        result = partial_dependence(
            model, X, [feature],
            grid_resolution=grid_resolution,
        )

        pdp_results[feature] = {
            'values': result['values'][0].tolist(),
            'average': result['average'][0].tolist(),
        }

    return pdp_results

def compute_ice_curves(model, X, feature, grid_resolution=20):
    """
    Compute Individual Conditional Expectation curves.
    """
    from sklearn.inspection import PartialDependenceDisplay

    display = PartialDependenceDisplay.from_estimator(
        model, X, [feature],
        kind='individual',
        grid_resolution=grid_resolution,
    )

    return display
```

## Permutation Feature Importance

```python
from sklearn.inspection import permutation_importance

def compute_permutation_importance(model, X, y, n_repeats=10, random_state=42):
    """
    Compute permutation feature importance.
    """
    result = permutation_importance(
        model, X, y,
        n_repeats=n_repeats,
        random_state=random_state,
        n_jobs=-1,
    )

    importance_df = pd.DataFrame({
        'feature': X.columns,
        'importance_mean': result.importances_mean,
        'importance_std': result.importances_std,
    }).sort_values('importance_mean', ascending=False)

    return {
        'feature_importance': importance_df.to_dict('records'),
        'importances': result.importances,
        'importances_mean': result.importances_mean.tolist(),
        'importances_std': result.importances_std.tolist(),
    }
```

## Key Points

- Use SHAP for consistent, theoretically grounded explanations
- Use LIME for local, interpretable explanations
- Use partial dependence plots for global feature effects
- Use ICE curves for individual prediction paths
- Use permutation importance for model-agnostic ranking
- Combine multiple methods for comprehensive understanding
- Validate explanations with domain experts
- Document model behavior and limitations
- Monitor feature importance drift over time
- Use explanations for debugging and bias detection
- Communicate results to stakeholders clearly
- Automate explanation generation in production pipelines
