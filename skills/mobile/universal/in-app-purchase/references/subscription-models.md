# Subscription Models

## Pricing Tiers

| Tier | Strategy | Example |
|------|----------|---------|
| Monthly | Low barrier, highest LTV from retention | $9.99/mo |
| Annual | Higher upfront, lower churn | $59.99/yr (equiv. $5/mo) |
| Lifetime | One-time, premium positioning | $149.99 one-time |
| Introductory | Trial or discounted first period | 7-day free trial, then $9.99/mo |
| Promo | Custom duration or discount | 3mo at 50% off (codes) |

## Introductory Offers (iOS)

| Type | Description |
|------|-------------|
| `.freeTrial` | Free for N days/weeks/months |
| `.churnPrevention` | Discount for returning subscribers |
| `.introductoryPrice` | Lower price for first billing period |
| `.multiCycle` | Discount across multiple periods |

```swift
// Check eligibility before assigning offer
let eligibility = await Product.SubscriptionInfo.isEligibleForIntroOffer(product: subProduct)
```

## Promo Codes (iOS 16+ / Android)

- iOS: StoreKit `register(code:)` or App Store Connect UI
- Android: Google Play promo codes via Play Console
- Both limited-time, single-use codes for discount or free periods

## Grace Periods

```kotlin
// Android — billing retry config
val params = BillingClient.newBuilder(context)
    .setPendingPurchaseListener { /* handle billing retry UI */ }
    .setListener { result, purchases ->
        for (purchase in purchases) {
            when (purchase.purchaseState) {
                Purchase.PurchaseState.PENDING -> {
                    // Payment method issue — don't block access yet
                }
                Purchase.PurchaseState.PURCHASED -> {
                    // Acknowledge and deliver
                }
            }
        }
    }
```

| Platform | Grace Period | Default |
|----------|-------------|---------|
| iOS | 7-30 days | 16 days for monthly, 30 for annual |
| Android | 7 days | Configurable in Play Console |

## Billing Retry

- iOS: Apple retries for up to 30 days; `expiration_intent` = 2 indicates billing issue
- Android: `BillingClient.BillingFlowState.BILLING_UNAVAILABLE` signals retry; use `queryPurchaseHistoryAsync` on relogin

## Churn Prevention

| Tactic | Implementation |
|--------|---------------|
| Win-back offer | Check `expiration_intent` on renewal failure; present discount |
| Billing retry banner | Show "Update Payment" deep link when subscription paused |
| Grace period access | Keep premium features during grace period |
| Lapsed re-engagement | Push notification after 1 day, 3 days, 7 days |
