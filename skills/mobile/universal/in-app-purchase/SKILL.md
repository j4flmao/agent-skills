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
Code-first. One code block per platform (Swift, Kotlin, Dart/TS) with full purchase and validation flow. Platform divergence points as bullet list. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Product types defined (consumable, non-consumable, subscription)
- [ ] Purchase flow implemented for all target platforms
- [ ] Receipt validation configured (client or server-side)
- [ ] Subscription management with grace period handling
- [ ] Restore purchases flow implemented
- [ ] Server-side validation endpoint documented (if applicable)

### Max Response Length
4096 tokens

## Architecture / Decision Trees

### Receipt Validation Strategy Decision Tree

```
Does the app have its own backend server?
├── Yes → Server-side receipt validation
│   ├── iOS: Server validates with Apple VerifyReceipt API
│   └── Android: Server validates with Google Play Developer API
├── No → Client-side validation (less secure)
│   └── Use RevenueCat or similar third-party service
```

### Subscription vs Consumable Decision Tree

```
Does the product provide ongoing value (access, storage, premium)?
├── Yes → Is it time-limited and auto-renewing?
│   ├── Yes → Auto-renewable subscription
│   └── No → Non-consumable (permanent unlock)
└── No → Is it a one-time use item (coins, lives, boosters)?
    └── Yes → Consumable
```

### Payment Platform Decision Tree

```
Do you need to support both iOS and Android?
├── Yes → Use cross-platform library (RevenueCat, Purchases SDK)
│   └── Single codebase: Flutter or React Native
├── iOS only → StoreKit 2 (preferred) or StoreKit 1
└── Android only → Play Billing 5+
```

## Workflow

### Step 1: Define Product Types

| Type | Persistence | Restore | Use Case |
|------|-------------|---------|----------|
| Consumable | No | No | Coins, gems, lives |
| Non-consumable | Yes | Yes | Remove ads, unlock level |
| Auto-renewable subscription | Yes (while active) | Yes | Premium tier, cloud storage |
| Non-renewing subscription | Yes (custom duration) | Varies | Time-limited pass |

### Step 2: Configure Products in App Store Connect / Play Console

iOS (App Store Connect):
- Set up product IDs matching App Store Connect identifiers.
- Configure pricing tiers, subscription durations, and introductory offers.
- Enable promotional offers for subscription retention.
- Configure subscription groups for upgrade/downgrade.
- Set up shared secret for receipt validation.
- Add localization for each product name and description.

Android (Google Play Console):
- Create products with the same product IDs used in code.
- Configure managed products (consumables) or subscriptions.
- Set up base plans and offers for subscriptions.
- Configure grace period and account hold settings.
- Link to Google Cloud project for API access.

### Step 3: Implement Purchase Flow (iOS - StoreKit 2)
```swift
typealias Product = StoreKit.Product

func purchase(_ productId: String) async throws -> Bool {
    guard let product = try await Product.products(for: [productId]).first else {
        throw IAPError.productNotFound
    }
    let result = try await product.purchase()
    switch result {
    case .success(let verification):
        let transaction = try verification.payloadValue
        // Deliver the purchase content
        await deliverPurchase(transaction)
        await transaction.finish()
        return true
    case .userCancelled:
        return false
    case .pending:
        // Pending: needs parent approval, etc.
        return false
    @unknown default:
        return false
    }
}
```

### Step 4: Implement Purchase Flow (Android - Play Billing 5+)
```kotlin
val billingClient = BillingClient.newBuilder(context)
    .setListener { billingResult, purchases ->
        for (purchase in purchases) {
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                // Verify purchase signature client-side (optional)
                // Send purchase token to server for verification
                server.verifyPurchase(purchase)
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
```

### Step 5: Implement Receipt Validation (Server-Side)

iOS server-side validation:
```bash
POST https://buy.itunes.apple.com/verifyReceipt
# Sandbox: https://sandbox.itunes.apple.com/verifyReceipt
{
  "receipt-data": "<base64_encoded_receipt>",
  "password": "<shared_secret>",
  "exclude-old-transactions": true
}
```

Android server-side validation:
```bash
POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PACKAGE}/purchases/subscriptions/{SUB_ID}/tokens/{TOKEN}:acknowledge
Authorization: Bearer <OAUTH2_TOKEN>
```

### Step 6: Handle Subscription Status
```
Active (willRenew = true)
    |
    | grace period (7-30 days)
    v
In Grace Period (billing retry active)
    |
    | retry failed
    v
Expired / Lapsed (willRenew = false)
    |
    | account hold (15-30 days)
    v
Account Hold (can restore by updating payment)
    |
    | hold expired
    v
Expired (final)
```

### Step 7: Implement Restore Purchases
```swift
// StoreKit 2
for await result in Transaction.currentEntitlements {
    guard case .verified(let transaction) = result else { continue }
    await deliverEntitlement(transaction)
}
```

