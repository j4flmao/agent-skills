# Mobile Performance Bundle Optimization

## Overview

Bundle size directly impacts mobile app adoption. Large apps face cellular download warnings (iOS >100MB, Android >150MB over cellular), longer install times, and reduced conversion rates. Each megabyte of app size reduces install conversion by approximately 0.5-1%. This reference covers strategies for analyzing, reducing, and maintaining optimal app bundle size across iOS, Android, Flutter, React Native, and Ionic.

## Bundle Size Baseline

### Target Sizes

```yaml
ios_ipa:
  target: "<80MB (below cellular download threshold)"
  warning: ">100MB (cellular warning, users may abandon download)"
  critical: ">200MB (WiFi-only download, significant conversion loss)"

android_apk:
  target: "<30MB (Play Store recommended)"
  warning: ">60MB"
  critical: ">100MB"

android_aab:
  target: "<20MB (Play Delivery compresses per-device)"
  note: "AAB is 30-50% smaller than APK due to app bundling"

flutter_example:
  engine_core: "~5MB (minimal Flutter engine)"
  app_code: "~10MB (Dart code + assets)"
  total_target: "<50MB"

react_native:
  hermes_engine: "~3MB"
  js_bundle: "~2-8MB (varies greatly with dependencies)"
  total_target: "<60MB"
```

### Bundle Size Analysis

```bash
# iOS: Analyze IPA size
# After archiving, find the .ipa file
ls -lh ~/Library/Developer/Xcode/Archives/*.xcarchive/*.ipa

# Use the App Thinning report from Xcode Organizer
# Product > Archive > Distribute > App Thinning report shows per-device sizes

# Check asset catalog sizes
xcrun actool --print-contents Assets.xcassets

# Android: Analyze APK size
# After building
ls -lh app/build/outputs/apk/release/app-release.apk

# Use Android Studio APK Analyzer
# Build > Analyze APK

# Use bundletool for AAB analysis
bundletool get-size total --apks=app.aab

# Flutter: Analyze bundle size
flutter build apk --analyze-size
flutter build ios --analyze-size

# React Native: Analyze bundle
npx react-native-bundle-analyzer
```

## Asset Optimization

### Image Optimization

Image optimization provides the largest size reduction with the least engineering effort.

```yaml
image_format_selection:
  photographs:
    best: "WebP (lossy) — 25-35% smaller than JPEG at same quality"
    fallback: "JPEG quality 80-85"
    avoid: "PNG for photos (3-5x larger than JPEG)"
    next_gen: "AVIF — 50% smaller than JPEG, iOS 16+ and Android 12+"

  graphics_and_icons:
    best: "SVG — infinitely scalable, small file size"
    fallback: "PNG with lossy compression (pngquant)"
    avoid: "Large PNG sprites (use SVG sprite or inline SVG)"

  screenshots_and_placeholders:
    strategy: "Download from server at runtime, don't bundle"
    cache: "Disk cache with 30-day TTL"

compression_strategies:
  - name: "pngquant"
    description: "Lossy PNG compression (reduces 32-bit to 8-bit)"
    reduction: "60-80% size reduction"
    command: "pngquant --quality=65-80 --speed=1 --strip *.png"

  - name: "imagemin"
    description: "Build-time image optimization plugin"
    plugins: ["imagemin-mozjpeg", "imagemin-pngquant", "imagemin-webp", "imagemin-svgo"]
    integration: "Webpack/Vite plugin for automatic optimization"

  - name: "WebP conversion"
    description: "Convert images to WebP format at build time"
    command: "cwebp -q 80 input.png -o output.webp"
    reduction: "25-35% vs JPEG at same quality"

  - name: "SVG optimization"
    description: "Remove unnecessary SVG metadata"
    command: "svgo input.svg -o output.svg"
    reduction: "30-70% on typical SVGs"

image_resolution_management:
  rules:
    - "Max resolution: 2x display (3x generates unnecessary data)"
    - "Max dimension: 2048px on any side (rarely needed larger)"
    - "Use srcset for responsive images in PWA mode"
    - "Server-side resize: upload original, serve optimized versions"

  tooling:
    - "ImageOptim (macOS) — lossy compression batch tool"
    - "Squoosh (web) — browser-based image optimization"
    - "Sharp (Node.js) — programmatic image processing"
```

