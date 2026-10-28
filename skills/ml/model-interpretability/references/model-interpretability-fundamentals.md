# Model Interpretability Fundamentals

Interpretability is the degree to which humans can understand why a model makes its predictions. This reference covers why it matters, the taxonomy of methods, inherently interpretable models, choosing a method for a question, and the limits and pitfalls of explanations. Specific techniques (SHAP, LIME, PDP/ICE, global and local methods, fairness auditing, visualization) are detailed in sibling references.

## Why Interpretability

| Goal | Example question |
|---|---|
| Debugging | Is the model relying on a leaked feature or a spurious artifact? |
| Trust and adoption | Can a loan officer understand the main drivers of a score? |
| Regulation and rights | Can we give adverse-action reasons (credit) or meaningful information about automated decisions (GDPR)? |
| Fairness | Does a protected attribute or its proxy drive outcomes? |
| Scientific insight | Which variables are associated with the outcome? |
| Monitoring | Have feature contributions shifted since training? |

## Taxonomy

| Axis | Options | Meaning |
|---|---|---|
| Source | Intrinsic (glass-box) vs. post-hoc | Model is understandable by design vs. explained after training |
| Scope | Global vs. local | Whole-model behavior vs. one prediction |
| Applicability | Model-specific vs. model-agnostic | Uses internals (tree paths, gradients) vs. only inputs/outputs |
| Output | Feature attribution, feature effect, example-based, rules, counterfactuals, concepts | Form of the explanation |

### Method map
| Question | Method family |
|---|---|
| Which features matter overall? | Permutation importance, mean absolute SHAP |
| How does prediction change as a feature varies? | PDP, ICE, ALE (ALE is preferred with correlated features) |
| Why this prediction? | SHAP values, LIME, Integrated Gradients (deep nets) |
| What minimal change flips the outcome? | Counterfactual explanations |
| Which training examples are similar/influential? | Nearest neighbors in embedding space, prototypes, influence functions |
| What rule approximates the model? | Surrogate decision trees, anchors |

## Inherently Interpretable Models

| Model | Interpretability | Notes |
|---|---|---|
| Linear/logistic regression | Coefficients (on standardized features) | Interactions must be engineered; check multicollinearity |
| Sparse linear models (Lasso) | Few active features | Stability of selection varies |
| Decision trees (shallow) | Readable rules | Unstable; deep trees are not interpretable |
| Rule lists / scorecards | Points per condition | Common in credit scoring |
| Generalized additive models (GAMs), Explainable Boosting Machines (EBM, `interpret` package) | Per-feature shape functions plus selected pairwise interactions | Often accuracy close to gradient boosting on tabular data |

```python
from interpret.glassbox import ExplainableBoostingClassifier

ebm = ExplainableBoostingClassifier(interactions=10, random_state=0)
ebm.fit(X_train, y_train)
global_exp = ebm.explain_global()          # shape function per feature
local_exp = ebm.explain_local(X_test[:5], y_test[:5])
```
For high-stakes tabular decisions, try a glass-box model first; use a black box only if it is meaningfully better on your metrics.

## Post-hoc Methods in One Example

```python
import shap
from sklearn.inspection import permutation_importance

# Global: permutation importance on held-out data (model-agnostic)
pi = permutation_importance(model, X_valid, y_valid, n_repeats=10, random_state=0, scoring="roc_auc")

# Local + global: SHAP for tree ensembles
explainer = shap.TreeExplainer(model)
sv = explainer(X_valid)               # shap.Explanation
shap.plots.beeswarm(sv)               # global summary
shap.plots.waterfall(sv[0])           # one prediction
```
Compute importance on validation/test data, not training data, to reflect generalization.

## Choosing a Method

```
Audience?            regulator/customer -> simple, stable reasons (reason codes, scorecards, counterfactuals)
                     data scientist     -> SHAP, PDP/ALE, error analysis
Model type?          tree ensemble      -> TreeSHAP (exact, fast)
                     deep net (images/text) -> gradient-based attributions (Integrated Gradients, Grad-CAM)
                     any                -> permutation importance, KernelSHAP, LIME (slower, approximate)
Correlated features? yes -> ALE, grouped permutation, conditional approaches; be cautious with PDP and marginal SHAP
```

## Key Caveats
- **Explanations are not causal.** Attributions describe the model, not the world. "Feature X increases risk" means the model uses X, not that changing X changes reality.
- **Correlated features** split or shift credit unpredictably; group them or explain at the group level.
- **Different methods disagree.** Agreement across methods increases confidence; disagreement is a signal to investigate.
- **Baseline choice** (SHAP background data, IG baseline) changes attributions; document it.
- **Instability**: small input or retraining changes can alter explanations; check stability across seeds and bootstraps.
- **Manipulability**: post-hoc explanations can be gamed; do not use them as the sole fairness or safety evidence.
- **Faithfulness vs. plausibility**: an explanation that looks reasonable may not reflect the model's actual computation; test faithfulness (e.g. deletion/insertion tests).

## Communicating Explanations
- Translate features into domain language; group engineered features back to source concepts.
- Show the direction and size of effects with uncertainty, not just rankings.
- For individuals: top 3–5 reasons plus actionable counterfactuals where appropriate.
- Document methods, data used for explanations, and known limitations in the model card.

## Regulatory Context (orientation)
- Credit decisions in the US require specific adverse-action reasons (ECOA/Regulation B); regulators have stated that complex models do not exempt lenders from this.
- GDPR gives individuals rights regarding solely automated decisions with legal or similarly significant effects, including meaningful information about the logic involved.
- The EU AI Act requires transparency, documentation and human oversight for high-risk AI systems.
Consult legal counsel for obligations in your context.

## Checklist
- [ ] Explanation goal and audience defined
- [ ] Glass-box model evaluated as a baseline for tabular high-stakes tasks
- [ ] Importances computed on held-out data
- [ ] Method chosen for model type and feature correlations
- [ ] Baselines/background data documented
- [ ] Stability and cross-method agreement checked
- [ ] Non-causal nature of explanations communicated
