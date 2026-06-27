---
name: mobile-deep-linking
description: >
  Use this skill when the user says 'deep linking', 'universal link', 'app link', 'URL scheme', 'deferred deep link', 'routing deep link', 'link handler', 'deep navigation'. Implement deep linking across iOS and Android using universal links, custom URL schemes, and deferred deep linking. Do NOT use for: web URL routing or push notification handling.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, deep-linking, phase-7, universal]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Deep Linking

## Purpose
Guide for implementing deep linking across iOS and Android using universal links, custom URL schemes, and deferred deep linking.

## Agent Protocol

### Trigger
Phrases: "deep linking", "universal link", "app link", "URL scheme", "deferred deep link", "routing deep link", "link handler", "deep navigation"

### Input Context
- App navigation routes to be linkable
- Domain for universal link hosting
- Existing routing/navigation system
- Attribution SDK (if deferred linking needed)

### Output Artifact
Deep link configuration: apple-app-site-association JSON, Android intent filters, route mapping table, navigation handler code.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Universal link opens app from Notes/Messages/Safari
- Custom URL scheme opens app from internal sources
- Route parameters extracted correctly and passed to navigation
- Deferred deep link resolves after fresh install
- Fallback URL redirects to store if app not installed

### Max Response Length
6000 tokens

## Architecture / Decision Trees

### Linking Mechanism Decision
```
Production or development?
├── Production → Universal Links (iOS) / App Links (Android)
│   Benefits: no confirmation dialog, exclusive to your app, SEO-friendly
│   Requires: HTTPS domain with verification files
├── Development → Custom URL scheme (myapp://)
│   Benefits: works immediately, no server needed
│   Drawbacks: confirmation dialog, multiple apps can register same scheme
└── Both → Universal/App Links for production + URL scheme fallback
    URL scheme used when universal link format is needed for internal use
```

### Deferred Deep Linking Decision
```
Need to attribute installs?
├── Yes → Branch, Adjust, or AppsFlyer
│   SDK stores click data before install, resolves on first launch
│   Use for: referral programs, ad attribution, personalized onboarding
├── Simple install tracking → Firebase Dynamic Links (deprecated)
│   Note: Firebase Dynamic Links deprecated — migrate to Branch or custom
└── No deferred needed → Standard universal links only
    App must be installed for links to work
```

### Routing Strategy
```
Navigation framework?
├── Jetpack Navigation (Android) → NavDeepLink with route patterns
│   Auto-extracts path/query params as arguments
├── SwiftUI / UIKit → Custom route registry
│   Parse URL → Match against route table → Navigate
├── Flutter → GoRouter deep link support
│   `router.config()` with initialLocation from deep link
├── React Native → React Navigation linking config
│   `linking.prefixes` + `linking.config` for route mapping
└── Expo → Expo Router + linking config
    Built-in deep link support with file-based routing
```

## Workflow

1. **URI scheme vs universal link vs app link** — Three mechanisms for deep linking with different characteristics. Custom URL scheme (e.g., `myapp://path`): simplest, works in development, shows confirmation dialog on iOS, no HTTPS requirement, no verification, can be claimed by multiple apps. Universal links (iOS): HTTPS URLs that open your app silently, require `apple-app-site-association` file on server, verified by Apple at install, only your app can claim the domain. Android App Links: equivalent to universal links, require `intent-filter` with `autoVerify`, verified by Google via Digital Asset Links JSON. For production, always use universal links / app links — custom schemes are for development only.

2. **Route configuration and mapping** — Design a URL structure that mirrors your app's navigation hierarchy. URL path segments map to screen routes, query parameters map to screen arguments. Example: `https://app.example.com/profile/42?tab=orders` -> screen `ProfileScreen` with id=42, tab=orders. Maintain a route registry (array/table of pattern -> screen mappings) with support for path parameters (`:id`), wildcards (`*`), and optional segments. The parser iterates the registry and returns the first match. Support both path-based and query-based routing.

