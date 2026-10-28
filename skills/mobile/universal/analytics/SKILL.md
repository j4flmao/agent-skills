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
AnalyticsService (Facade)
├── Consent checking before forwarding
├── Property enrichment (device, session, version)
├── Rate limiting and batching
├── Multi-provider routing
│
├── Provider A (Firebase)
├── Provider B (Mixpanel)
└── File/Log Fallback
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

### Decision Tree: SDK Initialization Strategy
```
Init timing?
├── Before app root renders → Firebase, Mixpanel, Amplitude (they start collecting immediately)
│   Must: wrap in try/catch, never crash on init failure
├── After first frame → Non-critical analytics (custom server, niche providers)
│   Screen view events from first frame won't be captured
└── Lazy init on first user action → Privacy-first approach
    Show consent dialog first, init only after consent
```

### Decision Tree: Identity Strategy
```
User lifecycle?
├── Anonymous first, then sign up → Identity stitching
│   On signup: alias anonymous ID to user ID
├── Login required to use app → User ID immediately
│   Set user ID on auth success, reset on logout
└── No auth → Device ID
    Use advertising ID (ATT on iOS) or vendor ID
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

## Performance

- Event batching: 25-50 events or 60-second interval reduces network calls by 95% vs per-event dispatch
- Payload size: average event ~500 bytes JSON compressed (device info, timestamp, properties)
- Network overhead: batched flush of 50 events ~5KB per request — negligible for cellular
- Storage: offline queue capped at 500 events ~250KB max local storage
- CPU impact: analytics SDK adds 1-3ms on the main thread per event fire — use background thread for serialization
- Memory: analytics libraries add 2-8MB to the app binary (Firebase ~5MB, Mixpanel ~3MB, Amplitude ~4MB)
- Startup delay: async analytics SDK init avoids blocking TTI — init in background, flush after first frame

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
- Production and debug analytics keys must be in separate build configurations — never ship debug keys to production

## Deferred Deep Linking & Analytics Attribution

Deep linking attribution requires mapping installs back to the marketing source that drove them. The attribution chain works as follows: (1) user taps an analytics-tracked link containing campaign parameters, (2) link redirects through the attribution SDK's click tracker, (3) if the app isn't installed, the Store redirect saves the click data to the SDK's server, (4) on first app launch, the attributions SDK queries its server for pending attribution data, (5) the analytics SDK then sets user properties for `install_source`, `campaign_id`, `ad_network`, and `click_timestamp`. This allows analytics queries to segment by acquisition channel. The attribution window is typically 7-30 days after click. Implement attribution as a separate concern from analytics — use an attribution SDK (Adjust, Branch, AppsFlyer) alongside your analytics SDK.

## Server-Side Analytics Validation

Event data flowing from mobile apps should be validated server-side before entering the analytics pipeline. Implement a validation proxy between the mobile client and your analytics provider: (1) validate event schema (required properties present, correct types, no PII leaking), (2) validate property cardinality (no more than 25 unique values for partition keys), (3) reject events exceeding 32KB payload limit, (4) apply rate limits per user (100 events/second max), (5) filter bot traffic and test device IDs. Use a serverless function or dedicated validation service. Log rejected events to a separate dead-letter queue for auditing and debugging. Schema validation catches tracking plan drift before it pollutes dashboards.

## A/B Test Architecture Decision Tree

```
Experimentation needs?
├── No experimentation → Skip. Don't add A/B framework until needed.
├── Simple feature flags → Firebase Remote Config / LaunchDarkly
│   └── Boolean flags, gradual rollout, kill switch
├── Product A/B tests → Mixpanel Experiments / Amplitude Experiment
│   └── Full statistical engine, sample size calculator, MVT
└── Enterprise experimentation → Google Optimize / Optimizely
    └── Server-side, personalization, audience targeting
```

## Sampling Strategy Decision Tree

```
Event volume?
├── <10M events/month → No sampling. Track everything.
├── 10M-100M events/month → Adaptive sampling
│   └── High-value events: 100% (purchase, login, error)
│   └── Low-value events: 10% (scroll, hover, background)
└── >100M events/month → Fixed-rate sampling per event type
    └── Set sample rates per event: critical=100%, important=50%, verbose=5%
    └── Document sampling rate per event in tracking plan
```

## Production Considerations

### Analytics Failure Modes

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| SDK init crash | App crashes on launch | Wrap init in try/catch, never block launch |
| Queue overflow | Events lost after queue cap | Set bounded queue (max 500), oldest-drop |
| Network timeouts | Events stuck in queue | Exponential backoff flush (2s→60s), flush on app bg |
| Schema drift | Dashboard values look wrong | CI schema validation, tracking plan audit |
| Provider outage | No events for hours | Multi-provider routing, failover to log file |
| Consent lost | Essential events also stop | Separate essential from non-essential queues |

### Troubleshooting Checklist

- Verify events appear in provider debug view after 5 minutes
- Check device logs for analytics SDK errors (look for provider name)
- Confirm consent status is correctly persisted between app launches
- Validate event payload size is under 32KB
- Ensure analytics SDK initialized before navigation system
- Test on airplane mode: events should queue and flush when reconnected
- Check user property cardinality — high-cardinality properties break segmentation

### CI/CD Integration

- Run analytics schema validation as CI step using a local validation script
- Maintain a tracking plan YAML checked into the repo
- CI validates all new/edited events against the tracking plan
- Integration tests assert events fire with correct properties
- Periodic (nightly) data quality jobs compare actual event counts vs. expected
- Deploy analytics config changes separately from app releases (remote config)

## Code Examples

### Firebase Analytics Swift
```swift
import FirebaseAnalytics

