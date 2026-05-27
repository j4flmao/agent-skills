# Deep Link Analytics & Attribution

## Overview

Deep link analytics track the full lifecycle of a link: from impression → click → app install (if applicable) → app open → content view → conversion. Attribution determines which marketing channel or campaign drove a specific install or action.

## Analytics Data Flow

```
User taps link → Link server records click →
  ├── App installed? → SDK matches click → resolves deep link → app opens to content
  └── App not installed? → Redirects to App Store/Play Store → (Deferred deep link)
      → First launch → SDK identifies stored click → resolves deferred link → opens to content
```

Analytics events captured at each stage:
1. `link_impression` — Link was displayed to user
2. `link_click` — User tapped the link
3. `store_redirect` — User redirected to app store
4. `install` — App was installed (from deferred link)
5. `first_open` — First launch after install
6. `deep_link_resolved` — Deep link was processed and matched to a route
7. `deep_link_navigated` — User reached the target screen
8. `conversion` — User completed desired action (purchase, signup, etc.)

## Attribution SDKs

### Branch.io

Branch is the most comprehensive deep linking and attribution platform.

**Setup**:

```kotlin
// Android
class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        Branch.getAutoInstance(this)
    }
}

class MainActivity : AppCompatActivity() {
    override fun onStart() {
        super.onStart()
        Branch.sessionBuilder(this)
            .withCallback { branchUniversalObject, linkProperties, error ->
                if (error == null && branchUniversalObject != null) {
                    val deepLinkPath = branchUniversalObject.canonicalIdentifier
                    handleDeepLink(deepLinkPath)
                }
            }
            .withData(intent.data)
            .init()
    }
}
```

```swift
// iOS
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    Branch.getInstance().initSession(launchOptions: launchOptions) { data, error in
        if error == nil, let data = data {
            self.handleBranchDeepLink(data)
        }
    }
    return true
}
```

**Creating tracking links**:

```javascript
// Branch link creation API
const Branch = require('react-native-branch');

async function createShareLink() {
    const branchUniversalObject = await Branch.createBranchUniversalObject(
        'product/12345',
        {
            locallyIndex: true,
            title: 'Check out this product!',
            contentDescription: 'Amazing product with great features',
            contentMetadata: {
                price: 29.99,
                currency: 'USD',
                sku: 'PROD-12345'
            }
        }
    );

    const linkProperties = {
        feature: 'share',
        channel: 'whatsapp',
        campaign: 'summer-sale',
        tags: ['sale', 'summer']
    };

    const controlParams = {
        $uri_redirect_to: 'https://example.com/product/12345',
        $fallback_url: 'https://example.com',
        'custom_param': 'value'
    };

    const { url } = await branchUniversalObject.generateShortUrl(
        linkProperties,
        controlParams
    );

    return url;
}
```

### Adjust

Adjust focuses on attribution and analytics with deep link support.

**Setup**:

```kotlin
// Android
val config = AdjustConfig(this, "YOUR_APP_TOKEN", AdjustConfig.ENVIRONMENT_PRODUCTION)
config.setOnDeeplinkResolvedListener { deeplink, clickTime ->
    handleDeepLink(deeplink)
}
Adjust.onCreate(config)
```

```swift
// iOS
Adjust.appDidLaunch(ADJConfig(appToken: "YOUR_APP_TOKEN", environment: ADJEnvironmentProduction))
Adjust.processDeeplink(URL(string: "myapp://product/12345")!) { resolvedLink in
    self.handleDeepLink(resolvedLink)
}
```

**Deeplink callback**:

```swift
AdjustConfig.setOpenDeeplinkCallback { deeplink in
    // Called when app opens via deep link
    DeepLinkHandler.shared.handle(deeplink.absoluteString)
}
```

### AppsFlyer

AppsFlyer provides attribution with OneLink deep linking.

**Setup**:

