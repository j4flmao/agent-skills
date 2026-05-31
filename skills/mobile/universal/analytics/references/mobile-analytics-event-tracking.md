# Mobile Analytics Event Tracking

## Overview

Event tracking is the foundation of mobile analytics. Every user action, screen view, and system event generates data that feeds dashboards, funnels, retention reports, and product decisions. This reference covers the complete event tracking lifecycle: schema design, implementation patterns, automatic tracking, identity management, data quality, and troubleshooting.

## Event Taxonomy Design

### Naming Convention

Consistent event naming is the most important analytics investment. A well-designed taxonomy makes dashboards self-documenting and prevents analytics debt.

```
Pattern: {domain}_{action}_{object}
Example: cart_add_item

Alternative pattern: {screen}_{action}
Example: checkout_tap_pay
```

### Reserved Prefixes

| Prefix | Category | Example |
|--------|----------|---------|
| `screen_` | Screen views | `screen_profile_view` |
| `error_` | Non-fatal errors | `error_api_timeout` |
| `funnel_` | Conversion funnel | `funnel_checkout_step2` |
| `perf_` | Performance metrics | `perf_screen_load` |
| `action_` | User-initiated actions | `action_share_tap` |
| `state_` | Application state | `state_online_status` |

### Event Name Rules

- Max 40 characters
- `snake_case` format (lowercase with underscores)
- Start with domain prefix for automatic grouping
- No abbreviations unless documented in the tracking plan
- No dynamic segments (timestamps, user IDs, random values)
- Consistent verb tense: use past tense consistently or imperative consistently across all events
- Version suffixes only when schema changes: `cart_checkout_v2`

### Property Schema

Each event carries properties that provide context for analysis.

```yaml
event: cart_add_item
required_properties:
  - name: item_id
    type: string
    description: Product SKU or database ID
    max_length: 64
  - name: item_category
    type: string
    description: Top-level product category
    enum: [electronics, clothing, food, books]
  - name: quantity
    type: number
    description: Number of items added
    min: 1
    max: 999
  - name: price
    type: number
    description: Unit price in cents (integer)
    min: 0
  - name: currency
    type: string
    description: ISO 4217 currency code
    enum: [USD, EUR, GBP, JPY]
optional_properties:
  - name: coupon_code
    type: string
    description: Applied coupon if any
    max_length: 32
  - name: variant_sku
    type: string
    description: Specific variant (size, color, etc.)
    max_length: 64
```

### Property Rules

- Max 25 properties per event
- Keys: `snake_case`, max 40 characters
- String values: max 100 characters
- Typed: string, number, boolean only (no arrays, no nested objects)
- No PII: email, name, phone, government ID, exact address
- No unbounded values: never use timestamps, UUIDs, or free-text search terms as property values
- Enum constraints: prefer enum values over free text for categorization properties
- Null values: omit the property entirely rather than sending null — many analytics tools count null as a distinct value

## Automatic Screen Tracking

### Implementation by Platform

Screen tracking should be automatic, not manual. Hook into the navigation lifecycle system.

```swift
// iOS: UINavigationControllerDelegate
extension AnalyticsManager: UINavigationControllerDelegate {
    func navigationController(
        _ navigationController: UINavigationController,
        didShow viewController: UIViewController,
        animated: Bool
    ) {
        let screenName = String(describing: type(of: viewController))
        let route = viewController.routePattern ?? "/\(screenName)"
        AnalyticsService.trackScreen(name: screenName, route: route)
    }
}
```

```kotlin
// Android: NavController.OnDestinationChangedListener
navController.addOnDestinationChangedListener { _, destination, arguments ->
    val screenName = destination.label?.toString() ?: destination.route
    val route = destination.route ?: screenName
    AnalyticsService.trackScreen(name = screenName, route = route)
}
```

```typescript
// React Native: React Navigation state listener
useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
        const route = e.data.state.routes[e.data.state.index];
        AnalyticsService.trackScreen({
            name: route.name,
            route: route.path ?? route.name,
            params: sanitizeForAnalytics(route.params),
        });
    });
    return unsubscribe;
}, [navigation]);
```

```dart
// Flutter: Navigator observer
class AnalyticsNavigatorObserver extends NavigatorObserver {
    @override
    void didPush(Route route, Route? previousRoute) {
        final screenName = route.settings.name ?? 'Unknown';
        AnalyticsService.trackScreen(name: screenName);
    }
}
```

