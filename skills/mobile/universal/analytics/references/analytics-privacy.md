# Analytics Privacy

## GDPR Consent Flow

```kotlin
class ConsentManager {
  private val essentialCategories = setOf(
    EventCategory.AUTOMATIC  // App lifecycle, crashes — always on
  )

  enum class ConsentState { NOT_DETERMINED, GRANTED, DENIED }

  fun isAllowed(category: EventCategory): Boolean {
    if (category in essentialCategories) return true
    return getConsent(category) == ConsentState.GRANTED
  }

  fun showConsentDialog(context: Context) {
    // Show dialog explaining essential vs non-essential tracking
    // Essential: app stability, crashes
    // Non-essential: analytics, personalization
    // Offer Accept All / Reject Non-Essential / Customize
  }
}
```

## CCPA Opt-Out

```kotlin
// Settings screen — "Do Not Sell My Info"
class PrivacySettingsViewModel : ViewModel() {
  fun setDoNotSell(optOut: Boolean) {
    analyticsService.setOptOut(optOut)
    // For CCPA: update `isDoNotSell` flag in analytics provider
    amplitude.setOptOut(optOut)
    mixpanel.optOutTracking()
  }
}
```

## App Tracking Transparency (iOS 14.5+)

```swift
import AppTrackingTransparency

func requestATT() {
  ATTrackingManager.requestTrackingAuthorization { status in
    switch status {
    case .authorized:
      // Enable IDFA collection, analytics personalization
      Analytics.setAnalyticsCollectionEnabled(true)
    case .denied, .restricted, .notDetermined:
      // Anonymized tracking only
      Analytics.setAnalyticsCollectionEnabled(false)
    }
  }
}
```

## Data Retention Configuration

| Provider | Max Retention | Deletion Method |
|----------|--------------|-----------------|
| Firebase Analytics | 24 months | Firebase Console → Data Deletion |
| Mixpanel | Unlimited (paid) | API: `/engage#profile-delete` |
| Amplitude | Unlimited (paid) | API: Delete user via dashboard or API |
| Custom Server | Configurable | `DELETE /api/analytics/user/:id` |

## User Data Deletion API

```kotlin
// Custom server implementation
@DeleteMapping("/api/analytics/user/{userId}")
fun deleteAnalyticsData(@PathVariable userId: String): ResponseEntity<Void> {
  eventRepository.deleteByUserId(userId)
  userProfileRepository.deleteById(userId)
  return ResponseEntity.noContent().build()
}

// Mobile app trigger
fun requestDataDeletion(userId: String) {
  // 1. Call server deletion endpoint
  // 2. Clear local analytics cache
  // 3. Reset analytics user ID
  analyticsService.resetUserId()
}
```

## Compliance Checklist

- [ ] GDPR consent dialog implemented before any non-essential tracking
- [ ] CCPA opt-out option in Settings
- [ ] ATT prompt on iOS 14.5+
- [ ] Data retention ≤ 24 months
- [ ] User data deletion API available
- [ ] No PII in event properties
- [ ] Privacy policy describes analytics data collection
- [ ] Consent preferences persisted and respected across sessions
