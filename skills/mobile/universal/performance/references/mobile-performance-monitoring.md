# Mobile Performance Monitoring

## Overview

Performance monitoring is the practice of collecting, analyzing, and alerting on application performance metrics in production. Without monitoring, performance issues go undetected until users complain or uninstall. This reference covers the full performance monitoring stack: metric selection, tool configuration, dashboard design, alerting, and integration with development workflows.

## Metrics Framework

### Core Performance Metrics

```yaml
startup_metrics:
  cold_start_time:
    description: "Time from app launch to interactive UI"
    measurement: "First frame rendered + first meaningful paint"
    target: "<2s on mid-range device"
    monitoring_tools: ["Firebase Performance", "MetricKit (iOS)", "Macrobenchmark (Android)"]

  warm_start_time:
    description: "Time from app resume to interactive UI"
    target: "<800ms"
    optimization: "Avoid heavy deserialization on resume, cache last state"

  time_to_first_frame:
    description: "Time until the first frame appears on screen"
    target: "<500ms"
    monitoring: "MetricKit (iOS), Choreographer (Android)"

rendering_metrics:
  frame_rate:
    description: "Frames per second during UI interaction"
    target: "60fps (30fps minimum for acceptable UX)"
    measurement: "Frame timing instrumentation"
    monitoring: "CADisplayLink (iOS), Choreographer (Android), DevTools (Flutter)"

  frame_drop_rate:
    description: "Percentage of frames exceeding 16ms (60fps) budget"
    target: "<3% drops"
    measurement: "Count dropped frames / total frames"

  slow_frame_rate:
    description: "Percentage of frames exceeding 50ms"
    target: "<0.5%"
    note: "Frames >50ms cause perceptible jank"

memory_metrics:
  peak_heap:
    description: "Maximum heap size during normal usage"
    target: "<200MB on mid-range device"
    monitoring: "Xcode Memory Report, Android Memory Profiler"

  memory_leak_growth:
    description: "Heap growth rate over time (potential leak indicator)"
    measurement: "Heap delta between similar states (e.g., navigating to screen and back)"
    target: "<5MB per navigation cycle"

  oom_rate:
    description: "Out of memory crash rate per session"
    target: "<0.01% (1 in 10,000 sessions)"
    monitoring: "Crashlytics, Sentry"

network_metrics:
  api_latency_p50:
    description: "Median API response time"
    target: "<200ms"
    monitoring: "Firebase Performance, Datadog, New Relic"

  api_latency_p95:
    description: "95th percentile API response time"
    target: "<500ms"
    note: "P95 reveals user-impacting slow requests hidden by P50"

  api_error_rate:
    description: "Percentage of API calls returning errors"
    target: "<1%"

  network_failure_rate:
    description: "Network request failures (timeout, DNS, connection refused)"
    target: "<0.5%"

battery_metrics:
  energy_impact:
    description: "Energy usage per session (Xcode Energy Log levels)"
    target: "Low (0) to Moderate (1) — never High (2) or Very High (3)"
    monitoring: "Xcode Instruments Energy Log, Android Battery Historian"

  wake_lock_duration:
    description: "Time device is prevented from sleeping"
    target: "<30 seconds per session for non-critical tasks"

bundle_metrics:
  app_download_size:
    description: "App store download size (not install size)"
    target_iOS: "<80MB (below cellular download warning threshold)"
    target_Android: "<30MB (Play Store APK size recommendation)"

  install_size:
    description: "Size on device after installation"
    target: "<200MB"
```

### Custom Metrics

Define application-specific metrics for critical user journeys.

