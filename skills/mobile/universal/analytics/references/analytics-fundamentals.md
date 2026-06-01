# Analytics Fundamentals

## What is Mobile Analytics?

Mobile app analytics is the systematic collection, measurement, and analysis of user behavior within a mobile application. It answers: what users do, when they do it, how often, and where they drop off.

## Core Concepts

### Event
A single user action or system occurrence. Each event has a name, timestamp, and set of properties.

### User Property
Attributes attached to a user identity that persist across sessions (e.g., plan type, signup date, region).

### Session
A period of continuous app usage. Usually defined as foreground time with a timeout (default 30 minutes inactivity ends session).

### Screen View
A specialized event type representing a screen appearing. Tracked automatically via navigation hooks.

### Funnel
A sequence of events measuring conversion between steps (e.g., Add to Cart -> Checkout -> Payment).

### Retention
Measurement of users returning after their first visit (Day 1, Day 7, Day 30 retention).

## Event Taxonomy Patterns

### Standard Event Naming
```
{domain}_{action}_{object}
Example: cart_add_item, profile_edit_name, checkout_payment_complete
```

### Reserved Prefixes
```
screen_   — Screen view events (auto-tracked)
error_    — Non-fatal errors
funnel_   — Funnel step events
perf_     — Performance metrics
```

### Reserved Properties
```
event_name         — String (unique per event definition)
event_timestamp    — ISO 8601 timestamp
screen_name        — Human-readable screen identifier
session_id         — UUID per app session
app_version        — e.g., "1.2.3"
os_version         — e.g., "17.0"
device_model       — e.g., "iPhone 15 Pro"
```

## SDK Initialization

### Timing
Analytics SDK must initialize before the first screen renders to capture initial screen_view events.

### Init Patterns
1. **Sync init** — `FirebaseApp.configure()` blocks briefly, acceptable
2. **Async init** — Init on background thread, events queued until ready
3. **Lazy init** — Init on first user interaction (privacy-first, may miss early events)

### Configuration Fields
- API key / DSN
- Environment (production/staging/debug)
- Flush interval (default 30-60s)
- Batch size (25-50 events)
- Opt-out / consent state
- Max queue size (500 events)

## Consent Management

### GDPR Categories
1. **Essential** — App lifecycle, crashes — always tracked, no consent needed
2. **Functional** — User preferences, feature usage — opt-out
3. **Analytics** — Behavioral tracking — opt-in required (GDPR)
4. **Personalization** — Advertising, content recommendation — opt-in required

### Consent Flow
1. First launch -> check consent status
2. If not decided -> show consent dialog with categories
3. User makes choices -> persist to SharedPreferences/UserDefaults
4. Configure analytics provider based on choices
5. Re-check on each app update (if tracking plan changed)

## Identity Management

### Anonymous User
- Device ID or advertising ID until user signs up
- Firebase: Analytics app instance ID
- Mixpanel: auto-generated distinct_id
- Amplitude: device_id

### Identified User
- Stable user ID (server-generated, not email)
- Set on login: `Analytics.setUserId("user_123")`
- Reset on logout: `Analytics.setUserId(null)`

### Identity Stitching
When anonymous user signs up:
1. Call `provider.alias(anonymousId, userId)` to link events
2. Set user ID to the new identifier
3. Set known user properties

## Debugging Analytics

1. **Provider debug view** — Firebase DebugView, Mixpanel Live View
2. **Device logs** — Look for `Analytics` tag in logcat, `os_log` for iOS
3. **Network inspector** — Charles Proxy / Proxyman to inspect event payloads
4. **Integration test** — Mock the provider, assert events fire with correct schema
5. **Local validation** — Validate event name length, property count, no PII before sending
