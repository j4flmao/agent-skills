# Analytics SDKs

## Provider Initialization

### Firebase Analytics

```kotlin
// Android — Firebase auto-initializes via google-services.json
// Place google-services.json in app/ directory
// No manual init needed for basic tracking
class FirebaseAnalyticsProvider(private val context: Context) : AnalyticsProvider {
    private val firebase = Firebase.analytics

    override fun track(event: AnalyticsEvent) {
        val params = Bundle().apply {
            event.properties.forEach { (key, value) ->
                when (value) {
                    is String -> putString(key, value)
                    is Int -> putInt(key, value)
                    is Long -> putLong(key, value)
                    is Double -> putDouble(key, value)
                    is Boolean -> putBoolean(key, value)
                }
            }
        }
        firebase.logEvent(event.name, params)
    }

    override fun setUserId(userId: String) {
        firebase.setUserId(userId)
    }

    override fun setUserProperty(key: String, value: String) {
        firebase.setUserProperty(key, value)
    }

    override fun setOptOut(optOut: Boolean) {
        firebase.setAnalyticsCollectionEnabled(!optOut)
    }
}
```

```swift
// iOS — FirebaseApp.configure() in AppDelegate
import FirebaseAnalytics

class FirebaseAnalyticsProvider: AnalyticsProvider {
    init() {
        FirebaseApp.configure()
    }

    func track(event: AnalyticsEvent) {
        var params = [String: Any]()
        event.properties.forEach { params[$0] = $1 }
        Analytics.logEvent(event.name, parameters: params)
    }

    func setUserId(_ id: String) {
        Analytics.setUserID(id)
    }

    func setUserProperty(_ key: String, value: String) {
        Analytics.setUserProperty(value, forName: key)
    }

    func setOptOut(_ optOut: Bool) {
        Analytics.setAnalyticsCollectionEnabled(!optOut)
    }
}
```

### Mixpanel

```kotlin
// Android
class MixpanelProvider(context: Context) : AnalyticsProvider {
    private val mixpanel = MixpanelAPI.getInstance(context, "MIXPANEL_TOKEN")

    override fun track(event: AnalyticsEvent) {
        val props = JSONObject(event.properties.toMap())
        mixpanel.track(event.name, props)
    }

    override fun setUserId(userId: String) {
        mixpanel.identify(userId)
    }

    override fun setUserProperty(key: String, value: String) {
        val props = JSONObject().apply { put(key, value) }
        mixpanel.people.set(props)
    }

    override fun setOptOut(optOut: Boolean) {
        if (optOut) mixpanel.optOutTracking()
        else mixpanel.optInTracking()
    }
}
```

```swift
// iOS
import Mixpanel

class MixpanelProvider: AnalyticsProvider {
    private let mixpanel = Mixpanel.mainInstance()

    init(token: String) {
        mixpanel = Mixpanel.initialize(token: token)
    }

    func track(event: AnalyticsEvent) {
        mixpanel.track(event: event.name, properties: event.properties)
    }
}
```

### Amplitude

```kotlin
// Android
class AmplitudeProvider(context: Context) : AnalyticsProvider {
    init {
        Amplitude.getInstance().initialize(context, "AMPLITUDE_API_KEY")
    }

    override fun track(event: AnalyticsEvent) {
        val props = JSONObject(event.properties.toMap())
        Amplitude.getInstance().logEvent(event.name, props)
    }

    override fun setUserId(userId: String) {
        Amplitude.getInstance().setUserId(userId)
    }
}
```

## Event Schema