### Screen View Event Properties

```
screen_view
├── screen_name: "Product Detail"       // Human-readable, localized
├── screen_class: "ProductDetailScreen"  // Class/component name
├── screen_route: "/product/:id"         // Route pattern (not the actual URL)
├── referrer_screen: "Search Results"    // Previous screen (for navigation path analysis)
├── referrer_class: "SearchResultsScreen"
├── is_initial_screen: false             // True if this is the first screen shown
├── session_id: "abc123"                 // Auto-generated session identifier
└── load_duration_ms: 450                // Time from navigation start to screen ready
```

### Screen Tracking Checklist

- Navigation hook fires on push, pop, and tab change
- Screen name is human-readable, not a developer class name
- Route pattern uses parameterized form (`/user/:id` not `/user/42`)
- Referrer tracking captures the previous screen for path analysis
- Screen load duration is measured from navigation start to content rendered
- Splash and loading screens are excluded from screen tracking
- Modal and bottom sheet presentations are tracked as distinct screen events with a screen type property
- Deep link destinations are tracked with the original deep link URL as an additional property

## Custom Event Implementation

### AnalyticsService Facade Pattern

All feature code calls a single facade. Never call provider SDKs directly from feature code.

```typescript
// TypeScript AnalyticsService facade
class AnalyticsService {
    private providers: AnalyticsProvider[];
    private consentManager: ConsentManager;
    private sessionManager: SessionManager;

    track(event: AnalyticsEvent): void {
        if (!this.consentManager.isAllowed(event.category)) return;

        const enriched: AnalyticsEvent = {
            ...event,
            properties: {
                ...event.properties,
                ...this.sessionManager.getSessionProperties(),
                device_type: getDeviceType(),
                app_version: getAppVersion(),
            },
        };

        for (const provider of this.providers) {
            try {
                provider.track(enriched);
            } catch (error) {
                console.error(`Analytics provider failed: ${provider.name}`, error);
            }
        }
    }

    trackScreen(name: string, route: string): void {
        this.track({
            name: 'screen_view',
            category: AnalyticsCategory.essential,
            properties: { screen_name: name, screen_route: route },
        });
    }
}
```

### Event Categories for Consent

```typescript
enum AnalyticsCategory {
    essential = 'essential',       // Always tracked: crashes, app lifecycle
    functional = 'functional',     // User preferences, feature usage
    analytics = 'analytics',       // Behavioral tracking, product analytics
    personalization = 'personalization', // Advertising, content recommendation
}

interface AnalyticsEvent {
    name: string;
    category: AnalyticsCategory;
    properties: Record<string, string | number | boolean | undefined>;
    timestamp?: number;
    sessionId?: string;
}
```

### Event Types by Category

```yaml
essential:
  - app_launch
  - app_background
  - app_crash
  - screen_view
  - error_non_fatal

functional:
  - setting_changed
  - notification_enabled
  - notification_disabled
  - feature_toggle_on
  - feature_toggle_off

analytics:
  - cart_add_item
  - cart_remove_item
  - checkout_started
  - checkout_completed
  - search_performed
  - search_result_tapped
  - profile_updated
  - content_shared

personalization:
  - ad_impression
  - ad_tapped
  - recommendation_clicked
  - personalized_content_viewed
```

### Event Fire Patterns

```swift
// Good: typed event constants
extension AnalyticsEvent {
    static func cartAddItem(itemId: String, category: String, price: Int) -> AnalyticsEvent {
        AnalyticsEvent(
            name: "cart_add_item",
            category: .analytics,
            properties: [
                "item_id": itemId,
                "item_category": category,
                "price": price,
            ]
        )
    }
}

// Usage: clean, type-safe, discoverable
AnalyticsService.shared.track(.cartAddItem(itemId: "SKU123", category: "electronics", price: 2999))
```

### Event Batching and Offline Queue

