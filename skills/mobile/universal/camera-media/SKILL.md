---
name: mobile-camera-media
description: >
  Use this skill when the user says 'camera', 'photo', 'video', 'image picker', 'gallery', 'photo library', 'camera capture', 'media picker', 'QR code scanner', 'barcode scanner', 'video recording', 'media upload'. Implement camera capture, media picking, image processing, and QR scanning on iOS and Android. Do NOT use for: audio recording or file storage patterns.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, camera, media, phase-7, universal]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Camera & Media

## Purpose
Guide for implementing camera capture, media picker, image/video processing, and QR/barcode scanning in mobile apps.

## Agent Protocol

### Trigger
Phrases: "camera", "photo", "video", "image picker", "gallery", "photo library", "camera capture", "media picker", "QR code scanner", "barcode scanner", "video recording", "media upload"

### Input Context
- Capture type (photo, video, or both)
- Image quality and size requirements
- QR/barcode scanning needs
- Upload target and format requirements

### Output Artifact
Camera/media module: permission handling, capture flow, picker integration, image compression pipeline, QR scanner setup.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Camera captures photo/video and returns asset URI
- Media picker selects from gallery with no blank entries
- Image compressed to <=1024px width, JPEG 0.8 quality
- EXIF data stripped from uploaded images
- QR scanner detects and parses code from camera preview
- All scenarios tested on real device

### Max Response Length
6000 tokens

## Architecture / Decision Trees

### Capture vs Picker Decision
```
Source of media?
├── Take new photo/video → Camera capture
│   iOS: UIImagePickerController (simple) or AVFoundation (custom UI)
│   Android: CameraX (recommended) or Camera2 (manual control)
├── Select existing → Gallery picker
│   iOS 14+: PHPickerViewController (no full library permission needed)
│   Android: ActivityResultContracts.PickVisualMedia (API 19+ system picker)
├── Document or file → File picker
│   iOS: UIDocumentPickerViewController
│   Android: ActivityResultContracts.OpenDocument
└── QR/barcode → Camera preview with detection overlay
    iOS: AVCaptureMetadataOutput
    Android: ML Kit BarcodeScanning + CameraX
```

### Image Quality Decision
```
Use case for the captured image?
├── Profile photo (small, fast upload) → 256px, JPEG 70, strip EXIF
├── List thumbnail → 512px, WebP (Android) or JPEG 80 (iOS)
├── Detail view → 1024px, JPEG 80, WebP on Android
├── Full resolution (printing, editing) → Original with EXIF preserved
└── Upload to server → 1920px max, JPEG 80, EXIF stripped
```

## Workflow

1. **Camera permissions** — Three iOS permission keys: `NSCameraUsageDescription` (camera access — required for all capture), `NSPhotoLibraryUsageDescription` (save to gallery — required if saving photos), `NSMicrophoneUsageDescription` (video recording — required for video capture). Android permission model changed with API 33: `CAMERA` (runtime permission), `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` (API 33+ granular media permissions, replaces `READ_EXTERNAL_STORAGE`), `RECORD_AUDIO` (video with audio). Legacy Android (<33): `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`. Always request permissions at runtime in context (show rationale first), handle denial with explanation and settings redirect, never request on app launch without context.

2. **Camera capture — photo** — iOS: `UIImagePickerController` (legacy, simpler) or `AVFoundation` `AVCapturePhotoOutput` (full control over camera settings: flash, focus, exposure, white balance). Use `AVFoundation` for custom camera UI (overlays, filters, manual controls). `UIImagePickerController` is simpler for quick capture with standard UI. Android: CameraX (recommended) provides lifecycle-aware camera APIs with `ImageCapture` for photos. Configure `CaptureMode.MINIMIZE_LATENCY` (fast shutter) or `MAXIMIZE_QUALITY` (better image). Camera2 API for full manual control (RAW capture, manual focus, exposure bracketing). After capture: show preview with accept/retry buttons, manage quality vs size tradeoff, save to app-internal storage (not gallery unless explicitly requested). Return content URI for further processing.

