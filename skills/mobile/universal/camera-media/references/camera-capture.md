# Camera Capture

## Permission Request Flow

```swift
// iOS
AVCaptureDevice.requestAccess(for: .video) { granted in
  if granted { /* present camera */ }
  else { /* show settings alert */ }
}

// Android
val launcher = registerForActivityResult(
  ActivityResultContracts.RequestPermission()
) { granted ->
  if (granted) /* open camera */ else /* show rationale */
}
launcher.launch(Manifest.permission.CAMERA)
```

## Camera Capture — iOS (AVFoundation)

```swift
import AVFoundation

let picker = UIImagePickerController()
picker.sourceType = .camera
picker.cameraCaptureMode = .photo
picker.cameraFlashMode = .auto
picker.allowsEditing = true
picker.delegate = self
present(picker, animated: true)

func imagePickerController(_ picker: UIImagePickerController,
                           didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
  let image = info[.editedImage] as? UIImage ?? info[.originalImage] as? UIImage
  // Process image
  dismiss(animated: true)
}
```

## Camera Capture — Android (CameraX)

```kotlin
val imageCapture = ImageCapture.Builder()
  .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
  .setJpegQuality(80)
  .build()

cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageCapture)

imageCapture.takePicture(
  ContextCompat.getMainExecutor(context),
  object : ImageCapture.OnImageCapturedCallback() {
    override fun onCaptureSuccess(image: ImageProxy) {
      // Process image
    }
  }
)
```

## QR/Barcode Scanning — iOS (AVFoundation)

```swift
let captureSession = AVCaptureSession()
let metadataOutput = AVCaptureMetadataOutput()
captureSession.addOutput(metadataOutput)
metadataOutput.metadataObjectTypes = [.qr, .ean13, .code128]
metadataOutput.setMetadataObjectsDelegate(self, queue: .main)

func metadataOutput(_ output: AVCaptureMetadataOutput,
                    didOutput objects: [AVMetadataObject],
                    from connection: AVCaptureConnection) {
  if let code = objects.first as? AVMetadataMachineReadableCodeObject,
     let value = code.stringValue {
    // Handle scanned value
    AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
  }
}
```

## QR/Barcode Scanning — Android (ML Kit)

```kotlin
val scanner = BarcodeScanning.getClient(
  BarcodeScannerOptions.Builder()
    .setBarcodeFormats(Barcode.FORMAT_QR_CODE, Barcode.FORMAT_EAN_13)
    .build()
)

val image = InputImage.fromBitmap(bitmap, rotation)
scanner.process(image)
  .addOnSuccessListener { barcodes ->
    barcodes.firstOrNull()?.rawValue?.let { /* handle value */ }
  }
```

## Cross-Platform — Capacitor Camera Plugin

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  resultType: CameraResultType.Uri,
  source: CameraSource.Camera,
  quality: 80,
  width: 1920,
  allowEditing: true,
  saveToGallery: true,
});
```
