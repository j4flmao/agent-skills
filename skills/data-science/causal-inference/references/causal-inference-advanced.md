# Causal Inference: Advanced Topics

Methods for settings where the textbook assumptions break: staggered treatment adoption, few treated units, time-varying treatments and confounders, mediation, interference between units, sensitivity to unobserved confounding, learning treatment policies, and transporting results to new populations. Basics are in `causal-inference-fundamentals.md`; quasi-experimental designs in `quasi-experimental.md`; CATE estimation in `causal-ml.md`.

## Staggered Difference-in-Differences

With units treated at different times and heterogeneous effects, the classic two-way fixed effects (TWFE) regression `y ~ treated_post + unit FE + time FE` can be badly biased: already-treated units act as controls, producing "forbidden comparisons" and even sign reversals (Goodman-Bacon decomposition shows the weights).

| Estimator | Idea | Software |
|-----------|------|----------|
| Callaway & Sant'Anna (2021) | Group-time ATTs using never-treated or not-yet-treated controls, then aggregate | R `did`; Python `differences`, `csdid` ports |
| Sun & Abraham (2021) | Interaction-weighted event-study estimator | R `fixest::sunab` |
| de Chaisemartin & D'Haultfoeuille | Robust to heterogeneous and dynamic effects, also non-binary treatments | R/Stata `did_multiplegt_dyn` |
| Borusyak, Jaravel & Spiess | Imputation: fit untreated outcome model, impute counterfactuals | R `didimputation`, Stata `did_imputation` |

```r
library(did)
out <- att_gt(yname = "revenue", tname = "week", idname = "store_id",
              gname = "first_treated_week", data = panel,
              control_group = "notyettreated", est_method = "dr")
es <- aggte(out, type = "dynamic", min_e = -8, max_e = 12)
ggdid(es)
```

Checks: pre-trend estimates near zero (but passing pre-trend tests is not proof; consider HonestDiD sensitivity bounds for parallel-trend violations), no anticipation, cluster standard errors at the treatment assignment level.

## Few Treated Units: Synthetic Control and Synthetic DiD

- **Synthetic control**: weighted combination of donor units that matches the treated unit's pre-period outcomes; effect = post-period gap. Inference by placebo-in-space (permuting the treated unit) and placebo-in-time.
- **Synthetic DiD** (Arkhangelsky et al.): combines unit weights (like synthetic control) with time weights and DiD-style fixed effects; often more robust. R `synthdid`.
- **Augmented synthetic control** adds outcome-model bias correction when pre-period fit is imperfect.
- Requirements: long pre-period, donors unaffected by treatment (no spillovers), good pre-treatment fit.

## Time-Varying Treatments and Confounders

When treatment at time `t` affects later confounders that also affect later treatment (e.g. dosage adjusted based on health status), regression adjustment for those confounders blocks part of the effect and introduces bias. Use g-methods:

| Method | Approach |
|--------|----------|
| Marginal structural models with IPTW | Weight each unit by the inverse probability of its observed treatment history; fit a weighted outcome model |
| Parametric g-formula | Simulate outcomes under treatment strategies by modelling confounders and outcomes sequentially |
| Longitudinal TMLE | Doubly robust, targeted estimation for sequential treatments (R `ltmle`, `lmtp`) |

Stabilize and truncate weights; inspect weight distributions; positivity violations (some histories almost never treated) make estimates unstable.

## Mediation Analysis

Decompose a total effect into a **natural direct effect** and a **natural indirect effect** through a mediator `M`.

- Identification requires no unmeasured confounding of treatment-outcome, treatment-mediator and mediator-outcome relationships, and no mediator-outcome confounder affected by treatment (cross-world assumption).
- The product-of-coefficients approach (Baron & Kenny) is valid only under linear models without interactions; use counterfactual-based estimators (R `mediation`, `CMAverse`, `medoutcon`).
- Sensitivity analysis for mediator-outcome confounding is essential; mediation claims are fragile.

## Interference and Spillovers

SUTVA assumes one unit's treatment does not affect another's outcome. Violations are common in marketplaces, social networks, and shared resources.

| Setting | Design / estimator |
|---------|--------------------|
| Clustered interference (households, schools) | Randomize at cluster level; estimate direct and spillover effects with two-stage randomization |
| Networks | Graph cluster randomization; exposure mapping (fraction of treated neighbours) |
| Two-sided marketplaces | Switchback experiments (randomize time blocks), market-level randomization, budget-split designs |

In marketplaces, user-level A/B tests can be biased by competition for shared supply; compare with switchback results.

## Sensitivity to Unobserved Confounding

- **Omitted variable bias framework** (Cinelli & Hazlett): report robustness value (how strong a confounder must be, in partial R², to explain away the effect), benchmarked against observed covariates. R/Python `sensemakr`.
- **E-value**: minimum risk-ratio association a confounder needs with both treatment and outcome to explain away an estimate.
- **Rosenbaum bounds** for matched designs.
- Partial identification (Manski bounds) when assumptions are too strong: report ranges instead of points.

```python
from sensemakr import Sensemakr
import statsmodels.formula.api as smf

model = smf.ols("earnings ~ training + age + educ + prior_earnings", data=df).fit()
sens = Sensemakr(model=model, treatment="training", benchmark_covariates=["prior_earnings"], kd=[1, 2, 3])
print(sens.summary())
```

## Policy Learning

Move from "what is the effect?" to "whom should we treat?":
- Estimate CATE with doubly robust scores (AIPW), then learn a policy (e.g. a depth-limited tree) maximizing estimated welfare (R `policytree`; EconML `DRPolicyTree`, `DRPolicyForest`).
- Evaluate policies off-policy with doubly robust value estimates on held-out data, then validate with an experiment.
- Include costs and constraints (budget, fairness) in the objective.

## Transportability and External Validity

- Effects from one population (an experiment in one country) may not transfer. Reweight to the target population on effect modifiers (inverse odds of sampling weights), or model CATE and average over the target covariate distribution.
- Requires overlap in effect modifiers and that all important effect modifiers are measured.
- Selection diagrams (Pearl & Bareinboim) formalize which effects transport.

## Bayesian Approaches

- Bayesian structural time series (CausalImpact) for single time series interventions with synthetic controls from covariate series; sensitive to model specification and covariates affected by the intervention.
- Bayesian hierarchical models for heterogeneous effects across many sites with partial pooling.
- Bayesian Additive Regression Trees (BART) for flexible outcome modelling with uncertainty (R `bartCause`).

## Reporting Standards

- State the estimand (ATE, ATT, CATE, natural indirect effect) and population.
- Show the identification assumptions and the DAG or design that supports them.
- Report diagnostics (balance, overlap, pre-trends, weight distributions), sensitivity analyses, and robustness to alternative estimators.
- Pre-register analysis plans for high-stakes decisions where possible.

## Checklist

- [ ] Staggered adoption analysed with heterogeneity-robust DiD estimators, not plain TWFE
- [ ] Synthetic control/SDiD for few treated units, with placebo inference
- [ ] G-methods for time-varying confounding
- [ ] Mediation claims backed by counterfactual estimators and sensitivity analysis
- [ ] Interference considered; design adjusted (cluster, switchback)
- [ ] Sensitivity to unobserved confounding reported (robustness value / E-value)
- [ ] Policies evaluated off-policy and validated experimentally
- [ ] Estimand, assumptions and diagnostics documented
