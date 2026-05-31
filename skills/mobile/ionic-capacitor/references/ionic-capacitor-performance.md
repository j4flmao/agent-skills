# Ionic Capacitor Performance Optimization

## Overview

Ionic Capacitor apps run web code inside a native WebView. Performance optimization focuses on reducing WebView overhead, optimizing rendering, managing memory, minimizing bundle size, and improving startup time. This reference covers the full performance optimization spectrum for hybrid mobile apps.

## Performance Baseline

### Target Metrics

```yaml
performance_targets:
  startup:
    cold_start: "<2s to interactive on mid-range device"
    warm_start: "<800ms to splash screen hide"
    time_to_first_paint: "<500ms"

  rendering:
    frame_rate: "60fps consistent (no dropped frames during scrolling)"
    scroll_jank: "<3% frame drops in 60fps profile on mid-range device"
    animation_frame_rate: "60fps for Ionic transitions"

  memory:
    peak_heap: "<150MB on mid-range device"
    webview_process_memory: "<300MB total (app + WebView)"

  bundle:
    initial_js_bundle: "<500KB gzipped"
    total_app_size_ios: "<80MB IPA"
    total_app_size_android: "<30MB APK/AAB"

  network:
    api_latency_p95: "<300ms for first API call"
    image_load: "<800ms for first visible image"
```

### Profiling Tools

```yaml
ios_profiling:
  safari_web_inspector:
    use_case: "JS performance, network, console, memory heap"
    access: "Settings > Safari > Advanced > Web Inspector + Mac Safari Develop menu"
    features: ["Timeline", "Network tab", "Console", "Memory", "JavaScript profiling"]

  xcode_instruments:
    use_case: "Native performance (WebView process, GPU, energy)"
    templates: ["Time Profiler", "Energy Log", "Allocations", "Core Animation", "GPU Driver"]
    note: "Profile on device, not simulator — simulator performance is not representative"

  ios_simulator:
    limitation: "CPU and GPU performance differ significantly from real devices"
    use: "Navigation flow testing only, not performance measurement"

android_profiling:
  chrome_devtools:
    access: "chrome://inspect on desktop while device connected via USB"
    features: ["Performance", "Memory", "Network", "Coverage", "Lighthouse"]

  android_studio_profiler:
    use_case: "Native process profiling (CPU, memory, network, energy)"
    features: ["CPU profiler", "Memory profiler", "Network profiler", "Energy profiler"]

  perfetto:
    use_case: "System-level tracing with WebView process insight"
    features: ["Trace config", "SQL analysis", "Visual timeline"]
```

## WebView Optimization

### WebView Startup

The WebView initialization is the single largest contributor to cold start time.

```typescript
// capacitor.config.ts — optimize WebView configuration
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.example.app',
    appName: 'MyApp',
    webDir: 'www',

    // Remove server.url for production — loads from local filesystem
    server: {
        // Never set for production builds
        // url: process.env.NODE_ENV === 'development' ? 'http://localhost:8100' : undefined,
        cleartext: process.env.NODE_ENV === 'development',
    },

    ios: {
        // contentInset: 'always',  // Avoid if not needed — adds layout pass
        preferredContentMode: 'mobile',  // 'mobile' is faster than 'desktop'
        scrollEnabled: true,
    },

    android: {
        // Mixed content only if needed
        allowMixedContent: process.env.NODE_ENV === 'development',
        // WebView hardware acceleration
        initialFocus: true,
    },
};
```

### WebView Rendering Pipeline

```
HTML/CSS Parsing ──> Style Calculation ──> Layout ──> Paint ──> Composite ──> GPU
      │                   │                │                    │
   Minimize             Avoid             Avoid            Use transform
   DOM size             complex           layout             and opacity
   (treeshake           selectors         thrashing          for animations
    unused              (.c1.c2.c3         (batched
    components)         is slower          reads/writes)
                        than .c3)
```

### Critical Rendering Path

```html
<!-- In index.html: optimize first paint -->
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Critical CSS inline for first render -->
    <style>
        /* Only styles needed for above-the-fold content */
        body { margin: 0; font-family: -apple-system, sans-serif; }
        ion-app { display: flex; height: 100%; }
        /* Defer non-critical CSS */
    </style>
    <!-- Preload critical resources -->
    <link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" crossorigin>
    <!-- Defer non-critical CSS -->
    <link rel="preload" href="/build/vendor.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
</head>
<body>
    <ion-app>
        <!-- Inline skeleton for instant first paint -->
        <div id="skeleton">
            <ion-header><ion-toolbar></ion-toolbar></ion-header>
            <ion-content class="skeleton-content"></ion-content>
        </div>
    </ion-app>
    <script type="module" src="/build/app.js" defer></script>
</body>
</html>
```

