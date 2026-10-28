# Advanced Model Interpretability: Deep Networks, Counterfactuals, Concepts, LLMs and Explanation Evaluation

Advanced interpretability for complex models: gradient-based attribution for deep networks (Integrated Gradients, Grad-CAM) with Captum, counterfactual explanations, concept-based methods (TCAV), interpretability for transformers and LLMs (attention caveats, probing, sparse autoencoders, attribution of generated text), evaluating explanation quality, and operating explanations in production.

## Gradient-Based Attribution (Deep Networks)

| Method | Idea | Notes |
|---|---|---|
| Saliency (vanilla gradients) | Gradient of output w.r.t. input | Noisy, saturation issues |
| Integrated Gradients (IG) | Integrate gradients along a path from a baseline to the input | Satisfies completeness (attributions sum to output difference); baseline choice matters |
| SmoothGrad | Average gradients over noisy copies | Reduces visual noise |
| Grad-CAM | Gradients of a class score w.r.t. last conv feature maps | Coarse localization maps for CNNs |
| DeepLIFT / DeepSHAP | Reference-based contribution propagation | Fast approximations |
| Attention rollout / attention-based | Aggregate attention weights | Not a faithful attribution by itself |

### Captum example (PyTorch)
```python
from __future__ import annotations

import torch
from captum.attr import IntegratedGradients, LayerGradCam, LayerAttribution

model.eval()
x = image_tensor.unsqueeze(0).requires_grad_(True)       # 1 x C x H x W, preprocessed
target = int(model(x).argmax(dim=1))

ig = IntegratedGradients(model)
baseline = torch.zeros_like(x)                            # document the baseline choice
attr, delta = ig.attribute(x, baselines=baseline, target=target, n_steps=64,
                           return_convergence_delta=True)
if delta.abs().max() > 0.05:
    raise RuntimeError(f"IG convergence delta too high ({delta.abs().max():.3f}); increase n_steps")

gradcam = LayerGradCam(model, model.layer4)               # last conv block of a ResNet
cam = gradcam.attribute(x, target=target)
cam_up = LayerAttribution.interpolate(cam, x.shape[-2:])   # upsample to input size
```
For text models, attribute to token embeddings (`LayerIntegratedGradients` on the embedding layer) with a padding-token baseline.

Sanity checks (Adebayo et al., 2018): attributions should change substantially when model weights are randomized or labels are shuffled; methods that produce the same map regardless are acting as edge detectors.

## Counterfactual Explanations
"What is the smallest change to the input that changes the decision?" Useful for recourse ("increase income by X or reduce utilization to Y").

Desirable properties: validity (actually flips the prediction), proximity (small change), sparsity (few features), plausibility (realistic, within data manifold), actionability (only mutable features; respect monotonic constraints like age only increasing), diversity (several options).

```python
import dice_ml

data = dice_ml.Data(dataframe=train_df, continuous_features=["income", "utilization", "tenure_months"],
                    outcome_name="approved")
m = dice_ml.Model(model=clf, backend="sklearn")
exp = dice_ml.Dice(data, m, method="random")
cfs = exp.generate_counterfactuals(applicant_df, total_CFs=3, desired_class="opposite",
                                   features_to_vary=["income", "utilization"])
cfs.visualize_as_dataframe(show_only_changes=True)
```
Counterfactuals are explanations of the model, not guarantees: if the model is retrained, the same recourse may no longer work.

## Concept-Based Explanations
- **TCAV (Testing with Concept Activation Vectors)**: train a linear classifier separating activations of concept examples (e.g. "striped") from random examples; measure how sensitive class predictions are to that direction. Answers "how much does the concept matter for this class?"
- **Concept bottleneck models**: predict human-defined concepts first, then the label from concepts; allows intervention on concepts at test time, at some accuracy cost.
- Concept sets must be curated carefully; spurious concept datasets yield misleading results.

## Transformers and LLMs

| Technique | What it shows | Caveat |
|---|---|---|
| Attention weights | Where heads attend | Not equivalent to importance; multiple heads/layers and residual paths |
| Gradient x input / IG on tokens | Token attribution for a target logit | Choice of target token and baseline |
| Probing classifiers | Whether information is linearly decodable from hidden states | Decodable does not mean used |
| Activation patching / causal tracing | Which components causally affect an output | Compute-heavy; needs careful corruption design |
| Logit lens / tuned lens | Intermediate-layer predictions | Approximate |
| Sparse autoencoders (dictionary learning) | Decompose activations into many sparse, often interpretable features | Active research; feature labels are hypotheses to verify |
| Self-explanations / chain-of-thought | Model's stated reasoning | May not be faithful to the actual computation |

Libraries: TransformerLens and nnsight for mechanistic interpretability on open-weight models; Captum for attributions; inseq for sequence-generation attribution.

For RAG/LLM applications, the most practical "explanation" is often **source attribution**: show the retrieved passages and check that the answer's claims are supported by them (citation verification), rather than token-level saliency.

## Evaluating Explanations

| Criterion | Test |
|---|---|
| Faithfulness | Deletion/insertion curves: removing top-attributed features should change predictions faster than removing random ones; ROAR (remove and retrain) |
| Stability/robustness | Similar inputs get similar explanations; measure with local Lipschitz estimates or rank correlation under small perturbations |
| Sanity | Model/data randomization tests |
| Agreement | Rank correlation across methods (SHAP vs. IG vs. permutation) |
| Usefulness | Human-subject tasks: do explanations help users detect errors or make better decisions? |
| Coverage (rules/anchors) | Fraction of instances an explanation applies to and its precision |

Libraries such as Quantus provide many explanation-quality metrics for deep models.

## Interpretability in Production
- Generate reason codes at inference time with a fixed, versioned explainer and background dataset; store them with the prediction for audit.
- Monitor attribution drift: changes in mean |SHAP| per feature can reveal data or pipeline issues before accuracy drops.
- Latency: precompute where possible, use TreeSHAP or model-specific fast paths, or compute explanations asynchronously.
- Guard explanation endpoints: detailed explanations can leak model internals or training data properties and enable model extraction or gaming; expose only what users need.
- Document in model cards: methods, baselines, limitations, validation of explanation quality.

## Regulation and Governance
- High-stakes domains (credit, insurance, employment, health) need explanations that are accurate, consistent and actionable; validate reason-code generation as part of model validation (e.g. model risk management practices such as SR 11-7 in US banking).
- EU AI Act high-risk systems require transparency, logging and human oversight; interpretability supports these but does not satisfy them alone.

## Checklist
- [ ] Baselines and targets for gradient methods documented; convergence checked
- [ ] Sanity checks (randomization) passed for chosen attribution methods
- [ ] Counterfactuals restricted to actionable, plausible changes
- [ ] Attention not presented as explanation without supporting evidence
- [ ] Faithfulness and stability measured, not assumed
- [ ] Production reason codes versioned, stored and monitored for drift
- [ ] Explanation exposure reviewed for privacy, gaming and extraction risks
