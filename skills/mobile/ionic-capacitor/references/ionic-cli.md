# Ionic CLI Reference

## Project Creation Commands

```bash
# Create a new Ionic app
ionic start myApp blank --type=react-ts     # React + TypeScript
ionic start myApp tabs --type=angular       # Angular with tabs layout
ionic start myApp sidemenu --type=vue       # Vue with sidemenu layout

# Available starter templates: blank, tabs, sidemenu, list, my-first-app
# Available types: react, angular, vue, custom
ionic start --list                          # List all templates
```

## Development Commands

```bash
# Web-only development with HMR
ionic serve                        # Opens browser at localhost:8100
ionic serve --host 0.0.0.0         # Expose on network
ionic serve --port 3000            # Custom port

# Live reload on device/emulator
ionic cap run ios -l --external    # iOS with live reload, external host
ionic cap run android -l --external  # Android with live reload

# Liver reload details:
# - Updates capacitor.config.ts with server.url pointing to dev machine IP
# - Device loads web assets from dev server over network
# - HMR preserves component state during development
# - Disable server.url for production builds
# - Requires device on same network as dev machine
```

## Build Commands

```bash
# Production build
ionic build --prod                 # Optimized web build to www/
ionic build --prod --source-map    # Include source maps for debugging
ionic build --engine               # Build for specific engine

# Environment builds
ionic build --configuration=staging  # Angular: use environment.staging.ts
ionic build --configuration=production

# Common build flags:
# --watch    Watch for changes and rebuild
# --verbose  Verbose output for debugging build issues
```

## Capacitor Platform Commands

```bash
# Add native platform
npx cap add ios                    # Creates ios/ directory with Xcode project
npx cap add android                # Creates android/ directory

# Copy web assets to native projects
npx cap copy                       # Copies www/ to native projects
npx cap copy ios                   # iOS only
npx cap copy android               # Android only

# Sync native project (copy + install native dependencies)
npx cap sync                       # Runs copy + pod install (iOS) / gradle sync (Android)
npx cap sync ios                   # iOS pods only
npx cap sync android               # Android only

# Open native IDE
npx cap open ios                   # Opens Xcode workspace
npx cap open android               # Opens Android Studio project

# Run on device/emulator
npx cap run ios                    # Build and run on iOS device/simulator
npx cap run android                # Build and run on Android device/emulator
```

## Plugin Management

```bash
# Install official plugins
npm install @capacitor/camera
npm install @capacitor/geolocation
npm install @capacitor/push-notifications
npm install @capacitor/filesystem
npm install @capacitor/storage
npm install @capacitor/share
npm install @capacitor/device
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/haptics
npm install @capacitor/keyboard

# After every plugin install:
npx cap sync                       # Critical — installs pods/gradle deps

# Third-party plugins
npm install capacitor-plugin-name  # Community/enterprise plugins
npm install @awesome-cordova-plugins/plugin-name  # Cordova plugin compat

# List installed plugins
npx cap ls                         # Shows plugins and their status per platform
```

## capacitor.config.ts Reference

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'MyApp',
  webDir: 'www',
  bundledWebRuntime: false,       // Don't bundle Capacitor runtime
  server: {
    url: undefined,                // Set for live reload, undefined for prod
    cleartext: false,              // Allow HTTP (dev only)
    androidScheme: 'https',        // Android WebView scheme
    iosScheme: 'capacitor',        // iOS WebView scheme
    allowNavigation: [],           // Allowed external URLs in WebView
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'always',        // Safe area handling
    preferredContentMode: 'mobile', // Viewport configuration
  },
  android: {
    allowMixedContent: false,      // Allow HTTP/HTTPS mixed content
    captureInput: true,            // Capture input outside WebView
  },
  cordova: {
    preferences: {
      DisableDeploy: 'true',       // Cordova plugin preferences
    },
  },
};
export default config;
```

## Common Build Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `cap sync` fails on iOS | CocoaPods not installed | `gem install cocoapods` or `brew install cocoapods` |
| `cap sync` fails on Android | Gradle version mismatch | Check Android/gradle/wrapper/gradle-wrapper.properties |
| HMR not working on device | Network access blocked | Check firewall, use `--external` flag |
| Build fails with JS heap OOM | Large bundle | `NODE_OPTIONS=--max-old-space-size=4096 ionic build` |

No preamble. No postamble. No explanations.
