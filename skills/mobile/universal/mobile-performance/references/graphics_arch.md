# Mobile Graphics Architecture

How a frame travels from app code to the display on Android and iOS, where the time budget goes, and what causes GPU-side jank.

## Frame Budget

| Refresh rate | Budget per frame |
|---|---|
| 60 Hz | 16.7 ms |
| 90 Hz | 11.1 ms |
| 120 Hz | 8.3 ms |

The budget is shared between UI-thread work (input, animation, measure/layout, recording draw commands) and render-thread/GPU work. Missing the deadline repeats the previous frame (jank / hitch).

## Android Rendering Pipeline

```
Input / VSYNC (Choreographer)
  -> UI thread: input, animation, measure, layout, draw (records display lists)
  -> RenderThread (HWUI): syncs display lists, issues GPU commands (Skia over OpenGL ES or Vulkan)
  -> BufferQueue: app's buffer queued to SurfaceFlinger
  -> SurfaceFlinger: composes layers, using Hardware Composer (HWC) overlays when possible
  -> Display
```
Key ideas:
- Views and Compose both record into display lists (`RenderNode`); the UI thread does not touch the GPU directly.
- `SurfaceView` and `TextureView` render outside the normal view hierarchy; `SurfaceView` gets its own layer (cheaper composition), `TextureView` is composed by the app's GPU pass (more flexible, more costly).
- Games and custom engines render directly through Vulkan or OpenGL ES; Android Frame Pacing (Swappy) helps match presentation to the display.

### Tools
- Perfetto: `Choreographer#doFrame`, `DrawFrame` on RenderThread, `queueBuffer`, SurfaceFlinger, and the "Expected/Actual Timeline" tracks that mark janky frames.
- Developer options: "Profile HWUI rendering", "Debug GPU overdraw", "Show surface updates".
- Android GPU Inspector (AGI) for GPU counters and Vulkan/GLES frame captures.

## iOS Rendering Pipeline

```
Event / CADisplayLink
  -> App main thread: event handling, layout (Auto Layout / SwiftUI), display (drawRect, text, images)
  -> CATransaction commit: layer tree sent to the render server
  -> Render server: decodes images if needed, renders layer tree with Metal
  -> Display (ProMotion adjusts refresh rate dynamically)
```
Key ideas:
- Core Animation animations run in the render server, so they continue even if the main thread is briefly busy; layout and commit still need the main thread.
- Hitches are either commit hitches (main thread late) or render hitches (render server/GPU late). Instruments "Animation Hitches" separates them.
- ProMotion: iPhone apps need `CADisableMinimumFrameDurationOnPhone = YES` in Info.plist to use above 60 Hz for custom animations; request rates with `CADisplayLink.preferredFrameRateRange` or `CAFrameRateRange` on animations.

### Tools
- Instruments: Animation Hitches, Core Animation, Metal System Trace, GPU counters.
- Xcode Metal debugger / frame capture for Metal content.
- Simulator/device "Color Blended Layers", "Color Offscreen-Rendered" (Xcode Debug > View Debugging > Rendering).

## GPU-Side Costs

| Cost | Cause | Fix |
|---|---|---|
| Overdraw | Many opaque layers painted over each other (stacked backgrounds) | Remove redundant backgrounds; flatten hierarchy |
| Blending | Translucent views/alpha over large areas | Make views opaque where possible |
| Offscreen rendering (iOS) | `cornerRadius` + `masksToBounds` with content, shadows without `shadowPath`, `mask`, group opacity | Set `shadowPath`, pre-rendered rounded images, avoid masks |
| Save layers (Android) | `alpha` on complex views, `graphicsLayer` with alpha/clip, `setLayerType` misuse | Use `hasOverlappingRendering() = false`, apply alpha to leaf nodes |
| Large textures | Full-resolution bitmaps scaled down at draw | Downsample at decode to view size |
| Shader compilation | First use of a new shader/material (common in Flutter, games) | Warm-up, Impeller (Flutter), precompiled pipelines (Vulkan pipeline cache) |
| Blur / visual effects | Real-time blur is fill-rate heavy | Limit area, static blurred images, platform materials |

## Image Memory and Upload

Decoded bitmap size = width × height × bytes per pixel (4 for ARGB_8888/RGBA8). A 4000×3000 photo is about 48 MB decoded regardless of its JPEG size.
- Android: Coil/Glide size to the target view; `Bitmap.Config.HARDWARE` keeps pixels in GPU memory only.
- iOS: downsample with ImageIO (`CGImageSourceCreateThumbnailAtIndex` with `kCGImageSourceThumbnailMaxPixelSize`) or `UIImage.preparingThumbnail(of:)`; decode off the main thread (`byPreparingForDisplay()`).

```swift
func downsample(url: URL, to pointSize: CGSize, scale: CGFloat) -> UIImage? {
  let opts = [kCGImageSourceShouldCache: false] as CFDictionary
  guard let src = CGImageSourceCreateWithURL(url as CFURL, opts) else { return nil }
  let maxPixel = max(pointSize.width, pointSize.height) * scale
  let thumbOpts = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceShouldCacheImmediately: true,
    kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceThumbnailMaxPixelSize: maxPixel,
  ] as CFDictionary
  guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, thumbOpts) else { return nil }
  return UIImage(cgImage: cg)
}
```

## Cross-Platform Engines
- Flutter: UI thread builds the layer tree, raster thread renders with Impeller (default on iOS and on modern Android devices) to avoid runtime shader-compilation jank; use DevTools Performance view and `--profile` builds.
- React Native: rendering goes through native views (Fabric in the New Architecture); jank is usually JS-thread or bridge/JSI work, or native layout cost.
- Unity/Unreal/custom: target the device refresh rate explicitly; watch thermal state and reduce resolution or effects adaptively.

## Thermal and Power
Sustained GPU load raises temperature and causes frequency throttling, so frame times degrade after minutes. Test sustained scenarios; observe `PowerManager.getThermalHeadroom()` / `addThermalStatusListener` on Android and `ProcessInfo.thermalState` on iOS, and lower quality when headroom is low.

## Checklist
- [ ] Jank measured per refresh rate the device supports
- [ ] Overdraw and blending checked on key screens
- [ ] No offscreen rendering from shadows/masks in scrolling lists (iOS)
- [ ] Images decoded at display size, off the main thread
- [ ] Shader warm-up or precompiled pipelines for custom rendering
- [ ] Sustained-load test for thermal throttling
