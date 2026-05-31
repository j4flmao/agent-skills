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
version: "2.0.0"
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

## Architecture

### Analytics Service Layer Pattern
```
┌──────────────────────────────────────────────────┐
│                  Feature Code                     │
│   calls AnalyticsService.track("event", props)    │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│              AnalyticsService (Facade)             │
│  • Consent checking before forwarding              │
│  • Property enrichment (device, session, version)  │
│  • Rate limiting and batching                      │
│  • Multi-provider routing                          │
└────┬────────────┬────────────┬────────────────────┘
     │            │            │
┌────▼──┐  ┌─────▼─────┐  ┌──▼───────────┐
│Provider│  │  Provider │  │  File/Log     │
│   A    │  │    B      │  │  Fallback     │
└────────┘  └───────────┘  └──────────────┘
```

### Decision Tree: Provider Selection
```
What is your budget?
├── $0/month → Firebase Analytics
│   Sufficient for: event tracking, basic funnels, 500 user properties
│   Not sufficient for: behavioral cohorts, advanced retention, A/B testing
├── $500-2000/month MTU → Mixpanel or Amplitude
│   Choose Mixpanel: better for product-led growth, viral loops
│   Choose Amplitude: better for behavioral analytics, predictive models
└── Enterprise → Custom server + warehouse
    Full data control, custom dashboards, no per-event cost
```

### Decision Tree: Event Architecture
```
What type of data?
├── User action (tap, swipe, purchase) → Custom event
│   Naming: {domain}_{action}_{object}
│   Properties: up to 25 typed values, no PII
├── Screen view → Automatic screen tracking event
│   Via navigation listener/hook — never manual
│   Properties: screen_name, screen_class, screen_route
├── Error/non-fatal → Error event
│   Naming: error_{domain}
│   Properties: error_message, error_code, screen_name
└── Performance metric → Performance event
    Naming: perf_{category}_{measure}
    Properties: duration_ms, endpoint, status_code
```

## Workflow

1. **Analytics SDK selection** — Three categories of analytics providers. Free tier: Firebase Analytics (Google) — unlimited events, 500 user properties per app, basic segmentation (by device, country, version), funnels in Google Analytics 4, no cost. Good for most apps. Paid tiers: Mixpanel and Amplitude — advanced user profiling, behavioral cohorts, retention analysis, A/B testing, revenue tracking, funnel analysis with time-to-convert, custom dashboards, data warehouses export. Pricing based on MTU (monthly tracked users). Custom server: full data control, no third-party dependency, implement your own event ingestion, storage, dashboard, GDPR compliance certainty, higher engineering cost. Recommendation: start with Firebase Analytics (free + sufficient), migrate to Mixpanel/Amplitude when advanced segmentation needed.

2. **Event naming taxonomy** — Consistent naming convention is critical for usable analytics. Event names: `snake_case`, max 40 characters. Pattern: `{domain}_{action}_{object}` or `{screen}_{action}`. Examples: `profile_edit_name`, `cart_add_item`, `settings_toggle_notifications`, `checkout_payment_complete`. Reserved prefixes: `screen_`, `error_`, `funnel_`, `perf_`. Event properties: up to 25 per event, typed (string, number, boolean), keys also `snake_case`, max 40 chars per key, max 100 chars per string value. Never pass PII in properties. Use enum or constant class for event names and property keys to avoid typos and ensure discoverability. Version event schemas in a tracking plan document shared across team.

3. **Automatic screen tracking** — Hook into navigation system to dispatch `screen_view` events automatically. iOS: swizzle or `UINavigationControllerDelegate` to catch push/pop transitions. Android: `NavController.OnDestinationChangedListener` for Jetpack Navigation, or `FragmentManager.FragmentLifecycleCallbacks`. Cross-platform: React Navigation state listener, Flutter Navigator observer. Screen view event should include: `screen_name` (human-readable, e.g., "Profile"), `screen_class` (class name, e.g., "ProfileViewController"), `screen_route` (route pattern, e.g., "/user/:id"). Never manually fire screen view events — use the automatic hook. If a screen doesn't appear in dashboard, fix the navigation hook, not by adding manual calls.

4. **User properties and identity** — Set user properties at login/signup and on change. Properties: plan type, subscription status, days since install, push enabled, language, region, A/B test cohort. Use `setUserId` for cross-session user identity — use a stable identifier (not email or phone). Anonymize user ID for GDPR compliance (hash-based, server-generated). Identity stitching: when user signs up after anonymous usage, call `identify()` with new ID and alias anonymous events to new ID. Property limits: Firebase allows up to 500 user properties, Mixpanel/Amplitude have higher limits. Set all known properties at login to establish baseline for funnels and retention cohorts.

5. **Custom event tracking** — Feature usage: `{feature}_{action}` with relevant properties (e.g., `search_filter_applied` with filter type, result count). Non-fatal errors: `error_{domain}` with `error_message`, `error_code`, `screen_name`. Performance: `perf_screen_load` with `duration_ms`, `perf_api_latency` with `endpoint`, `status_code`. Conversion funnels: `funnel_{name}_{step}` with step number, step name. Use a single `AnalyticsService` facade class that all features call — never call provider SDKs directly. The facade handles consent checking, provider routing, property enrichment (device info, app version, session ID). This enables changing providers without modifying feature code.

