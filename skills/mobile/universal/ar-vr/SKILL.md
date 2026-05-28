---
name: mobile-ar-vr
description: >
  Use this skill when the user says 'AR', 'VR', 'augmented reality', 'virtual reality', 'ARKit', 'ARCore', 'Unity AR', '3D rendering', 'SceneView', 'AR scene', 'AR interaction', 'AR performance'. This skill enforces: platform-specific AR configuration (ARKit vs ARCore), scene setup with anchor management, optimal 3D model handling with LODs and compression, interaction patterns for gesture and placement, performance budgets (<60fps, <200MB), and VR integration considerations. Do NOT use for: general mobile UI/UX design, game engine tutorials unrelated to AR/VR, or 3D modeling software usage instructions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, universal, ar-vr, phase-10]
---

# Mobile AR/VR Development

## Purpose
Design and implement AR/VR experiences for mobile platforms with platform-aware setup, optimized 3D content, intuitive interaction patterns, and performance within device constraints.

## Agent Protocol

### Trigger
"AR", "VR", "augmented reality", "virtual reality", "ARKit", "ARCore", "Unity AR", "3D rendering", "SceneView", "AR scene", "AR interaction", "AR performance", "AR placement", "AR anchor", "AR lighting", "AR tracking", "AR model", "AR filter", "AR face tracking", "AR image tracking", "AR plane detection".

### Input Context
- Target platforms (iOS only, Android only, or cross-platform)
- AR/VR feature requirements (plane detection, image tracking, face tracking, world mapping)
- 3D assets available and their formats (USDZ, glTF, FBX, OBJ)
- Performance targets (target FPS, memory budget, battery impact)
- Interaction model (tap placement, drag rotation, gesture-driven)

### Output Artifact
AR/VR integration plan with platform selection, scene architecture, anchor management strategy, 3D model pipeline, interaction model, and performance budget.

### Response Format
```
AR Integration Plan
Platform: {iOS/Android/Both}
Framework: {ARKit/ARCore/Unity}
Scene Setup: {config}
Anchor Strategy: {type + lifecycle}
3D Pipeline: {format + LOD + compression}
Interaction Model: {gesture set + feedback}
Performance Budget: {FPS target, memory cap}
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Platform selected with fallback strategy for unsupported devices
- [ ] Scene configured with session management and tracking
- [ ] 3D model pipeline defined with format, compression, and LOD strategy
- [ ] Interaction patterns chosen with haptic/visual feedback
- [ ] Performance budget documented with measurement approach
- [ ] VR considerations addressed if applicable

### Max Response Length
300 lines

## Architecture / Decision Trees

### AR Framework Decision Tree

```
Is the app cross-platform (iOS + Android)?
├── Yes → Use ARFoundation (Unity) or SceneView (React Native / Flutter)
│   ├── Unity project? → ARFoundation with ARCore/ARKit XR Plugins
│   └── React Native / Flutter? → SceneView / ar_flutter_plugin
├── iOS only → ARKit (native Swift) — best iOS experience
└── Android only → ARCore (native Kotlin/Java)

Does the app need LiDAR features?
├── Yes → ARKit (LiDAR on iOS), ARCore Depth API (limited Android)
└── No → Any framework works
```

### Tracking Configuration Decision

```
What type of AR tracking is needed?
├── World tracking (object placement on surfaces)
│   ├── Indoor → ARWorldTrackingConfiguration + plane detection
│   └── Outdoor → GPS + ARKit GeoTracking / ARCore + VPS
├── Image tracking (detect 2D images)
│   └── ARImageTrackingConfiguration / Augmented Images
├── Face tracking (AR filters, masks)
│   └── ARFaceTrackingConfiguration (iOS TrueDepth) / ARCore Augmented Faces
├── Body tracking (motion capture)
│   └── ARBodyTrackingConfiguration (iOS A12+) / ARCore 3D Body
└── Object scanning (3D object recognition)
    └── ARObjectScanningConfiguration / ARCore Cloud Anchors
```

### 3D Model Format Decision

```
Need animation support?
├── Yes → glTF 2.0 (cross-platform best choice)
│   └── Also supports: USDZ (iOS native with animation)
├── Need Draco compression?
│   ├── Yes → glTF with Draco (smallest file size)
│   └── No → glTF (universal) or USDZ (iOS only)
└── Static models only
    └── glTF or OBJ (simple, large files)
