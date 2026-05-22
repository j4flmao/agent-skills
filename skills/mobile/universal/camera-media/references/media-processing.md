# Media Processing

## Image Compression Pipeline

```kotlin
fun processImageForUpload(inputUri: Uri): File {
  val inputStream = contentResolver.openInputStream(inputUri)
  val bitmap = BitmapFactory.decodeStream(inputStream)

  // Resize — max 1024px on longest side
  val maxDimension = 1024f
  val scale = minOf(
    maxDimension / bitmap.width,
    maxDimension / bitmap.height,
    1f // never upscale
  )
  val resized = Bitmap.createScaledBitmap(
    bitmap,
    (bitmap.width * scale).toInt(),
    (bitmap.height * scale).toInt(),
    true
  )

  // Strip EXIF — decode then re-encode without metadata
  val output = File(cacheDir, "upload_${UUID.randomUUID()}.jpg")
  FileOutputStream(output).use { out ->
    resized.compress(Bitmap.CompressFormat.JPEG, 80, out)
  }

  return output
}
```

## EXIF Stripping

```swift
func stripExif(from image: UIImage) -> Data? {
  // JPEG representation already strips EXIF by default
  image.jpegData(compressionQuality: 0.8)
}

// For PNG or other formats, use CGImageSource with removeProperties
func strictStripExif(from data: Data) -> Data? {
  let source = CGImageSourceCreateWithData(data as CFData, nil)
  let metadata = CGImageSourceCopyPropertiesAtIndex(source!, 0, nil) as? [String: Any]
  // Re-encode without metadata
  let destinationData = NSMutableData()
  let destination = CGImageDestinationCreateWithData(
    destinationData, UTType.jpeg.identifier as CFString, 1, nil
  )
  // Exclude metadata by omitting properties
  CGImageDestinationAddImage(destination!, image.cgImage!, nil)
  CGImageDestinationFinalize(destination!)
  return destinationData as Data
}
```

## Thumbnail Generation

```swift
// iOS — Video thumbnail
let asset = AVAsset(url: videoURL)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
let cgImage = try generator.copyCGImage(at: .zero, actualTime: nil)
let thumbnail = UIImage(cgImage: cgImage)

// Android — Video thumbnail
val metadataRetriever = MediaMetadataRetriever()
metadataRetriever.setDataSource(context, videoUri)
val bitmap = metadataRetriever.frameAtTime
```

## Orientation Correction

```kotlin
// Android — Apply EXIF orientation
val exif = ExifInterface(inputStream)
val orientation = exif.getAttributeInt(
  ExifInterface.TAG_ORIENTATION,
  ExifInterface.ORIENTATION_NORMAL
)

val matrix = Matrix()
when (orientation) {
  ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
  ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
  ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
}
val corrected = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
```

## Upload-Ready Transform

| Step | Output | Purpose |
|------|--------|---------|
| Resize | 1024px max dimension | Reduce bandwidth |
| Compress | JPEG Q80 / WebP | Smaller payload |
| Strip EXIF | Clean metadata | Privacy |
| Correct orientation | Rotated + flipped | Correct display |
| Thumbnail | 256x256 | List/preview |