final class AnalyticsService {
    static let shared = AnalyticsService()
    private var isInitialized = false

    func initialize() {
        FirebaseApp.configure()
        isInitialized = true
    }

    func logEvent(_ name: String, parameters: [String: Any]? = nil) {
        guard isInitialized, ConsentManager.shouldTrack(.analytics) else { return }
        var enriched = parameters ?? [:]
        enriched["app_version"] = App.version
        enriched["session_id"] = SessionManager.current.id
        Analytics.logEvent(name, parameters: enriched)
    }

    func setUserProperty(_ value: String?, forName name: String) {
        guard ConsentManager.shouldTrack(.analytics) else { return }
        Analytics.setUserProperty(value, forName: name)
    }
}
```

### Mixpanel Kotlin
```kotlin
class MixpanelAnalyticsProvider(private val context: Context) : AnalyticsProvider {
    private lateinit var mixpanel: MixpanelAPI

    override fun initialize(token: String) {
        mixpanel = MixpanelAPI.getInstance(context, token)
    }

    override fun trackEvent(name: String, properties: Map<String, Any>?) {
        mixpanel.track(name, properties)
    }

    override fun identify(userId: String) {
        mixpanel.identify(userId)
    }

    override fun alias(anonymousId: String, userId: String) {
        mixpanel.alias(anonymousId, userId)
    }

    override fun setUserProperties(properties: Map<String, Any>) {
        val updater = mixpanel.people
        properties.forEach { (key, value) -> updater.set(key, value) }
    }

    override fun flush() {
        mixpanel.flush()
    }
}
```

### Amplitude React Native
```typescript
import { init, track, identify, Identify } from '@amplitude/analytics-react-native';

export class AmplitudeService {
  private initialized = false;

  async init(apiKey: string, userId?: string) {
    await init(apiKey, userId, {
      flushIntervalMillis: 30000,
      flushQueueSize: 30,
      optOut: !ConsentManager.consentGiven,
    }).promise;
    this.initialized = true;
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.initialized || !ConsentManager.shouldTrack('analytics')) return;
    track(eventName, properties);
  }

  setUserId(id: string) {
    identify(new Identify().set('userId', id));
  }

  setUserProperty(name: string, value: string | number | boolean) {
    identify(new Identify().set(name, value));
  }
}
```

### Event Taxonomy Decision Tree
```
Event type?
├── User action → `{domain}_{verb}_{object}`
│   e.g., `cart_add_item`, `profile_edit_photo`, `search_submit_query`
│   Properties: object_id, object_type, result_count, duration_ms
├── Screen view → `screen_{name}`
│   e.g., `screen_home`, `screen_product_detail`, `screen_checkout_payment`
│   Properties: referrer, previous_screen, route
├── System event → `{domain}_{event}`
│   e.g., `session_start`, `push_received`, `sync_completed`
│   Properties: source, trigger, duration_ms, success
├── Error / non-fatal → `error_{domain}`
│   e.g., `error_network_timeout`, `error_api_validation`, `error_ui_render`
│   Properties: error_code, error_message, screen, retry_count
└── Performance → `perf_{metric}`
    e.g., `perf_screen_load`, `perf_api_latency`, `perf_db_query`
    Properties: duration_ms, byte_size, endpoint, cache_hit
```

### Event Naming Convention Comparison

| Convention | Example | Pros | Cons |
|------------|---------|------|------|
| `snake_case` | `cart_add_item` | Readable, standard in SQL/analytics DBs | Requires conversion for JS clients |
| `camelCase` | `cartAddItem` | Matches JS/TS code style | Awkward in SQL queries |
| `SCREAMING_SNAKE` | `CART_ADD_ITEM` | Clearly separates from code | Verbose, looks like constants |
| dot-notation | `cart.add.item` | Hierarchical, good for grouping | Special handling in BigQuery column names |
| `{object}:{action}` | `cart:add_item` | Clear domain boundary | Colon requires escaping in some systems |

Recommendation: `snake_case` for all analytics events — it's SQL-friendly, readable, and consistent across platforms.

### Anonymous Event Identity Strategy
```
User state at event time?
├── No user ID available → Log with device_id + session_id
│   device_id: vendor identifier (iOS) or Advertising ID (Android with ATT)
│   session_id: generated on each app launch, rotated on background >30min
├── User logs in mid-session → Call identify() with user_id
│   Server aliases anonymous session to user_id for stitching
├── User logs out → Reset analytics user ID
│   Generate new anonymous ID, do NOT reuse previous
└── Multi-account → Each login creates a new analytics identity chain
    Previous account events retain old user_id, no cross-account linking
