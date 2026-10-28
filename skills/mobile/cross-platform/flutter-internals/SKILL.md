---
name: flutter-internals
description: >
  Use this skill when the user says 'Flutter internals', 'widget element render object', 'three trees', 'BuildContext', 'RenderObject', 'layout constraints', 'constraints go down sizes go up', 'Impeller', 'Skia', 'raster thread', 'layer tree', 'Flutter engine', 'embedder', 'platform views', 'custom RenderBox'. Explains how Flutter works under the hood — widget/element/render-object trees, the build-layout-paint-composite pipeline, the constraint model, engine threads, Impeller vs Skia, platform channels and platform views — and uses that to diagnose layout errors and performance problems. Do NOT use for: app architecture and state management (use flutter-expertise), Dart language features (use lang-dart), React Native (use react-native-architecture).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [mobile, flutter, rendering, impeller, internals]
---

# Flutter Internals

## Purpose
Flutter draws every pixel itself instead of wrapping OEM widgets. Understanding the three trees, the constraint-based layout protocol and the threads that produce a frame explains most "RenderFlex overflowed", "unbounded height" and jank problems, and tells you when a custom `RenderObject` is the right tool.

## Agent Protocol

### Trigger
"Flutter internals", "widget element render object", "BuildContext", "RenderObject", "layout constraints", "Impeller", "Skia", "raster thread", "layer tree", "Flutter engine", "platform views", "custom RenderBox".

### Input Context
- Flutter version and platform; renderer in use (Impeller/Skia)
- Error message or DevTools timeline (UI vs raster thread times)
- Widget subtree involved

### Output Artifact
Explanation tied to the pipeline stage, plus the code fix or a custom render object. No file unless requested.

### Response Format
```
Stage: {build | layout | paint | composite/raster | platform}
Cause: {mechanism}
Evidence: {error text / timeline numbers}
Fix: {code}
```

## 1. The Three Trees
| Tree | Object | Lifetime | Role |
|------|--------|----------|------|
| Widget | immutable configuration (`StatelessWidget`, `StatefulWidget`, `RenderObjectWidget`) | rebuilt often, cheap | describes UI |
| Element | `ComponentElement`, `RenderObjectElement` | long-lived | the instantiated tree; holds `State`, links widgets to render objects; `BuildContext` *is* the element |
| RenderObject | `RenderBox`, `RenderSliver` | long-lived | layout, painting, hit testing |

