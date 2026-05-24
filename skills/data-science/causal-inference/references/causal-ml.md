# Causal Machine Learning Reference

## Uplift Modeling

### Problem Setup
```
Goal: Estimate the incremental (causal) effect of a treatment on an individual.
Applications: targeted marketing, personalized medicine, retention campaigns.

Individual Treatment Effect (ITE): τ_i = Y_i(1) - Y_i(0)
Conditional Average Treatment Effect (CATE): τ(x) = E[Y(1) - Y(0) | X=x]

Key insight: We want to model τ(x) directly, not just predict Y.
```

### Why Not Use a Single Predictive Model?
Standard ML predicts Y given X and T. But:
- Models may focus on Y prediction, not treatment effect heterogeneity
- Can miss interactions between X and T if they're weak relative to main effects
- Need to explicitly model T interaction for good CATE estimates

## Meta-Learners

### S-Learner (Single Model)
One model: predict Y using X and T as feature.

```python
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LogisticRegression
import numpy as np

def s_learner(X, y, t):
    """Single model with treatment as feature."""
    X_with_t = np.column_stack([X, t])
    model = GradientBoostingRegressor(n_estimators=200, max_depth=3, learning_rate=0.1)
    model.fit(X_with_t, y)

    # CATE: predict with T=1 and T=0, take difference
    X_t1 = np.column_stack([X, np.ones(len(X))])
    X_t0 = np.column_stack([X, np.zeros(len(X))])
    tau_hat = model.predict(X_t1) - model.predict(X_t0)
    return {"model": model, "cate": tau_hat, "ate": np.mean(tau_hat)}
```

Pros: simple, uses all data, captures main effects well. Cons: may miss small treatment interactions.

### T-Learner (Two Models)
Separate models for treated and control groups.

```python
def t_learner(X, y, t):
    """Separate models for treated and control."""
    model_t = GradientBoostingRegressor(n_estimators=200, max_depth=3)
    model_c = GradientBoostingRegressor(n_estimators=200, max_depth=3)

    model_t.fit(X[t == 1], y[t == 1])
    model_c.fit(X[t == 0], y[t == 0])

    # CATE: difference in predictions
    tau_hat = model_t.predict(X) - model_c.predict(X)

    # Counterfactual predictions for sanity check
    y0_hat = model_c.predict(X)
    y1_hat = model_t.predict(X)

    return {"model_t": model_t, "model_c": model_c,
            "cate": tau_hat, "ate": np.mean(tau_hat),
            "y0_hat": y0_hat, "y1_hat": y1_hat}
```

Pros: doesn't assume treatment effect structure, flexible. Cons: each model trained on less data, may extrapolate.

### X-Learner
Cross-estimation using propensity scores.

```python
def x_learner(X, y, t):
    """X-learner: cross-learn treatment effects with propensity weighting."""
    # Stage 1: outcome models
    model_t = GradientBoostingRegressor(n_estimators=200, max_depth=3)
    model_c = GradientBoostingRegressor(n_estimators=200, max_depth=3)
    model_t.fit(X[t == 1], y[t == 1])
    model_c.fit(X[t == 0], y[t == 0])

    # Stage 2: impute treatment effects
    d_t = y[t == 1] - model_c.predict(X[t == 1])   # Treated: actual - predicted control
    d_c = model_t.predict(X[t == 0]) - y[t == 0]    # Control: predicted treated - actual

    # Stage 3: train models on imputed effects
    model_d_t = GradientBoostingRegressor(n_estimators=200, max_depth=3)
    model_d_c = GradientBoostingRegressor(n_estimators=200, max_depth=3)
    model_d_t.fit(X[t == 1], d_t)
    model_d_c.fit(X[t == 0], d_c)

    # Propensity score weighting for final CATE
    ps_model = LogisticRegression(max_iter=1000)
    ps_model.fit(X, t)
    ps = ps_model.predict_proba(X)[:, 1]

    tau_hat_t = model_d_t.predict(X)
    tau_hat_c = model_d_c.predict(X)

    # Weight by propensity
    tau_hat = ps * tau_hat_t + (1 - ps) * tau_hat_c

    return {"cate": tau_hat, "ate": np.mean(tau_hat), "models": (model_t, model_c, model_d_t, model_d_c)}
```

Pros: handles unbalanced treatment/control better, can capture complex CATE structure. Cons: more complex, multiple stages.

### R-Learner (Residual-based)
Uses Robinson's decomposition: Y = μ(X) + τ(X)·(T - e(X)) + ε.

