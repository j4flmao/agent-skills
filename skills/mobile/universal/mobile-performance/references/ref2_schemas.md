# Mobile Performance Data Schemas

Data models for collecting, storing and comparing mobile performance metrics: a span/trace event model, a session metric payload, budget definitions, benchmark result format, and how platform payloads (MetricKit, Android vitals exports, Macrobenchmark JSON) map onto them.

## 1. Common Dimensions

Every metric record carries the same context so results can be sliced consistently.

| Field | Type | Example | Notes |
|---|---|---|---|
| `app_version` | string | `5.12.0` | Marketing version |
| `build_number` | string | `51200` | versionCode / CFBundleVersion |
| `platform` | enum | `android`, `ios` | |
| `os_version` | string | `15`, `18.1` | |
| `device_model` | string | `Pixel 7a`, `iPhone15,4` | Raw model identifier |
| `device_tier` | enum | `low`, `mid`, `high` | Derived from RAM/CPU class |
| `network_type` | enum | `wifi`, `cellular`, `offline` | At event time |
| `session_id` | string | random id | Not linked to user identity |
| `sample_rate` | float | `0.05` | Needed to scale counts back up |

Do not include user identifiers, precise location or content in performance payloads.

## 2. Span / Trace Event Model

Compatible in spirit with OpenTelemetry spans, so it can be exported to OTLP backends.

```json
{
  "name": "screen.home.full_display",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "parent_span_id": null,
  "start_unix_nanos": 1761552000000000000,
  "end_unix_nanos": 1761552000812000000,
  "status": "ok",
  "attributes": {
    "startup.type": "cold",
    "screen.name": "home",
    "data.source": "cache"
  },
  "context": { "app_version": "5.12.0", "platform": "android", "device_tier": "mid" }
}
```
Naming convention: `<area>.<object>.<action>` (`app.start.cold`, `screen.checkout.render`, `http.client.request`, `db.feed.query`).

## 3. Session Metrics Payload

Aggregated per session (or per day) on device, uploaded in batches.

```json
{
  "schema_version": 3,
  "context": { "app_version": "5.12.0", "build_number": "51200", "platform": "ios", "os_version": "18.1",
               "device_model": "iPhone15,4", "device_tier": "high", "sample_rate": 0.05 },
  "launch": { "type": "cold", "time_to_first_frame_ms": 420, "time_to_full_display_ms": 910, "prewarmed": false },
  "frames": { "total": 5400, "janky": 61, "hitch_time_ms_per_s": 3.1, "refresh_hz": 120 },
  "memory": { "peak_mb": 312, "terminated_for_memory": false },
  "hangs": [{ "duration_ms": 640, "screen": "checkout" }],
  "network": { "requests": 87, "bytes_down": 2843000, "bytes_up": 61000, "p90_latency_ms": 380 }
}
```

### Relational storage (analytics warehouse)
```sql
CREATE TABLE perf_session (
  session_id     TEXT PRIMARY KEY,
  received_at    TIMESTAMPTZ NOT NULL,
  platform       TEXT NOT NULL CHECK (platform IN ('android','ios')),
  app_version    TEXT NOT NULL,
  build_number   TEXT NOT NULL,
  os_version     TEXT NOT NULL,
  device_model   TEXT NOT NULL,
  device_tier    TEXT NOT NULL,
  sample_rate    REAL NOT NULL CHECK (sample_rate > 0 AND sample_rate <= 1),
  launch_type    TEXT,
  ttid_ms        INTEGER,
  ttfd_ms        INTEGER,
  frames_total   INTEGER,
  frames_janky   INTEGER,
  peak_mem_mb    INTEGER
);
CREATE INDEX perf_session_version_idx ON perf_session (platform, app_version, received_at);

-- p50/p90 cold-start TTID per version
SELECT app_version,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY ttid_ms) AS p50,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY ttid_ms) AS p90,
       count(*) AS sessions
FROM perf_session
WHERE platform = 'android' AND launch_type = 'cold'
GROUP BY app_version ORDER BY app_version;
```

## 4. Budget Definition File

Checked into the repo and read by CI.

```yaml
# perf-budgets.yaml
reference_devices:
  android: { tier: mid, models: ["Pixel 6a"] }
  ios: { tier: mid, models: ["iPhone 13"] }
journeys:
  cold_start:
    metric: timeToInitialDisplayMs
    statistic: median
    max: 800
    max_regression_pct: 5
  home_scroll:
    metric: frameOverrunMs
    statistic: p90
    max: 0
  checkout_open:
    metric: Checkout.renderMs        # custom trace section
    statistic: median
    max: 250
owners:
  cold_start: platform-team
  home_scroll: home-team
```
Numbers above are illustrative; derive yours from measured baselines.

## 5. Benchmark Result Format

Jetpack Macrobenchmark writes `<module>/build/outputs/connected_android_test_additional_output/.../*-benchmarkData.json`. Relevant shape:
```json
{
  "context": { "build": { "model": "Pixel 6a" }, "cpuCoreCount": 8 },
  "benchmarks": [{
    "name": "startupCompilationBaselineProfiles",
    "className": "com.example.benchmark.StartupBenchmark",
    "metrics": {
      "timeToInitialDisplayMs": { "minimum": 512.1, "maximum": 610.4, "median": 540.3, "runs": [] }
    },
    "repeatIterations": 10
  }]
}
```
XCTest performance results are stored in the `.xcresult` bundle; extract with `xcrun xcresulttool` and normalize into the same `{journey, metric, statistic, value, context}` row:

```json
{ "journey": "cold_start", "metric": "timeToInitialDisplayMs", "statistic": "median",
  "value": 540.3, "device": "Pixel 6a", "commit": "a1b2c3d", "ci_run": 18342 }
```

## 6. Mapping Platform Field Data

| Platform source | Fields | Maps to |
|---|---|---|
| MetricKit `MXMetricPayload` (daily) | `applicationLaunchMetrics.histogrammedTimeToFirstDraw`, `animationMetrics.scrollHitchTimeRatio`, `memoryMetrics.peakMemoryUsage`, `applicationExitMetrics` | launch, frames, memory |
| MetricKit `MXDiagnosticPayload` | `hangDiagnostics`, `cpuExceptionDiagnostics`, `diskWriteExceptionDiagnostics`, `crashDiagnostics` with call stack trees | hangs, diagnostics |
| Android `ApplicationStartInfo` (API 35) | start type, reason, startup timestamps | launch |
| Android `ApplicationExitInfo` (API 30) | reason (ANR, LOW_MEMORY, CRASH_NATIVE...), PSS/RSS, trace for ANRs | exits |
| Play Console / Play Developer Reporting API | crash rate, ANR rate, slow start, slow rendering, excessive wake locks | fleet health |

MetricKit histograms are bucketed; store bucket start, end and count rather than inventing a single value.

## Schema Evolution
- Version every payload (`schema_version`) and keep parsers backward compatible.
- Add fields as optional; never change units of an existing field (add `_ms` / `_mb` suffixes).
- Keep a data dictionary documenting each metric's definition and source.

## Checklist
- [ ] Shared dimensions on every record
- [ ] No personal data in performance payloads
- [ ] Units explicit in field names
- [ ] Sample rate recorded for correct aggregation
- [ ] Budgets machine-readable and owned
- [ ] Platform payloads mapped without loss of histogram detail
