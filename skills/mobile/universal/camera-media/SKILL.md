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

1. **Camera permissions** — iOS: NSCameraUsageDescription, NSPhotoLibraryUsageDescription, NSMicrophoneUsageDescription (for video). Android: CAMERA, READ_MEDIA_IMAGES (API 33+), READ_EXTERNAL_STORAGE (legacy). Request at runtime, handle denial gracefully.

2. **Capture flow** — Present camera interface → user captures → show preview with accept/retry → save to temp/gallery → return asset URI. Manage image quality vs size: max 1920px for full-res, 640px for thumbnails. Video: limit duration (30s default), control quality (720p/1080p/4K).

3. **Media picker** — iOS: PHPickerViewController (no read permission required for limited library). Android: ActivityResultContracts.PickVisualMedia or GetContent. Cross-platform: Expo Image Picker or @capacitor/camera. Always support manual file input fallback.

4. **Image processing** — Compress before upload: resize to max 1024px on longest side, JPEG quality 0.8, convert to WebP for Android. Strip EXIF (location, device info) for privacy. Generate thumbnail (256x256) for list views. Apply orientation correction from EXIF.

5. **QR/barcode scanning** — ML Kit barcode scanning (Android), AVFoundation metadata capture (iOS). Camera preview with semi-transparent overlay showing scan area. Detection callback → parse result → haptic feedback → navigate or populate field. Torch control for low-light environments.

## Rules

- Camera permission must be requested before capture — no silent camera access.
- Photo library permission needed for gallery picker (iOS PHPicker exempt on iOS 14+).
- Strip EXIF data before upload — location and device info are privacy risks.
- Compress images server-ready before any network call — never upload raw camera output.
- Test on real devices — simulator camera is limited or non-functional.
- Provide manual file pick fallback when camera hardware unavailable.
- Orientation correction must be applied from EXIF before display/upload.
- Video capture requires microphone permission on iOS.

## References

- `references/camera-capture.md` — Camera API, permissions, capture flow, QR scanning
- `references/media-processing.md` — Compression, EXIF stripping, thumbnails, video processing, upload

## Handoff
Hand off to mobile-networking skill for upload progress tracking and retry logic, or mobile-storage for local media cache management.