```python
def r_learner(X, y, t):
    """R-learner using cross-fitting and orthogonalization."""
    n = len(y)
    folds = 5
    idx = np.random.permutation(n)
    fold_size = n // folds
    tau_hat = np.zeros(n)

    for fold in range(folds):
        val_idx = idx[fold * fold_size: (fold + 1) * fold_size]
        train_idx = np.concatenate([idx[:fold*fold_size], idx[(fold+1)*fold_size:]])

        X_train, X_val = X[train_idx], X[val_idx]
        y_train, y_val = y[train_idx], y[val_idx]
        t_train, t_val = t[train_idx], t[val_idx]

        # Estimate propensity score and outcome
        ps_model = LogisticRegression(max_iter=1000).fit(X_train, t_train)
        mu_model = GradientBoostingRegressor(n_estimators=100).fit(X_train, y_train)

        e_hat = ps_model.predict_proba(X_val)[:, 1]
        m_hat = mu_model.predict(X_val)

        # Residuals
        y_tilde = y_val - m_hat
        t_tilde = t_val - e_hat

        # Train CATE model on residuals
        cate_model = GradientBoostingRegressor(n_estimators=100, max_depth=3)
        cate_model.fit(X_val, y_tilde / t_tilde)  # Simplified
        tau_hat[val_idx] = cate_model.predict(X_val)

    return {"cate": tau_hat, "ate": np.mean(tau_hat)}
```

## Causal Forests

### Generalized Random Forests (Athey & Imbens, 2016)
Random forests adapted to estimate CATE. Splits based on treatment effect heterogeneity, not just outcome prediction.

```python
from econml.grf import CausalForest

def causal_forest(X, y, t, n_estimators=500, min_samples_leaf=10):
    cf = CausalForest(
        n_estimators=n_estimators,
        min_samples_leaf=min_samples_leaf,
        max_depth=20,
        random_state=42
    )
    cf.fit(X, t, y)
    tau_hat = cf.marginal_effect(X)
    ate = cf.marginal_effect().mean()
    return {"model": cf, "cate": tau_hat, "ate": ate}

def cf_variable_importance(cf):
    """Treatment effect heterogeneity variable importance."""
    return cf.feature_importances_

def cf_confidence_intervals(cf, X, alpha=0.05):
    """Bootstrap-based CIs for CATE estimates."""
    te = cf.marginal_effect(X)
    te_var = cf.marginal_effect_inference(X)
    ci_lower = te - 1.96 * np.sqrt(te_var)
    ci_upper = te + 1.96 * np.sqrt(te_var)
    return {"te": te, "ci_lower": ci_lower, "ci_upper": ci_upper}
```

### Honest Trees
Standard random forest uses same data for splitting and estimation → overfits CATE.
Honest approach: split sample, use one part for tree structure, other for within-leaf estimates.

```python
def honest_cate_estimate(X, y, t, tree_structure_idx, estimation_idx):
    """Honest estimation: separate data for tree building and treatment effect estimation."""
    from econml.grf import CausalForest
    cf = CausalForest(n_estimators=500, honesty=True, honesty_fraction=0.5)
    cf.fit(X[tree_structure_idx], t[tree_structure_idx], y[tree_structure_idx])
    tau_hat = cf.marginal_effect(X[estimation_idx])
    return tau_hat
```

## Double/Debiased ML (DML)

### Framework (Chernozhukov et al., 2018)
Use machine learning to estimate nuisance parameters, then Neyman-orthogonal moment condition for treatment effect.

```python
from econml.dml import LinearDML, CausalForestDML

def double_ml(X, y, t, model_y=None, model_t=None):
    """Double/debiased ML for ATE estimation."""
    if model_y is None:
        model_y = GradientBoostingRegressor(n_estimators=100, max_depth=3)
    if model_t is None:
        model_t = LogisticRegression(max_iter=1000)

    dml = LinearDML(
        model_y=model_y,
        model_t=model_t,
        discrete_treatment=True,
        cv=5  # Cross-fitting
    )
    dml.fit(y, t, X=X)

    ate = dml.ate()
    ate_ci = dml.ate_interval()
    ate_stderr = dml.ate_inference().se

    return {"ate": ate, "ci_95": ate_ci, "se": ate_stderr}

def double_ml_cate(X, y, t):
    """DML for heterogeneous CATE estimation."""
    dml = CausalForestDML(
        model_y=GradientBoostingRegressor(n_estimators=100),
        model_t=LogisticRegression(max_iter=1000),
        discrete_treatment=True
    )
    dml.fit(y, t, X=X)
    tau_hat = dml.marginal_effect(X)
    return {"cate": tau_hat, "model": dml}
```

