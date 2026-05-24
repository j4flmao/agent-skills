# Quasi-Experimental Methods Reference

## Difference-in-Differences (DiD)

### Basic Framework
```
When: Panel data with treatment and control groups observed before and after treatment.
Idea: Compare the change in outcome for treated to the change for control.

Y_it = α + β·Treat_i + γ·Post_t + δ·(Treat_i × Post_t) + ε_it

δ is the DiD estimator: ATT = E[Y₁ - Y₀ | Treated, Post] - E[Y₁ - Y₀ | Control, Post]
```

```python
import statsmodels.api as sm
import pandas as pd
import numpy as np

def did_estimate(df, outcome, treatment, post, unit_id, time_id):
    """Two-way fixed effects DiD."""
    df["did"] = df[treatment] * df[post]
    # With unit and time fixed effects
    formula = f"{outcome} ~ did + C({unit_id}) + C({time_id})"
    model = sm.OLS.from_formula(formula, data=df).fit()
    return {
        "did_coef": model.params["did"],
        "ci": model.conf_int().loc["did"].tolist(),
        "p_value": model.pvalues["did"],
        "se": model.bse["did"]
    }
```

### Parallel Trends Assumption
**Critical Assumption:** In the absence of treatment, the treated and control groups would have followed the same trend over time.

```python
def parallel_trends_test(df, outcome, treatment, time_id, pre_periods):
    """Placebo test: check parallel trends in pre-treatment periods."""
    pre_df = df[df[time_id].isin(pre_periods)]
    # Create fake treatment in middle of pre-period
    mid = pre_periods[len(pre_periods) // 2]
    pre_df["placebo_post"] = (pre_df[time_id] > mid).astype(int)
    pre_df["placebo_did"] = pre_df[treatment] * pre_df["placebo_post"]
    formula = f"{outcome} ~ placebo_did + C({unit_id}) + C({time_id})"
    model = sm.OLS.from_formula(formula, data=pre_df).fit()
    # Should be NOT significant (no pre-existing divergent trend)
    return {
        "placebo_coef": model.params["placebo_did"],
        "p_value": model.pvalues["placebo_did"],
        "parallel_trends_violated": model.pvalues["placebo_did"] < 0.05
    }

def event_study_plot(df, outcome, treatment, event_time):
    """Event study: leads and lags to visualize dynamic effects."""
    import matplotlib.pyplot as plt
    # Create event-time dummies (relative to treatment)
    for t in range(-5, 6):
        if t == -1:
            continue  # Omit reference period
        df[f"event_{t}"] = (df[treatment] & (df[event_time] == t)).astype(int)
    event_vars = [f"event_{t}" for t in range(-5, 6) if t != -1]
    formula = f"{outcome} ~ " + " + ".join(event_vars)
    model = sm.OLS.from_formula(formula, data=df).fit()
    coefs = [model.params.get(f"event_{t}", 0) for t in range(-5, 6)]
    ci = [model.conf_int().loc[f"event_{t}"].tolist() if f"event_{t}" in model.params else [0, 0]
           for t in range(-5, 6)]
    return coefs, ci
```

