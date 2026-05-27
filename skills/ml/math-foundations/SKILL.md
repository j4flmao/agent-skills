---
name: ml-math-foundations
description: >
  Use this skill when you need to understand, derive, or debug the mathematical foundations behind ML/DL algorithms — linear algebra, calculus, probability, information theory, optimization, loss functions, and deep learning math. This skill enforces: correct notation, rigorous derivations, and mapping from math concepts to ML implementations. Do NOT use for: implementing ML algorithms with libraries (use ml/classical-ml or ml/deep-learning), data preprocessing (use data/), or general statistics (use data/data-quality).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, math, foundations, phase-11]
---

# ML/DL Mathematical Foundations

## Purpose
Provide rigorous, implementation-focused reference for all mathematical concepts underpinning machine learning and deep learning. Each reference file bridges theory ↔ practice with derivations, NumPy/SciPy code, and direct mapping to ML algorithms.

## Agent Protocol

### Trigger
User request includes: prove, derive, gradient, backprop, SVD, eigenvalue, eigendecomposition, chain rule, loss function derivative, optimization convergence, KL divergence, entropy, information theory, kernel trick, PCA math, Bayesian inference, EM algorithm, Taylor expansion, attention math, normalization math, initialization math.

### Input Context
- Specific math concept or derivation needed
- Algorithm context (e.g., "derivation of Adam", "XGBoost objective", "transformer attention math")
- Current understanding level (conceptual, formula-level, implementation-level)

### Output
- Clear mathematical derivation with step-by-step reasoning
- Mapping to ML/DL algorithm application
- NumPy/SciPy demonstration code
- Common pitfalls and numerical stability considerations

### Response Format
Provide the mathematical content directly. Use standard mathematical notation. No preamble. No postamble. No filler.

### Completion Criteria
- Derivation is complete and self-contained
- Mapping to ML algorithm is explicit
- Numerical considerations are documented
- Code demonstration is provided where applicable

## Decision Guide: Which Reference to Use

| You need | Go to |
|---|---|
| Vector/matrix ops, SVD, eigendecomposition, norms, linear transformations | `linear-algebra.md` |
| Derivatives, gradients, chain rule, backprop, automatic differentiation | `calculus.md` |
| Distributions, MLE, MAP, Bayes, bias-variance, hypothesis testing | `probability-statistics.md` |
| Entropy, cross-entropy, KL divergence, mutual information, Fisher info | `information-theory.md` |
| Gradient descent variants, Adam, SGD, LR schedules, regularization | `optimization.md` |
| Loss functions with their derivatives and probabilistic interpretations | `loss-functions.md` |
| Backprop through CNN/RNN/LSTM/Transformer, normalization, initialization | `deep-learning-math.md` |
| SVM kernel trick, tree math, XGBoost derivation, PCA, EM algorithm | `ml-algorithms.md` |
| Quick lookup of math symbols and notation | `notation-reference.md` |

## Rules
- Every formula must include its mapping to an ML algorithm or concept.
- Provide NumPy/SciPy demonstration code for non-trivial computations.
- Always note numerical stability concerns (e.g., log-sum-exp trick, softmax overflow).
- Distinguish between scalar, vector, matrix, and tensor operations with explicit notation.
- For optimization algorithms, show the update rule with all hyperparameters.
- Cross-reference related concepts across files (e.g., KL divergence in information-theory ↔ loss-functions).

## References
  - references/calculus.md — Calculus for Machine Learning
  - references/deep-learning-math.md — Deep Learning Mathematics
  - references/information-theory.md — Information Theory for Machine Learning
  - references/linear-algebra.md — Linear Algebra for Machine Learning
  - references/loss-functions.md — Loss Functions for Machine Learning
  - references/math-foundations-advanced.md — Math Foundations Advanced Topics
  - references/math-foundations-fundamentals.md — Math Foundations Fundamentals
  - references/ml-algorithms.md — Machine Learning Algorithms — Mathematical Derivations
  - references/notation-reference.md — Notation Reference for Machine Learning Mathematics
  - references/optimization.md — Optimization for Machine Learning
  - references/probability-statistics.md — Probability and Statistics for Machine Learning
## Handoff
Hand off to `ml/classical-ml/SKILL.md` if the user needs implementation rather than mathematical understanding. Hand off to `ml/deep-learning/SKILL.md` for DL-specific implementation patterns.
