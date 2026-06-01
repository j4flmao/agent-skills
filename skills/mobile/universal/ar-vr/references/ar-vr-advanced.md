# Advanced AR/VR Patterns

## LiDAR-Enhanced Features

On devices with LiDAR scanners (iPad Pro 2020+, iPhone 12 Pro+), ARKit provides enhanced capabilities:

### Instant Placement
No plane detection delay — LiDAR provides immediate depth mesh. Objects can be placed as soon as the session starts.

### Scene Reconstruction
`ARObjectScanningConfiguration` captures 3D scans of real objects using LiDAR depth data. Mesh resolution up to 5mm. Output as `.arobject` file for recognition.

### People Occlusion
`personSegmentationWithDepth` frame semantic provides pixel-accurate person masks with depth. Virtual objects can render behind people naturally.

### Raycasting
`raycast(_:query:)` with `existingPlaneGeometry` uses LiDAR mesh for instant, accurate hit-testing without waiting for plane detection.

### Motion Capture
`ARBodyTrackingConfiguration` captures full body movement (A12+). Tracks 18 joints including head, neck, shoulders, elbows, wrists, hips, knees, ankles.

## Custom Shaders & Materials

For unique visual effects beyond standard materials:

### Metal Shaders (iOS)
```metal
#include <metal_stdlib>
using namespace metal;

struct VertexOut {
    float4 position [[position]];
    float2 uv;
};

fragment float4 hologramShader(VertexOut in [[stage_in]],
                               texture2d<float> baseTexture [[texture(0)]],
                               constant float &time [[buffer(0)]]) {
    constexpr sampler s;
    float4 color = baseTexture.sample(s, in.uv);
    // Scanline effect
    float scanline = sin(in.uv.y * 200.0 + time * 2.0) * 0.5 + 0.5;
    color.rgb *= mix(0.6, 1.0, scanline);
    // Flicker
    color.a *= 0.9 + 0.1 * sin(time * 3.0);
    // Fresnel glow at edges
    return color;
}
```

### GPU Compute for Point Clouds
Process LiDAR depth data as point clouds for custom visualization:
1. Sample depth buffer at grid intervals (every 4th pixel)
2. Convert depth + camera intrinsics to world-space positions
3. Render as point sprites with size based on distance
4. Color by height (z-axis) for terrain visualization
5. Update at 30fps max to avoid GPU saturation

## Cloud Anchors & Persistence

### ARKit World Map
```swift
// Host
func shareWorldMap() {
    session.getCurrentWorldMap { worldMap, error in
        guard let worldMap = worldMap else { return }
        if let data = try? NSKeyedArchiver.archivedData(withRootObject: worldMap, requiringSecureCoding: true) {
            network.sendWorldMap(data)  // Send to other devices
        }
    }
}

// Resolve
func loadWorldMap(_ data: Data) {
    guard let worldMap = try? NSKeyedUnarchiver.unarchivedObject(ofClass: ARWorldMap.self, from: data) else {
        return
    }
    let config = ARWorldTrackingConfiguration()
    config.initialWorldMap = worldMap
    session.run(config, options: [.resetTracking, .removeExistingAnchors])
}
```

### ARCore Cloud Anchons
```kotlin
// Host
val cloudAnchor = session.hostCloudAnchorAsync(anchor, ttlDays = 7)
cloudAnchor.addListener {
    if (cloudAnchor.cloudAnchorState == CloudAnchorState.SUCCESS) {
        val cloudAnchorId = cloudAnchor.cloudAnchorId
        shareCloudAnchorId(cloudAnchorId)
    }
}

// Resolve
val resolvedAnchor = session.resolveCloudAnchorAsync(cloudAnchorId)
```

## Hand Tracking

### iOS Hand Tracking (ARKit 6+)
`ARHandTrackingConfiguration` tracks up to 2 hands with 27 joints each (4 fingers * 3 joints + thumb * 3 + wrist). Use for gesture recognition: pinching, pointing, grabbing, thumbs up, wave. Frame semantics: `.handTracking` at 60fps with 2 hands.

### Android Hand Tracking
ARCore's Hand Tracking via Depth API + ML Kit. Less precise than LiDAR hand tracking. Use for simple gestures: wave detection, palm open/close. Frame rate 15-30fps depending on device.

## VR-Specific Considerations

### Motion Sickness Prevention
- Maintain 72fps minimum (90fps preferred)
- Reduce field of view during movement (vignette effect)
- Use teleportation over smooth locomotion
- Keep a fixed horizon reference point
- Match latency <20ms head-to-display
- Reduce camera acceleration/deceleration

### Apple Vision Pro (VisionOS)
- Use RealityKit for 3D content rendering
- SwiftUI for 2D UI in volumetric windows
- ImmersiveSpace for full AR/VR experiences
- Hand tracking + eye tracking input
- Persona for shared experiences
- 3D model format: USDZ (native)

### Meta Quest (Standalone VR)
- Unity or Unreal Engine for rendering
- OpenXR standard API
- 6DOF tracking via inside-out cameras
- Touch controllers for interaction
- Passthrough AR for mixed reality
- Target: 90fps, <5ms motion-to-photon latency