```typescript
class EventBatcher {
    private queue: AnalyticsEvent[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private readonly BATCH_SIZE = 25;
    private readonly FLUSH_INTERVAL_MS = 60000;
    private readonly MAX_QUEUE_SIZE = 500;

    constructor() {
        this.flushTimer = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
    }

    enqueue(event: AnalyticsEvent): void {
        this.queue.push(event);
        if (this.queue.length >= this.BATCH_SIZE) {
            this.flush();
        }
        if (this.queue.length > this.MAX_QUEUE_SIZE) {
            const dropped = this.queue.splice(0, this.queue.length - this.MAX_QUEUE_SIZE);
            console.warn(`Dropped ${dropped.length} oldest events: queue cap reached`);
        }
    }

    async flush(): Promise<void> {
        if (this.queue.length === 0) return;
        const batch = this.queue.splice(0, this.BATCH_SIZE);
        try {
            await this.sendBatch(batch);
        } catch (error) {
            // Re-queue on failure (exponential backoff handled by caller)
            this.queue.unshift(...batch);
            throw error;
        }
    }

    private async sendBatch(batch: AnalyticsEvent[]): Promise<void> {
        const payload = JSON.stringify({ events: batch });
        await fetch('https://analytics.example.com/events', {
            method: 'POST',
            body: payload,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
```

## Identity Management

### Identity Lifecycle

```yaml
phases:
  anonymous:
    - Generate anonymous UUID on first launch
    - Store in secure local storage
    - All events tagged with anonymous ID
    - Analytics provider in anonymous mode

  identified:
    - User logs in or signs up
    - Call provider.identify(authenticatedUserId)
    - Call provider.alias(anonymousId, authenticatedUserId) for identity stitching
    - Set all known user properties
    - Previous anonymous events are linked to the new identity

  transition:
    - App data wipe or reinstall
    - Generate new anonymous ID
    - No link to previous anonymous session (privacy by design)
    - If user logs in again, identity stitching recovers history

  deletion:
    - User requests data deletion
    - Call provider.deleteUser()
    - Generate new anonymous ID
    - All historical data is deleted per provider retention policy
```

### Identity Stitching Implementation

```kotlin
class IdentityManager(
    private val analyticsProviders: List<AnalyticsProvider>,
    private val storage: SecureStorage
) {
    private val anonymousId: String = storage.getOrGenerateAnonymousId()

    fun identifyUser(authenticatedUserId: String) {
        for (provider in analyticsProviders) {
            // Link anonymous session to authenticated user
            provider.alias(anonymousId, authenticatedUserId)
            // Set primary identity going forward
            provider.identify(authenticatedUserId)
        }
        // Store mapping for future sessions
        storage.setAuthenticatedUserId(authenticatedUserId)
    }

    fun resetIdentity() {
        val newAnonymousId = generateUUID()
        storage.setAnonymousId(newAnonymousId)
        storage.clearAuthenticatedUserId()
        for (provider in analyticsProviders) {
            provider.reset()
        }
    }
}
```

### User Properties

Set at login and on change. These persist across sessions and enable cohort analysis.

```typescript
interface UserProperties {
    plan_type: 'free' | 'starter' | 'pro' | 'enterprise';
    subscription_status: 'active' | 'trialing' | 'expired' | 'cancelled';
    days_since_install: number;
    push_enabled: boolean;
    language: string;          // ISO 639-1
    region: string;            // ISO 3166-1 alpha-2
    ab_test_cohort: string;    // Experiment variant assignment
    referral_source?: string;  // How user discovered the app
    total_purchases: number;
    last_purchase_date?: string; // ISO 8601 date
}
```

### User Property Best Practices

- Max 500 user properties in Firebase (unlimited in Mixpanel/Amplitude)
- Set all known properties at login for baseline cohort analysis
- Update properties on change events (subscription upgrade, plan change)
- Never store PII as user property names or values
- Use enum values for categorization properties
- Avoid high-cardinality properties (user IDs, timestamps, search queries)
- Document user property schema in the tracking plan alongside event schemas

## Funnel Tracking

### Funnel Event Pattern

```
funnel_{name}_{step_number}
Example: funnel_checkout_01
```

### Funnel Implementation

```swift
struct CheckoutFunnel {
    static func trackStep(_ step: CheckoutStep) {
        AnalyticsService.shared.track(
            AnalyticsEvent(
                name: "funnel_checkout_0\(step.rawValue)",
                category: .analytics,
                properties: [
                    "step_name": step.description,
                    "step_number": step.rawValue,
                    "cart_total": CartManager.shared.total,
                    "item_count": CartManager.shared.itemCount,
                ]
            )
        )
    }

    static func trackAbandonment(at step: CheckoutStep, reason: String?) {
        AnalyticsService.shared.track(
            AnalyticsEvent(
                name: "funnel_checkout_abandon",
                category: .analytics,
                properties: [
                    "abandoned_at_step": step.rawValue,
                    "abandoned_at_step_name": step.description,
                    "reason": reason ?? "unknown",
                    "session_duration_seconds": SessionManager.shared.duration,
                ]
            )
        )
    }
}

enum CheckoutStep: Int {
    case cartReview = 1
    case shippingAddress = 2
    case paymentMethod = 3
    case orderConfirmation = 4
}
```

