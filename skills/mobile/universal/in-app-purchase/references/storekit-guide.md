# StoreKit Guide

## StoreKit 1 vs 2

| Feature | StoreKit 1 | StoreKit 2 |
|---------|------------|------------|
| API style | Delegate + callbacks | async/await |
| Receipt | `SKPaymentTransactionObserver` | `Transaction` + `Transaction.currentEntitlements` |
| Product fetch | `SKProductsRequest` | `Product.products(for:)` |
| Subscription status | Receipt parsing | `Product.SubscriptionInfo.status` |
| Refund | External (ask system) | `beginRefundRequest(in:)` (iOS 15+) |
| Sandbox | Separate account | Same account, auto-switch |

## Transaction.updates (StoreKit 2)

```swift
// Listen for external changes (refund, family sharing, renewal)
Task {
    for await result in Transaction.updates {
        guard case .verified(let transaction) = result else { continue }
        // Sync entitlement state
        await updateEntitlement(transaction.productID, expired: transaction.revocationDate != nil)
    }
}
```

## AppTransaction (StoreKit 2)

```swift
// Verify app integrity — sandbox vs production, bundle version
guard case .verified(let appTransaction) = try await AppTransaction.shared else { return }
// appTransaction.receipt — app-level receipt for receipt validation
```

## Product Types

```swift
// Fetch all products
let products = try await Product.products(for: ["consumable_1", "premium_monthly", "remove_ads"])

for product in products {
    switch product.type {
    case .consumable:      // One-time, non-restorable
    case .nonConsumable:   // One-time, restorable
    case .autoRenewable:   // Subscription
    case .nonRenewable:    // Custom subscription
    }
}
```

## Subscription Status

```swift
if let subscription = product.subscription {
    let statuses = try await subscription.status
    for status in statuses {
        switch status.state {
        case .subscribed:      // Active
        case .expired:         // Lapsed
        case .inBillingRetry:  // Payment issue
        case .inGracePeriod:   // Still active, billing retrying
        case .revoked:         // Refunded
        @unknown default:      // Future state
        }
    }
}
```

## Refund Request (iOS 15+)

```swift
// In-app refund flow
if let windowScene = view.window?.windowScene {
    let result = try await Transaction.beginRefundRequest(
        transactionID: transaction.id,
        in: windowScene
    )
    // .success, .failure(.duplicateRequest), .failure(.userCancelled)
}
```

## StoreKit Configuration File (Xcode)

```
StoreKitConfig.storekit
├── Products
│   ├── premium_monthly (Auto-Renewable Subscription)
│   ├── gems_100 (Consumable)
│   └── remove_ads (Non-Consumable)
├── Subscriptions
│   └── premium_group
│       ├── premium_monthly ($9.99)
│       └── premium_annual ($59.99)
└── Transaction
    └── Auto-Renew enabled
```

- Add via `File → New → StoreKit Configuration File`
- Select scheme → `Run` → `Arguments` → Enable StoreKit config
- No need to upload to App Store Connect for testing
