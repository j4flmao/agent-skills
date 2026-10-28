---
name: mobile-ar-vr
description: >
  Use this skill when the user says 'AR', 'VR', 'augmented reality', 'virtual reality', 'ARKit', 'ARCore', 'Unity AR', '3D rendering', 'SceneView', 'AR scene', 'AR interaction', 'AR performance'. This skill enforces: platform-specific AR configuration (ARKit vs ARCore), scene setup with anchor management, optimal 3D model handling with LODs and compression, interaction patterns for gesture and placement, performance budgets (<60fps, <200MB), and VR integration considerations. Do NOT use for: general mobile UI/UX design, game engine tutorials unrelated to AR/VR, or 3D modeling software usage instructions.
version: "2.0.0"
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

### 3D Asset Pipeline Decision
```
Source format?
├── Animated → glTF 2.0 (universal) or USDZ (iOS native with animation)
│   GLTF preferred — broader tool support, Draco compression
├── Static → glTF or compressed OBJ (Draco compressed for streaming)
└── CAD/BIM data → USDZ (Pixar USD ecosystem, retains metadata)

Budle target size?
├── <10MB total → glTF with texture atlases, no LOD needed
├── 10-50MB → LOD generation (3 levels), Draco compression
└── >50MB → Streaming (download on demand), not bundled
```

## Workflow

### Step 1: Platform Selection
ARKit (iOS 11+): A12 Bionic or later for LiDAR, ARWorldTrackingConfiguration for 6DOF, ARImageTrackingConfiguration for image targets, ARFaceTrackingConfiguration for face AR. ARCore (Android 7+): Google Play Services for AR, supported devices list at developers.google.com/ar/devices, Depth API for occlusion, Augmented Images for image tracking. Cross-platform: use ARFoundation (Unity) or SceneView (React Native / Flutter).

| Capability | ARKit | ARCore |
|-----------|-------|--------|
| Plane detection | Horizontal + vertical + LiDAR mesh | Horizontal + vertical |
| Image tracking | Concurrent, up to 100 images | Up to 20 images |
| Face tracking | TrueDepth camera (iPhone X+) | Front camera, less precise |
| World mapping | Persistent via ARWorldMap | Cloud Anchors |
| LiDAR support | iPad Pro 2020+, iPhone 12 Pro+ | Select Android devices |

### Step 2: Scene Setup
Configure ARSession. For world tracking: set `ARWorldTrackingConfiguration` (iOS) or `Config` with `PlaneFindingMode` (Android). Enable auto-focus, ambient light estimation, and environment texturing. Handle session interruptions.

```
ARSession
├── Configuration (plane detection, light estimation, environment texturing, frame semantics)
├── Anchors (Plane anchors, Image anchors, Object anchors)
└── State management (Running -> Paused -> Running, Limited tracking -> Recovery prompt)
```

### Step 3: 3D Model Handling
Preferred formats: USDZ (iOS native, animation + materials), glTF 2.0 (cross-platform, Draco compression). Model pipeline: source -> optimize (decimate to target poly count) -> compress (Draco for glTF) -> LOD generation (3 levels at 100%, 60%, 30% detail) -> bundle. Texture atlas: combine textures, max 1024x1024 for mobile, ASTC (iOS) or ETC2 (Android).

### Step 4: Interaction Patterns
Placement: hit-test against detected planes (raycast), show ghost preview, confirm placement with haptic + animation. Manipulation: one-finger rotate, two-finger scale, long-press drag. Selection: tap to select (visual highlight + bounding box), double-tap for context menu. Feedback: light impact for selection, medium for placement, ripple animation, glow effect.

### Step 5: Performance Optimization
GPU instancing for repeated objects. Occlusion culling (LiDAR depth on iOS, Depth API on Android). Limit tracked images to 10 max. Batch ARAnchor operations. LOD switching based on camera distance. Profile with Xcode SceneKit debugger or Android GPU Inspector.

