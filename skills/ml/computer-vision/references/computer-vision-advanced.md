# Advanced Computer Vision: Foundation Models, Open-Vocabulary Perception, Efficient Training and Robustness

Modern CV increasingly starts from large pretrained foundation models rather than task-specific training. This reference covers self-supervised and vision-language foundation models, open-vocabulary detection and promptable segmentation, vision-language models (VLMs), efficient training at scale, data-centric techniques (active learning, synthetic data, auto-labeling), robustness and domain shift, and how to choose between these approaches.

## Foundation Models

| Model family | What it provides | Typical use |
|---|---|---|
| CLIP / OpenCLIP / SigLIP | Joint image-text embeddings | Zero-shot classification, retrieval, filtering datasets |
| DINOv2 (and successors) | Self-supervised visual features | Linear probes, kNN classification, dense features for segmentation/depth |
| SAM / SAM 2 | Promptable segmentation (points, boxes, masks); SAM 2 adds video | Interactive labeling, mask generation from detector boxes |
| Grounding DINO, OWL-ViT/OWLv2, YOLO-World | Open-vocabulary detection from text prompts | Detect classes without task-specific training |
| Depth foundation models (e.g. Depth Anything) | Monocular depth | Robotics, AR, 3D cues |

### Zero-shot classification with CLIP-style models
```python
from __future__ import annotations

import open_clip
import torch
from PIL import Image

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model, _, preprocess = open_clip.create_model_and_transforms("ViT-B-32", pretrained="laion2b_s34b_b79k")
tokenizer = open_clip.get_tokenizer("ViT-B-32")
model = model.to(device).eval()

labels = ["a photo of a scratched panel", "a photo of a clean panel", "a photo of a dented panel"]
with torch.inference_mode():
    image = preprocess(Image.open("panel.jpg").convert("RGB")).unsqueeze(0).to(device)
    img = model.encode_image(image)
    txt = model.encode_text(tokenizer(labels).to(device))
    img, txt = img / img.norm(dim=-1, keepdim=True), txt / txt.norm(dim=-1, keepdim=True)
    probs = (100.0 * img @ txt.T).softmax(dim=-1)
```
Prompt wording matters; use prompt ensembles and validate on labeled samples before trusting zero-shot results.

### Linear probe on frozen features
Extract embeddings from a frozen backbone (DINOv2, CLIP) once, then train logistic regression or a small MLP. Fast, cheap, and a strong baseline before any fine-tuning.

## Open-Vocabulary Detection + Promptable Segmentation

```
text prompt ("forklift . pallet . person")
  -> open-vocabulary detector -> boxes + scores
  -> SAM / SAM 2 with box prompts -> instance masks
  -> human review -> training data for a small, fast specialist model
```
Use this to bootstrap labels, then distill into a compact detector (e.g. a YOLO-family or RT-DETR model) for production latency and cost. Open-vocabulary models are slower and less precise on niche classes than fine-tuned specialists.

## Vision-Language Models (VLMs)
Multimodal LLMs (open-weight families such as Qwen-VL, InternVL, LLaVA-style models, and hosted multimodal APIs) answer questions about images, read documents and charts, and produce structured outputs.
| Good fit | Poor fit |
|---|---|
| Document understanding, captioning, visual Q&A, flexible triage | Precise localization, high-throughput real-time detection, strict latency budgets |
| Low-volume, high-variety tasks | Millions of images per day on constrained budgets |
Validate with a labeled evaluation set; constrain outputs with JSON schemas; watch for hallucinated details.

## Efficient Training at Scale

| Technique | Notes |
|---|---|
| Mixed precision (`torch.autocast`, bf16) | Default on modern GPUs; use the device-generic `torch.amp` API |
| `torch.compile(model)` | Graph capture and kernel fusion; check speedups per model |
| Channels-last memory format | Often faster convs on GPUs: `model.to(memory_format=torch.channels_last)` |
| Distributed data parallel (DDP), FSDP | Multi-GPU; FSDP for large models |
| Gradient accumulation | Larger effective batch on limited memory |
| Efficient data loading | Many workers, pinned memory, WebDataset/shards, GPU decoding (NVIDIA DALI) |
| Parameter-efficient fine-tuning (LoRA, adapters) | Adapt large ViTs/VLMs with few trainable parameters |
| EMA of weights | Stabilizes detection/segmentation training |

```python
model = model.to(device, memory_format=torch.channels_last)
model = torch.compile(model)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=0.05)
```

## Data-Centric Techniques

### Active learning
Select the most informative unlabeled images (uncertainty, disagreement between models, embedding diversity/coverage) for labeling each round. Typically reduces labeling cost versus random selection; measure on your data.

### Auto-labeling with human review
Foundation models pre-label; annotators correct. Track annotator agreement and model-assisted bias (annotators accepting wrong pre-labels).

### Synthetic data
Rendering engines (Blender, Omniverse Replicator, Unity Perception) or generative models produce rare cases. Mix with real data, keep a real-only test set, and use domain randomization to reduce the sim-to-real gap.

### Dataset curation
Embedding-based deduplication, outlier and label-error detection (e.g. confident learning), and slice discovery (clustering failure cases) often outperform architecture changes.

## Robustness and Domain Shift

| Shift | Example | Mitigation |
|---|---|---|
| Covariate | New camera, lighting, weather | Diverse training data, augmentation, test-time adaptation, per-domain calibration |
| Label/prior | Defect rate changes | Recalibrate thresholds; monitor prediction distribution |
| Concept | Definition of "defect" changes | Update labeling guidelines, retrain |
| Adversarial/physical | Patches, stickers | Adversarial training for high-risk systems, input validation, multi-sensor checks |

Evaluate on corruption benchmarks (blur, noise, compression) relevant to your sensors, and monitor production embeddings for drift.

## Choosing an Approach

```
Few labels, classes describable in text?          -> zero-shot CLIP/open-vocab detector, validate
Some labels (hundreds), fixed classes?             -> linear probe / fine-tune foundation backbone
Strict latency/edge, high volume?                   -> distill into compact specialist model
Open-ended questions about images/documents?       -> VLM with structured output and evals
Pixel-accurate masks needed?                        -> SAM-assisted labeling + segmentation model
```

## Responsible Use
- Check licenses of model weights and training datasets for commercial use.
- Face and person analytics raise privacy and legal constraints (biometric laws, EU AI Act restrictions on certain uses); involve legal review.
- Evaluate performance across demographic and environmental slices where people are involved.

## Checklist
- [ ] Foundation-model baseline (zero-shot or linear probe) measured before custom training
- [ ] Auto-labeling with human review and agreement tracking
- [ ] Distillation to a specialist model when latency/cost demands it
- [ ] Mixed precision, compile and efficient data loading in training
- [ ] Active learning or curation loop for new data
- [ ] Robustness tests for sensor/domain shifts and drift monitoring
- [ ] Licenses and privacy constraints reviewed