```kotlin
// Play Billing 5+
billingClient.queryPurchasesAsync(BillingClient.ProductType.SUBS) { _, purchases ->
    purchases.forEach { purchase ->
        server.verifyAndRestore(purchase)
    }
}
billingClient.queryPurchasesAsync(BillingClient.ProductType.INAPP) { _, purchases ->
    purchases.forEach { purchase ->
        server.verifyAndRestore(purchase)
    }
}
```

## Common Pitfalls

### Pitfall 1: Client-Only Receipt Trust
Trusting receipt validation on the device alone. All purchase verification must happen server-side. Client-side validation can be bypassed with jailbroken devices.

### Pitfall 2: Not Acknowledging Purchases
Android requires acknowledging purchases within 3 days or they auto-refund. iOS transactions must be finished with `transaction.finish()` after delivery.

### Pitfall 3: Ignoring Pending Transactions
Users can have pending purchases (family approval, Ask to Buy). The purchase flow must handle this state by checking transaction status after app restart.

### Pitfall 4: No Restore Mechanism
Not providing a "Restore Purchases" button. Users expect to restore purchases after reinstalling. This is also required by App Store Review Guidelines.

### Pitfall 5: Subscription Status from Client
Using only local subscription expiration that can be tampered with. Always verify subscription status server-side using the receipt validation API.

### Pitfall 6: Not Handling Subscription Upgrades
Users should be able to upgrade/downgrade subscriptions. iOS handles this with subscription groups. Android requires explicit handling in Play Billing.

### Pitfall 7: Missing Receipt Refresh
Using cached receipts that are expired. Always refresh the receipt before validation, especially after restoring purchases.

### Pitfall 8: Sandbox vs Production Confusion
Using sandbox URLs in production or vice versa. Always use the production validation endpoint for release builds and sandbox for debug builds.

## Best Practices

- Store all purchase verification logic on your server, never trust client data.
- Always handle the `pending` transaction state gracefully.
- Implement receipt refresh before server-side validation.
- Use subscription groups for upgrade/downgrade management.
- Implement StoreKit 2 for all new iOS development (StoreKit 1 is legacy).
- Use RevenueCat or similar for cross-platform IAP management.
- Acknowledge purchases immediately after server-side verification.
- Log all purchase events server-side for audit and fraud detection.
- Test with sandbox/test users before production release.
- Implement promotional offers for subscription reactivation.
- Handle grace period and billing retry states in UI.

## Compared With

### StoreKit 2 vs StoreKit 1
StoreKit 2 provides async/await API, Swift native types, and simplified receipt validation. StoreKit 1 uses delegate-based callbacks. Always use StoreKit 2 for new projects.

### Play Billing 5+ vs RevenueCat
Play Billing is Android-native. RevenueCat abstracts across iOS and Android with a unified API. RevenueCat handles receipt validation server-side and provides analytics. Use RevenueCat for cross-platform apps.

### Client-Side vs Server-Side Validation
Server-side validation is required for production apps. Client-side is only acceptable for prototypes. Server-side prevents tampering and provides single source of truth for entitlements.

### Consumables vs Subscriptions
Consumables are one-time purchases that are used up. Subscriptions provide ongoing access. Use consumables for in-app currency. Use subscriptions for premium features.

## Performance Considerations

- Product listing fetch happens once at app launch. Cache results for the session.
- Receipt validation adds 200-500ms latency. Perform asynchronously after purchase.
- Subscription status check should happen on app foreground, not on every screen load.
- Server-side validation endpoints should cache responses to avoid rate limiting.
- iOS receipt data can be up to 200KB. Minimize receipt size with `exclude-old-transactions`.
- Batch subscription status checks to minimize API calls.
- Implement exponential backoff for failed receipt validation retries.

## Rules
- Consumables must be delivered immediately server-side to prevent duplicate redemption.
- Auto-renewable subscriptions must be acknowledged within 3 days (Android) or they auto-refund.
- Always handle deferred payment (pending transaction) state.
- Never ship with sandbox/test credentials in release builds.
- Always provide a restore purchases button in the app UI.
- Subscription status must be verified server-side, never trust client state.
- StoreKit 2 is preferred over StoreKit 1 for new iOS implementations.
- Google Play Billing queries must handle connection failures gracefully.
- Server-side receipt validation is mandatory for production.
- Log all purchase attempts server-side for fraud detection.
- Handle billing retry notifications (iOS remote notifications, Play Billing listener).
- Grace period status must be reflected in UI (user can still access content during grace period).

## References
- `references/in-app-purchase.md` — In-App Purchase Integration Guide (cross-platform)
- `references/play-billing-guide.md` — Google Play Billing 5+ Implementation
- `references/receipt-validation.md` — Server-Side Receipt Validation
- `references/storekit-guide.md` — App Store StoreKit 2 Guide
- `references/subscription-management.md` — Subscription Lifecycle Management
- `references/subscription-models.md` — Subscription Pricing Models and Strategies
- `references/iap-receipt-validation-server.md` — Building a receipt validation server with verification endpoints
- `references/iap-subscription-lifecycle.md` — Complete subscription lifecycle including grace periods, billing retry, and expiration

## Handoff
No further handoff. IAP integration is self-contained with server-side receipt validation as the only external dependency.