### Font Optimization

```yaml
variable_fonts:
  description: "Single font file containing all weight and style variants"
  vs_multiple: "One variable font (e.g., Inter-Variable.woff2 at ~200KB) vs 10 individual weight files (~50KB each = ~500KB)"
  browsers: "Supported on iOS 16+, Android 8+, and modern WebViews"
  usage: "font-weight: 400; font-weight: 700; all from one file"

  examples:
    - "Inter Variable: 200KB for entire weight spectrum"
    - "Roboto Flex: 300KB for all weights and widths"
    - "Source Sans Variable: 100KB for standard Latin set"

font_subsetting:
  description: "Remove unused glyphs from font files"
  tools: ["glyphhanger", "fonttools", "subfont (npm)"]
  strategy:
    - "Run glyphhanger against all HTML files to find used characters"
    - "Subset the font to only those characters"
    - "Store the subset for Latin+common symbols (typically <30KB)"

  savings: "Full Noto Sans (~500KB) → Latin subset (~30KB) = 94% reduction"

system_fonts:
  description: "Use built-in OS fonts instead of bundling custom fonts"
  ios: "-apple-system, San Francisco"
  android: "Roboto, Noto Sans"
  use_case: "UI text, labels, body copy (not branding-required text)"
  limitation: "Cannot guarantee exact rendering across platforms"

font_loading_strategy:
  - "Preload critical font with <link rel=preload>"
  - "Use font-display: swap to prevent invisible text"
  - "Defer non-critical fonts to after first paint"
  - "Consider using system fonts for UI and custom fonts only for branding"
```

### Resource Configuration

```xml
<!-- iOS: Configure asset catalog compression -->
<!-- In Build Settings, set: -->
<!-- Asset Catalog Compiler - Options > Compression = automatic -->

<!-- Remove unused asset catalog entries -->
<!-- Run script phase in Xcode: -->
xcrun actool --generate-asset-pack-manifest Assets.xcassets

<!-- Android: Configure resource shrinking -->
<!-- In app/build.gradle -->
android {
    buildTypes {
        release {
            shrinkResources true  // Remove unused resources
            resConfigs "en", "es", "fr"  // Keep only needed languages
        }
    }
}
```

## Dependency Optimization

### Dependency Audit

```bash
# Check dependency sizes
# iOS: Check Swift Package and CocoaPod sizes
du -sh ~/Library/Developer/Xcode/DerivedData/*/SourcePackages/

# Android: Check AAR sizes
find ~/.gradle/caches/ -name "*.aar" -exec du -sh {} \;

# Flutter: Analyze package dependencies
flutter pub deps -- --style=tree

# React Native: Check bundle composition
npx react-native-bundle-analyzer

# General: Check node_modules size
du -sh node_modules/
npx npm-check  # Check for unused dependencies
npx depcheck    # Find unused packages
```

### Dependency Reduction Strategy

```yaml
strategy_steps:
  - "Replace large libraries with smaller alternatives"
  - "Remove unused packages (depcheck identifies candidates)"
  - "Only import required submodules, not entire libraries"
  - "Use built-in browser/OS APIs instead of polyfill libraries"
  - "Extract utility functions instead of importing entire utility libraries"

  alternatives:
    moment (350KB gzipped):
      replace: "date-fns (10KB, tree-shakeable) or native Intl.DateTimeFormat"
      savings: "~340KB"

    lodash (70KB):
      replace: "lodash-es (tree-shakeable, import only needed functions)"
      or: "Native Array/String/Object methods (ES6+ covers most lodash use cases)"
      savings: "60-70KB"

    jQuery (90KB):
      replace: "Native DOM API, fetch instead of $.ajax"
      savings: "~90KB"

    axios (25KB):
      replace: "Native fetch (Node.js 18+, modern browsers)"
      savings: "~25KB"

    RxJS (120KB):
      replace: "Native async/await, EventTarget, or a smaller reactive library (zen-observable)"
      savings: "100-120KB"

    Font Awesome (150KB for CSS + fonts):
      replace: "Individual SVG icons, or react-icons (tree-shakeable)"
      savings: "120-150KB"

module_import_optimization:
  good:
    - "import { debounce } from 'lodash-es';"
    - "import { format } from 'date-fns';"
    - "import { Button } from '@mui/material';  // MUI supports tree-shaking"

  bad:
    - "import _ from 'lodash';  // Imports entire library"
    - "import moment from 'moment';  // Not tree-shakeable"
    - "import '@mui/material';  // Imports all components"
```

