# Causal Inference Frameworks Reference

## Potential Outcomes (Rubin Causal Model)

### Core Framework
```
For each unit i, there are two potential outcomes:
  Y_i(1): outcome if treated
  Y_i(0): outcome if control

Causal effect for unit i: τ_i = Y_i(1) - Y_i(0)
Problem: we only observe one potential outcome per unit.

Average Treatment Effect (ATE): τ = E[Y(1) - Y(0)]
Average Treatment Effect on Treated (ATT): τ|T=1 = E[Y(1) - Y(0) | T=1]
Conditional Average Treatment Effect (CATE): τ(x) = E[Y(1) - Y(0) | X=x]
```

### Identification Assumptions
```
1. SUTVA (Stable Unit Treatment Value Assumption):
   - No interference: unit i's outcome unaffected by other units' treatment
   - Consistency: observed outcome = Y_i(T_i) (no hidden variations of treatment)

2. Unconfoundedness (Ignorability):
   Y(1), Y(0) ⟂ T | X
   Treatment assignment is independent of potential outcomes given covariates

3. Positivity (Overlap):
   0 < P(T=1 | X=x) < 1 for all x
   Every unit has non-zero probability of being in either treatment group

4. No measurement error in treatment, outcome, or confounders
```

```python
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

def check_positivity(X, t, threshold=0.01):
    """Check positivity/overlap assumption."""
    ps_model = LogisticRegression(max_iter=1000)
    ps_model.fit(X, t)
    ps = ps_model.predict_proba(X)[:, 1]
    return {
        "min_propensity": np.min(ps),
        "max_propensity": np.max(ps),
        "violation": np.any((ps < threshold) | (ps > 1 - threshold))
    }
```

### Estimators
```python
# Difference-in-means (unbiased if randomized)
def diff_in_means(y, t):
    return np.mean(y[t == 1]) - np.mean(y[t == 0])

# Inverse Probability Weighting (IPW)
def ipw_ate(y, t, X):
    ps_model = LogisticRegression(max_iter=1000)
    ps_model.fit(X, t)
    ps = ps_model.predict_proba(X)[:, 1]
    weights = t / ps + (1 - t) / (1 - ps)
    return np.sum(t * y / ps) / np.sum(t / ps) - np.sum((1 - t) * y / (1 - ps)) / np.sum((1 - t) / (1 - ps))

# Augmented IPW (Doubly Robust)
# Consistent if either propensity model OR outcome model is correct
```

## Directed Acyclic Graphs (Pearl's Framework)

### Graph Terminology
```
Nodes: variables (observed or unobserved)
Edges: directed causal relationships (X → Y means X causes Y)
Paths: any sequence of connected edges (direction not important)
Directed paths: all edges point in same direction (causal paths)
Backdoor paths: non-causal paths from treatment to outcome (confounding)

d-separation: all paths between X and Y are blocked by conditioning on Z
```

### DAG Construction Rules
```
1. Draw arrows from cause to effect based on domain knowledge
2. Include all common causes (confounders) of any two variables
3. Include treatment and outcome
4. Can include unobserved (latent) confounders as nodes
5. Cycles not allowed (hence "acyclic")
```

```python
import networkx as nx

# Build causal DAG
G = nx.DiGraph()
G.add_edges_from([
    ("X", "Y"),      # Treatment → Outcome
    ("C", "X"),      # Confounder → Treatment
    ("C", "Y"),      # Confounder → Outcome
    ("Z", "X"),      # Instrument → Treatment
    ("M", "Y"),      # Mediator → Outcome
    ("X", "M"),      # Treatment → Mediator
])
```

### Confounding
```
Confounder: variable that causes both treatment and outcome.
  C → X and C → Y
  Creates a spurious (non-causal) association between X and Y.

Condition on confounders to block the backdoor path:
  Path: X ← C → Y
  Conditioning on C blocks this path.
```

