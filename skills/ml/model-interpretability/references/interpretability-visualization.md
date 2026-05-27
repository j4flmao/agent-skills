# Model Interpretability Visualization

## Feature Importance Visualization

```python
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

def plot_feature_importance(feature_importance: pd.DataFrame, top_n: int = 20):
    """
    Plot feature importance bar chart.
    """
    fig, ax = plt.subplots(figsize=(10, 8))

    top_features = feature_importance.head(top_n)
    colors = plt.cm.viridis(np.linspace(0.2, 0.8, len(top_features)))

    ax.barh(range(len(top_features)), top_features['importance'], color=colors)
    ax.set_yticks(range(len(top_features)))
    ax.set_yticklabels(top_features['feature'])
    ax.set_xlabel('Importance')
    ax.set_title(f'Top {top_n} Feature Importance')
    ax.invert_yaxis()

    plt.tight_layout()
    return fig
```

## SHAP Summary Plot

```python
def plot_shap_summary(shap_values: np.ndarray, X: pd.DataFrame, feature_names: List[str]):
    """
    Create SHAP summary plot with improved styling.
    """
    fig, ax = plt.subplots(figsize=(12, 8))

    shap.summary_plot(
        shap_values, X,
        feature_names=feature_names,
        show=False,
        max_display=20,
        alpha=0.6,
    )

    ax.set_xlabel('SHAP value (impact on model output)')
    ax.set_title('SHAP Feature Importance')

    plt.tight_layout()
    return fig

def plot_shap_dependence(shap_values: np.ndarray, X: pd.DataFrame, feature: str, interaction_feature: str = None):
    """
    Plot SHAP dependence for a feature.
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    shap.dependence_plot(
        feature, shap_values, X,
        interaction_index=interaction_feature,
        show=False,
        alpha=0.5,
    )

    ax.set_title(f'SHAP Dependence Plot for {feature}')
    plt.tight_layout()
    return fig
```

## Partial Dependence Grid

```python
def plot_partial_dependence_grid(model, X: pd.DataFrame, features: List[tuple], n_cols: int = 3):
    """
    Plot grid of partial dependence plots.
    """
    n_features = len(features)
    n_rows = (n_features + n_cols - 1) // n_cols

    fig, axes = plt.subplots(n_rows, n_cols, figsize=(5 * n_cols, 4 * n_rows))
    axes = axes.flatten()

    for idx, (feat1, feat2) in enumerate(features):
        if feat2 is None:
            from sklearn.inspection import PartialDependenceDisplay
            PartialDependenceDisplay.from_estimator(
                model, X, [feat1],
                ax=axes[idx],
                kind='both',
                grid_resolution=20,
            )
        else:
            from sklearn.inspection import PartialDependenceDisplay
            PartialDependenceDisplay.from_estimator(
                model, X, [(feat1, feat2)],
                ax=axes[idx],
                kind='average',
                grid_resolution=20,
            )

        axes[idx].set_title(f'{feat1}' if feat2 is None else f'{feat1} x {feat2}')

    for idx in range(n_features, len(axes)):
        axes[idx].set_visible(False)

    plt.tight_layout()
    return fig
```

## Decision Tree Visualization

```python
from sklearn.tree import plot_tree, export_text

def visualize_decision_tree(model, feature_names: List[str], class_names: List[str], max_depth: int = 3):
    """
    Visualize decision tree structure.
    """
    fig, ax = plt.subplots(figsize=(20, 10))

    plot_tree(
        model,
        feature_names=feature_names,
        class_names=class_names,
        filled=True,
        rounded=True,
        max_depth=max_depth,
        ax=ax,
        fontsize=10,
    )

    ax.set_title(f'Decision Tree (max depth={max_depth})')
    plt.tight_layout()

    text_representation = export_text(
        model,
        feature_names=feature_names,
        max_depth=max_depth,
    )

    return {
        'figure': fig,
        'text_representation': text_representation,
    }
```

## Key Points

- Use bar charts for global feature importance
- Use SHAP summary plots for direction and magnitude
- Use dependence plots for feature relationships
- Use PDP grids for multiple feature effects
- Visualize decision trees for interpretable models
- Use waterfall plots for individual predictions
- Customize color palettes for accessibility
- Label axes clearly with units and scales
- Include confidence bands in PDP plots
- Save plots in vector format (SVG/PDF)
- Document plot interpretations for stakeholders
- Automate visualization generation in reports
