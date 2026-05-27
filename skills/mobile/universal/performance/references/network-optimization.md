# Mobile Network Optimization

## Overview

Mobile networks are inherently less reliable and higher latency than wired connections. Optimizing network performance is critical for mobile app responsiveness and user satisfaction. This guide covers request optimization, caching strategies, offline support, connection management, and network monitoring for mobile applications.

## Network Request Optimization

```yaml
request_optimization:
  reduce_requests:
    batching:
      description: "Combine multiple requests into one"
      example: "GET /orders?ids=1,2,3 instead of 3 individual requests"
      pattern: "Request coalescing — collect requests within 100ms window, batch and send"
    graphql:
      description: "Query only needed fields — avoids over-fetching"
      benefit: "30-50% payload reduction vs REST for data-rich screens"
    pagination:
      description: "Fetch data in pages — never request entire dataset"
      strategy: "Cursor-based pagination (stable) over offset-based (unstable with mutations)"
      
  reduce_payload:
    compression:
      algorithm: "Brotli (30% smaller than gzip) or gzip (universal support)"
      compression_level: "Level 4-6 — good compression with reasonable CPU cost on mobile"
      min_size: "Compress responses >1KB — smaller payloads don't benefit"
    field_selection:
      - "Return only fields the client needs — exclude unused fields"
      - "Use sparse fieldsets: ?fields=id,name,status"
      - "Consider GraphQL or custom serializers per client type"
    serialization:
      format: "JSON (standard) or Protocol Buffers (20-50% smaller, binary)"
      tradeoff: "Protobuf requires schema management — worth it for high-traffic APIs"
      
  connection_pooling:
    http_2: "Multiplex requests over single connection — no connection limit per domain"
    keep_alive: "Reuse TCP connections — avoid 3-way handshake overhead"
    connection_per_host: "2-4 connections per host max — more is counterproductive"
```

## Caching Strategy

```yaml
caching_strategy:
  cache_layers:
    l1_memory:
      storage: "In-memory dictionary / NSCache / LruCache"
      capacity: "10-50MB depending on device memory"
      speed: "Instant — no IO"
      data: "Current screen data, frequent lookups"
      clearing: "Clear on memory warning — rebuild from disk cache"
      
    l2_disk:
      storage: "SQLite or file-based cache"
      capacity: "100-500MB"
      speed: "Fast — sub-millisecond for cached, milliseconds for disk"
      data: "API responses, images, documents"
      limits: "Evict least-recently-used items when capacity reached"
      
    l3_http_cache:
      storage: "URLCache (iOS) / HttpResponseCache (Android)"
      capacity: "20-100MB"
      behavior: "Respects Cache-Control, ETag, Last-Modified headers"
      
  cache_headers:
    immutable: "max-age=31536000, immutable — content never changes (versioned assets)"
    short_ttl: "max-age=300 — data that changes occasionally (user profiles)"
    no_cache: "no-cache — always revalidate with server (account balance)"
    stale_while_revalidate: "stale-while-revalidate=60 — serve cached, refresh in background"
    
  cache_invalidation:
    time_based: "TTL expiry — simple but may serve stale data"
    event_based: "Invalidate on mutation (POST/PUT/DELETE response includes invalidated resources)"
    version_based: "Increment API version or data version — forces re-fetch on version mismatch"
```

## Offline Support

```yaml
offline_support:
  levels:
    no_offline: "App shows error screen when offline"
    read_offline: "Previously fetched data is viewable offline"
    full_offline: "Full CRUD with background sync when online"
    
  implementation:
    read_offline:
      pattern: "Network-first with cache fallback"
      flow: "Fetch from API → cache response → on failure: read from cache"
      write: "Queue writes when offline → replay when online"
      
    full_offline:
      pattern: "Cache-first with background sync (offline-first)"
      flow: "Read from cache → display immediately → sync with server in background"
      conflict_strategy:
        last_write_wins: "Simple — use latest timestamp"
        server_wins: "Server is authoritative — overwrite local"
        client_wins: "Local is authoritative — send local to server"
        manual: "Show conflict to user — let them choose"
        
  background_sync:
    ios:
      background_fetch: "iOS wakes app periodically (frequency controlled by system)"
      url_session: "URLSession with background configuration — handles upload/download after app suspended"
      push_to_sync: "Silent push notification triggers sync"
    android:
      work_manager: "Deferrable, guaranteed background work — survives app restart"
      sync_adapter: "Account-based sync with system sync framework"
      fcm_high_priority: "FCM data message wakes app for sync"
```

## Connection Management

```yaml
connection_management:
  network_detection:
    connectivity_monitor:
      ios: "NWPathMonitor (Network framework)"
      android: "ConnectivityManager.NetworkCallback"
      flutter: "connectivity_plus package"
      react_native: "@react-native-community/netinfo"
    actions_on_offline:
      - "Show offline indicator (banner or toast)"
      - "Disable mutation actions (submit, purchase, send)"
      - "Serve cached data with offline indicator"
      - "Queue background sync for pending mutations"
      
  retry_strategy:
    exponential_backoff:
      base_delay: "1 second"
      multiplier: "2×"
      max_delay: "30 seconds"
      max_attempts: "3-5"
      jitter: "+/- 25% random — prevents thundering herd"
    retry_on:
      - "Network timeout"
      - "HTTP 429 (Rate limited) — respect Retry-After header"
      - "HTTP 503 (Service Unavailable)"
    do_not_retry:
      - "HTTP 4xx client errors (except 429)"
      - "Malformed responses"
      - "Authentication errors"
      
  timeouts:
    connection: "10 seconds — time to establish TCP connection"
    read: "30 seconds — time to receive first byte after connection"
    total: "60 seconds — maximum request duration"
    mutation: "30 seconds (idempotent — safe to retry on timeout)"
```

## Network Monitoring

```yaml
network_monitoring:
  metrics:
    latency:
      dns: "Time to resolve domain name"
      tcp: "Time to establish TCP connection"
      tls: "Time for TLS handshake"
      ttfb: "Time to first byte — server processing + network"
      download: "Time to download full response"
    throughput: "Bytes per second — affected by signal strength"
    error_rate: "Percentage of failed requests (network errors, non-2xx responses)"
    cache_hit_ratio: "Percentage of requests served from cache"
    
  tools:
    ios: "NSURLSession metrics delegate, Network Link Conditioner"
    android: "Network Profiler (Android Studio), NetworkStatsManager"
    production: "Firebase Performance, Datadog RUM, Sentry, New Relic"
    
  alert_thresholds:
    error_rate: ">5% of requests failing — investigate"
    ttfb_p95: ">2 seconds — investigate server-side or network issues"
    cache_hit_ratio: "<20% — review caching strategy"
    request_count: ">100 requests per user per session — review batching"
```
