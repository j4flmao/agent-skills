# App Store Optimization (ASO)

## Overview

App Store Optimization (ASO) is the process of improving app visibility in the App Store and Play Store search results. It encompasses metadata optimization, visual assets, ratings management, localization, and conversion rate optimization.

## App Store / Play Store Listing Elements

| Element | App Store | Play Store | ASO Impact |
|---------|-----------|------------|------------|
| App Name | 30 chars | 30 chars (50 on some) | High — primary ranking factor |
| Subtitle | 30 chars | — | High — keyword relevance |
| Short Description | — | 80 chars | High — keyword + conversion |
| Description | 4000 chars | 4000 chars | Medium — secondary factor |
| Keywords | 100 chars | — | High — iOS ranking factor |
| Promotional Text | 170 chars (editable) | — | Medium — timely updates |
| Icon | 1024x1024 | 512x512 | High — conversion |
| Screenshots | 6.7/5.5/6.5/5.8" required | 2-8 screenshots per type | High — conversion |
| Preview Video | 30 sec max | Up to 2 videos | High — conversion boost |
| Category | Primary + Secondary | Primary + Secondary | Medium — discoverability |
| Rating | 1-5 stars | 1-5 stars | High — ranking + conversion |

## Keyword Strategy

### iOS Keyword Field Optimization

The 100-character keyword field is unique to the App Store. Keywords are comma-separated, no spaces between words allowed.

```
keyword: "project manager,task tracker,to do list,todo,organizer,team collaboration,workflow"
```

Rules:
- No duplicate keywords — Apple de-duplicates
- No competitor names — prohibited and rejected
- No generic terms that don't describe the app — rejected
- No space after commas — Apple uses commas as separators only
- Use high-volume, low-competition keywords
- Combine keywords into compound phrases where possible
- Treat the 100 character limit as a constraint to optimize within

### Keyword Research Tools

- App Store Connect — Search Ads reports (actual conversion data)
- Sensor Tower / App Annie — competitor keyword analysis
- App Radar — keyword tracking and suggestions
- Google Trends — cross-reference search volume
- App Store autocomplete — observe suggested search terms

### Keyword Placement

| Field | Weight | Notes |
|-------|--------|-------|
| App Name | Highest | Include primary keyword |
| Subtitle (iOS) | High | Secondary keywords |
| Keyword Field (iOS) | High | Fill all 100 characters |
| Short Description (Android) | Medium | First 80 characters critical |
| Full Description | Medium | Use keywords naturally 3-5 times |
| Developer Name | Low | Only if descriptive |

## Screenshot Optimization

### Best Practices

1. **First screenshot is most important** — users see it before reading anything
2. **Show the value proposition** not just UI — explain what the app does
3. **Use captions** — overlay text explaining key features
4. **Highlight uniqueness** — differentiate from competitors
5. **Localize screenshots** — text overlays should be in the target language
6. **Match OS design language** — iOS screenshots should use iOS UI, Android should use Material Design
7. **Test different screenshot orders** — lead with strongest feature
8. **5-7 screenshots** — enough to tell the story, not overwhelming

### Screenshot Specifications

**iOS** (per device family):
- 6.7" (iPhone 14 Pro Max): 1290x2796 pixels
- 6.5" (iPhone 14 Plus): 1242x2688 pixels
- 5.5" (iPhone 8 Plus): 1242x2208 pixels
- 6.7" iPad: 2048x2732 pixels
- 12.9" iPad (Gen 3+): 2048x2732 pixels

**Android**:
- Minimum dimension: 320 pixels
- Maximum dimension: 3840 pixels
- 2-8 screenshots per device type (phone, tablet, TV, wear)

### A/B Testing Screenshots

iOS Product Page Optimization uses StoreKit to A/B test different screenshots:

```swift
import StoreKit

func startProductPageTest() {
    let productView = SKProductPageOverlay()
    productView.delegate = self
    productView.loadProduct(withParameters: [
        "treatment": [
            "screenshots": ["screenshot_v2_1.png", "screenshot_v2_2.png"],
        ]
    ])
}
```

Android Play Console provides native A/B testing for store listings:

1. Go to Play Console > Store presence > Store listing experiments
2. Create experiment > Select element (screenshots, icon, short description)
3. Upload variant assets
4. Set traffic split (50/50 recommended)
5. Run for minimum 2 weeks for statistical significance

## Ratings and Reviews Management

