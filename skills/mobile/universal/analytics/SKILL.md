---
name: mobile-analytics
description: >
  Use this skill when the user says 'analytics', 'event tracking', 'Firebase Analytics', 'Mixpanel', 'Amplitude', 'app analytics', 'event logging', 'user properties', 'screen tracking', 'funnel analytics', 'user behavior', 'telemetry'. Track events, screen views, and user properties in mobile apps with privacy compliance. Do NOT use for: server-side analytics or web analytics.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, analytics, phase-7, universal]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Mobile Analytics

## Purpose
Guide for implementing mobile app analytics: event tracking, screen views, user properties, and privacy compliance.

## Agent Protocol

### Trigger
Phrases: "analytics", "event tracking", "Firebase Analytics", "Mixpanel", "Amplitude", "app analytics", "event logging", "user properties", "screen tracking", "funnel analytics", "user behavior", "telemetry"

### Input Context
- Analytics provider (Firebase, Mixpanel, Amplitude, or custom)
- Event taxonomy and naming conventions
- Privacy requirements (GDPR, CCPA, ATT)
- Existing navigation system for automatic screen tracking

### Output Artifact
Analytics module: provider initialization, event tracking service, screen view auto-tracker, user properties manager, consent management, privacy controls.

### Response Format
```
<analytics>
<provider>{init, config, provider selection}</provider>
<events>{schema, naming, automatic, custom}</events>
<screen>{auto-track via navigation listener}</screen>
<privacy>{consent, opt-out, deletion, ATT}</privacy>
</analytics>
```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- Events fire with correct schema and reach analytics dashboard
- Screen views tracked automatically via navigation listener
- User properties set on login/update
- GDPR consent flow blocks non-essential events
- ATT prompt appears on iOS 14.5+
- User deletion API removes all stored analytics data

### Max Response Length
6000 tokens

## Workflow

1. **Analytics SDK selection** — Three categories of analytics providers. Free tier: Firebase Analytics (Google) — unlimited events, 500 user properties per app, basic segmentation (by device, country, version), funnels in Google Analytics 4, no cost. Good for most apps. Paid tiers: Mixpanel and Amplitude — advanced user profiling, behavioral cohorts, retention analysis, A/B testing, revenue tracking, funnel analysis with time-to-convert, custom dashboards, data warehouses export. Pricing based on MTU (monthly tracked users). Custom server: full data control, no third-party dependency, implement your own event ingestion, storage, dashboard, GDPR compliance certainty, higher engineering cost. Recommendation: start with Firebase Analytics (free + sufficient), migrate to Mixpanel/Amplitude when advanced segmentation needed.

2. **Event naming taxonomy** — Consistent naming convention is critical for usable analytics. Event names: `snake_case`, max 40 characters. Pattern: `{domain}_{action}_{object}` or `{screen}_{action}`. Examples: `profile_edit_name`, `cart_add_item`, `settings_toggle_notifications`, `checkout_payment_complete`. Reserved prefixes: `screen_`, `error_`, `funnel_`, `perf_`. Event properties: up to 25 per event, typed (string, number, boolean), keys also `snake_case`, max 40 chars per key, max 100 chars per string value. Never pass PII in properties. Use enum or constant class for event names and property keys to avoid typos and ensure discoverability. Version event schemas in a tracking plan document shared across team.

3. **Automatic screen tracking** — Hook into navigation system to dispatch `screen_view` events automatically. iOS: swizzle or `UINavigationControllerDelegate` to catch push/pop transitions. Android: `NavController.OnDestinationChangedListener` for Jetpack Navigation, or `FragmentManager.FragmentLifecycleCallbacks`. Cross-platform: React Navigation state listener, Flutter Navigator observer. Screen view event should include: `screen_name` (human-readable, e.g., "Profile"), `screen_class` (class name, e.g., "ProfileViewController"), `screen_route` (route pattern, e.g., "/user/:id"). Never manually fire screen view events — use the automatic hook. If a screen doesn't appear in dashboard, fix the navigation hook, not by adding manual calls.

4. **User properties and identity** — Set user properties at login/signup and on change. Properties: plan type, subscription status, days since install, push enabled, language, region, A/B test cohort. Use `setUserId` for cross-session user identity — use a stable identifier (not email or phone). Anonymize user ID for GDPR compliance (hash-based, server-generated). Identity stitching: when user signs up after anonymous usage, call `identify()` with new ID and alias anonymous events to new ID. Property limits: Firebase allows up to 500 user properties, Mixpanel/Amplitude have higher limits. Set all known properties at login to establish baseline for funnels and retention cohorts.