### Tree Shaking Configuration

```typescript
// Vite configuration for optimal tree-shaking
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        // Enable treeshaking
        rollupOptions: {
            treeshake: {
                moduleSideEffects: false,
                propertyReadSideEffects: false,
                tryCatchDeoptimization: false,
            },
        },
        // Ensure module purity for tree-shaking
        modulePreload: true,
    },
});
```

```javascript
// Webpack configuration
module.exports = {
    mode: 'production',
    optimization: {
        usedExports: true,  // Tree-shaking
        sideEffects: true,  // Remove side-effect-free modules
        minimize: true,
        minimizer: ['...', new CssMinimizerPlugin()],
    },
};
```

## Code Splitting

### Route-Level Splitting

```typescript
// React: Lazy load routes
import { lazy, Suspense, ComponentType } from 'react';
import { Route } from 'react-router-dom';

const loadRoute = (importFn: () => Promise<{ default: ComponentType }>) => {
    const Component = lazy(importFn);
    return (props: any) => (
        <Suspense fallback={<LoadingSkeleton />}>
            <Component {...props} />
        </Suspense>
    );
};

// Each route chunk loaded only when user navigates to that route
const Dashboard = loadRoute(() => import('./pages/Dashboard'));
const Settings = loadRoute(() => import('./pages/Settings'));
const Profile = loadRoute(() => import('./pages/Profile'));

// Angular: Lazy modules
const routes: Routes = [
    { path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
    { path: 'settings', loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule) },
];

// Vue: Dynamic imports
const routes = [
    { path: '/dashboard', component: () => import('./views/Dashboard.vue') },
    { path: '/settings', component: () => import('./views/Settings.vue') },
];
```

### Vendor Splitting

```typescript
// Vite: manualChunks for vendor splitting
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Core framework stays in one chunk (changes rarely, long-lived cache)
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],

                    // UI library in its own chunk
                    'vendor-ui': ['@mui/material', '@emotion/react', '@emotion/styled'],

                    // Utilities in another chunk
                    'vendor-utils': ['date-fns', 'lodash-es', 'axios'],
                },
            },
        },
    },
});
```

```javascript
// Webpack: splitChunks configuration
module.exports = {
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10,
                },
                common: {
                    minChunks: 2,
                    minSize: 50000,
                    reuseExistingChunk: true,
                },
            },
        },
    },
};
```

### Dynamic Imports for Heavy Libraries

```typescript
// Import heavy libraries only when needed
async function openImageEditor(imageUrl: string) {
    // The image editor library is imported only when user taps 'Edit'
    const { ImageEditor } = await import('heavy-image-editor-library');
    const editor = new ImageEditor(imageUrl);
    editor.show();
}

async function exportPDF(data: any) {
    // PDF library imported only on export
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    // ... generate PDF ...
    doc.save('export.pdf');
}
```

## Platform-Specific Optimization

### iOS App Thinning

```yaml
app_thinning_technologies:
  app_slicing:
    description: "App Store delivers only resources needed for target device"
    how: "Asset catalogs automatically sliced by device family, resolution, and GPU"
    action: "Use Asset Catalogs for all images, not loose files in bundle"

  bitcode:
    description: "Apple re-optimizes binary for target device architecture"
    status: "Deprecated in Xcode 14+, no longer required"
    action: "Disable Bitcode in Xcode 14+ (Build Settings > Enable Bitcode = No)"

  on_demand_resources:
    description: "Download assets after initial install (e.g., level 2+ in games)"
    use_case: "Large assets not needed at launch (tutorial, level 2+, rarely-used features)"
    tag_types: "Initial install tags, prefetch tags, download-only tags"
    api: "NSBundleResourceRequest"
    savings: "Can reduce initial download by 50-80% for content-heavy apps"

  optimized_asset_compression:
    description: "Xcode ARM command line tools produce smaller binaries"
    command: "xcrun --toolchain swift optimize"
    settings: "Optimization Level = Optimize for Size (-Os) in Release builds"

  remove_unused_architectures:
    description: "Strip unnecessary architecture slices from binaries"
    script: |
      # In Build Phases > Run Script
      if [ "$CONFIGURATION" = "Release" ]; then
          for lib in "$PODS_ROOT"/*/*.a; do
              lipo -remove x86_64 -remove i386 "$lib" -output "$lib" 2>/dev/null || true
          done
      fi
```

