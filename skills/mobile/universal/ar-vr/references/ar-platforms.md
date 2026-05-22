# AR Platforms: ARKit vs ARCore

## Overview
ARKit (Apple) and ARCore (Google) are the dominant mobile AR platforms. Both provide plane detection, image tracking, light estimation, and world tracking, but differ in capabilities, device requirements, and ecosystem integration.

## Feature Comparison

| Feature | ARKit (iOS 11+) | ARCore (Android 7+) |
|---|---|---|
| Plane detection | Horizontal, vertical, mesh (LiDAR) | Horizontal, vertical |
| Concurrent image tracking | Up to 100 images | Up to 20 images |
| Face tracking | TrueDepth camera, 52 blend shapes | Front camera, limited shapes |
| World mapping | Persistent ARWorldMap, save/load | Cloud Anchors (requires network) |
| LiDAR support | iPad Pro 2020+, iPhone 12 Pro+ | Limited (select devices with ToF) |
| Environment texturing | Automatic + manual | Manual cubemap |
| Person occlusion | Built-in (A12+) | Requires Depth API |
| Collaboration | ARCollaborationData (multi-peer) | Cloud Anchors (multi-device) |

## Scene Setup

### ARKit (iOS)
```swift
let config = ARWorldTrackingConfiguration()
config.planeDetection = [.horizontal, .vertical]
config.environmentTexturing = .automatic
config.frameSemantics = [.personSegmentationWithDepth, .sceneDepth]
session.run(config, options: [.resetTracking, .removeExistingAnchors])
```

### ARCore (Android)
```kotlin
val config = Config(session)
config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
config.lightEstimationMode = Config.LightEstimationMode.AMBIENT_INTENSITY
session.configure(config)
session.resume()
```

## Anchors
- **Plane anchors**: Track planar surfaces. ARKit auto-merges coplanar planes; ARCore exposes subsume events.
- **Image anchors**: Detect 2D image targets. Requires reference images with known physical size.
- **Object anchors**: ARKit can detect scanned 3D objects; ARCore uses Cloud Anchors for shared reference.
- **Face anchors**: ARKit provides 52 blend shape coefficients for facial expression tracking.

## Lighting
ARKit provides `ARLightEstimate` (ambient intensity, color temperature) and environment probes for reflections. ARCore provides `LightEstimate` with ambient intensity and color correction. For realistic rendering, sample environment probe at anchor position and update directional light to match estimated main light direction.

## Key Points
- ARKit offers richer features (LiDAR, persistent maps, person occlusion) but is iOS-only
- ARCore has wider device reach but fewer concurrent image targets
- Always check device capability before configuring AR session
- Use ARFoundation (Unity) or platform abstraction layer for cross-platform apps
