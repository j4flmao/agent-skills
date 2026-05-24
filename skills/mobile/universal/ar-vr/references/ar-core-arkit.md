# ARCore (Android) vs ARKit (iOS) Developer Guide

## Feature Comparison Matrix

| Feature | ARKit (iOS) | ARCore (Android) |
|---|---|---|
| Min OS version | iOS 11.0+ | Android 7.0+ (API 24) |
| Required hardware | A9 chip or later | Google Play Services for AR certified |
| 6DOF tracking | Visual-inertial odometry + LiDAR | Visual-inertial odometry |
| Plane detection | Horizontal, vertical, LiDAR mesh | Horizontal, vertical |
| Image tracking | up to 100 concurrent, reference images | up to 20 concurrent, augmented images |
| Face tracking | TrueDepth camera (iPhone X+) | Front camera, no depth |
| Body tracking | ARBodyTrackingConfiguration | No built-in support |
| World mapping | Persistent ARWorldMap, saved/loaded | Cloud Anchors (requires network) |
| LiDAR | iPad Pro 2020+, iPhone 12 Pro+ (scene mesh, raycast, occlusion) | No equivalent |
| Environment texturing | Automatic or manual | Not supported |
| Collaboration | ARCollaborationData (multi-peer) | Cloud Anchors (multi-device) |
| Geotracking | ARGeoTrackingConfiguration (city-scale) | Not supported |
| Object scanning | ARObjectScanningConfiguration | 3D Asset API (limited) |

## Session Management

### ARKit Session Lifecycle
```swift
// iOS — ARSession management with delegate
let session = ARSession()
session.delegate = self

let config = ARWorldTrackingConfiguration()
config.planeDetection = [.horizontal, .vertical]
config.environmentTexturing = .automatic
config.frameSemantics = [.personSegmentationWithDepth]
session.run(config, options: [.resetTracking, .removeExistingAnchors])

// Delegate methods
func session(_ session: ARSession, didFailWithError error: Error) {
    // Present recovery UI — tracking lost irrecoverably
    session.run(config, options: [.resetTracking, .removeExistingAnchors])
}

func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    switch camera.trackingState {
    case .normal: break // Full tracking
    case .limited(let reason): // Show user guidance
        // .initializing, .relocalizing, .excessiveMotion, .insufficientFeatures
    case .notAvailable: // Camera unavailable
    }
}

func sessionWasInterrupted(_ session: ARSession) {
    // Pause AR experience, show overlay
}

func sessionInterruptionEnded(_ session: ARSession) {
    // Optionally relocalize
    session.run(config, options: [.resetTracking])
}
```

### ARCore Session Lifecycle
```kotlin
// Android — ARCore session management
val session = Session(context)
val config = Config(session)
config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
config.lightEstimationMode = Config.LightEstimationMode.AMBIENT_INTENSITY
config.focusMode = Config.FocusMode.AUTO
session.configure(config)

// In render loop
val frame = session.update()
when (val trackingState = frame.camera.trackingState) {
    TrackingState.TRACKING -> { /* Normal operation */ }
    TrackingState.PAUSED -> { /* Camera unavailable, show error */ }
    TrackingState.STOPPED -> {
        when (val reason = session.sessionCreateResult) {
            SessionCreateResult.UNSUPPORTED_INSTALLED -> { /* Update required */ }
            SessionCreateResult.UNSUPPORTED_NOT_INSTALLED -> { /* Redirect to install */ }
            else -> { /* Other failure */ }
        }
    }
}
```

## Anchor Systems

### ARKit Anchors
| Anchor Type | Base Class | Use Case |
|---|---|---|
| ARPlaneAnchor | ARAnchor | Detected planar surfaces |
| ARImageAnchor | ARAnchor | Detected reference images |
| ARObjectAnchor | ARAnchor | Detected 3D objects |
| ARFaceAnchor | ARAnchor | Face mesh and blend shapes |
| ARBodyAnchor | ARAnchor | Skeleton tracking |
| ARPointCloud | ARAnchor | Raw feature points |
| ARMeshAnchor | ARAnchor | LiDAR-generated mesh |

