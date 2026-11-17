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

Grace period and account hold are server-side states, not client purchase states. Detect them from Real-time Developer Notifications (`SUBSCRIPTION_IN_GRACE_PERIOD`, `SUBSCRIPTION_ON_HOLD`) and `purchases.subscriptionsv2.get` (`subscriptionState`) on Android, and from App Store Server Notifications (`DID_FAIL_TO_RENEW` with `GRACE_PERIOD` subtype) plus `gracePeriodExpiresDate` on iOS. Keep access during grace period, show a "fix your payment method" prompt, and revoke on hold/expiry.

| Platform | Grace period | Configured in |
|----------|-------------|---------------|
| iOS | Opt-in Billing Grace Period; you choose the length (3, 16 or 28 days) | App Store Connect |
| Android | Grace period length chosen per base plan, followed by account hold | Play Console |

Check the current options in each console; Apple and Google adjust the allowed durations.

## Billing Retry

- iOS: Apple retries billing for up to 60 days; `expiration_intent` = 2 indicates billing issue
- Android: `BillingClient.BillingFlowState.BILLING_UNAVAILABLE` signals retry; use `queryPurchaseHistoryAsync` on relogin

## Churn Prevention

| Tactic | Implementation |
|--------|---------------|
| Win-back offer | Check `expiration_intent` on renewal failure; present discount |
| Billing retry banner | Show "Update Payment" deep link when subscription paused |
| Grace period access | Keep premium features during grace period |
| Lapsed re-engagement | Push notification after 1 day, 3 days, 7 days |
