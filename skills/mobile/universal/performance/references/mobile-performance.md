# Mobile Performance Optimization

## App Launch Time

```swift
class AppLaunchOptimizer {
    static func optimizeLaunch() {
        // Defer non-critical initialization
        DispatchQueue.global(qos: .background).async {
            setupAnalytics()
            setupCrashReporting()
            preloadFonts()
        }

        // Lazy load modules
        _ = ModuleRegistry.shared

        // Pre-warm connections
        URLSession.shared.configuration.timeoutIntervalForRequest = 30
        URLSession.shared.configuration.waitsForConnectivity = true
    }

    static func measureLaunchTime() {
        let launchStart = CFAbsoluteTimeGetCurrent()

        DispatchQueue.main.async {
            let didFinishLaunching = CFAbsoluteTimeGetCurrent()
            let coldStartDuration = didFinishLaunching - launchStart

            AnalyticsManager.shared.track("app_launch", properties: [
                "duration_ms": Int(coldStartDuration * 1000),
                "is_cold_start": ProcessInfo.processInfo.isLowPowerModeEnabled == false,
            ])
        }
    }
}
```

## Image Loading and Caching

```swift
class ImageCache {
    static let shared = ImageCache()
    private let memoryCache = NSCache<NSString, UIImage>()
    private let diskCache = URLCache(
        memoryCapacity: 50 * 1024 * 1024,
        diskCapacity: 200 * 1024 * 1024,
        diskPath: "image_cache"
    )

    func loadImage(from url: URL, completion: @escaping (UIImage?) -> Void) {
        let cacheKey = url.absoluteString as NSString

        if let cachedImage = memoryCache.object(forKey: cacheKey) {
            completion(cachedImage)
            return
        }

        let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad)
        if let cachedResponse = diskCache.cachedResponse(for: request),
           let image = UIImage(data: cachedResponse.data) {
            memoryCache.setObject(image, forKey: cacheKey)
            completion(image)
            return
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, _ in
            guard let data, let image = UIImage(data: data),
                  let response else { completion(nil); return }

            let cachedResponse = CachedURLResponse(response: response, data: data)
            self?.diskCache.storeCachedResponse(cachedResponse, for: request)
            self?.memoryCache.setObject(image, forKey: cacheKey)

            DispatchQueue.main.async { completion(image) }
        }.resume()
    }

    func preloadImages(urls: [URL]) {
        urls.forEach { url in
            loadImage(from: url) { _ in }
        }
    }
}

class DownsamplingImageProcessor {
    static func downsample(imageAt url: URL, to targetSize: CGSize) -> UIImage? {
        let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let source = CGImageSourceCreateWithURL(url as CFURL, sourceOptions) else {
            return nil
        }

        let maxDimension = max(targetSize.width, targetSize.height) * UIScreen.main.scale
        let downsampleOptions = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxDimension,
        ] as CFDictionary

        guard let downsampled = CGImageSourceCreateThumbnailAtIndex(source, 0, downsampleOptions)
        else { return nil }

        return UIImage(cgImage: downsampled)
    }
}
```

## Memory Management

```swift
class MemoryMonitor {
    static func logMemoryUsage() {
        let taskInfo = mach_task_basic_info_data_t()
        var count = mach_msg_type_number_t(
            MemoryLayout<mach_task_basic_info_data_t>.size / MemoryLayout<natural_t>.size
        )

        let result = withUnsafeMutablePointer(to: &taskInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(TASK_BASIC_INFO), $0, &count)
            }
        }

        if result == KERN_SUCCESS {
            let usedMB = Int(taskInfo.resident_size) / (1024 * 1024)
            AnalyticsManager.shared.track("memory_usage", properties: ["mb": usedMB])
        }
    }

    static func handleMemoryWarning() {
        ImageCache.shared.memoryCache.removeAllObjects()

        // Clear unused view controllers from navigation stack
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let navController = windowScene.windows.first?.rootViewController as? UINavigationController {
            let visible = navController.visibleViewController
            navController.viewControllers = [visible].compactMap { $0 }
        }
    }
}
```

## Key Points

- Optimize app launch time by deferring non-critical work
- Implement image caching with memory and disk tiers
- Use image downsampling for display at correct size
- Profile memory usage with Instruments
- Handle memory warnings by clearing caches
- Use lazy initialization for heavy objects
- Pre-warm network connections
- Use background threads for heavy processing
- Implement pagination for large lists
- Use diffable data sources for efficient updates
- Monitor frame rate and dropped frames
- Optimize Auto Layout with stack views