### Funnel Analysis Setup

For each funnel, ensure the analytics provider has:
- Funnel definition with ordered steps
- Conversion window (e.g., 7 days from step 1 to final step)
- Abandonment tracking at each step with reason
- Segment breakdowns by platform, device, region, user property
- Alert on funnel conversion drop >10% week-over-week

## Event Data Quality

### Schema Validation

```typescript
class EventSchemaValidator {
    private schemas: Map<string, EventSchema> = new Map();

    registerSchema(eventName: string, schema: EventSchema): void {
        this.schemas.set(eventName, schema);
    }

    validate(event: AnalyticsEvent): ValidationResult {
        const schema = this.schemas.get(event.name);
        if (!schema) {
            return { valid: false, errors: [`No schema registered for event: ${event.name}`] };
        }

        const errors: string[] = [];

        // Check required properties
        for (const prop of schema.required) {
            if (!(prop.name in event.properties)) {
                errors.push(`Missing required property: ${prop.name}`);
            } else if (typeof event.properties[prop.name] !== prop.type) {
                errors.push(`Property ${prop.name} should be ${prop.type}`);
            }
        }

        // Check property count
        if (Object.keys(event.properties).length > 25) {
            errors.push(`Event has ${Object.keys(event.properties).length} properties (max 25)`);
        }

        // Check string lengths
        for (const [key, value] of Object.entries(event.properties)) {
            if (typeof value === 'string' && value.length > 100) {
                errors.push(`Property ${key} value exceeds 100 characters`);
            }
        }

        return { valid: errors.length === 0, errors };
    }
}
```

### Data Quality Monitoring

```yaml
daily_checks:
  - event_volume_anomaly: "Alert if event count deviates >50% from 7-day average"
  - null_property_ratio: "Alert if any property is null in >5% of events"
  - schema_validation_failures: "Alert if >1% of events fail schema validation"
  - missing_required_properties: "Alert if any required property is missing from >2% of events"
  - unexpected_values: "Alert if enum property has values outside defined enum set"

weekly_checks:
  - event_funnel_conversion: "Compare funnel conversion rates week-over-week"
  - user_property_distribution: "Verify user property distributions haven't shifted unexpectedly"
  - screen_tracking_coverage: "Verify all screens are still being tracked after navigation changes"
  - identity_stitching_success: "Verify anonymous-to-identified user stitching rate is >95%"

monthly_checks:
  - tracking_plan_audit: "Review event schemas against actual fired events"
  - unused_events_cleanup: "Identify events not used in any dashboard or report for 90 days"
  - consent_compliance_audit: "Verify consent category assignments still match current behavior"
```

### Common Data Quality Issues

- **Event name typos**: `user_loggedin` vs `user_logged_in` creates two separate events. Enforce with a centralized event name enum.
- **Property type mismatch**: Sending `price` as a string `"29.99"` instead of number `29.99` breaks arithmetic in dashboards. Validate types in the facade.
- **Spontaneous property names**: Every developer inventing new property names creates analytics debris. Require property registration in the tracking plan.
- **Case sensitivity**: Mixpanel is case-sensitive for event names, Firebase is not. Always use lowercase `snake_case` to avoid confusion.
- **Duplicate events**: A button that fires an event on both `touchstart` and `click` fires two events per tap. Debounce event fires for the same action.
- **Session timeout misconfiguration**: If the session timeout is too short (e.g., 5 minutes), users who switch apps briefly create many short sessions, skewing session count and retention.
- **Unintended event from background state**: Apps that fire events when receiving push notifications in the background inflate event counts. Check `UIApplicationState` before firing user-facing events.

## Event Implementation Patterns by Platform

### iOS (Swift)

