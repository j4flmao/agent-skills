# Mobile Network Optimization

Reducing latency, data use and battery cost of networking on mobile: connection reuse, caching, payload size, request scheduling and adapting to network conditions.

## Where Time Goes in a Request

```
DNS lookup -> TCP handshake -> TLS handshake -> request upload -> server time -> response download
```
On cellular, round-trip times are high and variable, so handshakes dominate small requests. Reuse connections and reduce request count before optimizing bytes.

| Technique | Saves |
|---|---|
| Connection reuse (keep-alive, HTTP/2 multiplexing) | DNS + TCP + TLS per request |
| TLS 1.3 / session resumption | One round trip per new connection |
| HTTP/3 (QUIC) | Faster handshakes, no TCP head-of-line blocking, connection migration across networks |
| HTTP caching | Entire requests or bodies (304) |
| Compression (gzip/Brotli/zstd where supported) | Download bytes |
| Batching / aggregation endpoints (BFF, GraphQL) | Request count and radio wake-ups |
| Pagination and field selection | Payload size and parse time |

## Android: OkHttp

```kotlin
val client = OkHttpClient.Builder()
  .cache(Cache(File(context.cacheDir, "http"), 50L * 1024 * 1024))   // 50 MiB disk cache
  .connectTimeout(10, TimeUnit.SECONDS)
  .readTimeout(20, TimeUnit.SECONDS)
  .callTimeout(30, TimeUnit.SECONDS)
  .addInterceptor(HttpLoggingInterceptor().apply {
    level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
  })
  .build()
```
- Use one shared `OkHttpClient` (it owns the connection pool and dispatcher); derive variants with `client.newBuilder()`.
- OkHttp negotiates HTTP/2 automatically and transparently handles gzip.
- HTTP/3: use Cronet (Google Play services or embedded), optionally through the Cronet OkHttp bridge.
- Respect `Cache-Control`; for offline reads use `CacheControl.FORCE_CACHE` or an interceptor that serves stale on failure.

### Network awareness
```kotlin
val cm = context.getSystemService(ConnectivityManager::class.java)
val caps = cm.getNetworkCapabilities(cm.activeNetwork)
val unmetered = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) == true
val dataSaverOn = cm.restrictBackgroundStatus == ConnectivityManager.RESTRICT_BACKGROUND_STATUS_ENABLED
```
Defer prefetch and large uploads to unmetered networks (WorkManager `NetworkType.UNMETERED`) and honor Data Saver.

## iOS: URLSession

```swift
let config = URLSessionConfiguration.default
config.urlCache = URLCache(memoryCapacity: 10 << 20, diskCapacity: 100 << 20)
config.requestCachePolicy = .useProtocolCachePolicy
config.timeoutIntervalForRequest = 20
config.waitsForConnectivity = true               // wait instead of failing immediately offline
config.allowsConstrainedNetworkAccess = true     // set false for non-essential work (Low Data Mode)
config.allowsExpensiveNetworkAccess = true       // cellular / personal hotspot
config.httpMaximumConnectionsPerHost = 6
let session = URLSession(configuration: config)
```
- URLSession supports HTTP/2 and HTTP/3 automatically when the server advertises it.
- Reuse one session per configuration; creating sessions per request loses connection reuse.
- For non-urgent transfers use a background session with `isDiscretionary = true`.
- Check `NWPathMonitor` for `isExpensive` / `isConstrained` to adapt behavior.

## Payload Size

| Area | Practice |
|---|---|
| API responses | Return only needed fields; paginate (cursor-based); avoid deeply nested duplicates |
| Format | JSON is fine when compressed; Protobuf reduces size and parse time for high-volume endpoints |
| Images | Serve WebP/AVIF (Android) and HEIC/AVIF/WebP (iOS supports them on recent versions) sized for the device; use CDN resizing with width/DPR parameters |
| Video | Adaptive streaming (HLS/DASH) with bitrate ladders |
| Uploads | Compress/resize images client-side; resumable chunked uploads |
| Delta sync | Send changes since a version/timestamp rather than full lists |

## Caching Strategy

| Data | Strategy |
|---|---|
| Static assets, images | Long `max-age` with content-hashed URLs; image library memory + disk cache |
| User feeds | Stale-while-revalidate: show cached, refresh in background |
| Reference data | ETag / `If-None-Match` revalidation |
| Writes | Local-first queue with retry (see offline-first patterns) |

## Request Scheduling
- Prioritize visible content; cancel requests for screens the user left (structured concurrency, OkHttp `Call.cancel()`, `URLSessionTask.cancel()`).
- Coalesce duplicate in-flight requests for the same resource.
- Prefetch the next page when the user nears the end of a list, not all pages.
- Retry with exponential backoff and jitter, only idempotent requests, with a cap on attempts.
- Batch analytics events and flush on background or on a timer.

## Measuring

| Tool | Platform |
|---|---|
| Android Studio Network Inspector | Requests, timing, payloads |
| Perfetto with network events / OkHttp `EventListener` | Phase timings (DNS, connect, TLS) |
| Xcode Instruments Network / HTTP Traffic | Per-request timing, connection reuse |
| `URLSessionTaskMetrics` | Per-request DNS/connect/TLS/request/response timestamps and protocol |
| Charles / Proxyman / mitmproxy | Inspect payloads, simulate throttling (on debug builds that trust the proxy CA) |
| Network Link Conditioner (iOS), emulator network throttling | Simulate 3G/high latency/loss |

```kotlin
class TimingListener : EventListener() {
  private var start = 0L
  override fun callStart(call: Call) { start = System.nanoTime() }
  override fun callEnd(call: Call) {
    Log.d("net", "${call.request().url.encodedPath} ${(System.nanoTime() - start) / 1_000_000} ms")
  }
}
```

## Pitfalls
- Creating a new HTTP client or session per request.
- Waterfall requests on startup that could be parallel or aggregated.
- No timeouts, leaving requests hanging on poor networks.
- Downloading full-resolution images for thumbnails.
- Retrying non-idempotent POSTs without an idempotency key.

## Checklist
- [ ] One shared client/session with timeouts
- [ ] HTTP cache enabled and server sends correct cache headers
- [ ] Payloads paginated and compressed; images sized per device
- [ ] Requests cancelled when the UI no longer needs them
- [ ] Metered/constrained networks respected
- [ ] Tested under throttled, lossy network conditions