```swift
// Anchor lifecycle
func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
    for anchor in anchors {
        if let plane = anchor as? ARPlaneAnchor {
            // Create mesh for plane geometry
            let mesh = ARSCNPlaneGeometry(device: sceneView.device!)
            mesh?.update(from: plane.geometry)
            let node = SCNNode(geometry: mesh)
            node.simdTransform = plane.transform
            sceneView.scene.rootNode.addChildNode(node)
        }
    }
}

func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
    // Update existing anchor geometry/extent
}

func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
    // Remove associated nodes
}
```

### ARCore Anchors
```kotlin
// Hit testing to place anchors
val hitResult = frame.hitTest(tapX, tapY).firstOrNull {
    it.trackable is Plane
}
hitResult?.let { hit ->
    val anchor = session.createAnchor(hit.hitPose)
    // Attach renderable to anchor
    virtualObject.setAnchor(anchor)
}

// Trackable lifecycle
override fun onUpdatePlanes(session: Session, updateFrame: Frame) {
    for (plane in session.getAllTrackables(Plane::class.java)) {
        when (plane.subsumedBy) {
            null -> // Active plane
            else -> // Merged into another plane
        }
    }
}
```

## Environmental Understanding

### ARKit Environment Texturing
```swift
// Automatic environment texturing
config.environmentTexturing = .automatic // Generates cubemap from camera
// Manual: provide your own probe
let probe = AREnvironmentProbeAnchor(
    name: "custom", transform: transform,
    extent: simd_float3(5, 3, 5)
)
session.add(anchor: probe)
```

### ARCore Depth API
```kotlin
// Depth data for occlusion
val depthImage = frame.acquireDepthImage() // 16-bit depth
// Enable depth in config
config.depthMode = Config.DepthMode.AUTOMATIC

// Use depth for realistic occlusion
val oobb = hitResult.let {
    ObjectOccluder(depthImage, it.hitPose)
}
```

## Motion Tracking

### Visual-Inertial Odometry
Both platforms use IMU (accelerometer + gyroscope) + camera feature tracking. Key differences:

| Aspect | ARKit | ARCore |
|---|---|---|
| Tracking initialization | ~0.5s | ~1-2s |
| Tracking loss recovery | Relocalization with ARWorldMap | Cloud Anchor recovery |
| Low-light performance | LiDAR on supported devices | Requires visible features |
| Fast motion tolerance | Up to 5 m/s | Up to 3 m/s |
| Rotation tracking | Full 6DOF | Full 6DOF |

### LiDAR Features (ARKit only)
```swift
// Scene reconstruction with LiDAR
let config = ARWorldTrackingConfiguration()
config.sceneReconstruction = .meshWithClassification
config.frameSemantics.insert(.smoothedSceneDepth)

// Access mesh anchors
func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
    for anchor in anchors {
        if let mesh = anchor as? ARMeshAnchor {
            // mesh.geometry: vertex, normal, face data
            // mesh.classification: wall, floor, ceiling, etc.
        }
    }
}

// Instant raycast (no need for detected plane)
let raycast = sceneView.raycast(
    from: screenPoint,
    allowing: .estimatedPlane, // LiDAR allows instant placement
    alignment: .horizontal
)
```

## Performance Budgets

| Resource | ARKit Budget | ARCore Budget |
|---|---|---|
| GPU time | <16ms per frame (60fps) | <16ms per frame |
| CPU time | <8ms for AR pipeline | <12ms for AR pipeline |
| Memory | <200MB total | <150MB total |
| Active anchors | <50 recommended | <30 recommended |
| Tracked images | <25 (ARKit 6+) | <20 |
| Thermal state | Monitor with ProcessInfo | Monitor with PowerManager |