```yaml
custom_metrics_examples:
  - name: "checkout_duration"
    description: "Time from tapping 'Checkout' to receiving order confirmation"
    target: "<30 seconds"
    measurement: "Custom trace from checkout_start to checkout_complete events"

  - name: "search_response_time"
    description: "Time from typing last character to search results visible"
    target: "<500ms"
    measurement: "Custom trace on search input and results render"

  - name: "image_upload_time"
    description: "Time to upload a profile photo"
    target: "<5 seconds for 2MB image"
    measurement: "Custom trace for upload lifecycle"

  - name: "push_notification_latency"
    description: "Time from server send to device receipt"
    target: "<10 seconds P95"
    measurement: "Server-triggered timestamp vs. device-received timestamp"
```

## Monitoring Tool Configuration

### Firebase Performance

```xml
<!-- Android: Firebase Performance Gradle plugin -->
buildscript {
    dependencies {
        classpath 'com.google.firebase:perf-plugin:1.4.2'
    }
}

// app/build.gradle
apply plugin: 'com.google.firebase.firebase-perf'
```

```swift
// iOS: Firebase Performance setup
import FirebasePerformance

// Automatic screen tracing
// Add -FIREBASE_PERFORMANCE to Other Linker Flags for auto-instrumentation

// Custom traces
let trace = Performance.startTrace(name: "checkout_flow")
// ... checkout logic ...
trace?.stop()

// HTTP requests are automatically traced with NSURLSession
```

```typescript
// React Native Firebase Performance
import perf from '@react-native-firebase/perf';

async function traceCheckout() {
    const trace = await perf().startTrace('checkout_flow');
    trace.putAttribute('payment_method', 'credit_card');

    try {
        await processCheckout();
        trace.putAttribute('success', 'true');
    } catch (error) {
        trace.putAttribute('success', 'false');
        trace.putAttribute('error', error.message);
    } finally {
        await trace.stop();
    }
}
```

### MetricKit (iOS)

```swift
import MetricKit

// AppDelegate setup
MXMetricManager.shared.add(self)

// Delegate callback
extension AppDelegate: MXMetricManagerSubscriber {
    func didReceive(_ payloads: [MXMetricPayload]) {
        for payload in payloads {
            // Application launch metrics
            if let launchMetrics = payload.applicationLaunchMetrics {
                let timeToFirstDraw = launchMetrics.histogrammedTimeToFirstDraw
                // Analyze and report
            }

            // Hang time (jank)
            if let hangTime = payload.applicationHangTime {
                let hangDuration = hangTime.applicationHangDuration
                // Analyze hang events
            }

            // Disk writes
            if let diskMetrics = payload.diskIOMetrics {
                let totalWrites = diskMetrics.averageWriteBytes
            }

            // Memory
            if let memoryMetrics = payload.memoryMetrics {
                let peakMemory = memoryMetrics.peakMemoryUsage
            }

            // Report to your analytics backend
            sendToAnalyticsBackend(payload)
        }
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        for payload in payloads {
            // Crash reports, CPU exceptions, disk write exceptions
            // Has more detail than Crashlytics for performance diagnostics
        }
    }
}
```

### Android Macrobenchmark

```kotlin
// Macrobenchmark for cold start measurement
@RunWith(AndroidJUnit4ClassRunner::class)
class StartupBenchmark {
    @get:Rule
    val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun coldStart() {
        benchmarkRule.measureRepeated(
            packageName = "com.example.app",
            metrics = listOf(StartupTimingMetric()),
            iterations = 10,
            startupMode = StartupMode.COLD,
        ) {
            pressHome()
            startActivityAndWait(
                Intent().setComponent(
                    ComponentName("com.example.app", "com.example.app.MainActivity")
                )
            )
        }
    }
}
```

### Datadog RUM (Real User Monitoring)

```typescript
// Browser/PWA initialization
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
    applicationId: 'your-app-id',
    clientToken: 'your-client-token',
    site: 'datadoghq.com',
    service: 'my-mobile-app',
    env: 'production',
    version: '1.2.3',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,  // Record sessions for replay
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    defaultPrivacyLevel: 'mask-user-input',
});

// Custom RUM actions
datadogRum.addAction('checkout_start', { cartTotal: 49.99 });

// Custom RUM timings
datadogRum.addTimings('checkout_complete');

// Add error context
datadogRum.addError('Payment failed', { errorCode: 'card_declined' });
```

