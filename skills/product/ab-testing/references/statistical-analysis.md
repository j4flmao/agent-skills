# Statistical Analysis

## Statistical Framework

### Key Parameters
```
α (Significance Level): 0.05
  — Probability of false positive (Type I error)
  — Acceptable risk for most product experiments

β (Type II Error): 0.20
  — Probability of missing a real effect
  — Power = 1 - β = 0.80 (80%)

p-value: Probability of observing effect as extreme as
  measured, assuming null hypothesis is true.
  p < 0.05 → Reject null (statistically significant)
```

### Corrections
```
Bonferroni: α / k for k comparisons
  — Use when testing multiple variants vs control
  — Use when analyzing multiple primary metrics

Sequential Testing: Adjust boundaries for continuous monitoring
  — Use when peeking at results before experiment ends
  — Prevents inflated false positive rate
```

## Statistical Tests

### Two-Sample Z-Test (Conversion Rates)
```
z = (p2 - p1) / sqrt(p_pooled × (1 - p_pooled) × (1/n1 + 1/n2))
Where p_pooled = (conversions1 + conversions2) / (n1 + n2)
```

### Two-Sample T-Test (Continuous Metrics)
```
t = (mean1 - mean2) / sqrt(s1²/n1 + s2²/n2)
Where s = standard deviation, n = sample size
Use Welch's t-test (unequal variances assumption)
```

### Mann-Whitney U Test (Non-parametric)
Use when:
- Data is not normally distributed
- Metric is ordinal (ratings, scores)
- Sample sizes are small

## Analysis Template

### Results Output
```
Metric: Activation Rate
Control (n=10,000): 25.3%
Treatment (n=10,000): 28.1%
Lift: +2.8pp (+11.1%)
p-value: 0.003
95% CI: [0.9pp, 4.7pp]
Statistically significant: Yes ✓
```

### Segment Analysis
```
Segment        | Control | Treatment | Lift   | p-value
New users      | 22.1%   | 26.5%     | +4.4pp | 0.001
Returning users| 30.2%   | 30.8%     | +0.6pp | 0.520
Mobile         | 24.5%   | 27.2%     | +2.7pp | 0.020
Desktop        | 26.0%   | 29.0%     | +3.0pp | 0.032
```

## Decision Framework

### Criteria
```
Implement:
  p < α (0.05) AND
  Effect size > MDE AND
  No guardrail metrics degraded AND
  Business rationale supports change

Roll Back:
  Any guardrail metric degrades (p < 0.05)
  Effect is negative on primary metric (even if not significant)
  Implementation complexity outweighs benefit

Iterate:
  Results are inconclusive (high p-value, wide CI)
  Segments show opposite directional effects
  Effect size is smaller than MDE but directionally positive

Stop:
  Direction is negative with low probability of recovery
  Experiment has been running 2x planned duration
  Technical issues compromised the experiment
```

### Guardrail Metrics
```
Page load time: Must not increase >5%
Error rate: Must not increase
Support tickets: Must not increase significantly
Revenue: Must not decrease
Core feature usage: Must not decrease
```

## Reporting

### Experiment Summary
```
Title: Onboarding progress indicator
Hypothesis: Progress bar increases activation rate
Status: Concluded / Decision: Implement
Duration: 14 days (May 1-14)
Traffic: 20,000 users (10,000 per variant)

Primary Metric:
  Activation Rate: +2.8pp (p=0.003) ✓

Secondary Metrics:
  Time-to-activation: -15% (p=0.001) ✓
  Drop-off at step 3: -22% (p=0.002) ✓

Guardrail Metrics:
  Page load time: +0.1% (p=0.820) ✓
  Error rate: No change ✓

Learnings:
  - Effect is strongest for new users
  - Progress indicators reduce anxiety at longer steps
  - Consider running for enterprise segment separately
```