### Android APK Splitting

```groovy
// app/build.gradle — APK split by architecture
android {
    splits {
        abi {
            enable true
            reset()
            // Only keep architectures relevant to your user base
            include 'armeabi-v7a', 'arm64-v8a', 'x86_64'
            universalApk false  // Skip universal APK (contains all ABI)
        }
    }
}

// Result:
// app-armeabi-v7a-release.apk: ~25MB (covers most modern Android devices)
// app-arm64-v8a-release.apk: ~28MB (64-bit devices)
// app-x86_64-release.apk: ~30MB (emulators and Chromebooks)
// Without split: universal APK would be ~50MB
```

### Android App Bundle

```groovy
// Use Android App Bundle (AAB) instead of APK
// app/build.gradle
android {
    bundle {
        abi {
            enableSplit = true  // Deliver per-architecture
        }
        language {
            enableSplit = true  // Deliver per-language resources
        }
        density {
            enableSplit = true  // Deliver per-resolution resources
        }
    }
}

// Build command
./gradlew bundleRelease

// Result:
// Universal AAB: ~80MB
// User download from Play Store: ~20-35MB (per-device optimized)
```

### Flutter-Specific Optimization

```yaml
flutter_bundle_optimization:
  split_debug_info:
    description: "Separate debug symbols from the APK/IPA"
    command: "flutter build apk --split-debug-info=build/debug-info"
    savings: "~20-40MB APK size reduction"
    note: "Debug info needed for symbolicated crash reports — store separately"

  obfuscation:
    description: "Obfuscate Dart code to reduce size and protect IP"
    command: "flutter build apk --obfuscate --split-debug-info=build/debug-info"
    effect: "Also reduces Dart code size by 10-15%"

  deferred_components:
    description: "Load features on demand (Android only)"
    implementation: "deferred as keyword in Dart"
    command: "flutter build appbundle --deferred-components"
    savings: "Significant for feature-rich apps with optional features"

  native_assets:
    description: "Link native libraries directly instead of bundling"
    status: "Experimental in Flutter 3.x"

flutter_build_commands:
  android:
    - "flutter build apk --release --split-debug-info=build/debug-info --obfuscate"
    - "flutter build appbundle --release --split-debug-info=build/debug-info"

  ios:
    - "flutter build ios --release"
    - "flutter build ipa --release --split-debug-info=build/debug-info"

  web:
    - "flutter build web --release --web-renderer canvaskit"  # Only if CanvasKit needed
    - "flutter build web --release --web-renderer html"  # Smaller, less rendering capability
```

### React Native Specific Optimization

```yaml
react_native_bundle_optimization:
  hermes_engine:
    description: "Hermes is a JavaScript engine optimized for React Native"
    size: "~3MB vs JSC ~6MB"
    setup: "Enable in android/app/build.gradle and ios/Podfile"
    performance: "Faster startup, smaller bundle, less memory"

  android_app_bundle:
    command: "npx react-native build-android --mode=release --app-bundle"
    savings: "30-50% smaller download vs APK"

  bundle_command:
    description: "Generate the JS bundle for analysis"
    command: "npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output bundle.js"
    analysis: "cat bundle.js | wc -c (raw size), then gzip for transfer size"

  ram_bundles:
    description: "Incremental loading of JS modules"
    setup: "Enable in metro.config.js"
    benefit: "Faster initial load, but slightly larger total bundle"
    config: |
      // metro.config.js
      module.exports = {
        transformer: {
          getTransformOptions: async () => ({
            transform: { inlineRequires: true },
          }),
        },
      };
```

