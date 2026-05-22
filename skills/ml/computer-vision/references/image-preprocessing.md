# Image Preprocessing & Augmentation

## OpenCV Basics
```
import cv2, numpy as np

img = cv2.imread("image.jpg")  # BGR, shape (H, W, 3)
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
resized = cv2.resize(img, (224, 224), interpolation=cv2.INTER_LINEAR)
# INTER_LINEAR (default), INTER_CUBIC (smoother), INTER_AREA (downscale), INTER_NEAREST (masks)

def letterbox(im, new_shape=(640,640), color=(114,114,114)):
    shape = im.shape[:2]; r = min(new_shape[0]/shape[0], new_shape[1]/shape[1])
    new_unpad = (int(round(shape[1]*r)), int(round(shape[0]*r)))
    dw, dh = (new_shape[1]-new_unpad[0])//2, (new_shape[0]-new_unpad[1])//2
    im = cv2.resize(im, new_unpad, interpolation=cv2.INTER_LINEAR)
    return cv2.copyMakeBorder(im, dh, dh+(new_shape[0]-new_unpad[1])%2,
        dw, dw+(new_shape[1]-new_unpad[0])%2, cv2.BORDER_CONSTANT, value=color)

# Normalize
mean, std = np.array([0.485, 0.456, 0.406]), np.array([0.229, 0.224, 0.225])
img_norm = (img.astype(np.float32)/255.0 - mean) / std
```

### Image Operations
```
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# Geometric
M = cv2.getRotationMatrix2D((cx,cy), angle=30, scale=1.0)
rotated = cv2.warpAffine(img, M, (w,h))

# Blur
blur = cv2.GaussianBlur(img, (5,5), sigmaX=1.5)

# Edge detection
edges = cv2.Canny(img, 50, 150)

# Thresholding
_, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

# Morphological
kernel = np.ones((5,5), np.uint8)
eroded = cv2.erode(binary, kernel, iterations=1)
dilated = cv2.dilate(binary, kernel, iterations=1)
```

## Albumentations
```
import albumentations as A
from albumentations.pytorch import ToTensorV2

train_transform = A.Compose([
    A.Resize(224, 224),
    A.HorizontalFlip(p=0.5),
    A.Rotate(limit=15, p=0.5),
    A.RandomBrightnessContrast(brightness_limit=0.2, contrast_limit=0.2, p=0.5),
    A.HueSaturationValue(hue_shift_limit=20, sat_shift_limit=30, val_shift_limit=20, p=0.3),
    A.GaussNoise(var_limit=(10.0, 50.0), p=0.2),
    A.CoarseDropout(max_holes=8, max_height=32, max_width=32, fill_value=0, p=0.3),
    A.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]),
    ToTensorV2(),
])

val_transform = A.Compose([
    A.Resize(224, 224),
    A.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]),
    ToTensorV2(),
])

# Bounding box aware
bbox_transform = A.Compose([
    A.Resize(640, 640),
    A.HorizontalFlip(p=0.5),
    A.RandomSizedBBoxSafeCrop(height=640, width=640, p=0.5),
    A.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1, p=0.5),
    A.Normalize(mean=[0,0,0], std=[1,1,1]),
], bbox_params=A.BboxParams(format="yolo", label_fields=["class_labels"]))

augmented = train_transform(image=img, mask=mask)
aug_img, aug_mask = augmented["image"], augmented["mask"]
```

## Augmentation Techniques
| Technique | Type | Effect | When to Use |
|-----------|------|--------|-------------|
| HorizontalFlip | Geometric | Mirror | Always (unless direction matters) |
| Rotate | Geometric | Rotation | Any orientation objects |
| RandomCrop | Geometric | Focus on parts | Large images, small objects |
| ColorJitter | Color | Lighting variation | Uncontrolled lighting |
| GaussNoise | Noise | Sensor noise simulation | Low-light images |
| CoarseDropout | Occlusion | Random holes | Occluded objects |
| Mixup | Mixed | Blend two images | Regularization |
| CutMix | Mixed | Patch from another | Detection, classification |
| Mosaic | Mixed | Four images tiled | YOLO, small objects |
| RandAugment | Auto | Random magnitude | Auto augmentation |

## PyTorch Augmentation
```
from torchvision import transforms

train_tf = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.08,1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    transforms.RandomRotation(15),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]),
    transforms.RandomErasing(p=0.2),
])
```

## Test-Time Augmentation (TTA)
```
def tta_predict(model, image, transforms, device):
    preds = []
    for t in transforms:
        aug = t(image=image)["image"].unsqueeze(0).to(device)
        with torch.no_grad(): preds.append(model(aug))
    return torch.stack(preds).mean(dim=0)
```

## Best Practices
- Always normalize to ImageNet stats when using pretrained models.
- Use letterbox resize for detection, center crop for classification.
- Albumentations is faster than torchvision for complex pipelines.
- Heavy augmentation for small datasets (10x effective dataset size).
- No augmentation at test time except normalization.
- Visualize augmented images to verify transforms preserve semantics.
- Cache preprocessed images for large datasets.
- Profile preprocessing throughput — often the training bottleneck.
