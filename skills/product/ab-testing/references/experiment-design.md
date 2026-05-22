# Experiment Design

## Hypothesis Template

```
If [change], then [metrics will change by effect],
because [theoretical mechanism].

Null Hypothesis (H0): Change has no effect on primary metric.
Alternative Hypothesis (H1): Change has effect on primary metric.
```

### Example
```
If we add a progress indicator to the onboarding flow,
then activation rate will increase by 15%,
because users will understand how much is left and stay motivated.

H0: Progress indicator has no effect on activation rate.
H1: Progress indicator increases activation rate.
```

## Variant Definition

### Control
Current experience — the baseline to compare against.

### Treatment(s)
The changed experience — one or more variants being tested.

### Rules
```
One primary difference between control and treatment
Minimize secondary differences that could bias results
Each user assigned consistently to same variant
Use client-side or server-side assignment
```

## Sample Size Calculation

### Parameters
```
α (significance level): 0.05 (5% risk of false positive)
β (Type II error): 0.20 (20% risk of false negative)
Power (1 - β): 0.80 (80% chance to detect effect)
MDE (Minimum Detectable Effect): The smallest effect worth detecting
Baseline conversion rate: Current metric value
```

### Formula
```
n = (Z_α/2 + Z_β)² × (p1(1-p1) + p2(1-p2)) / (p2 - p1)²

Where:
  n = sample size per variant
  Z_α/2 = 1.96 (for α = 0.05)
  Z_β = 0.84 (for β = 0.20)
  p1 = baseline conversion rate
  p2 = baseline + MDE
```

### Sample Size Table (α=0.05, β=0.20)
```
Baseline | MDE 5%  | MDE 10% | MDE 20%
   1%    | 12,545  |  3,137  |    784
   5%    | 58,338  | 14,584  |  3,646
  10%    | 110,292 | 27,573  |  6,893
  20%    | 196,140 | 49,035  | 12,259
  50%    | 326,436 | 81,609  | 20,402
```

## Experiment Duration

### Minimum Duration Rules
```
At least 1 full business cycle (week minimum)
At least 7 days to capture day-of-week effects
Longer if sample size requires more traffic
No shorter than the slowest conversion step
Include weekends in test window
```

### Duration Calculator
```
Required days = required sample / (daily visitors × fraction in experiment)
Minimum = max(calculated days, 7 days, 1 full business cycle)
```

## AA Test Protocol

### Setup
```
Split traffic 50/50 between two identical control variants
Run for same duration as planned experiment
Both variants show the current experience
```

### Validation Criteria
```
No statistically significant difference on primary metric
p-value > 0.05
Distribution of p-values is uniform (over repeated AA tests)
Confidence interval includes zero
```

### Check
```
Re-randomize if AA test fails (indicates system bias)
Verify randomization algorithm is sound
Debug sample ratio mismatch (SRM)
```

## Randomization

### Unit of Randomization
```
User (default): For changes to user-facing features
Session: For changes to session-level flows
Page view: For changes to landing pages
Account: For B2B multi-user products
```

### Assignment
```javascript
// Consistent user assignment
const variant = hash(userId) % 2 === 0 ? 'control' : 'treatment';
```
