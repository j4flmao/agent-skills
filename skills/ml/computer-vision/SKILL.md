---
name: ml-computer-vision
description: >
  Use this skill when building computer vision systems for image classification, object detection, segmentation, or image preprocessing/augmentation.
  This skill enforces: task selection (classification/detection/segmentation), model choice by task and budget, image preprocessing pipeline, augmentation strategy, training config with metrics (mAP, IoU), inference optimization.
  Do NOT use for: video streaming analytics, OCR (use separate OCR skill), medical imaging (requires domain-specific skill), NLP with image captions (use ml-nlp).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, computer-vision, image, phase-11]
---

# ML Computer Vision

## Quick Start
```python
from ultralytics import YOLO
model = YOLO("yolov8n.pt")
results = model("image.jpg")
results[0].show()
```

## Purpose
Design computer vision pipelines for image classification, object detection, and segmentation with appropriate model selection, preprocessing, augmentation, and training configuration.

## Architecture/Decision Trees

### Task Selection
```
What visual task do you need?
  ├── Assign single label to entire image → Image Classification
  │   ├── Small dataset (<1K/class) → ResNet (transfer learning)
  │   ├── Large dataset (>10K/class) → ConvNeXt, EfficientNet, ViT
  │   └── Zero-shot → CLIP (text-image alignment)
  ├── Locate objects with bounding boxes → Object Detection
  │   ├── Real-time (30+ FPS) → YOLOv8 (n/s/m/l/x)
  │   ├── High accuracy, slower → RT-DETR, Faster R-CNN
  │   └── Few classes, fixed size → YOLO (single-stage)
  ├── Pixel-level classification → Segmentation
  │   ├── Each pixel → Semantic Segmentation (U-Net, DeepLabV3+)
  │   ├── Each object instance → Instance Segmentation (Mask R-CNN, YOLOv8-seg)
  │   ├── Both → Panoptic Segmentation (Mask2Former)
  │   └── Zero-shot → SAM (Segment Anything)
  └── Image similarity / retrieval
      ├── Feature extraction → DINOv2 (self-supervised)
      └── Image + text → CLIP embedding
```

### Model Size vs Accuracy Tradeoff
```
                     Accuracy
                        ↑
  ViT-L/14           ●   │
  ConvNeXt-XL       ●    │
  EfficientNet-B7  ●     │
  ResNet-152      ●      │
  YOLOv8x        ●       │
  ViT-B/16       ●       │
  ResNet-50      ●       │
  EfficientNet-B3●        │
  YOLOv8n       ●         │
  MobileNetV3  ●          │
                        └─────────────→
                          Parameters (log)
```

### Augmentation Strategy Decision Tree
```
Dataset size per class
  ├── Large (>1000 images/class)
  │   ├── Light augmentation: HorizontalFlip, slight rotation
  │   ├── Color jitter (brightness=0.2, contrast=0.2)
  │   └── Random crop (90-100%)
  ├── Medium (100-1000 images/class)
  │   ├── Light + color jitter (0.1-0.3 each)
  │   ├── Random scaling (0.8-1.2), rotation (±15°)
  │   ├── Cutout (1-2 holes), random affine
  │   └── Mosaic for detection (YOLO)
  └── Small (<100 images/class)
      ├── Heavy + Mixup (α=0.2), CutMix
      ├── RandAugment (auto magnitude)
      ├── Grid distortion, elastic transform
      ├── Coarse dropout, random erasing
      └── Test-time augmentation (multi-scale + flip)
```

## Agent Protocol

### Trigger
User request includes: computer vision, OpenCV, YOLO, Detectron2, image classification, object detection, segmentation, ResNet, EfficientNet, YOLOv8, DETR, image augmentation, image preprocessing, visual recognition.

### Input Context
Before activating, verify:
- CV task type (classification, object detection, instance segmentation, semantic segmentation).
- Number of classes and class distribution (balanced, long-tail, few-shot).
- Image resolution and aspect ratio characteristics.
- Dataset size per class (few-shot <100, medium 100-1000, large >1000).
- Deployment constraints (edge device, cloud GPU, real-time FPS target).

