---
name: data-science-causal-inference
description: >
  Use this skill when asked about causal inference, causal effect estimation, potential outcomes, Rubin causal model, DAGs, Pearl do-calculus, counterfactual reasoning, structural causal models, difference-in-differences, regression discontinuity, instrumental variables, propensity score matching, synthetic control, uplift modeling, heterogeneous treatment effects, CATE estimation, meta-learners, causal forests, double ML, or causal machine learning. This skill enforces: causal frameworks (potential outcomes, DAGs, do-calculus, counterfactuals, structural causal models), quasi-experimental methods (DiD, RDD, IV, PSM, synthetic control), and causal ML (uplift modeling, CATE, meta-learners, causal forests, double ML). Do NOT use for: A/B testing (use experimentation skill), general statistical analysis (use statistical-analysis skill), or predictive ML modeling.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data-science, causal-inference, phase-7]
---

# Causal Inference

## Purpose
Estimate causal effects from observational and experimental data using rigorous frameworks and methods: causal frameworks (potential outcomes / Rubin Causal Model, directed acyclic graphs / Pearl's framework, do-calculus, counterfactual reasoning, structural causal models), quasi-experimental methods (difference-in-differences, regression discontinuity design, instrumental variables, propensity score matching, synthetic control), and causal machine learning (uplift modeling, heterogeneous treatment effects, CATE estimation, S/T/X-learners, causal forests, double/debiased ML).

## Agent Protocol

### Trigger
Exact user phrases: "causal inference", "causal effect", "treatment effect", "potential outcomes", "Rubin causal model", "DAG", "directed acyclic graph", "do-calculus", "counterfactual", "structural causal model", "SCM", "difference-in-differences", "DiD", "regression discontinuity", "RDD", "instrumental variable", "IV", "propensity score", "PSM", "synthetic control", "uplift modeling", "heterogeneous treatment effect", "HTE", "CATE", "conditional average treatment effect", "meta-learner", "S-learner", "T-learner", "X-learner", "causal forest", "double ML", "debiased ML", "confounding", "selection bias", "endogeneity", "identification".

### Input Context
Before activating, verify:
- Data source (RCT, observational, panel, time series)
- Treatment assignment mechanism (random, conditional, self-selection)
- Confounders observed and unobserved
- Target estimand (ATE, ATT, CATE, ITE)
- Domain knowledge for DAG construction
- Sample size and dimensionality
- Budget/computational constraints for causal ML

### Output Artifact
Causal analysis plan with identification strategy, estimation method, robustness checks, and sensitivity analysis.

### Response Format
```python
# Estimation code
```
```text
# CATE estimates: ATE, ATT, heterogeneity analysis
# DAG specification in DOT notation
# Sensitivity analysis results
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Causal question formalized with treatment, outcome, and confounders
- [ ] DAG constructed and identification strategy justified
- [ ] Estimand clearly defined (ATE, ATT, CATE, LATE)
- [ ] Estimation method chosen with assumptions stated
- [ ] Robustness checks (placebo, permutation, sensitivity)
- [ ] Results reported with confidence intervals and interpretation
- [ ] Limitations and untestable assumptions documented

### Max Response Length
400 lines of code and output.

## Workflow

### Step 1: Causal Graph Specification
```python
# DAG specification with DOT notation
dag_spec = """
digraph CausalModel {
  Z [label="Instrument Z"]
  X [label="Treatment X"]
  Y [label="Outcome Y"]
  C1 [label="Confounder C1"]
  C2 [label="Confounder C2"]
  C1 -> X; C1 -> Y
  C2 -> X; C2 -> Y
  X -> Y
  Z -> X
}
"""
```

```python
import networkx as nx
from causallearn.graph import GeneralGraph
from causallearn.utils.cit import chisq, fisherz

def dag_backdoor_criteria(graph, treatment, outcome):
    """Check if backdoor criterion is satisfied."""
    ancestors_t = nx.ancestors(graph, treatment)
    ancestors_o = nx.ancestors(graph, outcome)
    # Nodes on backdoor paths (non-causal paths from treatment to outcome)
    backdoor_set = set()
    for node in graph.nodes:
        paths = list(nx.all_simple_paths(graph, treatment, outcome))
        for path in paths:
            if node in path[1:-1]:
                backdoor_set.add(node)
    return backdoor_set
```

### Step 2: Propensity Score Methods
```python
from sklearn.linear_model import LogisticRegression
import numpy as np

def propensity_score(X, t):
    model = LogisticRegression(max_iter=1000, penalty=None)
    model.fit(X, t)
    return model.predict_proba(X)[:, 1]

def ipw_estimate(y, t, ps):
    """Inverse probability weighting for ATE."""
    weights = t / ps + (1 - t) / (1 - ps)
    ate = np.mean(t * y / ps - (1 - t) * y / (1 - ps))
    # Stabilized weights
    p_t = np.mean(t)
    sw = t * p_t / ps + (1 - t) * (1 - p_t) / (1 - ps)
    ate_stable = np.mean(t * y / ps * p_t - (1 - t) * y / (1 - ps) * (1 - p_t))
    return {"ate": ate, "ate_stabilized": ate_stable, "weights": weights}

def matching_estimator(y, t, X, caliper=0.05):
    """Nearest neighbor matching with caliper."""
    from sklearn.neighbors import NearestNeighbors
    treated = X[t == 1]
    control = X[t == 0]
    nn = NearestNeighbors(n_neighbors=1, metric="euclidean")
    nn.fit(control)
    distances, indices = nn.kneighbors(treated)
    valid = distances.flatten() < caliper
    matched_control = control[indices[valid].flatten()]
    att = np.mean(y[t == 1][valid]) - np.mean(y[t == 0][indices[valid].flatten()])
    return {"att": att, "n_matched": np.sum(valid), "n_unmatched": np.sum(~valid)}
```

### Step 3: Difference-in-Differences
```python
import statsmodels.api as sm

def did_estimation(df, outcome, treatment, post, unit_fe, time_fe):
    """Two-way fixed effects DiD."""
    df["did"] = df[treatment] * df[post]
    X = df[["did", treatment, post]]
    X = sm.add_constant(X)
    y = df[outcome]
    model = sm.OLS(y, X).fit()
    return {
        "did_coef": model.params["did"],
        "ci": model.conf_int().loc["did"].tolist(),
        "p_value": model.pvalues["did"]
    }

def event_study(df, outcome, treatment, event_time, unit_fe, time_fe, leads=5, lags=5):
    """Event study with leads and lags."""
    import patsy
    from statsmodels.regression.linear_model import OLS
    for lag in range(-leads, lags + 1):
        if lag == -1:
            continue
        df[f"event_{lag}"] = (df[treatment] & (df[event_time] == lag)).astype(int)
    formula = f"{outcome} ~ " + " + ".join([f"event_{lag}" for lag in range(-leads, lags + 1) if lag != -1]) + f" + C({unit_fe}) + C({time_fe})"
    y, X = patsy.dmatrices(formula, df, return_type="dataframe")
    model = OLS(y, X).fit()
    return model
```

### Step 4: Regression Discontinuity
```python
def rdd_estimation(df, outcome, running_var, cutoff, bandwidth=None, order=2):
    """Sharp RDD with local polynomial regression."""
    from sklearn.preprocessing import PolynomialFeatures
    from sklearn.linear_model import LinearRegression

    if bandwidth is None:
        bandwidth = np.std(df[running_var]) * 0.5

    df_rdd = df[(df[running_var] >= cutoff - bandwidth) & (df[running_var] <= cutoff + bandwidth)].copy()
    df_rdd["treatment"] = (df_rdd[running_var] >= cutoff).astype(float)
    df_rdd["running_centered"] = df_rdd[running_var] - cutoff

    poly = PolynomialFeatures(degree=order, interaction_only=False, include_bias=False)
    X_base = df_rdd[["running_centered"]].values
    X_poly = poly.fit_transform(X_base)
    X = np.column_stack([df_rdd["treatment"].values, X_poly])

    model = LinearRegression().fit(X, df_rdd[outcome])
    return {"lwald_estimate": model.coef_[0], "bandwidth": bandwidth, "n": len(df_rdd)}
```

### Step 5: Instrumental Variables
```python
def iv_2sls(y, t, X, instrument):
    """Two-stage least squares."""
    import statsmodels.api as sm

    # First stage: regress treatment on instrument
    Z = sm.add_constant(np.column_stack([instrument, X]))
    first_stage = sm.OLS(t, Z).fit()
    t_hat = first_stage.fittedvalues

    # Second stage: regress outcome on predicted treatment
    W = sm.add_constant(np.column_stack([t_hat, X]))
    second_stage = sm.OLS(y, W).fit()
    return {
        "coef": second_stage.params[1],
        "ci": second_stage.conf_int().loc[W.columns[1]].tolist(),
        "p_value": second_stage.pvalues[1],
        "first_stage_f": first_stage.fvalue,
        "weak_instrument": first_stage.fvalue < 10
    }
```

### Step 6: Causal ML — Meta-Learners
```python
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LogisticRegression

def s_learner(X, y, t):
    """Single model: include treatment as feature."""
    model = GradientBoostingRegressor(n_estimators=100)
    X_with_t = np.column_stack([X, t])
    model.fit(X_with_t, y)
    X1 = np.column_stack([X, np.ones(len(X))])
    X0 = np.column_stack([X, np.zeros(len(X))])
    cate = model.predict(X1) - model.predict(X0)
    return {"model": model, "cate_mean": np.mean(cate), "cate_std": np.std(cate)}

def t_learner(X, y, t):
    """Two models: separate models for treated and control."""
    model_t = GradientBoostingRegressor(n_estimators=100)
    model_c = GradientBoostingRegressor(n_estimators=100)
    model_t.fit(X[t == 1], y[t == 1])
    model_c.fit(X[t == 0], y[t == 0])
    cate = model_t.predict(X) - model_c.predict(X)
    return {"model_t": model_t, "model_c": model_c, "cate_mean": np.mean(cate), "cate_std": np.std(cate)}

def x_learner(X, y, t):
    """X-learner: cross-learn propensity and treatment effects."""
    # Propensity model
    ps_model = LogisticRegression().fit(X, t)
    ps = ps_model.predict_proba(X)[:, 1]

    # Impute treatment effects
    model_t = GradientBoostingRegressor().fit(X[t == 1], y[t == 1])
    model_c = GradientBoostingRegressor().fit(X[t == 0], y[t == 0])

    d_t = y[t == 1] - model_c.predict(X[t == 1])
    d_c = model_t.predict(X[t == 0]) - y[t == 0]

    # Weight by propensity
    model_d_t = GradientBoostingRegressor().fit(X[t == 1], d_t)
    model_d_c = GradientBoostingRegressor().fit(X[t == 0], d_c)

    tau_t = model_d_t.predict(X)
    tau_c = model_d_c.predict(X)
    cate = ps * tau_t + (1 - ps) * tau_c
    return {"cate_mean": np.mean(cate), "cate_std": np.std(cate)}
```

### Step 7: Causal Forests
```python
from econml.grf import CausalForest

def causal_forest_ate(X, y, t):
    cf = CausalForest(n_estimators=500, min_samples_leaf=10, max_depth=20)
    cf.fit(X, t, y)
    ate = cf.marginal_effect(X).mean()
    te = cf.marginal_effect(X)
    return {"ate": ate[0], "cate_stderr": te.std(), "model": cf}

def heterogeneous_effects(cf, X, feature_names=None):
    te = cf.marginal_effect(X)
    # Variable importance for heterogeneity
    imp = cf.feature_importances_
    return {"treatment_effects": te, "importance": dict(zip(feature_names or range(len(imp)), imp))}
```

### Step 8: Double/Debiased ML
```python
from econml.dml import LinearDML

def double_ml(X, y, t, model_y=None, model_t=None):
    if model_y is None:
        model_y = GradientBoostingRegressor(n_estimators=100, max_depth=3)
    if model_t is None:
        model_t = LogisticRegression(max_iter=1000)
    dml = LinearDML(model_y=model_y, model_t=model_t, discrete_treatment=True)
    dml.fit(y, t, X=X)
    ate = dml.ate()
    ci = dml.ate_interval()
    return {"ate": ate, "ci_95": ci}
```

### Method Comparison

```yaml
method_selection:
  randomized_experiment:
    assumptions: "Randomization, no spillover, compliance"
    estimand: "ATE, ATT, CATE"
    data_required: "RCT design, outcome + treatment"
    strength: "Gold standard — unbiased if randomization holds"
    weakness: "Expensive, not always feasible, external validity concerns"
  
  difference_in_differences:
    assumptions: "Parallel trends, no spillover, common shocks"
    estimand: "ATT (treated vs control over time)"
    data_required: "Panel data with pre/post periods + untreated control"
    strength: "Controls for time-invariant confounders"
    weakness: "Parallel trends assumption untestable; sensitive to time window"
  
  regression_discontinuity:
    assumptions: "Continuity at cutoff, no manipulation of running variable"
    estimand: "LATE at cutoff"
    data_required: "Running variable with threshold, outcome"
    strength: "Credible near cutoff (gold standard for local effects)"
    weakness: "Low external validity, requires large N near cutoff, limited power"
  
  instrumental_variables:
    assumptions: "Relevance, exclusion, exchangeability"
    estimand: "LATE (compliers)"
    data_required: "Valid instrument, outcome, treatment"
    strength: "Handles unobserved confounders if valid instrument exists"
    weakness: "Strong instruments are rare; weak instrument bias; LATE interpretation"
  
  propensity_score_matching:
    assumptions: "Ignorability (unconfoundedness), overlap, SUTVA"
    estimand: "ATE or ATT (with matching)"
    data_required: "Observational data with all confounders measured"
    strength: "Intuitive, mimics RCT design"
    weakness: "Only measured confounders; sensitivity to matching method"
  
  synthetic_control:
    assumptions: "Pre-treatment fit, no interference, convex combination"
    estimand: "ATT (single treated unit)"
    data_required: "Panel data, single treated unit, multiple control units"
    strength: "Transparent weights, data-driven control construction"
    weakness: "Only for single treated unit; extrapolation concerns"
  
  double_ML:
    assumptions: "Ignorability, overlap, Neyman orthogonality"
    estimand: "ATE, CATE"
    data_required: "Observational data with high-dimensional confounders"
    strength: "Handles high-dimensional confounders, robust to model misspecification"
    weakness: "Requires sample splitting; sensitive to ML model choices"
```

### Sensitivity Analysis

```python
# E-value: how strong must an unobserved confounder be to explain away the effect?
# E-value = RR + sqrt(RR × (RR - 1)) for RR > 1
def e_value(estimate, lower_ci=None, upper_ci=None):
    """
    Compute E-value for a risk ratio estimate.
    Minimum strength of association an unobserved confounder
    must have with BOTH treatment and outcome to explain away the effect.
    """
    def compute_eval(rr):
        if rr <= 1:
            return 1.0
        return rr + np.sqrt(rr * (rr - 1))
    
    eval_est = compute_eval(estimate)
    eval_ci = None
    if lower_ci is not None and upper_ci is not None:
        # Use CI closest to null
        ci_closest = max(min(upper_ci, 1/upper_ci), lower_ci)
        if ci_closest >= 1:
            eval_ci = compute_eval(ci_closest)
        else:
            eval_ci = 1.0
    
    return {"e_value_estimate": eval_est, "e_value_ci": eval_ci}

# Example: RR = 2.0, 95% CI [1.5, 2.5]
# E-value for estimate: 3.41
# Interpretation: unobserved confounder must be associated with
# both treatment and outcome by RR of 3.41+ to explain away the effect
```

### Common Causal Pitfalls

```yaml
pitfalls:
  - name: "Collider bias (Berkson's paradox)"
    description: "Stratifying on a collider opens a non-causal path between treatment and outcome"
    example: "Analyzing hospital patients: sicker patients get more treatment, but also have worse outcomes"
    fix: "Do NOT condition on colliders; use DAG to identify colliders before adjustment set selection"
  
  - name: "M-bias"
    description: "A collider between two confounders, conditioning on it creates bias"
    example: "X ← U1 → C ← U2 → Y, conditioning on C creates non-causal X-Y association"
    fix: "Use backdoor criterion; only condition on non-colliders that block backdoor paths"
  
  - name: "Over-adjustment (controlling for mediators)"
    description: "Conditioning on a variable on the causal path from treatment to outcome"
    example: "Treatment affects learning, which affects score. Controlling for learning attenuates effect"
    fix: "Do NOT condition on mediators unless estimating direct effect (different estimand)"
  
  - name: "Post-treatment selection bias"
    description: "Conditioning on an outcome that happens after treatment, confounded by both"
    example: "Only analyzing users who completed a tutorial (affected by treatment)"
    fix: "Use intention-to-treat analysis; handle attrition via bounds or inverse probability weighting"
  
  - name: "Weak instrument bias"
    description: "IV with weak correlation to treatment produces biased estimates even in large samples"
    example: "Using lottery wins as instrument for education — weak when few people win"
    fix: "Check F-statistic > 10 for first stage; use robust IV methods (LIML, jackknife IV)"
    
  - name: "Look-ahead bias (anticipation effects)"
    description: "Units change behavior in anticipation of treatment"
    example: "Companies adjust inventory before a tariff announcement takes effect"
    fix: "Use announcement date not effective date; placebo tests on pre-treatment periods"
```

### Causal Discovery

```python
# Causal structure learning (for hypothesis generation, not confirmation)
from causallearn.search.ConstraintBased.PC import pc
from causallearn.utils.GraphUtils import GraphUtils

def learn_dag(data, alpha=0.05, independence_test='fisherz'):
    """
    PC algorithm for causal discovery.
    WARNING: outputs causal graph, NOT causal effects.
    Use for DAG hypothesis generation, then validate with domain experts.
    """
    cg = pc(data, alpha=alpha, indep_test=independence_test)
    
    # Convert to DOT for visualization
    pyd = GraphUtils.to_pydot(cg.G)
    return {
        "graph": cg.G,
        "edges": [(str(cg.G.nodes[i][0]), str(cg.G.nodes[j][0]))
                  for i, j in cg.G.find_edges()],
        "independencies": cg.check_ci_deviations()
    }
```

### Power Analysis for Observational Studies

```python
# Power calculation for DiD with panel data
def power_did(n_units, n_periods, effect_size, rho=0.5, sigma=1, alpha=0.05):
    """
    Power for difference-in-differences.
    n_units: total units (treated + control)
    n_periods: pre + post periods
    effect_size: minimum detectable effect
    rho: within-unit correlation over time
    sigma: outcome standard deviation
    """
    # Effective sample size accounting for clustering
    deff = 1 + (n_periods - 1) * rho  # Design effect
    n_eff = n_units * n_periods / deff
    
    se = sigma * np.sqrt(1/n_eff + 1/n_eff)
    t_crit = stats.t.ppf(1 - alpha/2, df=n_eff - 2)
    
    power = 1 - stats.nct.cdf(t_crit, df=n_eff - 2, nc=effect_size/se)
    return power

# Power for RDD
def power_rdd(n, effect_size, bandwidth_prop=0.5, alpha=0.05):
    """
    Power for regression discontinuity.
    n: total sample size
    effect_size: jump at cutoff (in outcome SD units)
    bandwidth_prop: proportion of data near cutoff used
    """
    n_eff = n * bandwidth_prop * 0.5  # ~50% on each side of cutoff
    se = 1.08 * np.sqrt(1/n_eff)  # RDD SE approximation (local linear)
    t_crit = stats.t.ppf(1 - alpha/2, df=n_eff - 2)
    power = 1 - stats.nct.cdf(t_crit, df=n_eff - 2, nc=effect_size/se)
    return power
```

### Decision Trees

#### Causal Method Selection
```
Data and question type?
├── RCT available → Randomized experiment (ATE/CATE)
│   ├── Need real-time optimization → Multi-armed bandit
│   └── Standard A/B → Pre-registered experiment
├── Panel data, pre/post periods + control group → DiD
│   ├── Multiple treated units + staggered adoption → Event study / staggered DiD
│   └── Single treated unit + synthetic control → Synthetic control method
├── Clear cutoff in running variable → RDD
│   └── Multiple cutoffs → Multi-cutoff RDD or RDD with covariates
├── Valid instrument available → IV / 2SLS
│   └── Multiple instruments → Over-identification tests + LIML
├── Observational with all confounders measured → PSM / IPW / Double ML
│   ├── High-dimensional confounders → Double/Debiased ML
│   └── Low-dimensional, simple matching → Propensity score matching
└── Need heterogeneous treatment effects → CATE estimation
    ├── Binary treatment → Causal forest, BART, meta-learners
    └── Continuous treatment → Generalized random forest, kernel methods
```

#### Sensitivity Analysis Selection
```
What type of violation is most plausible?
├── Unobserved confounder (general)
│   └── E-value: how strong must confounder be?
├── Violation of parallel trends (DiD)
│   └── Placebo test: effect in pre-treatment period? Different control group?
├── Manipulation of running variable (RDD)
│   └── McCrary density test: discontinuity in running variable density?
├── Weak instrument (IV)
│   └── F-statistic > 10? Anderson-Rubin confidence intervals?
├── Non-random attrition
│   └── Bounds (Manski bounds, Lee bounds)
└── Multiple violations
    └── Multiple robustness checks, each addressing one violation
```

## Rules
- Always draw and justify the causal DAG before estimation
- State untestable assumptions explicitly (ignorability, exclusion, monotonicity)
- Prefer doubly robust methods when possible
- Report standard errors from bootstrap or influence functions
- Sensitivity analysis is mandatory for observational studies
- Never interpret regression coefficients causally without identification strategy
- Use domain expertise for DAG construction, not data-driven alone
- Balance check for propensity score methods (standardized mean differences)
- Placebo tests (lead outcomes, untreated units) for DiD validity
- Multiple robustness checks with different estimators
- Match method to data structure and assumptions — not all methods fit all problems
- Compute E-values for sensitivity to unobserved confounding
- Check for collider bias before adjusting for covariates
- Use causal discovery for hypothesis generation only, not confirmation
- Power analysis for observational studies is more complex than RCT power — account for clustering and design effect

## References
  - references/causal-frameworks.md — Causal Inference Frameworks Reference
  - references/causal-inference-advanced.md — Causal Inference Advanced Topics
  - references/causal-inference-fundamentals.md — Causal Inference Fundamentals
  - references/causal-inference-methods.md — Causal Inference Methods Reference
  - references/causal-ml.md — Causal Machine Learning Reference
  - references/quasi-experimental.md — Quasi-Experimental Methods Reference
## Handoff
`data-science-statistical-analysis` for foundational statistical methods
`data-science-experimentation` for RCT design and A/B testing
`data-science-analytics-engineering` for causal pipeline data infrastructure
