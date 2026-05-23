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
version: "1.0.0"
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
```
<camera-media>
<permissions>{camera, library, usage strings}</permissions>
<capture>{photo/video flow, preview, retry}</capture>
<picker>{phpicker, activity-result, cross-platform}</picker>
<processing>{compression, exif-strip, thumbnail}</processing>
<qr>{scanner setup, overlay, callbacks}</qr>
</camera-media>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Camera captures photo/video and returns asset URI
- Media picker selects from gallery with no blank entries
- Image compressed to ≤1024px width, JPEG 0.8 quality
- EXIF data stripped from uploaded images
- QR scanner detects and parses code from camera preview
- All scenarios tested on real device

### Max Response Length
6000 tokens

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

## Common Pitfalls

- **Simulator camera crash**: Camera calls on simulator crash or return nil. Always guard with `UIImagePickerController.isSourceTypeAvailable(.camera)`.
- **Video file too large**: 4K video at 60fps produces huge files. Compress or limit quality to 1080p/720p for uploads.
- **EXIF location leak**: Camera app embeds GPS in image metadata. Strip EXIF before sharing or uploading — even if user is in a privacy-sensitive location.
- **Orientation wrong on upload**: Front camera images are mirrored, orientation flags vary by device. Always normalize orientation before upload.
- **PHPicker blank entries**: Caused by loading images from iCloud without network. Wait for download or show placeholder.

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

## References

- `references/camera-apis.md` — Camera API, permissions, capture flow, QR scanning
- `references/media-processing.md` — Compression, EXIF stripping, thumbnails, video processing, upload

## Handoff
Hand off to mobile-networking skill for upload progress tracking and retry logic, or mobile-storage for local media cache management.