### Output Artifact
Computer vision pipeline with task definition, model selection, training config, augmentation strategy.

### Response Format
```
## CV Pipeline
### Task
{classification / detection / segmentation}
Classes: {N} | Input Size: {W}x{H}

### Model
Architecture: {ResNet / EfficientNet / YOLOv8 / DETR / U-Net / SAM}
Backbone: {name} | Pretrained: {ImageNet / COCO / SAM}
Parameters: {N} | FPS Target: {N}

### Preprocessing
Resize: {W}x{H} | Interpolation: {bilinear / bicubic / nearest}
Normalize: {mean: [m1,m2,m3], std: [s1,s2,s3]}
Color: {RGB / BGR / grayscale}

### Augmentation
Pipeline: {albumentations / torchvision / imgaug}
Transforms: [HorizontalFlip, Rotate, ColorJitter, RandomCrop, Normalize]
Strength: {light / medium / heavy}

### Training
Optimizer: {AdamW / SGD} | LR: {value}
Schedule: {cosine / step / plateau} | Epochs: {N}
Batch Size: {N} | Precision: {fp16 / bf16}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Task type identified with class count and input resolution.
- [ ] Model architecture selected matching accuracy and speed requirements.
- [ ] Preprocessing pipeline defined with resize, normalization, and color space.
- [ ] Augmentation strategy configured for dataset size and variability.
- [ ] Training configuration set with optimizer, schedule, and loss function.
- [ ] Inference optimization planned (export, quantization, acceleration).
- [ ] Per-class metrics tracked to identify weak categories.

### Max Response Length
300 lines of configuration and code.

## Workflow

### Step 1: Task & Model Selection
Image classification: ResNet (simple, reliable), EfficientNet (better accuracy/parameter ratio), ConvNeXt (modernized), ViT (best accuracy with sufficient data). Object detection: YOLOv8 (real-time, best speed/accuracy), DETR (transformer end-to-end, no NMS). Faster R-CNN (two-stage, best for small objects). Segmentation: Mask R-CNN, YOLOv8-seg, SAM (zero-shot). Semantic segmentation: U-Net, DeepLabV3+, SegFormer.

```python
# Classification backbone selection
def select_classification_model(dataset_size, accuracy_target):
    if dataset_size < 1000:
        return "resnet50", "DEFAULT"  # ImageNet pretrained
    elif dataset_size < 10000:
        return "efficientnet_b3", "DEFAULT"
    elif accuracy_target == "max":
        return "convnext_large", "DEFAULT"
    else:
        return "vit_base_patch16_224", "IMAGENET1K_V1"
```

### Step 2: Image Preprocessing
Resize to fixed input size: 224x224 for classification, 640x640 for detection, 800x1333 for Faster R-CNN. Letterbox resize: preserve aspect ratio. Interpolation: bilinear for downscaling, bicubic for upscaling, nearest for masks. Normalize: ImageNet mean [0.485, 0.456, 0.406] and std [0.229, 0.224, 0.225].

```python
import cv2
import numpy as np
from torchvision import transforms

