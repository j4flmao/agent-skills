# Mobile Analytics Implementation

## Event Tracking

```swift
import Foundation

struct AnalyticsEvent {
    let name: String
    let properties: [String: Any]
    let timestamp: Date

    init(name: String, properties: [String: Any] = [:]) {
        self.name = name
        self.properties = properties
        self.timestamp = Date()
    }
}

protocol AnalyticsProvider {
    func track(event: AnalyticsEvent)
    func identify(userId: String, traits: [String: Any])
    func reset()
}

class AnalyticsManager {
    static let shared = AnalyticsManager()
    private var providers: [AnalyticsProvider] = []

    func registerProvider(_ provider: AnalyticsProvider) {
        providers.append(provider)
    }

    func track(_ name: String, properties: [String: Any] = [:]) {
        let event = AnalyticsEvent(name: name, properties: properties)
        providers.forEach { $0.track(event: event) }
    }

    func identify(userId: String, traits: [String: Any] = [:]) {
        providers.forEach { $0.identify(userId: userId, traits: traits) }
    }

    func screen(name: String, properties: [String: Any] = [:]) {
        var props = properties
        props["screen_name"] = name
        track("screen_view", properties: props)
    }
}
```

## User Property Tracking

```swift
class UserAnalyticsService {
    private let analytics = AnalyticsManager.shared

    func trackUserSignup(email: String, method: String) {
        analytics.track("user_signed_up", properties: [
            "email_provider": email.components(separatedBy: "@").last ?? "unknown",
            "signup_method": method,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
        ])
    }

    func trackSubscription(plan: String, price: Decimal, currency: String) {
        analytics.track("subscription_started", properties: [
            "plan_name": plan,
            "price": price,
            "currency": currency,
            "trial": false,
        ])
    }

    func trackFeatureUsage(feature: String, duration: TimeInterval) {
        analytics.track("feature_used", properties: [
            "feature_name": feature,
            "duration_seconds": duration,
        ])
    }

    func trackError(error: Error, context: String) {
        analytics.track("error_occured", properties: [
            "error_message": error.localizedDescription,
            "error_domain": (error as NSError).domain,
            "error_code": (error as NSError).code,
            "context": context,
        ])
    }
}
```

## Key Points

- Register multiple analytics providers (Amplitude, Mixpanel, Firebase)
- Use event taxonomy with consistent naming
- Track screen views automatically via swizzling
- Implement user identity stitching across sessions
- Use batched events for network efficiency
- Respect user privacy with opt-out mechanisms
- Track feature adoption and retention metrics
- Monitor event volume and rate limits
- Use A/B testing integration for experiments
- Implement offline event queuing and retry
- Sanitize PII before sending to analytics
- Test analytics events in CI pipeline
