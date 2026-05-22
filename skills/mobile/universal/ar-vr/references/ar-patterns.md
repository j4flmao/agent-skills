# AR/VR Interaction Patterns

## Overview
Effective AR/VR interactions balance natural movement, feedback clarity, and performance. This reference covers gesture interaction, model loading, performance optimization, and VR integration patterns.

## Gesture Interaction

### Placement
1. **Hit test**: Raycast from screen center against detected plane anchors
2. **Ghost preview**: Show semi-transparent model at hit position before placement
3. **Validation**: Check minimum distance from other objects (>0.5m), plane size sufficiency (>model bounding box + 20%)
4. **Confirm**: Tap to place — trigger scale-in animation + haptic feedback
5. **Cancel**: Swipe down or tap outside to dismiss placement mode

### Manipulation (post-placement)
| Gesture | Action | Feedback |
|---|---|---|
| Single-finger drag | Rotate around Y-axis | Angular velocity indicator |
| Two-finger pinch | Scale (min 0.3x, max 3x) | Size reference grid overlay |
| Two-finger drag | Reposition horizontally | Shadow cast on nearest plane |
| Long press + drag | Elevation change | Vertical guide line |
| Double-tap | Reset to default transform | Quick snap animation |

## Model Loading

### Pipeline
```
Source model (.fbx, .obj, .blend)
→ Export to glTF 2.0 or USDZ
→ Draco compression (glTF) or SceneKit compression (USDZ)
→ Generate LODs (100%, 60%, 30% vertex count)
→ Build texture atlas (max 1024×1024, ASTC/ETC2)
→ Bundle into app assets
```

### Loading Strategy
- Preload critical models at scene start (max 2s load time)
- Stream secondary models on-demand with loading indicator
- Use async loading with progress callback
- Pool and reuse model instances — avoid alloc/dealloc spikes
- Cache loaded models in memory with LRU eviction policy

## Performance Optimization

### Budget Worksheet
| Resource | AR Budget | VR Budget |
|---|---|---|
| Frame time | 16ms (60fps) | 11ms (90fps) |
| Draw calls | <100 | <200 |
| Vertices per frame | <500k | <1M |
| Texture memory | <200MB | <500MB |
| Active anchors | <50 | <100 |

### Optimization Checklist
- [ ] GPU instancing enabled for repeated objects
- [ ] Occlusion culling active (LiDAR depth or manual occluders)
- [ ] LOD switching based on camera-to-object distance
- [ ] Texture sizes capped per platform (1024 max for mobile)
- [ ] No per-frame allocations in AR session callbacks
- [ ] Baked lighting where possible — avoid real-time shadows
- [ ] Profile on lowest-target device, not development device

## VR Integration
- VR headsets (Quest, Vision Pro) have stricter FPS requirements
- Use fixed foveated rendering (Quest) or eye-tracked foveation (Vision Pro)
- Teleportation movement (preferred) vs continuous locomotion (motion sickness risk)
- Hand tracking (Quest 2/3, Vision Pro) vs controller-based interaction
- Spatial audio for immersion — match audio source to 3D object position

## Key Points
- Every gesture must have visual + haptic feedback within 50ms
- Performance budget is the single most important AR/VR artifact
- Test on physical devices in real-world lighting conditions
- VR requires minimum 72fps — optimize aggressively or drop features
