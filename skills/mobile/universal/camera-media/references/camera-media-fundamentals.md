# Camera & Media Fundamentals

## Core Concepts

### Capture vs. Picker
- **Camera capture**: Take a new photo/video using the device camera
- **Media picker**: Select existing media from the device gallery/photos
- **File picker**: Select any file from device storage

### Image Pipeline
```
Camera/Picker → Raw Image → Resize → Compress → Strip EXIF → Upload/Display
                           → Generate Thumbnail → Cache
```

### Key Quality Parameters
- **Resolution**: Width x height in pixels (e.g., 1920x1080)
- **Quality**: JPEG compression level 0-100 (80 = good, 70 = acceptable)
- **Format**: JPEG (universal), WebP (Android, smaller), HEIF (iOS, smaller)
- **Bitrate** (video): Bits per second (2-8 Mbps for 1080p)
- **Frame rate** (video): Frames per second (24/30/60fps)

## Permission Management

### iOS Permissions
| Key | Purpose | Required For |
|-----|---------|-------------|
| `NSCameraUsageDescription` | Camera access | All camera capture |
| `NSPhotoLibraryUsageDescription` | Photo library save | Saving to gallery |
| `NSPhotoLibraryAddUsageDescription` | Add to gallery | Adding photos |
| `NSMicrophoneUsageDescription` | Microphone | Video recording |

### Android Permissions
| Permission | API Level | Purpose |
|-----------|-----------|---------|
| `CAMERA` | All | Camera access (runtime) |
| `READ_MEDIA_IMAGES` | API 33+ | Read images from gallery |
| `READ_MEDIA_VIDEO` | API 33+ | Read videos from gallery |
| `READ_EXTERNAL_STORAGE` | < API 33 | Legacy read storage |
| `RECORD_AUDIO` | All | Video with audio |

### Permission Request Pattern
```kotlin
// Android — request camera permission in context
private fun requestCameraPermission() {
    when {
        ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED -> openCamera()
        shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) ->
            showRationaleDialog { requestPermissions(arrayOf(Manifest.permission.CAMERA), CAMERA_REQ) }
        else ->
            requestPermissions(arrayOf(Manifest.permission.CAMERA), CAMERA_REQ)
    }
}
```

## Basic Camera Capture

### iOS (UIImagePickerController)
```swift
class CameraViewController: UIViewController, UIImagePickerControllerDelegate {
    func showCamera() {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            showUnavailableAlert()
            return
        }
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = self
        present(picker, animated: true)
    }

    func imagePickerController(_ picker: UIImagePickerController,
                                didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        guard let image = info[.originalImage] as? UIImage else { return }
        // Process image
        picker.dismiss(animated: true)
    }
}
```

### Android (CameraX)
```kotlin
// CameraX lifecycle-aware camera with ImageCapture
class PhotoCaptureFragment : Fragment() {
    private var imageCapture: ImageCapture? = null

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext())
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build()
            cameraProvider.bindToLifecycle(
                this, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageCapture
            )
        }, ContextCompat.getMainExecutor(requireContext()))
    }

    fun takePhoto() {
        val file = File(requireContext().cacheDir, "photo.jpg")
        imageCapture?.takePicture(
            ImageCapture.OutputFileOptions.Builder(file).build(),
            ContextCompat.getMainExecutor(requireContext()),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    // File saved at file.absolutePath
                }
                override fun onError(e: ImageCaptureException) {
                    // Handle error
                }
            }
        )
    }
}
```

## Basic Media Picker

### iOS (PHPickerViewController — iOS 14+)
```swift
import PhotosUI

class PickerViewController: UIViewController, PHPickerViewControllerDelegate {
    func showPicker() {
        var config = PHPickerConfiguration()
        config.filter = .images  // or .videos, .any
        config.selectionLimit = 1

        let picker = PHPickerViewController(configuration: config)
        picker.delegate = self
        present(picker, animated: true)
    }

    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)
        guard let provider = results.first?.itemProvider else { return }
        if provider.canLoadObject(ofClass: UIImage.self) {
            provider.loadObject(ofClass: UIImage.self) { image, error in
                DispatchQueue.main.async {
                    // Use the selected image
                }
            }
        }
    }
}
```

### Android (ActivityResultContracts)
```kotlin
class GalleryPickerFragment : Fragment() {
    private val pickVisualMedia = registerForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        uri?.let {
            // Use the selected image URI
            compressAndUpload(it)
        }
    }

    fun showPicker() {
        pickVisualMedia.launch(PickVisualMediaRequest(
            ActivityResultContracts.PickVisualMedia.ImageOnly
        ))
    }
}
```

## Image Compression Pipeline

```swift
func processImageForUpload(_ image: UIImage, maxSize: CGFloat = 1920) -> Data? {
    // 1. Resize
    let targetSize = image.size.constrained(to: maxSize)
    let renderer = UIGraphicsImageRenderer(size: targetSize)
    let resized = renderer.image { _ in
        image.draw(in: CGRect(origin: .zero, size: targetSize))
    }

    // 2. Compress
    guard let compressed = resized.jpegData(compressionQuality: 0.8) else { return nil }

    // 3. Strip EXIF (JPEG without metadata)
    guard let source = CGImageSourceCreateWithData(compressed as CFData, nil),
          let destination = CGImageDestinationCreateWithData(
            NSMutableData() as CFMutableData,
            UTType.jpeg.identifier as CFString, 1, nil
          ) else { return nil }
    CGImageDestinationAddImageFromSource(destination, source, 0, [:] as CFDictionary)
    CGImageDestinationFinalize(destination)

    return destination as? Data
}
```

## Common Configurations

### Image Quality by Use Case
| Use Case | Max Dimension | Format | Quality | Strip EXIF |
|----------|--------------|--------|---------|------------|
| Profile photo | 256px | JPEG | 70% | Yes |
| List thumbnail | 512px | WebP/JPEG | 75% | Yes |
| Detail view | 1024px | JPEG | 80% | Yes |
| Full resolution | Original | JPEG/HEIF | 95% | No (keep) |
| Server upload | 1920px | JPEG | 80% | Yes |

### Video Quality Settings
| Quality | Resolution | Bitrate | File Size (1 min) |
|---------|-----------|---------|-------------------|
| Low | 480p (854x480) | 1 Mbps | ~7.5 MB |
| Medium | 720p (1280x720) | 4 Mbps | ~30 MB |
| High | 1080p (1920x1080) | 8 Mbps | ~60 MB |
| Ultra | 4K (3840x2160) | 20 Mbps | ~150 MB |