3. **Camera capture — video** — iOS: `AVCaptureMovieFileOutput` or `UIImagePickerController.sourceType = .camera` with `cameraCaptureMode = .video`. Configure video quality: `AVCaptureSessionPresetHigh` (1080p), `AVCaptureSessionPresetMedium` (480p), `AVCaptureSessionPresetLow` (360p). Limit duration with `maxRecordedDuration`. Android CameraX: `VideoCapture` with `VideoCaptureConfig` — set bit rate (2-20 Mbps depending on resolution), frame rate (24/30/60fps), resolution (720p/1080p/4K). Enable audio with `AudioConfig`. Both platforms: microphone permission is required for video with audio. Show recording indicator (red dot + timer). Handle interruptions (phone call). After recording: show preview, allow retake or use.

4. **Media picker (gallery)** — iOS 14+: `PHPickerViewController` (modern, no read permission required for limited library access, search support, multi-select). Legacy: `UIImagePickerController.sourceType = .photoLibrary`. PHPicker advantages: doesn't require full photo library access, user can grant access to selected photos only, configurable filter (images only, videos only), multi-select support. Android: `ActivityResultContracts.PickVisualMedia` (API 19+, modern photo picker), `GetContent` (generic file picker), or `OpenDocument` (document picker). The system photo picker (API 19+) doesn't require `READ_EXTERNAL_STORAGE` permission. Always prefer the system picker over custom gallery implementation. Cross-platform: `@capacitor/camera` with `source: CameraSource.Photos`, or Expo Image Picker with `launchImageLibraryAsync`.

5. **Image compression and processing** — Before upload or display, process images to reduce size and protect privacy. Compression pipeline: (a) Resize: max 1024-1920px on longest side (depends on use case — thumbnails 256px, list 512px, detail 1024px, full 1920px). Never upscale. (b) Format: JPEG quality 70-85 (good compression/quality tradeoff), WebP for Android (20-30% smaller than JPEG with same quality), AVIF (newest, 50% smaller than JPEG but slower encoding). (c) EXIF stripping: remove GPS location, device make/model, timestamp, software, orientation. Use platform APIs to strip metadata. (d) Orientation correction: read EXIF orientation tag and rotate bitmap accordingly before any processing. (e) Thumbnail generation: 256x256 pixel thumbnail for list views, generated from the resized image.

6. **QR and barcode scanning** — iOS: `AVCaptureMetadataOutput` with `metadataObjectTypes` — supports QR, EAN-13, EAN-8, Code 128, Code 39, PDF417, Aztec, DataMatrix, and more. Set up camera preview with `AVCaptureVideoPreviewLayer`. Detection callback provides bounding box and decoded string. Play system sound on detection (`AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)`). Android ML Kit: `BarcodeScanning` with `BarcodeScannerOptions` to specify formats. Process frames from `CameraX ImageAnalysis` or `Camera2`. Detection via `addOnSuccessListener` with barcode results. Cross-platform: `@capacitor/camera` (basic QR scanning) or dedicated `@capacitor/qr-scanner`. UX: semi-transparent overlay showing scan area, torch control button for low light, manual code entry fallback, continuous scanning after result (with debounce to prevent duplicates).

7. **Cross-platform camera plugins** — Capacitor `@capacitor/camera`: unified photo/video capture and picker, returns base64 or content URI, handles permissions. `@capacitor/filesystem`: save to device, read file metadata. `@capacitor/preferences`: simple storage. For QR scanning: `@capacitor/qr-scanner` or ML Kit via custom Capacitor plugin. Flutter: `image_picker` for capture/picker, `camera` for custom camera UI, `mobile_scanner` for QR/barcode, `flutter_image_compress` for compression. React Native: `react-native-image-picker`, `react-native-vision-camera`, `react-native-camera-kit` (QR). Cross-platform tradeoffs: faster development, but limited flexibility for custom camera UI, manual camera controls, and video processing. Cross-platform to native migration path: start with plugin, extract to custom native code when requirements exceed plugin capabilities.

## Camera API Comparison

| Feature | CameraX (Android) | AVFoundation (iOS) | Capacitor | Flutter |
|---------|------------------|-------------------|-----------|---------|
| Photo capture | Full | Full | Full | Full |
| Video recording | Full | Full | Basic | Basic |
| Camera preview | Yes | Yes | Default UI | Customizable |
| Manual focus | Yes | Yes | No | No |
| QR scanning | ML Kit | MetadataOutput | Plugin | Plugin |
| Permission handling | Lifecycle-aware | Delegate-based | Auto | Auto |