```python
def find_confounders(G, treatment, outcome):
    """Find all variables on backdoor paths between treatment and outcome."""
    backdoor_set = set()
    for node in G.nodes:
        if node == treatment or node == outcome:
            continue
        # Check if node is a common cause
        if G.has_edge(node, treatment) and G.has_edge(node, outcome):
            backdoor_set.add(node)
    return backdoor_set
```

### Collider Bias
```
Collider: variable caused by two or more other variables.
  X → C ← Y
  Conditioning on C opens the path (creates spurious association between X and Y).

Selection bias = conditioning on a collider.
Also: conditioning on a descendant of a collider (partial opening).
```

```python
# Example: conditioning on hospitalization creates spurious association
# between taking a drug and having a disease (both cause hospitalization)
def collider_example():
    """Simulate Berkson's paradox / collider bias."""
    n = 10000
    drug = np.random.binomial(1, 0.3, n)       # P(drug=1) = 0.3
    disease = np.random.binomial(1, 0.2, n)     # P(disease=1) = 0.2
    # Hospitalized if drug or disease (or both)
    hospitalized = np.random.binomial(1, 0.8 * (drug | disease) + 0.1 * (~(drug | disease)))
    cond = hospitalized == 1
    # Observed correlation conditioning on hospitalized
    corr_biased = np.corrcoef(drug[cond], disease[cond])[0, 1]
    corr_true = np.corrcoef(drug, disease)[0, 1]
    return corr_true, corr_biased  # True ≈ 0, biased < 0
```

### Mediation
```
Mediator: variable on the causal path from treatment to outcome.
  X → M → Y

Total effect = Direct effect (X → Y) + Indirect effect (X → M → Y)

Conditioning on mediator blocks part of the causal effect.
Don't condition on mediators when estimating total effect.
```

## Do-Calculus

### The do-operator
```
P(Y | do(X=x)): distribution of Y when we INTERVENE to set X=x
  (as opposed to P(Y | X=x): distribution of Y when we OBSERVE X=x)

The difference: P(Y | X=x) may be confounded (spurious association),
  while P(Y | do(X=x)) is the causal effect.
```

### Three Rules of Do-Calculus
```
1. Insertion/deletion of observations:
   If Y ⟂ Z | X, W (Z does not affect Y given X, W in DAG)
   P(Y | do(X), Z, W) = P(Y | do(X), W)

2. Action/observation exchange:
   If no directed path from Z to Y in graph after removing arrows into X
   P(Y | do(X), do(Z), W) = P(Y | do(X), Z, W)

3. Insertion/deletion of actions:
   If no directed path from X to Y in graph after removing arrows out of Z
   P(Y | do(X), do(Z), W) = P(Y | do(X), W)

These rules can derive identification strategies for any causal query
from the DAG structure.
```

### Backdoor Criterion
```
A set of variables Z satisfies the backdoor criterion for (X, Y) if:
  1. No node in Z is a descendant of X
  2. Z blocks all backdoor paths from X to Y

If Z satisfies backdoor criterion:
  P(Y | do(X=x)) = ∑_z P(Y | X=x, Z=z) P(Z=z)
```

### Front-Door Criterion
```
A set of variables M satisfies the front-door criterion for (X, Y) if:
  1. M intercepts all directed paths from X to Y
  2. No unblocked backdoor path from X to M
  3. All backdoor paths from M to Y are blocked by X

If M satisfies front-door criterion:
  P(Y | do(X=x)) = ∑_m P(M=m | X=x) ∑_x' P(Y | X=x', M=m) P(X=x')
```

```python
def front_door_estimator(X, M, Y):
    """Front-door adjustment estimator."""
    # P(M=m | X=x)
    from sklearn.linear_model import LogisticRegression
    model_m = LogisticRegression()
    model_m.fit(X.reshape(-1, 1), M)
    # P(Y | X=x', M=m)
    model_y = LogisticRegression()
    model_y.fit(np.column_stack([X, M]), Y)
    # Estimate
    x_unique = np.unique(X)
    m_unique = np.unique(M)
    result = 0
    for m in m_unique:
        p_m_given_x = model_m.predict_proba([[x]])[0, m == m_unique]
        inner = 0
        for x_prime in x_unique:
            p_y_given_x_m = model_y.predict_proba([[x_prime, m]])[0, 1]
            inner += p_y_given_x_m * np.mean(X == x_prime)
        result += p_m_given_x * inner
    return result
```