### Cross-Fitting
```python
def cross_fit_dml(X, y, t, n_folds=5):
    """DML with cross-fitting to avoid overfitting bias."""
    n = len(y)
    fold_idx = np.random.choice(n_folds, n)
    ate_folds = []

    for fold in range(n_folds):
        train = fold_idx != fold
        val = fold_idx == fold

        # Train nuisance models on training fold
        mu_model = GradientBoostingRegressor().fit(X[train], y[train])
        ps_model = LogisticRegression().fit(X[train], t[train])

        # Predict on validation fold
        m_hat = mu_model.predict(X[val])
        e_hat = ps_model.predict_proba(X[val])[:, 1]

        # Orthogonal score
        y_tilde = y[val] - m_hat
        t_tilde = t[val] - e_hat
        ate = np.mean(y_tilde * t_tilde) / np.mean(t_tilde**2)
        ate_folds.append(ate)

    return {"ate_mean": np.mean(ate_folds), "ate_std": np.std(ate_folds) / np.sqrt(n_folds)}
```

## Heterogeneous Treatment Effect Evaluation

### Best Linear Predictor (BLP) Test
```python
def blp_test(cate_estimates, X, y, t, n_folds=5):
    """Best Linear Predictor test for CATE model calibration."""
    from sklearn.linear_model import LinearRegression

    # Cross-fitted CATE
    tau_hat = np.zeros(len(y))
    for fold in range(n_folds):
        train = np.arange(len(y)) % n_folds != fold
        val = np.arange(len(y)) % n_folds == fold
        model = CausalForest()
        model.fit(X[train], t[train], y[train])
        tau_hat[val] = model.marginal_effect(X[val]).flatten()

    # BLP: regress Y on (T - e) * tau_hat and (T - e)
    ps_model = LogisticRegression().fit(X, t)
    e_hat = ps_model.predict_proba(X)[:, 1]
    t_tilde = t - e_hat

    Z = np.column_stack([t_tilde * tau_hat, t_tilde])
    blp = LinearRegression().fit(Z, y)
    return {
        "beta1 (tau slope)": blp.coef_[0],
        "beta2 (level)": blp.coef_[1],
        "good_calibration": abs(blp.coef_[0] - 1) < 0.5
    }
```

### Uplift Curve
```python
def uplift_curve(cate_estimates, X, y, t, n_bins=10):
    """Sort by estimated CATE, measure actual treatment effect in each bin."""
    sorted_idx = np.argsort(cate_estimates)
    bin_size = len(sorted_idx) // n_bins
    bins = []

    for i in range(n_bins):
        bin_idx = sorted_idx[i * bin_size: (i + 1) * bin_size]
        y_bin, t_bin = y[bin_idx], t[bin_idx]
        if np.sum(t_bin == 1) > 0 and np.sum(t_bin == 0) > 0:
            tau_bin = np.mean(y_bin[t_bin == 1]) - np.mean(y_bin[t_bin == 0])
        else:
            tau_bin = 0
        bins.append({
            "decile": i + 1,
            "tau_estimate": tau_bin,
            "n_treatment": np.sum(t_bin == 1),
            "n_control": np.sum(t_bin == 0)
        })
    return bins
```

## Practical Considerations

### When Causal ML Beats Standard Approaches
```
1. Large sample size (n > 10,000+)
2. Rich covariate space (many potential effect modifiers)
3. Complex, non-linear treatment effect heterogeneity
4. Well-measured confounders (unconfoundedness plausible)
5. Overlap (positivity) throughout covariate space
```

### Pitfalls
```
1. Overfitting CATE → spurious heterogeneity
   - Solution: cross-fitting, honest trees, regularization

2. Poor overlap → extreme propensity scores → high variance
   - Solution: trim extreme propensities, weight stabilization

3. Confounding not captured → biased CATE
   - Solution: better DAG, sensitivity analysis

4. Treatment effect heterogeneity is small → hard to detect
   - Solution: larger sample, focus on high-variance subgroups
```

### Key Formulas
```
ATE = E[Y(1) - Y(0)]
CATE = E[Y(1) - Y(0) | X=x]
IPW: ATE = E[YT/e(X) - Y(1-T)/(1-e(X))]
AIPW: ATE = E[μ₁(X) - μ₀(X) + T(Y-μ₁(X))/e(X) - (1-T)(Y-μ₀(X))/(1-e(X))]
DML score: E[(Y - m(X))(T - e(X)) / Var(T|X)] = τ
```
