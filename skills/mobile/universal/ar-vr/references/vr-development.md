# Mobile VR Development

## Platform Overview

| Platform | SDK/Framework | Controllers | Tracking |
|---|---|---|---|
| Meta Quest 2/3/Pro | Unity + Oculus Integration, Unreal | Touch controllers, hand tracking | 6DoF inside-out |
| Apple Vision Pro | RealityKit + SwiftUI | Eye + hand tracking | 6DoF optical |
| PICO 4/4 Pro | Unity + PICO XR SDK | Motion controllers, hand tracking | 6DoF inside-out |
| Google Cardboard | Unity Cardboard SDK, Unreal | Gaze only | 3DoF |
| Samsung Gear VR (legacy) | Oculus Mobile SDK | Touchpad | 3DoF |
| HTC Vive Focus | Unity Wave SDK, Unreal | 6DoF controllers | 6DoF inside-out |

## Unity vs Unreal for Mobile VR

### Unity
```csharp
// Unity XR Interaction Toolkit — mobile VR
using UnityEngine.XR.Interaction.Toolkit;

public class VRHandController : MonoBehaviour
{
    private XRDirectInteractor interactor;
    private XRRayInteractor rayInteractor;

    void Start()
    {
        interactor = GetComponent<XRDirectInteractor>();
        rayInteractor = GetComponent<XRRayInteractor>();
    }

    void Update()
    {
        // Toggle between direct and ray interaction
        if (GetComponent<XRController>().selectInteractionState.activatedThisFrame)
        {
            interactor.enabled = !interactor.enabled;
            rayInteractor.enabled = !rayInteractor.enabled;
        }
    }
}
```

**Unity advantages for mobile VR:**
- Lighter runtime (~30MB base), better for mobile
- XR Interaction Toolkit abstracts platform differences
- URP (Universal Render Pipeline) optimized for mobile GPUs
- Great Asset Store support for VR mechanics
- Oculus Integration package with hand tracking
- Simpler build pipeline for Quest and Android-based headsets

### Unreal Engine
```cpp
// Unreal C++ — VR pawn setup
AVRPawn::AVRPawn()
{
    VRCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("VRCamera"));
    VRCamera->SetupAttachment(GetRootComponent());

    LeftController = CreateDefaultSubobject<UMotionControllerComponent>(TEXT("LeftController"));
    LeftController->TrackingSource = EControllerHand::Left;

    RightController = CreateDefaultSubobject<UMotionControllerComponent>(TEXT("RightController"));
    RightController->TrackingSource = EControllerHand::Right;
}

void AVRPawn::BeginPlay()
{
    Super::BeginPlay();
    // Enable hand tracking if available
    if (UHeadMountedDisplayFunctionLibrary::IsHeadMountedDisplayConnected())
    {
        UHeadMountedDisplayFunctionLibrary::SetTrackingOrigin(EHMDTrackingOrigin::Floor);
    }
}
```

**Unreal advantages:**
- Superior visual quality (Lumen, Nanite on supported platforms)
- Blueprints for rapid VR prototyping
- Better built-in physics
- OpenXR standard support

**Mobile VR choice: Unity for broad device support (especially Quest); Unreal for high-fidelity experiences on high-end hardware.**

## 6DoF Tracking

### Inside-Out Tracking
```csharp
// Unity — OVRPlugin for 6DoF tracking
using Oculus.Interaction;

public class TrackingQualityMonitor : MonoBehaviour
{
    void Update()
    {
        var status = OVRPlugin.GetTrackingStatus();
        if (status.HasFlag(OVRPlugin.TrackingStatus.TRACKING_GOOD))
        {
            // Full 6DoF tracking
            var pose = OVRPlugin.GetNodePose(
                OVRPlugin.Node.HMD,
                OVRPlugin.Step.Render
            );
            transform.localPosition = pose.ToOVRPose().position;
            transform.localRotation = pose.ToOVRPose().orientation;
        }
        else
        {
            // Tracking lost — fade out or show recovery
            StartCoroutine(FadeToBlack(0.3f));
        }
    }
}
```

### 6DoF vs 3DoF
| Feature | 6DoF (Quest, Vision Pro) | 3DoF (Cardboard, Gear VR) |
|---|---|---|
| Position tracking | X, Y, Z translation | None — head rotation only |
| Rotation tracking | Pitch, yaw, roll | Pitch, yaw, roll |
| Movement | Walk, lean, duck | Gaze-based teleport |
| Motion sickness | Lower (vestibular match) | Higher (vection induced) |
| Hardware cost | Higher | Very low (phone + cardboard) |
| Immersion | High | Medium |

### Hand Tracking
```csharp
// Unity — Oculus Hand Tracking
using Oculus.Interaction.Input;

public class HandInteraction : MonoBehaviour
{
    [SerializeField] private Hand leftHand;
    [SerializeField] private Hand rightHand;

    void Update()
    {
        if (leftHand.GetJointPose(HandJointId.HandIndexTip, out Pose tipPose))
        {
            // Index finger tip position
            transform.position = tipPose.position;
        }

        // Pinch detection
        if (leftHand.GetIndexFingerIsPinching())
        {
            OnPinchPerform();
        }

        // Grab gesture
        if (leftHand.GetFingerIsGrabbing())
        {
            OnGrabStart();
        }
    }
}
```

