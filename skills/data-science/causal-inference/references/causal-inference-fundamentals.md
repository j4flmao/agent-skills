# Causal Inference Fundamentals

## Overview
Causal inference is the process of determining whether and to what extent a treatment, intervention, or exposure causes an outcome. Unlike associational statistics, causal inference explicitly models the data-generating process and addresses confounding, selection bias, and measurement error. This reference covers causal frameworks, identification strategies, estimation methods, and practical implementation patterns.

## Core Frameworks

### Potential Outcomes (Rubin Causal Model)
Each unit has two potential outcomes: Y(1) under treatment and Y(0) under control. The unit-level causal effect is Y(1) - Y(0), but only one is ever observed (fundamental problem of causal inference). Average Treatment Effect (ATE) = E[Y(1) - Y(0)], Average Treatment Effect on the Treated (ATT) = E[Y(1) - Y(0) | T=1], Conditional Average Treatment Effect (CATE) = E[Y(1) - Y(0) | X=x].

### Causal Graphs (Directed Acyclic Graphs)
DAGs encode causal assumptions as nodes (variables) and directed edges (causal relationships). A path is blocked by conditioning on a collider or not conditioning on a mediator. d-separation determines conditional independence. The backdoor criterion identifies adjustment sets that block all confounding paths. The front-door criterion uses a mediator to estimate the effect when confounders are unobserved.

### Structural Causal Model (SCM)
SCMs augment DAGs with functional assignments: each variable is a deterministic function of its parents plus exogenous noise. Interventions correspond to modifying these functions (do-operator). The do-calculus provides rules for converting do-expressions into conditional expectations, enabling identification from observational data.

## Identification Strategies

### Backdoor Adjustment
Identify all confounders Z (common causes of treatment and outcome) that satisfy the backdoor criterion. Condition on Z via stratification, matching, or regression: E[Y(1) - Y(0)] = E[E[Y | T=1, Z] - E[Y | T=0, Z]]. Valid only if: (1) no unmeasured confounders, (2) positivity (P(T | Z) > 0), (3) consistency (treatment assignment well-defined).

### Instrumental Variables
Use an instrument Z that satisfies: (1) relevance (Z causes T), (2) exclusion (Z affects Y only through T), (3) exchangeability (Z independent of unmeasured confounders). Two-stage least squares: T on Z (stage 1), Y on predicted T (stage 2). LATE (Local ATE) identifies the treatment effect for compliers — units who take treatment when encouraged and not otherwise.

### Difference-in-Differences
Compare change in outcome for treated group vs change in control group over time. Requires parallel trends assumption: in absence of treatment, the treated group would have followed the same trend as control. Use two-way fixed effects regression: Y = α + β₁×Post + β₂×Treated + β₃×Post×Treated + ε. β₃ estimates DiD effect. Event study plots check parallel pre-trends.

### Regression Discontinuity
Treatment assigned based on threshold in running variable. Compare outcomes just above vs just below cutoff, assuming continuity of potential outcomes at the threshold. Sharp RDD: treatment is deterministic at cutoff. Fuzzy RDD: probability of treatment changes discontinuously. Bandwidth selection via cross-validation or MSE-optimal methods. Local polynomial regression with triangular kernel.

### Propensity Score Methods
Propensity score e(x) = P(T=1 | X=x). Propensity score matching pairs treated and control units with similar scores. Inverse probability weighting reweights observations: IPTW = T/e(x) + (1-T)/(1-e(x)). Doubly robust methods combine outcome regression and propensity weighting — consistent if either model is correct. Assess overlap via propensity score distribution plots.

## Core Assumptions

| Assumption | Description | Testing |
|---|---|---|
| Exchangeability (Unconfoundedness) | No unmeasured confounders given covariates | Sensitivity analysis, placebo tests |
| Positivity (Overlap) | Every unit has non-zero probability of each treatment | Check propensity score distribution |
| Consistency | Treatment is well-defined and same for all units | Define treatment precisely |
| SUTVA | No interference, no hidden treatment variations | Unit-of-treatment analysis |
| Stable Unit Treatment Value Assumption | Units do not affect each other's outcomes | Cluster-robust SEs |

