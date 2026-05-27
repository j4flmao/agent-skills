---
name: ml-computer-vision
description: >
  Use this skill when building computer vision systems for image classification, object detection, segmentation, or image preprocessing/augmentation.
  This skill enforces: task selection (classification/detection/segmentation), model choice by task and budget, image preprocessing pipeline, augmentation strategy, training config with metrics (mAP, IoU), inference optimization.
  Do NOT use for: video streaming analytics, OCR (use separate OCR skill), medical imaging (requires domain-specific skill), NLP with image captions (use ml-nlp).
version: "1.0.0"
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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Task type identified with class count and input resolution.
- [ ] Model architecture selected matching accuracy and speed requirements.
- [ ] Preprocessing pipeline defined with resize, normalization, and color space.
- [ ] Augmentation strategy configured for dataset size and variability.
- [ ] Training configuration set with optimizer, schedule, and loss function.
- [ ] Inference optimization planned (export, quantization, acceleration).
- [ ] Per-class metrics tracked to identify weak categories.

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Task & Model Selection
Image classification: ResNet (simple, reliable, good for transfer learning), EfficientNet (better accuracy/parameter ratio, compound scaling), ConvNeXt (modernized ResNet, SOTA CNN), Vision Transformer ViT (best accuracy with sufficient data, needs >10M images for training from scratch, works with 1K+ for fine-tuning), DeiT (data-efficient ViT, works with ImageNet-1K scale). Object detection: YOLOv8 (real-time single-stage, best speed/accuracy, 5 variants nano to xlarge), DETR (transformer end-to-end, no anchor boxes, no NMS, simpler pipeline, slower convergence). RT-DETR (real-time DETR, combines YOLO speed with DETR simplicity). Faster R-CNN (two-stage, highest accuracy at speed cost, good for small objects). Instance segmentation: Mask R-CNN (extension of Faster R-CNN with mask head), YOLOv8-seg (real-time segmentation), SAM (foundation model, zero-shot, prompts via points/boxes/text). Semantic segmentation: U-Net (biomedical, efficient with limited data), DeepLabV3+ (atrous convolution for multi-scale), SegFormer (transformer-based, efficient). Panoptic segmentation: Mask2Former (unified architecture, state of the art). Foundation models: SAM (Segment Anything, zero-shot segmentation), DINOv2 (self-supervised visual features, good for few-shot), CLIP (text-image alignment, zero-shot classification). Use foundation models when labeled data is scarce and task aligns with pretraining.

### Step 2: Image Preprocessing
Resize to fixed input size: 224x224 for classification (ResNet, EfficientNet), 640x640 for detection (YOLO), 800x1333 for Faster R-CNN (short side 800, long side <=1333). Letterbox resize: preserve aspect ratio by padding to square with constant color. Maintains object proportions. Center crop: crop center region after resize to square. Standard for ImageNet-style classification. Interpolation: bilinear for downscaling (smooth), bicubic for upscaling (sharper), nearest for masks (no interpolation artifacts on boundaries). Normalize: ImageNet mean [0.485, 0.456, 0.406] and std [0.229, 0.224, 0.225] for models pretrained on ImageNet. Dataset-specific normalization for custom pretraining. Color space: RGB for most models, BGR for OpenCV default (convert to RGB before model), grayscale for specific tasks (reduce channels). Data type: float32 for standard, float16 for half-precision inference, uint8 for input to normalization.

### Step 3: Augmentation Strategy
Light (1000+ samples per class): horizontal flip, slight rotation +-10 degrees, small random crop (90-100% of original), mild color jitter. Medium (100-1000 per class): light plus color jitter (brightness 0.2, contrast 0.2, saturation 0.2, hue 0.1), random scaling (0.8-1.2), cutout (1-2 random holes), random affine translation. Heavy (<100 per class): medium plus mixup (blend two images alpha=0.2), cutmix (patch from another image), RandAugment (automatically selected magnitude from range), grid distortion, elastic transform (non-linear warp), coarse dropout (multiple random regions). For object detection augmentation must be bbox-aware: ensure bounding boxes stay within image after crop, transform with image. Albumentations handles this natively. For segmentation: spatial transforms must apply identically to image and mask. Use same random seed for both. Albumentations: use DualTransform or DualIAATransform. Mosaic augmentation (YOLO-specific): combine 4 images into one — improves small object detection, especially beneficial for datasets with small objects.

### Step 4: Training Configuration
Loss functions: cross-entropy for classification. Focal Loss for detection with class imbalance — gamma=2 focuses on hard examples. Dice loss + BCE for segmentation (hybrid loss handles both overlap and pixel accuracy). CIoU loss for bounding box regression (considers overlap, distance, aspect ratio). Optimizer: AdamW (default for most architectures, decoupled weight decay, better generalization). SGD with momentum (needs more tuning but can reach slightly higher accuracy with proper LR schedule). Learning rate: 1e-4 for AdamW, 1e-2 for SGD (linear scaling rule: base LR for batch_size=256, scale by batch_size/256). Schedule: cosine decay with warmup (best for ViTs and modern CNNs, 5-10% warmup), step decay (multiply by gamma every N epochs, good for ResNets), plateau reduce (reduce LR when metric plateaus, legacy). Label smoothing: epsilon=0.1 prevents overconfidence. Weight decay: 0.01-0.05 for AdamW, 1e-4 for SGD. Batch size: as large as GPU memory allows. Effective batch size matters more than per-GPU.

