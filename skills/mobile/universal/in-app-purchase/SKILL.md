---
name: mobile-in-app-purchase
description: >
  Use this skill when the user says 'in-app purchase', 'IAP', 'subscription', 'consumable', 'StoreKit', 'Play Billing', 'receipt validation', 'restore purchase'. This skill enforces proper purchase flow patterns: product configuration, purchase flow, receipt validation, subscription management, and restore handling. Applies to iOS, Android, Flutter, and React Native.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, in-app-purchase, universal]
---

# Mobile In-App Purchase

## Purpose
Implement in-app purchases with correct product configuration, purchase flow, receipt validation, subscription management, and restore handling across all mobile platforms.

## Agent Protocol

### Trigger
User request includes: `in-app purchase`, `IAP`, `subscription`, `consumable`, `StoreKit`, `Play Billing`, `receipt validation`, `restore purchase`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Product types (consumable, non-consumable, subscription)
- Existing billing integration (StoreKit 2, Play Billing 5+, RevenueCat)

### Output Artifact
A markdown document containing product configuration and type selection, purchase flow implementation, receipt validation (client and server-side), subscription management (grace period, billing retry), restore purchases and entitlement verification, and platform-specific StoreKit / Play Billing APIs.

### Response Format
Code-first. One code block per platform (Swift, Kotlin, Dart/TS) with full purchase and validation flow. Platform divergence points as bullet list. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Product types defined (consumable, non-consumable, subscription)
- [ ] Purchase flow implemented for all target platforms
- [ ] Receipt validation configured (client or server-side)
- [ ] Subscription management with grace period handling
- [ ] Restore purchases flow implemented
- [ ] Server-side validation endpoint documented (if applicable)

### Max Response Length
4096 tokens

## Workflow

### Step 1: Define Product Types

| Type | Persistence | Restore | Use Case |
|------|-------------|---------|----------|
| Consumable | No | No | Coins, gems, lives |
| Non-consumable | Yes | Yes | Remove ads, unlock level |
| Auto-renewable subscription | Yes (while active) | Yes | Premium tier, cloud storage |
| Non-renewing subscription | Yes (custom duration) | Varies | Time-limited pass |

### Step 2: Implement Purchase Flow (iOS - StoreKit 2)
```swift
typealias Product = StoreKit.Product

func purchase(_ productId: String) async throws -> Bool {
    guard let product = try await Product.products(for: [productId]).first else { return false }
    let result = try await product.purchase()
    switch result {
    case .success(let verification):
        let transaction = try verification.payloadValue
        await transaction.finish()
        return true
    case .userCancelled:
        return false
    case .pending:
        return false
    @unknown default:
        return false
    }
}
```

### Step 3: Implement Purchase Flow (Android - Play Billing 5+)
```kotlin
val billingClient = BillingClient.newBuilder(context)
    .setListener { billingResult, purchases ->
        for (purchase in purchases) {
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                billingClient.acknowledgePurchase(
                    AcknowledgePurchaseParams.newBuilder()
                        .setPurchaseToken(purchase.purchaseToken)
                        .build()
                ) { _, _ -> }
            }
        }
    }
    .enablePendingPurchases()
    .build()

billingClient.startConnection(object : BillingClientStateListener {
    override fun onBillingSetupDone(billingResult: BillingResult) {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(listOf(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId("premium_monthly")
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            )).build()
        billingClient.queryProductDetailsAsync(params) { _, products ->
            products.firstOrNull()?.let { product ->
                billingClient.launchBillingFlow(activity, BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(listOf(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(product)
                            .build()
                    )).build()
                )
            }
        }
    }
    override fun onBillingServiceDisconnected() { }
})
```

### Step 4: Implement Receipt Validation

Client-side (iOS):
```swift
let receiptURL = Bundle.main.appStoreReceiptURL
guard let receiptData = try? Data(contentsOf: receiptURL) else { }
let receiptString = receiptData.base64EncodedString()
```

Server-side (iOS):
```bash
POST https://buy.itunes.apple.com/verifyReceipt
# Sandbox: https://sandbox.itunes.apple.com/verifyReceipt
{
  "receipt-data": "<base64>",
  "password": "<SHARED_SECRET>",
  "exclude-old-transactions": true
}
```

Server-side (Android):
```bash
POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE}/purchases/subscriptions/{SUB_ID}/tokens/{TOKEN}:acknowledge
Authorization: Bearer <OAUTH2_TOKEN>
```

### Step 5: Handle Subscription Status
```
                    +-----------------------------+
                    |         Active               |
                    |  (willRenew = true)          |
                    +----------+------------------+
                               | grace period
                               v
                    +-----------------------------+
                    |  In Grace Period (7-30d)    |
                    |  billing retry active       |
                    +----------+------------------+
                               | retry failed
                               v
                    +-----------------------------+
                    |    Expired / Lapsed          |
                    |  (willRenew = false)         |
                    +-----------------------------+
```

### Step 6: Implement Restore Purchases
```swift
// StoreKit 2
for await result in Transaction.currentEntitlements {
    guard case .verified(let transaction) = result else { continue }
}
```

```kotlin
// Play Billing 5+
billingClient.queryPurchasesAsync(BillingClient.ProductType.SUBS) { _, purchases ->
    purchases.forEach { }
}
```

## Rules
- Consumables must be delivered immediately server-side to prevent duplicate redemption.
- Auto-renewable subscriptions must be acknowledged within 3 days (Android) or they auto-refund.
- Always handle deferred payment (pending transaction) state.
- Never ship with sandbox/test credentials in release builds.
- Always provide a restore purchases button in the app UI.
- Subscription status must be verified server-side, never trust client state.
- StoreKit 2 is preferred over StoreKit 1 for new iOS implementations.

## References
- `references/subscription-models.md` — Pricing tiers, introductory offers, promo codes, grace periods
- `references/receipt-validation.md` — Local vs server validation, shared secret, edge cases
- `references/storekit-guide.md` — StoreKit 1 vs 2 migration, Transaction.updates, AppTransaction
- `references/play-billing-guide.md` — Acknowledge requirements, pending transactions, test cards

## Handoff
No further handoff. IAP integration is self-contained with server-side receipt validation as the only external dependency.
