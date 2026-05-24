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
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Platform selected with fallback strategy for unsupported devices
- [ ] Scene configured with session management and tracking
- [ ] 3D model pipeline defined with format, compression, and LOD strategy
- [ ] Interaction patterns chosen with haptic/visual feedback
- [ ] Performance budget documented with measurement approach
- [ ] VR considerations addressed if applicable

### Max Response Length
300 lines

## Workflow

### Step 1: Platform Selection
ARKit (iOS 11+): A12 Bionic or later for LiDAR, ARWorldTrackingConfiguration for 6DOF, ARImageTrackingConfiguration for image targets, ARFaceTrackingConfiguration for face AR. ARCore (Android 7+): Google Play Services for AR, supported devices list at developers.google.com/ar/devices, Depth API for occlusion, Augmented Images for image tracking. Cross-platform: use ARFoundation (Unity) or SceneView (React Native / Flutter) — abstract platform differences behind a unified API but expose platform-specific capabilities.

| Capability | ARKit | ARCore |
|---|---|---|
| Plane detection | Horizontal + vertical + LiDAR mesh | Horizontal + vertical |
| Image tracking | Concurrent, up to 100 images | Up to 20 images |
| Face tracking | TrueDepth camera (iPhone X+) | Front camera, less precise |
| World mapping | Persistent via ARWorldMap | Cloud Anchors |
| LiDAR support | iPad Pro 2020+, iPhone 12 Pro+ | Select Android devices |

### Step 2: Scene Setup
Configure ARSession with appropriate tracking configuration. For world tracking: set `ARWorldTrackingConfiguration` (iOS) or `Config` with `PlaneFindingMode` (Android). Enable auto-focus, ambient light estimation, and environment texturing. Handle session interruptions (camera access denied, motion tracking lost) with state management and user recovery prompts.

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
Preferred formats: USDZ (iOS native, supports animation + materials), glTF 2.0 (cross-platform, Draco compression). Model pipeline: source → optimize (decimate to target poly count) → compress (Draco for glTF, built-in for USDZ) → LOD generation (3 levels at 100%, 60%, 30% detail) → bundle. Texture atlas: combine textures, max 1024x1024 for mobile, ASTC compression (iOS) or ETC2 (Android). Memory budget: <200MB total for all loaded models at peak.

| Metric | Target | Critical |
|---|---|---|
| FPS | 60 | <30 triggers warning |
| Model memory | <200MB combined | <350MB hard cap |
| Draw calls | <100 per frame | <200 per frame |
| Poly count | <100k per model | <300k per model |
| Load time | <2s per model | <5s timeout |

### Step 4: Interaction Patterns
Placement: hit-test against detected planes (raycast), show ghost preview for validation, confirm placement with haptic feedback and animation. Manipulation: one-finger rotate, two-finger scale, long-press drag for reposition. Selection: tap to select (visual highlight + bounding box), double-tap for context menu. Feedback: haptic (light impact for selection, medium for placement), visual (ripple animation, glow effect), audio (subtle confirm sound).

### Step 5: Performance Optimization
Use GPU instancing for repeated objects. Implement occlusion culling (LiDAR depth on iOS, Depth API on Android). Limit simultaneous tracked images to 10 max. Batch ARAnchor operations — avoid per-frame anchor creation. Use level-of-detail switching based on camera distance. Profile with Xcode SceneKit debugger (iOS) or Android GPU Inspector. Common mistakes: creating anchors every frame, loading uncompressed models, no LOD strategy, excessive draw calls from unbatched rendering.

### Step 6: VR Integration (if applicable)
VR requires dedicated headset (Meta Quest, Apple Vision Pro). Mobile VR is primarily ARKit + ARKit's VR mode or Unity VR build. For spatial computing (Vision Pro): use Reality Kit, SwiftUI with volumetric windows, immersive spaces. Performance targets differ: AR typically 60fps, VR requires 72fps minimum (90fps preferred) to prevent motion sickness.

## Rules
- Always detect device AR capability before activating AR features — provide graceful fallback
- Never hardcode tracking configurations — handle session state changes
- All 3D models must use compressed formats — never raw OBJ or FBX in production
- Performance budget is mandatory — document FPS, memory, and poly count targets
- Anchor management: remove unused anchors, limit active anchors to <50
- Interaction feedback every action — visual + haptic for every user gesture
- Test on real devices, never rely solely on emulator/simulator AR performance

## References
- `references/ar-platforms.md` — ARKit vs ARCore deep dive, scene setup, anchors, lighting, session management
- `references/ar-patterns.md` — Gesture interaction, model loading and optimization, performance budgets, VR integration
- `references/ar-core-arkit.md` — ARCore vs ARKit feature comparison, session management, anchor systems, environmental understanding, motion tracking
- `references/vr-development.md` — Unity vs Unreal for mobile VR, 6DoF tracking, performance optimization, hand tracking, foveated rendering

## Handoff
`mobile/universal/testing` for AR testing strategy (real device, varied lighting, occlusion scenarios)
`mobile/universal/performance` for profiling AR-specific performance metrics