5. **Custom event tracking** — Feature usage: `{feature}_{action}` with relevant properties (e.g., `search_filter_applied` with filter type, result count). Non-fatal errors: `error_{domain}` with `error_message`, `error_code`, `screen_name`. Performance: `perf_screen_load` with `duration_ms`, `perf_api_latency` with `endpoint`, `status_code`. Conversion funnels: `funnel_{name}_{step}` with step number, step name. Use a single `AnalyticsService` facade class that all features call — never call provider SDKs directly. The facade handles consent checking, provider routing, property enrichment (device info, app version, session ID). This enables changing providers without modifying feature code.

6. **Consent management and GDPR compliance** — GDPR: consent dialog on first launch (opt-in required for non-essential events). Categories: essential (app lifecycle, crashes — always tracked), functional (user preferences, feature usage), analytics (behavioral tracking), personalization (advertising, content recommendation). CCPA: "Do Not Sell My Info" toggle in app settings. ATT (iOS 14.5+): `ATTrackingManager.requestTrackingAuthorization()` before accessing IDFA — required for personalized analytics, ad attribution, and cross-app tracking. Flow: Launch → check consent status → if not decided → show consent dialog → user choices → persist preferences → configure analytics provider accordingly. Android: Google Consent Management SDK for serving consent dialogs. For EU users, analytics must be stopped until consent is granted.

7. **Data retention and deletion** — Configure data retention in analytics provider: Firebase Analytics max 24 months, Mixpanel/Amplitude configurable (up to unlimited on enterprise). Implement user data deletion: (a) Call provider's deletion API (`analytics.deleteUserData()`), (b) Clear local analytics cache/queue, (c) Reset analytics user ID (generate new anonymous ID). For custom server: implement `DELETE /api/analytics/user/{userId}` endpoint that removes all events, properties, and profiles. Trigger deletion from app settings with confirmation dialog. Audit compliance: maintain a record of what data is collected, where it's stored, and how it can be deleted. Review at each major release.

## Analytics Provider Comparison

| Feature | Firebase | Mixpanel | Amplitude | Custom |
|---------|----------|----------|-----------|--------|
| Cost | Free | Paid (MTU) | Paid (MTU) | Engineering |
| Event limit | Unlimited | 20M/mo (starter) | 10M/mo (starter) | Unlimited |
| User properties | 500 | Unlimited | Unlimited | Unlimited |
| Funnels | Basic | Advanced | Advanced | Custom |
| Retention | Yes | Yes | Yes | Custom |
| A/B testing | No | Yes | Yes | Custom |
| Data export | BigQuery | Warehouse sync | Warehouse sync | Direct |

## Best Practices

- Single `AnalyticsService` facade — never call provider SDKs from feature code
- Event names: `snake_case`, ≤40 chars — consistent naming prevents analytics debt
- Properties limited to 25 per event — no unbounded property bags
- No PII in event properties: no email, name, phone, government ID
- Screen views tracked automatically via navigation listener — never manual
- Provide opt-out mechanism accessible from app settings

## Common Pitfalls

- **Event naming inconsistency**: `user_logged_in` vs `login_complete` creates split funnels. Define naming convention upfront and enforce with lint rules.
- **Over-tracking**: Too many events dilute signal and increase cost. Track what you analyze, not everything possible.
- **Consent fragment**: Consent must apply to all provider SDKs — checking consent for Firebase but not Adjust is a compliance gap.
- **ATT prompt timing**: Prompt immediately on first launch = user denies. Contextual prompt (before personalized feature) has higher acceptance.
- **Missing events after refactor**: Event calls get lost during code churn. Integration tests should verify events fire.

## Configuration Reference

```kotlin
// Analytics service initialization
class AnalyticsService(private val providers: List<AnalyticsProvider>) {
    fun track(event: AnalyticsEvent) {
        if (!consentManager.isAllowed(event.category)) return
        val enriched = event.copy(properties = event.properties + sessionData())
        providers.forEach { it.track(enriched) }
    }
}
```

## References

- `references/analytics-sdks.md` — Provider setup, event schema, screen tracking, user properties
- `references/event-tracking.md` — Event taxonomy, consent management, ATT, GDPR/CCPA, data deletion

## Handoff
Hand off to mobile-crash-reporting skill when Crashlytics integration is needed, or to mobile-networking when custom analytics server endpoint is required.