### Sentry Performance

```python
# Python backend performance monitoring
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SQLAlchemyIntegration

sentry_sdk.init(
    dsn="https://public_key@sentry.io/123456",
    integrations=[
        FlaskIntegration(),
        SQLAlchemyIntegration(),
    ],
    traces_sample_rate=0.25,  # Sample 25% of transactions
    profiles_sample_rate=0.10,  # Sample 10% for profiling
    environment="production",
    release="myapp@1.2.3",
)
```

```typescript
// React Native Sentry
import * as Sentry from '@sentry/react-native';

Sentry.init({
    dsn: 'https://public_key@sentry.io/123456',
    tracesSampleRate: 0.25,
    profilesSampleRate: 0.10,
    enableAutoPerformanceTracing: true,
    // Automatically instruments navigation, network, and UI renders
});

// Custom transaction
const transaction = Sentry.startTransaction({
    name: 'checkout_flow',
    op: 'checkout',
});
Sentry.configureScope(scope => scope.setSpan(transaction));

try {
    await processCheckout();
    transaction.setStatus('ok');
} catch (error) {
    transaction.setStatus('internal_error');
    Sentry.captureException(error);
} finally {
    transaction.finish();
}
```

## Dashboard Design

### Key Performance Dashboards

```yaml
executive_dashboard:
  description: "High-level view for product managers and leadership"
  refresh: "Daily"
  panels:
    - title: "Cold Start Time (P50 / P95)"
      metric: "cold_start_duration_ms"
      visualization: "Time series with 7-day trend"
      target: "<2000ms (2000) —— FAIL"

    - title: "Crash-Free Session Rate"
      metric: "crash_free_rate"
      visualization: "Single number gauge, green > 99.5% / yellow > 99.0% / red < 99.0%"
      target: ">99.5%"

    - title: "Frame Drop Rate"
      metric: "slow_frame_rate"
      visualization: "Time series by OS version"
      target: "<3%"

    - title: "App Size"
      metric: "app_download_size_mb"
      visualization: "Single number per platform"
      target: "<80MB (iOS) / <30MB (Android)"

engineering_dashboard:
  description: "Detailed metrics for developers"
  refresh: "Real-time (5 min delay)"
  panels:
    - title: "API Latency by Endpoint (P50 / P95 / P99)"
      metric: "api_latency"
      visualization: "Table with top 10 slowest endpoints"
      drill_down: "Click endpoint to see time series by version / device / country"

    - title: "Memory by Screen"
      metric: "peak_memory_mb"
      visualization: "Bar chart — Home, Product List, Product Detail, Checkout, Settings"
      alert: "Any screen >200MB"

    - title: "OOM Rate by Device"
      metric: "oom_crash_rate"
      visualization: "Heatmap by device model and OS version"
      alert: "Any device model >0.1%"

    - title: "Network Error Rate by Endpoint"
      metric: "network_error_rate"
      visualization: "Time series stacked by error type (4xx, 5xx, timeout, DNS)"
      alert: "Any endpoint >2% error rate"

    - title: "Battery Impact"
      metric: "energy_impact_score"
      visualization: "Time series by app version"
      target: "Average < 1.0 (Moderate)"

    - title: "ANR Rate (Android)"
      metric: "anr_rate"
      visualization: "Time series"
      target: "<0.1%"
```

### Alert Configuration

