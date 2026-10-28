# Computer Vision Fundamentals

Core concepts for building computer vision (CV) systems: task types, image representation, convolutional networks and vision transformers, transfer learning with pretrained backbones, data and augmentation, evaluation metrics, and a minimal PyTorch training loop. Preprocessing, detection/segmentation, video, pipelines and deployment have dedicated sibling references.

## Task Types

| Task | Output | Typical metric | Example models |
|---|---|---|---|
| Image classification | Label(s) per image | Top-1/Top-5 accuracy, F1 | ResNet, EfficientNet, ConvNeXt, ViT |
| Object detection | Boxes + labels + scores | mAP@[.5:.95], mAP@.5 | YOLO family, DETR/RT-DETR, Faster R-CNN |
| Semantic segmentation | Class per pixel | mIoU | U-Net, DeepLabv3+, SegFormer |
| Instance segmentation | Mask per object | Mask mAP | Mask R-CNN, YOLO-seg, Mask2Former |
| Keypoint/pose estimation | Keypoints per instance | OKS-based AP | HRNet, YOLO-pose |
| OCR | Text + locations | CER/WER | PaddleOCR, TrOCR, docTR |
| Image retrieval / similarity | Embedding vectors | Recall@k | CLIP, DINOv2 |
| Anomaly detection | Normal vs. anomalous | AUROC | PatchCore, PaDiM |

## Image Representation
- Tensor layout: PyTorch uses `N x C x H x W` (batch, channels, height, width); many image libraries use `H x W x C`.
- Pixel values: uint8 0–255 on disk; float32 normalized for models (commonly scaled to 0–1 then normalized with dataset mean/std, e.g. ImageNet mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]`).
- Color order: OpenCV loads BGR, PIL/torchvision RGB. Mixing them silently degrades accuracy.
- Resolution trade-off: higher resolution helps small objects but costs compute roughly quadratically.

## Model Families

### Convolutional neural networks (CNNs)
Convolutions share weights across positions (translation equivariance) and build hierarchical features via stacked conv, normalization, activation and pooling layers. Strong inductive bias makes them data-efficient and fast on edge hardware.

### Vision Transformers (ViT)
Split the image into patches (e.g. 16x16), embed them as tokens and apply self-attention. Less inductive bias, so they benefit from large-scale pretraining; excellent transfer performance. Hybrids and hierarchical transformers (Swin) and modern CNNs (ConvNeXt) narrow the gap between the two families.

| Consideration | CNN | ViT |
|---|---|---|
| Small datasets from scratch | Better | Needs pretraining |
| Pretrained transfer | Strong | Very strong, especially with large pretraining |
| Edge latency | Generally efficient | Improving; attention cost grows with token count |
| Global context | Limited receptive field per layer | Global from the first layer |

## Transfer Learning (default approach)
Start from a pretrained backbone and fine-tune; training from scratch is rarely justified.

```python
from __future__ import annotations

import timm
import torch
from torch import nn

device = (
    torch.device("cuda") if torch.cuda.is_available()
    else torch.device("mps") if torch.backends.mps.is_available()
    else torch.device("cpu")
)

model = timm.create_model("convnext_tiny.fb_in22k_ft_in1k", pretrained=True, num_classes=5).to(device)
data_cfg = timm.data.resolve_data_config({}, model=model)
train_tf = timm.data.create_transform(**data_cfg, is_training=True)
eval_tf = timm.data.create_transform(**data_cfg, is_training=False)

# Option A: linear probe -> freeze backbone, train the head first
for p in model.parameters():
    p.requires_grad = False
for p in model.get_classifier().parameters():
    p.requires_grad = True
```
Then unfreeze and fine-tune all layers with a smaller learning rate (often 1e-5 to 1e-4 with AdamW and a cosine schedule).

## Minimal Training Loop

```python
from torch.utils.data import DataLoader

def train_one_epoch(model: nn.Module, loader: DataLoader, optimizer: torch.optim.Optimizer,
                    scaler: torch.amp.GradScaler, epoch: int) -> float:
    model.train()
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    total = 0.0
    for images, labels in loader:
        images, labels = images.to(device, non_blocking=True), labels.to(device, non_blocking=True)
        optimizer.zero_grad(set_to_none=True)
        with torch.autocast(device_type=device.type, dtype=torch.bfloat16, enabled=device.type == "cuda"):
            loss = criterion(model(images), labels)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        total += loss.item() * images.size(0)
    return total / len(loader.dataset)


@torch.inference_mode()
def evaluate(model: nn.Module, loader: DataLoader) -> float:
    model.eval()
    correct = n = 0
    for images, labels in loader:
        preds = model(images.to(device)).argmax(dim=1).cpu()
        correct += (preds == labels).sum().item()
        n += labels.numel()
    return correct / n

scaler = torch.amp.GradScaler(device.type, enabled=False)   # not needed for bf16; enable for fp16
```
Use `torch.amp` (the older CUDA-only AMP namespace is deprecated); bf16 on Ampere+ GPUs needs no gradient scaling.

## Data and Augmentation

| Practice | Why |
|---|---|
| Train/val/test splits by source (camera, patient, site, time) | Avoid leakage through near-duplicates |
| Label quality review and guidelines | Label noise caps accuracy |
| Class balance analysis | Weighted sampling or loss for rare classes |
| Augmentation (random resized crop, flip, color jitter, RandAugment/TrivialAugment, Mixup/CutMix) | Generalization |
| Task-aware augmentation | Do not flip text or left/right-sensitive medical images; transform boxes/masks consistently (torchvision `transforms.v2`, Albumentations) |
| Deduplicate | Near-duplicate images across splits inflate metrics |

## Evaluation Metrics
- **Classification**: accuracy can mislead with imbalance; report per-class precision/recall/F1, confusion matrix, and calibration (ECE).
- **Detection**: IoU threshold matters; COCO mAP averages IoU 0.50–0.95. Inspect precision-recall curves per class and errors by object size.
- **Segmentation**: IoU per class and mean IoU; Dice for medical imaging; boundary metrics when edges matter.
- Always evaluate on data matching deployment conditions (lighting, cameras, resolutions).

## Common Pitfalls
| Pitfall | Fix |
|---|---|
| Different preprocessing in training vs. inference | Share one transform definition; test parity |
| BGR/RGB confusion | Convert explicitly at load time |
| Data leakage between splits | Group-aware splitting |
| Overfitting small datasets | Pretrained backbones, augmentation, early stopping |
| Judging by a single metric | Per-class and slice analysis |

## Checklist
- [ ] Task and metric chosen to match the business decision
- [ ] Pretrained backbone with documented preprocessing
- [ ] Leak-free splits by source/group
- [ ] Task-consistent augmentation
- [ ] Mixed precision via `torch.amp`; dynamic device selection
- [ ] Per-class and per-slice evaluation on deployment-like data
