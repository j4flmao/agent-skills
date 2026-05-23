# Platform Differences — Deep Linking

## iOS vs Android Deep Link Comparison

| Aspect | iOS Universal Links | Android App Links |
|--------|--------------------|------------------|
| Verification file | `apple-app-site-association` | `assetlinks.json` |
| File location | `/.well-known/apple-app-site-association` | `/.well-known/assetlinks.json` |
| File format | JSON (no extension) | JSON |
| Verification timing | At app install + periodic refresh | Asynchronous, may take hours |
| Verified by | Apple (automatically) | Google Search Console (manual setup) |
| Fallback if not verified | Opens website with confirmation | Opens website |
| Debugging | Xcode device logs (swcutil) | `adb shell dumpsys package domain-preferred-apps` |
| Path matching | Wildcard `*`, single `?`, `NOT` prefix | `pathPrefix`, `pathPattern`, `path` |
| Multiple domains | Multiple entries in AASA | Multiple intent-filters |
| HTTPS required | Yes | Yes |

## Deep Link Type Characteristics

| Feature | Custom URL Scheme | Universal/App Link | Deferred Deep Link |
|---------|------------------|-------------------|--------------------|
| Opens app if installed | Yes | Yes | Yes |
| Opens app after install | No | No | Yes |
| Confirmation prompt (iOS) | Yes | No | No |
| Requires HTTPS | No | Yes | Yes (for the link) |
| Requires SDK | No | No | Yes (Branch, Adjust, etc.) |
| Multiple apps can register | Yes (collision) | No (verified domain) | No (verified domain) |
| Use case | Development, internal | Production | Marketing campaigns |

## Deferred Deep Linking

Standard universal/app links only work if the app is already installed. Deferred deep links work when the app is installed *after* the link is tapped.

### Flow

```
1. User taps marketing link (e.g., https://example.com/product/42)
2. Server detects app not installed → redirects to App Store / Play Store
3. Attribution SDK registers the click with link data
4. User installs app from store
5. First launch → SDK initializes → identifies the original link
6. SDK callback delivers stored link data to the app
7. App navigates to /product/42
```

### SDK Integration (Branch.io Example)

```swift
// iOS — AppDelegate.swift
Branch.getInstance().initSession(launchOptions: launchOptions) { params, error in
    if let linkPath = params?["$deeplink_path"] as? String {
        DeepLinkRouter.handle(URL(string: linkPath)!)
    }
}
```

```kotlin
// Android — MainActivity.kt
Branch.getAutoInstance(this)
Branch.sessionBuilder(this)
    .withCallback { params, error ->
        val linkPath = params?.getString("$deeplink_path")
        if (linkPath != null) DeepLinkRouter.handle(this, Uri.parse(linkPath))
    }
    .withData(intent.data)
    .init()
```

## Route Resolution Patterns

### Pattern Matching

| Pattern | Matches | Doesn't Match |
|---------|---------|---------------|
| `/profile/:id` | `/profile/42` | `/profile/42/settings` |
| `/product/:category/:id` | `/product/electronics/42` | `/product/electronics` |
| `/search*` | `/search`, `/search?q=app` | `/search-results` |
| `/*` (wildcard) | Everything | — |
| `/profile/` | `/profile/42`, `/profile/` | `/profiles` |

### Route Registry Implementation

```typescript
// TypeScript — route registry with type-safe params
interface RouteDefinition {
  pattern: string;
  screen: string;
  auth?: boolean;
  validate?: (params: Record<string, string>) => boolean;
}

const routes: RouteDefinition[] = [
  { pattern: '/product/:id', screen: 'ProductDetail', validate: (p) => !!p.id },
  { pattern: '/profile/:tab', screen: 'Profile', auth: true },
  { pattern: '/search', screen: 'Search' },
  { pattern: '*', screen: 'NotFound' },
];

function resolveDeepLink(url: string): { screen: string; params: Record<string, string> } {
  const parsed = new URL(url);
  const path = parsed.pathname;
  const queryParams = Object.fromEntries(parsed.searchParams);

  for (const route of routes) {
    const match = matchRoute(route.pattern, path);
    if (match && (!route.validate || route.validate(match))) {
      return { screen: route.screen, params: { ...match, ...queryParams } };
    }
  }
  return { screen: 'NotFound', params: {} };
}
```

## Attribution Summary

| Feature | Custom URL | Universal Link | Deferred (Branch/Adjust) |
|---------|-----------|---------------|------------------------|
| Track link taps | Manual | Manual | Automatic |
| Attribution window | None | None | Configurable |
| Re-engagement | No | No | Yes |
| Deep link to content | Yes | Yes | Yes |
| Analytics integration | Manual | Manual | Built-in |
| Cost | Free | Free | Paid tier |

No preamble. No postamble. No explanations.
