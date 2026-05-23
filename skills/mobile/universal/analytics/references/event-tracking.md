# Event Tracking & Privacy

## Event Taxonomy & Naming

```kotlin
// Event name constants — single source of truth
object AnalyticsEvents {
    // Screen views (automatic)
    const val SCREEN_VIEW = "screen_view"

    // User actions
    const val LOGIN = "login"
    const val LOGOUT = "logout"
    const val SIGNUP = "signup"
    const val PROFILE_EDIT_NAME = "profile_edit_name"
    const val PROFILE_EDIT_EMAIL = "profile_edit_email"
    const val SETTINGS_TOGGLE_NOTIFICATION = "settings_toggle_notification"
    const val SETTINGS_CHANGE_PASSWORD = "settings_change_password"

    // Shopping
    const val CART_ADD_ITEM = "cart_add_item"
    const val CART_REMOVE_ITEM = "cart_remove_item"
    const val CHECKOUT_STARTED = "checkout_started"
    const val CHECKOUT_PAYMENT_COMPLETE = "checkout_payment_complete"
    const val PURCHASE_COMPLETE = "purchase_complete"

    // Content
    const val SEARCH_PERFORMED = "search_performed"
    const val ARTICLE_VIEWED = "article_viewed"
    const val SHARE_PERFORMED = "share_performed"

    // Errors
    const val ERROR_API_TIMEOUT = "error_api_timeout"
    const val ERROR_API_SERVER = "error_api_server"
    const val ERROR_VALIDATION = "error_validation"

    // Performance
    const val PERF_SCREEN_LOAD = "perf_screen_load"
    const val PERF_API_LATENCY = "perf_api_latency"

    // Funnels
    const val FUNNEL_SIGNUP_STARTED = "funnel_signup_started"
    const val FUNNEL_SIGNUP_EMAIL_ENTERED = "funnel_signup_email_entered"
    const val FUNNEL_SIGNUP_PROFILE_COMPLETE = "funnel_signup_profile_complete"
    const val FUNNEL_SIGNUP_COMPLETE = "funnel_signup_complete"
}

object AnalyticsProperties {
    const val SCREEN_NAME = "screen_name"
    const val SCREEN_CLASS = "screen_class"
    const val SCREEN_ROUTE = "screen_route"
    const val METHOD = "method"               // email, google, apple
    const val ITEM_ID = "item_id"
    const val ITEM_NAME = "item_name"
    const val CATEGORY = "category"
    const val PRICE = "price"
    const val QUANTITY = "quantity"
    const val CURRENCY = "currency"
    const val QUERY = "query"
    const val RESULT_COUNT = "result_count"
    const val ERROR_MESSAGE = "error_message"
    const val ERROR_CODE = "error_code"
    const val DURATION_MS = "duration_ms"
    const val ENDPOINT = "endpoint"
    const val STATUS_CODE = "status_code"
    const val FUNNEL_NAME = "funnel_name"
    const val FUNNEL_STEP = "funnel_step"
    const val FUNNEL_STEP_NAME = "funnel_step_name"
    const val SOURCE = "source"               // Referral source
}
```

## Consent Management

### GDPR Consent Flow

```kotlin
class ConsentManager(private val prefs: Preferences) {
    private val essentialCategories = setOf(
        EventCategory.AUTOMATIC, EventCategory.ERROR
    )

    enum class ConsentState { NOT_DETERMINED, GRANTED, DENIED }

    fun isAllowed(category: EventCategory): Boolean {
        if (category in essentialCategories) return true
        return getConsent(category) == ConsentState.GRANTED
    }

    fun getConsent(category: EventCategory): ConsentState {
        return ConsentState.valueOf(
            prefs.getString("consent_${category.name}", "NOT_DETERMINED")
        )
    }

    fun setConsent(category: EventCategory, state: ConsentState) {
        prefs.setString("consent_${category.name}", state.name)
    }

    fun showConsentDialogIfNeeded(activity: Activity) {
        if (getConsent(EventCategory.USER_ACTION) != ConsentState.NOT_DETERMINED) return

        // Show GDPR consent dialog with options:
        // - Accept All (grant all)
        // - Reject Non-Essential (grant essential only)
        // - Customize (show per-category toggles)
        // Dialog must:
        // 1. List each category and what data is collected
        // 2. Explain purpose of data collection
        // 3. Link to privacy policy
        // 4. Offer Accept All / Reject All / Customize
        // 5. Persist choice
    }

    fun hasConsentDecision(): Boolean {
        return essentialCategories.any { getConsent(it) != ConsentState.NOT_DETERMINED }
    }
}
```

