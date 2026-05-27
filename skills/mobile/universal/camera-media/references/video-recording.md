# Video Recording — Mobile

## Video Capture APIs

### iOS AVFoundation

The primary video capture API on iOS is `AVCaptureSession` with `AVCaptureMovieFileOutput` for file-based recording.

```swift
import AVFoundation

class VideoRecorder: NSObject {
    private let session = AVCaptureSession()
    private let videoOutput = AVCaptureMovieFileOutput()
    private var videoDeviceInput: AVCaptureDeviceInput?

    func setupSession() throws {
        session.beginConfiguration()
        session.sessionPreset = .high

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera),
              session.canAddInput(input) else {
            throw VideoError.cameraUnavailable
        }
        session.addInput(input)
        videoDeviceInput = input

        guard let microphone = AVCaptureDevice.default(for: .audio),
              let audioInput = try? AVCaptureDeviceInput(device: microphone),
              session.canAddInput(audioInput) else {
            throw VideoError.microphoneUnavailable
        }
        session.addInput(audioInput)

        guard session.canAddOutput(videoOutput) else {
            throw VideoError.outputConfigurationFailed
        }
        session.addOutput(videoOutput)

        session.commitConfiguration()
    }

    func startRecording(to url: URL) {
        let connection = videoOutput.connection(with: .video)
        connection?.videoOrientation = .portrait
        connection?.isVideoMirrored = false
        videoOutput.startRecording(to: url, recordingDelegate: self)
    }

    func stopRecording() {
        videoOutput.stopRecording()
    }
}

extension VideoRecorder: AVCaptureFileOutputRecordingDelegate {
    func fileOutput(_ output: AVCaptureFileOutput,
                    didFinishRecordingTo outputFileURL: URL,
                    from connections: [AVCaptureConnection],
                    error: Error?) {
        if let error = error {
            print("Recording failed: \(error.localizedDescription)")
            return
        }
        print("Recording saved to: \(outputFileURL)")
    }
}
```

### Android CameraX

CameraX provides lifecycle-aware `VideoCapture` with simpler configuration:

```kotlin
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.*
import androidx.camera.video.VideoCapture
import java.io.File
import java.util.concurrent.Executors

class CameraXRecorder(private val context: Context, private val lifecycleOwner: LifecycleOwner) {

    private var videoCapture: VideoCapture<Recorder>? = null
    private val executor = Executors.newSingleThreadExecutor()

    fun setupCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build()
            val recorder = Recorder.Builder()
                .setQualitySelector(
                    QualitySelector.from(Quality.HIGHEST)
                )
                .build()
            videoCapture = VideoCapture.withOutput(recorder)

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                lifecycleOwner, cameraSelector, preview, videoCapture
            )
        }, ContextCompat.getMainExecutor(context))
    }

    fun startRecording(outputFile: File) {
        val outputOptions = FileOutputOptions.Builder(outputFile).build()
        videoCapture?.output?.prepareRecording(context, outputOptions)
            ?.withAudioEnabled()
            ?.start(executor) { event ->
                when (event) {
                    is VideoRecordEvent.Start -> { /* recording started */ }
                    is VideoRecordEvent.Finalize -> {
                        val uri = Uri.fromFile(outputFile)
                    }
                    is VideoRecordEvent.Error -> {
                        // handle error
                    }
                }
            }
    }

    fun stopRecording() {
        videoCapture?.stopRecording()
    }
}
```

## Recording Configuration

### iOS Quality Presets

| Preset | Resolution | Use Case |
|--------|-----------|----------|
| `.high` | 1080p | General purpose |
| `.medium` | 480p | Bandwidth-sensitive uploads |
| `.low` | 360p | Thumbnails, previews |
| `.hd1920x1080` | 1080p | Explicit FHD |
| `.hd4K3840x2160` | 4K | High-quality, large files |
| `.vga640x480` | VGA | Legacy compatibility |
| `.iFrame960x540` | 540p | Apple iFrame format |
| `.iFrame1280x720` | 720p | Apple iFrame format |
| `.inputPriority` | Varies | Best quality for current input |

### Android Quality Levels

```kotlin
val qualitySelector = QualitySelector.from(
    Quality.UHD,   // 4K
    Quality.FHD,   // 1080p
    Quality.HD,    // 720p
    Quality.SD,    // 480p
    Quality.LOWEST // 360p
)
```

Use `QualitySelector.fromOrderedSet` with fallbacks:

```kotlin
QualitySelector.fromOrderedSet(
    listOf(Quality.UHD, Quality.FHD, Quality.HD),
    FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)
)
```

### Bit Rate Configuration

```swift
// iOS AVFoundation — custom video settings
let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: 1920,
    AVVideoHeightKey: 1080,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 10_000_000, // 10 Mbps
        AVVideoMaxKeyFrameIntervalKey: 30,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
]
```

```kotlin
// Android CameraX — VideoOutput with custom bitrate
val recorder = Recorder.Builder()
    .setQualitySelector(qualitySelector)
    .setVideoBitrate(10_000_000)  // 10 Mbps
    .setAudioBitrate(128_000)      // 128 kbps
    .build()
```

## Video Format Selection

| Format | Codec | Container | iOS Support | Android Support | Use Case |
|--------|-------|-----------|-------------|-----------------|----------|
| H.264 | AVC | .mp4, .mov | Native (hardware) | Native (hardware) | Broad compatibility |
| H.265/HEVC | HEVC | .mp4, .mov | iOS 11+ (hardware) | Android 5+ (hardware) | 50% smaller than H.264 |
| VP9 | VP9 | .webm | No native | Android 4.4+ | Web streaming |
| AV1 | AV1 | .mp4 | iOS 17+ (software) | Android 10+ (partial) | Most efficient, slow encode |
| ProRes | ProRes | .mov | iPhone 13 Pro+ | No | Professional editing |

HEVC is recommended for mobile video capture — it provides equivalent quality to H.264 at half the bitrate.

## Video Compression

### iOS — AVAssetExportSession

```swift
import AVFoundation

func compressVideo(input: URL, completion: @escaping (URL?) -> Void) {
    let asset = AVAsset(url: input)
    guard let exportSession = AVAssetExportSession(
        asset: asset,
        presetName: AVAssetExportPresetHEVCHighestQualityWithAlpha
    ) else {
        completion(nil)
        return
    }

    let outputURL = FileManager.default.temporaryDirectory
        .appendingPathComponent(UUID().uuidString)
        .appendingPathExtension("mp4")

    exportSession.outputURL = outputURL
    exportSession.outputFileType = .mp4
    exportSession.shouldOptimizeForNetworkUse = true
    exportSession.exportAsynchronously {
        switch exportSession.status {
        case .completed:
            completion(outputURL)
        default:
            completion(nil)
        }
    }
}
```

### Android — MediaCodec with MediaMuxer

```kotlin
fun compressVideo(inputPath: String, outputPath: String, bitrate: Int = 2_000_000) {
    val extractor = MediaExtractor()
    extractor.setDataSource(inputPath)

    val trackIndex = selectVideoTrack(extractor)
    val format = extractor.getTrackFormat(trackIndex)
    val mime = format.getString(MediaFormat.KEY_MIME)

    val outputFormat = MediaFormat.createVideoFormat(mime,
        format.getInteger(MediaFormat.KEY_WIDTH) / 2,
        format.getInteger(MediaFormat.KEY_HEIGHT) / 2)
    outputFormat.setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
    outputFormat.setInteger(MediaFormat.KEY_FRAME_RATE, 30)
    outputFormat.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 2)

    val encoder = MediaCodec.createEncoderByType(mime)
    encoder.configure(outputFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    encoder.start()

    val muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    // Full encoder-muxer loop implementation required
}
```

For simpler cases, use FFmpeg via MobileFFmpeg:

```kotlin
MobileFFmpeg.execute("-i $inputPath -c:v libx264 -crf 23 -preset fast -c:a aac -b:a 128k $outputPath")
```

## Video Streaming

### HLS Streaming

```swift
// iOS — AVPlayer with HLS
let url = URL(string: "https://example.com/stream.m3u8")!
let player = AVPlayer(url: url)
let playerViewController = AVPlayerViewController()
playerViewController.player = player
present(playerViewController, animated: true) {
    player.play()
}
```

### Android ExoPlayer

```kotlin
val player = ExoPlayer.Builder(context).build()
val mediaItem = MediaItem.fromUri("https://example.com/stream.m3u8")
player.setMediaItem(mediaItem)
player.prepare()
player.playWhenReady = true
```

### Adaptive Bitrate Streaming