```kotlin
// Android
class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AppsFlyerLib.getInstance().init("YOUR_DEV_KEY", this)
        AppsFlyerLib.getInstance().start(this)
    }
}

class MainActivity : AppCompatActivity() {
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        AppsFlyerLib.getInstance().onDeepLink(this) { deepLinkResult ->
            if (deepLinkResult.status == DeepLinkResult.Status.FOUND) {
                handleOneLinkDeepLink(deepLinkResult.deepLink)
            }
        }
    }
}
```

```swift
// iOS
AppsFlyerLib.shared().appsFlyerDevKey = "YOUR_DEV_KEY"
AppsFlyerLib.shared().appleAppID = "123456789"
AppsFlyerLib.shared().deepLinkDelegate = self

// Handle deep link
func didResolveDeepLink(_ result: DeepLinkResult) {
    switch result.status {
    case .found:
        handleDeepLink(result.deepLink?.clickEvent.keysValues)
    case .notFound:
        print("Deep link not found")
    default:
        break
    }
}
```

## Deferred Deep Linking

Deferred deep linking enables linking to specific content even when the app isn't installed.

### How It Works

1. User taps a tracking link (e.g., branch.io link)
2. Branch/Adjust/AppsFlyer server records the click data
3. User is redirected to the App Store or Play Store
4. App is installed
5. On first launch, the SDK contacts the attribution server
6. Server responds with the stored deep link data
7. App navigates to the target screen

### Deferred Link Implementation

```swift
// Branch — deferred deep link handling (same as regular deep link)
Branch.getInstance().initSession(launchOptions: launchOptions) { data, error in
    if let data = data {
        // This works for both direct opens and deferred deep links
        let clickedBranchLink = data["+clicked_branch_link"] as? Bool ?? false
        let isFirstSession = data["+is_first_session"] as? Bool ?? false

        if clickedBranchLink && isFirstSession {
            Analytics.logEvent("deferred_deep_link_resolved", parameters: data as! [String: Any])
        }

        if let deepLinkPath = data["$deeplink_path"] as? String {
            navigateTo(deepLinkPath)
        }
    }
}
```

### Deferred Deep Link Edge Cases

1. **Install attribution window** — Default 30-90 days. Click → install after window expires = organic install
2. **Re-engagement** — User has app but hasn't opened in 30+ days. Treat as deferred link
3. **Multiple clicks** — Last-click attribution by default. Last link clicked before install wins
4. **Cross-device** — Click on one device, install on another. Modern SDKs can't attribute this
5. **Click → install delay** — User may install hours or days after clicking. SDK handles this asynchronously

## Conversion Tracking

### Event Tracking

```swift
// Branch — track conversion events
Branch.getInstance().userCompletedAction("purchase", withState: [
    "revenue": 29.99,
    "currency": "USD",
    "product_id": "PROD-12345",
    "quantity": 1
])
```

```kotlin
// Adjust — track events
val purchaseEvent = AdjustEvent("abc123") // Event token from Adjust dashboard
purchaseEvent.setRevenue(29.99, "USD")
purchaseEvent.addCallbackParameter("product_id", "PROD-12345")
Adjust.trackEvent(purchaseEvent)
```

```javascript
// AppsFlyer — track in-app events
AppsFlyer.trackEvent('purchase', {
    af_revenue: '29.99',
    af_currency: 'USD',
    af_content_id: 'PROD-12345',
    af_quantity: '1'
});
```

### Revenue Attribution

Map purchase events back to the original source:

1. User clicks ad link → stored as click with `campaign_id`, `adset_id`, `channel`
2. User installs and purchases → purchase event sent with revenue
3. Attribution server matches purchase → click based on device ID
4. Revenue attributed to campaign: `campaign_id` drove $29.99 purchase

### Conversion Funnel

Track each stage to identify drop-off:

