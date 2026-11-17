# Play Billing Guide

## Play Billing Library 8+

Google Play deprecates each major version about two years after release: version 7 stopped being accepted for new apps and updates on 31 August 2026 (extensions to 1 November 2026), and version 8 has a 31 August 2027 cutoff. Use the newest 8.x/9.x release and check the [deprecation FAQ](https://developer.android.com/google/play/billing/deprecation-faq).

### Gradle Setup

```groovy
dependencies {
    implementation "com.android.billingclient:billing-ktx:<latest-8.x-or-newer>"  // pin via the version catalog
}
```

### Billing Client Initialization

```kotlin
val billingClient = BillingClient.newBuilder(context)
    .setListener(purchaseUpdateListener)
    .enablePendingPurchases(
        PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
    )                                   // no-arg overload was removed in PBL 8
    .enableAutoServiceReconnection()    // PBL 8+: reconnects the service automatically
    .build()
```

### Product Types

| Constant | Product Type | Acknowledge Required |
|----------|-------------|---------------------|
| `ProductType.SUBS` | Auto-renewable subscription | Yes (3 days) |
| `ProductType.INAPP` | Consumable / Non-consumable | Yes for managed products |

## Acknowledge Requirement

```kotlin
// Critical — unacknowledged purchases auto-refund after 3 days
billingClient.acknowledgePurchase(
    AcknowledgePurchaseParams.newBuilder()
        .setPurchaseToken(purchase.purchaseToken)
        .build()
) { billingResult ->
    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        // Purchase fully committed
    }
}
```

## Pending Transactions

```kotlin
// Play Billing 5+ supports deferred payment methods (UPI, bank transfer)
override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        purchases?.forEach { purchase ->
            when (purchase.purchaseState) {
                Purchase.PurchaseState.PURCHASED -> {
                    // Payment complete — acknowledge & deliver
                }
                Purchase.PurchaseState.PENDING -> {
                    // Payment method not yet settled — don't deliver
                    // App can show "Payment pending" UI
                }
                Purchase.PurchaseState.UNSPECIFIED_STATE -> {
                    // Unknown — log and investigate
                }
            }
        }
    }
}
```

## Test Cards

| Payment method | Test | Expected result |
|----------------|------|----------------|
| Visa | `4242424242424242` | Successful purchase |
| Visa (decline) | `4000000000000002` | Declined (retryable) |
| UPI | `success@pay-u` | Successful via UPI |
| UPI (pending) | `pending@pay-u` | Pending transaction |

### Test Subscription SKUs

| SKU | Behavior |
|-----|----------|
| `android.test.purchased` | Auto-succeeds |
| `android.test.canceled` | Cancels immediately |
| `android.test.refunded` | Refunds immediately |
| `android.test.item_unavailable` | Item not available |

## Querying Purchases

```kotlin
// Restore / verify entitlements on app launch
val subsResult = billingClient.queryPurchasesAsync(BillingClient.ProductType.SUBS) { billingResult, purchases ->
    purchases?.forEach { purchase ->
        if (purchase.isAutoRenewing) {
            // Grant subscription access
        }
    }
}
// Also query purchase history for old transactions
billingClient.queryPurchaseHistoryAsync(BillingClient.ProductType.SUBS) { _, purchaseHistoryList ->
    purchaseHistoryList?.forEach { /* Log historical purchases */ }
}
```

## Subscription Management

```kotlin
// Launch Play Store subscription management page
val intent = Intent(Intent.ACTION_VIEW).apply {
    data = Uri.parse("https://play.google.com/store/account/subscriptions")
    setPackage("com.android.vending")
}
startActivity(intent)
```

## Migration Notes

- PBL 8 removed `queryPurchaseHistoryAsync` (use `queryPurchasesAsync` plus server records) and the no-argument `enablePendingPurchases()`.

### From PBL 4

- `SkuDetails` → `ProductDetails` (wrapper object changes)
- `querySkuDetailsAsync` → `queryProductDetailsAsync`
- New `productDetailsParamsList` in `BillingFlowParams`
- `purchase.getSku()` → iterate `purchase.products`