### Step 6: VR Integration
VR requires dedicated headset (Meta Quest, Apple Vision Pro). Mobile VR is primarily ARKit or Unity VR build. For Vision Pro: RealityKit, SwiftUI with volumetric windows, immersive spaces. AR: 60fps. VR: 72fps minimum (90fps preferred) to prevent motion sickness.

### Step 7: Session Interruption Handling
AR sessions are interrupted by: incoming call, app backgrounding, tracking loss (poor lighting, featureless surfaces). Implement session interruption handlers: (a) On interruption: pause AR, save state/snapshot. (b) On resume: check tracking state, reload anchors if needed. (c) If tracking state is limited: check tracking reason (excessive motion, insufficient features, initializing), inform user with action prompt (move device to well-lit area with texture). (d) After prolonged interruption: reset session configuration and re-establish anchors.

### Step 8: Lighting and Environment Texturing
ARKit: environment texturing (`automatic` or `manual`). Automatic generates environment probes from camera feed for realistic reflections. Manual: provide pre-baked environment maps for consistent lighting. ARCore: Environmental HDR mode with `LightEstimationMode`. Both: ambient light estimation (intensity + color temperature) for consistent virtual object rendering. Enable shadow casting from virtual objects onto real surfaces (ARKit directional shadows, ARCore Depth Occlusion).

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

- Check AR capability at app launch, provide graceful fallback (2D mode, web-based AR)
- Use ARWorldTrackingConfiguration for 6DOF tracking, with plane detection enabled
- Set environment texturing to automatic for realistic lighting
- Implement session interruption handlers with state recovery
- Compress all 3D models — target <50MB total for all models in a scene
- Generate 3 LOD levels per model at 100%, 50%, 25% detail
- Use texture atlases to reduce draw calls — combine multiple textures into one
- Implement hit-testing with raycast for accurate placement
- Provide visual + haptic feedback for every user action
- Test on real devices with varied conditions: bright sunlight, dim interiors, textured surfaces
- Remove unused anchors — limit active anchors to 50 maximum
- Use GPU instancing for repeated objects (e.g., furniture in a room)
- Always reset tracking after session interruption to prevent drift accumulation

## Performance Considerations

- Target 60fps for all AR experiences. Dropping below 30fps causes user discomfort.
- Model memory budget: <200MB total at peak for all loaded models.
- Draw calls: <100 per frame. Use instancing and texture atlases.
- Poly count: <100k per model, <300k total per scene.
- Load time: <2s per model. Show loading indicator if longer.
- Texture resolution: max 1024x1024 for mobile. Use compressed formats (ASTC, ETC2).
- Battery: AR session consumes 300-500mW. Optimize render frequency when battery <20%.
- Memory: ARKit uses ~200MB baseline. Total app memory should stay under 500MB.

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
- Session interruption handlers must save and restore AR state.

## Multi-User AR & Cloud Anchors

For shared AR experiences where multiple users see the same virtual content at the same location: iOS ARKit supports `ARWorldMap` for saving and sharing AR scene state. Host device exports the world map (`ARSession.createWorldMap`) and sends it to other devices via network (WebSocket, custom signaling server). Receiving devices import the world map (`ARSession.run(with: worldMapConfiguration)`) to align their AR coordinate system. Android ARCore provides Cloud Anchons via `CloudAnchorManager`. Host resolves anchors to the cloud (`ArCoreResolveAndAttachAnchor`), share the cloud anchor ID, guests resolve. For cross-platform: use ARCore Cloud Anchors from both platforms via the ARCore SDK. Multi-user features require: (1) real-time anchor state sync via network, (2) conflict resolution for simultaneous moves, (3) late-joining support (new users see existing content), (4) persistent content across sessions. Network sync should use WebRTC or a lightweight WebSocket protocol (not polling). Sync frequency: position updates at 20Hz, anchor events on change.

## Procedural Content & Dynamic Scene Generation