## Bundle Size Optimization

### Analyze Bundle Composition

```bash
# Ionic React/Angular/Vue — analyze bundle with Vite/Webpack
# For Vite-based projects
npx vite-bundle-analyzer

# For webpack-based projects
npm install --save-dev webpack-bundle-analyzer
npx webpack-bundle-analyzer build/www/stats.json

# Check ionic bundle size
npx cap build ios && ls -lh ios/App/public/assets
```

### Tree Shaking Ionic Components

```typescript
// Import only the components you use — don't import the whole @ionic/core
// Bad: imports ALL ion- components
import '@ionic/core/css/core.css';

// Good: import only needed CSS
import '@ionic/core/css/ionic.bundle.css';

// For tree-shaking components, configure in vite.config.ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            treeshake: true,
        },
    },
});
```

### Code Splitting

```typescript
// React: lazy-load routes
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Route configuration splits by page
const routes = [
    { path: '/dashboard', component: DashboardPage },
    { path: '/settings', component: SettingsPage },
    { path: '/profile', component: ProfilePage },
];

// Angular: lazy-load modules
// app-routing.module.ts
const routes: Routes = [
    { path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
    { path: 'settings', loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule) },
];
```

### Remove Unused Dependencies

```bash
# Audit for unused packages
npx depcheck

# Remove unused packages
npm uninstall unused-package

# Check for duplicate packages
npx npm ls | grep "deduped"

# Remove duplicate packages
npm dedupe

# Check bundle for unexpected inclusions
npx source-map-explorer build/www/**/*.js
```

### Optimize Assets

```yaml
image_optimization:
  format:
    - "Use WebP for images (iOS 14+ and Android 5+ support it)"
    - "Fallback to JPEG/PNG for older devices"
    - "AVIF for next-gen compression (iOS 16+, Android 12+)"
  
  compression:
    - "JPEG: quality 80-85 for photos (60-75 for thumbnails)"
    - "PNG: lossy compression via pngquant or imagemin"
    - "WebP: quality 80-90"
  
  responsive:
    - "Serve images at 2x display resolution max (3x is wasted bytes)"
    - "Use srcset for multiple resolutions"
    - "Lazy-load below-the-fold images"

font_optimization:
  - "Use variable fonts (one file for all weights)"
  - "Subset fonts to only needed characters (Latin subset only)"
  - "Preload critical font with <link rel=preload>"
  - "Use system fonts where branding allows (-apple-system, San Francisco)"

icon_optimization:
  - "Use SVG icons instead of icon fonts (smaller, more crisp)"
  - "Ionic icons can be loaded individually instead of as a bundle"
  - "Remove unused icon SVGs from the build"
```

## Rendering Performance

### Virtual Scrolling

```html
<!-- Ionic Virtual Scroll (deprecated in Ionic 7+, use ion-virtual-scroll or custom) -->
<ion-content>
    <ion-virtual-scroll [items]="items" approxItemHeight="80px">
        <ion-item *virtualItem="let item">
            <ion-label>{{ item.name }}</ion-label>
        </ion-item>
    </ion-virtual-scroll>
</ion-content>
```

```typescript
// Custom virtual scroll for Ionic 7+ with React
import { useCallback, useRef } from 'react';
import { IonContent, IonList } from '@ionic/react';

function VirtualList({ items }: { items: Item[] }) {
    const contentRef = useRef<HTMLIonContentElement>(null);

    // Limit visible items to reduce DOM size
    const visibleItems = items.slice(0, 50);

    return (
        <IonContent ref={contentRef}>
            <IonList>
                {visibleItems.map((item) => (
                    <IonItem key={item.id}>
                        <IonLabel>{item.name}</IonLabel>
                    </IonItem>
                ))}
            </IonList>
        </IonContent>
    );
}
```

### CSS Performance

```css
/* Good: GPU-composited properties for animations */
.animated-element {
    will-change: transform, opacity;
    transition: transform 300ms ease, opacity 300ms ease;
}

/* Bad: layout-triggering properties */
.bad-animation {
    transition: top 300ms ease, left 300ms ease;
    /* top/left trigger layout — causes repaints */
}

/* Use transform instead of top/left */
/* transform: translateX(100px) is GPU-composited; left: 100px triggers layout */

/* Good: contain for isolated subtrees */
.isolated-component {
    contain: content;
    /* Limits style/layout/paint recalculation to this subtree */
}

/* Avoid: expensive selectors */
.content .wrapper .card .title span { /* Too specific — recalc on every change */ }
.card-title { /* Prefer class-based selectors */ }
```

