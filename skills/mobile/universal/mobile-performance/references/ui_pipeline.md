# UI Rendering Pipeline and Jank

How UI frameworks turn state into frames (Android Views, Jetpack Compose, UIKit, SwiftUI), what makes a frame late, and how to fix list and recomposition jank.

## The Per-Frame Pipeline

```
VSYNC -> input -> animation -> state change
      -> (Compose: composition) -> measure -> layout -> draw/record
      -> render thread / render server -> GPU -> display
```
Each stage must fit in the frame budget (16.7 ms at 60 Hz, 8.3 ms at 120 Hz) together with GPU work. The most common cause of jank is too much work on the main thread in measure/layout/bind.

## Android Views

- `Choreographer` drives frames on VSYNC; `requestLayout()` triggers measure+layout of the affected subtree up to the root, `invalidate()` triggers redraw only.
- Deep or nested weighted `LinearLayout`s and `RelativeLayout` cause multiple measure passes; `ConstraintLayout` keeps hierarchies flat.
- `RecyclerView`: use `ListAdapter`/`DiffUtil` (computed off main via `AsyncListDiffer`), stable IDs where appropriate, `setHasFixedSize(true)` when size does not depend on content, shared `RecycledViewPool` for nested lists, and prefetch (`LinearLayoutManager.setInitialPrefetchItemCount` for nested horizontal lists).

```kotlin
class ItemAdapter : ListAdapter<Item, ItemVH>(Diff) {
  object Diff : DiffUtil.ItemCallback<Item>() {
    override fun areItemsTheSame(a: Item, b: Item) = a.id == b.id
    override fun areContentsTheSame(a: Item, b: Item) = a == b
  }
  override fun onCreateViewHolder(p: ViewGroup, t: Int) = ItemVH(ItemBinding.inflate(LayoutInflater.from(p.context), p, false))
  override fun onBindViewHolder(h: ItemVH, pos: Int) = h.bind(getItem(pos))   // no allocation-heavy work here
}
```

## Jetpack Compose

Three phases per frame: **composition** (run composables, build the UI tree), **layout** (measure and place), **drawing**. State reads are tracked per phase, so reading state later skips earlier phases.

```kotlin
// Bad: reads scroll offset in composition -> recomposes every scroll frame
val offset = listState.firstVisibleItemScrollOffset
Box(Modifier.offset(y = offset.dp))

// Good: read inside a lambda modifier -> only layout/draw re-run
Box(Modifier.offset { IntOffset(0, listState.firstVisibleItemScrollOffset) })

// Good: derive coarse state so recomposition happens only when the boolean flips
val showFab by remember { derivedStateOf { listState.firstVisibleItemIndex > 0 } }
```

### Lazy lists
```kotlin
LazyColumn {
  items(items = feed, key = { it.id }, contentType = { it.type }) { item ->
    FeedRow(item)
  }
}
```
- Provide `key` for stable identity across reorders and `contentType` for better reuse.
- Avoid nesting scrollable lists in the same direction.

### Stability and skipping
- With strong skipping mode (default since Kotlin 2.0.20 Compose compiler), composables with unstable parameters can still be skipped when instances are equal by reference; immutable data classes and `kotlinx.collections.immutable` still help.
- Hoist expensive calculations into `remember(key)` or the ViewModel.
- Use the Compose compiler metrics/reports and Layout Inspector recomposition counts to find hot composables.

### Baseline Profiles
Compose ships as a library and is JIT-compiled without a profile; Baseline Profiles noticeably reduce first-scroll jank.

## UIKit

- The main run loop handles events, then Core Animation commits layout and display changes at the end of the loop iteration.
- Auto Layout cost grows with constraint complexity; avoid constantly activating/deactivating constraints during scroll.
- `UICollectionView` with diffable data sources and compositional layout; prefetching via `UICollectionViewDataSourcePrefetching`; configure cells with `UIContentConfiguration`.
- Self-sizing cells: cache heights or provide good estimates for large lists.
- Do text measurement, image decoding and formatting off the main thread when possible.

## SwiftUI

- A view's `body` re-evaluates when observed state it reads changes. With the Observation framework (`@Observable`, iOS 17+), tracking is per property read in `body`, which narrows invalidation compared with `ObservableObject` (any `@Published` change invalidates all observers).
- Keep `body` cheap: no formatting with new formatter instances, no sorting/filtering of large arrays (precompute in the model).
- Use stable `id`s in `ForEach`; avoid `id: \.self` for mutable values and `.id(UUID())` which recreates views.
- `List` and `LazyVStack` are lazy; plain `VStack` in a `ScrollView` builds everything.
- Instruments "SwiftUI" template shows body evaluation counts and durations.

```swift
@Observable final class FeedModel {
  var items: [Item] = []
  var query = ""
  private(set) var visible: [Item] = []          // derived once, not in body
  func applyFilter() { visible = query.isEmpty ? items : items.filter { $0.title.localizedCaseInsensitiveContains(query) } }
}
```

## Measuring Jank

| Tool | Platform | Notes |
|---|---|---|
| JankStats (`androidx.metrics:metrics-performance`) | Android | Per-frame jank with UI state annotations in production |
| `FrameTimingMetric` in Macrobenchmark | Android | `frameDurationCpuMs`, `frameOverrunMs` percentiles in CI |
| Perfetto Expected/Actual Timeline | Android | Marks janky frames and the cause (app vs. SurfaceFlinger) |
| Instruments Animation Hitches, Hangs | iOS | Hitch time ratio, commit vs. render hitches |
| `XCTOSSignpostMetric.scrollDecelerationMetric` | iOS | Scroll hitch metrics in UI tests |
| MetricKit `MXAnimationMetric` (scroll hitch rate) | iOS | Field data |

```kotlin
val jankStats = JankStats.createAndTrack(window) { frame ->
  if (frame.isJank) Log.w("jank", "${frame.frameDurationUiNanos / 1_000_000} ms ${frame.states}")
}
PerformanceMetricsState.getHolderForHierarchy(view).state?.putState("screen", "feed")
```

## Common Fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Jank on first scroll after install | JIT / no Baseline Profile | Baseline Profile covering scroll |
| Jank when images appear | Main-thread decode or oversized bitmaps | Image library with downsampling |
| Jank on every scroll frame (Compose) | State read in composition | Lambda modifiers, `derivedStateOf` |
| Jank when list updates | Full `notifyDataSetChanged` / full reload | DiffUtil / diffable data source |
| Hitch on screen push | Heavy `onCreate`/`viewDidLoad` | Defer non-visible work, lazy subviews |

## Checklist
- [ ] Frame metrics measured in CI and in production
- [ ] Lists use stable keys, diffing and recycling
- [ ] No allocation-heavy work in bind/draw/body
- [ ] Compose state reads deferred to the latest phase
- [ ] Baseline Profile includes main scroll journeys