6. **Consent management and GDPR compliance** — GDPR: consent dialog on first launch (opt-in required for non-essential events). Categories: essential (app lifecycle, crashes — always tracked), functional (user preferences, feature usage), analytics (behavioral tracking), personalization (advertising, content recommendation). CCPA: "Do Not Sell My Info" toggle in app settings. ATT (iOS 14.5+): `ATTrackingManager.requestTrackingAuthorization()` before accessing IDFA — required for personalized analytics, ad attribution, and cross-app tracking. Flow: Launch -> check consent status -> if not decided -> show consent dialog -> user choices -> persist preferences -> configure analytics provider accordingly. Android: Google Consent Management SDK for serving consent dialogs. For EU users, analytics must be stopped until consent is granted.

7. **Data retention and deletion** — Configure data retention in analytics provider: Firebase Analytics max 24 months, Mixpanel/Amplitude configurable (up to unlimited on enterprise). Implement user data deletion: (a) Call provider's deletion API (`analytics.deleteUserData()`), (b) Clear local analytics cache/queue, (c) Reset analytics user ID (generate new anonymous ID). For custom server: implement `DELETE /api/analytics/user/{userId}` endpoint that removes all events, properties, and profiles. Trigger deletion from app settings with confirmation dialog. Audit compliance: maintain a record of what data is collected, where it's stored, and how it can be deleted. Review at each major release.

8. **Event batching and offline queue** — Mobile analytics must handle unreliable network conditions. Implement an event queue that persists events to local storage when the device is offline and flushes when connectivity returns. Batch configuration: batch size of 25-50 events or 60-second interval (whichever comes first). Queue limits: cap at 500 events in the offline queue to avoid excessive storage usage. Oldest events are dropped first if the cap is exceeded. Flush priority: critical events (purchases, errors) flush on an expedited timer of 10 seconds. Implement exponential backoff for failed flushes: 2s, 4s, 8s, 16s, max 60s. On app background: force flush all queued events synchronously.

9. **A/B test integration** — When using Mixpanel or Amplitude, analytics and experimentation are coupled. Configure experiments in the analytics provider dashboard with targeting rules (country, user property, cohort). The SDK returns the variant assignment for each active experiment. Log experiment exposure as a dedicated event with `experiment_id`, `variant_name`, and `user_properties` so analysis can filter by experiment cohort. Never hardcode experiment logic — use a feature flag abstraction layer that consults the analytics provider's experiment API. Roll out gradually: 1% -> 5% -> 25% -> 50% -> 100%, monitoring core metrics at each step for regression.

10. **Data quality monitoring** — Analytics is only useful if the data is correct. Implement event schema validation: assert that every event has the expected properties with correct types. Log schema violations to a separate monitoring dashboard. Track event volume anomalies: if an event fires 10x more or less than the daily average, alert the team. Run daily data quality checks: expected events received, null property ratios, unexpected NaN or negative values. Monitor event latency: 95th percentile time from event fire to dashboard appearance should be under 5 minutes for real-time providers and under 2 hours for batch-export providers.

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
| Real-time | Near-real-time | Real-time | Real-time | Configurable |
| Offline support | Built-in | Built-in | Built-in | Custom |

## Best Practices

- Single `AnalyticsService` facade — never call provider SDKs from feature code
- Event names: `snake_case`, <=40 chars — consistent naming prevents analytics debt
- Properties limited to 25 per event — no unbounded property bags
- No PII in event properties: no email, name, phone, government ID
- Screen views tracked automatically via navigation listener — never manual
- Provide opt-out mechanism accessible from app settings
- Version event schemas in a tracking plan — share across team, review each sprint
- Instrument events for features you actively analyze, not everything possible
- Test analytics in CI: integration tests should verify events fire with correct schema
- Set user properties at login to establish baseline for all downstream analysis
- Batch events for efficiency, flush on background for completeness
- Monitor data quality with automated schema validation and volume anomaly alerts
- Keep a changelog of event schema changes to track analytics debt

## Common Pitfalls

- **Event naming inconsistency**: `user_logged_in` vs `login_complete` creates split funnels. Define naming convention upfront and enforce with lint rules.
- **Over-tracking**: Too many events dilute signal and increase cost. Track what you analyze, not everything possible.
- **Consent fragment**: Consent must apply to all provider SDKs — checking consent for Firebase but not Adjust is a compliance gap.
- **ATT prompt timing**: Prompt immediately on first launch = user denies. Contextual prompt (before personalized feature) has higher acceptance.
- **Missing events after refactor**: Event calls get lost during code churn. Integration tests should verify events fire.
- **Identity fragmentation**: Anonymous events before login, identified events after login — without identity stitching, funnels break at the login step.
- **Property cardinality explosion**: Using unique values (timestamps, UUIDs) as event properties creates unbounded cardinality that breaks segmentation.
- **Delayed analytics SDK init**: If the SDK initializes after the first screen renders, the initial screen_view event is lost. Init analytics before app root renders.
- **Debug mode leaks**: Debug/release analytics keys committed to the wrong build config results in test data polluting production dashboards.
- **Event schema drift**: After months of development, event payloads drift from the original tracking plan. Regular audits catch drift before dashboards break.