### Ionic Component Performance

```html
<!-- Set hydrated属性 to prevent flash of unstyled content -->
<ion-app class="hydrated"></ion-app>

<!-- Use ion-img for lazy-loaded images -->
<ion-img src="/assets/photo.jpg" alt="Photo"></ion-img>
<!-- ion-img uses IntersectionObserver for lazy loading -->

<!-- Use ion-thumbnail for consistent list item sizing -->
<ion-item>
    <ion-thumbnail slot="start">
        <ion-img src="/assets/thumb.jpg"></ion-img>
    </ion-thumbnail>
    <ion-label>Item with thumbnail</ion-label>
</ion-item>

<!-- Avoid unnecessary ion-content wrappers -->
<!-- One ion-content per view is sufficient; nested ion-content causes double scroll -->
```

## Startup Time Optimization

### Lazy Initialization

```typescript
// app.ts — defer non-critical initialization
import { Component } from '@angular/core';
import { App } from '@capacitor/app';

@Component({
    selector: 'app-root',
    template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>',
})
export class AppComponent {
    constructor() {
        this.initCore();
        // Defer heavy plugins to after first render
        setTimeout(() => this.initDeferred(), 1000);
    }

    private initCore(): void {
        // Only essential initialization
    }

    private async initDeferred(): Promise<void> {
        // Push notifications (requires network call to register)
        const { PushNotifications } = await import('@capacitor/push-notifications');
        await PushNotifications.register();

        // Geolocation (requires permission prompt)
        const { Geolocation } = await import('@capacitor/geolocation');

        // Analytics (may fire network request)
        this.initAnalytics();
    }
}
```

### Splash Screen Optimization

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
    plugins: {
        SplashScreen: {
            launchShowDuration: 0,  // Don't auto-hide — control from app code
            launchAutoHide: false,
            backgroundColor: '#ffffff',
            androidScaleType: 'CENTER_CROP',
            showSpinner: false,  // Disable spinner for cleaner startup
            splashFullScreen: true,
            splashImmersive: true,
        },
    },
};
```

```typescript
// In app code — hide splash after critical content is ready
import { SplashScreen } from '@capacitor/splash-screen';

async function initializeApp() {
    // Wait for root component mount
    await customElements.whenDefined('ion-app');

    // Preload critical data
    await preloadInitialData();

    // Now hide splash screen
    await SplashScreen.hide();
}
```

### Preloading and Caching

```typescript
// Preload next likely screen for instant navigation
class PreloadManager {
    private preloadedRoutes: Map<string, Promise<any>> = new Map();

    preloadRoute(route: string): void {
        if (this.preloadedRoutes.has(route)) return;

        const importPromise = this.importRoute(route);
        this.preloadedRoutes.set(route, importPromise);
    }

    async getRoute(route: string): Promise<any> {
        const existing = this.preloadedRoutes.get(route);
        if (existing) {
            this.preloadedRoutes.delete(route);
            return existing;
        }
        return this.importRoute(route);
    }

    private async importRoute(route: string): Promise<any> {
        switch (route) {
            case '/dashboard':
                return import('./pages/DashboardPage');
            case '/settings':
                return import('./pages/SettingsPage');
            default:
                throw new Error(`Unknown route: ${route}`);
        }
    }
}

// Preload after current screen is stable
// After login, preload dashboard while user reads welcome message
setTimeout(() => preloadManager.preloadRoute('/dashboard'), 500);
```

## Memory Management

### Memory Monitoring

```typescript
// Monitor WebView memory usage
function getMemoryUsage(): number | null {
    if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
    }
    return null;  // Not available on all platforms
}

// Periodic memory check during development
setInterval(() => {
    const memory = getMemoryUsage();
    if (memory && memory > 150 * 1024 * 1024) {
        console.warn(`High memory usage: ${(memory / 1024 / 1024).toFixed(1)}MB`);
    }
}, 30000);
```

### Memory Leak Prevention

```typescript
// React: cleanup event listeners and subscriptions
import { useEffect } from 'react';
import { App } from '@capacitor/app';

function useAppState() {
    useEffect(() => {
        const handler = App.addListener('appStateChange', ({ isActive }) => {
            console.log('App state:', isActive ? 'active' : 'background');
        });

        // Clean up on unmount — required to prevent memory leaks
        return () => {
            handler.remove();
        };
    }, []);
}