```yaml
critical_alerts:
  - name: "Cold start regression"
    condition: "P95 cold start > 3s for >15 minutes"
    response: "Page on-call engineer"
    action: "Rollback last release if regression correlates with version change"

  - name: "OOM crash spike"
    condition: "OOM rate > 0.1% for >10 minutes"
    response: "Page mobile team lead"
    action: "Investigate memory regression, prepare hotfix"

  - name: "Frame drop increase"
    condition: "Slow frame rate > 8% (baseline <3%)"
    response: "Create JIRA ticket"
    action: "Profile on affected devices, identify rendering regression"

warning_alerts:
  - name: "API latency increase"
    condition: "P95 API latency > 1s for >30 minutes"
    response: "Slack notification"
    action: "Check backend performance, investigate network issues"

  - name: "Memory trend"
    condition: "Average peak memory increased >20% week-over-week"
    response: "Slack notification"
    action: "Review memory profiler, identify new leaks"

  - name: "App size increase"
    condition: "App size increased >10% from previous build"
    response: "CI failure"
    action: "Audit bundle composition, find size regression"
```

## Custom Trace Implementation

### Mobile Custom Traces

```swift
// iOS trace wrapper
class PerformanceTracer {
    static func trace<T>(name: String, attributes: [String: String] = [:], block: () async throws -> T) async rethrows -> T {
        let trace = Performance.startTrace(name: name)
        for (key, value) in attributes {
            trace?.setValue(value, forAttribute: key)
        }
        let start = CFAbsoluteTimeGetCurrent()
        let result = try await block()
        let duration = (CFAbsoluteTimeGetCurrent() - start) * 1000
        trace?.setValue("\(duration)", forAttribute: "duration_ms")
        trace?.stop()
        return result
    }
}

// Usage
let orders = try await PerformanceTracer.trace(name: "fetch_orders", attributes: ["screen": "dashboard"]) {
    try await api.fetchOrders()
}
```

```kotlin
// Android trace wrapper
class PerformanceTracer(private val firebasePerformance: FirebasePerformance) {
    inline fun <T> trace(name: String, attributes: Map<String, String> = emptyMap(), block: () -> T): T {
        val trace = firebasePerformance.newTrace(name)
        attributes.forEach { (key, value) -> trace.putAttribute(key, value) }
        trace.start()
        return try {
            block()
        } finally {
            trace.stop()
        }
    }
}

// Usage
val orders = PerformanceTracer.trace("fetch_orders", mapOf("screen" to "dashboard")) {
    api.fetchOrders()
}
```

### HTTP Request Tracing

```typescript
// Axios interceptor with automatic tracing
import axios from 'axios';
import perf from '@react-native-firebase/perf';

const apiClient = axios.create({ baseURL: 'https://api.example.com' });

apiClient.interceptors.request.use(async (config) => {
    const httpMetric = await perf().newHttpMetric(config.url!, config.method!.toUpperCase());
    config.metadata = { httpMetric };
    httpMetric.start();
    return config;
});

apiClient.interceptors.response.use(
    async (response) => {
        const { httpMetric } = response.config.metadata;
        httpMetric.setHttpResponseCode(response.status);
        httpMetric.setResponseContentType(response.headers['content-type']);
        await httpMetric.stop();
        return response;
    },
    async (error) => {
        if (error.config?.metadata?.httpMetric) {
            const { httpMetric } = error.config.metadata;
            httpMetric.setHttpResponseCode(error.response?.status || 0);
            await httpMetric.stop();
        }
        return Promise.reject(error);
    }
);
```

## Production vs. Debug Monitoring

```yaml
production_monitoring:
  sampling:
    - "Cold start traces: 100% of sessions (low volume, high signal)"
    - "Screen traces: 10% of sessions (high volume, statistically significant)"
    - "Network traces: 1% of requests (very high volume)"
    - "Custom traces (checkout, search): 25% of sessions"
    - "Error traces: 100% (critical for debugging)"

  data_privacy:
    - "Mask sensitive parameters in trace attributes"
    - "Never log user PII in performance traces"
    - "Strip query parameters from traced URLs"
    - "Anonymize device IDs"

  overhead_management:
    - "Trace SDK initialization should be <10ms"
    - "Per-trace overhead should be <1ms"
    - "Memory overhead of monitoring SDK: <5MB"
    - "CPU overhead: <2% average"
    - "Disable metrics collection in low-memory conditions"

debug_monitoring:
  sampling:
    - "All traces at 100% (debug builds have no production constraints)"
    - "Verbose logging for every API call"
    - "Full frame timing instrumentation"

  features:
    - "Capture full navigation state at trace points"
    - "Include debug stack traces for every slow operation"
    - "Real-time FPS overlay"
    - "Memory usage HUD"
```

