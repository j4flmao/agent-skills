# Image Segmentation

## Semantic Segmentation

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class UNet(nn.Module):
    """U-Net architecture for semantic segmentation."""

    def __init__(self, in_channels: int = 3, out_channels: int = 1):
        super().__init__()

        self.encoder1 = self.conv_block(in_channels, 64)
        self.encoder2 = self.conv_block(64, 128)
        self.encoder3 = self.conv_block(128, 256)
        self.encoder4 = self.conv_block(256, 512)

        self.bottleneck = self.conv_block(512, 1024)

        self.upconv4 = nn.ConvTranspose2d(1024, 512, kernel_size=2, stride=2)
        self.decoder4 = self.conv_block(1024, 512)
        self.upconv3 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
        self.decoder3 = self.conv_block(512, 256)
        self.upconv2 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.decoder2 = self.conv_block(256, 128)
        self.upconv1 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.decoder1 = self.conv_block(128, 64)

        self.final = nn.Conv2d(64, out_channels, kernel_size=1)

    def conv_block(self, in_ch: int, out_ch: int) -> nn.Sequential:
        return nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        e1 = self.encoder1(x)
        e2 = self.encoder2(F.max_pool2d(e1, 2))
        e3 = self.encoder3(F.max_pool2d(e2, 2))
        e4 = self.encoder4(F.max_pool2d(e3, 2))

        b = self.bottleneck(F.max_pool2d(e4, 2))

        d4 = self.upconv4(b)
        d4 = torch.cat([d4, e4], dim=1)
        d4 = self.decoder4(d4)
        d3 = self.upconv3(d4)
        d3 = torch.cat([d3, e3], dim=1)
        d3 = self.decoder3(d3)
        d2 = self.upconv2(d3)
        d2 = torch.cat([d2, e2], dim=1)
        d2 = self.decoder2(d2)
        d1 = self.upconv1(d2)
        d1 = torch.cat([d1, e1], dim=1)
        d1 = self.decoder1(d1)

        return self.final(d1)
```

## Segmentation Training

```python
import torch.optim as optim
from torch.utils.data import DataLoader
import numpy as np

def dice_loss(pred: torch.Tensor, target: torch.Tensor, smooth: float = 1.0) -> torch.Tensor:
    """Dice loss for segmentation."""
    pred = torch.sigmoid(pred)
    intersection = (pred * target).sum()
    union = pred.sum() + target.sum()
    return 1 - (2.0 * intersection + smooth) / (union + smooth)

def combined_loss(pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """Combined BCE and Dice loss."""
    bce = F.binary_cross_entropy_with_logits(pred, target)
    dice = dice_loss(pred, target)
    return bce + dice

def compute_iou(pred: torch.Tensor, target: torch.Tensor, threshold: float = 0.5) -> float:
    """Compute Intersection over Union."""
    pred_binary = (torch.sigmoid(pred) > threshold).float()
    intersection = (pred_binary * target).sum().item()
    union = (pred_binary + target).clamp(0, 1).sum().item()
    return intersection / union if union > 0 else 0.0

def train_segmentation_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    epochs: int = 50,
    lr: float = 0.001,
) -> nn.Module:
    """Train segmentation model."""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    optimizer = optim.Adam(model.parameters(), lr=lr)

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0

        for images, masks in train_loader:
            images, masks = images.to(device), masks.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = combined_loss(outputs, masks)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        model.eval()
        val_iou = 0.0
        with torch.no_grad():
            for images, masks in val_loader:
                images, masks = images.to(device), masks.to(device)
                outputs = model(images)
                val_iou += compute_iou(outputs, masks)

        print(f"Epoch {epoch+1}: Loss={train_loss/len(train_loader):.4f}, "
              f"Val IoU={val_iou/len(val_loader):.4f}")

    return model
```

## Post-Processing

```python
from scipy import ndimage
from skimage import measure, morphology

def postprocess_segmentation(
    mask: np.ndarray,
    min_object_size: int = 50,
    smoothing_radius: int = 2,
) -> np.ndarray:
    """
    Post-process segmentation mask.
    """
    binary = mask > 0.5

    smoothed = ndimage.gaussian_filter(binary.astype(float), smoothing_radius)
    smoothed = smoothed > 0.5

    cleaned = morphology.remove_small_objects(
        smoothed, min_size=min_object_size
    )

    labeled = measure.label(cleaned)
    return labeled

def extract_contours(
    labeled_mask: np.ndarray
) -> List[np.ndarray]:
    """Extract contours from labeled segmentation mask."""
    contours = []
    for region_id in range(1, labeled_mask.max() + 1):
        binary = (labeled_mask == region_id).astype(np.uint8)
        contour = measure.find_contours(binary, level=0.5)
        contours.extend(contour)
    return contours

def compute_segmentation_metrics(
    pred: np.ndarray,
    target: np.ndarray,
) -> dict:
    """Compute comprehensive segmentation metrics."""
    pred_binary = pred > 0.5
    target_binary = target > 0.5

    intersection = np.logical_and(pred_binary, target_binary).sum()
    union = np.logical_or(pred_binary, target_binary).sum()
    iou = intersection / union if union > 0 else 0

    dice = 2 * intersection / (pred_binary.sum() + target_binary.sum())

    return {
        'iou': float(iou),
        'dice': float(dice),
        'pixel_accuracy': float(np.mean(pred_binary == target_binary)),
    }
```

## Key Points

- Use U-Net architecture for semantic segmentation
- Combine BCE and Dice loss for better training
- Compute IoU metric for segmentation evaluation
- Apply post-processing to clean up predictions
- Remove small objects below minimum size threshold
- Extract contours for shape analysis
- Use data augmentation for segmentation data
- Handle class imbalance with weighted loss
- Validate on diverse test cases
- Use CRF post-processing for boundary refinement
- Test on edge cases and ambiguous boundaries
- Visualize predictions for qualitative assessment
