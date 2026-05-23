# Camera APIs

## Platform Camera API Comparison

| Feature | CameraX (Android) | Camera2 (Android) | AVFoundation (iOS) | UIImagePicker (iOS) |
|---------|------------------|-------------------|-------------------|-------------------|
| API level | Easy (lifecycle-aware) | Complex (full control) | Moderate | Simplest |
| Photo capture | `ImageCapture` | `CaptureRequest` template | `AVCapturePhotoOutput` | Built-in |
| Video capture | `VideoCapture` | `MediaRecorder` | `AVCaptureMovieFileOutput` | Built-in |
| Camera preview | `PreviewView` | `TextureView` | `AVCaptureVideoPreviewLayer` | Full-screen |
| Manual controls | Limited | Full (ISO, shutter, focus) | Full | None |
| QR scanning | Via ML Kit | Via ML Kit | `AVCaptureMetadataOutput` | No |
| Lifecycle aware | Yes (auto) | Manual | Manual | Manual |
| Permission | Request at runtime | Request at runtime | Request at runtime | Request at runtime |

## Permission Request Flow

### iOS

```swift
import AVFoundation

func requestCameraPermission(completion: @escaping (Bool) -> Void) {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
        completion(true)
    case .notDetermined:
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async { completion(granted) }
        }
    case .denied, .restricted:
        // Show alert: "Camera access is required. Go to Settings to enable."
        showSettingsAlert()
        completion(false)
    @unknown default:
        completion(false)
    }
}
```

### Android

```kotlin
// Using ActivityResultContracts
class CameraFragment : Fragment() {
    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            openCamera()
        } else {
            // Show rationale dialog → redirect to Settings
            showPermissionDeniedDialog()
        }
    }

    private fun checkAndRequestCamera() {
        when {
            ContextCompat.checkSelfPermission(requireContext(),
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED -> {
                openCamera()
            }
            shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) -> {
                showRationaleDialog {
                    cameraLauncher.launch(Manifest.permission.CAMERA)
                }
            }
            else -> {
                cameraLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }
}
```

## Camera Capture — iOS (AVFoundation)

```swift
import AVFoundation
import UIKit

class CameraController: NSObject {
    let captureSession = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private let videoOutput = AVCaptureMovieFileOutput()
    var previewLayer: AVCaptureVideoPreviewLayer?

    func setupCamera(position: AVCaptureDevice.Position = .back) throws {
        captureSession.beginConfiguration()
        captureSession.sessionPreset = .high

        guard let device = AVCaptureDevice.default(
            .builtInWideAngleCamera, for: .video, position: position) else {
            throw CameraError.deviceNotFound
        }

        let input = try AVCaptureDeviceInput(device: device)
        guard captureSession.canAddInput(input) else { throw CameraError.inputError }
        captureSession.addInput(input)

        guard captureSession.canAddOutput(photoOutput) else { throw CameraError.outputError }
        captureSession.addOutput(photoOutput)

        captureSession.commitConfiguration()
    }

    func capturePhoto(delegate: AVCapturePhotoCaptureDelegate) {
        let settings = AVCapturePhotoSettings()
        settings.flashMode = .auto
        settings.isHighResolutionPhotoEnabled = true
        photoOutput.capturePhoto(with: settings, delegate: delegate)
    }

    enum CameraError: Error {
        case deviceNotFound, inputError, outputError
    }
}
```

## Camera Capture — Android (CameraX)

```kotlin
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import java.util.concurrent.Executors

class CameraXManager(private val previewView: PreviewView) {
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private var imageCapture: ImageCapture? = null

    fun startCamera(lifecycleOwner: LifecycleOwner) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(previewView.context)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .setJpegQuality(85)
                .setTargetRotation(previewView.display?.rotation ?: Surface.ROTATION_0)
                .build()

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    lifecycleOwner, cameraSelector, preview, imageCapture
                )
            } catch (e: Exception) {
                Log.e("CameraX", "Binding failed", e)
            }
        }, ContextCompat.getMainExecutor(previewView.context))
    }

    fun takePhoto(outputDir: File, onSuccess: (File) -> Unit, onError: (Exception) -> Unit) {
        val photoFile = File(outputDir, "photo_${System.currentTimeMillis()}.jpg")
        val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()
        imageCapture?.takePicture(
            outputOptions,
            cameraExecutor,
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    onSuccess(photoFile)
                }
                override fun onError(e: ImageCaptureException) {
                    onError(e)
                }
            }
        )
    }
}
```

## QR/Barcode Scanning

### iOS — AVFoundation

```swift
import AVFoundation

class QRScannerController: NSObject {
    let captureSession = AVCaptureSession()
    private let metadataOutput = AVCaptureMetadataOutput()

    func setupScanner() throws {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            throw ScannerError.deviceError
        }
        captureSession.addInput(input)
        captureSession.addOutput(metadataOutput)

        metadataOutput.metadataObjectTypes = [
            .qr, .ean13, .ean8, .code128, .code39, .pdf417, .aztec, .dataMatrix
        ]
        metadataOutput.setMetadataObjectsDelegate(self, queue: .main)
    }

    func startScanning() { captureSession.startRunning() }
    func stopScanning() { captureSession.stopRunning() }
}

extension QRScannerController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput objects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard let code = objects.first as? AVMetadataMachineReadableCodeObject,
              let value = code.stringValue else { return }
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        stopScanning()
        // Handle scanned value
    }
}
```

### Android — ML Kit

```kotlin
// build.gradle.kts
// implementation("com.google.mlkit:barcode-scanning:17.3.0")

class QRScannerAnalyzer(
    private val onCodeDetected: (String) -> Unit
) : ImageAnalysis.Analyzer {
    private val scanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(
                Barcode.FORMAT_QR_CODE,
                Barcode.FORMAT_EAN_13,
                Barcode.FORMAT_CODE_128
            )
            .build()
    )

    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) { imageProxy.close(); return }

        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                barcodes.firstOrNull()?.rawValue?.let { value ->
                    AudioManager().playSoundEffect(SoundEffect.EFFECT_KEY_CLICK)
                    onCodeDetected(value)
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    }
}
```

### Cross-Platform — Capacitor

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  resultType: CameraResultType.Uri,
  source: CameraSource.Camera,  // or .Photos for gallery
  quality: 85,
  width: 1920,
  allowEditing: true,
  saveToGallery: false,
});
```

No preamble. No postamble. No explanations.