## Integration with CI/CD

### Performance Regression Gate

```yaml
ci_performance_gate:
  steps:
    - "Build release variant (AOT, minified, obfuscated)"
    - "Install on reference device or emulator"
    - "Run automated UI test suite covering critical paths"
    - "Collect metrics: cold start, frame rate, peak memory, bundle size"
    - "Compare against baseline from main branch"
    - "Fail CI if: cold start > 110% of baseline, memory > 120% of baseline, bundle size > 105% of baseline"

  tooling:
    android: "Firebase Test Lab with Macrobenchmark"
    ios: "Xcode Cloud or GitHub Actions with iPhone SE simulator"
    cross_platform: "Maestro Cloud with performance assertions"

  baseline_management:
    - "Auto-update baseline after each successful release"
    - "Manual baseline reset allowed with team lead approval"
    - "Store baselines in version-controlled JSON"
    - "Notify team on baseline drift >10% over 2 weeks"
```

### Performance Budgets as Code

```typescript
// performance-budgets.json
{
    "version": "1.0.0",
    "app": "com.example.app",
    "budgets": {
        "cold_start_ms": { "target": 2000, "warning": 1800, "critical": 3000 },
        "warm_start_ms": { "target": 800, "warning": 600, "critical": 1200 },
        "peak_memory_mb": { "target": 200, "warning": 180, "critical": 250 },
        "frame_drop_rate_pct": { "target": 3, "warning": 2, "critical": 5 },
        "bundle_download_mb_ios": { "target": 80, "warning": 75, "critical": 100 },
        "bundle_download_mb_android": { "target": 30, "warning": 25, "critical": 40 },
        "api_p50_ms": { "target": 200, "warning": 150, "critical": 500 },
        "api_p95_ms": { "target": 500, "warning": 400, "critical": 1000 },
        "crash_free_rate_pct": { "target": 99.5, "warning": 99.0, "critical": 98.0 }
    }
}
```

## Performance Monitoring Checklist

```yaml
pre_launch:
  - "Integrate performance monitoring SDK (Firebase, Datadog, Sentry, MetricKit)"
  - "Define custom traces for all critical user journeys"
  - "Configure HTTP request tracing"
  - "Set up performance dashboards"
  - "Configure alerts for all critical metrics"
  - "Establish performance budgets"
  - "Test monitoring SDK overhead on mid-range device"
  - "Verify privacy compliance (no PII in traces)"

post_launch:
  - "Monitor dashboards daily for first week"
  - "Compare real-user metrics against pre-launch benchmark"
  - "Tune alert thresholds based on real data"
  - "Check for unexpected metric regressions"
  - "Review top 10 slow screens and endpoints"

ongoing:
  - "Weekly performance report: trends, regressions, improvements"
  - "Per-release: compare metrics against baseline"
  - "Monthly: review and update performance budgets"
  - "Quarterly: full performance audit with profiling on reference devices"
  - "Each sprint: allocate capacity for performance improvements"
  - "Monitor OOM rate weekly — it correlates directly with user churn"
```

## References

- Mobile Performance — Core performance optimization guide
- Mobile Performance Bundle Optimization — Bundle size reduction techniques
- Rendering Performance — Rendering optimization per platform
- Memory — Memory leak detection and prevention
- Startup — Startup time optimization techniques
- Network Performance — Network request optimization