### In-App Rating Prompts

iOS — SKStoreReviewController:

```swift
import StoreKit

func promptForRating() {
    // Only show after user has experienced value
    // Maximum 3 prompts per 365-day rolling period
    if shouldShowRatingPrompt() {
        if let scene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
            SKStoreReviewController.requestReview(in: scene)
        }
    }
}

private func shouldShowRatingPrompt() -> Bool {
    let launchCount = UserDefaults.standard.integer(forKey: "launchCount")
    let lastPrompt = UserDefaults.standard.double(forKey: "lastRatingPrompt")
    let daysSinceLastPrompt = (Date().timeIntervalSince1970 - lastPrompt) / 86400

    return launchCount >= 5 && daysSinceLastPrompt > 180
}
```

Android — In-App Review API:

```kotlin
import com.google.android.play.core.review.ReviewManagerFactory

class RatingManager(private val context: Context) {
    private val reviewManager = ReviewManagerFactory.create(context)

    fun promptForRating(activity: Activity) {
        val request = reviewManager.requestReviewFlow()
        request.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val reviewInfo = task.result
                reviewManager.launchReviewFlow(activity, reviewInfo)
            }
        }
    }
}
```

### Responding to Reviews

- Respond to all negative reviews within 1-2 business days
- Address specific issues mentioned in the review
- Never argue with users or be defensive
- Offer help: "Please contact support at support@example.com so we can assist you"
- Flag inappropriate reviews through store consoles
- Android allows editing responses — iOS responses are permanent

### Managing Ratings

- Prompt for rating after positive user action (completed task, achieved goal, not after crash)
- Never prompt on first launch or during onboarding
- Space prompts minimum 180 days apart (Apple) or 90 days (Google)
- Use event-based timing: after order completion, level-up, feature discovery
- Consider showing a feedback form first for negative responses
- Prompt on specific screens where value is clear (checkout success, achievement unlocked)

## Product Page A/B Testing

### iOS Product Page Optimization

App Store Connect provides native A/B testing for custom product pages:

1. Create up to 35 additional product pages via App Store Connect API
2. Each page can have different screenshots, preview videos, and promotional text
3. Assign custom URLs to each product page variant
4. Measure conversion rate per variant via analytics
5. Default product page can have one treatment variant for A/B testing

```swift
import StoreKit

func openCustomProductPage() {
    let productPage = SKProductPageOverlay()
    productPage.loadProduct(withParameters: [
        "productPageIdentifier": "custom-page-id"
    ])
}
```

### Android Store Listing Experiments

1. Navigate to Play Console > Store presence > Store listing experiments
2. Create experiment
3. Choose element to test: icon, screenshots, short description, or full description
4. Upload control and variant assets
5. Set traffic percentage (min 5% per variant)
6. Run for statistical significance (minimum 2 weeks)
7. Automatic winner selection after confidence threshold reached

## Localized Listings

### Importance

Apps with localized listings see 2-3x higher conversion rates in those markets. App Store and Play Store rank localized keywords higher.

### High-Impact Languages

Prioritize by market size:
1. English (US, UK, Australia, Canada)
2. Japanese
3. Chinese (Simplified — China, Traditional — Taiwan/Hong Kong)
4. Korean
5. German
6. French
7. Spanish
8. Portuguese (Brazil)
9. Russian
10. Arabic

### Localization Best Practices

- Translate metadata (name, subtitle, description, keywords)
- Localize screenshots with overlaid text (never use machine translations for screenshots)
- Research keywords per market — don't translate keywords, research local search terms
- Use native speakers, not machine translation, for critical elements
- Localize app icon if cultural symbols differ
- Test localized screenshots with A/B experiments
- Update localized listings when adding new features

### Keyword Research per Language

Keywords don't translate directly. Research each market independently:

```
English: "expense tracker"
Japanese: 家計簿アプリ (household account book app) — different keyword concept
German: "ausgaben tracker" — direct translation, but "finanzmanager" may have higher volume
```

## Promotional Text

### iOS Promotional Text

- 170 characters, editable without app review
- Use for time-sensitive promotions, seasonal events, feature launches
- Appears above the description on the App Store product page
- Update frequently to keep the listing fresh
- Examples: "Limited-time 50% off annual subscription!", "New: AI-powered budget forecasting"

### Google Play Promotional Content

