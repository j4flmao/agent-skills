# Camera & Media Capture Patterns

## Camera API Patterns

### Photo Capture
```typescript
async function capturePhoto() {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      width: 1920,
      height: 1080,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: true,
    })
    return image.dataUrl
  } catch (error) {
    if (error.code === 'CAMERA_PERMISSION_DENIED') {
      navigateToPermissionSettings()
    }
    throw error
  }
}
```

### Video Recording
```typescript
async function recordVideo() {
  const result = await Camera.startRecording({
    maxDuration: 60,
    quality: 'high',
    facing: 'back',
  })
  // Camera.stopRecording() when done
  return result.videoUrl
}
```

## Image Processing

### Compression
```typescript
async function compressImage(uri: string, maxSizeKB: number): Promise<string> {
  const result = await ImageCompressor.compress({
    source: uri,
    quality: 70,
    maxWidth: 2048,
    maxHeight: 2048,
    format: 'jpeg',
  })
  return result.uri
}
```

### EXIF Stripping
```typescript
async function stripExif(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulate({
    actions: [{ removeMetadata: true }],
    source: uri,
  })
  return result.uri
}
```

## Media Processing Pipeline

### Upload Flow
```
Capture → Compress → Strip EXIF → Generate Thumbnail → Upload → Cleanup
```

### Thumbnail Generation
```typescript
async function generateThumbnail(videoUri: string): Promise<string> {
  const thumbnail = await VideoThumbnail.generate({
    source: videoUri,
    position: 1000, // 1 second into video
    quality: 60,
    width: 320,
  })
  return thumbnail.uri
}
```

## Platform Considerations

### iOS
- Photo Library access requires NSPhotoLibraryUsageDescription
- Camera requires NSCameraUsageDescription
- HEIC format supported natively
- Limited background processing

### Android
- Camera requires CAMERA permission
- Storage requires READ/WRITE_EXTERNAL_STORAGE (API < 33)
- Scoped storage on API 30+
- Various device-specific camera capabilities

## Error Handling

| Error | User Experience |
|-------|-----------------|
| Permission denied | Show settings redirect dialog |
| Camera unavailable | Fallback to file picker |
| Storage full | Show storage warning |
| Processing timeout | Retry with lower quality |
| File size exceeded | Guide user to reduce quality |