| Stage | Event | Expected Conversion |
|-------|-------|-------------------|
| Link Impression | `link_impression` | 100% (base) |
| Link Click | `link_click` | 1-5% of impressions |
| App Store View | `store_redirect` | 80-90% of clicks |
| Install | `install` | 30-50% of store views |
| First Open | `first_open` | 85-95% of installs |
| Deep Link Resolve | `deep_link_resolved` | 90%+ of first opens |
| Content View | `deep_link_navigated` | 70-85% of resolved |
| Conversion | `conversion` | 5-20% of navigated |

## Campaign Measurement

### UTM Parameters

Standard UTM parameters for deep linking:

| Parameter | Example | Purpose |
|-----------|---------|---------|
| `utm_source` | `facebook`, `google`, `email` | Traffic source |
| `utm_medium` | `cpc`, `social`, `email` | Marketing medium |
| `utm_campaign` | `summer_sale_2026` | Campaign name |
| `utm_term` | `running+shoes` | Paid search keyword |
| `utm_content` | `hero_banner_v2` | Ad creative variant |

### UTM in Deep Links

```javascript
// Creating a deep link with UTM parameters
function createCampaignLink(userId, campaign, source) {
    const baseUrl = `https://app.example.com/profile/${userId}`;
    const params = new URLSearchParams({
        utm_source: source,
        utm_medium: 'deep_link',
        utm_campaign: campaign,
        utm_content: 'profile_share'
    });
    return `${baseUrl}?${params.toString()}`;
}
```

### Campaign Dashboard Metrics

| Metric | Definition | Formula |
|--------|-----------|---------|
| CTR | Click-through rate | clicks / impressions |
| Install Rate | Installs from clicks | installs / clicks |
| Conversion Rate | Conversions from installs | conversions / installs |
| ROAS | Return on ad spend | revenue / ad spend |
| CPI | Cost per install | ad spend / installs |
| CPA | Cost per action | ad spend / conversions |
| LTV | Lifetime value | avg revenue per user over lifetime |
| D7 Retention | Day 7 retention | users active day 7 / installs |

## Link Click-to-Install Funnel

### Click Attribution

```swift
// Branch — checking click attribution
Branch.getInstance().lastAttributedTouchData { attributedData in
    guard let data = attributedData else { return }

    print("Attribution window: \(data.attributionWindow)")
    print("Source: \(data.touchData?.source ?? "unknown")")
    print("Campaign: \(data.touchData?.campaign ?? "unknown")")
}
```

### Install Validation

Use server-side validation to verify installs attributed to paid campaigns:

```python
# Server-side install validation
import hashlib
import hmac

def validate_install(app_id: str, device_id: str, signature: str) -> bool:
    """Verify install signature from attribution provider."""
    secret = os.environ["ATTRIBUTION_SECRET"]
    message = f"{app_id}:{device_id}"
    expected = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

## ROI Measurement

### Cost Data Integration

```python
# Import cost data from ad platforms
cost_data = {
    "facebook": {"campaign_123": {"spend": 500.00, "impressions": 10000}},
    "google": {"campaign_456": {"spend": 300.00, "impressions": 8000}},
    "tiktok": {"campaign_789": {"spend": 200.00, "impressions": 15000}},
}

# Match with attributed installs
attributed_installs = get_attributed_installs("2026-05-01", "2026-05-07")

for platform, campaigns in cost_data.items():
    for campaign_id, cost in campaigns.items():
        installs = sum(
            1 for install in attributed_installs
            if install["platform"] == platform
            and install["campaign_id"] == campaign_id
        )
        cpi = cost["spend"] / installs if installs > 0 else 0
        print(f"{platform}/{campaign_id}: CPI=${cpi:.2f}, Installs={installs}")
```

### LTV Calculation