For AR experiences that need dynamic content without pre-bundled 3D assets, use procedural generation. Generate geometry at runtime using SCNGeometry (iOS SceneKit) or Mesh API (Unity/ARFoundation). Patterns: (a) terrain mesh from depth data — sample LiDAR/Depth API grid, generate vertex buffer, apply surface shader, (b) parametric objects — cylinders, spheres, extrusions with runtime parameter control, (c) text extrusion — convert string to 3D geometry using platform text-to-mesh APIs, (d) particle systems for ambient effects (sparkles, floating particles, smoke). Procedural content reduces bundle size significantly (no 3D assets to ship) at the cost of runtime compute. Use compute shaders (iOS Metal, Android Vulkan) for vertex-heavy generation to avoid GPU stalls.

### Rendering Pipeline Decision Tree
```
Rendering complexity for AR scene?
├── Simple (static models, flat lighting) → SceneKit (iOS) / Sceneform (Android)
│   Built-in rendering, PBR materials, shadows — good for most product placement
├── Medium (animated models, environment lighting) → RealityKit (iOS) / ARCore + Filament (Android)
│   RealityKit: entity-component, animations, physics, environment probes
│   Filament: PBR renderer from Google, used by ARCore internally
├── Complex (custom shaders, post-processing, 50k+ polys)
│   → Metal (iOS) / Vulkan (Android) — full GPU control
│   Significant engineering cost, only for specialized rendering apps
└── Cross-platform 3D → Unity ARFoundation with Universal Render Pipeline
    Write once, render on both platforms with URP feature sets
```

### Lighting Model Comparison

| Technique | Quality | Performance | Use Case |
|-----------|---------|-------------|----------|
| Ambient light estimation | Low | Free | Quick placeholder, matches scene brightness |
| Directional light from environment | Medium | Cheap | Product placement, single shadow cast |
| Environment texturing (automatic) | High | Moderate | Realistic reflections on glossy objects |
| Image-based lighting (IBL) | High | Moderate | Pre-baked HDR environment maps |
| Real-time shadow casting | High | Expensive | Ground contact shadows for virtual objects |
| LiDAR mesh with occlusion | Best | Heavy | Physical interaction, object occlusion behind real surfaces |

### Animations & Interactions Expansion
```
AR interaction type?
├── Tap to place → Hit-test against detected planes
│   Show ghost preview (transparent model at hit location)
│   Confirm on tap with haptic feedback and scale animation
├── Drag to move → Continuous hit-test while dragging
│   Constrain to detected plane surface (Y-axis locked)
│   Show position indicator, snap to grid if needed
├── Pinch to scale → Two-finger gesture with uniform or axis-locked scaling
│   Clamp scale: min 0.1x, max 10x — prevent impossibly small/large
├── Rotate → One or two-finger rotation gesture
│   Snap rotation by 45° increments for structured placement
├── Long-press context → Show action menu: delete, info, share
│   Use radial menu or bottom sheet for consistent UX
└── Gaze-based (hands-free AR glasses) → Eye tracking + dwell time
    Look at object for 1.5s to select, blink to confirm
```

## AR Session Analytics

Track AR session quality metrics to diagnose user experience issues: (1) tracking state duration — time spent in limited/normal tracking, (2) average light estimation values — too dark reduces tracking quality, (3) anchor count over time — anchor leaks degrade performance, (4) session interruption frequency — correlates with app backgrounding and poor conditions, (5) average frame rate — drop below 30fps causes discomfort, (6) depth data availability — LiDAR vs. no LiDAR session path. Log these as analytics events prefixed with `ar_`. Monitor dashboards for: sessions with >50% time in limited tracking, anchor count >100 sustained, fps consistently below 30. Alerts trigger when any metric exceeds 2 standard deviations from baseline.

## Production Considerations

### AR Failure Modes

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Device not supported | Crash/can't start | Check `ARConfiguration.isSupported` pre-launch |
| Tracking lost | Content floats | Visual indicator + recovery prompt |
| Camera permission denied | Black view | Graceful message, redirect to settings |
| Low light | Poor tracking | Torch prompt, adjust rendering |
| Memory pressure | App terminated | LOD streaming, texture budget <200MB |
| Battery drain | Phone hot | Reduce render quality when battery <20% |

