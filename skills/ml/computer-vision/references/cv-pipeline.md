# Computer Vision Pipeline

## Image Preprocessing

```python
import cv2
import numpy as np
from typing import Tuple, List

def preprocess_image(
    image: np.ndarray,
    target_size: Tuple[int, int] = (224, 224),
    normalize: bool = True,
    augment: bool = False,
) -> np.ndarray:
    """
    Preprocess image for model input.
    """
    if len(image.shape) == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)

    image = cv2.resize(image, target_size, interpolation=cv2.INTER_LINEAR)

    if augment:
        image = augment_image(image)

    if normalize:
        image = image.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406])
        std = np.array([0.229, 0.224, 0.225])
        image = (image - mean) / std

    return image

def augment_image(image: np.ndarray) -> np.ndarray:
    """Apply data augmentation to image."""
    if np.random.random() > 0.5:
        image = cv2.flip(image, 1)

    angle = np.random.uniform(-10, 10)
    h, w = image.shape[:2]
    matrix = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    image = cv2.warpAffine(image, matrix, (w, h))

    brightness = np.random.uniform(0.9, 1.1)
    image = np.clip(image * brightness, 0, 255).astype(np.uint8)

    return image
```

## Object Detection

```python
import torch
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

def create_object_detection_model(num_classes: int):
    """
    Create Faster R-CNN model for object detection.
    """
    model = fasterrcnn_resnet50_fpn(pretrained=True)

    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)

    return model

def detect_objects(
    model: torch.nn.Module,
    image: torch.Tensor,
    threshold: float = 0.5
) -> List[dict]:
    """
    Run object detection inference.
    """
    model.eval()
    with torch.no_grad():
        predictions = model([image])

    results = []
    for pred in predictions:
        boxes = pred['boxes'].cpu().numpy()
        scores = pred['scores'].cpu().numpy()
        labels = pred['labels'].cpu().numpy()

        for box, score, label in zip(boxes, scores, labels):
            if score >= threshold:
                results.append({
                    'bbox': box.tolist(),
                    'confidence': float(score),
                    'class_id': int(label),
                })

    return results

def non_max_suppression(
    detections: List[dict],
    iou_threshold: float = 0.5
) -> List[dict]:
    """
    Apply Non-Maximum Suppression to remove duplicate detections.
    """
    if not detections:
        return []

    boxes = np.array([d['bbox'] for d in detections])
    scores = np.array([d['confidence'] for d in detections])

    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]

    areas = (x2 - x1 + 1) * (y2 - y1 + 1)
    order = scores.argsort()[::-1]

    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)

        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0, xx2 - xx1 + 1)
        h = np.maximum(0, yy2 - yy1 + 1)
        iou = (w * h) / (areas[i] + areas[order[1:]] - w * h)

        order = order[np.where(iou <= iou_threshold)[0] + 1]

    return [detections[i] for i in keep]
```

## Image Classification Training

```python
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import models

def train_classification_model(
    train_loader: DataLoader,
    val_loader: DataLoader,
    num_classes: int,
    epochs: int = 10,
    lr: float = 0.001,
) -> nn.Module:
    """
    Train image classification model with transfer learning.
    """
    model = models.resnet50(pretrained=True)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.1, patience=3
    )

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        val_loss = validate_model(model, val_loader, criterion, device)
        scheduler.step(val_loss)

        print(f"Epoch {epoch+1}/{epochs}: "
              f"Train Loss: {train_loss/len(train_loader):.4f}, "
              f"Val Loss: {val_loss:.4f}")

    return model
```

## Key Points

- Preprocess images with consistent size and normalization
- Use data augmentation for better generalization
- Apply transfer learning with pretrained models
- Use Faster R-CNN for object detection tasks
- Apply NMS to remove duplicate object detections
- Train with appropriate learning rate scheduling
- Validate model on held-out dataset
- Use mixed precision training for faster training
- Export models to ONNX for production deployment
- Monitor model confidence calibration
- Test on edge cases and adversarial examples
- Document dataset statistics and preprocessing steps