### Two-Way Fixed Effects Concerns
Recent literature (Goodman-Bacon, Callaway & Sant'Anna, Sun & Abraham) shows TWFE can be biased with:
- Staggered treatment adoption (treatment at different times for different units)
- Heterogeneous treatment effects over time

```python
# Callaway & Sant'Anna estimator (staggered DiD)
# from did import did
# cs_results = did.DID(df, yname="outcome", tname="time", idname="unit",
#                      gname="first_treat", xformla=None)
# cs_results.att_gt()  # Group-time average treatment effects
# cs_results.aggte("simple")  # Aggregate ATT
```

### Triple Differences (DDD)
```python
def triple_diff(df, outcome, treatment, post, group):
    """Add a third dimension to DiD (e.g., another control group)."""
    df["did"] = df[treatment] * df[post]
    df["ddd"] = df[treatment] * df[post] * df[group]
    formula = f"{outcome} ~ did * C({group}) + C({post}) * C({group}) + C({treatment}) * C({group})"
    model = sm.OLS.from_formula(formula, data=df).fit()
    return model
```

## Regression Discontinuity Design (RDD)

### Basic Framework
```
When: Treatment assigned based on cutoff on a continuous running variable.
Idea: Units just below and just above cutoff are comparable.

Sharp RDD: treatment = 1 if running_var > cutoff (deterministic)
Fuzzy RDD: treatment probability jumps at cutoff (not deterministic)
```

```python
def sharp_rdd(X, y, cutoff, bandwidth=None, kernel="triangular", order=2):
    """Sharp RDD with local polynomial regression."""
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import PolynomialFeatures

    # Optimal bandwidth: Cross-entropy method or Silverman's rule
    if bandwidth is None:
        bandwidth = np.std(X) * 0.5

    # Select observations within bandwidth
    in_bandwidth = np.abs(X - cutoff) <= bandwidth
    X_bw, y_bw = X[in_bandwidth], y[in_bandwidth]

    # Centered running variable
    X_centered = X_bw - cutoff
    T = (X_centered >= 0).astype(float)

    # Polynomial basis
    poly = PolynomialFeatures(degree=order, include_bias=False)
    X_poly = poly.fit_transform(X_centered.reshape(-1, 1))

    # Treatment + polynomial terms + interaction
    design = np.column_stack([T, X_poly, T * X_poly[:, 0]])
    model = LinearRegression().fit(design, y_bw)
    return {
        "lwald": model.coef_[0],  # Local Wald estimate (ATE at cutoff)
        "bandwidth": bandwidth,
        "n_obs": len(X_bw)
    }
```

### Validity Tests
```python
def rdd_validity_checks(data, running_var, cutoff):
    """Check RDD assumptions."""
    # 1. Density continuity (McCrary test)
    # No evidence of manipulation around cutoff
    from rdrobust import rdrobust
    density = rdrobust(data[running_var], cutoff=cutoff)
    # 2. Covariate balance
    # Covariates should be smooth through cutoff
    covariate_checks = {}
    for cov in ["age", "gender", "prior_outcome"]:
        if cov in data.columns:
            rdd_cov = sharp_rdd(data[running_var], data[cov], cutoff)
            covariate_checks[cov] = {"p_value": rdd_cov.get("p_value"), "balanced": ...}
    # 3. Placebo cutoffs
    placebo = {}
    for placebo_cutoff in [cutoff - 1, cutoff + 1]:
        rdd_placebo = sharp_rdd(data[running_var], data["outcome"], placebo_cutoff)
        placebo[placebo_cutoff] = rdd_placebo.get("lwald")
    return {"density_test": density, "covariates": covariate_checks, "placebo": placebo}
```

### Bandwidth Selection
```python
def optimal_bandwidth(X, y, cutoff, method="mse"):
    """MSE-optimal bandwidth for RDD."""
    from rdrobust import rdbwselect
    bw = rdbwselect(X, y, cutoff=cutoff, bwselect="mserd")
    return {"h_left": bw["bws"][0], "h_right": bw["bws"][1], "n_eff": bw["N_h"]}
```

## Instrumental Variables (IV)

### Framework
```
When: Unobserved confounders exist, but we have a variable Z that:
  1. Relevance: Z → X (Z predicts treatment)
  2. Exclusion: Z ↛ Y except through X (no direct effect on outcome)
  3. Exogeneity: no unobserved confounders of Z and Y

Two-stage least squares (2SLS):
  Stage 1: X = π₀ + π₁Z + η
  Stage 2: Y = β₀ + β₁X̂ + ε
```

```python
def iv_2sls(y, X, Z, X_exogenous=None):
    """Two-Stage Least Squares."""
    if X_exogenous is not None:
        instruments = np.column_stack([Z, X_exogenous])
        exog = X_exogenous
    else:
        instruments = Z.reshape(-1, 1)
        exog = np.ones((len(y), 1))

    # Stage 1: predict treatment using instruments
    from sklearn.linear_model import LinearRegression
    stage1 = LinearRegression()
    stage1.fit(np.column_stack([instruments, exog]), X)
    X_hat = stage1.predict(np.column_stack([instruments, exog]))

    # Stage 2: regress outcome on predicted treatment
    stage2 = LinearRegression()
    stage2.fit(np.column_stack([X_hat, exog]), y)
    return {
        "beta_iv": stage2.coef_[0],
        "first_stage_F": stage1.score(np.column_stack([instruments, exog]), X),
        "weak_instrument_warning": stage1.score(np.column_stack([instruments, exog]), X) < 10
    }

def first_stage_f_stat(X, Z, X_exogenous=None):
    """F-statistic for weak instruments test (F < 10 → weak)."""
    from statsmodels.regression.linear_model import OLS
    if X_exogenous is not None:
        Z_full = np.column_stack([Z, X_exogenous])
    else:
        Z_full = Z.reshape(-1, 1)
    model = OLS(X, sm.add_constant(Z_full)).fit()
    return model.fvalue
```

### Weak Instruments
- F-statistic < 10 indicates weak instruments
- Weak IV leads to: biased 2SLS estimates (toward OLS), large standard errors
- Solutions: LIML (limited information maximum likelihood), Anderson-Rubin CI

### Local Average Treatment Effect (LATE)
IV with binary instrument estimates LATE: average treatment effect for compliers (units whose treatment is changed by the instrument).

```
Compliers: X=1 when Z=1, X=0 when Z=0
Always-takers: X=1 regardless of Z
Never-takers: X=0 regardless of Z
Defiers: X=0 when Z=1, X=1 when Z=0 (monotonicity: no defiers)

LATE = E[Y(1) - Y(0) | Complier]
```

## Propensity Score Matching (PSM)

### Framework
```
Propensity score: e(X) = P(T=1 | X)
Under unconfoundedness: Y(1), Y(0) ⟂ T | e(X)

Matching: pair each treated unit with control unit(s) having similar e(X)
```

```python
def propensity_score(X, t):
    from sklearn.linear_model import LogisticRegression
    model = LogisticRegression(max_iter=1000)
    model.fit(X, t)
    return model.predict_proba(X)[:, 1]

def nearest_neighbor_matching(X, t, y, caliper=0.05, n_neighbors=1):
    from sklearn.neighbors import NearestNeighbors
    ps = propensity_score(X, t)
    treated_idx = np.where(t == 1)[0]
    control_idx = np.where(t == 0)[0]
    nn = NearestNeighbors(n_neighbors=n_neighbors)
    nn.fit(ps[control_idx].reshape(-1, 1))
    distances, matches = nn.kneighbors(ps[treated_idx].reshape(-1, 1))
    valid = (distances <= caliper).all(axis=1)
    matched_control = control_idx[matches[valid]].flatten()
    att = np.mean(y[treated_idx[valid]]) - np.mean(y[matched_control])
    return {"att": att, "n_matched": np.sum(valid), "n_unmatched": np.sum(~valid)}
```

### Balance Check
```python
def balance_check(X, t, ps=None):
    """Check covariate balance after matching."""
    treated = X[t == 1]
    control = X[t == 0]
    results = {}
    for i, col in enumerate(X.columns):
        mean_t = np.mean(treated[:, i])
        mean_c = np.mean(control[:, i])
        std_t = np.std(treated[:, i])
        std_c = np.std(control[:, i])
        std_diff = (mean_t - mean_c) / np.sqrt((std_t**2 + std_c**2) / 2)
        results[col] = {"std_diff": std_diff, "balanced": abs(std_diff) < 0.25}
    return results
```

## Synthetic Control

### Framework
```
When: Single treated unit, multiple control units.
Idea: Construct synthetic control as weighted average of control units.
Weights chosen to match pre-treatment outcome trajectory.

Y_{1t} = outcome of treated unit at time t
Y_{0t}^synth = Σ w_j Y_{jt} for control units j
Weights w_j ≥ 0, Σ w_j = 1, minimize pre-treatment RMSE
```

```python
from scipy.optimize import minimize

def synthetic_control(unit_treated, control_units, outcome_col, time_col, treatment_time):
    """Construct synthetic control and estimate treatment effect."""
    pre_period = unit_treated[unit_treated[time_col] < treatment_time]
    post_period = unit_treated[unit_treated[time_col] >= treatment_time]
    pre_control = {j: c[c[time_col] < treatment_time][outcome_col].values
                   for j, c in control_units.items()}
    post_control = {j: c[c[time_col] >= treatment_time][outcome_col].values
                    for j, c in control_units.items()}

    target = pre_period[outcome_col].values
    control_matrix = np.column_stack([pre_control[j] for j in control_units])

    def rmse(weights):
        weights = weights / np.sum(weights)  # Normalize
        synthetic = control_matrix @ weights
        return np.sqrt(np.mean((target - synthetic)**2))

    result = minimize(rmse, x0=np.ones(len(control_units))/len(control_units),
                      bounds=[(0, 1)]*len(control_units), constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1}])

    weights = result.x / np.sum(result.x)
    post_target = post_period[outcome_col].values
    post_synthetic = np.column_stack([post_control[j] for j in control_units]) @ weights
    effect = post_target - post_synthetic
    return {"weights": dict(zip(control_units.keys(), weights)), "effect": effect}
```

### Placebo Tests
```python
def synthetic_control_placebo(unit_treated, control_units, outcome_col, time_col, treatment_time):
    """Iterate placebo test: swap treated with each control unit."""
    placebos = {}
    for j, c in control_units.items():
        control_set = {k: v for k, v in control_units.items() if k != j}
        control_set[unit_treated] = unit_treated  # Add real treated as control
        result = synthetic_control(c, control_set, outcome_col, time_col, treatment_time)
        placebos[j] = result["effect"]
    return placebos
```
