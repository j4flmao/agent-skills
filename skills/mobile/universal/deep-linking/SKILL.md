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

1. **URL scheme vs universal link** — Custom URL scheme (`myapp://path`) for development and internal distribution. Universal link (iOS) / Android App Link (`https://app.example.com/path`) for production verified, secure, no confirmation prompt.

2. **Universal link setup** — Host `apple-app-site-association` JSON at `/.well-known/` on HTTPS server. Add `intent-filter` with `autoVerify` in AndroidManifest. Verify Android links via Google Search Console. iOS validates AASA on first launch.

3. **Deep link routing** — Parse incoming URL → extract path and query params → resolve to route + context → build navigation intent → push screen. Maintain a route registry mapping URL patterns to screens.

4. **Deferred deep linking** — Install app → attribution SDK identifies original link → SDK triggers callback with link data → navigate to expected content. Requires Branch, Adjust, or similar SDK. Works across install attribution window.

5. **Testing & fallback** — `adb shell am start -W -a android.intent.action.VIEW -d "url"` for Android. `xcrun simctl openurl booted "url"` for iOS. Fallback URL redirects to App Store / Play Store if app missing. Test with and without app installed.

## Rules

- Universal links / App Links for production — never custom scheme for public links.
- Custom URL scheme for development only.
- HTTPS required for universal link verification (no self-signed certs).
- Single verified domain per app — avoid spreading across domains.
- Fallback URL must point to App Store / Play Store if app not installed.
- Deferred links require an attribution provider — not possible with bare universal links.
- All route parameters validated before navigation — reject malformed links.

## References

- `references/universal-links.md` — iOS AASA, Android intent filters, verification, testing
- `references/deep-link-routing.md` — Parsing, navigation, deferred links, fallback, attribution

## Handoff
Hand off to mobile-analytics skill when deep link attribution and conversion tracking is needed.