// Angular: cleanup on destroy
import { Component, OnDestroy } from '@angular/core';
import { App } from '@capacitor/app';
import { Subscription } from 'rxjs';

@Component({
    template: '<ion-content>...</ion-content>',
})
export class SettingsPage implements OnDestroy {
    private subscriptions: Subscription[] = [];

    ionViewDidEnter() {
        const handler = App.addListener('appStateChange', () => {});
        this.subscriptions.push(handler as any);
    }

    ngOnDestroy() {
        // Clean up all listeners
        this.subscriptions.forEach(s => s.unsubscribe());
    }
}
```

### Image Memory Management

```typescript
// Use ion-img for automatic memory management
// ion-img uses IntersectionObserver and manages in-memory cache

// For custom image handling, implement cache limits
class ImageCache {
    private cache = new Map<string, string>();
    private maxSize = 50;  // Max cached images
    private maxAge = 300000;  // 5 minutes

    set(url: string, dataUrl: string): void {
        // Evict oldest if over limit
        if (this.cache.size >= this.maxSize) {
            const oldest = this.cache.keys().next().value;
            this.cache.delete(oldest!);
        }
        this.cache.set(url, dataUrl);
        setTimeout(() => this.cache.delete(url), this.maxAge);
    }

    get(url: string): string | undefined {
        return this.cache.get(url);
    }

    clear(): void {
        this.cache.clear();
    }
}
```

## Network Performance

### HTTP Client Optimization

```typescript
// Use @capacitor/http instead of fetch for better cookie handling
import { Http } from '@capacitor-community/http';

// Configure connection pooling
const API_BASE = 'https://api.example.com';

async function apiGet(path: string) {
    const response = await Http.get({
        url: `${API_BASE}${path}`,
        headers: { 'Content-Type': 'application/json' },
        // Connection reuse is automatic in Capacitor HTTP
    });
    return response.data;
}
```

### Caching Strategy

```typescript
// Service worker for PWA caching
// sw.js
const CACHE_NAME = 'api-cache-v1';
const API_CACHE_URLS = ['/api/products', '/api/categories'];

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Return cached response immediately, then update
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                        return networkResponse;
                    });
                    return response || fetchPromise;
                })
        );
    }
});
```

### Image Loading Strategy

```typescript
// Preload critical images, lazy-load the rest
const criticalImages = ['logo.png', 'hero-banner.jpg'];
const lazyImages = ['product-1.jpg', 'product-2.jpg', 'profile-photo.jpg'];

// Preload critical images
criticalImages.forEach((src) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = `/assets/${src}`;
    document.head.appendChild(link);
});

// Lazy load non-critical images
// Ionic's <ion-img> handles this automatically via IntersectionObserver
```

## Build Optimization

### Production Build Configuration

```bash
# Ionic production build with optimizations
ionic build --prod

# For Angular: --prod enables AOT compilation and tree-shaking
# For React: Vite handles tree-shaking and code splitting automatically

# Generate platform-specific builds
ionic cap build ios --release
ionic cap build android --release
```

```typescript
// vite.config.ts — build optimization
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Split vendor chunks for better caching
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    ionic: ['@ionic/core', '@ionic/react'],
                },
            },
        },
        minify: 'terser',  // Better minification than esbuild
        sourcemap: false,   // Disable for production
        target: 'es2015',   // Broad browser support
        cssCodeSplit: true,  // Extract CSS per chunk
    },
});
```

### Android-Specific Optimization

```groovy
// app/build.gradle — Android-specific optimizations
android {
    buildTypes {
        release {
            minifyEnabled true  // Enable R8/ProGuard
            shrinkResources true  // Remove unused resources
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'

            // Split APK by architecture for smaller downloads
            splits {
                abi {
                    enable true
                    reset()
                    include 'armeabi-v7a', 'arm64-v8a', 'x86_64'
                    universalApk false
                }
            }
        }
    }

    // Optimize build speed
    buildFeatures {
        buildConfig = false  // Disable if not using BuildConfig
        aidl = false
        renderScript = false
        shaders = false
    }
}
```

### iOS-Specific Optimization

```xml
<!-- Info.plist — iOS optimizations -->
<key>UIStatusBarHidden</key>
<false/>
<key>UIViewControllerBasedStatusBarAppearance</key>
<true/>
<key>LSRequiresIPhoneOS</key>
<true/>
<!-- Optimize WebView configuration -->
<key>WKWebViewConfiguration</key>
<dict>
    <key>allowsInlineMediaPlayback</key>
    <true/>
    <key>mediaTypesRequiringUserActionForPlayback</key>
    <array/>