## Best Practices

- Camera permission must be requested before capture — never silent camera access
- Photo library permission needed for gallery picker (iOS PHPicker exempt on iOS 14+)
- Strip EXIF data before upload — location and device info are privacy risks
- Compress images server-ready before network call — never upload raw camera output
- Test on real devices — simulator camera is limited or non-functional
- Show camera preview behind permission request rationale (user understands why camera needed)
- Handle camera interruption (phone call) gracefully — pause preview, resume when call ends

## Security Considerations

- EXIF data contains GPS coordinates, device serial, camera model — strip before upload
- Camera preview frames are sensitive data — never log, store, or transmit raw frames
- QR codes can contain malicious URLs — validate URL scheme before opening
- Store captured images in app-private directory, not shared gallery (unless user explicitly saves)
- Clear temporary image files after upload to prevent disk snooping
- iOS Info.plist and AndroidManifest must declare camera usage with clear description strings
- Video files can be large — encrypt at rest if they contain sensitive content

## Common Pitfalls

- **Simulator camera crash**: Camera calls on simulator crash or return nil. Always guard with `UIImagePickerController.isSourceTypeAvailable(.camera)`.
- **Video file too large**: 4K video at 60fps produces huge files. Compress or limit quality to 1080p/720p for uploads.
- **EXIF location leak**: Camera app embeds GPS in image metadata. Strip EXIF before sharing or uploading — even if user is in a privacy-sensitive location.
- **Orientation wrong on upload**: Front camera images are mirrored, orientation flags vary by device. Always normalize orientation before upload.
- **PHPicker blank entries**: Caused by loading images from iCloud without network. Wait for download or show placeholder.
- **QR scan in low light**: Provide torch toggle and manual code entry as fallback.
- **Memory pressure from full-res images**: Decode at display size, not original size — use `BitmapFactory.Options.inSampleSize` or `DownsamplingDecoder`.

## Configuration Reference

```xml
<!-- iOS Info.plist camera permissions -->
<key>NSCameraUsageDescription</key>
<string>App needs camera to take profile photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>App needs photo library to select images</string>
<key>NSMicrophoneUsageDescription</key>
<string>App needs microphone for video recording</string>
```

## Document Scanning (ML-based)

Modern mobile apps can detect documents in camera preview and auto-capture them. iOS 13+: `VNDocumentCameraViewController` with `VNDetectRectanglesRequest` for quadrilateral detection. Android: ML Kit Document Scanner API (`ScanObjects`). Implementation flow: (1) camera preview runs continuously with rectangle detection on each frame, (2) when a document quadrilateral is detected with confidence >0.8, show a highlighted overlay, (3) auto-capture when document stays stable for 500ms, (4) apply perspective correction to transform the detected quadrilateral to a flat rectangle, (5) apply auto-enhance: contrast adjustment, shadow removal, binarization, (6) output as JPEG/PDF with optional multi-page support. UX: user can manually trigger capture, adjust corners after capture, and reorder multi-page documents. For cross-platform: use ML Kit via native modules or Capacitor plugin. Document scanning is camera-intensive — process frames at 15fps max to save battery, use lower resolution for detection (640x480) and full resolution for capture.

## Real-Time Camera Filters & Effects

Live filters during camera preview require GPU-accelerated processing via Metal (iOS) or OpenGL ES/Vulkan (Android). Approach: (a) capture frame as `CVPixelBuffer` (iOS) or `Image` (Android) from camera output, (b) apply GPU shader pipeline: color matrix adjustment → lookup table (LUT) → bloom → vignette, (c) render filtered result to preview layer. For iOS: `AVCaptureVideoDataOutputSampleBufferDelegate` + `MetalPerformanceShaders` or `CIFilter` chain. For Android: `CameraX ImageAnalysis` + `RenderScript` or `AGSL` (Android GPU Shading Language) shaders. Avoid CPU-side pixel processing at 30fps — always use GPU pipeline. Common filters: beauty (skin smoothing, tone adjustment), vintage (sepia, grain), cinematic (color grading LUT), bokeh (portrait mode with depth). Performance budget: filter processing must complete in <16ms for 60fps preview. Downscale preview to 720p for filter processing, keep full resolution only for capture.

