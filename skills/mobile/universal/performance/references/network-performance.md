# Network Performance

## Request Optimization

```swift
class NetworkOptimizer {
    static let shared = NetworkOptimizer()
    private let session: URLSession
    private var pendingRequests: [URLRequest: Task<Data, Error>] = [:]

    private init() {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 30
        config.httpMaximumConnectionsPerHost = 6
        config.waitsForConnectivity = true
        config.requestCachePolicy = .returnCacheDataElseLoad
        config.urlCache = URLCache(
            memoryCapacity: 20 * 1024 * 1024,
            diskCapacity: 100 * 1024 * 1024
        )
        session = URLSession(configuration: config)
    }

    func deduplicatedRequest(_ request: URLRequest) async throws -> Data {
        if let existingTask = pendingRequests[request] {
            return try await existingTask.value
        }

        let task = Task<Data, Error> {
            defer { pendingRequests.removeValue(forKey: request) }
            let (data, _) = try await session.data(for: request)
            return data
        }

        pendingRequests[request] = task
        return try await task.value
    }

    func prefetch(urls: [URL]) {
        urls.forEach { url in
            let request = URLRequest(url: url)
            Task { try? await deduplicatedRequest(request) }
        }
    }
}

class RequestBatcher {
    private var batch: [BatchItem] = []
    private let maxBatchSize = 10
    private let flushInterval: TimeInterval = 0.5

    struct BatchItem {
        let request: URLRequest
        let completion: (Result<Data, Error>) -> Void
    }

    func enqueue(_ request: URLRequest) async throws -> Data {
        return try await withCheckedThrowingContinuation { continuation in
            let item = BatchItem(request: request) { result in
                continuation.resume(with: result)
            }
            batch.append(item)
            if batch.count >= maxBatchSize {
                flush()
            }
        }
    }

    func flush() {
        guard !batch.isEmpty else { return }
        let items = batch
        batch = []

        // Send batched request
        Task {
            do {
                let payload = try JSONEncoder().encode(items.map { $0.request.url?.absoluteString })
                var request = URLRequest(url: URL(string: "https://api.example.com/batch")!)
                request.httpMethod = "POST"
                request.httpBody = payload
                let (data, _) = try await URLSession.shared.data(for: request)
                items.forEach { $0.completion(.success(data)) }
            } catch {
                items.forEach { $0.completion(.failure(error)) }
            }
        }
    }
}
```

## Response Caching

```swift
class CacheFirstStrategy {
    private let cache = NSCache<NSString, CacheEntry>()

    struct CacheEntry {
        let data: Data
        let expiryDate: Date

        var isExpired: Bool { Date() >= expiryDate }
    }

    func getData(from url: URL, ttl: TimeInterval = 300) async throws -> Data {
        let cacheKey = url.absoluteString as NSString

        if let entry = cache.object(forKey: cacheKey), !entry.isExpired {
            return entry.data
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        if let httpResponse = response as? HTTPURLResponse,
           httpResponse.statusCode == 200 {
            let entry = CacheEntry(data: data, expiryDate: Date().addingTimeInterval(ttl))
            cache.setObject(entry, forKey: cacheKey)
        }

        return data
    }

    func invalidateCache(for url: URL) {
        cache.removeObject(forKey: url.absoluteString as NSString)
    }

    func invalidateAll() {
        cache.removeAllObjects()
    }
}

// Response compression
class CompressionManager {
    static func compressRequest() -> URLRequest {
        var request = URLRequest(url: URL(string: "https://api.example.com/data")!)
        request.setValue("gzip, deflate, br", forHTTPHeaderField: "Accept-Encoding")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpMethod = "GET"
        return request
    }
}
```

## Key Points

- Use request deduplication to prevent duplicate network calls
- Implement request batching for multiple small requests
- Use response caching with TTL for reducing network usage
- Enable HTTP compression for smaller payloads
- Use HTTP/2 for multiplexed connections
- Implement connection pooling for reuse
- Use protocol buffers for efficient serialization
- Monitor network metrics (latency, error rate)
- Implement retry with exponential backoff
- Use CDN for static asset delivery
- Optimize API response payload size
- Use pagination for large data sets
