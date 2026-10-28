# Statistical Learning Theory: Concentration Inequalities and Generalization Bounds

The probability tools that explain why models generalize and how much data an evaluation needs: concentration inequalities, uniform convergence over hypothesis classes (finite classes, VC dimension, Rademacher complexity), bias-variance, and their practical use in sizing test sets and avoiding overfitting to evaluation data.

## Setup and Notation

- Data `(x, y) ~ D`, i.i.d. sample `S` of size n.
- Hypothesis `h ∈ H`, loss `ℓ(h(x), y) ∈ [0, 1]` (e.g. 0-1 loss).
- True risk `R(h) = E_D[ℓ]`, empirical risk `R̂_S(h) = (1/n) Σ ℓ(h(xᵢ), yᵢ)`.
- Generalization gap `R(h) − R̂_S(h)`.

## Concentration Inequalities

| Inequality | Assumptions | Statement |
|---|---|---|
| Markov | X ≥ 0 | P(X ≥ a) ≤ E[X] / a |
| Chebyshev | finite variance σ² | P(\|X − μ\| ≥ t) ≤ σ² / t² |
| Hoeffding | i.i.d., Xᵢ ∈ [a, b] | P(\|X̄ − μ\| ≥ t) ≤ 2 exp(−2 n t² / (b − a)²) |
| Bernstein | i.i.d., bounded, variance σ² | Tighter than Hoeffding when σ² is small (e.g. very low error rates) |
| McDiarmid | Function of independent variables with bounded differences cᵢ | P(f − E f ≥ t) ≤ exp(−2 t² / Σ cᵢ²) |

Hoeffding gives exponentially small deviation probability in n; Chebyshev only polynomial.

## Sizing a Test Set (Hoeffding)

For a fixed model evaluated on n fresh i.i.d. examples with 0-1 loss, with probability ≥ 1 − δ:

```
|R(h) − R̂(h)| ≤ sqrt( ln(2/δ) / (2n) )      ⇔      n ≥ ln(2/δ) / (2 ε²)
```

| ε (accuracy margin) | δ | n required |
|---|---|---|
| 0.05 | 0.05 | 738 |
| 0.02 | 0.05 | 4,612 |
| 0.01 | 0.05 | 18,445 |

```python
import math

def hoeffding_n(eps: float, delta: float) -> int:
    return math.ceil(math.log(2 / delta) / (2 * eps ** 2))
```

Hoeffding is distribution-free and conservative; for reporting a specific accuracy, binomial intervals (Wilson, Clopper-Pearson) or the bootstrap are tighter.

## Multiple Comparisons on the Test Set

Evaluating k models (or k prompt variants) on the same test set and picking the best breaks the fixed-model assumption. A union bound gives, with probability ≥ 1 − δ, simultaneously for all k:

```
|R(hⱼ) − R̂(hⱼ)| ≤ sqrt( ln(2k/δ) / (2n) )
```

The margin grows only with ln k, but repeated adaptive reuse of a test set (choosing what to try next based on test results) is worse than this bound accounts for. Practice: tune on validation, touch the test set rarely, keep a final holdout.

## Uniform Convergence for Finite Classes

Training picks h after seeing S, so we need the bound to hold for all h ∈ H at once. For finite H, union bound + Hoeffding:

```
with probability ≥ 1 − δ, for all h ∈ H:  R(h) ≤ R̂(h) + sqrt( (ln|H| + ln(2/δ)) / (2n) )
```

Interpretation: complexity enters as ln|H| (bits needed to describe a hypothesis). This is the simplest form of an Occam/PAC bound.

## PAC Learning

A class H is PAC-learnable if, for any ε, δ, there is m(ε, δ) such that with n ≥ m samples an algorithm returns h with R(h) ≤ min R + ε with probability ≥ 1 − δ. In the realizable finite case (some h has zero risk), ERM needs

```
n ≥ (1/ε) (ln|H| + ln(1/δ))
```

— note 1/ε rather than 1/ε²: learning with zero training error is statistically easier.

## VC Dimension

For infinite classes, the VC dimension d is the largest number of points H can shatter (label in all 2^d ways).

| Class | VC dimension |
|---|---|
| Thresholds on ℝ | 1 |
| Intervals on ℝ | 2 |
| Linear classifiers (with bias) in ℝ^p | p + 1 |
| Axis-aligned rectangles in ℝ² | 4 |

Generic bound (constants omitted): with probability ≥ 1 − δ,

```
R(h) ≤ R̂(h) + O( sqrt( (d · ln(n/d) + ln(1/δ)) / n ) )
```

Finite VC dimension ⇔ PAC learnability for binary classification (fundamental theorem of statistical learning).

## Rademacher Complexity

Data-dependent complexity: how well the loss class G = {ℓ ∘ h} correlates with random signs σᵢ ∈ {−1, +1}:

```
ℜ_n(G) = E_{S,σ} [ sup_{g∈G} (1/n) Σ σᵢ g(zᵢ) ]
```

For losses in [0, 1], with probability ≥ 1 − δ, for all h:

```
R(h) ≤ R̂(h) + 2 ℜ_n(G) + sqrt( ln(1/δ) / (2n) )
```

Norm-constrained linear models have Rademacher complexity scaling like B·R/√n (weight norm bound B, input norm bound R), independent of dimension — one reason margin and weight-norm regularization help.

## Bias-Variance Decomposition (Squared Loss)

For y = f(x) + noise with variance σ², and estimator f̂ trained on random samples:

```
E[(y − f̂(x))²] = σ²  +  (E[f̂(x)] − f(x))²  +  Var[f̂(x)]
                 noise      bias²                  variance
```

Classical picture: complexity trades bias for variance. Modern over-parameterized models can show "double descent" (test error falling again beyond the interpolation threshold); classical uniform-convergence bounds are often vacuous for deep networks, which is why empirical validation remains the primary tool.

## Practical Takeaways

| Situation | Implication |
|---|---|
| Comparing two models on a small test set | Gap may be noise; compute intervals or a paired test (McNemar for classifiers) |
| Many prompt/model variants | Correct for multiplicity; use a fresh holdout for the final claim |
| Rare-event metrics (fraud recall at low rates) | Effective sample size is the number of positives, not n |
| Model selection | Validation set or cross-validation; regularization reduces effective complexity |
| Distribution shift | i.i.d. assumption broken; bounds do not transfer; evaluate on target-distribution data |

## Checklist
- [ ] Test-set size justified (Hoeffding/binomial) for the claimed precision
- [ ] Intervals reported, not just point estimates
- [ ] Multiple comparisons accounted for; final holdout kept untouched
- [ ] Effective sample size considered for rare classes
- [ ] i.i.d. assumption checked against deployment distribution
