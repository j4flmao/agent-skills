# AR/VR Fundamentals

## What is Mobile AR/VR?

Augmented Reality (AR) overlays digital content onto the real world through the device camera. Virtual Reality (VR) immerses the user in a fully digital environment. Mobile AR uses the phone's camera, sensors, and processor — no headset required for basic AR. Mobile VR typically requires a headset (Meta Quest, Apple Vision Pro).

## Core Concepts

### AR Session
The runtime environment managing camera feed, sensor data, and virtual content. Created when AR starts, paused on interruption, resumed on continuation.

### Tracking
The system's ability to understand device position and orientation in 3D space. 6DOF (Six Degrees of Freedom) tracks rotation (pitch, yaw, roll) and position (x, y, z).

### Anchor
A fixed point in the AR world where virtual content is placed. Can be plane-based, image-based, or object-based. Anchors maintain position as the device moves.

### Plane Detection
The system identifies horizontal (floor, table) and vertical (wall) surfaces in the camera view. Used for realistic object placement.

### Feature Point
Distinct visual features (corners, edges, textures) the system tracks to understand spatial position. More feature points = better tracking.

### Light Estimation
The system analyzes ambient lighting from the camera feed to match virtual object lighting to the real environment (intensity, color temperature, shadows).

## Platform Comparison

| Capability | ARKit (iOS) | ARCore (Android) |
|-----------|-------------|------------------|
| Min device | iPhone 6s, iOS 11 | Android 7, Google Play Services for AR |
| Tracking | Visual-inertial odometry | Visual-inertial odometry |
| Plane detection | Horizontal, vertical, mesh | Horizontal, vertical |
| Image tracking | Up to 100 concurrent | Up to 20 concurrent |
| Face tracking | TrueDepth (iPhone X+) | Front camera |
| Environment texturing | Automatic + manual | Environmental HDR |
| LiDAR | iPad Pro 2020+, iPhone 12 Pro+ | Select Android devices |
| World map persistence | ARWorldMap | Cloud Anchors |
| 3D model format | USDZ native | glTF + OBJ |

## AR Session Lifecycle

```
start() -> Initializing -> Tracking.Normal -> Tracking.Limited -> Interrupted -> Paused -> stopped
```

### States
1. **Initializing** — Camera starting, sensors calibrating (1-3 seconds)
2. **Tracking.Normal** — Full 6DOF tracking working
3. **Tracking.Limited** — Poor conditions (low light, featureless surfaces). Reasons: excessive motion, insufficient features, relocalizing, initializing
4. **Interrupted** — App backgrounded, incoming call — session paused
5. **Paused** — Manually paused by app

## 3D Model Pipeline

### Format Selection
| Format | Use Case | Pros | Cons |
|--------|----------|------|------|
| USDZ | iOS native | Animation, materials, Apple ecosystem | iOS only |
| glTF 2.0 | Cross-platform | Broader tool support, Draco compression | No native iOS ARKit support |
| OBJ | Legacy | Universal support | Large file, no animation |
| FBX | Authoring only | Rich tool support | Not for runtime |

### Optimization Steps
1. Decimate polygons (target: <100k per model)
2. Generate LOD levels (100%, 50%, 25%)
3. Compress with Draco (glTF) or USDZ export with compression
4. Create texture atlas (max 1024x1024 per texture)
5. Use ASTC (iOS) or ETC2 (Android) compressed textures
6. Bundle total: <50MB for all scene models

## Interaction Patterns

### Placement
1. User taps screen -> hit-test raycast against detected planes
2. Show ghost preview at projected location (semi-transparent, follows finger)
3. On tap confirmation -> place anchor at hit position
4. Play medium-impact haptic + scale-in animation

### Manipulation
- **Rotate**: One-finger swipe around object center
- **Scale**: Two-finger pinch (uniform or axis-locked)
- **Drag**: Long-press + move (object follows ground plane)

### Selection
- Tap to select: bounding box highlight + glow
- Double-tap for context menu: actions, info, delete
- Selection ring animation: 0.3s ease-in-out

## Performance Budget

| Metric | iOS ARKit Target | Android ARCore Target |
|--------|-----------------|----------------------|
| Frame rate | 60fps | 60fps |
| Model memory | <200MB peak | <200MB peak |
| Draw calls | <100 per frame | <100 per frame |
| Poly count per model | <100k | <100k |
| Scene total polys | <300k | <300k |
| Texture resolution | 1024x1024 max | 1024x1024 max |
| Load time per model | <2s | <2s |
| Battery drain | <500mW | <500mW |
| Baseline memory | ~200MB | ~180MB |
| Total app memory | <500MB | <450MB |

## Required Permissions

### iOS Info.plist
```xml
<key>NSCameraUsageDescription</key>
<string>Camera needed for AR experiences</string>
```

### Android Manifest
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera.ar" android:required="true" />
```
