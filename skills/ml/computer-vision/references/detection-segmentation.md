# Detection & Segmentation

## YOLOv8 (Ultralytics)
```
from ultralytics import YOLO

model = YOLO("yolov8n.pt")  # nano: 3.2M params

results = model.train(data="coco128.yaml", epochs=100, imgsz=640, batch=16,
    lr0=0.01, optimizer="AdamW", augment=True,
    hsv_h=0.015, hsv_s=0.7, hsv_v=0.4, degrees=0.0, translate=0.1,
    scale=0.5, fliplr=0.5, mosaic=1.0, mixup=0.0, patience=50)

metrics = model.val()
print(f"mAP50: {metrics.box.map50:.4f}, mAP50-95: {metrics.box.map:.4f}")

results = model("image.jpg", conf=0.5, iou=0.45)
for r in results:
    for box in r.boxes:
        x1,y1,x2,y2 = box.xyxy[0].tolist()
        print(f"{model.names[int(box.cls[0])]}: {float(box.conf[0]):.2f} at [{x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f}]")

model.export(format="onnx")
```

| Model | Params | mAP50-95 | Speed (T4) | Use |
|-------|--------|----------|------------|-----|
| YOLOv8n | 3.2M | 37.3 | 1.2ms | Edge/mobile |
| YOLOv8s | 11.2M | 44.9 | 1.6ms | Real-time |
| YOLOv8m | 25.9M | 50.2 | 2.4ms | Balanced |
| YOLOv8l | 43.7M | 52.9 | 3.5ms | Accuracy |
| YOLOv8x | 68.2M | 53.9 | 5.2ms | Max accuracy |

## DETR (Detection Transformer)
```
from transformers import DetrImageProcessor, DetrForObjectDetection

processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")

inputs = processor(images=image, return_tensors="pt")
with torch.no_grad():
    outputs = model(**inputs)

results = processor.post_process_object_detection(outputs, threshold=0.5,
    target_sizes=[image.size[::-1]])[0]

for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
    box = [round(i,2) for i in box.tolist()]
    print(f"{model.config.id2label[label.item()]}: {score:.2f} at {box}")
```

DETR removes anchor boxes and NMS. Uses bipartite matching (Hungarian). Simpler pipeline, slower convergence (500 epochs). Variants: Deformable DETR (faster, better small objects), DAB-DETR (dynamic anchors), DN-DETR (denoising).

## Faster R-CNN (Detectron2)
```
from detectron2.config import get_cfg
from detectron2.engine import DefaultTrainer
from detectron2.model_zoo import model_zoo

cfg = get_cfg()
cfg.merge_from_file(model_zoo.get_config_file("COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml"))
cfg.DATASETS.TRAIN = ("my_dataset_train",)
cfg.DATASETS.TEST = ("my_dataset_val",)
cfg.SOLVER.IMS_PER_BATCH = 8
cfg.SOLVER.BASE_LR = 0.001
cfg.SOLVER.MAX_ITER = 10000
cfg.MODEL.ROI_HEADS.NUM_CLASSES = 10
trainer = DefaultTrainer(cfg); trainer.train()
```

Two-stage: RPN proposes regions, ROI head classifies + refines. Slower than YOLO but higher accuracy for small objects. FPN handles multi-scale.

## U-Net (Segmentation)
```
import torch.nn as nn

class UNet(nn.Module):
    def __init__(self, in_c=3, out_c=1, features=[64,128,256,512]):
        super().__init__()
        self.enc = nn.ModuleList()
        self.dec = nn.ModuleList()
        self.pool = nn.MaxPool2d(2)
        for f in features:
            self.enc.append(self._conv(in_c, f)); in_c = f
        for f in reversed(features):
            self.dec.append(nn.ConvTranspose2d(f*2, f, 2, 2))
            self.dec.append(self._conv(f*2, f))
        self.bottleneck = self._conv(features[-1], features[-1]*2)
        self.final = nn.Conv2d(features[0], out_c, 1)

    def _conv(self, in_c, out_c):
        return nn.Sequential(nn.Conv2d(in_c,out_c,3,1,1), nn.BatchNorm2d(out_c),
                             nn.ReLU(), nn.Conv2d(out_c,out_c,3,1,1),
                             nn.BatchNorm2d(out_c), nn.ReLU())

    def forward(self, x):
        skips = []
        for e in self.enc: x = e(x); skips.append(x); x = self.pool(x)
        x = self.bottleneck(x)
        skips = skips[::-1]
        for i in range(0, len(self.dec), 2):
            x = self.dec[i](x); x = torch.cat([x, skips[i//2]], dim=1); x = self.dec[i+1](x)
        return self.final(x)
```

U-Net: symmetric encoder-decoder with skip connections. Variants: Attention U-Net, Residual U-Net, U-Net++.

## SAM (Segment Anything)
```
from segment_anything import sam_model_registry, SamPredictor
sam = sam_model_registry["vit_h"](checkpoint="sam_vit_h_4b8939.pth")
predictor = SamPredictor(sam)
predictor.set_image(image)
masks, scores, logits = predictor.predict(
    point_coords=np.array([[500,375]]),
    point_labels=np.array([1]), multimask_output=True)
```

SAM: zero-shot segmentation with prompts (points, boxes, text). ViT-H backbone (632M parameters). Use as preprocessing then fine-tune.

## Metrics
```
def compute_iou(pred, true):
    inter = np.logical_and(pred, true).sum()
    union = np.logical_or(pred, true).sum()
    return inter/union if union>0 else 0.0
```

## Best Practices
- LR: 1e-3 (YOLO), 1e-4 (Faster R-CNN), 1e-5 (ViT backbones).
- Mosaic augmentation improves small object detection.
- Mixed precision gives ~2x speedup.
- Label smoothing epsilon=0.1 improves generalization.
- NMS IoU threshold: 0.45 for detection.
- Export to ONNX/TensorRT for 2-5x inference speedup.
