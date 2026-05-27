---
name: mobile-performance
description: >
  Use this skill when the user asks about mobile performance optimization, app
  slow, jank, frame drops, memory leaks, startup time, battery drain, bundle size,
  or profiling tools.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, performance, phase-4, universal]
---

# Mobile Performance

## Purpose
Diagnose and optimize mobile app performance across rendering, memory, startup time, battery drain, and bundle size using platform profiling tools.

## Agent Protocol

### Trigger
User request includes: `mobile performance`, `app slow`, `jank`, `frame drop`, `memory leak mobile`, `app startup`, `battery drain`, `app size`, `profiling mobile`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Performance tool (Xcode Instruments, Android Profiler, Flutter DevTools, Flipper)
- Current issue (jank, memory, startup, battery, size)

### Output Artifact
A markdown document containing:
- Root cause analysis
- Optimization strategy
- Code before/after snippets
- Verification steps

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

——

### Max Response Length
4096 tokens

## Workflow

### Step 1: Profile and Identify Bottleneck
Use platform profiling tool to measure frame times, memory allocations, startup duration, and battery impact.

### Step 2: Fix Rendering Performance
Address jank with virtualization (ListView.builder, FlatList, LazyColumn), const widgets, RepaintBoundary, and proper cell reuse.

### Step 3: Fix Memory Issues
Eliminate retain cycles, cancel network requests on dispose, use weak references, and profile with heap snapshots.

### Step 4: Optimize Startup Time
Implement Baseline Profiles (Android), reduce dynamic framework loading (iOS), and defer non-critical initialization.

### Step 5: Reduce Bundle Size
Enable code splitting, remove unused dependencies, use --split-debug-info, and analyze bundle composition.

## Performance Budget Methodology

### Defining Performance Budgets
```yaml
performance_budgets:
  startup:
    cold_start:
      target: "<2s to interactive on mid-range device"
      metrics: ["Time to first frame", "Time to interactive", "Fully loaded time"]
      tools: ["Firebase Performance", "Macrobenchmark (Android)", "MetricKit (iOS)"]
    warm_start:
      target: "<800ms to interactive"
      optimization: "Avoid heavy de-serialization on resume, cache last state"
      
  runtime:
    frame_rate:
      target: "60fps consistent (120fps for ProMotion devices)"
      measurement: "Frame timing instrumentation — not just perceived smoothness"
    memory:
      target: "<200MB peak heap on mid-range"
      measurement: "Heap snapshots at key user flows — leak detection per screen"
      
  bundle:
    app_size_android:
      target: "<30MB APK (or AAB equivalent)"
      reduction: "R8 optimization, --split-debug-info, remove unused resources"
    app_size_ios:
      target: "<80MB IPA"
      reduction: "Asset catalog optimization, remove unused architectures, Bitcode"
    download:
      target: "<100MB initial download from store (to avoid cellular warning)"
```

### Profiling Workflow
```yaml
profiling_workflow:
  step_1_establish_baseline:
    activity: "Run performance tests on reference device (mid-range, not flagship)"
    tools: ["Xcode Instruments", "Android Profiler", "Flutter DevTools", "Flipper"]
    metrics: ["Startup time", "Frame rate", "Peak memory", "Bundle size"]
    
  step_2_identify_bottlenecks:
    activity: "Profile each key user flow — launch, list scroll, image load, navigation"
    signs_of_trouble: ["Frame drops >3%", "Heap growing without GC", "Startup >3s"]
    
  step_3_hypothesize_and_fix:
    activity: "Form hypothesis about root cause, implement fix, re-profile"
    common_fixes:
      startup: "Defer SDK init, lazy-load modules, Baseline Profiles (Android)"
      jank: "Virtualized lists, const widgets, efficient re-render triggers"
      memory: "Weak refs, dispose subscriptions, image cache limits"
      
  step_4_verify:
    activity: "Profile again with same conditions — confirm fix without regression"
    threshold: "Improvement >10% in target metric"
    
  step_5_monitor:
    activity: "Add performance monitoring to production release"
    tools: ["Firebase Performance", "Datadog RUM", "New Relic Mobile", "Sentry Performance"]
```

## Rules

- Profile before optimizing — never guess at performance bottlenecks
- Virtualize all lists — no ScrollView wrapping large child lists
- Cancel network requests and timers on screen dispose
- Use weak references for all delegates, callbacks, and listeners
- Startup: defer non-critical SDK initialization to after first frame
- Bundle: remove unused packages before adding new ones
- Baseline Profiles for Android — can improve startup by 30%+
- Set explicit performance budgets before optimization begins
- Profile on mid-range devices — flagships hide performance problems

## Rendering Performance

### Flutter

```dart
// Avoid rebuilds — use const widgets
const OrderCard(order: order);  // Only rebuilds when order ref changes

// RepaintBoundary for complex widgets
RepaintBoundary(child: MapWidget());

// Use ListView.builder — not ListView(children: [])
ListView.builder(itemCount: items.length, itemBuilder: ...);
```

### React Native

```typescript
// FlatList with proper config
<FlatList
  data={orders}
  renderItem={renderItem}
  getItemLayout={getItemLayout}
  maxToRenderPerBatch={10}
  windowSize={5}
/>

// UseMemo for expensive computations
const total = useMemo(() => computeTotal(orders), [orders]);
```

### iOS

```swift
// Cell reuse
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "OrderCell")!
    // configure
    return cell
}
```

### Android

```kotlin
// LazyColumn with keys
LazyColumn {
    items(orders, key = { it.id }) { order -> OrderCard(order) }
}
```

## Memory

- Leak common causes: retain cycles (iOS), static references (Android), timer not cancelled
- Use weak references for delegates/callbacks
- Cancel network requests on screen dispose
- Profile with: Instruments (iOS), Memory Profiler (Android), DevTools (Flutter), Flipper (RN)

## Startup

```kotlin
// Android: Baseline Profiles
// In src/main/baseline-prof.txt
Lcom/example/app/MainActivity;->onCreate(Landroid/os/Bundle;)V
Lcom/example/app/features/orders/OrderListScreen;-><init>()V
```

```swift
// iOS: Reduce dynamic framework loading
// Move non-essential frameworks to optional
```

## Bundle Size

```yaml
# Flutter: Use --split-debug-info
flutter build apk --split-debug-info=build/debug-info

# RN: Remove unused packages
npx react-native-bundle-analyzer
```

## References
  - references/memory.md — Mobile Memory
  - references/mobile-performance-optimization.md — Mobile Performance Optimization
  - references/mobile-performance.md — Mobile Performance Optimization
  - references/network-performance.md — Network Performance
  - references/rendering.md — Rendering Performance
  - references/startup.md — Mobile Startup
## Handoff

Hand off to stack-specific skill for implementation fixes.
