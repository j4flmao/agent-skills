# Subscription Management

## Subscription Status

```swift
enum SubscriptionTier: String, Codable {
    case free
    case basic
    case premium
    case enterprise
}

struct SubscriptionStatus {
    let tier: SubscriptionTier
    let expirationDate: Date?
    let autoRenewEnabled: Bool
    let gracePeriodEnd: Date?
    let isTrial: Bool

    var isActive: Bool {
        guard let expiration = expirationDate else {
            return tier == .free
        }
        return Date() < expiration || (gracePeriodEnd.map { Date() < $0 } ?? false)
    }

    var daysRemaining: Int {
        guard let expiration = expirationDate else { return 0 }
        return Calendar.current.dateComponents([.day], from: Date(), to: expiration).day ?? 0
    }
}

class SubscriptionManager {
    private let validator: ReceiptValidator
    private var currentStatus: SubscriptionStatus = .init(
        tier: .free, expirationDate: nil, autoRenewEnabled: false,
        gracePeriodEnd: nil, isTrial: false
    )

    func checkSubscriptionStatus() async throws -> SubscriptionStatus {
        let isValid = try await validator.validateReceipt(productId: "premium_monthly")
        return currentStatus
    }

    func refreshStatus() async {
        do {
            let _ = try await validator.validateReceipt(productId: "premium_monthly")
            // Update cached status
        } catch {
            print("Status check failed: \(error)")
        }
    }

    func handleSubscriptionExpiry() {
        guard !currentStatus.isActive else { return }

        // Lock premium features
        NotificationCenter.default.post(name: .subscriptionExpired, object: nil)

        // Show upgrade prompt with appropriate timing
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.showSubscriptionPrompt()
        }
    }
}
```

## StoreKit 2 Integration

```swift
import StoreKit

@available(iOS 15.0, *)
class StoreKit2Manager {
    func purchase(_ product: Product) async throws -> Transaction? {
        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            return transaction
        case .userCancelled:
            return nil
        case .pending:
            return nil
        @unknown default:
            return nil
        }
    }

    func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.verificationFailed
        case .verified(let safe):
            return safe
        }
    }

    func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    await self.updateSubscriptionStatus(transaction)
                } catch {
                    print("Transaction failed verification")
                }
            }
        }
    }

    enum StoreError: Error {
        case verificationFailed
        case productNotFound
    }
}
```

## Key Points

- Track subscription status with active checks
- Support multiple subscription tiers
- Handle subscription expiry and grace periods
- Implement promotional offers for retention
- Use StoreKit 2 for modern Swift concurrency
- Verify transactions on server side
- Handle billing retry notifications
- Sync subscription status across devices
- Offer win-back promotions for lapsed users
- Monitor subscription churn metrics
- Implement family sharing support
- Test subscription flows thoroughly in sandbox