3. **Deep link setup — iOS** — Create `apple-app-site-association` JSON file (no .json extension) and host at `https://{domain}/.well-known/apple-app-site-association`. The file maps `appID` (Team ID + Bundle ID) to allowed URL paths. iOS fetches this file at first install and periodically thereafter. Verify success via device console logs (`swcutil` or search for `[CoreBroker]`). In `AppDelegate.swift`, implement `application(_:continue:restorationHandler:)` to receive incoming `NSUserActivity` of type `NSUserActivityTypeBrowsingWeb`. Extract the `webpageURL` and pass to your deep link router.

4. **Deep link setup — Android** — Add `intent-filter` to the activity in `AndroidManifest.xml` that should receive deep links. Include `<data android:scheme="https" android:host="app.example.com" />` and `android:autoVerify="true"`. For custom schemes, add a second intent-filter with `android:scheme="myapp"`. Verify app links via Google Search Console: add Digital Asset Links JSON at `https://{domain}/.well-known/assetlinks.json`. Check verification with `adb shell dumpsys package domain-preferred-apps`. Handle incoming links in `MainActivity.onCreate()` or `onNewIntent()` by extracting the intent data URI.

5. **Deep link handling and routing** — Create a unified deep link handler that: (a) parses incoming URL using platform URL parsing, (b) matches against route registry to extract path and query parameters, (c) validates required parameters, (d) checks authentication requirements — if user not logged in, queue the deep link for post-login navigation, (e) pushes the target screen with extracted parameters, (f) tracks the deep link event in analytics. Support both cold start (app not running) and warm start (app in background) scenarios. Deep links arriving while app is in background should navigate from current state, not reset navigation stack.

6. **Deferred deep linking** — Standard universal links only work if the app is already installed. Deferred deep links work after install: user taps link -> opens App Store / Play Store -> installs app -> first launch -> SDK identifies the original link -> app navigates to the expected content. Requires an attribution SDK (Branch, Adjust, AppsFlyer, or custom solution). Implementation: SDK generates a tracking link, user taps it, SDK stores click data, on first launch SDK callback delivers the deep link data. Chain: install -> SDK init -> retrieve deferred link -> navigate. Fallback: if no deferred link, navigate to default home screen.

7. **Testing and fallback behavior** — iOS simulator: `xcrun simctl openurl booted "https://app.example.com/profile/42"`. Android emulator: `adb shell am start -W -a android.intent.action.VIEW -d "https://app.example.com/profile/42"`. Test with app in foreground, background, and not running. Test with and without app installed. Fallback: when app is not installed, the OS redirects to the website. Configure the webpage at the same URL to redirect to App Store / Play Store. Server-side redirect logic: detect mobile user-agent, redirect to appropriate store. Test deferred links with clean install (uninstall, tap link, install from test track).

## Platform Differences

| Feature | iOS (Universal Link) | Android (App Link) |
|---------|---------------------|-------------------|
| Verification file | `apple-app-site-association` | `.well-known/assetlinks.json` |
| File format | JSON (no extension) | JSON |
| Verification timing | App install + periodic | Google Search Console |
| Confirmation prompt | None | None |
| HTTPS required | Yes | Yes |
| Debug verification | Device console logs | `adb shell dumpsys` |
| Fallback behavior | Opens website | Opens website |

## Best Practices

- Use universal/App Links for all production deep links — never rely on custom URL schemes publicly
- One verified domain per app — avoid spreading links across multiple domains
- Route paths should be stable — changing paths breaks existing links shared by users
- Maintain a route registry as a single source of truth for all deep link patterns
- Validate all route parameters before navigation — reject malformed or unexpected input
- Track deep link impressions and conversions in analytics
- Deep link queue for auth-required routes: store pending link on login screen, replay after auth

## Common Pitfalls

- **AASA not served correctly**: Server must serve `apple-app-site-association` with `Content-Type: application/json` (or `application/pkix-cert` for iOS). No redirect. Must be HTTPS with valid certificate.
- **iOS simulator cache**: AASA changes aren't picked up quickly. Use `swcutil` to force refresh or test on device.
- **Multiple apps claim same custom scheme**: iOS picks one arbitrarily. Use universal links to guarantee your app opens.
- **Android auto-verify timeout**: Verification is asynchronous. May take minutes to hours after first install.
- **Deferred link race condition**: If SDK initialize before user logs in, the deferred link may be lost. Queue it.
- **Deep link without fallback URL**: If no webpage at the same URL, users without the app see a broken page.