```kotlin
// AnalyticsService facade — single entry point for all tracking
class AnalyticsService(
    private val providers: List<AnalyticsProvider>,
    private val consentManager: ConsentManager
) {
    private val sessionData: Map<String, Any> by lazy { loadSessionData() }

    fun track(event: AnalyticsEvent) {
        if (!consentManager.isAllowed(event.category)) return
        val enriched = event.copy(
            properties = event.properties + sessionData + mapOf(
                "timestamp" to System.currentTimeMillis(),
                "session_id" to sessionId,
                "app_version" to BuildConfig.VERSION_NAME
            )
        )
        providers.forEach { it.track(enriched) }
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

    fun setUserId(userId: String) {
        providers.forEach { it.setUserId(userId) }
    }

    fun setUserProperty(key: String, value: String) {
        providers.forEach { it.setUserProperty(key, value) }
    }

    fun setOptOut(optOut: Boolean) {
        providers.forEach { it.setOptOut(optOut) }
    }

    fun resetUserId() {
        providers.forEach { it.setUserId("") }
    }

    private fun loadSessionData(): Map<String, Any> = mapOf(
        "os" to System.getProperty("os.version") ?: "unknown",
        "device" to Build.MODEL,
        "language" to Locale.getDefault().toLanguageTag(),
        "timezone" to TimeZone.getDefault().id
    )
}

// Event model
data class AnalyticsEvent(
    val name: String,                         // snake_case, ≤40 chars
    val category: EventCategory,
    val properties: Map<String, Any> = emptyMap(), // ≤25 keys
    val value: Double? = null                 // Optional numeric value
)

enum class EventCategory { AUTOMATIC, USER_ACTION, ERROR, PERFORMANCE, FUNNEL }

// Provider interface
interface AnalyticsProvider {
    fun track(event: AnalyticsEvent)
    fun setUserId(userId: String)
    fun setUserProperty(key: String, value: String)
    fun setOptOut(optOut: Boolean)
}
```

## Screen View Auto-Tracking

```kotlin
// Android — Jetpack Navigation listener
class AnalyticsNavigationListener(
    private val analyticsService: AnalyticsService
) : NavController.OnDestinationChangedListener {
    override fun onDestinationChanged(
        controller: NavController,
        destination: NavDestination,
        arguments: Bundle?
    ) {
        analyticsService.trackScreenView(
            screenName = destination.label?.toString() ?: destination.route ?: "unknown",
            screenClass = destination.displayName ?: destination.javaClass.simpleName
        )
    }
}

// Register: navController.addOnDestinationChangedListener(listener)
```

```swift
// iOS — UINavigationController delegate
class AnalyticsNavigationDelegate: NSObject, UINavigationControllerDelegate {
    let analytics: AnalyticsService

    init(analytics: AnalyticsService) {
        self.analytics = analytics
    }

    func navigationController(_ nc: UINavigationController,
                               willShow viewController: UIViewController, animated: Bool) {
        analytics.trackScreenView(
            screenName: viewController.title ?? "",
            screenClass: String(describing: type(of: viewController))
        )
    }
}
```

## User Properties Convention

```kotlin
// User properties — set at login and on change
analyticsService.setUserId("user_abc123")   // Stable identifier, not email
analyticsService.setUserProperty("plan_type", "premium")
analyticsService.setUserProperty("subscription_status", "active")
analyticsService.setUserProperty("days_since_install", 42)
analyticsService.setUserProperty("referral_source", "facebook")
analyticsService.setUserProperty("push_enabled", true)
analyticsService.setUserProperty("language", "en-US")

// NEVER set PII as user properties
// ❌ analyticsService.setUserProperty("email", user.email)
// ❌ analyticsService.setUserProperty("phone", user.phone)
// ❌ analyticsService.setUserProperty("full_name", user.name)
```

## Event Naming Convention

| Pattern | Example | Description |
|---------|---------|-------------|
| `{screen}_{action}_{object}` | `profile_edit_name` | Specific user action on a screen |
| `{object}_{action}` | `cart_add_item` | Action on a domain object |
| `{action}` | `logout` | Simple global action |
| `error_{domain}` | `error_api_timeout` | Non-fatal error tracking |
| `perf_{measure}` | `perf_screen_load` | Performance metric |
| `funnel_{name}_{step}` | `funnel_signup_email_entered` | Funnel tracking step |

No preamble. No postamble. No explanations.
