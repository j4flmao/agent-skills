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

## Rules

- Profile before optimizing — never guess at performance bottlenecks
- Virtualize all lists — no ScrollView wrapping large child lists
- Cancel network requests and timers on screen dispose
- Use weak references for all delegates, callbacks, and listeners
- Startup: defer non-critical SDK initialization to after first frame
- Bundle: remove unused packages before adding new ones
- Baseline Profiles for Android — can improve startup by 30%+

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

### Reference Files
- `references/rendering.md` — jank, frame drops, layout performance
- `references/memory.md` — leaks, profiling, GC tuning
- `references/startup.md` — cold start, warm start, splash strategy

### Related Skills
- `mobile/universal/testing/SKILL.md` — performance regression testing
- `devops/monitoring/SKILL.md` — production perf monitoring

## Handoff

Hand off to stack-specific skill for implementation fixes.