## Security Considerations

- Never execute navigation from deep link without validating the URL domain
- Deep link URLs can be spoofed — validate source (iOS: check `webpageURL.domain` matches your app domain)
- Malformed route parameters can cause crashes — validate and coerce all extracted values
- Deferred deep link services track user clicks — disclose in privacy policy
- Do not pass sensitive data (auth tokens, PII) via deep link URLs — they appear in server logs

## Configuration Reference

```json
// apple-app-site-association (no .json extension)
{
  "applinks": {
    "apps": [],
    "details": [{ "appID": "TEAMID.com.example.app", "paths": ["*"] }]
  }
}
```

```xml
<!-- Android AndroidManifest.xml -->
<activity android:name=".MainActivity">
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="app.example.com" />
  </intent-filter>
</activity>
```

## Multi-Domain Deep Linking

In complex apps (e-commerce with multiple brands, white-label apps), deep links may come from multiple domains. Strategy: (a) register all domains in AASA/assetlinks files, (b) create a domain routing table in the app mapping domains to app contexts, (c) validate the domain at link entry before routing. AASA multi-domain format:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      { "appID": "TEAMID.com.example.app", "paths": ["*"] },
      { "appID": "TEAMID.com.example.app", "paths": ["/product/*", "/category/*"] }
    ]
  }
}
```
iOS enforces that each domain must have its own AASA at `/.well-known/apple-app-site-association`. Android auto-verifies each domain independently via Digital Asset Links. Route resolution with domain: maintain a `Map<DomainPattern, Route>` in the route registry. Match the link's domain against the registry before path matching. Reject links from unknown domains with an error event logged to analytics.

## Deep Link Security Hardening

Deep links are an attack vector — malicious apps can register URL schemes, craft spoofed universal links, or inject parameters. Security measures: (a) validate the link's originating domain against the registered domain whitelist, (b) for URL schemes, never rely on scheme alone for security — always add a cryptographic signature (JWT or HMAC) to the URL params and validate server-side, (c) sanitize all extracted path/query params: reject non-printable characters, validate enum values, enforce length limits, (d) rate-limit deep link processing — max 1 link per second to prevent brute force, (e) never pass auth tokens or session IDs in deep link URLs (they appear in server logs and browser history), (f) use universal/App Links exclusively for production — disable custom URL schemes except in debug builds, (g) implement a deep link allowlist in the app that specifies which URL patterns are valid, (h) log and alert on unusual deep link traffic (geographic anomalies, frequency spikes).

## Deep Link Testing Matrix

| Scenario | iOS Command | Android Command |
|----------|-------------|-----------------|
| Cold start (app not running) | `xcrun simctl openurl booted "https://app.example.com/profile/42"` | `adb shell am start -W -a android.intent.action.VIEW -d "https://app.example.com/profile/42"` |
| Warm start (app in background) | Same command (app resumes) | Same command (calls `onNewIntent`) |
| URL scheme (debug) | `xcrun simctl openurl booted "myapp://profile/42"` | `adb shell am start -W -a android.intent.action.VIEW -d "myapp://profile/42"` |
| Invalid path (404) | Link should open default screen | Same |
| Malformed params | Should show error or ignore | Same |
| Deferred link (fresh install) | Use Branch/Adjust test dashboard | Same |
| Multiple URL schemes conflict | Only universal link should work | Only verified app link should work |
| Network off (install then link) | Link should queue, resolve on connect | Same |

Test on real devices with: (a) app installed and not installed (fallback), (b) app in all lifecycle states (foreground, background, terminated), (c) with and without network connectivity, (d) across app versions (old app, same app, updated app), (e) with complex paths and query parameters.

### Deep Link Parameter Strategy
```
What data should the deep link carry?
├── Navigation parameters (path segments, query params)
│   Safe: user_id (number), product_id, screen_name, tab
│   NEVER: auth tokens, session IDs, API keys, passwords
├── Analytics parameters (utm_source, utm_medium, utm_campaign, utm_content)
│   Standard UTM params — compatible with all analytics platforms
│   Pass through to analytics SDK on link resolution
├── Attribution parameters (referrer_id, click_id, ad_id)
│   Used by attribution SDK (Branch, Adjust) — opaque to app
│   Resolved by SDK callback on first launch
├── Experiment parameters (variant_id, experiment_name)
│   A/B test assignment from the link itself
│   Override server-side experiment assignment if present
└── Custom app parameters (deep_link_version, feature_flags)
    Future-proof: include a version param for link schema evolution
    Always validate all params before using them