### Step 5: Evaluation Metrics
Classification: top-1 accuracy, top-5 accuracy (for many classes), per-class F1, confusion matrix, log loss. Detection: mAP@0.5 (PASCAL VOC standard), mAP@0.5:0.95 (COCO standard, average over IoU thresholds 0.5 to 0.95 step 0.05), precision at IoU threshold, recall at max detections. Per-class mAP: identify which classes model struggles with — often tail classes, visually similar classes. Segmentation: mean IoU (mIoU) average over all classes, Dice coefficient (F1 for segmentation), boundary IoU (stricter, penalizes boundary errors), pixel accuracy (less informative for imbalanced). Per-class IoU: identify classes with poor overlap.

### Integration with Deployment Pipeline
Export trained model to ONNX format for cross-platform deployment.
Quantize model to FP16 or INT8 for edge device deployment (Jetson, mobile).
Containerize inference server with Triton Inference Server or TorchServe.
Set up model monitoring for prediction distribution drift and input quality checks.
Implement A/B testing for new model versions with gradual traffic rollout.
Cache preprocessed images to reduce inference latency for repeated inputs.
Log inference results with image hash, model version, and latency for audit trail.

### Step 6: Inference Optimization
Model export: PyTorch -> ONNX (cross-platform), ONNX -> TensorRT (NVIDIA GPU max speed). Quantization: FP16 (2x speed, minimal accuracy loss), INT8 (4x, calibration on 500-1000 samples needed to set scale/zero-point). TensorRT: graph optimization, layer fusion, precision calibration, kernel auto-tuning, dynamic shape support. Batch inference: process multiple images together for max GPU utilization. TorchScript: export for C++ runtime without Python dependency. OpenVINO: Intel CPU optimized inference. NMS optimization: for detection models, use fast NMS (parallel implementation), batched NMS (single op for all classes), or remove NMS entirely (DETR does not need NMS). Model pruning: structured pruning (remove channels/filters) achieves 2x compression with <1% mAP loss. Knowledge distillation: train small student model from large teacher (e.g., YOLOv8n from YOLOv8x).

### Common Pitfalls
Normalizing with wrong mean/std values — ImageNet stats only for ImageNet-pretrained models.
Using different input sizes for training and inference — accuracy degrades from size mismatch.
Training without data augmentation on small datasets — model overfits to training set specifics.
Not using mixed precision training — 2x speedup available with minimal accuracy loss.
Forgetting to set model to eval mode before inference — BatchNorm and Dropout behave differently.
Using excessive NMS IoU threshold — too low removes overlapping detections, too high keeps duplicates.
Training object detectors without mosaic augmentation — worse performance on small objects.

## Rules
- Always normalize with dataset-specific mean/std, not just divide by 255.
- Use the same input size for training and inference — mismatched sizes hurt accuracy.
- Learning rate should scale with batch size: LR = base_LR * (batch_size / base_batch_size).
- Warmup is critical for vision transformers — 5-10% of total steps.
- Monitor training loss curves: loss should decrease smoothly, not oscillate.
- For small datasets (<1000 images), use heavy augmentation and transfer learning.
- COCO pretrained weights are better than ImageNet for detection tasks — use task-relevant pretraining.
- YOLOv8 default anchors work for most datasets — no need to recalculate.
- mAP@0.5:0.95 is the standard metric for detection, not just mAP@0.5.
- Never evaluate on the training set — monitor validation mAP for overfitting.
- Test-time augmentation (horizontal flip, multi-scale) gives 1-3% mAP boost at inference cost.
- Mosaic augmentation improves small object detection but may confuse very small datasets.
- Gradient accumulation simulates larger batch size without increasing memory.
- Mixed precision (AMP) gives ~2x training speedup with negligible accuracy loss.

### Production Monitoring
Track mAP@0.5:0.95 over time on a held-out validation set to detect performance regression.
Monitor inference latency (preprocessing + model + postprocessing) for each endpoint.
Track per-class average precision — detection of specific classes may degrade while overall mAP stays stable.
Monitor input image statistics: resolution, brightness, blur score — drift affects model performance.
Log prediction metadata: class confidences, bounding box counts, inference time for every request.
Set up data drift detection on image embeddings extracted from the model backbone.
Monitor model calibration — confidence scores should match actual accuracy (expected calibration error).

### Troubleshooting Guide
Low mAP on validation → check for overfitting, insufficient augmentation, class imbalance, or learning rate issues.
Model missing small objects → increase input resolution, add mosaic augmentation, use feature pyramid network.
High false positive rate → increase NMS IoU threshold, check for class imbalance, adjust confidence threshold.
Training loss not decreasing → reduce learning rate, check data loading, verify labels, normalize inputs properly.
Out of memory during training → reduce batch size, enable gradient accumulation, use mixed precision, downscale images.
Inference too slow → quantize to FP16/INT8, use TensorRT, reduce model size, batch inference requests.
Augmentation causing label misalignment → use bbox-aware transforms for detection, verify augmentation visually.
Model performs poorly on specific classes → check per-class sample count, add class weighting or focal loss.

### Deployment Checklist
Export model to ONNX or TensorRT format for optimized production inference.
Profile inference on target hardware (CPU/GPU/edge) to validate throughput requirements.
Set confidence threshold based on precision-recall tradeoff for the specific deployment use case.
Implement image preprocessing as part of the inference pipeline, not as a separate step.
Containerize model with preprocessing and post-processing in a single service endpoint.
Set up A/B testing for gradual model version rollout with automatic rollback.
Monitor for adversarial or out-of-distribution inputs using confidence thresholds and embedding distances.
Log model version, preprocessing config, inference time, and detection results for every request.

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
Hand off to ml-experiment-tracking for training runs. For model deployment on edge devices, hand off to devops-ml-serving. For video processing pipelines, use dedicated video-streaming skill.
