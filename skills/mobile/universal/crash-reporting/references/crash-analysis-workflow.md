# Crash Analysis Workflow

## Overview

A structured crash analysis workflow enables teams to triage, prioritize, and resolve crashes efficiently across mobile platforms. This guide covers crash grouping and deduplication, stack trace analysis, ANR detection, memory pressure correlation, version/OS/device breakdown, regression detection, user impact scoring, and prioritized fix workflows.

## Triage Workflow

### End-to-End Pipeline

```
Crash Event → Ingestion → Grouping → Triage → Prioritization → Investigation → Fix → Verify
   ↑                                                                                    |
   └───────────────────────── Monitor (regression detection) ──────────────────────────┘
```

### Triage Stages

**Stage 1: Automated Ingestion (seconds)**
- Crash report received from SDK
- Deduplication against existing issues
- Fingerprint calculation (stack trace + error type + thread state)
- Initial severity classification
- User impact estimation (crash count, affected users, session count)

**Stage 2: Initial Triage (minutes)**
- Severity assessment based on crash rate and user impact
- Assignment to appropriate team
- Priority level determination
- Alert triggering if above thresholds

**Stage 3: Investigation (hours)**
- Stack trace analysis
- Breadcrumb review
- Device/environment correlation
- Root cause identification
- Fix implementation or workaround

**Stage 4: Verification (days)**
- Deploy fix via app release or hotfix
- Monitor crash rate for the issue
- Verify regression is resolved
- Update internal documentation

### Triage SLA Targets

| Severity | Initial Response | Investigation Start | Fix Target | Example |
|----------|-----------------|---------------------|------------|---------|
| P0-Critical | 15 minutes | Immediate | 24 hours | Blank screen crash on startup for > 5% of users |
| P1-High | 1 hour | Within 4 hours | 3 days | Feature-specific crash affecting > 1% of users |
| P2-Medium | 4 hours | Within 24 hours | 2 weeks | Non-fatal exception in edge case |
| P3-Low | 24 hours | Within 1 week | Next release | Crash on unsupported OS version |
| P4-Monitor | Weekly review | As capacity permits | Backlog | Single-user crash, low frequency |

## Crash Grouping and Deduplication

### Fingerprint Calculation

```python
# fingerprint_calculator.py
import hashlib
import re
from typing import Dict, List, Optional

class CrashFingerprinter:
    def __init__(self):
        self.stack_frame_pattern = re.compile(
            r'(?P<library>\S+)\s+0x[0-9a-f]+\s+'
            r'(?P<symbol>\S+)\s*\+\s*(?P<offset>\d+)'
        )

    def calculate_fingerprint(self, crash_report: Dict) -> str:
        """Calculate a unique fingerprint for a crash report."""
        components = []

        # Error type (exception class / signal name)
        error_type = self._extract_error_type(crash_report)
        components.append(error_type)

        # Top 5 frames of the crash thread (function names only, no offsets)
        crash_thread = self._find_crash_thread(crash_report)
        if crash_thread:
            frames = self._extract_frames(crash_thread)
            top_frames = frames[:5]
            for frame in top_frames:
                symbol = self._normalize_symbol(frame.get('symbol', ''))
                components.append(symbol)

        # Application-specific module
        app_module = crash_report.get('app_identifier', 'unknown')
        components.append(app_module)

        # Operating system version family (major.minor, not patch)
        os_version = self._normalize_os_version(crash_report.get('os_version', ''))
        components.append(os_version)

        fingerprint_input = '|'.join(components)
        return hashlib.sha256(fingerprint_input.encode()).hexdigest()[:32]

    def _extract_error_type(self, report: Dict) -> str:
        if 'exception' in report:
            return report['exception'].get('type', 'UnknownException')
        if 'signal' in report:
            return f"SIGNAL_{report['signal'].get('number', 0)}"
        return 'UnknownError'

    def _find_crash_thread(self, report: Dict) -> Optional[Dict]:
        threads = report.get('threads', [])
        for thread in threads:
            if thread.get('crashed', False):
                return thread
        return threads[0] if threads else None

    def _extract_frames(self, thread: Dict) -> List[Dict]:
        return thread.get('backtrace', {}).get('frames', [])

    def _normalize_symbol(self, symbol: str) -> str:
        # Remove generic template parameters
        symbol = re.sub(r'<[^>]+>', '<T>', symbol)
        # Remove numeric suffixes (Swift hash suffixes)
        symbol = re.sub(r'\s*\(.*?\)\s*$', '', symbol)
        return symbol

    def _normalize_os_version(self, version: str) -> str:
        parts = version.split('.')
        if len(parts) >= 2:
            return f"{parts[0]}.{parts[1]}"
        return version
```