```swift
import FirebaseAnalytics
import Mixpanel

protocol AnalyticsProvider {
    func track(event: AnalyticsEvent)
    func identify(userId: String)
    func alias(anonymousId: String, authenticatedId: String)
    func reset()
    func setUserProperty(key: String, value: Any?)
}

final class FirebaseProvider: AnalyticsProvider {
    func track(event: AnalyticsEvent) {
        Analytics.logEvent(event.name, parameters: event.properties as [String: Any])
    }

    func identify(userId: String) {
        Analytics.setUserID(userId)
    }

    func alias(anonymousId: String, authenticatedId: String) {
        // Firebase handles identity stitching automatically via setUserID
    }

    func reset() {
        Analytics.setUserID(nil)
    }

    func setUserProperty(key: String, value: Any?) {
        Analytics.setUserPropertyString(value as? String, forName: key)
    }
}

final class MixpanelProvider: AnalyticsProvider {
    private let mixpanel = Mixpanel.mainInstance()

    func track(event: AnalyticsEvent) {
        mixpanel.track(event: event.name, properties: event.properties)
    }

    func identify(userId: String) {
        mixpanel.people.distinctId = userId
    }

    func alias(anonymousId: String, authenticatedId: String) {
        mixpanel.createAlias(authenticatedId, forDistinctID: anonymousId)
    }

    func reset() {
        mixpanel.reset()
    }

    func setUserProperty(key: String, value: Any?) {
        if let value = value {
            mixpanel.people.set(property: key, to: value)
        } else {
            mixpanel.people.unset(property: key)
        }
    }
}
```

### Android (Kotlin)

```kotlin
class AnalyticsService(private val providers: List<AnalyticsProvider>) {
    fun track(event: AnalyticsEvent) {
        if (!consentManager.isAllowed(event.category)) return
        val enriched = event.copy(
            properties = event.properties + mapOf(
                "session_id" to sessionManager.sessionId,
                "app_version" to BuildConfig.VERSION_NAME,
                "os_version" to Build.VERSION.RELEASE,
                "device_model" to Build.MODEL,
            )
        )
        providers.forEach { it.track(enriched) }
    }

    fun setUserProperties(props: Map<String, Any?>) {
        providers.forEach { provider ->
            props.forEach { (key, value) -> provider.setUserProperty(key, value) }
        }
    }
}
```

### Flutter (Dart)

```dart
class AnalyticsService {
    static final AnalyticsService _instance = AnalyticsService._();
    factory AnalyticsService() => _instance;
    AnalyticsService._();

    final List<AnalyticsProvider> _providers = [];
    final ConsentManager _consent = ConsentManager();

    void addProvider(AnalyticsProvider provider) => _providers.add(provider);

    void track(AnalyticsEvent event) {
        if (!_consent.isAllowed(event.category)) return;
        final enriched = event.copyWith(
            properties: event.properties + _sessionProperties(),
        );
        for (final provider in _providers) {
            provider.track(enriched);
        }
    }
}
```

### React Native (TypeScript)

```typescript
import analytics from '@react-native-firebase/analytics';
import { Mixpanel } from 'mixpanel-react-native';

class FirebaseProvider implements AnalyticsProvider {
    async track(event: AnalyticsEvent): Promise<void> {
        await analytics().logEvent(event.name, event.properties as Record<string, any>);
    }

    async identify(userId: string): Promise<void> {
        await analytics().setUserId(userId);
    }

    async setUserProperty(key: string, value: any): Promise<void> {
        await analytics().setUserProperty(key, value);
    }
}
```

## Event Testing

### Unit Testing Analytics

```swift
class AnalyticsServiceTests: XCTestCase {
    func testEventIsTracked() {
        let mockProvider = MockAnalyticsProvider()
        let service = AnalyticsService(providers: [mockProvider], consentManager: MockConsentManager())

        service.track(AnalyticsEvent(name: "test_event", category: .analytics, properties: ["key": "value"]))

        XCTAssertEqual(mockProvider.trackedEvents.count, 1)
        XCTAssertEqual(mockProvider.trackedEvents.first?.name, "test_event")
        XCTAssertEqual(mockProvider.trackedEvents.first?.properties["key"] as? String, "value")
    }

    func testConsentBlocksTracking() {
        let mockProvider = MockAnalyticsProvider()
        let consentManager = MockConsentManager(allowed: false)
        let service = AnalyticsService(providers: [mockProvider], consentManager: consentManager)

        service.track(AnalyticsEvent(name: "analytics_event", category: .analytics, properties: [:]))

        XCTAssertTrue(mockProvider.trackedEvents.isEmpty)
    }

    func testEssentialEventsAlwaysTracked() {
        let mockProvider = MockAnalyticsProvider()
        let consentManager = MockConsentManager(allowed: false)
        let service = AnalyticsService(providers: [mockProvider], consentManager: consentManager)

        service.track(AnalyticsEvent(name: "app_crash", category: .essential, properties: [:]))

        XCTAssertEqual(mockProvider.trackedEvents.count, 1)
    }
}
```

