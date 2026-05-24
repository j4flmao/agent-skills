# Model Comparison

## Statistical Tests for Model Comparison

| Test | Models | Data | Assumptions |
|------|--------|------|-------------|
| Paired t-test | 2 | Cross-validation folds | Normal distribution of differences |
| McNemar's test | 2 | Contingency table | Matched pairs, binary predictions |
| 5x2 CV paired t-test | 2 | 5x2 cross-validation | More robust than single k-fold |
| Friedman test | N (≥3) | Multiple CV results | Non-parametric, aligned ranks |
| Nemenyi post-hoc | N | After Friedman | Pairwise differences |
| Bayesian comparison | 2 | Any | Prior + posterior probability |

```python
# 5x2 CV paired t-test
from mlxtend.evaluate import paired_ttest_5x2cv

t_stat, p_value = paired_ttest_5x2cv(
    estimator1=model_a,
    estimator2=model_b,
    X=X, y=y,
    random_seed=42
)

if p_value < 0.05:
    print(f"Models differ significantly (p={p_value:.4f})")
else:
    print(f"No significant difference (p={p_value:.4f})")
```

## Bayesian Model Comparison

```python
import pymc as pm

def bayesian_model_comparison(scores_a, scores_b):
    """Bayesian estimation of score difference."""
    with pm.Model():
        mu_a = pm.Normal("mu_a", mu=0, sigma=10)
        mu_b = pm.Normal("mu_b", mu=0, sigma=10)
        sigma = pm.HalfNormal("sigma", sigma=5)

        obs_a = pm.Normal("obs_a", mu=mu_a, sigma=sigma, observed=scores_a)
        obs_b = pm.Normal("obs_b", mu=mu_b, sigma=sigma, observed=scores_b)

        diff = pm.Deterministic("diff", mu_a - mu_b)

        trace = pm.sample(2000, tune=1000, progressbar=False)

    # Probability that model A is better
    prob_a_better = (trace.posterior["diff"] > 0).mean().item()
    hdi = pm.hdi(trace.posterior["diff"]).values.item()

    return {
        "prob_a_better": prob_a_better,
        "mean_diff": trace.posterior["diff"].mean().item(),
        "hdi": hdi,
    }
```

## Learning Curves

```python
def plot_learning_curves(model, X, y, cv=5):
    """Plot train vs validation score vs training size."""
    from sklearn.model_selection import learning_curve

    train_sizes, train_scores, val_scores = learning_curve(
        model, X, y,
        train_sizes=np.linspace(0.1, 1.0, 10),
        cv=cv,
        scoring='accuracy',
        n_jobs=-1
    )

    train_mean = train_scores.mean(axis=1)
    val_mean = val_scores.mean(axis=1)

    # Gap between train and val = bias-variance trade-off
    # Small gap, both low → good fit
    # Small gap, both low performance → high bias (underfit)
    # Large gap, train high, val low → high variance (overfit)
    gap = train_mean - val_mean
    return {
        "train_mean": train_mean,
        "val_mean": val_mean,
        "gap": gap,
        "suggested_action": "add_data" if gap[-1] > 0.1 else "increase_capacity"
    }
```

## Model Selection Decision Framework

```python
def select_best_model(results, metric='accuracy', maximize=True):
    """Select best model with statistical validation."""
    # Step 1: Find best by point estimate
    best = max(results, key=lambda r: r[metric]) if maximize else \
           min(results, key=lambda r: r[metric])
    
    # Step 2: Check if statistically better than others
    candidates = [best]
    for model in results:
        if model == best:
            continue
        
        # Statistical test
        t_stat, p_value = paired_ttest_5x2cv(
            best['model'], model['model'],
            X=model['X'], y=model['y']
        )
        
        if p_value < 0.05:
            candidates.append(model)
    
    # Step 3: Consider complexity, inference cost
    return min(candidates, key=lambda m: m['inference_time'])
```

## Common Pitfalls

| Pitfall | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Comparing models on test set multiple times | Inflates Type I error | Holdout validation set, never touch test |
| Using accuracy on imbalanced data | Misleadingly high | Use PR-AUC, F1, MCC |
| Not accounting for multiple comparisons | Family-wise error rate | Bonferroni correction, Friedman + Nemenyi |
| Comparing models trained on different splits | Variance not controlled | Same CV folds for all models |
| Ignoring inference cost | Production constraint ignored | Cost-adjusted comparison |