## Compared With

| Approach | Use Case | Tradeoff |
|----------|----------|----------|
| Firebase Analytics | MVPs, early-stage apps | Limited segmentation, no A/B testing |
| Mixpanel | Product-led growth, retention focus | Cost scales with MTU, steep learning curve |
| Amplitude | Behavioral analytics, predictive models | Higher MTU cost than Mixpanel at scale |
| Custom server | Enterprise, regulated industries | High engineering cost, no prebuilt dashboards |
| Segment/Tealium | Multi-provider routing | Middleware cost, adds latency, single point of failure |
| PostHog (self-hosted) | Open-source, data sovereignty | Self-hosting ops cost, less mature mobile SDKs |
| Snowplow | Data warehouse-native analytics | Requires data engineering team, no real-time dashboard |

## Performance

- Event batching: 25-50 events or 60-second interval reduces network calls by 95% vs per-event dispatch
- Payload size: average event ~500 bytes JSON compressed (device info, timestamp, properties)
- Network overhead: batched flush of 50 events ~5KB per request — negligible for cellular
- Storage: offline queue capped at 500 events ~250KB max local storage
- CPU impact: analytics SDK adds 1-3ms on the main thread per event fire — use background thread for serialization
- Memory: analytics libraries add 2-8MB to the app binary (Firebase ~5MB, Mixpanel ~3MB, Amplitude ~4MB)
- Startup delay: async analytics SDK init avoids blocking TTI — init in background, flush after first frame
- Battery impact: batched flushes use significantly less radio power than per-event flushes (radio stays in low-power state longer)
- Threading: serialize and batch events on a background queue, flush on a dedicated network thread

## Tooling

| Tool | Category | Platform |
|------|----------|----------|
| Firebase DebugView | Event verification | iOS, Android |
| Mixpanel Live View | Real-time event stream | iOS, Android, Web |
| Amplitude Data | Schema management, governance | Cross-platform |
| Segment Protocols | Event tracking plan enforcement | Cross-platform |
| Snowplow Micro | Local testing analytics pipeline | Cross-platform |
| BigQuery | Custom SQL analytics, event export | Backend |
| Looker / Metabase | Business intelligence dashboards | Backend |
| Profitwell / RevenuCat | Revenue analytics (subscriptions) | iOS, Android |
| Countly | Self-hosted analytics alternative | iOS, Android, Web |
| Matomo | Privacy-focused open-source analytics | Cross-platform |
| Analytics Lint (Swift) | iOS event schema validation | iOS |
| Firebase Test Lab | Automated event coverage testing | Android |
| XCUITest + Analytics | Verify events fire in UI tests | iOS |
| Charles Proxy | Inspect analytics network requests | iOS, Android |

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

## Rules

- Never store user PII in event properties or user property names
- Screen views must be tracked automatically via navigation listener — explicit manual screen events are forbidden
- Every analytics event must pass through the AnalyticsService facade — direct SDK calls from feature code are not permitted
- Event naming must use `snake_case` with max 40 characters per name
- Event properties must be typed (string, number, boolean) with max 25 per event
- Identity stitching must be implemented when users transition from anonymous to authenticated state
- All analytics tracking must respect the user's consent choices for each data category
- ATT prompt on iOS 14.5+ must appear before accessing IDFA for any purpose
- Event schemas must be versioned in a tracking plan document that is reviewed with every feature release
- Data retention policies must be configured in every analytics provider used by the app
- User data deletion API must remove all analytics data across all providers and local storage
- Analytics SDK initialization must not block the first render — lazy-init or async-init pattern required
- Offline event queue must have a bounded size with oldest-drop policy to prevent unbounded storage growth
- Each event must include a server-defined schema version to allow future schema migration
- Production and debug analytics keys must be in separate build configurations — never ship debug keys to production
- Event volume anomalies must trigger alerts — unexpected drops or spikes indicate instrumentation bugs

## References
  - references/analytics-privacy.md — Analytics Privacy
  - references/analytics-reporting.md — Analytics Dashboards and Reporting
  - references/analytics-sdks.md — Analytics SDKs
  - references/analytics-setup.md — Analytics Setup
  - references/event-tracking.md — Event Tracking & Privacy
  - references/mobile-analytics.md — Mobile Analytics Implementation
  - references/mobile-analytics-event-tracking.md — Mobile Analytics Event Tracking
  - references/mobile-analytics-privacy-compliance.md — Mobile Analytics Privacy and Compliance
## Handoff
Hand off to mobile-crash-reporting skill when Crashlytics integration is needed, or to mobile-networking when custom analytics server endpoint is required.