## Continuous Bundle Size Management

### CI Integration

```yaml
ci_checks:
  - name: "Bundle size check"
    run: |
      # Calculate current bundle size
      CURRENT_SIZE=$(ls -lh app-release.apk | awk '{print $5}')
      # Compare against baseline
      BASELINE_SIZE=$(cat .bundle-baseline.txt)
      if [ "$CURRENT_SIZE" > "$BASELINE_SIZE" * 1.05 ]; then
        echo "Bundle size increased by more than 5%"
        exit 1
      fi

  - name: "Dependency size audit"
    run: |
      depcheck > depcheck-report.txt
      echo "Review dependency report for unused packages"

  - name: "Asset optimization check"
    run: |
      # Check for unoptimized images
      find . -name "*.png" -exec identify -format "%f: %B bytes\n" {} \; | sort -t: -k2 -rn | head -10
      # Flag PNGs > 100KB that should be converted to WebP or compressed

budget_enforcement:
  - "Fail CI if app size exceeds budget"
  - "Post size delta as PR comment"
  - "Require team lead approval for size increases >5%"
  - "Include size budget in Definition of Done for every feature"
```

### Bundle Size Dashboard

```yaml
bundle_dashboard:
  metrics:
    - "APK/IPA download size per build"
    - "Breakdown by component (code, assets, resources, native libs)"
    - "Size trend over time (last 50 builds)"
    - "Largest assets in the bundle"
    - "Largest dependencies"

  visualization:
    - "Time series chart of build sizes"
    - "Pie chart of bundle composition"
    - "Bar chart comparing current size to budget"
    - "Table of dependency sizes (ranked largest to smallest)"

  alerting:
    - "Auto-comment on PR when bundle increases >2%"
    - "Slack notification when budget exceeded"
    - "Email digest for weekly size trends"
```

## Case Studies

### Case Study 1: Image Optimization

```yaml
before:
  - "All images as PNG, no compression"
  - "3x resolution images bundled (wasted on 1x devices)"
  - "App size: 120MB IPA"

after:
  - "All images converted to WebP (lossy, quality 80)"
  - "Max resolution 2x, removed 3x duplicates"
  - "Server-side image serving with responsive URLs"
  - "App size: 45MB IPA (62% reduction)"

  effort: "2 developer-days"
  tools: "cwebp conversion script, ImageOptim for legacy PNGs, server-side image pipeline"
```

### Case Study 2: Dependency Audit

```yaml
before:
  - "moment.js (350KB) — used for 3 date formatting calls"
  - "lodash (70KB) — using only `debounce` and `throttle`"
  - "axios (25KB) — 20 API calls that work fine with fetch"
  - "RxJS (120KB) — using only `fromEvent`"
  - "Total framework code: ~800KB gzipped"

after:
  - "Replaced moment with date-fns + native Intl (10KB)"
  - "Replaced lodash with lodash-es tree-shaken to 5KB"
  - "Replaced axios with native fetch"
  - "Replaced RxJS with native addEventListener + async/await"
  - "Total framework code: ~35KB gzipped (96% reduction)"

  effort: "3 developer-days"
  benefit: "Cold start reduced from 3.2s to 1.8s due to smaller JS bundle to parse"
```

### Case Study 3: Code Splitting

```yaml
before:
  - "Single monolithic JS bundle: 1.5MB gzipped"
  - "All 15 screens loaded on app launch"
  - "Cold start: 4.5s on mid-range device"

after:
  - "Route-level code splitting: each screen is a separate chunk"
  - "Initial bundle: 180KB (only login + home screen)"
  - "Other screens loaded on navigation"
  - "Cold start: 1.8s (60% reduction)"
  - "Total size (all chunks): 1.8MB (slightly larger due to chunk overhead)"

  effort: "1 developer-day"
  tradeoff: "Screen transitions may show loading skeleton on first visit to each screen"
```

## References

- Mobile Performance — Core performance optimization guide
- Mobile Performance Monitoring — Production performance monitoring
- Rendering Performance — Platform-specific rendering optimization
- Startup — Startup time optimization
- Network Performance — Network optimization for mobile apps
