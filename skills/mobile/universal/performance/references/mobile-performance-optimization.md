# Mobile Performance Optimization

## App Startup

### Launch Sequence
```
Cold Start:
Process Create → Application Init → Activity/Scene Create → Layout → Render

Warm Start:
Activity/Scene Create → Layout → Render
```

### Optimization Techniques
- Defer non-critical initialization
- Lazy-load modules and features
- Optimize splash screen (show instantly, not blank)
- Reduce main thread work during startup
- Use startup tracing to identify bottlenecks

### Startup Metrics
| Metric | Target |
|--------|--------|
| Cold start (first launch) | < 2 seconds |
| Warm start | < 1 second |
| Time to interactive | < 3 seconds |
| First frame render | < 200ms |

## UI Performance

### Frame Rate
```
Target: 60 fps (16ms per frame)
Threshold: 90fps or 120fps on high-refresh displays
Jank: Frame takes > 16ms to render
```

### Common Issues
- Deep view hierarchies causing excessive layout passes
- Overdraw (painting pixels that are covered)
- Expensive draw calls (shadows, blur, transparency)
- Main thread blocking (I/O, JSON parsing, image decoding)
- Inefficient list recycling

### List Optimization
```typescript
// Use lazy loading for lists
LazyColumn {
  items(viewModel.items) { item ->
    ListItem(
      title = item.title,
      subtitle = item.subtitle,
      // Use async image loading
      image = rememberAsyncImagePainter(item.imageUrl)
    )
  }
}
```

## Memory Management

### Memory Leak Detection
- Profiling tools: Android Profiler, Xcode Instruments
- LeakCanary for Android automatic detection
- Retain cycle detection in Swift/iOS
- Watch for: static references to Activity/Context, anonymous inner classes, singletons

### Image Memory
```typescript
// Resize images for screen display
imageLoader.displayImage(imageView, url, options = {
  targetWidth = imageView.width * density,
  targetHeight = imageView.height * density,
  memoryCachePolicy = CachePolicy.WEAK,
  diskCachePolicy = CachePolicy.ENABLED,
})
```

## Network Performance

### Prefetching
- Preload data for next likely screen
- Use predictive prefetch based on user behavior
- Bundle multiple small requests into one batch
- Cache responses aggressively during idle time

### Compression
- Enable Gzip/Brotli for API responses
- Use protobuf for internal services
- Compress images before upload
- Use WebP or HEIC for image format

## Battery Optimization

### Background Work
- Batch network requests instead of individual
- Use exponential backoff for retries
- Schedule non-urgent work with WorkManager/BackgroundTasks
- Reduce wake locks and keep-alive connections
- Consolidate alarms and timers