### Video Encoding Format Comparison

| Format | Compression | Quality | Encoding Speed | Decode Support |
|--------|------------|---------|---------------|----------------|
| H.264 (AVC) | Good (1x) | Good | Fast | Universal — all devices |
| H.265 (HEVC) | Better (2x H.264) | Better | Slower | iOS 11+, Android 5+ hardware |
| VP9 | Better (1.5x H.264) | Good | Slow | Android native, iOS via software |
| AV1 | Best (3x H.264) | Best | Very slow (real-time encoding limited) | Google Pixel 7+, iOS 17+ |
| ProRes | Uncompressed | Lossless | Fast | iOS 15+ (iPhone 13 Pro+)

For most mobile apps: use H.265 on devices that support it (hardware encoder), fallback to H.264 on older devices. AV1 encoding is not yet practical for real-time mobile capture but is the future. Always test encode/decode speed vs file size tradeoff for your use case.

### Video Recording Quality Decision
```
Target use for recorded video?
├── Social media share (TikTok, Instagram, Stories)
│   → 1080p@30fps, H.264, 8Mbps bitrate, stereo audio
├── Professional/editing → 4K@60fps, H.265, 50Mbps, ProRes log
│   Only on devices with hardware encoding support
├── Preview/thumbnail only → 720p@30fps, H.264, 4Mbps
├── Video call / streaming → 720p@30fps, H.264, 2Mbps, adaptive bitrate
└── Document/archive → 1080p@30fps, H.265, 12Mbps, keep original
```

### Image Format Selection Decision
```
Primary platform?
├── iOS-only → HEIF (HEIC) — 50% smaller than JPEG, same quality
│   iOS 11+, hardware encode/decode, preserves depth data
├── Android-only → WebP — 25-35% smaller than JPEG
│   Android 4.0+ (decode), 4.3+ (encode), support varies by API
├── Cross-platform upload → JPEG (most compatible, widely supported)
│   Quality 80-85 for photos, 70-75 for thumbnails
├── Cross-platform with progressive → AVIF (next-gen)
│   50% smaller than JPEG, limited device support, slower encode
└── Lossless needed → PNG (never use for photos, use for screenshots/ui)
    Huge file size, acceptable only for UI assets
```

## Camera Benchmark Decision Tree

```
Camera performance concern?
├── Capture latency → Measure shutter-to-preview <500ms
│   ├── iOS: AVCapturePhotoOutput.isFastCapturePrioritizationSupported
│   └── Android: CameraX ImageCapture.CaptureMode.MINIMIZE_LATENCY
├── Frame processing latency → Measure <33ms per frame at 30fps
│   ├── Use GPU pipeline (Metal/OpenGL/Vulkan), not CPU
│   └── Downscale analysis frames to 640x480
├── Memory pressure → <200MB for camera pipeline
│   └── Release buffer pool on pause, use surface pool
└── Battery impact → <400mW for sustained capture
    └── Reduce frame rate, disable auto-focus scanning when idle
```

## Production Considerations

### Camera Failure Modes

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Camera not available (in use by another app) | Preview black | Show "Camera in use" message, offer picker fallback |
| Permission denied (after re-grant) | Capture returns nil | Verify `AVCaptureDevice.authorizationStatus` before capture |
| Video file too large for upload | Upload fails/timeout | Compress before upload, chunked upload, 4K→1080p limit |
| Memory pressure on high-res capture | App terminated | Capture at screen resolution, not sensor resolution |
| iCloud photo not downloaded | PHPicker blank entries | Wait for download or show placeholder |
| QR scan in low light | No detection | Torch toggle, manual entry fallback |
| Front camera orientation wrong | Mirrored selfie | Mirror output for front camera, respect EXIF orientation |

### Video Compression & Transcoding Pipeline