## Estimation Methods

### G-Computation (Standardization)
Fit outcome model E[Y | T, X], predict outcomes setting T=1 and T=0 for all units, average the difference. ATE = (1/n) × Σ(Ŷ(1) - Ŷ(0)). Works with any outcome model (linear, logistic, ML). Requires correct outcome specification. Variance via bootstrap or M-estimation.

### Augmented IPTW (AIPW)
Combines outcome regression and propensity score. Consistent if either model is correct (double robustness). Estimator: ATE = (1/n) × Σ[(T×Y)/e(X) - ((1-T)×Y)/(1-e(X))] + correction term. Cross-fitting reduces overfitting bias: split sample, fit models on one fold, predict on the other.

### Targeted Maximum Likelihood Estimation (TMLE)
Two-step estimator: (1) initial outcome model E[Y | T, X], (2) update the model using propensity score as a covariate in a logistic regression fluctuation step. Solves the efficient influence function equation. Asymptotically efficient, doubly robust, and respects bounds on Y. Best for studies with careful nuisance model estimation.

### Meta-Learners for CATE
S-learner: single model with treatment as feature. T-learner: separate models for treated and control. X-learner: (1) estimate response surfaces, (2) impute treatment effects for each arm, (3) weight by propensity score. Causal forest: generalized random forest partitioning on treatment effect heterogeneity.

## Sensitivity Analysis

### E-Value
Minimum strength of association (on risk ratio scale) an unmeasured confounder would need with both treatment and outcome to explain away the observed effect. E-value = RR + sqrt(RR × (RR - 1)). Large E-values mean robust findings. Report E-value for point estimate and confidence interval bound.

### Rosenbaum Sensitivity Bounds
For matched studies, assess how much hidden bias (Γ) would need to exist to alter conclusions. Γ = 1 means no hidden bias. Γ = 2 means a unit could be twice as likely to receive treatment due to unmeasured confounders. Report the Γ value at which p > 0.05.

### Placebo and Falsification Tests
Negative control outcomes (known not to be affected by treatment) test for residual confounding. Positive control exposures (known to cause outcome) test whether the study design can detect effects. Randomization inference provides exact p-values under sharp null.

## Causal Discovery