- On rebuild, an element compares the new widget with the old: same `runtimeType` and `key` → update in place (`canUpdate`); otherwise the subtree is unmounted and recreated (state lost).
- Keys preserve identity when children reorder (`ValueKey`), or move subtrees across the tree (`GlobalKey` — expensive, use sparingly).
- `InheritedWidget` (and everything built on it: `Theme.of`, `MediaQuery.of`, Provider, Riverpod's scope) registers dependents so only they rebuild. Use specific accessors like `MediaQuery.sizeOf(context)` to depend on one aspect.

## 2. The Frame Pipeline
```
vsync → animate (tickers) → build (dirty elements) → layout → compositing bits → paint → semantics
     → layer tree submitted → raster thread rasterises with Impeller/Skia → GPU → display
```
- UI thread (Dart root isolate) runs build/layout/paint and produces a layer tree; the raster thread turns it into GPU commands. At 60 Hz each has ~16 ms (8 ms at 120 Hz).
- DevTools: if the UI bar is high → expensive build/layout/Dart code; if raster is high → expensive layers (saveLayer, clips, shaders, big images).

## 3. Layout Protocol
"Constraints go down, sizes go up, parent sets position":
- Parent passes `BoxConstraints(minW, maxW, minH, maxH)`; child picks a size within them; parent positions the child (child does not know its position).
- Common errors:
  - *Unbounded height* — a `ListView` inside a `Column`: the column gives infinite max height. Fix: `Expanded`/`Flexible` around the list, or a fixed-height `SizedBox`.
  - *RenderFlex overflowed* — children's intrinsic sizes exceed the main axis; use `Expanded`, `Flexible`, `Wrap`, or scrolling.
  - Intrinsic sizing (`IntrinsicHeight`, `IntrinsicWidth`) runs extra layout passes — can be O(n²) in deep trees; avoid in lists.
- Relayout boundaries (a render object whose size depends only on its constraints) stop layout invalidation from propagating upward.

## 4. Painting and Compositing
- Render objects paint into layers; `RepaintBoundary` creates a separate layer so a frequently changing subtree repaints alone (and the rest is cached). Too many boundaries cost memory and compositing time.
- `saveLayer`-triggering operations (opacity on groups, some `ShaderMask`/`ColorFilter`/clip combinations) allocate offscreen buffers; prefer per-primitive alpha and `FadeTransition`.
- Text layout and image decoding are expensive; image decode happens off the UI thread but large images still cost raster/memory — decode at display size (`cacheWidth`).

## 5. Engine and Renderer
- The engine (C++) hosts the Dart VM, text layout, the renderer and platform embedders (Android, iOS, web, Windows, macOS, Linux).
- **Impeller** precompiles a small fixed set of shaders at build time, removing the runtime shader-compilation jank that Skia had. It is the default on iOS and on modern Android devices (Vulkan, with an OpenGL ES backend where needed); Flutter has been removing the Skia path on Android over recent releases — check the Impeller documentation for your version's fallback rules. Web uses CanvasKit/Skwasm (WebAssembly) builds.
- Threads: platform (main) thread, UI thread, raster thread, I/O thread (per engine instance).

## 6. Platform Integration
- Platform channels: asynchronous binary messages between Dart and the host (`MethodChannel`, `BasicMessageChannel`, `EventChannel`), encoded by `StandardMessageCodec`; handlers run on the platform thread by default — offload slow native work to background threads/task queues.
- `dart:ffi` calls C synchronously on the calling Dart thread — fastest path for native libraries.
- Platform views embed native views (maps, web views, ads). They are expensive (extra composition; Android modes Hybrid Composition / Texture Layer have different trade-offs) — limit their number and avoid them inside scrolling lists where possible.

## 7. Custom Render Objects
Write a `RenderBox` when composition of existing widgets cannot express the layout efficiently (e.g. a custom chart or flow layout):
```dart
class RenderSquare extends RenderBox {
  RenderSquare(this._color);
  Color _color;
  set color(Color c) { if (c == _color) return; _color = c; markNeedsPaint(); }

  @override
  void performLayout() {
    final side = constraints.constrainDimensions(double.infinity, double.infinity).shortestSide;
    size = constraints.constrain(Size.square(side.isFinite ? side : 100));
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    context.canvas.drawRect(offset & size, Paint()..color = _color);
  }
}

class Square extends LeafRenderObjectWidget {
  const Square({super.key, required this.color});
  final Color color;
  @override
  RenderSquare createRenderObject(BuildContext context) => RenderSquare(color);
  @override
  void updateRenderObject(BuildContext context, RenderSquare r) => r.color = color;
}
```
Call `markNeedsLayout()` when layout inputs change and `markNeedsPaint()` when only appearance changes.

## 8. Anti-Patterns
- Creating widgets with new `GlobalKey`s every build (state reset, expensive reparenting).
- Using `MediaQuery.of(context)` deep in lists (rebuild on every inset/keyboard change) instead of `sizeOf`/`paddingOf`.
- Intrinsic widgets inside long lists.
- Debugging performance in debug mode (JIT, assertions) instead of profile mode.

## 9. Checklist
- [ ] Identify the pipeline stage (UI vs raster) before optimising
- [ ] Layout errors traced to the constraint that was unbounded or too tight
- [ ] Keys used deliberately for reorderable/stateful children
- [ ] `saveLayer` and platform views minimised in animated/scrolling content
- [ ] Custom render objects only where composition is insufficient, with correct invalidation