- Promo text, promo image, and promo video in Play Console
- Used for Google Play promotional features (collections, featuring)
- Not visible on the store listing directly but used for merchandising

## In-App Events

### iOS In-App Events

In-App Events are time-limited events within the app that can be featured on the App Store:

1. Event types: Challenge, Competition, Live Event, Major Update, or Limited Time
2. Requirements: Event must actually occur within the app, not external
3. Assets: Event image (1920x1080), event name (50 chars), short description (50 chars)
4. Deep link: Users tap event → deep link directly to the event screen
5. Publishing: Can submit up to 24 hours before event start
6. Frequency: Maximum 10 events at a time, 50 per year

### Google Play In-App Events

Similar feature for Android — developers can:
1. Create promotional events in Play Console
2. Events appear on Google Play store listing
3. Deep link directly to event content
4. Use for seasonal promotions, limited-time content

## Pre-Order Setup

### iOS Pre-Order

1. Submit app for review without releasing
2. Set availability date in the future (2-90 days from approval)
3. Users can pre-order the app
4. App auto-downloads on release date
5. Pre-order pricing can differ from launch pricing

### Android Pre-Registration

1. Configure in Play Console: Store presence > Pricing & distribution
2. Mark app as "Pre-registration"
3. Set launch date
4. Users pre-register → auto-install on launch
5. Can offer pre-registration rewards (e.g., exclusive content)

### Technical Setup

```ruby
# Fastlane — set pre-order availability date
lane :setup_preorder do |options|
    api_key = app_store_connect_api_key(
        key_id: ENV["APP_STORE_CONNECT_API_KEY_ID"],
        issuer_id: ENV["APP_STORE_CONNECT_API_ISSUER_ID"],
        key_content: ENV["APP_STORE_CONNECT_API_KEY_CONTENT"]
    )

    app_store_connect = AppStoreConnect.client(api_key)
    app_store_connect.put(
        "/v1/apps/#{ENV["APP_ID"]}/preOrder",
        body: {
            data: {
                attributes: {
                    appReleaseDate: options[:release_date]
                }
            }
        }
    )
end
```

## Conversion Rate Optimization

### Tracking Conversion

```swift
import iAd

// iOS — track product page views and conversions
class ConversionTracker {
    static func trackProductPageView(source: String) {
        // Source: "search", "browse", "featured", "custom_link"
        Analytics.logEvent("product_page_view", parameters: ["source": source])
    }

    static func trackInstall(source: String) {
        Analytics.logEvent("install", parameters: ["source": source])
    }

    static func calculateConversionRate() -> Double {
        let views = Analytics.getEventCount("product_page_view")
        let installs = Analytics.getEventCount("install")
        guard views > 0 else { return 0 }
        return Double(installs) / Double(views)
    }
}
```

### Conversion Factors

| Factor | Impact | Notes |
|--------|--------|-------|
| App Icon | High | First visual impression |
| First Screenshot | Very High | Determines swipe-through |
| Preview Video | High | 30%+ conversion boost |
| Rating & Reviews | High | 4.5+ star apps convert 3x better |
| App Name Clarity | Medium | Users must understand instantly |
| Description Above Fold | Medium | First 3 lines visible |
| Price | High | Free converts 10-100x paid |
| In-App Purchase Info | Medium | Transparency increases trust |
| Recent Update | Low-Medium | Shows active development |

## ASO Metrics and KPIs

| Metric | Definition | Target |
|--------|-----------|--------|
| Impressions | Store listing views | Depends on keyword rankings |
| Conversion Rate | Installs / Impressions | 15-30% organic, 5-10% paid |
| Keyword Ranking | Position for target keywords | Top 3 for primary keywords |
| Rating | Average star rating | 4.5+ |
| Review Volume | Number of reviews | Monthly growth >10% |
| Swipe-through Rate | Screenshot 1 → 2 | >50% |
| Video Completion | % watching full preview | >30% |
| Retention 30-day | % returning users | >30% |

## ASO Best Practices

- Research keywords before naming the app — name is the highest-weight factor
- Update keywords and description with each major release
- Submit new screenshots with each major UI update
- A/B test everything — don't guess what converts
- Respond to all 1-2 star reviews within 48 hours
- Localize for top 5-10 markets by revenue
- Use promotional text for timely updates without app review
- Set up in-app events for seasonal campaigns
- Monitor competitor rankings and adjust strategy
- Analyze keyword gaps — terms competitors rank for but you don't