```

## Workflow

### Step 1: Platform Selection
ARKit (iOS 11+): A12 Bionic or later for LiDAR, ARWorldTrackingConfiguration for 6DOF, ARImageTrackingConfiguration for image targets, ARFaceTrackingConfiguration for face AR. ARCore (Android 7+): Google Play Services for AR, supported devices list at developers.google.com/ar/devices, Depth API for occlusion, Augmented Images for image tracking. Cross-platform: use ARFoundation (Unity) or SceneView (React Native / Flutter).

| Capability | ARKit | ARCore |
|---|---|---|
| Plane detection | Horizontal + vertical + LiDAR mesh | Horizontal + vertical |
| Image tracking | Concurrent, up to 100 images | Up to 20 images |
| Face tracking | TrueDepth camera (iPhone X+) | Front camera, less precise |
| World mapping | Persistent via ARWorldMap | Cloud Anchors |
| LiDAR support | iPad Pro 2020+, iPhone 12 Pro+ | Select Android devices |

### Step 2: Scene Setup
Configure ARSession. For world tracking: set `ARWorldTrackingConfiguration` (iOS) or `Config` with `PlaneFindingMode` (Android). Enable auto-focus, ambient light estimation, and environment texturing. Handle session interruptions.

```
ARSession
├── Configuration
│   ├── Plane detection (horizontal | vertical | both | none)
│   ├── Light estimation (ambient intensity, color temperature)
│   ├── Environment texturing (manual | automatic)
│   └── Frame semantics (depth, person segmentation)
├── Anchors
│   ├── Plane anchors (ARPlaneAnchor / Plane)
│   ├── Image anchors (ARImageAnchor / AugmentedImage)
│   └── Object anchors (ARObjectAnchor / CloudAnchor)
└── State management
    ├── Running → Paused → Running
    ├── Limited tracking → Recovery prompt
    └── Authorization denied → Fallback
