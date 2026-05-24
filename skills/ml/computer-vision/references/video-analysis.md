# Video Analysis

## Object Tracking

| Tracker | Type | Speed | Accuracy | Use Case |
|---------|------|-------|----------|----------|
| DeepSORT | Detection-based | 30+ FPS | High | General tracking |
| ByteTrack | Detection-based | 50+ FPS | High | Crowded scenes |
| BoT-SORT | Detection-based | 25 FPS | Very High | Multi-camera |
| OC-SORT | Detection-based | 40 FPS | High | Occlusion handling |
| StrongSORT | Detection-based | 25 FPS | Very High | Benchmark SOTA |
| FairMOT | Joint detection+tracking | 25 FPS | High | Real-time |

```python
# ByteTrack example
from yolox.tracker import ByteTracker

tracker = ByteTracker(
    track_thresh=0.6,
    track_buffer=30,
    match_thresh=0.8,
    frame_rate=30
)

for frame in video:
    detections = model(frame)  # y_pred: [x1,y1,x2,y2,score,class]
    tracked_objects = tracker.update(detections, frame.shape)
    for obj in tracked_objects:
        x1, y1, x2, y2, track_id, class_id = obj
        # track_id persists across frames
```

## Action Recognition

| Model | Input | Use Case |
|-------|-------|----------|
| SlowFast | Sparse high-res + Dense low-res frames | General action recognition |
| 3D CNNs (I3D, C3D) | Video clips | Spatiotemporal features |
| VideoMAE | Masked video modeling | Self-supervised pretraining |
| TimeSformer | Space-time attention | Long-range dependencies |
| MViT | Multiscale vision transformers | SOTA benchmarks |

## Video Preprocessing

```python
import cv2
import numpy as np

def preprocess_video(video_path, target_fps=30, target_size=(224, 224)):
    cap = cv2.VideoCapture(video_path)
    original_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(original_fps / target_fps)
    
    frames = []
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            frame = cv2.resize(frame, target_size)
            frames.append(frame)
        frame_idx += 1
    cap.release()
    return np.array(frames)
```

## Video Compressed Domain Processing

| Technique | Speed | Information |
|-----------|-------|-------------|
| Motion vectors | Real-time | Object motion, no pixel data |
| Compressed domain features | Real-time | Scene change, motion magnitude |
| I-frame only | Fast | Keyframe analysis |
| H.264/H.265 parsing | Very fast | Motion, macroblocks |
| HEVC features | Fast | Partition structure, MV |

## Deployment on Edge

| Device | Model | FPS | Power |
|--------|-------|-----|-------|
| NVIDIA Jetson Orin | YOLOv8 + DeepSORT | 60+ | 15-40W |
| NVIDIA Jetson Xavier | YOLOv8 + ByteTrack | 30+ | 10-30W |
| Google Coral | MobileNet SSD | 30 | 2W |
| Raspberry Pi 5 | Tiny YOLO | 10-15 | 5W |
| Intel Movidius | OpenVINO models | 20+ | 1W |