For upload-ready video, implement a compression pipeline that balances quality and file size. Steps: (1) check device capabilities — prefer hardware encoder (iOS `AVAssetWriter` with `AVVideoCodecTypeHEVC`, Android `MediaCodec` with `MIME_TYPE_HEVC`), fallback to software if unavailable, (2) set target resolution — never upscale, always downscale (4K→1080p for most uploads), (3) configure bitrate — variable bitrate (VBR) for quality efficiency, constant bitrate (CBR) for predictable file size, (4) set keyframe interval — every 2 seconds (60 frames at 30fps) for seekability, (5) set frame rate — 30fps for general video, 60fps only if action/motion critical, (6) apply audio coding — AAC at 128kbps stereo, downmix multichannel to stereo. Implementation: Android uses `MediaMuxer` with `MediaCodec` encoder. iOS uses `AVAssetWriter` with `AVAssetWriterInput`. For cross-platform: use FFmpeg via mobile bindings (`mobile-ffmpeg`), but prefer platform-native encoders for battery efficiency and speed.

### Trimming & Editing Patterns
```
Video editing capability needed?
├── Trim only → AVPlayer (iOS) / VideoView (Android) with range slider
│   Use CMTimeRange / MediaMetadataRetriever for frame extraction
├── Combine clips → AVMutableComposition / MediaMuxer sequential concatenation
│   Re-encode needed if codecs differ between clips
├── Add overlay → AVVideoComposition (iOS) / MediaCodec with GPU shader (Android)
│   Overlay images, text, watermarks — GPU pipeline for performance
└── Audio replace → AVMutableComposition track insertion / AudioTrack mixing
    Maintain sync with original video timeline via CMTime mapping
```

### Troubleshooting Checklist

- Verify camera permission keys in Info.plist (iOS) and Manifest (Android)
- Check `isSourceTypeAvailable(.camera)` before showing camera (iOS)
- Test on real device — simulator camera is simulated/limited
- Validate EXIF stripped before upload (check in debug)
- Verify orientations correct for both front and back cameras
- Test video recording with audio interruption (incoming call)
- Confirm PHPicker works without full photo library permission (iOS 14+)
- Validate system photo picker works without storage permission (Android API 19+)

### CI/CD Integration

- Run camera tests on Firebase Test Lab / AWS Device Farm
- Validate EXIF data is stripped in compressed output images
- Verify compression produces files under target size (e.g., <500KB for upload)
- Test QR scanning with low-resolution preview (640x480)
- Verify all permission descriptions are present and descriptive
- Check video compression bitrate doesn't exceed target (2-8 Mbps for 1080p)

## Code Examples

### CameraX Android — Photo Capture with ImageAnalysis
```kotlin
class CameraFragment : Fragment() {
    private var imageCapture: ImageCapture? = null
    private var imageAnalysis: ImageAnalysis? = null

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext())
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(viewFinder.surfaceProvider)
            }
            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .setTargetRotation(Surface.ROTATION_0)
                .build()
            imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setTargetResolution(Size(640, 480))
                .build()
            imageAnalysis?.setAnalyzer(Executors.newSingleThreadExecutor()) { image ->
                // Process frame for QR/barcode/document detection
                scanImage(image)
            }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageCapture, imageAnalysis
                )
            } catch (e: Exception) { Log.e(TAG, "Camera bind failed", e) }
        }, ContextCompat.getMainExecutor(requireContext()))
    }

    fun takePhoto() {
        val photoFile = File(requireContext().cacheDir, "photo_${System.currentTimeMillis()}.jpg")
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
        imageCapture?.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(requireContext()),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    val uri = Uri.fromFile(photoFile)
                    compressAndUpload(uri)
                }
                override fun onError(exception: ImageCaptureException) {
                    showError("Photo capture failed: ${exception.message}")
                }
            }
        )
    }
}
```