### Deduplication Rules

```yaml
# deduplication-rules.yaml
deduplication:
  primary_key: fingerprint
  secondary_keys:
    - "crash_report.error_type"
    - "crash_report.top_5_stack_frames"
    - "crash_report.module_name"
  
  merge_rules:
    same_fingerprint:
      - "Merge into existing issue"
      - "Update crash count and affected users"
      - "Update latest affected version"
    different_fingerprint_same_top_frame:
      - "Consider related issue"
      - "Add as related issue reference"
    same_fingerprint_different_os_version:
      - "Merge with OS version tag"
      - "Track as sub-group for regression detection"
  
  groupings:
    - name: "exact_match"
      description: "Identical fingerprint"
      action: "merge"
    - name: "similar_stack"
      description: "Same error type and top 3 frames"
      action: "group_together"
    - name: "related_module"
      description: "Same error type and module, different frames"
      action: "link_as_related"
```

## Stack Trace Analysis

### Symbolication Process

```python
# stack_analyzer.py
from typing import Dict, List, Optional
import re

class StackTraceAnalyzer:
    def __init__(self, symbol_maps: Dict[str, Dict[str, str]]):
        self.symbol_maps = symbol_maps  # uuid -> {address: symbol}
        self.app_prefixes = [
            'com.mycompany',
            'MyApp',
            'flutter',
            'org.reactjs.native',
        ]

    def analyze(self, crash_report: Dict) -> Dict:
        crash_thread = self._find_crash_thread(crash_report)
        if not crash_thread:
            return {'error': 'No crash thread found'}

        frames = crash_thread.get('backtrace', {}).get('frames', [])
        symbolicated = self._symbolicate_frames(frames)
        app_frames = self._filter_app_frames(symbolicated)
        suspect_frames = self._identify_suspect_frames(app_frames)

        return {
            'culprit_frame': self._find_culprit_frame(app_frames),
            'app_code_involved': len(app_frames) > 0,
            'app_frames': app_frames,
            'system_frames': self._filter_system_frames(symbolicated),
            'suspect_patterns': suspect_frames,
            'thread_count': len(crash_report.get('threads', [])),
            'is_main_thread': crash_thread.get('name', '').lower() == 'main',
        }

    def _symbolicate_frames(self, frames: List[Dict]) -> List[Dict]:
        result = []
        for frame in frames:
            library = frame.get('library', '')
            address = frame.get('instruction_addr', '')
            symbol = frame.get('symbol', '')

            # Apply symbol map if available
            uuid = frame.get('uuid', '')
            if uuid in self.symbol_maps and address in self.symbol_maps[uuid]:
                symbol = self.symbol_maps[uuid][address]

            result.append({
                'library': library,
                'symbol': symbol,
                'address': address,
                'in_app': any(library.startswith(p) for p in self.app_prefixes),
                'offset': frame.get('offset', 0),
            })
        return result

    def _filter_app_frames(self, frames: List[Dict]) -> List[Dict]:
        return [f for f in frames if f['in_app']]

    def _filter_system_frames(self, frames: List[Dict]) -> List[Dict]:
        return [f for f in frames if not f['in_app']]

    def _find_culprit_frame(self, app_frames: List[Dict]) -> Optional[Dict]:
        if not app_frames:
            return None
        # The topmost application frame is likely the culprit
        return app_frames[0]

    def _identify_suspect_frames(self, frames: List[Dict]) -> List[str]:
        patterns = []
        for frame in frames:
            symbol = frame.get('symbol', '')
            # Common crash patterns
            if 'null' in symbol.lower() or 'nil' in symbol.lower():
                patterns.append('null_dereference')
            if 'outOfBounds' in symbol or 'index' in symbol.lower():
                patterns.append('index_out_of_bounds')
            if 'assert' in symbol.lower():
                patterns.append('assertion_failure')
            if 'overflow' in symbol.lower():
                patterns.append('overflow')
            if 'deadlock' in symbol.lower():
                patterns.append('deadlock')
            if 'NSException' in symbol or 'RuntimeException' in symbol:
                patterns.append('uncaught_exception')
        return patterns
```

