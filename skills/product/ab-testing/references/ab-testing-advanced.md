# Advanced Experimentation: Variance Reduction, Sequential Testing, Interference, Holdouts and Program Scale

Techniques used by mature experimentation programs: CUPED variance reduction, ratio metrics and the delta method, sequential and always-valid inference, multiple testing control, network and marketplace interference designs, long-term holdouts, heterogeneous effects, and governance of an experimentation platform.

## Variance Reduction with CUPED

CUPED (Controlled-experiment Using Pre-Experiment Data) adjusts each user's metric using a pre-experiment covariate correlated with it:

```
Y_adj = Y - theta x (X - mean(X)),   theta = cov(X, Y) / var(X)
```

where X is the same metric measured before the experiment (e.g. prior-period purchases). Variance shrinks by roughly a factor of (1 - rho^2), where rho is the correlation between X and Y, so the same precision needs fewer users.

```python
import numpy as np

def cuped(y: np.ndarray, x: np.ndarray) -> np.ndarray:
    theta = np.cov(x, y, ddof=1)[0, 1] / np.var(x, ddof=1)
    return y - theta * (x - x.mean())
```

Compute theta on pooled data across variants. New users without history get X imputed (e.g. 0 with an indicator), or use regression adjustment with several covariates (CUPAC uses ML predictions as the covariate).

## Ratio Metrics and the Delta Method

Metrics like click-through rate per page view (clicks / views) when randomizing by user are ratios of per-user sums; the per-page-view observations are not independent. Use the delta method or bootstrap at the user level for variance:

```
R = mean(C) / mean(V)
Var(R) ≈ (1/n) x [ var(C)/mean(V)^2 - 2 x mean(C) x cov(C,V)/mean(V)^3 + mean(C)^2 x var(V)/mean(V)^4 ]
```

Naive variance treating page views as independent underestimates uncertainty and inflates false positives.

## Sequential Testing

Repeatedly checking a fixed-horizon test inflates false positives. Options that allow monitoring:

| Method | Notes |
|--------|-------|
| Group sequential designs (O'Brien-Fleming, Pocock alpha spending) | Pre-planned interim looks; strict early, lenient late |
| Always-valid inference (mixture sequential probability ratio tests, confidence sequences) | Continuous monitoring; wider intervals than fixed-horizon at the same sample |
| Bayesian with decision thresholds | Interpretable posteriors; still needs calibration of stopping rules for error control |

Many commercial and open-source platforms (e.g. GrowthBook, Statsig, Eppo, Optimizely) offer sequential options; know which one your platform uses and what guarantees it provides.

## Multiple Testing

| Situation | Control |
|-----------|---------|
| Several variants vs control | Bonferroni/Holm on comparisons, or Dunnett's test |
| Many secondary metrics | Benjamini-Hochberg false discovery rate; treat as exploratory |
| Many segments | Pre-register key segments; others hypothesis-generating |
| Many experiments in a program | Expect some false positives; replicate important wins |

Keep a single pre-registered primary metric to avoid the problem for the decision itself.

## Interference and Alternative Designs

When one user's treatment affects others (SUTVA violation), standard user-level tests are biased.

| Setting | Problem | Design |
|---------|---------|--------|
| Two-sided marketplaces (riders/drivers, buyers/sellers) | Treatment changes shared supply | Switchback (randomize time windows x regions), cluster randomization by market |
| Social networks | Effects spill over through connections | Graph cluster randomization, ego-network designs |
| Pricing and inventory | Shared budgets/stock | Budget-split designs, geo experiments |
| Ads/auctions | Competition within the auction | Budget-split or counterfactual logging |

Geo experiments (randomizing regions, analyzed with synthetic control or difference-in-differences) measure effects of marketing or offline changes when user-level randomization is impossible.

## Long-Term Effects and Holdouts

- Short-term metrics may not predict long-term value (novelty, learning effects, cannibalization).
- Long-term holdout: keep a small percentage of users out of all launched features for a quarter or more, and measure cumulative impact.
- Surrogate metrics: validated short-term proxies that predict long-term outcomes.
- Monitor effects over time within a test (effect vs days since exposure).

## Heterogeneous Treatment Effects

- Pre-specified segments (new vs returning, platform, country) for decision-relevant differences.
- ML methods (causal forests, meta-learners such as T-/X-learners) to discover heterogeneity; validate on held-out experiments before targeting.
- Beware Simpson's paradox when allocation varies across segments over time.

## Trustworthiness Checks

| Check | Purpose |
|-------|---------|
| Sample ratio mismatch test | Assignment/logging bugs |
| A/A tests | Validate platform false-positive rate |
| Pre-period balance | Randomization sanity on covariates |
| Exposure vs assignment consistency | Triggering bugs |
| Metric definition tests | Pipeline regressions |
| Carryover from previous experiments | Re-salt or shuffle buckets between experiments |

## Experimentation Platform Practices

- Central assignment service with deterministic hashing and mutually exclusive layers when experiments could interact.
- Metric catalog with owners, definitions in code, and version history.
- Automated analysis with CUPED, SRM checks, guardrails and sequential monitoring.
- Experiment registry: hypothesis, design, results and decision for organizational learning.
- Review process for experiment design (power, metrics) before launch.
- Ethics and privacy review for experiments affecting pricing, vulnerable users, or sensitive data.

## Checklist

- [ ] CUPED or regression adjustment applied where pre-period data exists
- [ ] Delta method or user-level bootstrap for ratio metrics
- [ ] Sequential method chosen if results will be monitored continuously
- [ ] Multiple-comparison control for variants, metrics and segments
- [ ] Interference assessed; switchback/cluster/geo designs where needed
- [ ] Long-term holdouts or surrogates for strategic decisions
- [ ] SRM, A/A and balance checks automated
- [ ] Results and decisions recorded in a searchable registry