```swift
// Apple Vision Pro — Hand tracking with RealityKit
import RealityKit

class HandTrackingExample {
    let session = ARKitSession()
    let handTracking = HandTrackingProvider()

    func run() async {
        do {
            try await session.run([handTracking])
        } catch {
            print("Hand tracking failed: \(error)")
        }

        let leftHandAnchor = await handTracking.anchorUpdates
            .filter { $0.chirality == .left }
            .map { $0.anchor }

        for await anchor in leftHandAnchor {
            if let thumbTip = anchor.handSkeleton?
                .joint(.thumbTip)
                .anchorFromJointTransform {
                // Position virtual object at thumb tip
                thumbEntity.setTransformMatrix(thumbTip, relativeTo: nil)
            }
        }
    }
}
```

## Performance Optimization for Mobile VR

### Render Pipeline
```csharp
// Unity URP configuration for mobile VR
public class VRQualitySettings : MonoBehaviour
{
    void Start()
    {
        // Fixed foveated rendering level
        OVRManager.foveatedRenderingLevel = OVRManager.FoveatedRenderingLevel.High;
        OVRManager.tiledMultiResLevel = OVRManager.TiledMultiResLevel.LMSHigh;

        // Render scale based on performance
        if (SystemInfo.graphicsDeviceType == GraphicsDeviceType.OpenGLES3)
        {
            UnityEngine.XR.XRSettings.renderViewportScale = 0.7f;
        }
        else
        {
            UnityEngine.XR.XRSettings.renderViewportScale = 0.8f;
        }

        // GPU instancing for repeated objects
        MaterialPropertyBlock block = new MaterialPropertyBlock();
        Renderer renderer = GetComponent<Renderer>();
        renderer.SetPropertyBlock(block);
    }
}
```

### Key Performance Targets
| Metric | Target | Hard Limit |
|---|---|---|
| Framerate | 72fps (Quest), 90fps (Vision Pro) | <72fps causes nausea |
| CPU frame time | <11ms (72fps) | <13.8ms |
| GPU frame time | <11ms (72fps) | <13.8ms |
| Draw calls | <150 | <250 |
| Triangles | <200k | <500k |
| Overdraw | <1.5x | <3x |
| Memory | <1.5GB | <2GB (Quest 2) |

### Optimization Techniques
```csharp
// Single-pass instanced rendering
void ConfigureRendering()
{
    UnityEngine.XR.XRSettings.stereoRenderingMode = 
        XRSettings.StereoRenderingMode.SinglePassInstanced;
}

// LOD for VR — more aggressive distance thresholds
[CreateAssetMenu]
public class VRLODGroup : LODGroup
{
    void Reset()
    {
        SetLODs(new LOD[] {
            new LOD(0.1f, highPolyMesh),  // Very close
            new LOD(0.25f, medPolyMesh),  // Close
            new LOD(0.5f, lowPolyMesh),   // Medium
            new LOD(1.0f, billboardMesh)  // Far
        });
    }
}

// Fixed foveated rendering
OVRManager.foveatedRenderingLevel = OVRManager.FoveatedRenderingLevel.High;
// Shader-based for custom pipelines
```

### Foveated Rendering
```csharp
// VRS (Variable Rate Shading) on Quest 2+
OVRManager.vrsLevel = OVRManager.VRSLevel.HighOpt;

// Eye-tracked foveated rendering (Quest Pro, PSVR2)
if (OVRPlugin.eyeTrackedFoveatedRenderingSupported)
{
    OVRPlugin.eyeTrackedFoveatedRenderingEnabled = true;
}

// Custom fixed foveation for Vision Pro
let rendering = environment.rendering
rendering.foveationLevel = .high
rendering.foveationPattern = .centered
}
```

## Motion Sickness Mitigation

### Design Patterns
```csharp
// Comfort vignette during movement
public class ComfortVignette : MonoBehaviour
{
    [SerializeField] private float vignetteIntensity = 0.3f;

    public void OnMovementStart()
    {
        // Apply full-screen vignette
        // Reduces peripheral vision during artificial locomotion
        StartCoroutine(AnimateVignette(0f, vignetteIntensity, 0.2f));
    }

    public void OnMovementEnd()
    {
        StartCoroutine(AnimateVignette(vignetteIntensity, 0f, 0.3f));
    }
}
```

- **Teleport over smooth locomotion**: teleport reduces vection-induced nausea
- **Snap rotation**: 15-45 degree snaps instead of smooth turning
- **Fixed reference points**: cockpit, HUD, or ground grid as visual anchors
- **Avoid acceleration**: instant velocity changes (teleport) vs smooth acceleration
- **Keep framerate stable**: frame drops cause immediate discomfort in VR

## Audio in VR
```csharp
// Spatial audio with Oculus Audio SDK
using Oculus.Spatializer;

public class VRAudioSource : MonoBehaviour
{
    void Start()
    {
        var audioSource = GetComponent<AudioSource>();
        audioSource.spatialBlend = 1.0f;
        audioSource.rolloffMode = AudioRolloffMode.Custom;
        audioSource.SetCustomRolloffCurve(AnimationCurve.EaseInOut(0, 1, 10, 0));

        // Enable Oculus spatializer
        AudioPluginOculus.EnableSpatializer(audioSource, true);
    }
}
```

## Build and Distribution

| Platform | Build Output | Size Limit | Store |
|---|---|---|---|
| Meta Quest | APK/AAB | 2GB (store), larger via expansion | Meta Horizon Store |
| Apple Vision Pro | IPA | 4GB | App Store |
| PICO | APK | 2GB | PICO Store |
| Cardboard | APK/AAB | 150MB | Google Play |
