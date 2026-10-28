# A/B Testing Fundamentals for Product Teams

An A/B test (online controlled experiment) randomly assigns users to variants and compares outcomes to estimate the causal effect of a change. This reference covers when to test, hypothesis and metric design, randomization, sample size, running and reading a test, and common mistakes. Statistical methods in depth: `ab-testing-statistics.md` and `statistical-methods.md`; platform setup: `ab-testing-infrastructure.md`.

## When to A/B Test

| Good fit | Poor fit |
|----------|----------|
| Change with uncertain impact on a measurable behavior | Bug fixes, legal requirements (just ship) |
| Enough traffic to detect a meaningful effect in weeks | Very low traffic (use qualitative research, longer-term metrics, or Bayesian approaches with caution) |
| Reversible changes | One-way doors that need other validation |
| Short-term measurable outcome | Effects that take months to appear (consider holdouts) |

## Anatomy of an Experiment

1. Hypothesis: "Showing delivery dates on product pages will increase checkout conversion because uncertainty about delivery causes drop-off."
2. Unit of randomization: usually user (logged-in ID or stable device ID); sometimes session, page view, or cluster (company, region).
3. Variants: control (A) and treatment (B), optionally more.
4. Metrics: one primary metric, guardrails, and diagnostics.
5. Sample size and duration computed before launch.
6. Decision rule written down before seeing results.

## Metrics

| Type | Purpose | Examples |
|------|---------|----------|
| Primary (decision) metric | The one metric the decision is based on | Conversion rate, revenue per user, retention day 7 |
| Guardrail metrics | Must not get worse | Page latency, error rate, unsubscribe rate, refunds |
| Diagnostic / secondary | Explain the result | Click-through on the new element, funnel steps |
| Sample ratio check | Data quality | Assignment counts vs expected split |

Good primary metrics are sensitive (move when the product improves), attributable to the change, and aligned with long-term value. Prefer per-user metrics (conversion per user) matching the randomization unit.

## Randomization

- Deterministic hashing: `bucket = hash(experiment_salt + user_id) mod 10000`; assignment is stable across sessions and independent across experiments with different salts.
- Assign at the moment the user would experience the difference (trigger point) and analyze triggered users to reduce noise, while keeping assignment logic identical for both groups.
- Log exposures (who actually saw which variant) separately from assignment.

## Sample Size

For a conversion metric with baseline rate p, minimum detectable effect (MDE) as an absolute difference d, significance alpha = 0.05 (two-sided) and power 80%, an approximate per-group sample size is:

```
n ≈ 2 x (1.96 + 0.84)^2 x p(1 - p) / d^2  ≈ 15.7 x p(1 - p) / d^2
```

Example: p = 0.05, d = 0.005 (5.0% to 5.5%, a 10% relative lift): n ≈ 15.7 x 0.0475 / 0.000025 ≈ 29,800 users per group.

```python
from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import proportion_effectsize

effect = proportion_effectsize(0.055, 0.05)
n_per_group = NormalIndPower().solve_power(effect_size=effect, alpha=0.05, power=0.8, alternative="two-sided")
```

Duration: at least the computed sample and at least one or two full weekly cycles to cover day-of-week effects. Decide MDE by business value: what is the smallest effect worth shipping?

## Running the Test

- Ramp gradually (e.g. 1% -> 10% -> 50%) to catch bugs, but analyze only the stable full-allocation period or account for ramp properly.
- Do not change variants, allocation or targeting mid-test.
- Check sample ratio mismatch (SRM) early: a chi-squared test on assignment counts; a significant mismatch indicates a bug, and results should not be trusted.
- Monitor guardrails for severe regressions and stop early for harm.

## Reading Results

- Report the effect size with a confidence interval, not only a p-value: "conversion +0.4 pp (95% CI +0.1 to +0.7 pp)".
- p < 0.05 means data this extreme would be unlikely if there were no effect; it does not give the probability that the treatment is better.
- A non-significant result means "not detected at this sample size", not "no effect"; look at the interval width.
- Check guardrails and segments for consistency, but treat segment findings as hypotheses (multiple comparisons).

## Decision Framework

| Primary metric | Guardrails | Decision |
|----------------|------------|----------|
| Significant positive | Neutral | Ship |
| Significant positive | Significant negative | Discuss trade-off; often iterate |
| Not significant, narrow CI around zero | Neutral | Ship only if there is another reason (simplicity, strategy) |
| Not significant, wide CI | Neutral | Inconclusive; more traffic or a bolder change |
| Significant negative | Any | Do not ship; learn |

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Peeking and stopping at first significance | Inflated false positives | Fixed horizon, or sequential methods designed for peeking |
| Many metrics, no primary | Cherry-picking | Pre-register primary metric |
| Randomizing by page view but measuring per user | Wrong variance, contamination | Match analysis unit to randomization unit |
| Ignoring SRM | Biased results | Automated SRM checks |
| Novelty/primacy effects | Short-term spikes or dips | Run long enough; look at effect over time |
| Interference between users (marketplaces, social) | Biased estimates | Cluster or switchback designs |

## Checklist

- [ ] Written hypothesis, primary metric, guardrails, decision rule
- [ ] Randomization unit chosen and assignment deterministic
- [ ] Sample size and duration computed from MDE
- [ ] Exposure logging and SRM check in place
- [ ] No mid-test changes; no unplanned peeking
- [ ] Results reported with confidence intervals and documented
