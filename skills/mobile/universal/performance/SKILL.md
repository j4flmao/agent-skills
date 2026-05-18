---
name: mobile-performance
description: Cross-platform mobile performance optimization — rendering, memory, startup, battery, network, bundle size, profiling tools.
---

# Mobile Performance

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

### Max Response Length
4096 tokens

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