def get_classification_transform(img_size=224):
    return transforms.Compose([
        transforms.Resize((img_size, img_size), interpolation=transforms.InterpolationMode.BILINEAR),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

def letterbox_resize(image, target_size=640):
    h, w = image.shape[:2]
    scale = target_size / max(h, w)
    new_h, new_w = int(h * scale), int(w * scale)
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    dw, dh = (target_size - new_w) // 2, (target_size - new_h) // 2
    canvas = np.full((target_size, target_size, 3), 114, dtype=np.uint8)
    canvas[dh:dh+new_h, dw:dw+new_w] = resized
    return canvas, (scale, dw, dh)
```

### Step 3: Augmentation Strategy
Light (1000+): horizontal flip, slight rotation ±10°, small random crop. Medium (100-1000): light + color jitter, random scaling, cutout. Heavy (<100): medium + mixup, cutmix, RandAugment, elastic transform.

```python
import albumentations as A

def get_augmentation_pipeline(dataset_size):
    if dataset_size >= 1000:
        return A.Compose([
            A.HorizontalFlip(p=0.5),
            A.Rotate(limit=10, p=0.3),
            A.RandomResizedCrop(224, 224, scale=(0.9, 1.0), p=0.5),
            A.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1, p=0.3),
        ])
    elif dataset_size >= 100:
        return A.Compose([
            A.HorizontalFlip(p=0.5),
            A.Rotate(limit=15, p=0.5),
            A.RandomResizedCrop(224, 224, scale=(0.8, 1.0), p=0.5),
            A.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.15, p=0.5),
            A.Cutout(num_holes=2, max_h_size=32, max_w_size=32, p=0.3),
            A.Affine(scale=(0.8, 1.2), translate_percent=(-0.1, 0.1), p=0.3),
        ])
    else:
        return A.Compose([
            A.HorizontalFlip(p=0.5),
            A.RandomResizedCrop(224, 224, scale=(0.7, 1.0), p=0.5),
            A.Rotate(limit=30, p=0.5),
            A.ColorJitter(brightness=0.4, contrast=0.4, saturation=0.4, hue=0.2, p=0.5),
            A.GridDistortion(p=0.3),
            A.ElasticTransform(alpha=1, sigma=50, p=0.2),
            A.CoarseDropout(max_holes=8, max_height=32, max_width=32, p=0.3),
        ])

# Detection-specific augmentation (bbox-aware)
def get_detection_augmentation():
    return A.Compose([
        A.HorizontalFlip(p=0.5),
        A.RandomBrightnessContrast(p=0.3),
        A.HueSaturationValue(p=0.3),
        A.Mosaic(p=0.5),  # YOLO-specific
    ], bbox_params=A.BboxParams(format="yolo", min_visibility=0.3))
```

### Step 4: Training Configuration
Loss functions: cross-entropy for classification. Focal Loss for detection (gamma=2). Dice loss + BCE for segmentation. Optimizer: AdamW (default, decoupled weight decay). Learning rate: 1e-4 for AdamW, 1e-2 for SGD. Schedule: cosine decay with warmup (5-10%). Label smoothing: epsilon=0.1.

```python
import torch
import torch.nn as nn
import torch.optim as optim

def configure_training(model, config):
    # Loss
    if config["task"] == "classification":
        criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    elif config["task"] == "detection":
        criterion = nn.BCEWithLogitsLoss()  # multi-label
    elif config["task"] == "segmentation":
        criterion = nn.BCEWithLogitsLoss()  # or Dice loss

    # Optimizer
    optimizer = optim.AdamW(
        model.parameters(),
        lr=config["learning_rate"],
        weight_decay=config["weight_decay"],
    )

    # Scheduler
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=config["epochs"],
        eta_min=config["learning_rate"] * 0.01,
    )

    # Mixed precision
    scaler = torch.cuda.amp.GradScaler() if config["mixed_precision"] else None

    return criterion, optimizer, scheduler, scaler
```

### Step 5: Evaluation Metrics
Classification: top-1 accuracy, top-5 accuracy, per-class F1. Detection: mAP@0.5:0.95 (COCO standard). Segmentation: mean IoU, Dice coefficient. Per-class metrics essential for identifying weak categories.

```python
def compute_map(predictions, targets, iou_thresholds=np.arange(0.5, 0.96, 0.05)):
    """Simplified mAP computation (full implementation requires matching)."""
    aps = []
    for iou_thresh in iou_thresholds:
        tp, fp, num_pos = compute_tp_fp(predictions, targets, iou_thresh)
        if num_pos == 0:
            continue
        precision = tp / (tp + fp + 1e-10)
        recall = tp / num_pos
        # Interpolated AP
        ap = np.trapz(np.sort(precision), np.sort(recall))
        aps.append(ap)
    return np.mean(aps)  # mAP@0.5:0.95
