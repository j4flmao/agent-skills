# Document Scanning Guide

## Overview

Document scanning detects rectangular documents in the camera view, auto-captures when stable, applies perspective correction, and produces a clean, flat image suitable for sharing or archiving.

## Platform Solutions

### iOS: VNDocumentCameraViewController
```swift
import VisionKit

class DocumentScanner: UIViewController, VNDocumentCameraViewControllerDelegate {
    func startScanning() {
        guard VNDocumentCameraViewController.isSupported else {
            showUnsupportedAlert()
            return
        }
        let scanner = VNDocumentCameraViewController()
        scanner.delegate = self
        present(scanner, animated: true)
    }

    func documentCameraViewController(_ controller: VNDocumentCameraViewController,
                                       didFinishWith scan: VNDocumentCameraScan) {
        controller.dismiss(animated: true)
        for pageIndex in 0..<scan.pageCount {
            let scannedImage = scan.imageOfPage(at: pageIndex)
            processScannedPage(scannedImage)
        }
    }

    func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
        controller.dismiss(animated: true)
    }
}
```

### Android: ML Kit Document Scanner
```kotlin
// Using ML Kit Document Scanner API
val scanner = GmsDocumentScanningClient.create(
    DocumentScanOptions.Builder()
        .setDocumentFormat(DocumentFormat.PDF, DocumentFormat.JPEG)  // Output format
        .setGalleryImportAllowed(true)  // Allow importing from gallery
        .setPageLimit(10)  // Max pages
        .build()
)

val intentSender = scanner.getStartScanIntent(activity)
startIntentSenderForResult(intentSender, SCAN_REQUEST_CODE, null, 0, 0, 0)
```

## Custom Document Detection

For more control (custom UI, rectification, enhancement), implement document detection using OpenCV or Vision:

### Vision-Based Detection (iOS)
```swift
import Vision

func detectDocument(in image: CIImage) -> (CIImage, VNRectangleObservation)? {
    let request = VNDetectRectanglesRequest()
    request.minimumAspectRatio = 0.3
    request.maximumAspectRatio = 1.0
    request.minimumSize = 0.2
    request.maximumObservations = 1

    let handler = VNImageRequestHandler(ciImage: image)
    try? handler.perform([request])

    guard let rectangle = request.results?.first else { return nil }

    // Perspective correction
    let corrected = image.cropped(to: rectangle.boundingBox)
        .applyingFilter("CIPerspectiveCorrection", parameters: [
            "inputTopLeft": CIVector(cgPoint: rectangle.topLeft),
            "inputTopRight": CIVector(cgPoint: rectangle.topRight),
            "inputBottomLeft": CIVector(cgPoint: rectangle.bottomLeft),
            "inputBottomRight": CIVector(cgPoint: rectangle.bottomRight)
        ])
    return (corrected, rectangle)
}
```

### OpenCV Quadrilateral Detection (Android)
```kotlin
fun detectDocumentQuadrilateral(bitmap: Bitmap): Quadrilateral? {
    val src = Mat()
    Utils.bitmapToMat(bitmap, src)

    // 1. Convert to grayscale
    val gray = Mat()
    Imgproc.cvtColor(src, gray, Imgproc.COLOR_RGB2GRAY)

    // 2. Gaussian blur + adaptive threshold
    Imgproc.GaussianBlur(gray, gray, Size(5.0, 5.0), 0.0)
    val thresh = Mat()
    Imgproc.adaptiveThreshold(gray, thresh, 255.0,
        Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY, 11, 2.0)

    // 3. Find contours
    val contours = ArrayList<MatOfPoint>()
    val hierarchy = Mat()
    Imgproc.findContours(thresh, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)

    // 4. Find largest quadrilateral
    var maxArea = 0.0
    var documentContour: MatOfPoint2f? = null
    for (contour in contours) {
        val area = Imgproc.contourArea(contour)
        if (area < maxArea) continue
        val perimeter = Imgproc.arcLength(MatOfPoint2f(*contour.toArray().toMutableList().toTypedArray()), true)
        val approx = MatOfPoint2f()
        Imgproc.approxPolyDP(MatOfPoint2f(*contour.toArray().toMutableList().toTypedArray()), approx, perimeter * 0.02, true)
        if (approx.toArray().size == 4) {
            maxArea = area
            documentContour = approx
        }
    }
    return documentContour?.let { extractQuadrilateral(it) }
}
```

## Image Enhancement Pipeline

After document capture, enhance for readability:

1. **Perspective correction**: Warp the detected quadrilateral to a rectangular output
2. **Auto-color**: Adjust white balance, contrast, and saturation
3. **Shadow removal**: Apply adaptive histogram equalization (CLAHE)
4. **Binarization**: Convert to black & white for documents with text
5. **Noise reduction**: Light Gaussian or median filter
6. **Sharpen**: Unsharp mask to improve text clarity

```swift
func enhanceDocument(_ image: UIImage) -> UIImage {
    guard let ciImage = CIImage(image: image) else { return image }

    // Auto-enhance
    let autoAdjustments = ciImage.autoAdjustmentOptions()
    var output = ciImage
    for filter in autoAdjustments {
        filter.setValue(output, forKey: kCIInputImageKey)
        output = filter.outputImage ?? output
    }

    // Gamma adjust
    let gamma = output.applyingFilter("CIGammaAdjust", parameters: ["inputPower": 0.75])

    // Sharpen
    let sharpened = gamma.applyingFilter("CIUnsharpMask", parameters: [
        "inputRadius": 0.5,
        "inputIntensity": 1.0
    ])

    return UIImage(ciImage: sharpened)
}
```

## Multi-Page Document Handling

```kotlin
class MultiPageDocument {
    private val pages = mutableListOf<Page>()
    private val outputFile: File = createTempFile("document", ".pdf")

    data class Page(
        val imageBitmap: Bitmap,
        val ocrText: String? = null,
        val timestamp: Long = System.currentTimeMillis()
    )

    fun addPage(page: Page) {
        pages.add(page)
    }

    fun removePage(index: Int) {
        if (index in pages.indices) pages.removeAt(index)
    }

    fun reorderPages(from: Int, to: Int) {
        val item = pages.removeAt(from)
        pages.add(to, item)
    }

    fun exportToPdf(context: Context): File {
        val document = PdfDocument()
        pages.forEachIndexed { index, page ->
            val pageInfo = PdfDocument.PageInfo.Builder(
                page.imageBitmap.width, page.imageBitmap.height, index + 1
            ).create()
            val pdfPage = document.startPage(pageInfo)
            val canvas = pdfPage.canvas
            canvas.drawBitmap(page.imageBitmap, 0f, 0f, null)
            document.finishPage(pdfPage)
        }
        FileOutputStream(outputFile).use { document.writeTo(it) }
        document.close()
        return outputFile
    }
}
```

## Document Scanning UX

### Auto-Capture Strategy
- Scan frames at 15fps (not 30fps — saves battery)
- When document detected with confidence >0.8 for 3 consecutive frames → stable
- After 500ms of stability → auto-capture
- Show countdown bar (500ms animation)
- Play shutter sound + haptic on capture

### After Capture UI
- Show captured page full-screen
- Allow corner adjustment (drag four corners)
- Apply/enhance filter preview
- "Retake" button next to "Keep"
- Auto-suggest enhancement on first view

### Batch Scanning UX
- Show page thumbnails at bottom (horizontal scroll)
- "Add Page" button continues scanning
- "Reorder" mode for rearranging pages
- "Delete" with swipe or selection
- "Save as PDF" or "Save as Images" export action