### AVFoundation Swift — Custom Camera with Photo Output
```swift
import AVFoundation

class CameraController: NSObject {
    private var captureSession: AVCaptureSession!
    private var photoOutput: AVCapturePhotoOutput!
    private var videoOutput: AVCaptureVideoDataOutput!

    func startCamera(in previewView: PreviewView) {
        captureSession = AVCaptureSession()
        captureSession.sessionPreset = .photo

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera) else {
            return
        }
        captureSession.addInput(input)

        photoOutput = AVCapturePhotoOutput()
        guard captureSession.canAddOutput(photoOutput) else { return }
        captureSession.addOutput(photoOutput)

        videoOutput = AVCaptureVideoDataOutput()
        videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "video.queue"))
        guard captureSession.canAddOutput(videoOutput) else { return }
        captureSession.addOutput(videoOutput)

        previewView.videoPreviewLayer.session = captureSession
        DispatchQueue.global(qos: .userInitiated).async {
            self.captureSession.startRunning()
        }
    }

    func capturePhoto() {
        let settings = AVCapturePhotoSettings()
        settings.flashMode = .auto
        settings.isHighResolutionPhotoEnabled = true
        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    func compressAndStripMetadata(_ image: Data) -> Data? {
        guard let source = CGImageSourceCreateWithData(image as CFData, nil) else { return nil }
        let metadata: NSDictionary = [:]  // Empty = strip all metadata
        let mutableData = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(
            mutableData, UTType.jpeg.identifier as CFString, 1, nil
        ) else { return nil }
        CGImageDestinationAddImageFromSource(destination, source, 0, metadata)
        CGImageDestinationSetProperties(destination, [
            kCGImageDestinationLossyCompressionQuality: 0.8
        ])
        CGImageDestinationFinalize(destination)
        return mutableData as Data
    }
}
```

### Video Capture with AVFoundation (iOS)
```swift
extension CameraController: AVCaptureFileOutputRecordingDelegate {
    func startVideoRecording() {
        guard let videoOutput = videoOutput as? AVCaptureMovieFileOutput else { return }
        let outputPath = NSTemporaryDirectory().appending("video_\(Date().timeIntervalSince1970).mp4")
        let outputURL = URL(fileURLWithPath: outputPath)
        videoOutput.startRecording(to: outputURL, recordingDelegate: self)
    }

    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo url: URL,
                    from connections: [AVCaptureConnection], error: Error?) {
        if let error = error {
            print("Recording error: \(error.localizedDescription)")
            return
        }
        compressVideo(inputURL: url) { compressedURL in
            // Upload compressed video
            uploadVideo(compressedURL)
        }
    }

    func compressVideo(inputURL: URL, completion: @escaping (URL) -> Void) {
        let asset = AVAsset(url: inputURL)
        guard let exportSession = AVAssetExportSession(
            asset: asset, presetName: AVAssetExportPreset1920x1080
        ) else { return }
        let outputURL = URL(fileURLWithPath: NSTemporaryDirectory()
            .appending("compressed_\(Date().timeIntervalSince1970).mp4"))
        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mp4
        exportSession.shouldOptimizeForNetworkUse = true
        exportSession.exportAsynchronously {
            DispatchQueue.main.async {
                completion(outputURL)
            }
        }
    }
}
```

### Android CameraX Video Capture
```kotlin
class VideoCaptureFragment : Fragment() {
    private var videoCapture: VideoCapture? = null
    private var isRecording = false

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext())
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(viewFinder.surfaceProvider)
            }
            videoCapture = VideoCapture.Builder()
                .setVideoFrameRate(30)
                .setBitRate(8_000_000) // 8 Mbps for 1080p
                .setTargetResolution(Size(1920, 1080))
                .build()

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            cameraProvider.bindToLifecycle(this, cameraSelector, preview, videoCapture)
        }, ContextCompat.getMainExecutor(requireContext()))
    }

    fun toggleRecording() {
        if (isRecording) {
            videoCapture?.stopRecording()
            isRecording = false
        } else {
            val file = File(requireContext().cacheDir, "video_${System.currentTimeMillis()}.mp4")
            val outputOptions = VideoCapture.OutputFileOptions.Builder(file).build()
            videoCapture?.startRecording(
                outputOptions,
                ContextCompat.getMainExecutor(requireContext()),
                object : VideoCapture.OnVideoSavedCallback {
                    override fun onVideoSaved(output: VideoCapture.OutputFileResults) {
                        compressAndUpload(Uri.fromFile(file))
                    }
                    override fun onError(videoCaptureError: Int, message: String, cause: Throwable?) {
                        showError("Video recording failed: $message")
                    }
                }
            )
            isRecording = true
        }
    }
}
```