### Common Stack Trace Patterns

| Pattern | Indicators | Typical Cause | Remediation |
|---------|------------|---------------|-------------|
| Null dereference | objc_msgSend, EXC_BAD_ACCESS, NullPointerException | Unchecked optional, race condition on null state | Add null checks, use safe unwrapping |
| Index out of bounds | NSRangeException, IndexOutOfBoundsException, SIGABRT | Array access without bounds check | Validate indexes, use safe accessors |
| Memory pressure | SIGKILL, jetsam, OutOfMemoryError | Excessive memory allocation, leaks | Profile memory usage, fix leaks |
| Deadlock | Thread stuck, watchdog timeout | Synchronization issue | Review locking strategy, add timeouts |
| Assertion | SIGABRT, assertion failed | Invalid state in development path | Fix state management, review logic |
| Stack overflow | EXC_BAD_ACCESS (stack), SIGSEGV | Infinite recursion | Review recursive calls, add depth limits |
| Uncaught exception | NSUncaughtExceptionHandler, Unhandled rejection | Missing error handler | Add global exception handler |
| Signal | SIGSEGV, SIGBUS, SIGILL | Low-level memory corruption | Check pointer arithmetic, buffer overflows |
| Watchdog | 0x8badf00d (iOS), ANR (Android) | Main thread blocked | Move work off main thread |

## ANR Detection and Analysis

### ANR Detection Configuration

```kotlin
// Android ANR detection
class AnrDetector(private val context: Context) {
    private val anrWatchdog = HandlerThread("ANR-Watchdog")
    private val anrHandler: Handler
    private var lastMainThreadTick = 0L
    private val ANR_THRESHOLD_MS = 5000L

    fun start() {
        anrWatchdog.start()
        anrHandler = Handler(anrWatchdog.looper)
        scheduleWatchdog()
    }

    private fun scheduleWatchdog() {
        anrHandler.postDelayed({
            checkForAnr()
            scheduleWatchdog()
        }, ANR_THRESHOLD_MS)
    }

    private fun checkForAnr() {
        val mainThread = Looper.getMainLooper().thread
        if (mainThread.state == Thread.State.RUNNABLE) {
            // Main thread is running - likely in a long operation
            collectThreadDump(mainThread)
            reportPotentialAnr(mainThread)
        }
    }

    private fun collectThreadDump(thread: Thread) {
        val stackTrace = StringBuilder()
        stackTrace.appendLine("Potential ANR detected on main thread")
        stackTrace.appendLine("Thread state: ${thread.state}")
        stackTrace.appendLine("Stack trace:")
        for (element in thread.stackTrace) {
            stackTrace.appendLine("  at ${element.className}.${element.methodName}(${element.fileName}:${element.lineNumber})")
        }
        // Store for crash report attachment
        AnrStorage.save(stackTrace.toString())
    }

    private fun reportPotentialAnr(thread: Thread) {
        // Report as non-fatal to crash reporting service
        CrashReporting.recordException(
            AnrException("Main thread blocked for > $ANR_THRESHOLD_MS ms"),
            mapOf("main_thread_stack" to thread.stackTrace.joinToString("\n"))
        )
    }
}
```

```swift
// iOS ANR detection
class AnrDetector {
    private let threshold: TimeInterval = 5.0
    private var isMonitoring = false
    private let pingQueue = DispatchQueue(label: "com.anr.ping")
    private let mainQueue = DispatchQueue.main
    private var lastPing = Date()

    func start() {
        isMonitoring = true
        monitorLoop()
    }

    private func monitorLoop() {
        guard isMonitoring else { return }

        lastPing = Date()
        mainQueue.async { [weak self] in
            self?.lastPing = Date()
        }

        pingQueue.asyncAfter(deadline: .now() + threshold) { [weak self] in
            guard let self = self, self.isMonitoring else { return }

            let elapsed = Date().timeIntervalSince(self.lastPing)
            if elapsed >= self.threshold {
                self.reportAnr(elapsed)
            }
            self.monitorLoop()
        }
    }

    private func reportAnr(_ duration: TimeInterval) {
        let stackTrace = Thread.callStackSymbols
        let report = [
            "ANR detected",
            "Duration: \(duration)s",
            "Main thread stack:",
            stackTrace.joined(separator: "\n"),
        ].joined(separator: "\n")

        CrashReporting.record(error: AnrError(duration: duration), attachments: [report])
    }
}
```

