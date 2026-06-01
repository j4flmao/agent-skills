# Advanced Camera & Media Patterns

## Custom Camera UI with AVFoundation

For full camera control (manual focus, exposure, custom overlay), use AVFoundation instead of UIImagePickerController.

```swift
class CustomCameraController: NSObject {
    private let session = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private let videoDataOutput = AVCaptureVideoDataOutput()

    func configureCamera(position: AVCaptureDevice.Position = .back) {
        session.beginConfiguration()
        session.sessionPreset = .photo

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let input = try? AVCaptureDeviceInput(device: camera),
              session.canAddInput(input) else { return }
        session.addInput(input)

        // Manual focus support
        if camera.isFocusModeSupported(.continuousAutoFocus) {
            try? camera.lockForConfiguration()
            camera.focusMode = .continuousAutoFocus
            camera.unlockForConfiguration()
        }

        // Photo output
        guard session.canAddOutput(photoOutput) else { return }
        session.addOutput(photoOutput)
        photoOutput.isHighResolutionCaptureEnabled = true
        photoOutput.isLivePhotoCaptureEnabled = false

        session.commitConfiguration()
    }

    func setExposurePoint(_ point: CGPoint) {
        guard let device = getCamera() else { return }
        try? device.lockForConfiguration()
        if device.isExposurePointOfInterestSupported {
            device.exposurePointOfInterest = point
            device.exposureMode = .continuousAutoExposure
        }
        device.unlockForConfiguration()
    }
}
```

## CameraX Advanced (Android)

### ImageAnalysis for Real-Time Processing
```kotlin
// Real-time frame analysis for QR, document detection, filters
val analysis = ImageAnalysis.Builder()
    .setTargetResolution(Size(640, 480))  // Low res for speed
    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
    .build()

analysis.setAnalyzer(executor) { imageProxy ->
    // Convert ImageProxy to Bitmap for processing
    val buffer = imageProxy.planes[0].buffer
    val bytes = ByteArray(buffer.remaining())
    buffer.get(bytes)
    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)

    // Process frame (QR detection, document scanning, filter)
    processFrame(bitmap)

    imageProxy.close()  // Must close to get next frame
}
```

### Multi-Camera Support (API 30+)
```kotlin
// Simultaneous front + back camera
val cameraProvider = ProcessCameraProvider.getInstance(context).get()
val cameraSelector = CameraSelector.Builder()
    .addCameraFilter { cameras ->
        cameras.filter { it.lensFacing == CameraSelector.LENS_FACING_FRONT || 
                          it.lensFacing == CameraSelector.LENS_FACING_BACK }
    }
    .build()

val frontCamera = cameraProvider.bindToLifecycle(
    lifecycleOwner, CameraSelector.DEFAULT_FRONT_CAMERA, frontPreview
)
val backCamera = cameraProvider.bindToLifecycle(
    lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, backPreview, imageCapture
)
```

## Video Recording Patterns

### iOS — AVCaptureMovieFileOutput
```swift
let movieOutput = AVCaptureMovieFileOutput()
if session.canAddOutput(movieOutput) {
    session.addOutput(movieOutput)
}

// Configure quality
if let connection = movieOutput.connection(with: .video) {
    connection.videoOrientation = .portrait
    connection.isVideoStabilizationEnabled = true
}

// Start recording
let outputPath = FileManager.default.temporaryDirectory
    .appendingPathComponent("video_\(Date().timeIntervalSince1970).mp4")
movieOutput.startRecording(to: outputPath, recordingDelegate: self)

// Stop recording
movieOutput.stopRecording()

// Delegate
func fileOutput(_ output: AVCaptureFileOutput,
                didFinishRecordingTo outputFileURL: URL,
                from connections: [AVCaptureConnection],
                error: Error?) {
    if let error = error {
        // Handle recording error
    } else {
        // Video saved at outputFileURL
    }
}
```

### Android — CameraX VideoCapture
```kotlin
val videoCapture = VideoCapture.Builder()
    .setBitRate(4_000_000)  // 4 Mbps for 1080p
    .setVideoFrameRate(30)
    .build()

cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, videoCapture)

// Start recording
val file = File(cacheDir, "video_${System.currentTimeMillis()}.mp4")
val outputOptions = VideoCapture.OutputFileOptions.Builder(file).build()
videoCapture.startRecording(outputOptions, mainExecutor, object : VideoCapture.OnVideoSavedCallback {
    override fun onVideoSaved(output: VideoCapture.OutputFileResults) {
        // Video saved
    }
    override fun onError(videoCaptureError: Int, message: String, cause: Throwable?) {
        // Handle error
    }
})
```

## ML Kit Integration

### Barcode Scanning with CameraX + ML Kit
```kotlin
class BarcodeAnalyzer : ImageAnalysis.Analyzer {
    private val scanner = BarcodeScanning.getClient(BarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_QR_CODE, Barcode.FORMAT_EAN_13)
        .build())

    override fun analyze(imageProxy: ImageProxy) {
        @Suppress("UnsafeOptInUsageError")
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    for (barcode in barcodes) {
                        barcode.rawValue?.let { onBarcodeDetected(it) }
                    }
                }
                .addOnCompleteListener { imageProxy.close() }
        }
    }
}
```

### Text Recognition
```swift
import Vision

func recognizeText(in image: UIImage) {
    guard let cgImage = image.cgImage else { return }

    let request = VNRecognizeTextRequest { request, error in
        guard let results = request.results as? [VNRecognizedTextObservation] else { return }
        let recognizedStrings = results.compactMap { $0.topCandidates(1).first?.string }
        // Use recognized text
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try? handler.perform([request])
}
```