### CCPA Opt-Out (Settings)

```kotlin
// Settings screen — "Do Not Sell My Info"
class PrivacySettingsViewModel(
    private val analyticsService: AnalyticsService,
    private val consentManager: ConsentManager
) : ViewModel() {

    val isOptedOut = MutableStateFlow(false)

    fun toggleDoNotSell(optOut: Boolean) {
        isOptedOut.value = optOut
        analyticsService.setOptOut(optOut)
        // Update provider-specific opt-out
        amplitude.setOptOut(optOut)
        mixpanel.optOutTracking()
        // Persist preference
    }

    fun requestDataDeletion() {
        viewModelScope.launch {
            try {
                api.deleteAnalyticsData(userId)
                analyticsService.resetUserId()
                // Clear local cache
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
}
```

## App Tracking Transparency (iOS 14.5+)

```swift
import AppTrackingTransparency
import AdSupport

class ATTManager {
    enum TrackingStatus {
        case authorized      // IDFA accessible, personalized tracking allowed
        case denied          // No IDFA, anonymous tracking only
        case restricted      // Parental controls, no tracking
        case notDetermined   // Not yet prompted
    }

    static var status: TrackingStatus {
        let raw = ATTrackingManager.trackingAuthorizationStatus
        switch raw {
        case .authorized: return .authorized
        case .denied: return .denied
        case .restricted: return .restricted
        case .notDetermined: return .notDetermined
        @unknown default: return .notDetermined
        }
    }

    static func requestPermission(completion: @escaping (TrackingStatus) -> Void) {
        // Best practice: show contextual prompt explaining WHY before calling this
        // "Enable tracking to personalize recommendations and see relevant ads"
        ATTrackingManager.requestTrackingAuthorization { status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    let idfa = ASIdentifierManager.shared().advertisingIdentifier
                    Analytics.setAnalyticsCollectionEnabled(true)
                    completion(.authorized)
                case .denied, .restricted, .notDetermined:
                    Analytics.setAnalyticsCollectionEnabled(false)
                    completion(.denied)
                @unknown default:
                    completion(.notDetermined)
                }
            }
        }
    }
}
```

## Data Retention & Deletion

### Provider Retention Configuration

| Provider | Max Retention | Default | Deletion Method |
|----------|--------------|---------|-----------------|
| Firebase Analytics | 24 months | 14 months | Console → Data Deletion or `deleteUserData()` API |
| Mixpanel | Unlimited (paid) | Unlimited | `/engage#profile-delete` API or Dashboard |
| Amplitude | Unlimited (paid) | Unlimited | User deletion via Dashboard or API |
| Custom Server | Configurable | Configurable | `DELETE /api/analytics/user/:id` |

### User Deletion API (Custom Server)

```kotlin
// Backend — Spring Boot
@RestController
@RequestMapping("/api/analytics")
class AnalyticsDeletionController(
    private val eventRepository: EventRepository,
    private val userProfileRepository: UserProfileRepository
) {
    @DeleteMapping("/user/{userId}")
    fun deleteUserData(@PathVariable userId: String): ResponseEntity<Void> {
        eventRepository.deleteByUserId(userId)
        userProfileRepository.deleteById(userId)
        // Clear any cache entries
        analyticsCache.evict(userId)
        return ResponseEntity.noContent().build()
    }
}

// Mobile app trigger
fun requestDataDeletion(userId: String) {
    viewModelScope.launch {
        try {
            api.deleteAnalyticsData(userId)
            analyticsService.resetUserId()
            prefs.remove("analytics_user_id")
            showSuccess("Your data has been deleted")
        } catch (e: Exception) {
            showError("Failed to delete data. Please contact support.")
        }
    }
}
```

## Compliance Checklist

- [ ] GDPR consent dialog shown before any non-essential tracking
- [ ] CCPA opt-out ("Do Not Sell My Info") accessible from Settings
- [ ] ATT prompt on iOS 14.5+ with contextual explanation
- [ ] Data retention configured ≤ 24 months in all providers
- [ ] User data deletion API available and functional
- [ ] No PII in event properties or user properties
- [ ] Privacy policy describes data collection and usage
- [ ] Consent preferences persisted across app restarts
- [ ] Consent applies to ALL analytics providers (not just primary)
- [ ] Analytics events reviewed quarterly for compliance
- [ ] Data Processing Agreement (DPA) signed with each provider
- [ ] Children's data: COPPA compliance if applicable (Firebase `setAnalyticsCollectionEnabled(false)` for child users)

No preamble. No postamble. No explanations.