```

### Step 3: 3D Model Handling
Preferred formats: USDZ (iOS native, animation + materials), glTF 2.0 (cross-platform, Draco compression). Model pipeline: source → optimize (decimate to target poly count) → compress (Draco for glTF) → LOD generation (3 levels at 100%, 60%, 30% detail) → bundle. Texture atlas: combine textures, max 1024x1024 for mobile, ASTC (iOS) or ETC2 (Android).

### Step 4: Interaction Patterns
Placement: hit-test against detected planes (raycast), show ghost preview, confirm placement with haptic + animation. Manipulation: one-finger rotate, two-finger scale, long-press drag. Selection: tap to select (visual highlight + bounding box), double-tap for context menu. Feedback: light impact for selection, medium for placement, ripple animation, glow effect.

### Step 5: Performance Optimization
GPU instancing for repeated objects. Occlusion culling (LiDAR depth on iOS, Depth API on Android). Limit tracked images to 10 max. Batch ARAnchor operations. LOD switching based on camera distance. Profile with Xcode SceneKit debugger or Android GPU Inspector.

### Step 6: VR Integration
VR requires dedicated headset (Meta Quest, Apple Vision Pro). Mobile VR is primarily ARKit or Unity VR build. For Vision Pro: RealityKit, SwiftUI with volumetric windows, immersive spaces. AR: 60fps. VR: 72fps minimum (90fps preferred) to prevent motion sickness.

## Common Pitfalls

### Pitfall 1: Not Checking Device Capability
Running AR features on unsupported devices crashes the app. Always check `ARConfiguration.isSupported` (iOS) or `ArCoreApk.checkAvailability` (Android) before activating AR.

### Pitfall 2: Hardcoding Tracking Configurations
Setting a fixed tracking configuration without handling runtime failures. Always monitor session state changes and provide user recovery prompts for limited tracking.

### Pitfall 3: Loading Uncompressed 3D Models
Shipping raw OBJ or FBX files in production bundles. These are 5-10x larger than compressed glTF or USDZ, causing long load times and memory pressure.

### Pitfall 4: Creating Anchors Every Frame
Adding ARAnchors in the update loop creates anchor overload, degrading tracking quality. Batch anchor operations and reuse existing anchors when possible.

### Pitfall 5: No LOD Strategy
Rendering full-detail models at every distance wastes GPU resources. Three LOD levels reduce draw calls by up to 60%.

### Pitfall 6: Ignoring Battery Impact
AR sessions consume significant battery power (camera + sensors + rendering). Monitor battery level and reduce rendering quality when battery is low.

### Pitfall 7: Testing Only on Simulator
AR performance on simulators/emulators bears no relation to real-device performance. Test on real devices with varied lighting, surfaces, and motion conditions.

## Best Practices

- Check AR capability at app launch, provide graceful fallback (2D mode, web-based AR).
- Use ARWorldTrackingConfiguration for 6DOF tracking, with plane detection enabled.
- Set environment texturing to automatic for realistic lighting.
- Implement session interruption handlers with state recovery.
- Compress all 3D models — target <50MB total for all models in a scene.
- Generate 3 LOD levels per model at 100%, 50%, 25% detail.
- Use texture atlases to reduce draw calls — combine multiple textures into one.
- Implement hit-testing with raycast for accurate placement.
- Provide visual + haptic feedback for every user action.
- Test on real devices with varied conditions: bright sunlight, dim interiors, textured surfaces.
- Remove unused anchors — limit active anchors to 50 maximum.
- Use GPU instancing for repeated objects (e.g., furniture in a room).

## Compared With

### ARKit vs ARCore
ARKit offers better tracking quality and more features (LiDAR, face tracking, world maps). ARCore has broader device support but fewer advanced features. Choose ARKit for iOS-only, ARFoundation for cross-platform.

### ARKit vs ARFoundation
ARFoundation wraps both ARKit and ARCore in Unity's API. Native ARKit provides more control and better performance. Use ARFoundation for cross-platform Unity projects. Use native ARKit for iOS-only apps needing maximum performance.

### SceneView (React Native) vs ARFoundation (Unity)
SceneView is lighter weight for React Native apps but has fewer features. ARFoundation provides full AR capabilities but requires Unity. Choose based on existing tech stack.

### Mobile AR vs VR
Mobile AR leverages the device camera for real-world overlay. VR creates fully immersive environments. AR is accessible (no headset required) but limited by field of view. VR provides full immersion but requires dedicated hardware.

## Performance Considerations

- Target 60fps for all AR experiences. Dropping below 30fps causes user discomfort.
- Model memory budget: <200MB total at peak for all loaded models.
- Draw calls: <100 per frame. Use instancing and texture atlases.
- Poly count: <100k per model, <300k total per scene.
- Load time: <2s per model. Show loading indicator if longer.
- Texture resolution: max 1024x1024 for mobile. Use compressed formats (ASTC, ETC2).
- Battery: AR session consumes 300-500mW. Optimize render frequency when battery <20%.
- Memory: ARKit uses ~200MB baseline. Total app memory should stay under 500MB.
- Thermal: Sustained AR usage can trigger thermal throttling. Reduce quality after 10 minutes.

## Rules
- Always detect device AR capability before activating AR features. Provide graceful fallback.
- Never hardcode tracking configurations. Handle session state changes.
- All 3D models must use compressed formats. No raw OBJ or FBX in production.
- Performance budget is mandatory. Document FPS, memory, and poly count targets.
- Anchor management: remove unused anchors, limit active anchors to 50.
- Interaction feedback every action: visual + haptic for every user gesture.
- Test on real devices. Never rely solely on emulator/simulator AR performance.
- Generate LODs for all models. Minimum 3 levels.
- Use GPU instancing for repeated objects.
- Handle camera authorization denial with clear user messaging.
- Implement battery-aware rendering quality adjustment.

## References
- `references/ar-core-arkit.md` — ARCore vs ARKit Developer Guide
- `references/ar-patterns.md` — AR/VR Interaction Patterns
- `references/ar-platforms.md` — AR Platforms: ARKit vs ARCore
- `references/arcore-implementation.md` — ARCore Implementation
- `references/arkit-implementation.md` — ARKit Implementation
- `references/vr-development.md` — Mobile VR Development
- `references/ar-vr-rendering-performance.md` — Rendering optimization for AR/VR on mobile
- `references/ar-vr-interaction-design.md` — Interaction design patterns for AR/VR experiences

## Handoff
`mobile/universal/testing` for AR testing strategy (real device, varied lighting, occlusion scenarios)
`mobile/universal/performance` for profiling AR-specific performance metrics