```

### Deep Link Retry & Queue Strategy
```
Deep link received but app not ready?
├── App not installed → Store redirect (App Store / Play Store)
│   Deferred deep link (Branch/Adjust) captures click, resolves post-install
├── App installed but not logged in → Queue link, route after auth
│   Store URL + params in UserDefaults/SharedPreferences
│   On login completion: check queue → navigate to stored link
│   Clear queue after successful navigation
├── App in onboarding flow → Wait for onboarding to complete
│   Onboarding screens shouldn't be interrupted by deep links
│   Complete onboarding → check deep link queue → navigate
└── Feature not available in current app version → Show upgrade prompt
    Server returns min version for each deep link path
    If app version < min version, show "Update required" dialog → App Store
```

## Dynamic Link Strategy

Rather than hardcoding deep link URLs, generate them dynamically from server-side. This enables: (a) changing the target destination without app update (use server-side URL routing), (b) A/B testing link destinations, (c) adding analytics tracking parameters dynamically, (d) geo-targeting (different content for different regions), (e) personalization (different landing pages per user segment). Implementation: app sends a link creation request to server with target route + params, server validates, generates a short code or signed URL, returns it to app for sharing. When the link is tapped, server decodes the short URL, enriches with analytics params, and redirects to the actual deep link or fallback web page. Use server-side redirect `302` to track click-through before routing to app or store.

## Production Considerations

### Deep Linking Failure Modes

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| AASA not served correctly | Universal link opens website instead of app | Verify Content-Type: application/json, no redirects, HTTPS |
| iOS AASA cache stale | Link stops working after path changes | Clear Safari cache, test with `swcutil` |
| Android auto-verify timeout | App link not verified for hours | Use Digital Asset Links API, test with `adb shell dumpsys` |
| Deferred link race condition | Deep link not delivered on first launch | Queue deep link, resolve after SDK init completes |
| URL scheme conflict | Wrong app opens | Use universal/App Links exclusively |
| Deep link during onboarding | User not logged in | Queue link, replay after login completes |
| Link targeting wrong app version | Feature doesn't exist | Server-side version targeting in link generator |

### Troubleshooting Checklist

- Verify AASA file accessible at `https://domain/.well-known/apple-app-site-association`
- Verify assetlinks.json at `https://domain/.well-known/assetlinks.json`
- Test with `curl -v https://domain/.well-known/apple-app-site-association` (check Content-Type)
- Check iOS device console for `[CoreBroker]` messages indicating AASA fetch status
- Run `adb shell dumpsys package domain-preferred-apps` to verify Android app link status
- Test with app in all states: not installed (fallback), terminated, background, foreground
- Verify route params extracted correctly for edge cases (empty, special chars, unicode)
- Confirm deferred link resolves after clean install from TestFlight/internal track
- Test that auth-gated links queue properly and replay after login
- Verify AASA supports all paths the app needs (wildcard vs explicit paths)

## Code Examples