### Constraint-Based Methods
PC algorithm: start with fully connected graph, remove edges based on conditional independence tests (Fisher's Z, chi-square, partial correlation). FCI (Fast Causal Inference) handles latent confounders. Stable variants order-independent. For high dimensions, use GS (Grow-Shrink) or IAMB.

### Score-Based Methods
Greedy Equivalence Search (GES): search over equivalence classes, scoring each graph by BIC or BDeu. Exact search for small graphs (up to ~30 nodes). Continuous optimization (NOTEARS) solves min ||X - XW||² + λ||W||₁ s.t. DAG constraint. NOTEARS scales to hundreds of nodes but assumes linearity.

### Hybrid Methods
MMHC (Max-Min Hill Climbing): restrict search space using conditional independence tests, then score search over restricted space. CAM (Causal Additive Model) for nonlinear additive models. Apply domain knowledge as blacklist (forbidden edges) and whitelist (required edges) to constrain discovery.

## Software Tooling

| Library | Language | Focus | Features |
|---|---|---|---|
| DoWhy | Python | End-to-end causal inference | Graph specification, identification, estimation, refutation |
| EconML | Python | Heterogeneous treatment effects | CATE with forest, deep IV, DR-learners, S-learners |
| CausalNex | Python | DAG structure learning | Bayesian networks, NOTEARS, domain knowledge |
| CausalML | Python/Uber | Uplift modeling and ATE | Meta-learners, Uplift tree, causal forest |
| Zelig | R | General statistical inference | Multiple causal methods, simulation-based interpretation |
| DoubleML | Python/R | Double machine learning | PLR, PLIV, IRM with cross-fitting, nuisance ML |
| CausalImpact | R/Python | Bayesian structural time-series | Synthetic control for single treated unit |
| GeNIe | Windows GUI | Bayesian network learning | PC, GES, parameter learning, sensitivity analysis |

## Study Design Patterns

### Observational Study
Analysis of existing data without randomization. Requires careful confounding control. DAG specification before any estimation is critical. Pre-register analysis plan to prevent specification searching. Best for: when RCT is unethical or infeasible.

### Natural Experiment
Relies on exogenous variation from policy changes, weather, lotteries. DiD, RDD, and IV are natural experiment methods. Defend the identification strategy with placebo tests and robustness checks. Best for: policy evaluation, program impact analysis.

### A/B Test (RCT)
Gold standard with random assignment. Guarantees exchangeability. Still vulnerable to: attrition bias, spillover effects, non-compliance. Pragmatic RCTs in real-world settings trade some internal validity for generalizability.

## Best Practices

- Draw DAG before any analysis — it documents assumptions and identifies adjustment sets
- Pre-register analysis plan (Open Science Framework or AsPredicted)
- Report all specifications in a sensitivity table — don't cherry-pick
- Use multiple estimation methods — if consistent across methods, confidence increases
- Report ATE and heterogeneous effects — average effects can mask important variation
- Always assess overlap — trim if necessary (but document trimming)
- Conduct placebo tests on pre-treatment outcomes
- Use robust standard errors clustered at treatment assignment level
- Validate with negative control outcomes and positive controls
- Document every modeling decision and its rationale

## Common Pitfalls

### Conditioning on a Collider (Berkson's Paradox)
Including a collider (common effect of treatment and outcome) in the regression induces selection bias. Classic example: selecting on admission status creates spurious correlation between SAT and GPA. Solution: do not condition on colliders, check with DAG.

### Over-Adjustment Bias
Controlling for mediators on the causal pathway blocks part of the treatment effect. Including post-treatment variables affected by treatment creates bias. Solution: only adjust for pre-treatment confounders.

### Mismeasured Confounders
Partial adjustment for confounders can increase bias if the confounder is mismeasured and another variable is correlated with the true confounder. Multiple indicators or validation subsamples help. Sensitivity analysis is mandatory.

### Immortal Time Bias
Time period before treatment during which outcome cannot occur. If immortal time is misclassified as treated, it inflates the apparent benefit. Solution: treat immortal time correctly (as untreated) or use time-varying exposure models.

### Selection on Outcome (Truncation)
If analysis conditions on a post-treatment outcome stage (e.g., survivors only), it introduces collider bias. Use inverse probability of censoring weights or joint models.

## Performance Considerations

| Scale | Sample Size | Variables | Recommended Method | Memory |
|---|---|---|---|---|
| Small | <1K | <10 | Exact matching, Bayesian | Low |
| Medium | 1K-100K | 10-100 | Propensity matching, AIPW | Moderate |
| Large | 100K-10M | 100-1K | TMLE, Causal forest, X-learner | High |
| Ultra-large | >10M | <100 | Doubly robust with linear models | Distributed |

## Implementation Quick Reference

```python
# DoWhy: end-to-end causal inference
import dowhy
model = dowhy.CausalModel(
    data=df,
    treatment='treatment',
    outcome='outcome',
    graph='digraph {X -> Y; X -> T; T -> Y}'
)
identified = model.identify_effect(proceed_when_unidentifiable=False)
estimate = model.estimate_effect(identified, method_name='backdoor.propensity_score_matching')
refute = model.refute_estimate(identified, estimate, method_name='placebo_treatment_refuter')
```

```python
# EconML: CATE estimation with causal forest
from econml.grf import CausalForest
cf = CausalForest(n_estimators=100, min_samples_leaf=5, max_depth=20)
cf.fit(Y, T, X=X, W=W)  # X for heterogeneity, W for confounding
cate = cf.effect(X_test)
```

## Related Topics

- Data Science > Experimentation for A/B testing and randomized trials
- Data Science > Statistical Analysis for hypothesis testing fundamentals
- Data Engineering > Feature Engineering for constructing causal features
- Machine Learning > Model Interpretability for feature importance and SHAP values