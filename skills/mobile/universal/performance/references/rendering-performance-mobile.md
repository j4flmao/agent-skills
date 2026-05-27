# Mobile Rendering Performance

## Overview

Rendering performance directly impacts user perception of app quality. Jank, dropped frames, and slow list scrolling are among the most common user complaints. This guide covers rendering pipelines, frame budgeting, list virtualization, image optimization, and platform-specific rendering optimization techniques.

## Rendering Pipeline

```yaml
rendering_pipeline:
  stages:
    input: "Touch/gesture events processed"
    animation: "Animation frames calculated"
    layout: "Measure and position elements"
    paint: "Draw pixels to buffer"
    composite: "Combine layers into final frame"
    
  60fps_budget:
    total: "16.67ms per frame"
    breakdown:
      input: "1-2ms"
      animation: "1-2ms"
      layout: "4-6ms"
      paint: "4-6ms"
      composite: "1-2ms"
    buffer: "2-3ms headroom"
    
  120fps_budget:
    total: "8.33ms per frame"
    breakdown:
      input: "0.5-1ms"
      animation: "0.5-1ms"
      layout: "2-3ms"
      paint: "2-3ms"
      composite: "0.5-1ms"
```

## List Virtualization

```yaml
list_virtualization:
  principles:
    - "Render only visible items + a few off-screen buffer items"
    - "Reuse cell/item views — avoid creating new ones on scroll"
    - "Compute layout only for visible items — not the entire data set"
    - "Offload heavy computation to background threads"
    
  platform_implementations:
    ios:
      component: "UITableView or UICollectionView"
      reuse: "dequeueReusableCell(withIdentifier:for:) — cell reuse identifier"
      prefetch: "UITableViewDataSourcePrefetching — load data before cell becomes visible"
      estimated_heights: "Use estimatedRowHeight for auto-layout — avoid measuring all cells upfront"
    android:
      component: "RecyclerView or LazyColumn (Compose)"
      reuse: "ViewHolder pattern — onBindViewHolder reuses existing views"
      prefetch: "RecyclerView prefetch by default (since support library 25)"
      diff_util: "ListAdapter with AsyncListDiffer — compute minimal diff set"
    flutter:
      component: "ListView.builder or GridView.builder"
      lazy: "Builder constructors only build visible items"
      item_extent: "Provide fixed itemExtent for optimal scroll performance"
    react_native:
      component: "FlatList or SectionList"
      props: "windowSize, maxToRenderPerBatch, initialNumToRender, removeClippedSubviews"
      getItemLayout: "Provide fixed height for O(1) scroll-to-index"
      
  virtualization_anti_patterns:
    - "Wrapping large child lists in ScrollView — renders all children"
    - "Using ListView(children: []) instead of ListView.builder"
    - "No key prop on list items — triggers full re-render"
    - "Expensive operation in renderItem / itemBuilder"
```

## Image Loading Optimization

```yaml
image_optimization:
  loading_pipeline:
    step_1_resize: "Downsample to display size — never load 4000×3000 image into 200×150 ImageView"
    step_2_cache: "Memory cache (L1) + Disk cache (L2) — avoid network on every display"
    step_3_decode: "Decode in background thread — never block UI thread"
    step_4_display: "Crossfade or progressive loading for perceived performance"
    
  image_libraries:
    ios:
      recommended: "Kingfisher, SDWebImage, Nuke"
      system: "URLSession + custom cache with URLCache"
    android:
      recommended: "Coil (Kotlin-first), Glide (stable, feature-rich), Fresco (complex UIs)"
      compose: "Coil's AsyncImage — built-in Compose support"
    flutter:
      recommended: "cached_network_image, extended_image"
      native: "Image.network with cacheWidth/cacheHeight for downsampling"
    react_native:
      recommended: "FastImage (performance), react-native-image-progress"
      built_in: "Image component with resizeMethod='resize' or 'scale'"
      
  optimization_techniques:
    downsampling: "Decode image at display size — inSampleSize (Android), ImageIO (iOS)"
    webp_avif: "Use WebP (Android, web) or AVIF (iOS 16+, Android 12+) for 25-35% smaller files"
    progressive_jpeg: "Show blurry preview while loading — improves perceived performance"
    preloading: "Preload next N images when scrolling through a list"
    lru_cache: "100-200 items memory cache, 200-500MB disk cache"
    placeholder: "Show blurred thumbnail or color placeholder while loading"
```

## Platform-Specific Rendering

```yaml
platform_rendering:
  ios:
    layer_backing: "Use shouldRasterize for static layers — creates bitmap, avoids re-render"
    opacity: "Avoid setting opacity on views — causes offscreen rendering pass"
    corner_radius: "Use cornerCurve + maskToBounds sparingly — triggers offscreen render"
    shadow_path: "Provide explicit shadowPath — avoids calculating shadow shape"
    color_blended_layers: "Simulator → Debug → Color Blended Layers — identify red (blended) regions"
    misaligned_images: "Simulator → Debug → Color Misaligned Images — identify pixel-alignment issues"
    
  android:
    overdraw: "Debug GPU Overdraw — identify regions drawn multiple times (red = bad)"
    hardware_layers: "Use setLayerType(LAYER_TYPE_HARDWARE) for complex views that don't change often"
    clip_rect: "Avoid clipRect/clipPath on frequently redrawn views"
    alpha: "Avoid setAlpha on ViewGroups — causes children to render to offscreen buffer"
    nested_scrolling: "Avoid nesting multiple scrollable containers — use NestedScrollView carefully"
    
  flutter:
    repaint_boundary: "Wrap complex widgets in RepaintBoundary — isolates repaint region"
    const_widgets: "Use const constructors — widgets with const can be reused without rebuild"
    avoid_opacity: "Use animatedOpacity or specific layer effects instead of Opacity widget"
    clip: "Avoid ClipPath — use simpler ClipRRect or ClipRect"
    layout_builder: "LayoutBuilder rebuilds on every layout change — use sparingly"
    
  react_native:
    native_driver: "Use useNativeDriver: true for animations — runs on UI thread"
    remove_clipped: "removeClippedSubviews on ScrollView — unmounts off-screen views"
    interaction_manager: "runAfterInteractions — defer non-critical work until after animations"
    hermes: "Use Hermes engine — faster startup, smaller bundle, less jank"
```

## Frame Rate Monitoring

```yaml
frame_rate_monitoring:
  development:
    ios:
      - "Xcode Diagnostics → GPU Frame Capture"
      - "Instruments → Core Animation (FPS, off-screen renders)"
      - "CADisplayLink for custom FPS monitor"
    android:
      - "Profile GPU Rendering (Developer Options)"
      - "Android Studio → Profiler → GPU"
      - "FrameMetricsAggregator for custom instrumentation"
    flutter:
      - "Flutter DevTools → Performance tab"
      - "Flutter Performance Overlay (showPerformanceOverlay)"
    react_native:
      - "Flipper → Performance plugin"
      - "react-native-performance-logger"
      - "react-native-fps (custom FPS display)"
      
  production:
    tools: ["Firebase Performance Monitoring", "Datadog RUM", "Sentry Performance", "New Relic Mobile"]
    metrics:
      - "FPS (frames per second) — average and 5th percentile"
      - "Slow frames (<60fps) — percentage of total frames"
      - "Frozen frames (<30fps) — percentage of total frames"
      - "ANR rate (Android: Application Not Responding)"
      - "Scroll jank — per-scroll-session smoothness score"
    thresholds:
      excellent: "<1% slow frames"
      acceptable: "<5% slow frames"
      poor: ">5% slow frames or any frozen frames"
```
