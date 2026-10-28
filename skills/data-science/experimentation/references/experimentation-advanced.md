# Advanced Experimentation: Interference, Heterogeneous Effects, Long-Term Impact, and Adaptive Designs

Designs and analyses for situations where a standard user-randomized A/B test gives biased or incomplete answers: network and marketplace interference, switchback and cluster designs, heterogeneous treatment effects, long-term effects, ranking experiments with interleaving, and bandits. Core statistics (sequential testing, CUPED, multiple testing, delta method) are in `statistical-methods.md`; basic design in `experiment-design.md`.

## When Standard A/B Tests Break

A/B tests assume SUTVA: one unit's outcome depends only on its own assignment. Violations:

| Setting | Interference mechanism | Consequence |
|---------|-----------------------|-------------|
| Two-sided marketplaces (rides, delivery, ads auctions) | Treatment and control compete for the same supply/inventory | Effects overstated or sign-flipped |
| Social networks, messaging | Treated users affect friends' behaviour | Spillovers bias the estimate (often toward zero) |
| Shared caches, pricing, ranking with budgets | Shared resources | Contamination |
| Learning systems (ML models retraining on experiment data) | Feedback loops | Control learns from treatment |

## Cluster-Randomized Experiments

Randomize groups that contain most interactions (cities, communities from graph clustering, stores, schools).

- Analyze at the cluster level or with cluster-robust standard errors; the effective sample size is closer to the number of clusters than users.
- Fewer, larger clusters reduce interference but increase variance; balance with stratification on pre-period metrics.
- Graph cluster randomization uses community detection to keep most edges within clusters.

```python
import statsmodels.formula.api as smf

model = smf.ols("metric ~ treatment + pre_metric", data=user_df).fit(
    cov_type="cluster", cov_kwds={"groups": user_df["cluster_id"]}
)
print(model.summary().tables[1])
```

## Switchback (Time-Split) Experiments

For marketplace-level interventions (dispatch algorithms, pricing), alternate treatment and control over time windows within a region.

```
Region A: [T][C][C][T][T][C][T][C] ...   (randomized per window, e.g. 30–60 minutes)
Region B: [C][T][T][C][C][T][C][T] ...
```

- Window length must exceed the carryover time of effects (e.g. drivers repositioning); discard or model "burn-in" periods after switches.
- Randomize the schedule (not strict alternation) to avoid confounding with time-of-day patterns, and stratify by hour/day.
- Analyze with region × time fixed effects; use randomization inference or cluster-robust errors at the window level.

## Marketplace-Specific Designs

| Design | Idea |
|--------|------|
| Budget-split / supply-split | Partition supply (e.g. ad budgets, inventory) between arms so they do not compete |
| Two-sided randomization | Randomize both buyers and sellers to estimate spillovers |
| Geo experiments | Randomize regions (markets) for marketing or pricing; use synthetic control or time-based regression for analysis |

Geo experiments with few units often rely on synthetic control or Bayesian structural time series methods; pre-register the analysis and check pre-period fit.

## Heterogeneous Treatment Effects (HTE)

Average effects can hide subgroups with opposite responses.

| Method | Use |
|--------|-----|
| Pre-registered segment analysis | A few hypothesized segments (new vs returning, platform) |
| Interaction regression | `metric ~ treatment * segment` with multiple-testing correction |
| Causal forests / generalized random forests | Data-driven discovery of effect heterogeneity |
| Meta-learners (T-, S-, X-, DR-learners) | Estimate conditional average treatment effects (CATE) with ML models |

```python
from econml.dml import CausalForestDML
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier

est = CausalForestDML(model_y=GradientBoostingRegressor(), model_t=GradientBoostingClassifier(),
                      discrete_treatment=True, n_estimators=500, random_state=0)
est.fit(Y=df["metric"], T=df["treatment"], X=df[["tenure", "sessions_pre", "platform_ios"]])
cate = est.effect(df[["tenure", "sessions_pre", "platform_ios"]])
```

Treat discovered segments as hypotheses; confirm in a follow-up experiment before targeting them. Avoid post-hoc slicing until something is significant.

## Long-Term Effects

Short tests miss novelty/primacy effects and long-run outcomes (retention, LTV).

| Technique | How |
|-----------|-----|
| Long-running holdouts | Keep a small percentage of users without a feature (or a bundle of features) for months |
| Novelty detection | Plot treatment effect by days since first exposure; decaying effects indicate novelty |
| Surrogate metrics / surrogate index | Predict long-term outcomes from short-term metrics validated on historical experiments |
| Cohort-based analysis | Compare users first exposed at different times to separate learning effects |

Holdouts have costs (users miss improvements) and must be protected from leakage (other features targeting holdout users).

## Ranking Experiments: Interleaving

For search and recommendation rankers, interleaving shows each user a merged list from rankers A and B and attributes clicks to the source ranker (team-draft or balanced interleaving).

- Much more sensitive than A/B tests for detecting ranking preference, so it is used to screen many candidates.
- Measures preference, not business impact; confirm winners with an A/B test on business metrics.

## Multi-Armed Bandits and Adaptive Allocation

| Approach | Use | Caveat |
|----------|-----|-------|
| Epsilon-greedy / Thompson sampling | Optimize short-lived choices (headlines, promotions) to reduce regret | Biased effect estimates; harder inference |
| Contextual bandits | Personalize choices by context | Needs logging of propensities for off-policy evaluation |
| Adaptive experiments with valid inference | Allocate more traffic to promising arms while preserving inference (e.g. with inverse propensity weighting) | Complex; requires careful design |

Use bandits when the goal is optimization during the test, A/B tests when the goal is learning an unbiased effect for a long-term decision. Always log assignment probabilities.

## Off-Policy Evaluation

Estimate how a new policy would perform using logged data from an old randomized policy:

- Inverse propensity scoring (IPS), self-normalized IPS, doubly robust estimators.
- Requires logged propensities and overlap (the new policy only chooses actions the old policy sometimes chose).

## Guardrails for Advanced Designs

- Pre-register unit of randomization, primary metric, analysis method, and decision rule.
- Run A/A tests or simulations with the exact design (clusters, switchback schedule) to check false positive rates and power.
- Check sample ratio mismatch at the randomization unit level.
- Document known interference and residual bias in the readout.

## Pitfalls

- User-level randomization for marketplace algorithm changes.
- Switchback windows shorter than carryover effects.
- Shipping to "the segment that won" from unplanned slicing.
- Running bandits and then reporting their estimates as unbiased effects.
- Holdouts quietly eroded by other launches.

## Checklist

- [ ] Interference assessed before choosing the randomization unit
- [ ] Cluster/switchback/geo designs analyzed with appropriate errors and fixed effects
- [ ] Design validated with A/A tests or simulation
- [ ] HTE analyses pre-registered or confirmed in follow-ups
- [ ] Long-term effects tracked via holdouts or validated surrogates
- [ ] Interleaving used for ranker screening, A/B for impact
- [ ] Propensities logged for bandits and off-policy evaluation