```sql
-- SQL for LTV by source
SELECT
    install_source,
    COUNT(DISTINCT user_id) as installs,
    SUM(revenue_30d) as revenue_30d,
    AVG(revenue_30d) as ltv_30d,
    SUM(revenue_30d) / COUNT(DISTINCT user_id) as arpu_30d
FROM user_analytics
WHERE install_date BETWEEN '2026-01-01' AND '2026-04-30'
GROUP BY install_source
ORDER BY ltv_30d DESC;
```

## Fraud Detection

### Common Install Fraud Types

1. **Click injection** — Malicious app generates fake clicks just before install
2. **Device farms** — Automated installs from emulated devices
3. **SDK spoofing** — Fake SDK events mimicking real installs
4. **Incentivized fraud** — Users paid to install without genuine engagement
5. **Bot traffic** — Automated click generation

### Fraud Detection Measures

```python
# Fraud detection rules
FRAUD_RULES = [
    {
        "name": "rapid_installs",
        "threshold": 50,  # max installs per hour from same IP
        "window_hours": 1
    },
    {
        "name": "no_session",
        "threshold": 0.9,  # 90%+ of installs have no session > 30 seconds
        "window_days": 1
    },
    {
        "name": "click_to_install_too_fast",
        "threshold_ms": 100,  # click to install in <100ms
        "window_days": 1
    },
    {
        "name": "high_click_volume",
        "threshold": 10000,  # max clicks per device per day
        "window_hours": 24
    }
]

def detect_fraud(install_data: dict) -> dict:
    """Check install against fraud rules."""
    flags = []
    for rule in FRAUD_RULES:
        if violates_rule(install_data, rule):
            flags.append(rule["name"])
    return {
        "install_id": install_data["id"],
        "is_fraudulent": len(flags) > 1,  # multiple flags = likely fraud
        "flags": flags,
        "score": len(flags) / len(FRAUD_RULES)
    }
```

## Analytics Integration

### Events to Track

```swift
// Deep link analytics events
struct DeepLinkAnalytics {
    static func trackDeepLinkReceived(_ url: URL, source: String) {
        Analytics.logEvent("deep_link_received", parameters: [
            "url": url.absoluteString,
            "source": source,
            "timestamp": Date().timeIntervalSince1970
        ])
    }

    static func trackDeepLinkMatched(_ route: String, params: [String: String]) {
        Analytics.logEvent("deep_link_matched", parameters: [
            "route": route,
            "params_count": params.count,
            "timestamp": Date().timeIntervalSince1970
        ])
    }

    static func trackDeepLinkNavigated(_ screen: String, duration: TimeInterval) {
        Analytics.logEvent("deep_link_navigated", parameters: [
            "screen": screen,
            "resolution_ms": Int(duration * 1000)
        ])
    }

    static func trackDeepLinkFailed(_ url: URL, reason: String) {
        Analytics.logEvent("deep_link_failed", parameters: [
            "url": url.absoluteString,
            "reason": reason
        ])
    }
}
```

### Integration with Existing Analytics

```javascript
// Segment integration with Branch
const branch = new Branch();
const analytics = new Segment();

branch.addListener((event) => {
    if (event.type === 'deep-link') {
        analytics.track('Deep Link Opened', {
            url: event.url,
            route: event.route,
            source: event.source,
            campaign: event.campaign
        });

        if (event.conversion) {
            analytics.track('Deep Link Converted', {
                value: event.conversion.value,
                type: event.conversion.type
            });
        }
    }
});
```

## Best Practices

- Track all deep link lifecycle events (received, matched, navigated, failed)
- Use UTM parameters consistently across all campaign links
- Set attribution windows appropriately (30 days for installs, 7 days for re-engagement)
- Validate installs server-side to prevent fraud
- Monitor deferred deep link resolution rate (target >90%)
- A/B test deep link landing pages for conversion optimization
- Log all deep link failures with context for debugging
- Integrate with analytics platform for funnel visualization
- Regular audit of attribution data vs. platform data
- Document all UTM conventions in team analytics guide
