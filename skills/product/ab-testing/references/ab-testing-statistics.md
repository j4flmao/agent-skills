# A/B Testing Statistics

## Hypothesis Testing

### Formulation
```
Null Hypothesis (H0): No difference between control and variant
Alternative Hypothesis (Ha): There is a difference

Two-tailed test: Ha ≠ H0
One-tailed test: Ha > H0 or Ha < H0
```

### Statistical Significance
- Significance level (α): typically 0.05
- Power (1-β): typically 0.80
- p-value: probability of observing result if H0 is true
- p < α: reject H0 (statistically significant)

## Sample Size Calculation

### Formula
```
n = (Zα/2 + Zβ)² × (p1(1-p1) + p2(1-p2)) / (p2 - p1)²

Where:
Zα/2 = critical value for α (1.96 for α=0.05)
Zβ = critical value for β (0.84 for β=0.20)
p1 = baseline conversion rate
p2 = minimum detectable effect
```

| Baseline Rate | MDE | Sample Size per Variant |
|---------------|-----|------------------------|
| 5% | 10% relative | 77,000 |
| 5% | 20% relative | 19,000 |
| 10% | 10% relative | 143,000 |
| 10% | 20% relative | 36,000 |
| 20% | 10% relative | 255,000 |

## Statistical Methods

### Frequentist Approach
- Most common in A/B testing
- Uses p-values and confidence intervals
- Requires pre-determined sample size
- Cannot stop early without correction

### Bayesian Approach
- Uses prior knowledge + observed data
- Outputs probability distribution of effect
- Can make decisions at any point
- More intuitive interpretation: "85% probability of improvement"

### Multi-Armed Bandit
- Dynamically allocates traffic to best-performing variant
- Reduces opportunity cost during testing
- Best for continuous optimization, not one-time tests

## Common Pitfalls

### Peeking Problem
- Checking results repeatedly inflates false positive rate
- Solution: use sequential testing or固定 duration
- Solution: Bonferroni correction for multiple checks

### Multiple Comparison
- Testing many variants increases chance of false positive
- Solution: Bonferroni correction, Benjamini-Hochberg procedure
- Solution: separate exploration vs. confirmation phases

### Simpson's Paradox
- Overall trend reverses when data is segmented
- Check results across all segments (device, geo, traffic source)
- Use stratified analysis for heterogeneous populations

## Result Interpretation

### Decision Framework
```
| Significant | Practical | Action |
|-------------|-----------|--------|
| Yes | Yes | Launch variant |
| Yes | No | Consider for further optimization |
| No | Yes | Run longer or increase sample |
| No | No | Stick with control |
```

### Confidence Intervals
- Prefer reporting confidence intervals over p-values
- 95% CI means: if experiment repeated 100 times, result would fall in range 95 times
- CI width indicates precision of estimate
- CI crossing zero means not statistically significant