### iOS Universal Link Handler (AppDelegate)
```swift
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]) -> Void
    ) -> Bool {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let incomingURL = userActivity.webpageURL else {
            return false
        }
        return DeepLinkRouter.shared.handle(url: incomingURL)
    }

    // Custom URL scheme fallback (development only)
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        guard !url.absoluteString.contains("localhost") else { return false }
        return DeepLinkRouter.shared.handle(url: url)
    }
}

class DeepLinkRouter {
    static let shared = DeepLinkRouter()
    private var routeTable: [(pattern: String, handler: ([String: String]) -> Void)] = []

    func register(pattern: String, handler: @escaping ([String: String]) -> Void) {
        routeTable.append((pattern, handler))
    }

    func handle(url: URL) -> Bool {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            return false
        }
        let path = components.path
        var params: [String: String] = [:]
        components.queryItems?.forEach { params[$0.name] = $0.value }

        // Auth check
        guard AuthManager.shared.isLoggedIn else {
            PendingLinkManager.shared.store(url: url)
            return true
        }

        for route in routeTable {
            if let extracted = matchPath(path: path, pattern: route.pattern) {
                params.merge(extracted) { (current, _) in current }
                route.handler(params)
                return true
            }
        }
        Analytics.logEvent("deep_link_unhandled", parameters: ["url": url.absoluteString])
        return false
    }

    private func matchPath(path: String, pattern: String) -> [String: String]? {
        let pathParts = path.split(separator: "/").map(String.init)
        let patternParts = pattern.split(separator: "/").map(String.init)
        guard pathParts.count == patternParts.count else { return nil }
        var params: [String: String] = [:]
        for (p, pat) in zip(pathParts, patternParts) {
            if pat.hasPrefix(":") {
                params[String(pat.dropFirst())] = p
            } else if p != pat {
                return nil
            }
        }
        return params
    }
}
```

### Android Deep Link Handler (MainActivity)
```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleDeepLink(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val data = intent?.data ?: return
        val path = data.path ?: return
        val params = mutableMapOf<String, String>()
        data.queryParameterNames?.forEach { name ->
            data.getQueryParameter(name)?.let { params[name] = it }
        }

        // Validate domain
        val host = data.host ?: ""
        if (host != "app.example.com") {
            Analytics.logEvent("deep_link_invalid_domain", params)
            return
        }

        // Auth gate
        if (!AuthManager.isLoggedIn()) {
            PendingLinkManager.store(data)
            startActivity(Intent(this, LoginActivity::class.java))
            return
        }

        DeepLinkRouter.navigate(this, path, params)
    }
}
```

### Flutter GoRouter Deep Link Support
```dart
import 'package:go_router/go_router.dart';

final router = GoRouter(
  initialLocation: '/home',
  routes: [
    GoRoute(
      path: '/',
      redirect: (context, state) => '/home',
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/profile/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        final tab = state.uri.queryParameters['tab'];
        return ProfileScreen(userId: id, initialTab: tab);
      },
    ),
    GoRoute(
      path: '/orders/:orderId',
      builder: (context, state) {
        final orderId = state.pathParameters['orderId']!;
        return OrderDetailScreen(orderId: orderId);
      },
    ),
  ],
);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  DeepLinkService().init();  // Initialize deferred deep link SDK
  runApp(MyApp());
}
```

### React Navigation Deep Link Config
```typescript
import { LinkingOptions } from '@react-navigation/native';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['https://app.example.com', 'myapp://'],
  config: {
    screens: {
      Home: '',
      Profile: 'profile/:userId',
      OrderDetail: 'orders/:orderId',
      Settings: 'settings',
      Product: {
        path: 'product/:productId',
        parse: { productId: Number },
      },
    },
  },
  // Handle auth-gated links
  getStateFromPath: (path, config) => {
    if (!AuthManager.isLoggedIn) {
      PendingLinkService.store(path);
      return { routes: [{ name: 'Login' }] };
    }
    return undefined; // Use default resolver
  },
};

// In App.tsx:
// <NavigationContainer linking={linking}>
```

## References
  - references/deep-link-analytics.md — Deep Link Analytics & Attribution
  - references/deep-link-implementation.md — Deep Linking Setup
  - references/deep-link-routing.md — Deep Link Routing
  - references/deep-link-setup.md — Deep Link Setup
  - references/platform-differences.md — Platform Differences — Deep Linking
  - references/universal-links.md — Universal Links Setup
  - references/deep-linking-fundamentals.md — Deep Linking Fundamentals
  - references/deep-linking-advanced.md — Advanced Deep Linking
  - references/deep-linking-security.md — Deep Linking Security Guide

## Handoff
Hand off to mobile-analytics skill when deep link attribution and conversion tracking is needed.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.