## Memory Pressure Correlation

### Memory Tracking

```dart
// Flutter memory pressure monitoring
import 'dart:ui';
import 'dart:developer';

class MemoryPressureMonitor {
  static const _highPressureThreshold = 0.8; // 80% of max
  static const _criticalPressureThreshold = 0.95; // 95% of max
  int _highPressureCount = 0;
  DateTime? _lastHighPressureEvent;

  void start() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkMemory();
    });
  }

  void _checkMemory() {
    final memInfo = ProcessInfo.currentRss;
    final maxMem = ProcessInfo.maxRss;
    final pressure = memInfo / maxMem;

    if (pressure > _criticalPressureThreshold) {
      _reportCriticalPressure(memInfo, maxMem);
    } else if (pressure > _highPressureThreshold) {
      _highPressureCount++;
      _lastHighPressureEvent = DateTime.now();
    }

    // Schedule next check in 30 seconds
    Future.delayed(const Duration(seconds: 30), _checkMemory);
  }

  void _reportCriticalPressure(int used, int max) {
    CrashReporting.recordBreadcrumb(
      'Critical memory pressure: ${used / 1024 / 1024}MB / ${max / 1024 / 1024}MB',
      type: BreadcrumbType.error,
    );
  }

  Map<String, dynamic> get context => {
    'high_pressure_count': _highPressureCount,
    'last_high_pressure': _lastHighPressureEvent?.toIso8601String(),
  };
}
```

## Crash Rate Trending

### Trend Analysis

```python
# crash_trend_analyzer.py
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import statistics

class CrashTrendAnalyzer:
    def __init__(self):
        self.baseline_window_days = 7
        self.regression_threshold_stddev = 3  # 3 standard deviations
        self.min_daily_crashes_for_trending = 10

    def analyze_trend(
        self,
        daily_crash_counts: List[Dict[str, int]],
        current_window_days: int = 1
    ) -> Dict:
        """Analyze crash frequency trend and detect regressions."""
        now = datetime.utcnow()
        baseline_start = now - timedelta(days=self.baseline_window_days + current_window_days)
        baseline_end = now - timedelta(days=current_window_days)

        baseline_data = [
            d for d in daily_crash_counts
            if baseline_start <= d['date'] < baseline_end
        ]
        current_data = [
            d for d in daily_crash_counts
            if d['date'] >= baseline_end
        ]

        if not baseline_data or not current_data:
            return {'status': 'insufficient_data'}

        baseline_values = [d['count'] for d in baseline_data]
        current_total = sum(d['count'] for d in current_data)
        current_days = len(current_data)

        mean_baseline = statistics.mean(baseline_values)
        std_baseline = statistics.stdev(baseline_values) if len(baseline_values) > 1 else 0
        daily_current_avg = current_total / current_days

        if std_baseline == 0:
            z_score = 0 if daily_current_avg == mean_baseline else float('inf')
        else:
            z_score = (daily_current_avg - mean_baseline) / std_baseline

        is_regression = z_score > self.regression_threshold_stddev
        severity = self._classify_regression(
            z_score,
            daily_current_avg,
            current_total
        )

        return {
            'status': 'regression' if is_regression else 'stable',
            'severity': severity,
            'baseline_mean': mean_baseline,
            'baseline_std': std_baseline,
            'current_daily_avg': daily_current_avg,
            'z_score': z_score,
            'total_current_crashes': current_total,
            'regression_factor': daily_current_avg / mean_baseline if mean_baseline > 0 else float('inf'),
        }

    def _classify_regression(
        self,
        z_score: float,
        daily_avg: float,
        total: int
    ) -> str:
        if z_score > 10 or daily_avg > 1000:
            return 'critical'
        elif z_score > 5 or daily_avg > 100:
            return 'high'
        elif z_score > 3 or daily_avg > 10:
            return 'medium'
        return 'low'
```

## User Impact Scoring

### Impact Score Calculation