## Counterfactual Reasoning

### Counterfactual Definition
```
For unit i with observed treatment T_i = t and outcome Y_i = Y_i(t):
  Counterfactual: what would Y_i have been if T_i had been 1-t?
  Y_i(1-t) is the counterfactual (unobserved) outcome.

Unit-level causal effect = Y_i(1) - Y_i(0)
ATE = E[Y(1) - Y(0)] (average over population)
```

### The Fundamental Problem
We never observe both potential outcomes for any unit → no individual-level causal effects identifiable without strong assumptions.

### Three Steps of Counterfactual Reasoning (Pearl)
```
1. Abduction: update prior P(U) to P(U | evidence) using observed data
2. Action: perform do-operator to set treatment to new value
3. Prediction: compute outcome under new treatment using updated distribution

Used for: what-if analysis, individual treatment effects, attribution
```

## Structural Causal Models (SCM)

### SCM Definition
```
An SCM consists of:
  V = {V₁, ..., Vₙ}: endogenous variables (modeled)
  U = {U₁, ..., Uₘ}: exogenous variables (noise, unmodeled)
  F = {f₁, ..., fₙ}: structural equations:
    Vᵢ = fᵢ(Pa(Vᵢ), Uᵢ) where Pa(Vᵢ) are parents of Vᵢ in DAG

Each equation is causal: if we intervene on Pa(Vᵢ), Vᵢ changes accordingly.
The DAG is the causal graph of the SCM.
```

```python
# Example: linear SCM
# X = U_X
# Y = β * X + U_Y
class LinearSCM:
    def __init__(self, equations):
        self.equations = equations  # {variable: (parents, coeffs, noise_std)}

    def generate(self, n_samples=1000):
        data = {}
        for var, (parents, coeffs, noise_std) in self.equations.items():
            noise = np.random.normal(0, noise_std, n_samples)
            if not parents:
                data[var] = noise
            else:
                pred = sum(data[p] * c for p, c in zip(parents, coeffs))
                data[var] = pred + noise
        return pd.DataFrame(data)

    def intervene(self, intervention_dict, n_samples=1000):
        """Apply do-operator: set specified variables to fixed values."""
        data = {}
        for var, (parents, coeffs, noise_std) in self.equations.items():
            if var in intervention_dict:
                data[var] = np.full(n_samples, intervention_dict[var])
            else:
                noise = np.random.normal(0, noise_std, n_samples)
                if not parents:
                    data[var] = noise
                else:
                    pred = sum(data[p] * c for p, c in zip(parents, coeffs))
                    data[var] = pred + noise
        return pd.DataFrame(data)
```

### Key SCM Properties
```
- Every SCM implies a unique DAG
- Every DAG can be represented by multiple SCMs (different functional forms)
- Causal effects are computed via do-operator on SCM
- Counterfactuals require the full SCM (not just the graph)
- Identifiability: can the causal effect be computed from observational data?
```

## Identification Summary

| Strategy | When to Use | Formula |
|----------|-------------|---------|
| Backdoor | Confounders observed | P(Y|do(X))=∑P(Y|X,Z)P(Z) |
| Front-door | No unobserved confounders, mediator exists | P(Y|do(X))=∑P(M|X)∑P(Y|X',M)P(X') |
| Instrumental Variables | Unobserved confounders, valid instrument | IV estimator |
| Difference-in-Differences | Panel data, parallel trends | (Y₁_treat - Y₀_treat) - (Y₁_ctrl - Y₀_ctrl) |
| Regression Discontinuity | Deterministic cutoff | lim↓(E[Y|X=c]) - lim↑(E[Y|X=c]) |
```