```

## Analytics Implementation Checklist

- [ ] Provider SDK initialized before app root renders (async init)
- [ ] Event names use `snake_case`, max 40 chars
- [ ] Properties typed, max 25 per event, max 100 chars per string value
- [ ] No PII in any event property
- [ ] Screen views tracked via navigation listener (not manual)
- [ ] Consent management implemented respecting GDPR/CCPA categories
- [ ] ATT prompt (iOS 14.5+) with contextual timing
- [ ] Identity stitching on anonymous-to-authenticated transition
- [ ] User properties set on login/update
- [ ] Offline queue with bounded size (max 500), oldest-drop policy
- [ ] Event batching: 25-50 events or 60s interval
- [ ] Exponential backoff for failed flushes (2s→60s)
- [ ] Production/debug keys in separate configs
- [ ] Schema validation in CI
- [ ] Event schema changelog in tracking plan
- [ ] Data retention configured per provider
- [ ] User deletion API integrated
- [ ] Debug mode verifies events reach dashboard

### Analytics Implementation Anti-Patterns & Patterns

- **Tracking plan as an afterthought**: Without a documented tracking plan, events drift within weeks. Write the plan before instrumenting any code.
- **Server-side events duplicated as client events**: Payment confirmation fires both from server and client. Server events are authoritative for revenue; client events provide UX context.
- **Funnel analysis without time boundaries**: "Users who do X and Y" without time constraints includes users who did Y weeks after X. Set a session window (same session) or time window (7 days).
- **Sampling before understanding volume**: Many providers sample by default at the free tier. Know your sample rate — 10% of events means 10x confidence interval on metrics.
- **One massive tracking plan document**: A single doc for 500 events becomes unmanageable. Split by domain area (Orders, Accounts, Content) with separate event tables.
- **Not tracking property type information**: "event properties are strings" loses numeric/boolean type data in analytics warehouses. Enforce types with schema validation.
- **Events on every scroll/keystroke**: At scale, high-frequency events cause data quality issues and cost. Debounce scroll events (every 3s, not every frame). Batch input events.
- **Notification events without delivery status**: Track `push_sent`, `push_delivered`, `push_opened` — the gap between sent and delivered reveals delivery issues.

### Analytics Cost Optimization

Analytics costs grow linearly with tracked users. Strategies to manage cost:
- **Event sampling**: Sample low-value events (scroll, hover) at 10% rate. Keep high-value (purchase, login) at 100%. Adjust sample rate per event type in the tracking plan.
- **Property pruning**: Remove unused properties from events after 30 days. Each property adds to storage and query cost.
- **User property limits**: Firebase allows 500 user properties — stay under 200 to leave room for growth. Purge unused properties quarterly.
- **Data retention**: Set retention to 12 months for event data, 24 months for user properties. Raw event data older than retention is expensive to store and rarely queried.
- **Batch export**: Use BigQuery export (Firebase) or warehouse sync (Mixpanel/Amplitude) for deep analysis. Avoid expensive live queries on large datasets.
- **Cold storage**: Archive event data older than 6 months to cold storage (S3 Glacier, GCS Archive). Reheat only when needed for specific analysis.

### Diagnostic Decision Tree for Missing Events
```
Event not appearing in dashboard?
├── Was the SDK initialized? → Check initialization log, verify API key
├── Is consent granted? → Check consent manager status for the event category
├── Is the event being filtered? → Check debug/release build config, environment tag
├── Was the device offline? → Check offline queue flush on reconnection
├── Is the event name correct? → Verify exact string matches tracking plan
├── Are properties within limits? → Max 25 properties, values <100 chars, no PII filter
├── Is the user rate limited? → Check per-user event rate limits (100/s typical)
└── Is the provider experiencing an outage? → Check status dashboard
```

## References
  - references/analytics-privacy.md — Analytics Privacy
  - references/analytics-reporting.md — Analytics Dashboards and Reporting
  - references/analytics-sdks.md — Analytics SDKs
  - references/analytics-setup.md — Analytics Setup
  - references/event-tracking.md — Event Tracking & Privacy
  - references/mobile-analytics.md — Mobile Analytics Implementation
  - references/mobile-analytics-event-tracking.md — Mobile Analytics Event Tracking
  - references/mobile-analytics-privacy-compliance.md — Mobile Analytics Privacy and Compliance
  - references/analytics-fundamentals.md — Analytics Fundamentals
  - references/analytics-advanced.md — Advanced Analytics Patterns
  - references/analytics-debugging.md — Analytics Debugging & Testing

## Handoff
Hand off to mobile-crash-reporting skill when Crashlytics integration is needed, or to mobile-networking when custom analytics server endpoint is required.