</dict>
```

## Runtime Performance Monitoring

### Performance Metrics Collection

```typescript
class PerformanceMonitor {
    private marks: Map<string, number> = new Map();

    mark(name: string): void {
        this.marks.set(name, performance.now());
    }

    measure(name: string, startMark: string, endMark: string): number | null {
        const start = this.marks.get(startMark);
        const end = this.marks.get(endMark);
        if (start && end) {
            const duration = end - start;
            console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
            return duration;
        }
        return null;
    }

    // Report to analytics
    reportToAnalytics(metrics: Record<string, number>): void {
        if (typeof window !== 'undefined' && (window as any).AnalyticsService) {
            (window as any).AnalyticsService.track({
                name: 'perf_custom_metric',
                properties: metrics,
            });
        }
    }
}

// Usage
const perf = new PerformanceMonitor();
perf.mark('navigation_start');
// ... navigate ...
perf.mark('screen_ready');
const loadTime = perf.measure('Dashboard load', 'navigation_start', 'screen_ready');
```

### Frame Rate Monitoring

```typescript
class FPSMonitor {
    private frames: number[] = [];
    private lastFrameTime = performance.now();
    private running = false;

    start(): void {
        this.running = true;
        this.lastFrameTime = performance.now();
        this.tick();
    }

    stop(): void {
        this.running = false;
    }

    private tick = (): void => {
        if (!this.running) return;

        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;
        this.frames.push(delta);

        // Keep last 60 frames
        if (this.frames.length > 60) {
            this.frames.shift();
        }

        requestAnimationFrame(this.tick);
    };

    getFPS(): number {
        if (this.frames.length === 0) return 0;
        const avgDelta = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        return 1000 / avgDelta;
    }

    hasJank(): boolean {
        // A frame taking >50ms indicates jank (<20fps)
        return this.frames.some(delta => delta > 50);
    }
}
```

## Device-Specific Considerations

```yaml
low_end_devices:
  android:
    - "Android Go devices (1-2GB RAM): reduce image cache to 20MB, disable animations"
    - "Reduce DOM size: limit visible list items to 20, not 50"
    - "Disable parallax and heavy CSS effects"
    - "Monitor with performance.memory — heap should stay under 100MB"

  ios:
    - "iPhone SE / 6s / 7: limit to 30fps animations for smoothness"
    - "Reduce concurrent network requests to 2"
    - "Smaller image cache (30MB max)"
    - "Disable background fetch for better battery"

high_end_devices:
  - "iPhone Pro models: enable 120fps ProMotion animations"
  - "High-end Android: enable full visual effects, large image caches"
  - "Adaptive quality: detect device tier and adjust rendering quality"
```

## Testing Performance

### Performance Regression Tests

```typescript
// Playwright / Detox performance test
describe('Performance Regression', () => {
    it('should load dashboard within 2 seconds', async () => {
        const start = Date.now();
        await element(by.id('dashboard-tab')).tap();
        await expect(element(by.id('dashboard-content'))).toBeVisible();
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(2000);
    });

    it('should scroll list at 60fps', async () => {
        // Scroll through 100 items
        await element(by.id('item-list')).scroll(5000, 'down');
        await element(by.id('item-list')).scroll(5000, 'up');

        // Check frame drop metric from device logs
        const logs = await device.getLogs('syslog');
        const jankEntries = logs.filter(log => log.message.includes('frame_drop'));
        expect(jankEntries.length).toBeLessThan(5);
    });
});
```

### Lighthouse CI for PWA Mode

```bash
# Audit PWA performance
npx lhci autorun --collect.preset=desktop --collect.url=http://localhost:8100
npx lhci autorun --collect.preset=desktop --collect.url=http://localhost:8100/dashboard

# Set budgets
npx lhci assert --config=lighthouserc.js
```

```javascript
// lighthouserc.js
module.exports = {
    ci: {
        collect: {
            startServerCommand: 'ionic serve --no-open',
            url: ['http://localhost:8100', 'http://localhost:8100/dashboard'],
            numberOfRuns: 3,
        },
        assert: {
            assertions: {
                'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
                'interactive': ['error', { maxNumericValue: 5000 }],
                'total-blocking-time': ['error', { maxNumericValue: 300 }],
                'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
                'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
            },
        },
        upload: {
            target: 'filesystem',
            outputDir: './lhci-reports',
        },
    },
};
```

## References

- Ionic CLI Reference — Build and serve commands
- Ionic Deployment — App store deployment
- Capacitor Plugins Reference — Plugin configuration
- Mobile Performance — Cross-platform performance fundamentals
- Mobile Performance Monitoring — Production monitoring setup
