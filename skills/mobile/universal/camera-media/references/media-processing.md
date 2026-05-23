# Media Processing

## Image Compression Pipeline

```kotlin
fun processImageForUpload(
    context: Context,
    inputUri: Uri,
    maxDimension: Int = 1024,
    quality: Int = 80,
    format: CompressFormat = CompressFormat.JPEG
): File {
    val inputStream = context.contentResolver.openInputStream(inputUri)
    val bitmap = BitmapFactory.decodeStream(inputStream)
    inputStream?.close()

    // 1. Orientation correction from EXIF
    val corrected = applyExifOrientation(context, inputUri, bitmap)

    // 2. Resize to max dimension on longest side
    val (newWidth, newHeight) = calculateResizedDimensions(
        corrected.width, corrected.height, maxDimension
    )
    val resized = Bitmap.createScaledBitmap(corrected, newWidth, newHeight, true)

    // 3. Compress and save
    val outputFile = File(context.cacheDir, "upload_${UUID.randomUUID()}.jpg")
    FileOutputStream(outputFile).use { out ->
        resized.compress(format, quality, out)
    }

    // 4. Recycle bitmaps to free memory
    if (corrected !== bitmap) corrected.recycle()
    if (resized !== corrected) resized.recycle()
    bitmap.recycle()

    return outputFile
}

private fun calculateResizedDimensions(
    width: Int, height: Int, maxDimension: Int
): Pair<Int, Int> {
    val scale = minOf(maxDimension.toFloat() / width, maxDimension.toFloat() / height, 1f)
    return Pair((width * scale).toInt(), (height * scale).toInt())
}

private fun applyExifOrientation(
    context: Context, uri: Uri, bitmap: Bitmap
): Bitmap {
    val inputStream = context.contentResolver.openInputStream(uri)
    val exif = ExifInterface(inputStream!!)
    inputStream.close()

    val orientation = exif.getAttributeInt(
        ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL
    )
    val matrix = android.graphics.Matrix()
    when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
        ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
        ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
        else -> return bitmap
    }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
}
```

## EXIF Stripping

### Swift

```swift
import ImageIO
import UniformTypeIdentifiers

func stripExif(from imageData: Data) -> Data? {
    guard let source = CGImageSourceCreateWithData(imageData as CFData, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        return nil
    }

    let metadata = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any]
    let hasLocation = metadata?[kCGImagePropertyGPSDictionary as String] != nil

    // Re-encode without metadata
    let destinationData = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(
        destinationData,
        UTType.jpeg.identifier as CFString,
        1,
        nil
    ) else { return nil }

    // Omit properties = strip all metadata including EXIF, GPS, IPTC
    CGImageDestinationAddImage(destination, cgImage, nil)
    CGImageDestinationFinalize(destination)

    return destinationData as Data
}

// Quick method (JPEG only — strips EXIF by default)
func quickStripExif(image: UIImage) -> Data? {
    image.jpegData(compressionQuality: 0.8)
}
```

### Kotlin

```kotlin
fun stripExif(context: Context, inputUri: Uri): Bitmap {
    val inputStream = context.contentResolver.openInputStream(inputUri)
    val bitmap = BitmapFactory.decodeStream(inputStream)
    inputStream?.close()

    // Re-encode without EXIF metadata — BitmapFactory strips EXIF by default
    // Orientation must be applied separately (see applyExifOrientation above)
    return bitmap
}
```

## Thumbnail Generation

### Video Thumbnails

```swift
// iOS
import AVFoundation

func generateVideoThumbnail(url: URL, at time: CMTime = .zero) -> UIImage? {
    let asset = AVAsset(url: url)
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.maximumSize = CGSize(width: 256, height: 256)
    guard let cgImage = try? generator.copyCGImage(at: time, actualTime: nil) else {
        return nil
    }
    return UIImage(cgImage: cgImage)
}
```

```kotlin
// Android
fun generateVideoThumbnail(context: Context, videoUri: Uri, size: Int = 256): Bitmap? {
    val retriever = MediaMetadataRetriever()
    return try {
        retriever.setDataSource(context, videoUri)
        val bitmap = retriever.frameAtTime ?: return null
        val scale = minOf(size.toFloat() / bitmap.width, size.toFloat() / bitmap.height)
        Bitmap.createScaledBitmap(bitmap,
            (bitmap.width * scale).toInt(),
            (bitmap.height * scale).toInt(), true)
    } catch (e: Exception) {
        null
    } finally {
        retriever.release()
    }
}
```

### Image Thumbnail

```kotlin
fun generateThumbnail(bitmap: Bitmap, maxSize: Int = 256): Bitmap {
    val scale = minOf(maxSize.toFloat() / bitmap.width, maxSize.toFloat() / bitmap.height, 1f)
    return Bitmap.createScaledBitmap(bitmap,
        (bitmap.width * scale).toInt(),
        (bitmap.height * scale).toInt(), true)
}
```

## Upload-Ready Transform Pipeline

```
Input Image (from camera/gallery)
    │
    ▼
┌──────────────────────────────────────┐
│ 1. Orientation Correction            │
│    Read EXIF TAG_ORIENTATION         │
│    Apply rotation/flip matrix        │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ 2. Resize                            │
│    Max dimension: 1024px (detail)    │
│                 640px  (list)        │
│                 256px  (thumbnail)   │
│    Never upscale                     │
│    Maintain aspect ratio             │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ 3. Compress                          │
│    JPEG quality 80 (photo upload)    │
│    WebP quality 85 (Android)         │
│    PNG only for transparency needs   │
│    AVIF for best compression (API 30+)│
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ 4. Strip EXIF                        │
│    Remove GPS location               │
│    Remove device make/model          │
│    Remove timestamp                  │
│    Remove software info              │
│    Privacy: location + device info   │
└──────────────┬───────────────────────┘
               ▼
               Output File (ready for upload)
```

## Upload Progress Tracking

```kotlin
// Upload with progress callback
suspend fun uploadMedia(
    file: File,
    onProgress: (Float) -> Unit
): Result<String> {
    return withContext(Dispatchers.IO) {
        try {
            val requestBody = file.asRequestBody("image/jpeg".toMediaType())
            val progressBody = ProgressRequestBody(requestBody, onProgress)
            val response = api.uploadMedia(progressBody)
            Result.success(response.url)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// Progress-aware RequestBody
class ProgressRequestBody(
    private val delegate: RequestBody,
    private val onProgress: (Float) -> Unit
) : RequestBody() {
    override fun contentType() = delegate.contentType()
    override fun contentLength() = delegate.contentLength()

    override fun writeTo(sink: okio.BufferedSink) {
        val total = contentLength()
        val countingSink = object : ForwardingSink(sink) {
            var bytesWritten = 0L
            override fun write(source: okio.Buffer, byteCount: Long) {
                super.write(source, byteCount)
                bytesWritten += byteCount
                onProgress(bytesWritten.toFloat() / total)
            }
        }
        val bufferedSink = Okio.buffer(countingSink)
        delegate.writeTo(bufferedSink)
        bufferedSink.flush()
    }
}
```

## Quality/Size Tradeoff Reference

| Quality | JPEG Size (1MP) | Visual Quality | Use Case |
|---------|----------------|---------------|----------|
| Q100 | ~800KB | Lossless | Archival, printing |
| Q85 | ~250KB | Excellent | Photo upload, social sharing |
| Q70 | ~120KB | Good | Profile pictures, comments |
| Q50 | ~70KB | Fair | Thumbnails, previews |
| WebP Q85 | ~100KB | Excellent | Android apps (smaller than JPEG) |

No preamble. No postamble. No explanations.