```python
# user_impact_scorer.py
class UserImpactScorer:
    def calculate_score(self, crash_stats: Dict) -> Dict:
        """
        Calculate user impact score (0-100) for a crash issue.
        Higher score = higher priority.
        """
        score = 0.0

        # Crash frequency (0-30 points)
        crash_rate = crash_stats.get('crash_rate', 0)  # crashes per session
        if crash_rate > 0.05:  # > 5% of sessions crash
            score += 30
        elif crash_rate > 0.01:  # > 1%
            score += 20
        elif crash_rate > 0.001:  # > 0.1%
            score += 10
        else:
            score += 5

        # Affected users (0-25 points)
        affected_users_pct = crash_stats.get('affected_users_pct', 0)
        if affected_users_pct > 10:
            score += 25
        elif affected_users_pct > 5:
            score += 20
        elif affected_users_pct > 1:
            score += 15
        elif affected_users_pct > 0.1:
            score += 10
        else:
            score += 5

        # Revenue impact (0-20 points)
        revenue_impact = crash_stats.get('revenue_impact', 'none')
        if revenue_impact == 'critical':
            score += 20
        elif revenue_impact == 'high':
            score += 15
        elif revenue_impact == 'medium':
            score += 10
        elif revenue_impact == 'low':
            score += 5

        # User experience impact (0-15 points)
        ux_impact = crash_stats.get('ux_impact', 'low')
        if ux_impact == 'critical':  # Startup crash, blank screen
            score += 15
        elif ux_impact == 'high':  # Feature crash, data loss
            score += 10
        elif ux_impact == 'medium':  # Non-fatal error
            score += 5

        # Trends (0-10 points)
        trend = crash_stats.get('trend', 'stable')
        if trend == 'rapidly_increasing':
            score += 10
        elif trend == 'increasing':
            score += 5
        elif trend == 'new':  # First seen in last 24 hours
            score += 8

        # Severity mapping
        severity = 'low'
        if score >= 70:
            severity = 'critical'
        elif score >= 50:
            severity = 'high'
        elif score >= 30:
            severity = 'medium'

        return {'score': score, 'severity': severity}
```

## Prioritized Fix Workflow

### Priority Matrix

```yaml
# priority-matrix.yaml
priority_matrix:
  p0_critical:
    criteria:
      - crash_rate > 5%
      - affected_users > 10%
      - startup_crash: true
      - revenue_impact: critical
      - trend: rapidly_increasing
    action:
      - "Immediate incident response"
      - "Hotfix or app store expedited review"
      - "Rollback feature if recently shipped"
      - "Notify all engineers and PM"
    sla:
      fix: 24_hours
      verification: 48_hours

  p1_high:
    criteria:
      - crash_rate: 1-5%
      - affected_users: 1-10%
      - ux_impact: high
      - trend: increasing
    action:
      - "Assign to feature team immediately"
      - "Include in next planned release"
      - "Consider hotfix if critical path"
    sla:
      fix: 3_days
      verification: 7_days

  p2_medium:
    criteria:
      - crash_rate: 0.1-1%
      - affected_users: 0.1-1%
      - ux_impact: medium
      - trend: stable
    action:
      - "Add to sprint backlog"
      - "Assign to feature team"
      - "Include in next release"
    sla:
      fix: 2_weeks
      verification: 1_month

  p3_low:
    criteria:
      - crash_rate < 0.1%
      - affected_users < 0.1%
      - ux_impact: low
      - trend: decreasing
    action:
      - "Add to product backlog"
      - "Address in next major release"
    sla:
      fix: next_release
```

## Key Points

- Crash triage follows a four-stage pipeline: automated ingestion, initial triage, investigation, verification with SLA targets per severity level
- Fingerprinting uses a SHA-256 hash of error type, top 5 normalized stack frames, app module, and major OS version for deduplication
- Stack trace analysis identifies culprit frames, suspect patterns (null dereference, index out of bounds, deadlock), and distinguishes app code from system code
- ANR detection requires watchdog threads to monitor main thread responsiveness with threshold-based reporting
- Memory pressure correlation tracks RSS vs max, with breadcrumbs at high (80%) and critical (95%) thresholds
- Crash trend analysis uses z-score against a 7-day baseline to detect regressions, with configurable standard deviation thresholds
- User impact scoring combines crash frequency, affected users, revenue impact, UX impact, and trend direction into a 0-100 priority score
- Priority matrix maps score ranges to SLA targets with specific actions per P0-P3 level