### Testing Matrix

| Condition | iOS Checklist | Android Checklist |
|-----------|---------------|-------------------|
| Bright sunlight | Tracking stable, shadows | Same + auto-exposure |
| Dim interior | Low light prompt shows | Same |
| Featureless surface (white wall) | Tracking limited recovery | Same |
| Moving object detection | Works within 2s | Same |
| Multiple planes | 5+ concurrent | Same |
| App background + resume | Sessions resumes | Same |
| LiDAR / no LiDAR | Both test paths | Depth API availability |

### Troubleshooting Checklist

- Verify device supports AR: `ARConfiguration.isSupported` / `ArCoreApk.checkAvailability`
- Check camera permission granted before starting AR session
- Validate 3D model format and compression (no raw OBJ/FBX)
- Confirm LOD levels exist for all models >50k polygons
- Profile memory: ARKit baseline ~200MB, stay under 500MB total
- Check anchor count doesn't grow unbounded over session lifetime
- Verify environment texturing enabled for realistic lighting
- Confirm haptic feedback on placement/selection
- Test store submission: iOS requires ARKit usage description in Info.plist

### Performance Budget Expansion

```
Model detail vs frame rate:
├── fps stable at 60, model count <10 → Add detail (4K textures, more polys)
├── fps 30-45, model count 10-50 → Enable LOD, GPU instancing, texture compression
├── fps <30, any count → Reduce render scale, disable shadows, limit draw distance
└── fps variable with battery → Implement battery-aware quality scaling
    Battery <20%: reduce render scale to 0.7, disable HDR, lower draw distance
```

### CI/CD Considerations

- Run AR integration tests on real device farm (Firebase Test Lab, AWS Device Farm)
- Validate 3D model bundle sizes in CI — fail if total >50MB
- Verify performance budget with trace capture on each build
- Test both LiDAR and non-LiDAR device paths
- Check that all required Info.plist entries are present (iOS)
- Validate AASA and assetlinks.json for AR web launch links

## Code Examples

### ARKit Swift — Session Configuration
```swift
import ARKit

class ARViewController: UIViewController, ARSCNViewDelegate {
    @IBOutlet var sceneView: ARSCNView!

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        guard ARWorldTrackingConfiguration.isSupported else {
            showUnsupportedAlert(); return
        }
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        config.environmentTexturing = .automatic
        config.frameSemantics = [.personSegmentationWithDepth]
        config.isAutoFocusEnabled = true
        sceneView.session.run(config, options: [.removeExistingAnchors, .resetTracking])
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        sceneView.session.pause()
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        // App should present recovery UI, not just log
        showRecoveryPrompt(message: error.localizedDescription)
    }

    func sessionWasInterrupted(_ session: ARSession) {
        // Pause rendering, show overlay
    }

    func sessionInterruptionEnded(_ session: ARSession) {
        // Reset tracking and reload anchors
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        session.run(config, options: [.resetTracking, .removeExistingAnchors])
    }
}
```

### ARCore Kotlin — Session with Depth API
```kotlin
class ArActivity : AppCompatActivity() {
    private lateinit var arFragment: ArFragment

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ar)
        arFragment = supportFragmentManager.findFragmentById(R.id.ar_fragment) as ArFragment

        // Check ARCore availability
        when (ArCoreApk.getInstance().checkAvailability(this)) {
            ArCoreApk.Availability.UNKNOWN_CHECKING -> { /*wait*/ }
            ArCoreApk.Availability.UNSUPPORTED_DEVICE_NOT_CAPABLE -> { showUnsupported() }
            ArCoreApk.Availability.SUPPORTED_APK_TOO_OLD -> { /*update*/ }
            ArCoreApk.Availability.SUPPORTED_INSTALLED -> { /*ready*/ }
        }

        val session = arFragment.arSceneView.session
        val config = Config(session)
        config.depthMode = Config.DepthMode.AUTOMATIC
        config.lightEstimationMode = Config.LightEstimationMode.ENVIRONMENTAL_HDR
        session.configure(config)

        arFragment.setOnTapArPlaneListener { hitResult, _, _ ->
            // Place anchor
            val anchor = hitResult.createAnchor()
            placeModel(anchor)
        }
    }
}
```

