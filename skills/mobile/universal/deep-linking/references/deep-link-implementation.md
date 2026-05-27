# Deep Linking Setup

## iOS Universal Links

```swift
import UIKit

class DeepLinkHandler {
    static let shared = DeepLinkHandler()
    private var pendingLink: URL?

    func handleUniversalLink(_ userActivity: NSUserActivity) -> Bool {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else { return false }

        return handleURL(url)
    }

    func handleURL(_ url: URL) -> Bool {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: true) else {
            return false
        }

        switch components.host {
        case "product":
            return handleProductDeepLink(components)
        case "profile":
            return handleProfileDeepLink(components)
        case "checkout":
            return handleCheckoutDeepLink(components)
        default:
            return false
        }
    }

    private func handleProductDeepLink(_ components: URLComponents) -> Bool {
        guard let productId = components.queryItems?.first(where: { $0.name == "id" })?.value
        else { return false }

        navigateToProduct(productId, referrer: components.queryItems?
            .first(where: { $0.name == "ref" })?.value)
        return true
    }

    private func navigateToProduct(_ id: String, referrer: String?) {
        let productVC = ProductViewController(productId: id)
        productVC.referrer = referrer
        navigateToViewController(productVC)
    }
}
```

## Android App Links

```kotlin
class DeepLinkActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val action = intent.action
        val data = intent.data

        when {
            Intent.ACTION_VIEW == action && data != null -> {
                handleDeepLink(data)
            }
            intent.hasExtra("deep_link") -> {
                handlePushNotificationDeepLink(intent)
            }
        }
    }

    private fun handleDeepLink(uri: Uri) {
        when {
            uri.pathSegments.contains("product") -> {
                val productId = uri.getQueryParameter("id")
                if (productId != null) {
                    navigateToProduct(productId)
                }
            }
            uri.pathSegments.contains("profile") -> {
                val userId = uri.lastPathSegment
                if (userId != null) {
                    navigateToProfile(userId)
                }
            }
            uri.toString().contains("checkout") -> {
                navigateToCheckout()
            }
            else -> navigateToDefault()
        }
    }

    private fun handlePushNotificationDeepLink(intent: Intent) {
        val deepLink = intent.getStringExtra("deep_link")
        if (deepLink != null) {
            handleDeepLink(Uri.parse(deepLink))
        }
    }

    override fun getIntent(): Intent {
        // Preserve intent for cold starts
        val intent = super.getIntent()
        if (intent != null) {
            handleIntent(intent)
        }
        return intent
    }
}
```

## Key Points

- Implement Universal Links (iOS) and App Links (Android)
- Handle both cold start and warm start scenarios
- Register custom URL schemes as fallback
- Validate deep link parameters for security
- Support deferred deep linking for new users
- Track deep link attribution and analytics
- Handle errors with graceful fallback URLs
- Use parameter encoding for special characters
- Test deep links with simulator and device
- Document all supported deep link formats
- Implement deep link dashboard for testing
- Handle incoming deep links while app is backgrounded