```swift
// iOS — HLS with multiple renditions
// Server-side: create .m3u8 playlist referencing multiple .m3u8 variant streams
// Client automatically selects appropriate bitrate based on network conditions

// Disable cellular streaming for large videos
let playerItem = AVPlayerItem(url: url)
playerItem.preferredForwardBufferDuration = 30 // seconds
if #available(iOS 15.0, *) {
    playerItem.requiredSegmentsForward = 2
}
```

```kotlin
// Android ExoPlayer — bandwidth meter configuration
val bandwidthMeter = DefaultBandwidthMeter.Builder(context).build()
val trackSelector = DefaultTrackSelector(context)
trackSelector.parameters = trackSelector.parameters.buildUpon()
    .setMaxVideoBitrate(10_000_000) // 10 Mbps cap
    .build()
```

## Video Editing

### iOS — AVFoundation Composition

```swift
func trimVideo(at url: URL, startTime: CMTime, endTime: CMTime) -> AVAsset? {
    let asset = AVAsset(url: url)
    let composition = AVMutableComposition()

    guard let track = composition.addMutableTrack(
        withMediaType: .video,
        preferredTrackID: kCMPersistentTrackID_Invalid
    ) else { return nil }

    let sourceTrack = asset.tracks(withMediaType: .video).first!

    let timeRange = CMTimeRange(start: startTime, end: endTime)
    try? track.insertTimeRange(timeRange, of: sourceTrack, at: .zero)

    return composition
}
```

### Android — MediaCodec Trimming

```kotlin
fun trimVideo(inputPath: String, outputPath: String,
              startMs: Long, endMs: Long) {
    val extractor = MediaExtractor()
    extractor.setDataSource(inputPath)
    val trackIndex = selectVideoTrack(extractor)
    extractor.selectTrack(trackIndex)

    // Seek to start position
    extractor.seekTo(startMs * 1000, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

    // Create muxer and encoder
    val muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    // Full trim loop implementation
}
```

## Saving to Gallery

### iOS — PHPhotoLibrary

```swift
import Photos

func saveVideoToGallery(_ videoURL: URL) {
    PHPhotoLibrary.requestAuthorization { status in
        guard status == .authorized || status == .limited else {
            showPermissionDenied()
            return
        }

        PHPhotoLibrary.shared().performChanges {
            PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: videoURL)
        } completionHandler: { success, error in
            if success {
                showSaveConfirmation()
            } else {
                showSaveError(error)
            }
        }
    }
}
```

### Android — MediaStore

```kotlin
fun saveVideoToGallery(context: Context, videoFile: File, mimeType: String = "video/mp4") {
    val contentValues = ContentValues().apply {
        put(MediaStore.Video.Media.DISPLAY_NAME, videoFile.name)
        put(MediaStore.Video.Media.MIME_TYPE, mimeType)
        put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES)
    }

    val uri = context.contentResolver.insert(
        MediaStore.Video.Media.EXTERNAL_CONTENT_URI, contentValues
    ) ?: return

    context.contentResolver.openOutputStream(uri)?.use { outputStream ->
        videoFile.inputStream().use { inputStream ->
            inputStream.copyTo(outputStream)
        }
    }
}
```

## Background Recording Limitations

### iOS

- Background video recording is not supported
- `AVCaptureSession` stops when app enters background
- Use `beginBackgroundTask` for short cleanup operations (max ~30 seconds)
- Audio recording can continue in background with `UIBackgroundModes` > `audio`
- No workaround for true background video capture

### Android

- `MediaRecorder` continues recording even when activity goes to background
- Camera preview stops but recording continues
- `CameraX` lifecycle-aware — recording stops when lifecycle is destroyed
- Workaround: `ProcessLifecycleOwner` to keep camera alive during brief background periods
- Background recording must respect `ACCESS_BACKGROUND_LOCATION` if location tagging is used
- Foreground service required for prolonged background recording

### Cross-Platform

- Capacitor, Flutter, and React Native do not support background video recording
- Audio-only background recording is supported on both platforms with appropriate configuration
- Background upload of recorded video is supported via `BGTaskScheduler` (iOS) and `WorkManager` (Android)

## Best Practices

- Always compress video before upload — raw camera output is too large
- Limit maximum recording duration (30-60 seconds for user-generated content)
- Show recording indicator (red dot + elapsed time)
- Handle phone call interruptions gracefully
- Provide quality selection: Low (360p), Medium (720p), High (1080p)
- HEVC over H.264 when device supports it
- Test on real devices — simulator video recording is limited
- Respect storage space — check available space before recording
- Provide audio toggle for video recording
- Clean up temporary recording files after upload