### AR Model Loading with glTF
```typescript
// Three.js / React Three Fiber in mobile AR
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

export async function loadARModel(url: string) {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco-gltf/');
  loader.setDRACOLoader(dracoLoader);

  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  // Apply LOD
  model.traverse(child => {
    if (child.isMesh) {
      child.frustumCulled = true;
      // Reduce shadow map if on mobile
      child.receiveShadow = true;
      child.castShadow = true;
    }
  });
  return model;
}
```

### AR Anti-Patterns (Expanded)
- **Loading all models at session start**: Pre-loading every 3D asset at launch uses unnecessary memory. Load models on demand as user places them, stream LOD levels incrementally.
- **No session state persistence**: User places furniture in AR, backgrounds app, comes back — everything is gone. Save `ARWorldMap` (iOS) or Cloud Anchors (Android) for session restoration.
- **Ignoring `NSPhotoLibraryUsageDescription`**: AR apps that save photos/videos of AR scenes need photo library permission. Missing description = App Store rejection.
- **Single-threaded model loading**: Loading glTF files on main thread blocks 60fps rendering. Use background thread with progress indicator.
- **Over-reliance on GPS accuracy**: Outdoor AR with GPS drifts without visual-inertial odometry (VIO). ARKit GeoTracking uses VIO + GPS for ~1m accuracy. Pure GPS is 5-15m.
- **No accessibility for AR**: Users with visual impairments can't use AR placement. Provide alternative: manual coordinate entry, text-based descriptions, voice-guided placement.
- **Using opaque shadows**: Virtual objects with hard black shadows on a moving real-world background cause motion sickness. Use soft transluscent shadows.
- **Too many simultaneous tracked images**: ARKit supports up to 100 tracked images, but resource cost increases with each. Limit to 20 unless necessary.

### AR/VR Production Readiness Checklist
```
App ready for AR release?
├── [ ] Device capability check at first launch (graceful fallback if unsupported)
├── [ ] Camera permission requested in context with rationale
├── [ ] All 3D models compressed (Draco/USDZ) and LOD levels generated
├── [ ] Session interruption handlers save/restore AR state
├── [ ] Performance profiled: 60fps sustained, <500MB total memory
├── [ ] Tested on: bright sunlight, dim interior, featureless surfaces
├── [ ] Tested on: LiDAR devices and non-LiDAR devices (both paths)
├── [ ] Anchor count never exceeds 50 per session (remove unused)
├── [ ] Battery-aware rendering: reduce quality at <20% battery
├── [ ] Analytics: AR session tracking events implemented
├── [ ] Haptic + visual feedback on every user action
├── [ ] Low-light detection triggers torch suggestion
├── [ ] Accessibility: voice-guided or manual placement fallback
├── [ ] App Store info.plist: ARKit usage description, camera usage
├── [ ] CI/CD: model size check, performance trace capture, real device test
```

## References
- references/ar-core-arkit.md — ARCore vs ARKit Developer Guide
- references/ar-patterns.md — AR/VR Interaction Patterns
- references/ar-platforms.md — AR Platforms: ARKit vs ARCore
- references/arcore-implementation.md — ARCore Implementation
- references/arkit-implementation.md — ARKit Implementation
- references/vr-development.md — Mobile VR Development
- references/ar-vr-rendering-performance.md — Rendering optimization for AR/VR on mobile
- references/ar-vr-interaction-design.md — Interaction design patterns for AR/VR experiences
- references/ar-vr-fundamentals.md — AR/VR Fundamentals
- references/ar-vr-advanced.md — Advanced AR/VR Patterns
- references/ar-vr-testing.md — AR/VR Testing Guide

## Handoff
mobile/universal/testing for AR testing strategy (real device, varied lighting, occlusion scenarios)
mobile/universal/performance for profiling AR-specific performance metrics
