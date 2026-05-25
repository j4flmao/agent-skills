# Causal Inference Methods Reference

## Directed Acyclic Graphs (DAGs)

DAGs encode causal assumptions: nodes are variables, edges are causal relationships.

| Term | Definition |
|------|-----------|
| **Collider** | A → C ← B (conditioning on C opens the path) |
| **Confounder** | C → X and C → Y (common cause, creates back-door path) |
| **Mediator** | X → M → Y (intermediate on causal path) |
| **Instrument** | Z → X → Y, no direct Z → Y path |

### Back-door Criterion

A set Z satisfies the back-door criterion if: (1) no node in Z is a descendant of X, (2) Z blocks all back-door paths between X and Y. When satisfied, P(Y | do(X)) = Σ_z P(Y | X, Z) P(Z).

### d-Separation Rules

- Chain (A → B → C): blocked if B in Z
- Fork (A ← B → C): blocked if B in Z
- Collider (A → B ← C): blocked unless B in Z

## Do-Calculus

Three rules for deriving causal effects from observational data:

| Rule | Operation | Condition |
|------|-----------|-----------|
| 1 | P(y\|do(x), z) = P(y\|do(x)) | Y ⟂ Z \| X in mutilated graph |
| 2 | P(y\|do(x), do(z)) = P(y\|do(x), z) | Y ⟂ Z \| X in original graph |
| 3 | P(y\|do(x), do(z)) = P(y\|do(x)) | No directed Z → Y path |

**Front-door adjustment** (when X → M → Y, no unobserved X→Y confounding):
P(Y | do(X)) = Σ_m P(M=m | X) Σ_x' P(Y | X=x', M=m) P(X=x')

## Propensity Score Methods

```python
# IPW
ps = LogisticRegression().fit(X, t).predict_proba(X)[:, 1]
ate = np.mean(t * y / ps - (1 - t) * y / (1 - ps))

# Stabilized IPW
p_t = np.mean(t)
ate_stable = np.mean(t * y / ps * p_t - (1 - t) * y / (1 - ps) * (1 - p_t))

# Doubly robust (unbiased if OR or PS model is correct)
mu1 = GradientBoostingRegressor().fit(X[t==1], y[t==1]).predict(X)
mu0 = GradientBoostingRegressor().fit(X[t==0], y[t==0]).predict(X)
dr = (t * (y - mu1) / ps + mu1) - ((1 - t) * (y - mu0) / (1 - ps) + mu0)
ate = np.mean(dr)
```

**Balance check**: |Standardized Mean Difference| < 0.1 after weighting.

## Difference-in-Differences

**ATE = (after - before)_treated - (after - before)_control**

Key assumption: **parallel trends** — treated and control would have evolved identically without treatment.

**Testing**: run placebo DiD with fake treatment time → coefficient should be ~0. Event study with leads/lags to visualize pre-treatment trends.

```python
# Two-way fixed effects
sm.OLS(y, sm.add_constant(df[["did", treatment, post]])).fit()
```

## Instrumental Variables

Valid instrument Z requires: (1) **Relevance** (Z correlates with X), (2) **Exclusion** (Z → Y only through X), (3) **Independence** (Z as-good-as random).

```python
# 2SLS
X_hat = sm.OLS(X_endog, sm.add_constant(np.column_stack([Z, X_exog]))).fit().fittedvalues
beta = sm.OLS(y, sm.add_constant(np.column_stack([X_hat, X_exog]))).fit().params[1]
```

**Weak instrument test**: F-statistic < 10 indicates weak instruments.

## Regression Discontinuity

Sharp RDD: treatment assigned 100% by cutoff. Fuzzy RDD: probability changes at cutoff (use IV).

```python
# Local polynomial regression around cutoff
df_rdd = df[abs(df[running_var] - cutoff) < bandwidth]
X = np.column_stack([df_rdd["treatment"], df_rdd["running_centered"]])
beta = LinearRegression().fit(X, df_rdd[outcome]).coef_[0]
```

Validations: McCrary density test (no manipulation), covariate balance around cutoff, placebo cutoffs, donut robustness.

## A/B Testing vs Causal Inference

| Aspect | A/B Test (RCT) | Observational CI |
|--------|---------------|------------------|
| Bias source | Implementation failure | Confounding, selection bias |
| Validity | High internal | Lower internal, higher external |
| Cost | High | Low |
| Best for | Product features, UX | Policy evaluation, historical data |

## Sensitivity Analysis

**E-value**: minimum confounder-outcome association needed to explain away observed effect. E-value = RR + √(RR × (RR - 1)). Observed RR=2.0 → E-value=3.41 (confounder needs RR > 3.41 with both treatment and outcome).

**Rosenbaum bounds**: test how much hidden bias (gamma) would nullify the result. Gamma=1 = no hidden bias.

**Placebo tests**: lead outcome (should be zero), untreated units (should be zero), random treatment (should be zero), different RDD cutoff (should be zero).