### Integration Testing for Screen Tracking

```typescript
describe('Screen Tracking', () => {
    it('tracks screen view on navigation', async () => {
        const mockAnalytics = jest.fn();
        const { getByText } = render(
            <AnalyticsProvider onTrack={mockAnalytics}>
                <NavigationContainer>
                    <Stack.Navigator>
                        <Stack.Screen name="Home" component={HomeScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </AnalyticsProvider>
        );

        await waitFor(() => {
            expect(mockAnalytics).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'screen_view',
                    properties: expect.objectContaining({
                        screen_name: 'Home',
                    }),
                })
            );
        });
    });
});
```

## Event Troubleshooting

### Debug Tooling

```yaml
firebase_debug_view:
  platform: "Android and iOS"
  setup: "Enable debug mode via ADB or Xcode scheme"
  usage: "Events appear in real-time in Firebase DebugView dashboard"
  limitations: "Only shows events from devices in debug mode"

mixpanel_live_view:
  platform: "All"
  usage: "Real-time event stream in Mixpanel dashboard"
  filtering: "Filter by event name, user property, device type"

amplitude_event_explorer:
  platform: "All"
  usage: "Raw event data explorer with property inspection"
  export: "Export event data to CSV for offline analysis"

network_proxy:
  tools: ["Charles Proxy", "mitmproxy", "Proxyman"]
  usage: "Inspect analytics network requests for payload verification"
  pattern: "Filter by analytics endpoint URL to isolate analytics traffic"
```

### Common Event Problems

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Event not appearing in dashboard | Event not fired, consent blocking, or wrong provider configured | Check consent status, verify provider initialization order, add logging in facade |
| Screen view not tracked | Navigation hook not connected or screen not using navigation component | Verify navigation observer is attached, check if screen is a modal/presentation |
| Wrong property values | Property enrichment overriding custom values, or stale cached data | Check enrichment order (custom properties should override defaults), verify property keys match |
| Duplicate events | Multiple navigation hooks, or event fired on both press and release | Debounce navigation callbacks, use single hook for all navigation transitions |
| Session count way too high | Session timeout too short, or app backgrounding on every phone call/match | Set session timeout to 30+ minutes, check for OS-level interruptions |
| User count higher than expected | No identity stitching, each anonymous session creates a new user | Implement identify/alias flow on login, verify identity stitching in provider |
| Events delayed by hours | Offline queue not flushing on app background, network issues | Force flush in applicationWillResignActive, check connectivity before flush |
| Event count way too high | Background events not filtered, or events fired on every scroll/carousel change | Filter by app state, throttle high-frequency events to once per session |

## Tracking Plan Template

The tracking plan is the source of truth for all events in the application. It should be reviewed and updated with every feature release.

```yaml
tracking_plan:
  version: "2.1.0"
  last_updated: "2026-05-28"
  owner: "Product Analytics Team"
  
  events:
    - name: cart_add_item
      description: "Fired when a user adds an item to their shopping cart"
      category: analytics
      since_version: "1.0.0"
      properties:
        - name: item_id
          type: string
          required: true
          description: "Product SKU"
        - name: quantity
          type: number
          required: true
          description: "Number of items added"
        - name: price_cents
          type: number
          required: true
          description: "Unit price in cents"
  
  user_properties:
    - name: plan_type
      type: string
      enum: [free, pro, enterprise]
      description: "Current subscription plan"
      set_on: login, subscription_change

  funnels:
    - name: checkout
      steps:
        - step: 1
          name: cart_review
          event: funnel_checkout_01
        - step: 2
          name: shipping
          event: funnel_checkout_02
        - step: 3
          name: payment
          event: funnel_checkout_03
        - step: 4
          name: confirmation
          event: funnel_checkout_04
```

## References

- analytics-privacy.md — Analytics Privacy and Data Protection
- analytics-sdks.md — Analytics SDK Reference
- event-tracking.md — Event Tracking Implementation
- mobile-analytics.md — Full Mobile Analytics Guide
- mobile-analytics-privacy-compliance.md — Privacy and Compliance for Analytics