### React Native Vision Camera — QR Scanner
```typescript
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

export function QRScanner({ onCodeScanned }: { onCodeScanned: (value: string) => void }) {
  const device = useCameraDevice('back');

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128'],
    onCodeScanned: (codes) => {
      const code = codes[0]?.value;
      if (code) {
        onCodeScanned(code);
      }
    },
  });

  if (!device) return <Text>Camera not available</Text>;

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      codeScanner={codeScanner}
      isActive={true}
      torch="off"
    />
  );
}
```

### Camera Hardware Feature Detection
```
Camera features needed?
├── Flash / Torch → Check hasFlash (iOS) / isFlashSupported (Android)
│   Torch for video light, flash for still photo
│   Never assume flash is available — always check
├── Optical zoom (hardware) → device.activeFormat.videoZoomFactor (iOS)
│   Optical zoom range: typically 1x-3x (iPhone Pro: 1x-5x)
│   Digital zoom beyond optical range degrades quality
├── HDR capture → supportsHighResolutionPhoto (iOS) / isHdrSupported (Android)
│   HDR merges multiple exposures — better dynamic range
│   Increases processing time and file size
├── Portrait mode / Depth → isDepthDataDeliverySupported (iOS) / Depth API (Android)
│   Requires dual camera (iOS) or time-of-flight sensor (Android)
│   Depth data enables bokeh effect and AR occlusion
├── Night mode → Camera2 AUTO mode (Android) / AVCapturePhotoOutput.isAppleProRAWSupported (iOS)
│   Automatically activates in low light (<10 lux)
│   Longer exposure — warn user to hold steady
└── Macro photography → minFocusDistance (iOS) / isAutoFocusSupported near range
    Requires ultra-wide camera with macro focus
    Closest focus distance typically 2cm (iPhone 13 Pro+)
```

### Performance Measurement & Budget Table

| Metric | Budget | Measurement Tool |
|--------|--------|-----------------|
| Shutter-to-preview latency | <500ms | `AVCapturePhotoOutput` delegate timing |
| Frame processing (30fps) | <33ms per frame | `CADisplayLink` / `Choreographer` |
| Capture memory | <200MB | Xcode Memory Gauge / Android Profiler |
| Video encode (1080p) | <100ms per GOP | `AVAssetWriter` delegate timing |
| Battery during capture | <400mW | Xcode Energy Log / BatteryManager |
| Image compression | <500ms per 12MP | Measure before/after compression call |
| QR detection latency | <200ms | `AVCaptureMetadataOutput` timing |
| App termination rate | <0.1% on camera screen | Crash reporting provider |

### Multi-Camera Switching Patterns
```
Seamless camera switching (front/back/ultrawide/tele)?
├── Single-camera device → Simple switch, pause session, reconfigure input
│   Brief black frame during switch is acceptable
├── Multi-camera device (iPhone Pro, Pixel Pro) → Simultaneous camera streaming
│   iOS: AVCaptureMultiCamSession (up to 4 concurrent inputs)
│   Android: CameraX concurrent camera (API 30+)
│   Pre-warm inactive camera to eliminate switch latency
│   Cross-fade between camera feeds during switch
└── Zoom-dependent camera switch → Auto-switch at focal length thresholds
    1x → Main camera (wide), 2x → Telephoto, <1x → Ultra-wide
    Show a smooth zoom transition (not a hard cut)
    Disable auto-switch if user is recording video (avoid mid-recording camera change)
```

## References
  - references/camera-apis.md — Camera APIs
  - references/camera-capture.md — Camera Capture
  - references/camera-media-capture.md — Camera & Media Capture Patterns
  - references/camera-permissions.md — Camera Permissions — iOS & Android
  - references/media-processing.md — Media Processing
  - references/video-recording.md — Video Recording — Mobile
  - references/camera-media-fundamentals.md — Camera & Media Fundamentals
  - references/camera-media-advanced.md — Advanced Camera & Media Patterns
  - references/camera-document-scanning.md — Document Scanning Guide

## Handoff
Hand off to mobile-networking skill for upload progress tracking and retry logic, or mobile-storage for local media cache management.
