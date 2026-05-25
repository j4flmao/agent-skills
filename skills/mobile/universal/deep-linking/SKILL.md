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
version: "1.0.0"
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
```
<deep-linking>
<universal>{AASA, intent-filters, verification}</universal>
<routing>{parser, resolver, navigator}</routing>
<deferred>{attribution-sdk, resume-link}</deferred>
<testing>{adb, simctl, fallback urls}</testing>
</deep-linking>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Universal link opens app from Notes/Messages/Safari
- Custom URL scheme opens app from internal sources
- Route parameters extracted correctly and passed to navigation
- Deferred deep link resolves after fresh install
- Fallback URL redirects to store if app not installed

### Max Response Length
6000 tokens

## Workflow

1. **URI scheme vs universal link vs app link** — Three mechanisms for deep linking with different characteristics. Custom URL scheme (e.g., `myapp://path`): simplest, works in development, shows confirmation dialog on iOS, no HTTPS requirement, no verification, can be claimed by multiple apps. Universal links (iOS): HTTPS URLs that open your app silently, require `apple-app-site-association` file on server, verified by Apple at install, only your app can claim the domain. Android App Links: equivalent to universal links, require `intent-filter` with `autoVerify`, verified by Google via Digital Asset Links JSON. For production, always use universal links / app links — custom schemes are for development only.

2. **Route configuration and mapping** — Design a URL structure that mirrors your app's navigation hierarchy. URL path segments map to screen routes, query parameters map to screen arguments. Example: `https://app.example.com/profile/42?tab=orders` → screen `ProfileScreen` with id=42, tab=orders. Maintain a route registry (array/table of pattern → screen mappings) with support for path parameters (`:id`), wildcards (`*`), and optional segments. The parser iterates the registry and returns the first match. Support both path-based and query-based routing.

3. **Deep link setup — iOS** — Create `apple-app-site-association` JSON file (no .json extension) and host at `https://{domain}/.well-known/apple-app-site-association`. The file maps `appID` (Team ID + Bundle ID) to allowed URL paths. iOS fetches this file at first install and periodically thereafter. Verify success via device console logs (`swcutil` or search for `[CoreBroker]`). In `AppDelegate.swift`, implement `application(_:continue:restorationHandler:)` to receive incoming `NSUserActivity` of type `NSUserActivityTypeBrowsingWeb`. Extract the `webpageURL` and pass to your deep link router.

4. **Deep link setup — Android** — Add `intent-filter` to the activity in `AndroidManifest.xml` that should receive deep links. Include `<data android:scheme="https" android:host="app.example.com" />` and `android:autoVerify="true"`. For custom schemes, add a second intent-filter with `android:scheme="myapp"`. Verify app links via Google Search Console: add Digital Asset Links JSON at `https://{domain}/.well-known/assetlinks.json`. Check verification with `adb shell dumpsys package domain-preferred-apps`. Handle incoming links in `MainActivity.onCreate()` or `onNewIntent()` by extracting the intent data URI.

5. **Deep link handling and routing** — Create a unified deep link handler that: (a) parses incoming URL using platform URL parsing, (b) matches against route registry to extract path and query parameters, (c) validates required parameters, (d) checks authentication requirements — if user not logged in, queue the deep link for post-login navigation, (e) pushes the target screen with extracted parameters, (f) tracks the deep link event in analytics. Support both cold start (app not running) and warm start (app in background) scenarios. Deep links arriving while app is in background should navigate from current state, not reset navigation stack.

6. **Deferred deep linking** — Standard universal links only work if the app is already installed. Deferred deep links work after install: user taps link → opens App Store / Play Store → installs app → first launch → SDK identifies the original link → app navigates to the expected content. Requires an attribution SDK (Branch, Adjust, AppsFlyer, or custom solution). Implementation: SDK generates a tracking link, user taps it, SDK stores click data, on first launch SDK callback delivers the deep link data. Chain: install → SDK init → retrieve deferred link → navigate. Fallback: if no deferred link, navigate to default home screen.

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

## References
- `references/deep-link-routing.md` — Deep Link Routing
- `references/deep-link-setup.md` — Deep Link Setup
- `references/platform-differences.md` — Platform Differences
- `references/universal-links.md` — Universal Links

## Handoff
Hand off to mobile-analytics skill when deep link attribution and conversion tracking is needed.