```

### Step 6: Inference Optimization
Model export: PyTorch → ONNX, ONNX → TensorRT. Quantization: FP16 (2x speed), INT8 (4x). Batch inference for max GPU utilization. NMS optimization: fast NMS, batched NMS. Model pruning: structured pruning (2x compression, <1% mAP loss).

```python
import torch

def export_to_onnx(model, dummy_input, output_path="model.onnx"):
    model.eval()
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        opset_version=17,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
    )

def optimize_tensorrt(onnx_path, engine_path, precision="fp16"):
    import tensorrt as trt
    logger = trt.Logger(trt.Logger.WARNING)
    builder = trt.Builder(logger)
    network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
    parser = trt.OnnxParser(network, logger)
    with open(onnx_path, "rb") as f:
        parser.parse(f.read())
    config = builder.create_builder_config()
    if precision == "fp16":
        config.set_flag(trt.BuilderFlag.FP16)
    serialized = builder.build_serialized_network(network, config)
    with open(engine_path, "wb") as f:
        f.write(serialized)
```

## Anti-Patterns

- **Normalizing with wrong mean/std**: ImageNet stats only for ImageNet-pretrained models.
- **Different input sizes for train and inference**: Accuracy degrades from size mismatch.
- **Training without augmentation on small datasets**: Model overfits to training specifics.
- **Not using mixed precision**: 2x speedup available with minimal accuracy loss.
- **Forgetting model.eval()**: BatchNorm and Dropout behave differently in eval mode.
- **Excessive NMS IoU threshold**: Too low removes overlapping detections, too high keeps duplicates.
- **Training detectors without mosaic**: Worse performance on small objects.
- **Not handling class imbalance**: With long-tail datasets, use focal loss or class weights.
- **Using wrong interpolation for masks**: Nearest interpolation for segmentation masks, bilinear for images.

## Production Considerations

### Deployment Checklist
- Export to ONNX or TensorRT for optimized production inference.
- Profile on target hardware to validate throughput requirements.
- Set confidence threshold based on precision-recall tradeoff.
- Implement preprocessing as part of inference pipeline.
- Containerize model with preprocessing and post-processing.
- Set up A/B testing for gradual rollout with automatic rollback.
- Monitor for adversarial inputs using confidence thresholds.

### Monitoring
- Track mAP@0.5:0.95 over time to detect performance regression.
- Monitor inference latency (preprocessing + model + postprocessing).
- Track per-class AP — specific classes may degrade while overall mAP stays stable.
- Monitor input image statistics: resolution, brightness, blur score.
- Log prediction metadata: class confidences, bbox counts, inference time.

## Rules
- Always normalize with dataset-specific mean/std.
- Use the same input size for training and inference.
- Learning rate scales with batch size: LR = base_LR * (batch_size / base_batch_size).
- Warmup is critical for vision transformers (5-10% of total steps).
- COCO pretrained weights better than ImageNet for detection tasks.
- mAP@0.5:0.95 is the standard metric for detection.
- Never evaluate on the training set.
- Test-time augmentation gives 1-3% mAP boost at inference cost.
- Gradient accumulation simulates larger batch size.
- Mixed precision (AMP) gives ~2x speedup.

## References
  - references/computer-vision-advanced.md — Computer Vision Advanced Topics
  - references/computer-vision-fundamentals.md — Computer Vision Fundamentals
  - references/cv-deployment.md — CV Model Deployment
  - references/cv-pipeline.md — Computer Vision Pipeline
  - references/detection-segmentation.md — Detection & Segmentation
  - references/image-preprocessing.md — Image Preprocessing & Augmentation
  - references/image-segmentation.md — Image Segmentation
  - references/video-analysis.md — Video Analysis
## Handoff
Hand off to ml-experiment-tracking for training runs. For model deployment on edge devices, hand off to devops-ml-serving.
