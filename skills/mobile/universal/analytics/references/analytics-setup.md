# Analytics Setup

## Provider Initialization

### Firebase Analytics
```kotlin
// Android — auto-initialized via google-services.json
Firebase.analytics.logEvent("app_open") { param("source", "icon") }

// iOS
FirebaseApp.configure()
Analytics.logEvent("app_open", parameters: ["source": "icon" as NSObject])
```

### Mixpanel
```kotlin
val mixpanel = MixpanelAPI.getInstance(context, "PROJECT_TOKEN")
mixpanel.track("Event Name", JSONObject(mapOf("key" to "value")))
```

### Amplitude
```kotlin
Amplitude.getInstance().initialize(context, "API_KEY")
Amplitude.getInstance().logEvent("Event Name", JSONObject(mapOf("key" to "value")))
```

## Event Schema

```kotlin
// Single AnalyticsService facade
class AnalyticsService(private val providers: List<AnalyticsProvider>) {
  fun track(event: AnalyticsEvent) {
    if (!consentManager.isAllowed(event.category)) return
    providers.forEach { it.track(event.name, event.properties) }
  }

  fun trackScreenView(screenName: String, screenClass: String) {
    track(AnalyticsEvent(
      name = "screen_view",
      category = EventCategory.AUTOMATIC,
      properties = mapOf(
        "screen_name" to screenName,
        "screen_class" to screenClass
      )
    ))
  }
}

data class AnalyticsEvent(
  val name: String, // snake_case, ≤40 chars
  val category: EventCategory,
  val properties: Map<String, Any> = emptyMap() // ≤25 keys
)

enum class EventCategory { AUTOMATIC, USER_ACTION, ERROR, PERFORMANCE, FUNNEL }
```

## Screen View Auto-Tracking (Android — Navigation)

```kotlin
navController.addOnDestinationChangedListener { _, destination, _ ->
  analyticsService.trackScreenView(
    screenName = destination.route ?: "unknown",
    screenClass = destination.displayName
  )
}
```

## Screen View Auto-Tracking (iOS — UINavigationController)

```swift
class TrackingNavigationController: UINavigationController {
  override func pushViewController(_ viewController: UIViewController, animated: Bool) {
    analytics.trackScreenView(
      screenName: viewController.title ?? "",
      screenClass: String(describing: type(of: viewController))
    )
    super.pushViewController(viewController, animated: animated)
  }
}
```

## User Properties

```kotlin
analyticsService.setUserProperty("plan_type", "premium")
analyticsService.setUserProperty("days_since_install", 42)
analyticsService.setUserProperty("push_enabled", true)

// Never set PII properties
analyticsService.setUserProperty("email", user.email) // ❌ VIOLATION
```

## Event Naming Convention

| Pattern | Example |
|---------|---------|
| `screen_action_object` | `profile_edit_name` |
| `object_action` | `cart_checkout` |
| `action` | `logout` |
| `error_type` | `error_api_timeout` |
| `funnel_step` | `funnel_signup_email_entered` |
